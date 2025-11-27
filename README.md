# 佐賀バスナビゲーター

佐賀市内を走る複数事業者の路線バスを横断的に検索・表示できるナビゲーションアプリ。

## 🚌 概要

佐賀市内の3つのバス事業者（佐賀市営バス、祐徳バス、西鉄バス）の時刻表データを統合し、出発地から目的地までの直通便を簡単に検索できるWebアプリケーションです。

### 対象事業者

- **佐賀市営バス**: 9路線、714件の時刻データ
- **祐徳バス**: 4路線、246件の時刻データ
- **西鉄バス**: 3路線、104件の時刻データ

## ✨ 主要機能

- 🔍 **バス停検索**: インクリメンタルサーチで素早くバス停を選択
- ⏰ **時刻検索**: 出発時刻指定、到着時刻指定、今すぐ、始発、終電から選択
- 🔄 **双方向検索**: 往路・復路の両方向のバスを検索可能（佐賀駅を降車バス停とした検索にも対応）
- 📊 **検索結果表示**: 出発時刻、到着時刻、所要時間、運賃、行き先を一覧表示
- 💰 **運賃表示**: 大人・子供料金を表示
- 🗺️ **地図表示**: OpenStreetMapでバス停位置と経路を表示（往路・復路を視覚的に区別）
- 📍 **現在地表示**: ワンタップで現在地を地図上に表示
- 🚍 **リアルタイム車両追跡**: 運行中のバスの位置をリアルタイムで地図上に表示
- 📋 **便の時刻表表示**: 車両マーカーをクリックすると、その便の全停車バス停と到着時刻を時刻表形式で表示
- 🗑️ **クリア機能**: 検索結果や地図経路を簡単にクリア
- 📅 **カレンダー登録**: バスの時刻をiCalまたはGoogle Calendarに登録
- 📱 **レスポンシブデザイン**: スマートフォン、タブレット、デスクトップに対応
- 🔒 **セキュリティ**: XSS対策、CSPヘッダー設定済み

## 🚀 デモ

本番環境: https://saga-bus.midnight480.com

## 📖 使い方

### 双方向検索機能

佐賀バスナビゲーターは、往路（例：佐賀駅から目的地へ）と復路（例：目的地から佐賀駅へ）の両方向のバスを検索できます。

#### 機能の特徴

- **自動方向判定**: 乗車バス停と降車バス停を指定すると、システムが自動的に正しい方向のバスを検索
- **行き先表示**: 検索結果に各バスの行き先（trip_headsign）を表示
- **地図上の視覚的区別**: 往路と復路のバス停を地図上で色分けして表示
- **方向選択**: 地図上で特定の方向のバス停のみをハイライト表示可能

#### 使用例

**往路の検索（佐賀駅から目的地へ）**
1. 乗車バス停: 「佐賀駅バスセンター」を選択
2. 降車バス停: 「県庁前」を選択
3. 検索実行 → 佐賀駅から県庁前へ向かうバスが表示されます

**復路の検索（目的地から佐賀駅へ）**
1. 乗車バス停: 「県庁前」を選択
2. 降車バス停: 「佐賀駅バスセンター」を選択
3. 検索実行 → 県庁前から佐賀駅へ向かうバスが表示されます

#### 技術的な仕組み

システムは以下の情報を使用して方向を判定します：

1. **direction_id**: GTFSデータの方向フィールド（0=往路、1=復路）
2. **trip_headsign**: 便の行き先情報
3. **stop_sequence**: バス停の停車順序

これらの情報を組み合わせて、乗車バス停から降車バス停への経路が存在するバスのみを検索結果に表示します。

### 便の時刻表表示機能

リアルタイム車両追跡機能で表示される車両マーカーをクリックすると、その便の詳細な時刻表を確認できます。

#### 表示内容

- **便ID・路線名**: 便を識別する情報と路線名
- **全停車バス停**: 始点から終点までの全てのバス停名
- **到着時刻**: 各バス停への到着予定時刻（HH:MM形式）
- **現在位置**: 現在バスがいる位置を「← 現在地」マーカーで強調表示

#### 時刻表の表示形式

```
時刻表
便ID: trip_456 | 路線: 佐賀駅～大和線

佐賀駅バスセンター（08:00）→ 県庁前（08:05）← 現在地 → 市役所前（08:10）→ ... → 大和温泉病院（08:45）
```

#### 折りたたみ機能

10停車以上の便は、デフォルトで折りたたまれた状態で表示されます。

- **折りたたみ時**: 最初の3停車と最後の3停車のみを表示
- **展開方法**: 「時刻表を表示（全○停車）」リンクをクリック
- **折りたたみ方法**: 「時刻表を折りたたむ」リンクをクリック

#### 利用シーン

- **乗車計画**: どのバス停で乗降できるかを確認
- **所要時間確認**: 目的地までの到着時刻を確認
- **現在位置把握**: バスが今どこにいるかを確認
- **残り停車数確認**: あと何停留所で目的地に到着するかを確認

## 🛠️ 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript
- **データ形式**: GTFS（General Transit Feed Specification）標準形式
- **データ処理**: JSZip（ブラウザ上でのZIP解凍）
- **時刻取得**: NTP over HTTP（ntp.nict.jp）
- **ホスティング**: Cloudflare Pages
- **テスト**: Vitest（単体テスト）、Playwright（E2Eテスト）

## 📦 インストール

### 前提条件

- Node.js 18以上
- npm または yarn

### セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourusername/saga-bus-navigator.git
cd saga-bus-navigator

# 依存関係をインストール（wranglerを含む）
npm install

# GTFSデータを配置
# ./dataディレクトリにsaga-current.zipまたはsaga-YYYY-MM-DD.zip形式のGTFSファイルを配置

# 開発サーバーを起動（Cloudflare Pages互換環境）
npm run dev
```

ブラウザで `http://localhost:8788` を開きます。

### 開発環境について

開発環境では `wrangler pages dev` を使用しています。これにより、本番環境（Cloudflare Pages）とほぼ同じ環境でローカル開発が可能です。

**主な利点:**
- **Pages Functions の動作確認**: `/functions` ディレクトリ配下のサーバーサイド処理をローカルで実行・テスト可能
- **本番環境との一致**: Cloudflare Pages と同じルーティング・ミドルウェア動作
- **Cloudflare 固有機能のテスト**: 環境変数、KV、D1 などの機能をローカルでテスト可能
- **デプロイ前の動作確認**: 本番環境にデプロイする前に正確な動作確認が可能

**開発サーバーの動作:**
- ポート番号: `8788`（デフォルト）
- 静的ファイル配信: ルートディレクトリの HTML、CSS、JavaScript などを配信
- Pages Functions 実行: `/functions` ディレクトリ配下の TypeScript/JavaScript ファイルを自動検出して実行
- ホットリロード: ファイル変更時に自動的に再読み込み

### GTFSデータの取得

佐賀市のGTFSデータは以下から取得できます：

- [佐賀市オープンデータポータル](https://www.city.saga.lg.jp/main/1316.html)
- データ形式: GTFS標準形式（ZIP圧縮）
- 更新頻度: ダイヤ改正時

### データ更新手順

1. 最新のGTFSデータ（saga-YYYY-MM-DD.zip）をダウンロード
2. `./data/`ディレクトリに配置
3. ファイル名を`saga-current.zip`にリネーム（推奨）
4. アプリケーションを再読み込み

アプリケーションは以下の優先順位でGTFSファイルを自動選択します：

1. `saga-current.zip`（存在する場合）
2. `saga-YYYY-MM-DD.zip`（最新の日付のファイル）

複数のGTFSファイルを配置することで、過去データや未来データを保持できます。

## 🔧 Pages Functions の開発

### Pages Functions とは

Pages Functions は Cloudflare Pages でサーバーサイド処理を実行する機能です。`/functions` ディレクトリ配下に TypeScript または JavaScript ファイルを配置することで、API エンドポイントを作成できます。

### ディレクトリ構造

```
functions/
├── api/
│   ├── alert.ts      # /api/alert エンドポイント
│   ├── route.ts      # /api/route エンドポイント
│   └── vehicle.ts    # /api/vehicle エンドポイント
├── package.json      # Functions 用の依存関係
└── tsconfig.json     # TypeScript 設定
```

### エンドポイントの作成

ファイルパスが URL パスに対応します：

- `functions/api/alert.ts` → `/api/alert`
- `functions/api/route.ts` → `/api/route`
- `functions/api/vehicle.ts` → `/api/vehicle`

### 基本的な実装例

```typescript
// functions/api/example.ts
export async function onRequest(context) {
  return new Response(JSON.stringify({ message: "Hello from Pages Functions!" }), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
```

### ローカルでのテスト

1. 開発サーバーを起動:
   ```bash
   npm run dev
   ```

2. ブラウザまたは curl でエンドポイントにアクセス:
   ```bash
   curl http://localhost:8788/api/example
   ```

3. ファイルを編集すると自動的に再読み込みされます

### 依存関係の管理

Pages Functions 用の依存関係は `functions/package.json` で管理します：

```bash
cd functions
npm install <package-name>
```

### デバッグ

開発サーバーのコンソール出力でエラーやログを確認できます：

```bash
npm run dev
# コンソールに Pages Functions のログが表示されます
```

### 本番環境へのデプロイ

`main` ブランチにマージすると、Cloudflare Pages が自動的に Pages Functions をデプロイします。ローカルで動作確認してからデプロイすることで、本番環境でのエラーを防げます。

## 🧪 テスト

### 単体テスト

```bash
# テストを実行
npm test

# ウォッチモード
npm run test:watch
```

### E2Eテスト

E2Eテストは開発サーバー（`http://localhost:8788`）に対して実行されます。

```bash
# E2Eテストを実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui
```

**注意**: E2Eテストを実行する前に、別のターミナルで開発サーバーを起動しておく必要があります：

```bash
# ターミナル1: 開発サーバーを起動
npm run dev

# ターミナル2: E2Eテストを実行
npm run test:e2e
```

## 📝 開発

### コード品質

```bash
# ESLintでチェック
npm run lint

# Prettierでフォーマット
npm run format
```

### ブランチ戦略

- `main`: 本番環境（自動デプロイ）
- `develop`: 開発環境

### 開発フロー

1. `develop`ブランチから機能ブランチを作成
2. 機能を実装
3. テストを実行
4. `develop`ブランチにマージ
5. 動作確認後、`main`ブランチにマージ
6. 自動的に本番環境にデプロイ

## 🚀 デプロイ

### Cloudflare Pagesへのデプロイ

詳細は [DEPLOYMENT.md](DEPLOYMENT.md) を参照してください。

#### 簡易手順

1. Cloudflare Pagesプロジェクトを作成
2. GitHubリポジトリと連携
3. ビルド設定:
   - Framework preset: `None`
   - Build command: （空欄）
   - Build output directory: `/`
4. カスタムドメインを設定: `saga-bus.midnight480.com`
5. 自動デプロイを有効化

## 📂 プロジェクト構成

```
saga-bus-navigator/
├── index.html              # メインHTML
├── manifest.json           # PWA設定
├── _headers                # セキュリティヘッダー
├── docs/                   # ドキュメント
│   ├── deployment/        # デプロイメント関連
│   ├── REQUIREMENT.md     # 要件定義書
│   ├── FILES_STRUCTURE.md # ファイル構成
│   └── ...                # その他ドキュメント
├── scripts/                # スクリプト
│   ├── gtfs_loader.py     # GTFSローダー
│   ├── update_gtfs.sh     # GTFS更新
│   └── ...                # その他スクリプト
├── css/
│   └── app.css            # スタイルシート
├── js/
│   ├── app.js             # メインアプリケーション
│   ├── data-loader.js     # データローダー
│   └── utils.js           # ユーティリティ
├── data/
│   ├── saga-current.zip   # 現在のGTFSデータ（推奨）
│   └── saga-*.zip         # その他のGTFSデータ（オプション）
├── icons/                 # アイコンファイル
├── tests/                 # 単体テスト
└── e2e/                   # E2Eテスト
```

## 📖 ドキュメント

### 機能仕様

- [時刻表検索 - 要件定義書](.kiro/specs/timetable-search/requirements.md)
- [時刻表検索 - 設計書](.kiro/specs/timetable-search/design.md)
- [時刻表検索 - 実装タスク](.kiro/specs/timetable-search/tasks.md)
- [双方向検索 - 要件定義書](.kiro/specs/bidirectional-route-support/requirements.md)
- [双方向検索 - 設計書](.kiro/specs/bidirectional-route-support/design.md)
- [双方向検索 - 実装タスク](.kiro/specs/bidirectional-route-support/tasks.md)
- [方向判定統合 - 要件定義書](.kiro/specs/direction-detection-integration/requirements.md)
- [方向判定統合 - 設計書](.kiro/specs/direction-detection-integration/design.md)
- [方向判定統合 - 実装タスク](.kiro/specs/direction-detection-integration/tasks.md)
- [ユーザー操作機能強化 - 要件定義書](.kiro/specs/user-interaction-enhancements/requirements.md)
- [ユーザー操作機能強化 - 設計書](.kiro/specs/user-interaction-enhancements/design.md)
- [ユーザー操作機能強化 - 実装タスク](.kiro/specs/user-interaction-enhancements/tasks.md)
- [便の時刻表表示 - 要件定義書](.kiro/specs/trip-timetable-display/requirements.md)
- [便の時刻表表示 - 設計書](.kiro/specs/trip-timetable-display/design.md)
- [便の時刻表表示 - 実装タスク](.kiro/specs/trip-timetable-display/tasks.md)

### GTFS移行

- [GTFS移行 - 要件定義書](.kiro/specs/gtfs-loader-migration/requirements.md)
- [GTFS移行 - 設計書](.kiro/specs/gtfs-loader-migration/design.md)
- [GTFS移行 - 実装タスク](.kiro/specs/gtfs-loader-migration/tasks.md)
- [GTFS移行ガイド](docs/GTFS_MIGRATION.md)

### その他

- [APIドキュメント](docs/API.md)
- [デプロイ手順](docs/deployment/DEPLOYMENT.md)
- [プロジェクト構成](docs/FILES_STRUCTURE.md)
- [セキュリティ](docs/SECURITY.md)
- [レスポンシブデザイン](docs/RESPONSIVE_DESIGN.md)
- [使い方ガイド](docs/USER_GUIDE.md)

## 🔐 セキュリティ

- XSS対策: `textContent`と`createElement`を使用
- CSP（Content Security Policy）設定済み
- HTTPS強制
- 入力検証実装済み

## 📊 パフォーマンス

- データ読み込み: 3秒以内
- 検索実行: 2秒以内
- Cloudflare CDNによる高速配信

## 🌐 ブラウザサポート

### 対応ブラウザ

- Chrome（最新版）
- Edge（最新版）

### 非対応ブラウザ

以下のブラウザは動作保証の対象外です：

- Firefox
- Safari（iOS Safari含む）
- その他WebKitベースのブラウザ

**注意**: 本アプリケーションはChromiumベースのブラウザ（Chrome、Edge）での動作を前提として開発・テストされています。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📞 サポート

問題が発生した場合は、GitHubのissueを作成してください。

## 🙏 謝辞

- 佐賀市営バス、祐徳バス、西鉄バスの時刻表データ
- OpenStreetMapコミュニティ
- NICT（情報通信研究機構）のNTPサービス
- holidays-jp.github.ioの祝日カレンダーAPI

## 🧭 方向判定統合機能

佐賀バスナビゲーターは、GTFSデータの`direction_id`が設定されていない路線でも、停留所順序から自動的に方向を判定する機能を実装しています。

### 方向判定の仕組み

システムは以下の優先順位で方向を判定します：

1. **direction_id優先**: GTFSデータに`direction_id`が設定されている場合は、それを使用
2. **停留所順序ベース判定**: `direction_id`が空の場合、停留所の停車順序から方向を推測
3. **キャッシュ活用**: 一度判定した結果はキャッシュに保存し、再判定を回避

### 停留所順序ベースの判定ロジック

1. 各便の最初と最後の停留所を取得
2. 始点・終点の組み合わせでグループ化
3. 2つ以上のグループがある場合、それぞれを異なる方向（往路・復路）として扱う
4. 判定できない場合は`'unknown'`として設定

### 自動統合

方向判定は、データ読み込み時に自動的に実行されます：

```
GTFSデータ読み込み
  ↓
データ変換
  ↓
方向判定（enrichTripsWithDirection）← 自動実行
  ├─ 路線ごとに反復
  ├─ direction_idをチェック
  ├─ 停留所順序から方向を推測
  └─ trip.directionプロパティを設定
  ↓
インデックス生成
  ↓
統計情報生成
```

### 統計情報

データ読み込み完了後、コンソールに以下の統計情報が表示されます：

- 処理した路線数
- 方向判定に成功した路線数
- 方向判定に失敗した路線数
- direction_idが設定されていてスキップした路線数
- 各路線の方向判定成功率

### 技術詳細

詳細な設計と実装については、以下のドキュメントを参照してください：

- [方向判定統合 - 要件定義書](.kiro/specs/direction-detection-integration/requirements.md)
- [方向判定統合 - 設計書](.kiro/specs/direction-detection-integration/design.md)
- [方向判定統合 - 実装タスク](.kiro/specs/direction-detection-integration/tasks.md)

## 🚀 データ構造最適化

佐賀バスナビゲーターは、効率的なデータ検索とパフォーマンス向上のため、複数のインデックス戦略を実装しています。

### 最適化の概要

GTFSデータを読み込む際に、以下のインデックスを自動生成します：

1. **方向別時刻表インデックス**: 路線と方向の組み合わせで時刻表を高速検索
2. **Trip-Stopマッピング**: 各便がどの停留所を順番に経由するかを即座に取得
3. **路線メタデータ**: 路線レベルの方向情報、行き先一覧、便数を簡単に取得
4. **逆引きインデックス**: 停留所から便、路線から便への効率的な検索
5. **停留所グループ化**: 親駅による停留所の整理

### 主な機能

#### 方向別時刻表インデックス

路線と方向の組み合わせで時刻表データを高速に検索できます。

```javascript
// 路線001の往路（direction='0'）の時刻表を取得
const timetable = dataLoader.timetableByRouteAndDirection['route_001']['0'];
```

#### Trip-Stopマッピング

各便の全停留所を順序付きで取得できます。

```javascript
// 便001の全停留所を取得
const stops = dataLoader.tripStops['trip_001'];
// [{ stopId, stopName, sequence, arrivalTime }, ...]
```

#### 路線メタデータ

路線の方向情報、行き先、便数を簡単に取得できます。

```javascript
// 路線001のメタデータを取得
const metadata = dataLoader.routeMetadata['route_001'];
// { directions: ['0', '1'], headsigns: ['佐賀駅', '県庁'], tripCount: { '0': 20, '1': 18 } }
```

#### 逆引きインデックス

停留所や路線から便を効率的に検索できます。

```javascript
// 停留所001に停車する全便を取得
const trips = dataLoader.stopToTrips['stop_001'];

// 路線001の往路の全便を取得
const routeTrips = dataLoader.routeToTrips['route_001']['0'];
```

#### 停留所グループ化

親駅単位で停留所をグループ化して表示できます。

```javascript
// 佐賀駅バスセンターの全乗り場を取得
const platforms = dataLoader.stopsGrouped['station_001'];
// [{ id, name, lat, lng }, ...]
```

### パフォーマンス

- **インデックス生成**: データ読み込み時に1回のみ実行
- **検索速度**: O(1)またはO(log n)の高速検索
- **メモリ効率**: 既存データを参照し、重複を最小化

### 技術詳細

詳細な設計と実装については、以下のドキュメントを参照してください：

- [データ構造最適化 - 要件定義書](.kiro/specs/data-structure-optimization/requirements.md)
- [データ構造最適化 - 設計書](.kiro/specs/data-structure-optimization/design.md)
- [データ構造最適化 - 実装タスク](.kiro/specs/data-structure-optimization/tasks.md)

## 📅 更新履歴

### v2.6.0 (2025-11-28)

- **方向判定統合機能**: 停留所順序ベースの方向判定をDataLoaderに統合
- **自動方向判定**: GTFSデータ読み込み時に全路線で自動的に方向を判定
- **direction_id優先**: GTFSデータに`direction_id`が設定されている場合は優先的に使用
- **停留所順序ベース判定**: `direction_id`が空の場合、停留所の停車順序から方向を推測
- **キャッシュ機能**: 方向判定結果をキャッシュし、再判定を回避
- **統計情報**: 方向判定の成功率と統計情報をコンソールに表示
- **エラーハンドリング強化**: 方向判定中のエラーを適切に処理し、ログに記録
- **後方互換性**: 既存の`direction_id`を保持しつつ、新しい`direction`プロパティを追加

### v2.5.0 (2025-11-26)

- **データ構造最適化**: 効率的なインデックス戦略の実装
- **方向別時刻表インデックス**: 路線と方向の組み合わせで高速検索
- **Trip-Stopマッピング**: 各便の全停留所を順序付きで取得
- **路線メタデータ**: 路線レベルの方向情報、行き先一覧、便数を簡単に取得
- **逆引きインデックス**: 停留所から便、路線から便への効率的な検索
- **停留所グループ化**: 親駅による停留所の整理
- **方向判定の改善**: 停留所順序ベースの方向推測とキャッシュ機能
- **パフォーマンス向上**: インデックスによる検索速度の大幅な改善

### v2.4.0 (2025-11-25)

- **開発環境の改善**: `wrangler pages dev` を使用した本番環境互換の開発環境に移行
- **Pages Functions のローカルテスト**: サーバーサイド処理をローカルで実行・テスト可能に
- **ポート番号変更**: 開発サーバーのデフォルトポートを 8788 に変更
- **ドキュメント更新**: Pages Functions の開発方法について詳細な説明を追加

### v2.3.0 (2025-11-25)

- **双方向検索機能**: 往路・復路の両方向のバスを検索可能に
- **自動方向判定**: バス停の順序から自動的に正しい方向のバスを検索
- **行き先表示**: 検索結果に各バスの行き先を表示
- **地図表示の改善**: 往路・復路のバス停を視覚的に区別して表示
- **方向選択機能**: 地図上で特定の方向のバス停のみをハイライト表示
- **後方互換性**: 既存の機能を維持しながら新機能を追加

### v2.2.0 (2025-11-19)

- **便の時刻表表示機能**: 車両マーカーをクリックすると、その便の全停車バス停と到着時刻を時刻表形式で表示
- **現在位置の強調表示**: 時刻表内で現在バスがいる位置を強調表示
- **時刻表の折りたたみ機能**: 10停車以上の便は折りたたんで表示し、必要に応じて展開可能
- **パフォーマンス最適化**: 時刻表HTMLのキャッシュ機能により高速表示を実現
- **エラーハンドリング強化**: 時刻表データ取得エラー時も運行状態情報は引き続き表示

### v2.1.0 (2025-11-16)

- **現在地表示機能**: 地図上に現在地を表示し、現在地を中心に地図を移動
- **検索結果クリア機能**: 検索結果を一括でクリアして新しい検索を開始
- **地図経路クリア機能**: 地図上の経路表示をクリア
- **カレンダー登録機能**: バスの時刻をiCalまたはGoogle Calendarに登録
- **ユーザビリティ向上**: 各種クリアボタンの追加で操作性を改善

### v2.0.0 (2025-11-15)

- **GTFS標準形式への移行**: 独自CSV形式からGTFS標準形式に移行
- **データ更新の簡素化**: GTFSファイルを配置するだけでデータ更新が可能
- **自動ファイル選択**: 複数のGTFSファイルから最新データを自動選択
- **パフォーマンス向上**: 並列読み込みとインデックス化による高速化

### v1.0.0 (2025-11-15)

- 初回リリース
- 時刻表検索機能実装
- レスポンシブデザイン対応
- セキュリティ対策実装
- E2Eテスト実装
