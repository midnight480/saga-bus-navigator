/**
 * ロールバック機能のユニットテスト
 * 
 * このテストは、ロールバックスクリプトとバージョン一覧スクリプトの機能をテストします。
 * 実際のCloudflare KV APIは呼び出さず、モック化してテストします。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentVersion, rollback } from '../scripts/rollback.js';
import { listVersionsCommand, formatVersion } from '../scripts/list_versions.js';

describe('ロールバック機能', () => {
  describe('getCurrentVersion', () => {
    it('現在のバージョンを取得できる', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '20250115143045'
      });
      global.fetch = mockFetch;
      
      const version = await getCurrentVersion('test_account', 'test_token', 'test_namespace');
      
      expect(version).toBe('20250115143045');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gtfs:current_version'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test_token'
          })
        })
      );
    });
    
    it('バージョンが存在しない場合はnullを返す', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      global.fetch = mockFetch;
      
      const version = await getCurrentVersion('test_account', 'test_token', 'test_namespace');
      
      expect(version).toBeNull();
    });
    
    it('APIエラーが発生した場合はエラーを投げる', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error'
      });
      global.fetch = mockFetch;
      
      await expect(
        getCurrentVersion('test_account', 'test_token', 'test_namespace')
      ).rejects.toThrow('KV GET失敗');
    });
  });
  
  describe('rollback', () => {
    let mockFetch;
    let mockListVersions;
    let mockPutKV;
    let mockExit;
    let mockConsoleLog;
    let mockConsoleError;
    
    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      
      mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });
      
      mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    });
    
    afterEach(() => {
      mockExit.mockRestore();
      mockConsoleLog.mockRestore();
      mockConsoleError.mockRestore();
    });
    
    it('1世代前のバージョンにロールバックできる', async () => {
      // getCurrentVersionのモック
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '20250115143045'
        })
        // listVersionsのモック（listKeysの呼び出し）
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            result: [
              { name: 'gtfs:v20250115143045:stops' },
              { name: 'gtfs:v20250115143045:routes' },
              { name: 'gtfs:v20250115120000:stops' },
              { name: 'gtfs:v20250115120000:routes' }
            ]
          })
        })
        // putKVのモック（current_version更新）
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        });
      
      await rollback('test_account', 'test_token', 'test_namespace');
      
      // putKVが呼び出されたことを確認
      expect(mockFetch).toHaveBeenCalledTimes(3);
      
      // 3回目の呼び出しがcurrent_versionの更新
      const lastCall = mockFetch.mock.calls[2];
      expect(lastCall[0]).toContain('gtfs%3Acurrent_version');
      expect(lastCall[1].method).toBe('PUT');
      expect(lastCall[1].body).toBe(JSON.stringify('20250115120000'));
    });
    
    it('現在のバージョンが存在しない場合はエラーで終了する', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });
      
      await expect(
        rollback('test_account', 'test_token', 'test_namespace')
      ).rejects.toThrow('現在のバージョンが見つかりません');
    });
    
    it('バージョンが1つしかない場合はエラーで終了する', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '20250115143045'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            result: [
              { name: 'gtfs:v20250115143045:stops' },
              { name: 'gtfs:v20250115143045:routes' }
            ]
          })
        });
      
      await expect(
        rollback('test_account', 'test_token', 'test_namespace')
      ).rejects.toThrow('ロールバック可能なバージョンがありません');
    });
    
    it('現在のバージョンがバージョンリストに見つからない場合はエラーで終了する', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '20250115143045'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            result: [
              { name: 'gtfs:v20250115120000:stops' },
              { name: 'gtfs:v20250115120000:routes' }
            ]
          })
        });
      
      await expect(
        rollback('test_account', 'test_token', 'test_namespace')
      ).rejects.toThrow('現在のバージョンがバージョンリストに見つかりません');
    });
  });
  
  describe('formatVersion', () => {
    it('YYYYMMDDHHmmss形式のバージョン番号をフォーマットする', () => {
      const version = '20250115143045';
      const formatted = formatVersion(version);
      
      expect(formatted).toBe('2025-01-15 14:30:45');
    });
    
    it('14桁でないバージョン番号はそのまま返す', () => {
      const version = '12345';
      const formatted = formatVersion(version);
      
      expect(formatted).toBe('12345');
    });
    
    it('異なる日時を正しくフォーマットする', () => {
      const testCases = [
        { input: '20240101000000', expected: '2024-01-01 00:00:00' },
        { input: '20251231235959', expected: '2025-12-31 23:59:59' },
        { input: '20250615120030', expected: '2025-06-15 12:00:30' }
      ];
      
      testCases.forEach(({ input, expected }) => {
        expect(formatVersion(input)).toBe(expected);
      });
    });
  });
  
  describe('listVersionsCommand', () => {
    let mockFetch;
    let mockConsoleLog;
    
    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
      mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    });
    
    afterEach(() => {
      mockConsoleLog.mockRestore();
    });
    
    it('バージョン一覧を表示できる', async () => {
      mockFetch
        // getCurrentVersionのモック
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '20250115143045'
        })
        // listVersionsのモック
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            result: [
              { name: 'gtfs:v20250115143045:stops' },
              { name: 'gtfs:v20250115143045:routes' },
              { name: 'gtfs:v20250115120000:stops' },
              { name: 'gtfs:v20250115120000:routes' }
            ]
          })
        });
      
      await listVersionsCommand('test_account', 'test_token', 'test_namespace');
      
      // バージョン一覧が表示されることを確認
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('利用可能なバージョン: 2件')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('20250115143045')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('20250115120000')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('← 現在')
      );
    });
    
    it('現在のバージョンが未設定の場合も表示できる', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            result: [
              { name: 'gtfs:v20250115120000:stops' }
            ]
          })
        });
      
      await listVersionsCommand('test_account', 'test_token', 'test_namespace');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('現在のバージョン: (未設定)')
      );
    });
    
    it('バージョンが存在しない場合はメッセージを表示する', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            result: []
          })
        });
      
      await listVersionsCommand('test_account', 'test_token', 'test_namespace');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('バージョンが見つかりません')
      );
    });
  });
});
