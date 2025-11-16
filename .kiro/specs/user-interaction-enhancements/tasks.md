# 実装タスクリスト

## 概要

このタスクリストは、ユーザー操作機能強化の実装手順を定義します。各タスクは要件定義書と設計書に基づいて作成されています。

## タスク一覧

- [x] 1. 地図経路クリア機能の確認
  - 既存実装の動作確認を行う
  - MapController.clearRoute()メソッドが正しく動作することを確認
  - 「経路をクリア」ボタンの表示/非表示が正しく制御されることを確認
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. 現在地表示機能の実装
  - 現在地ボタンのUI要素を作成し、地図の右下に配置する
  - MapControllerに現在地表示機能を追加する
  - Geolocation APIを使用して現在地を取得する機能を実装
  - エラーハンドリングを実装する
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 2.1 現在地ボタンのHTML/CSSを作成
  - index.htmlに現在地ボタンを追加（地図コンテナ内）
  - CSSで地図の右下に配置（position: absolute, z-index: 1000）
  - ボタンアイコンに「◎」を使用
  - _要件: 2.1, 2.2, 2.3_

- [x] 2.2 MapControllerに現在地表示メソッドを追加
  - showCurrentLocation()メソッドを実装
  - getCurrentPosition()メソッドを実装（Geolocation API使用）
  - displayCurrentLocationMarker()メソッドを実装
  - handleLocationError()メソッドを実装
  - displayLocationError()メソッドを実装
  - _要件: 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 2.3 現在地ボタンのイベントリスナーを設定
  - MapController.initialize()内でボタンのイベントリスナーを設定
  - ボタンクリック時にshowCurrentLocation()を呼び出す
  - _要件: 2.4_

- [x] 2.4 現在地表示機能のテストを作成
  - 位置情報取得の成功ケースをテスト
  - 位置情報取得の失敗ケース（PERMISSION_DENIED等）をテスト
  - 現在地マーカーの表示をテスト
  - _要件: 2.4, 2.5, 2.6, 2.7_

- [x] 3. 検索結果クリア機能の実装
  - 検索結果クリアボタンのUI要素を作成する
  - UIControllerに検索結果クリア機能を追加する
  - 検索結果表示時にクリアボタンを表示する
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 検索結果クリアボタンのHTML/CSSを作成
  - index.htmlの検索フォーム下に「検索結果をクリア」ボタンを追加
  - 初期状態はhidden属性で非表示
  - btn btn-secondaryクラスを適用
  - _要件: 3.1_

- [x] 3.2 UIControllerに検索結果クリアメソッドを追加
  - clearSearchResults()メソッドを実装
  - showClearSearchResultsButton()メソッドを実装
  - hideClearSearchResultsButton()メソッドを実装
  - setupClearSearchResultsButton()メソッドを実装
  - _要件: 3.2, 3.3, 3.4, 3.5_

- [x] 3.3 displaySearchResults()メソッドを拡張
  - 検索結果が表示されたらクリアボタンを表示
  - 検索結果が0件の場合はクリアボタンを非表示
  - _要件: 3.1, 3.5_

- [x] 3.4 UIController.initialize()を拡張
  - setupClearSearchResultsButton()を呼び出す
  - _要件: 3.1_

- [x] 3.5 検索結果クリア機能のテストを作成
  - 検索結果クリアの動作をテスト
  - クリアボタンの表示/非表示をテスト
  - 検索フォームのリセットをテスト
  - _要件: 3.2, 3.3, 3.4_

- [x] 4. カレンダー登録機能の実装
  - CalendarExporterクラスを作成する
  - カレンダー登録モーダルのUI要素を作成する
  - UIControllerにカレンダー登録機能を追加する
  - 検索結果アイテムに「カレンダーに登録」ボタンを追加する
  - _要件: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 4.1 CalendarExporterクラスを作成
  - js/calendar-exporter.jsファイルを作成
  - exportToICal()メソッドを実装
  - exportToGoogleCalendar()メソッドを実装
  - generateICalContent()メソッドを実装
  - generateGoogleCalendarURL()メソッドを実装
  - getEventDate()メソッドを実装（日付をまたぐ処理を含む）
  - generateDescription()メソッドを実装
  - formatICalDateTime()メソッドを実装
  - formatGoogleCalendarDateTime()メソッドを実装
  - generateUID()メソッドを実装
  - generateFilename()メソッドを実装
  - downloadFile()メソッドを実装
  - _要件: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 4.2 カレンダー登録モーダルのHTML/CSSを作成
  - index.htmlにカレンダーモーダルを追加
  - モーダルヘッダー、ボディ、オプションボタンを作成
  - CSSでモーダルのスタイルを定義
  - 初期状態はhidden属性で非表示
  - _要件: 4.2_

- [x] 4.3 UIControllerにカレンダー機能を追加
  - constructorにcalendarExporter、calendarModal、currentScheduleForCalendarプロパティを追加
  - setupCalendarModal()メソッドを実装
  - handleAddToCalendarClick()メソッドを実装
  - showCalendarModal()メソッドを実装
  - closeCalendarModal()メソッドを実装
  - handleCalendarExport()メソッドを実装
  - _要件: 4.2, 4.3, 4.4, 4.5_

- [x] 4.4 createResultItem()メソッドを拡張
  - 検索結果アイテムに「カレンダーに登録」ボタンを追加
  - ボタンを「地図で表示」ボタンの下に配置
  - ボタンクリック時にhandleAddToCalendarClick()を呼び出す
  - _要件: 4.1_

- [x] 4.5 UIController.initialize()を拡張
  - CalendarExporterインスタンスを作成
  - setupCalendarModal()を呼び出す
  - _要件: 4.2_

- [x] 4.6 index.htmlにcalendar-exporter.jsを追加
  - scriptタグでjs/calendar-exporter.jsを読み込む
  - app.jsより前に配置
  - _要件: 4.3, 4.4, 4.5_

- [x] 4.7 カレンダー登録機能のテストを作成
  - iCal形式の生成をテスト
  - Google Calendar URLの生成をテスト
  - 日付をまたぐ場合の処理をテスト
  - ファイルダウンロードの動作をテスト
  - _要件: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 5. 統合テストとE2Eテスト
  - 全機能の統合テストを実施する
  - E2Eテストシナリオを実行する
  - ブラウザ互換性テストを実施する
  - _要件: 全て_

- [x] 5.1 現在地表示フローのE2Eテスト
  - 現在地ボタンクリック → 位置情報許可 → 地図移動 → マーカー表示の流れをテスト
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 5.2 検索結果クリアフローのE2Eテスト
  - 検索 → 結果表示 → クリアボタン表示 → クリア → リセットの流れをテスト
  - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.3 カレンダー登録フローのE2Eテスト
  - 検索 → カレンダー登録ボタンクリック → モーダル表示 → iCalダウンロードの流れをテスト
  - 検索 → カレンダー登録ボタンクリック → モーダル表示 → Google Calendar表示の流れをテスト
  - _要件: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5.4 地図経路クリアフローのE2Eテスト
  - 地図で表示 → 経路表示 → クリアボタン表示 → クリア → 非表示の流れをテスト
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5.5 ブラウザ互換性テスト
  - Chrome、Firefox、Safari、Edgeで全機能をテスト
  - モバイルブラウザ（iOS Safari、Chrome Mobile）でテスト
  - _要件: 全て_

- [x] 6. ドキュメント更新
  - README.mdに新機能の説明を追加する
  - 使い方ガイドを更新する
  - _要件: 全て_

- [x] 6.1 README.mdを更新
  - 新機能の概要を追加
  - 使用方法を説明
  - _要件: 全て_

- [x] 6.2 使い方ガイドを更新
  - 現在地表示機能の使い方を追加
  - 検索結果クリア機能の使い方を追加
  - カレンダー登録機能の使い方を追加
  - _要件: 全て_

