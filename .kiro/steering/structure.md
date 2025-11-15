# プロジェクト構成

## ディレクトリ構造

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
│   ├── FILES_STRUCTURE.md         # ファイル構成説明
│   ├── GTFS_MIGRATION.md
│   ├── NAVIGATION_COMPLETE.md     # システム完成ドキュメント
│   ├── PR_DESCRIPTION.md
│   ├── REQUIREMENT.md             # 要件定義書
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

## データファイルの役割

### メインデータ（ナビゲーション機能に必須）
1. `data/master/bus_stop.csv` - バス停位置情報
2. `data/timetable/timetable_all_complete.csv` - 統合時刻表
3. `data/transfer/transfer_info.csv` - 乗り換え情報
4. `data/fare/fare_major_routes.csv` - 運賃情報

### 詳細データ（会社別分析用）
- 各事業者の詳細時刻表
- 路線マスタ（事業者別）

### ドキュメント
- `docs/` - プロジェクトドキュメント（要件定義、設計、デプロイ手順など）
- `docs/deployment/` - デプロイメント関連ドキュメント

### スクリプト
- `scripts/` - データ同期、GTFS更新、デプロイ検証などのスクリプト

### テスト
- `tests/` - 単体テスト（Vitest）
- `e2e/` - E2Eテスト（Playwright）

## ファイル命名規則

### CSVファイル
- スネークケース使用（例: `bus_stop.csv`, `timetable_all_complete.csv`）
- 事業者プレフィックス: `saga-city`, `yutoku`, `nishitetsu`

### ドキュメント
- 大文字スネークケース（例: `REQUIREMENT.md`, `FILES_STRUCTURE.md`）
- 日本語ファイル名は使用しない
- README.mdを除き、全てのドキュメントは`docs/`ディレクトリに配置
- デプロイメント関連は`docs/deployment/`サブディレクトリに配置

### スクリプト
- スネークケース使用（例: `gtfs_loader.py`, `update_gtfs.sh`）
- 全てのスクリプトは`scripts/`ディレクトリに配置
- シェルスクリプトには実行権限を付与

### テスト
- テストファイルは`tests/`または`e2e/`ディレクトリに配置
- 単体テストは`tests/`、E2Eテストは`e2e/`に配置

## データ整合性の原則

- バス停IDは`bus_stop.csv`で定義されたものを使用
- 路線IDは各`bus_route_*.csv`で定義されたものを使用
- 時刻表の`stop_id`と`route_id`は必ずマスタに存在すること
- 乗り換え情報の`from_stop_id`と`to_stop_id`は必ずバス停マスタに存在すること
