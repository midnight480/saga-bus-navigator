# 佐賀市内バスナビゲーター ファイル構成

## 📁 ディレクトリ構成

```
saga-bus-navigator/
├── docs/                           # ドキュメント
│   ├── deployment/                # デプロイメント関連
│   │   ├── DEPLOYMENT.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── DEPLOYMENT_READY.md
│   │   ├── DEPLOYMENT_STATUS.md
│   │   ├── POST_DEPLOYMENT_VERIFICATION.md
│   │   └── QUICKSTART_DEPLOY.md
│   ├── data_sync_report.md
│   ├── FILES_STRUCTURE.md         # このファイル
│   ├── GTFS_MIGRATION.md
│   ├── NAVIGATION_COMPLETE.md
│   ├── PR_DESCRIPTION.md
│   ├── REQUIREMENT.md
│   ├── RESPONSIVE_DESIGN.md
│   └── SECURITY.md
├── scripts/                        # スクリプト
│   ├── gtfs_loader.py
│   ├── sync_open_data.py
│   ├── update_gtfs.sh
│   └── verify-deployment-ready.sh
├── tests/                          # テスト
│   ├── data-loader.test.js
│   ├── search.test.js
│   ├── security.test.js
│   ├── utils.test.js
│   ├── test-data-loader.html
│   ├── test-responsive.html
│   ├── test-search-controller.js
│   ├── test-search-results.html
│   ├── test-utils-node.js
│   └── test-utils.html
├── e2e/                            # E2Eテスト
│   ├── search.spec.js
│   ├── test-app-initialization.spec.js
│   ├── test-bus-stop-search.spec.js
│   ├── test-data-loader.spec.js
│   └── test-time-selection.spec.js
├── data/                           # データディレクトリ
│   ├── master/                    # マスタデータ（バス停・路線）
│   ├── timetable/                 # 時刻表データ
│   ├── transfer/                  # 乗り換えデータ
│   └── fare/                      # 運賃データ
├── css/                            # スタイルシート
│   └── app.css
├── js/                             # JavaScriptファイル
│   ├── app.js
│   ├── data-loader.js
│   └── utils.js
├── icons/                          # アイコンファイル
├── .kiro/                          # Kiro設定
│   ├── specs/                     # 仕様書
│   └── steering/                  # ステアリングルール
├── index.html                      # メインHTML
├── manifest.json                   # PWA設定
├── package.json                    # npm設定
├── README.md                       # プロジェクト概要
└── _headers                        # セキュリティヘッダー
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

### docs/ - プロジェクトドキュメント
- `REQUIREMENT.md` - プロジェクト要件定義（実装状況含む）
- `NAVIGATION_COMPLETE.md` - システム完成ドキュメント
- `FILES_STRUCTURE.md` - このファイル（ファイル構成説明）
- `GTFS_MIGRATION.md` - GTFS形式への移行ガイド
- `RESPONSIVE_DESIGN.md` - レスポンシブデザイン仕様
- `SECURITY.md` - セキュリティ対策ドキュメント
- `PR_DESCRIPTION.md` - プルリクエスト説明
- `data_sync_report.md` - データ同期レポート

### docs/deployment/ - デプロイメント関連
- `DEPLOYMENT.md` - デプロイ手順
- `DEPLOYMENT_CHECKLIST.md` - デプロイチェックリスト
- `DEPLOYMENT_READY.md` - デプロイ準備完了確認
- `DEPLOYMENT_STATUS.md` - デプロイ状況
- `POST_DEPLOYMENT_VERIFICATION.md` - デプロイ後検証
- `QUICKSTART_DEPLOY.md` - クイックスタートガイド

## 🔧 スクリプト

### scripts/ - 実行スクリプト
- `gtfs_loader.py` - GTFSデータローダー
- `sync_open_data.py` - オープンデータ同期スクリプト
- `update_gtfs.sh` - GTFS更新スクリプト
- `verify-deployment-ready.sh` - デプロイ準備確認スクリプト

## 🧪 テスト

### tests/ - 単体テスト
- `data-loader.test.js` - データローダーのテスト
- `search.test.js` - 検索機能のテスト
- `security.test.js` - セキュリティのテスト
- `utils.test.js` - ユーティリティのテスト
- `test-*.html` - ブラウザテスト用HTMLファイル
- `test-*.js` - テスト用JavaScriptファイル

### e2e/ - E2Eテスト
- `search.spec.js` - 検索機能のE2Eテスト
- `test-app-initialization.spec.js` - アプリ初期化のテスト
- `test-bus-stop-search.spec.js` - バス停検索のテスト
- `test-data-loader.spec.js` - データローダーのテスト
- `test-time-selection.spec.js` - 時刻選択のテスト

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
