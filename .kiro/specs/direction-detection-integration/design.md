# 設計書

## 概要

佐賀バスナビゲーターアプリにおいて、`DirectionDetector`クラスの停留所順序ベースの方向判定機能をDataLoaderとDataTransformerに統合します。現在、`detectDirectionByStopSequence()`メソッドは実装されていますが呼び出されておらず、`trips`データに方向情報が反映されていません。

この設計では、DataLoaderのデータ読み込みフローに方向判定処理を組み込み、全ての路線で自動的に方向情報を付与します。

## アーキテクチャ

### 現在の問題点

1. **方向判定の未実行**: `detectDirectionByStopSequence()`が実装されているが、どこからも呼び出されていない
2. **データフローの断絶**: DataTransformerが方向判定時に`stopTimes`データを受け取っていない
3. **方向情報の欠落**: `trips`配列に`direction`プロパティが追加されていない
4. **統計情報の不足**: 方向判定の成功率や統計情報が提供されていない

### 解決アプローチ

1. **DataLoaderへの統合**: `loadAllDataOnce()`内でデータ変換後に`enrichTripsWithDirection()`を呼び出す
2. **方向情報の付与**: 各`trip`オブジェクトに`direction`プロパティを追加
3. **DataTransformerの改善**: `trip.direction`プロパティを優先的に参照
4. **統計情報の追加**: `generateRouteMetadata()`に方向判定の統計を追加

### データフロー

```
GTFSデータ読み込み
  ↓
データ変換（DataTransformer）
  ↓
【新規】方向判定（enrichTripsWithDirection）← ここを追加
  ├─ 路線ごとに反復
  ├─ detectDirectionByStopSequence()呼び出し
  └─ trip.directionプロパティを設定
  ↓
インデックス生成（generateIndexes）
  ↓
統計情報生成（generateRouteMetadata）← 方向判定統計を追加
```

## コンポーネントとインターフェース

### 1. DataLoader（拡張）

既存のDataLoaderクラスに新しいメソッドを追加。

```javascript
class DataLoader {
  /**
   * 全てのtripに方向情報を付与（新規メソッド）
   * @returns {void}
   */
  enrichTripsWithDirection()

  /**
   * 路線メタデータを生成（拡張）
   * 方向判定の統計情報を追加
   * @returns {Map<string, Object>} 路線IDをキーとするメタデータ
   */
  generateRouteMetadata()
}
```

### 2. DirectionDetector（既存）

既存のメソッドを使用。変更なし。

```javascript
class DirectionDetector {
  /**
   * 停留所順序から方向を推測（既存メソッド）
   * @param {string} routeId - 路線ID
   * @param {Array} trips - 同じ路線の全てのtrip
   * @param {Array} stopTimes - stop_times.txtのデータ
   * @returns {Map<string, string>} tripIdから方向へのマッピング
   */
  static detectDirectionByStopSequence(routeId, trips, stopTimes)

  /**
   * tripの方向を判定（既存メソッド）
   * @param {Object} trip - trips.txtの1レコード
   * @param {string} routeId - 路線ID
   * @param {Array} allTrips - 同じ路線の全てのtrip
   * @returns {string} 方向識別子（'0'=往路, '1'=復路, 'unknown'=不明）
   */
  static detectDirection(trip, routeId, allTrips)
}
```

### 3. DataTransformer（拡張）

既存のメソッドを修正。

```javascript
class DataTransformer {
  /**
   * 時刻表データを変換（修正）
   * trip.directionプロパティを優先的に参照
   * @param {Array} stopTimes - stop_times.txtのデータ
   * @param {Array} trips - trips.txtのデータ
   * @param {Array} routes - routes.txtのデータ
   * @param {Array} calendar - calendar.txtのデータ
   * @param {Array} agency - agency.txtのデータ
   * @param {Array} stops - stops.txtのデータ
   * @param {Function} progressCallback - 進捗コールバック
   * @returns {Array<Object>} 変換された時刻表データ
   */
  static transformTimetable(stopTimes, trips, routes, calendar, agency, stops, progressCallback)
}
```

## データモデル

### 拡張されたTripオブジェクト

```javascript
{
  trip_id: string,          // 便ID（GTFS標準）
  route_id: string,         // 路線ID（GTFS標準）
  service_id: string,       // 運行日種別ID（GTFS標準）
  trip_headsign: string,    // 行き先（GTFS標準）
  direction_id: string,     // 方向ID（GTFS標準、空の場合あり）
  direction: string         // 判定された方向（'0'=往路, '1'=復路, 'unknown'=不明）← 新規追加
}
```

### RouteMetadataオブジェクト（拡張）

```javascript
{
  routeId: string,                    // 路線ID
  routeName: string,                  // 路線名
  tripCount: number,                  // 便数
  stopCount: number,                  // バス停数
  directionDetectionRate: number,     // 方向判定成功率（0.0-1.0）← 新規追加
  detectionMethod: string,            // 判定方法（'direction_id', 'headsign', 'stop_sequence', 'unknown'）← 新規追加
  unknownDirectionCount: number       // 方向不明の便数← 新規追加
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しをします。*

### プロパティ1: 全tripへの方向情報付与

*任意の*データ読み込み完了後、全ての`trip`オブジェクトは`direction`プロパティを持つ

**検証: 要件1.2**

### プロパティ2: direction_idの優先と一貫性

*任意の*`trip`において、`direction_id`が設定されている場合、`trip.direction`は`trip.direction_id`と同じ値を持つ

**検証: 要件1.3, 4.3**

### プロパティ3: 判定失敗時のデフォルト値

*任意の*方向判定が失敗した`trip`において、`trip.direction`は'unknown'である

**検証: 要件1.4**

### プロパティ4: キャッシュの一貫性

*任意の*路線において、同じ路線で2回方向判定を実行した場合、2回目はキャッシュから取得され、結果は同じである

**検証: 要件1.5**

### プロパティ5: 全路線の処理

*任意の*データセットにおいて、`enrichTripsWithDirection()`実行後、全ての路線が処理される

**検証: 要件2.2**

### プロパティ6: trip方向プロパティの更新

*任意の*方向判定結果において、対応する全ての`trip`オブジェクトの`direction`プロパティが更新される

**検証: 要件2.4**

### プロパティ7: インデックスの方向情報

*任意の*インデックス生成後、生成されたインデックスは正確な方向情報を含む

**検証: 要件2.5**

### プロパティ8: DataTransformerの方向参照

*任意の*`trip.direction`が設定されている`trip`において、変換後の時刻表エントリは同じ`direction`値を持つ

**検証: 要件3.2**

### プロパティ9: 時刻表エントリの方向情報

*任意の*変換された時刻表エントリは`direction`フィールドを含む

**検証: 要件3.4**

### プロパティ10: direction_idの不変性

*任意の*`trip`において、方向判定前後で`direction_id`プロパティは変更されない

**検証: 要件4.1**

### プロパティ11: 既存プロパティの保持

*任意の*`trip`において、方向判定前後で既存のプロパティ（`direction_id`以外）は変更されない

**検証: 要件4.2**

### プロパティ12: 路線メタデータの成功率

*任意の*路線メタデータは方向判定成功率（0.0-1.0の範囲）を含む

**検証: 要件5.1**

### プロパティ13: 成功率の計算正確性

*任意の*路線において、方向判定成功率は（'unknown'以外の方向を持つtrip数 / 全trip数）と等しい

**検証: 要件5.2**

### プロパティ14: 停留所順序ベース判定の集計

*任意の*路線メタデータにおいて、停留所順序ベースで判定された路線数が正確に集計される

**検証: 要件5.3**

### プロパティ15: エラー時の処理継続

*任意の*路線で方向判定エラーが発生しても、他の路線の処理は継続される

**検証: 要件6.4**

## エラーハンドリング

### エラーケース1: stopTimesデータが空

- **検出**: `stopTimes`配列の長さが0
- **処理**: 警告ログを出力し、全ての`trip.direction`を'unknown'に設定
- **ログ**: `routeId`と`tripCount`を含む警告メッセージ

### エラーケース2: tripsデータが空

- **検出**: `trips`配列の長さが0
- **処理**: 警告ログを出力し、処理をスキップ
- **ログ**: `routeId`を含む警告メッセージ

### エラーケース3: 方向判定中の例外

- **検出**: `try-catch`ブロックで例外をキャッチ
- **処理**: エラーログを出力し、該当路線の全ての`trip.direction`を'unknown'に設定
- **ログ**: `routeId`、エラーメッセージ、スタックトレースを出力

### エラーケース4: 方向判定成功率が低い

- **検出**: 方向判定成功率が50%未満
- **処理**: 警告ログを出力（処理は継続）
- **ログ**: `routeId`、`routeName`、成功率を含む警告メッセージ

## テスト戦略

### ユニットテスト

1. **DataLoader.enrichTripsWithDirection()のテスト**
   - 正常な路線データでの方向判定
   - `direction_id`が設定されている場合のスキップ
   - 空の`stopTimes`データの処理
   - 空の`trips`データの処理

2. **DataTransformer.transformTimetable()の修正テスト**
   - `trip.direction`が設定されている場合の参照
   - `trip.direction`が設定されていない場合のフォールバック
   - 時刻表エントリへの`direction`フィールド追加

3. **DataLoader.generateRouteMetadata()の拡張テスト**
   - 方向判定成功率の計算
   - 判定方法の記録
   - 方向不明の便数のカウント

### プロパティベーステスト

プロパティベーステストには**fast-check**ライブラリを使用します。各テストは最低100回の反復を実行します。

1. **プロパティ1のテスト: 全tripへの方向情報付与**
   - ランダムな`trips`と`stopTimes`データを生成
   - `enrichTripsWithDirection()`を実行
   - 全ての`trip`が`direction`プロパティを持つことを検証

2. **プロパティ2のテスト: direction_idの優先**
   - ランダムな`direction_id`を持つ`trip`を生成
   - `enrichTripsWithDirection()`を実行
   - `trip.direction`が`trip.direction_id`と一致することを検証

3. **プロパティ5のテスト: 後方互換性**
   - ランダムな`trips`データを生成
   - `enrichTripsWithDirection()`実行前後で`direction_id`を比較
   - `direction_id`が変更されていないことを検証

4. **プロパティ6のテスト: 時刻表エントリの方向情報**
   - ランダムな時刻表データを生成
   - 全ての時刻表エントリが`direction`フィールドを持つことを検証

5. **プロパティ8のテスト: 統計情報の完全性**
   - ランダムな路線データを生成
   - `generateRouteMetadata()`を実行
   - 全ての路線メタデータが方向判定成功率を含むことを検証

### E2Eテスト

1. **データ読み込みフローの統合テスト**
   - `loadAllDataOnce()`を実行
   - 全ての`trip`に`direction`プロパティが設定されていることを確認
   - 時刻表データに`direction`フィールドが含まれることを確認

2. **方向判定統計の表示テスト**
   - データ読み込み後にコンソールログを確認
   - 方向判定の統計情報が出力されていることを確認

## 実装の詳細

### enrichTripsWithDirection()の実装

```javascript
/**
 * 全てのtripに方向情報を付与
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
```

### generateRouteMetadata()の拡張

```javascript
/**
 * 路線メタデータを生成（拡張）
 * @returns {Map<string, Object>} 路線IDをキーとするメタデータ
 */
generateRouteMetadata() {
  const metadata = new Map();

  // 路線ごとにグループ化
  const tripsByRoute = new Map();
  this.trips.forEach(trip => {
    if (!tripsByRoute.has(trip.route_id)) {
      tripsByRoute.set(trip.route_id, []);
    }
    tripsByRoute.get(trip.route_id).push(trip);
  });

  // 各路線のメタデータを生成
  tripsByRoute.forEach((trips, routeId) => {
    const route = this.routes.find(r => r.route_id === routeId);
    const routeName = route ? route.route_long_name : routeId;

    // バス停数を計算
    const stopIds = new Set();
    this.stopTimes
      .filter(st => trips.some(t => t.trip_id === st.trip_id))
      .forEach(st => stopIds.add(st.stop_id));

    // 方向判定統計を計算
    const totalTrips = trips.length;
    const unknownCount = trips.filter(t => t.direction === 'unknown').length;
    const detectionRate = totalTrips > 0 ? (totalTrips - unknownCount) / totalTrips : 0;

    // 判定方法を決定
    let detectionMethod = 'unknown';
    if (trips.some(t => t.direction_id !== '' && t.direction_id !== null && t.direction_id !== undefined)) {
      detectionMethod = 'direction_id';
    } else if (trips.some(t => t.direction !== 'unknown')) {
      detectionMethod = 'stop_sequence';
    }

    metadata.set(routeId, {
      routeId: routeId,
      routeName: routeName,
      tripCount: totalTrips,
      stopCount: stopIds.size,
      directionDetectionRate: detectionRate,
      detectionMethod: detectionMethod,
      unknownDirectionCount: unknownCount
    });

    // 方向判定成功率が低い場合は警告
    if (detectionRate < 0.5) {
      console.warn(`DataLoader.generateRouteMetadata: 路線${routeName}(${routeId})の方向判定成功率が低いです`, {
        detectionRate: `${(detectionRate * 100).toFixed(1)}%`,
        unknownCount: unknownCount,
        totalTrips: totalTrips
      });
    }
  });

  this.logDebug('路線メタデータ生成完了', {
    routeCount: metadata.size,
    averageDetectionRate: `${(Array.from(metadata.values()).reduce((sum, m) => sum + m.directionDetectionRate, 0) / metadata.size * 100).toFixed(1)}%`
  });

  return metadata;
}
```

### DataTransformer.transformTimetable()の修正

```javascript
// 既存のコード内で方向を取得する部分を修正

// 【修正前】
// direction = DirectionDetector.detectDirection(trip, route.route_id, tripsData);

// 【修正後】
// trip.directionプロパティを優先的に参照
if (trip.direction !== undefined && trip.direction !== null) {
  direction = trip.direction;
} else {
  // フォールバック: DirectionDetectorを使用
  direction = DirectionDetector.detectDirection(trip, route.route_id, tripsData);
}
```

## パフォーマンス考慮事項

### 処理時間の影響

- **方向判定処理**: 路線数に比例（O(n)）
- **停留所順序ベースの判定**: 各路線のtrip数とstopTimes数に比例（O(m × k)）
- **キャッシュの活用**: DirectionDetectorのキャッシュにより、同じ路線の再判定を回避

### 最適化戦略

1. **早期リターン**: `direction_id`が全て設定されている路線はスキップ
2. **バッチ処理**: 路線ごとにまとめて処理
3. **エラー時の継続**: 1つの路線でエラーが発生しても他の路線の処理を継続

### 予想される処理時間

- **小規模データ（10路線、1000便）**: 10-50ms
- **中規模データ（50路線、5000便）**: 50-200ms
- **大規模データ（100路線、10000便）**: 100-500ms

## セキュリティ考慮事項

- 入力値の検証: `routeId`、`tripId`の形式チェック
- エラーハンドリング: 例外をキャッチし、適切にログ出力
- データ整合性: `stopTimes`と`trips`の参照整合性を確認

## デプロイメント戦略

1. **段階的ロールアウト**: 新機能をフィーチャーフラグで制御（オプション）
2. **後方互換性の確保**: 既存の`direction_id`を保持
3. **ロールバック計画**: 問題が発生した場合は`enrichTripsWithDirection()`の呼び出しをコメントアウト

## 今後の拡張性

1. **リアルタイムデータ対応**: リアルタイムデータにも方向情報を付与
2. **方向判定アルゴリズムの改善**: 機械学習を使用した方向判定
3. **ユーザーフィードバック**: ユーザーが方向情報を修正できる機能

