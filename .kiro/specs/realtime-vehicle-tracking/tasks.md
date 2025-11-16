# 実装タスクリスト

- [x] 1. 依存ライブラリのセットアップ
  - package.jsonにgtfs-realtime-bindingsとprotobufjsを追加
  - npm installを実行して依存関係をインストール
  - _Requirements: 要件6.1_

- [x] 2. Cloudflare Functionsプロキシの実装
  - [x] 2.1 vehicle.pbプロキシの実装
    - functions/api/vehicle.tsファイルを作成
    - OPTIONSリクエストハンドラーを実装 (CORSプリフライト対応)
    - GETリクエストハンドラーを実装 (vehicle.pbの取得とキャッシュ)
    - CORSヘッダーを設定 (Access-Control-Allow-Origin)
    - 30秒エッジキャッシュを設定 (Cache-Control: max-age=30)
    - エラーハンドリングを実装 (502 Bad Gateway)
    - _Requirements: 要件6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 2.2 route.pbプロキシの実装
    - functions/api/route.tsファイルを作成
    - vehicle.tsと同様の実装 (対象URLをroute.pbに変更)
    - _Requirements: 要件6.2_

  - [x] 2.3 alert.pbプロキシの実装
    - functions/api/alert.tsファイルを作成
    - vehicle.tsと同様の実装 (対象URLをalert.pbに変更)
    - _Requirements: 要件4.1, 4.2, 4.3_

- [x] 3. RealtimeDataLoaderの実装
  - [x] 3.1 基本構造とコンストラクタの実装
    - js/realtime-data-loader.jsファイルを作成
    - RealtimeDataLoaderクラスを定義
    - コンストラクタでproxyBaseUrlを設定
    - ポーリング間隔の管理変数を初期化
    - エラーカウンターを初期化
    - _Requirements: 要件1.1_

  - [x] 3.2 車両位置情報取得の実装
    - fetchVehiclePositions()メソッドを実装
    - /api/vehicleエンドポイントからデータを取得
    - Protocol Buffersデコード処理を実装
    - 車両位置情報を内部データモデルに変換
    - vehiclePositionsUpdatedイベントを発火
    - _Requirements: 要件1.1, 1.2, 1.3, 1.4_

  - [x] 3.3 ルート最新情報取得の実装
    - fetchTripUpdates()メソッドを実装
    - /api/routeエンドポイントからデータを取得
    - Protocol Buffersデコード処理を実装
    - TripUpdatesを内部データモデルに変換
    - tripUpdatesUpdatedイベントを発火
    - _Requirements: 要件3.4, 3.5_

  - [x] 3.4 運行情報取得の実装
    - fetchAlerts()メソッドを実装
    - /api/alertエンドポイントからデータを取得
    - Protocol Buffersデコード処理を実装
    - 運行情報を内部データモデルに変換 (運休/遅延の分類)
    - alertsUpdatedイベントを発火
    - _Requirements: 要件4.1, 要件4.2, 要件4.3, 要件4.4, 要件4.5_

  - [x] 3.5 ポーリング機能の実装
    - initialize()メソッドを実装
    - 30秒ごとにfetchVehiclePositions()、fetchTripUpdates()、fetchAlerts()を呼び出す
    - setIntervalを使用してポーリングを実装
    - stopPolling()メソッドを実装してポーリングを停止
    - _Requirements: 要件1.1, 要件4.1_

  - [x] 3.6 エラーハンドリングとリトライロジックの実装
    - fetchWithRetry()メソッドを実装 (最大3回リトライ、指数バックオフ)
    - handleFetchError()メソッドを実装
    - 連続3回失敗時にポーリング間隔を60秒に延長
    - 成功時にポーリング間隔を30秒に戻す
    - fetchErrorイベントを発火
    - _Requirements: 要件1.5, 要件8.1, 要件8.2, 要件8.4, 要件8.5_

- [x] 4. RealtimeVehicleControllerの実装
  - [x] 4.1 基本構造とコンストラクタの実装
    - js/realtime-vehicle-controller.jsファイルを作成
    - RealtimeVehicleControllerクラスを定義
    - コンストラクタでmapController、dataLoader、realtimeDataLoaderを受け取る
    - 車両マーカー管理用のMapを初期化
    - 最終更新時刻の管理用のMapを初期化
    - _Requirements: 要件2.1_

  - [x] 4.2 初期化処理の実装
    - initialize()メソッドを実装
    - DataLoaderから静的データ(trips.txt, stops.txt)を取得
    - RealtimeDataLoaderのイベントリスナーを設定
    - vehiclePositionsUpdatedイベントのハンドラーを登録
    - tripUpdatesUpdatedイベントのハンドラーを登録
    - alertsUpdatedイベントのハンドラーを登録
    - _Requirements: 要件1.4_

  - [x] 4.3 車両位置情報処理の実装
    - handleVehiclePositionsUpdate()メソッドを実装
    - 各車両データをループ処理
    - trip_idを使用して静的データ(trips.txt)と突合
    - 車両の運行状態を判定 (運行開始前/運行中/運行終了)
    - updateVehicleMarker()を呼び出してマーカーを更新
    - _Requirements: 要件1.4, 要件2.1, 要件2.2, 要件2.3_

  - [x] 4.4 車両マーカーの作成・更新処理の実装
    - updateVehicleMarker()メソッドを実装
    - 運行開始前の場合: stop_times.txtから最初のstop_idを取得し、stops.txtから座標を取得
    - 運行終了の場合: stop_times.txtから最後のstop_idを取得し、stops.txtから座標を取得
    - 運行中の場合: vehicle.pbの緯度・経度を使用
    - 既存マーカーがある場合は位置を更新、ない場合は新規作成
    - MapController.createVehicleMarker()またはupdateVehicleMarkerPosition()を呼び出す
    - 最終更新時刻を記録
    - _Requirements: 要件2.1, 要件2.2, 要件2.3, 要件2.4, 要件2.5_

  - [x] 4.5 運行状態の判定と表示の実装
    - determineVehicleStatus()メソッドを実装
    - 運行開始前: 黄色の文字色で「運行開始前です」
    - 運行終了: 黒色の文字色で「運行終了しました」
    - 定刻通り (±2分以内): 緑色の文字色で「定刻通りです」
    - 遅延 (3分以上): 赤色の文字色で「予定より○分遅れ」
    - 吹き出しをマーカーに表示
    - _Requirements: 要件3.1, 要件3.2, 要件3.3, 要件3.4_

  - [x] 4.6 遅延時間の計算処理の実装
    - calculateDelay()メソッドを実装
    - route.pbからdelay値を取得 (秒単位)
    - delay値を分単位に変換
    - route.pbが利用できない場合: vehicle.pbのcurrent_stop_sequenceとstop_times.txtを突合して遅延を推定
    - _Requirements: 要件3.4, 要件3.5, 要件3.6_

  - [x] 4.7 古い車両マーカーの削除処理の実装
    - removeStaleVehicleMarkers()メソッドを実装
    - 最終更新時刻が30秒以上前の車両マーカーを検索
    - MapController.removeVehicleMarker()を呼び出して削除
    - 車両マーカー管理Mapから削除
    - _Requirements: 要件2.6_

  - [x] 4.8 運行情報処理の実装
    - handleAlertsUpdate()メソッドを実装
    - active_periodを確認し、現在時刻が有効期間内の情報のみをフィルタ
    - header_textまたはdescription_textに「運休」が含まれる場合は運休として分類
    - それ以外は遅延として分類
    - displayAlerts()を呼び出して表示
    - _Requirements: 要件4.3, 要件4.4, 要件4.5_

  - [x] 4.9 運行情報表示の実装
    - displayAlerts()メソッドを実装
    - 地図上部に運行情報表示エリアを作成 (DOM操作)
    - 運休情報: 赤色の文字色で全件表示
    - 遅延情報: 黄色の文字色で最大5件表示
    - 遅延情報が6件以上の場合: 「詳細はこちら」リンクを表示
    - 運行情報カードにheader_textとdescription_textを表示
    - _Requirements: 要件5.1, 要件5.2, 要件5.3, 要件5.4_

  - [x] 4.10 運行情報クリア処理の実装
    - clearAlerts()メソッドを実装
    - 運行情報表示エリアを非表示にする
    - _Requirements: 要件5.5_

- [x] 5. MapControllerの拡張
  - [x] 5.1 車両マーカー作成メソッドの追加
    - createVehicleMarker()メソッドを実装
    - 車両アイコンを作成 (バスの形状)
    - 運行状態に応じた吹き出しを作成
    - Leafletマーカーを作成して地図に追加
    - 車両マーカー管理Mapに追加
    - _Requirements: 要件2.4_

  - [x] 5.2 車両マーカー更新メソッドの追加
    - updateVehicleMarkerPosition()メソッドを実装
    - 既存マーカーの位置を更新
    - 吹き出しの内容を更新
    - _Requirements: 要件2.5_

  - [x] 5.3 車両マーカー削除メソッドの追加
    - removeVehicleMarker()メソッドを実装
    - 地図からマーカーを削除
    - 車両マーカー管理Mapから削除
    - _Requirements: 要件2.6_

  - [x] 5.4 車両アイコン作成メソッドの追加
    - createVehicleIcon()メソッドを実装
    - SVGまたはFont Awesomeを使用してバスアイコンを作成
    - 運行状態に応じた色を設定
    - _Requirements: 要件2.4_

  - [x] 5.5 車両マーカー強調表示メソッドの追加
    - highlightVehicleMarker()メソッドを実装
    - 選択された便の車両マーカーを強調表示
    - 他の車両マーカーを半透明にする
    - _Requirements: 要件2.7_

- [x] 6. app.jsへの統合
  - [x] 6.1 RealtimeVehicleControllerの初期化
    - app.js内でRealtimeVehicleControllerをインスタンス化
    - DataLoaderの読み込み完了後に初期化
    - RealtimeDataLoaderをインスタンス化してRealtimeVehicleControllerに渡す
    - initialize()メソッドを呼び出してポーリングを開始
    - _Requirements: 要件1.1_

  - [x] 6.2 エラーハンドリングの統合
    - fetchErrorイベントのリスナーを設定
    - エラーメッセージをUIに表示
    - _Requirements: 要件8.3_

- [x] 7. フッターへのクレジット表記の追加
  - index.htmlのフッターに「リアルタイムデータ提供: 佐賀バスオープンデータ」を追加
  - リンクをhttp://opendata.sagabus.info/に設定
  - 新しいタブで開くように設定 (target="_blank")
  - _Requirements: 要件7.1, 要件7.2_

- [x] 8. CSPヘッダーの更新
  - _headersファイルのconnect-srcディレクティブにhttp://opendata.sagabus.info を追加
  - _Requirements: セキュリティ要件_

- [x] 9. デプロイメント準備
  - [x] 9.1 依存ライブラリのインストール確認
    - npm installを実行
    - gtfs-realtime-bindingsとprotobufjsが正しくインストールされていることを確認
    - _Requirements: 要件6.1_

  - [x] 9.2 Cloudflare Functionsのデプロイ
    - functions/api/vehicle.ts、route.ts、alert.tsをデプロイ
    - デプロイ後にエンドポイントが正常に動作することを確認
    - _Requirements: 要件6.1, 6.2, 6.3_

  - [x] 9.3 静的ファイルのデプロイ
    - js/realtime-data-loader.js、js/realtime-vehicle-controller.jsをデプロイ
    - index.htmlの更新をデプロイ
    - _headersファイルの更新をデプロイ
    - _Requirements: 全要件_

- [ ] 10. テストの実装
  - [ ] 10.1 RealtimeDataLoaderの単体テスト
    - Protocol Buffersデコードのテスト
    - リトライロジックのテスト
    - エラーハンドリングのテスト
    - _Requirements: テスト戦略_

  - [ ] 10.2 RealtimeVehicleControllerの単体テスト
    - 車両位置計算のテスト (運行開始前/運行中/運行終了)
    - 遅延時間計算のテスト
    - 運行情報分類のテスト (運休/遅延)
    - _Requirements: テスト戦略_

  - [ ] 10.3 E2Eテストの実装
    - 車両位置表示のE2Eテスト
    - 運行情報表示のE2Eテスト
    - エラーハンドリングのE2Eテスト
    - _Requirements: テスト戦略_
