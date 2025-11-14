# 技術スタック

## データ形式
- **CSV**: 全データをCSV形式で管理
- **文字エンコーディング**: UTF-8
- **総データサイズ**: 約180KB

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
- バス停IDは一意
- 路線IDは事業者プレフィックス付き（例: `SAGA-2`, `Y-MORAGE`, `N-FUKUOKA`）
- 時刻は24時間表記（HH:MM形式）
- 曜日区分: 平日/土日祝/特殊ダイヤ

## 共通コマンド

現時点ではアプリケーションコードが未実装のため、データ操作のみ。

### データ確認
```bash
# CSVファイルの行数確認
wc -l data/**/*.csv

# 特定のバス停を検索
grep "佐賀駅" data/master/bus_stop.csv

# 時刻表データの確認
head -n 10 data/timetable/timetable_all_complete.csv
```

### データ統計
```bash
# バス停数
wc -l < data/master/bus_stop.csv

# 時刻データ数
wc -l < data/timetable/timetable_all_complete.csv
```
