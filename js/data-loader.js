/**
 * データローダーモジュール
 * CSVファイルを並列読み込みし、JavaScriptオブジェクトに変換してキャッシュする
 */

class DataLoader {
  constructor() {
    // メモリキャッシュ
    this.busStops = null;
    this.timetable = null;
    this.fares = null;
    
    // タイムアウト設定（ミリ秒）
    this.timeout = 3000;
  }

  /**
   * 全データを並列読み込み
   * @returns {Promise<{busStops: Array, timetable: Array, fares: Array}>}
   */
  async loadAllData() {
    try {
      // 3つのCSVファイルを並列fetch
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
      console.error('データ読み込みエラー:', error);
      throw new Error('データの読み込みに失敗しました');
    }
  }

  /**
   * バス停マスタを読み込み
   * @returns {Promise<Array>}
   */
  async loadBusStops() {
    if (this.busStops) {
      return this.busStops;
    }

    const csvText = await this.fetchWithTimeout('data/master/bus_stop.csv');
    this.busStops = this.parseCSV(csvText).map(row => ({
      id: row['バス停ID'] || row.stop_id || row.id,
      name: row['バス停名'] || row.stop_name || row.name,
      lat: parseFloat(row['緯度'] || row.latitude || row.lat),
      lng: parseFloat(row['経度'] || row.longitude || row.lng)
    }));

    return this.busStops;
  }

  /**
   * 時刻表データを読み込み
   * @returns {Promise<Array>}
   */
  async loadTimetable() {
    if (this.timetable) {
      return this.timetable;
    }

    const csvText = await this.fetchWithTimeout('data/timetable/timetable_all_complete.csv');
    this.timetable = this.parseCSV(csvText).map(row => ({
      routeNumber: row['路線番号'] || row.route_number || row.route_id,
      tripId: row['便ID'] || row.trip_id,
      stopSequence: parseInt(row['バス停順序'] || row.stop_sequence),
      stopName: row['バス停名'] || row.stop_name,
      hour: parseInt(row['時'] || row.hour),
      minute: parseInt(row['分'] || row.minute),
      weekdayType: row['曜日区分'] || row.weekday_type || row.service_type,
      routeName: row['路線名'] || row.route_name,
      operator: row['運行会社'] || row.operator || row.company
    }));

    return this.timetable;
  }

  /**
   * 運賃データを読み込み
   * @returns {Promise<Array>}
   */
  async loadFares() {
    if (this.fares) {
      return this.fares;
    }

    const csvText = await this.fetchWithTimeout('data/fare/fare_major_routes.csv');
    this.fares = this.parseCSV(csvText).map(row => ({
      from: row['出発地'] || row.from_stop || row.from,
      to: row['目的地'] || row.to_stop || row.to,
      operator: row['運行会社'] || row.operator || row.company,
      adultFare: parseInt(row['大人運賃'] || row.adult_fare || row.fare),
      childFare: parseInt(row['小児運賃'] || row.child_fare || (parseInt(row['大人運賃'] || row.adult_fare || row.fare) / 2))
    }));

    return this.fares;
  }

  /**
   * タイムアウト付きfetch
   * @param {string} url - 読み込むファイルのURL
   * @returns {Promise<string>}
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
      
      if (error.name === 'AbortError') {
        throw new Error(`タイムアウト: ${url}の読み込みに${this.timeout}ms以上かかりました`);
      }
      
      throw new Error(`ファイル読み込み失敗: ${url} - ${error.message}`);
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
   * キャッシュをクリア
   */
  clearCache() {
    this.busStops = null;
    this.timetable = null;
    this.fares = null;
  }
}

// グローバルに公開
window.DataLoader = DataLoader;
