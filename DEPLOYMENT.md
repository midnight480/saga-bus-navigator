# Cloudflare Pages デプロイ手順

## 前提条件

- GitHubリポジトリが作成されていること
- Cloudflareアカウントが作成されていること
- カスタムドメイン `saga-bus.midnight480.com` の準備ができていること

## デプロイ手順

### 1. Cloudflare Pagesプロジェクトの作成

1. Cloudflareダッシュボードにログイン: https://dash.cloudflare.com/
2. 左サイドバーから「Workers & Pages」を選択
3. 「Create application」ボタンをクリック
4. 「Pages」タブを選択
5. 「Connect to Git」をクリック

### 2. GitHubリポジトリとの連携

1. 「GitHub」を選択
2. GitHubアカウントの認証を行う
3. リポジトリ一覧から本プロジェクトのリポジトリを選択
4. 「Begin setup」をクリック

### 3. ビルド設定

以下の設定を入力：

- **Project name**: `saga-bus-navigator`（任意の名前）
- **Production branch**: `main`
- **Framework preset**: `None`
- **Build command**: （空欄のまま）
- **Build output directory**: `/`（ルートディレクトリ）

### 4. 環境変数

このプロジェクトでは環境変数は不要です。

### 5. デプロイの実行

1. 「Save and Deploy」をクリック
2. 初回デプロイが自動的に開始されます
3. デプロイ完了まで1-2分待ちます

### 6. カスタムドメインの設定

1. デプロイ完了後、プロジェクトの「Custom domains」タブを開く
2. 「Set up a custom domain」をクリック
3. ドメイン名 `saga-bus.midnight480.com` を入力
4. 「Continue」をクリック
5. DNS設定の指示に従う：
   - Cloudflareで管理している場合：自動的にDNSレコードが追加されます
   - 外部DNSの場合：CNAMEレコードを追加
     ```
     saga-bus.midnight480.com CNAME <your-project>.pages.dev
     ```
6. DNS伝播を待つ（最大24時間、通常は数分）

### 7. 自動デプロイの確認

- mainブランチへのpushで自動的にデプロイされることを確認
- プロジェクトの「Deployments」タブで履歴を確認可能

### 8. 本番環境での動作確認

デプロイ完了後、以下の項目を確認：

#### 基本動作確認
- [ ] `https://saga-bus.midnight480.com` にアクセスできる
- [ ] HTTPSが有効になっている
- [ ] ページが正しく表示される
- [ ] データ読み込みが完了する（3秒以内）

#### 検索機能確認
- [ ] バス停のインクリメンタルサーチが動作する
- [ ] 検索が実行できる
- [ ] 検索結果が表示される
- [ ] 運賃情報が表示される

#### レスポンシブ確認
- [ ] スマートフォンで正しく表示される
- [ ] タブレットで正しく表示される
- [ ] デスクトップで正しく表示される

#### パフォーマンス確認
- [ ] データ読み込みが3秒以内に完了
- [ ] 検索実行が2秒以内に完了
- [ ] ページ読み込みが高速（Cloudflare CDN効果）

#### セキュリティ確認
- [ ] HTTPSで接続される
- [ ] セキュリティヘッダーが設定されている（_headersファイル）
- [ ] XSS対策が機能している

## トラブルシューティング

### デプロイが失敗する場合

1. ビルド設定を確認
   - Build commandが空欄であることを確認
   - Build output directoryが `/` であることを確認

2. ファイル構成を確認
   - index.htmlがルートディレクトリにあることを確認
   - 必要なファイルがすべてコミットされていることを確認

### カスタムドメインが機能しない場合

1. DNS設定を確認
   - CNAMEレコードが正しく設定されているか確認
   - DNS伝播を待つ（最大24時間）

2. Cloudflareダッシュボードで確認
   - 「Custom domains」タブでステータスを確認
   - エラーメッセージがある場合は指示に従う

### データが読み込めない場合

1. ブラウザの開発者ツールでネットワークタブを確認
2. CSVファイルへのパスが正しいか確認
3. CORSエラーが出ていないか確認（同一オリジンなので通常は問題なし）

## デプロイ後の運用

### 更新手順

1. developブランチで開発
2. テスト完了後、mainブランチにマージ
3. 自動的にデプロイが実行される
4. デプロイ完了を確認

### ロールバック

問題が発生した場合：

1. Cloudflareダッシュボードの「Deployments」タブを開く
2. 以前の正常なデプロイを選択
3. 「Rollback to this deployment」をクリック

### モニタリング

- Cloudflare Analyticsでアクセス状況を確認
- エラーログを定期的にチェック
- パフォーマンスメトリクスを監視

## 参考リンク

- [Cloudflare Pages ドキュメント](https://developers.cloudflare.com/pages/)
- [カスタムドメイン設定](https://developers.cloudflare.com/pages/platform/custom-domains/)
- [デプロイ設定](https://developers.cloudflare.com/pages/platform/build-configuration/)
