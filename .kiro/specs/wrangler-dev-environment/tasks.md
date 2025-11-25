# 実装計画

- [x] 1. package.json の更新
  - `devDependencies` から `http-server` を削除
  - `devDependencies` に `wrangler` を追加
  - `dev` スクリプトを `wrangler pages dev . --port 8788` に変更
  - _要件: 1.1, 2.1, 2.2_

- [x] 1.1 既存機能の後方互換性テストを作成
  - **プロパティ 3: 既存機能の後方互換性**
  - **検証: 要件 2.3**

- [x] 2. wrangler.toml の更新
  - `$schema` フィールドを追加して IDE 補完を有効化
  - `name` フィールドに "saga-bus-navigator" を設定
  - `pages_build_output_dir` フィールドに "." を設定
  - 既存の `compatibility_date` と `node_compat` 設定を保持
  - _要件: 3.1, 3.2, 3.3, 3.4_

- [x] 3. E2E テストの更新
  - `playwright.config.js` のベース URL を `http://localhost:8788` に変更
  - 全ての E2E テストが新しいポート番号で動作することを確認
  - _要件: 1.4_

- [x] 3.1 静的ファイル配信の一貫性テストを作成
  - **プロパティ 1: 静的ファイル配信の一貫性**
  - **検証: 要件 1.2**

- [x] 3.2 Pages Functions の実行可能性テストを作成
  - **プロパティ 2: Pages Functions の実行可能性**
  - **検証: 要件 1.3, 1.5**

- [x] 4. チェックポイント - 全てのテストが通ることを確認
  - 全てのテストが通ることを確認し、問題があればユーザーに質問する

- [x] 5. README.md の更新
  - 開発環境のセットアップ手順に `wrangler` のインストールを追加
  - `npm run dev` コマンドの説明を `wrangler pages dev` の動作に更新
  - デフォルトポート番号を 8788 に更新
  - Pages Functions の開発方法について説明を追加
  - _要件: 4.1, 4.2, 4.3, 4.4_
