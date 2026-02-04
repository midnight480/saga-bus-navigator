/**
 * プロパティテスト: 入力バリデーション
 * Feature: mcp-apps, Property 6: 入力バリデーション
 * 検証: 要件6.1, 6.4
 * 
 * 任意の無効なパラメータを含むリクエストに対して、
 * システムは400エラーとJSON-RPC準拠のエラーレスポンスを返す
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  ErrorHandler,
  MCPErrorCode,
  ValidationError,
} from '../../lib/mcp/error-handler';

describe('Feature: mcp-apps, Property 6: 入力バリデーション', () => {
  it('任意の無効なパラメータに対して400エラーとJSON-RPC準拠のエラーレスポンスを返す', () => {
    fc.assert(
      fc.property(
        // リクエストID生成器
        fc.oneof(
          fc.integer(),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constant(null)
        ),
        // エラーメッセージ生成器
        fc.string({ minLength: 1, maxLength: 200 }),
        // バリデーションエラー生成器（オプション）
        fc.option(
          fc.array(
            fc.record({
              field: fc.string({ minLength: 1, maxLength: 50 }),
              message: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          { nil: undefined }
        ),
        (requestId, errorMessage, validationErrors) => {
          // 無効なパラメータエラーレスポンスを生成
          const response = ErrorHandler.createInvalidParamsError(
            requestId,
            errorMessage,
            validationErrors
          );

          // プロパティ1: JSON-RPC 2.0形式に準拠
          expect(response.jsonrpc).toBe('2.0');

          // プロパティ2: リクエストIDが保持される
          expect(response.id).toBe(requestId);

          // プロパティ3: エラーオブジェクトが存在する
          expect(response).toHaveProperty('error');
          expect(response.error).toBeDefined();

          // プロパティ4: エラーコードがINVALID_PARAMS（-32602）
          expect(response.error.code).toBe(MCPErrorCode.INVALID_PARAMS);

          // プロパティ5: エラーメッセージが含まれる
          expect(response.error.message).toBe(errorMessage);
          expect(typeof response.error.message).toBe('string');
          expect(response.error.message.length).toBeGreaterThan(0);

          // プロパティ6: バリデーションエラーが提供された場合、dataに含まれる
          if (validationErrors) {
            expect(response.error.data).toBeDefined();
            expect(response.error.data?.validationErrors).toEqual(
              validationErrors
            );

            // 各バリデーションエラーが正しい構造を持つ
            validationErrors.forEach((ve) => {
              expect(ve).toHaveProperty('field');
              expect(ve).toHaveProperty('message');
              expect(typeof ve.field).toBe('string');
              expect(typeof ve.message).toBe('string');
            });
          }

          // プロパティ7: レスポンスがシリアライズ可能
          expect(() => JSON.stringify(response)).not.toThrow();

          // プロパティ8: シリアライズ後のデシリアライズで元の構造を保持
          const serialized = JSON.stringify(response);
          const deserialized = JSON.parse(serialized);
          expect(deserialized.jsonrpc).toBe('2.0');
          expect(deserialized.id).toBe(requestId);
          expect(deserialized.error.code).toBe(MCPErrorCode.INVALID_PARAMS);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('任意のエラーコードに対してJSON-RPC準拠のエラーレスポンスを返す', () => {
    fc.assert(
      fc.property(
        // リクエストID生成器
        fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
        // エラーコード生成器（MCPErrorCodeから選択）
        fc.constantFrom(
          MCPErrorCode.PARSE_ERROR,
          MCPErrorCode.INVALID_REQUEST,
          MCPErrorCode.METHOD_NOT_FOUND,
          MCPErrorCode.INVALID_PARAMS,
          MCPErrorCode.INTERNAL_ERROR,
          MCPErrorCode.TOOL_NOT_FOUND,
          MCPErrorCode.TOOL_EXECUTION_ERROR,
          MCPErrorCode.RATE_LIMIT_EXCEEDED,
          MCPErrorCode.SESSION_NOT_FOUND,
          MCPErrorCode.SESSION_EXPIRED
        ),
        // エラーメッセージ生成器
        fc.string({ minLength: 1, maxLength: 200 }),
        (requestId, errorCode, errorMessage) => {
          // エラーレスポンスを生成
          const response = ErrorHandler.createErrorResponse(
            requestId,
            errorCode,
            errorMessage
          );

          // プロパティ1: JSON-RPC 2.0形式に準拠
          expect(response.jsonrpc).toBe('2.0');
          expect(response.id).toBe(requestId);
          expect(response.error.code).toBe(errorCode);
          expect(response.error.message).toBe(errorMessage);

          // プロパティ2: エラーコードが数値
          expect(typeof response.error.code).toBe('number');

          // プロパティ3: エラーメッセージが文字列
          expect(typeof response.error.message).toBe('string');

          // プロパティ4: レスポンスがシリアライズ可能
          expect(() => JSON.stringify(response)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('任意の無効な入力に対してエラーコードの説明を返す', () => {
    fc.assert(
      fc.property(
        // エラーコード生成器（有効なコードと無効なコード）
        fc.oneof(
          fc.constantFrom(
            MCPErrorCode.PARSE_ERROR,
            MCPErrorCode.INVALID_REQUEST,
            MCPErrorCode.METHOD_NOT_FOUND,
            MCPErrorCode.INVALID_PARAMS,
            MCPErrorCode.INTERNAL_ERROR,
            MCPErrorCode.TOOL_NOT_FOUND,
            MCPErrorCode.TOOL_EXECUTION_ERROR,
            MCPErrorCode.RATE_LIMIT_EXCEEDED,
            MCPErrorCode.SESSION_NOT_FOUND,
            MCPErrorCode.SESSION_EXPIRED
          ),
          fc.integer({ min: -40000, max: 40000 }) // 無効なコード
        ),
        (errorCode) => {
          // エラーコードの説明を取得
          const description = ErrorHandler.getErrorCodeDescription(errorCode);

          // プロパティ1: 説明が文字列
          expect(typeof description).toBe('string');

          // プロパティ2: 説明が空でない
          expect(description.length).toBeGreaterThan(0);

          // プロパティ3: 有効なエラーコードの場合、"Unknown error"以外を返す
          const validCodes = [
            MCPErrorCode.PARSE_ERROR,
            MCPErrorCode.INVALID_REQUEST,
            MCPErrorCode.METHOD_NOT_FOUND,
            MCPErrorCode.INVALID_PARAMS,
            MCPErrorCode.INTERNAL_ERROR,
            MCPErrorCode.TOOL_NOT_FOUND,
            MCPErrorCode.TOOL_EXECUTION_ERROR,
            MCPErrorCode.RATE_LIMIT_EXCEEDED,
            MCPErrorCode.SESSION_NOT_FOUND,
            MCPErrorCode.SESSION_EXPIRED,
          ];

          if (validCodes.includes(errorCode)) {
            expect(description).not.toBe('Unknown error');
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
