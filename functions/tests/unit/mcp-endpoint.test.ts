/**
 * MCPエンドポイントの単体テスト
 * 
 * 要件1.1, 5.1, 5.2, 5.3の検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { onRequestOptions, onRequestPost, onRequestGet } from '../../api/mcp';

describe('MCP Endpoint', () => {
  describe('OPTIONS request (CORS preflight)', () => {
    it('要件5.1: プリフライトリクエストに適切なCORSヘッダーを返す', async () => {
      const response = await onRequestOptions();

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('600');
    });

    it('要件5.2, 5.3: セキュリティヘッダーを含める', async () => {
      const response = await onRequestOptions();

      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('POST request (JSON-RPC message)', () => {
    it('要件1.1: 有効なJSON-RPCリクエストを処理する', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      });

      const response = await onRequestPost({ request, env: {} });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jsonrpc).toBe('2.0');
      expect(data.id).toBe(1);
      expect(data.result).toBeDefined();
    });

    it('要件5.2, 5.3: レスポンスにCORSヘッダーを含める', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
        }),
      });

      const response = await onRequestPost({ request, env: {} });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeTruthy();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeTruthy();
    });

    it('無効なContent-Typeを拒否する', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'invalid',
      });

      const response = await onRequestPost({ request, env: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32600);
    });

    it('無効なJSONを拒否する', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      const response = await onRequestPost({ request, env: {} });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32700);
    });

    it('バッチリクエストをサポートする', async () => {
      const request = new Request('http://localhost/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
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
        ]),
      });

      const response = await onRequestPost({ request, env: {} });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
      expect(data[0].id).toBe(1);
      expect(data[1].id).toBe(2);
    });
  });

  describe('GET request (SSE stream)', () => {
    it('SSEストリームは未実装エラーを返す', async () => {
      const response = await onRequestGet();
      const data = await response.json();

      expect(response.status).toBe(501);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(-32601);
    });
  });
});
