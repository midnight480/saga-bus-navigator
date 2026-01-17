# Requirements Document

## Introduction

佐賀バスナビゲーターアプリをCloudflare Pages/FunctionsからAWS無料枠内のリソースに移行する。静的ホスティング、API Functions、CI/CDパイプラインを含む完全な移行を実現する。

## Glossary

- **ACM**: AWS Certificate Manager、SSL/TLS証明書を管理するサービス
- **Static_Hosting**: HTML/CSS/JS/データファイルを配信する静的ウェブホスティング機能
- **API_Gateway**: HTTPリクエストを受け付けてLambda関数にルーティングするサービス
- **Lambda_Function**: サーバーレスでコードを実行するAWSサービス
- **CloudFront**: AWSのCDNサービス、エッジキャッシュとHTTPS終端を提供
- **S3_Bucket**: オブジェクトストレージサービス、静的ファイルの保存に使用
- **CI_CD_Pipeline**: コードの変更を自動的にビルド・テスト・デプロイするパイプライン
- **GitHub_Actions**: GitHubが提供するCI/CDサービス
- **SAM**: AWS Serverless Application Model、サーバーレスアプリケーションのIaCフレームワーク
- **Proxy_Function**: 外部APIへのリクエストを中継しCORSヘッダーを付与する関数

## Requirements

### Requirement 1: 静的ファイルホスティング

**User Story:** As a ユーザー, I want アプリケーションにアクセスできる, so that バス情報を確認できる

#### Acceptance Criteria

1. THE Static_Hosting SHALL S3バケットに静的ファイル（HTML/CSS/JS/データ）を保存する
2. THE CloudFront SHALL S3バケットのコンテンツをHTTPSで配信する
3. THE CloudFront SHALL カスタムドメイン（saga-bus-aws.midnight480.com）でアクセス可能にする
4. WHEN ユーザーがアプリにアクセスした時 THEN THE CloudFront SHALL gzip圧縮されたコンテンツを配信する
5. THE S3_Bucket SHALL パブリックアクセスをブロックし、CloudFrontからのみアクセス可能にする

### Requirement 2: プロキシAPI Functions

**User Story:** As a アプリケーション, I want 佐賀バスオープンデータAPIにアクセスできる, so that リアルタイム情報を表示できる

#### Acceptance Criteria

1. THE Lambda_Function SHALL vehicle.pb（車両位置情報）をプロキシする
2. THE Lambda_Function SHALL route.pb（ルート情報）をプロキシする
3. THE Lambda_Function SHALL alert.pb（運行情報）をプロキシする
4. WHEN プロキシリクエストを受信した時 THEN THE Lambda_Function SHALL CORSヘッダーを付与してレスポンスを返す
5. THE CloudFront SHALL プロキシAPIレスポンスを30秒間キャッシュする
6. IF アップストリームAPIがエラーを返した場合 THEN THE Lambda_Function SHALL 502エラーとエラーメッセージを返す

### Requirement 3: 翻訳API Function

**User Story:** As a アプリケーション, I want 日本語テキストを英語に翻訳できる, so that 多言語対応できる

#### Acceptance Criteria

1. THE Lambda_Function SHALL Amazon Translateを使用して翻訳を実行する
2. WHEN POSTリクエストでテキストを受信した時 THEN THE Lambda_Function SHALL 翻訳結果をJSONで返す
3. IF 空白のみのテキストを受信した場合 THEN THE Lambda_Function SHALL 翻訳せずにそのまま返す
4. IF 同じ言語への翻訳リクエストの場合 THEN THE Lambda_Function SHALL 翻訳せずにそのまま返す
5. THE Lambda_Function SHALL AWS認証情報を環境変数から取得する

### Requirement 4: API Gateway設定

**User Story:** As a 開発者, I want 統一されたAPIエンドポイントを提供したい, so that フロントエンドからアクセスしやすい

#### Acceptance Criteria

1. THE API_Gateway SHALL /api/vehicle エンドポイントを提供する
2. THE API_Gateway SHALL /api/route エンドポイントを提供する
3. THE API_Gateway SHALL /api/alert エンドポイントを提供する
4. THE API_Gateway SHALL /api/translate エンドポイントを提供する
5. THE API_Gateway SHALL OPTIONSリクエストに対してCORSプリフライトレスポンスを返す
6. THE CloudFront SHALL API Gatewayへのリクエストを /api/* パスでルーティングする

### Requirement 5: CI/CDパイプライン

**User Story:** As a 開発者, I want コードをプッシュしたら自動デプロイされる, so that 手動デプロイの手間を省ける

#### Acceptance Criteria

1. WHEN mainブランチにプッシュされた時 THEN THE CI_CD_Pipeline SHALL 自動的にデプロイを開始する
2. THE CI_CD_Pipeline SHALL 静的ファイルをS3にアップロードする
3. THE CI_CD_Pipeline SHALL Lambda関数をデプロイする
4. THE CI_CD_Pipeline SHALL CloudFrontキャッシュを無効化する
5. THE CI_CD_Pipeline SHALL デプロイ前にテストを実行する
6. IF テストが失敗した場合 THEN THE CI_CD_Pipeline SHALL デプロイを中止する
7. THE CI_CD_Pipeline SHALL AWS認証情報をGitHub Secretsから取得する

### Requirement 6: Infrastructure as Code

**User Story:** As a 開発者, I want インフラをコードで管理したい, so that 再現可能なデプロイができる

#### Acceptance Criteria

1. THE SAM SHALL すべてのAWSリソースをテンプレートで定義する
2. THE SAM SHALL S3バケット、CloudFront、Lambda、API Gatewayを作成する
3. THE SAM SHALL 環境変数とシークレットを設定する
4. THE SAM SHALL IAMロールと権限を最小権限で設定する
5. WHEN SAMテンプレートを変更した時 THEN THE CI_CD_Pipeline SHALL インフラの変更もデプロイする

### Requirement 7: 無料枠内での運用

**User Story:** As a 運用者, I want AWS無料枠内で運用したい, so that コストを抑えられる

#### Acceptance Criteria

1. THE Lambda_Function SHALL 128MBメモリで動作する（無料枠最適化）
2. THE CloudFront SHALL 1TB/月の転送量内で運用する
3. THE S3_Bucket SHALL 5GB以内のストレージを使用する
4. THE API_Gateway SHALL HTTP API（REST APIより安価）を使用する
5. THE Lambda_Function SHALL Node.js 20.xランタイムを使用する

### Requirement 8: SSL/TLS証明書

**User Story:** As a ユーザー, I want HTTPSでアクセスしたい, so that 安全に通信できる

#### Acceptance Criteria

1. THE ACM SHALL *.midnight480.comのワイルドカード証明書を発行する
2. THE ACM SHALL us-east-1リージョンに証明書を作成する（CloudFront要件）
3. THE ACM SHALL DNS検証で証明書を検証する
4. THE CloudFront SHALL ACM証明書を使用してHTTPS通信を提供する

### Requirement 9: セキュリティ

**User Story:** As a 運用者, I want セキュアな構成にしたい, so that 不正アクセスを防げる

#### Acceptance Criteria

1. THE S3_Bucket SHALL パブリックアクセスを完全にブロックする
2. THE CloudFront SHALL Origin Access Control (OAC)を使用してS3にアクセスする
3. THE Lambda_Function SHALL 最小権限のIAMロールで実行する
4. THE API_Gateway SHALL レート制限を設定する
5. THE CI_CD_Pipeline SHALL AWS認証情報をシークレットとして管理する
