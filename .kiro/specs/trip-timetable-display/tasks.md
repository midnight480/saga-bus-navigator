
# 実装タスクリスト

- [x] 1. TripTimetableFormatterクラスの実装
  - [x] 1.1 基本構造とコンストラクタの実装
    - js/trip-timetable-formatter.jsファイルを作成
    - TripTimetableFormatterクラスを定義
    - コンストラクタでdataLoaderを受け取る
    - 時刻表HTMLキャッシュ用のMapを初期化（最大100件、LRU方式）
    - _Requirements: 要件4.1, 4.3_

  - [x] 1.2 時刻表データ取得メソッドの実装
    - getTimetableData(tripId)メソッドを実装
    - DataLoaderのstopTimesからtrip_idでフィルタ
    - stop_sequenceの昇順でソート
    - 各stop_idに対応するバス停名をstopsから取得
    - 時刻表データオブジェクトを返す
    - _Requirements: 要件1.1, 1.2, 1.3_

  - [x] 1.3 時刻表データ取得のプロパティテスト
    - **Property 1: 時刻表データ取得の完全性**
    - **Validates: Requirements 1.1, 1.2**

  - [x] 1.4 バス停名取得メソッドの実装
    - getStopName(stopId)メソッドを実装
    - DataLoaderのstopsからstop_idで検索
    - 存在する場合はstop_nameを返す
    - 存在しない場合は「バス停名不明」を返す
    - _Requirements: 要件1.3, 1.4_

  - [x] 1.5 バス停名取得のプロパティテスト
    - **Property 2: バス停名取得の正確性**
    - **Validates: Requirements 1.3, 1.4**

  - [x] 1.6 到着時刻フォーマットメソッドの実装
    - formatArrivalTime(arrivalTime)メソッドを実装
    - arrival_time（HH:MM:SS形式）からHH:MMを抽出
    - 不正なフォーマットの場合は「--:--」を返す
    - _Requirements: 要件1.5_

  - [x] 1.7 到着時刻フォーマットのプロパティテスト
    - **Property 3: 時刻フォーマットの正確性**
    - **Validates: Requirements 1.5**

  - [x] 1.8 時刻表テキストフォーマットメソッドの実装
    - formatTimetableText(tripId, options)メソッドを実装
    - getTimetableData()で時刻表データを取得
    - 各停車バス停を「バス停名（到着HH:MM）」形式で生成
    - 矢印（→）で区切って結合
    - 現在位置の強調表示を適用（optionsで指定）
    - _Requirements: 要件2.1, 2.2, 2.3_

  - [x] 1.9 時刻表テキストフォーマットのプロパティテスト
    - **Property 4: 時刻表フォーマットの正確性**
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [x] 1.10 時刻表HTMLフォーマットメソッドの実装
    - formatTimetableHTML(tripId, options)メソッドを実装
    - キャッシュチェック（getCachedTimetable()）
    - 便ID・路線名のヘッダーHTMLを生成
    - formatTimetableText()で時刻表テキストを生成
    - HTMLテンプレートリテラルで時刻表HTMLを生成
    - 折りたたみ機能を適用（10停車以上の場合）
    - キャッシュに保存（cacheTimetable()）
    - 処理時間をコンソールにログ出力
    - _Requirements: 要件2.5, 3.2, 4.2, 4.5, 7.1_

  - [x] 1.11 時刻表HTMLフォーマットのプロパティテスト
    - **Property 5: 時刻表HTMLの構造**
    - **Validates: Requirements 2.5, 3.2**

  - [x] 1.12 ログ出力のプロパティテスト
    - **Property 9: ログ出力の完全性**
    - **Validates: Requirements 4.5**

  - [x] 1.13 現在位置判定メソッドの実装
    - getCurrentStopIndex(tripId, currentStopSequence)メソッドを実装
    - 時刻表データから現在位置のインデックスを検索
    - 見つからない場合は-1を返す
    - _Requirements: 要件6.1_

  - [x] 1.14 キャッシュ管理メソッドの実装
    - cacheTimetable(tripId, html)メソッドを実装（LRU方式）
    - getCachedTimetable(tripId)メソッドを実装
    - clearCache()メソッドを実装
    - 最大100件までキャッシュ、超えた場合は最も古いエントリを削除
    - _Requirements: 要件4.3_

  - [x] 1.15 エラーハンドリングの実装
    - trip_idが存在しない場合のエラーハンドリング
    - DataLoaderが初期化されていない場合のエラーハンドリング
    - データ処理エラーのハンドリング
    - エラーログ出力（trip_id、エラーメッセージ）
    - _Requirements: 要件5.1, 5.2, 5.4, 5.5_

  - [x] 1.16 エラーハンドリングのプロパティテスト
    - **Property 10: エラー時のログ出力**
    - **Validates: Requirements 5.5**

- [x] 2. RealtimeVehicleControllerの拡張
  - [x] 2.1 TripTimetableFormatterの統合
    - RealtimeVehicleControllerのコンストラクタにTripTimetableFormatterを追加
    - TripTimetableFormatterのインスタンスを初期化
    - _Requirements: 要件3.1_

  - [x] 2.2 時刻表表示メソッドの実装
    - addTimetableToPopup(tripId, currentStopSequence, popupElement)メソッドを実装
    - TripTimetableFormatter.formatTimetableHTML()を呼び出し
    - 生成されたHTMLを吹き出しに追加
    - エラーハンドリング（handleTimetableError()）
    - _Requirements: 要件3.1, 3.5_

  - [x] 2.3 updateVehicleMarker()メソッドの拡張
    - 車両マーカー作成時にaddTimetableToPopup()を呼び出し
    - current_stop_sequenceを渡す
    - _Requirements: 要件3.1_

  - [x] 2.4 時刻表エラーハンドリングの実装
    - handleTimetableError(error, tripId)メソッドを実装
    - エラーメッセージを吹き出しに表示
    - エラーログを出力
    - 既存の運行状態情報は引き続き表示
    - _Requirements: 要件5.2, 5.3, 5.5_

  - [x] 2.5 吹き出しへの統合のプロパティテスト
    - **Property 6: 吹き出しへの統合**
    - **Validates: Requirements 3.1**

- [x] 3. MapControllerの拡張
  - [x] 3.1 車両マーカー吹き出しHTML構造の拡張
    - createVehicleMarker()メソッドを拡張
    - 吹き出しHTMLに時刻表セクション用のコンテナを追加
    - 時刻表セクション用のCSSクラスを適用
    - _Requirements: 要件3.1, 3.4_

  - [x] 3.2 時刻表追加メソッドの実装
    - appendTimetableToPopup(markerId, timetableHTML)メソッドを実装
    - 指定されたマーカーの吹き出しに時刻表HTMLを追加
    - _Requirements: 要件3.1_

  - [x] 3.3 折りたたみリンクのイベントリスナー設定
    - setupTimetableToggleListeners(popupElement)メソッドを実装
    - 折りたたみリンクのクリックイベントを設定
    - 展開・折りたたみの切り替え処理を実装
    - _Requirements: 要件7.3, 7.5_

  - [x] 3.4 スクロール可能なスタイルのプロパティテスト
    - **Property 7: スクロール可能なスタイル**
    - **Validates: Requirements 3.3**

  - [x] 3.5 視覚的区別のスタイルのプロパティテスト
    - **Property 8: 視覚的区別のスタイル**
    - **Validates: Requirements 3.4**

- [x] 4. CSSスタイルの追加
  - [x] 4.1 時刻表セクションのスタイル
    - css/app.cssに時刻表セクション用のスタイルを追加
    - .trip-timetableクラスのスタイル（背景色、パディング、ボーダー）
    - .timetable-headerクラスのスタイル（フォントサイズ、太字）
    - .timetable-contentクラスのスタイル（スクロール可能、最大高さ）
    - _Requirements: 要件3.3, 3.4_

  - [x] 4.2 時刻表アイテムのスタイル
    - .stop-itemクラスのスタイル（インライン表示、マージン）
    - .stop-arrowクラスのスタイル（色、マージン）
    - .current-stopクラスのスタイル（太字、色）
    - .current-markerクラスのスタイル（色、フォントサイズ）
    - _Requirements: 要件6.2, 6.3_

  - [x] 4.3 折りたたみリンクのスタイル
    - .timetable-toggleクラスのスタイル（色、下線、カーソル）
    - ホバー時のスタイル
    - _Requirements: 要件7.2, 7.4_

  - [x] 4.4 現在位置の強調表示のプロパティテスト
    - **Property 11: 現在位置の強調表示**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 5. app.jsへの統合
  - [x] 5.1 TripTimetableFormatterの初期化
    - app.js内でTripTimetableFormatterをインスタンス化
    - DataLoaderを渡す
    - RealtimeVehicleControllerに渡す
    - _Requirements: 要件4.1_

- [-] 6. テストの実装
  - [x] 6.1 TripTimetableFormatterの単体テスト
    - getTimetableData()のテスト（正常系・異常系）
    - formatTimetableHTML()のテスト（各オプション）
    - formatArrivalTime()のテスト（時刻フォーマット）
    - getStopName()のテスト（存在・非存在ケース）
    - キャッシュ機能のテスト
    - _Requirements: テスト戦略_

  - [x] 6.2 RealtimeVehicleControllerの単体テスト
    - addTimetableToPopup()のテスト
    - エラーハンドリングのテスト
    - _Requirements: テスト戦略_

  - [x] 6.3 折りたたみ機能のプロパティテスト
    - **Property 12: 折りたたみ状態の判定**
    - **Validates: Requirements 7.1**

  - [x] 6.4 折りたたみリンクのプロパティテスト
    - **Property 13: 折りたたみリンクの表示**
    - **Validates: Requirements 7.2**

  - [-] 6.5 展開・折りたたみ動作のプロパティテスト
    - **Property 14: 展開・折りたたみの動作**
    - **Validates: Requirements 7.3, 7.5**

  - [x] 6.6 展開時のリンクテキストのプロパティテスト
    - **Property 15: 展開時のリンクテキスト**
    - **Validates: Requirements 7.4**

  - [x] 6.7 E2Eテストの実装
    - 時刻表表示のE2Eテスト
    - 現在位置の強調表示のE2Eテスト
    - 折りたたみ機能のE2Eテスト
    - エラーハンドリングのE2Eテスト
    - _Requirements: テスト戦略_

- [x] 7. チェックポイント - 全テストの実行
  - 全てのテストが通ることを確認
  - ユーザーに質問があれば確認

- [x] 8. ドキュメントの更新
  - README.mdに時刻表表示機能の説明を追加
  - 使用方法のスクリーンショットを追加（オプション）
  - _Requirements: 全要件_
