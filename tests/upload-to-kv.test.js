/**
 * KVアップロードスクリプトのユニットテスト
 * 
 * このテストは、KVアップロードスクリプトの各機能をテストします。
 * 実際のCloudflare KV APIは呼び出さず、モック化してテストします。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateVersion,
  generateKey,
  retryWithBackoff,
  validateEnvironment
} from '../scripts/upload_to_kv.js';

describe('KVアップロードスクリプト', () => {
  describe('generateVersion', () => {
    it('YYYYMMDDHHmmss形式のバージョン番号を生成する', () => {
      const version = generateVersion();
      
      // 14桁の数字であることを確認
      expect(version).toMatch(/^\d{14}$/);
      
      // 年が妥当な範囲であることを確認
      const year = parseInt(version.substring(0, 4));
      expect(year).toBeGreaterThanOrEqual(2024);
      expect(year).toBeLessThanOrEqual(2100);
      
      // 月が1-12の範囲であることを確認
      const month = parseInt(version.substring(4, 6));
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      
      // 日が1-31の範囲であることを確認
      const day = parseInt(version.substring(6, 8));
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
      
      // 時が0-23の範囲であることを確認
      const hours = parseInt(version.substring(8, 10));
      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThanOrEqual(23);
      
      // 分が0-59の範囲であることを確認
      const minutes = parseInt(version.substring(10, 12));
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(59);
      
      // 秒が0-59の範囲であることを確認
      const seconds = parseInt(version.substring(12, 14));
      expect(seconds).toBeGreaterThanOrEqual(0);
      expect(seconds).toBeLessThanOrEqual(59);
    });
    
    it('連続して呼び出すと異なるバージョン番号を生成する（秒単位で変わる場合）', async () => {
      const version1 = generateVersion();
      
      // 1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const version2 = generateVersion();
      
      // 異なるバージョン番号が生成されることを確認
      expect(version2).not.toBe(version1);
      // 文字列として辞書順で比較（YYYYMMDDHHmmss形式なので辞書順=時系列順）
      expect(version2.localeCompare(version1)).toBeGreaterThan(0);
    });
  });
  
  describe('generateKey', () => {
    it('通常のファイル名からKVキーを生成する', () => {
      const version = '20250115143045';
      const filename = 'stops.json';
      
      const key = generateKey(version, filename);
      
      expect(key).toBe('gtfs:v20250115143045:stops');
    });
    
    it('分割されたファイル名からKVキーを生成する', () => {
      const version = '20250115143045';
      const filename = 'stop_times_0.json';
      
      const key = generateKey(version, filename);
      
      expect(key).toBe('gtfs:v20250115143045:stop_times_0');
    });
    
    it('複数のアンダースコアを含むファイル名を正しく処理する', () => {
      const version = '20250115143045';
      const filename = 'fare_attributes.json';
      
      const key = generateKey(version, filename);
      
      expect(key).toBe('gtfs:v20250115143045:fare_attributes');
    });
  });
  
  describe('retryWithBackoff', () => {
    it('成功する関数は1回で完了する', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, 5, 100);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    it('レート制限エラー（429）の場合はリトライする', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValue('success');
      
      const result = await retryWithBackoff(fn, 5, 10);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
    
    it('最大リトライ回数に達したらエラーを投げる', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('429 Too Many Requests'));
      
      await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow('最大リトライ回数');
      expect(fn).toHaveBeenCalledTimes(3);
    });
    
    it('レート制限以外のエラーは即座に投げる', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Network error'));
      
      await expect(retryWithBackoff(fn, 5, 10)).rejects.toThrow('Network error');
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    it('指数バックオフで遅延時間が増加する', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValue('success');
      
      const startTime = Date.now();
      await retryWithBackoff(fn, 5, 10);
      const endTime = Date.now();
      
      // 最低でも10ms + 20ms = 30msかかるはず
      expect(endTime - startTime).toBeGreaterThanOrEqual(30);
    });
  });
  
  describe('KV保存エラーハンドリング', () => {
    it('API認証エラーが発生した場合はエラーを投げる', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API token'
      });
      global.fetch = mockFetch;
      
      const { putKV } = await import('../scripts/upload_to_kv.js');
      
      await expect(
        putKV('test_account', 'invalid_token', 'test_namespace', 'test_key', { data: 'test' })
      ).rejects.toThrow('KV PUT失敗');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    it('ネットワークエラーが発生した場合はエラーを投げる', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      global.fetch = mockFetch;
      
      const { putKV } = await import('../scripts/upload_to_kv.js');
      
      await expect(
        putKV('test_account', 'test_token', 'test_namespace', 'test_key', { data: 'test' })
      ).rejects.toThrow('Network error');
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    
    it('レート制限エラー（429）が発生した場合はリトライ後にエラーを投げる', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      });
      global.fetch = mockFetch;
      
      const { putKV } = await import('../scripts/upload_to_kv.js');
      
      // retryWithBackoffを使用してリトライする
      const { retryWithBackoff } = await import('../scripts/upload_to_kv.js');
      
      await expect(
        retryWithBackoff(
          () => putKV('test_account', 'test_token', 'test_namespace', 'test_key', { data: 'test' }),
          3,
          10
        )
      ).rejects.toThrow();
      
      // 3回リトライされることを確認
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });
  
  describe('validateEnvironment', () => {
    let originalEnv;
    
    beforeEach(() => {
      // 元の環境変数を保存
      originalEnv = { ...process.env };
    });
    
    afterEach(() => {
      // 環境変数を復元
      process.env = originalEnv;
    });
    
    it('全ての環境変数が設定されている場合は成功する', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test_account_id';
      process.env.CLOUDFLARE_API_TOKEN = 'test_api_token';
      process.env.KV_NAMESPACE_ID = 'test_namespace_id';
      
      const result = validateEnvironment();
      
      expect(result).toEqual({
        accountId: 'test_account_id',
        apiToken: 'test_api_token',
        namespaceId: 'test_namespace_id'
      });
    });
    
    it('CLOUDFLARE_ACCOUNT_IDが未設定の場合はエラーで終了する', () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      process.env.CLOUDFLARE_API_TOKEN = 'test_api_token';
      process.env.KV_NAMESPACE_ID = 'test_namespace_id';
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      expect(() => validateEnvironment()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
    
    it('CLOUDFLARE_API_TOKENが未設定の場合はエラーで終了する', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test_account_id';
      delete process.env.CLOUDFLARE_API_TOKEN;
      process.env.KV_NAMESPACE_ID = 'test_namespace_id';
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      expect(() => validateEnvironment()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
    
    it('KV_NAMESPACE_IDが未設定の場合はエラーで終了する', () => {
      process.env.CLOUDFLARE_ACCOUNT_ID = 'test_account_id';
      process.env.CLOUDFLARE_API_TOKEN = 'test_api_token';
      delete process.env.KV_NAMESPACE_ID;
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      expect(() => validateEnvironment()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
    
    it('全ての環境変数が未設定の場合はエラーで終了する', () => {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
      delete process.env.CLOUDFLARE_API_TOKEN;
      delete process.env.KV_NAMESPACE_ID;
      
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      expect(() => validateEnvironment()).toThrow('process.exit called');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });
});
