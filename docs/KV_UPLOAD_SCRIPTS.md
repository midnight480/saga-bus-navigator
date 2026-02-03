# KVアップロードスクリプト

## 概要

このドキュメントは、Cloudflare KVにGTFSデータをアップロードするスクリプト群の使用方法を説明します。

## スクリプト一覧

### 1. upload_to_kv.js

JSONファイルをCloudflare KVに保存するメインスクリプトです。

**機能:**
- タイムスタンプベースのバージョン番号生成（YYYYMMDDHHmmss形式）
- Cloudflare KV APIを使用したデータ保存
- `gtfs:v{version}:{table_name}`形式のキー管理
- `gtfs:current_version`キーの更新
- バージョンライフサイクル管理（最新2世代のみ保持）
- エラーハンドリングとリトライ処理（指数バックオフ）

**使用方法:**

```bash
# 環境変数を設定
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export CLOUDFLARE_API_TOKEN=your_api_token
export KV_NAMESPACE_ID=your_namespace_id

# スクリプトを実行
node scripts/upload_to_kv.js ./gtfs-json
```

**環境変数:**
- `CLOUDFLARE_ACCOUNT_ID`: CloudflareアカウントID
- `CLOUDFLARE_API_TOKEN`: Cloudflare API Token（KV書き込み権限が必要）
- `KV_NAMESPACE_ID`: KV Namespace ID

**出力例:**

```
=== KVアップロードスクリプト開始 ===
入力ディレクトリ: ./gtfs-json
アカウントID: abc123...
Namespace ID: def456...

生成されたバージョン番号: 20250115143045

アップロード対象: 7ファイル

アップロード中: stops.json...
  キー: gtfs:v20250115143045:stops
  データ件数: 150件
  ✓ アップロード完了

...

✓ current_versionを更新しました: 20250115143045

古いバージョンをクリーンアップしています...
  現在のバージョン数: 3件
  削除対象: 1件のバージョン
  バージョン 20250114120000 の8個のキーを削除しています...
  ✓ バージョン 20250114120000 を削除しました
✓ クリーンアップ完了: 1件のバージョンを削除しました

=== アップロード完了 ===
バージョン: 20250115143045
アップロードされたキー: 7件
  - gtfs:v20250115143045:stops
  - gtfs:v20250115143045:routes
  - gtfs:v20250115143045:trips
  - gtfs:v20250115143045:calendar
  - gtfs:v20250115143045:agency
  - gtfs:v20250115143045:fare_attributes
  - gtfs:v20250115143045:stop_times

✓ アップロードが正常に完了しました
```

### 2. rollback.js

Cloudflare KVのGTFSデータを1世代前のバージョンにロールバックするスクリプトです。

**機能:**
- 現在のバージョンの確認
- 利用可能なバージョンのリストアップ
- 1世代前のバージョンへのロールバック
- `gtfs:current_version`キーの更新

**使用方法:**

```bash
# 環境変数を設定（upload_to_kv.jsと同じ）
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export CLOUDFLARE_API_TOKEN=your_api_token
export KV_NAMESPACE_ID=your_namespace_id

# スクリプトを実行
node scripts/rollback.js
```

**出力例:**

```
=== ロールバックスクリプト開始 ===

現在のバージョンを確認しています...
現在のバージョン: 20250115143045

利用可能なバージョンを確認しています...
利用可能なバージョン: 2件
  1. 20250115143045 (現在)
  2. 20250114120000

ロールバック先: 20250114120000

current_versionを更新しています...
✓ current_versionを更新しました: 20250114120000

=== ロールバック完了 ===
20250115143045 → 20250114120000

次回のDataLoader初期化時から、ロールバックされたバージョンのデータが使用されます

✓ ロールバックが正常に完了しました
```

### 3. list_versions.js

Cloudflare KVに保存されているGTFSデータのバージョン一覧を表示するスクリプトです。

**機能:**
- 現在のバージョンの表示
- 利用可能な全バージョンのリストアップ
- バージョン番号の読みやすい形式への変換

**使用方法:**

```bash
# 環境変数を設定（upload_to_kv.jsと同じ）
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export CLOUDFLARE_API_TOKEN=your_api_token
export KV_NAMESPACE_ID=your_namespace_id

# スクリプトを実行
node scripts/list_versions.js
```

**出力例:**

```
=== GTFSデータバージョン一覧 ===

現在のバージョンを確認しています...
現在のバージョン: 20250115143045 (2025-01-15 14:30:45)

利用可能なバージョンを取得しています...

利用可能なバージョン: 2件

  1. 20250115143045 (2025-01-15 14:30:45) ← 現在
  2. 20250114120000 (2025-01-14 12:00:00)

注意:
  - バージョンは最新2世代のみ保持されます
  - ロールバックは1世代前のバージョンにのみ可能です
```

## KVキー構造

### データキー

```
gtfs:v{version}:{table_name}
```

**例:**
- `gtfs:v20250115143045:stops` - バス停データ
- `gtfs:v20250115143045:routes` - 路線データ
- `gtfs:v20250115143045:stop_times` - 時刻表データ（分割されていない場合）
- `gtfs:v20250115143045:stop_times_0` - 時刻表データ（分割チャンク0）
- `gtfs:v20250115143045:stop_times_1` - 時刻表データ（分割チャンク1）

### バージョンポインタ

```
gtfs:current_version
```

**値:** 現在有効なバージョン番号（例: `20250115143045`）

## バージョン管理

### バージョン番号形式

- **形式:** YYYYMMDDHHmmss（14桁の数字）
- **例:** `20250115143045` = 2025年1月15日 14時30分45秒

### 世代管理

- **保持世代数:** 最新2世代
- **自動削除:** 新しいバージョンをアップロードすると、2世代以前のバージョンが自動的に削除されます

**例:**

1. 初回アップロード: v1のみ保持
2. 2回目アップロード: v2, v1を保持
3. 3回目アップロード: v3, v2を保持（v1は自動削除）

### ロールバック

- **対象:** 1世代前のバージョンのみ
- **方法:** `gtfs:current_version`キーを更新
- **データ:** データ自体は削除されず、ポインタのみ変更

## エラーハンドリング

### リトライ処理

レート制限エラー（429 Too Many Requests）が発生した場合、指数バックオフでリトライします。

- **最大リトライ回数:** 5回
- **初期遅延:** 1秒
- **遅延増加:** 指数的に増加（1秒 → 2秒 → 4秒 → 8秒 → 16秒）

### 部分的保存のクリーンアップ

アップロード中にエラーが発生した場合、部分的に保存されたデータを自動的にクリーンアップします。

### フォールバック

KVへの接続が失敗した場合、DataLoaderは自動的にZIPファイル読み込みにフォールバックします。

## セキュリティ

### API Token

- **権限:** KV書き込み権限が必要
- **保管:** 環境変数として安全に保管
- **ローテーション:** 定期的にトークンをローテーション

### アクセス制御

- **アップロードスクリプト:** KV書き込み権限
- **Pages Function:** KV読み取り専用権限

## トラブルシューティング

### 環境変数が設定されていない

**エラー:**
```
エラー: 必要な環境変数が設定されていません
  - CLOUDFLARE_ACCOUNT_ID環境変数が設定されていません
```

**解決方法:**
```bash
export CLOUDFLARE_ACCOUNT_ID=your_account_id
export CLOUDFLARE_API_TOKEN=your_api_token
export KV_NAMESPACE_ID=your_namespace_id
```

### レート制限エラー

**エラー:**
```
⚠ リトライ 1/5: 1000ms後に再試行します...
```

**解決方法:**
- 自動的にリトライされます
- 最大5回リトライしても失敗する場合は、しばらく待ってから再実行してください

### ロールバック可能なバージョンがない

**エラー:**
```
エラー: ロールバック可能なバージョンがありません
現在のバージョンが最古のバージョンです
```

**解決方法:**
- 最新2世代のみ保持されるため、1世代前のバージョンが存在しない場合はロールバックできません
- 新しいバージョンをアップロードしてから、必要に応じてロールバックしてください

## テスト

### ユニットテスト

```bash
npm test upload-to-kv
npm test rollback
```

### プロパティベーステスト

```bash
npm test upload-to-kv.property
```

## 関連ドキュメント

- [要件定義書](.kiro/specs/cloudflare-kv-gtfs-deployment/requirements.md)
- [設計書](.kiro/specs/cloudflare-kv-gtfs-deployment/design.md)
- [タスク一覧](.kiro/specs/cloudflare-kv-gtfs-deployment/tasks.md)
