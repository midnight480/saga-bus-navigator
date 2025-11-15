# 設計書

## 概要

本ドキュメントは、佐賀バスナビゲーターアプリケーションのデータローダーを、独自CSV形式からGTFS標準形式に移行するための設計を定義します。

## アーキテクチャ

### 現在のアーキテクチャ

```
[Browser] → [DataLoader] → [CSV Files]
                ↓
         [SearchController]
                ↓
          [UIController]
```

### 新しいアーキテクチャ

```
[Browser] → [DataLoader] → [JSZip] → [GTFS ZIP File]
                ↓                         ↓
         [GTFSParser] ← [GTFS Text Files]
                ↓
         [DataTransformer]
                ↓
         [SearchController]
                ↓
          [UIController]
```

## コンポーネントと責務

### 1. DataLoader（既存クラスの拡張）

**責務:**
- GTFS ZIPファイルの検出と選択
- JSZipライブラリを使用したZIPファイルの解凍
- GTFSファイルの読み込みとパース
- データの変換とキャッシュ
- 既存APIとの互換性維持

**主要メソッド:**

```javascript
class DataLoader {
  constructor() {
    this.busStops = null;
    this.timetable = null;
    this.fares = null;
    this.timeout = 5000; // 5秒に延長（ZIPファイルサイズを考慮）
    this.debugMode = false;
    this.gtfsVersion = null; // GTFSバージョン情報
  }

  // 既存メソッド（互換性維持）
  async loadAllData()
  async loadBusStops()
  async loadTimetable()
  async loadFares()
  clearCache()

  // 新規メソッド
  async findGTFSZipFile()
  async loadGTFSZip(zipPath)
  async parseGTFSFiles(zip)
  async extractGTFSFile(zip, filename)
  parseGTFSText(text)
  transformStopsData(stopsData)
  transformTimetableData(stopTimesData, tripsData, routesData, calendarData, agencyData)
  transformFaresData(fareAttributesData)
  setDebugMode(enabled)
  logDebug(message, data)
}
```

### 2. GTFSParser（新規クラス）

**責務:**
- GTFSテキストファイルのパース
- CSVフォーマットの処理（ダブルクォート、エスケープ対応）
- データ型の変換

**主要メソッド:**

```javascript
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

    const headers = this.parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = this.parseCSVLine(line);
      if (values.length !== headers.length) {
        console.warn(`行${i + 1}: カラム数が一致しません`);
        continue;
      }

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
}
```

### 3. DataTransformer（新規クラス）

**責務:**
- GTFSデータを既存のアプリケーション形式に変換
- 複数のGTFSファイルを結合
- データの正規化

**主要メソッド:**

```javascript
class DataTransformer {
  /**
   * stops.txtを既存形式に変換
   * @param {Array} stopsData - stops.txtのデータ
   * @returns {Array} 変換されたバス停データ
   */
  static transformStops(stopsData) {
    return stopsData
      .filter(row => row.location_type === '0') // バス停のみ（親駅を除外）
      .map(row => ({
        id: row.stop_id,
        name: row.stop_name,
        lat: parseFloat(row.stop_lat),
        lng: parseFloat(row.stop_lon)
      }));
  }

  /**
   * stop_times.txt、trips.txt、routes.txt、calendar.txt、agency.txtを結合して時刻表データに変換
   * @param {Array} stopTimesData - stop_times.txtのデータ
   * @param {Array} tripsData - trips.txtのデータ
   * @param {Array} routesData - routes.txtのデータ
   * @param {Array} calendarData - calendar.txtのデータ
   * @param {Array} agencyData - agency.txtのデータ
   * @param {Array} stopsData - stops.txtのデータ（バス停名取得用）
   * @returns {Array} 変換された時刻表データ
   */
  static transformTimetable(stopTimesData, tripsData, routesData, calendarData, agencyData, stopsData) {
    // インデックスを作成（検索最適化）
    const tripsIndex = this.createIndex(tripsData, 'trip_id');
    const routesIndex = this.createIndex(routesData, 'route_id');
    const calendarIndex = this.createIndex(calendarData, 'service_id');
    const agencyIndex = this.createIndex(agencyData, 'agency_id');
    const stopsIndex = this.createIndex(stopsData, 'stop_id');

    return stopTimesData.map(stopTime => {
      const trip = tripsIndex[stopTime.trip_id];
      const route = trip ? routesIndex[trip.route_id] : null;
      const calendar = trip ? calendarIndex[trip.service_id] : null;
      const agency = route ? agencyIndex[route.agency_id] : null;
      const stop = stopsIndex[stopTime.stop_id];

      // arrival_timeから時と分を抽出（HH:MM:SS形式）
      const [hour, minute] = stopTime.arrival_time.split(':').map(Number);

      // 曜日区分を判定
      const weekdayType = this.determineWeekdayType(calendar);

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
  }

  /**
   * fare_attributes.txtを既存形式に変換
   * @param {Array} fareAttributesData - fare_attributes.txtのデータ
   * @returns {Array} 変換された運賃データ
   */
  static transformFares(fareAttributesData) {
    // GTFSのfare_attributes.txtは区間別運賃を直接表現しないため、
    // 既存のfare_major_routes.csvと同等のデータ構造に変換する必要がある
    // ここでは基本運賃のみを返す（詳細な区間別運賃は別途対応が必要）
    return fareAttributesData.map(fare => ({
      from: '', // GTFSでは区間情報がfare_rulesに分離されている
      to: '',
      operator: '', // agency_idから取得する必要がある
      adultFare: parseFloat(fare.price),
      childFare: parseFloat(fare.price) / 2 // 小児運賃は大人の半額と仮定
    }));
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
```

## データモデル

### GTFS入力データ

#### stops.txt
```csv
stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station,stop_timezone,wheelchair_boarding
1001002-01,,佐賀駅バスセンター 1番のりば,,33.26451,130.29974,1001002-01,,0,1001002,,
```

#### stop_times.txt
```csv
trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type,shape_dist_traveled,timepoint
1_平日_08時30分_系統51111,08:30:00,08:30:00,1001002-01,1,5　ゆめタウン佐賀（ほほえみ館・夢咲コスモスタウン 経由）,0,1,,
```

#### routes.txt
```csv
route_id,agency_id,route_short_name,route_long_name,route_desc,route_type,route_url,route_color,route_text_color,jp_parent_route_id
1ゆめタウン線,3000020412015,,ゆめタウン線,,3,,,,
```

#### trips.txt
```csv
route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,block_id,shape_id,wheelchair_accessible,bikes_allowed,jp_trip_desc,jp_trip_desc_symbol,jp_office_id
1ゆめタウン線,1_平日,1_平日_08時30分_系統51111,5　ゆめタウン佐賀（ほほえみ館・夢咲コスモスタウン 経由）,,,1ゆめタウン線(51111),,0,,,
```

#### calendar.txt
```csv
service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
1_平日,1,1,1,1,1,0,0,20251026,20261025
1_土日祝,0,0,0,0,0,1,1,20251026,20261025
```

#### agency.txt
```csv
agency_id,agency_name,agency_url,agency_timezone,agency_lang,agency_phone,agency_fare_url,agency_email
3000020412015,佐賀市交通局,http://www.bus.saga.saga.jp/,Asia/Tokyo,ja,0952-23-3155,,
```

### 変換後の出力データ

#### busStops
```javascript
[
  {
    id: "1001002-01",
    name: "佐賀駅バスセンター 1番のりば",
    lat: 33.26451,
    lng: 130.29974
  }
]
```

#### timetable
```javascript
[
  {
    routeNumber: "1ゆめタウン線",
    tripId: "1_平日_08時30分_系統51111",
    stopSequence: 1,
    stopName: "佐賀駅バスセンター 1番のりば",
    hour: 8,
    minute: 30,
    weekdayType: "平日",
    routeName: "ゆめタウン線",
    operator: "佐賀市交通局"
  }
]
```

#### fares
```javascript
[
  {
    from: "佐賀駅BC",
    to: "ゆめタウン佐賀",
    operator: "佐賀市交通局",
    adultFare: 200,
    childFare: 100
  }
]
```

## インターフェース

### DataLoader API（既存との互換性維持）

```javascript
// 全データの読み込み
const data = await dataLoader.loadAllData();
// 戻り値: { busStops: Array, timetable: Array, fares: Array }

// バス停データの読み込み
const busStops = await dataLoader.loadBusStops();
// 戻り値: Array<{ id, name, lat, lng }>

// 時刻表データの読み込み
const timetable = await dataLoader.loadTimetable();
// 戻り値: Array<{ routeNumber, tripId, stopSequence, stopName, hour, minute, weekdayType, routeName, operator }>

// 運賃データの読み込み
const fares = await dataLoader.loadFares();
// 戻り値: Array<{ from, to, operator, adultFare, childFare }>

// キャッシュのクリア
dataLoader.clearCache();

// デバッグモードの設定
dataLoader.setDebugMode(true);
```

## エラーハンドリング

### エラーの種類と対応

1. **ZIPファイルが見つからない**
   - エラーメッセージ: 「GTFSデータファイル(saga-*.zip)が見つかりません」
   - 対応: リトライボタンを表示し、ユーザーに再読み込みを促す

2. **ZIPファイルの解凍に失敗**
   - エラーメッセージ: 「GTFSデータの解凍に失敗しました」
   - 対応: リトライボタンを表示し、ユーザーに再読み込みを促す

3. **GTFSファイルの形式が不正**
   - エラーメッセージ: 「GTFSデータの形式が不正です」
   - 対応: コンソールに詳細なエラー情報を出力し、リトライボタンを表示

4. **タイムアウト**
   - エラーメッセージ: 「データの読み込みがタイムアウトしました」
   - 対応: リトライボタンを表示し、ユーザーに再読み込みを促す

5. **ネットワークエラー**
   - エラーメッセージ: 「ネットワークエラーが発生しました」
   - 対応: リトライボタンを表示し、ユーザーに再読み込みを促す

### エラーハンドリングフロー

```javascript
try {
  // GTFS ZIPファイルの検出
  const zipPath = await dataLoader.findGTFSZipFile();
  
  // ZIPファイルの読み込みと解凍
  const zip = await dataLoader.loadGTFSZip(zipPath);
  
  // GTFSファイルのパース
  const gtfsData = await dataLoader.parseGTFSFiles(zip);
  
  // データの変換
  this.busStops = dataLoader.transformStopsData(gtfsData.stops);
  this.timetable = dataLoader.transformTimetableData(
    gtfsData.stopTimes,
    gtfsData.trips,
    gtfsData.routes,
    gtfsData.calendar,
    gtfsData.agency,
    gtfsData.stops
  );
  this.fares = dataLoader.transformFaresData(gtfsData.fareAttributes);
  
} catch (error) {
  console.error('データ読み込みエラー:', error);
  
  if (error.message.includes('見つかりません')) {
    throw new Error('GTFSデータファイル(saga-*.zip)が見つかりません');
  } else if (error.message.includes('解凍')) {
    throw new Error('GTFSデータの解凍に失敗しました');
  } else if (error.message.includes('形式')) {
    throw new Error('GTFSデータの形式が不正です');
  } else if (error.message.includes('タイムアウト')) {
    throw new Error('データの読み込みがタイムアウトしました');
  } else {
    throw new Error('データの読み込みに失敗しました');
  }
}
```

## テスト戦略

### 単体テスト

1. **GTFSParser**
   - CSVパースの正確性
   - ダブルクォート、エスケープの処理
   - 空行、不正な行の処理

2. **DataTransformer**
   - stops.txtの変換
   - stop_times.txt等の結合と変換
   - 曜日区分の判定ロジック

3. **DataLoader**
   - GTFS ZIPファイルの検出ロジック
   - ファイル選択の優先順位
   - キャッシュの動作

### 統合テスト

1. **データ読み込みフロー**
   - saga-current.zipの読み込み
   - saga-YYYY-MM-DD.zipの読み込み
   - 複数ファイルがある場合の選択

2. **既存機能との互換性**
   - SearchControllerとの連携
   - UIControllerとの連携
   - 検索結果の正確性

### E2Eテスト

1. **アプリケーション初期化**
   - GTFSデータの読み込み
   - UIの有効化
   - エラーハンドリング

2. **検索機能**
   - バス停検索
   - 時刻表検索
   - 検索結果の表示

## パフォーマンス最適化

### 目標

- GTFS ZIPファイル（約35MB）を5秒以内に読み込み
- データ変換を1秒以内に完了
- キャッシュからのデータ取得を100ミリ秒以内に完了

### 最適化手法

1. **並列読み込み**
   - stops.txt、stop_times.txt、routes.txt、trips.txt、calendar.txt、agency.txtを並列で読み込み
   - Promise.allを使用して並列処理

2. **インデックス作成**
   - trip_id、route_id、service_id、agency_id、stop_idでインデックスを作成
   - O(1)での検索を実現

3. **不要なデータの除外**
   - shapes.txt、translations.txtなどの不要なファイルは読み込まない
   - location_type='0'のバス停のみを対象（親駅を除外）

4. **メモリキャッシュ**
   - 一度読み込んだデータはメモリにキャッシュ
   - 再読み込み時はキャッシュから返す

## セキュリティ考慮事項

1. **ファイルパスの検証**
   - ./dataディレクトリ内のファイルのみを対象
   - パストラバーサル攻撃を防ぐ

2. **データサイズの制限**
   - ZIPファイルサイズを100MB以下に制限
   - 解凍後のファイルサイズを200MB以下に制限

3. **CSVインジェクション対策**
   - CSVデータをそのまま実行しない
   - データの検証とサニタイズ

## 依存関係

### 外部ライブラリ

1. **JSZip**
   - バージョン: 3.10.1以上
   - 用途: ブラウザ上でのZIPファイル解凍
   - CDN: https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js

### 既存コンポーネント

1. **SearchController**
   - 時刻表データを使用して検索を実行
   - 変更不要（既存APIとの互換性維持）

2. **UIController**
   - バス停データを使用してオートコンプリートを実装
   - 変更不要（既存APIとの互換性維持）

3. **TimeUtils**
   - NTPから現在時刻を取得
   - 変更不要

## デプロイメント

### ファイル配置

```
saga-bus-navigator/
├── data/
│   ├── saga-current.zip          # 現在のGTFSデータ
│   ├── saga-2025-12-01.zip       # 未来のGTFSデータ（オプション）
│   └── saga-2025-10-01.zip       # アーカイブデータ（オプション）
├── js/
│   ├── data-loader.js            # 更新
│   ├── app.js                    # 変更なし
│   └── utils.js                  # 変更なし
├── index.html                    # JSZipのCDNリンクを追加
└── ...
```

### 更新手順

1. JSZipライブラリをindex.htmlに追加
2. data-loader.jsを新しいバージョンに置き換え
3. saga-current.zipを./dataディレクトリに配置
4. アプリケーションをテスト
5. 本番環境にデプロイ

## 移行計画

### フェーズ1: 開発環境での実装とテスト

1. JSZipライブラリの統合
2. GTFSParser、DataTransformerクラスの実装
3. DataLoaderクラスの拡張
4. 単体テストの実装と実行

### フェーズ2: 統合テストと既存機能の検証

1. SearchControllerとの連携テスト
2. UIControllerとの連携テスト
3. E2Eテストの実行
4. パフォーマンステスト

### フェーズ3: 本番環境へのデプロイ

1. 本番環境でのテスト
2. ユーザー受け入れテスト
3. 本番環境へのデプロイ
4. モニタリングとフィードバック収集

## 今後の拡張

1. **リアルタイムデータ対応**
   - GTFS-Realtimeフォーマットのサポート
   - バス位置情報の表示
   - 遅延情報の表示

2. **複数事業者対応**
   - 複数のGTFS ZIPファイルの統合
   - 事業者別のフィルタリング

3. **オフライン対応の強化**
   - Service WorkerでのGTFSデータのキャッシュ
   - IndexedDBでの永続化
