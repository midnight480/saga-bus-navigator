# APIドキュメント

佐賀バスナビゲーターの主要なクラスとメソッドのAPIリファレンスです。

## 目次

- [DirectionDetector](#directiondetector)
- [TimetableController](#timetablecontroller)
- [MapController](#mapcontroller)
- [DataLoader](#dataloader)

---

## DirectionDetector

バス路線の方向判定を担当するユーティリティクラス。

### メソッド

#### `detectDirection(trip, routeId, allTrips)`

tripの方向を判定します。

**パラメータ:**

- `trip` (Object): trips.txtの1レコード
  - `trip_id` (string): 便ID
  - `route_id` (string): 路線ID
  - `direction_id` (string): 方向ID（0=往路、1=復路、空の場合もあり）
  - `trip_headsign` (string): 行き先
- `routeId` (string): 路線ID
- `allTrips` (Array): 同じ路線の全てのtrip

**戻り値:**

- (string): 方向識別子
  - `'0'`: 往路
  - `'1'`: 復路
  - `'unknown'`: 不明

**判定ロジック:**

1. `direction_id`が設定されている場合はそれを使用
2. `trip_headsign`から方向を推測（同じ路線で異なる行き先がある場合）
3. 判定できない場合は`'unknown'`を返す

**使用例:**

```javascript
const direction = DirectionDetector.detectDirection(
  trip,
  'route_001',
  allTripsForRoute
);
console.log(direction); // '0', '1', または 'unknown'
```

---

#### `findTripsForRoute(fromStopId, toStopId, stopTimes, tripsIndex)`

2つのバス停間の経路が存在するtripを検索します。

**パラメータ:**

- `fromStopId` (string): 乗車バス停ID
- `toStopId` (string): 降車バス停ID
- `stopTimes` (Array): stop_times.txtのデータ
  - 各要素は`{ trip_id, stop_id, stop_sequence, arrival_time, departure_time }`
- `tripsIndex` (Object): trip_idでインデックス化されたtrips

**戻り値:**

- (Array<string>): 該当するtrip_idの配列

**検索ロジック:**

1. 乗車バス停に停車する全てのstop_timesを取得
2. 各stop_timeについて、同じtripで降車バス停に停車するか確認
3. 乗車バス停の`stop_sequence`が降車バス停の`stop_sequence`より小さい場合のみ有効
4. 重複を除去して返す

**使用例:**

```javascript
const tripIds = DirectionDetector.findTripsForRoute(
  'stop_001',
  'stop_002',
  stopTimesData,
  tripsIndexedById
);
console.log(tripIds); // ['trip_123', 'trip_456', ...]
```

---

## TimetableController

時刻表データの管理と検索を担当するクラス。

### メソッド

#### `getTimetableBetweenStops(fromStopId, toStopId, routeId, serviceDayType)`

2つのバス停間の時刻表を取得します（双方向検索対応）。

**パラメータ:**

- `fromStopId` (string): 乗車バス停ID
- `toStopId` (string): 降車バス停ID
- `routeId` (string): 路線ID
- `serviceDayType` (string): 運行日種別
  - `'weekday'`: 平日
  - `'saturday'`: 土曜日
  - `'sunday'`: 日曜日・祝日

**戻り値:**

- (Array<Object>): 時刻表データの配列
  - 各要素は以下のプロパティを持つ:
    - `stopId` (string): バス停ID
    - `stopName` (string): バス停名
    - `routeId` (string): 路線ID
    - `routeName` (string): 路線名
    - `tripId` (string): 便ID
    - `tripHeadsign` (string): 行き先
    - `departureTime` (string): 発車時刻（表示用、HH:MM形式）
    - `departureHour` (number): 発車時（数値）
    - `departureMinute` (number): 発車分（数値）
    - `serviceDayType` (string): 運行日種別
    - `stopSequence` (number): 停車順序
    - `direction` (string): 方向（'0'=往路、'1'=復路、'unknown'=不明）

**使用例:**

```javascript
const timetable = timetableController.getTimetableBetweenStops(
  'stop_001',
  'stop_002',
  'route_001',
  'weekday'
);

timetable.forEach(entry => {
  console.log(`${entry.departureTime} - ${entry.tripHeadsign}`);
});
```

---

#### `getRouteStops(routeId, direction = null)`

路線の全方向のバス停を取得します。

**パラメータ:**

- `routeId` (string): 路線ID
- `direction` (string, optional): 方向フィルタ
  - `'0'`: 往路のみ
  - `'1'`: 復路のみ
  - `null`: 全方向（デフォルト）

**戻り値:**

- (Array<Object>): バス停座標の配列
  - 各要素は以下のプロパティを持つ:
    - `stopId` (string): バス停ID
    - `stopName` (string): バス停名
    - `lat` (number): 緯度
    - `lon` (number): 経度
    - `direction` (string): 方向

**使用例:**

```javascript
// 全方向のバス停を取得
const allStops = timetableController.getRouteStops('route_001');

// 往路のバス停のみを取得
const outboundStops = timetableController.getRouteStops('route_001', '0');

// 復路のバス停のみを取得
const inboundStops = timetableController.getRouteStops('route_001', '1');
```

---

## MapController

地図表示を担当するクラス。

### メソッド

#### `displayRoute(routeId, direction = null)`

路線を地図上に表示します（方向別に色分け）。

**パラメータ:**

- `routeId` (string): 路線ID
- `direction` (string, optional): 表示する方向
  - `'0'`: 往路のみ表示
  - `'1'`: 復路のみ表示
  - `null`: 全方向表示（デフォルト）

**動作:**

1. 指定された路線のバス停を取得
2. 方向フィルタが指定されている場合は、その方向のバス停のみを表示
3. 往路と復路を異なる色で表示（往路=青、復路=赤）
4. 選択された方向のバス停をハイライト表示

**使用例:**

```javascript
// 全方向を表示
mapController.displayRoute('route_001');

// 往路のみを表示
mapController.displayRoute('route_001', '0');

// 復路のみを表示
mapController.displayRoute('route_001', '1');
```

---

## DataLoader

GTFSデータの読み込みと変換を担当するクラス。

### メソッド

#### `loadGTFSData()`

GTFSデータを読み込み、アプリケーション形式に変換します。

**戻り値:**

- (Promise<Object>): 変換されたデータ
  - `stops` (Array): バス停データ
  - `routes` (Array): 路線データ
  - `trips` (Array): 便データ
  - `stopTimes` (Array): 停車時刻データ
  - `calendar` (Array): 運行カレンダーデータ

**処理フロー:**

1. `./data`ディレクトリから最新のGTFS ZIPファイルを選択
2. JSZipでZIPファイルを解凍
3. 各GTFSファイル（stops.txt, routes.txt等）をパース
4. GTFS形式からアプリケーション形式に変換
5. 方向情報を各tripに追加
6. メモリにキャッシュ

**使用例:**

```javascript
const dataLoader = new DataLoader();
const data = await dataLoader.loadGTFSData();

console.log(`読み込んだバス停数: ${data.stops.length}`);
console.log(`読み込んだ路線数: ${data.routes.length}`);
```

---

#### `clearCache()`

キャッシュされたデータをクリアします。

**使用例:**

```javascript
dataLoader.clearCache();
```

---

## データ構造

### Tripオブジェクト

```javascript
{
  trip_id: string,           // 便ID
  route_id: string,          // 路線ID
  service_id: string,        // 運行カレンダーID
  trip_headsign: string,     // 行き先
  direction_id: string,      // 方向ID（'0'=往路、'1'=復路、'unknown'=不明）
  block_id: string,          // ブロックID（オプション）
  shape_id: string           // 形状ID（オプション）
}
```

### StopTimeオブジェクト

```javascript
{
  trip_id: string,           // 便ID
  arrival_time: string,      // 到着時刻（HH:MM:SS）
  departure_time: string,    // 発車時刻（HH:MM:SS）
  stop_id: string,           // バス停ID
  stop_sequence: number,     // 停車順序
  stop_headsign: string,     // バス停行き先（オプション）
  pickup_type: number,       // 乗車タイプ（オプション）
  drop_off_type: number      // 降車タイプ（オプション）
}
```

### Stopオブジェクト

```javascript
{
  stop_id: string,           // バス停ID
  stop_name: string,         // バス停名
  stop_lat: number,          // 緯度
  stop_lon: number,          // 経度
  stop_code: string,         // バス停コード（オプション）
  stop_desc: string          // バス停説明（オプション）
}
```

### Routeオブジェクト

```javascript
{
  route_id: string,          // 路線ID
  agency_id: string,         // 事業者ID
  route_short_name: string,  // 路線短縮名
  route_long_name: string,   // 路線名
  route_type: number,        // 路線タイプ（3=バス）
  route_color: string,       // 路線色（オプション）
  route_text_color: string   // 路線テキスト色（オプション）
}
```

---

## エラーハンドリング

### エラーケース

#### 1. バス停間に経路が存在しない

```javascript
const tripIds = DirectionDetector.findTripsForRoute(
  'stop_001',
  'stop_999',
  stopTimesData,
  tripsIndexedById
);

if (tripIds.length === 0) {
  console.error('該当する便が見つかりません');
  // ユーザーにエラーメッセージを表示
}
```

#### 2. 方向判定ができない

```javascript
const direction = DirectionDetector.detectDirection(trip, routeId, allTrips);

if (direction === 'unknown') {
  console.warn('方向を判定できませんでした。stop_sequenceのみで判定します。');
  // stop_sequenceのみを使用して検索を続行
}
```

#### 3. データ不整合

```javascript
try {
  const timetable = timetableController.getTimetableBetweenStops(
    fromStopId,
    toStopId,
    routeId,
    serviceDayType
  );
} catch (error) {
  console.error('データ不整合エラー:', error);
  // エラーログを出力し、ユーザーに通知
}
```

---

## パフォーマンス考慮事項

### インデックス戦略

- **trip_idインデックス**: tripを高速に検索するためのインデックス
- **stop_idインデックス**: バス停を高速に検索するためのインデックス
- **方向情報のキャッシュ**: 方向判定は初回のみ実行し、結果をtripオブジェクトにキャッシュ

### 検索最適化

- **stop_sequenceの比較**: 数値比較のため高速
- **早期リターン**: 最初の有効なtripが見つかった時点で検索を継続するか判断
- **フィルタリングの順序**: 最も制約の強い条件（stop_sequence）を最初に適用

---

## セキュリティ

### 入力検証

全てのAPIメソッドは入力値を検証します：

- バス停ID、路線IDの形式チェック
- 不正な文字列の除外
- XSS対策（`textContent`と`createElement`を使用）

### データエスケープ

ユーザーに表示するデータ（`trip_headsign`等）は適切にエスケープされます。

---

## 使用例

### 完全な検索フロー

```javascript
// 1. データを読み込む
const dataLoader = new DataLoader();
await dataLoader.loadGTFSData();

// 2. 時刻表コントローラーを初期化
const timetableController = new TimetableController(dataLoader);

// 3. バス停間の時刻表を検索
const timetable = timetableController.getTimetableBetweenStops(
  'stop_001', // 乗車バス停
  'stop_002', // 降車バス停
  'route_001', // 路線ID
  'weekday' // 平日
);

// 4. 検索結果を表示
timetable.forEach(entry => {
  console.log(`
    発車時刻: ${entry.departureTime}
    行き先: ${entry.tripHeadsign}
    方向: ${entry.direction === '0' ? '往路' : '復路'}
  `);
});

// 5. 地図に路線を表示
const mapController = new MapController();
mapController.displayRoute('route_001');
```

---

## 関連ドキュメント

- [双方向検索 - 要件定義書](../.kiro/specs/bidirectional-route-support/requirements.md)
- [双方向検索 - 設計書](../.kiro/specs/bidirectional-route-support/design.md)
- [双方向検索 - 実装タスク](../.kiro/specs/bidirectional-route-support/tasks.md)
- [GTFS移行ガイド](./GTFS_MIGRATION.md)
- [プロジェクト構成](./FILES_STRUCTURE.md)
