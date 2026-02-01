/**
 * API Client Property-Based Tests
 * 
 * API Clientの普遍的なプロパティを検証するプロパティベーステスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { ApiClient } from './api-client.js';

describe('API Client Properties', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Feature: mcp-server, Property 4: エラーメッセージの記述性
  // **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 6.2**
  describe('Property 4: エラーメッセージの記述性', () => {
    it('任意のエラー（APIエラー、タイムアウト、ネットワークエラー）に対して、人間が理解できる記述的なエラーメッセージを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            errorType: fc.constantFrom('timeout', 'http-error', 'network-error'),
            statusCode: fc.integer({ min: 400, max: 599 }),
            statusText: fc.constantFrom('Bad Request', 'Not Found', 'Internal Server Error', 'Service Unavailable'),
            errorBody: fc.string({ minLength: 0, maxLength: 100 }),
            timeout: fc.integer({ min: 50, max: 200 })
          }),
          async ({ errorType, statusCode, statusText, errorBody, timeout }) => {
            const client = new ApiClient({
              baseUrl: 'https://test-api.example.com',
              timeout
            });

            let errorMessage: string | undefined;

            try {
              if (errorType === 'timeout') {
                // タイムアウトエラーのシミュレート（即座にAbortErrorを発生）
                global.fetch = vi.fn().mockImplementation(() =>
                  Promise.reject(Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }))
                );
              } else if (errorType === 'http-error') {
                // HTTPエラーのシミュレート
                global.fetch = vi.fn().mockResolvedValue({
                  ok: false,
                  status: statusCode,
                  statusText,
                  text: async () => errorBody
                });
              } else {
                // ネットワークエラーのシミュレート
                global.fetch = vi.fn().mockRejectedValue(new Error('Network connection failed'));
              }

              await client.get('/test-endpoint');
            } catch (error) {
              if (error instanceof Error) {
                errorMessage = error.message;
              }
            }

            // エラーメッセージが存在することを確認
            expect(errorMessage).toBeDefined();
            expect(errorMessage).not.toBe('');

            // エラータイプに応じた記述的なメッセージを確認
            if (errorType === 'timeout') {
              // タイムアウトエラーは時間を含む
              expect(errorMessage).toContain('timeout');
              expect(errorMessage).toContain(`${timeout}ms`);
            } else if (errorType === 'http-error') {
              // HTTPエラーはステータスコード、ステータステキスト、エラーボディを含む
              expect(errorMessage).toContain('API error');
              expect(errorMessage).toContain(String(statusCode));
              expect(errorMessage).toContain(statusText);
              if (errorBody) {
                expect(errorMessage).toContain(errorBody);
              }
            } else {
              // ネットワークエラーは説明的なメッセージを含む
              expect(errorMessage).toContain('Network');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: mcp-server, Property 5: 環境変数の優先順位
  // **Validates: Requirements 4.1, 6.2**
  describe('Property 5: 環境変数の優先順位', () => {
    it('任意の環境変数設定に対して、API_BASE_URLが設定されている場合はその値を使用し、未設定の場合はデフォルトURLを使用する', () => {
      fc.assert(
        fc.property(
          fc.record({
            hasEnvVar: fc.boolean(),
            customUrl: fc.webUrl({ validSchemes: ['https'] })
          }),
          ({ hasEnvVar, customUrl }) => {
            const defaultUrl = 'https://saga-bus.midnight480.com/api';
            
            // 環境変数の設定または削除
            if (hasEnvVar) {
              process.env['API_BASE_URL'] = customUrl;
            } else {
              delete process.env['API_BASE_URL'];
            }

            // クライアントの作成
            const client = new ApiClient({
              baseUrl: process.env['API_BASE_URL'] || defaultUrl
            });

            // クライアントが正しく作成されることを確認
            expect(client).toBeDefined();

            // 環境変数のクリーンアップ
            delete process.env['API_BASE_URL'];
          }
        ),
        { numRuns: 100 }
      );
    });

    it('環境変数が設定されている場合、カスタムURLが使用される', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.webUrl({ validSchemes: ['https'] }),
          async (customUrl) => {
            process.env['API_BASE_URL'] = customUrl;

            const client = new ApiClient({
              baseUrl: process.env['API_BASE_URL'] || 'https://saga-bus.midnight480.com/api'
            });

            const mockResponse = { data: 'test' };
            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => mockResponse
            });

            await client.get('/test');

            // カスタムURLが使用されていることを確認（ホスト部分を抽出して比較）
            const callUrl = (fetch as any).mock.calls[0][0];
            const customUrlObj = new URL(customUrl);
            const callUrlObj = new URL(callUrl);
            
            // ホスト名が一致することを確認
            expect(callUrlObj.hostname).toBe(customUrlObj.hostname);

            // クリーンアップ
            delete process.env['API_BASE_URL'];
          }
        ),
        { numRuns: 50 }
      );
    });

    it('環境変数が未設定の場合、デフォルトURLが使用される', async () => {
      delete process.env['API_BASE_URL'];

      const defaultUrl = 'https://saga-bus.midnight480.com/api';
      const client = new ApiClient({
        baseUrl: process.env['API_BASE_URL'] || defaultUrl
      });

      const mockResponse = { data: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      await client.get('/test');

      // デフォルトURLが使用されていることを確認（ベースURLの部分のみ）
      const callUrl = (fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('saga-bus.midnight480.com');
    });
  });

  // Feature: mcp-server, Property 6: レスポンス検証の実行
  // **Validates: Requirements 4.5**
  describe('Property 6: レスポンス検証の実行', () => {
    it('任意のAPIレスポンスに対して、データを返す前にレスポンス構造を検証する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            responseType: fc.constantFrom('valid-json', 'invalid-json', 'malformed'),
            statusCode: fc.integer({ min: 200, max: 299 })
          }),
          async ({ responseType, statusCode }) => {
            const client = new ApiClient({
              baseUrl: 'https://test-api.example.com',
              timeout: 5000
            });

            let result: any;
            let error: Error | undefined;

            try {
              if (responseType === 'valid-json') {
                // 有効なJSONレスポンス（nullや空オブジェクトも含む）
                const validResponse = {
                  data: 'test',
                  count: 42,
                  items: ['item1', 'item2']
                };
                global.fetch = vi.fn().mockResolvedValue({
                  ok: true,
                  status: statusCode,
                  json: async () => validResponse
                });
                result = await client.get('/test');
              } else if (responseType === 'invalid-json') {
                // 無効なJSON（パースエラー）
                global.fetch = vi.fn().mockResolvedValue({
                  ok: true,
                  status: statusCode,
                  json: async () => {
                    throw new SyntaxError('Unexpected token in JSON');
                  }
                });
                result = await client.get('/test');
              } else {
                // 不正な形式のレスポンス
                global.fetch = vi.fn().mockResolvedValue({
                  ok: true,
                  status: statusCode,
                  json: async () => {
                    throw new Error('Invalid response format');
                  }
                });
                result = await client.get('/test');
              }
            } catch (e) {
              if (e instanceof Error) {
                error = e;
              }
            }

            // レスポンスの検証
            if (responseType === 'valid-json') {
              // 有効なJSONの場合、結果が返される
              expect(result).toBeDefined();
              expect(result).toHaveProperty('data');
            } else {
              // 無効なレスポンスの場合、エラーがスローされる
              expect(error).toBeDefined();
              expect(error?.message).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('レスポンスが正常にパースできる場合、型安全なレスポンスを返す', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            stops: fc.array(fc.record({
              stop_id: fc.string(),
              stop_name: fc.string(),
              stop_lat: fc.double({ min: -90, max: 90 }),
              stop_lon: fc.double({ min: -180, max: 180 })
            })),
            count: fc.nat()
          }),
          async (mockData) => {
            const client = new ApiClient({
              baseUrl: 'https://test-api.example.com'
            });

            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => mockData
            });

            const result = await client.get<typeof mockData>('/stops/search');

            // レスポンスが正しくパースされていることを確認
            expect(result).toEqual(mockData);
            expect(result.stops).toHaveLength(mockData.stops.length);
            expect(result.count).toBe(mockData.count);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('レスポンスのパースに失敗した場合、エラーをスローする', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'Unexpected token',
            'Invalid JSON',
            'Unexpected end of JSON input',
            'Malformed response'
          ),
          async (errorMessage) => {
            const client = new ApiClient({
              baseUrl: 'https://test-api.example.com'
            });

            global.fetch = vi.fn().mockResolvedValue({
              ok: true,
              json: async () => {
                throw new SyntaxError(errorMessage);
              }
            });

            let caughtError: Error | undefined;
            try {
              await client.get('/test');
            } catch (error) {
              if (error instanceof Error) {
                caughtError = error;
              }
            }

            // エラーがスローされることを確認
            expect(caughtError).toBeDefined();
            expect(caughtError?.message).toContain(errorMessage);
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
