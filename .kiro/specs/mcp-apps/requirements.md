# 要件定義書

## はじめに

本ドキュメントは、佐賀バスナビゲーターをMCP Apps（Model Context Protocol Applications）として提供するための要件を定義します。

## 用語集

- **MCP_Apps**: Model Context Protocol Applicationsの略。Webアプリケーションとして動作するMCPサーバー
- **MCP_Server**: Model Context Protocol Serverの略。AIアシスタントが利用できるツールを提供するサーバー
- **Tool**: MCPサーバーが提供する機能単位。AIアシスタントから呼び出し可能
- **Cloudflare_Pages_Functions**: Cloudflare Pagesでサーバーサイド処理を実行する機能
- **GTFS**: General Transit Feed Specificationの略。公共交通機関の時刻表データの標準形式
- **CORS**: Cross-Origin Resource Sharingの略。異なるオリジンからのリソースアクセスを制御する仕組み
- **REST_API**: Representational State Transfer APIの略。HTTPプロトコルを使用したAPI
- **Claude**: Anthropic社が開発したAIアシスタント
- **SSE**: Server-Sent Eventsの略。サーバーからクライアントへの一方向リアルタイム通信

## 要件

### 要件1: MCP Appsエンドポイントの提供

**ユーザーストーリー:** AIアシスタント開発者として、佐賀バスナビゲーターの機能をMCP Apps経由で利用したい。そうすることで、Claude等のAIアシスタントから佐賀市のバス情報を検索できるようになる。

#### 受入基準

1. WHEN AIアシスタントがMCP Appsエンドポイントに接続する THEN システムはMCPプロトコルに準拠したレスポンスを返す
2. WHEN AIアシスタントがツールリストを要求する THEN システムは利用可能なツール一覧を返す
3. WHEN AIアシスタントがツールを実行する THEN システムは適切な結果を返す
4. THE MCP_Apps_Endpoint SHALL HTTPSプロトコルで公開される
5. THE MCP_Apps_Endpoint SHALL Cloudflare Pagesでホスティングされる

### 要件2: バス停検索ツールの提供

**ユーザーストーリー:** AIアシスタントユーザーとして、自然言語でバス停を検索したい。そうすることで、バス停名を正確に覚えていなくても目的のバス停を見つけられる。

#### 受入基準

1. WHEN AIアシスタントがバス停名の一部を指定する THEN システムは部分一致するバス停のリストを返す
2. WHEN 検索結果が複数ある THEN システムは最大10件のバス停情報を返す
3. WHEN バス停情報を返す THEN システムはバス停ID、名前、緯度、経度を含める
4. THE Search_Bus_Stops_Tool SHALL 検索クエリをパラメータとして受け取る
5. THE Search_Bus_Stops_Tool SHALL 既存のREST APIを内部で利用する

### 要件3: 路線検索ツールの提供

**ユーザーストーリー:** AIアシスタントユーザーとして、出発地と目的地を指定してバス路線を検索したい。そうすることで、どのバスに乗れば目的地に到着できるかを知ることができる。

#### 受入基準

1. WHEN AIアシスタントが乗車バス停IDと降車バス停IDを指定する THEN システムは該当する路線情報を返す
2. WHEN 路線情報を返す THEN システムは路線ID、路線名、出発時刻、到着時刻、所要時間、運賃を含める
3. WHEN 該当する路線が存在しない THEN システムは空のリストを返す
4. THE Search_Routes_Tool SHALL 乗車バス停ID、降車バス停ID、検索時刻をパラメータとして受け取る
5. THE Search_Routes_Tool SHALL 既存のREST APIを内部で利用する

### 要件4: 始発・終バス検索ツールの提供

**ユーザーストーリー:** AIアシスタントユーザーとして、特定の路線の始発と終バスの時刻を知りたい。そうすることで、早朝や深夜の移動計画を立てられる。

#### 受入基準

1. WHEN AIアシスタントが路線IDを指定する THEN システムは始発と終バスの時刻を返す
2. WHEN 始発・終バス情報を返す THEN システムは便ID、出発時刻、到着時刻を含める
3. WHEN 指定された路線が存在しない THEN システムはエラーメッセージを返す
4. THE Get_First_Last_Bus_Tool SHALL 路線IDをパラメータとして受け取る
5. THE Get_First_Last_Bus_Tool SHALL 既存のREST APIを内部で利用する

### 要件5: CORS対応

**ユーザーストーリー:** AIアシスタント開発者として、異なるオリジンからMCP Appsエンドポイントにアクセスしたい。そうすることで、Claude等のWebベースのAIアシスタントから利用できる。

#### 受入基準

1. WHEN ブラウザがプリフライトリクエスト（OPTIONS）を送信する THEN システムは適切なCORSヘッダーを返す
2. WHEN システムがレスポンスを返す THEN Access-Control-Allow-Originヘッダーを含める
3. WHEN システムがレスポンスを返す THEN Access-Control-Allow-Methodsヘッダーを含める
4. THE CORS_Configuration SHALL 信頼できるオリジンのみを許可する
5. THE CORS_Configuration SHALL プリフライトリクエストのキャッシュを設定する

### 要件6: エラーハンドリング

**ユーザーストーリー:** AIアシスタントユーザーとして、エラーが発生した場合に分かりやすいメッセージを受け取りたい。そうすることで、問題を理解し、適切に対処できる。

#### 受入基準

1. WHEN 無効なパラメータが指定される THEN システムは400エラーと詳細なエラーメッセージを返す
2. WHEN 内部エラーが発生する THEN システムは500エラーとエラーメッセージを返す
3. WHEN REST APIへのアクセスが失敗する THEN システムは502エラーとエラーメッセージを返す
4. THE Error_Response SHALL エラーコード、エラーメッセージ、エラー詳細を含める
5. THE Error_Handler SHALL エラーをログに記録する

### 要件7: レート制限

**ユーザーストーリー:** システム管理者として、過度なリクエストからシステムを保護したい。そうすることで、全てのユーザーに安定したサービスを提供できる。

#### 受入基準

1. WHEN 同一IPアドレスから短時間に多数のリクエストが送信される THEN システムはリクエストを制限する
2. WHEN レート制限を超える THEN システムは429エラーを返す
3. WHEN レート制限エラーを返す THEN Retry-Afterヘッダーを含める
4. THE Rate_Limiter SHALL IPアドレス単位でリクエスト数を追跡する
5. THE Rate_Limiter SHALL 1分間に60リクエストまで許可する

### 要件8: MCP Serverメタデータの提供

**ユーザーストーリー:** AIアシスタント開発者として、MCP Serverの情報を取得したい。そうすることで、サーバーの機能や利用方法を理解できる。

#### 受入基準

1. WHEN AIアシスタントがサーバー情報を要求する THEN システムはサーバー名、バージョン、説明を返す
2. WHEN AIアシスタントがツール情報を要求する THEN システムは各ツールの名前、説明、パラメータスキーマを返す
3. THE Server_Metadata SHALL MCPプロトコルバージョンを含める
4. THE Server_Metadata SHALL サポートする機能のリストを含める
5. THE Server_Metadata SHALL 日本語と英語の説明を含める

### 要件9: セキュリティ

**ユーザーストーリー:** システム管理者として、セキュアなMCP Appsエンドポイントを提供したい。そうすることで、悪意のある攻撃からシステムを保護できる。

#### 受入基準

1. WHEN リクエストを受信する THEN システムは入力値を検証する
2. WHEN SQLインジェクション攻撃を検出する THEN システムはリクエストを拒否する
3. WHEN XSS攻撃を検出する THEN システムはリクエストを拒否する
4. THE Security_Layer SHALL Content-Security-Policyヘッダーを設定する
5. THE Security_Layer SHALL X-Content-Type-Optionsヘッダーを設定する

### 要件10: パフォーマンス

**ユーザーストーリー:** AIアシスタントユーザーとして、高速なレスポンスを受け取りたい。そうすることで、スムーズな会話体験を得られる。

#### 受入基準

1. WHEN バス停検索を実行する THEN システムは2秒以内にレスポンスを返す
2. WHEN 路線検索を実行する THEN システムは3秒以内にレスポンスを返す
3. WHEN 始発・終バス検索を実行する THEN システムは2秒以内にレスポンスを返す
4. THE MCP_Apps_Endpoint SHALL Cloudflare CDNを活用してレスポンスをキャッシュする
5. THE MCP_Apps_Endpoint SHALL 圧縮されたレスポンスを返す

### 要件11: ログとモニタリング

**ユーザーストーリー:** システム管理者として、MCP Appsの利用状況を監視したい。そうすることで、問題を早期に発見し、サービス品質を維持できる。

#### 受入基準

1. WHEN リクエストを受信する THEN システムはリクエストログを記録する
2. WHEN エラーが発生する THEN システムはエラーログを記録する
3. WHEN ツールが実行される THEN システムは実行ログを記録する
4. THE Logging_System SHALL リクエストID、タイムスタンプ、ツール名、パラメータ、レスポンスステータスを記録する
5. THE Logging_System SHALL 個人情報を記録しない

### 要件12: ドキュメント

**ユーザーストーリー:** AIアシスタント開発者として、MCP Appsの利用方法を理解したい。そうすることで、迅速に統合を進められる。

#### 受入基準

1. THE Documentation SHALL MCP AppsエンドポイントのURLを記載する
2. THE Documentation SHALL 各ツールの説明、パラメータ、レスポンス形式を記載する
3. THE Documentation SHALL 利用例を記載する
4. THE Documentation SHALL エラーコードとその意味を記載する
5. THE Documentation SHALL 日本語と英語で提供される
