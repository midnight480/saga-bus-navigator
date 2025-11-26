# 設計書

## 概要

佐賀バスナビゲーターアプリのデータ構造を最適化し、効率的なインデックス戦略を実装します。現在のフラットなデータ構造を拡張し、方向別インデックス、Trip-Stopマッピング、路線メタデータ、逆引きインデックス、停留所グループ化を追加します。これにより、方向を考慮した経路ナビゲーション、高速検索、停留所の整理が可能になります。

## アーキテクチャ

### 現在の問題点

1. **方向判定の限界**: direction_idが空文字列の場合の処理が不十分、headsignベースの判定失敗時のフォールバックがない
2. **フラットな時刻表構造**: 方向別にグループ化されていないため、往路と復路の分離が困難
3. **Trip-Stop関係の欠如**: tripがどの停留所を経由するかの情報が構造化されていない
4. **路線レベルのメタデータ不足**: 路線の方向情報、行き先一覧、便数が簡単に取得できない
5. **逆引きインデックスの欠如**: 停留所からtrip、路線からtripへの効率的な検索ができない
6. **停留所の重複**: 親駅による整理がされていない

### 解決アプローチ

1. **方向判定の強化**: 停留所順序ベースの方向推測を追加、判定結果のキャッシュ
2. **インデックスの追加**: 方向別時刻表、Trip-Stop、路線メタデータ、逆引きインデックスを生成
3. **停留所グループ化**: parent_stationを活用した停留所の整理
4. **段階的実装**: 既存機能を壊さず、追加プロパティとして新機能を提供

## コンポーネントとインターフェース

### 1. DirectionDetector（拡張）

既存のDirectionDetectorに停留所順序ベースの方向推測を追加。

```javascript
class DirectionDetector {
  /**
   * 停留所順序から方向を推測（新規メソッド）
   * @param {string} routeId - 路線ID
   * @param {Array} trips - 同じ路線の全てのtrip
   * @param {Array} stopTimes - stop_times.txtのデータ
   * @returns {Map<string, string>} tripIdから方向へのマッピング
   */
  static detectDirectionByStopSequence(routeId, trips, stopTimes)

  /**
   * 方向判定結果をキャッシュ（新規メソッド）
   * @param {string} routeId - 路線ID
   * @param {Map<string, string>} directionMap - tripIdから方向へのマッピング
   */
  static cacheDirectionResult(routeId, directionMap)

  /**
   * キャッシュから方向判定結果を取得（新規メソッド）
   * @param {string} routeId - 路線ID
   * @returns {Map<string, string>|null} tripIdから方向へのマッピング、またはnull
   */
  static getCachedDirectionResult(routeId)
}
```

### 2. DataLoader（拡張）

既存のDataLoaderに新しいインデックスプロパティを追加。

```javascript
class DataLoader {
  constructor() {
    // 既存プロパティ
    this.busStops = null;
    this.timetable = null;
    this.fares = null;
    this.fareRules = null;
    this.stopTimes = null;
    this.trips = null;
    this.routes = null;
    this.calendar = null;
    this.gtfsStops = null;
    
    // 新規プロパティ
    this.timetableByRouteAndDirection = null; // 方向別時刻表インデックス
    this.tripStops = null;                    // Trip-Stopマッピング
    this.routeMetadata = null;                // 路線メタデータ
    this.stopToTrips = null;                  // 停留所→trip逆引きインデックス
    this.routeToTrips = null;                 // 路線→trip逆引きインデックス
    this.stopsGrouped = null;                 // 停留所グループ化
  }

  /**
   * 全インデックスを生成（新規メソッド）
   * loadAllDataOnce()から呼び出される
   */
  generateIndexes()

  /**
   * 方向別時刻表インデックスを生成（新規メソッド）
   * @returns {Object} { routeId: { '0': [...], '1': [...], 'unknown': [...] } }
   */
  generateTimetableByRouteAndDirection()

  /**
   * Trip-Stopマッピングを生成（新規メソッド）
   * @returns {Object} { tripId: [{ stopId, stopName, sequence, arrivalTime }] }
   */
  generateTripStops()

  /**
   * 路線メタデータを生成（新規メソッド）
   * @returns {Object} { routeId: { directions: [...], headsigns: [...], tripCount: {...} } }
   */
  generateRouteMetadata()

  /**
   * stopToTrips逆引きインデックスを生成（新規メソッド）
   * @returns {Object} { stopId: [tripId1, tripId2, ...] }
   */
  generateStopToTrips()

  /**
   * routeToTrips逆引きインデックスを生成（新規メソッド）
   * @returns {Object} { routeId: { '0': [tripIds], '1': [tripIds] } }
   */
  generateRouteToTrips()

  /**
   * 停留所グループ化を生成（新規メソッド）
   * @returns {Object} { parentStation: [{ id, name, lat, lng }] }
   */
  generateStopsGrouped()
}
```

### 3. DataTransformer（拡張）

既存のDataTransformerに停留所グループ化機能を追加。

```javascript
class DataTransformer {
  /**
   * stops.txtを変換し、parent_stationを保持（既存メソッドの拡張）
   * @param {Array} stopsData - stops.txtのデータ
   * @param {Function} progressCallback - 進捗コールバック
   * @returns {Array} 変換されたバス停データ（parent_stationフィールド追加）
   */
  static transformStops(stopsData, progressCallback = null)
}
```

## データモデル

### 方向別時刻表インデックス

```javascript
{
  "route_001": {
    "0": [
      { stopId: "...", stopName: "...", hour: 8, minute: 30, ... },
      ...
    ],
    "1": [
      { stopId: "...", stopName: "...", hour: 9, 15, ... },
      ...
    ],
    "unknown": [
      { stopId: "...", stopName: "...", hour: 10, 0, ... },
      ...
    ]
  },
  ...
}
```

### Trip-Stopマッピング

```javascript
{
  "trip_001": [
    { stopId: "stop_001", stopName: "佐賀駅", sequence: 1, arrivalTime: "08:00:00" },
    { stopId: "stop_002", stopName: "県庁前", sequence: 2, arrivalTime: "08:05:00" },
    ...
  ],
  ...
}
```

### 路線メタデータ

```javascript
{
  "route_001": {
    directions: ["0", "1"],           // 利用可能な方向
    headsigns: ["佐賀駅", "県庁"],    // 全ての行き先
    tripCount: {                      // 方向別のtrip数
      "0": 20,
      "1": 18,
      "unknown": 0
    }
  },
  ...
}
```

### stopToTrips逆引きインデックス

```javascript
{
  "stop_001": ["trip_001", "trip_002", "trip_003", ...],
  "stop_002": ["trip_001", "trip_004", ...],
  ...
}
```

### routeToTrips逆引きインデックス

```javascript
{
  "route_001": {
    "0": ["trip_001", "trip_002", ...],
    "1": ["trip_003", "trip_004", ...],
    "unknown": []
  },
  ...
}
```

### 停留所グループ化

```javascript
{
  "station_001": [
    { id: "stop_001", name: "佐賀駅バスセンター 1番のりば", lat: 33.249, lng: 130.299 },
    { id: "stop_002", name: "佐賀駅バスセンター 2番のりば", lat: 33.249, lng: 130.299 },
    ...
  ],
  ...
}
```

### 拡張されたバス停データ

```javascript
{
  id: string,           // バス停ID
  name: string,         // バス停名
  lat: number,          // 緯度
  lng: number,          // 経度
  parentStation: string // 親駅ID（新規追加）
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しをします。*

### プロパティ1: 無効なdirection_idの処理

*任意の*tripにおいて、direction_idが空文字列、null、またはundefinedの場合、システムはこれらを全て無効な値として扱い、代替の方向判定ロジックを使用する

**検証: 要件1.1**

### プロパティ2: 停留所順序による方向推測

*任意の*路線において、headsignベースの判定が失敗した場合、システムは停留所順序を分析して方向を推測する

**検証: 要件1.2**

### プロパティ3: 始点・終点パターンによる方向分類

*任意の*路線において、始点・終点の組み合わせが2パターン存在する場合、システムはそれぞれを異なる方向として分類する

**検証: 要件1.3**

### プロパティ4: 方向判定結果のキャッシュ

*任意の*路線において、同じ路線IDで方向判定を2回呼び出した場合、2回目はキャッシュから結果を取得し、判定処理を繰り返さない

**検証: 要件1.4**

### プロパティ5: 方向別時刻表インデックスの完全性

*任意の*路線IDと方向の組み合わせにおいて、方向別時刻表インデックスから対応する時刻表データを取得できる

**検証: 要件2.2**

### プロパティ6: 時刻表データの保存性

*任意の*時刻表エントリにおいて、元のtimetable配列の全エントリが方向別インデックスのいずれかに含まれる

**検証: 要件2.3**

### プロパティ7: unknown方向の格納

*任意の*方向がunknownの時刻表エントリにおいて、それらは'unknown'キーの配列に格納される

**検証: 要件2.4**

### プロパティ8: Trip-Stopマッピングの完全性

*任意の*有効なtripIdにおいて、Trip-Stopマッピングから停留所IDの順序付きリストを取得できる

**検証: 要件3.2**

### プロパティ9: 停留所リストの必須フィールド

*任意の*停留所リストエントリにおいて、stopId、stopName、sequence、arrivalTimeの全フィールドを含む

**検証: 要件3.3**

### プロパティ10: 停留所リストのソート順

*任意の*tripの停留所リストにおいて、stop_sequenceが昇順にソートされている

**検証: 要件3.4**

### プロパティ11: 路線メタデータの方向リスト

*任意の*有効な路線IDにおいて、路線メタデータから利用可能な方向のリストを取得できる

**検証: 要件4.2**

### プロパティ12: 路線メタデータのheadsignリスト

*任意の*有効な路線IDにおいて、路線メタデータから全てのheadsignのリストを取得できる

**検証: 要件4.3**

### プロパティ13: 路線メタデータのtrip数

*任意の*有効な路線IDにおいて、路線メタデータから方向別のtrip数を取得できる

**検証: 要件4.4**

### プロパティ14: stopToTripsインデックスの完全性

*任意の*有効な停留所IDにおいて、stopToTripsインデックスから停車する全tripIdのリストを取得できる

**検証: 要件5.2**

### プロパティ15: routeToTripsインデックスの完全性

*任意の*有効な路線IDと方向の組み合わせにおいて、routeToTripsインデックスから該当する全tripIdのリストを取得できる

**検証: 要件5.4**

### プロパティ16: parent_stationフィールドの保持

*任意の*停留所データにおいて、parent_stationフィールドが保持される

**検証: 要件6.1**

### プロパティ17: 停留所グループ化の正確性

*任意の*parent_stationにおいて、同じparent_stationを持つ全ての停留所が同じグループに含まれる

**検証: 要件6.2**

### プロパティ18: グループ化検索オプション

*任意の*停留所検索において、グループ化オプションを有効にした場合、親駅単位でグループ化された結果を返す

**検証: 要件6.3**

### プロパティ19: 乗り場番号の重複排除

*任意の*乗り場番号を含む停留所名において、重複排除やグループ化ロジックが適用される

**検証: 要件6.4**

### プロパティ20: インデックス生成の単一実行

*任意の*データ読み込みにおいて、loadAllDataOnce()を複数回呼び出してもインデックス生成は1回のみ実行される

**検証: 要件7.1**

### プロパティ21: 既存APIの後方互換性

*任意の*既存API呼び出しにおいて、新しいインデックス追加後も戻り値の構造が変更されない

**検証: 要件8.1**

### プロパティ22: 既存コードの動作保証

*任意の*既存コードにおいて、新しいインデックスの追加による影響を受けず、正常に動作する

**検証: 要件8.3**

## エラーハンドリング

### エラーケース1: 方向判定の完全失敗

- **検出**: direction_id、headsign、停留所順序の全ての判定が失敗
- **処理**: 方向を'unknown'として扱い、警告ログを出力
- **ログ**: 路線ID、trip数、判定失敗の理由を出力

### エラーケース2: インデックス生成の失敗

- **検出**: インデックス生成中に例外が発生
- **処理**: エラーログを出力し、該当インデックスをnullに設定
- **ログ**: インデックス名、エラーメッセージ、スタックトレースを出力

### エラーケース3: データ不整合

- **検出**: stop_sequenceが連続していない、または重複している
- **処理**: データをスキップし、警告ログを出力
- **ログ**: 不整合の詳細（trip_id、stop_id、stop_sequence）を出力

## テスト戦略

### ユニットテスト

1. **DirectionDetector.detectDirectionByStopSequence()のテスト**
   - 2つの異なる始点・終点パターンがある場合
   - 全てのtripが同じ始点・終点の場合
   - stop_sequenceが不正な場合

2. **DataLoader.generateTimetableByRouteAndDirection()のテスト**
   - 正常なデータの場合
   - 方向がunknownのエントリが含まれる場合
   - 空のtimetableの場合

3. **DataLoader.generateTripStops()のテスト**
   - 正常なデータの場合
   - stop_sequenceが不連続な場合
   - 停留所名が取得できない場合

4. **DataLoader.generateRouteMetadata()のテスト**
   - 双方向路線の場合
   - 単方向路線の場合
   - 複数のheadsignがある場合

5. **DataLoader.generateStopsGrouped()のテスト**
   - parent_stationが設定されている場合
   - parent_stationが空の場合
   - 同じparent_stationを持つ複数の停留所がある場合

### プロパティベーステスト

プロパティベーステストには**fast-check**ライブラリを使用します。各テストは最低100回の反復を実行します。

1. **プロパティ1のテスト: 無効なdirection_idの処理**
   - ランダムなtripを生成し、direction_idに空文字列、null、undefinedを設定
   - 全て無効として扱われることを検証

2. **プロパティ3のテスト: 始点・終点パターンによる方向分類**
   - ランダムな路線を生成し、2つの異なる始点・終点パターンを設定
   - 2つの方向として分類されることを検証

3. **プロパティ4のテスト: 方向判定結果のキャッシュ**
   - ランダムな路線IDで2回判定を呼び出し
   - 2回目がキャッシュから取得されることを検証

4. **プロパティ6のテスト: 時刻表データの保存性**
   - ランダムな時刻表データを生成
   - 全エントリが方向別インデックスに含まれることを検証

5. **プロパティ10のテスト: 停留所リストのソート順**
   - ランダムなtripの停留所リストを取得
   - stop_sequenceが昇順であることを検証

6. **プロパティ17のテスト: 停留所グループ化の正確性**
   - ランダムなparent_stationを生成
   - 同じparent_stationを持つ停留所が同じグループに含まれることを検証

7. **プロパティ21のテスト: 既存APIの後方互換性**
   - ランダムなAPI呼び出しパラメータを生成
   - 新旧実装の戻り値が一致することを検証

### E2Eテスト

1. **方向別時刻表の検索**
   - 特定の路線と方向で時刻表を検索
   - 正しい方向の時刻表のみが返されることを確認

2. **Trip経路の表示**
   - 特定のtripの停留所リストを取得
   - 全ての停留所が順序通りに表示されることを確認

3. **停留所グループ化の表示**
   - 親駅で停留所を検索
   - 同じ親駅の全ての乗り場が表示されることを確認

## 実装の詳細

### 停留所順序ベースの方向推測アルゴリズム

```javascript
// 1. 各tripの最初と最後の停留所を取得
const tripEndpoints = trips.map(trip => {
  const tripStopTimes = stopTimes
    .filter(st => st.trip_id === trip.trip_id)
    .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
  
  if (tripStopTimes.length === 0) return null;
  
  return {
    tripId: trip.trip_id,
    firstStop: tripStopTimes[0].stop_id,
    lastStop: tripStopTimes[tripStopTimes.length - 1].stop_id
  };
}).filter(ep => ep !== null);

// 2. 始点・終点の組み合わせでグループ化
const endpointGroups = new Map();
tripEndpoints.forEach(ep => {
  const key = `${ep.firstStop}-${ep.lastStop}`;
  if (!endpointGroups.has(key)) {
    endpointGroups.set(key, []);
  }
  endpointGroups.get(key).push(ep.tripId);
});

// 3. 2つ以上のグループがある場合、それぞれを異なる方向として扱う
if (endpointGroups.size >= 2) {
  const directionMap = new Map();
  const keys = Array.from(endpointGroups.keys());
  
  keys.forEach((key, index) => {
    const direction = index === 0 ? '0' : '1';
    endpointGroups.get(key).forEach(tripId => {
      directionMap.set(tripId, direction);
    });
  });
  
  return directionMap;
}

// 4. 判定できない場合はnull
return null;
```

### 方向別時刻表インデックス生成アルゴリズム

```javascript
const index = {};

this.timetable.forEach(entry => {
  const routeId = entry.routeNumber;
  const direction = entry.direction || 'unknown';
  
  if (!index[routeId]) {
    index[routeId] = {};
  }
  
  if (!index[routeId][direction]) {
    index[routeId][direction] = [];
  }
  
  index[routeId][direction].push(entry);
});

return index;
```

### Trip-Stopマッピング生成アルゴリズム

```javascript
const mapping = {};

this.stopTimes.forEach(st => {
  const tripId = st.trip_id;
  
  if (!mapping[tripId]) {
    mapping[tripId] = [];
  }
  
  const stop = this.gtfsStops.find(s => s.stop_id === st.stop_id);
  
  mapping[tripId].push({
    stopId: st.stop_id,
    stopName: stop ? stop.stop_name : '',
    sequence: parseInt(st.stop_sequence),
    arrivalTime: st.arrival_time
  });
});

// 各tripの停留所リストをstop_sequenceでソート
Object.keys(mapping).forEach(tripId => {
  mapping[tripId].sort((a, b) => a.sequence - b.sequence);
});

return mapping;
```

### 路線メタデータ生成アルゴリズム

```javascript
const metadata = {};

this.trips.forEach(trip => {
  const routeId = trip.route_id;
  
  if (!metadata[routeId]) {
    metadata[routeId] = {
      directions: new Set(),
      headsigns: new Set(),
      tripCount: {}
    };
  }
  
  // 方向を追加
  const direction = trip.direction || 'unknown';
  metadata[routeId].directions.add(direction);
  
  // headsignを追加
  if (trip.trip_headsign) {
    metadata[routeId].headsigns.add(trip.trip_headsign);
  }
  
  // trip数をカウント
  if (!metadata[routeId].tripCount[direction]) {
    metadata[routeId].tripCount[direction] = 0;
  }
  metadata[routeId].tripCount[direction]++;
});

// SetをArrayに変換
Object.keys(metadata).forEach(routeId => {
  metadata[routeId].directions = Array.from(metadata[routeId].directions);
  metadata[routeId].headsigns = Array.from(metadata[routeId].headsigns);
});

return metadata;
```

## パフォーマンス考慮事項

### インデックス生成のタイミング

1. **単一実行**: loadAllDataOnce()で1回のみ実行
2. **進捗表示**: 各インデックス生成時に進捗コールバックを呼び出し
3. **メモリ効率**: 既存データを参照し、重複を避ける

### 検索最適化

1. **インデックスの活用**: O(1)またはO(log n)の検索時間
2. **キャッシュの活用**: 方向判定結果をキャッシュし、再計算を避ける
3. **遅延評価**: 必要になるまでインデックスを生成しない（オプション）

## セキュリティ考慮事項

- 入力値の検証: 路線ID、停留所ID、tripIdの形式チェック
- SQLインジェクション対策: 不要（クライアントサイドのみ）
- XSS対策: 停留所名、headsignなどのユーザー表示データをエスケープ

## デプロイメント戦略

1. **段階的ロールアウト**: 新機能をフィーチャーフラグで制御
2. **パフォーマンス監視**: インデックス生成時間とメモリ使用量を監視
3. **ロールバック計画**: 問題が発生した場合は旧実装に戻す

## 今後の拡張性

1. **リアルタイムデータ対応**: インデックスをリアルタイムデータにも適用
2. **複数路線の乗り換え**: インデックスを使用した高速乗り換え検索
3. **ユーザー設定**: 停留所グループ化の表示/非表示を切り替え可能に
4. **インデックスの永続化**: IndexedDBを使用してインデックスをキャッシュ
