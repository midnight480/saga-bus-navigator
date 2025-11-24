# 設計ドキュメント

## 概要

本設計では、佐賀バスナビゲーターアプリにおける2つの問題を解決します：

1. **時刻表データの重複表示問題**: `loadAllData()`と`loadGTFSData()`が並列で同じGTFSファイルを読み込むことで、データが2重に処理される可能性があります。
2. **運行終了バスの表示問題**: 運行状態が「運行終了」と判定されたバスが地図上に表示され続けています。

## アーキテクチャ

### 現在の問題点

#### 問題1: データローダーの重複呼び出し

```javascript
// app.js の initializeApp() 関数
await Promise.all([
  dataLoader.loadAllData(),      // busStops, timetable, fares を読み込む
  dataLoader.loadGTFSData()      // stopTimes, trips, routes, calendar, gtfsStops を読み込む
]);
```

両方のメソッドが内部で`findGTFSZipFile()`と`loadGTFSZip()`を呼び出し、**同じZIPファイルを2回読み込んでいます**。

**パフォーマンスへの影響:**
- GTFSファイル（約35MB）を2回読み込むため、ネットワーク帯域とメモリを無駄に消費
- 解凍処理も2回実行されるため、CPU負荷が増加
- 読み込み時間が約2倍になる（現在: 約3-5秒 → 改善後: 約1.5-2.5秒）

#### 問題2: 運行終了バスの表示

```javascript
// realtime-vehicle-controller.js の handleVehiclePositionsUpdate()
vehiclePositions.forEach(vehicleData => {
  // ...
  this.updateVehicleMarker(vehicleData, trip);  // 運行終了バスも表示される
});
```

`determineVehicleStatus()`で運行終了状態を判定していますが、その結果に基づいてマーカーの表示/非表示を制御していません。

### 解決策のアーキテクチャ

#### 解決策1: データローダーの統合

GTFSデータの読み込みを**1回のみ**実行し、必要なデータを全て取得します。

**パフォーマンスの改善:**
- GTFSファイルの読み込みが1回になるため、読み込み時間が約半分に短縮
- メモリ使用量も削減（重複したZIPデータを保持しない）
- ユーザー体験の向上（ローディング時間の短縮）

```
┌─────────────────────────────────────────┐
│         initializeApp()                 │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│    dataLoader.loadAllDataOnce()         │
│  ┌───────────────────────────────────┐  │
│  │ 1. findGTFSZipFile()              │  │
│  │ 2. loadGTFSZip()  (1回のみ)      │  │
│  │ 3. parseGTFSFiles()               │  │
│  │ 4. transformStops()               │  │
│  │ 5. transformTimetable()           │  │
│  │ 6. transformFares()               │  │
│  │ 7. 生データをキャッシュ           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  全てのデータが1回の読み込みで取得済み  │
│  - busStops (変換済み)                  │
│  - timetable (変換済み)                 │
│  - fares (変換済み)                     │
│  - stopTimes (生データ)                 │
│  - trips (生データ)                     │
│  - routes (生データ)                    │
│  - calendar (生データ)                  │
│  - gtfsStops (生データ)                 │
└─────────────────────────────────────────┘
```

#### 解決策2: 運行終了バスのフィルタリング

車両位置情報を処理する際に、運行終了状態のバスをフィルタリングします。

```
┌─────────────────────────────────────────┐
│  handleVehiclePositionsUpdate()         │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  vehiclePositions.forEach()             │
│  ┌───────────────────────────────────┐  │
│  │ 1. determineVehicleStatus()       │  │
│  │ 2. if (status === 'after_end')    │  │
│  │      → スキップ                    │  │
│  │ 3. else                            │  │
│  │      → updateVehicleMarker()      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## コンポーネントとインターフェース

### DataLoaderの新しいメソッド

```javascript
class DataLoader {
  /**
   * 全データを1回の読み込みで取得
   * @returns {Promise<void>}
   */
  async loadAllDataOnce() {
    // 既にデータが読み込まれている場合はスキップ
    if (this.isDataLoaded()) {
      return;
    }
    
    // GTFSファイルを1回だけ読み込む
    const zipPath = await this.findGTFSZipFile();
    const zip = await this.loadGTFSZip(zipPath);
    const gtfsData = await this.parseGTFSFiles(zip);
    
    // 変換済みデータを生成
    this.busStops = DataTransformer.transformStops(gtfsData.stops, ...);
    this.timetable = DataTransformer.transformTimetable(gtfsData.stopTimes, ...);
    this.fares = DataTransformer.transformFares(gtfsData.fareAttributes, ...);
    this.fareRules = DataTransformer.transformFareRules(gtfsData.fareRules, ...);
    
    // 生データをキャッシュ
    this.stopTimes = gtfsData.stopTimes;
    this.trips = gtfsData.trips;
    this.routes = gtfsData.routes;
    this.calendar = gtfsData.calendar;
    this.gtfsStops = gtfsData.stops;
  }
  
  /**
   * データが既に読み込まれているかチェック
   * @returns {boolean}
   */
  isDataLoaded() {
    return this.busStops !== null && 
           this.timetable !== null && 
           this.fares !== null &&
           this.stopTimes !== null &&
           this.trips !== null &&
           this.routes !== null &&
           this.calendar !== null &&
           this.gtfsStops !== null;
  }
}
```

### RealtimeVehicleControllerの修正

```javascript
class RealtimeVehicleController {
  /**
   * 車両位置情報更新ハンドラー（修正版）
   * @param {Array} vehiclePositions - 車両位置情報の配列
   */
  handleVehiclePositionsUpdate(vehiclePositions) {
    // ...
    
    vehiclePositions.forEach(vehicleData => {
      try {
        const trip = this.trips.find(t => t.trip_id === vehicleData.tripId);
        
        if (!trip) {
          return;
        }
        
        // 運行状態を判定
        const vehicleStatus = this.determineVehicleStatus(vehicleData, trip);
        
        // 運行終了状態の場合はスキップ
        if (vehicleStatus.state === 'after_end') {
          // 既存のマーカーがあれば削除
          this.mapController.removeVehicleMarker(vehicleData.tripId);
          return;
        }
        
        // 運行中のバスのみマーカーを更新
        this.updateVehicleMarker(vehicleData, trip);
        
      } catch (error) {
        console.error('[RealtimeVehicleController] 車両位置情報の処理に失敗しました:', error, vehicleData);
      }
    });
    
    // 古い車両マーカーを削除
    this.removeStaleVehicleMarkers();
  }
}
```

## データモデル

### GTFSデータの読み込みフロー

```
GTFSファイル (saga-current.zip)
    │
    ├─ stops.txt ────────────┐
    ├─ stop_times.txt ───────┤
    ├─ routes.txt ───────────┤
    ├─ trips.txt ────────────┤
    ├─ calendar.txt ─────────┤
    ├─ agency.txt ───────────┤
    ├─ fare_attributes.txt ──┤
    └─ fare_rules.txt ───────┘
                             │
                             ▼
                    parseGTFSFiles()
                             │
                             ▼
                    ┌────────────────┐
                    │  gtfsData      │
                    │  - stops       │
                    │  - stopTimes   │
                    │  - routes      │
                    │  - trips       │
                    │  - calendar    │
                    │  - agency      │
                    │  - fareAttributes │
                    │  - fareRules   │
                    └────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
        DataTransformer              生データキャッシュ
                │                         │
                ▼                         ▼
        ┌──────────────┐          ┌──────────────┐
        │ 変換済みデータ │          │  生データ     │
        │ - busStops   │          │ - stopTimes  │
        │ - timetable  │          │ - trips      │
        │ - fares      │          │ - routes     │
        │ - fareRules  │          │ - calendar   │
        └──────────────┘          │ - gtfsStops  │
                                  └──────────────┘
```

### 車両状態の判定フロー

```
車両位置情報 (vehicleData)
    │
    ├─ tripId
    ├─ latitude
    ├─ longitude
    ├─ currentStopSequence
    └─ timestamp
         │
         ▼
    determineVehicleStatus()
         │
         ├─ stop_times.txtから便の停車時刻を取得
         ├─ 最初と最後の停車時刻を取得
         ├─ 現在時刻と比較
         │
         ▼
    ┌─────────────────────────────┐
    │ 運行状態の判定               │
    ├─────────────────────────────┤
    │ before_start: 運行開始前     │
    │ in_transit: 運行中           │
    │ on_time: 定刻通り            │
    │ delayed: 遅延                │
    │ early: 早着                  │
    │ after_end: 運行終了 ← フィルタ │
    └─────────────────────────────┘
```

## 正確性プロパティ

*プロパティとは、全ての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械が検証できる正確性保証の橋渡しとなります。*

### プロパティ1: GTFSファイルの単一読み込み

*任意の*アプリケーション初期化において、GTFSファイルは1回のみ読み込まれ、全ての必要なデータが取得されること

**検証: 要件1.1, 1.2**

### プロパティ2: データ変換の一意性

*任意の*GTFSレコードについて、変換処理は1回のみ実行され、重複したエントリが生成されないこと

**検証: 要件1.3**

### プロパティ3: 時刻表表示の一意性

*任意の*検索条件において、各便は時刻表に1回のみ表示されること

**検証: 要件1.4**

### プロパティ4: 運行終了バスの非表示

*任意の*車両位置情報において、運行状態が「運行終了」と判定されたバスは地図上に表示されないこと

**検証: 要件2.1**

### プロパティ5: 運行終了マーカーの削除

*任意の*既存の車両マーカーについて、運行状態が「運行終了」に遷移した場合、そのマーカーは地図から削除されること

**検証: 要件2.2**

### プロパティ6: 運行中バスのフィルタリング

*任意の*リアルタイムデータ更新において、運行終了状態のバスはフィルタリングされ、運行中のバスのみが処理されること

**検証: 要件2.3**

### プロパティ7: データ処理のログ出力

*任意の*データ読み込み処理において、読み込んだレコード数と変換後のレコード数がログ出力されること

**検証: 要件3.1, 3.2**

### プロパティ8: 重複検出の警告

*任意の*データ処理において、重複データが検出された場合、警告ログが出力されること

**検証: 要件3.3**

## エラーハンドリング

### データローダーのエラー処理

1. **GTFSファイルが見つからない場合**
   - エラーコード: `GTFS_FILE_NOT_FOUND`
   - ユーザーへのメッセージ: 「GTFSデータファイルが見つかりません」
   - リトライボタンを表示

2. **ZIPファイルの解凍に失敗した場合**
   - エラーコード: `GTFS_UNZIP_FAILED`
   - ユーザーへのメッセージ: 「GTFSデータの解凍に失敗しました」
   - リトライボタンを表示

3. **データ形式が不正な場合**
   - エラーコード: `GTFS_INVALID_FORMAT`
   - ユーザーへのメッセージ: 「GTFSデータの形式が不正です」
   - リトライボタンを表示

### リアルタイム車両コントローラーのエラー処理

1. **車両位置情報の処理に失敗した場合**
   - エラーログを出力
   - 該当する車両のみスキップし、他の車両の処理は継続

2. **運行状態の判定に失敗した場合**
   - エラーログを出力
   - 該当する車両を「運行状態不明」として扱う
   - マーカーは表示するが、状態は「gray」で表示

## テスト戦略

### ユニットテスト

1. **DataLoader.loadAllDataOnce()のテスト**
   - GTFSファイルが1回のみ読み込まれることを検証
   - 全てのデータが正しく取得されることを検証
   - キャッシュが正しく機能することを検証

2. **DataLoader.isDataLoaded()のテスト**
   - データ読み込み前は`false`を返すことを検証
   - データ読み込み後は`true`を返すことを検証

3. **RealtimeVehicleController.handleVehiclePositionsUpdate()のテスト**
   - 運行終了バスがフィルタリングされることを検証
   - 運行中バスのみがマーカー更新されることを検証

4. **RealtimeVehicleController.determineVehicleStatus()のテスト**
   - 各運行状態が正しく判定されることを検証
   - 運行終了状態が正しく判定されることを検証

### プロパティベーステスト

1. **プロパティ1: GTFSファイルの単一読み込み**
   ```javascript
   // 任意のアプリケーション初期化において
   // GTFSファイルの読み込み回数をカウント
   // 読み込み回数が1回であることを検証
   ```

2. **プロパティ2: データ変換の一意性**
   ```javascript
   // 任意のGTFSレコードについて
   // 変換後のデータに重複がないことを検証
   // Set を使用して一意性をチェック
   ```

3. **プロパティ3: 時刻表表示の一意性**
   ```javascript
   // 任意の検索条件において
   // 各便のtripIdが一意であることを検証
   ```

4. **プロパティ4: 運行終了バスの非表示**
   ```javascript
   // 任意の車両位置情報において
   // 運行終了状態のバスがマーカーとして表示されないことを検証
   ```

5. **プロパティ5: 運行終了マーカーの削除**
   ```javascript
   // 任意の既存マーカーについて
   // 運行終了状態に遷移した場合、マーカーが削除されることを検証
   ```

### 統合テスト

1. **アプリケーション初期化のテスト**
   - データローダーが正しく初期化されることを検証
   - 全てのコントローラーが正しく初期化されることを検証
   - UIが正しく有効化されることを検証

2. **リアルタイム車両追跡のテスト**
   - 車両位置情報が正しく更新されることを検証
   - 運行終了バスが表示されないことを検証
   - 運行中バスのみが表示されることを検証

### E2Eテスト

1. **時刻表検索のテスト**
   - 検索結果に重複がないことを検証
   - 各便が1回のみ表示されることを検証

2. **リアルタイム位置情報のテスト**
   - 運行終了バスが地図上に表示されないことを検証
   - 運行中バスのみが表示されることを検証
