/**
 * TranslationManager.translate()の翻訳キー解決プロパティテスト
 * 
 * Feature: multilingual-support, Property 3: 翻訳キーの解決
 * 検証: 要件 2.2
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

describe('TranslationManager.translate() 翻訳キー解決プロパティテスト', () => {
  let TranslationManager;
  let LocaleStorage;
  let originalFetch;

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
      createElement: vi.fn(() => {
        const element = {
          textContent: '',
          innerHTML: ''
        };
        // textContentが設定されたときにinnerHTMLを更新（HTMLエスケープ）
        Object.defineProperty(element, 'textContent', {
          get() { return this._textContent || ''; },
          set(value) { 
            this._textContent = value;
            // 簡易的なHTMLエスケープ
            this.innerHTML = String(value)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          }
        });
        return element;
      })
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
  });

  afterEach(() => {
    // fetchをリストア
    global.fetch = originalFetch;
  });

  /**
   * Arbitrary: 翻訳データを生成
   */
  const translationDataArb = fc.record({
    app: fc.record({
      title: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
      subtitle: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== '')
    }),
    search: fc.record({
      departure_stop: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() !== ''),
      arrival_stop: fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim() !== ''),
      search_button: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== '')
    }),
    error: fc.record({
      data_load_failed: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim() !== ''),
      retry: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== '')
    })
  });

  /**
   * Arbitrary: 有効な翻訳キーを生成
   */
  const validTranslationKeyArb = fc.oneof(
    fc.constant('app.title'),
    fc.constant('app.subtitle'),
    fc.constant('search.departure_stop'),
    fc.constant('search.arrival_stop'),
    fc.constant('search.search_button'),
    fc.constant('error.data_load_failed'),
    fc.constant('error.retry')
  );

  /**
   * Arbitrary: 言語コードを生成
   */
  const localeArb = fc.oneof(
    fc.constant('ja'),
    fc.constant('en')
  );

  /**
   * プロパティ3: 翻訳キーの解決
   * 
   * 任意の有効な翻訳キーに対して、現在のロケールに対応する翻訳テキストが返される
   * 
   * 検証: 要件 2.2
   */
  it('プロパティ3: 任意の有効な翻訳キーに対して、現在のロケールに対応する翻訳テキストが返される', async () => {
    await fc.assert(
      fc.asyncProperty(
        translationDataArb,
        translationDataArb,
        validTranslationKeyArb,
        localeArb,
        async (jaTranslations, enTranslations, translationKey, locale) => {
          // fetchをモック化して翻訳データを返す
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
          
          // 指定された言語を設定
          await manager.setLanguage(locale);
          
          // 翻訳を実行
          const result = manager.translate(translationKey);
          
          // 期待される翻訳テキストを取得
          const expectedTranslations = locale === 'ja' ? jaTranslations : enTranslations;
          const expectedText = manager.getNestedValue(expectedTranslations, translationKey);
          
          // 結果が期待される翻訳テキストと一致することを確認
          expect(result).toBe(expectedText);
          
          // 結果が空文字列でないことを確認
          expect(result).not.toBe('');
          
          // 結果が翻訳キー自体でないことを確認（正常に翻訳された場合）
          if (expectedText !== undefined) {
            expect(result).not.toBe(translationKey);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ3の補足: パラメータ置換が正しく動作する
   * 
   * 検証: 要件 2.2
   */
  it('プロパティ3（補足）: 任意の翻訳キーとパラメータに対して、パラメータ置換が正しく動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim() !== ''),
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim() !== ''),
        async (paramName, paramValue, baseText) => {
          // パラメータプレースホルダーを含む翻訳テキスト
          const textWithPlaceholder = `${baseText} {{${paramName}}}`;
          
          const translationData = {
            test: {
              message: textWithPlaceholder
            }
          };

          // fetchをモック化
          global.fetch.mockImplementation((url) => {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(translationData)
            });
          });

          const manager = new TranslationManager();
          await manager.setLanguage('ja');
          
          // パラメータ付きで翻訳を実行
          const params = {};
          params[paramName] = paramValue;
          const result = manager.translate('test.message', params);
          
          // パラメータが正しく置換されていることを確認
          // HTMLエスケープされた値を期待値として使用
          const escapedValue = manager.escapeHtml(paramValue);
          const expectedText = `${baseText} ${escapedValue}`;
          expect(result).toBe(expectedText);
          
          // プレースホルダーが残っていないことを確認
          expect(result).not.toContain(`{{${paramName}}}`);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ3の補足: HTMLエスケープが正しく動作する
   * 
   * 検証: 要件 2.2
   */
  it('プロパティ3（補足）: 任意のHTMLを含むパラメータに対して、HTMLエスケープが正しく動作する', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim() !== ''),
        fc.oneof(
          fc.constant('<script>alert("xss")</script>'),
          fc.constant('<img src="x" onerror="alert(1)">'),
          fc.constant('&lt;test&gt;'),
          fc.constant('"quotes"'),
          fc.constant("'single'")
        ),
        async (paramName, dangerousValue) => {
          const translationData = {
            test: {
              message: `Message: {{${paramName}}}`
            }
          };

          // fetchをモック化
          global.fetch.mockImplementation((url) => {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve(translationData)
            });
          });

          const manager = new TranslationManager();
          await manager.setLanguage('ja');
          
          // 危険な値をパラメータとして渡す
          const params = {};
          params[paramName] = dangerousValue;
          const result = manager.translate('test.message', params);
          
          // HTMLタグが含まれていないことを確認（エスケープされている）
          expect(result).not.toContain('<script>');
          expect(result).not.toContain('<img');
          expect(result).not.toContain('onerror');
          
          // 結果が空でないことを確認
          expect(result.length).toBeGreaterThan(0);
          
          // "Message: "で始まることを確認
          expect(result).toMatch(/^Message: /);
        }
      ),
      { numRuns: 100 }
    );
  });
});