# 設計書

## 概要

佐賀バスナビゲーターをMCP Apps（Model Context Protocol Applications）として提供するための設計を定義します。MCP仕様2025-03-26に準拠し、Streamable HTTP transportを使用してCloudflare Pages Functions上で実装します。

### 既存機能への影響

**重要**: この実装は既存のWebアプリケーションとMCPサーバー（Docker版）に**一切影響を与えません**。

#### 分離設計

1. **独立したエンドポイント**: 
   - MCP Apps: `/api/mcp` （新規）
   - 既存Web: `/` （変更なし）
   - 既存REST API: `/api/stops/search`, `/api/routes/search` 等（変更なし）

2. **独立したコードベース**:
   - MCP Apps実装: `functions/api/mcp.ts` および `functions/lib/mcp/` （新規）
   - 既存Web実装: `index.html`, `js/app.js`, `js/data-loader.js` 等（変更なし）
   - 既存REST API: `functions/api/stops/`, `functions/api/routes/` 等（変更なし）

3. **共通リソースの利用**:
   - MCP Appsは既存のREST APIを**内部で呼び出す**だけ
   - GTFSデータは既存の仕組みをそのまま利用
   - データローダーやユーティリティは共有可能

#### 利用シーンの違い

| 機能 | 既存Webアプリ | MCP Apps |
|------|--------------|----------|
| 利用者 | 一般ユーザー（ブラウザ） | AIアシスタント（Claude等） |
| アクセス方法 | https://saga-bus.midnight480.com/ | https://saga-bus.midnight480.com/api/mcp |
| インターフェース | HTML/CSS/JavaScript UI | JSON-RPC 2.0 API |
| データ取得 | ブラウザ内でGTFS処理 | REST API経由 |

#### Docker版MCPサーバーとの関係

- **Docker版**: ローカル環境で動作するMCPサーバー（stdio transport）
- **MCP Apps版**: Webベースで動作するMCPサーバー（HTTP transport）
- 両方とも同じツール（バス停検索、路線検索、始発・終バス検索）を提供
- ユーザーは用途に応じて選択可能

#### メリット

1. **既存機能の安定性**: 既存のWebアプリとREST APIは一切変更されない
2. **段階的な展開**: MCP Appsを追加機能として段階的にリリース可能
3. **リスクの最小化**: 新機能の問題が既存機能に波及しない
4. **保守性**: 各機能が独立しているため、個別にメンテナンス可能

## アーキテクチャ

### システム構成

```
┌─────────────────┐
│  AIアシスタント  │ (Claude, Cursor等)
│   (MCPクライアント)│
└────────┬────────┘
         │ HTTPS (Streamable HTTP)
         │ JSON-RPC 2.0
         ▼
┌─────────────────────────────────────┐
│  Cloudflare Pages Functions         │
│  ┌───────────────────────────────┐  │
│  │  /api/mcp (MCPエンドポイント)  │  │
│  │  - POST: メッセージ受信        │  │
│  │  - GET: SSEストリーム(オプション)│  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │  MCP Server Implementation    │  │
│  │  - ツール管理                  │  │
│  │  - セッション管理              │  │
│  │  - エラーハンドリング          │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │  既存REST API呼び出し          │  │
│  │  - /api/stops/search          │  │
│  │  - /api/routes/search         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  GTFSデータ      │
│  (IndexedDB)    │
└─────────────────┘
```

### トランスポート層

MCP仕様2025-03-26のStreamable HTTP transportを実装します：

- **単一エンドポイント**: `/api/mcp` でPOSTとGETの両方をサポート
- **POST**: クライアントからサーバーへのJSON-RPCメッセージ送信
- **GET**: サーバーからクライアントへのSSEストリーム（オプション）
- **セッション管理**: `Mcp-Session-Id`ヘッダーでセッションを追跡

## コンポーネントと
インターフェース

### 1. MCPエンドポイント (`/api/mcp`)

#### 責務
- JSON-RPC 2.0メッセージの受信と処理
- ツール実行の管理
- セッション管理
- エラーハンドリング

#### インターフェース

```typescript
// POSTリクエスト
interface MCPPostRequest {
  method: 'POST';
  headers: {
    'Content-Type': 'application/json';
    'Accept': 'application/json, text/event-stream';
    'Mcp-Session-Id'?: string; // セッションID（初回以降）
  };
  body: JSONRPCMessage | JSONRPCMessage[]; // 単一または複数のメッセージ
}

// GETリクエスト（SSEストリーム）
interface MCPGetRequest {
  method: 'GET';
  headers: {
    'Accept': 'text/event-stream';
    'Mcp-Session-Id'?: string;
    'Last-Event-ID'?: string; // 再接続時の最後のイベントID
  };
}

// レスポンス
interface MCPResponse {
  status: 200 | 404 | 405 | 429 | 500;
  headers: {
    'Content-Type': 'application/json' | 'text/event-stream';
    'Mcp-Session-Id'?: string; // 初期化時にセッションIDを返す
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
  };
  body: JSONRPCMessage | JSONRPCMessage[] | SSEStream;
}
```

### 2. ツール実装

#### 2.1 バス停検索ツール (`search_bus_stops`)

```typescript
interface SearchBusStopsTool {
  name: 'search_bus_stops';
  description: '佐賀市内のバス停を名前で検索します';
  inputSchema: {
    type: 'object';
    properties: {
      query: {
        type: 'string';
        description: 'バス停名の一部（例：「佐賀駅」「県庁」）';
      };
      limit?: {
        type: 'number';
        description: '最大結果数（デフォルト：10）';
        default: 10;
      };
    };
    required: ['query'];
  };
}

interface SearchBusStopsResult {
  stops: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
}
```

#### 2.2 路線検索ツール (`search_routes`)

```typescript
interface SearchRoutesTool {
  name: 'search_routes';
  description: '出発地と目的地を指定してバス路線を検索します';
  inputSchema: {
    type: 'object';
    properties: {
      from_stop_id: {
        type: 'string';
        description: '乗車バス停ID';
      };
      to_stop_id: {
        type: 'string';
        description: '降車バス停ID';
      };
      time?: {
        type: 'string';
        description: '検索時刻（HH:MM形式、省略時は現在時刻）';
      };
    };
    required: ['from_stop_id', 'to_stop_id'];
  };
}

interface SearchRoutesResult {
  routes: Array<{
    route_id: string;
    route_name: string;
    departure_time: string;
    arrival_time: string;
    duration_minutes: number;
    fare: {
      adult: number;
      child: number;
    };
  }>;
}
```

#### 2.3 始発・終バス検索ツール (`get_first_last_bus`)

```typescript
interface GetFirstLastBusTool {
  name: 'get_first_last_bus';
  description: '指定した路線の始発と終バスの時刻を取得します';
  inputSchema: {
    type: 'object';
    properties: {
      route_id: {
        type: 'string';
        description: '路線ID';
      };
    };
    required: ['route_id'];
  };
}

interface GetFirstLastBusResult {
  first_bus: {
    trip_id: string;
    departure_time: string;
    arrival_time: string;
  };
  last_bus: {
    trip_id: string;
    departure_time: string;
    arrival_time: string;
  };
}
```

### 3. セッション管理

#### 責務
- セッションIDの生成と管理
- セッション状態の保持
- セッションのタイムアウト処理

#### インターフェース

```typescript
interface Session {
  id: string; // UUID v4
  createdAt: number; // タイムスタンプ
  lastAccessedAt: number; // 最終アクセス時刻
  state: {
    initialized: boolean;
    clientInfo?: {
      name: string;
      version: string;
    };
  };
}

interface SessionManager {
  create(): Session;
  get(id: string): Session | null;
  update(id: string, state: Partial<Session['state']>): void;
  delete(id: string): void;
  cleanup(): void; // タイムアウトしたセッションを削除
}
```

### 4. レート制限

#### 責務
- IPアドレス単位でリクエスト数を追跡
- レート制限超過時のエラー返却

#### インターフェース

```typescript
interface RateLimiter {
  check(ip: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  };
}

// 設定
const RATE_LIMIT_CONFIG = {
  windowMs: 60000, // 1分
  maxRequests: 60, // 60リクエスト/分
};
```

## データモデル

### JSON-RPCメッセージ

```typescript
// リクエスト
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: object;
}

// レスポンス（成功）
interface JSONRPCSuccessResponse {
  jsonrpc: '2.0';
  id: string | number;
  result: any;
}

// レスポンス（エラー）
interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

// 通知（レスポンス不要）
interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: object;
}
```

### MCPプロトコルメッセージ

```typescript
// 初期化リクエスト
interface InitializeRequest extends JSONRPCRequest {
  method: 'initialize';
  params: {
    protocolVersion: '2025-03-26';
    capabilities: {
      roots?: { listChanged?: boolean };
      sampling?: {};
    };
    clientInfo: {
      name: string;
      version: string;
    };
  };
}

// 初期化レスポンス
interface InitializeResult {
  protocolVersion: '2025-03-26';
  capabilities: {
    tools?: {};
    logging?: {};
  };
  serverInfo: {
    name: 'saga-bus-navigator-mcp';
    version: '1.0.0';
  };
}

// ツールリスト取得
interface ListToolsRequest extends JSONRPCRequest {
  method: 'tools/list';
}

interface ListToolsResult {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: object;
  }>;
}

// ツール実行
interface CallToolRequest extends JSONRPCRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: object;
  };
}

interface CallToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や振る舞いのことです。プロパティは人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*


### 受入基準のテスト可能性分析

#### 要件1: MCP Appsエンドポイントの提供

1.1. WHEN AIアシスタントがMCP Appsエンドポイントに接続する THEN システムはMCPプロトコルに準拠したレスポンスを返す
  - 思考: これは全てのリクエストに対して成り立つべきルール。任意のJSON-RPCメッセージに対して、レスポンスがMCP仕様に準拠しているかを検証できる
  - テスト可能: yes - property

1.2. WHEN AIアシスタントがツールリストを要求する THEN システムは利用可能なツール一覧を返す
  - 思考: tools/listメソッドの呼び出しに対して、常に定義済みツールのリストを返すべき
  - テスト可能: yes - example

1.3. WHEN AIアシスタントがツールを実行する THEN システムは適切な結果を返す
  - 思考: これは各ツールの実装に依存する。個別のツールテストでカバーする
  - テスト可能: no

1.4. THE MCP_Apps_Endpoint SHALL HTTPSプロトコルで公開される
  - 思考: これはデプロイメント設定の確認。自動テストでは検証困難
  - テスト可能: no

1.5. THE MCP_Apps_Endpoint SHALL Cloudflare Pagesでホスティングされる
  - 思考: これはインフラ要件。自動テストでは検証困難
  - テスト可能: no

#### 要件2: バス停検索ツールの提供

2.1. WHEN AIアシスタントがバス停名の一部を指定する THEN システムは部分一致するバス停のリストを返す
  - 思考: 任意の検索クエリに対して、結果が全て部分一致しているかを検証できる
  - テスト可能: yes - property

2.2. WHEN 検索結果が複数ある THEN システムは最大10件のバス停情報を返す
  - 思考: 結果数の上限チェック。任意の検索クエリに対して成り立つ
  - テスト可能: yes - property

2.3. WHEN バス停情報を返す THEN システムはバス停ID、名前、緯度、経度を含める
  - 思考: レスポンスの構造検証。全ての結果に必須フィールドが含まれるか
  - テスト可能: yes - property

2.4. THE Search_Bus_Stops_Tool SHALL 検索クエリをパラメータとして受け取る
  - 思考: ツールのスキーマ定義の確認
  - テスト可能: yes - example

2.5. THE Search_Bus_Stops_Tool SHALL 既存のREST APIを内部で利用する
  - 思考: 実装の詳細。統合テストでカバー
  - テスト可能: no

#### 要件3: 路線検索ツールの提供

3.1. WHEN AIアシスタントが乗車バス停IDと降車バス停IDを指定する THEN システムは該当する路線情報を返す
  - 思考: 任意のバス停IDペアに対して、結果が正しい形式かを検証
  - テスト可能: yes - property

3.2. WHEN 路線情報を返す THEN システムは路線ID、路線名、出発時刻、到着時刻、所要時間、運賃を含める
  - 思考: レスポンスの構造検証。全ての結果に必須フィールドが含まれるか
  - テスト可能: yes - property

3.3. WHEN 該当する路線が存在しない THEN システムは空のリストを返す
  - 思考: エッジケース。存在しないバス停IDの組み合わせでテスト
  - テスト可能: yes - edge-case

3.4. THE Search_Routes_Tool SHALL 乗車バス停ID、降車バス停ID、検索時刻をパラメータとして受け取る
  - 思考: ツールのスキーマ定義の確認
  - テスト可能: yes - example

3.5. THE Search_Routes_Tool SHALL 既存のREST APIを内部で利用する
  - 思考: 実装の詳細。統合テストでカバー
  - テスト可能: no

#### 要件4: 始発・終バス検索ツールの提供

4.1. WHEN AIアシスタントが路線IDを指定する THEN システムは始発と終バスの時刻を返す
  - 思考: 任意の路線IDに対して、結果が正しい形式かを検証
  - テスト可能: yes - property

4.2. WHEN 始発・終バス情報を返す THEN システムは便ID、出発時刻、到着時刻を含める
  - 思考: レスポンスの構造検証
  - テスト可能: yes - property

4.3. WHEN 指定された路線が存在しない THEN システムはエラーメッセージを返す
  - 思考: エラーハンドリング。存在しない路線IDでテスト
  - テスト可能: yes - edge-case

4.4. THE Get_First_Last_Bus_Tool SHALL 路線IDをパラメータとして受け取る
  - 思考: ツールのスキーマ定義の確認
  - テスト可能: yes - example

4.5. THE Get_First_Last_Bus_Tool SHALL 既存のREST APIを内部で利用する
  - 思考: 実装の詳細。統合テストでカバー
  - テスト可能: no

#### 要件5: CORS対応

5.1. WHEN ブラウザがプリフライトリクエスト（OPTIONS）を送信する THEN システムは適切なCORSヘッダーを返す
  - 思考: OPTIONSリクエストに対するレスポンスヘッダーの検証
  - テスト可能: yes - example

5.2-5.3. WHEN システムがレスポンスを返す THEN 必要なCORSヘッダーを含める
  - 思考: 全てのレスポンスに必須ヘッダーが含まれるか
  - テスト可能: yes - property

5.4. THE CORS_Configuration SHALL 信頼できるオリジンのみを許可する
  - 思考: セキュリティ設定の確認
  - テスト可能: yes - example

5.5. THE CORS_Configuration SHALL プリフライトリクエストのキャッシュを設定する
  - 思考: ヘッダーの存在確認
  - テスト可能: yes - example

#### 要件6: エラーハンドリング

6.1. WHEN 無効なパラメータが指定される THEN システムは400エラーと詳細なエラーメッセージを返す
  - 思考: 任意の無効なパラメータに対してエラーレスポンスを返すか
  - テスト可能: yes - property

6.2. WHEN 内部エラーが発生する THEN システムは500エラーとエラーメッセージを返す
  - 思考: エラー発生時の動作。モックでエラーを発生させてテスト
  - テスト可能: yes - example

6.3. WHEN REST APIへのアクセスが失敗する THEN システムは502エラーとエラーメッセージを返す
  - 思考: 外部API障害時の動作
  - テスト可能: yes - example

6.4. THE Error_Response SHALL エラーコード、エラーメッセージ、エラー詳細を含める
  - 思考: エラーレスポンスの構造検証
  - テスト可能: yes - property

6.5. THE Error_Handler SHALL エラーをログに記録する
  - 思考: ログ出力の確認。実装の詳細
  - テスト可能: no

#### 要件7: レート制限

7.1. WHEN 同一IPアドレスから短時間に多数のリクエストが送信される THEN システムはリクエストを制限する
  - 思考: レート制限の動作確認
  - テスト可能: yes - example

7.2. WHEN レート制限を超える THEN システムは429エラーを返す
  - 思考: レート制限超過時のレスポンス
  - テスト可能: yes - example

7.3. WHEN レート制限エラーを返す THEN Retry-Afterヘッダーを含める
  - 思考: エラーレスポンスのヘッダー検証
  - テスト可能: yes - example

7.4-7.5. THE Rate_Limiter SHALL 設定に従ってリクエストを追跡する
  - 思考: レート制限の設定確認
  - テスト可能: yes - example

#### 要件8: MCP Serverメタデータの提供

8.1. WHEN AIアシスタントがサーバー情報を要求する THEN システムはサーバー名、バージョン、説明を返す
  - 思考: initializeメソッドのレスポンス検証
  - テスト可能: yes - example

8.2. WHEN AIアシスタントがツール情報を要求する THEN システムは各ツールの名前、説明、パラメータスキーマを返す
  - 思考: tools/listメソッドのレスポンス検証
  - テスト可能: yes - example

8.3-8.5. THE Server_Metadata SHALL 必要な情報を含める
  - 思考: メタデータの構造検証
  - テスト可能: yes - example

#### 要件9: セキュリティ

9.1. WHEN リクエストを受信する THEN システムは入力値を検証する
  - 思考: 任意の入力に対してバリデーションが実行されるか
  - テスト可能: yes - property

9.2-9.3. WHEN 攻撃を検出する THEN システムはリクエストを拒否する
  - 思考: セキュリティテスト。悪意のある入力でテスト
  - テスト可能: yes - example

9.4-9.5. THE Security_Layer SHALL セキュリティヘッダーを設定する
  - 思考: レスポンスヘッダーの検証
  - テスト可能: yes - property

#### 要件10: パフォーマンス

10.1-10.3. WHEN ツールを実行する THEN システムは指定時間以内にレスポンスを返す
  - 思考: パフォーマンステスト。自動テストでは困難
  - テスト可能: no

10.4-10.5. THE MCP_Apps_Endpoint SHALL パフォーマンス最適化を実装する
  - 思考: インフラ設定。自動テストでは困難
  - テスト可能: no

#### 要件11: ログとモニタリング

11.1-11.3. WHEN イベントが発生する THEN システムはログを記録する
  - 思考: ログ出力の確認。実装の詳細
  - テスト可能: no

11.4-11.5. THE Logging_System SHALL ログ要件に従う
  - 思考: ログ形式の確認。実装の詳細
  - テスト可能: no

#### 要件12: ドキュメント

12.1-12.5. THE Documentation SHALL 必要な情報を記載する
  - 思考: ドキュメントの存在確認。自動テストでは困難
  - テスト可能: no

### プロパティの冗長性分析

分析の結果、以下のプロパティを統合・削除します：

- **2.2と2.3を統合**: バス停検索結果の検証を1つのプロパティにまとめる
- **3.2と4.2を統合**: レスポンス構造の検証パターンが類似
- **5.2と5.3を統合**: CORSヘッダーの検証を1つのプロパティにまとめる
- **6.4を削除**: 6.1が既にエラーレスポンスの構造を検証している

### 正確性プロパティ

**プロパティ1: JSON-RPCプロトコル準拠**
*任意の*有効なJSON-RPCリクエストに対して、システムは常にJSON-RPC 2.0仕様に準拠したレスポンスを返す
**検証: 要件1.1**

**プロパティ2: バス停検索結果の妥当性**
*任意の*検索クエリに対して、返されるバス停は全て以下を満たす：(1)名前がクエリに部分一致する、(2)結果数が10件以下、(3)必須フィールド（id, name, lat, lng）を含む
**検証: 要件2.1, 2.2, 2.3**

**プロパティ3: 路線検索結果の構造**
*任意の*バス停IDペアに対して、返される路線情報は全て必須フィールド（route_id, route_name, departure_time, arrival_time, duration_minutes, fare）を含む
**検証: 要件3.2**

**プロパティ4: 始発・終バス情報の構造**
*任意の*有効な路線IDに対して、返される始発・終バス情報は必須フィールド（trip_id, departure_time, arrival_time）を含む
**検証: 要件4.2**

**プロパティ5: CORSヘッダーの存在**
*任意の*HTTPレスポンスに対して、必須のCORSヘッダー（Access-Control-Allow-Origin, Access-Control-Allow-Methods, Access-Control-Allow-Headers）が含まれる
**検証: 要件5.2, 5.3**

**プロパティ6: 入力バリデーション**
*任意の*無効なパラメータを含むリクエストに対して、システムは400エラーとJSON-RPC準拠のエラーレスポンスを返す
**検証: 要件6.1, 6.4**

**プロパティ7: セキュリティヘッダーの存在**
*任意の*HTTPレスポンスに対して、セキュリティヘッダー（Content-Security-Policy, X-Content-Type-Options）が含まれる
**検証: 要件9.4, 9.5**

## エラーハンドリング

### エラーコード定義

```typescript
enum MCPErrorCode {
  // JSON-RPC標準エラー
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // MCP固有エラー
  TOOL_NOT_FOUND = -32001,
  TOOL_EXECUTION_ERROR = -32002,
  RATE_LIMIT_EXCEEDED = -32003,
  SESSION_NOT_FOUND = -32004,
  SESSION_EXPIRED = -32005,
}
```

### エラーレスポンス形式

```typescript
interface ErrorResponse extends JSONRPCErrorResponse {
  error: {
    code: MCPErrorCode;
    message: string;
    data?: {
      details?: string;
      retryAfter?: number; // レート制限時
      validationErrors?: Array<{
        field: string;
        message: string;
      }>;
    };
  };
}
```

### エラーハンドリング戦略

1. **入力バリデーションエラー**: パラメータ検証失敗時は`INVALID_PARAMS`を返す
2. **ツール実行エラー**: REST API呼び出し失敗時は`TOOL_EXECUTION_ERROR`を返す
3. **レート制限エラー**: 制限超過時は`RATE_LIMIT_EXCEEDED`と`Retry-After`ヘッダーを返す
4. **セッションエラー**: 無効/期限切れセッションIDは`SESSION_NOT_FOUND`/`SESSION_EXPIRED`を返す
5. **内部エラー**: 予期しないエラーは`INTERNAL_ERROR`を返し、詳細をログに記録

## テスト戦略

### 単体テスト

**対象**:
- JSON-RPCメッセージのパース・シリアライズ
- ツールのパラメータバリデーション
- セッション管理ロジック
- レート制限ロジック
- エラーレスポンス生成

**ツール**: Vitest

**カバレッジ目標**: 80%以上

### プロパティベーステスト

**対象**:
- プロパティ1-7の検証
- ランダムな入力に対する動作確認

**ツール**: fast-check (TypeScript用プロパティベーステストライブラリ)

**設定**:
- 各プロパティテストは最低100回実行
- テストタグ: `Feature: mcp-apps, Property {N}: {プロパティ名}`

**例**:
```typescript
import fc from 'fast-check';

// Feature: mcp-apps, Property 2: バス停検索結果の妥当性
test('search_bus_stops returns valid results', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 50 }), // 検索クエリ
      async (query) => {
        const result = await callTool('search_bus_stops', { query });
        
        // 結果数が10件以下
        expect(result.stops.length).toBeLessThanOrEqual(10);
        
        // 全ての結果が必須フィールドを含む
        result.stops.forEach(stop => {
          expect(stop).toHaveProperty('id');
          expect(stop).toHaveProperty('name');
          expect(stop).toHaveProperty('lat');
          expect(stop).toHaveProperty('lng');
          
          // 名前がクエリに部分一致
          expect(stop.name.toLowerCase()).toContain(query.toLowerCase());
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

### 統合テスト

**対象**:
- MCPエンドポイント全体の動作
- 既存REST APIとの連携
- セッション管理フロー
- エラーハンドリングフロー

**ツール**: Vitest + Cloudflare Workers Test Environment

### E2Eテスト

**対象**:
- 実際のMCPクライアント（Claude Desktop等）からの接続
- 複数セッションの同時接続
- レート制限の動作確認

**ツール**: Playwright + MCP SDK

## 実装言語とフレームワーク

### 言語
- **TypeScript**: 型安全性とMCP SDKとの親和性

### フレームワーク・ライブラリ
- **@modelcontextprotocol/sdk**: MCP公式SDK
- **Cloudflare Workers Runtime**: Pages Functions実行環境
- **Vitest**: テストフレームワーク
- **fast-check**: プロパティベーステストライブラリ

### ディレクトリ構造

```
functions/
├── api/
│   └── mcp.ts                    # MCPエンドポイント
├── lib/
│   ├── mcp/
│   │   ├── server.ts            # MCPサーバー実装
│   │   ├── tools/
│   │   │   ├── search-bus-stops.ts
│   │   │   ├── search-routes.ts
│   │   │   └── get-first-last-bus.ts
│   │   ├── session-manager.ts   # セッション管理
│   │   ├── rate-limiter.ts      # レート制限
│   │   └── error-handler.ts     # エラーハンドリング
│   └── api-client.ts            # 既存REST API呼び出し
├── tests/
│   ├── unit/
│   │   ├── server.test.ts
│   │   ├── tools.test.ts
│   │   ├── session-manager.test.ts
│   │   └── rate-limiter.test.ts
│   ├── property/
│   │   └── mcp-properties.test.ts
│   └── integration/
│       └── mcp-endpoint.test.ts
├── package.json
└── tsconfig.json
```

## セキュリティ考慮事項

### 1. 入力検証
- 全てのツールパラメータをJSON Schemaで検証
- SQLインジェクション、XSS攻撃パターンを検出・拒否

### 2. レート制限
- IPアドレス単位で60リクエスト/分
- Cloudflare Workers KVでカウンター管理

### 3. CORS設定
- 信頼できるオリジンのみ許可
- プリフライトリクエストのキャッシュ設定

### 4. セッション管理
- セッションIDはUUID v4で生成
- 30分間アクセスがない場合は自動削除
- セッション情報はメモリ内のみ保持（永続化しない）

### 5. ログ
- 個人情報（IPアドレス、セッションID）はハッシュ化して記録
- エラー詳細はCloudflare Workers Logsに記録

## パフォーマンス最適化

### 1. キャッシング
- REST APIレスポンスをCloudflare CDNでキャッシュ（30秒）
- セッション情報をメモリキャッシュ

### 2. 圧縮
- レスポンスをgzip圧縮

### 3. 並列処理
- 複数ツール呼び出しを並列実行（JSON-RPCバッチリクエスト対応）

### 4. タイムアウト
- REST API呼び出しは5秒でタイムアウト
- MCPエンドポイント全体は10秒でタイムアウト

## デプロイメント

### Cloudflare Pages設定

```toml
# wrangler.toml
name = "saga-bus-navigator"
compatibility_date = "2025-01-01"

[build]
command = "npm run build"
cwd = "functions"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"

[env.production]
vars = { ENVIRONMENT = "production" }
```

### 環境変数

- `ENVIRONMENT`: 環境識別子（development, production）
- `RATE_LIMIT_KV`: レート制限用KVネームスペース

### デプロイフロー

1. `main`ブランチへのマージで自動デプロイ
2. デプロイ前に全テスト実行
3. デプロイ後にヘルスチェック実行

## モニタリング

### メトリクス

- リクエスト数（ツール別）
- レスポンスタイム（ツール別）
- エラー率
- レート制限発動回数
- セッション数

### アラート

- エラー率が5%を超えた場合
- レスポンスタイムが5秒を超えた場合
- レート制限発動が急増した場合

### ログ

- リクエストログ: リクエストID、タイムスタンプ、メソッド、パラメータ（ハッシュ化）、レスポンスステータス
- エラーログ: エラーコード、エラーメッセージ、スタックトレース
- パフォーマンスログ: 処理時間、REST API呼び出し時間
