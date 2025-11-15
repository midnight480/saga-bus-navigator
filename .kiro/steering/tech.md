# 技術スタック

## データ形式
- **GTFS**: General Transit Feed Specification標準形式
- **ファイル形式**: ZIP圧縮されたCSVファイル群
- **文字エンコーディング**: UTF-8
- **データサイズ**: 約35MB（圧縮後）
- **データ処理**: JSZipライブラリを使用してブラウザ上で解凍・パース

## 地図・位置情報
- **地図表示**: OpenStreetMap（Google Maps非依存）
- **座標系**: 緯度・経度（WGS84）
- **時刻取得**: ntp.nict.jp（正確な時刻基準）

## PWA対応
- オフライン機能
- ホーム画面への追加対応
- Service Worker実装
- 自動アップデート機能

## データ構造の原則
- **GTFS標準準拠**: stops.txt, stop_times.txt, routes.txt, trips.txt, calendar.txt, agency.txt, fare_attributes.txtを使用
- **バス停ID**: stop_idで一意に識別（GTFS標準）
- **路線ID**: route_idで識別（GTFS標準）
- **時刻表現**: HH:MM:SS形式（24時間表記、GTFS標準）
- **曜日区分**: calendar.txtのservice_idとmonday-sundayフラグで管理
- **データ変換**: GTFSデータを既存アプリケーション形式に変換してメモリキャッシュ

## 共通コマンド

### GTFSデータの管理

```bash
# GTFSファイルの確認
ls -lh data/saga-*.zip

# GTFSファイルの内容確認（解凍せずに）
unzip -l data/saga-current.zip

# GTFSファイルから特定のファイルを抽出
unzip -p data/saga-current.zip stops.txt | head -n 10

# 最新のGTFSデータを取得（佐賀市オープンデータポータルから）
# 手動でダウンロードして./dataディレクトリに配置
```

### データ確認

```bash
# バス停データの確認
unzip -p data/saga-current.zip stops.txt | grep "佐賀駅"

# 路線データの確認
unzip -p data/saga-current.zip routes.txt | head -n 10

# 時刻表データの確認
unzip -p data/saga-current.zip stop_times.txt | head -n 10

# カレンダー情報の確認
unzip -p data/saga-current.zip calendar.txt
```

### データ統計

```bash
# バス停数（ヘッダー行を除く）
unzip -p data/saga-current.zip stops.txt | wc -l

# 時刻データ数
unzip -p data/saga-current.zip stop_times.txt | wc -l

# 路線数
unzip -p data/saga-current.zip routes.txt | wc -l

# 便数
unzip -p data/saga-current.zip trips.txt | wc -l
```

### データ更新

```bash
# 新しいGTFSデータを配置
cp ~/Downloads/saga-2025-12-01.zip data/

# 現在のデータとして設定
cp data/saga-2025-12-01.zip data/saga-current.zip

# または、スクリプトを使用して自動更新
./scripts/update_gtfs.sh
```

### テスト実行

```bash
# 単体テストを実行
npm test

# E2Eテストを実行
npm run test:e2e

# データローダーのテストのみ実行
npm test data-loader
```
