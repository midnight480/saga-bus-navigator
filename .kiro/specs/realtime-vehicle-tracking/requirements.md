# 要件定義書

## はじめに

本機能は、佐賀バスオープンデータ（http://opendata.sagabus.info/）から提供されるGTFS-Realtime形式の動的データを活用し、バス車両のリアルタイム位置情報と運行情報（遅延・運休）を地図上に表示する機能です。ユーザーは選択した便の現在位置や遅延状況をリアルタイムで確認でき、運行情報を一目で把握できるようになります。

## 用語集

- **System**: 佐賀バスナビゲーションアプリケーション
- **GTFS-Realtime**: General Transit Feed Specification Realtimeの略。バスの動的データ（車両位置、遅延情報など）を提供する標準形式
- **vehicle.pb**: 車両位置情報を含むProtocol Buffers形式のファイル
- **route.pb**: ルート最新情報（TripUpdates相当）を含むProtocol Buffers形式のファイル
- **alert.pb**: 運行情報（遅延・運休・迂回など）を含むProtocol Buffers形式のファイル
- **trip_id**: GTFS標準の便識別子。静的データと動的データを紐付けるキー
- **Cloudflare Functions**: Cloudflare Pagesで動作するサーバーレス関数。プロキシAPIとして使用
- **Protocol Buffers**: Googleが開発したデータシリアライゼーション形式。バイナリ形式で効率的
- **遅延**: 予定時刻より遅れて運行している状態
- **運休**: 予定されていた便が運行されない状態
- **運行開始前**: 便の出発予定時刻がまだ到来していない状態
- **運行終了**: 便の最終到着予定時刻が既に過ぎた状態

## 要件

### 要件1: 車両位置情報のリアルタイム取得

**ユーザーストーリー:** バス利用者として、選択した便の現在位置をリアルタイムで確認したい。そうすることで、バスがどこまで来ているかを把握し、乗車タイミングを計画できる。

#### 受入基準

1. WHEN アプリケーションが起動している間、THE System SHALL 30秒ごとにvehicle.pbファイルを取得する
2. WHEN vehicle.pbファイルを取得する際、THE System SHALL Cloudflare Functionsのプロキシエンドポイント（/api/vehicle）を経由してアクセスする
3. WHEN vehicle.pbデータを受信した際、THE System SHALL Protocol Buffers形式をデコードして車両位置情報（trip_id、緯度、経度、timestamp）を抽出する
4. WHEN 車両位置情報を抽出した際、THE System SHALL trip_idを使用して静的データ（trips.txt、routes.txt）と突合し、路線情報と便情報を特定する
5. WHEN ネットワークエラーが発生した際、THE System SHALL エラーをコンソールに記録し、次回の取得タイミングまで待機する

### 要件2: 車両位置の地図表示

**ユーザーストーリー:** バス利用者として、地図上で車両の現在位置を視覚的に確認したい。そうすることで、バスの接近状況を直感的に理解できる。

#### 受入基準

1. WHEN 車両位置情報を取得した際、THE System SHALL 地図上に車両マーカーを緯度・経度の位置に配置する
2. WHEN 車両の運行開始予定時刻が現在時刻より後の場合、THE System SHALL stop_times.txtから該当便の最初のstop_idを取得し、stops.txtから該当バス停の緯度・経度を取得して車両マーカーを配置する
3. WHEN 車両の運行終了予定時刻が現在時刻より前の場合、THE System SHALL stop_times.txtから該当便の最後のstop_idを取得し、stops.txtから該当バス停の緯度・経度を取得して車両マーカーを配置する
4. WHEN 車両マーカーを配置する際、THE System SHALL バスアイコンを使用して他のマーカーと区別可能にする
5. WHEN 既存の車両マーカーが存在する際、THE System SHALL マーカー位置を更新し、新規作成を避ける
6. WHEN 車両データが30秒以上更新されない際、THE System SHALL 該当車両マーカーを地図から削除する
7. WHERE ユーザーが特定の便を選択している場合、THE System SHALL 該当便の車両マーカーを強調表示する

### 要件3: 運行状態の表示

**ユーザーストーリー:** バス利用者として、選択した便が定刻通りか遅延しているかを知りたい。そうすることで、待ち時間を正確に把握できる。

#### 受入基準

1. WHEN 車両の運行開始予定時刻が現在時刻より後の場合、THE System SHALL 車両マーカーに黄色の文字色で「運行開始前です」と表示する
2. WHEN 車両の運行終了予定時刻が現在時刻より前の場合、THE System SHALL 車両マーカーに黒色の文字色で「運行終了しました」と表示する
3. WHEN 車両が予定通り運行している場合（遅延が0分または±2分以内）、THE System SHALL 車両マーカーに緑色の文字色で「定刻通りです」と表示する
4. WHEN 車両が予定より遅延している場合（3分以上）、THE System SHALL 車両マーカーに赤色の文字色で「予定より○分遅れ」と表示する
5. WHEN 遅延時間を計算する際、THE System SHALL route.pbファイルから取得したdelay値（秒単位）を分単位に変換する
6. WHERE route.pbファイルが利用できない場合、THE System SHALL vehicle.pbのcurrent_stop_sequenceとstop_times.txtを突合して遅延を推定する

### 要件4: 運行情報のリアルタイム取得

**ユーザーストーリー:** バス利用者として、運休や遅延などの運行情報をリアルタイムで知りたい。そうすることで、代替手段を検討できる。

#### 受入基準

1. WHEN アプリケーションが起動している間、THE System SHALL 30秒ごとにalert.pbファイルを取得する
2. WHEN alert.pbファイルを取得する際、THE System SHALL Cloudflare Functionsのプロキシエンドポイント（/api/alert）を経由してアクセスする
3. WHEN alert.pbデータを受信した際、THE System SHALL Protocol Buffers形式をデコードして運行情報（header_text、description_text、active_period、informed_entity）を抽出する
4. WHEN 運行情報を抽出した際、THE System SHALL active_periodを確認し、現在時刻が有効期間内の情報のみを表示対象とする
5. WHEN 運行情報を分類する際、THE System SHALL header_textまたはdescription_textに「運休」が含まれる場合は運休として扱う

### 要件5: 運行情報の地図表示

**ユーザーストーリー:** バス利用者として、運行情報を地図上で確認したい。そうすることで、影響を受ける路線や区間を把握できる。

#### 受入基準

1. WHEN 運休情報を表示する際、THE System SHALL 地図上部に赤色の文字色で全ての運休情報を表示する
2. WHEN 遅延情報を表示する際、THE System SHALL 地図上部に黄色の文字色で最大5件まで表示する
3. WHEN 遅延情報が6件以上存在する際、THE System SHALL 「詳細はこちら」リンクを表示し、運行情報一覧画面への遷移を可能にする
4. WHEN 運行情報を表示する際、THE System SHALL header_textとdescription_textを含む情報カードとして表示する
5. WHEN 運行情報が存在しない際、THE System SHALL 運行情報表示エリアを非表示にする

### 要件6: Cloudflare Functionsプロキシの実装

**ユーザーストーリー:** 開発者として、GTFS-RealtimeデータをCORS制約なく取得したい。そうすることで、ブラウザから直接データを取得できる。

#### 受入基準

1. THE System SHALL Cloudflare Functionsに/api/vehicleエンドポイントを実装する
2. THE System SHALL Cloudflare Functionsに/api/routeエンドポイントを実装する
3. THE System SHALL Cloudflare Functionsに/api/alertエンドポイントを実装する
4. WHEN プロキシエンドポイントがリクエストを受信した際、THE System SHALL 対応する佐賀バスオープンデータのURLにリクエストを転送する
5. WHEN プロキシエンドポイントがレスポンスを返す際、THE System SHALL Access-Control-Allow-Originヘッダーにhttps://saga-bus.midnight480.comを設定する
6. WHEN プロキシエンドポイントがレスポンスを返す際、THE System SHALL Cache-Controlヘッダーにmax-age=30を設定し、30秒間のエッジキャッシュを有効にする
7. WHEN OPTIONSリクエストを受信した際、THE System SHALL CORSプリフライトレスポンスを返す

### 要件7: データ出典の明示

**ユーザーストーリー:** データ提供者として、データの出典が明示されることを期待する。そうすることで、利用規約を遵守できる。

#### 受入基準

1. THE System SHALL アプリケーションのフッターに「リアルタイムデータ提供：佐賀バスオープンデータ」と表示する
2. WHEN フッターのクレジット表記をクリックした際、THE System SHALL 佐賀バスオープンデータのウェブサイト（http://opendata.sagabus.info/）を新しいタブで開く
3. THE System SHALL データの二次配布を行わず、短期キャッシュ（30秒）のみを使用する

### 要件8: エラーハンドリングとフォールバック

**ユーザーストーリー:** バス利用者として、リアルタイムデータが取得できない場合でも基本機能を使いたい。そうすることで、アプリケーションの可用性が保たれる。

#### 受入基準

1. WHEN GTFS-Realtimeデータの取得に失敗した際、THE System SHALL 静的データ（時刻表）のみを表示し続ける
2. WHEN Protocol Buffersのデコードに失敗した際、THE System SHALL エラーをコンソールに記録し、次回の取得を試みる
3. WHEN Cloudflare Functionsが502エラーを返した際、THE System SHALL ユーザーに「リアルタイム情報が一時的に利用できません」と通知する
4. WHEN 連続して3回データ取得に失敗した際、THE System SHALL 取得間隔を60秒に延長する
5. WHEN データ取得が成功した際、THE System SHALL 取得間隔を30秒に戻す
