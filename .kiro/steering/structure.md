# プロジェクト構成

## ディレクトリ構造

```
saga-bus-navigator/
├── data/                           # データディレクトリ
│   ├── master/                     # マスタデータ
│   │   ├── bus_stop.csv           # バス停マスタ（110件、緯度経度付き）
│   │   ├── bus_route_saga-city.csv # 佐賀市営バス路線（28路線）
│   │   ├── bus_route_yutoku.csv    # 祐徳バス路線（15路線）
│   │   └── bus_route_nishitetsu.csv # 西鉄バス路線（3路線）
│   ├── timetable/                  # 時刻表データ
│   │   ├── timetable_all_complete.csv # 統合時刻表（1,064件）★メイン
│   │   ├── timetable_complete_with_stops.csv # 佐賀市営バス詳細
│   │   ├── timetable_yutoku_complete.csv # 祐徳バス詳細
│   │   └── timetable_nishitetsu_complete.csv # 西鉄バス詳細
│   ├── transfer/                   # 乗り換えデータ
│   │   ├── transfer_info.csv      # 乗り換え可能バス停（4箇所）
│   │   └── walking_transfer.csv   # 徒歩乗り換え（2箇所）
│   └── fare/                       # 運賃データ
│       ├── fare_info.csv          # 距離帯別運賃表（14件）
│       └── fare_major_routes.csv  # 主要区間運賃（10件）
├── REQUIREMENT.md                  # 要件定義書
├── NAVIGATION_COMPLETE.md          # システム完成ドキュメント
└── FILES_STRUCTURE.md              # ファイル構成説明
```

## データファイルの役割

### メインデータ（ナビゲーション機能に必須）
1. `data/master/bus_stop.csv` - バス停位置情報
2. `data/timetable/timetable_all_complete.csv` - 統合時刻表
3. `data/transfer/transfer_info.csv` - 乗り換え情報
4. `data/fare/fare_major_routes.csv` - 運賃情報

### 詳細データ（会社別分析用）
- 各事業者の詳細時刻表
- 路線マスタ（事業者別）

## ファイル命名規則

### CSVファイル
- スネークケース使用（例: `bus_stop.csv`, `timetable_all_complete.csv`）
- 事業者プレフィックス: `saga-city`, `yutoku`, `nishitetsu`

### ドキュメント
- 大文字スネークケース（例: `REQUIREMENT.md`, `FILES_STRUCTURE.md`）
- 日本語ファイル名は使用しない

## データ整合性の原則

- バス停IDは`bus_stop.csv`で定義されたものを使用
- 路線IDは各`bus_route_*.csv`で定義されたものを使用
- 時刻表の`stop_id`と`route_id`は必ずマスタに存在すること
- 乗り換え情報の`from_stop_id`と`to_stop_id`は必ずバス停マスタに存在すること
