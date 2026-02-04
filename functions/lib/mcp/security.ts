/**
 * セキュリティレイヤー
 * 
 * 入力検証とセキュリティヘッダーの設定
 * 要件9.1, 9.2, 9.3, 9.4, 9.5
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';

/**
 * セキュリティ検証結果
 */
export interface SecurityValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * セキュリティヘッダー
 */
export interface SecurityHeaders {
  'Content-Security-Policy': string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'Referrer-Policy': string;
}

/**
 * セキュリティレイヤー
 */
export class SecurityLayer {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true });
  }

  /**
   * JSON Schemaによるパラメータ検証（要件9.1）
   * @param data 検証対象データ
   * @param schema JSON Schema
   * @returns 検証結果
   */
  validateWithSchema<T>(
    data: unknown,
    schema: JSONSchemaType<T>
  ): SecurityValidationResult {
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (!valid && validate.errors) {
      const errors = validate.errors.map(
        (err) => `${err.instancePath} ${err.message}`
      );
      return { valid: false, errors };
    }

    return { valid: true };
  }

  /**
   * SQLインジェクション攻撃パターンの検出（要件9.2）
   * @param input 検証対象文字列
   * @returns 検証結果
   */
  detectSQLInjection(input: string): SecurityValidationResult {
    // SQLインジェクション攻撃パターン
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b)/i,
      /(\bINSERT\b.*\bINTO\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bEXEC\b|\bEXECUTE\b)/i,
      /(;.*--)/,
      /('.*OR.*'.*=.*')/i,
      /(".*OR.*".*=.*")/i,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return {
          valid: false,
          errors: ['Potential SQL injection detected'],
        };
      }
    }

    return { valid: true };
  }

  /**
   * XSS攻撃パターンの検出（要件9.3）
   * @param input 検証対象文字列
   * @returns 検証結果
   */
  detectXSS(input: string): SecurityValidationResult {
    // XSS攻撃パターン
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /<iframe[^>]*>/i,
      /<object[^>]*>/i,
      /<embed[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i, // onclick, onload等のイベントハンドラ
      /<img[^>]*onerror/i,
      /<svg[^>]*onload/i,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        return {
          valid: false,
          errors: ['Potential XSS attack detected'],
        };
      }
    }

    return { valid: true };
  }

  /**
   * 文字列入力の包括的なセキュリティ検証（要件9.1, 9.2, 9.3）
   * @param input 検証対象文字列
   * @returns 検証結果
   */
  validateStringInput(input: string): SecurityValidationResult {
    // SQLインジェクション検出
    const sqlResult = this.detectSQLInjection(input);
    if (!sqlResult.valid) {
      return sqlResult;
    }

    // XSS検出
    const xssResult = this.detectXSS(input);
    if (!xssResult.valid) {
      return xssResult;
    }

    return { valid: true };
  }

  /**
   * オブジェクト内の全ての文字列値を検証（要件9.1, 9.2, 9.3）
   * @param obj 検証対象オブジェクト
   * @returns 検証結果
   */
  validateObjectStrings(obj: unknown): SecurityValidationResult {
    if (typeof obj === 'string') {
      return this.validateStringInput(obj);
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = this.validateObjectStrings(item);
        if (!result.valid) {
          return result;
        }
      }
      return { valid: true };
    }

    if (typeof obj === 'object' && obj !== null) {
      for (const value of Object.values(obj)) {
        const result = this.validateObjectStrings(value);
        if (!result.valid) {
          return result;
        }
      }
      return { valid: true };
    }

    return { valid: true };
  }

  /**
   * セキュリティヘッダーを取得（要件9.4, 9.5）
   * @returns セキュリティヘッダー
   */
  getSecurityHeaders(): SecurityHeaders {
    return {
      // Content-Security-Policy（要件9.4）
      'Content-Security-Policy':
        "default-src 'self'; " +
        "script-src 'self'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " +
        "form-action 'self'",

      // X-Content-Type-Options（要件9.5）
      'X-Content-Type-Options': 'nosniff',

      // X-Frame-Options（クリックジャッキング対策）
      'X-Frame-Options': 'DENY',

      // Referrer-Policy（リファラー情報の制御）
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };
  }

  /**
   * レスポンスにセキュリティヘッダーを追加（要件9.4, 9.5）
   * @param headers 既存のヘッダー
   * @returns セキュリティヘッダーを追加したヘッダー
   */
  addSecurityHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const securityHeaders = this.getSecurityHeaders();
    return {
      ...headers,
      ...securityHeaders,
    };
  }
}
