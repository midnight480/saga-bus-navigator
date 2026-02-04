/**
 * Feature: mcp-apps, Property 5: CORSヘッダーの存在
 * 
 * 全てのHTTPレスポンスに必須のCORSヘッダーが含まれることを検証
 * 
 * **検証: 要件5.2, 5.3**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * テスト用のMCPエンドポイントハンドラーをモック
 */
async function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
): Promise<Request> {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(url, requestInit);
}

describe('Feature: mcp-apps, Property 5: CORSヘッダーの存在', () => {
  const baseUrl = 'http://localhost:8788';
  const mcpUrl = `${baseUrl}/api/mcp`;

  it('任意の有効なJSON-RPCリクエストに対してCORSヘッダーを返す', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.oneof(fc.integer(), fc.string(), fc.constant(null)),
          method: fc.constantFrom('initialize', 'tools/list', 'tools/call'),
        }),
        async (request) => {
          const { onRequestPost } = await import('../../api/mcp');

          // JSON-RPCリクエストを作成
          const jsonrpcRequest: any = {
            jsonrpc: '2.0',
            id: request.id,
            method: request.method,
          };

          // initializeメソッドの場合はparamsを追加
          if (request.method === 'initialize') {
            jsonrpcRequest.params = {
              protocolVersion: '2025-03-26',
              capabilities: {},
              clientInfo: {
                name: 'test-client',
                version: '1.0.0',
              },
            };
          }

          const mockRequest = await createMockRequest(
            'POST',
            mcpUrl,
            jsonrpcRequest
          );

          const response = await onRequestPost({
            request: mockRequest,
            env: {},
          });

          // CORSヘッダーの存在を確認（要件5.2）
          expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
          expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
            'POST'
          );
          expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
          expect(response.headers.get('Vary')).toBe('Origin');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('OPTIONSリクエスト（プリフライト）に対してCORSヘッダーを返す', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const { onRequestOptions } = await import('../../api/mcp');

        const response = await onRequestOptions();

        // ステータスコードの確認（要件5.3）
        expect(response.status).toBe(204);

        // CORSヘッダーの存在を確認（要件5.2, 5.3）
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain(
          'OPTIONS'
        );
        expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
        expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
      }),
      { numRuns: 100 }
    );
  });

  it('エラーレスポンスにもCORSヘッダーが含まれる', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          invalidBody: fc.oneof(
            fc.constant('invalid json'),
            fc.constant(null),
            fc.constant(undefined),
            fc.record({
              jsonrpc: fc.constantFrom('1.0', '3.0', 'invalid'),
              method: fc.string(),
            })
          ),
        }),
        async ({ invalidBody }) => {
          const { onRequestPost } = await import('../../api/mcp');

          const mockRequest = await createMockRequest('POST', mcpUrl);

          // 無効なボディを設定
          const request = new Request(mcpUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body:
              typeof invalidBody === 'string'
                ? invalidBody
                : JSON.stringify(invalidBody),
          });

          const response = await onRequestPost({
            request,
            env: {},
          });

          // エラーレスポンスでもCORSヘッダーが含まれる（要件5.2）
          expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
          expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
          expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('レート制限エラーにもCORSヘッダーが含まれる', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(null), async () => {
        const { onRequestPost } = await import('../../api/mcp');

        // 同じIPから61回リクエストを送信（制限は60リクエスト/分）
        const requests = [];
        for (let i = 0; i < 61; i++) {
          const request = await createMockRequest(
            'POST',
            mcpUrl,
            {
              jsonrpc: '2.0',
              id: i,
              method: 'initialize',
              params: {
                protocolVersion: '2025-03-26',
                capabilities: {},
                clientInfo: {
                  name: 'test-client',
                  version: '1.0.0',
                },
              },
            },
            {
              'CF-Connecting-IP': '192.168.100.100',
            }
          );

          requests.push(onRequestPost({ request, env: {} }));
        }

        const responses = await Promise.all(requests);

        // 61番目のリクエストはレート制限エラー
        const rateLimitResponse = responses[60];
        expect(rateLimitResponse.status).toBe(429);

        // レート制限エラーでもCORSヘッダーが含まれる（要件5.2）
        expect(rateLimitResponse.headers.get('Access-Control-Allow-Origin')).toBe(
          '*'
        );
        expect(
          rateLimitResponse.headers.get('Access-Control-Allow-Methods')
        ).toBeDefined();
        expect(
          rateLimitResponse.headers.get('Access-Control-Allow-Headers')
        ).toBeDefined();
      }),
      { numRuns: 10 } // レート制限テストは重いので10回のみ
    );
  });
});
