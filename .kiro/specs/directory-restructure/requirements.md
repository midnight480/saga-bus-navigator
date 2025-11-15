# 要件定義書

## はじめに

佐賀バスナビゲーターのプロジェクトは、現在root直下に多数のファイル（Markdown、JavaScript、JSON、HTML）が散在しており、プロジェクトの保守性と可読性が低下しています。本要件定義書では、ファイルを役割ごとに整理し、標準的なプロジェクト構造に再編成することを目的とします。

## 用語集

- **System**: 佐賀バスナビゲーターのファイルシステム構造
- **Root Directory**: プロジェクトの最上位ディレクトリ
- **Documentation Files**: Markdownファイル（.md拡張子）
- **Source Files**: アプリケーションのソースコード（HTML、JavaScript、CSS）
- **Configuration Files**: プロジェクト設定ファイル（JSON、設定ファイル）
- **Test Files**: テストコード及びテスト関連ファイル
- **Deployment Files**: デプロイメント関連のドキュメント及びスクリプト

## 要件

### 要件1: ドキュメントファイルの整理

**ユーザーストーリー:** 開発者として、プロジェクトのドキュメントを一箇所で管理したいので、ドキュメントファイルが適切なディレクトリに配置されることを望みます

#### 受入基準

1. THE System SHALL 全てのMarkdownファイル（README.mdを除く）を`docs`ディレクトリに移動する
2. WHEN デプロイメント関連のMarkdownファイルが存在する場合、THE System SHALL それらを`docs/deployment`サブディレクトリに配置する
3. WHEN 要件定義や設計に関するMarkdownファイルが存在する場合、THE System SHALL それらを`docs`ディレクトリ直下に配置する
4. THE System SHALL README.mdファイルをroot直下に保持する

### 要件2: テストファイルの統合

**ユーザーストーリー:** 開発者として、全てのテストファイルを一箇所で管理したいので、テスト関連ファイルが統一されたディレクトリ構造に配置されることを望みます

#### 受入基準

1. THE System SHALL root直下のテスト用HTMLファイル（test-で始まるファイル）を`tests`ディレクトリに移動する
2. THE System SHALL root直下のテスト用JavaScriptファイル（test-で始まるファイル）を`tests`ディレクトリに移動する
3. THE System SHALL 既存の`tests`ディレクトリと`e2e`ディレクトリを保持する
4. THE System SHALL `test-results`ディレクトリを保持する

### 要件3: 設定ファイルの整理

**ユーザーストーリー:** 開発者として、プロジェクト設定ファイルの役割を明確に理解したいので、設定ファイルが適切に配置されることを望みます

#### 受入基準

1. THE System SHALL package.json、package-lock.json、manifest.jsonをroot直下に保持する
2. THE System SHALL ESLint、Prettier、Playwright、Vitestの設定ファイルをroot直下に保持する
3. THE System SHALL `_headers`ファイル（Cloudflare Pages用）をroot直下に保持する

### 要件4: スクリプトファイルの整理

**ユーザーストーリー:** 開発者として、ビルドやデプロイメント用のスクリプトを見つけやすくしたいので、スクリプトファイルが適切なディレクトリに配置されることを望みます

#### 受入基準

1. THE System SHALL Pythonスクリプト（.py拡張子）を`scripts`ディレクトリに移動する
2. THE System SHALL シェルスクリプト（.sh拡張子）を`scripts`ディレクトリに移動する
3. THE System SHALL `scripts`ディレクトリ内でスクリプトの実行権限を保持する

### 要件5: ソースファイルの構造維持

**ユーザーストーリー:** 開発者として、既存のアプリケーション構造を壊さずに整理したいので、ソースファイルのディレクトリ構造が保持されることを望みます

#### 受入基準

1. THE System SHALL index.htmlファイルをroot直下に保持する
2. THE System SHALL `js`、`css`、`icons`、`data`ディレクトリを現在の位置に保持する
3. THE System SHALL `.git`、`.kiro`、`.vscode`、`node_modules`ディレクトリを現在の位置に保持する

### 要件6: パス参照の更新

**ユーザーストーリー:** 開発者として、ファイル移動後もアプリケーションが正常に動作することを望むので、全てのファイルパス参照が正しく更新されることを期待します

#### 受入基準

1. WHEN ファイルが移動された場合、THE System SHALL 移動されたファイルを参照する全てのimport文とrequire文を更新する
2. WHEN ファイルが移動された場合、THE System SHALL 移動されたファイルを参照する全てのスクリプトパスを更新する
3. WHEN ファイルが移動された場合、THE System SHALL package.jsonのscriptsセクション内のパス参照を更新する
4. THE System SHALL 更新後のパス参照が相対パスとして正しく機能することを保証する

### 要件7: ドキュメントの更新

**ユーザーストーリー:** 開発者として、プロジェクト構造の変更を理解したいので、構造変更に関するドキュメントが更新されることを望みます

#### 受入基準

1. THE System SHALL FILES_STRUCTURE.mdまたは同等のドキュメントを更新し、新しいディレクトリ構造を反映する
2. THE System SHALL README.mdを更新し、新しいファイル配置を反映する（必要な場合）
3. THE System SHALL .kiro/steering/structure.mdを更新し、新しいプロジェクト構造を反映する
