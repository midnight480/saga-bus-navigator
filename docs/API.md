# APIドキュメント

佐賀バスナビゲーターの主要なクラスとメソッドのAPIリファレンスです。

## 目次

- [DirectionDetector](#directiondetector)
- [TimetableController](#timetablecontroller)
- [MapController](#mapcontroller)
- [DataLoader](#dataloader)
- [UIController](#uicontroller)
- [TimetableUI](#timetableui)
- [データ構造最適化](#データ構造最適化)

---

## DirectionDetector

バス路線の方向判定を担当するユーティリティクラス。

### メソッド

#### `detectDirectionByStopSequence(routeId, trips, stopTimes)`

停留所順序から方向を推測します（新規メソッド）。

**パラメータ:**

- `routeId` (string): 路線ID
- `trips` (Array): 同じ路線の全てのtrip
- `stopTimes` (Array): stop_times.txtのデータ

**戻り値:**

- (Map<string, string>): tripIdから方向へのマッピング
  - キー: trip_id
  - 値: 方向（'0'=往路、'1'=復路）

**判定ロジック:**

1. 各tripの最初と最後の停留所を取得
2. 始点・終点の組み合わせでグループ化
3. 2つ以上のグループがある場合、それぞれを異なる方向として扱う
4. 判定できない場合はnullを返す

**使用例:**

```javascript
const directionMap = DirectionDetector.detectDirectionByStopSequence(
  'route_001',
  allTripsForRoute,
  stopTimesData
);

if (directionMap) {
  const direction = directionMap.get('trip_123');
  console.log(direction); // '0' または '1'
}
```

---

#### `cacheDirectionResult(routeId, directionMap)`

方向判定結果をキャッシュします（新規メソッド）。

**パラメータ:**

- `routeId` (string): 路線ID
- `directionMap` (Map<string, string>): tripIdから方向へのマッピング

**使用例:**

```javascript
DirectionDetector.cacheDirectionResult('route_001', directionMap);
```

---

#### `getCachedDirectionResult(routeId)`

キャッシュから方向判定結果を取得します（新規メソッド）。

**パラメータ:**

- `routeId` (string): 路線ID

**戻り値:**

- (Map<string, string>|null): tripIdから方向へのマッピング、またはnull

**使用例:**

```javascript
const cachedResult = DirectionDetector.getCachedDirectionResult('route_001');

if (cachedResult) {
  const direction = cachedResult.get('trip_123');
  console.log(direction); // '0' または '1'
}
```

---

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

## UIController

検索結果リストの表示を担当するクラス。

### メソッド

#### `createDirectionLabel(direction)`

方向ラベルを作成します（新規メソッド）。

**パラメータ:**

- `direction` (string): 方向
  - `'0'`: 往路
  - `'1'`: 復路
  - `'unknown'`: 不明

**戻り値:**

- (HTMLElement|null): 方向ラベル要素、または方向が'unknown'の場合はnull

**動作:**

1. direction='0'の場合は「往路」ラベルを生成
2. direction='1'の場合は「復路」ラベルを生成
3. direction='unknown'の場合はnullを返す
4. aria-label属性を設定
5. レスポンシブ対応（画面幅に応じてラベル形式を変更）

**使用例:**

```javascript
const uiController = new UIController();

// 往路ラベルを作成
const outboundLabel = uiController.createDirectionLabel('0');
// <span class="direction-label direction-label-outbound" aria-label="往路">
//   <span class="direction-label-icon">→</span>
//   <span class="direction-label-text" data-short="往" data-full="往路"></span>
// </span>

// 復路ラベルを作成
const inboundLabel = uiController.createDirectionLabel('1');
// <span class="direction-label direction-label-inbound" aria-label="復路">
//   <span class="direction-label-icon">←</span>
//   <span class="direction-label-text" data-short="復" data-full="復路"></span>
// </span>

// 方向不明の場合
const unknownLabel = uiController.createDirectionLabel('unknown');
// null
```

---

#### `createResultItem(result)`

検索結果アイテムのHTML生成（拡張）。

**パラメータ:**

- `result` (Object): 検索結果オブジェクト
  - `tripId` (string): 便ID
  - `routeNumber` (string): 路線番号
  - `routeName` (string): 路線名
  - `operator` (string): 事業者名
  - `departureStop` (string): 乗車バス停名
  - `arrivalStop` (string): 降車バス停名
  - `departureTime` (string): 発車時刻
  - `arrivalTime` (string): 到着時刻
  - `duration` (number): 所要時間（分）
  - `adultFare` (number): 大人運賃
  - `childFare` (number): 子供運賃
  - `weekdayType` (string): 運行日種別
  - `viaStops` (Array): 経由バス停
  - `tripHeadsign` (string): 行き先
  - `direction` (string): 方向（'0'=往路、'1'=復路、'unknown'=不明）

**戻り値:**

- (HTMLElement): リストアイテム要素

**動作:**

1. 検索結果の情報を表示
2. 方向ラベルを追加（`createDirectionLabel()`を呼び出し）
3. レスポンシブ対応（画面幅に応じてラベル形式を変更）

**使用例:**

```javascript
const uiController = new UIController();

const result = {
  tripId: 'trip_001',
  routeNumber: '1',
  routeName: '佐賀駅～大和線',
  operator: '佐賀市営バス',
  departureStop: '佐賀駅バスセンター',
  arrivalStop: '県庁前',
  departureTime: '08:00',
  arrivalTime: '08:05',
  duration: 5,
  adultFare: 150,
  childFare: 80,
  weekdayType: '平日',
  viaStops: [],
  tripHeadsign: '県庁',
  direction: '0'
};

const listItem = uiController.createResultItem(result);
// <li class="result-item">
//   <div class="result-header">
//     <span class="route-number">1</span>
//     <span class="route-name">佐賀駅～大和線</span>
//     <span class="direction-label direction-label-outbound" aria-label="往路">...</span>
//   </div>
//   ...
// </li>
```

---

## TimetableUI

時刻表モーダルの表示を担当するクラス。

### メソッド

#### `createDirectionFilter(currentFilter)`

方向フィルタボタンを作成します（新規メソッド）。

**パラメータ:**

- `currentFilter` (string): 現在の方向フィルタ
  - `'all'`: 全て（デフォルト）
  - `'0'`: 往路のみ
  - `'1'`: 復路のみ

**戻り値:**

- (HTMLElement): フィルタボタンコンテナ

**動作:**

1. 「すべて」「往路のみ」「復路のみ」ボタンを生成
2. aria-pressed属性を設定
3. クリックイベントを設定（`applyDirectionFilter()`を呼び出し）

**使用例:**

```javascript
const timetableUI = new TimetableUI();

// 方向フィルタボタンを作成
const filterContainer = timetableUI.createDirectionFilter('all');
// <div class="direction-filter">
//   <button class="direction-filter-button" aria-pressed="true">すべて</button>
//   <button class="direction-filter-button" aria-pressed="false">往路のみ</button>
//   <button class="direction-filter-button" aria-pressed="false">復路のみ</button>
// </div>
```

---

#### `applyDirectionFilter(direction)`

方向フィルタを適用します（新規メソッド）。

**パラメータ:**

- `direction` (string): フィルタ方向
  - `'all'`: 全て
  - `'0'`: 往路のみ
  - `'1'`: 復路のみ

**動作:**

1. フィルタに応じて時刻表データをフィルタリング
2. フィルタボタンの選択状態を更新
3. 時刻表テーブルを再描画

**使用例:**

```javascript
const timetableUI = new TimetableUI();

// 往路のみを表示
timetableUI.applyDirectionFilter('0');

// 復路のみを表示
timetableUI.applyDirectionFilter('1');

// 全てを表示
timetableUI.applyDirectionFilter('all');
```

---

#### `createTimetableTable(timetable, currentFilter)`

時刻表テーブルを作成します（拡張）。

**パラメータ:**

- `timetable` (Array<Object>): 時刻表データ
  - 各要素は以下のプロパティを持つ:
    - `stopId` (string): バス停ID
    - `stopName` (string): バス停名
    - `routeId` (string): 路線ID
    - `routeName` (string): 路線名
    - `tripId` (string): 便ID
    - `tripHeadsign` (string): 行き先
    - `departureTime` (string): 発車時刻
    - `departureHour` (number): 発車時
    - `departureMinute` (number): 発車分
    - `serviceDayType` (string): 運行日種別
    - `stopSequence` (number): 停車順序
    - `direction` (string): 方向（'0'=往路、'1'=復路、'unknown'=不明）
- `currentFilter` (string, optional): 現在の方向フィルタ（デフォルト: 'all'）

**戻り値:**

- (HTMLElement): テーブル要素

**動作:**

1. 時刻表テーブルに「方向」列を追加
2. 各便の方向ラベルを表示
3. aria属性を設定

**使用例:**

```javascript
const timetableUI = new TimetableUI();

const timetable = [
  {
    stopId: 'stop_001',
    stopName: '佐賀駅バスセンター',
    routeId: 'route_001',
    routeName: '佐賀駅～大和線',
    tripId: 'trip_001',
    tripHeadsign: '県庁',
    departureTime: '08:00',
    departureHour: 8,
    departureMinute: 0,
    serviceDayType: '平日',
    stopSequence: 1,
    direction: '0'
  },
  // ...
];

// 全ての便を表示
const table = timetableUI.createTimetableTable(timetable, 'all');

// 往路のみを表示
const outboundTable = timetableUI.createTimetableTable(timetable, '0');
```

---

#### `createDetectionBadge(detectionRate)`

方向判定バッジを作成します（新規メソッド）。

**パラメータ:**

- `detectionRate` (number): 方向判定成功率（0.0-1.0）

**戻り値:**

- (HTMLElement): バッジ要素

**動作:**

1. 成功率50%未満: 警告バッジ（赤）
2. 成功率50-80%: 注意バッジ（オレンジ）
3. 成功率80%以上: 成功バッジ（緑）またはバッジなし
4. ツールチップを追加
5. aria-describedby属性を設定

**使用例:**

```javascript
const timetableUI = new TimetableUI();

// 警告バッジを作成（成功率30%）
const warningBadge = timetableUI.createDetectionBadge(0.3);
// <span class="detection-badge detection-badge-warning" 
//       aria-describedby="tooltip-xxx"
//       data-tooltip="方向判定成功率: 30.0%">
//   ⚠
// </span>

// 注意バッジを作成（成功率60%）
const cautionBadge = timetableUI.createDetectionBadge(0.6);
// <span class="detection-badge detection-badge-caution" 
//       aria-describedby="tooltip-xxx"
//       data-tooltip="方向判定成功率: 60.0%">
//   ⚠
// </span>

// 成功バッジを作成（成功率90%）
const successBadge = timetableUI.createDetectionBadge(0.9);
// <span class="detection-badge detection-badge-success" 
//       aria-describedby="tooltip-xxx"
//       data-tooltip="方向判定成功率: 90.0%">
//   ✓
// </span>
```

---

#### `displayRouteSelection(routes, routeMetadata)`

路線選択画面を表示します（拡張）。

**パラメータ:**

- `routes` (Array<Object>): 路線一覧
  - 各要素は以下のプロパティを持つ:
    - `routeId` (string): 路線ID
    - `routeName` (string): 路線名
- `routeMetadata` (Map<string, Object>): 路線メタデータ
  - 各路線のメタデータは以下のプロパティを持つ:
    - `routeId` (string): 路線ID
    - `routeName` (string): 路線名
    - `tripCount` (number): 便数
    - `stopCount` (number): バス停数
    - `directionDetectionRate` (number): 方向判定成功率（0.0-1.0）
    - `detectionMethod` (string): 判定方法
    - `unknownDirectionCount` (number): 方向不明の便数

**動作:**

1. DataLoaderから路線メタデータを取得
2. 各路線に方向判定バッジを表示（`createDetectionBadge()`を呼び出し）

**使用例:**

```javascript
const timetableUI = new TimetableUI();

const routes = [
  { routeId: 'route_001', routeName: '佐賀駅～大和線' },
  // ...
];

const routeMetadata = new Map([
  ['route_001', {
    routeId: 'route_001',
    routeName: '佐賀駅～大和線',
    tripCount: 20,
    stopCount: 15,
    directionDetectionRate: 0.95,
    detectionMethod: 'direction_id',
    unknownDirectionCount: 1
  }],
  // ...
]);

timetableUI.displayRouteSelection(routes, routeMetadata);
```

---

#### `displayTimetable(timetable)`

時刻表モーダルを表示します（拡張）。

**パラメータ:**

- `timetable` (Array<Object>): 時刻表データ

**動作:**

1. 方向フィルタボタンを表示（`createDirectionFilter()`を呼び出し）
2. 初期フィルタ状態を設定（'all'）
3. 時刻表テーブルを表示（`createTimetableTable()`を呼び出し）

**使用例:**

```javascript
const timetableUI = new TimetableUI();

const timetable = [
  {
    stopId: 'stop_001',
    stopName: '佐賀駅バスセンター',
    routeId: 'route_001',
    routeName: '佐賀駅～大和線',
    tripId: 'trip_001',
    tripHeadsign: '県庁',
    departureTime: '08:00',
    departureHour: 8,
    departureMinute: 0,
    serviceDayType: '平日',
    stopSequence: 1,
    direction: '0'
  },
  // ...
];

timetableUI.displayTimetable(timetable);
```

---

## DataLoader

GTFSデータの読み込みと変換を担当するクラス。

### プロパティ

#### 既存プロパティ

- `busStops` (Array): バス停データ
- `timetable` (Array): 時刻表データ
- `fares` (Array): 運賃データ
- `fareRules` (Array): 運賃ルールデータ
- `stopTimes` (Array): 停車時刻データ
- `trips` (Array): 便データ（各tripに`direction`プロパティが追加されます）
- `routes` (Array): 路線データ
- `calendar` (Array): 運行カレンダーデータ
- `gtfsStops` (Array): GTFS形式のバス停データ

#### 新規プロパティ（データ構造最適化）

- `timetableByRouteAndDirection` (Object): 方向別時刻表インデックス
  - 構造: `{ routeId: { '0': [...], '1': [...], 'unknown': [...] } }`
  - 用途: 路線と方向の組み合わせで時刻表を高速検索

- `tripStops` (Object): Trip-Stopマッピング
  - 構造: `{ tripId: [{ stopId, stopName, sequence, arrivalTime }] }`
  - 用途: 各便の全停留所を順序付きで取得

- `routeMetadata` (Object): 路線メタデータ
  - 構造: `{ routeId: { directions: [...], headsigns: [...], tripCount: {...} } }`
  - 用途: 路線レベルの方向情報、行き先一覧、便数を取得

- `stopToTrips` (Object): 停留所→trip逆引きインデックス
  - 構造: `{ stopId: [tripId1, tripId2, ...] }`
  - 用途: 停留所に停車する全便を高速検索

- `routeToTrips` (Object): 路線→trip逆引きインデックス
  - 構造: `{ routeId: { '0': [tripIds], '1': [tripIds] } }`
  - 用途: 路線と方向から全便を高速検索

- `stopsGrouped` (Object): 停留所グループ化
  - 構造: `{ parentStation: [{ id, name, lat, lng }] }`
  - 用途: 親駅単位で停留所をグループ化

### メソッド

#### `enrichTripsWithDirection()`

全てのtripに方向情報を付与します（新規メソッド）。

**戻り値:**

- (void): 戻り値なし（`this.trips`を直接更新）

**処理フロー:**

1. 路線ごとにtripsをグループ化
2. 各路線で以下を実行：
   - `direction_id`が全て設定されている場合はスキップ
   - `DirectionDetector.detectDirectionByStopSequence()`を呼び出し
   - 判定結果を各`trip.direction`プロパティに設定
3. エラーハンドリングとログ出力

**使用例:**

```javascript
// loadAllDataOnce()から自動的に呼び出されます
// 手動で呼び出す必要はありません

// ただし、手動で呼び出すことも可能です
dataLoader.enrichTripsWithDirection();

// 方向情報が設定されたことを確認
dataLoader.trips.forEach(trip => {
  console.log(`Trip ${trip.trip_id}: direction=${trip.direction}`);
});
```

**統計情報:**

メソッド実行後、コンソールに以下の統計情報が表示されます：

- 処理時間
- 処理した路線数
- 方向判定に成功した路線数
- 方向判定に失敗した路線数
- direction_idが設定されていてスキップした路線数

---

#### `loadGTFSData()`

GTFSデータを読み込み、アプリケーション形式に変換します。

**戻り値:**

- (Promise<Object>): 変換されたデータ
  - `stops` (Array): バス停データ
  - `routes` (Array): 路線データ
  - `trips` (Array): 便データ（各tripに`direction`プロパティが追加されます）
  - `stopTimes` (Array): 停車時刻データ
  - `calendar` (Array): 運行カレンダーデータ

**処理フロー:**

1. `./data`ディレクトリから最新のGTFS ZIPファイルを選択
2. JSZipでZIPファイルを解凍
3. 各GTFSファイル（stops.txt, routes.txt等）をパース
4. GTFS形式からアプリケーション形式に変換
5. **方向情報を各tripに追加（`enrichTripsWithDirection()`を呼び出し）**
6. インデックスを生成
7. メモリにキャッシュ

**使用例:**

```javascript
const dataLoader = new DataLoader();
const data = await dataLoader.loadGTFSData();

console.log(`読み込んだバス停数: ${data.stops.length}`);
console.log(`読み込んだ路線数: ${data.routes.length}`);

// 方向情報が設定されていることを確認
const trip = data.trips[0];
console.log(`Trip ${trip.trip_id}: direction=${trip.direction}`);

// 新規インデックスを使用
const timetable = dataLoader.timetableByRouteAndDirection['route_001']['0'];
const tripStops = dataLoader.tripStops['trip_001'];
```

---

#### `generateIndexes()`

全インデックスを生成します（新規メソッド）。

**処理内容:**

1. 方向別時刻表インデックスを生成
2. Trip-Stopマッピングを生成
3. 路線メタデータを生成
4. stopToTrips逆引きインデックスを生成
5. routeToTrips逆引きインデックスを生成
6. 停留所グループ化を生成

**使用例:**

```javascript
// loadAllDataOnce()から自動的に呼び出されます
// 手動で呼び出す必要はありません
```

---

#### `generateTimetableByRouteAndDirection()`

方向別時刻表インデックスを生成します（新規メソッド）。

**戻り値:**

- (Object): 方向別時刻表インデックス
  - 構造: `{ routeId: { '0': [...], '1': [...], 'unknown': [...] } }`

**使用例:**

```javascript
const index = dataLoader.generateTimetableByRouteAndDirection();
const outboundTimetable = index['route_001']['0'];
```

---

#### `generateTripStops()`

Trip-Stopマッピングを生成します（新規メソッド）。

**戻り値:**

- (Object): Trip-Stopマッピング
  - 構造: `{ tripId: [{ stopId, stopName, sequence, arrivalTime }] }`

**使用例:**

```javascript
const mapping = dataLoader.generateTripStops();
const stops = mapping['trip_001'];
// [{ stopId: 'stop_001', stopName: '佐賀駅', sequence: 1, arrivalTime: '08:00:00' }, ...]
```

---

#### `generateRouteMetadata()`

路線メタデータを生成します（拡張メソッド）。

**戻り値:**

- (Map<string, Object>): 路線メタデータ
  - 各路線のメタデータは以下のプロパティを持つ:
    - `routeId` (string): 路線ID
    - `routeName` (string): 路線名
    - `tripCount` (number): 便数
    - `stopCount` (number): バス停数
    - `directionDetectionRate` (number): 方向判定成功率（0.0-1.0）
    - `detectionMethod` (string): 判定方法（'direction_id', 'stop_sequence', 'unknown'）
    - `unknownDirectionCount` (number): 方向不明の便数

**使用例:**

```javascript
const metadata = dataLoader.generateRouteMetadata();
const routeInfo = metadata.get('route_001');

console.log(`路線名: ${routeInfo.routeName}`);
console.log(`便数: ${routeInfo.tripCount}`);
console.log(`方向判定成功率: ${(routeInfo.directionDetectionRate * 100).toFixed(1)}%`);
console.log(`判定方法: ${routeInfo.detectionMethod}`);
console.log(`方向不明の便数: ${routeInfo.unknownDirectionCount}`);
```

**警告ログ:**

方向判定成功率が50%未満の路線については、警告ログが出力されます：

```
DataLoader.generateRouteMetadata: 路線○○(route_xxx)の方向判定成功率が低いです
{
  detectionRate: "45.0%",
  unknownCount: 11,
  totalTrips: 20
}
```

---

#### `generateStopToTrips()`

stopToTrips逆引きインデックスを生成します（新規メソッド）。

**戻り値:**

- (Object): stopToTrips逆引きインデックス
  - 構造: `{ stopId: [tripId1, tripId2, ...] }`

**使用例:**

```javascript
const index = dataLoader.generateStopToTrips();
const trips = index['stop_001'];
// ['trip_001', 'trip_002', 'trip_003', ...]
```

---

#### `generateRouteToTrips()`

routeToTrips逆引きインデックスを生成します（新規メソッド）。

**戻り値:**

- (Object): routeToTrips逆引きインデックス
  - 構造: `{ routeId: { '0': [tripIds], '1': [tripIds] } }`

**使用例:**

```javascript
const index = dataLoader.generateRouteToTrips();
const outboundTrips = index['route_001']['0'];
// ['trip_001', 'trip_002', ...]
```

---

#### `generateStopsGrouped()`

停留所グループ化を生成します（新規メソッド）。

**戻り値:**

- (Object): 停留所グループ化
  - 構造: `{ parentStation: [{ id, name, lat, lng }] }`

**使用例:**

```javascript
const grouped = dataLoader.generateStopsGrouped();
const platforms = grouped['station_001'];
// [{ id: 'stop_001', name: '佐賀駅バスセンター 1番のりば', lat: 33.249, lng: 130.299 }, ...]
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
  direction_id: string,      // 方向ID（GTFS標準、空の場合あり）
  direction: string,         // 判定された方向（'0'=往路、'1'=復路、'unknown'=不明）← 新規追加
  block_id: string,          // ブロックID（オプション）
  shape_id: string           // 形状ID（オプション）
}
```

**direction プロパティについて:**

- `direction`プロパティは、`enrichTripsWithDirection()`メソッドによって自動的に追加されます
- `direction_id`が設定されている場合は、その値が`direction`にコピーされます
- `direction_id`が空の場合は、停留所順序から方向を推測して`direction`に設定されます
- 判定できない場合は`'unknown'`が設定されます
- `direction_id`プロパティは変更されず、元のGTFSデータが保持されます

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

## データ構造最適化

佐賀バスナビゲーターは、効率的なデータ検索とパフォーマンス向上のため、複数のインデックス戦略を実装しています。

### 最適化の概要

GTFSデータを読み込む際に、以下のインデックスを自動生成します：

1. **方向別時刻表インデックス**: 路線と方向の組み合わせで時刻表を高速検索
2. **Trip-Stopマッピング**: 各便がどの停留所を順番に経由するかを即座に取得
3. **路線メタデータ**: 路線レベルの方向情報、行き先一覧、便数を簡単に取得
4. **逆引きインデックス**: 停留所から便、路線から便への効率的な検索
5. **停留所グループ化**: 親駅による停留所の整理

### インデックスの使用例

#### 1. 方向別時刻表インデックス

路線と方向の組み合わせで時刻表データを高速に検索できます。

```javascript
// 路線001の往路（direction='0'）の時刻表を取得
const outboundTimetable = dataLoader.timetableByRouteAndDirection['route_001']['0'];

// 路線001の復路（direction='1'）の時刻表を取得
const inboundTimetable = dataLoader.timetableByRouteAndDirection['route_001']['1'];

// 方向不明の時刻表を取得
const unknownTimetable = dataLoader.timetableByRouteAndDirection['route_001']['unknown'];

// 時刻表エントリを表示
outboundTimetable.forEach(entry => {
  console.log(`${entry.departureTime} - ${entry.tripHeadsign}`);
});
```

**利点:**
- O(1)の高速検索
- 往路と復路を簡単に分離
- 方向フィルタリングが不要

---

#### 2. Trip-Stopマッピング

各便の全停留所を順序付きで取得できます。

```javascript
// 便001の全停留所を取得
const stops = dataLoader.tripStops['trip_001'];

// 停留所情報を表示
stops.forEach(stop => {
  console.log(`${stop.sequence}. ${stop.stopName} (${stop.arrivalTime})`);
});

// 特定の停留所を検索
const targetStop = stops.find(s => s.stopId === 'stop_005');
if (targetStop) {
  console.log(`停留所005の到着時刻: ${targetStop.arrivalTime}`);
}
```

**利点:**
- 便の経路を即座に取得
- 停留所の順序が保証される
- 到着時刻を含む完全な情報

---

#### 3. 路線メタデータ

路線の方向情報、行き先、便数を簡単に取得できます。

```javascript
// 路線001のメタデータを取得
const metadata = dataLoader.routeMetadata['route_001'];

// 利用可能な方向を確認
console.log(`利用可能な方向: ${metadata.directions.join(', ')}`);
// 出力: 利用可能な方向: 0, 1

// 全ての行き先を表示
console.log(`行き先: ${metadata.headsigns.join(', ')}`);
// 出力: 行き先: 佐賀駅, 県庁

// 方向別の便数を表示
console.log(`往路の便数: ${metadata.tripCount['0']}`);
console.log(`復路の便数: ${metadata.tripCount['1']}`);

// 双方向路線かどうかを判定
const isBidirectional = metadata.directions.length >= 2;
console.log(`双方向路線: ${isBidirectional ? 'はい' : 'いいえ'}`);
```

**利点:**
- 路線の概要を即座に把握
- 双方向路線の判定が簡単
- 便数の統計情報を取得

---

#### 4. 逆引きインデックス

停留所や路線から便を効率的に検索できます。

```javascript
// 停留所001に停車する全便を取得
const tripsAtStop = dataLoader.stopToTrips['stop_001'];
console.log(`停留所001に停車する便数: ${tripsAtStop.length}`);

// 路線001の往路の全便を取得
const outboundTrips = dataLoader.routeToTrips['route_001']['0'];
console.log(`路線001の往路の便数: ${outboundTrips.length}`);

// 路線001の復路の全便を取得
const inboundTrips = dataLoader.routeToTrips['route_001']['1'];
console.log(`路線001の復路の便数: ${inboundTrips.length}`);

// 特定の停留所と路線の組み合わせで便を検索
const stopTrips = dataLoader.stopToTrips['stop_001'];
const routeTrips = dataLoader.routeToTrips['route_001']['0'];
const intersection = stopTrips.filter(tripId => routeTrips.includes(tripId));
console.log(`停留所001を経由する路線001の往路の便数: ${intersection.length}`);
```

**利点:**
- O(1)の高速検索
- 複雑な検索条件を簡単に実装
- メモリ効率的な実装

---

#### 5. 停留所グループ化

親駅単位で停留所をグループ化して表示できます。

```javascript
// 佐賀駅バスセンターの全乗り場を取得
const platforms = dataLoader.stopsGrouped['station_001'];

// 乗り場情報を表示
platforms.forEach(platform => {
  console.log(`${platform.name} (${platform.lat}, ${platform.lng})`);
});

// 親駅を持つ停留所を検索
const stopWithParent = dataLoader.busStops.find(s => s.parentStation === 'station_001');
if (stopWithParent) {
  console.log(`親駅: ${stopWithParent.parentStation}`);
}
```

**利点:**
- 検索結果の整理
- 重複の排除
- ユーザビリティの向上

---

### パフォーマンス

#### インデックス生成

- **タイミング**: データ読み込み時に1回のみ実行
- **進捗表示**: 「インデックス生成中...」メッセージを表示
- **キャッシュ**: 生成されたインデックスはメモリにキャッシュ

#### 検索速度

- **方向別時刻表**: O(1) - 路線IDと方向で直接アクセス
- **Trip-Stop**: O(1) - trip_idで直接アクセス
- **路線メタデータ**: O(1) - route_idで直接アクセス
- **逆引きインデックス**: O(1) - stop_idまたはroute_idで直接アクセス
- **停留所グループ化**: O(1) - parent_stationで直接アクセス

#### メモリ効率

- **参照の活用**: 既存データを参照し、重複を最小化
- **インデックスサイズ**: 元データの約20%の追加メモリ
- **ガベージコレクション**: 不要なインデックスは自動的に解放

---

### 実装の詳細

#### 方向判定の改善

停留所順序ベースの方向推測を追加し、direction_idが空文字列の場合でも正しく方向を判定できるようになりました。

```javascript
// direction_idが空文字列の場合
if (!trip.direction_id || trip.direction_id === '') {
  // 停留所順序から方向を推測
  const directionMap = DirectionDetector.detectDirectionByStopSequence(
    routeId,
    allTrips,
    stopTimes
  );
  
  if (directionMap) {
    trip.direction = directionMap.get(trip.trip_id) || 'unknown';
  }
}
```

#### キャッシュ戦略

方向判定結果をキャッシュし、同じ路線の判定を繰り返さないようにしました。

```javascript
// キャッシュをチェック
const cachedResult = DirectionDetector.getCachedDirectionResult(routeId);

if (cachedResult) {
  // キャッシュから取得
  trip.direction = cachedResult.get(trip.trip_id) || 'unknown';
} else {
  // 新規に判定
  const directionMap = DirectionDetector.detectDirectionByStopSequence(
    routeId,
    allTrips,
    stopTimes
  );
  
  // キャッシュに保存
  DirectionDetector.cacheDirectionResult(routeId, directionMap);
}
```

---

### 後方互換性

新しいインデックスは既存のAPIを変更せず、追加プロパティとして提供されます。

```javascript
// 既存のAPI（変更なし）
const stops = dataLoader.busStops;
const timetable = dataLoader.timetable;

// 新しいインデックス（追加）
const timetableByDirection = dataLoader.timetableByRouteAndDirection;
const tripStops = dataLoader.tripStops;
```

既存のコードは影響を受けず、新しいインデックスを使用するかどうかは開発者が選択できます。

---

### トラブルシューティング

#### インデックスが生成されない

**原因**: データ読み込みが完了していない

**解決策**:
```javascript
// loadAllDataOnce()を呼び出してデータを読み込む
await dataLoader.loadAllDataOnce();

// インデックスが生成されていることを確認
console.log(dataLoader.timetableByRouteAndDirection !== null);
```

#### 方向が'unknown'になる

**原因**: direction_idが設定されておらず、停留所順序からも判定できない

**解決策**:
```javascript
// 方向が'unknown'の場合は、stop_sequenceのみで検索
const timetable = dataLoader.timetable.filter(entry => {
  return entry.routeId === routeId && entry.stopId === stopId;
});
```

#### メモリ使用量が増加する

**原因**: インデックスによる追加メモリ

**解決策**:
```javascript
// 不要になったインデックスをクリア
dataLoader.timetableByRouteAndDirection = null;
dataLoader.tripStops = null;
// ... 他のインデックスも同様
```

---

## 方向判定統合機能

### 概要

方向判定統合機能は、GTFSデータの`direction_id`が設定されていない路線でも、停留所順序から自動的に方向を判定する機能です。

### 自動統合

方向判定は、データ読み込み時に自動的に実行されます：

```
GTFSデータ読み込み
  ↓
データ変換
  ↓
方向判定（enrichTripsWithDirection）← 自動実行
  ├─ 路線ごとに反復
  ├─ direction_idをチェック
  ├─ 停留所順序から方向を推測
  └─ trip.directionプロパティを設定
  ↓
インデックス生成
  ↓
統計情報生成
```

### 判定ロジック

1. **direction_id優先**: GTFSデータに`direction_id`が設定されている場合は、それを使用
2. **停留所順序ベース判定**: `direction_id`が空の場合、停留所の停車順序から方向を推測
   - 各便の最初と最後の停留所を取得
   - 始点・終点の組み合わせでグループ化
   - 2つ以上のグループがある場合、それぞれを異なる方向として扱う
3. **キャッシュ活用**: 一度判定した結果はキャッシュに保存し、再判定を回避

### 使用例

```javascript
// データを読み込む（方向判定は自動実行）
const dataLoader = new DataLoader();
await dataLoader.loadGTFSData();

// 方向情報が設定されていることを確認
dataLoader.trips.forEach(trip => {
  console.log(`Trip ${trip.trip_id}:`);
  console.log(`  direction_id: ${trip.direction_id}`);
  console.log(`  direction: ${trip.direction}`);
});

// 路線メタデータで方向判定成功率を確認
const metadata = dataLoader.routeMetadata.get('route_001');
console.log(`方向判定成功率: ${(metadata.directionDetectionRate * 100).toFixed(1)}%`);
console.log(`判定方法: ${metadata.detectionMethod}`);
```

### エラーハンドリング

方向判定中にエラーが発生した場合：

1. エラーログを出力
2. 該当路線の全ての`trip.direction`を`'unknown'`に設定
3. 処理を継続し、他の路線の判定を実行

### 統計情報

データ読み込み完了後、コンソールに以下の統計情報が表示されます：

```
方向判定開始
方向判定完了 {
  duration: "150ms",
  totalRoutes: 16,
  successCount: 14,
  failureCount: 0,
  skippedCount: 2
}

路線メタデータ生成完了 {
  routeCount: 16,
  averageDetectionRate: "95.5%"
}
```

### 後方互換性

- `direction_id`プロパティは変更されず、元のGTFSデータが保持されます
- 新しい`direction`プロパティが追加されます
- 既存のコードは影響を受けません

---

## 関連ドキュメント

- [時刻表方向情報表示 - 要件定義書](../.kiro/specs/timetable-direction-display/requirements.md)
- [時刻表方向情報表示 - 設計書](../.kiro/specs/timetable-direction-display/design.md)
- [時刻表方向情報表示 - 実装タスク](../.kiro/specs/timetable-direction-display/tasks.md)
- [方向判定統合 - 要件定義書](../.kiro/specs/direction-detection-integration/requirements.md)
- [方向判定統合 - 設計書](../.kiro/specs/direction-detection-integration/design.md)
- [方向判定統合 - 実装タスク](../.kiro/specs/direction-detection-integration/tasks.md)
- [データ構造最適化 - 要件定義書](../.kiro/specs/data-structure-optimization/requirements.md)
- [データ構造最適化 - 設計書](../.kiro/specs/data-structure-optimization/design.md)
- [データ構造最適化 - 実装タスク](../.kiro/specs/data-structure-optimization/tasks.md)
- [双方向検索 - 要件定義書](../.kiro/specs/bidirectional-route-support/requirements.md)
- [双方向検索 - 設計書](../.kiro/specs/bidirectional-route-support/design.md)
- [双方向検索 - 実装タスク](../.kiro/specs/bidirectional-route-support/tasks.md)
- [GTFS移行ガイド](./GTFS_MIGRATION.md)
- [プロジェクト構成](./FILES_STRUCTURE.md)
