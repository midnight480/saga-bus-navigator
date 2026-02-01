/**
 * APIエラークラス
 * 適切なHTTPステータスコードとエラーメッセージを提供
 */

export class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * 400 Bad Request
 * 必須パラメータの不足、パラメータの形式不正など
 */
export class BadRequestError extends APIError {
  constructor(message: string, details?: any) {
    super(400, message, details);
    this.name = 'BadRequestError';
  }
}

/**
 * 404 Not Found
 * 指定されたリソースが存在しない
 */
export class NotFoundError extends APIError {
  constructor(message: string, details?: any) {
    super(404, message, details);
    this.name = 'NotFoundError';
  }
}

/**
 * 500 Internal Server Error
 * サーバー内部エラー
 */
export class InternalServerError extends APIError {
  constructor(message: string, details?: any) {
    super(500, message, details);
    this.name = 'InternalServerError';
  }
}

/**
 * 504 Gateway Timeout
 * タイムアウトエラー
 */
export class TimeoutError extends APIError {
  constructor(message: string, details?: any) {
    super(504, message, details);
    this.name = 'TimeoutError';
  }
}

/**
 * エラーハンドラー
 * エラーを適切なHTTPレスポンスに変換
 */
export function handleError(error: Error): Response {
  console.error('[API Error]', error);

  if (error instanceof APIError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }

  // 予期しないエラー
  return new Response(
    JSON.stringify({ error: 'Internal Server Error' }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
