/**
 * エラーハンドラーの単体テスト
 * 要件6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorHandler,
  MCPErrorCode,
  ValidationError,
  JSONRPCErrorResponse,
} from '../../lib/mcp/error-handler';

describe('ErrorHandler', () => {
  // console.errorのモック
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('createErrorResponse', () => {
    it('基本的なエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createErrorResponse(
        1,
        MCPErrorCode.INTERNAL_ERROR,
        'Test error'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.INTERNAL_ERROR,
          message: 'Test error',
        },
      });
    });

    it('追加データを含むエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createErrorResponse(
        'test-id',
        MCPErrorCode.INVALID_PARAMS,
        'Invalid parameters',
        { details: 'Missing required field' }
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 'test-id',
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'Missing required field',
          },
        },
      });
    });

    it('エラーをログに記録する', () => {
      ErrorHandler.createErrorResponse(
        1,
        MCPErrorCode.INTERNAL_ERROR,
        'Test error'
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[MCP Error]',
        expect.stringContaining('"code":-32603')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[MCP Error]',
        expect.stringContaining('"message":"Test error"')
      );
    });
  });

  describe('createParseError', () => {
    it('パースエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createParseError();

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: MCPErrorCode.PARSE_ERROR,
          message: 'Parse error',
        },
      });
    });

    it('詳細を含むパースエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createParseError('Invalid JSON syntax');

      expect(response.error.data).toEqual({
        details: 'Invalid JSON syntax',
      });
    });
  });

  describe('createInvalidRequestError', () => {
    it('無効なリクエストエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createInvalidRequestError(1);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.INVALID_REQUEST,
          message: 'Invalid Request',
        },
      });
    });

    it('詳細を含む無効なリクエストエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createInvalidRequestError(
        1,
        'Missing jsonrpc field'
      );

      expect(response.error.data).toEqual({
        details: 'Missing jsonrpc field',
      });
    });
  });

  describe('createMethodNotFoundError', () => {
    it('メソッドが見つからないエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createMethodNotFoundError(
        1,
        'unknown_method'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.METHOD_NOT_FOUND,
          message: 'Method not found: unknown_method',
        },
      });
    });
  });

  describe('createInvalidParamsError', () => {
    it('無効なパラメータエラーレスポンスを生成する（要件6.1）', () => {
      const response = ErrorHandler.createInvalidParamsError(
        1,
        'Invalid parameters'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
        },
      });
    });

    it('バリデーションエラーを含む無効なパラメータエラーレスポンスを生成する（要件6.1, 6.4）', () => {
      const validationErrors: ValidationError[] = [
        { field: 'query', message: 'Required field is missing' },
        { field: 'limit', message: 'Must be a positive number' },
      ];

      const response = ErrorHandler.createInvalidParamsError(
        1,
        'Invalid parameters',
        validationErrors
      );

      expect(response.error.data).toEqual({
        validationErrors,
      });
    });
  });

  describe('createInternalError', () => {
    it('内部エラーレスポンスを生成する（要件6.2）', () => {
      const response = ErrorHandler.createInternalError(1);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.INTERNAL_ERROR,
          message: 'Internal error',
        },
      });
    });

    it('詳細を含む内部エラーレスポンスを生成する（要件6.2, 6.4）', () => {
      const response = ErrorHandler.createInternalError(
        1,
        'Database connection failed'
      );

      expect(response.error.data).toEqual({
        details: 'Database connection failed',
      });
    });
  });

  describe('createToolNotFoundError', () => {
    it('ツールが見つからないエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createToolNotFoundError(
        1,
        'unknown_tool'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.TOOL_NOT_FOUND,
          message: 'Tool not found: unknown_tool',
        },
      });
    });
  });

  describe('createToolExecutionError', () => {
    it('ツール実行エラーレスポンスを生成する（要件6.3）', () => {
      const response = ErrorHandler.createToolExecutionError(
        1,
        'search_bus_stops'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.TOOL_EXECUTION_ERROR,
          message: 'Tool execution failed: search_bus_stops',
        },
      });
    });

    it('詳細を含むツール実行エラーレスポンスを生成する（要件6.3, 6.4）', () => {
      const response = ErrorHandler.createToolExecutionError(
        1,
        'search_bus_stops',
        'REST API returned 500'
      );

      expect(response.error.data).toEqual({
        details: 'REST API returned 500',
      });
    });
  });

  describe('createRateLimitError', () => {
    it('レート制限超過エラーレスポンスを生成する', () => {
      const response = ErrorHandler.createRateLimitError(1, 60);

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Rate limit exceeded',
          data: {
            retryAfter: 60,
          },
        },
      });
    });
  });

  describe('createSessionNotFoundError', () => {
    it('セッションが見つからないエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createSessionNotFoundError(
        1,
        'session-123'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.SESSION_NOT_FOUND,
          message: 'Session not found: session-123',
        },
      });
    });
  });

  describe('createSessionExpiredError', () => {
    it('セッション期限切れエラーレスポンスを生成する', () => {
      const response = ErrorHandler.createSessionExpiredError(
        1,
        'session-123'
      );

      expect(response).toEqual({
        jsonrpc: '2.0',
        id: 1,
        error: {
          code: MCPErrorCode.SESSION_EXPIRED,
          message: 'Session expired: session-123',
        },
      });
    });
  });

  describe('getErrorCodeDescription', () => {
    it('各エラーコードの説明を返す', () => {
      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.PARSE_ERROR)
      ).toBe('Invalid JSON was received by the server');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.INVALID_REQUEST)
      ).toBe('The JSON sent is not a valid Request object');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.METHOD_NOT_FOUND)
      ).toBe('The method does not exist / is not available');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.INVALID_PARAMS)
      ).toBe('Invalid method parameter(s)');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.INTERNAL_ERROR)
      ).toBe('Internal JSON-RPC error');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.TOOL_NOT_FOUND)
      ).toBe('The requested tool does not exist');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.TOOL_EXECUTION_ERROR)
      ).toBe('Tool execution failed');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.RATE_LIMIT_EXCEEDED)
      ).toBe('Rate limit exceeded');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.SESSION_NOT_FOUND)
      ).toBe('Session not found');

      expect(
        ErrorHandler.getErrorCodeDescription(MCPErrorCode.SESSION_EXPIRED)
      ).toBe('Session expired');
    });

    it('未知のエラーコードの場合は"Unknown error"を返す', () => {
      expect(ErrorHandler.getErrorCodeDescription(9999 as MCPErrorCode)).toBe(
        'Unknown error'
      );
    });
  });

  describe('エラーレスポンスの構造（要件6.4）', () => {
    it('全てのエラーレスポンスがJSON-RPC 2.0形式に準拠する', () => {
      const errors = [
        ErrorHandler.createParseError(),
        ErrorHandler.createInvalidRequestError(1),
        ErrorHandler.createMethodNotFoundError(1, 'test'),
        ErrorHandler.createInvalidParamsError(1, 'test'),
        ErrorHandler.createInternalError(1),
        ErrorHandler.createToolNotFoundError(1, 'test'),
        ErrorHandler.createToolExecutionError(1, 'test'),
        ErrorHandler.createRateLimitError(1, 60),
        ErrorHandler.createSessionNotFoundError(1, 'test'),
        ErrorHandler.createSessionExpiredError(1, 'test'),
      ];

      errors.forEach((error) => {
        expect(error.jsonrpc).toBe('2.0');
        expect(error).toHaveProperty('id');
        expect(error).toHaveProperty('error');
        expect(error.error).toHaveProperty('code');
        expect(error.error).toHaveProperty('message');
        expect(typeof error.error.code).toBe('number');
        expect(typeof error.error.message).toBe('string');
      });
    });
  });
});
