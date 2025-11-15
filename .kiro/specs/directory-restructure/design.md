# 設計書

## 概要

本設計書では、佐賀バスナビゲーターのプロジェクト構造を整理し、保守性と可読性を向上させるための詳細な設計を定義します。ファイルを役割ごとに適切なディレクトリに配置し、標準的なプロジェクト構造に準拠させます。

## アーキテクチャ

### 現在の構造

```
saga-bus-navigator/
├── (root直下に30以上のファイルが散在)
├── css/
├── data/
├── e2e/
├── icons/
├── js/
├── tests/
└── test-results/
```

### 目標構造

```
saga-bus-navigator/
├── docs/                          # ドキュメント
│   ├── deployment/               # デプロイメント関連
│   │   ├── DEPLOYMENT.md
│   │   ├── DEPLOYMENT_CHECKLIST.md
│   │   ├── DEPLOYMENT_READY.md
│   │   ├── DEPLOYMENT_STATUS.md
│   │   ├── POST_DEPLOYMENT_VERIFICATION.md
│   │   └── QUICKSTART_DEPLOY.md
│   ├── data_sync_report.md
│   ├── FILES_STRUCTURE.md
│   ├── GTFS_MIGRATION.md
│   ├── NAVIGATION_COMPLETE.md
│   ├── PR_DESCRIPTION.md
│   ├── REQUIREMENT.md
│   ├── RESPONSIVE_DESIGN.md
│   └── SECURITY.md
├── scripts/                       # スクリプト
│   ├── gtfs_loader.py
│   ├── sync_open_data.py
│   ├── update_gtfs.sh
│   └── verify-deployment-ready.sh
├── tests/                         # テスト（既存 + 追加）
│   ├── data-loader.test.js       # 既存
│   ├── search.test.js            # 既存
│   ├── security.test.js          # 既存
│   ├── utils.test.js             # 既存
│   ├── test-data-loader.html     # 移動
│   ├── test-responsive.html      # 移動
│   ├── test-search-controller.js # 移動
│   ├── test-search-results.html  # 移動
│   ├── test-utils-node.js        # 移動
│   └── test-utils.html           # 移動
├── css/                           # 既存維持
├── data/                          # 既存維持
├── e2e/                           # 既存維持
├── icons/                         # 既存維持
├── js/                            # 既存維持
├── test-results/                  # 既存維持
├── .kiro/                         # 既存維持
├── .vscode/                       # 既存維持
├── node_modules/                  # 既存維持
├── index.html                     # root維持
├── manifest.json                  # root維持
├── package.json                   # root維持
├── package-lock.json              # root維持
├── README.md                      # root維持
├── _headers                       # root維持
├── .eslintrc.json                 # root維持
├── .gitignore                     # root維持
├── .prettierrc.json               # root維持
├── playwright.config.js           # root維持
└── vitest.config.js               # root維持
```

## コンポーネントとインターフェース

### ファイル移動マッピング

#### ドキュメントファイル（docs/）

| 移動元 | 移動先 |
|--------|--------|
| data_sync_report.md | docs/data_sync_report.md |
| FILES_STRUCTURE.md | docs/FILES_STRUCTURE.md |
| GTFS_MIGRATION.md | docs/GTFS_MIGRATION.md |
| NAVIGATION_COMPLETE.md | docs/NAVIGATION_COMPLETE.md |
| PR_DESCRIPTION.md | docs/PR_DESCRIPTION.md |
| REQUIREMENT.md | docs/REQUIREMENT.md |
| RESPONSIVE_DESIGN.md | docs/RESPONSIVE_DESIGN.md |
| SECURITY.md | docs/SECURITY.md |

#### デプロイメントドキュメント（docs/deployment/）

| 移動元 | 移動先 |
|--------|--------|
| DEPLOYMENT.md | docs/deployment/DEPLOYMENT.md |
| DEPLOYMENT_CHECKLIST.md | docs/deployment/DEPLOYMENT_CHECKLIST.md |
| DEPLOYMENT_READY.md | docs/deployment/DEPLOYMENT_READY.md |
| DEPLOYMENT_STATUS.md | docs/deployment/DEPLOYMENT_STATUS.md |
| POST_DEPLOYMENT_VERIFICATION.md | docs/deployment/POST_DEPLOYMENT_VERIFICATION.md |
| QUICKSTART_DEPLOY.md | docs/deployment/QUICKSTART_DEPLOY.md |

#### スクリプトファイル（scripts/）

| 移動元 | 移動先 |
|--------|--------|
| gtfs_loader.py | scripts/gtfs_loader.py |
| sync_open_data.py | scripts/sync_open_data.py |
| update_gtfs.sh | scripts/update_gtfs.sh |
| verify-deployment-ready.sh | scripts/verify-deployment-ready.sh |

#### テストファイル（tests/）

| 移動元 | 移動先 |
|--------|--------|
| test-data-loader.html | tests/test-data-loader.html |
| test-responsive.html | tests/test-responsive.html |
| test-search-controller.js | tests/test-search-controller.js |
| test-search-results.html | tests/test-search-results.html |
| test-utils-node.js | tests/test-utils-node.js |
| test-utils.html | tests/test-utils.html |

### パス参照の更新が必要なファイル

#### 1. package.json

**現在のscriptsセクション:**
```json
{
  "scripts": {
    "dev": "http-server . -p 8080",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "lint": "eslint js/**/*.js",
    "format": "prettier --write js/**/*.js"
  }
}
```

**更新後:**
- scriptsセクションは変更不要（パスが変わらないため）

#### 2. テストHTMLファイル

**test-data-loader.html、test-responsive.html、test-search-results.html、test-utils.html:**

これらのファイルは`tests/`ディレクトリに移動するため、以下のパス参照を更新する必要があります：

- `/js/` → `../js/`
- `/css/` → `../css/`
- `/data/` → `../data/`

#### 3. .kiro/steering/structure.md

プロジェクト構造の説明を新しいディレクトリ構造に更新します。

#### 4. docs/FILES_STRUCTURE.md（移動後）

新しいディレクトリ構造を反映した内容に更新します。

## データモデル

### ディレクトリ構造定義

```typescript
interface DirectoryStructure {
  docs: {
    deployment: string[];  // デプロイメント関連ドキュメント
    general: string[];     // 一般ドキュメント
  };
  scripts: string[];       // 実行可能スクリプト
  tests: {
    unit: string[];        // ユニットテスト
    html: string[];        // HTMLテストファイル
  };
  root: string[];          // root直下に残すファイル
}
```

### ファイル移動操作

```typescript
interface FileMoveOperation {
  source: string;          // 移動元の相対パス
  destination: string;     // 移動先の相対パス
  requiresPathUpdate: boolean;  // パス参照更新が必要か
  affectedFiles: string[]; // 影響を受けるファイルのリスト
}
```

## エラーハンドリング

### エラーケースと対処

1. **ファイルが既に存在する場合**
   - 移動先に同名ファイルが存在する場合は、上書きせずにエラーを報告
   - ユーザーに確認を求める

2. **ディレクトリ作成の失敗**
   - `docs/deployment`や`scripts`ディレクトリの作成に失敗した場合
   - 適切なエラーメッセージを表示し、処理を中断

3. **パス参照の更新漏れ**
   - 移動後にリンク切れが発生する可能性
   - 移動前に全ての参照を検索し、リストアップ

4. **実行権限の喪失**
   - シェルスクリプトの実行権限が失われる可能性
   - 移動後に実行権限を再設定

## テスト戦略

### 検証項目

1. **ファイル移動の検証**
   - 全てのファイルが正しい場所に移動されたことを確認
   - 元の場所にファイルが残っていないことを確認

2. **パス参照の検証**
   - HTMLファイル内のscript/link/img タグのパスが正しいことを確認
   - 相対パスが正しく機能することを確認

3. **アプリケーション動作の検証**
   - `npm run dev`でアプリケーションが起動することを確認
   - index.htmlが正常に表示されることを確認
   - JavaScriptファイルが正しく読み込まれることを確認

4. **テスト実行の検証**
   - `npm test`が正常に実行されることを確認
   - `npm run test:e2e`が正常に実行されることを確認
   - 移動したテストHTMLファイルがブラウザで開けることを確認

5. **スクリプト実行の検証**
   - `scripts/`ディレクトリ内のスクリプトが実行可能であることを確認
   - 実行権限が保持されていることを確認

### テスト手順

1. **移動前の状態確認**
   ```bash
   # ファイル一覧を記録
   ls -la > before_restructure.txt
   
   # アプリケーションが動作することを確認
   npm run dev
   npm test
   ```

2. **移動実行**
   - ファイル移動スクリプトを実行

3. **移動後の検証**
   ```bash
   # ファイル一覧を記録
   ls -la > after_restructure.txt
   
   # 差分を確認
   diff before_restructure.txt after_restructure.txt
   
   # アプリケーションが動作することを確認
   npm run dev
   npm test
   npm run test:e2e
   
   # スクリプトの実行権限確認
   ls -la scripts/
   ```

4. **ブラウザでの動作確認**
   - http://localhost:8080 にアクセス
   - 開発者ツールでエラーがないことを確認
   - 全ての機能が正常に動作することを確認

## 実装の考慮事項

### 段階的な移行

1. **Phase 1: ディレクトリ作成**
   - `docs/`、`docs/deployment/`、`scripts/`ディレクトリを作成

2. **Phase 2: ファイル移動**
   - ドキュメントファイルを移動
   - スクリプトファイルを移動
   - テストファイルを移動

3. **Phase 3: パス参照更新**
   - テストHTMLファイルのパス参照を更新
   - ドキュメント内のパス参照を更新

4. **Phase 4: 検証**
   - アプリケーション動作確認
   - テスト実行確認
   - ドキュメント確認

### Git管理

- `git mv`コマンドを使用してファイル移動の履歴を保持
- 一度のコミットで全ての変更を含める
- コミットメッセージに構造変更の詳細を記載

### ロールバック計画

- 移動前の状態をバックアップ
- 問題が発生した場合は、gitで元の状態に戻す
- `git revert`または`git reset`を使用

## セキュリティ考慮事項

- スクリプトファイルの実行権限を適切に管理
- 機密情報を含むファイルが誤って公開されないよう確認
- `.gitignore`の設定が新しい構造でも有効であることを確認

## パフォーマンス考慮事項

- ファイル移動はアプリケーションのパフォーマンスに影響しない
- ビルドプロセスやテスト実行時間に変化がないことを確認
