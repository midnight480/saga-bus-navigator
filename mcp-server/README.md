# Saga Bus MCP Server

佐賀市のバス情報にアクセスできるModel Context Protocol (MCP) サーバです。AI assistantが佐賀市内のバス停検索、経路検索、始発・終電情報の取得を行えるようにします。

## 機能

このMCPサーバは以下の3つのツールを提供します：

### 1. search_bus_stops - バス停検索

佐賀市内のバス停を名前で検索し、次の発車時刻と路線情報を取得します。

**パラメータ:**
- `q` (必須): 検索するバス停名（部分一致）
- `limit` (オプション): 取得する結果の最大数（デフォルト: 10）

**使用例:**
```json
{
  "q": "佐賀駅",
  "limit": 5
}
```

### 2. search_routes - 経路検索

始点と終点を指定して直通バス便を検索します。

**パラメータ:**
- `from` (必須): 出発地のバス停名
- `to` (必須): 目的地のバス停名
- `time` (オプション): 検索基準時刻（HH:MM形式、省略時は現在時刻）
- `type` (オプション): 検索タイプ（`departure`: 出発時刻、`arrival`: 到着時刻、デフォルト: `departure`）
- `weekday` (オプション): 曜日区分（`weekday`: 平日、`saturday`: 土曜、`holiday`: 日曜祝日）
- `limit` (オプション): 取得する結果の最大数（デフォルト: 10）

**使用例:**
```json
{
  "from": "佐賀駅バスセンター",
  "to": "市役所前",
  "time": "09:00",
  "type": "departure",
  "weekday": "weekday"
}
```

### 3. get_first_last_bus - 始発・終電検索

指定したバス停の始発・終電情報を取得します。

**パラメータ:**
- `stop` (必須): バス停名
- `to` (オプション): 行先（省略時は全路線）
- `weekday` (オプション): 曜日区分（`weekday`: 平日、`saturday`: 土曜、`holiday`: 日曜祝日）

**使用例:**
```json
{
  "stop": "佐賀駅バスセンター",
  "to": "市役所前",
  "weekday": "weekday"
}
```

## インストール

### Docker Hubからのインストール（推奨）

```bash
# イメージの取得
docker pull midnight480/saga-bus-mcp-server:latest

# コンテナの起動
docker run -i --rm midnight480/saga-bus-mcp-server:latest
```

### docker-composeを使用する場合

```bash
# docker-compose.ymlをダウンロード
curl -O https://raw.githubusercontent.com/midnight480/saga-bus-navigator/main/mcp-server/docker-compose.yml

# コンテナの起動
docker-compose up -d
```

## 使用方法

### Claude Desktopでの設定

Claude Desktopの設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json`）に以下を追加します：

```json
{
  "mcpServers": {
    "saga-bus": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "midnight480/saga-bus-mcp-server:latest"
      ]
    }
  }
}
```

設定後、Claude Desktopを再起動すると、佐賀市のバス情報にアクセスできるようになります。

### 環境変数

- `API_BASE_URL`: REST APIのベースURL（デフォルト: `https://saga-bus.midnight480.com/api`）

カスタムAPIエンドポイントを使用する場合：

```json
{
  "mcpServers": {
    "saga-bus": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "API_BASE_URL=https://your-custom-api.example.com/api",
        "midnight480/saga-bus-mcp-server:latest"
      ]
    }
  }
}
```

## 技術スタック

- **言語**: TypeScript
- **MCPライブラリ**: @modelcontextprotocol/sdk
- **ランタイム**: Node.js 20
- **コンテナ**: Docker (Alpine Linux)
- **テスト**: Vitest, fast-check (プロパティベーステスト)

## データソース

このMCPサーバは、佐賀市のバス情報を提供するREST API（https://saga-bus.midnight480.com/api）を使用しています。

対象事業者：
- 佐賀市営バス
- 祐徳バス
- 西鉄バス佐賀エリア

## ライセンス

MIT License

## 開発者向け情報

開発環境のセットアップや貢献方法については、[CONTRIBUTING.md](./CONTRIBUTING.md)を参照してください。

## サポート

問題が発生した場合は、GitHubのIssueで報告してください。

## 関連リンク

- [佐賀バスナビゲーター](https://saga-bus.midnight480.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Claude Desktop](https://claude.ai/desktop)
