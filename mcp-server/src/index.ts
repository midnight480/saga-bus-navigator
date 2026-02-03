#!/usr/bin/env node

/**
 * Saga Bus MCP Server
 * 
 * Model Context Protocol経由で佐賀市のバス情報にアクセスできるサーバ
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode
} from "@modelcontextprotocol/sdk/types.js";

import { searchBusStops, searchBusStopsSchema } from './tools/search-bus-stops.js';
import { searchRoutes, searchRoutesSchema } from './tools/search-routes.js';
import { getFirstLastBus, getFirstLastBusSchema } from './tools/get-first-last-bus.js';

/**
 * MCPサーバの初期化
 */
const server = new Server({
  name: "saga-bus-mcp-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}
  }
});

/**
 * ツール一覧の登録
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      searchBusStopsSchema,
      searchRoutesSchema,
      getFirstLastBusSchema
    ]
  };
});

/**
 * ツール実行ハンドラ
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "search_bus_stops":
        return await searchBusStops(args as any);
      case "search_routes":
        return await searchRoutes(args as any);
      case "get_first_last_bus":
        return await getFirstLastBus(args as any);
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, errorMessage);
  }
});

/**
 * サーバの起動
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // エラーハンドリング
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});

