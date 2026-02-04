/**
 * MCP Server実装
 * 
 * Model Context Protocol (MCP) 2025-03-26仕様に準拠したサーバー実装
 * JSON-RPCメッセージのルーティングとツール管理を行う
 */

import { searchBusStopsTool, executeSearchBusStops } from './tools/search-bus-stops';
import { searchRoutesTool, executeSearchRoutes } from './tools/search-routes';
import { getFirstLastBusTool, executeGetFirstLastBus } from './tools/get-first-last-bus';

/**
 * JSON-RPC 2.0メッセージ型定義
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP初期化パラメータ
 */
interface InitializeParams {
  protocolVersion: string;
  capabilities: {
    roots?: { listChanged?: boolean };
    sampling?: {};
  };
  clientInfo: {
    name: string;
    version: string;
  };
}

/**
 * ツール定義
 */
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * ツール実行結果
 */
interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * MCPサーバークラス
 */
export class MCPServer {
  private initialized = false;
  private clientInfo?: { name: string; version: string };
  private tools: Map<string, Tool> = new Map();
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    
    // バス停検索ツールを登録
    this.registerTool(searchBusStopsTool);
    
    // 路線検索ツールを登録
    this.registerTool(searchRoutesTool);
    
    // 始発・終バス検索ツールを登録
    this.registerTool(getFirstLastBusTool);
  }

  /**
   * ツールを登録
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * JSON-RPCリクエストを処理
   */
  async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { method, params, id } = request;

    // JSON-RPC 2.0バージョンチェック
    if (!request.jsonrpc || request.jsonrpc.trim() !== '2.0') {
      return this.createErrorResponse(
        id ?? null,
        -32600,
        'Invalid Request: jsonrpc must be "2.0"'
      );
    }

    try {
      switch (method) {
        case 'initialize':
          return this.handleInitialize(params, id);
        
        case 'tools/list':
          return this.handleToolsList(id);
        
        case 'tools/call':
          return await this.handleToolsCall(params, id);
        
        default:
          return this.createErrorResponse(
            id ?? null,
            -32601,
            `Method not found: ${method}`
          );
      }
    } catch (error) {
      console.error('[MCP Server Error]', error);
      return this.createErrorResponse(
        id ?? null,
        -32603,
        'Internal error',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * initializeメソッドの処理
   */
  private handleInitialize(
    params: InitializeParams,
    id: string | number | undefined
  ): JSONRPCResponse {
    // パラメータ検証
    if (!params || typeof params !== 'object') {
      return this.createErrorResponse(
        id ?? null,
        -32602,
        'Invalid params: params must be an object'
      );
    }

    if (!params.protocolVersion) {
      return this.createErrorResponse(
        id ?? null,
        -32602,
        'Invalid params: protocolVersion is required'
      );
    }

    if (!params.clientInfo || !params.clientInfo.name || !params.clientInfo.version) {
      return this.createErrorResponse(
        id ?? null,
        -32602,
        'Invalid params: clientInfo with name and version is required'
      );
    }

    // プロトコルバージョンチェック
    if (params.protocolVersion !== '2025-03-26') {
      return this.createErrorResponse(
        id ?? null,
        -32602,
        `Unsupported protocol version: ${params.protocolVersion}. Expected: 2025-03-26`
      );
    }

    // 初期化
    this.initialized = true;
    this.clientInfo = params.clientInfo;

    // 初期化レスポンス
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: {
          tools: {},
          logging: {},
        },
        serverInfo: {
          name: 'saga-bus-navigator-mcp',
          version: '1.0.0',
        },
      },
    };
  }

  /**
   * tools/listメソッドの処理
   */
  private handleToolsList(id: string | number | undefined): JSONRPCResponse {
    // 初期化チェック
    if (!this.initialized) {
      return this.createErrorResponse(
        id ?? null,
        -32002,
        'Server not initialized. Call initialize first.'
      );
    }

    // ツールリストを返す
    const tools = Array.from(this.tools.values());

    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        tools,
      },
    };
  }

  /**
   * tools/callメソッドの処理
   */
  private async handleToolsCall(
    params: { name: string; arguments?: any },
    id: string | number | undefined
  ): Promise<JSONRPCResponse> {
    // 初期化チェック
    if (!this.initialized) {
      return this.createErrorResponse(
        id ?? null,
        -32002,
        'Server not initialized. Call initialize first.'
      );
    }

    // パラメータ検証
    if (!params || typeof params !== 'object') {
      return this.createErrorResponse(
        id ?? null,
        -32602,
        'Invalid params: params must be an object'
      );
    }

    if (!params.name || typeof params.name !== 'string') {
      return this.createErrorResponse(
        id ?? null,
        -32602,
        'Invalid params: name is required and must be a string'
      );
    }

    // ツールの存在確認
    const tool = this.tools.get(params.name);
    if (!tool) {
      return this.createErrorResponse(
        id ?? null,
        -32001,
        `Tool not found: ${params.name}`
      );
    }

    // ツール実行
    try {
      let result: ToolResult;

      switch (params.name) {
        case 'search_bus_stops':
          result = await executeSearchBusStops(params.arguments, this.baseUrl);
          break;

        case 'search_routes':
          result = await executeSearchRoutes(params.arguments, this.baseUrl);
          break;

        case 'get_first_last_bus':
          result = await executeGetFirstLastBus(params.arguments, this.baseUrl);
          break;

        default:
          return this.createErrorResponse(
            id ?? null,
            -32002,
            `Tool execution not yet implemented: ${params.name}`
          );
      }

      // 成功レスポンスを返す
      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result,
      };
    } catch (error) {
      console.error('[Tool Execution Error]', error);
      return this.createErrorResponse(
        id ?? null,
        -32002,
        'Tool execution failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * エラーレスポンスを生成
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string,
    data?: any
  ): JSONRPCResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
        data,
      },
    };
  }

  /**
   * サーバーの初期化状態を取得
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * クライアント情報を取得
   */
  getClientInfo(): { name: string; version: string } | undefined {
    return this.clientInfo;
  }

  /**
   * 登録されているツール数を取得
   */
  getToolCount(): number {
    return this.tools.size;
  }
}
