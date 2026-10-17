# GitHub Actions による GTFS データ自動更新

## 概要

このドキュメントは、GitHub Actions を使用して GTFS データを Cloudflare KV に自動的にアップロードする仕組みを説明します。

## 自動更新の仕組み

### トリガー条件

以下のいずれかの条件で自動的にワークフローが実行されます：

1. **main ブランチへの push** で以下のファイルが変更された場合：
   - `data/saga-current.zip` - GTFSデータファイル
   - `scripts/preprocess-gtfs.js` - 前処理スクリプト
   - `scripts/upload_to_kv.js` - KVアップロードスクリプト

2. **手動実行**（workflow_dispatch）
   - GitHub リポジトリの Actions タブから手動で実行可能

### 実行内容

ワークフローは以下の処理を自動的に実行します：

1. **GTFS データの前処理**
   - `data/saga-current.zip` を展開
   - JSON形式に変換
   - `stop_times_by_trip` インデックスを生成
   - 25MB制限を考慮してファイルを分割
   - `data/processed/` に出力

2. **Cloudflare KV へのアップロード**
   - タイムスタンプベースのバージョン番号を生成
   - 各テーブルを `gtfs:v{version}:{table_name}` キーでKVに保存
   - `gtfs:current_version` を更新
   - 古いバージョンを自動削除（最新2世代のみ保持）

3. **アップロード確認**
   - バージョン一覧を表示して正常性を確認

## 必要なシークレットの設定

### GitHub リポジトリでのシークレット設定手順

1. GitHubリポジトリのページを開く
2. **Settings** タブをクリック
3. 左サイドバーの **Secrets and variables** → **Actions** をクリック
4. **New repository secret** をクリック
5. 以下の3つのシークレットを追加

### 必要なシークレット一覧

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare アカウントID | Cloudflare ダッシュボード → 右サイドバーのアカウントIDをコピー |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API トークン | 下記「API トークンの作成」を参照 |
| `KV_NAMESPACE_ID` | KV Namespace ID | `wrangler.toml` に記載（`3ae3f515d413458d913a9be942fdf056`）または Cloudflare ダッシュボードで確認 |

### API トークンの作成

Cloudflare ダッシュボードで API トークンを作成します：

1. Cloudflare ダッシュボードにログイン
2. 右上のアイコン → **My Profile** をクリック
3. 左サイドバーの **API Tokens** をクリック
4. **Create Token** をクリック
5. **Custom token** の **Get started** をクリック
6. 以下の設定でトークンを作成：

#### トークンの設定

**トークン名:**
```
saga-bus-navigator-github-actions
```

**必要な権限（Permissions）:**

| リソースタイプ | 権限レベル | スコープ |
|--------------|-----------|---------|
| Account | Workers KV Storage | Edit |

または、より詳細に設定する場合：

- **Account Resources** → **Account** → 該当のアカウントを選択
- **Permissions:**
  - `Workers KV Storage` → **Edit**

**IP アドレス制限（オプション）:**
- GitHub Actions の IP アドレス範囲を制限することも可能ですが、GitHub の IP は動的なため推奨しません

**TTL（有効期限）:**
- 必要に応じて設定（推奨: 1年間、定期的に更新）

7. **Continue to summary** → **Create Token** をクリック
8. 表示されたトークンをコピー（**このトークンは一度しか表示されません！**）
9. GitHub リポジトリのシークレット `CLOUDFLARE_API_TOKEN` にトークンを設定

### セキュリティのベストプラクティス

- **トークンは絶対にコミットしない**
  - シークレットは GitHub の Secrets 機能でのみ管理
  - `.env` ファイルなどに記載しない
- **最小権限の原則**
  - トークンには KV への書き込み権限のみを付与
  - 他のリソースへのアクセスは許可しない
- **定期的なローテーション**
  - 年に1回程度、トークンを再作成して更新
- **トークンの漏洩時**
  - 即座にトークンを無効化
  - 新しいトークンを作成してシークレットを更新

## 運用フロー

### 通常のデータ更新

1. **最新の GTFS データをダウンロード**
   ```bash
   # 佐賀市オープンデータポータルからダウンロード
   # https://www.city.saga.lg.jp/main/94.html
   ```

2. **データを配置**
   ```bash
   cp ~/Downloads/saga-YYYYMMDD.zip data/saga-current.zip
   ```

3. **Git にコミット＆プッシュ**
   ```bash
   git add data/saga-current.zip
   git commit -m "Update GTFS data to YYYYMMDD"
   git push origin main
   ```

4. **GitHub Actions が自動実行**
   - GitHub リポジトリの **Actions** タブで実行状況を確認
   - 成功すると、最新データが Cloudflare KV に反映されます

### 手動実行

スクリプトを変更した場合など、データファイルを変更せずにアップロードし直したい場合：

1. GitHub リポジトリの **Actions** タブを開く
2. 左サイドバーの **Update GTFS Data in KV** をクリック
3. **Run workflow** ボタンをクリック
4. ブランチを選択（通常は `main`）
5. **Run workflow** をクリック

### トラブルシューティング

#### ワークフローが失敗する場合

**症状:** GitHub Actions のワークフローが失敗する

**確認事項:**

1. **シークレットが正しく設定されているか確認**
   - Settings → Secrets and variables → Actions で3つのシークレットが登録されているか確認

2. **API トークンの権限を確認**
   - Cloudflare ダッシュボード → My Profile → API Tokens
   - トークンに `Workers KV Storage: Edit` 権限があるか確認

3. **KV Namespace ID が正しいか確認**
   - `wrangler.toml` の `id` と一致しているか確認
   - または Cloudflare ダッシュボードで確認

4. **エラーログを確認**
   - GitHub Actions のログで詳細なエラーメッセージを確認
   - `Preprocess GTFS data` ステップが失敗 → GTFSファイルの形式を確認
   - `Upload to Cloudflare KV` ステップが失敗 → シークレットとAPI権限を確認

#### ロールバックが必要な場合

問題のあるデータがアップロードされた場合、ローカルでロールバックスクリプトを実行できます：

```bash
# 環境変数を設定
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"
export KV_NAMESPACE_ID="your-kv-namespace-id"

# ロールバック実行
node scripts/rollback.js
```

詳細は [KV_UPLOAD_SCRIPTS.md](KV_UPLOAD_SCRIPTS.md#2-rollbackjs) を参照してください。

## Cloudflare Pages との関係

### デプロイフロー

1. **GitHub Actions による KV 更新**（このワークフロー）
   - GTFS データを前処理
   - Cloudflare KV にアップロード

2. **Cloudflare Pages による自動デプロイ**（別プロセス）
   - main ブランチへの push で自動実行
   - フロントエンドコードをビルド＆デプロイ
   - Pages Functions (API) をデプロイ

両者は独立して動作し、互いに影響を与えません：
- KV のデータ更新は Pages のデプロイをトリガーしません
- Pages のデプロイは KV のデータに影響しません

### API からのデータ参照

Pages Functions の API エンドポイント（`/api/routes/search` など）は、常に `gtfs:current_version` キーを参照して最新のデータバージョンを取得します。

そのため、KV のデータが更新されると、**再デプロイ不要で即座に新しいデータが API から返されます**。

## バージョン管理

### バージョン番号の形式

```
YYYYMMDDHHmmss
```

例: `20261017133000` = 2026年10月17日 13時30分00秒

### 世代管理

- **保持世代数:** 最新2世代
- **自動削除:** 新しいバージョンをアップロードすると、2世代以前のバージョンが自動的に削除されます

例：
1. 初回アップロード: v1のみ保持
2. 2回目アップロード: v2, v1を保持
3. 3回目アップロード: v3, v2を保持（v1は自動削除）

### KV キー構造

```
gtfs:v{version}:stops
gtfs:v{version}:routes
gtfs:v{version}:trips
gtfs:v{version}:stop_times_by_trip_0
gtfs:v{version}:stop_times_by_trip_1
gtfs:v{version}:calendar
gtfs:v{version}:agency
...

gtfs:current_version  → バージョン番号（例: 20261017133000）
```

## 関連ドキュメント

- [KVアップロードスクリプト](KV_UPLOAD_SCRIPTS.md) - upload_to_kv.js の詳細
- [GTFS前処理](GTFS_PREPROCESSING.md) - preprocess-gtfs.js の詳細
- [KV統合ドキュメント](KV_INTEGRATION.md) - KV の基本的な使い方
- [運用手順書](deployment/KV_DEPLOYMENT.md) - デプロイの全体フロー
