/**
 * KVアップロードスクリプトのプロパティベーステスト
 * 
 * このテストは、KVアップロードスクリプトの正確性プロパティを検証します。
 * fast-checkを使用してランダムな入力で包括的にテストします。
 * 
 * Feature: cloudflare-kv-gtfs-deployment
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateVersion, generateKey } from '../scripts/upload_to_kv.js';

describe('KVアップロードスクリプト - プロパティベーステスト', () => {
  describe('プロパティ4: バージョン番号の形式', () => {
    /**
     * **検証: 要件 2.1**
     * 
     * 任意のアップロード処理に対して、生成されるバージョン番号は
     * YYYYMMDDHHmmss形式（14桁の数字）である
     */
    it('生成されるバージョン番号は常にYYYYMMDDHHmmss形式（14桁の数字）である', () => {
      fc.assert(
        fc.property(
          fc.constant(null), // ダミー入力（バージョン生成は入力に依存しない）
          () => {
            const version = generateVersion();
            
            // 14桁の数字であることを確認
            expect(version).toMatch(/^\d{14}$/);
            
            // 年が妥当な範囲であることを確認（2024-2100）
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
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  describe('プロパティ5: KVへのデータ保存とキー形式', () => {
    /**
     * **検証: 要件 2.2, 2.3, 2.4**
     * 
     * 任意のGTFSテーブルデータに対して、KVに保存する場合、
     * キー形式は`gtfs:v{version}:{table_name}`または
     * `gtfs:v{version}:{table_name}_{chunk_index}`である
     */
    it('生成されるKVキーは常に正しい形式である', () => {
      fc.assert(
        fc.property(
          // ランダムなバージョン番号（YYYYMMDDHHmmss形式）
          fc.tuple(
            fc.integer({ min: 2024, max: 2100 }), // 年
            fc.integer({ min: 1, max: 12 }), // 月
            fc.integer({ min: 1, max: 31 }), // 日
            fc.integer({ min: 0, max: 23 }), // 時
            fc.integer({ min: 0, max: 59 }), // 分
            fc.integer({ min: 0, max: 59 })  // 秒
          ).map(([year, month, day, hours, minutes, seconds]) => {
            return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${String(seconds).padStart(2, '0')}`;
          }),
          // ランダムなファイル名
          fc.oneof(
            // 通常のテーブル名
            fc.constantFrom('stops.json', 'routes.json', 'trips.json', 'calendar.json', 'agency.json', 'fare_attributes.json'),
            // 分割されたstop_times
            fc.integer({ min: 0, max: 10 }).map(i => `stop_times_${i}.json`)
          ),
          (version, filename) => {
            const key = generateKey(version, filename);
            
            // キー形式が正しいことを確認
            expect(key).toMatch(/^gtfs:v\d{14}:[a-z_0-9]+$/);
            
            // バージョン番号が含まれていることを確認
            expect(key).toContain(`gtfs:v${version}:`);
            
            // テーブル名が含まれていることを確認
            const tableName = filename.replace('.json', '');
            expect(key).toContain(tableName);
            
            // キーの構造を検証
            const parts = key.split(':');
            expect(parts).toHaveLength(3);
            expect(parts[0]).toBe('gtfs');
            expect(parts[1]).toMatch(/^v\d{14}$/);
            expect(parts[2]).toMatch(/^[a-z_0-9]+$/);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('同じバージョンと異なるテーブル名から生成されるキーは一意である', () => {
      fc.assert(
        fc.property(
          // 固定のバージョン番号
          fc.constant('20250115143045'),
          // 異なる2つのファイル名
          fc.tuple(
            fc.constantFrom('stops.json', 'routes.json', 'trips.json'),
            fc.constantFrom('calendar.json', 'agency.json', 'fare_attributes.json')
          ),
          (version, [filename1, filename2]) => {
            const key1 = generateKey(version, filename1);
            const key2 = generateKey(version, filename2);
            
            // 異なるファイル名から生成されたキーは異なる
            expect(key1).not.toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('異なるバージョンと同じテーブル名から生成されるキーは異なる', () => {
      fc.assert(
        fc.property(
          // 異なる2つのバージョン番号
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
          // 固定のファイル名
          fc.constant('stops.json'),
          (version1, version2, filename) => {
            // 異なるバージョン番号の場合のみテスト
            if (version1 === version2) return;
            
            const key1 = generateKey(version1, filename);
            const key2 = generateKey(version2, filename);
            
            // 異なるバージョンから生成されたキーは異なる
            expect(key1).not.toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
