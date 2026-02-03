# Cloudflare KV GTFS デプロイメントガイド

## 概要

このドキュメントは、佐賀バスナビゲーターのGTFSデータをCloudflare KVにデプロイする手順を説明します。

## 前提条件

- Node.js 18以上がインストールされていること
- Cloudflareアカウントを持っていること
- Cloudflare API Tokenが発行されていること
- KV Namespaceが作成されていること

## 環境変数の設定

以下の環境変数を設定してください：

```bash
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export KV_NAMESPACE_ID="your-kv-namespace-id"
```

または、`.dev.vars`ファイルに記載してください：

```
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
KV_NAMESPACE_ID=your-kv-namespace-id
```

## デプロイ手順

### 1. GTFSデータの準備

最新のGTFSデータを`./data/saga-current.zip`に配置します：

```bash
# 佐賀市オープンデータポータルから最新のGTFSデータをダウンロード
# ダウンロードしたファイルを./dataディレクトリに配置
cp ~/Downloads/saga-YYYYMMDD.zip ./data/saga-current.zip
```

### 2. GTFS前処理

GTFSファイルをJSON形式に変換します：

```bash
node scripts/gtfs_to_json.js
```

このスクリプトは以下を実行します：
- `./data/saga-current.zip`を解凍
- 各GTFSファイル（stops.txt, routes.txt等）をJSON配列に変換
- stop_timesデータが25MBを超える場合は自動分割
- 変換されたJSONファイルを`./gtfs-json/`ディレクトリに保存

### 3. KVへのアップロード

変換されたJSONファイルをCloudflare KVにアップロードします：

```bash
node scripts/upload_to_kv.js
```

このスクリプトは以下を実行します：
- タイムスタンプベースのバージョン番号を生成（YYYYMMDDHHmmss形式）
- 各GTFSテーブルを`gtfs:v{version}:{table_name}`キーでKVに保存
- `gtfs:current_version`キーに現在のバージョン番号を保存
- 古いバージョンを削除（最新2世代のみ保持）

### 4. デプロイ確認

KVにデータが正しくアップロードされたことを確認します：

```bash
# バージョン一覧を表示
node scripts/list_versions.js

# 出力例：
# 利用可能なバージョン:
# - 20250203120000 (現在のバージョン)
# - 20250201100000
```

### 5. Cloudflare Pagesへのデプロイ

Cloudflare Pagesにアプリケーションをデプロイします：

```bash
# Gitにコミット
git add .
git commit -m "Update GTFS data"
git push origin main

# Cloudflare Pagesが自動的にデプロイを開始します
```

デプロイ後、Deploy Hookが自動的に実行され、最新のGTFSデータがKVにアップロードされます。

## Deploy Hook

Cloudflare Pages Functionとして実装されたDeploy Hookは、デプロイ後に自動的にGTFSデータをKVにアップロードします。

### Deploy Hookの設定

1. Cloudflare Pagesダッシュボードで、プロジェクトの「Settings」→「Functions」を開く
2. 環境変数を設定：
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
   - `KV_NAMESPACE_ID`

### Deploy Hookの手動実行

必要に応じて、Deploy Hookを手動で実行できます：

```bash
curl -X POST https://your-app.pages.dev/api/deploy-hook
```

## データ更新フロー

### 定期的なデータ更新

1. 最新のGTFSデータをダウンロード
2. `./data/saga-current.zip`に配置
3. GTFS前処理を実行
4. KVへアップロード
5. Gitにコミット＆プッシュ

```bash
# 一連の操作をまとめて実行
./scripts/update_gtfs.sh
```

### 緊急時のデータ更新

Deploy Hookを使用して、Gitプッシュなしでデータを更新できます：

```bash
# 1. GTFSデータを準備
cp ~/Downloads/saga-latest.zip ./data/saga-current.zip

# 2. 前処理とアップロードを実行
node scripts/gtfs_to_json.js
node scripts/upload_to_kv.js

# 3. Deploy Hookを手動実行（オプション）
curl -X POST https://your-app.pages.dev/api/deploy-hook
```

## ロールバック

問題が発生した場合、前のバージョンにロールバックできます：

```bash
# 利用可能なバージョンを確認
node scripts/list_versions.js

# 1世代前にロールバック
node scripts/rollback.js

# 確認
node scripts/list_versions.js
```

詳細は[運用手順書](#運用手順書)を参照してください。

## トラブルシューティング

### KVへの接続エラー

**症状**: `KV Namespaceへの接続に失敗しました`

**原因**: 
- API Tokenが無効
- KV Namespace IDが間違っている
- ネットワークエラー

**解決方法**:
1. 環境変数が正しく設定されているか確認
2. API Tokenの権限を確認（KVへの読み書き権限が必要）
3. KV Namespace IDが正しいか確認

### データ読み込みエラー

**症状**: `GTFSデータの解凍に失敗しました`

**原因**:
- GTFSファイルが破損している
- ZIPファイルの形式が不正

**解決方法**:
1. GTFSファイルを再ダウンロード
2. ZIPファイルの整合性を確認：
   ```bash
   unzip -t ./data/saga-current.zip
   ```

### アップロードタイムアウト

**症状**: `KVへのアップロードがタイムアウトしました`

**原因**:
- データサイズが大きすぎる
- ネットワークが不安定

**解決方法**:
1. リトライ処理が自動的に実行されるまで待つ
2. 手動で再実行：
   ```bash
   node scripts/upload_to_kv.js
   ```

詳細は[トラブルシューティングガイド](#トラブルシューティングガイド)を参照してください。

## セキュリティ

### API Tokenの管理

- API Tokenは環境変数または`.dev.vars`ファイルで管理
- `.dev.vars`ファイルは`.gitignore`に追加されており、Gitにコミットされません
- 本番環境ではCloudflare Pagesの環境変数機能を使用

### アクセス制御

- Deploy HookはPOSTリクエストのみ受け付けます
- Pages FunctionはKVへの読み取り専用アクセスを持ちます
- KVへの書き込みはDeploy Hookとアップロードスクリプトのみが実行できます

## パフォーマンス

### KV読み込み

- KVからのデータ読み込みは並列実行されます
- タイムアウトは5秒に設定されています
- タイムアウト時は自動的にZIPファイルにフォールバックします

### メモリキャッシュ

- 読み込まれたデータはメモリにキャッシュされます
- 2回目以降の読み込みはキャッシュから返されます
- `clearCache()`メソッドでキャッシュをクリアできます

## 関連ドキュメント

- [KV統合ドキュメント](../KV_INTEGRATION.md)
- [KVアップロードスクリプト](../KV_UPLOAD_SCRIPTS.md)
- [GTFS前処理](../GTFS_PREPROCESSING.md)
- [セキュリティ](../SECURITY.md)
