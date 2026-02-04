/**
 * MCPサーバーの単体テスト
 * 
 * 要件1.2, 8.1, 8.2の検証
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MCPServer } from '../../lib/mcp/server';

describe('MCP Server', () => {
  let server: MCPServer;

  beforeEach(() => {
    server = new MCPServer();
  });

  describe('initialize method', () => {
    it('要件8.1: 有効な初期化リクエストを処理する', async () => {
      const request = {
        jsonrpc: '2.0' as const,
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
      };

      const response = await server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(1);
      expect(response.result).toBeDefined();
      expect(response.result.protocolVersion).toBe('2025-03-26');
      expect(response.result.serverInfo).toBeDefined();
      expect(response.result.serverInfo.name).toBe('saga-bus-navigator-mcp');
      expect(response.result.serverInfo.version).toBe('1.0.0');
      expect(response.result.capabilities).toBeDefined();
    });

    it('プロトコルバージョンが必須', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'initialize',
        params: {
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      const response = await server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32602);
    });

    it('clientInfoが必須', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
        },
      };

      const response = await server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32602);
    });

    it('サポートされていないプロトコルバージョンを拒否', async () => {
      const request = {
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-01-01',
          capabilities: {},
          clientInfo: {
            name: 'test-client',
            version: '1.0.0',
          },
        },
      };

      const response = await server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32602);
      expect(response.error?.message).toContain('Unsupported protocol version');
    });

    it('初期化後、サーバーが初期化済み状態になる', async () => {
      expect(server.isInitialized()).toBe(false);

      const request = {
        jsonrpc: '2.0' as const,
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
      };

      await server.handleRequest(request);

      expect(server.isInitialized()).toBe(true);
      expect(server.getClientInfo()).toEqual({
        name: 'test-client',
        version: '1.0.0',
      });
    });
  });

  describe('tools/list method', () => {
    it('要件1.2, 8.2: 初期化後にツールリストを返す', async () => {
      // 初期化
      await server.handleRequest({
        jsonrpc: '2.0' as const,
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

      // ツールリスト取得
      const response = await server.handleRequest({
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/list',
      });

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(2);
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
    });

    it('初期化前はエラーを返す', async () => {
      const response = await server.handleRequest({
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/list',
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32002);
      expect(response.error?.message).toContain('not initialized');
    });

    it('ツールを登録できる', async () => {
      // ツールを登録
      server.registerTool({
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param: {
              type: 'string',
            },
          },
          required: ['param'],
        },
      });

      // バス停検索、路線検索、始発・終バス検索ツールが既に登録されているため、ツール数は4になる
      expect(server.getToolCount()).toBe(4);

      // 初期化
      await server.handleRequest({
        jsonrpc: '2.0' as const,
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

      // ツールリスト取得
      const response = await server.handleRequest({
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/list',
      });

      // バス停検索、路線検索、始発・終バス検索、test_toolの4つが登録されている
      expect(response.result.tools).toHaveLength(4);
      
      // test_toolが含まれていることを確認
      const testTool = response.result.tools.find((t: any) => t.name === 'test_tool');
      expect(testTool).toBeDefined();
      expect(testTool.description).toBe('Test tool');
      expect(testTool.inputSchema).toBeDefined();
      
      // バス停検索ツールも含まれていることを確認
      const searchBusStopsTool = response.result.tools.find((t: any) => t.name === 'search_bus_stops');
      expect(searchBusStopsTool).toBeDefined();
      
      // 路線検索ツールも含まれていることを確認
      const searchRoutesTool = response.result.tools.find((t: any) => t.name === 'search_routes');
      expect(searchRoutesTool).toBeDefined();
      
      // 始発・終バス検索ツールも含まれていることを確認
      const getFirstLastBusTool = response.result.tools.find((t: any) => t.name === 'get_first_last_bus');
      expect(getFirstLastBusTool).toBeDefined();
    });
  });

  describe('tools/call method', () => {
    it('初期化前はエラーを返す', async () => {
      const response = await server.handleRequest({
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'tools/call',
        params: {
          name: 'test_tool',
          arguments: {},
        },
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32002);
    });

    it('存在しないツールはエラーを返す', async () => {
      // 初期化
      await server.handleRequest({
        jsonrpc: '2.0' as const,
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

      // 存在しないツールを呼び出し
      const response = await server.handleRequest({
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {},
        },
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32001);
      expect(response.error?.message).toContain('Tool not found');
    });

    it('パラメータが必須', async () => {
      // 初期化
      await server.handleRequest({
        jsonrpc: '2.0' as const,
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

      // パラメータなしで呼び出し
      const response = await server.handleRequest({
        jsonrpc: '2.0' as const,
        id: 2,
        method: 'tools/call',
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32602);
    });
  });

  describe('unknown method', () => {
    it('未知のメソッドはエラーを返す', async () => {
      const response = await server.handleRequest({
        jsonrpc: '2.0' as const,
        id: 1,
        method: 'unknown_method',
      });

      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe(-32601);
      expect(response.error?.message).toContain('Method not found');
    });
  });
});
