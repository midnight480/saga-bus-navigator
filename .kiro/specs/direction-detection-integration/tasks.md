# 実装タスクリスト

- [x] 1. DataLoaderにenrichTripsWithDirection()メソッドを追加
  - `js/data-loader.js`に新しいメソッド`enrichTripsWithDirection()`を実装
  - 路線ごとにtripsをグループ化
  - 各路線で`DirectionDetector.detectDirectionByStopSequence()`を呼び出し
  - 判定結果を各`trip.direction`プロパティに設定
  - エラーハンドリングとログ出力を実装
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 1.1 enrichTripsWithDirection()のプロパティテストを作成
  - **プロパティ1: 全tripへの方向情報付与**
  - **プロパティ2: direction_idの優先と一貫性**
  - **プロパティ3: 判定失敗時のデフォルト値**
  - **プロパティ5: 全路線の処理**
  - **プロパティ6: trip方向プロパティの更新**
  - **検証: 要件1.2, 1.3, 1.4, 2.2, 2.4**

- [x] 1.2 enrichTripsWithDirection()のエッジケーステストを作成
  - 空の`stopTimes`データのテスト
  - 空の`trips`データのテスト
  - 方向判定中の例外処理のテスト
  - **検証: 要件6.1, 6.2, 6.3**
`
- [x] 2. loadAllDataOnce()にenrichTripsWithDirection()の呼び出しを追加
  - `js/data-loader.js`の`loadAllDataOnce()`メソッドを修正
  - データ変換後、インデックス生成前に`enrichTripsWithDirection()`を呼び出し
  - 進捗コールバックを追加（「方向情報を判定しています...」）
  - _要件: 2.1, 2.5_

- [x] 2.1 loadAllDataOnce()の統合テストを作成
  - `enrichTripsWithDirection()`が呼び出されることを検証
  - インデックスに方向情報が含まれることを検証
  - **プロパティ7: インデックスの方向情報**
  - **検証: 要件2.1, 2.5**

- [x] 3. DataTransformer.transformTimetable()を修正
  - `js/data-loader.js`内のDataTransformerクラスを修正
  - `trip.direction`プロパティを優先的に参照
  - `trip.direction`が設定されていない場合は`DirectionDetector.detectDirection()`を呼び出し
  - 時刻表エントリに`direction`フィールドを追加
  - _要件: 3.1, 3.2, 3.3, 3.4_

- [x] 3.1 DataTransformer.transformTimetable()のプロパティテストを作成
  - **プロパティ8: DataTransformerの方向参照**
  - **プロパティ9: 時刻表エントリの方向情報**
  - **検証: 要件3.2, 3.4**

- [x] 3.2 DataTransformer.transformTimetable()のユニットテストを作成
  - `trip.direction`が設定されている場合のテスト
  - `trip.direction`が設定されていない場合のフォールバックテスト
  - **検証: 要件3.1, 3.3**

- [x] 4. チェックポイント - 基本機能のテスト
  - 全てのテストが成功することを確認
  - 問題があれば修正

- [x] 5. DataLoader.generateRouteMetadata()を拡張
  - `js/data-loader.js`の`generateRouteMetadata()`メソッドを修正
  - 方向判定成功率を計算（'unknown'以外の割合）
  - 判定方法を記録（'direction_id', 'stop_sequence', 'unknown'）
  - 方向不明の便数をカウント
  - 成功率が低い路線（50%未満）の警告ログを出力
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5.1 generateRouteMetadata()のプロパティテストを作成
  - **プロパティ12: 路線メタデータの成功率**
  - **プロパティ13: 成功率の計算正確性**
  - **プロパティ14: 停留所順序ベース判定の集計**
  - **検証: 要件5.1, 5.2, 5.3**

- [x] 5.2 generateRouteMetadata()のエッジケーステストを作成
  - 成功率が低い路線の警告ログテスト
  - **検証: 要件5.5**

- [x] 6. 後方互換性のテストを作成
  - `trip.direction_id`が変更されないことを検証
  - 既存のプロパティが保持されることを検証
  - **プロパティ10: direction_idの不変性**
  - **プロパティ11: 既存プロパティの保持**
  - **検証: 要件4.1, 4.2**

- [x] 6.1 後方互換性のプロパティテストを作成
  - **プロパティ10: direction_idの不変性**
  - **プロパティ11: 既存プロパティの保持**
  - **検証: 要件4.1, 4.2**

- [x] 7. エラー処理の統合テストを作成
  - 一部の路線でエラーが発生しても他の路線が処理されることを検証
  - 成功数と失敗数のログ出力を検証
  - **プロパティ15: エラー時の処理継続**
  - **検証: 要件6.4, 6.5**

- [x] 7.1 エラー処理のプロパティテストを作成
  - **プロパティ15: エラー時の処理継続**
  - **検証: 要件6.4**

- [x] 8. チェックポイント - 全テストの実行
  - 全てのテストが成功することを確認
  - 問題があれば修正

- [x] 9. E2Eテストの作成
  - データ読み込みフローの統合テスト
  - 方向判定統計の表示テスト
  - 時刻表データの方向情報テスト
  - _要件: 全般_

- [x] 9.1 E2Eテストの実装
  - `loadAllDataOnce()`実行後の検証
  - 全ての`trip`に`direction`プロパティが設定されていることを確認
  - 時刻表データに`direction`フィールドが含まれることを確認
  - コンソールログに統計情報が出力されることを確認
  - **検証: 要件1.2, 3.4, 5.4**

- [x] 10. ドキュメントの更新
  - README.mdに方向判定統合機能の説明を追加
  - APIドキュメントを更新（新しいメソッドとプロパティ）
  - _要件: 全般_

- [x] 11. 最終チェックポイント
  - 全てのテストが成功することを確認
  - ユーザーに質問があれば確認

