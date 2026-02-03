# Cloudflare KV 運用手順書

## 概要

このドキュメントは、Cloudflare KVを使用したGTFSデータ管理の日常的な運用手順を説明します。

## データ更新手順

### 定期的なデータ更新（推奨）

佐賀市のGTFSデータは定期的に更新されます。以下の手順で最新データに更新してください。

#### 1. 最新GTFSデータの取得

```bash
# 佐賀市オープンデータポータルから最新のGTFSデータをダウンロード
# https://www.city.saga.lg.jp/main/1234.html

# ダウンロードしたファイルを確認
ls -lh ~/Downloads/saga-*.zip

# ./dataディレクトリに配置
cp ~/Downloads/saga-20250203.zip ./data/saga-current.zip
```

#### 2. データの前処理

```bash
# GTFSファイルをJSON形式に変換
node scripts/gtfs_to_json.js

# 変換されたファイルを確認
ls -lh ./gtfs-json/
```

#### 3. KVへのアップロード

```bash
# KVにアップロード
node scripts/upload_to_kv.js

# 出力例：
# GTFSデータをKVにアップロードしています...
# バージョン: 20250203120000
# stops.txt をアップロード中...
# routes.txt をアップロード中...
# ...
# アップロード完了
```

#### 4. バージョンの確認

```bash
# 利用可能なバージョンを確認
node scripts/list_versions.js

# 出力例：
# 利用可能なバージョン:
# - 20250203120000 (現在のバージョン)
# - 20250201100000
```

#### 5. Gitへのコミット

```bash
# 変更をコミット
git add data/ gtfs-json/
git commit -m "Update GTFS data to 2025-02-03"
git push origin main
```

### 緊急時のデータ更新

Gitプッシュなしで即座にデータを更新する必要がある場合：

```bash
# 1. GTFSデータを準備
cp ~/Downloads/saga-latest.zip ./data/saga-current.zip

# 2. 前処理とアップロードを一括実行
node scripts/gtfs_to_json.js && node scripts/upload_to_kv.js

# 3. 確認
node scripts/list_versions.js
```

## ロールバック手順

問題が発生した場合、前のバージョンにロールバックできます。

### 1. 現在のバージョンを確認

```bash
node scripts/list_versions.js

# 出力例：
# 利用可能なバージョン:
# - 20250203120000 (現在のバージョン)
# - 20250201100000
```

### 2. ロールバックの実行

```bash
# 1世代前にロールバック
node scripts/rollback.js

# 出力例：
# ロールバックを実行しています...
# 現在のバージョン: 20250203120000
# ロールバック先: 20250201100000
# ロールバック完了
```

### 3. ロールバックの確認

```bash
# バージョンを確認
node scripts/list_versions.js

# 出力例：
# 利用可能なバージョン:
# - 20250201100000 (現在のバージョン)
# - 20250203120000
```

### 4. アプリケーションの確認

ブラウザでアプリケーションを開き、データが正しく表示されることを確認してください。

## バージョン管理

### バージョン番号の形式

バージョン番号はタイムスタンプベースで、以下の形式です：

```
YYYYMMDDHHmmss
```

例：
- `20250203120000` = 2025年2月3日 12:00:00

### バージョンのライフサイクル

- KVには最新2世代のバージョンのみが保持されます
- 古いバージョンは自動的に削除されます
- ロールバックは1世代前のバージョンにのみ可能です

### バージョン一覧の確認

```bash
# 利用可能なバージョンを表示
node scripts/list_versions.js

# 詳細情報を表示
node scripts/list_versions.js --verbose
```

## モニタリング

### データ読み込みの確認

アプリケーションのログを確認して、KVからのデータ読み込みが正常に動作しているか確認します：

```bash
# Cloudflare Pagesのログを確認
# ダッシュボード → プロジェクト → Functions → Logs
```

正常な場合のログ例：
```
KVからGTFSデータを読み込んでいます...
現在のバージョン: 20250203120000
stops.txt を読み込み中...
routes.txt を読み込み中...
...
データ読み込み完了
```

### フォールバックの確認

KV読み込みに失敗した場合、自動的にZIPファイルにフォールバックします：

```
KVからの読み込みに失敗しました。ZIPファイルにフォールバックします
GTFSデータの解凍に失敗しました
```

このログが頻繁に表示される場合は、KVの接続を確認してください。

### パフォーマンスの確認

KVからのデータ読み込み時間を確認します：

```
データ読み込み時間: 1234ms
```

- 正常: 1000ms以下
- 注意: 1000-3000ms
- 警告: 3000ms以上

## トラブルシューティング

### 問題: データが更新されない

**症状**: 新しいGTFSデータをアップロードしたが、アプリケーションに反映されない

**原因**:
1. キャッシュが残っている
2. バージョンが正しく更新されていない

**解決方法**:
```bash
# 1. バージョンを確認
node scripts/list_versions.js

# 2. ブラウザのキャッシュをクリア
# Ctrl+Shift+R (Windows/Linux) または Cmd+Shift+R (Mac)

# 3. 必要に応じて再アップロード
node scripts/upload_to_kv.js
```

### 問題: ロールバックできない

**症状**: `ロールバック先のバージョンが見つかりません`

**原因**: 1世代前のバージョンが削除されている

**解決方法**:
```bash
# 1. 利用可能なバージョンを確認
node scripts/list_versions.js

# 2. 古いGTFSデータから再アップロード
cp ./data/saga-20250201.zip ./data/saga-current.zip
node scripts/gtfs_to_json.js
node scripts/upload_to_kv.js
```

### 問題: アップロードが失敗する

**症状**: `KVへのアップロードに失敗しました`

**原因**:
1. API Tokenが無効
2. ネットワークエラー
3. KV容量不足

**解決方法**:
```bash
# 1. 環境変数を確認
echo $CLOUDFLARE_API_TOKEN
echo $KV_NAMESPACE_ID

# 2. API Tokenの権限を確認
# Cloudflareダッシュボード → API Tokens

# 3. KV容量を確認
# Cloudflareダッシュボード → Workers & Pages → KV

# 4. 再試行
node scripts/upload_to_kv.js
```

## ベストプラクティス

### データ更新のタイミング

- 定期的な更新: 月1回（佐賀市のGTFS更新に合わせて）
- 緊急更新: 路線変更や運休情報がある場合

### バックアップ

GTFSファイルは必ずバックアップを取ってください：

```bash
# バックアップディレクトリを作成
mkdir -p ./data/backup

# 現在のファイルをバックアップ
cp ./data/saga-current.zip ./data/backup/saga-$(date +%Y%m%d).zip
```

### テスト環境での確認

本番環境にデプロイする前に、ローカル環境でテストしてください：

```bash
# ローカルでテスト
npm run dev

# ブラウザで http://localhost:8788 を開く
# データが正しく表示されることを確認
```

### ログの保存

重要な操作のログは保存してください：

```bash
# アップロードログを保存
node scripts/upload_to_kv.js 2>&1 | tee logs/upload-$(date +%Y%m%d-%H%M%S).log

# ロールバックログを保存
node scripts/rollback.js 2>&1 | tee logs/rollback-$(date +%Y%m%d-%H%M%S).log
```

## 定期メンテナンス

### 月次メンテナンス

1. GTFSデータの更新確認
2. KV容量の確認
3. ログの確認
4. パフォーマンスの確認

### 四半期メンテナンス

1. 古いバックアップファイルの削除
2. ログファイルのアーカイブ
3. セキュリティ監査

## 関連ドキュメント

- [デプロイメントガイド](./deployment/KV_DEPLOYMENT.md)
- [トラブルシューティングガイド](./KV_TROUBLESHOOTING.md)
- [KV統合ドキュメント](./KV_INTEGRATION.md)
