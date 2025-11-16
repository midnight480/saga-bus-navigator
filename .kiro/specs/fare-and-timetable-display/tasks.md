# 実装計画

- [x] 1. DataLoaderにfare_rules.txt読み込み機能を追加
  - DataLoader.loadFareRules()メソッドを実装してfare_rules.txtを読み込む
  - DataLoader.loadFares()メソッドを拡張してfare_rules.txtも並列で読み込む
  - DataTransformer.transformFareRules()メソッドを実装してfare_rules.txtを変換
  - fare_rules.txtが存在しない場合のエラーハンドリングを実装
  - _要件: 1.1, 1.4_

- [x] 2. FareCalculatorクラスを実装
  - FareCalculatorクラスの基本構造を作成（js/fare-calculator.js）
  - calculateFare()メソッドを実装して運賃を計算
  - findFareRule()メソッドを実装してfare_rules.txtから該当ルールを検索
  - getFareAttributes()メソッドを実装してfare_attributes.txtから運賃情報を取得
  - 運賃情報が見つからない場合のフォールバック処理を実装
  - _要件: 1.1, 1.2, 1.3_

- [x] 2.1 FareCalculatorの単体テストを作成
  - 正常系テスト: 有効な区間の運賃計算
  - 異常系テスト: 運賃情報が見つからない場合
  - 境界値テスト: 同一バス停間の運賃計算
  - _要件: 1.1, 1.2, 1.3_

- [x] 3. SearchControllerを拡張して運賃計算機能を統合
  - SearchController.getFare()メソッドを拡張してFareCalculatorを使用
  - 既存のfares配列との互換性を維持
  - 運賃情報が見つからない場合のフォールバック処理を実装
  - _要件: 1.1, 1.2, 1.3, 1.4_

- [-] 4. 検索結果に運賃情報を表示
  - UIController.createResultItem()メソッドを拡張して運賃情報を表示
  - 運賃情報が見つからない場合は「運賃情報なし」と表示
  - 既存のレイアウトを維持しつつ運賃情報を追加
  - css/app.cssに運賃表示用スタイルを追加
  - _要件: 1.2, 1.3_

- [x] 4.1 運賃計算・表示機能のE2Eテストを作成
  - バス停選択 → 運賃計算 → 運賃表示のフローをテスト
  - 複数事業者の運賃計算をテスト
  - _要件: 1.1, 1.2, 1.3_

- [x] 5. TimetableControllerクラスを実装
  - TimetableControllerクラスの基本構造を作成（js/timetable-controller.js）
  - getRoutesAtStop()メソッドを実装してバス停で運行している路線一覧を取得
  - getTimetable()メソッドを実装して特定路線の時刻表を取得
  - getRouteStops()メソッドを実装して路線の経路情報を取得
  - stop_times.txtをstop_id + route_idでインデックス化して検索を最適化
  - _要件: 2.1, 2.2, 3.1, 3.2, 4.1, 5.1, 6.1_

- [x] 5.1 TimetableControllerの単体テストを作成
  - 正常系テスト: 路線一覧取得、時刻表取得
  - 異常系テスト: 存在しないバス停・路線の指定
  - 境界値テスト: 深夜便（25:00以降）の時刻表示
  - _要件: 2.1, 2.2, 3.1, 3.2, 4.1, 5.1, 6.1_

- [x] 6. TimetableUIクラスを実装
  - TimetableUIクラスの基本構造を作成（js/timetable-ui.js）
  - showTimetableModal()メソッドを実装して時刻表モーダルを表示
  - displayRouteSelection()メソッドを実装して路線選択画面を表示
  - displayTimetable()メソッドを実装して時刻表を表示
  - switchTab()メソッドを実装して平日・土日祝タブを切り替え
  - handleMapDisplayClick()メソッドを実装して地図表示ボタンのイベントハンドラーを設定
  - css/timetable.cssに時刻表UI用スタイルを追加
  - _要件: 2.1, 2.2, 3.1, 3.2, 4.1, 5.1, 5.2, 5.3, 6.1_

- [x] 7. バス停選択時の「時刻表を見る」ボタンを追加
  - MapControllerのバス停マーカークリック時のポップアップに「時刻表を見る」ボタンを追加
  - ボタンクリック時にTimetableUI.showTimetableModal()を呼び出す
  - バス停名をTimetableControllerに渡して路線一覧を取得
  - _要件: 2.1, 2.2_

- [x] 8. 路線選択画面を実装
  - TimetableUI.displayRouteSelection()で路線一覧を表示
  - 各路線に路線名と事業者名を表示
  - 路線クリック時にTimetableUI.displayTimetable()を呼び出す
  - _要件: 3.1, 3.2, 3.3, 3.4_

- [x] 9. 時刻表表示画面を実装
  - TimetableUI.displayTimetable()で時刻表を表示
  - 平日・土日祝タブを実装
  - 各タブで発車時刻と行き先を表示
  - 深夜便（25:00以降）の時刻を正しく表示
  - _要件: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10. 「地図で表示する」ボタンを実装
  - TimetableUI.handleMapDisplayClick()で地図表示ボタンのイベントハンドラーを実装
  - TimetableController.getRouteStops()で路線の経路情報を取得
  - MapController.displayRoute()を呼び出して経路を地図に表示
  - 時刻表モーダルを閉じて地図エリアにスクロール
  - _要件: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10.1 時刻表表示機能のE2Eテストを作成
  - バス停選択 → 路線選択 → 時刻表表示のフローをテスト
  - 平日・土日祝タブ切り替えをテスト
  - 地図表示ボタン → 経路表示をテスト
  - _要件: 2.1, 2.2, 3.1, 3.2, 4.1, 5.1, 6.1_

- [x] 11. index.htmlに時刻表モーダル用HTMLを追加
  - 時刻表モーダルのHTML構造を追加
  - モーダルの開閉機能を実装
  - アクセシビリティ対応（ARIA属性、キーボード操作）
  - _要件: 2.1, 2.2, 3.1, 5.1_

- [x] 12. アプリケーション初期化処理を更新
  - app.jsのinitializeApp()でFareCalculatorとTimetableControllerを初期化
  - DataLoaderでfare_rules.txtを読み込む
  - エラーハンドリングを実装
  - _要件: 1.1, 2.1_

- [ ] 13. 統合テストとデバッグ
  - 全機能の統合テストを実施
  - パフォーマンステスト（データキャッシュ、検索最適化）
  - ブラウザ互換性テスト（Chrome、Firefox、Safari、Edge）
  - モバイルブラウザテスト（レスポンシブデザイン）
  - _要件: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 4.1, 5.1, 6.1_
