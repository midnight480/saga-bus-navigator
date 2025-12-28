/**
 * Cloudflare Functions: Amazon Translate API プロキシ
 * 
 * AWS SDK for JavaScript v3を使用してAmazon Translateを呼び出し、
 * 日本語テキストを英語に翻訳する
 * 
 * Feature: alert-enhancement
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4
 */

import {
  TranslateClient,
  TranslateTextCommand,
  TranslateTextCommandInput,
} from "@aws-sdk/client-translate";

interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
}

interface TranslateRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage?: string;
}

interface TranslateResponse {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// CORSヘッダー
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "600",
};

/**
 * OPTIONSリクエストハンドラー（CORSプリフライト対応）
 */
export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};

/**
 * POSTリクエストハンドラー（翻訳実行）
 */
export const onRequestPost = async (ctx: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = ctx;

  // AWS認証情報の確認
  if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
    return createErrorResponse(
      "AWS credentials not configured",
      "AUTH_NOT_CONFIGURED",
      503
    );
  }

  // リクエストボディの解析
  let body: TranslateRequest;
  try {
    body = await request.json();
  } catch {
    return createErrorResponse(
      "Invalid JSON in request body",
      "INVALID_REQUEST",
      400
    );
  }

  // 入力検証
  if (!body.text || typeof body.text !== "string") {
    return createErrorResponse(
      "Missing or invalid 'text' field",
      "INVALID_REQUEST",
      400
    );
  }

  // 空白のみのテキストはそのまま返す
  if (body.text.trim().length === 0) {
    return createSuccessResponse({
      translatedText: body.text,
      sourceLanguage: body.sourceLanguage || "ja",
      targetLanguage: body.targetLanguage || "en",
    });
  }

  const sourceLanguage = body.sourceLanguage || "ja";
  const targetLanguage = body.targetLanguage || "en";

  // 同じ言語への翻訳は不要
  if (sourceLanguage === targetLanguage) {
    return createSuccessResponse({
      translatedText: body.text,
      sourceLanguage,
      targetLanguage,
    });
  }

  // Amazon Translateクライアントの初期化
  const client = new TranslateClient({
    region: env.AWS_REGION || "ap-northeast-1",
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });

  // 翻訳コマンドの作成
  const commandInput: TranslateTextCommandInput = {
    Text: body.text,
    SourceLanguageCode: sourceLanguage,
    TargetLanguageCode: targetLanguage,
  };

  try {
    const command = new TranslateTextCommand(commandInput);
    const response = await client.send(command);

    if (!response.TranslatedText) {
      return createErrorResponse(
        "Empty translation result",
        "TRANSLATION_FAILED",
        500
      );
    }

    return createSuccessResponse({
      translatedText: response.TranslatedText,
      sourceLanguage: response.SourceLanguageCode || sourceLanguage,
      targetLanguage: response.TargetLanguageCode || targetLanguage,
    });
  } catch (error) {
    console.error("Amazon Translate error:", error);

    // エラータイプに応じた処理
    if (error instanceof Error) {
      const errorName = error.name;

      // 認証エラー
      if (
        errorName === "UnrecognizedClientException" ||
        errorName === "InvalidSignatureException" ||
        errorName === "AccessDeniedException"
      ) {
        return createErrorResponse(
          "AWS authentication failed",
          "AUTH_ERROR",
          401
        );
      }

      // レート制限
      if (
        errorName === "ThrottlingException" ||
        errorName === "TooManyRequestsException"
      ) {
        return createErrorResponse(
          "Rate limit exceeded",
          "RATE_LIMIT",
          429
        );
      }

      // テキストサイズ制限
      if (errorName === "TextSizeLimitExceededException") {
        return createErrorResponse(
          "Text too long for translation",
          "TEXT_TOO_LONG",
          400
        );
      }

      // サポートされていない言語
      if (errorName === "UnsupportedLanguagePairException") {
        return createErrorResponse(
          "Unsupported language pair",
          "UNSUPPORTED_LANGUAGE",
          400
        );
      }

      return createErrorResponse(
        error.message || "Translation failed",
        "TRANSLATION_ERROR",
        500
      );
    }

    return createErrorResponse(
      "Unknown translation error",
      "UNKNOWN_ERROR",
      500
    );
  }
};

/**
 * 成功レスポンスを作成
 */
function createSuccessResponse(data: TranslateResponse): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

/**
 * エラーレスポンスを作成
 */
function createErrorResponse(
  message: string,
  code: string,
  status: number
): Response {
  const errorBody: ErrorResponse = {
    error: message,
    code: code,
  };

  return new Response(JSON.stringify(errorBody), {
    status: status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}
