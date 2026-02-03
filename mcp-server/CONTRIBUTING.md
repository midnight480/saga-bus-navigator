# 開発者向けガイド

Saga Bus MCP Serverの開発に貢献していただきありがとうございます。このドキュメントでは、開発環境のセットアップから、ビルド、テスト、デプロイまでの手順を説明します。

## 開発環境のセットアップ

### 必要な環境

- Node.js 20以上
- npm 9以上
- Docker（コンテナビルド用）
- Git

### プロジェクトのクローン

```bash
git clone https://github.com/midnight480/saga-bus-navigator.git
cd saga-bus-navigator/mcp-server
```

### 依存関係のインストール

```bash
npm install
```

## 開発

### ディレクトリ構造

```
mcp-server/
├── src/                    # ソースコード
│   ├── index.ts           # エントリーポイント
│   ├── api-client.ts      # API Client
│   └── tools/             # MCPツール
│       ├── search-bus-stops.ts
│       ├── search-routes.ts
│       └── get-first-last-bus.ts
├── build/                 # ビルド出力
├── Dockerfile            # Dockerイメージ定義
├── docker-compose.yml    # Docker Compose設定
└── package.json          # npm設定
```

### ビルド

TypeScriptをJavaScriptにコンパイルします：

```bash
npm run build
```

ビルド出力は`build/`ディレクトリに生成されます。

### 開発モード

ファイル変更を監視して自動的に再ビルドします：

```bash
npm run watch
```

## テスト

### 全テストの実行

```bash
npm test
```

### 特定のテストファイルの実行

```bash
# ユニットテストのみ
npm test -- api-client.test.ts

# プロパティベーステストのみ
npm test -- api-client.property.test.ts
```

### テストカバレッジ

```bash
npm run test:coverage
```

### テストの種類

#### ユニットテスト

特定の例とエッジケースを検証します。ファイル名は`*.test.ts`です。

#### プロパティベーステスト

fast-checkを使用して、全ての入力に対して成り立つべき普遍的なプロパティを検証します。ファイル名は`*.property.test.ts`です。

#### 統合テスト

実際のAPI呼び出しを行う統合テストです。ファイル名は`*.integration.test.ts`です。

## コーディング規約

### TypeScript

- strict modeを有効にしています
- 型定義は明示的に記述してください
- `any`型の使用は最小限に抑えてください

### コメント

- 関数やクラスにはJSDocコメントを記述してください
- 複雑なロジックには説明コメントを追加してください

### フォーマット

プロジェクトではTypeScriptの標準的なフォーマットを使用しています。

## Docker

### Dockerイメージのビルド

```bash
# ビルド前にTypeScriptをコンパイル
npm run build

# Dockerイメージのビルド
docker build -t saga-bus-mcp-server:local .
```

### ローカルでのテスト

```bash
# コンテナの起動
docker run -i --rm saga-bus-mcp-server:local

# 環境変数を指定して起動
docker run -i --rm -e API_BASE_URL=https://custom-api.example.com/api saga-bus-mcp-server:local
```

### docker-composeでのテスト

```bash
# コンテナの起動
docker-compose up

# バックグラウンドで起動
docker-compose up -d

# ログの確認
docker-compose logs -f

# コンテナの停止
docker-compose down
```

## Docker Hubへのデプロイ

### 前提条件

- Docker Hubアカウント
- `midnight480`組織へのアクセス権限

### デプロイ手順

1. **ビルド**

```bash
# TypeScriptのビルド
npm run build

# Dockerイメージのビルド
docker build -t midnight480/saga-bus-mcp-server:latest .
```

2. **タグ付け**

```bash
# バージョンタグの作成
docker tag midnight480/saga-bus-mcp-server:latest midnight480/saga-bus-mcp-server:1.0.0
```

3. **Docker Hubへのログイン**

```bash
docker login
```

4. **プッシュ**

```bash
# latestタグのプッシュ
docker push midnight480/saga-bus-mcp-server:latest

# バージョンタグのプッシュ
docker push midnight480/saga-bus-mcp-server:1.0.0
```

## リリースプロセス

1. **バージョンの更新**

`package.json`のバージョンを更新します：

```bash
npm version patch  # パッチバージョン (1.0.0 -> 1.0.1)
npm version minor  # マイナーバージョン (1.0.0 -> 1.1.0)
npm version major  # メジャーバージョン (1.0.0 -> 2.0.0)
```

2. **テストの実行**

```bash
npm test
```

3. **ビルドとデプロイ**

上記の「Docker Hubへのデプロイ」手順に従ってください。

4. **Gitタグの作成**

```bash
git tag v1.0.0
git push origin v1.0.0
```

## トラブルシューティング

### ビルドエラー

TypeScriptのコンパイルエラーが発生した場合：

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install
```

### テストエラー

テストが失敗する場合：

```bash
# キャッシュをクリアして再実行
npm test -- --no-cache
```

### Dockerビルドエラー

Dockerイメージのビルドが失敗する場合：

```bash
# ビルドキャッシュをクリア
docker build --no-cache -t saga-bus-mcp-server:local .
```

## 貢献方法

1. このリポジトリをフォークします
2. 新しいブランチを作成します（`git checkout -b feature/amazing-feature`）
3. 変更をコミットします（`git commit -m 'Add amazing feature'`）
4. ブランチにプッシュします（`git push origin feature/amazing-feature`）
5. Pull Requestを作成します

## コミットメッセージ

コミットメッセージは以下の形式で記述してください：

```
<type>: <subject>

<body>
```

**Type:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの意味に影響しない変更（空白、フォーマットなど）
- `refactor`: バグ修正や機能追加を伴わないコード変更
- `test`: テストの追加や修正
- `chore`: ビルドプロセスやツールの変更

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## サポート

質問や問題がある場合は、GitHubのIssueで報告してください。
