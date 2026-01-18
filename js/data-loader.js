/**
 * データローダーモジュール
 * CSVファイルを並列読み込みし、JavaScriptオブジェクトに変換してキャッシュする
 */

/**
 * GTFSパーサークラス
 * GTFS形式のCSVファイルをパースしてJavaScriptオブジェクトに変換
 */
class GTFSParser {
  /**
   * GTFSテキストをパースしてオブジェクト配列に変換
   * @param {string} text - GTFSファイルのテキスト
   * @returns {Array<Object>} パースされたデータ
   */
  static parse(text) {
    const lines = text.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }

    // ヘッダー行を抽出
    const headers = this.parseCSVLine(lines[0]);
    const data = [];

    // データ行をパース
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // 空行をスキップ

      const values = this.parseCSVLine(line);
      if (values.length !== headers.length) {
        console.warn(`行${i + 1}: カラム数が一致しません（期待: ${headers.length}, 実際: ${values.length}）`);
        continue;
      }

      // オブジェクト配列への変換
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }

    return data;
  }

  /**
   * CSV行をパース（ダブルクォート、エスケープ対応）
   * @param {string} line - CSV行
   * @returns {Array<string>} パースされた値の配列
   */
  static parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたダブルクォート（""）
          current += '"';
          i++; // 次の文字をスキップ
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // カンマ区切り（クォート外のみ）
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // 最後の値を追加
    values.push(current.trim());

    return values;
  }
}

class DataLoader {
  constructor() {
    // メモリキャッシュ
    this.busStops = null;
    this.timetable = null;
    this.fares = null;
    this.fareRules = null;
    
    // TimetableController用のGTFSデータ（生データ）
    this.stopTimes = null;
    this.trips = null;
    this.routes = null;
    this.calendar = null;
    this.gtfsStops = null; // 生のstops.txtデータ（stop_idプロパティを持つ）
    
    // 新規インデックス（要件2.1）
    this.timetableByRouteAndDirection = null; // 方向別時刻表インデックス
    this.tripStops = null; // Trip-Stopマッピング（要件3.1）
    this.routeMetadata = null; // 路線メタデータ（要件4.1）
    this.stopToTrips = null; // 停留所→trip逆引きインデックス（要件5.1）
    this.routeToTrips = null; // 路線→trip逆引きインデックス（要件5.3）
    this.stopsGrouped = null; // 停留所グループ化（要件6.1）
    
    // タイムアウト設定（ミリ秒）- ZIPファイルサイズを考慮して5秒に延長
    this.timeout = 5000;
    
    // デバッグモード
    this.debugMode = false;
    
    // GTFSバージョン情報
    this.gtfsVersion = null;
    
    // 進捗コールバック
    this.onProgress = null;
    
    // バス停マッピングデータ
    this.busStopMapping = null;
    
    // 路線名マッピングデータ
    this.routeNameMapping = null;
    
    // IndexedDBキャッシュ（利用可能な場合）
    this.cache = null;
    if (typeof IndexedDBCache !== 'undefined') {
      this.cache = new IndexedDBCache();
    }
  }

  /**
   * 全データを1回の読み込みで取得（要件1.1, 1.2）
   * 事前処理済みJSONファイルを優先的に使用し、なければZIPから読み込む
   * @returns {Promise<void>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadAllDataOnce() {
    // 既にデータが読み込まれている場合はスキップ（要件1.5）
    if (this.isDataLoaded()) {
      this.logDebug('データは既に読み込まれています。キャッシュを使用します。');
      return;
    }

    try {
      this.logDebug('全データの読み込み開始');
      const overallStartTime = Date.now();
      
      // 進捗コールバック: データロード開始
      if (this.onProgress) {
        this.onProgress('データを読み込んでいます...');
      }
      
      // IndexedDBキャッシュから読み込みを試行
      let gtfsData = null;
      if (this.cache) {
        try {
          if (this.onProgress) {
            this.onProgress('データを読み込んでいます...');
          }
          gtfsData = await this.cache.get('gtfs-data', 24 * 60 * 60 * 1000); // 24時間有効
          if (gtfsData) {
            this.logDebug('IndexedDBキャッシュからデータを読み込みました');
            
            if (this.onProgress) {
              this.onProgress('データを処理しています...');
            }
            
            // キャッシュから読み込んだデータをメモリに設定
            this.busStops = gtfsData.busStops;
            this.timetable = gtfsData.timetable;
            this.fares = gtfsData.fares;
            this.fareRules = gtfsData.fareRules;
            this.stopTimes = gtfsData.stopTimes;
            this.trips = gtfsData.trips;
            this.routes = gtfsData.routes;
            this.calendar = gtfsData.calendar;
            this.gtfsStops = gtfsData.gtfsStops;
            
            if (this.onProgress) {
              this.onProgress('方向情報を付与しています...');
            }
            
            // 方向情報を付与
            this.enrichTripsWithDirection();
            
            if (this.onProgress) {
              this.onProgress('インデックスを生成しています...');
            }
            
            // インデックスを生成
            this.generateIndexes();
            
            if (this.onProgress) {
              this.onProgress('マッピングデータを読み込んでいます...');
            }
            
            // バス停マッピングと路線名マッピングを並列で読み込み
            await Promise.all([
              this.loadBusStopMapping(),
              this.loadRouteNameMapping()
            ]);
            
            const overallEndTime = Date.now();
            this.logDebug('IndexedDBキャッシュからの読み込み完了', {
              totalDuration: `${overallEndTime - overallStartTime}ms`
            });
            
            if (this.onProgress) {
              this.onProgress('データの読み込みが完了しました');
            }
            
            return; // キャッシュから読み込めたので終了
          }
        } catch (error) {
          this.logDebug('IndexedDBキャッシュからの読み込みに失敗しました:', error);
          // エラーが発生しても続行（JSONファイルから読み込む）
        }
      }
      
      // 事前処理済みJSONファイルが利用可能かチェック（最速の読み込み方法）
      const processedDataAvailable = await this.checkProcessedDataAvailable();
      if (processedDataAvailable) {
        this.logDebug('事前処理済みJSONファイルから読み込みます');
        
        try {
          if (this.onProgress) {
            this.onProgress('JSONファイルを読み込んでいます...');
          }
          
          // 事前処理済みJSONファイルを読み込む（高速）
          gtfsData = await this.loadProcessedJSONFiles();
          
          if (this.onProgress) {
            this.onProgress('データを変換しています...');
          }
          
          // 変換済みデータを生成
          const transformStartTime = Date.now();
          
          this.busStops = DataTransformer.transformStops(
            gtfsData.stops,
            (message, data) => this.logDebug(message, data)
          );
          
          this.timetable = DataTransformer.transformTimetable(
            gtfsData.stopTimes,
            gtfsData.trips,
            gtfsData.routes,
            gtfsData.calendar,
            gtfsData.agency,
            gtfsData.stops,
            (message, data) => this.logDebug(message, data)
          );
          
          this.fares = DataTransformer.transformFares(
            gtfsData.fareAttributes,
            (message, data) => this.logDebug(message, data)
          );
          
          // fare_rules.txtが存在する場合は変換してキャッシュ
          if (gtfsData.fareRules && gtfsData.fareRules.length > 0) {
            this.fareRules = DataTransformer.transformFareRules(
              gtfsData.fareRules,
              (message, data) => this.logDebug(message, data)
            );
          } else {
            this.logDebug('fare_rules.txtが存在しないため、運賃ルールデータはスキップされました');
            this.fareRules = [];
          }
          
          const transformEndTime = Date.now();
          
          // 生データをキャッシュ（TimetableController用）
          this.stopTimes = gtfsData.stopTimes;
          this.trips = gtfsData.trips;
          this.routes = gtfsData.routes;
          this.calendar = gtfsData.calendar;
          this.gtfsStops = gtfsData.stops;
          
          if (this.onProgress) {
            this.onProgress('方向情報を付与しています...');
          }
          
          // 方向情報を付与（データ変換後、インデックス生成前）
          const directionStartTime = Date.now();
          this.enrichTripsWithDirection();
          const directionEndTime = Date.now();
          
          if (this.onProgress) {
            this.onProgress('インデックスを生成しています...');
          }
          
          // インデックスを生成（要件2.1, 7.1）
          const indexStartTime = Date.now();
          this.generateIndexes();
          const indexEndTime = Date.now();
          
          if (this.onProgress) {
            this.onProgress('マッピングデータを読み込んでいます...');
          }
          
          // バス停マッピングと路線名マッピングを並列で読み込み（多言語対応）
          const mappingStartTime = Date.now();
          await Promise.all([
            this.loadBusStopMapping(),
            this.loadRouteNameMapping()
          ]);
          const mappingEndTime = Date.now();
          
          const overallEndTime = Date.now();
          
          // IndexedDBキャッシュに保存（非同期で実行、エラーが発生しても続行）
          if (this.cache) {
            this.cache.set('gtfs-data', {
              busStops: this.busStops,
              timetable: this.timetable,
              fares: this.fares,
              fareRules: this.fareRules,
              stopTimes: this.stopTimes,
              trips: this.trips,
              routes: this.routes,
              calendar: this.calendar,
              gtfsStops: this.gtfsStops
            }).catch(error => {
              this.logDebug('IndexedDBキャッシュへの保存に失敗しました:', error);
            });
          }
          
          this.logDebug('事前処理済みJSONファイルからの読み込み完了', {
            totalDuration: `${overallEndTime - overallStartTime}ms`,
            transformDuration: `${transformEndTime - transformStartTime}ms`,
            directionDuration: `${directionEndTime - directionStartTime}ms`,
            indexDuration: `${indexEndTime - indexStartTime}ms`,
            mappingDuration: `${mappingEndTime - mappingStartTime}ms`
          });
          
          if (this.onProgress) {
            this.onProgress('データの読み込みが完了しました');
          }
          
          return; // JSONファイルから読み込めたので終了
        } catch (error) {
          this.logDebug('事前処理済みJSONファイルからの読み込みに失敗しました。ZIPファイルから読み込みます:', error);
          // エラーが発生しても続行（ZIPファイルから読み込む）
        }
      }
      
      // 事前処理済みJSONファイルがない場合は、ZIPファイルから読み込む
      // Cloudflare Pagesの25MB制限を回避するため、ZIPファイルを使用
      this.logDebug('ZIPファイルから読み込みます');
      
      if (this.onProgress) {
        this.onProgress('ZIPファイルを検索しています...');
      }
      
      // GTFS ZIPファイルを検索
      const zipPath = await this.findGTFSZipFile();
      
      if (this.onProgress) {
        this.onProgress('ZIPファイルを読み込んでいます...');
      }
      
      // ZIPファイルを読み込んで解凍（1回のみ）
      const zip = await this.loadGTFSZip(zipPath);
      
      if (this.onProgress) {
        this.onProgress('GTFSファイルを解析しています...');
      }
      
      // GTFSファイルをパース（1回のみ）
      gtfsData = await this.parseGTFSFiles(zip);
      
      if (this.onProgress) {
        this.onProgress('データを変換しています...');
      }
      
      // 変換済みデータを生成
      const transformStartTime = Date.now();
      
      this.busStops = DataTransformer.transformStops(
        gtfsData.stops,
        (message, data) => this.logDebug(message, data)
      );
      
      this.timetable = DataTransformer.transformTimetable(
        gtfsData.stopTimes,
        gtfsData.trips,
        gtfsData.routes,
        gtfsData.calendar,
        gtfsData.agency,
        gtfsData.stops,
        (message, data) => this.logDebug(message, data)
      );
      
      this.fares = DataTransformer.transformFares(
        gtfsData.fareAttributes,
        (message, data) => this.logDebug(message, data)
      );
      
      // fare_rules.txtが存在する場合は変換してキャッシュ
      if (gtfsData.fareRules && gtfsData.fareRules.length > 0) {
        this.fareRules = DataTransformer.transformFareRules(
          gtfsData.fareRules,
          (message, data) => this.logDebug(message, data)
        );
      } else {
        this.logDebug('fare_rules.txtが存在しないため、運賃ルールデータはスキップされました');
        this.fareRules = [];
      }
      
      const transformEndTime = Date.now();
      
      // 生データをキャッシュ（TimetableController用）
      this.stopTimes = gtfsData.stopTimes;
      this.trips = gtfsData.trips;
      this.routes = gtfsData.routes;
      this.calendar = gtfsData.calendar;
      this.gtfsStops = gtfsData.stops;
      
      if (this.onProgress) {
        this.onProgress('方向情報を付与しています...');
      }
      
      // 方向情報を付与（データ変換後、インデックス生成前）
      const directionStartTime = Date.now();
      this.enrichTripsWithDirection();
      const directionEndTime = Date.now();
      
      if (this.onProgress) {
        this.onProgress('インデックスを生成しています...');
      }
      
      // インデックスを生成（要件2.1, 7.1）
      const indexStartTime = Date.now();
      this.generateIndexes();
      const indexEndTime = Date.now();
      
      if (this.onProgress) {
        this.onProgress('マッピングデータを読み込んでいます...');
      }
      
      // バス停マッピングと路線名マッピングを並列で読み込み（多言語対応）
      const mappingStartTime = Date.now();
      await Promise.all([
        this.loadBusStopMapping(),
        this.loadRouteNameMapping()
      ]);
      const mappingEndTime = Date.now();
      
      const overallEndTime = Date.now();
      
      // IndexedDBキャッシュに保存（非同期で実行、エラーが発生しても続行）
      if (this.cache) {
        this.cache.set('gtfs-data', {
          busStops: this.busStops,
          timetable: this.timetable,
          fares: this.fares,
          fareRules: this.fareRules,
          stopTimes: this.stopTimes,
          trips: this.trips,
          routes: this.routes,
          calendar: this.calendar,
          gtfsStops: this.gtfsStops
        }).catch(error => {
          this.logDebug('IndexedDBキャッシュへの保存に失敗しました:', error);
        });
      }
      
      this.logDebug('全データの読み込み完了', {
        totalDuration: `${overallEndTime - overallStartTime}ms`,
        transformDuration: `${transformEndTime - transformStartTime}ms`,
        directionDuration: `${directionEndTime - directionStartTime}ms`,
        indexDuration: `${indexEndTime - indexStartTime}ms`,
        mappingDuration: `${mappingEndTime - mappingStartTime}ms`,
        busStopsCount: this.busStops.length,
        timetableCount: this.timetable.length,
        faresCount: this.fares.length,
        fareRulesCount: this.fareRules.length,
        stopTimesCount: this.stopTimes.length,
        tripsCount: this.trips.length,
        routesCount: this.routes.length,
        calendarCount: this.calendar.length,
        gtfsStopsCount: this.gtfsStops.length,
        busStopMappingCount: this.busStopMapping ? this.busStopMapping.length : 0
      });
      
      if (this.onProgress) {
        this.onProgress('データの読み込みが完了しました');
      }
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        console.error('データ読み込みエラー:', error.message);
        throw error;
      }
      // その他のエラー
      console.error('データ読み込みエラー:', error);
      throw new Error('データの読み込みに失敗しました');
    }
  }

  /**
   * 全データを並列読み込み（後方互換性のため維持）
   * @returns {Promise<{busStops: Array, timetable: Array, fares: Array}>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadAllData() {
    // loadAllDataOnce()を呼び出して、キャッシュされたデータを返す
    await this.loadAllDataOnce();
    
    return {
      busStops: this.busStops,
      timetable: this.timetable,
      fares: this.fares
    };
  }

  /**
   * バス停マスタを読み込み
   * @returns {Promise<Array>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadBusStops() {
    // キャッシュチェック
    if (this.busStops) {
      this.logDebug('バス停データをキャッシュから取得');
      return this.busStops;
    }

    try {
      this.logDebug('バス停データの読み込み開始');
      const overallStartTime = Date.now();
      
      // 進捗コールバック: バス停データ読み込み開始
      if (this.onProgress) {
        this.onProgress('バス停データを読み込んでいます...');
      }
      
      // GTFS ZIPファイルを検索
      const zipPath = await this.findGTFSZipFile();
      
      // ZIPファイルを読み込んで解凍
      const zip = await this.loadGTFSZip(zipPath);
      
      // GTFSファイルをパース
      const gtfsData = await this.parseGTFSFiles(zip);
      
      // DataTransformer.transformStops()でデータを変換
      const transformStartTime = Date.now();
      this.busStops = DataTransformer.transformStops(
        gtfsData.stops,
        (message, data) => this.logDebug(message, data) // 進捗コールバック
      );
      const transformEndTime = Date.now();
      
      const overallEndTime = Date.now();
      this.logDebug('バス停データの読み込み完了', { 
        count: this.busStops.length,
        totalDuration: `${overallEndTime - overallStartTime}ms`,
        transformDuration: `${transformEndTime - transformStartTime}ms`
      });
      
      return this.busStops;
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        console.error('バス停データ読み込みエラー:', error.message);
        throw error;
      }
      // その他のエラー
      console.error('バス停データ読み込みエラー:', error);
      throw new Error('バス停データの読み込みに失敗しました');
    }
  }

  /**
   * 時刻表データを読み込み
   * @returns {Promise<Array>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadTimetable() {
    // キャッシュチェック
    if (this.timetable) {
      this.logDebug('時刻表データをキャッシュから取得');
      return this.timetable;
    }

    try {
      this.logDebug('時刻表データの読み込み開始');
      const overallStartTime = Date.now();
      
      // 進捗コールバック: 時刻表データ読み込み開始
      if (this.onProgress) {
        this.onProgress('時刻表データを読み込んでいます...');
      }
      
      // GTFS ZIPファイルを検索
      const zipPath = await this.findGTFSZipFile();
      
      // ZIPファイルを読み込んで解凍
      const zip = await this.loadGTFSZip(zipPath);
      
      // GTFSファイルをパース
      const gtfsData = await this.parseGTFSFiles(zip);
      
      // DataTransformer.transformTimetable()でデータを変換
      // 要件7.3: データ変換の進捗状況をログ出力
      const transformStartTime = Date.now();
      this.timetable = DataTransformer.transformTimetable(
        gtfsData.stopTimes,
        gtfsData.trips,
        gtfsData.routes,
        gtfsData.calendar,
        gtfsData.agency,
        gtfsData.stops,
        (message, data) => this.logDebug(message, data) // 進捗コールバック
      );
      const transformEndTime = Date.now();
      
      const overallEndTime = Date.now();
      this.logDebug('時刻表データの読み込み完了', { 
        count: this.timetable.length,
        totalDuration: `${overallEndTime - overallStartTime}ms`,
        transformDuration: `${transformEndTime - transformStartTime}ms`
      });
      
      return this.timetable;
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        console.error('時刻表データ読み込みエラー:', error.message);
        throw error;
      }
      // その他のエラー
      console.error('時刻表データ読み込みエラー:', error);
      throw new Error('時刻表データの読み込みに失敗しました');
    }
  }

  /**
   * 運賃データを読み込み（fare_attributes.txtとfare_rules.txtを並列読み込み）
   * @returns {Promise<Array>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadFares() {
    // キャッシュチェック
    if (this.fares) {
      this.logDebug('運賃データをキャッシュから取得');
      return this.fares;
    }

    try {
      this.logDebug('運賃データの読み込み開始');
      const overallStartTime = Date.now();
      
      // 進捗コールバック: 運賃データ読み込み開始
      if (this.onProgress) {
        this.onProgress('運賃データを読み込んでいます...');
      }
      
      // GTFS ZIPファイルを検索
      const zipPath = await this.findGTFSZipFile();
      
      // ZIPファイルを読み込んで解凍
      const zip = await this.loadGTFSZip(zipPath);
      
      // GTFSファイルをパース
      const gtfsData = await this.parseGTFSFiles(zip);
      
      // DataTransformer.transformFares()でデータを変換
      const transformStartTime = Date.now();
      this.fares = DataTransformer.transformFares(
        gtfsData.fareAttributes,
        (message, data) => this.logDebug(message, data) // 進捗コールバック
      );
      
      // fare_rules.txtが存在する場合は変換してキャッシュ
      if (gtfsData.fareRules && gtfsData.fareRules.length > 0) {
        this.fareRules = DataTransformer.transformFareRules(
          gtfsData.fareRules,
          (message, data) => this.logDebug(message, data) // 進捗コールバック
        );
      } else {
        this.logDebug('fare_rules.txtが存在しないため、運賃ルールデータはスキップされました');
        this.fareRules = [];
      }
      
      const transformEndTime = Date.now();
      
      const overallEndTime = Date.now();
      this.logDebug('運賃データの読み込み完了', { 
        fareAttributesCount: this.fares.length,
        fareRulesCount: this.fareRules.length,
        totalDuration: `${overallEndTime - overallStartTime}ms`,
        transformDuration: `${transformEndTime - transformStartTime}ms`
      });
      
      return this.fares;
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        console.error('運賃データ読み込みエラー:', error.message);
        throw error;
      }
      // その他のエラー
      console.error('運賃データ読み込みエラー:', error);
      throw new Error('運賃データの読み込みに失敗しました');
    }
  }

  /**
   * 運賃ルールデータを取得
   * @returns {Promise<Array>}
   */
  async loadFareRules() {
    // loadFares()を呼び出してfare_rules.txtも読み込む
    await this.loadFares();
    return this.fareRules || [];
  }

  /**
   * TimetableController用のGTFSデータを読み込み（後方互換性のため維持）
   * @returns {Promise<void>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadGTFSData() {
    // loadAllDataOnce()を呼び出して、全データを1回で読み込む
    await this.loadAllDataOnce();
  }

  /**
   * タイムアウト付きfetch
   * @param {string} url - 読み込むファイルのURL
   * @returns {Promise<string>}
   * @throws {Error} タイムアウトまたはネットワークエラーの場合
   */
  async fetchWithTimeout(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // タイムアウトエラーの処理（要件4.2）
      if (error.name === 'AbortError') {
        console.error(`タイムアウトエラー: ${url}の読み込みに${this.timeout}ms以上かかりました`);
        const timeoutError = new Error('データの読み込みがタイムアウトしました');
        timeoutError.code = 'GTFS_TIMEOUT';
        timeoutError.details = `${url}の読み込みに${this.timeout}ms以上かかりました`;
        throw timeoutError;
      }
      
      // ネットワークエラーの処理（要件4.3）
      console.error(`ファイル読み込みエラー: ${url}`, error);
      const networkError = new Error('ネットワークエラーが発生しました');
      networkError.code = 'GTFS_NETWORK_ERROR';
      networkError.details = `${url} - ${error.message}`;
      throw networkError;
    }
  }

  /**
   * CSVテキストをJavaScriptオブジェクトの配列にパース
   * @param {string} csvText - CSVテキスト
   * @returns {Array<Object>}
   */
  parseCSV(csvText) {
    try {
      const lines = csvText.trim().split('\n');
      
      if (lines.length === 0) {
        throw new Error('CSVファイルが空です');
      }

      // ヘッダー行を取得
      const headers = lines[0].split(',').map(h => h.trim());
      
      // データ行をパース
      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // 空行をスキップ

        const values = this.parseCSVLine(line);
        
        if (values.length !== headers.length) {
          console.warn(`行${i + 1}: カラム数が一致しません（期待: ${headers.length}, 実際: ${values.length}）`);
          continue;
        }

        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }

      return data;
    } catch (error) {
      console.error('CSVパースエラー:', error);
      throw new Error(`CSVのパースに失敗しました: ${error.message}`);
    }
  }

  /**
   * CSV行をパース（カンマ区切り、ダブルクォート対応）
   * @param {string} line - CSV行
   * @returns {Array<string>}
   */
  parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたダブルクォート
          current += '"';
          i++; // 次の文字をスキップ
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // カンマ区切り
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // 最後の値を追加
    values.push(current.trim());

    return values;
  }

  /**
   * GTFSファイルを並列で抽出してパース（要件6.1: 並列読み込み）
   * @param {JSZip} zip - ZIPオブジェクト
   * @returns {Promise<Object>} パースされたGTFSデータ
   * @throws {Error} GTFSファイルの形式が不正な場合
   */
  async parseGTFSFiles(zip) {
    try {
      this.logDebug('GTFSファイルのパース開始');
      const overallStartTime = Date.now();
      
      // 必要なGTFSファイルを並列で抽出（要件6.1: Promise.allを使用）
      // 不要なファイル（shapes.txt、translations.txtなど）は読み込まない（要件6.3）
      const fileTimings = {};
      
      const extractWithTiming = async (filename) => {
        const startTime = Date.now();
        try {
          const text = await this.extractGTFSFile(zip, filename);
          const endTime = Date.now();
          const duration = endTime - startTime;
          fileTimings[filename] = duration;
          
          // 要件3.1: 各ファイルの読み込み時間をログ出力（デバッグモードのみ）
          this.logDebug(`${filename} 読み込み完了: ${duration}ms`);
          
          return text;
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          fileTimings[filename] = duration;
          throw error;
        }
      };
      
      const [
        stopsText,
        stopTimesText,
        routesText,
        tripsText,
        calendarText,
        agencyText,
        fareAttributesText,
        fareRulesText
      ] = await Promise.all([
        extractWithTiming('stops.txt'),
        extractWithTiming('stop_times.txt'),
        extractWithTiming('routes.txt'),
        extractWithTiming('trips.txt'),
        extractWithTiming('calendar.txt'),
        extractWithTiming('agency.txt'),
        extractWithTiming('fare_attributes.txt').catch(() => null), // オプショナル
        extractWithTiming('fare_rules.txt').catch(() => null) // オプショナル
      ]);
      
      // feed_info.txtからバージョン情報を読み取り（オプショナル）
      let feedInfoText = null;
      try {
        feedInfoText = await extractWithTiming('feed_info.txt');
      } catch (e) {
        // feed_info.txtが存在しない場合は無視
      }
      
      // 各ファイルをGTFSParserでパース
      const parseStartTime = Date.now();
      const gtfsData = {
        stops: GTFSParser.parse(stopsText),
        stopTimes: GTFSParser.parse(stopTimesText),
        routes: GTFSParser.parse(routesText),
        trips: GTFSParser.parse(tripsText),
        calendar: GTFSParser.parse(calendarText),
        agency: GTFSParser.parse(agencyText),
        fareAttributes: fareAttributesText ? GTFSParser.parse(fareAttributesText) : [],
        fareRules: fareRulesText ? GTFSParser.parse(fareRulesText) : []
      };
      const parseEndTime = Date.now();
      const parseDuration = parseEndTime - parseStartTime;
      
      // 要件3.1: パース時間をログ出力（デバッグモードのみ）
      this.logDebug(`GTFSファイルのパース時間: ${parseDuration}ms`);
      
      // データの妥当性チェック（要件4.4, 4.5）
      if (!gtfsData.stops || gtfsData.stops.length === 0) {
        throw new Error('stops.txtが空または不正です');
      }
      if (!gtfsData.stopTimes || gtfsData.stopTimes.length === 0) {
        throw new Error('stop_times.txtが空または不正です');
      }
      if (!gtfsData.routes || gtfsData.routes.length === 0) {
        throw new Error('routes.txtが空または不正です');
      }
      if (!gtfsData.trips || gtfsData.trips.length === 0) {
        throw new Error('trips.txtが空または不正です');
      }
      
      // バージョン情報を保存
      if (feedInfoText) {
        const feedInfo = GTFSParser.parse(feedInfoText);
        if (feedInfo.length > 0) {
          this.gtfsVersion = {
            publisher: feedInfo[0].feed_publisher_name || '',
            version: feedInfo[0].feed_version || '',
            startDate: feedInfo[0].feed_start_date || '',
            endDate: feedInfo[0].feed_end_date || ''
          };
        }
      }
      
      const overallEndTime = Date.now();
      const overallDuration = overallEndTime - overallStartTime;
      
      // 要件3.1: 読み込み時間とレコード数をログ出力（デバッグモードのみ）
      this.logDebug('GTFSファイルのパース完了', {
        totalDuration: `${overallDuration}ms`,
        fileTimings: fileTimings,
        recordCounts: {
          stops: gtfsData.stops.length,
          stopTimes: gtfsData.stopTimes.length,
          routes: gtfsData.routes.length,
          trips: gtfsData.trips.length,
          calendar: gtfsData.calendar.length,
          agency: gtfsData.agency.length,
          fareAttributes: gtfsData.fareAttributes.length,
          fareRules: gtfsData.fareRules.length
        }
      });
      
      return gtfsData;
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        throw error;
      }
      // GTFSファイルの形式が不正な場合（要件4.4, 4.5）
      console.error('GTFSファイルパースエラー:', error);
      console.error('詳細なエラー情報:', {
        message: error.message,
        stack: error.stack
      });
      const wrappedError = new Error('GTFSデータの形式が不正です');
      wrappedError.code = 'GTFS_INVALID_FORMAT';
      wrappedError.details = error.message;
      throw wrappedError;
    }
  }

  /**
   * ZIPアーカイブから特定のファイルを抽出
   * 要件6.3: 不要なファイル（shapes.txt、translations.txtなど）は読み込まない
   * @param {JSZip} zip - ZIPオブジェクト
   * @param {string} filename - 抽出するファイル名
   * @returns {Promise<string>} ファイルの内容（テキスト）
   */
  async extractGTFSFile(zip, filename) {
    try {
      const file = zip.file(filename);
      
      if (!file) {
        throw new Error(`ファイル ${filename} がZIPアーカイブ内に見つかりません`);
      }
      
      const text = await file.async('text');
      const lines = text.split('\n').length;
      
      this.logDebug(`GTFSファイル抽出: ${filename}`, { 
        size: `${(text.length / 1024).toFixed(2)} KB`,
        lines: lines
      });
      
      return text;
    } catch (error) {
      console.error(`GTFSファイル抽出エラー (${filename}):`, error);
      throw new Error(`GTFSファイル ${filename} の抽出に失敗しました: ${error.message}`);
    }
  }

  /**
   * GTFS ZIPファイルを読み込んで解凍
   * @param {string} zipPath - ZIPファイルのパス
   * @returns {Promise<JSZip>} 解凍されたZIPオブジェクト
   * @throws {Error} ZIPファイルの読み込みまたは解凍に失敗した場合
   */
  async loadGTFSZip(zipPath) {
    try {
      this.logDebug('GTFS ZIPファイル読み込み開始', { path: zipPath });
      
      // fetchWithTimeout()を使用してZIPファイルを読み込み
      const response = await fetch(zipPath);
      
      if (!response.ok) {
        const error = new Error(`GTFSデータの解凍に失敗しました`);
        error.code = 'GTFS_UNZIP_FAILED';
        error.details = `HTTP error! status: ${response.status}`;
        console.error('GTFS ZIPファイル読み込みエラー:', error.details);
        throw error;
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const fileSize = arrayBuffer.byteLength;
      
      this.logDebug('GTFS ZIPファイル読み込み完了', { 
        path: zipPath, 
        size: `${(fileSize / 1024 / 1024).toFixed(2)} MB` 
      });
      
      // JSZipを使用してZIPファイルを解凍
      if (typeof JSZip === 'undefined') {
        const error = new Error('GTFSデータの解凍に失敗しました');
        error.code = 'GTFS_UNZIP_FAILED';
        error.details = 'JSZipライブラリが読み込まれていません';
        console.error('GTFS ZIPファイル解凍エラー:', error.details);
        throw error;
      }
      
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      this.logDebug('GTFS ZIPファイル解凍完了', { 
        path: zipPath,
        files: Object.keys(zip.files).length 
      });
      
      return zip;
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        throw error;
      }
      // その他のエラーの場合（要件1.7, 4.2）
      console.error('GTFS ZIPファイル読み込み/解凍エラー:', error);
      const wrappedError = new Error('GTFSデータの解凍に失敗しました');
      wrappedError.code = 'GTFS_UNZIP_FAILED';
      wrappedError.details = error.message;
      throw wrappedError;
    }
  }

  /**
   * 事前処理済みJSONファイルが利用可能かチェック
   * @returns {Promise<boolean>} JSONファイルが利用可能な場合はtrue
   */
  async checkProcessedDataAvailable() {
    try {
      // metadata.jsonの存在をチェック
      const response = await fetch('data/processed/metadata.json', { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 分割されたファイルを読み込んで結合
   * @param {string} baseName - ベースファイル名（例: 'stop_times'）
   * @param {Array<string>} partFiles - 分割されたファイル名のリスト
   * @param {Object} fileTimings - タイミング情報を記録するオブジェクト
   * @returns {Promise<Array>} 結合されたデータ
   */
  async loadSplitFiles(baseName, partFiles, fileTimings) {
    const loadWithTiming = async (filename) => {
      const startTime = Date.now();
      try {
        const response = await fetch(`data/processed/${filename}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const endTime = Date.now();
        const duration = endTime - startTime;
        fileTimings[filename] = duration;
        
        this.logDebug(`${filename} 読み込み完了: ${duration}ms (${data.length}件)`);
        return data;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        fileTimings[filename] = duration;
        throw error;
      }
    };

    // 分割されたファイルを並列で読み込む
    const parts = await Promise.all(partFiles.map(file => loadWithTiming(file)));
    
    // すべてのパーツを結合
    const combined = parts.flat();
    this.logDebug(`${baseName} 結合完了: ${combined.length}件 (${partFiles.length}ファイルから)`);
    
    return combined;
  }

  /**
   * ファイルが分割されているかチェック（メタデータから）
   * @param {string} baseName - ベースファイル名
   * @returns {Promise<Array<string>|null>} 分割されたファイル名のリスト、分割されていない場合はnull
   */
  async checkSplitFiles(baseName) {
    try {
      const response = await fetch('data/processed/metadata.json');
      if (!response.ok) {
        return null;
      }
      const metadata = await response.json();
      
      if (metadata.splitFiles && metadata.splitFiles[baseName]) {
        return metadata.splitFiles[baseName];
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 事前処理済みJSONファイルをプログレッシブに読み込む
   * 小さいファイルを先に読み込んでUIを早く表示し、その後大きなファイルを読み込む
   * Cloudflare Pagesの25MB制限に対応するため、分割されたファイルもサポート
   * @returns {Promise<Object>} パースされたGTFSデータ
   * @throws {Error} JSONファイルの読み込みに失敗した場合
   */
  async loadProcessedJSONFiles() {
    try {
      this.logDebug('事前処理済みJSONファイルの読み込み開始');
      const overallStartTime = Date.now();
      
      const fileTimings = {};
      
      const loadWithTiming = async (filename) => {
        const startTime = Date.now();
        try {
          const response = await fetch(`data/processed/${filename}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const endTime = Date.now();
          const duration = endTime - startTime;
          fileTimings[filename] = duration;
          
          this.logDebug(`${filename} 読み込み完了: ${duration}ms (${data.length}件)`);
          return data;
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          fileTimings[filename] = duration;
          throw error;
        }
      };
      
      // フェーズ1: 小さい必須ファイルを先に読み込む（UI表示に必要）
      // これらを先に読み込むことで、UIを早く表示できる
      const [
        stops,
        routes,
        calendar,
        agency
      ] = await Promise.all([
        loadWithTiming('stops.json'),
        loadWithTiming('routes.json'),
        loadWithTiming('calendar.json'),
        loadWithTiming('agency.json')
      ]);
      
      // フェーズ2: 中サイズのファイルを読み込む
      const [
        trips,
        fareAttributes
      ] = await Promise.all([
        loadWithTiming('trips.json'),
        loadWithTiming('fare_attributes.json').catch(() => []) // オプショナル
      ]);
      
      // フェーズ3: 大きなファイルを読み込む（分割されている可能性がある）
      let stopTimes, fareRules;
      
      // stop_times.jsonが分割されているかチェック
      const stopTimesParts = await this.checkSplitFiles('stop_times');
      if (stopTimesParts) {
        this.logDebug('stop_times.jsonは分割されています。分割ファイルを読み込みます...');
        stopTimes = await this.loadSplitFiles('stop_times', stopTimesParts, fileTimings);
      } else {
        stopTimes = await loadWithTiming('stop_times.json');
      }
      
      // fare_rules.jsonが分割されているかチェック
      const fareRulesParts = await this.checkSplitFiles('fare_rules');
      if (fareRulesParts) {
        this.logDebug('fare_rules.jsonは分割されています。分割ファイルを読み込みます...');
        fareRules = await this.loadSplitFiles('fare_rules', fareRulesParts, fileTimings).catch(() => []);
      } else {
        fareRules = await loadWithTiming('fare_rules.json').catch(() => []);
      }
      
      // feed_info.jsonからバージョン情報を読み取り（オプショナル）
      let feedInfo = null;
      try {
        feedInfo = await loadWithTiming('feed_info.json');
      } catch (e) {
        // feed_info.jsonが存在しない場合は無視
      }
      
      const overallEndTime = Date.now();
      const overallDuration = overallEndTime - overallStartTime;
      
      // バージョン情報を保存
      if (feedInfo && feedInfo.length > 0) {
        this.gtfsVersion = {
          publisher: feedInfo[0].feed_publisher_name || '',
          version: feedInfo[0].feed_version || '',
          startDate: feedInfo[0].feed_start_date || '',
          endDate: feedInfo[0].feed_end_date || ''
        };
      }
      
      this.logDebug('事前処理済みJSONファイルの読み込み完了', {
        totalDuration: `${overallDuration}ms`,
        fileTimings: fileTimings,
        recordCounts: {
          stops: stops.length,
          stopTimes: stopTimes.length,
          routes: routes.length,
          trips: trips.length,
          calendar: calendar.length,
          agency: agency.length,
          fareAttributes: fareAttributes.length,
          fareRules: fareRules.length
        }
      });
      
      return {
        stops: stops,
        stopTimes: stopTimes,
        routes: routes,
        trips: trips,
        calendar: calendar,
        agency: agency,
        fareAttributes: fareAttributes,
        fareRules: fareRules
      };
    } catch (error) {
      console.error('事前処理済みJSONファイル読み込みエラー:', error);
      const wrappedError = new Error('事前処理済みデータの読み込みに失敗しました');
      wrappedError.code = 'PROCESSED_DATA_LOAD_FAILED';
      wrappedError.details = error.message;
      throw wrappedError;
    }
  }

  /**
   * ./dataディレクトリ内のGTFS ZIPファイルを検索して選択
   * @returns {Promise<string>} 選択されたZIPファイルのパス
   * @throws {Error} ZIPファイルが見つからない場合
   */
  async findGTFSZipFile() {
    try {
      // saga-current.zipを優先的に試行
      const currentZipPath = 'data/saga-current.zip';
      try {
        const response = await fetch(currentZipPath, { method: 'HEAD' });
        if (response.ok) {
          this.logDebug('GTFS ZIPファイル選択', { path: currentZipPath, reason: 'saga-current.zipが存在' });
          return currentZipPath;
        }
      } catch (e) {
        // saga-current.zipが存在しない場合は続行
      }

      // saga-YYYY-MM-DD.zipファイルを検索
      // ブラウザ環境ではディレクトリ一覧を取得できないため、
      // 既知のファイル名パターンを試行するか、サーバー側でファイル一覧を提供する必要がある
      // ここでは、一般的な日付範囲を試行する方法を実装
      const today = new Date();
      const datePatterns = [];
      
      // 過去7日から未来7日までの日付パターンを生成（GTFSデータは通常1週間以内に更新される）
      for (let i = -7; i <= 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        datePatterns.push(`${year}-${month}-${day}`);
      }

      // 降順でソート（最新の日付から試行）
      datePatterns.sort().reverse();

      // 各日付パターンを試行
      for (const datePattern of datePatterns) {
        const zipPath = `data/saga-${datePattern}.zip`;
        try {
          const response = await fetch(zipPath, { method: 'HEAD' });
          if (response.ok) {
            this.logDebug('GTFS ZIPファイル選択', { path: zipPath, reason: `最新の日付ファイル: ${datePattern}` });
            return zipPath;
          }
        } catch (e) {
          // ファイルが存在しない場合は続行
        }
      }

      // どのファイルも見つからない場合（要件1.6, 4.1）
      const error = new Error('GTFSデータファイル(saga-*.zip)が見つかりません');
      error.code = 'GTFS_FILE_NOT_FOUND';
      console.error('GTFS ZIPファイル検索エラー:', error.message);
      throw error;
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        throw error;
      }
      // その他のエラーの場合
      console.error('GTFS ZIPファイル検索エラー:', error);
      const wrappedError = new Error('GTFSデータファイル(saga-*.zip)が見つかりません');
      wrappedError.code = 'GTFS_FILE_NOT_FOUND';
      throw wrappedError;
    }
  }

  /**
   * 全てのtripに方向情報を付与（新規メソッド）
   * @returns {void}
   */
  enrichTripsWithDirection() {
    if (!this.trips || this.trips.length === 0) {
      console.warn('DataLoader.enrichTripsWithDirection: tripsデータが空です');
      return;
    }

    if (!this.stopTimes || this.stopTimes.length === 0) {
      console.warn('DataLoader.enrichTripsWithDirection: stopTimesデータが空です');
      // 全てのtripにデフォルト値を設定
      this.trips.forEach(trip => {
        trip.direction = trip.direction_id || 'unknown';
      });
      return;
    }

    this.logDebug('方向判定開始');
    const startTime = Date.now();

    // 路線ごとにグループ化
    const tripsByRoute = new Map();
    this.trips.forEach(trip => {
      if (!tripsByRoute.has(trip.route_id)) {
        tripsByRoute.set(trip.route_id, []);
      }
      tripsByRoute.get(trip.route_id).push(trip);
    });

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // 各路線を処理
    tripsByRoute.forEach((trips, routeId) => {
      try {
        // direction_idが全て設定されている場合はスキップ
        const allHaveDirectionId = trips.every(trip => 
          trip.direction_id !== '' && 
          trip.direction_id !== null && 
          trip.direction_id !== undefined
        );

        if (allHaveDirectionId) {
          // direction_idをdirectionにコピー
          trips.forEach(trip => {
            trip.direction = trip.direction_id;
          });
          skippedCount++;
          return;
        }

        // 停留所順序ベースの方向判定を実行
        const directionMap = DirectionDetector.detectDirectionByStopSequence(
          routeId,
          trips,
          this.stopTimes
        );

        // 判定結果をtripに反映
        trips.forEach(trip => {
          if (trip.direction_id !== '' && trip.direction_id !== null && trip.direction_id !== undefined) {
            // direction_idが設定されている場合は優先
            trip.direction = trip.direction_id;
          } else if (directionMap.has(trip.trip_id)) {
            // 停留所順序ベースの判定結果を使用
            trip.direction = directionMap.get(trip.trip_id);
          } else {
            // 判定できない場合はunknown
            trip.direction = 'unknown';
          }
        });

        successCount++;
      } catch (error) {
        console.error(`DataLoader.enrichTripsWithDirection: 路線${routeId}の方向判定中にエラーが発生しました`, error);
        // エラーが発生した場合は全てunknownに設定
        trips.forEach(trip => {
          trip.direction = trip.direction_id || 'unknown';
        });
        failureCount++;
      }
    });

    const endTime = Date.now();
    this.logDebug('方向判定完了', {
      duration: `${endTime - startTime}ms`,
      totalRoutes: tripsByRoute.size,
      successCount: successCount,
      failureCount: failureCount,
      skippedCount: skippedCount
    });
  }

  /**
   * 全インデックスを生成（要件2.1, 7.1）
   * loadAllDataOnce()から呼び出される
   */
  generateIndexes() {
    this.logDebug('インデックス生成開始');
    
    // 方向別時刻表インデックスを生成（要件2.1）
    this.timetableByRouteAndDirection = this.generateTimetableByRouteAndDirection();
    
    // Trip-Stopマッピングを生成（要件3.1）
    this.tripStops = this.generateTripStops();
    
    // 路線メタデータを生成（要件4.1）
    this.routeMetadata = this.generateRouteMetadata();
    
    // stopToTrips逆引きインデックスを生成（要件5.1）
    this.stopToTrips = this.generateStopToTrips();
    
    // routeToTrips逆引きインデックスを生成（要件5.3）
    this.routeToTrips = this.generateRouteToTrips();
    
    // 停留所グループ化を生成（要件6.1）
    this.stopsGrouped = this.generateStopsGrouped();
    
    this.logDebug('インデックス生成完了');
  }

  /**
   * 方向別時刻表インデックスを生成（要件2.1, 2.2, 2.3, 2.4）
   * @returns {Object} { routeId: { '0': [...], '1': [...], 'unknown': [...] } }
   */
  generateTimetableByRouteAndDirection() {
    if (!this.timetable) {
      this.logDebug('時刻表データが読み込まれていないため、方向別インデックスを生成できません');
      return {};
    }
    
    this.logDebug('方向別時刻表インデックス生成開始', { timetableCount: this.timetable.length });
    const startTime = Date.now();
    
    const index = {};
    
    // 各時刻表エントリを路線IDと方向でグループ化
    this.timetable.forEach(entry => {
      const routeId = entry.routeNumber;
      const direction = entry.direction || 'unknown'; // 要件2.4: 方向がない場合は'unknown'
      
      // 路線IDのエントリを初期化
      if (!index[routeId]) {
        index[routeId] = {};
      }
      
      // 方向のエントリを初期化
      if (!index[routeId][direction]) {
        index[routeId][direction] = [];
      }
      
      // 時刻表エントリを追加
      index[routeId][direction].push(entry);
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 統計情報を収集
    const stats = {
      routeCount: Object.keys(index).length,
      directionCounts: {},
      totalEntries: 0
    };
    
    Object.keys(index).forEach(routeId => {
      Object.keys(index[routeId]).forEach(direction => {
        const count = index[routeId][direction].length;
        stats.totalEntries += count;
        
        if (!stats.directionCounts[direction]) {
          stats.directionCounts[direction] = 0;
        }
        stats.directionCounts[direction] += count;
      });
    });
    
    this.logDebug('方向別時刻表インデックス生成完了', {
      duration: `${duration}ms`,
      routeCount: stats.routeCount,
      directionCounts: stats.directionCounts,
      totalEntries: stats.totalEntries
    });
    
    return index;
  }

  /**
   * Trip-Stopマッピングを生成（要件3.1, 3.2, 3.3, 3.4）
   * @returns {Object} { tripId: [{ stopId, stopName, sequence, arrivalTime }] }
   */
  generateTripStops() {
    if (!this.stopTimes || !this.gtfsStops) {
      this.logDebug('stop_timesまたはstopsデータが読み込まれていないため、Trip-Stopマッピングを生成できません');
      return {};
    }
    
    this.logDebug('Trip-Stopマッピング生成開始', { stopTimesCount: this.stopTimes.length });
    const startTime = Date.now();
    
    const mapping = {};
    
    // stop_idから停留所名を取得するためのインデックスを作成
    const stopsIndex = {};
    this.gtfsStops.forEach(stop => {
      stopsIndex[stop.stop_id] = stop.stop_name;
    });
    
    // 各stop_timeをtripIdでグループ化
    this.stopTimes.forEach(st => {
      const tripId = st.trip_id;
      
      if (!mapping[tripId]) {
        mapping[tripId] = [];
      }
      
      const stopName = stopsIndex[st.stop_id] || '';
      
      mapping[tripId].push({
        stopId: st.stop_id,
        stopName: stopName,
        sequence: parseInt(st.stop_sequence),
        arrivalTime: st.arrival_time
      });
    });
    
    // 各tripの停留所リストをstop_sequenceでソート（要件3.4）
    Object.keys(mapping).forEach(tripId => {
      mapping[tripId].sort((a, b) => a.sequence - b.sequence);
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 統計情報を収集
    const stats = {
      tripCount: Object.keys(mapping).length,
      totalStops: 0,
      avgStopsPerTrip: 0
    };
    
    Object.keys(mapping).forEach(tripId => {
      stats.totalStops += mapping[tripId].length;
    });
    
    if (stats.tripCount > 0) {
      stats.avgStopsPerTrip = (stats.totalStops / stats.tripCount).toFixed(2);
    }
    
    this.logDebug('Trip-Stopマッピング生成完了', {
      duration: `${duration}ms`,
      tripCount: stats.tripCount,
      totalStops: stats.totalStops,
      avgStopsPerTrip: stats.avgStopsPerTrip
    });
    
    return mapping;
  }

  /**
   * 路線メタデータを生成（要件4.1, 4.2, 4.3, 4.4）
   * @returns {Object} { routeId: { directions: [...], headsigns: [...], tripCount: {...} } }
   */
  generateRouteMetadata() {
    if (!this.trips) {
      this.logDebug('tripsデータが読み込まれていないため、路線メタデータを生成できません');
      return {};
    }
    
    this.logDebug('路線メタデータ生成開始', { tripsCount: this.trips.length });
    const startTime = Date.now();
    
    const metadata = {};
    
    // 各tripを路線IDでグループ化し、メタデータを収集
    this.trips.forEach(trip => {
      const routeId = trip.route_id;
      
      // 路線IDのエントリを初期化
      if (!metadata[routeId]) {
        metadata[routeId] = {
          directions: new Set(),
          headsigns: new Set(),
          tripCount: {},
          unknownDirectionCount: 0,
          directionIdCount: 0,
          stopSequenceCount: 0
        };
      }
      
      // 方向を追加（要件4.2）
      const direction = trip.direction || 'unknown';
      metadata[routeId].directions.add(direction);
      
      // headsignを追加（要件4.3）
      if (trip.trip_headsign) {
        metadata[routeId].headsigns.add(trip.trip_headsign);
      }
      
      // trip数をカウント（要件4.4）
      if (!metadata[routeId].tripCount[direction]) {
        metadata[routeId].tripCount[direction] = 0;
      }
      metadata[routeId].tripCount[direction]++;
      
      // 方向不明の便数をカウント（要件5.1）
      if (direction === 'unknown') {
        metadata[routeId].unknownDirectionCount++;
      }
      
      // 判定方法を記録（要件5.3）
      if (trip.direction_id !== '' && trip.direction_id !== null && trip.direction_id !== undefined) {
        metadata[routeId].directionIdCount++;
      } else if (direction !== 'unknown') {
        metadata[routeId].stopSequenceCount++;
      }
    });
    
    // SetをArrayに変換し、方向判定成功率を計算
    Object.keys(metadata).forEach(routeId => {
      metadata[routeId].directions = Array.from(metadata[routeId].directions);
      metadata[routeId].headsigns = Array.from(metadata[routeId].headsigns);
      
      // 方向判定成功率を計算（要件5.2）
      const totalTrips = Object.values(metadata[routeId].tripCount).reduce((sum, count) => sum + count, 0);
      const unknownCount = metadata[routeId].unknownDirectionCount;
      metadata[routeId].directionDetectionRate = totalTrips > 0 ? (totalTrips - unknownCount) / totalTrips : 0;
      
      // 判定方法を決定（要件5.3）
      if (metadata[routeId].directionIdCount > 0) {
        metadata[routeId].detectionMethod = 'direction_id';
      } else if (metadata[routeId].stopSequenceCount > 0) {
        metadata[routeId].detectionMethod = 'stop_sequence';
      } else {
        metadata[routeId].detectionMethod = 'unknown';
      }
      
      // 路線名を取得
      if (this.routes) {
        const route = this.routes.find(r => r.route_id === routeId);
        metadata[routeId].routeName = route ? route.route_long_name : routeId;
      } else {
        metadata[routeId].routeName = routeId;
      }
      
      // 成功率が低い路線の警告ログを出力（要件5.5）
      if (metadata[routeId].directionDetectionRate < 0.5) {
        console.warn(`DataLoader.generateRouteMetadata: 路線${metadata[routeId].routeName}(${routeId})の方向判定成功率が低いです`, {
          detectionRate: `${(metadata[routeId].directionDetectionRate * 100).toFixed(1)}%`,
          unknownCount: unknownCount,
          totalTrips: totalTrips
        });
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 統計情報を収集
    const stats = {
      routeCount: Object.keys(metadata).length,
      totalTrips: this.trips.length,
      avgTripsPerRoute: 0,
      bidirectionalRoutes: 0,
      averageDetectionRate: 0
    };
    
    let totalDetectionRate = 0;
    Object.keys(metadata).forEach(routeId => {
      // 双方向路線をカウント
      if (metadata[routeId].directions.length >= 2) {
        stats.bidirectionalRoutes++;
      }
      
      // 平均方向判定成功率を計算
      totalDetectionRate += metadata[routeId].directionDetectionRate;
    });
    
    if (stats.routeCount > 0) {
      stats.avgTripsPerRoute = (stats.totalTrips / stats.routeCount).toFixed(2);
      stats.averageDetectionRate = `${(totalDetectionRate / stats.routeCount * 100).toFixed(1)}%`;
    }
    
    this.logDebug('路線メタデータ生成完了', {
      duration: `${duration}ms`,
      routeCount: stats.routeCount,
      totalTrips: stats.totalTrips,
      avgTripsPerRoute: stats.avgTripsPerRoute,
      bidirectionalRoutes: stats.bidirectionalRoutes,
      averageDetectionRate: stats.averageDetectionRate
    });
    
    return metadata;
  }

  /**
   * stopToTrips逆引きインデックスを生成（要件5.1, 5.2）
   * @returns {Object} { stopId: [tripId1, tripId2, ...] }
   */
  generateStopToTrips() {
    if (!this.stopTimes) {
      this.logDebug('stop_timesデータが読み込まれていないため、stopToTripsインデックスを生成できません');
      return {};
    }
    
    this.logDebug('stopToTripsインデックス生成開始', { stopTimesCount: this.stopTimes.length });
    const startTime = Date.now();
    
    const index = {};
    
    // 各stop_timeを停留所IDでグループ化
    this.stopTimes.forEach(st => {
      const stopId = st.stop_id;
      const tripId = st.trip_id;
      
      // 停留所IDのエントリを初期化
      if (!index[stopId]) {
        index[stopId] = [];
      }
      
      // tripIdを追加（重複チェック）
      if (!index[stopId].includes(tripId)) {
        index[stopId].push(tripId);
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 統計情報を収集
    const stats = {
      stopCount: Object.keys(index).length,
      totalTrips: 0,
      avgTripsPerStop: 0,
      maxTripsPerStop: 0,
      minTripsPerStop: Infinity
    };
    
    Object.keys(index).forEach(stopId => {
      const tripCount = index[stopId].length;
      stats.totalTrips += tripCount;
      stats.maxTripsPerStop = Math.max(stats.maxTripsPerStop, tripCount);
      stats.minTripsPerStop = Math.min(stats.minTripsPerStop, tripCount);
    });
    
    if (stats.stopCount > 0) {
      stats.avgTripsPerStop = (stats.totalTrips / stats.stopCount).toFixed(2);
    }
    
    this.logDebug('stopToTripsインデックス生成完了', {
      duration: `${duration}ms`,
      stopCount: stats.stopCount,
      totalTrips: stats.totalTrips,
      avgTripsPerStop: stats.avgTripsPerStop,
      maxTripsPerStop: stats.maxTripsPerStop,
      minTripsPerStop: stats.minTripsPerStop === Infinity ? 0 : stats.minTripsPerStop
    });
    
    return index;
  }

  /**
   * routeToTrips逆引きインデックスを生成（要件5.3, 5.4）
   * @returns {Object} { routeId: { '0': [tripIds], '1': [tripIds], 'unknown': [tripIds] } }
   */
  generateRouteToTrips() {
    if (!this.trips) {
      this.logDebug('tripsデータが読み込まれていないため、routeToTripsインデックスを生成できません');
      return {};
    }
    
    this.logDebug('routeToTripsインデックス生成開始', { tripsCount: this.trips.length });
    const startTime = Date.now();
    
    const index = {};
    
    // 各tripを路線IDと方向でグループ化
    this.trips.forEach(trip => {
      const routeId = trip.route_id;
      const direction = trip.direction || 'unknown';
      const tripId = trip.trip_id;
      
      // 路線IDのエントリを初期化
      if (!index[routeId]) {
        index[routeId] = {};
      }
      
      // 方向のエントリを初期化
      if (!index[routeId][direction]) {
        index[routeId][direction] = [];
      }
      
      // tripIdを追加
      index[routeId][direction].push(tripId);
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 統計情報を収集
    const stats = {
      routeCount: Object.keys(index).length,
      totalTrips: this.trips.length,
      directionCounts: {},
      avgTripsPerRoute: 0
    };
    
    Object.keys(index).forEach(routeId => {
      Object.keys(index[routeId]).forEach(direction => {
        const count = index[routeId][direction].length;
        
        if (!stats.directionCounts[direction]) {
          stats.directionCounts[direction] = 0;
        }
        stats.directionCounts[direction] += count;
      });
    });
    
    if (stats.routeCount > 0) {
      stats.avgTripsPerRoute = (stats.totalTrips / stats.routeCount).toFixed(2);
    }
    
    this.logDebug('routeToTripsインデックス生成完了', {
      duration: `${duration}ms`,
      routeCount: stats.routeCount,
      totalTrips: stats.totalTrips,
      directionCounts: stats.directionCounts,
      avgTripsPerRoute: stats.avgTripsPerRoute
    });
    
    return index;
  }

  /**
   * 停留所グループ化を生成（要件6.1, 6.2, 6.3, 6.4）
   * @returns {Object} { parentStation: [{ id, name, lat, lng }] }
   */
  generateStopsGrouped() {
    if (!this.busStops) {
      this.logDebug('バス停データが読み込まれていないため、停留所グループ化を生成できません');
      return {};
    }
    
    this.logDebug('停留所グループ化生成開始', { busStopsCount: this.busStops.length });
    const startTime = Date.now();
    
    const grouped = {};
    
    // 各バス停をparent_stationでグループ化
    this.busStops.forEach(stop => {
      // parent_stationが存在する場合のみグループ化
      if (stop.parentStation) {
        const parentStation = stop.parentStation;
        
        // 親駅のエントリを初期化
        if (!grouped[parentStation]) {
          grouped[parentStation] = [];
        }
        
        // バス停を追加
        grouped[parentStation].push({
          id: stop.id,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng
        });
      }
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 統計情報を収集
    const stats = {
      parentStationCount: Object.keys(grouped).length,
      totalStops: 0,
      avgStopsPerParent: 0,
      maxStopsPerParent: 0,
      minStopsPerParent: Infinity
    };
    
    Object.keys(grouped).forEach(parentStation => {
      const stopCount = grouped[parentStation].length;
      stats.totalStops += stopCount;
      stats.maxStopsPerParent = Math.max(stats.maxStopsPerParent, stopCount);
      stats.minStopsPerParent = Math.min(stats.minStopsPerParent, stopCount);
    });
    
    if (stats.parentStationCount > 0) {
      stats.avgStopsPerParent = (stats.totalStops / stats.parentStationCount).toFixed(2);
    }
    
    this.logDebug('停留所グループ化生成完了', {
      duration: `${duration}ms`,
      parentStationCount: stats.parentStationCount,
      totalStops: stats.totalStops,
      avgStopsPerParent: stats.avgStopsPerParent,
      maxStopsPerParent: stats.maxStopsPerParent,
      minStopsPerParent: stats.minStopsPerParent === Infinity ? 0 : stats.minStopsPerParent
    });
    
    return grouped;
  }

  /**
   * データが既に読み込まれているかチェック（要件1.5）
   * @returns {boolean} 全てのデータが読み込まれている場合はtrue
   */
  isDataLoaded() {
    return this.busStops !== null && 
           this.timetable !== null && 
           this.fares !== null &&
           this.fareRules !== null &&
           this.stopTimes !== null &&
           this.trips !== null &&
           this.routes !== null &&
           this.calendar !== null &&
           this.gtfsStops !== null &&
           this.timetableByRouteAndDirection !== null && // 要件2.1: インデックスもチェック
           this.tripStops !== null && // 要件3.1: Trip-Stopマッピングもチェック
           this.routeMetadata !== null && // 要件4.1: 路線メタデータもチェック
           this.stopToTrips !== null && // 要件5.1: stopToTripsインデックスもチェック
           this.routeToTrips !== null && // 要件5.3: routeToTripsインデックスもチェック
           this.stopsGrouped !== null; // 要件6.1: 停留所グループ化もチェック
  }

  /**
   * デバッグモードの有効/無効を設定
   * @param {boolean} enabled - デバッグモードを有効にする場合はtrue
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`デバッグモード: ${enabled ? '有効' : '無効'}`);
  }

  /**
   * デバッグログを出力（デバッグモードが有効な場合のみ）
   * @param {string} message - ログメッセージ
   * @param {Object} data - ログデータ（オプション）
   */
  logDebug(message, data = null) {
    if (this.debugMode) {
      if (data) {
        console.log(`[DataLoader] ${message}:`, data);
      } else {
        console.log(`[DataLoader] ${message}`);
      }
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.busStops = null;
    this.timetable = null;
    this.fares = null;
    this.fareRules = null;
    this.stopTimes = null;
    this.trips = null;
    this.routes = null;
    this.calendar = null;
    this.gtfsStops = null;
    this.timetableByRouteAndDirection = null; // 要件2.1: インデックスもクリア
    this.tripStops = null; // 要件3.1: Trip-Stopマッピングもクリア
    this.routeMetadata = null; // 要件4.1: 路線メタデータもクリア
    this.stopToTrips = null; // 要件5.1: stopToTripsインデックスもクリア
    this.routeToTrips = null; // 要件5.3: routeToTripsインデックスもクリア
    this.stopsGrouped = null; // 要件6.1: 停留所グループ化もクリア
    
    // バス停マッピングもクリア
    this.busStopMapping = null;
  }

  /**
   * バス停マッピングファイルを読み込み
   * @returns {Promise<void>}
   */
  async loadBusStopMapping() {
    try {
      // キャッシュバスターを追加して最新のCSVファイルを読み込む
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`./data/bus_stops_mapping.csv${cacheBuster}`);
      if (!response.ok) {
        this.logDebug('バス停マッピングファイルが見つかりません。多言語対応は無効になります。');
        this.busStopMapping = [];
        return;
      }
      
      const text = await response.text();
      const parsedData = GTFSParser.parse(text);
      
      // CSVの列名（Japanese, English, Source）を小文字に変換して統一
      // BusStopTranslatorが期待する形式に変換
      this.busStopMapping = parsedData.map(row => {
        // 列名の大文字小文字を考慮
        const japanese = row.Japanese || row.japanese || row['Japanese'] || '';
        const english = row.English || row.english || row['English'] || '';
        const source = row.Source || row.source || row['Source'] || 'Auto-translated';
        
        return {
          japanese: japanese.trim(),
          english: english.trim(),
          source: source.trim()
        };
      }).filter(mapping => mapping.japanese && mapping.english);
      
      this.logDebug('バス停マッピング読み込み完了', {
        mappingCount: this.busStopMapping.length
      });
      
    } catch (error) {
      console.warn('バス停マッピングファイルの読み込みに失敗しました:', error);
      this.busStopMapping = [];
    }
  }

  /**
   * バス停マッピングデータを取得
   * @returns {Array} バス停マッピングデータ
   */
  getBusStopMapping() {
    return this.busStopMapping || [];
  }

  /**
   * 路線名マッピングファイルを読み込み
   * @returns {Promise<void>}
   */
  async loadRouteNameMapping() {
    try {
      // キャッシュバスターを追加して最新のCSVファイルを読み込む
      const cacheBuster = `?t=${Date.now()}`;
      const response = await fetch(`./data/route_names_mapping.csv${cacheBuster}`);
      if (!response.ok) {
        this.logDebug('路線名マッピングファイルが見つかりません。多言語対応は無効になります。');
        this.routeNameMapping = [];
        return;
      }
      
      const text = await response.text();
      const parsedData = GTFSParser.parse(text);
      
      // CSVの列名（route_id, Japanese, English, Source）を処理
      // RouteNameTranslatorが期待する形式に変換
      this.routeNameMapping = parsedData.map(row => {
        // 列名の大文字小文字を考慮
        const routeId = row.route_id || row['route_id'] || '';
        const japanese = row.Japanese || row.japanese || row['Japanese'] || '';
        const english = row.English || row.english || row['English'] || '';
        const source = row.Source || row.source || row['Source'] || 'Auto-translated';
        
        return {
          routeId: routeId.trim(),
          japanese: japanese.trim(),
          english: english.trim(),
          source: source.trim()
        };
      }).filter(mapping => mapping.japanese && mapping.english);
      
      this.logDebug('路線名マッピング読み込み完了', {
        mappingCount: this.routeNameMapping.length
      });
      
    } catch (error) {
      console.warn('路線名マッピングファイルの読み込みに失敗しました:', error);
      this.routeNameMapping = [];
    }
  }

  /**
   * 路線名マッピングデータを取得
   * @returns {Array} 路線名マッピングデータ
   */
  getRouteNameMapping() {
    return this.routeNameMapping || [];
  }
}

/**
 * DataTransformerクラス
 * GTFSデータを既存のアプリケーション形式に変換
 */
class DataTransformer {
  /**
   * stops.txtを既存形式に変換
   * @param {Array} stopsData - stops.txtのデータ
   * @param {Function} progressCallback - 進捗状況を報告するコールバック関数（オプション）
   * @returns {Array} 変換されたバス停データ
   */
  static transformStops(stopsData, progressCallback = null) {
    const startTime = Date.now();
    
    if (progressCallback) {
      progressCallback('バス停データ変換開始', { totalRecords: stopsData.length });
    }
    
    // 要件6.3: location_type='0'のバス停のみをフィルタ（不要なデータの除外）
    const result = stopsData
      .filter(row => row.location_type === '0') // バス停のみ（親駅を除外）
      .map(row => ({
        id: row.stop_id,
        name: row.stop_name,
        lat: parseFloat(row.stop_lat),
        lng: parseFloat(row.stop_lon),
        parentStation: row.parent_station || null // 要件6.1: parent_stationフィールドを保持
      }));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (progressCallback) {
      progressCallback('バス停データ変換完了', { 
        duration: `${duration}ms`,
        filteredCount: result.length,
        originalCount: stopsData.length,
        excludedCount: stopsData.length - result.length
      });
    }
    
    return result;
  }

  /**
   * stop_times.txt、trips.txt、routes.txt、calendar.txt、agency.txtを結合して時刻表データに変換
   * @param {Array} stopTimesData - stop_times.txtのデータ
   * @param {Array} tripsData - trips.txtのデータ
   * @param {Array} routesData - routes.txtのデータ
   * @param {Array} calendarData - calendar.txtのデータ
   * @param {Array} agencyData - agency.txtのデータ
   * @param {Array} stopsData - stops.txtのデータ（バス停名取得用）
   * @param {Function} progressCallback - 進捗状況を報告するコールバック関数（オプション）
   * @returns {Array} 変換された時刻表データ
   */
  static transformTimetable(stopTimesData, tripsData, routesData, calendarData, agencyData, stopsData, progressCallback = null) {
    const startTime = Date.now();
    
    // インデックスを作成（検索最適化）
    const indexStartTime = Date.now();
    const tripsIndex = this.createIndex(tripsData, 'trip_id');
    const routesIndex = this.createIndex(routesData, 'route_id');
    const calendarIndex = this.createIndex(calendarData, 'service_id');
    const agencyIndex = this.createIndex(agencyData, 'agency_id');
    const stopsIndex = this.createIndex(stopsData, 'stop_id');
    const indexEndTime = Date.now();
    
    if (progressCallback) {
      progressCallback('インデックス作成完了', { duration: `${indexEndTime - indexStartTime}ms` });
    }

    const transformStartTime = Date.now();
    const totalRecords = stopTimesData.length;
    let processedRecords = 0;
    const progressInterval = Math.max(1, Math.floor(totalRecords / 10)); // 10%ごとに進捗報告
    
    const result = stopTimesData.map((stopTime, index) => {
      const trip = tripsIndex[stopTime.trip_id];
      const route = trip ? routesIndex[trip.route_id] : null;
      const calendar = trip ? calendarIndex[trip.service_id] : null;
      const agency = route ? agencyIndex[route.agency_id] : null;
      const stop = stopsIndex[stopTime.stop_id];

      // arrival_timeから時と分を抽出（HH:MM:SS形式）
      const [hour, minute] = stopTime.arrival_time.split(':').map(Number);

      // 曜日区分を判定
      const weekdayType = this.determineWeekdayType(calendar);

      // 要件3.1, 3.2: trip.directionプロパティを優先的に参照
      let direction = 'unknown';
      if (trip && route) {
        // trip.directionプロパティが設定されている場合は優先的に使用（要件3.2）
        if (trip.direction !== undefined && trip.direction !== null) {
          direction = trip.direction;
        } else {
          // フォールバック: DirectionDetectorを使用（要件3.3）
          if (typeof DirectionDetector !== 'undefined') {
            direction = DirectionDetector.detectDirection(trip, route.route_id, tripsData);
          }
        }
      }

      processedRecords++;
      
      // 要件7.3: データ変換の進捗状況をログ出力
      if (progressCallback && processedRecords % progressInterval === 0) {
        const progress = Math.floor((processedRecords / totalRecords) * 100);
        progressCallback('時刻表データ変換中', { 
          progress: `${progress}%`,
          processed: processedRecords,
          total: totalRecords
        });
      }

      return {
        routeNumber: route ? route.route_id : '',
        tripId: stopTime.trip_id,
        stopSequence: parseInt(stopTime.stop_sequence),
        stopName: stop ? stop.stop_name : '',
        hour: hour,
        minute: minute,
        weekdayType: weekdayType,
        routeName: route ? route.route_long_name : '',
        operator: agency ? agency.agency_name : '',
        direction: direction // 要件1.4: 方向情報を追加
      };
    });
    
    const transformEndTime = Date.now();
    const totalDuration = transformEndTime - startTime;
    
    // 要件3.3: 重複データの検出
    const duplicateCheckStartTime = Date.now();
    const uniqueKeys = new Set();
    const duplicates = [];
    
    result.forEach((record, index) => {
      const key = `${record.tripId}-${record.stopSequence}`;
      if (uniqueKeys.has(key)) {
        duplicates.push({
          index: index,
          tripId: record.tripId,
          stopSequence: record.stopSequence,
          stopName: record.stopName,
          hour: record.hour,
          minute: record.minute
        });
      } else {
        uniqueKeys.add(key);
      }
    });
    
    const duplicateCheckEndTime = Date.now();
    
    // 要件3.3: 重複が検出された場合は警告ログを出力（常に出力）
    if (duplicates.length > 0) {
      console.warn(`[DataTransformer] ⚠️ 重複データが検出されました: ${duplicates.length}件`);
    }
    
    if (progressCallback) {
      progressCallback('時刻表データ変換完了', { 
        duration: `${totalDuration}ms`,
        transformDuration: `${transformEndTime - transformStartTime}ms`,
        recordCount: result.length,
        duplicateCount: duplicates.length
      });
    }

    return result;
  }

  /**
   * fare_attributes.txtを既存形式に変換
   * @param {Array} fareAttributesData - fare_attributes.txtのデータ
   * @param {Function} progressCallback - 進捗状況を報告するコールバック関数（オプション）
   * @returns {Array} 変換された運賃データ
   */
  static transformFares(fareAttributesData, progressCallback = null) {
    const startTime = Date.now();
    
    if (progressCallback) {
      progressCallback('運賃データ変換開始', { totalRecords: fareAttributesData.length });
    }
    
    // fare_attributes.txtをFareCalculatorで使用する形式に変換
    const result = fareAttributesData.map(fare => ({
      fareId: fare.fare_id,
      price: parseFloat(fare.price),
      currencyType: fare.currency_type,
      paymentMethod: parseInt(fare.payment_method),
      transfers: parseInt(fare.transfers),
      agencyId: fare.agency_id
    }));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (progressCallback) {
      progressCallback('運賃データ変換完了', { 
        duration: `${duration}ms`,
        recordCount: result.length
      });
    }
    
    return result;
  }

  /**
   * fare_rules.txtを変換
   * @param {Array} fareRulesData - fare_rules.txtのデータ
   * @param {Function} progressCallback - 進捗状況を報告するコールバック関数（オプション）
   * @returns {Array} 変換された運賃ルールデータ
   */
  static transformFareRules(fareRulesData, progressCallback = null) {
    const startTime = Date.now();
    
    if (progressCallback) {
      progressCallback('運賃ルールデータ変換開始', { totalRecords: fareRulesData.length });
    }
    
    // fare_rules.txtをそのまま変換（FareCalculatorで使用）
    const result = fareRulesData.map(rule => ({
      fareId: rule.fare_id,
      routeId: rule.route_id || null,
      originId: rule.origin_id || null,
      destinationId: rule.destination_id || null,
      containsId: rule.contains_id || null
    }));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (progressCallback) {
      progressCallback('運賃ルールデータ変換完了', { 
        duration: `${duration}ms`,
        recordCount: result.length
      });
    }
    
    return result;
  }

  /**
   * インデックスを作成（キーでの高速検索用）
   * @param {Array} data - データ配列
   * @param {string} key - インデックスキー
   * @returns {Object} インデックス
   */
  static createIndex(data, key) {
    const index = {};
    data.forEach(item => {
      index[item[key]] = item;
    });
    return index;
  }

  /**
   * カレンダー情報から曜日区分を判定
   * @param {Object} calendar - calendar.txtの1レコード
   * @returns {string} 曜日区分（'平日' or '土日祝'）
   */
  static determineWeekdayType(calendar) {
    if (!calendar) return '平日';

    // service_idに「平日」「土日祝」などのキーワードが含まれているか確認
    const serviceId = calendar.service_id.toLowerCase();
    if (serviceId.includes('土日祝') || serviceId.includes('土曜') || serviceId.includes('日曜')) {
      return '土日祝';
    }

    // monday-fridayが1で、saturday-sundayが0なら平日
    if (calendar.monday === '1' && calendar.friday === '1' && 
        calendar.saturday === '0' && calendar.sunday === '0') {
      return '平日';
    }

    // saturday-sundayが1なら土日祝
    if (calendar.saturday === '1' || calendar.sunday === '1') {
      return '土日祝';
    }

    // デフォルトは平日
    return '平日';
  }
}

// グローバルに公開
window.DataLoader = DataLoader;
window.GTFSParser = GTFSParser;
window.DataTransformer = DataTransformer;
