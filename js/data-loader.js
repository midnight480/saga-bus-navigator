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
    
    // タイムアウト設定（ミリ秒）- ZIPファイルサイズを考慮して5秒に延長
    this.timeout = 5000;
    
    // デバッグモード
    this.debugMode = false;
    
    // GTFSバージョン情報
    this.gtfsVersion = null;
  }

  /**
   * 全データを並列読み込み
   * @returns {Promise<{busStops: Array, timetable: Array, fares: Array}>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadAllData() {
    try {
      // 3つのデータを並列読み込み
      const [busStopsData, timetableData, faresData] = await Promise.all([
        this.loadBusStops(),
        this.loadTimetable(),
        this.loadFares()
      ]);

      return {
        busStops: busStopsData,
        timetable: timetableData,
        fares: faresData
      };
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
   * TimetableController用のGTFSデータを読み込み
   * @returns {Promise<void>}
   * @throws {Error} データ読み込みに失敗した場合
   */
  async loadGTFSData() {
    // キャッシュチェック
    if (this.stopTimes && this.trips && this.routes && this.calendar && this.gtfsStops) {
      this.logDebug('GTFSデータをキャッシュから取得');
      return;
    }

    try {
      this.logDebug('GTFSデータの読み込み開始');
      const overallStartTime = Date.now();
      
      // GTFS ZIPファイルを検索
      const zipPath = await this.findGTFSZipFile();
      
      // ZIPファイルを読み込んで解凍
      const zip = await this.loadGTFSZip(zipPath);
      
      // GTFSファイルをパース
      const gtfsData = await this.parseGTFSFiles(zip);
      
      // GTFSデータをそのまま保存（変換不要）
      this.stopTimes = gtfsData.stopTimes;
      this.trips = gtfsData.trips;
      this.routes = gtfsData.routes;
      this.calendar = gtfsData.calendar;
      this.gtfsStops = gtfsData.stops; // 生のstops.txtデータ
      
      const overallEndTime = Date.now();
      this.logDebug('GTFSデータの読み込み完了', { 
        stopTimesCount: this.stopTimes.length,
        tripsCount: this.trips.length,
        routesCount: this.routes.length,
        calendarCount: this.calendar.length,
        gtfsStopsCount: this.gtfsStops.length,
        totalDuration: `${overallEndTime - overallStartTime}ms`
      });
    } catch (error) {
      // エラーコードが設定されている場合はそのまま再スロー
      if (error.code) {
        console.error('GTFSデータ読み込みエラー:', error.message);
        throw error;
      }
      // その他のエラー
      console.error('GTFSデータ読み込みエラー:', error);
      throw new Error('GTFSデータの読み込みに失敗しました');
    }
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
          this.logDebug(`${filename} 読み込み時間`, { duration: `${duration}ms` });
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
      
      this.logDebug('GTFSファイルのパース時間', { duration: `${parseDuration}ms` });
      
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
      
      // 要件7.1, 7.2: デバッグモードで読み込み時間とレコード数をログ出力
      this.logDebug('GTFSファイルのパース完了', {
        totalDuration: `${overallDuration}ms`,
        parseDuration: `${parseDuration}ms`,
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
        lng: parseFloat(row.stop_lon)
      }));
    
    const endTime = Date.now();
    
    if (progressCallback) {
      progressCallback('バス停データ変換完了', { 
        duration: `${endTime - startTime}ms`,
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
        operator: agency ? agency.agency_name : ''
      };
    });
    
    const transformEndTime = Date.now();
    const totalDuration = transformEndTime - startTime;
    
    if (progressCallback) {
      progressCallback('時刻表データ変換完了', { 
        duration: `${totalDuration}ms`,
        transformDuration: `${transformEndTime - transformStartTime}ms`,
        recordCount: result.length
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
    
    if (progressCallback) {
      progressCallback('運賃データ変換完了', { 
        duration: `${endTime - startTime}ms`,
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
    
    if (progressCallback) {
      progressCallback('運賃ルールデータ変換完了', { 
        duration: `${endTime - startTime}ms`,
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
