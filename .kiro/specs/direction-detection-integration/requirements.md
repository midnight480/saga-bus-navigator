# 要件定義書

## はじめに

佐賀バスナビゲーターアプリにおいて、`DirectionDetector`クラスと停留所順序ベースの方向判定機能は実装されていますが、データローダーとの統合が不完全です。現在、`detectDirectionByStopSequence()`メソッドが呼び出されておらず、`trips`データに方向情報が反映されていません。この要件定義書では、方向判定機能を完全に統合し、全ての路線で正確な方向情報を提供するための要件を定義します。

## 用語集

- **System**: 佐賀バスナビゲーターアプリケーション
- **DirectionDetector**: 路線の方向を判定するユーティリティクラス
- **DataLoader**: GTFSデータを読み込み、変換するクラス
- **DataTransformer**: GTFSデータをアプリケーション形式に変換するクラス
- **trip**: GTFSにおける1つの運行便
- **direction**: 路線の方向（'0'=往路、'1'=復路、'unknown'=不明）
- **stop_sequence**: バス停の停車順序を示す番号
- **stopTimes**: stop_times.txtから読み込まれた停車時刻データ

## 要件

### 要件1: 方向判定の統合

**ユーザーストーリー:** システム管理者として、全ての路線で停留所順序ベースの方向判定が自動的に実行されるようにしたい。これにより、`direction_id`や`trip_headsign`が利用できない路線でも正確な方向情報が得られる。

#### 受入基準

1. WHEN GTFSデータを読み込む時 THEN Systemは全ての路線に対して`detectDirectionByStopSequence()`を呼び出す
2. WHEN 方向判定が完了する時 THEN Systemは判定結果を各`trip`オブジェクトの`direction`プロパティに設定する
3. WHEN `direction_id`が既に設定されている時 THEN Systemはそれを優先し、停留所順序ベースの判定をスキップする
4. WHEN 停留所順序ベースの判定が失敗する時 THEN Systemは`direction`を'unknown'として設定する
5. WHEN 方向判定が完了する時 THEN Systemは判定結果をキャッシュに保存する

### 要件2: DataLoaderでの方向判定実行

**ユーザーストーリー:** 開発者として、DataLoaderがデータ変換後に自動的に方向判定を実行するようにしたい。これにより、後続の処理で常に正確な方向情報が利用できる。

#### 受入基準

1. WHEN `loadAllDataOnce()`が実行される時 THEN Systemはデータ変換後に`enrichTripsWithDirection()`を呼び出す
2. WHEN `enrichTripsWithDirection()`が実行される時 THEN Systemは全ての路線を反復処理する
3. WHEN 各路線を処理する時 THEN Systemはその路線の全ての`trip`と`stopTimes`を`detectDirectionByStopSequence()`に渡す
4. WHEN 方向判定結果を受け取る時 THEN Systemは各`trip`オブジェクトの`direction`プロパティを更新する
5. WHEN インデックス生成前に方向判定が完了する時 THEN Systemは正確な方向情報を含むインデックスを生成する

### 要件3: DataTransformerでの方向情報利用

**ユーザーストーリー:** 開発者として、DataTransformerが時刻表変換時に`trip.direction`プロパティを参照するようにしたい。これにより、変換された時刻表データに正確な方向情報が含まれる。

#### 受入基準

1. WHEN `transformTimetable()`が実行される時 THEN Systemは`trip.direction`プロパティを確認する
2. WHEN `trip.direction`が設定されている時 THEN Systemはその値を時刻表エントリの`direction`フィールドに設定する
3. WHEN `trip.direction`が設定されていない時 THEN Systemは`DirectionDetector.detectDirection()`を呼び出す
4. WHEN 方向情報を取得する時 THEN Systemは時刻表エントリに`direction`フィールドを追加する

### 要件4: 後方互換性の維持

**ユーザーストーリー:** 開発者として、既存の`trip.direction_id`を上書きせずに新しい`trip.direction`プロパティを追加したい。これにより、元データを保持しつつ判定結果を利用できる。

#### 受入基準

1. WHEN 方向判定を実行する時 THEN Systemは`trip.direction_id`を変更しない
2. WHEN 新しい`direction`プロパティを追加する時 THEN Systemは既存のプロパティを上書きしない
3. WHEN `trip.direction_id`が設定されている時 THEN Systemは`trip.direction`に同じ値を設定する
4. WHEN 既存のコードが`trip.direction_id`を参照する時 THEN Systemは従来通りの動作を保証する

### 要件5: 統計情報の追加

**ユーザーストーリー:** システム管理者として、方向判定の成功率と統計情報を確認したい。これにより、データ品質を監視し、問題を早期に発見できる。

#### 受入基準

1. WHEN `generateRouteMetadata()`が実行される時 THEN Systemは各路線の方向判定成功率を計算する
2. WHEN 方向判定成功率を計算する時 THEN Systemは'unknown'以外の方向を持つ`trip`の割合を算出する
3. WHEN 停留所順序ベースで判定された路線を集計する時 THEN Systemはその数をメタデータに含める
4. WHEN 統計情報を出力する時 THEN Systemはコンソールログに方向判定の概要を表示する
5. WHEN 方向判定の成功率が低い路線がある時 THEN Systemは警告ログを出力する

### 要件6: エラーハンドリングの強化

**ユーザーストーリー:** 開発者として、方向判定中のエラーを適切に処理し、ログに記録したい。これにより、問題の診断とデバッグが容易になる。

#### 受入基準

1. WHEN `stopTimes`データが空の時 THEN Systemは警告ログを出力し、方向を'unknown'として設定する
2. WHEN `trips`データが空の時 THEN Systemは警告ログを出力し、処理をスキップする
3. WHEN 方向判定中に例外が発生する時 THEN Systemはエラーをキャッチし、ログに記録する
4. WHEN エラーが発生する時 THEN Systemは処理を継続し、他の路線の判定を実行する
5. WHEN 方向判定が完了する時 THEN Systemは成功した路線数と失敗した路線数をログに出力する

