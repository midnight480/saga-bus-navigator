# 実装計画

- [x] 1. DataLoaderの統合実装
  - DataLoaderに`loadAllDataOnce()`メソッドを追加し、GTFSファイルを1回だけ読み込む
  - `isDataLoaded()`メソッドを追加し、データが既に読み込まれているかチェックする
  - 既存の`loadAllData()`と`loadGTFSData()`メソッドを`loadAllDataOnce()`を使用するように修正
  - _要件: 1.1, 1.2, 1.3_

- [x] 1.1 loadAllDataOnce()メソッドの実装
  - GTFSファイルを1回だけ読み込み、全てのデータを取得する
  - 変換済みデータ（busStops, timetable, fares, fareRules）を生成
  - 生データ（stopTimes, trips, routes, calendar, gtfsStops）をキャッシュ
  - _要件: 1.1, 1.2_

- [x] 1.2 isDataLoaded()メソッドの実装
  - 全てのデータプロパティがnullでないことを確認
  - データが既に読み込まれている場合はtrueを返す
  - _要件: 1.5_

- [x] 1.3 既存メソッドの修正
  - `loadAllData()`を`loadAllDataOnce()`を呼び出すように修正
  - `loadGTFSData()`を`loadAllDataOnce()`を呼び出すように修正
  - 後方互換性を維持
  - _要件: 1.1, 1.2, 1.5_

- [x] 2. app.jsの初期化処理の修正
  - `initializeApp()`関数で`loadAllDataOnce()`を1回だけ呼び出す
  - `Promise.all()`による並列呼び出しを削除
  - データ読み込み完了後、全てのコントローラーを初期化
  - _要件: 1.1, 1.2_

- [x] 3. 運行終了バスのフィルタリング実装
  - `RealtimeVehicleController.handleVehiclePositionsUpdate()`を修正
  - 運行状態が「運行終了」のバスをフィルタリング
  - 運行終了バスの既存マーカーを削除
  - _要件: 2.1, 2.2, 2.3, 2.4_

- [x] 3.1 handleVehiclePositionsUpdate()の修正
  - 各車両の運行状態を判定
  - 運行終了状態（`after_end`）の場合はスキップ
  - 既存のマーカーがあれば削除
  - _要件: 2.1, 2.2_

- [x] 3.2 運行終了バスのログ出力
  - フィルタリングされたバス数をログ出力
  - 運行終了バスのtripIdをログ出力
  - _要件: 3.4, 3.5_

- [x] 4. データ処理のログ出力強化
  - GTFSデータ読み込み時のレコード数をログ出力
  - データ変換前後のレコード数をログ出力
  - 重複データ検出時の警告ログを追加
  - _要件: 3.1, 3.2, 3.3_

- [x] 4.1 GTFSデータ読み込みのログ出力
  - `parseGTFSFiles()`で各ファイルのレコード数をログ出力
  - 読み込み時間をログ出力
  - _要件: 3.1_

- [x] 4.2 データ変換のログ出力
  - `DataTransformer`の各メソッドで変換前後のレコード数をログ出力
  - 変換時間をログ出力
  - _要件: 3.2_

- [x] 4.3 重複検出の警告ログ
  - `DataTransformer.transformTimetable()`で重複チェックを追加
  - 重複が検出された場合は警告ログを出力
  - _要件: 3.3_

- [x] 5. チェックポイント - 全てのテストが通ることを確認
  - 全てのテストが通ることを確認
  - ユーザーに質問がある場合は確認

- [x] 6. ユニットテストの作成
  - DataLoader.loadAllDataOnce()のテスト
  - DataLoader.isDataLoaded()のテスト
  - RealtimeVehicleController.handleVehiclePositionsUpdate()のテスト
  - _要件: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 6.1 DataLoader.loadAllDataOnce()のテスト
  - GTFSファイルが1回のみ読み込まれることを検証
  - 全てのデータが正しく取得されることを検証
  - キャッシュが正しく機能することを検証
  - _要件: 1.1, 1.2_

- [x] 6.2 DataLoader.isDataLoaded()のテスト
  - データ読み込み前はfalseを返すことを検証
  - データ読み込み後はtrueを返すことを検証
  - _要件: 1.5_

- [x] 6.3 RealtimeVehicleController.handleVehiclePositionsUpdate()のテスト
  - 運行終了バスがフィルタリングされることを検証
  - 運行中バスのみがマーカー更新されることを検証
  - _要件: 2.1, 2.2, 2.3_

- [x] 7. E2Eテストの作成
  - 時刻表検索の重複チェックテスト
  - リアルタイム位置情報の運行終了バス非表示テスト
  - _要件: 1.4, 2.4_

- [x] 7.1 時刻表検索の重複チェックテスト
  - 検索結果に重複がないことを検証
  - 各便が1回のみ表示されることを検証
  - _要件: 1.4_

- [x] 7.2 リアルタイム位置情報のテスト
  - 運行終了バスが地図上に表示されないことを検証
  - 運行中バスのみが表示されることを検証
  - _要件: 2.4_

- [x] 8. 最終チェックポイント - 全てのテストが通ることを確認
  - 全てのテストが通ることを確認
  - ユーザーに質問がある場合は確認
