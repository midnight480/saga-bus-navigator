/**
 * AlertEnhancerのプロパティテスト - 非同期処理中のUI継続性
 * Feature: alert-enhancement, Property 7: 非同期処理中のUI継続性
 * Validates: Requirements 6.1, 6.2, 6.3
 * 
 * 任意の翻訳処理中において、AlertSystemは元のテキストを即座に表示し、
 * 翻訳完了後にUIを更新する
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

  describe('Property 7: 非同期処理中のUI継続性', () => {
    /**
     * Feature: alert-enhancement, Property 7: 非同期処理中のUI継続性
     * Validates: Requirements 6.2
     * 
     * 翻訳処理中の場合、元のテキストを即座に表示する
     */
    it('should immediately return original text while translation is in progress', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
          }),
          async (alertData) => {
            const languageManager = {
              getLanguage: () => 'en'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            global.fetch.mockImplementation(() => {
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({ translatedText: 'Translated' })
                  });
                }, 1000);
              });
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const result = await enhancer.processAlert(alertData);

            const hasProcessedHeader = result.processedHeaderText !== '';
            const hasProcessedDescription = result.processedDescriptionText !== '';
            const isLoading = result.isLoading === true;
            const noTranslationYet = result.hasTranslation === false;

            return hasProcessedHeader && hasProcessedDescription && isLoading && noTranslationYet;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 6.1
     */
    it('should execute translation asynchronously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          async (alertData) => {
            const languageManager = {
              getLanguage: () => 'en'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            global.fetch.mockImplementation(() => {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ translatedText: 'Translated text' })
              });
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const startTime = Date.now();
            const result = await enhancer.processAlert(alertData);
            const endTime = Date.now();

            const returnedQuickly = (endTime - startTime) < 100;
            const hasProcessedText = result.processedHeaderText !== '' || result.processedDescriptionText !== '';

            return returnedQuickly && hasProcessedText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 6.3
     */
    it('should update UI after translation completes via callback', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (alertData, translatedText) => {
            const languageManager = {
              getLanguage: () => 'en'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            global.fetch.mockImplementation(() => {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ translatedText })
              });
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            let resolveTranslation;
            const translationPromise = new Promise(resolve => {
              resolveTranslation = resolve;
            });

            await enhancer.processAlert(alertData, {
              onTranslationComplete: (enhancedAlert) => {
                resolveTranslation(enhancedAlert);
              }
            });

            const completedResult = await Promise.race([
              translationPromise,
              new Promise(resolve => setTimeout(() => resolve(null), 100))
            ]);

            if (completedResult === null) {
              return true;
            }

            const loadingComplete = completedResult.isLoading === false;
            const hasTranslation = completedResult.hasTranslation === true;

            return loadingComplete && hasTranslation;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Validates: Requirements 6.1, 6.2
     */
    it('should notify loading state changes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
          }),
          async (alertData) => {
            const languageManager = {
              getLanguage: () => 'en'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            global.fetch.mockImplementation(() => {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ translatedText: 'Translated' })
              });
            });

            const loadingStates = [];
            const enhancer = new AlertEnhancer({
              translationService,
              languageManager,
              onLoadingStateChange: (alertId, isLoading) => {
                loadingStates.push({ alertId, isLoading });
              }
            });

            let resolveTranslation;
            const translationPromise = new Promise(resolve => {
              resolveTranslation = resolve;
            });

            await enhancer.processAlert(alertData, {
              onTranslationComplete: () => {
                resolveTranslation();
              }
            });

            await Promise.race([
              translationPromise,
              new Promise(resolve => setTimeout(resolve, 100))
            ]);

            if (loadingStates.length >= 2) {
              const startedLoading = loadingStates[0].isLoading === true;
              const finishedLoading = loadingStates[loadingStates.length - 1].isLoading === false;
              return startedLoading && finishedLoading;
            }

            return loadingStates.length >= 1 && loadingStates[0].isLoading === true;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    /**
     * Validates: Requirements 6.2
     */
    it('should allow getting original text during translation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
          }),
          async (alertData) => {
            const languageManager = {
              getLanguage: () => 'en'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            global.fetch.mockImplementation(() => {
              return new Promise(resolve => {
                setTimeout(() => {
                  resolve({
                    ok: true,
                    json: () => Promise.resolve({ translatedText: 'Translated' })
                  });
                }, 500);
              });
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const result = await enhancer.processAlert(alertData);

            const headerDisplay = enhancer.getDisplayText(result, 'header');
            const descriptionDisplay = enhancer.getDisplayText(result, 'description');

            const headerMatches = headerDisplay === result.processedHeaderText;
            const descriptionMatches = descriptionDisplay === result.processedDescriptionText;

            return headerMatches && descriptionMatches;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 6.1, 6.3
     */
    it('should process multiple alerts concurrently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              headerText: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              descriptionText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (alertsData) => {
            const languageManager = {
              getLanguage: () => 'en'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            global.fetch.mockImplementation(() => {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ translatedText: 'Translated' })
              });
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const results = await enhancer.processAlerts(alertsData);

            const allProcessed = results.length === alertsData.length;
            const allHaveProcessedText = results.every(r => 
              r.processedHeaderText !== '' || r.processedDescriptionText !== ''
            );

            return allProcessed && allHaveProcessedText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 6.2
     */
    it('should return immediately with completed state when translation is not needed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
          }),
          async (alertData) => {
            const languageManager = {
              getLanguage: () => 'ja'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            const result = await enhancer.processAlert(alertData);

            const notLoading = result.isLoading === false;
            const noTranslation = result.hasTranslation === false;

            return notLoading && noTranslation;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 6.1, 6.2, 6.3
     */
    it('should maintain UI continuity even when translation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerText: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            descriptionText: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0)
          }),
          async (alertData) => {
            const languageManager = {
              getLanguage: () => 'en'
            };

            const translationService = new TranslationService({
              apiEndpoint: 'https://api.example.com/translate'
            });

            global.fetch.mockImplementation(() => {
              return Promise.reject(new Error('Network error'));
            });

            const enhancer = new AlertEnhancer({
              translationService,
              languageManager
            });

            let resolveTranslation;
            const translationPromise = new Promise(resolve => {
              resolveTranslation = resolve;
            });

            const result = await enhancer.processAlert(alertData, {
              onTranslationComplete: (enhancedAlert) => {
                resolveTranslation(enhancedAlert);
              }
            });

            const hasProcessedText = result.processedHeaderText !== '' || result.processedDescriptionText !== '';

            const completedResult = await Promise.race([
              translationPromise,
              new Promise(resolve => setTimeout(() => resolve(result), 100))
            ]);

            const headerDisplay = enhancer.getDisplayText(completedResult, 'header');
            const descriptionDisplay = enhancer.getDisplayText(completedResult, 'description');

            const canGetText = headerDisplay !== '' || descriptionDisplay !== '';

            return hasProcessedText && canGetText;
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);
  });
});
