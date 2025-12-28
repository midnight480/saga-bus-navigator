/**
 * TranslationServiceのプロパティテスト - 翻訳機能の認証情報依存制御
 * Feature: alert-enhancement, Property 2: 翻訳機能の認証情報依存制御
 * Validates: Requirements 2.2, 3.2
 * 
 * 任意のシステム状態において、翻訳機能が有効な場合のみ翻訳が実行され、
 * 無効な場合は日本語テキストが表示される
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

// コードを評価
eval(translationServiceCode);

const TranslationService = global.TranslationService;
const TranslationError = global.TranslationError;

describe('TranslationService - プロパティテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 2: 翻訳機能の認証情報依存制御', () => {
    /**
     * Feature: alert-enhancement, Property 2: 翻訳機能の認証情報依存制御
     * Validates: Requirements 2.2, 3.2
     * 
     * enabled: falseの場合、翻訳機能は無効化される
     */
    it('should disable translation when enabled is false', () => {
      fc.assert(
        fc.property(
          fc.constant(false),
          (enabled) => {
            const service = new TranslationService({
              enabled: enabled
            });
            
            // 翻訳機能が無効であることを検証
            return service.isConfigured() === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.2
     * 
     * デフォルト設定では翻訳機能は有効化される
     */
    it('should enable translation by default', () => {
      fc.assert(
        fc.property(
          fc.constant({}),
          () => {
            const service = new TranslationService();
            
            // デフォルトで翻訳機能が有効であることを検証
            return service.isConfigured() === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 3.2
     * 
     * 翻訳機能が無効な場合、元の日本語テキストがそのまま返される
     */
    it('should return original Japanese text when translation is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 200 }),
          async (japaneseText) => {
            const service = new TranslationService({
              enabled: false
            });
            
            // 翻訳を試みる
            const result = await service.translateText(japaneseText);
            
            // 元のテキストがそのまま返されることを検証
            return result === japaneseText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.2, 3.2
     * 
     * 設定を動的に更新した場合、翻訳機能の有効/無効が正しく切り替わる
     */
    it('should correctly toggle translation based on config updates', () => {
      fc.assert(
        fc.property(
          fc.webUrl(),
          (customEndpoint) => {
            // 最初は無効な設定で作成
            const service = new TranslationService({
              enabled: false
            });
            
            const initialState = service.isConfigured();
            
            // 有効な設定に更新
            service.updateConfig({ enabled: true });
            const afterEnable = service.isConfigured();
            
            // 無効な設定に戻す
            service.updateConfig({ enabled: false });
            const afterDisable = service.isConfigured();
            
            return initialState === false && 
                   afterEnable === true && 
                   afterDisable === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.2
     * 
     * getStatus()が正しい設定状態を返す
     */
    it('should return correct status based on configuration', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant({ enabled: false }),
            fc.constant({ enabled: true }),
            fc.record({
              enabled: fc.boolean(),
              apiEndpoint: fc.option(fc.webUrl(), { nil: undefined }),
              timeout: fc.option(fc.integer({ min: 1000, max: 30000 }), { nil: undefined })
            })
          ),
          (config) => {
            const service = new TranslationService(config);
            const status = service.getStatus();
            
            const expectedEnabled = config.enabled !== false;
            const expectedConfigured = expectedEnabled && !status.authFailed;
            
            return status.enabled === expectedEnabled &&
                   status.configured === expectedConfigured &&
                   typeof status.apiEndpoint === 'string' &&
                   typeof status.timeout === 'number';
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.2, 3.2
     * 
     * 空白のみのテキストは翻訳せずにそのまま返す
     */
    it('should return whitespace-only text without translation attempt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
            .map(arr => arr.join('')),
          async (whitespaceText) => {
            const service = new TranslationService();
            
            // fetchが呼ばれないことを確認するためにモックをリセット
            vi.clearAllMocks();
            
            const result = await service.translateText(whitespaceText);
            
            // 空白テキストはそのまま返され、APIは呼ばれない
            return result === whitespaceText && global.fetch.mock.calls.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.2
     * 
     * 同じ言語への翻訳は不要なのでそのまま返す
     */
    it('should return original text when source and target languages are the same', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.constantFrom('ja', 'en', 'zh', 'ko'),
          async (text, language) => {
            const service = new TranslationService();
            
            vi.clearAllMocks();
            
            const result = await service.translateText(text, language, language);
            
            // 同じ言語への翻訳はAPIを呼ばずにそのまま返す
            return result === text && global.fetch.mock.calls.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.2
     * 
     * 無効な入力（null, undefined, 空文字列）は適切に処理される
     */
    it('should handle invalid inputs gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(null),
            fc.constant(undefined),
            fc.constant('')
          ),
          async (invalidInput) => {
            const service = new TranslationService();
            
            vi.clearAllMocks();
            
            const result = await service.translateText(invalidInput);
            
            // 無効な入力はそのまま返され、APIは呼ばれない
            const expectedResult = invalidInput || '';
            return result === expectedResult && global.fetch.mock.calls.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.2, 3.2
     * 
     * 翻訳機能が有効な場合、APIが呼び出される
     */
    it('should call API when translation is enabled and text is valid', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.length > 0),
          async (originalText, translatedText) => {
            const service = new TranslationService();
            
            // モックをリセット
            vi.clearAllMocks();
            
            // APIレスポンスをモック
            global.fetch.mockResolvedValueOnce({
              ok: true,
              json: async () => ({ translatedText })
            });
            
            const result = await service.translateText(originalText);
            
            // APIが呼ばれ、翻訳結果が返されることを検証
            return global.fetch.mock.calls.length === 1 && result === translatedText;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
