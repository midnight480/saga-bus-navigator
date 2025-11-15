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
├── data/                           # データディレクトリ（GTFS形式）
│   ├── saga-current.zip           # 現在のGTFSデータ（推奨）
│   ├── saga-2025-12-01.zip        # 未来のGTFSデータ（オプション）
│   ├── saga-2025-10-01.zip        # アーカイブデータ（オプション）
│   └── README.md                  # データディレクトリの説明
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

### GTFSデータ（GTFS標準形式）

アプリケーションは`./data`ディレクトリ内のGTFS ZIPファイルを自動的に検出して読み込みます。

#### ファイル選択の優先順位

1. **saga-current.zip**（推奨）
   - 現在有効なGTFSデータ
   - 存在する場合は常にこのファイルが使用される
   - データ更新時はこのファイルを置き換える

2. **saga-YYYY-MM-DD.zip**
   - 日付付きGTFSデータ
   - 複数存在する場合は最新の日付のファイルが使用される
   - 過去データや未来データの保持に使用

#### GTFS ZIPファイルの内容

各ZIPファイルには以下のGTFS標準ファイルが含まれます：

- **stops.txt**: バス停情報（stop_id, stop_name, stop_lat, stop_lon等）
- **stop_times.txt**: 各便の停車時刻（trip_id, arrival_time, departure_time, stop_id等）
- **routes.txt**: 路線情報（route_id, route_long_name, agency_id等）
- **trips.txt**: 便情報（trip_id, route_id, service_id, trip_headsign等）
- **calendar.txt**: 運行カレンダー（service_id, 曜日フラグ等）
- **agency.txt**: 事業者情報（agency_id, agency_name等）
- **fare_attributes.txt**: 運賃情報（fare_id, price等）
- **feed_info.txt**: データセット情報（バージョン、公開日等）

#### データ処理フロー

1. アプリケーション起動時に`./data`ディレクトリをスキャン
2. 優先順位に従ってGTFS ZIPファイルを選択
3. JSZipライブラリでZIPファイルを解凍
4. 各GTFSファイルをパースしてメモリにキャッシュ
5. GTFS形式から既存アプリケーション形式に変換
6. 検索機能で使用

### ドキュメント
- `docs/` - プロジェクトドキュメント（要件定義、設計、デプロイ手順など）
- `docs/deployment/` - デプロイメント関連ドキュメント

### スクリプト
- `scripts/` - データ同期、GTFS更新、デプロイ検証などのスクリプト

### テスト
- `tests/` - 単体テスト（Vitest）
- `e2e/` - E2Eテスト（Playwright）

## ファイル命名規則

### GTFSファイル
- **推奨**: `saga-current.zip` - 現在有効なデータ
- **日付付き**: `saga-YYYY-MM-DD.zip` - 特定日付のデータ
- **GTFS内部ファイル**: GTFS標準に準拠（stops.txt, routes.txt等）

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

### GTFS標準準拠

- **stops.txt**: バス停IDは`stop_id`で一意に識別
- **routes.txt**: 路線IDは`route_id`で一意に識別
- **trips.txt**: 便IDは`trip_id`で一意に識別
- **stop_times.txt**: `trip_id`と`stop_id`は必ず対応するマスタに存在
- **calendar.txt**: `service_id`で運行カレンダーを管理
- **参照整合性**: 全ての外部キー参照は対応するマスタレコードが存在すること

### データ変換

- GTFSデータは読み込み時に既存アプリケーション形式に変換
- 変換後のデータはメモリにキャッシュされ、検索機能で使用
- キャッシュは`DataLoader.clearCache()`で明示的にクリア可能
