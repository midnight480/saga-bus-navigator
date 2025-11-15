# 要件定義書

## はじめに

本機能は、GTFS形式のstops.txtに格納されているバス停の位置情報をOpenStreetMap上に表示するものです。ユーザーは地図上でバス停の位置を視覚的に確認でき、より直感的にバス停を探すことができるようになります。

## 用語集

- **MapDisplay**: OpenStreetMapを表示し、バス停マーカーを管理するシステムコンポーネント
- **BusStopMarker**: 地図上に表示されるバス停の位置を示すマーカー
- **GTFSData**: stops.txtから読み込まれたバス停情報（stop_id, stop_name, stop_lat, stop_lon等）
- **LeafletLibrary**: OpenStreetMapを表示するためのJavaScriptライブラリ
- **MarkerCluster**: 複数のマーカーをグループ化して表示する機能

## 要件

### 要件1: 地図の初期表示

**ユーザーストーリー:** ユーザーとして、アプリケーションを開いたときに佐賀市中心部を表示した地図を見たい。これにより、すぐに周辺のバス停を確認できる。

#### 受入基準

1. WHEN アプリケーションが起動する, THE MapDisplay SHALL 佐賀市中心部（緯度33.2635, 経度130.3005）を中心とした地図を表示する
2. THE MapDisplay SHALL ズームレベル13で地図を初期化する
3. THE MapDisplay SHALL OpenStreetMapのタイルレイヤーを使用して地図を描画する
4. THE MapDisplay SHALL 地図コンテナの高さを画面の50%以上に設定する
5. IF 地図の初期化に失敗する, THEN THE MapDisplay SHALL エラーメッセージを表示する

### 要件2: バス停マーカーの表示

**ユーザーストーリー:** ユーザーとして、地図上に全てのバス停の位置をマーカーで表示してほしい。これにより、どこにバス停があるのかを一目で把握できる。

#### 受入基準

1. WHEN GTFSDataが読み込まれる, THE MapDisplay SHALL stops.txtの全てのバス停に対してBusStopMarkerを生成する
2. THE MapDisplay SHALL 各BusStopMarkerをstop_latとstop_lonの座標に配置する
3. THE MapDisplay SHALL BusStopMarkerに青色のピンアイコンを使用する
4. WHILE 100個以上のBusStopMarkerが存在する, THE MapDisplay SHALL MarkerClusterを使用してマーカーをグループ化する
5. THE MapDisplay SHALL 各BusStopMarkerにstop_nameをツールチップとして表示する

### 要件3: バス停情報の表示

**ユーザーストーリー:** ユーザーとして、地図上のバス停マーカーをクリックしたときに、そのバス停の詳細情報を見たい。これにより、バス停名や路線情報を確認できる。

#### 受入基準

1. WHEN ユーザーがBusStopMarkerをクリックする, THE MapDisplay SHALL ポップアップウィンドウを表示する
2. THE MapDisplay SHALL ポップアップにstop_nameを見出しとして表示する
3. THE MapDisplay SHALL ポップアップにstop_idを表示する
4. WHERE そのバス停を通る路線情報が存在する, THE MapDisplay SHALL 路線名のリストをポップアップに表示する
5. THE MapDisplay SHALL ポップアップに「時刻表を見る」ボタンを表示する

### 要件4: 地図操作機能

**ユーザーストーリー:** ユーザーとして、地図を自由に操作して、見たい場所のバス停を探したい。これにより、目的地周辺のバス停を見つけることができる。

#### 受入基準

1. THE MapDisplay SHALL ドラッグ操作による地図の移動を可能にする
2. THE MapDisplay SHALL ピンチ操作またはマウスホイールによるズームイン・ズームアウトを可能にする
3. THE MapDisplay SHALL ズームレベル10から18の範囲で地図を表示する
4. THE MapDisplay SHALL ダブルクリックによるズームイン操作を可能にする
5. THE MapDisplay SHALL 地図の境界を日本国内に制限する

### 要件5: レスポンシブ対応

**ユーザーストーリー:** ユーザーとして、スマートフォンでもPCでも快適に地図を見たい。これにより、どのデバイスからでもバス停を探すことができる。

#### 受入基準

1. THE MapDisplay SHALL 画面幅320px以上のデバイスで地図を正しく表示する
2. WHILE 画面幅が768px未満である, THE MapDisplay SHALL 地図の高さを画面の40%に設定する
3. WHILE 画面幅が768px以上である, THE MapDisplay SHALL 地図の高さを画面の60%に設定する
4. THE MapDisplay SHALL タッチ操作による地図の移動とズームを可能にする
5. THE MapDisplay SHALL 地図コントロール（ズームボタン等）をモバイルデバイスで操作しやすいサイズで表示する

### 要件6: パフォーマンス

**ユーザーストーリー:** ユーザーとして、地図とバス停マーカーが素早く表示されてほしい。これにより、ストレスなくバス停を探すことができる。

#### 受入基準

1. THE MapDisplay SHALL GTFSDataの読み込み完了から3秒以内に全てのBusStopMarkerを表示する
2. WHILE 地図を操作している, THE MapDisplay SHALL 60FPS以上のフレームレートを維持する
3. THE MapDisplay SHALL 初回表示時にマーカーを遅延読み込みする
4. THE MapDisplay SHALL 表示範囲外のマーカーをDOMから削除してメモリ使用量を最適化する
5. THE MapDisplay SHALL 地図タイルを非同期で読み込む

### 要件7: 地図からのバス停選択

**ユーザーストーリー:** ユーザーとして、地図上でバス停をクリックして乗車バス停と降車バス停を選択したい。これにより、視覚的にバス停を選んで検索できる。

#### 受入基準

1. THE MapDisplay SHALL 「乗車バス停を選択」モードと「降車バス停を選択」モードを提供する
2. WHEN ユーザーが選択モードを有効にする, THE MapDisplay SHALL 地図上のBusStopMarkerをクリック可能な状態にする
3. WHEN ユーザーが乗車バス停選択モードでBusStopMarkerをクリックする, THE MapDisplay SHALL そのバス停を乗車バス停として設定する
4. WHEN ユーザーが降車バス停選択モードでBusStopMarkerをクリックする, THE MapDisplay SHALL そのバス停を降車バス停として設定する
5. THE MapDisplay SHALL 選択された乗車バス停のマーカーを緑色で表示する
6. THE MapDisplay SHALL 選択された降車バス停のマーカーを赤色で表示する
7. WHEN バス停が選択される, THE MapDisplay SHALL 検索フォームの該当フィールドにstop_nameを自動入力する
8. THE MapDisplay SHALL 選択モードを解除するボタンを提供する

### 要件8: 検索結果の経路表示

**ユーザーストーリー:** ユーザーとして、検索結果から経路を地図上で確認したい。これにより、乗車バス停、経由地、降車バス停の位置関係を視覚的に理解できる。

#### 受入基準

1. THE MapDisplay SHALL 各検索結果に「地図で表示」ボタンを追加する
2. WHEN ユーザーが「地図で表示」ボタンをクリックする, THE MapDisplay SHALL その経路を地図上に表示する
3. THE MapDisplay SHALL 乗車バス停を緑色のマーカーで表示する
4. THE MapDisplay SHALL 降車バス停を赤色のマーカーで表示する
5. WHERE 経由バス停が存在する, THE MapDisplay SHALL 経由バス停を黄色のマーカーで表示する
6. THE MapDisplay SHALL 乗車バス停から降車バス停までの経路を青色の線で地図上に描画する
7. THE MapDisplay SHALL 経路上の全てのバス停を含む範囲に地図を自動的にズームする
8. THE MapDisplay SHALL 経路線上に矢印を表示してバスの進行方向を示す
9. WHEN 複数の経路が表示されている, THE MapDisplay SHALL 前の経路をクリアしてから新しい経路を表示する
10. THE MapDisplay SHALL 経路表示をクリアするボタンを提供する

### 要件9: エラーハンドリング

**ユーザーストーリー:** ユーザーとして、地図の読み込みに失敗したときに、何が問題なのかを知りたい。これにより、適切な対処ができる。

#### 受入基準

1. IF GTFSDataの読み込みに失敗する, THEN THE MapDisplay SHALL 「バス停データの読み込みに失敗しました」というメッセージを表示する
2. IF 地図タイルの読み込みに失敗する, THEN THE MapDisplay SHALL 代替タイルサーバーへの切り替えを試みる
3. IF 座標データが不正である（緯度が-90〜90の範囲外、または経度が-180〜180の範囲外）, THEN THE MapDisplay SHALL そのBusStopMarkerをスキップする
4. IF LeafletLibraryの読み込みに失敗する, THEN THE MapDisplay SHALL 「地図ライブラリの読み込みに失敗しました」というメッセージを表示する
5. THE MapDisplay SHALL 全てのエラーをコンソールにログ出力する
