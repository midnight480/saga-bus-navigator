# データディレクトリ構成

## 📁 フォルダ構成

```
data/
├── master/          # マスタデータ
├── timetable/       # 時刻表データ
├── transfer/        # 乗り換えデータ
└── fare/            # 運賃データ
```

## 📊 各フォルダの詳細

### master/ - マスタデータ
基本的なバス停・路線情報

- `bus_stop.csv` (5.1KB) - バス停マスタ（110件、緯度経度付き）
- `bus_route_saga-city.csv` (4.4KB) - 佐賀市営バス路線
- `bus_route_yutoku.csv` (2.4KB) - 祐徳バス路線
- `bus_route_nishitetsu.csv` (508B) - 西鉄バス路線

### timetable/ - 時刻表データ
バスの運行時刻情報

- `timetable_all_complete.csv` (84KB) - **統合時刻表（全1,064件）**
  - 3社すべての時刻表を統合
  - ナビゲーションシステムのメインデータ
- `timetable_complete_with_stops.csv` (43KB) - 佐賀市営バス詳細（714件）
- `timetable_yutoku_complete.csv` (18KB) - 祐徳バス詳細（246件）
- `timetable_nishitetsu_complete.csv` (8.7KB) - 西鉄バス詳細（104件）

### transfer/ - 乗り換えデータ
バス停間の乗り換え情報

- `transfer_info.csv` (436B) - 乗り換え可能バス停（4箇所）
- `walking_transfer.csv` (140B) - 徒歩乗り換え（2箇所）

### fare/ - 運賃データ
運賃情報

- `fare_info.csv` (563B) - 距離帯別運賃表（14件）
- `fare_major_routes.csv` (569B) - 主要区間運賃（10件）

## 🎯 使用方法

### 基本的なナビゲーション機能
以下の4ファイルを使用：
1. `master/bus_stop.csv` - バス停位置
2. `timetable/timetable_all_complete.csv` - 時刻表
3. `transfer/transfer_info.csv` - 乗り換え情報
4. `fare/fare_major_routes.csv` - 運賃情報

### 詳細分析
会社別の詳細データが必要な場合：
- `timetable/timetable_complete_with_stops.csv`
- `timetable/timetable_yutoku_complete.csv`
- `timetable/timetable_nishitetsu_complete.csv`
