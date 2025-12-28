/**
 * TranslationServiceのプロパティテスト - エラー時のフォールバック動作
 * Feature: alert-enhancement, Property 5: エラー時のフォールバック動作
 * Validates: Requirements 2.6, 5.1, 5.2, 5.4, 5.5
 * 
 * 任意の翻訳エラー（APIエラー、ネットワークエラー、タイムアウト）が発生した場合、
 * TranslationServiceは元の日本語テキストを返し、基本機能を継続する
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// translation-service.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const translationServiceCode = fs.readFileSync(
  path.join(process.cwd(), 'js/translation-service.js'),
  'utf-8'
);

// グローバルスコープの設定
global.window = global;

// fetchのモック
global.fetch = vi.fn();

// console.warnのモック
const originalConsoleWarn = console.warn;

// コードを評価
eval(translationServiceCode);

const TranslationService = global.TranslationService;
const TranslationError = global.TranslationError;

describe('TranslationService - プロパティテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.warn = originalConsoleWarn;
  });

  describe('Property 5: エラー時のフォールバック動作', () => {
    /**
     * Feature: alert-enhancement, Property 5: エラー時のフォールバック動作
     * Validates: Requirements 2.6, 5.1
     * 
     * APIエラーが発生した場合、元のテキストを返す
     */
    it('should return original text when API returns error status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 400, max: 599 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (originalText, statusCode, statusText) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            
            // APIエラーレスポンスをモック
            global.fetch.mockResolvedValueOnce({
              ok: false,
              status: statusCode,
              statusText: statusText
            });
            
            const result = await service.translateText(originalText);
            
            // エラー時は元のテキストが返される
            return result === originalText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 5.2
     * 
     * ネットワークエラーが発生した場合、元のテキストを返しエラーをログに記録
     */
    it('should return original text and log error on network failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (originalText, errorMessage) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            
            // ネットワークエラーをモック
            const networkError = new TypeError(`fetch failed: ${errorMessage}`);
            global.fetch.mockRejectedValueOnce(networkError);
            
            const result = await service.translateText(originalText);
            
            // エラー時は元のテキストが返され、エラーがログに記録される
            return result === originalText && console.warn.mock.calls.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 5.5
     * 
     * タイムアウトが発生した場合、5秒後に処理を中断し元のテキストを返す
     */
    it('should return original text after timeout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (originalText) => {
            // 短いタイムアウトでサービスを作成
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate',
              timeout: 50 // 50msのタイムアウト
            });
            
            vi.clearAllMocks();
            
            // AbortErrorを直接発生させる
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            global.fetch.mockRejectedValueOnce(abortError);
            
            const result = await service.translateText(originalText);
            
            // タイムアウト時は元のテキストが返される
            return result === originalText;
          }
        ),
        { numRuns: 100 }
      );
    }, 10000);

    /**
     * Validates: Requirements 5.4
     * 
     * 翻訳エラー時も基本のお知らせ表示機能を継続する
     */
    it('should continue basic functionality after translation error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
          async (texts) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            
            // 最初のリクエストはエラー、その後は成功
            global.fetch
              .mockRejectedValueOnce(new Error('First request failed'))
              .mockResolvedValue({
                ok: true,
                json: async () => ({ translatedText: 'translated' })
              });
            
            // 複数のテキストを翻訳
            const results = await service.translateTexts(texts);
            
            // 最初のテキストは元のまま、残りは翻訳される
            const firstIsOriginal = results[0] === texts[0];
            const restAreTranslated = results.slice(1).every(r => r === 'translated');
            
            return firstIsOriginal && restAreTranslated;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.6
     * 
     * 翻訳に失敗した場合、元の日本語テキストを返す
     */
    it('should return original Japanese text on translation failure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant({ ok: false, status: 500, statusText: 'Internal Server Error' }),
            fc.constant({ ok: false, status: 503, statusText: 'Service Unavailable' }),
            fc.constant({ ok: false, status: 429, statusText: 'Too Many Requests' })
          ),
          async (japaneseText, errorResponse) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            
            global.fetch.mockResolvedValueOnce(errorResponse);
            
            const result = await service.translateText(japaneseText, 'ja', 'en');
            
            // 失敗時は元の日本語テキストが返される
            return result === japaneseText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 5.1, 5.2
     * 
     * 様々なエラータイプに対して適切にフォールバックする
     */
    it('should fallback correctly for various error types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.oneof(
            // APIエラー
            fc.constant(() => Promise.resolve({ ok: false, status: 500, statusText: 'Error' })),
            // ネットワークエラー
            fc.constant(() => Promise.reject(new TypeError('fetch failed'))),
            // JSONパースエラー
            fc.constant(() => Promise.resolve({
              ok: true,
              json: () => Promise.reject(new Error('Invalid JSON'))
            })),
            // 不正なレスポンス形式
            fc.constant(() => Promise.resolve({
              ok: true,
              json: () => Promise.resolve({ wrongField: 'value' })
            }))
          ),
          async (originalText, errorGenerator) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            global.fetch.mockImplementationOnce(errorGenerator);
            
            const result = await service.translateText(originalText);
            
            // どのエラータイプでも元のテキストが返される
            return result === originalText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 5.3
     * 
     * 認証エラー時は翻訳機能を無効化する
     */
    it('should disable translation on authentication error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom(401, 403),
          async (originalText, authErrorStatus) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            
            // 認証エラーをモック
            global.fetch.mockResolvedValueOnce({
              ok: false,
              status: authErrorStatus,
              statusText: authErrorStatus === 401 ? 'Unauthorized' : 'Forbidden'
            });
            
            const initialConfigured = service.isConfigured();
            await service.translateText(originalText);
            const afterErrorConfigured = service.isConfigured();
            
            // 認証エラー後は翻訳機能が無効化される
            return initialConfigured === true && afterErrorConfigured === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 5.2
     * 
     * エラー情報がコンソールにログされる
     */
    it('should log error information to console', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (originalText) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            
            global.fetch.mockRejectedValueOnce(new Error('Test error'));
            
            await service.translateText(originalText);
            
            // エラーがログに記録されることを検証
            return console.warn.mock.calls.length > 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 5.4
     * 
     * エラー後も次の翻訳リクエストは正常に処理される
     */
    it('should process subsequent requests normally after error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.length > 0),
          async (firstText, secondText, translatedText) => {
            const service = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });
            
            vi.clearAllMocks();
            
            // 最初はエラー、次は成功
            global.fetch
              .mockRejectedValueOnce(new Error('First request failed'))
              .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ translatedText })
              });
            
            const firstResult = await service.translateText(firstText);
            const secondResult = await service.translateText(secondText);
            
            // 最初は元のテキスト、次は翻訳結果
            return firstResult === firstText && secondResult === translatedText;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
