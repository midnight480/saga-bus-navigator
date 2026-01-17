# ORS経路描画機能 デプロイ手順

## 概要

OpenRouteService (ORS) 経路描画機能をCloudflare Pagesにデプロイする手順です。

## 前提条件

- Cloudflare Pagesプロジェクトが既に作成されていること
- ORS APIキーが取得済みであること
- wrangler CLIがインストールされていること（環境変数設定用）

## デプロイ手順

### 1. コードのデプロイ

コードは既にコミット・プッシュ済みです。Cloudflare Pagesは自動的にデプロイを開始します。

```bash
# 既に実行済み
git push origin feature/aws-deploy
git push origin high-fidelity-production
```

### 2. 環境変数の設定

#### 方法A: Cloudflareダッシュボードから設定（推奨）

1. Cloudflareダッシュボードにログイン: https://dash.cloudflare.com/
2. 「Workers & Pages」→ プロジェクト「saga-bus-navigator」を選択
3. 「Settings」タブ → 「Environment variables」セクションを開く
4. 「Add variable」をクリック
5. 以下の環境変数を追加:
   - **Variable name**: `ORS_API_KEY`
   - **Value**: `eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNkMTdhZDA5MjUxMDQxMjFiYjUzODE3NzNmYzZiODQ5IiwiaCI6Im11cm11cjY0In0=`
   - **Encrypt** オプションを有効にする（推奨）
6. 「Production」と「Preview」の両方に設定することを推奨
7. 「Save」をクリック

#### 方法B: wrangler CLIから設定

```bash
# wranglerにログイン（初回のみ）
wrangler login

# 環境変数を設定
wrangler pages secret put ORS_API_KEY --project-name saga-bus-navigator
# プロンプトが表示されたら、APIキーを入力:
# eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjNkMTdhZDA5MjUxMDQxMjFiYjUzODE3NzNmYzZiODQ5IiwiaCI6Im11cm11cjY0In0=
```

または、一括設定スクリプトを使用:

```bash
./scripts/apply-cloudflare-secrets.sh
```

### 3. デプロイの確認

1. Cloudflareダッシュボードの「Deployments」タブでデプロイ状況を確認
2. デプロイが完了するまで1-2分待つ
3. デプロイ完了後、本番URLにアクセスして動作確認

### 4. 動作確認

#### ORS機能の確認

1. アプリケーションにアクセス: `https://saga-bus.midnight480.com`
2. バス停を検索して経路を表示
3. 地図上に道路沿いの経路が描画されることを確認
   - **注意**: APIキーが設定されていない場合、直線経路（フォールバック）が表示されます
4. ブラウザの開発者ツール（Console）でエラーがないか確認
5. ネットワークタブで `/runtime-env.js` が正常に読み込まれているか確認

#### 環境変数の確認

ブラウザの開発者ツール（Console）で以下を実行:

```javascript
// runtime-env.jsが読み込まれているか確認
console.log(window.__RUNTIME_ENV__);

// ORS_CONFIGが正しく設定されているか確認
console.log(window.ORS_CONFIG);
```

期待される結果:
- `window.__RUNTIME_ENV__.ORS_API_KEY` が設定されている
- `window.ORS_CONFIG.enabled` が `true` になっている

### 5. トラブルシューティング

#### 経路が表示されない（直線のみ）

- **原因**: APIキーが設定されていない、または環境変数が読み込まれていない
- **解決策**:
  1. Cloudflareダッシュボードで環境変数 `ORS_API_KEY` が設定されているか確認
  2. デプロイを再実行（環境変数変更後は再デプロイが必要な場合がある）
  3. ブラウザのコンソールで `window.ORS_CONFIG` を確認

#### エラーメッセージが表示される

- **レート制限エラー**: ORS APIの無料プラン制限（40 req/min, 2000 req/day）に達している
- **ネットワークエラー**: インターネット接続またはORS APIの状態を確認
- **無効な座標エラー**: バス停データの座標を確認

#### 環境変数が反映されない

1. デプロイを再実行（環境変数変更後は再デプロイが必要）
2. ブラウザのキャッシュをクリア
3. `runtime-env.js` が正常に読み込まれているか確認（ネットワークタブ）

## デプロイ後の確認項目

- [ ] コードがデプロイされている（Deploymentsタブで確認）
- [ ] 環境変数 `ORS_API_KEY` が設定されている
- [ ] アプリケーションが正常に動作する
- [ ] ORS経路が描画される（APIキー設定時）
- [ ] フォールバック（直線）が動作する（APIキー未設定時）
- [ ] エラーメッセージが適切に表示される
- [ ] ローディングインジケーターが動作する

## 関連ドキュメント

- [ORS_INTEGRATION.md](../ORS_INTEGRATION.md) - ORS統合の詳細ドキュメント
- [ORS_CONFIG.md](../ORS_CONFIG.md) - 設定ファイルのドキュメント
- [ORS_API_KEY_MANAGEMENT.md](../ORS_API_KEY_MANAGEMENT.md) - APIキー管理ドキュメント
