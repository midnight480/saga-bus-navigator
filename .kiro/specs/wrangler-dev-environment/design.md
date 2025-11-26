# デザインドキュメント

## 概要

本プロジェクトは現在 `http-server` を使用した開発環境ですが、本番環境は Cloudflare Pages です。この差異により、ローカルでは動作するが本番では動作しない問題や、Pages Functions の動作確認ができない問題が発生する可能性があります。

このデザインでは、`wrangler pages dev` を使用して本番環境とほぼ同じ環境でローカル開発できるようにします。これにより、以下のメリットが得られます：

- Pages Functions（`/functions` ディレクトリ）の動作確認がローカルで可能
- 本番環境と同じルーティング・ミドルウェア動作
- Cloudflare 固有の機能（環境変数、KV、D1 等）のローカルテスト
- デプロイ前の動作確認の精度向上

## アーキテクチャ

### 現在の構成

```
開発環境: http-server (ポート 8080)
  ↓
静的ファイル配信のみ
  ↓
Pages Functions は動作しない
```

### 新しい構成

```
開発環境: wrangler pages dev (ポート 8788)
  ↓
静的ファイル配信 + Pages Functions 実行
  ↓
本番環境と同じ動作
```

### ディレクトリ構造

```
saga-bus-navigator/
├── index.html              # エントリーポイント
├── css/                    # スタイルシート
├── js/                     # クライアントサイド JavaScript
├── icons/                  # アイコンファイル
├── data/                   # GTFS データ
├── functions/              # Pages Functions（サーバーサイド）
│   ├── api/
│   │   ├── alert.ts
│   │   ├── route.ts
│   │   └── vehicle.ts
│   ├── package.json
│   └── node_modules/
├── wrangler.toml           # Wrangler 設定
└── package.json            # プロジェクト設定
```

## コンポーネントとインターフェース

### 1. Wrangler 設定（wrangler.toml）

Cloudflare Pages の動作を定義する設定ファイル。

**設定項目:**
- `name`: プロジェクト名（"saga-bus-navigator"）
- `pages_build_output_dir`: 静的ファイルのディレクトリ（"."）
- `compatibility_date`: Cloudflare Workers の互換性日付
- `node_compat`: Node.js 互換性の有効化
- `$schema`: JSON スキーマ参照（IDE 補完用）

### 2. npm スクリプト（package.json）

開発者が使用するコマンドを定義。

**変更点:**
- `dev`: `http-server . -p 8080` → `wrangler pages dev . --port 8788`
- devDependencies: `http-server` を削除、`wrangler` を追加

### 3. Pages Functions（/functions ディレクトリ）

既存の Pages Functions は変更不要。`wrangler pages dev` が自動的に検出して実行します。

**エンドポイント:**
- `/api/alert` - アラート情報取得
- `/api/route` - 路線情報取得
- `/api/vehicle` - 車両位置情報取得

### 4. 静的ファイル

ルートディレクトリの静的ファイルは変更不要。`wrangler pages dev` が自動的に配信します。

## データモデル

このデザインではデータモデルの変更はありません。既存の GTFS データ構造と Pages Functions のレスポンス形式を維持します。

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。これは人間が読める仕様と機械が検証可能な正確性保証の橋渡しとなります。*

### プロパティ 1: 静的ファイル配信の一貫性

*任意の* 静的ファイル（HTML、CSS、JavaScript、画像等）について、`wrangler pages dev` で配信されるファイルは、ファイルシステム上のファイルと同一の内容である

**検証: 要件 1.2**

### プロパティ 2: Pages Functions の実行可能性

*任意の* `/functions` ディレクトリ配下の有効な TypeScript/JavaScript ファイルについて、対応する API エンドポイントにアクセスした際、そのファイルが実行されてレスポンスが返される

**検証: 要件 1.3, 1.5**

### プロパティ 3: 既存機能の後方互換性

*任意の* 既存の npm スクリプト（test、lint 等）について、依存関係を更新した後も、そのスクリプトは正常に実行される

**検証: 要件 2.3**

## エラーハンドリング

### 1. ポート競合

**シナリオ:** ポート 8788 が既に使用されている

**対応:**
- wrangler は自動的に別のポートを使用
- コンソールに実際のポート番号を表示
- 開発者は表示されたポート番号でアクセス

### 2. wrangler 未インストール

**シナリオ:** wrangler がインストールされていない

**対応:**
- `npm install` を実行して devDependencies をインストール
- README.md にセットアップ手順を明記

### 3. Pages Functions のエラー

**シナリオ:** Pages Functions の実行時エラー

**対応:**
- wrangler がエラーログをコンソールに出力
- スタックトレースで問題箇所を特定
- 既存の Pages Functions のエラーハンドリングを維持

### 4. 静的ファイルの 404

**シナリオ:** 存在しないファイルへのアクセス

**対応:**
- wrangler が 404 レスポンスを返す
- 本番環境と同じ動作

## テスト戦略

### 単体テスト

既存の単体テストは変更不要です。`vitest` を使用したテストは引き続き動作します。

**対象:**
- データローダー
- ユーティリティ関数
- UI コントローラー

### E2E テスト

既存の E2E テストは、開発サーバーの URL を更新する必要があります。

**変更点:**
- ベース URL: `http://localhost:8080` → `http://localhost:8788`
- テストシナリオは変更不要

**対象:**
- アプリケーション初期化
- バス停検索
- 時刻表表示
- リアルタイム車両追跡

### 統合テスト

Pages Functions の統合テストは、`wrangler pages dev` 環境で実行します。

**テストケース:**
1. `/api/alert` エンドポイントが正常にレスポンスを返す
2. `/api/route` エンドポイントが正常にレスポンスを返す
3. `/api/vehicle` エンドポイントが正常にレスポンスを返す
4. 静的ファイルと Pages Functions が同時に動作する

### 手動テスト

開発者が以下を手動で確認します：

1. `npm run dev` でサーバーが起動する
2. ブラウザで `http://localhost:8788` にアクセスしてアプリが表示される
3. バス停検索が動作する
4. リアルタイム車両追跡が動作する（API エンドポイント経由）
5. オフライン機能が動作する（Service Worker）

## 実装の注意点

### 1. ビルドプロセス不要

本プロジェクトは静的ファイルを直接配信するため、ビルドプロセスは不要です。`pages_build_output_dir` をルートディレクトリ（"."）に設定します。

### 2. Pages Functions の依存関係

`/functions` ディレクトリには独自の `package.json` があります。これは変更不要で、wrangler が自動的に処理します。

### 3. 環境変数

本番環境で使用する環境変数は、`.dev.vars` ファイルで定義できます（必要に応じて）。

### 4. 既存機能への影響

以下の既存機能は影響を受けません：
- GTFS データローダー
- バス停検索
- 時刻表表示
- 地図表示
- Service Worker（PWA 機能）
- 単体テスト

## デプロイメント

本番環境へのデプロイ方法は変更ありません。Cloudflare Pages は自動的に以下を実行します：

1. リポジトリから最新コードを取得
2. 静的ファイルをデプロイ
3. Pages Functions をデプロイ

ローカル開発環境が本番環境と同じ構成になることで、デプロイ前の動作確認の精度が向上します。
