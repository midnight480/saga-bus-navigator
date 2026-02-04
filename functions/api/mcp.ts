/**
 * MCP Apps エンドポイント
 * 
 * Model Context Protocol (MCP) 2025-03-26仕様に準拠したHTTPエンドポイント
 * AIアシスタント（Claude等）から佐賀バスナビゲーター機能を利用可能にする
 */

import { MCPServer } from '../lib/mcp/server';
import { SessionManager } from '../lib/mcp/session-manager';
import { RateLimiter } from '../lib/mcp/rate-limiter';
import { ErrorHandler, MCPErrorCode } from '../lib/mcp/error-handler';
import { SecurityLayer } from '../lib/mcp/security';

interface Env {
  RATE_LIMIT_KV?: KVNamespace;
}

// グローバルインスタンス（Cloudflare Workersの起動時に1回だけ初期化）
const sessionManager = new SessionManager();
const rateLimiter = new RateLimiter();
const securityLayer = new SecurityLayer();

/**
 * MCPサーバーインスタンスを取得
 * リクエストのURLからbaseURLを抽出してサーバーを初期化
 */
function getMCPServer(request: Request): MCPServer {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  return new MCPServer(baseUrl);
}

/**
 * JSON-RPC 2.0メッセージ型定義
 */
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * CORSヘッダーを生成
 */
function getCORSHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Mcp-Session-Id, Last-Event-ID',
    'Access-Control-Max-Age': '600',
    'Vary': 'Origin',
  };
}

/**
 * レスポンスヘッダーを生成（CORS + セキュリティヘッダー）
 */
function getResponseHeaders(): Record<string, string> {
  const corsHeaders = getCORSHeaders();
  return securityLayer.addSecurityHeaders(corsHeaders);
}

/**
 * クライアントIPアドレスを取得
 */
function getClientIP(request: Request): string {
  // Cloudflare Workersの場合、CF-Connecting-IPヘッダーから取得
  const cfIP = request.headers.get('CF-Connecting-IP');
  if (cfIP) {
    return cfIP;
  }

  // フォールバック: X-Forwarded-Forヘッダー
  const xForwardedFor = request.headers.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  // デフォルト値
  return 'unknown';
}

/**
 * OPTIONSリクエストハンドラー（CORSプリフライト対応）
 */
export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: getResponseHeaders(),
  });
};

/**
 * POSTリクエストハンドラー（JSON-RPCメッセージ受信）
 */
export const onRequestPost = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request } = context;

  try {
    // クライアントIPアドレスを取得
    const clientIP = getClientIP(request);

    // レート制限チェック
    const rateLimitResult = rateLimiter.check(clientIP);
    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil(
        (rateLimitResult.resetAt - Date.now()) / 1000
      );
      const errorResponse = ErrorHandler.createRateLimitError(null, retryAfter);
      return new Response(JSON.stringify(errorResponse), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          ...getResponseHeaders(),
        },
      });
    }

    // MCPサーバーインスタンスを取得
    const mcpServer = getMCPServer(request);

    // Content-Typeチェック
    const contentType = request.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      const errorResponse = ErrorHandler.createInvalidRequestError(
        null,
        'Content-Type must be application/json'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getResponseHeaders(),
        },
      });
    }

    // リクエストボディをパース
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      const errorResponse = ErrorHandler.createParseError(
        error instanceof Error ? error.message : 'Invalid JSON'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getResponseHeaders(),
        },
      });
    }

    // JSON-RPCメッセージの検証
    if (!body || typeof body !== 'object') {
      const errorResponse = ErrorHandler.createInvalidRequestError(
        null,
        'Body must be an object'
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getResponseHeaders(),
        },
      });
    }

    // セキュリティ検証: 入力文字列のチェック
    const securityResult = securityLayer.validateObjectStrings(body);
    if (!securityResult.valid) {
      const errorResponse = ErrorHandler.createInvalidParamsError(
        null,
        'Security validation failed',
        securityResult.errors?.map((err) => ({
          field: 'input',
          message: err,
        }))
      );
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getResponseHeaders(),
        },
      });
    }

    // バッチリクエストのサポート
    const messages = Array.isArray(body) ? body : [body];
    const responses: JSONRPCResponse[] = [];

    for (const message of messages) {
      // JSON-RPC 2.0形式の検証
      if (message.jsonrpc !== '2.0') {
        responses.push(
          ErrorHandler.createInvalidRequestError(
            message.id ?? null,
            'jsonrpc must be "2.0"'
          )
        );
        continue;
      }

      if (typeof message.method !== 'string') {
        responses.push(
          ErrorHandler.createInvalidRequestError(
            message.id ?? null,
            'method must be a string'
          )
        );
        continue;
      }

      // MCPサーバーでリクエストを処理
      const response = await mcpServer.handleRequest(message);
      responses.push(response);
    }

    // レスポンスを返す
    const responseBody = Array.isArray(body) ? responses : responses[0];
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        ...getResponseHeaders(),
      },
    });
  } catch (error) {
    console.error('[MCP Endpoint Error]', error);
    const errorResponse = ErrorHandler.createInternalError(
      null,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...getResponseHeaders(),
      },
    });
  }
};

/**
 * GETリクエストハンドラー（SSEストリーム - オプション）
 * 現時点では未実装
 */
export const onRequestGet = async (): Promise<Response> => {
  const errorResponse = ErrorHandler.createMethodNotFoundError(
    null,
    'GET (SSE streaming is not yet implemented)'
  );
  return new Response(JSON.stringify(errorResponse), {
    status: 501,
    headers: {
      'Content-Type': 'application/json',
      ...getResponseHeaders(),
    },
  });
};
