# GTFS JSON データディレクトリ

このディレクトリには、GTFS ZIPファイルから変換されたJSON形式のデータが保存されます。

## ファイル一覧

### 標準GTFSテーブル

- `stops.json` - バス停情報
- `routes.json` - 路線情報
- `trips.json` - 便情報
- `calendar.json` - 運行カレンダー
- `agency.json` - 事業者情報
- `fare_attributes.json` - 運賃情報

### 分割ファイル

大きなデータ（25MB超）は自動的に複数のチャンクに分割されます：

- `stop_times_0.json` - 時刻表データ（チャンク0）
- `stop_times_1.json` - 時刻表データ（チャンク1）
- `stop_times_2.json` - 時刻表データ（チャンク2）

### メタデータ

- `metadata.json` - 変換処理の情報（ソースファイル、処理日時、分割情報など）

## データ生成方法

```bash
# GTFS ZIPファイルからJSON形式に変換
node scripts/gtfs_to_json.js data/saga-current.zip ./gtfs-json
```

## 注意事項

- このディレクトリのファイルは自動生成されます
- 手動で編集しないでください
- Cloudflare KVへのアップロード用に最適化されています
- 各ファイルは20MB以下に制限されています（KVの25MB制限に対応）
