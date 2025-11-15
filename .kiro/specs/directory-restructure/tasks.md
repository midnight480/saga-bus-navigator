# 実装計画

- [x] 1. ディレクトリ構造の作成
  - 新しいディレクトリ（`docs`、`docs/deployment`、`scripts`）を作成する
  - _要件: 1.1, 2.1, 4.1_

- [x] 2. ドキュメントファイルの移動
  - [x] 2.1 一般ドキュメントファイルをdocsディレクトリに移動
    - `git mv`コマンドを使用して以下のファイルを`docs/`に移動:
      - data_sync_report.md
      - FILES_STRUCTURE.md
      - GTFS_MIGRATION.md
      - NAVIGATION_COMPLETE.md
      - PR_DESCRIPTION.md
      - REQUIREMENT.md
      - RESPONSIVE_DESIGN.md
      - SECURITY.md
    - _要件: 1.1, 1.3_

  - [x] 2.2 デプロイメント関連ドキュメントをdocs/deploymentに移動
    - `git mv`コマンドを使用して以下のファイルを`docs/deployment/`に移動:
      - DEPLOYMENT.md
      - DEPLOYMENT_CHECKLIST.md
      - DEPLOYMENT_READY.md
      - DEPLOYMENT_STATUS.md
      - POST_DEPLOYMENT_VERIFICATION.md
      - QUICKSTART_DEPLOY.md
    - _要件: 1.2_

- [x] 3. スクリプトファイルの移動
  - `git mv`コマンドを使用して以下のファイルを`scripts/`に移動:
    - gtfs_loader.py
    - sync_open_data.py
    - update_gtfs.sh
    - verify-deployment-ready.sh
  - 移動後、シェルスクリプトの実行権限を確認・設定する（`chmod +x scripts/*.sh`）
  - _要件: 4.1, 4.2_

- [x] 4. テストファイルの移動
  - `git mv`コマンドを使用して以下のファイルを`tests/`に移動:
    - test-data-loader.html
    - test-responsive.html
    - test-search-controller.js
    - test-search-results.html
    - test-utils-node.js
    - test-utils.html
  - _要件: 2.1, 2.2_

- [x] 5. テストHTMLファイルのパス参照を更新
  - [x] 5.1 tests/test-data-loader.htmlのパス更新
    - JavaScriptファイルへの参照を`/js/`から`../js/`に更新
    - CSSファイルへの参照を`/css/`から`../css/`に更新
    - データファイルへの参照を`/data/`から`../data/`に更新
    - _要件: 6.1, 6.2, 6.4_

  - [x] 5.2 tests/test-responsive.htmlのパス更新
    - JavaScriptファイルへの参照を`/js/`から`../js/`に更新
    - CSSファイルへの参照を`/css/`から`../css/`に更新
    - _要件: 6.1, 6.2, 6.4_

  - [x] 5.3 tests/test-search-results.htmlのパス更新
    - JavaScriptファイルへの参照を`/js/`から`../js/`に更新
    - CSSファイルへの参照を`/css/`から`../css/`に更新
    - _要件: 6.1, 6.2, 6.4_

  - [x] 5.4 tests/test-utils.htmlのパス更新
    - JavaScriptファイルへの参照を`/js/`から`../js/`に更新
    - _要件: 6.1, 6.2, 6.4_

- [x] 6. プロジェクト構造ドキュメントの更新
  - [x] 6.1 docs/FILES_STRUCTURE.mdを更新
    - 新しいディレクトリ構造を反映
    - ファイル配置の説明を更新
    - _要件: 7.1_

  - [x] 6.2 .kiro/steering/structure.mdを更新
    - プロジェクト構成セクションを新しい構造に更新
    - ディレクトリ構造図を更新
    - _要件: 7.3_

  - [x] 6.3 README.mdを確認・更新（必要な場合）
    - ファイルパスへの参照がある場合は更新
    - プロジェクト構造の説明がある場合は更新
    - _要件: 7.2_

- [x] 7. 動作検証
  - [x] 7.1 アプリケーションの起動確認
    - `npm run dev`を実行してアプリケーションが起動することを確認
    - ブラウザで http://localhost:8080 にアクセスして正常に表示されることを確認
    - 開発者ツールでJavaScriptエラーがないことを確認
    - _要件: 6.4_

  - [x] 7.2 テストの実行確認
    - `npm test`を実行してユニットテストが正常に動作することを確認
    - `npm run test:e2e`を実行してE2Eテストが正常に動作することを確認
    - _要件: 6.4_

  - [x] 7.3 スクリプトの実行確認
    - `scripts/`ディレクトリ内のスクリプトが実行可能であることを確認
    - 実行権限が正しく設定されていることを確認（`ls -la scripts/`）
    - _要件: 4.2_

  - [x] 7.4 移動したテストHTMLファイルの動作確認
    - 各テストHTMLファイルをブラウザで開いて正常に動作することを確認
    - パス参照が正しく機能していることを確認
    - _要件: 6.4_

- [x] 8. Git コミット
  - 全ての変更を1つのコミットにまとめる
  - コミットメッセージに構造変更の詳細を記載
  - 例: "refactor: プロジェクト構造を整理（docs、scripts、testsディレクトリに分類）"
