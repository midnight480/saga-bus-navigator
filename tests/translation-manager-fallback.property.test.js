/**
 * TranslationManager.translate()のフォールバック翻訳プロパティテスト
 * 
 * Feature: multilingual-support, Property 4: フォールバック翻訳
 * 検証: 要件 2.3, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';

// TranslationManagerとLocaleStorageをグローバルスコープから取得
const getTranslationManager = () => {
  if (typeof window !== 'undefined' && window.TranslationManager) {
    return window.TranslationManager;
  }
  if (typeof global !== 'undefined' && global.TranslationManager) {
    return global.TranslationManager;
  }
  throw new Error('TranslationManagerが見つかりません');
};

const getLocaleStorage = () => {
  if (typeof window !== 'undefined' && window.LocaleStorage) {
    return window.LocaleStorage;
  }
  if (typeof global !== 'undefined' && global.LocaleStorage) {
    return global.LocaleStorage;
  }
  throw new Error('LocaleStorageが見つかりません');
};

describe('TranslationManager.translate() フォールバック翻訳プロパティテスト', () => {
  let TranslationManager;
  let LocaleStorage;
  let originalFetch;
  let consoleWarnSpy;

  beforeEach(async () => {
    // locale-storage.jsとtranslation-manager.jsを読み込み
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const localeStorageCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/locale-storage.js'),
      'utf-8'
    );
    const translationManagerCode = fs.readFileSync(
      path.join(__dirname, '../js/i18n/translation-manager.js'),
      'utf-8'
    );
    
    // グローバルスコープで実行
    global.window = global;
    global.localStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
    global.document = {
      dispatchEvent: vi.fn(),
      createElement: vi.fn(() => ({
        textContent: '',
        innerHTML: ''
      }))
    };
    global.CustomEvent = class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options?.detail;
      }
    };
    
    // コードを実行してクラスをグローバルスコープに登録
    eval(localeStorageCode);
    eval(translationManagerCode);
    
    // グローバルスコープからクラスを取得
    TranslationManager = global.TranslationManager;
    LocaleStorage = global.LocaleStorage;
    
    // fetchをモック化
    originalFetch = global.fetch;
    global.fetch = vi.fn();
    
    // console.warnをスパイ
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // fetchをリストア
    global.fetch = originalFetch;
    consoleWarnSpy.mockRestore();
  });

  /**
   * Arbitrary: 翻訳データを生成（一部のキーが欠けている可能性がある）
   */
  const incompleteTranslationDataArb = fc.record({
    app: fc.option(fc.record({
      title: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== '')),
      subtitle: fc.option(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''))
    })),
    search: fc.option(fc.record({
      departure_stop: fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() !== '')),
      arrival_stop: fc.option(fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() !== ''))
    })),
    error: fc.option(fc.record({
      data_load_failed: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''))
    }))
  });

  /**
   * Arbitrary: 完全な日本語翻訳データを生成（フォールバック用）
   */
  const completeJaTranslationDataArb = fc.record({
    app: fc.record({
      title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
      subtitle: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== '')
    }),
    search: fc.record({
      departure_stop: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() !== ''),
      arrival_stop: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() !== '')
    }),
    error: fc.record({
      data_load_failed: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== '')
    })
  });

  /**
   * Arbitrary: 翻訳キーを生成
   */
  const translationKeyArb = fc.oneof(
    fc.constant('app.title'),
    fc.constant('app.subtitle'),
    fc.constant('search.departure_stop'),
    fc.constant('search.arrival_stop'),
    fc.constant('error.data_load_failed')
  );

  /**
   * Arbitrary: 存在しない翻訳キーを生成
   */
  const invalidTranslationKeyArb = fc.oneof(
    fc.constant('nonexistent.key'),
    fc.constant('app.nonexistent'),
    fc.constant('invalid'),
    fc.constant('deep.nested.nonexistent.key'),
    fc.string({ minLength: 1, maxLength: 30 }).filter(s => 
      !['app.title', 'app.subtitle', 'search.departure_stop', 'search.arrival_stop', 'error.data_load_failed'].includes(s)
    )
  );

  /**
   * プロパティ4: フォールバック翻訳
   * 
   * 任意の存在しない翻訳キーに対して、フォールバック言語（日本語）のテキストまたはキー名が表示される
   * 
   * 検証: 要件 2.3, 2.5
   */
  it('プロパティ4: 任意の存在しない翻訳キーに対して、フォールバック言語のテキストまたはキー名が表示される', async () => {
    await fc.assert(
      fc.asyncProperty(
        incompleteTranslationDataArb,
        completeJaTranslationDataArb,
        translationKeyArb,
        async (incompleteEnTranslations, completeJaTranslations, translationKey) => {
          // fetchをモック化
          global.fetch.mockImplementation((url) => {
            if (url.includes('/ja.json')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(completeJaTranslations)
              });
            } else if (url.includes('/en.json')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(incompleteEnTranslations)
              });
            }
            return Promise.reject(new Error('Unknown URL'));
          });

          const manager = new TranslationManager();
          
          // 英語に設定（不完全な翻訳データ）
          await manager.setLanguage('en');
          
          // 翻訳を実行
          const result = manager.translate(translationKey);
          
          // 英語の翻訳が存在するかチェック
          const enText = manager.getNestedValue(incompleteEnTranslations, translationKey);
          const jaText = manager.getNestedValue(completeJaTranslations, translationKey);
          
          if (enText !== undefined) {
            // 英語の翻訳が存在する場合はそれが返される
            expect(result).toBe(enText);
          } else if (jaText !== undefined) {
            // 英語の翻訳が存在しない場合は日本語（フォールバック）が返される
            expect(result).toBe(jaText);
            
            // 警告が出力されることを確認
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining(`翻訳キー "${translationKey}" が en で見つからないため、ja を使用しました`)
            );
          } else {
            // どちらにも存在しない場合、または空白文字のみの場合はキー名が返される
            expect(result).toBe(translationKey);
            
            // 警告が出力されることを確認
            expect(consoleWarnSpy).toHaveBeenCalledWith(
              expect.stringContaining(`翻訳キー "${translationKey}" が見つかりません`)
            );
          }
          
          // 結果が空文字列でないことを確認
          expect(result).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ4の補足: 完全に存在しない翻訳キーの場合
   * 
   * 検証: 要件 2.5
   */
  it('プロパティ4（補足）: 任意の完全に存在しない翻訳キーに対して、キー名がそのまま返される', async () => {
    await fc.assert(
      fc.asyncProperty(
        completeJaTranslationDataArb,
        incompleteTranslationDataArb,
        invalidTranslationKeyArb,
        async (jaTranslations, enTranslations, invalidKey) => {
          // fetchをモック化
          global.fetch.mockImplementation((url) => {
            if (url.includes('/ja.json')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(jaTranslations)
              });
            } else if (url.includes('/en.json')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(enTranslations)
              });
            }
            return Promise.reject(new Error('Unknown URL'));
          });

          const manager = new TranslationManager();
          
          // 任意の言語に設定
          await manager.setLanguage('en');
          
          // 存在しない翻訳キーで翻訳を実行
          const result = manager.translate(invalidKey);
          
          // キー名がそのまま返されることを確認
          expect(result).toBe(invalidKey);
          
          // 警告が出力されることを確認
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining(`翻訳キー "${invalidKey}" が見つかりません`)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ4の補足: 翻訳ファイル読み込みエラー時のフォールバック
   * 
   * 検証: 要件 2.4
   */
  it('プロパティ4（補足）: 翻訳ファイル読み込みエラー時にフォールバック言語が使用される', async () => {
    await fc.assert(
      fc.asyncProperty(
        completeJaTranslationDataArb,
        translationKeyArb,
        async (jaTranslations, translationKey) => {
          // fetchをモック化（英語ファイルの読み込みでエラー）
          global.fetch.mockImplementation((url) => {
            if (url.includes('/ja.json')) {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(jaTranslations)
              });
            } else if (url.includes('/en.json')) {
              return Promise.resolve({
                ok: false,
                status: 404
              });
            }
            return Promise.reject(new Error('Unknown URL'));
          });

          const manager = new TranslationManager();
          
          // 英語に設定（ファイル読み込みでエラーが発生）
          await manager.setLanguage('en');
          
          // 翻訳を実行
          const result = manager.translate(translationKey);
          
          // 日本語（フォールバック）の翻訳が返されることを確認
          const expectedJaText = manager.getNestedValue(jaTranslations, translationKey);
          if (expectedJaText !== undefined) {
            expect(result).toBe(expectedJaText);
          } else {
            expect(result).toBe(translationKey);
          }
          
          // 結果が空文字列でないことを確認
          expect(result).not.toBe('');
        }
      ),
      { numRuns: 100 }
    );
  });
});