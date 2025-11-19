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
- 📊 **検索結果表示**: 出発時刻、到着時刻、所要時間、運賃を一覧表示
- 💰 **運賃表示**: 大人・子供料金を表示
- 🗺️ **地図表示**: OpenStreetMapでバス停位置と経路を表示
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

# 依存関係をインストール
npm install

# GTFSデータを配置
# ./dataディレクトリにsaga-current.zipまたはsaga-YYYY-MM-DD.zip形式のGTFSファイルを配置

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:8080` を開きます。

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

## 🧪 テスト

### 単体テスト

```bash
# テストを実行
npm test

# ウォッチモード
npm run test:watch
```

### E2Eテスト

```bash
# E2Eテストを実行
npm run test:e2e

# UIモードで実行
npm run test:e2e:ui
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

- Chrome（最新版）
- Safari（iOS 14+）
- Firefox（最新版）
- Edge（最新版）

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

## 📅 更新履歴

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
