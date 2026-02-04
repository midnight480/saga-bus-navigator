# MCP Apps デプロイ前チェックリスト

このチェックリストは、MCP Apps機能をCloudflare Pagesにデプロイする前に確認すべき項目をまとめたものです。

## 1. 環境準備

- [ ] Node.js 18以上がインストールされている
- [ ] Wrangler CLIがインストールされている（`wrangler --version`で確認）
- [ ] Cloudflare アカウントにログインしている（`wrangler whoami`で確認）
- [ ] GitHubリポジトリが最新の状態である

## 2. KVネームスペース設定

- [ ] RATE_LIMIT_KV ネームスペースが作成されている
  ```bash
  wrangler kv:namespace create "RATE_LIMIT_KV"
  ```
- [ ] `wrangler.toml`にRATE_LIMIT_KV IDが設定されている
- [ ] RATE_LIMIT_KV IDが`YOUR_RATE_LIMIT_KV_ID_HERE`のままになっていない

## 3. テスト実行

- [ ] 全ての単体テストが通過している
  ```bash
  cd functions && npm test
  ```
- [ ] 全てのプロパティテストが通過している（100回実行）
- [ ] 全ての統合テストが通過している
- [ ] テストカバレッジが80%以上である
  ```bash
  cd functions && npm run test:coverage
  ```

### テスト結果の確認

期待される結果：
- ✓ 278 tests passed
- Test Files: 30 passed
- Duration: ~30s

## 4. TypeScriptビルド

- [ ] TypeScriptのビルドエラーがない
  ```bash
  cd functions && npm run build
  ```
- [ ] 型エラーがない
  ```bash
  cd functions && npx tsc --noEmit
  ```

## 5. セキュリティ設定

- [ ] 入力検証が実装されている（`functions/lib/mcp/security.ts`）
- [ ] SQLインジェクション対策が実装されている
- [ ] XSS対策が実装されている
- [ ] セキュリティヘッダーが設定されている
  - Content-Security-Policy
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection

## 6. レート制限設定

- [ ] レート制限が実装されている（`functions/lib/mcp/rate-limiter.ts`）
- [ ] 60リクエスト/分/IPの制限が設定されている
- [ ] 429エラーとRetry-Afterヘッダーが返される
- [ ] レート制限のテストが通過している

## 7. CORS設定

- [ ] CORSヘッダーが設定されている
  - Access-Control-Allow-Origin: *
  - Access-Control-Allow-Methods: GET, POST, OPTIONS
  - Access-Control-Allow-Headers: Content-Type, Accept, Mcp-Session-Id, Last-Event-ID
- [ ] OPTIONSリクエストが正しく処理される
- [ ] CORSのテストが通過している

## 8. エラーハンドリング

- [ ] 全てのエラーコードが定義されている（`functions/lib/mcp/error-handler.ts`）
- [ ] エラーレスポンスがJSON-RPC 2.0形式である
- [ ] エラーメッセージが分かりやすい
- [ ] エラーハンドリングのテストが通過している

## 9. ツール実装

### バス停検索ツール

- [ ] ツールスキーマが定義されている
- [ ] パラメータバリデーションが実装されている
- [ ] REST API呼び出しが実装されている
- [ ] レスポンス変換が実装されている
- [ ] テストが通過している

### 路線検索ツール

- [ ] ツールスキーマが定義されている
- [ ] パラメータバリデーションが実装されている
- [ ] REST API呼び出しが実装されている
- [ ] レスポンス変換が実装されている
- [ ] テストが通過している

### 始発・終バス検索ツール

- [ ] ツールスキーマが定義されている
- [ ] パラメータバリデーションが実装されている
- [ ] REST API呼び出しが実装されている
- [ ] レスポンス変換が実装されている
- [ ] テストが通過している

## 10. ドキュメント

- [ ] MCP Apps利用ガイドが作成されている（`docs/MCP_APPS.md`）
- [ ] デプロイガイドが作成されている（`docs/deployment/MCP_APPS_DEPLOYMENT.md`）
- [ ] エンドポイントURLが記載されている
- [ ] 各ツールの説明とパラメータが記載されている
- [ ] 利用例が記載されている（Claude Desktop、Cursor等）
- [ ] エラーコード一覧が記載されている
- [ ] 日本語と英語の両方で記載されている

## 11. パフォーマンス

- [ ] レスポンスタイムが要件を満たしている
  - バス停検索: 2秒以内
  - 路線検索: 3秒以内
  - 始発・終バス検索: 2秒以内
- [ ] レスポンスが圧縮されている（gzip）
- [ ] キャッシングが設定されている（Cloudflare CDN）

## 12. 既存機能への影響確認

- [ ] 既存のWebアプリケーションが正常に動作する
- [ ] 既存のREST APIが正常に動作する
- [ ] GTFSデータの読み込みが正常に動作する
- [ ] 既存のテストが全て通過している

## 13. デプロイ準備

- [ ] デプロイスクリプトが作成されている（`scripts/deploy-mcp-apps.sh`）
- [ ] デプロイスクリプトに実行権限が付与されている
- [ ] デプロイスクリプトが正しく動作する（ドライラン）

## 14. 動作確認コマンド

デプロイ後、以下のコマンドで動作確認を行います：

### ツールリスト取得

```bash
curl -X POST https://saga-bus.midnight480.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

期待される結果：3つのツール（search_bus_stops、search_routes、get_first_last_bus）が返される

### バス停検索

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

期待される結果：佐賀駅周辺のバス停が返される

### レート制限確認

```bash
# 60回以上リクエストを送信
for i in {1..65}; do
  curl -X POST https://saga-bus.midnight480.com/api/mcp \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":'$i',"method":"tools/list"}'
  sleep 0.5
done
```

期待される結果：61回目以降のリクエストで429エラーが返される

### CORS確認

```bash
curl -X OPTIONS https://saga-bus.midnight480.com/api/mcp \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

期待される結果：CORSヘッダーが返される

## 15. ロールバック準備

- [ ] 現在のデプロイメントIDを記録している
- [ ] ロールバック手順を理解している
- [ ] 問題発生時の連絡先を確認している

## 16. モニタリング設定

- [ ] Cloudflare ダッシュボードでメトリクスを確認できる
- [ ] ログを確認できる（`wrangler pages deployment tail`）
- [ ] アラート設定を確認している（オプション）

## チェックリスト完了

全ての項目にチェックが入ったら、デプロイの準備が整っています。

デプロイを実行するには：

```bash
./scripts/deploy-mcp-apps.sh
```

## デプロイ後の確認

デプロイ完了後、以下を確認してください：

1. [ ] MCPエンドポイントが正常に動作している
2. [ ] 全てのツールが正常に動作している
3. [ ] レート制限が正常に機能している
4. [ ] エラーハンドリングが正常に機能している
5. [ ] ログが正常に記録されている
6. [ ] 既存のWebアプリケーションが正常に動作している

## 問題が発生した場合

1. Cloudflare ダッシュボードでログを確認
2. `wrangler pages deployment tail`でリアルタイムログを確認
3. 必要に応じてロールバック
4. 問題を修正して再デプロイ

## 関連ドキュメント

- [MCP Apps利用ガイド](../MCP_APPS.md)
- [MCP Appsデプロイガイド](./MCP_APPS_DEPLOYMENT.md)
- [トラブルシューティング](./MCP_APPS_DEPLOYMENT.md#トラブルシューティング)
