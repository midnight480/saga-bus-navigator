/**
 * エラーハンドリング
 * 
 * MCPエラーコード定義とエラーレスポンス生成
 * 要件6.1, 6.2, 6.3, 6.4, 6.5
 */

/**
 * MCPエラーコード
 */
export enum MCPErrorCode {
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

/**
 * バリデーションエラー
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * エラーレスポンスのdataフィールド
 */
export interface ErrorData {
  details?: string;
  retryAfter?: number; // レート制限時（秒）
  validationErrors?: ValidationError[];
}

/**
 * JSON-RPCエラーレスポンス
 */
export interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: ErrorData;
  };
}

/**
 * エラーハンドラー
 */
export class ErrorHandler {
  /**
   * エラーレスポンスを生成
   * @param id リクエストID
   * @param code エラーコード
   * @param message エラーメッセージ
   * @param data 追加データ
   * @returns JSON-RPCエラーレスポンス
   */
  static createErrorResponse(
    id: string | number | null,
    code: MCPErrorCode,
    message: string,
    data?: ErrorData
  ): JSONRPCErrorResponse {
    const response: JSONRPCErrorResponse = {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message,
      },
    };

    if (data) {
      response.error.data = data;
    }

    // エラーをログに記録（要件6.5）
    this.logError(code, message, data);

    return response;
  }

  /**
   * パースエラーレスポンスを生成
   * @param details エラー詳細
   * @returns JSON-RPCエラーレスポンス
   */
  static createParseError(details?: string): JSONRPCErrorResponse {
    return this.createErrorResponse(
      null,
      MCPErrorCode.PARSE_ERROR,
      'Parse error',
      details ? { details } : undefined
    );
  }

  /**
   * 無効なリクエストエラーレスポンスを生成
   * @param id リクエストID
   * @param details エラー詳細
   * @returns JSON-RPCエラーレスポンス
   */
  static createInvalidRequestError(
    id: string | number | null,
    details?: string
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.INVALID_REQUEST,
      'Invalid Request',
      details ? { details } : undefined
    );
  }

  /**
   * メソッドが見つからないエラーレスポンスを生成
   * @param id リクエストID
   * @param method メソッド名
   * @returns JSON-RPCエラーレスポンス
   */
  static createMethodNotFoundError(
    id: string | number | null,
    method: string
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.METHOD_NOT_FOUND,
      `Method not found: ${method}`
    );
  }

  /**
   * 無効なパラメータエラーレスポンスを生成（要件6.1）
   * @param id リクエストID
   * @param message エラーメッセージ
   * @param validationErrors バリデーションエラー
   * @returns JSON-RPCエラーレスポンス
   */
  static createInvalidParamsError(
    id: string | number | null,
    message: string,
    validationErrors?: ValidationError[]
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.INVALID_PARAMS,
      message,
      validationErrors ? { validationErrors } : undefined
    );
  }

  /**
   * 内部エラーレスポンスを生成（要件6.2）
   * @param id リクエストID
   * @param details エラー詳細
   * @returns JSON-RPCエラーレスポンス
   */
  static createInternalError(
    id: string | number | null,
    details?: string
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.INTERNAL_ERROR,
      'Internal error',
      details ? { details } : undefined
    );
  }

  /**
   * ツールが見つからないエラーレスポンスを生成
   * @param id リクエストID
   * @param toolName ツール名
   * @returns JSON-RPCエラーレスポンス
   */
  static createToolNotFoundError(
    id: string | number | null,
    toolName: string
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.TOOL_NOT_FOUND,
      `Tool not found: ${toolName}`
    );
  }

  /**
   * ツール実行エラーレスポンスを生成（要件6.3）
   * @param id リクエストID
   * @param toolName ツール名
   * @param details エラー詳細
   * @returns JSON-RPCエラーレスポンス
   */
  static createToolExecutionError(
    id: string | number | null,
    toolName: string,
    details?: string
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.TOOL_EXECUTION_ERROR,
      `Tool execution failed: ${toolName}`,
      details ? { details } : undefined
    );
  }

  /**
   * レート制限超過エラーレスポンスを生成
   * @param id リクエストID
   * @param retryAfter 再試行までの秒数
   * @returns JSON-RPCエラーレスポンス
   */
  static createRateLimitError(
    id: string | number | null,
    retryAfter: number
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { retryAfter }
    );
  }

  /**
   * セッションが見つからないエラーレスポンスを生成
   * @param id リクエストID
   * @param sessionId セッションID
   * @returns JSON-RPCエラーレスポンス
   */
  static createSessionNotFoundError(
    id: string | number | null,
    sessionId: string
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.SESSION_NOT_FOUND,
      `Session not found: ${sessionId}`
    );
  }

  /**
   * セッション期限切れエラーレスポンスを生成
   * @param id リクエストID
   * @param sessionId セッションID
   * @returns JSON-RPCエラーレスポンス
   */
  static createSessionExpiredError(
    id: string | number | null,
    sessionId: string
  ): JSONRPCErrorResponse {
    return this.createErrorResponse(
      id,
      MCPErrorCode.SESSION_EXPIRED,
      `Session expired: ${sessionId}`
    );
  }

  /**
   * エラーをログに記録（要件6.5）
   * @param code エラーコード
   * @param message エラーメッセージ
   * @param data 追加データ
   */
  private static logError(
    code: MCPErrorCode,
    message: string,
    data?: ErrorData
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      code,
      message,
      data,
    };

    // 本番環境ではCloudflare Workers Logsに記録される
    console.error('[MCP Error]', JSON.stringify(logEntry));
  }

  /**
   * エラーコードの説明を取得
   * @param code エラーコード
   * @returns エラーコードの説明
   */
  static getErrorCodeDescription(code: MCPErrorCode): string {
    switch (code) {
      case MCPErrorCode.PARSE_ERROR:
        return 'Invalid JSON was received by the server';
      case MCPErrorCode.INVALID_REQUEST:
        return 'The JSON sent is not a valid Request object';
      case MCPErrorCode.METHOD_NOT_FOUND:
        return 'The method does not exist / is not available';
      case MCPErrorCode.INVALID_PARAMS:
        return 'Invalid method parameter(s)';
      case MCPErrorCode.INTERNAL_ERROR:
        return 'Internal JSON-RPC error';
      case MCPErrorCode.TOOL_NOT_FOUND:
        return 'The requested tool does not exist';
      case MCPErrorCode.TOOL_EXECUTION_ERROR:
        return 'Tool execution failed';
      case MCPErrorCode.RATE_LIMIT_EXCEEDED:
        return 'Rate limit exceeded';
      case MCPErrorCode.SESSION_NOT_FOUND:
        return 'Session not found';
      case MCPErrorCode.SESSION_EXPIRED:
        return 'Session expired';
      default:
        return 'Unknown error';
    }
  }
}
