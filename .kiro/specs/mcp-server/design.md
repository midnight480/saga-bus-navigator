# Design Document: MCP Server for Saga Bus Navigator

## Overview

佐賀バスナビゲーターのMCPサーバは、既存のREST API（https://saga-bus.midnight480.com/api）をModel Context Protocol経由で利用可能にするサーバです。TypeScriptとMCP SDK（@modelcontextprotocol/sdk）を使用して実装し、Dockerコンテナとして実行します。

MCPサーバは3つのツール（search_bus_stops、search_routes、get_first_last_bus）を提供し、AI assistantが佐賀市のバス情報にアクセスできるようにします。

## Architecture

### システム構成

```
┌─────────────────┐
│  MCP Client     │ (Claude Desktop等)
│  (AI Assistant) │
└────────┬────────┘
         │ stdio (MCP Protocol)
         │
┌────────▼────────┐
│   MCP Server    │
│  (TypeScript)   │
├─────────────────┤
│ - Tool Handler  │
│ - API Client    │
│ - Error Handler │
└────────┬────────┘
         │ HTTPS
         │
┌────────▼────────┐
│   REST API      │
│ saga-bus.       │
│ midnight480.com │
└─────────────────┘
```

### 通信フロー

1. **MCP Client → MCP Server**: stdio経由でMCPプロトコル通信
2. **MCP Server → REST API**: HTTPSでREST APIを呼び出し
3. **REST API → MCP Server**: JSON形式でレスポンスを返却
4. **MCP Server → MCP Client**: MCPプロトコル形式でレスポンスを返却

### トランスポート層

- **StdioServerTransport**: 標準入出力を使用したMCP通信
- Dockerコンテナ内で実行され、stdio経由でホストと通信
- 環境変数でAPI URLを設定可能

## Components and Interfaces

### 1. MCP Server (index.ts)

MCPサーバのエントリーポイント。サーバの初期化、ツールの登録、リクエストハンドラの設定を行います。

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";

// サーバの初期化
const server = new Server({
  name: "saga-bus-mcp-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

// ツール一覧の登録
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // search_bus_stops, search_routes, get_first_last_busのスキーマ
    ]
  };
});

// ツール実行ハンドラ
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "search_bus_stops":
      return await searchBusStops(args);
    case "search_routes":
      return await searchRoutes(args);
    case "get_first_last_bus":
      return await getFirstLastBus(args);
    default:
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// トランスポートの接続
const transport = new StdioServerTransport();
await server.connect(transport);
```

**責務**:
- MCPサーバの初期化と設定
- ツールスキーマの登録
- リクエストのルーティング
- エラーハンドリング

### 2. API Client (api-client.ts)

REST APIへのHTTPリクエストを行うクライアント。

```typescript
interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 10000;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      return await response.json() as T;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      
      throw error;
    }
  }
}

// シングルトンインスタンス
const apiClient = new ApiClient({
  baseUrl: process.env.API_BASE_URL || 'https://saga-bus.midnight480.com/api'
});

export { apiClient, ApiClient };
```

**責務**:
- REST APIへのHTTPリクエスト
- タイムアウト処理
- エラーハンドリング
- レスポンスのパース

### 3. Tool: search_bus_stops (tools/search-bus-stops.ts)

バス停検索ツールの実装。

```typescript
import { apiClient } from '../api-client.js';

interface SearchBusStopsArgs {
  q: string;
  limit?: number;
}

interface BusStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  next_departure?: {
    route_name: string;
    departure_time: string;
    destination: string;
  };
}

interface SearchBusStopsResponse {
  stops: BusStop[];
  count: number;
}

export const searchBusStopsSchema = {
  name: "search_bus_stops",
  description: "佐賀市内のバス停を名前で検索し、次の発車時刻と路線情報を取得します",
  inputSchema: {
    type: "object",
    properties: {
      q: {
        type: "string",
        description: "検索するバス停名（部分一致）"
      },
      limit: {
        type: "number",
        description: "取得する結果の最大数（デフォルト: 10）",
        default: 10
      }
    },
    required: ["q"]
  }
};

export async function searchBusStops(args: SearchBusStopsArgs) {
  try {
    const response = await apiClient.get<SearchBusStopsResponse>(
      '/stops/search',
      {
        q: args.q,
        limit: args.limit || 10
      }
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`バス停検索に失敗しました: ${error.message}`);
  }
}
```

**責務**:
- バス停検索パラメータの検証
- API呼び出し
- レスポンスの整形

### 4. Tool: search_routes (tools/search-routes.ts)

経路検索ツールの実装。

```typescript
import { apiClient } from '../api-client.js';

interface SearchRoutesArgs {
  from: string;
  to: string;
  time?: string;
  type?: 'departure' | 'arrival';
  weekday?: 'weekday' | 'saturday' | 'holiday';
  limit?: number;
}

interface Route {
  route_id: string;
  route_name: string;
  departure_stop: string;
  arrival_stop: string;
  departure_time: string;
  arrival_time: string;
  travel_time: number;
  fare: number;
  operator: string;
}

interface SearchRoutesResponse {
  routes: Route[];
  count: number;
}

export const searchRoutesSchema = {
  name: "search_routes",
  description: "始点と終点を指定して直通バス便を検索します",
  inputSchema: {
    type: "object",
    properties: {
      from: {
        type: "string",
        description: "出発地のバス停名"
      },
      to: {
        type: "string",
        description: "目的地のバス停名"
      },
      time: {
        type: "string",
        description: "検索基準時刻（HH:MM形式、省略時は現在時刻）"
      },
      type: {
        type: "string",
        enum: ["departure", "arrival"],
        description: "検索タイプ（departure: 出発時刻、arrival: 到着時刻）",
        default: "departure"
      },
      weekday: {
        type: "string",
        enum: ["weekday", "saturday", "holiday"],
        description: "曜日区分（weekday: 平日、saturday: 土曜、holiday: 日曜祝日）"
      },
      limit: {
        type: "number",
        description: "取得する結果の最大数（デフォルト: 10）",
        default: 10
      }
    },
    required: ["from", "to"]
  }
};

export async function searchRoutes(args: SearchRoutesArgs) {
  try {
    const response = await apiClient.get<SearchRoutesResponse>(
      '/routes/search',
      {
        from: args.from,
        to: args.to,
        time: args.time,
        type: args.type || 'departure',
        weekday: args.weekday,
        limit: args.limit || 10
      }
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`経路検索に失敗しました: ${error.message}`);
  }
}
```

**責務**:
- 経路検索パラメータの検証
- API呼び出し
- レスポンスの整形

### 5. Tool: get_first_last_bus (tools/get-first-last-bus.ts)

始発・終電検索ツールの実装。

```typescript
import { apiClient } from '../api-client.js';

interface GetFirstLastBusArgs {
  stop: string;
  to?: string;
  weekday?: 'weekday' | 'saturday' | 'holiday';
}

interface FirstLastBus {
  stop_name: string;
  destination?: string;
  first_bus: {
    time: string;
    route_name: string;
    destination: string;
  };
  last_bus: {
    time: string;
    route_name: string;
    destination: string;
  };
  weekday_type: string;
}

interface GetFirstLastBusResponse {
  data: FirstLastBus;
}

export const getFirstLastBusSchema = {
  name: "get_first_last_bus",
  description: "指定したバス停の始発・終電情報を取得します",
  inputSchema: {
    type: "object",
    properties: {
      stop: {
        type: "string",
        description: "バス停名"
      },
      to: {
        type: "string",
        description: "行先（省略時は全路線）"
      },
      weekday: {
        type: "string",
        enum: ["weekday", "saturday", "holiday"],
        description: "曜日区分（weekday: 平日、saturday: 土曜、holiday: 日曜祝日）"
      }
    },
    required: ["stop"]
  }
};

export async function getFirstLastBus(args: GetFirstLastBusArgs) {
  try {
    const response = await apiClient.get<GetFirstLastBusResponse>(
      '/stops/first-last',
      {
        stop: args.stop,
        to: args.to,
        weekday: args.weekday
      }
    );

    return {
      content: [{
        type: "text",
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`始発・終電情報の取得に失敗しました: ${error.message}`);
  }
}
```

**責務**:
- 始発・終電検索パラメータの検証
- API呼び出し
- レスポンスの整形

## Data Models

### API Request Types

```typescript
// バス停検索リクエスト
interface SearchBusStopsRequest {
  q: string;           // 検索クエリ
  limit?: number;      // 結果数制限
}

// 経路検索リクエスト
interface SearchRoutesRequest {
  from: string;        // 出発地
  to: string;          // 目的地
  time?: string;       // 検索時刻
  type?: 'departure' | 'arrival';  // 検索タイプ
  weekday?: 'weekday' | 'saturday' | 'holiday';  // 曜日区分
  limit?: number;      // 結果数制限
}

// 始発・終電検索リクエスト
interface GetFirstLastBusRequest {
  stop: string;        // バス停名
  to?: string;         // 行先
  weekday?: 'weekday' | 'saturday' | 'holiday';  // 曜日区分
}
```

### API Response Types

```typescript
// バス停情報
interface BusStop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  next_departure?: {
    route_name: string;
    departure_time: string;
    destination: string;
  };
}

// 経路情報
interface Route {
  route_id: string;
  route_name: string;
  departure_stop: string;
  arrival_stop: string;
  departure_time: string;
  arrival_time: string;
  travel_time: number;
  fare: number;
  operator: string;
}

// 始発・終電情報
interface FirstLastBus {
  stop_name: string;
  destination?: string;
  first_bus: {
    time: string;
    route_name: string;
    destination: string;
  };
  last_bus: {
    time: string;
    route_name: string;
    destination: string;
  };
  weekday_type: string;
}
```

### MCP Tool Response Format

```typescript
interface ToolResponse {
  content: Array<{
    type: "text";
    text: string;  // JSON文字列
  }>;
}
```

## Correctness Properties

*プロパティとは、システムの全ての有効な実行において真であるべき特性や振る舞いのことです。プロパティは人間が読める仕様と機械が検証可能な正確性保証の橋渡しとなります。*

### Property 1: ツール呼び出しのAPI転送

*任意の*ツール呼び出しに対して、MCPサーバは対応するREST APIエンドポイントに正しくリクエストを転送する必要があります。
**Validates: Requirements 1.1, 2.1, 3.1**

### Property 2: パラメータの完全な転送

*任意の*ツールパラメータに対して、MCPサーバはそのパラメータを欠落なくREST APIに渡す必要があります。
**Validates: Requirements 1.3, 2.2, 2.3, 2.4, 3.2, 3.3**

### Property 3: レスポンス構造の完全性

*任意の*APIレスポンスに対して、MCPサーバは要求された全てのフィールド（名前、位置、時刻、路線情報など）を含むレスポンスを返す必要があります。
**Validates: Requirements 1.2, 2.5, 3.4**

### Property 4: エラーメッセージの記述性

*任意の*エラー（APIエラー、タイムアウト、ネットワークエラー）に対して、MCPサーバは人間が理解できる記述的なエラーメッセージを返す必要があります。
**Validates: Requirements 1.4, 2.6, 3.5, 4.3, 4.4**

### Property 5: 環境変数の優先順位

*任意の*環境変数設定に対して、API_BASE_URLが設定されている場合はその値を使用し、未設定の場合はデフォルトURLを使用する必要があります。
**Validates: Requirements 4.1, 6.2**

### Property 6: レスポンス検証の実行

*任意の*APIレスポンスに対して、MCPサーバはデータを返す前にレスポンス構造を検証する必要があります。
**Validates: Requirements 4.5**

### Property 7: ツールスキーマの完全性

*任意の*登録されたツールに対して、入力パラメータと戻り値の型が正しく定義されたスキーマが存在する必要があります。
**Validates: Requirements 5.2**

### Property 8: パラメータ検証の実行

*任意の*ツール呼び出しに対して、MCPサーバは入力パラメータがスキーマに適合することを検証し、不適合な場合は拒否する必要があります。
**Validates: Requirements 5.3**

### Property 9: MCPレスポンス形式の準拠

*任意の*ツール実行結果（成功またはエラー）に対して、MCPサーバはMCPプロトコルに準拠した形式でレスポンスを返す必要があります。
**Validates: Requirements 5.4, 5.5**

## Error Handling

### エラーの分類

1. **API通信エラー**
   - タイムアウト: 10秒でタイムアウト、"Request timeout after 10000ms"を返す
   - ネットワークエラー: 接続失敗時、"Network error: [詳細]"を返す
   - HTTPエラー: 非200ステータス時、"API error: [status] [statusText] - [body]"を返す

2. **パラメータ検証エラー**
   - 必須パラメータ欠落: MCPErrorを投げる（ErrorCode.InvalidParams）
   - 型不一致: MCPErrorを投げる（ErrorCode.InvalidParams）
   - 範囲外の値: MCPErrorを投げる（ErrorCode.InvalidParams）

3. **ツール実行エラー**
   - 未知のツール: MCPErrorを投げる（ErrorCode.MethodNotFound）
   - 内部エラー: MCPErrorを投げる（ErrorCode.InternalError）

### エラーレスポンス形式

```typescript
// MCP準拠のエラーレスポンス
{
  error: {
    code: ErrorCode,
    message: string,
    data?: any
  }
}
```

### エラーハンドリングフロー

```
ツール呼び出し
    ↓
パラメータ検証
    ↓ (検証失敗)
    └→ MCPError(InvalidParams)
    ↓ (検証成功)
API呼び出し
    ↓ (タイムアウト)
    └→ Error("Request timeout...")
    ↓ (ネットワークエラー)
    └→ Error("Network error...")
    ↓ (HTTPエラー)
    └→ Error("API error...")
    ↓ (成功)
レスポンス検証
    ↓ (検証失敗)
    └→ Error("Invalid response structure")
    ↓ (検証成功)
MCPレスポンス返却
```

## Testing Strategy

### テストアプローチ

本プロジェクトでは、**ユニットテスト**と**プロパティベーステスト**の両方を使用します。

- **ユニットテスト**: 特定の例、エッジケース、エラー条件を検証
- **プロパティベーステスト**: 全ての入力に対して成り立つべき普遍的なプロパティを検証

両者は補完的であり、包括的なカバレッジを実現するために両方が必要です。

### プロパティベーステスト設定

- **テストライブラリ**: fast-check（TypeScript用プロパティベーステストライブラリ）
- **実行回数**: 各プロパティテストは最小100回実行
- **タグ形式**: `// Feature: mcp-server, Property N: [プロパティテキスト]`
- **実装ルール**: 各正確性プロパティは単一のプロパティベーステストで実装

### テスト構成

```typescript
// プロパティベーステストの例
import fc from 'fast-check';

describe('MCP Server Properties', () => {
  // Feature: mcp-server, Property 1: ツール呼び出しのAPI転送
  it('should forward all tool calls to correct API endpoints', () => {
    fc.assert(
      fc.property(
        fc.record({
          tool: fc.constantFrom('search_bus_stops', 'search_routes', 'get_first_last_bus'),
          params: fc.object()
        }),
        async ({ tool, params }) => {
          // テストロジック
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### ユニットテストのバランス

- ユニットテストは特定の例とエッジケースに焦点を当てる
- プロパティベーステストが多数の入力をカバーするため、過度なユニットテストは避ける
- ユニットテストの焦点:
  - 具体的な動作を示す例
  - コンポーネント間の統合ポイント
  - エッジケースとエラー条件

### テストカバレッジ

1. **API Client**
   - タイムアウト処理のユニットテスト
   - HTTPエラーハンドリングのユニットテスト
   - レスポンスパースのプロパティテスト

2. **各ツール**
   - パラメータ検証のプロパティテスト
   - API呼び出しのプロパティテスト
   - レスポンス整形のプロパティテスト

3. **MCPサーバ**
   - ツールルーティングのユニットテスト
   - エラーハンドリングのプロパティテスト
   - MCPレスポンス形式のプロパティテスト

## Deployment

### Docker Hub配布戦略

GitHubリポジトリがクローズドであるため、Docker Hubでイメージを公開配布します。

**Docker Hubリポジトリ**: `midnight480/saga-bus-mcp-server`

### Docker構成

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# ソースコードのコピー
COPY build ./build

# 環境変数のデフォルト値
ENV API_BASE_URL=https://saga-bus.midnight480.com/api

# MCPサーバの起動
CMD ["node", "build/index.js"]
```

### ユーザー向けdocker-compose.yml

```yaml
version: '3.8'

services:
  mcp-server:
    image: midnight480/saga-bus-mcp-server:latest
    environment:
      - API_BASE_URL=${API_BASE_URL:-https://saga-bus.midnight480.com/api}
    stdin_open: true
    tty: true
```

### 環境変数

- `API_BASE_URL`: REST APIのベースURL（デフォルト: https://saga-bus.midnight480.com/api）

### ビルドとデプロイ手順（開発者向け）

1. TypeScriptのビルド: `npm run build`
2. Dockerイメージのビルド: `docker build -t midnight480/saga-bus-mcp-server:latest .`
3. Docker Hubへのプッシュ: `docker push midnight480/saga-bus-mcp-server:latest`
4. タグ付け（バージョン管理）: `docker tag midnight480/saga-bus-mcp-server:latest midnight480/saga-bus-mcp-server:1.0.0`

### ユーザー向け利用手順

1. Docker Hubからイメージを取得: `docker pull midnight480/saga-bus-mcp-server:latest`
2. コンテナの起動: `docker-compose up -d`
3. 動作確認: MCPクライアント（Claude Desktop等）から接続テスト

### Claude Desktop設定例

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

## Implementation Notes

### 開発環境のセットアップ

```bash
# プロジェクトの初期化
npm init -y

# 依存関係のインストール
npm install @modelcontextprotocol/sdk

# 開発依存関係のインストール
npm install -D typescript @types/node fast-check vitest
```

### ビルドスクリプト

```json
{
  "scripts": {
    "build": "tsc && chmod +x build/index.js",
    "watch": "tsc --watch",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### TypeScript設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

