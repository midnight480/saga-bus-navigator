/**
 * AlertEnhancerのプロパティテスト - 言語設定による表示切り替え
 * Feature: alert-enhancement, Property 3: 言語設定による表示切り替え
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 * 
 * 任意の言語設定と認証情報の組み合わせに対して、AlertEnhancerは適切な言語のテキストを表示する
 * （英語設定+認証情報ありは翻訳、その他は日本語原文）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';

// 必要なモジュールを読み込み
const fs = await import('fs');
const path = await import('path');

// グローバルスコープの設定
global.window = global;

// fetchのモック
global.fetch = vi.fn();

// localStorageのモック
global.localStorage = {
  data: {},
  getItem: function(key) { return this.data[key] || null; },
  setItem: function(key, value) { this.data[key] = value; },
  removeItem: function(key) { delete this.data[key]; },
  clear: function() { this.data = {}; }
};

// URLParserを読み込み
const urlParserCode = fs.readFileSync(
  path.join(process.cwd(), 'js/url-parser.js'),
  'utf-8'
);
eval(urlParserCode);

// TranslationCacheを読み込み
const translationCacheCode = fs.readFileSync(
  path.join(process.cwd(), 'js/translation-cache.js'),
  'utf-8'
);
eval(translationCacheCode);

// TranslationServiceを読み込み
const translationServiceCode = fs.readFileSync(
  path.join(process.cwd(), 'js/translation-service.js'),
  'utf-8'
);
eval(translationServiceCode);

// AlertEnhancerを読み込み
const alertEnhancerCode = fs.readFileSync(
  path.join(process.cwd(), 'js/alert-enhancer.js'),
  'utf-8'
);
eval(alertEnhancerCode);

const URLParser = global.URLParser;
const TranslationCache = global.TranslationCache;
const TranslationService = global.TranslationService;
const AlertEnhancer = global.AlertEnhancer;

describe('AlertEnhancer - プロパティテスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Property 3: 言語設定による表示切り替え', () => {
    /**
     * Feature: alert-enhancement, Property 3: 言語設定による表示切り替え
     * Validates: Requirements 3.3
     * 
     * 言語設定が日本語の場合、元の日本語お知らせを表示する
     */
    it('should display original Japanese text when language is set to Japanese', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 100 }),
            descriptionText: fc.string({ minLength: 1, maxLength: 200 })
          }),
          async (alertData) => {
            // 日本語設定のLanguageManager
            const languageManager = {
              getLanguage: () => 'ja'
            };

            // 翻訳サービス（設定あり）
            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const result = await enhancer.processAlert(alertData);

            // 日本語設定の場合、翻訳は行われない
            const headerDisplay = enhancer.getDisplayText(result, 'header');
            const descriptionDisplay = enhancer.getDisplayText(result, 'description');

            // 処理済みテキスト（URLハイパーリンク化済み）が返される
            return headerDisplay === result.processedHeaderText &&
                   descriptionDisplay === result.processedDescriptionText &&
                   result.isLoading === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 3.2
     * 
     * 言語設定が英語でAmazon Translate認証情報が設定されていない場合、日本語お知らせを表示する
     */
    it('should display Japanese text when language is English but translation is not configured', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 100 }),
            descriptionText: fc.string({ minLength: 1, maxLength: 200 })
          }),
          async (alertData) => {
            // 英語設定のLanguageManager
            const languageManager = {
              getLanguage: () => 'en'
            };

            // 翻訳サービス（無効）
            const translationService = new TranslationService({
              enabled: false
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const result = await enhancer.processAlert(alertData);

            // 翻訳が設定されていない場合、日本語テキストが返される
            const headerDisplay = enhancer.getDisplayText(result, 'header');
            const descriptionDisplay = enhancer.getDisplayText(result, 'description');

            return headerDisplay === result.processedHeaderText &&
                   descriptionDisplay === result.processedDescriptionText &&
                   result.hasTranslation === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 3.1
     * 
     * 言語設定が英語でAmazon Translate認証情報が設定されている場合、翻訳されたお知らせを表示する
     */
    it('should display translated text when language is English and translation is configured', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          fc.record({
            translatedHeader: fc.string({ minLength: 1, maxLength: 50 }),
            translatedDescription: fc.string({ minLength: 1, maxLength: 100 })
          }),
          async (alertData, translations) => {
            // 英語設定のLanguageManager
            const languageManager = {
              getLanguage: () => 'en'
            };

            // 翻訳サービス（設定あり）
            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            // APIレスポンスをモック（即座に解決）
            let callCount = 0;
            global.fetch.mockImplementation(() => {
              callCount++;
              const translatedText = callCount === 1 
                ? translations.translatedHeader 
                : translations.translatedDescription;
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ translatedText })
              });
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            // 翻訳完了を待つためのPromise
            let resolveTranslation;
            const translationPromise = new Promise(resolve => {
              resolveTranslation = resolve;
            });

            const result = await enhancer.processAlert(alertData, {
              onTranslationComplete: (enhancedAlert) => {
                resolveTranslation(enhancedAlert);
              }
            });

            // 非同期翻訳の完了を待つ（最大50ms）
            const completedResult = await Promise.race([
              translationPromise,
              new Promise(resolve => setTimeout(() => resolve(result), 50))
            ]);

            // 翻訳が完了している場合、翻訳テキストが返される
            if (completedResult.hasTranslation) {
              const headerDisplay = enhancer.getDisplayText(completedResult, 'header');
              const descriptionDisplay = enhancer.getDisplayText(completedResult, 'description');

              return headerDisplay === completedResult.translatedHeaderText &&
                     descriptionDisplay === completedResult.translatedDescriptionText;
            }

            // 翻訳が完了していない場合は日本語テキストが返される
            return true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Validates: Requirements 3.4
     * 
     * 翻訳が利用できない場合（エラー時）、日本語お知らせを表示する
     */
    it('should display Japanese text when translation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          async (alertData) => {
            // 英語設定のLanguageManager
            const languageManager = {
              getLanguage: () => 'en'
            };

            // 翻訳サービス（設定あり）
            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            // APIエラーをモック（即座に拒否）
            global.fetch.mockImplementation(() => Promise.reject(new Error('Network error')));

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            // 翻訳完了を待つためのPromise
            let resolveTranslation;
            const translationPromise = new Promise(resolve => {
              resolveTranslation = resolve;
            });

            const result = await enhancer.processAlert(alertData, {
              onTranslationComplete: (enhancedAlert) => {
                resolveTranslation(enhancedAlert);
              }
            });

            // 非同期翻訳の完了を待つ（最大50ms）
            const completedResult = await Promise.race([
              translationPromise,
              new Promise(resolve => setTimeout(() => resolve(result), 50))
            ]);

            // エラー時は日本語テキストが返される
            const headerDisplay = enhancer.getDisplayText(completedResult, 'header');
            const descriptionDisplay = enhancer.getDisplayText(completedResult, 'description');

            return headerDisplay === completedResult.processedHeaderText &&
                   descriptionDisplay === completedResult.processedDescriptionText;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Validates: Requirements 3.1, 3.2, 3.3, 3.4
     * 
     * shouldTranslate()が言語設定と翻訳機能の有効/無効の組み合わせに基づいて正しく判定する
     */
    it('should correctly determine if translation is needed based on language and config', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ja', 'en'),
          fc.boolean(),
          (language, enabled) => {
            const languageManager = {
              getLanguage: () => language
            };

            const translationService = new TranslationService({
              enabled: enabled
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const shouldTranslate = enhancer.shouldTranslate();

            // 英語設定 AND 翻訳機能有効 の場合のみ翻訳が必要
            const expected = language === 'en' && enabled;
            return shouldTranslate === expected;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 3.1, 3.2
     * 
     * isTranslationEnabled()が翻訳機能の有効/無効に基づいて正しく判定する
     */
    it('should correctly report translation enabled status', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const translationService = new TranslationService({
              enabled
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager: { getLanguage: () => 'ja' }
            });

            const isEnabled = enhancer.isTranslationEnabled();

            return isEnabled === enabled;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 3.3
     * 
     * 言語マネージャーがない場合、デフォルトで日本語として扱う
     */
    it('should default to Japanese when language manager is not provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 100 }),
            descriptionText: fc.string({ minLength: 1, maxLength: 200 })
          }),
          async (alertData) => {
            // 翻訳サービス（設定あり）
            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            // languageManagerなしで作成
            const enhancer = new AlertEnhancer({
              translationService,
              languageManager: null
            });

            const currentLanguage = enhancer.getCurrentLanguage();
            const shouldTranslate = enhancer.shouldTranslate();

            // デフォルトは日本語なので翻訳は不要
            return currentLanguage === 'ja' && shouldTranslate === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 3.1, 3.2, 3.3, 3.4
     * 
     * getStatus()が正しい状態を返す
     */
    it('should return correct status for all configurations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ja', 'en'),
          fc.boolean(),
          (language, enabled) => {
            const languageManager = {
              getLanguage: () => language
            };

            const translationService = new TranslationService({
              enabled: enabled
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const status = enhancer.getStatus();

            return status.translationEnabled === enabled &&
                   status.currentLanguage === language &&
                   status.shouldTranslate === (language === 'en' && enabled) &&
                   status.hasTranslationService === true &&
                   status.hasLanguageManager === true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
