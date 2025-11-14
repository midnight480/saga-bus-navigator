# 佐賀市内バスナビゲーター ファイル構成

## 📁 ディレクトリ構成

```
saga-bus-navigator/
├── data/                    # データディレクトリ
│   ├── master/             # マスタデータ（バス停・路線）
│   ├── timetable/          # 時刻表データ
│   ├── transfer/           # 乗り換えデータ
│   └── fare/               # 運賃データ
├── REQUIREMENT.md          # 要件定義
├── NAVIGATION_COMPLETE.md  # システム完成ドキュメント
└── FILES_STRUCTURE.md      # このファイル
```

## 📊 データファイル

### data/master/ - マスタデータ
- `bus_stop.csv` (5.1KB) - バス停マスタ（110件、緯度経度付き）
- `bus_route_saga-city.csv` (4.4KB) - 佐賀市営バス路線情報
- `bus_route_yutoku.csv` (2.4KB) - 祐徳バス路線情報
- `bus_route_nishitetsu.csv` (508B) - 西鉄バス路線情報

### data/timetable/ - 時刻表データ

**メイン**
- `timetable_all_complete.csv` (84KB) - **統合時刻表（全1,064件）**
  - 佐賀市営バス、祐徳バス、西鉄バスすべて含む
  - ナビゲーションシステムのメインデータ

**詳細**
- `timetable_complete_with_stops.csv` (43KB) - 佐賀市営バス詳細（714件）
- `timetable_yutoku_complete.csv` (18KB) - 祐徳バス詳細（246件）
- `timetable_nishitetsu_complete.csv` (8.7KB) - 西鉄バス詳細（104件）

### data/transfer/ - 乗り換えデータ
- `transfer_info.csv` (436B) - 乗り換え情報（4箇所）
- `walking_transfer.csv` (140B) - 徒歩乗り換え（2箇所）

### data/fare/ - 運賃データ
- `fare_info.csv` (563B) - 運賃表（距離帯別）
- `fare_major_routes.csv` (569B) - 主要区間運賃（10件）

## 📄 ドキュメント

- `REQUIREMENT.md` - プロジェクト要件定義（実装状況含む）
- `NAVIGATION_COMPLETE.md` - システム完成ドキュメント
- `FILES_STRUCTURE.md` - このファイル（ファイル構成説明）

## 📊 データ統計

- **運行会社**: 3社
- **路線数**: 16路線
- **バス停数**: 110件（マスタ）/ 34件（時刻表あり）
- **便数**: 296便
- **時刻データ**: 1,064件
- **乗り換え箇所**: 4箇所
- **総データサイズ**: 約180KB（全CSVファイル）

## 📂 元データについて

元データ（PDF、HTML）は既にCSVに抽出済みのため削除されています。
必要に応じて以下から再取得可能：
- 佐賀市営バス: http://www.bus.saga.saga.jp/
- 祐徳バス: https://www.yutoku.jp/jikoku/
- 西鉄バス: https://www.nishitetsu.jp/bus/

## 🎯 使用方法

### メインデータ（ナビゲーションシステム構築用）
以下の4ファイルを使用：
1. `data/master/bus_stop.csv` - バス停位置
2. `data/timetable/timetable_all_complete.csv` - 時刻表
3. `data/transfer/transfer_info.csv` - 乗り換え情報
4. `data/fare/fare_major_routes.csv` - 運賃情報

### 詳細データ（会社別分析用）
- `data/timetable/timetable_complete_with_stops.csv`
- `data/timetable/timetable_yutoku_complete.csv`
- `data/timetable/timetable_nishitetsu_complete.csv`
