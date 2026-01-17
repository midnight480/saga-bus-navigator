# Implementation Plan: AWS Migration

## Overview

Cloudflare Pages/FunctionsからAWS（S3+CloudFront+Lambda+API Gateway）への移行を実装する。SAMテンプレートでインフラを定義し、GitHub Actionsで自動デプロイを構築する。

## Tasks

- [ ] 1. プロジェクト構造とSAMテンプレートの基盤作成
  - [ ] 1.1 AWS SAMプロジェクト構造を作成
    - `aws/` ディレクトリを作成
    - `aws/template.yaml` SAMテンプレートファイルを作成
    - `aws/samconfig.toml` SAM設定ファイルを作成
    - _Requirements: 6.1_

  - [ ] 1.2 ACM証明書をSAMテンプレートに定義
    - AWS::CertificateManager::Certificate リソース
    - *.midnight480.com ワイルドカード証明書
    - us-east-1リージョンに作成（CloudFront要件）
    - DNS検証方式を使用
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 1.3 S3バケットとCloudFront OACをSAMテンプレートに定義
    - S3バケット（パブリックアクセスブロック有効）
    - Origin Access Control (OAC)
    - S3バケットポリシー（CloudFrontからのみアクセス許可）
    - _Requirements: 1.1, 1.5, 9.1, 9.2_

  - [ ] 1.4 CloudFront Distributionを定義
    - S3オリジン（OAC使用）
    - API Gatewayオリジン
    - デフォルトビヘイビア（S3）
    - /api/* ビヘイビア（API Gateway）
    - gzip圧縮有効化
    - ViewerCertificateにACM証明書ARNを設定
    - Aliasesにsaga-bus-aws.midnight480.comを設定
    - _Requirements: 1.2, 1.3, 1.4, 4.6, 8.4_

  - [ ] 1.5 SAMテンプレートのOutputsを定義
    - CloudFrontディストリビューションドメイン名（DNS設定用）
    - CloudFrontディストリビューションID（キャッシュ無効化用）
    - ACM証明書のDNS検証レコード情報
    - API GatewayエンドポイントURL
    - _Requirements: 6.1_

- [ ] 2. Lambda関数の実装
  - [ ] 2.1 共通ユーティリティモジュールを作成
    - `aws/src/utils/cors.ts` CORSヘッダー生成
    - `aws/src/utils/response.ts` レスポンスヘルパー
    - _Requirements: 2.4_

  - [ ] 2.2 CORSヘッダー付与のプロパティテストを作成
    - **Property 1: CORSヘッダー付与**
    - **Validates: Requirements 2.4**

  - [ ] 2.3 プロキシLambda関数を実装（vehicle, route, alert）
    - `aws/src/handlers/vehicle.ts`
    - `aws/src/handlers/route.ts`
    - `aws/src/handlers/alert.ts`
    - Cloudflare Workers形式からLambda形式に変換
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [ ] 2.4 プロキシ関数の単体テストを作成
    - 正常系テスト
    - エラーハンドリングテスト
    - _Requirements: 2.6_

  - [ ] 2.5 翻訳Lambda関数を実装
    - `aws/src/handlers/translate.ts`
    - Cloudflare Workers形式からLambda形式に変換
    - IAMロールでtranslate:TranslateText権限を付与
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 2.6 翻訳レスポンス形式のプロパティテストを作成
    - **Property 3: 翻訳レスポンス形式**
    - **Validates: Requirements 3.2**

- [ ] 3. API Gateway設定
  - [ ] 3.1 HTTP APIをSAMテンプレートに定義
    - AWS::Serverless::HttpApi リソース
    - CORS設定
    - ルート定義（/api/vehicle, /api/route, /api/alert, /api/translate）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 3.2 OPTIONSプリフライトのプロパティテストを作成
    - **Property 2: OPTIONSプリフライト応答**
    - **Validates: Requirements 4.5**

  - [ ] 3.3 Lambda関数をSAMテンプレートに定義
    - 各関数のリソース定義
    - 環境変数設定
    - IAMロール設定（最小権限）
    - API Gatewayイベントトリガー
    - _Requirements: 7.1, 7.5, 8.3_

- [ ] 4. Checkpoint - SAMテンプレート検証
  - `sam validate --lint` でテンプレート検証
  - `sam build` でビルド確認
  - 問題があればユーザーに確認

- [ ] 5. SAMローカルテスト環境構築
  - [ ] 5.1 ローカルテスト用イベントファイルを作成
    - `aws/events/vehicle-get.json` GETリクエストイベント
    - `aws/events/vehicle-options.json` OPTIONSリクエストイベント
    - `aws/events/translate-post.json` POSTリクエストイベント
    - _Requirements: 2.1, 2.2, 2.3, 3.2_

  - [ ] 5.2 SAM local invokeでLambda関数をテスト
    - `sam local invoke VehicleFunction --event events/vehicle-get.json`
    - `sam local invoke TranslateFunction --event events/translate-post.json`
    - Docker経由でLambdaランタイムをエミュレート
    - _Requirements: 2.1, 2.2, 2.3, 3.1_

  - [ ] 5.3 SAM local start-apiでAPIをローカル起動
    - `sam local start-api --port 3000`
    - http://localhost:3000/api/vehicle でテスト
    - http://localhost:3000/api/translate でテスト
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 5.4 ローカルテスト用npm scriptsを追加
    - `package.json` に `sam:build`, `sam:local`, `sam:invoke` スクリプト追加
    - _Requirements: 6.1_

- [ ] 6. CI/CDパイプライン構築
  - [ ] 6.1 GitHub Actionsワークフローを作成
    - `.github/workflows/deploy.yml`
    - テストジョブ（test）
    - デプロイジョブ（deploy）
    - mainブランチへのプッシュでトリガー
    - _Requirements: 5.1, 5.5, 5.6_

  - [ ] 6.2 デプロイステップを実装
    - AWS認証情報設定（GitHub Secrets使用）
    - SAMビルド・デプロイ
    - S3同期（静的ファイル）
    - CloudFrontキャッシュ無効化
    - _Requirements: 5.2, 5.3, 5.4, 5.7_

  - [ ] 6.3 GitHub Secrets設定ドキュメントを作成
    - `docs/AWS_DEPLOYMENT.md`
    - 必要なシークレット一覧
    - IAMユーザー作成手順
    - 初回デプロイ手順
    - _Requirements: 9.5_

- [ ] 7. フロントエンド更新
  - [ ] 7.1 API呼び出しURLを環境変数化
    - `js/config.js` 設定ファイル作成
    - API_BASE_URL を設定可能に
    - _Requirements: 4.6_

  - [ ] 7.2 既存のAPI呼び出しコードを更新
    - 相対パス `/api/*` を使用するよう変更
    - CloudFront経由でルーティングされるため変更最小限
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. 無料枠最適化設定
  - [ ] 8.1 Lambda関数の最適化設定を確認
    - メモリ: 128MB
    - タイムアウト: 10秒（プロキシ）、15秒（翻訳）
    - _Requirements: 7.1_

  - [ ] 8.2 CloudFrontキャッシュ設定を最適化
    - 静的ファイル: 長期キャッシュ
    - API: 30秒キャッシュ
    - _Requirements: 2.5, 7.2_

  - [ ] 8.3 API Gatewayレート制限を設定
    - スロットリング設定
    - _Requirements: 9.4_

- [ ] 9. DNS設定とACM証明書検証
  - [ ] 9.1 ACM証明書のDNS検証レコードを追加
    - SAMデプロイ後、ACM証明書のDNS検証用CNAMEレコードを取得
    - Cloudflare DNSにCNAMEレコードを追加
    - 証明書のステータスが「発行済み」になるまで待機
    - _Requirements: 8.3_

  - [ ] 9.2 CloudFrontカスタムドメインのDNSレコードを追加
    - CloudFrontディストリビューションのドメイン名を取得
    - Cloudflare DNSに saga-bus-aws.midnight480.com → CloudFront のCNAMEレコードを追加
    - Cloudflareのプロキシを無効化（DNS onlyモード）
    - _Requirements: 1.3_

  - [ ] 9.3 DNS設定手順をドキュメント化
    - `docs/AWS_DEPLOYMENT.md` にDNS設定手順を追記
    - ACM証明書検証の手順
    - CloudFrontカスタムドメイン設定の手順
    - Cloudflare DNS管理画面での設定方法（スクリーンショット付き）
    - _Requirements: 8.3_

- [ ] 10. Final Checkpoint - 全テスト実行
  - `npm test` で単体テスト実行
  - `sam validate` でテンプレート検証
  - 問題があればユーザーに確認

## Notes

- すべてのタスクは必須
- SAMテンプレートは `aws/template.yaml` に配置
- Lambda関数のソースは `aws/src/handlers/` に配置
- 既存のCloudflare設定（wrangler.toml, functions/）は残しておく（ロールバック用）
- 初回デプロイは手動で `sam deploy --guided` を実行する必要あり
- **初回デプロイ後の手動設定が必要:**
  1. ACM証明書のDNS検証レコードをCloudflare DNSに追加
  2. 証明書が「発行済み」になるまで待機（数分〜数十分）
  3. CloudFrontドメインへのCNAMEレコードをCloudflare DNSに追加
  4. Cloudflareのプロキシを無効化（オレンジ雲→グレー雲）
