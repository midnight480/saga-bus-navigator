/**
 * お知らせ機能改善のパフォーマンステスト
 * Feature: alert-enhancement
 * Validates: Requirements 6.4 (URL解析処理を100ms以内に完了)
 * 
 * タスク7.1: パフォーマンステスト実装
 * - URL解析処理時間（100ms以内）の検証
 * - 翻訳キャッシュアクセス時間の測定
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// url-parser.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const urlParserCode = fs.readFileSync(
  path.join(process.cwd(), 'js/url-parser.js'),
  'utf-8'
);
eval(urlParserCode);

const URLParser = global.URLParser;

// translation-cache.jsを読み込み
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

global.localStorage = localStorageMock;
global.window = global;

eval(translationCacheCode);

const TranslationCache = global.TranslationCache;

describe('お知らせ機能改善 - パフォーマンステスト', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('URL解析処理時間（要件6.4: 100ms以内）', () => {
    /**
     * 短いテキストのURL解析が100ms以内に完了する
     */
    it('短いテキスト（100文字以下）のURL解析が100ms以内に完了する', () => {
      const shortText = 'お知らせ: https://example.com/info をご確認ください。';
      
      const startTime = performance.now();
      const result = URLParser.parseURLs(shortText);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(result).toContain('<a href="');
    });

    /**
     * 中程度のテキストのURL解析が100ms以内に完了する
     */
    it('中程度のテキスト（500文字程度）のURL解析が100ms以内に完了する', () => {
      // 500文字程度のテキストを生成
      const baseText = 'お知らせ内容です。詳細は https://example.com/detail をご確認ください。';
      const mediumText = baseText.repeat(10);
      
      const startTime = performance.now();
      const result = URLParser.parseURLs(mediumText);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(result).toContain('<a href="');
    });

    /**
     * 長いテキストのURL解析が100ms以内に完了する
     */
    it('長いテキスト（1000文字以上）のURL解析が100ms以内に完了する', () => {
      // 1000文字以上のテキストを生成
      const baseText = 'お知らせ: https://example.com/page1 と https://example.com/page2 をご確認ください。';
      const longText = baseText.repeat(20);
      
      const startTime = performance.now();
      const result = URLParser.parseURLs(longText);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(result).toContain('<a href="');
    });

    /**
     * 複数URLを含むテキストの解析が100ms以内に完了する
     */
    it('複数URL（10個）を含むテキストの解析が100ms以内に完了する', () => {
      // 10個のURLを含むテキストを生成
      const urls = [];
      for (let i = 0; i < 10; i++) {
        urls.push(`https://example.com/page${i}`);
      }
      const multiUrlText = urls.join(' テキスト ');
      
      const startTime = performance.now();
      const result = URLParser.parseURLs(multiUrlText);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      
      // 全てのURLがハイパーリンク化されていることを確認
      const anchorCount = (result.match(/<a href="/g) || []).length;
      expect(anchorCount).toBe(10);
    });

    /**
     * URLを含まないテキストの解析が100ms以内に完了する
     */
    it('URLを含まないテキストの解析が100ms以内に完了する', () => {
      const noUrlText = 'これはURLを含まないお知らせテキストです。'.repeat(50);
      
      const startTime = performance.now();
      const result = URLParser.parseURLs(noUrlText);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(result).not.toContain('<a href="');
    });

    /**
     * 空文字列の解析が100ms以内に完了する
     */
    it('空文字列の解析が100ms以内に完了する', () => {
      const startTime = performance.now();
      const result = URLParser.parseURLs('');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
      expect(result).toBe('');
    });

    /**
     * 連続実行時のパフォーマンス（100回実行）
     */
    it('連続100回実行の平均処理時間が100ms以内', () => {
      const testText = 'お知らせ: https://example.com/info をご確認ください。詳細は https://example.com/detail にあります。';
      const iterations = 100;
      
      const startTime = performance.now();
      for (let i = 0; i < iterations; i++) {
        URLParser.parseURLs(testText);
      }
      const endTime = performance.now();
      
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / iterations;
      
      expect(averageDuration).toBeLessThan(100);
    });
  });

  describe('翻訳キャッシュアクセス時間', () => {
    /**
     * キャッシュへの書き込みが高速に完了する
     */
    it('キャッシュへの書き込みが10ms以内に完了する', () => {
      const cache = new TranslationCache();
      const text = 'テスト用のテキストです。';
      const translation = 'This is a test text.';
      
      const startTime = performance.now();
      cache.set(text, translation);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
    });

    /**
     * キャッシュからの読み取りが高速に完了する
     */
    it('キャッシュからの読み取りが10ms以内に完了する', () => {
      const cache = new TranslationCache();
      const text = 'テスト用のテキストです。';
      const translation = 'This is a test text.';
      
      cache.set(text, translation);
      
      const startTime = performance.now();
      const result = cache.get(text);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(result).toBe(translation);
    });

    /**
     * キャッシュミス時の読み取りが高速に完了する
     */
    it('キャッシュミス時の読み取りが10ms以内に完了する', () => {
      const cache = new TranslationCache();
      
      const startTime = performance.now();
      const result = cache.get('存在しないテキスト');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(result).toBeNull();
    });

    /**
     * 100エントリのキャッシュへのアクセスが高速に完了する
     */
    it('100エントリのキャッシュへのアクセスが10ms以内に完了する', () => {
      const cache = new TranslationCache();
      
      // 100エントリを追加
      for (let i = 0; i < 100; i++) {
        cache.set(`text_${i}`, `translation_${i}`);
      }
      
      // ランダムなエントリにアクセス
      const startTime = performance.now();
      for (let i = 0; i < 100; i++) {
        cache.get(`text_${i}`);
      }
      const endTime = performance.now();
      
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / 100;
      
      expect(averageDuration).toBeLessThan(10);
    });

    /**
     * has()メソッドが高速に完了する
     */
    it('has()メソッドが10ms以内に完了する', () => {
      const cache = new TranslationCache();
      const text = 'テスト用のテキストです。';
      const translation = 'This is a test text.';
      
      cache.set(text, translation);
      
      const startTime = performance.now();
      const result = cache.has(text);
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(result).toBe(true);
    });

    /**
     * cleanup()メソッドが高速に完了する
     */
    it('cleanup()メソッドが100ms以内に完了する', () => {
      const cache = new TranslationCache(100, 1); // 1ms TTL
      
      // 100エントリを追加
      for (let i = 0; i < 100; i++) {
        cache.set(`text_${i}`, `translation_${i}`);
      }
      
      // TTL経過を待つ
      vi.useFakeTimers();
      vi.advanceTimersByTime(10);
      
      const startTime = performance.now();
      cache.cleanup();
      const endTime = performance.now();
      
      vi.useRealTimers();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100);
    });

    /**
     * getStats()メソッドが高速に完了する
     */
    it('getStats()メソッドが10ms以内に完了する', () => {
      const cache = new TranslationCache();
      
      // 50エントリを追加
      for (let i = 0; i < 50; i++) {
        cache.set(`text_${i}`, `translation_${i}`);
      }
      
      const startTime = performance.now();
      const stats = cache.getStats();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(stats.totalEntries).toBe(50);
    });

    /**
     * clear()メソッドが高速に完了する
     */
    it('clear()メソッドが10ms以内に完了する', () => {
      const cache = new TranslationCache();
      
      // 100エントリを追加
      for (let i = 0; i < 100; i++) {
        cache.set(`text_${i}`, `translation_${i}`);
      }
      
      const startTime = performance.now();
      cache.clear();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(cache.size()).toBe(0);
    });
  });

  describe('キャッシュサイズ制限時のパフォーマンス', () => {
    /**
     * キャッシュが満杯時の追加が高速に完了する
     */
    it('キャッシュが満杯時の追加が10ms以内に完了する', () => {
      const cache = new TranslationCache(100);
      
      // キャッシュを満杯にする
      for (let i = 0; i < 100; i++) {
        cache.set(`text_${i}`, `translation_${i}`);
      }
      
      // 満杯時に新しいエントリを追加
      const startTime = performance.now();
      cache.set('new_text', 'new_translation');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10);
      expect(cache.size()).toBe(100);
    });

    /**
     * 連続追加時のパフォーマンス（キャッシュサイズ超過）
     */
    it('キャッシュサイズを超える連続追加が高速に完了する', () => {
      const cache = new TranslationCache(50);
      
      const startTime = performance.now();
      // 100エントリを追加（キャッシュサイズの2倍）
      for (let i = 0; i < 100; i++) {
        cache.set(`text_${i}`, `translation_${i}`);
      }
      const endTime = performance.now();
      
      const totalDuration = endTime - startTime;
      const averageDuration = totalDuration / 100;
      
      expect(averageDuration).toBeLessThan(10);
      expect(cache.size()).toBe(50);
    });
  });
});
