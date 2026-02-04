/**
 * プロパティテスト: JSON-RPCプロトコル準拠
 * 
 * Feature: mcp-apps
 * Property 1: JSON-RPCプロトコル準拠
 * 検証: 要件1.1
 * 
 * 任意の有効なJSON-RPCリクエストに対して、システムは常にJSON-RPC 2.0仕様に準拠したレスポンスを返す
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MCPServer } from '../../lib/mcp/server';

describe('Feature: mcp-apps, Property 1: JSON-RPCプロトコル準拠', () => {
  it('任意の有効なJSON-RPCリクエストに対してJSON-RPC 2.0準拠のレスポンスを返す', () => {
    fc.assert(
      fc.asyncProperty(
        // JSON-RPC IDジェネレーター（文字列または数値）
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 })
        ),
        // メソッド名ジェネレーター
        fc.constantFrom('initialize', 'tools/list', 'tools/call', 'unknown_method'),
        async (id, method) => {
          const server = new MCPServer();

          // 初期化リクエストの場合は有効なパラメータを生成
          let params: any;
          if (method === 'initialize') {
            params = {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: {
                name: 'test-client',
                version: '1.0.0',
              },
            };
          } else if (method === 'tools/call') {
            params = {
              name: 'test_tool',
              arguments: {},
            };
          }

          const request = {
            jsonrpc: '2.0' as const,
            id,
            method,
            params,
          };

          const response = await server.handleRequest(request);

          // プロパティ1: JSON-RPC 2.0準拠の検証
          expect(response).toBeDefined();
          expect(response.jsonrpc).toBe('2.0');
          expect(response.id).toBe(id);

          // resultまたはerrorのいずれかが存在する
          const hasResult = 'result' in response && response.result !== undefined;
          const hasError = 'error' in response && response.error !== undefined;
          expect(hasResult || hasError).toBe(true);

          // resultとerrorは同時に存在しない
          expect(hasResult && hasError).toBe(false);

          // errorが存在する場合、正しい構造を持つ
          if (hasError) {
            expect(response.error).toBeDefined();
            expect(typeof response.error?.code).toBe('number');
            expect(typeof response.error?.message).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('バッチリクエストの各レスポンスがJSON-RPC 2.0準拠である', () => {
    fc.assert(
      fc.asyncProperty(
        // 1-5個のリクエストを生成
        fc.array(
          fc.record({
            id: fc.oneof(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.integer({ min: 1, max: 1000000 })
            ),
            method: fc.constantFrom('initialize', 'tools/list', 'unknown_method'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (requests) => {
          const server = new MCPServer();

          // 各リクエストを処理
          const responses = [];
          for (const req of requests) {
            let params: any;
            if (req.method === 'initialize') {
              params = {
                protocolVersion: '2025-03-26',
                capabilities: {},
                clientInfo: {
                  name: 'test-client',
                  version: '1.0.0',
                },
              };
            }

            const request = {
              jsonrpc: '2.0' as const,
              id: req.id,
              method: req.method,
              params,
            };

            const response = await server.handleRequest(request);
            responses.push(response);
          }

          // 全てのレスポンスがJSON-RPC 2.0準拠
          expect(responses).toHaveLength(requests.length);

          for (let i = 0; i < responses.length; i++) {
            const response = responses[i];
            const request = requests[i];

            expect(response.jsonrpc).toBe('2.0');
            expect(response.id).toBe(request.id);

            const hasResult = 'result' in response && response.result !== undefined;
            const hasError = 'error' in response && response.error !== undefined;
            expect(hasResult || hasError).toBe(true);
            expect(hasResult && hasError).toBe(false);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('無効なjsonrpcバージョンを含むリクエストに対してもJSON-RPC 2.0準拠のエラーレスポンスを返す', () => {
    fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s !== '2.0'),
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 })
        ),
        async (invalidVersion, id) => {
          const server = new MCPServer();

          const request = {
            jsonrpc: invalidVersion as any,
            id,
            method: 'initialize',
            params: {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: {
                name: 'test-client',
                version: '1.0.0',
              },
            },
          };

          const response = await server.handleRequest(request);

          // エラーレスポンスもJSON-RPC 2.0準拠
          expect(response.jsonrpc).toBe('2.0');
          expect(response.id).toBe(id);
          expect(response.error).toBeDefined();
          expect(typeof response.error?.code).toBe('number');
          expect(typeof response.error?.message).toBe('string');
        }
      ),
      { numRuns: 50 }
    );
  });
});
