# MCP Apps デプロイガイド

## 概要

このドキュメントは、佐賀バスナビゲーターのMCP Apps機能をCloudflare Pagesにデプロイする手順を説明します。

## 前提条件

- Node.js 18以上がインストールされていること
- Cloudflare アカウントを持っていること
- Wrangler CLIがインストールされていること（`npm install -g wrangler`）
- Cloudflare アカウントにログインしていること（`wrangler login`）

## デプロイ手順

### 1. KVネームスペースの作成

MCP Appsのレート制限機能には、Cloudflare Workers KVが必要です。

```bash
# レート制限用KVネームスペースを作成
wrangler kv:namespace create "RATE_LIMIT_KV"
```

コマンド実行後、以下のような出力が表示されます：

```
🌀 Creating namespace with title "saga-bus-navigator-RATE_LIMIT_KV"
✨ Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "RATE_LIMIT_KV", id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

### 2. wrangler.tomlの更新

`wrangler.toml`ファイルを開き、`RATE_LIMIT_KV`のIDを更新します：

```toml
# MCP Apps rate limiting
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # ← ここを実際のIDに置き換える
```

### 3. テストの実行

デプロイ前に、全てのテストが通ることを確認します：

```bash
cd functions
npm test
```

全278テストが通過することを確認してください。

### 4. デプロイスクリプトの実行

デプロイスクリプトを実行します：

```bash
./scripts/deploy-mcp-apps.sh
```

スクリプトは以下の処理を自動的に実行します：

1. 環境チェック（wrangler、Node.jsのインストール確認）
2. KVネームスペース設定の確認
3. テスト実行
4. TypeScriptビルド
5. デプロイ前確認（ユーザー確認）
6. Cloudflare Pagesへのデプロイ

### 5. 動作確認

デプロイ完了後、以下のコマンドでMCPエンドポイントの動作を確認します：

```bash
# ツールリストを取得
curl -X POST https://saga-bus.midnight480.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

期待されるレスポンス：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_bus_stops",
        "description": "佐賀市内のバス停を名前で検索します",
        ...
      },
      {
        "name": "search_routes",
        "description": "出発地と目的地を指定してバス路線を検索します",
        ...
      },
      {
        "name": "get_first_last_bus",
        "description": "指定した路線の始発と終バスの時刻を取得します",
        ...
      }
    ]
  }
}
```

### 6. バス停検索のテスト

実際にツールを呼び出してテストします：

```bash
curl -X POST https://saga-bus.midnight480.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_bus_stops",
      "arguments": {
        "query": "佐賀駅"
      }
    }
  }'
```

## 環境変数

現在、MCP Appsは環境変数を使用していません。全ての設定は`wrangler.toml`で管理されます。

## KVネームスペース

### GTFS_DATA

- **用途**: GTFSデータの保存
- **既存**: すでに設定済み
- **ID**: `3ae3f515d413458d913a9be942fdf056`

### RATE_LIMIT_KV

- **用途**: レート制限のカウンター管理
- **作成**: デプロイ前に作成が必要
- **ID**: デプロイ時に設定

## トラブルシューティング

### KVネームスペースIDが設定されていない

**エラー:**
```
警告: RATE_LIMIT_KV IDが設定されていません
```

**解決策:**
1. `wrangler kv:namespace create "RATE_LIMIT_KV"`を実行
2. 出力されたIDを`wrangler.toml`に設定
3. 再度デプロイスクリプトを実行

### テストが失敗する

**解決策:**
1. `cd functions && npm install`で依存関係を再インストール
2. `npm test`で失敗しているテストを確認
3. エラーメッセージを確認して修正

### デプロイが失敗する

**解決策:**
1. `wrangler whoami`でログイン状態を確認
2. ログインしていない場合は`wrangler login`を実行
3. Cloudflare Pagesプロジェクトが存在することを確認

### レート制限が機能しない

**原因**: RATE_LIMIT_KV IDが正しく設定されていない

**解決策:**
1. `wrangler.toml`のRATE_LIMIT_KV IDを確認
2. Cloudflare ダッシュボードでKVネームスペースが存在することを確認
3. 必要に応じてKVネームスペースを再作成

## モニタリング

### Cloudflare ダッシュボード

1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/)にログイン
2. Pages > saga-bus-navigator を選択
3. 以下の情報を確認：
   - デプロイ履歴
   - リクエスト数
   - エラー率
   - レスポンスタイム

### ログの確認

```bash
# リアルタイムログを表示
wrangler pages deployment tail
```

### KVの確認

```bash
# RATE_LIMIT_KVの内容を確認
wrangler kv:key list --namespace-id=YOUR_RATE_LIMIT_KV_ID
```

## ロールバック

問題が発生した場合、以前のデプロイメントにロールバックできます：

1. Cloudflare ダッシュボードでPages > saga-bus-navigator を開く
2. Deploymentsタブを選択
3. ロールバックしたいデプロイメントの「...」メニューをクリック
4. 「Rollback to this deployment」を選択

## セキュリティ

### レート制限

- **制限**: 60リクエスト/分/IPアドレス
- **実装**: Cloudflare Workers KVでカウンター管理
- **超過時**: HTTPステータス429を返す

### CORS

- **設定**: 全てのオリジンからのアクセスを許可（`Access-Control-Allow-Origin: *`）
- **理由**: AIアシスタント（Claude等）からのアクセスを許可するため

### セキュリティヘッダー

全てのレスポンスに以下のヘッダーが含まれます：

- `Content-Security-Policy: default-src 'self'`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### 入力検証

- 全てのツールパラメータをJSON Schemaで検証
- SQLインジェクション、XSS攻撃パターンを検出・拒否

## パフォーマンス

### キャッシング

- REST APIレスポンスをCloudflare CDNでキャッシュ（30秒）
- セッション情報をメモリキャッシュ

### 圧縮

- レスポンスをgzip圧縮

### タイムアウト

- REST API呼び出しは5秒でタイムアウト
- MCPエンドポイント全体は10秒でタイムアウト

## 関連ドキュメント

- [MCP Apps利用ガイド](../MCP_APPS.md)
- [MCP仕様](https://spec.modelcontextprotocol.io/)
- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [Cloudflare Workers KV](https://developers.cloudflare.com/kv/)
