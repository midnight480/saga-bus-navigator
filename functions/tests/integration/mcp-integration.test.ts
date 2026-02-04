/**
 * MCP統合テスト
 * 
 * 全コンポーネントの統合動作を確認
 * タスク14.2
 */

import { describe, it, expect, beforeEach } from 'vitest';

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

describe('MCP統合テスト', () => {
  const baseUrl = 'http://localhost:8788';
  const mcpUrl = `${baseUrl}/api/mcp`;

  describe('エンドツーエンドフロー', () => {
    it('initialize → tools/list → tools/call の完全なフローが動作する', async () => {
      // 動的インポート（Cloudflare Workers環境をシミュレート）
      const { onRequestPost } = await import('../../api/mcp');

      // バッチリクエストで全てのメソッドを実行
      const batchRequest = await createMockRequest('POST', mcpUrl, [
        {
          jsonrpc: '2.0',
          id: 1,
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
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'search_bus_stops',
            arguments: {
              query: '佐賀駅',
            },
          },
        },
      ]);

      const batchResponse = await onRequestPost({
        request: batchRequest,
        env: {},
      });

      expect(batchResponse.status).toBe(200);
      const results = await batchResponse.json();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(3);

      // 1. initialize結果の確認
      expect(results[0].result.protocolVersion).toBe('2025-03-26');
      expect(results[0].result.serverInfo.name).toBe('saga-bus-navigator-mcp');

      // 2. tools/list結果の確認
      expect(results[1].result.tools).toHaveLength(3);
      expect(results[1].result.tools.map((t: any) => t.name)).toEqual([
        'search_bus_stops',
        'search_routes',
        'get_first_last_bus',
      ]);

      // 3. tools/call結果の確認
      expect(results[2].result.content).toBeDefined();
      expect(results[2].result.content[0].type).toBe('text');
    });

    it('複数のツールを連続実行できる', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      // initialize
      const initRequest = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      });

      await onRequestPost({ request: initRequest, env: {} });

      // ツール1: search_bus_stops
      const call1Request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_bus_stops',
          arguments: {
            query: '佐賀駅',
          },
        },
      });

      const call1Response = await onRequestPost({
        request: call1Request,
        env: {},
      });

      expect(call1Response.status).toBe(200);

      // ツール2: search_routes
      const call2Request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'search_routes',
          arguments: {
            from: '佐賀駅バスセンター',
            to: '佐賀大学前',
          },
        },
      });

      const call2Response = await onRequestPost({
        request: call2Request,
        env: {},
      });

      expect(call2Response.status).toBe(200);

      // ツール3: get_first_last_bus
      const call3Request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: {
          name: 'get_first_last_bus',
          arguments: {
            routeId: '1',
          },
        },
      });

      const call3Response = await onRequestPost({
        request: call3Request,
        env: {},
      });

      expect(call3Response.status).toBe(200);
    });
  });

  describe('セキュリティ統合', () => {
    it('悪意のある入力を検出してエラーを返す', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      // SQLインジェクション攻撃を試みる
      const request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: "'; DROP TABLE users; --",
            version: '1.0.0',
          },
        },
      });

      const response = await onRequestPost({ request, env: {} });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.code).toBe(-32602);
      expect(result.error.message).toContain('Security validation failed');
    });

    it('XSS攻撃を検出してエラーを返す', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      // XSS攻撃を試みる
      const request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'search_bus_stops',
          arguments: {
            query: '<script>alert("XSS")</script>',
          },
        },
      });

      const response = await onRequestPost({ request, env: {} });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.code).toBe(-32602);
      expect(result.error.message).toContain('Security validation failed');
    });

    it('全てのレスポンスにセキュリティヘッダーが含まれる', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      const request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      });

      const response = await onRequestPost({ request, env: {} });

      // セキュリティヘッダーの確認
      expect(response.headers.get('Content-Security-Policy')).toBeDefined();
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Referrer-Policy')).toBe(
        'strict-origin-when-cross-origin'
      );
    });
  });

  describe('レート制限統合', () => {
    it('レート制限を超えると429エラーを返す', async () => {
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
            'CF-Connecting-IP': '192.168.1.1',
          }
        );

        requests.push(
          onRequestPost({ request, env: {} })
        );
      }

      const responses = await Promise.all(requests);

      // 最初の60リクエストは成功
      for (let i = 0; i < 60; i++) {
        expect(responses[i].status).toBe(200);
      }

      // 61番目のリクエストはレート制限エラー
      expect(responses[60].status).toBe(429);
      const errorResult = await responses[60].json();
      expect(errorResult.error.code).toBe(-32003);
      expect(errorResult.error.message).toContain('Rate limit exceeded');
      expect(responses[60].headers.get('Retry-After')).toBeDefined();
    });

    it('レート制限ヘッダーが正しく設定される', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      const request = await createMockRequest(
        'POST',
        mcpUrl,
        {
          jsonrpc: '2.0',
          id: 1,
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
          'CF-Connecting-IP': '192.168.1.100',
        }
      );

      const response = await onRequestPost({ request, env: {} });

      expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('エラーハンドリング統合', () => {
    it('初期化前のツール呼び出しはエラーを返す', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      // 初期化せずにツールを呼び出す
      const request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'search_bus_stops',
          arguments: {
            query: '佐賀駅',
          },
        },
      });

      const response = await onRequestPost({ request, env: {} });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.error.code).toBe(-32002);
      expect(result.error.message).toContain('Server not initialized');
    });

    it('存在しないツールの呼び出しはエラーを返す', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      // バッチリクエストで初期化とツール呼び出しを実行
      const batchRequest = await createMockRequest('POST', mcpUrl, [
        {
          jsonrpc: '2.0',
          id: 1,
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
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'non_existent_tool',
            arguments: {},
          },
        },
      ]);

      const response = await onRequestPost({ request: batchRequest, env: {} });

      expect(response.status).toBe(200);
      const results = await response.json();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);

      // 初期化は成功
      expect(results[0].result).toBeDefined();

      // ツール呼び出しはエラー
      expect(results[1].error.code).toBe(-32001);
      expect(results[1].error.message).toContain('Tool not found');
    });

    it('無効なパラメータはバリデーションエラーを返す', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      // 初期化
      const initRequest = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      });

      await onRequestPost({ request: initRequest, env: {} });

      // 無効なパラメータでツールを呼び出す
      const request = await createMockRequest('POST', mcpUrl, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'search_bus_stops',
          arguments: {
            // queryパラメータが欠けている
          },
        },
      });

      const response = await onRequestPost({ request, env: {} });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.error).toBeDefined();
    });
  });

  describe('バッチリクエスト統合', () => {
    it('複数のJSON-RPCメッセージをバッチ処理できる', async () => {
      const { onRequestPost } = await import('../../api/mcp');

      const request = await createMockRequest('POST', mcpUrl, [
        {
          jsonrpc: '2.0',
          id: 1,
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
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/list',
        },
      ]);

      const response = await onRequestPost({ request, env: {} });

      expect(response.status).toBe(200);
      const results = await response.json();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
      expect(results[0].result.protocolVersion).toBe('2025-03-26');
      expect(results[1].result.tools).toHaveLength(3);
    });
  });
});
