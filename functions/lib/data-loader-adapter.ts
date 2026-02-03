/**
 * DataLoaderAdapter
 * 既存のDataLoaderをCloudflare Pages Functions環境で使用するためのアダプター
 */

import JSZip from 'jszip';

// 型定義
interface BusStop {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface TimetableEntry {
  tripId: string;
  stopId: string;
  stopName: string;
  routeNumber: string;
  routeName: string;
  operator: string;
  hour: number;
  minute: number;
  stopSequence: number;
  weekdayType: string;
  tripHeadsign: string;
  direction: string;
}

interface Fare {
  from: string;
  to: string;
  operator: string;
  adultFare: number;
  childFare: number;
}

interface GTFSData {
  stops: any[];
  stopTimes: any[];
  routes: any[];
  trips: any[];
  calendar: any[];
  agency: any[];
}

export class DataLoaderAdapter {
  private static instance: DataLoaderAdapter | null = null;
  private dataLoader: any = null;
  private isInitialized: boolean = false;
  private baseUrl: string = '';
  private kvNamespace: KVNamespace | null = null;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): DataLoaderAdapter {
    if (!DataLoaderAdapter.instance) {
      DataLoaderAdapter.instance = new DataLoaderAdapter();
    }
    return DataLoaderAdapter.instance;
  }

  /**
   * KV Namespaceを設定
   */
  setKVNamespace(kv: KVNamespace): void {
    this.kvNamespace = kv;
  }

  /**
   * ベースURLを設定
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * GTFSデータを読み込み（初回のみ、以降はキャッシュ）
   */
  async loadData(): Promise<void> {
    if (this.isInitialized) {
      console.log('[DataLoaderAdapter] データは既に読み込まれています');
      return;
    }

    try {
      console.log('[DataLoaderAdapter] GTFSデータの読み込みを開始します');
      
      // KVから読み込みを試行
      if (this.kvNamespace) {
        console.log('[DataLoaderAdapter] KVからデータを読み込みます');
        const gtfsData = await this.loadFromKV();
        if (gtfsData) {
          // データを変換してキャッシュ
          this.dataLoader = {
            busStops: this.transformStops(gtfsData.stops),
            timetable: this.transformTimetable(gtfsData),
            fares: this.transformFares(gtfsData.fareAttributes),
            gtfsData: gtfsData
          };
          this.isInitialized = true;
          console.log('[DataLoaderAdapter] KVからのデータ読み込みが完了しました');
          return;
        }
      }
      
      // KVから読み込めない場合はZIPファイルから読み込み
      console.log('[DataLoaderAdapter] ZIPファイルからデータを読み込みます');
      const zipPath = await this.findGTFSZipFile();
      console.log('[DataLoaderAdapter] ZIPファイルを検出:', zipPath);
      
      // ZIPファイルを読み込んで解凍
      const zip = await this.loadGTFSZip(zipPath);
      
      // GTFSファイルをパース
      const gtfsData = await this.parseGTFSFiles(zip);
      
      // データを変換してキャッシュ
      this.dataLoader = {
        busStops: this.transformStops(gtfsData.stops),
        timetable: this.transformTimetable(gtfsData),
        fares: this.transformFares(gtfsData.fareAttributes),
        gtfsData: gtfsData
      };
      
      this.isInitialized = true;
      console.log('[DataLoaderAdapter] GTFSデータの読み込みが完了しました', {
        busStops: this.dataLoader.busStops.length,
        timetable: this.dataLoader.timetable.length,
        fares: this.dataLoader.fares.length
      });
    } catch (error) {
      console.error('[DataLoaderAdapter] データ読み込みエラー:', error);
      throw new Error('GTFSデータの読み込みに失敗しました');
    }
  }

  /**
   * バス停マスタを取得
   */
  getBusStops(): BusStop[] {
    if (!this.isInitialized || !this.dataLoader) {
      throw new Error('データが読み込まれていません。loadData()を先に呼び出してください');
    }
    
    return this.dataLoader.busStops;
  }

  /**
   * 時刻表データを取得
   */
  getTimetable(): TimetableEntry[] {
    if (!this.isInitialized || !this.dataLoader) {
      throw new Error('データが読み込まれていません。loadData()を先に呼び出してください');
    }
    
    return this.dataLoader.timetable;
  }

  /**
   * 運賃データを取得
   */
  getFares(): Fare[] {
    if (!this.isInitialized || !this.dataLoader) {
      throw new Error('データが読み込まれていません。loadData()を先に呼び出してください');
    }
    
    return this.dataLoader.fares;
  }

  /**
   * GTFSデータを取得（SearchController用）
   */
  getGTFSData(): GTFSData {
    if (!this.isInitialized || !this.dataLoader) {
      throw new Error('データが読み込まれていません。loadData()を先に呼び出してください');
    }
    
    return this.dataLoader.gtfsData;
  }

  /**
   * バス停名で曖昧検索
   * @param query 検索クエリ
   * @returns マッチしたバス停の配列
   */
  searchBusStops(query: string): BusStop[] {
    const busStops = this.getBusStops();
    const lowerQuery = query.toLowerCase();
    
    // 部分一致検索（例: "佐賀駅"で"佐賀駅(1)"、"佐賀駅(2)"もヒット）
    return busStops.filter(stop => 
      stop.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * KVからGTFSデータを読み込み
   */
  private async loadFromKV(): Promise<GTFSData | null> {
    if (!this.kvNamespace) {
      return null;
    }

    try {
      // current_versionを取得
      const currentVersion = await this.kvNamespace.get('current_version');
      if (!currentVersion) {
        console.log('[DataLoaderAdapter] KVにcurrent_versionが見つかりません');
        return null;
      }

      console.log('[DataLoaderAdapter] KVバージョン:', currentVersion);

      // 各テーブルを読み込み
      const [stops, routes, trips, calendar, agency, fareAttributes] = await Promise.all([
        this.kvNamespace.get(`gtfs:v${currentVersion}:stops`, 'json'),
        this.kvNamespace.get(`gtfs:v${currentVersion}:routes`, 'json'),
        this.kvNamespace.get(`gtfs:v${currentVersion}:trips`, 'json'),
        this.kvNamespace.get(`gtfs:v${currentVersion}:calendar`, 'json'),
        this.kvNamespace.get(`gtfs:v${currentVersion}:agency`, 'json'),
        this.kvNamespace.get(`gtfs:v${currentVersion}:fare_attributes`, 'json'),
      ]);

      // stop_timesは分割されている可能性があるので、全チャンクを読み込む
      const stopTimesChunks: any[] = [];
      let chunkIndex = 0;
      while (true) {
        const chunk = await this.kvNamespace.get(`gtfs:v${currentVersion}:stop_times_${chunkIndex}`, 'json');
        if (!chunk) break;
        stopTimesChunks.push(...chunk);
        chunkIndex++;
      }

      return {
        stops: stops || [],
        stopTimes: stopTimesChunks,
        routes: routes || [],
        trips: trips || [],
        calendar: calendar || [],
        agency: agency || [],
        fareAttributes: fareAttributes || []
      };
    } catch (error) {
      console.error('[DataLoaderAdapter] KVからの読み込みエラー:', error);
      return null;
    }
  }

  /**
   * バス停名から親バス停名を抽出
   * 例: "佐賀駅バスセンター 1番のりば" → "佐賀駅バスセンター"
   */
  extractParentStopName(stopName: string): string | null {
    // パターン1: "〜 N番のりば" (N は数字)
    const pattern1 = /^(.+?)\s+\d+番のりば$/;
    const match1 = stopName.match(pattern1);
    if (match1) {
      return match1[1].trim();
    }

    // パターン2: "〜(N)" (N は数字)
    const pattern2 = /^(.+?)\s*\(\d+\)$/;
    const match2 = stopName.match(pattern2);
    if (match2) {
      return match2[1].trim();
    }

    // パターンにマッチしない場合はnull
    return null;
  }

  /**
   * バス停をグループ化
   * 同じ親バス停名を持つバス停をグループ化する
   */
  groupBusStops(stops: BusStop[]): Map<string, BusStop[]> {
    const groups = new Map<string, BusStop[]>();

    stops.forEach(stop => {
      const parentName = this.extractParentStopName(stop.name);
      if (parentName) {
        if (!groups.has(parentName)) {
          groups.set(parentName, []);
        }
        groups.get(parentName)!.push(stop);
      }
    });

    return groups;
  }

  /**
   * GTFS ZIPファイルを検索
   */
  private async findGTFSZipFile(): Promise<string> {
    // ベースURLが設定されていない場合はデフォルト値を使用
    const base = this.baseUrl || 'http://localhost:8788';
    
    const currentZipPath = `${base}/data/saga-current.zip`;
    try {
      const response = await fetch(currentZipPath, { method: 'HEAD' });
      if (response.ok) {
        return currentZipPath;
      }
    } catch (e) {
      // saga-current.zipが存在しない場合は続行
    }

    // 見つからない場合はエラー
    throw new Error('GTFSデータファイル(saga-*.zip)が見つかりません');
  }

  /**
   * GTFS ZIPファイルを読み込んで解凍
   */
  private async loadGTFSZip(zipPath: string): Promise<any> {
    const response = await fetch(zipPath);
    
    if (!response.ok) {
      throw new Error(`GTFSデータの読み込みに失敗しました: HTTP ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    
    // JSZipを使用してZIPファイルを解凍
    const zip = await JSZip.loadAsync(arrayBuffer);
    return zip;
  }

  /**
   * GTFSファイルをパース
   */
  private async parseGTFSFiles(zip: any): Promise<GTFSData> {
    const extractFile = async (filename: string): Promise<string> => {
      const file = zip.file(filename);
      if (!file) {
        throw new Error(`ファイル ${filename} がZIPアーカイブ内に見つかりません`);
      }
      return await file.async('text');
    };

    // 必要なGTFSファイルを並列で抽出
    const [
      stopsText,
      stopTimesText,
      routesText,
      tripsText,
      calendarText,
      agencyText,
      fareAttributesText
    ] = await Promise.all([
      extractFile('stops.txt'),
      extractFile('stop_times.txt'),
      extractFile('routes.txt'),
      extractFile('trips.txt'),
      extractFile('calendar.txt'),
      extractFile('agency.txt'),
      extractFile('fare_attributes.txt').catch(() => '')
    ]);

    // 各ファイルをパース
    return {
      stops: this.parseCSV(stopsText),
      stopTimes: this.parseCSV(stopTimesText),
      routes: this.parseCSV(routesText),
      trips: this.parseCSV(tripsText),
      calendar: this.parseCSV(calendarText),
      agency: this.parseCSV(agencyText)
    };
  }

  /**
   * CSVテキストをパース
   */
  private parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length === 0) {
      return [];
    }

    // ヘッダー行を取得
    const headers = this.parseCSVLine(lines[0]);
    
    // データ行をパース
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      
      if (values.length !== headers.length) {
        console.warn(`行${i + 1}: カラム数が一致しません`);
        continue;
      }

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }

    return data;
  }

  /**
   * CSV行をパース
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  }

  /**
   * stops.txtを変換
   */
  private transformStops(stops: any[]): BusStop[] {
    return stops.map(stop => ({
      id: stop.stop_id,
      name: stop.stop_name,
      lat: parseFloat(stop.stop_lat),
      lon: parseFloat(stop.stop_lon)
    }));
  }

  /**
   * 時刻表データを変換
   */
  private transformTimetable(gtfsData: GTFSData): TimetableEntry[] {
    const timetable: TimetableEntry[] = [];
    
    // stop_timesを処理
    gtfsData.stopTimes.forEach(stopTime => {
      const trip = gtfsData.trips.find(t => t.trip_id === stopTime.trip_id);
      if (!trip) return;
      
      const route = gtfsData.routes.find(r => r.route_id === trip.route_id);
      if (!route) return;
      
      const stop = gtfsData.stops.find(s => s.stop_id === stopTime.stop_id);
      if (!stop) return;
      
      const calendar = gtfsData.calendar.find(c => c.service_id === trip.service_id);
      if (!calendar) return;
      
      const agency = gtfsData.agency.find(a => a.agency_id === route.agency_id);
      
      // 時刻をパース
      const [hour, minute] = stopTime.departure_time.split(':').map((v: string) => parseInt(v, 10));
      
      // 曜日区分を決定
      const weekdayType = this.getWeekdayType(calendar);
      
      timetable.push({
        tripId: trip.trip_id,
        stopId: stop.stop_id,
        stopName: stop.stop_name,
        routeNumber: route.route_short_name || route.route_id,
        routeName: route.route_long_name || route.route_short_name,
        operator: agency ? agency.agency_name : '',
        hour: hour,
        minute: minute,
        stopSequence: parseInt(stopTime.stop_sequence, 10),
        weekdayType: weekdayType,
        tripHeadsign: trip.trip_headsign || '',
        direction: trip.direction_id || 'unknown'
      });
    });
    
    return timetable;
  }

  /**
   * 曜日区分を決定
   */
  private getWeekdayType(calendar: any): string {
    // 平日（月〜金）が1の場合は「平日」
    if (calendar.monday === '1' && calendar.friday === '1' && 
        calendar.saturday === '0' && calendar.sunday === '0') {
      return '平日';
    }
    // 土日が1の場合は「土日祝」
    if (calendar.saturday === '1' || calendar.sunday === '1') {
      return '土日祝';
    }
    // デフォルトは平日
    return '平日';
  }

  /**
   * 運賃データを変換
   */
  private transformFares(fareAttributes: any[]): Fare[] {
    // fare_attributes.txtから運賃データを変換
    // 実際の実装では、fare_rules.txtも参照して始点・終点を特定する必要がある
    // ここでは簡略化のため、空の配列を返す
    return [];
  }
}
