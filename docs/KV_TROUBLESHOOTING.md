# Cloudflare KV トラブルシューティングガイド

## 概要

このドキュメントは、Cloudflare KVを使用したGTFSデータ管理で発生する可能性のある問題と解決方法を説明します。

## 一般的な問題

### 1. KVへの接続エラー

#### 症状
```
KV Namespaceへの接続に失敗しました
Error: Failed to connect to KV
```

#### 原因
- API Tokenが無効または期限切れ
- KV Namespace IDが間違っている
- ネットワークエラー
- Cloudflareのサービス障害

#### 解決方法

**ステップ1: 環境変数の確認**
```bash
# 環境変数が設定されているか確認
echo $CLOUDFLARE_ACCOUNT_ID
echo $CLOUDFLARE_API_TOKEN
echo $KV_NAMESPACE_ID

# 設定されていない場合は設定
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export KV_NAMESPACE_ID="your-kv-namespace-id"
```

**ステップ2: API Tokenの権限確認**
1. Cloudflareダッシュボードにログイン
2. 「My Profile」→「API Tokens」を開く
3. 使用しているトークンの権限を確認
4. 必要な権限：
   - Account - Workers KV Storage - Edit
   - Account - Workers KV Storage - Read

**ステップ3: KV Namespace IDの確認**
1. Cloudflareダッシュボードで「Workers & Pages」を開く
2. 「KV」タブを選択
3. 使用しているNamespaceのIDを確認

**ステップ4: ネットワーク接続の確認**
```bash
# Cloudflare APIへの接続を確認
curl -X GET "https://api.cloudflare.com/client/v4/user" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

### 2. データ読み込みエラー

#### 症状
```
GTFSデータの解凍に失敗しました
Error: Failed to parse GTFS data
```

#### 原因
- GTFSファイルが破損している
- ZIPファイルの形式が不正
- JSZipライブラリが読み込まれていない

#### 解決方法

**ステップ1: GTFSファイルの整合性確認**
```bash
# ZIPファイルの整合性をチェック
unzip -t ./data/saga-current.zip

# 正常な場合の出力例：
# testing: stops.txt              OK
# testing: routes.txt             OK
# ...
# No errors detected
```

**ステップ2: GTFSファイルの再ダウンロード**
```bash
# 破損している場合は再ダウンロード
rm ./data/saga-current.zip
# 佐賀市オープンデータポータルから再ダウンロード
```

**ステップ3: GTFSファイルの内容確認**
```bash
# ZIPファイルの内容を確認
unzip -l ./data/saga-current.zip

# 必須ファイルが含まれているか確認：
# - stops.txt
# - routes.txt
# - trips.txt
# - stop_times.txt
# - calendar.txt
# - agency.txt
```

### 3. アップロードタイムアウト

#### 症状
```
KVへのアップロードがタイムアウトしました
Error: Request timeout after 30000ms
```

#### 原因
- データサイズが大きすぎる
- ネットワークが不安定
- Cloudflare APIのレート制限

#### 解決方法

**ステップ1: データサイズの確認**
```bash
# JSONファイルのサイズを確認
ls -lh ./gtfs-json/

# stop_timesファイルが25MBを超えている場合は分割されているか確認
ls -lh ./gtfs-json/stop_times*.json
```

**ステップ2: リトライ処理の確認**
アップロードスクリプトは自動的にリトライを実行します。以下のログが表示される場合は、リトライ中です：

```
リトライ中... (1/3)
リトライ中... (2/3)
リトライ中... (3/3)
```

**ステップ3: 手動での再実行**
```bash
# アップロードを再実行
node scripts/upload_to_kv.js

# タイムアウトが続く場合は、ネットワーク接続を確認
ping api.cloudflare.com
```

### 4. バージョン管理エラー

#### 症状
```
ロールバック先のバージョンが見つかりません
Error: No previous version found
```

#### 原因
- 1世代前のバージョンが削除されている
- バージョン管理が正しく動作していない

#### 解決方法

**ステップ1: 利用可能なバージョンを確認**
```bash
node scripts/list_versions.js

# 出力例：
# 利用可能なバージョン:
# - 20250203120000 (現在のバージョン)
```

**ステップ2: 古いバージョンの再作成**
```bash
# 古いGTFSファイルから再アップロード
cp ./data/backup/saga-20250201.zip ./data/saga-current.zip
node scripts/gtfs_to_json.js
node scripts/upload_to_kv.js
```

### 5. メモリ不足エラー

#### 症状
```
JavaScript heap out of memory
FATAL ERROR: Reached heap limit Allocation failed
```

#### 原因
- GTFSデータが大きすぎる
- Node.jsのメモリ制限

#### 解決方法

**ステップ1: Node.jsのメモリ制限を増やす**
```bash
# メモリ制限を4GBに設定
export NODE_OPTIONS="--max-old-space-size=4096"

# アップロードを再実行
node scripts/upload_to_kv.js
```

**ステップ2: データの分割確認**
```bash
# stop_timesファイルが分割されているか確認
ls -lh ./gtfs-json/stop_times*.json

# 分割されていない場合は、gtfs_to_json.jsを再実行
node scripts/gtfs_to_json.js
```

## エラーコード一覧

### KV関連エラー

| エラーコード | 説明 | 解決方法 |
|------------|------|---------|
| `KV_CONNECTION_ERROR` | KVへの接続に失敗 | API Token、Namespace IDを確認 |
| `KV_TIMEOUT` | KVへのリクエストがタイムアウト | ネットワーク接続を確認、リトライ |
| `KV_NOT_FOUND` | 指定されたキーが見つからない | バージョン番号を確認 |
| `KV_RATE_LIMIT` | レート制限に達した | 少し待ってから再試行 |

### GTFS関連エラー

| エラーコード | 説明 | 解決方法 |
|------------|------|---------|
| `GTFS_FILE_NOT_FOUND` | GTFSファイルが見つからない | ファイルパスを確認 |
| `GTFS_PARSE_ERROR` | GTFSファイルのパースに失敗 | ファイルの整合性を確認 |
| `GTFS_ZIP_ERROR` | ZIPファイルの解凍に失敗 | ZIPファイルを再ダウンロード |
| `GTFS_INVALID_FORMAT` | GTFSファイルの形式が不正 | GTFS仕様に準拠しているか確認 |

### アップロード関連エラー

| エラーコード | 説明 | 解決方法 |
|------------|------|---------|
| `UPLOAD_TIMEOUT` | アップロードがタイムアウト | データサイズを確認、リトライ |
| `UPLOAD_FAILED` | アップロードに失敗 | ネットワーク接続を確認 |
| `VERSION_CONFLICT` | バージョンの競合 | 現在のバージョンを確認 |

## デバッグ方法

### ログレベルの設定

詳細なログを出力するには、環境変数を設定します：

```bash
# DEBUGレベルのログを出力
export LOG_LEVEL=DEBUG

# スクリプトを実行
node scripts/upload_to_kv.js
```

### ログの保存

トラブルシューティングのため、ログを保存してください：

```bash
# ログをファイルに保存
node scripts/upload_to_kv.js 2>&1 | tee logs/upload-$(date +%Y%m%d-%H%M%S).log
```

### KVの直接確認

Cloudflareダッシュボードから直接KVの内容を確認できます：

1. Cloudflareダッシュボードにログイン
2. 「Workers & Pages」→「KV」を開く
3. 使用しているNamespaceを選択
4. キーと値を確認

### テスト環境での確認

本番環境で問題が発生した場合、ローカル環境で再現できるか確認します：

```bash
# ローカルでテスト
npm run dev

# ブラウザで http://localhost:8788 を開く
# 開発者ツールのコンソールでエラーを確認
```

## パフォーマンス問題

### データ読み込みが遅い

#### 症状
- ページの読み込みに10秒以上かかる
- タイムアウトエラーが頻発する

#### 原因
- KVからの読み込みが遅い
- データサイズが大きすぎる
- ネットワークが不安定

#### 解決方法

**ステップ1: KV読み込み時間の確認**
```javascript
// ブラウザの開発者ツールのコンソールで確認
console.time('KV読み込み');
await dataLoader.loadAllDataOnce();
console.timeEnd('KV読み込み');
```

**ステップ2: フォールバックの確認**
KVからの読み込みに失敗した場合、自動的にZIPファイルにフォールバックします。ログを確認してください：

```
KVからの読み込みに失敗しました。ZIPファイルにフォールバックします
```

**ステップ3: データの最適化**
```bash
# stop_timesデータが分割されているか確認
ls -lh ./gtfs-json/stop_times*.json

# 分割されていない場合は再処理
node scripts/gtfs_to_json.js
```

### メモリ使用量が多い

#### 症状
- ブラウザのメモリ使用量が1GB以上
- ページがフリーズする

#### 原因
- データがメモリにキャッシュされている
- メモリリークの可能性

#### 解決方法

**ステップ1: キャッシュのクリア**
```javascript
// ブラウザの開発者ツールのコンソールで実行
dataLoader.clearCache();
```

**ステップ2: ページのリロード**
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

## サポート

### 問題が解決しない場合

1. ログファイルを保存
2. エラーメッセージをコピー
3. 再現手順を記録
4. GitHubのIssueを作成

### 緊急時の連絡先

- GitHub Issues: https://github.com/your-repo/issues
- Email: support@example.com

## 関連ドキュメント

- [デプロイメントガイド](./deployment/KV_DEPLOYMENT.md)
- [運用手順書](./KV_OPERATIONS.md)
- [KV統合ドキュメント](./KV_INTEGRATION.md)
- [セキュリティ](./SECURITY.md)
