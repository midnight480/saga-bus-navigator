/**
 * プロパティテスト: JSON-RPCプロトコル準拠
 * 
 * プロパティ1: JSON-RPCプロトコル準拠
 * 任意の有効なJSON-RPCリクエストに対して、システムは常にJSON-RPC 2.0仕様に準拠したレスポンスを返す
 * 
 * 検証: 要件1.1
 * 
 * Feature: mcp-apps, Property 1: JSON-RPCプロトコル準拠
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { MCPServer } from '../../lib/mcp/server';

describe('Property 1: JSON-RPC Protocol Compliance', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer();
  });

  it('should always return JSON-RPC 2.0 compliant response for any valid request', () => {
    // JSON-RPCリクエストの生成器
    const jsonRpcRequestArbitrary = fc.record({
      jsonrpc: fc.constant('2.0' as const),
      id: fc.oneof(
        fc.integer(),
        fc.string(),
        fc.constant(null)
      ),
      method: fc.oneof(
        fc.constant('initialize'),
        fc.constant('tools/list'),
        fc.constant('tools/call'),
        fc.string({ minLength: 1, maxLength: 50 })
      ),
      params: fc.option(
        fc.oneof(
          fc.record({
            protocolVersion: fc.constant('2025-03-26'),
            capabilities: fc.record({}),
            clientInfo: fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              version: fc.string({ minLength: 1, maxLength: 20 }),
            }),
          }),
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            arguments: fc.option(fc.object()),
          }),
          fc.object()
        ),
        { nil: undefined }
      ),
    });

    fc.assert(
      fc.asyncProperty(jsonRpcRequestArbitrary, async (request) => {
        const response = await server.handleRequest(request);

        // プロパティ1: レスポンスは常にJSON-RPC 2.0形式
        expect(response).toBeDefined();
        expect(response.jsonrpc).toBe('2.0');
        
        // idフィールドは必須（リクエストのidと一致するか、nullの場合はnull）
        expect(response).toHaveProperty('id');
        if (request.id !== undefined) {
          expect(response.id).toBe(request.id);
        }

        // resultまたはerrorのいずれか一方が存在する（両方は存在しない）
        const hasResult = 'result' in response && response.result !== undefined;
        const hasError = 'error' in response && response.error !== undefined;
        expect(hasResult || hasError).toBe(true);
        expect(hasResult && hasError).toBe(false);

        // errorが存在する場合、正しい構造を持つ
        if (hasError) {
          expect(response.error).toBeDefined();
          expect(typeof response.error?.code).toBe('number');
          expect(typeof response.error?.message).toBe('string');
        }

        // resultが存在する場合、定義されている
        if (hasResult) {
          expect(response.result).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle various id types correctly', () => {
    const idArbitrary = fc.oneof(
      fc.integer({ min: -1000000, max: 1000000 }),
      fc.string({ minLength: 1, maxLength: 100 }),
      fc.constant(null)
    );

    fc.assert(
      fc.asyncProperty(idArbitrary, async (id) => {
        const request = {
          jsonrpc: '2.0' as const,
          id,
          method: 'unknown_method',
        };

        const response = await server.handleRequest(request);

        // レスポンスのidはリクエストのidと一致
        expect(response.id).toBe(id);
        expect(response.jsonrpc).toBe('2.0');
      }),
      { numRuns: 100 }
    );
  });

  it('should always include error code and message in error responses', () => {
    const invalidMethodArbitrary = fc.string({ minLength: 1, maxLength: 50 })
      .filter(method => !['initialize', 'tools/list', 'tools/call'].includes(method));

    fc.assert(
      fc.asyncProperty(invalidMethodArbitrary, async (method) => {
        const request = {
          jsonrpc: '2.0' as const,
          id: 1,
          method,
        };

        const response = await server.handleRequest(request);

        // エラーレスポンスの構造検証
        expect(response.jsonrpc).toBe('2.0');
        expect(response.error).toBeDefined();
        expect(typeof response.error?.code).toBe('number');
        expect(typeof response.error?.message).toBe('string');
        expect(response.error?.message.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle initialize with various client info', () => {
    const clientInfoArbitrary = fc.record({
      name: fc.string({ minLength: 1, maxLength: 100 }),
      version: fc.string({ minLength: 1, maxLength: 50 }),
    });

    fc.assert(
      fc.asyncProperty(clientInfoArbitrary, async (clientInfo) => {
        const request = {
          jsonrpc: '2.0' as const,
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo,
          },
        };

        const response = await server.handleRequest(request);

        // 成功レスポンスの検証
        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBe(1);
        expect(response.result).toBeDefined();
        expect(response.result.protocolVersion).toBe('2025-03-26');
        expect(response.result.serverInfo).toBeDefined();
        expect(response.result.capabilities).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain JSON-RPC format even with malformed params', () => {
    const malformedParamsArbitrary = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.array(fc.anything()),
      fc.record({
        invalidField: fc.anything(),
      })
    );

    fc.assert(
      fc.asyncProperty(malformedParamsArbitrary, async (params) => {
        const request = {
          jsonrpc: '2.0' as const,
          id: 1,
          method: 'initialize',
          params,
        };

        const response = await server.handleRequest(request);

        // エラーでもJSON-RPC 2.0形式を維持
        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBe(1);
        
        // エラーレスポンスの場合、正しい構造
        if (response.error) {
          expect(typeof response.error.code).toBe('number');
          expect(typeof response.error.message).toBe('string');
        }
      }),
      { numRuns: 100 }
    );
  });
});
