/**
 * TranslationCacheのプロパティテスト - キャッシュの利用と一意性
 * Feature: alert-enhancement, Property 4: 翻訳キャッシュの利用と一意性
 * Validates: Requirements 2.5, 4.2
 * 
 * 任意の同一テキストに対する翻訳要求において、TranslationServiceはキャッシュから結果を返し、
 * 各テキストと言語ペアの組み合わせに対して最大1つのエントリのみを保持する
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// translation-cache.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const translationCacheCode = fs.readFileSync(
  path.join(process.cwd(), 'js/translation-cache.js'),
  'utf-8'
);

// localStorageのモック
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// グローバルスコープの設定
global.localStorage = localStorageMock;
global.window = global;

// コードを評価
eval(translationCacheCode);

const TranslationCache = global.TranslationCache;

describe('TranslationCache - プロパティテスト', () => {
  let cache;

  beforeEach(() => {
    localStorageMock.clear();
    cache = new TranslationCache();
  });

  afterEach(() => {
    if (cache) {
      cache.clear();
    }
    localStorageMock.clear();
  });

  describe('Property 4: 翻訳キャッシュの利用と一意性', () => {
    /**
     * Feature: alert-enhancement, Property 4: 翻訳キャッシュの利用と一意性
     * Validates: Requirements 2.5, 4.2
     * 
     * 任意の同一テキストに対して、キャッシュに保存した翻訳結果が正しく取得できる
     */
    it('should return cached translation for the same text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (originalText, translatedText) => {
            // キャッシュに保存
            cache.set(originalText, translatedText);
            
            // 同じテキストで取得
            const result = cache.get(originalText);
            
            // 保存した翻訳結果が返されることを検証
            return result === translatedText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.2
     * 
     * 任意のテキストと言語ペアの組み合わせに対して、最大1つのエントリのみを保持する
     */
    it('should maintain only one entry per text and language pair', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
          (originalText, translations) => {
            // 同じテキストに対して複数回保存
            translations.forEach(translation => {
              cache.set(originalText, translation);
            });
            
            // キャッシュサイズが1であることを検証（同じキーなので上書きされる）
            const key = `ja:en:${originalText}`;
            let count = 0;
            cache.cache.forEach((_, k) => {
              if (k === key) count++;
            });
            
            // 最後に保存した翻訳結果が返されることを検証
            const result = cache.get(originalText);
            const lastTranslation = translations[translations.length - 1];
            
            return count === 1 && result === lastTranslation;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.5, 4.2
     * 
     * 異なる言語ペアは別々のエントリとして保持される
     */
    it('should maintain separate entries for different language pairs', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (originalText, translationJaEn, translationJaZh) => {
            // 異なる言語ペアで保存
            cache.set(originalText, translationJaEn, 'ja', 'en');
            cache.set(originalText, translationJaZh, 'ja', 'zh');
            
            // それぞれの言語ペアで取得
            const resultJaEn = cache.get(originalText, 'ja', 'en');
            const resultJaZh = cache.get(originalText, 'ja', 'zh');
            
            // 各言語ペアで正しい翻訳結果が返されることを検証
            return resultJaEn === translationJaEn && resultJaZh === translationJaZh;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.2
     * 
     * キャッシュに存在しないテキストはnullを返す
     */
    it('should return null for uncached text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (cachedText, uncachedText) => {
            // 新しいキャッシュインスタンスを作成
            localStorageMock.clear();
            const testCache = new TranslationCache();
            
            // 異なるテキストを使用
            if (cachedText === uncachedText) {
              return true; // スキップ
            }
            
            // 1つのテキストのみキャッシュに保存
            testCache.set(cachedText, 'translated');
            
            // キャッシュに存在しないテキストはnullを返す
            const result = testCache.get(uncachedText);
            
            return result === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.5
     * 
     * 同一テキストの再翻訳を避けるため、キャッシュヒット時は保存済みの結果を返す
     */
    it('should avoid re-translation by returning cached result', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.nat({ max: 10 }),
          (originalText, translatedText, accessCount) => {
            // キャッシュに保存
            cache.set(originalText, translatedText);
            
            // 複数回アクセス
            const results = [];
            for (let i = 0; i <= accessCount; i++) {
              results.push(cache.get(originalText));
            }
            
            // 全てのアクセスで同じ結果が返されることを検証
            return results.every(r => r === translatedText);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.2
     * 
     * has()メソッドがキャッシュの存在を正しく判定する
     */
    it('should correctly check cache existence with has()', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (originalText, translatedText) => {
            // 新しいキャッシュインスタンスを作成
            localStorageMock.clear();
            const testCache = new TranslationCache();
            
            // 保存前はfalse
            const beforeSet = testCache.has(originalText);
            
            // キャッシュに保存
            testCache.set(originalText, translatedText);
            
            // 保存後はtrue
            const afterSet = testCache.has(originalText);
            
            return beforeSet === false && afterSet === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 無効な入力の処理
     */
    it('should handle invalid inputs gracefully', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(''),
            fc.constant(null),
            fc.constant(undefined)
          ),
          (invalidInput) => {
            // 無効な入力でgetはnullを返す
            const getResult = cache.get(invalidInput);
            
            // 無効な入力でsetはfalseを返す
            const setResult = cache.set(invalidInput, 'translation');
            
            // 無効な入力でhasはfalseを返す
            const hasResult = cache.has(invalidInput);
            
            return getResult === null && setResult === false && hasResult === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
