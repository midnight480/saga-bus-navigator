/**
 * TranslationCacheのプロパティテスト - キャッシュサイズと有効期限の管理
 * Feature: alert-enhancement, Property 6: キャッシュサイズと有効期限の管理
 * Validates: Requirements 4.3, 4.4, 4.5
 * 
 * 任意の時点において、TranslationCacheのエントリ数は最大100個を超えず、
 * 24時間を超えた古いエントリは削除される
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    localStorageMock.clear();
    vi.useRealTimers();
  });

  describe('Property 6: キャッシュサイズと有効期限の管理', () => {
    /**
     * Feature: alert-enhancement, Property 6: キャッシュサイズと有効期限の管理
     * Validates: Requirements 4.5
     * 
     * 任意の数のエントリを追加しても、キャッシュサイズは最大100個を超えない
     */
    it('should never exceed maximum cache size of 100 entries', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 150 }),
          (entryCount) => {
            localStorageMock.clear();
            const cache = new TranslationCache(100);
            
            // 指定された数のエントリを追加
            for (let i = 0; i < entryCount; i++) {
              cache.set(`text_${i}`, `translation_${i}`);
            }
            
            // キャッシュサイズが100を超えないことを検証
            return cache.size() <= 100;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.4
     * 
     * キャッシュが満杯の場合、古いエントリが削除される
     */
    it('should evict oldest entry when cache is full', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 10 }),
          (maxSize) => {
            // 最小サイズは1
            const actualMaxSize = Math.max(1, maxSize);
            localStorageMock.clear();
            const cache = new TranslationCache(actualMaxSize);
            
            // maxSize + 1個のエントリを追加
            for (let i = 0; i <= actualMaxSize; i++) {
              cache.set(`text_${i}`, `translation_${i}`);
            }
            
            // キャッシュサイズがmaxSizeを超えないことを検証
            return cache.size() <= actualMaxSize;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.3
     * 
     * 24時間を超えた古いエントリは取得時にnullを返す
     */
    it('should return null for expired entries after 24 hours', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (originalText, translatedText) => {
            localStorageMock.clear();
            const ttl = 24 * 60 * 60 * 1000; // 24時間
            const cache = new TranslationCache(100, ttl);
            
            // エントリを追加
            cache.set(originalText, translatedText);
            
            // 追加直後は取得できる
            const beforeExpiry = cache.get(originalText);
            
            // 24時間経過
            vi.advanceTimersByTime(ttl + 1);
            
            // 期限切れ後はnullを返す
            const afterExpiry = cache.get(originalText);
            
            return beforeExpiry === translatedText && afterExpiry === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.3
     * 
     * 有効期限内のエントリは正常に取得できる
     */
    it('should return valid entries within TTL', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.nat({ max: 23 }),
          (originalText, translatedText, hoursElapsed) => {
            localStorageMock.clear();
            const ttl = 24 * 60 * 60 * 1000; // 24時間
            const cache = new TranslationCache(100, ttl);
            
            // エントリを追加
            cache.set(originalText, translatedText);
            
            // 24時間未満の時間経過
            const elapsedMs = hoursElapsed * 60 * 60 * 1000;
            vi.advanceTimersByTime(elapsedMs);
            
            // 有効期限内は取得できる
            const result = cache.get(originalText);
            
            return result === translatedText;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.3, 4.4
     * 
     * cleanup()メソッドが期限切れエントリを削除する
     */
    it('should remove expired entries on cleanup', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 20 }),
          (entryCount) => {
            localStorageMock.clear();
            const ttl = 1000; // 1秒
            const cache = new TranslationCache(100, ttl);
            
            // エントリを追加
            for (let i = 0; i < entryCount; i++) {
              cache.set(`text_${i}`, `translation_${i}`);
            }
            
            const sizeBeforeExpiry = cache.size();
            
            // TTL経過
            vi.advanceTimersByTime(ttl + 1);
            
            // クリーンアップ実行
            const removedCount = cache.cleanup();
            
            // 全てのエントリが削除されることを検証
            return removedCount === sizeBeforeExpiry && cache.size() === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.5
     * 
     * カスタムmaxSizeが正しく適用される
     */
    it('should respect custom maxSize configuration', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 50 }),
          fc.nat({ max: 100 }),
          (maxSize, entryCount) => {
            // 最小サイズは1
            const actualMaxSize = Math.max(1, maxSize);
            localStorageMock.clear();
            const cache = new TranslationCache(actualMaxSize);
            
            // 指定された数のエントリを追加
            for (let i = 0; i < entryCount; i++) {
              cache.set(`text_${i}`, `translation_${i}`);
            }
            
            // キャッシュサイズがmaxSizeを超えないことを検証
            return cache.size() <= actualMaxSize;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.3
     * 
     * has()メソッドが期限切れエントリに対してfalseを返す
     */
    it('should return false for expired entries in has()', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (originalText, translatedText) => {
            localStorageMock.clear();
            const ttl = 1000; // 1秒
            const cache = new TranslationCache(100, ttl);
            
            // エントリを追加
            cache.set(originalText, translatedText);
            
            // 追加直後はtrue
            const beforeExpiry = cache.has(originalText);
            
            // TTL経過
            vi.advanceTimersByTime(ttl + 1);
            
            // 期限切れ後はfalse
            const afterExpiry = cache.has(originalText);
            
            return beforeExpiry === true && afterExpiry === false;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.4
     * 
     * 最も古いエントリが優先的に削除される
     */
    it('should evict oldest entry first when cache is full', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 5 }),
          (maxSize) => {
            // 最小サイズは2
            const actualMaxSize = Math.max(2, maxSize);
            localStorageMock.clear();
            const cache = new TranslationCache(actualMaxSize);
            
            // maxSize個のエントリを追加（時間差をつける）
            for (let i = 0; i < actualMaxSize; i++) {
              cache.set(`text_${i}`, `translation_${i}`);
              vi.advanceTimersByTime(100); // 100ms間隔
            }
            
            // 最初のエントリが存在することを確認
            const firstExists = cache.has('text_0');
            
            // 新しいエントリを追加（キャッシュが満杯になる）
            cache.set('new_text', 'new_translation');
            
            // 最初のエントリが削除されていることを検証
            const firstExistsAfter = cache.has('text_0');
            
            // 新しいエントリが存在することを検証
            const newExists = cache.has('new_text');
            
            return firstExists === true && firstExistsAfter === false && newExists === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.3
     * 
     * getStats()が正確な統計情報を返す
     */
    it('should return accurate statistics', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 10 }),
          (entryCount) => {
            localStorageMock.clear();
            const ttl = 1000; // 1秒
            const cache = new TranslationCache(100, ttl);
            
            // エントリを追加
            for (let i = 0; i < entryCount; i++) {
              cache.set(`text_${i}`, `translation_${i}`);
            }
            
            // 統計情報を取得
            const stats = cache.getStats();
            
            // 統計情報が正確であることを検証
            return stats.totalEntries === entryCount &&
                   stats.validEntries === entryCount &&
                   stats.expiredEntries === 0 &&
                   stats.maxSize === 100 &&
                   stats.ttl === ttl;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * clear()メソッドが全てのエントリを削除する
     */
    it('should clear all entries', () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 20 }),
          (entryCount) => {
            localStorageMock.clear();
            const cache = new TranslationCache();
            
            // エントリを追加
            for (let i = 0; i < entryCount; i++) {
              cache.set(`text_${i}`, `translation_${i}`);
            }
            
            // クリア
            cache.clear();
            
            // 全てのエントリが削除されていることを検証
            return cache.size() === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
