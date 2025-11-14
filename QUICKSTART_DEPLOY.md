# Cloudflare Pages デプロイ - クイックスタート

このガイドでは、最短でCloudflare Pagesにデプロイする手順を説明します。

## 📋 前提条件の確認

- [x] GitHubリポジトリが作成されている
- [x] mainブランチに全てのコードがpush済み
- [ ] Cloudflareアカウントを持っている（無料で作成可能）
- [ ] カスタムドメイン `saga-bus.midnight480.com` の準備ができている

## 🚀 5分でデプロイ

### ステップ1: Cloudflareにログイン

1. https://dash.cloudflare.com/ にアクセス
2. アカウントがない場合は無料で作成

### ステップ2: Pagesプロジェクトを作成

1. 左サイドバー「Workers & Pages」をクリック
2. 「Create application」ボタンをクリック
3. 「Pages」タブを選択
4. 「Connect to Git」をクリック

### ステップ3: GitHubと連携

1. 「GitHub」を選択
2. GitHubアカウントで認証
3. リポジトリ一覧から本プロジェクトを選択
4. 「Begin setup」をクリック

### ステップ4: ビルド設定（重要）

以下の通り設定してください：

```
Project name: saga-bus-navigator
Production branch: main
Framework preset: None
Build command: （空欄のまま）
Build output directory: /
```

**注意**: Build commandは空欄、Build output directoryは `/` です。

### ステップ5: デプロイ実行

1. 「Save and Deploy」をクリック
2. 1-2分待つ
3. デプロイ完了！

デプロイが完了すると、`https://saga-bus-navigator.pages.dev` のようなURLが発行されます。

### ステップ6: カスタムドメイン設定（オプション）

1. プロジェクトの「Custom domains」タブを開く
2. 「Set up a custom domain」をクリック
3. `saga-bus.midnight480.com` を入力
4. 「Continue」をクリック
5. DNS設定の指示に従う

**Cloudflareでドメイン管理している場合**: 自動的にDNSレコードが追加されます

**外部DNSの場合**: 以下のCNAMEレコードを追加
```
saga-bus.midnight480.com → <your-project>.pages.dev
```

DNS伝播には最大24時間かかる場合がありますが、通常は数分で完了します。

## ✅ デプロイ確認

デプロイ完了後、以下を確認してください：

1. **アクセス確認**
   - ブラウザで発行されたURLにアクセス
   - ページが表示されることを確認

2. **機能確認**
   - バス停検索が動作するか
   - 検索結果が表示されるか
   - レスポンシブデザインが機能するか

3. **パフォーマンス確認**
   - データ読み込みが3秒以内か
   - 検索が2秒以内に完了するか

## 🔄 自動デプロイの仕組み

mainブランチにpushすると、自動的に以下が実行されます：

1. Cloudflareがコミットを検知
2. 自動的にデプロイを開始
3. 1-2分でデプロイ完了
4. 本番環境に反映

## 🐛 トラブルシューティング

### デプロイが失敗する

**原因**: ビルド設定が間違っている

**解決策**:
1. プロジェクト設定を開く
2. 「Build & deployments」タブを選択
3. Build commandが空欄、Build output directoryが `/` であることを確認

### ページが表示されない

**原因**: index.htmlがルートディレクトリにない

**解決策**:
1. GitHubリポジトリを確認
2. index.htmlがルートディレクトリにあることを確認
3. 再度デプロイ

### データが読み込めない

**原因**: CSVファイルのパスが間違っている

**解決策**:
1. ブラウザの開発者ツールを開く
2. Networkタブでエラーを確認
3. CSVファイルが正しくデプロイされているか確認

### カスタムドメインが機能しない

**原因**: DNS設定が完了していない

**解決策**:
1. DNS設定を確認
2. 伝播を待つ（最大24時間）
3. `nslookup saga-bus.midnight480.com` で確認

## 📞 サポート

問題が解決しない場合：

1. [Cloudflare Community](https://community.cloudflare.com/)で質問
2. [Cloudflare サポート](https://support.cloudflare.com/)に問い合わせ
3. GitHubのissueを作成

## 🎉 完了！

デプロイが完了したら、以下のドキュメントも確認してください：

- [DEPLOYMENT.md](DEPLOYMENT.md) - 詳細なデプロイ手順
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - デプロイ前チェックリスト
- [README.md](README.md) - プロジェクト概要

---

**次のステップ**: 本番環境で動作確認を行い、問題がなければ運用開始です！
