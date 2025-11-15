# 要件定義書

## はじめに

本ドキュメントは、佐賀バスナビゲーターアプリケーションのデータローダーを、独自CSV形式からGTFS標準形式に移行するための要件を定義します。

## 用語集

- **GTFS (General Transit Feed Specification)**: 公共交通機関の時刻表と地理情報を記述するための標準データ形式
- **DataLoader**: アプリケーションのデータ読み込みを担当するJavaScriptクラス
- **ZIP Archive**: GTFS形式のデータファイルを含む圧縮アーカイブファイル
- **Browser Environment**: Webブラウザ上で動作するJavaScript実行環境
- **JSZip Library**: ブラウザ環境でZIPファイルを扱うためのJavaScriptライブラリ
- **stops.txt**: GTFSフォーマットにおけるバス停情報を格納するファイル（stop_id, stop_name, stop_lat, stop_lonなどを含む）
- **stop_times.txt**: GTFSフォーマットにおける各便の停車時刻情報を格納するファイル（trip_id, arrival_time, departure_time, stop_id, stop_sequenceなどを含む）
- **routes.txt**: GTFSフォーマットにおける路線情報を格納するファイル（route_id, route_long_name, agency_idなどを含む）
- **trips.txt**: GTFSフォーマットにおける便（運行）情報を格納するファイル（route_id, service_id, trip_id, trip_headsignなどを含む）
- **calendar.txt**: GTFSフォーマットにおける運行カレンダー情報を格納するファイル（service_id, 曜日フラグなどを含む）
- **agency.txt**: GTFSフォーマットにおける事業者情報を格納するファイル（agency_id, agency_nameなどを含む）
- **fare_attributes.txt**: GTFSフォーマットにおける運賃情報を格納するファイル

## 要件

### 要件1: GTFS ZIPファイルの読み込み

**ユーザーストーリー:** アプリケーション管理者として、公式のGTFS ZIPファイル（saga-*.zip形式）を./dataディレクトリに配置するだけでデータを更新できるようにしたい。これにより、ダイヤ改正時のデータメンテナンスが容易になる。

#### 受入基準

1. WHEN アプリケーションが起動する, THE DataLoader SHALL ./dataディレクトリ内のsaga-*.zipパターンに一致するファイルを検索する
2. WHEN 複数のsaga-*.zipファイルが存在する, THE DataLoader SHALL saga-current.zipを優先的に選択する
3. WHEN saga-current.zipが存在しない, THE DataLoader SHALL 最新の日付を持つsaga-YYYY-MM-DD.zipファイルを選択する
4. WHEN GTFS ZIPファイルが検出される, THE DataLoader SHALL JSZipライブラリを使用してZIPファイルを解凍する
5. WHEN ZIPファイルの解凍が完了する, THE DataLoader SHALL 解凍されたGTFSファイル（stops.txt, stop_times.txt, routes.txt, trips.txt, calendar.txt, agency.txt）を読み込む
6. IF saga-*.zipファイルが存在しない, THEN THE DataLoader SHALL エラーメッセージ「GTFSデータファイル(saga-*.zip)が見つかりません」を表示する
7. IF ZIPファイルの解凍に失敗する, THEN THE DataLoader SHALL エラーメッセージ「GTFSデータの解凍に失敗しました」を表示する

### 要件2: GTFSデータの変換とキャッシュ

**ユーザーストーリー:** 開発者として、GTFS形式のデータを既存のアプリケーションロジックで使用できる形式に変換し、パフォーマンスのためにメモリにキャッシュしたい。

#### 受入基準

1. WHEN stops.txtが読み込まれる, THE DataLoader SHALL 各レコードをバス停オブジェクト（id: stop_id, name: stop_name, lat: stop_lat, lng: stop_lon）に変換する
2. WHEN stop_times.txt、trips.txt、routes.txt、calendar.txt、agency.txtが読み込まれる, THE DataLoader SHALL これらを結合して時刻表オブジェクト（routeNumber: route_id, tripId: trip_id, stopSequence: stop_sequence, stopName: stop_name, hour: arrival_timeの時, minute: arrival_timeの分, weekdayType: service_idから判定, routeName: route_long_name, operator: agency_name）に変換する
3. WHEN fare_attributes.txtが読み込まれる, THE DataLoader SHALL 各レコードを運賃オブジェクトに変換する
4. THE DataLoader SHALL 変換されたデータをメモリにキャッシュする
5. WHEN データが既にキャッシュされている, THE DataLoader SHALL ネットワークアクセスなしでキャッシュからデータを返す

### 要件3: 既存APIとの互換性維持

**ユーザーストーリー:** 開発者として、既存のアプリケーションコードを変更せずにGTFS形式に移行したい。これにより、移行リスクを最小限に抑える。

#### 受入基準

1. THE DataLoader SHALL loadAllData()メソッドを提供し、{busStops, timetable, fares}オブジェクトを返す
2. THE DataLoader SHALL loadBusStops()メソッドを提供し、バス停配列を返す
3. THE DataLoader SHALL loadTimetable()メソッドを提供し、時刻表配列を返す
4. THE DataLoader SHALL loadFares()メソッドを提供し、運賃配列を返す
5. THE DataLoader SHALL clearCache()メソッドを提供し、キャッシュをクリアする

### 要件4: エラーハンドリングとタイムアウト

**ユーザーストーリー:** エンドユーザーとして、データ読み込みが失敗した場合やタイムアウトした場合に、明確なエラーメッセージを受け取りたい。

#### 受入基準

1. WHEN データ読み込みが3秒以内に完了しない, THE DataLoader SHALL タイムアウトエラーを発生させる
2. WHEN タイムアウトが発生する, THE DataLoader SHALL エラーメッセージ「データの読み込みがタイムアウトしました」を表示する
3. WHEN ネットワークエラーが発生する, THE DataLoader SHALL エラーメッセージ「ネットワークエラーが発生しました」を表示する
4. WHEN GTFSファイルの形式が不正である, THE DataLoader SHALL エラーメッセージ「GTFSデータの形式が不正です」を表示する
5. THE DataLoader SHALL 全てのエラーをコンソールにログ出力する

### 要件5: GTFSファイルの自動選択とバージョン管理

**ユーザーストーリー:** アプリケーション管理者として、複数のGTFSファイル（現在データ、未来データ、アーカイブデータ）を配置し、アプリケーションが自動的に適切なファイルを選択できるようにしたい。

#### 受入基準

1. THE DataLoader SHALL ./dataディレクトリ内のsaga-*.zipファイルを検索する
2. WHEN saga-current.zipが存在する, THE DataLoader SHALL saga-current.zipを優先的に読み込む
3. WHEN saga-current.zipが存在しない, THE DataLoader SHALL saga-YYYY-MM-DD.zipファイルの中から最新の日付を持つファイルを選択する
4. THE DataLoader SHALL ファイル名から日付（YYYY-MM-DD）を抽出し、降順でソートする
5. THE DataLoader SHALL 読み込んだZIPファイル名、サイズ、選択理由をコンソールにログ出力する
6. THE DataLoader SHALL ZIPファイル内のfeed_info.txtから公開日情報を読み取る
7. THE DataLoader SHALL 読み込んだGTFSデータのバージョン情報（ファイル名、公開日）をコンソールにログ出力する

### 要件6: パフォーマンス最適化

**ユーザーストーリー:** エンドユーザーとして、アプリケーションの初回起動時でも3秒以内にデータが読み込まれることを期待する。

#### 受入基準

1. THE DataLoader SHALL stops.txt、stop_times.txt、routes.txt、trips.txt、calendar.txt、agency.txtを並列で読み込む
2. WHEN ZIPファイルサイズが35MB以下である, THE DataLoader SHALL 5秒以内にデータ読み込みを完了する
3. THE DataLoader SHALL 不要なデータフィールド（shapes.txt、translations.txtなど）をメモリから除外する
4. THE DataLoader SHALL データ変換処理を最適化し、CPU使用率を最小限に抑える
5. WHEN データがキャッシュされている, THE DataLoader SHALL 100ミリ秒以内にデータを返す

### 要件7: 開発者向けデバッグ機能

**ユーザーストーリー:** 開発者として、データ読み込みプロセスをデバッグするための詳細なログ情報を取得したい。

#### 受入基準

1. WHERE デバッグモードが有効である, THE DataLoader SHALL 各GTFSファイルの読み込み時間をコンソールに出力する
2. WHERE デバッグモードが有効である, THE DataLoader SHALL 読み込まれたレコード数をコンソールに出力する
3. WHERE デバッグモードが有効である, THE DataLoader SHALL データ変換の進捗状況をコンソールに出力する
4. THE DataLoader SHALL デバッグモードを有効/無効にするメソッドを提供する
5. WHERE デバッグモードが無効である, THE DataLoader SHALL エラーログのみをコンソールに出力する
