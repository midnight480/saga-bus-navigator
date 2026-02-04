/**
 * プロパティテスト: セキュリティヘッダーの存在
 * Feature: mcp-apps, Property 7: セキュリティヘッダーの存在
 * 検証: 要件9.4, 9.5
 * 
 * 任意のHTTPレスポンスに対して、セキュリティヘッダー
 * （Content-Security-Policy, X-Content-Type-Options）が含まれる
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { SecurityLayer } from '../../lib/mcp/security';

describe('Feature: mcp-apps, Property 7: セキュリティヘッダーの存在', () => {
  let security: SecurityLayer;

  beforeEach(() => {
    security = new SecurityLayer();
  });

  it('任意のHTTPレスポンスヘッダーにセキュリティヘッダーが含まれる', () => {
    fc.assert(
      fc.property(
        // 既存のヘッダー生成器
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 200 })
        ),
        (existingHeaders) => {
          // セキュリティヘッダーを追加
          const headers = security.addSecurityHeaders(existingHeaders);

          // プロパティ1: Content-Security-Policyヘッダーが存在する（要件9.4）
          expect(headers).toHaveProperty('Content-Security-Policy');
          expect(typeof headers['Content-Security-Policy']).toBe('string');
          expect(headers['Content-Security-Policy'].length).toBeGreaterThan(0);

          // プロパティ2: X-Content-Type-Optionsヘッダーが存在する（要件9.5）
          expect(headers).toHaveProperty('X-Content-Type-Options');
          expect(headers['X-Content-Type-Options']).toBe('nosniff');

          // プロパティ3: X-Frame-Optionsヘッダーが存在する
          expect(headers).toHaveProperty('X-Frame-Options');
          expect(headers['X-Frame-Options']).toBe('DENY');

          // プロパティ4: Referrer-Policyヘッダーが存在する
          expect(headers).toHaveProperty('Referrer-Policy');
          expect(headers['Referrer-Policy']).toBe(
            'strict-origin-when-cross-origin'
          );

          // プロパティ5: 既存のヘッダーが保持される
          Object.keys(existingHeaders).forEach((key) => {
            // セキュリティヘッダーと重複しない場合は保持される
            if (
              ![
                'Content-Security-Policy',
                'X-Content-Type-Options',
                'X-Frame-Options',
                'Referrer-Policy',
              ].includes(key)
            ) {
              expect(headers[key]).toBe(existingHeaders[key]);
            }
          });

          // プロパティ6: Content-Security-Policyが適切な指示を含む
          const csp = headers['Content-Security-Policy'];
          expect(csp).toContain("default-src 'self'");
          expect(csp).toContain("script-src 'self'");
          expect(csp).toContain("frame-ancestors 'none'");
        }
      ),
      { numRuns: 100 }
    );
  });

  it('getSecurityHeaders()が常に一貫したヘッダーを返す', () => {
    fc.assert(
      fc.property(
        // ダミー入力（実際には使用しない）
        fc.integer(),
        () => {
          // セキュリティヘッダーを取得
          const headers = security.getSecurityHeaders();

          // プロパティ1: 必須ヘッダーが全て存在する
          const requiredHeaders = [
            'Content-Security-Policy',
            'X-Content-Type-Options',
            'X-Frame-Options',
            'Referrer-Policy',
          ];

          requiredHeaders.forEach((header) => {
            expect(headers).toHaveProperty(header);
            expect(typeof headers[header as keyof typeof headers]).toBe(
              'string'
            );
            expect(headers[header as keyof typeof headers].length).toBeGreaterThan(
              0
            );
          });

          // プロパティ2: ヘッダー値が空でない
          Object.values(headers).forEach((value) => {
            expect(value.length).toBeGreaterThan(0);
          });

          // プロパティ3: Content-Security-Policyが複数の指示を含む
          const cspDirectives = headers['Content-Security-Policy'].split(';');
          expect(cspDirectives.length).toBeGreaterThan(5);

          // プロパティ4: 各CSP指示が有効な形式
          cspDirectives.forEach((directive) => {
            const trimmed = directive.trim();
            if (trimmed.length > 0) {
              // 指示は "directive-name value" の形式
              expect(trimmed).toMatch(/^[\w-]+\s+.+$/);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('任意の入力に対してセキュリティヘッダーの構造が一貫している', () => {
    fc.assert(
      fc.property(
        // ランダムなヘッダー生成器
        fc.record({
          'Content-Type': fc.constantFrom(
            'application/json',
            'text/html',
            'text/plain'
          ),
          'Access-Control-Allow-Origin': fc.constantFrom('*', 'https://example.com'),
          'Cache-Control': fc.constantFrom('no-cache', 'max-age=3600'),
        }),
        (existingHeaders) => {
          const headers = security.addSecurityHeaders(existingHeaders);

          // プロパティ1: セキュリティヘッダーの数が一定
          const securityHeaderKeys = [
            'Content-Security-Policy',
            'X-Content-Type-Options',
            'X-Frame-Options',
            'Referrer-Policy',
          ];

          const securityHeaderCount = securityHeaderKeys.filter(
            (key) => key in headers
          ).length;

          expect(securityHeaderCount).toBe(4);

          // プロパティ2: 各セキュリティヘッダーの値が固定
          expect(headers['X-Content-Type-Options']).toBe('nosniff');
          expect(headers['X-Frame-Options']).toBe('DENY');
          expect(headers['Referrer-Policy']).toBe(
            'strict-origin-when-cross-origin'
          );

          // プロパティ3: Content-Security-Policyが常に同じ構造
          const csp = headers['Content-Security-Policy'];
          const expectedDirectives = [
            'default-src',
            'script-src',
            'style-src',
            'img-src',
            'font-src',
            'connect-src',
            'frame-ancestors',
            'base-uri',
            'form-action',
          ];

          expectedDirectives.forEach((directive) => {
            expect(csp).toContain(directive);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
