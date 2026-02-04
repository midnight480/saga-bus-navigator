# MCP Apps - 佐賀バスナビゲーター

[English](#english) | [日本語](#japanese)

---

<a name="japanese"></a>
## 日本語

### 概要

佐賀バスナビゲーターをMCP Apps（Model Context Protocol Applications）として提供します。Claude等のAIアシスタントから佐賀市内のバス情報を検索・取得できます。

### エンドポイント

```
https://saga-bus.midnight480.com/api/mcp
```

### プロトコル

- **MCP仕様**: 2025-03-26
- **トランスポート**: Streamable HTTP
- **メッセージ形式**: JSON-RPC 2.0

### 認証

現在、認証は不要です。ただし、レート制限が適用されます（60リクエスト/分/IP）。

### 利用可能なツール

#### 1. バス停検索 (`search_bus_stops`)

バス停名の一部を指定して、該当するバス停を検索します。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 | デフォルト |
|------|-----|------|------|-----------|
| `query` | string | ✓ | バス停名の一部（例：「佐賀駅」「県庁」） | - |
| `limit` | number | - | 最大結果数 | 10 |

**レスポンス:**

```json
{
  "stops": [
    {
      "id": "stop_001",
      "name": "佐賀駅バスセンター",
      "lat": 33.2653,
      "lng": 130.3000
    }
  ]
}
```

**利用例:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_bus_stops",
    "arguments": {
      "query": "佐賀駅"
    }
  }
}
```

#### 2. 路線検索 (`search_routes`)

出発地と目的地を指定して、利用可能なバス路線を検索します。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 | デフォルト |
|------|-----|------|------|-----------|
| `from_stop_id` | string | ✓ | 乗車バス停ID | - |
| `to_stop_id` | string | ✓ | 降車バス停ID | - |
| `time` | string | - | 検索時刻（HH:MM形式） | 現在時刻 |

**レスポンス:**

```json
{
  "routes": [
    {
      "route_id": "route_001",
      "route_name": "佐賀駅～県庁線",
      "departure_time": "09:00",
      "arrival_time": "09:15",
      "duration_minutes": 15,
      "fare": {
        "adult": 200,
        "child": 100
      }
    }
  ]
}
```

**利用例:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_routes",
    "arguments": {
      "from_stop_id": "stop_001",
      "to_stop_id": "stop_002",
      "time": "09:00"
    }
  }
}
```

#### 3. 始発・終バス検索 (`get_first_last_bus`)

指定した路線の始発と終バスの時刻を取得します。

**パラメータ:**

| 名前 | 型 | 必須 | 説明 |
|------|-----|------|------|
| `route_id` | string | ✓ | 路線ID |

**レスポンス:**

```json
{
  "first_bus": {
    "trip_id": "trip_001",
    "departure_time": "06:00",
    "arrival_time": "06:30"
  },
  "last_bus": {
    "trip_id": "trip_999",
    "departure_time": "22:00",
    "arrival_time": "22:30"
  }
}
```

**利用例:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_first_last_bus",
    "arguments": {
      "route_id": "route_001"
    }
  }
}
```

### MCPプロトコルメソッド

#### 初期化 (`initialize`)

MCPサーバーとの接続を初期化します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "capabilities": {},
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "saga-bus-navigator-mcp",
      "version": "1.0.0"
    }
  }
}
```

#### ツールリスト取得 (`tools/list`)

利用可能なツールの一覧を取得します。

**リクエスト:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**レスポンス:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_bus_stops",
        "description": "佐賀市内のバス停を名前で検索します",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "バス停名の一部"
            },
            "limit": {
              "type": "number",
              "description": "最大結果数",
              "default": 10
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### エラーコード

| コード | 名前 | 説明 |
|--------|------|------|
| -32700 | Parse error | JSON解析エラー |
| -32600 | Invalid Request | 無効なリクエスト形式 |
| -32601 | Method not found | メソッドが存在しない |
| -32602 | Invalid params | 無効なパラメータ |
| -32603 | Internal error | 内部エラー |
| -32001 | Tool not found | ツールが存在しない |
| -32002 | Tool execution error | ツール実行エラー |
| -32003 | Rate limit exceeded | レート制限超過 |

**エラーレスポンス例:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required parameter: query",
      "validationErrors": [
        {
          "field": "query",
          "message": "Required parameter is missing"
        }
      ]
    }
  }
}
```

### レート制限

- **制限**: 60リクエスト/分/IPアドレス
- **超過時**: HTTPステータス429とエラーコード-32003を返す
- **ヘッダー**:
  - `X-RateLimit-Limit`: 制限値（60）
  - `X-RateLimit-Remaining`: 残りリクエスト数
  - `X-RateLimit-Reset`: リセット時刻（Unixタイムスタンプ）
  - `Retry-After`: 再試行までの秒数

### CORS対応

全てのオリジンからのアクセスを許可しています。

**レスポンスヘッダー:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Mcp-Session-Id, Last-Event-ID
Access-Control-Max-Age: 600
```

### セキュリティヘッダー

全てのレスポンスに以下のセキュリティヘッダーが含まれます：

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### Claude Desktopでの利用方法

1. Claude Desktopの設定ファイル（`claude_desktop_config.json`）を開く
2. 以下の設定を追加：

```json
{
  "mcpServers": {
    "saga-bus": {
      "url": "https://saga-bus.midnight480.com/api/mcp",
      "transport": "http"
    }
  }
}
```

3. Claude Desktopを再起動
4. 「佐賀駅周辺のバス停を教えて」などと質問

### Cursorでの利用方法

1. Cursorの設定を開く
2. MCP Serversセクションで「Add Server」をクリック
3. 以下の情報を入力：
   - Name: `saga-bus`
   - URL: `https://saga-bus.midnight480.com/api/mcp`
   - Transport: `HTTP`
4. 保存して再起動

### プログラムからの利用例

#### TypeScript (MCP SDK使用)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';

// クライアントを初期化
const transport = new StreamableHTTPClientTransport({
  url: 'https://saga-bus.midnight480.com/api/mcp',
});

const client = new Client(
  {
    name: 'my-app',
    version: '1.0.0',
  },
  {
    capabilities: {},
  }
);

await client.connect(transport);

// バス停を検索
const result = await client.callTool({
  name: 'search_bus_stops',
  arguments: {
    query: '佐賀駅',
  },
});

console.log(result);
```

#### Python (requests使用)

```python
import requests

url = 'https://saga-bus.midnight480.com/api/mcp'

# バス停を検索
payload = {
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'tools/call',
    'params': {
        'name': 'search_bus_stops',
        'arguments': {
            'query': '佐賀駅'
        }
    }
}

response = requests.post(url, json=payload)
print(response.json())
```

#### cURL

```bash
curl -X POST https://saga-bus.midnight480.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_bus_stops",
      "arguments": {
        "query": "佐賀駅"
      }
    }
  }'
```

### バッチリクエスト

複数のリクエストを1回のHTTPリクエストで送信できます。

**リクエスト:**

```json
[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_bus_stops",
      "arguments": {
        "query": "佐賀駅"
      }
    }
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_bus_stops",
      "arguments": {
        "query": "県庁"
      }
    }
  }
]
```

**レスポンス:**

```json
[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "content": [
        {
          "type": "text",
          "text": "{\"stops\":[...]}"
        }
      ]
    }
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "result": {
      "content": [
        {
          "type": "text",
          "text": "{\"stops\":[...]}"
        }
      ]
    }
  }
]
```

### トラブルシューティング

#### レート制限エラー（429）

**原因**: 1分間に60回以上のリクエストを送信した

**解決策**:
- `Retry-After`ヘッダーの秒数だけ待機してから再試行
- リクエスト頻度を減らす
- バッチリクエストを使用して複数のツール呼び出しを1回のHTTPリクエストにまとめる

#### パラメータエラー（-32602）

**原因**: 必須パラメータが不足している、または無効な値が指定されている

**解決策**:
- エラーレスポンスの`data.validationErrors`を確認
- 各ツールの必須パラメータを確認
- パラメータの型が正しいか確認

#### ツール実行エラー（-32002）

**原因**: REST API呼び出しが失敗した、またはデータが見つからない

**解決策**:
- バス停IDや路線IDが正しいか確認
- 時刻形式が正しいか確認（HH:MM）
- しばらく待ってから再試行

### 関連リンク

- [MCP仕様](https://spec.modelcontextprotocol.io/)
- [佐賀バスナビゲーター](https://saga-bus.midnight480.com/)
- [佐賀市オープンデータ](https://www.city.saga.lg.jp/main/3697.html)

---

<a name="english"></a>
## English

### Overview

Saga Bus Navigator is available as MCP Apps (Model Context Protocol Applications). You can search and retrieve bus information in Saga City from AI assistants like Claude.

### Endpoint

```
https://saga-bus.midnight480.com/api/mcp
```

### Protocol

- **MCP Specification**: 2025-03-26
- **Transport**: Streamable HTTP
- **Message Format**: JSON-RPC 2.0

### Authentication

Currently, no authentication is required. However, rate limiting is applied (60 requests/minute/IP).

### Available Tools

#### 1. Search Bus Stops (`search_bus_stops`)

Search for bus stops by partial name match.

**Parameters:**

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| `query` | string | ✓ | Partial bus stop name (e.g., "Saga Station", "Prefectural Office") | - |
| `limit` | number | - | Maximum number of results | 10 |

**Response:**

```json
{
  "stops": [
    {
      "id": "stop_001",
      "name": "Saga Station Bus Center",
      "lat": 33.2653,
      "lng": 130.3000
    }
  ]
}
```

**Example:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search_bus_stops",
    "arguments": {
      "query": "Saga Station"
    }
  }
}
```

#### 2. Search Routes (`search_routes`)

Search for available bus routes by specifying origin and destination.

**Parameters:**

| Name | Type | Required | Description | Default |
|------|------|----------|-------------|---------|
| `from_stop_id` | string | ✓ | Boarding bus stop ID | - |
| `to_stop_id` | string | ✓ | Alighting bus stop ID | - |
| `time` | string | - | Search time (HH:MM format) | Current time |

**Response:**

```json
{
  "routes": [
    {
      "route_id": "route_001",
      "route_name": "Saga Station - Prefectural Office Line",
      "departure_time": "09:00",
      "arrival_time": "09:15",
      "duration_minutes": 15,
      "fare": {
        "adult": 200,
        "child": 100
      }
    }
  ]
}
```

**Example:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "search_routes",
    "arguments": {
      "from_stop_id": "stop_001",
      "to_stop_id": "stop_002",
      "time": "09:00"
    }
  }
}
```

#### 3. Get First and Last Bus (`get_first_last_bus`)

Get the first and last bus times for a specified route.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `route_id` | string | ✓ | Route ID |

**Response:**

```json
{
  "first_bus": {
    "trip_id": "trip_001",
    "departure_time": "06:00",
    "arrival_time": "06:30"
  },
  "last_bus": {
    "trip_id": "trip_999",
    "departure_time": "22:00",
    "arrival_time": "22:30"
  }
}
```

**Example:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_first_last_bus",
    "arguments": {
      "route_id": "route_001"
    }
  }
}
```

### MCP Protocol Methods

#### Initialize (`initialize`)

Initialize connection with the MCP server.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-03-26",
    "capabilities": {},
    "clientInfo": {
      "name": "claude-desktop",
      "version": "1.0.0"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 0,
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "saga-bus-navigator-mcp",
      "version": "1.0.0"
    }
  }
}
```

#### List Tools (`tools/list`)

Get a list of available tools.

**Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "search_bus_stops",
        "description": "Search for bus stops in Saga City by name",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "Partial bus stop name"
            },
            "limit": {
              "type": "number",
              "description": "Maximum number of results",
              "default": 10
            }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### Error Codes

| Code | Name | Description |
|------|------|-------------|
| -32700 | Parse error | JSON parsing error |
| -32600 | Invalid Request | Invalid request format |
| -32601 | Method not found | Method does not exist |
| -32602 | Invalid params | Invalid parameters |
| -32603 | Internal error | Internal error |
| -32001 | Tool not found | Tool does not exist |
| -32002 | Tool execution error | Tool execution error |
| -32003 | Rate limit exceeded | Rate limit exceeded |

**Error Response Example:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required parameter: query",
      "validationErrors": [
        {
          "field": "query",
          "message": "Required parameter is missing"
        }
      ]
    }
  }
}
```

### Rate Limiting

- **Limit**: 60 requests/minute/IP address
- **When exceeded**: Returns HTTP status 429 and error code -32003
- **Headers**:
  - `X-RateLimit-Limit`: Limit value (60)
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset time (Unix timestamp)
  - `Retry-After`: Seconds until retry

### CORS Support

Access from all origins is allowed.

**Response Headers:**

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, Mcp-Session-Id, Last-Event-ID
Access-Control-Max-Age: 600
```

### Security Headers

All responses include the following security headers:

```
Content-Security-Policy: default-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
```

### Using with Claude Desktop

1. Open Claude Desktop configuration file (`claude_desktop_config.json`)
2. Add the following configuration:

```json
{
  "mcpServers": {
    "saga-bus": {
      "url": "https://saga-bus.midnight480.com/api/mcp",
      "transport": "http"
    }
  }
}
```

3. Restart Claude Desktop
4. Ask questions like "Tell me about bus stops near Saga Station"

### Using with Cursor

1. Open Cursor settings
2. Click "Add Server" in the MCP Servers section
3. Enter the following information:
   - Name: `saga-bus`
   - URL: `https://saga-bus.midnight480.com/api/mcp`
   - Transport: `HTTP`
4. Save and restart

### Programmatic Usage Examples

#### TypeScript (using MCP SDK)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';

// Initialize client
const transport = new StreamableHTTPClientTransport({
  url: 'https://saga-bus.midnight480.com/api/mcp',
});

const client = new Client(
  {
    name: 'my-app',
    version: '1.0.0',
  },
  {
    capabilities: {},
  }
);

await client.connect(transport);

// Search for bus stops
const result = await client.callTool({
  name: 'search_bus_stops',
  arguments: {
    query: 'Saga Station',
  },
});

console.log(result);
```

#### Python (using requests)

```python
import requests

url = 'https://saga-bus.midnight480.com/api/mcp'

# Search for bus stops
payload = {
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'tools/call',
    'params': {
        'name': 'search_bus_stops',
        'arguments': {
            'query': 'Saga Station'
        }
    }
}

response = requests.post(url, json=payload)
print(response.json())
```

#### cURL

```bash
curl -X POST https://saga-bus.midnight480.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_bus_stops",
      "arguments": {
        "query": "Saga Station"
      }
    }
  }'
```

### Batch Requests

You can send multiple requests in a single HTTP request.

**Request:**

```json
[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "search_bus_stops",
      "arguments": {
        "query": "Saga Station"
      }
    }
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "search_bus_stops",
      "arguments": {
        "query": "Prefectural Office"
      }
    }
  }
]
```

**Response:**

```json
[
  {
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
      "content": [
        {
          "type": "text",
          "text": "{\"stops\":[...]}"
        }
      ]
    }
  },
  {
    "jsonrpc": "2.0",
    "id": 2,
    "result": {
      "content": [
        {
          "type": "text",
          "text": "{\"stops\":[...]}"
        }
      ]
    }
  }
]
```

### Troubleshooting

#### Rate Limit Error (429)

**Cause**: More than 60 requests sent in 1 minute

**Solution**:
- Wait for the number of seconds specified in the `Retry-After` header before retrying
- Reduce request frequency
- Use batch requests to combine multiple tool calls into a single HTTP request

#### Parameter Error (-32602)

**Cause**: Required parameter is missing or invalid value is specified

**Solution**:
- Check `data.validationErrors` in the error response
- Verify required parameters for each tool
- Confirm parameter types are correct

#### Tool Execution Error (-32002)

**Cause**: REST API call failed or data not found

**Solution**:
- Verify bus stop IDs and route IDs are correct
- Confirm time format is correct (HH:MM)
- Wait a moment and retry

### Related Links

- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Saga Bus Navigator](https://saga-bus.midnight480.com/)
- [Saga City Open Data](https://www.city.saga.lg.jp/main/3697.html)
