# GTFS形式への移行ガイド

## 現状
- `./data/` - 独自形式（CSV）、手動メンテナンス
- `./open_data/` - GTFS標準形式、公式データ

## 移行方針

### 1. GTFSデータの配置
```
./gtfs/
├── current/          # 現在有効なダイヤ
└── archive/          # 過去のダイヤ（必要に応じて）
```

### 2. データ更新フロー
```bash
# 新しいダイヤデータをダウンロード
wget http://opendata.sagabus.info/saga-YYYY-MM-DD.zip

# 解凍して配置
unzip saga-YYYY-MM-DD.zip -d ./gtfs/current/

# アプリケーション再起動（自動的に新データを読み込み）
```

### 3. 使用方法

#### Python
```python
from gtfs_loader import GTFSLoader

loader = GTFSLoader('./gtfs/current')

# バス停検索
stops = loader.find_stop('佐賀駅')

# 路線の便を取得
trips = loader.get_route_trips('1ゆめタウン線')

# 便の停車時刻を取得
stop_times = loader.get_trip_stops(trip_id)
```

## 移行手順

### Step 1: GTFSローダーの統合
- [x] `gtfs_loader.py` 作成完了

### Step 2: 既存コードの移行
- [ ] 既存の`./data/`参照を`GTFSLoader`に置き換え
- [ ] バス停検索機能の移行
- [ ] 時刻表検索機能の移行
- [ ] 経路探索機能の移行

### Step 3: ディレクトリ構成の変更
```bash
# 新しい構成
mkdir -p ./gtfs/current
cp -r ./open_data/saga-2025-12-01/* ./gtfs/current/

# 旧データはバックアップとして保持
mv ./data ./data.backup
```

### Step 4: 定期更新の自動化
```bash
# cron等で定期実行
./update_gtfs.sh
```

## メリット
- ✅ 公式データを直接利用（データ品質保証）
- ✅ ダイヤ改正時はzipファイル差し替えのみ
- ✅ 140,000件の詳細な時刻表データ
- ✅ 5事業者のデータを統一的に扱える
- ✅ 標準フォーマットでツール連携が容易

## 注意点
- GTFSデータは2GB程度のメモリを使用
- 初回読み込みに数秒かかる（キャッシュ推奨）
