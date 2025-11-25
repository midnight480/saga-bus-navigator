# 要件定義書

## はじめに

現在、開発環境では `http-server` を使用していますが、本番環境は Cloudflare Pages です。開発環境と本番環境の差異により、ローカルでは動作するが本番では動作しない問題や、Pages Functions の動作確認ができない問題があります。

この仕様では、開発環境を `wrangler pages dev` を使用する構成に変更し、本番環境とほぼ同じ環境でローカル開発できるようにします。

## 用語集

- **Wrangler**: Cloudflare Workers/Pages の公式 CLI ツール
- **Pages Functions**: Cloudflare Pages でサーバーサイド処理を実行する機能（`/functions` ディレクトリ配下）
- **静的ファイル**: HTML、CSS、JavaScript、画像などのクライアントサイドファイル
- **開発サーバー**: ローカル開発時に使用する HTTP サーバー
- **ビルド出力ディレクトリ**: 静的ファイルが配置されるディレクトリ（本プロジェクトではルートディレクトリ）

## 要件

### 要件 1

**ユーザーストーリー:** 開発者として、本番環境と同じ動作をローカルで確認したいので、Cloudflare Pages と同じ環境で開発できるようにしたい

#### 受入基準

1. WHEN 開発者が `npm run dev` コマンドを実行する THEN システムは wrangler pages dev を起動して静的ファイルと Pages Functions を提供する
2. WHEN wrangler pages dev が起動する THEN システムはルートディレクトリの静的ファイル（HTML、CSS、JavaScript等）を配信する
3. WHEN wrangler pages dev が起動する THEN システムは `/functions` ディレクトリ配下の Pages Functions を実行可能にする
4. WHEN 開発者がブラウザで `http://localhost:8788` にアクセスする THEN システムはアプリケーションを表示する
5. WHEN 開発者が API エンドポイント（`/api/*`）にアクセスする THEN システムは Pages Functions を実行してレスポンスを返す

### 要件 2

**ユーザーストーリー:** 開発者として、依存関係を最小限にしたいので、不要な開発サーバーパッケージを削除したい

#### 受入基準

1. WHEN package.json を更新する THEN システムは http-server パッケージを devDependencies から削除する
2. WHEN package.json を更新する THEN システムは wrangler パッケージを devDependencies に追加する
3. WHEN 依存関係を更新する THEN システムは既存の機能（テスト、リント等）に影響を与えない

### 要件 3

**ユーザーストーリー:** 開発者として、設定ファイルを適切に管理したいので、wrangler.toml に必要な設定を追加したい

#### 受入基準

1. WHEN wrangler.toml を更新する THEN システムは `name` フィールドに "saga-bus-navigator" を設定する
2. WHEN wrangler.toml を更新する THEN システムは `pages_build_output_dir` フィールドに "." を設定する
3. WHEN wrangler.toml を更新する THEN システムは既存の `compatibility_date` と `node_compat` 設定を保持する
4. WHEN wrangler.toml を更新する THEN システムは JSON スキーマ参照を追加して IDE の補完を有効にする

### 要件 4

**ユーザーストーリー:** 開発者として、開発環境の使い方を理解したいので、ドキュメントを更新したい

#### 受入基準

1. WHEN README.md を更新する THEN システムは開発環境のセットアップ手順に wrangler のインストールを含める
2. WHEN README.md を更新する THEN システムは `npm run dev` コマンドの説明を wrangler pages dev の動作に更新する
3. WHEN README.md を更新する THEN システムはデフォルトポート番号を 8788 に更新する
4. WHEN README.md を更新する THEN システムは Pages Functions の開発方法について説明を追加する
