# Cloudflare Pages ビルド設定

## ビルドコマンド設定

Cloudflare Pagesのダッシュボードで以下のビルド設定を行ってください。

### Build command（ビルドコマンド）

```bash
cd functions && npm ci --omit=dev && cd ..
```

### Build output directory（ビルド出力ディレクトリ）

```
.
```

### Root directory（ルートディレクトリ）

```
/
```

## 環境変数

必要に応じて以下の環境変数を設定してください：

- `NODE_VERSION`: `22` （推奨）
- `NPM_VERSION`: `10` （推奨）

## 設定手順

1. Cloudflare Dashboardにログイン
2. Pages > saga-bus-navigator > Settings > Builds & deployments
3. "Build configuration" セクションで上記の設定を入力
4. "Save" をクリック

## 注意事項

- `wrangler.toml`では`build`セクションはサポートされていません
- ビルド設定は必ずCloudflareのダッシュボードで行ってください
- `.npmrc`ファイルにより、開発依存関係は自動的に除外されます
