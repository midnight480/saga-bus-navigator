# GTFSデータの事前処理ガイド

## 概要

このアプリケーションでは、GTFS ZIPファイルを事前に展開してJSONファイルに変換することで、ブラウザ側でのZIP展開のオーバーヘッドを削減し、高速なデータ読み込みを実現しています。

## 動作原理

### 従来の方法（ZIP展開方式）
1. ブラウザがZIPファイルをダウンロード
2. JSZipでZIPファイルを解凍
3. CSVファイルをパース
4. データを変換

**問題点**: 毎回のアクセスでZIP展開が必要で、処理時間がかかる

### 新しい方法（事前処理方式）
1. **ビルド時**: ZIPファイルを展開してJSONファイルに変換（1回のみ）
2. **ブラウザ**: JSONファイルを直接読み込み（高速）

**利点**: 
- ZIP展開のオーバーヘッドを削減
- 並列読み込みで高速化
- ブラウザ側の処理が軽量

## 使用方法

### 1. 開発サーバー起動時（自動実行）

開発サーバーを起動すると、自動的にZIPファイルからJSONファイルを生成します：

```bash
npm run dev
# または
npx wrangler pages dev . --port 8788
```

**動作**:
- `data/saga-current.zip` または `data/saga-YYYY-MM-DD.zip` を自動検索
- ZIPファイルが見つかった場合、自動的にJSONファイルを生成
- ZIPファイルが見つからない場合、既存のJSONファイルを使用（警告のみ）

### 2. 手動での事前処理実行

必要に応じて、手動で事前処理を実行することもできます：

```bash
# デフォルト設定で実行（data/saga-current.zip → data/processed/）
npm run preprocess

# カスタムパスを指定
npm run preprocess:force
# または
node scripts/preprocess-gtfs.js [dataDir] [outputDir]

# 警告モード（ZIPファイルがなくてもエラー終了しない）
node scripts/preprocess-gtfs.js --silent
```

### 2. 生成されるファイル

`data/processed/`ディレクトリに以下のJSONファイルが生成されます：

- `stops.json` - バス停データ
- `routes.json` - 路線データ
- `trips.json` - 運行データ
- `stop_times.json` - 時刻表データ
- `calendar.json` - カレンダーデータ
- `agency.json` - 事業者データ
- `fare_attributes.json` - 運賃データ（オプショナル）
- `fare_rules.json` - 運賃ルールデータ（オプショナル）
- `feed_info.json` - フィード情報（オプショナル）
- `metadata.json` - メタデータ

### 3. データ読み込みの動作

アプリケーションは以下の順序でデータを読み込みます：

1. **事前処理済みJSONファイルをチェック**
   - `data/processed/metadata.json`の存在を確認
   - 存在する場合、JSONファイルから読み込み（高速）

2. **JSONファイルがない場合**
   - ZIPファイルから読み込み（従来の方法、後方互換性）

## デプロイ時の注意点

### Git管理について

- **ZIPファイル**: Gitにコミットされます（ソースデータとして管理）
  - `data/saga-current.zip` は佐賀が公開しているGTFSデータ（1つのみ）
  - このZIPファイルをGitで管理

- **JSONファイル**: `.gitignore`に含まれており、Gitにコミットされません
  - `data/processed/`ディレクトリ内のJSONファイルはビルド時に生成されるため除外
  - デプロイ時に自動的に生成される

### Cloudflare Pagesでのデプロイ

1. **ZIPファイルをコミット**
   ```bash
   git add data/saga-current.zip
   git commit -m "Update GTFS ZIP file"
   git push
   ```

2. **ビルド時に自動処理**
   - Cloudflare Pagesのビルド時に`npm run preprocess`を実行
   - または、デプロイ前にローカルで`npm run preprocess`を実行してJSONファイルを生成

3. **自動デプロイ**
   - Cloudflare Pagesが自動的にデプロイ
   - ビルド時に生成された`data/processed/`ディレクトリが静的ファイルとして配信される
   - ZIPファイルも静的ファイルとして配信される（フォールバック用）


## パフォーマンス比較

### ZIP展開方式
- 初回読み込み: 約3-5秒
- ZIP展開: 約1-2秒
- CSVパース: 約1-2秒
- 合計: 約5-9秒

### 事前処理方式
- 初回読み込み: 約1-2秒
- JSONパース: 約0.5-1秒
- 合計: 約1.5-3秒

**改善率: 約50-70%の高速化**

## トラブルシューティング

### JSONファイルが読み込まれない

1. **事前処理が実行されているか確認**
   ```bash
   ls -la data/processed/
   ```

2. **metadata.jsonの存在確認**
   ```bash
   cat data/processed/metadata.json
   ```

3. **ブラウザのコンソールで確認**
   - 開発者ツールのコンソールでエラーメッセージを確認
   - ネットワークタブでJSONファイルの読み込み状況を確認

### ZIPファイルから読み込まれる

- JSONファイルが存在しない場合、自動的にZIPファイルから読み込みます
- これは正常な動作です（後方互換性）

### データが古い

1. **新しいZIPファイルをダウンロードして配置**
   ```bash
   # 佐賀が公開している最新のZIPファイルをdata/saga-current.zipに配置
   ```

2. **ZIPファイルをコミット**
   ```bash
   git add data/saga-current.zip
   git commit -m "Update GTFS ZIP file"
   git push
   ```

3. **事前処理を再実行（ローカル開発時）**
   ```bash
   npm run preprocess
   # JSONファイルは自動生成される（Gitには含まれない）
   ```

## 関連ファイル

- `scripts/preprocess-gtfs.js` - 事前処理スクリプト
- `js/data-loader.js` - データローダー（JSON/ZIP両対応）
- `data/processed/` - 生成されたJSONファイルの保存先

