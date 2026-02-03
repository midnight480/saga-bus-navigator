/**
 * ロールバック機能のプロパティベーステスト
 * 
 * このテストは、ロールバック機能の正確性プロパティを検証します。
 * fast-checkを使用してランダムな入力で包括的にテストします。
 * 
 * Feature: cloudflare-kv-gtfs-deployment
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { formatVersion } from '../scripts/list_versions.js';

describe('ロールバック機能 - プロパティベーステスト', () => {
  describe('プロパティ12: ロールバック機能', () => {
    /**
     * **検証: 要件 5.4, 5.5, 5.6**
     * 
     * 任意のロールバックコマンド実行に対して、1世代前のバージョンが存在する場合、
     * gtfs:current_versionが1世代前のバージョン番号に更新され、
     * 次回のDataLoader初期化時から1世代前のバージョンのデータが使用される
     */
    it('ロールバック後、current_versionは常に1世代前のバージョンに更新される', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 2つのバージョン番号を生成（新しい順）
          fc.tuple(
            fc.integer({ min: 2024, max: 2100 }),
            fc.integer({ min: 1, max: 12 }),
            fc.integer({ min: 1, max: 31 }),
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
          ).map(([year, month, day, hours, minutes, seconds]) => {
            return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(seconds).padStart(2, '0')}`;
          }),
          fc.tuple(
            fc.integer({ min: 2024, max: 2100 }),
            fc.integer({ min: 1, max: 12 }),
            fc.integer({ min: 1, max: 31 }),
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
          ).map(([year, month, day, hours, minutes, seconds]) => {
            return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(seconds).padStart(2, '0')}`;
          }),
          async (version1, version2) => {
            // 異なるバージョンであることを確認
            if (version1 === version2) return;
            
            // version1が新しいバージョン、version2が古いバージョンになるようにソート
            const [currentVersion, previousVersion] = version1 > version2 
              ? [version1, version2] 
              : [version2, version1];
            
            // モックの設定
            let updatedVersion = null;
            const mockFetch = vi.fn()
              // getCurrentVersionのモック
              .mockResolvedValueOnce({
                ok: true,
                status: 200,
                text: async () => currentVersion
              })
              // listVersionsのモック（listKeysの呼び出し）
              .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                  result: [
                    { name: `gtfs:v${currentVersion}:stops` },
                    { name: `gtfs:v${previousVersion}:stops` }
                  ]
                })
              })
              // putKVのモック（current_version更新）
              .mockImplementationOnce(async (url, options) => {
                // 更新されたバージョンを記録
                updatedVersion = JSON.parse(options.body);
                return {
                  ok: true,
                  status: 200,
                  json: async () => ({ success: true })
                };
              });
            
            global.fetch = mockFetch;
            
            // ロールバックを実行
            const { rollback } = await import('../scripts/rollback.js');
            
            // console.logとconsole.errorをモック化してエラー出力を抑制
            const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
            const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            try {
              await rollback('test_account', 'test_token', 'test_namespace');
              
              // current_versionが1世代前のバージョンに更新されたことを確認
              expect(updatedVersion).toBe(previousVersion);
              
              // putKVが呼び出されたことを確認（3回目の呼び出し）
              expect(mockFetch).toHaveBeenCalledTimes(3);
              const lastCall = mockFetch.mock.calls[2];
              expect(lastCall[0]).toContain('gtfs%3Acurrent_version');
              expect(lastCall[1].method).toBe('PUT');
              expect(lastCall[1].body).toBe(JSON.stringify(previousVersion));
            } finally {
              mockConsoleLog.mockRestore();
              mockConsoleError.mockRestore();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('バージョンリストは常に降順（新しい順）にソートされる', () => {
      fc.assert(
        fc.property(
          // ランダムな数のバージョン番号を生成
          fc.array(
            fc.tuple(
              fc.integer({ min: 2024, max: 2100 }),
              fc.integer({ min: 1, max: 12 }),
              fc.integer({ min: 1, max: 31 }),
              fc.integer({ min: 0, max: 23 }),
              fc.integer({ min: 0, max: 59 }),
              fc.integer({ min: 0, max: 59 })
            ).map(([year, month, day, hours, minutes, seconds]) => {
              return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(seconds).padStart(2, '0')}`;
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (versions) => {
            // 重複を除去
            const uniqueVersions = Array.from(new Set(versions));
            
            // 降順ソート
            const sorted = uniqueVersions.sort((a, b) => b.localeCompare(a));
            
            // ソート後、各要素が前の要素より小さいか等しいことを確認
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i].localeCompare(sorted[i - 1])).toBeLessThanOrEqual(0);
            }
            
            // 最初の要素が最大値であることを確認
            const max = uniqueVersions.reduce((a, b) => a > b ? a : b);
            expect(sorted[0]).toBe(max);
            
            // 最後の要素が最小値であることを確認
            const min = uniqueVersions.reduce((a, b) => a < b ? a : b);
            expect(sorted[sorted.length - 1]).toBe(min);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('formatVersion関数のプロパティ', () => {
    it('任意の有効なバージョン番号を正しくフォーマットする', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 2024, max: 2100 }),
            fc.integer({ min: 1, max: 12 }),
            fc.integer({ min: 1, max: 31 }),
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
          ),
          ([year, month, day, hours, minutes, seconds]) => {
            const version = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(seconds).padStart(2, '0')}`;
            
            const formatted = formatVersion(version);
            
            // フォーマットが正しいことを確認
            expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
            
            // 各部分が正しいことを確認
            const parts = formatted.split(/[-: ]/);
            expect(parts[0]).toBe(String(year));
            expect(parts[1]).toBe(String(month).padStart(2, '0'));
            expect(parts[2]).toBe(String(day).padStart(2, '0'));
            expect(parts[3]).toBe(String(hours).padStart(2, '0'));
            expect(parts[4]).toBe(String(minutes).padStart(2, '0'));
            expect(parts[5]).toBe(String(seconds).padStart(2, '0'));
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('14桁でない文字列はそのまま返される', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => s.length !== 14),
          (input) => {
            const result = formatVersion(input);
            expect(result).toBe(input);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('フォーマット後の文字列から元のバージョン番号を復元できる', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 2024, max: 2100 }),
            fc.integer({ min: 1, max: 12 }),
            fc.integer({ min: 1, max: 31 }),
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
          ),
          ([year, month, day, hours, minutes, seconds]) => {
            const version = `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(seconds).padStart(2, '0')}`;
            
            const formatted = formatVersion(version);
            
            // フォーマット後の文字列から元のバージョン番号を復元
            const reconstructed = formatted.replace(/[-: ]/g, '');
            
            expect(reconstructed).toBe(version);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
