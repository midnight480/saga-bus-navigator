/**
 * セキュリティレイヤーの単体テスト
 * 要件9.2, 9.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SecurityLayer } from '../../lib/mcp/security';
import { JSONSchemaType } from 'ajv';

describe('SecurityLayer', () => {
  let security: SecurityLayer;

  beforeEach(() => {
    security = new SecurityLayer();
  });

  describe('validateWithSchema', () => {
    interface TestData {
      name: string;
      age: number;
    }

    const schema: JSONSchemaType<TestData> = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name', 'age'],
      additionalProperties: false,
    };

    it('有効なデータを検証する', () => {
      const data = { name: 'Test', age: 25 };
      const result = security.validateWithSchema(data, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('無効なデータを検証する（必須フィールド欠落）', () => {
      const data = { name: 'Test' };
      const result = security.validateWithSchema(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('無効なデータを検証する（型不一致）', () => {
      const data = { name: 'Test', age: 'invalid' };
      const result = security.validateWithSchema(data, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('detectSQLInjection', () => {
    it('正常な入力を許可する（要件9.2）', () => {
      const validInputs = [
        '佐賀駅',
        'Saga Station',
        '123',
        'test@example.com',
        'route-1',
      ];

      validInputs.forEach((input) => {
        const result = security.detectSQLInjection(input);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    it('UNION SELECT攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection(
        "' UNION SELECT * FROM users --"
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('SELECT FROM攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection('SELECT * FROM stops');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('INSERT INTO攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection(
        "INSERT INTO users VALUES ('admin', 'password')"
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('UPDATE SET攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection(
        "UPDATE users SET role='admin' WHERE id=1"
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('DELETE FROM攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection('DELETE FROM users');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('DROP TABLE攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection('DROP TABLE users');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('EXEC攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection("EXEC sp_executesql 'query'");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('コメント攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection("'; DROP TABLE users; --");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });

    it('OR条件攻撃を検出する（要件9.2）', () => {
      const result = security.detectSQLInjection("' OR '1'='1");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential SQL injection detected');
    });
  });

  describe('detectXSS', () => {
    it('正常な入力を許可する（要件9.3）', () => {
      const validInputs = [
        '佐賀駅',
        'Saga Station',
        '<p>Normal text</p>',
        'test@example.com',
        'https://example.com',
      ];

      validInputs.forEach((input) => {
        const result = security.detectXSS(input);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    it('script タグ攻撃を検出する（要件9.3）', () => {
      const result = security.detectXSS(
        '<script>alert("XSS")</script>'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS attack detected');
    });

    it('iframe タグ攻撃を検出する（要件9.3）', () => {
      const result = security.detectXSS(
        '<iframe src="http://evil.com"></iframe>'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS attack detected');
    });

    it('object タグ攻撃を検出する（要件9.3）', () => {
      const result = security.detectXSS(
        '<object data="http://evil.com"></object>'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS attack detected');
    });

    it('embed タグ攻撃を検出する（要件9.3）', () => {
      const result = security.detectXSS(
        '<embed src="http://evil.com">'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS attack detected');
    });

    it('javascript: プロトコル攻撃を検出する（要件9.3）', () => {
      const result = security.detectXSS(
        '<a href="javascript:alert(\'XSS\')">Click</a>'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS attack detected');
    });

    it('イベントハンドラ攻撃を検出する（要件9.3）', () => {
      const attacks = [
        '<img src="x" onclick="alert(\'XSS\')">',
        '<div onload="alert(\'XSS\')">',
        '<body onmouseover="alert(\'XSS\')">',
      ];

      attacks.forEach((attack) => {
        const result = security.detectXSS(attack);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Potential XSS attack detected');
      });
    });

    it('img onerror 攻撃を検出する（要件9.3）', () => {
      const result = security.detectXSS(
        '<img src="x" onerror="alert(\'XSS\')">'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS attack detected');
    });

    it('svg onload 攻撃を検出する（要件9.3）', () => {
      const result = security.detectXSS(
        '<svg onload="alert(\'XSS\')">'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Potential XSS attack detected');
    });
  });

  describe('validateStringInput', () => {
    it('正常な文字列を許可する', () => {
      const result = security.validateStringInput('佐賀駅');

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('SQLインジェクション攻撃を検出する', () => {
      const result = security.validateStringInput(
        "' UNION SELECT * FROM users --"
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('XSS攻撃を検出する', () => {
      const result = security.validateStringInput(
        '<script>alert("XSS")</script>'
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('validateObjectStrings', () => {
    it('正常なオブジェクトを許可する', () => {
      const obj = {
        query: '佐賀駅',
        limit: 10,
        nested: {
          value: 'test',
        },
      };

      const result = security.validateObjectStrings(obj);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('配列内の文字列を検証する', () => {
      const obj = {
        queries: ['佐賀駅', '県庁前'],
      };

      const result = security.validateObjectStrings(obj);

      expect(result.valid).toBe(true);
    });

    it('ネストされたオブジェクト内の攻撃を検出する', () => {
      const obj = {
        query: '佐賀駅',
        nested: {
          value: '<script>alert("XSS")</script>',
        },
      };

      const result = security.validateObjectStrings(obj);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('配列内の攻撃を検出する', () => {
      const obj = {
        queries: ['佐賀駅', "' UNION SELECT * FROM users --"],
      };

      const result = security.validateObjectStrings(obj);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('数値や真偽値を含むオブジェクトを許可する', () => {
      const obj = {
        name: 'test',
        age: 25,
        active: true,
        data: null,
      };

      const result = security.validateObjectStrings(obj);

      expect(result.valid).toBe(true);
    });
  });

  describe('getSecurityHeaders', () => {
    it('全てのセキュリティヘッダーを返す（要件9.4, 9.5）', () => {
      const headers = security.getSecurityHeaders();

      // Content-Security-Policy（要件9.4）
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
      expect(headers['Content-Security-Policy']).toContain("script-src 'self'");
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");

      // X-Content-Type-Options（要件9.5）
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers['X-Content-Type-Options']).toBe('nosniff');

      // X-Frame-Options
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers['X-Frame-Options']).toBe('DENY');

      // Referrer-Policy
      expect(headers).toHaveProperty('Referrer-Policy');
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('addSecurityHeaders', () => {
    it('既存のヘッダーにセキュリティヘッダーを追加する（要件9.4, 9.5）', () => {
      const existingHeaders = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      };

      const headers = security.addSecurityHeaders(existingHeaders);

      // 既存のヘッダーが保持される
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Access-Control-Allow-Origin']).toBe('*');

      // セキュリティヘッダーが追加される
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('Referrer-Policy');
    });

    it('空のヘッダーにセキュリティヘッダーを追加する', () => {
      const headers = security.addSecurityHeaders({});

      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Content-Type-Options');
      expect(headers).toHaveProperty('X-Frame-Options');
      expect(headers).toHaveProperty('Referrer-Policy');
    });
  });
});
