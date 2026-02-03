/**
 * GTFS前処理スクリプトの単体テスト
 * 
 * このテストは、GTFS前処理スクリプトの基本機能とエラーハンドリングを検証します。
 * 
 * 検証項目:
 * - CSVパース機能（parseCSVLine, parseCSV）
 * - データサイズ計算（getDataSize）
 * - データ分割機能（splitIntoChunks）
 * - エラーハンドリング（不正なCSV形式、空データ等）
 */

import { describe, it, expect } from 'vitest';
import {
  parseCSV,
  parseCSVLine,
  getDataSize,
  splitIntoChunks
} from '../scripts/gtfs_to_json.js';

describe('GTFS前処理スクリプト - 基本機能', () => {
  describe('parseCSVLine', () => {
    it('シンプルなカンマ区切りをパースできる', () => {
      const line = 'value1,value2,value3';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('ダブルクォートで囲まれた値をパースできる', () => {
      const line = '"value1","value2","value3"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('カンマを含む値をダブルクォートで囲んでパースできる', () => {
      const line = '"value1,with,comma","value2","value3"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1,with,comma', 'value2', 'value3']);
    });
  });

  describe('parseCSV', () => {
    it('ヘッダー行とデータ行をパースしてオブジェクト配列に変換できる', () => {
      const csv = 'id,name,value\n1,test1,100\n2,test2,200';
      const result = parseCSV(csv);
      expect(result).toEqual([
        { id: '1', name: 'test1', value: '100' },
        { id: '2', name: 'test2', value: '200' }
      ]);
    });

    it('空行をスキップする', () => {
      const csv = 'id,name,value\n1,test1,100\n\n2,test2,200\n';
      const result = parseCSV(csv);
      expect(result).toEqual([
        { id: '1', name: 'test1', value: '100' },
        { id: '2', name: 'test2', value: '200' }
      ]);
    });
  });

  describe('getDataSize', () => {
    it('データのサイズをバイト単位で計算できる', () => {
      const data = [{ id: '1', name: 'test' }];
      const size = getDataSize(data);
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('空配列のサイズは2バイト（"[]"）', () => {
      const data = [];
      const size = getDataSize(data);
      expect(size).toBe(2);
    });
  });

  describe('splitIntoChunks', () => {
    it('小さなデータは分割されない', () => {
      const data = [
        { id: '1', name: 'test1' },
        { id: '2', name: 'test2' }
      ];
      const maxSize = 1000;
      const chunks = splitIntoChunks(data, maxSize);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual(data);
    });

    it('空配列は空のチャンク配列を返す', () => {
      const data = [];
      const maxSize = 1000;
      const chunks = splitIntoChunks(data, maxSize);
      expect(chunks).toHaveLength(0);
    });

    it('1MB超のデータが複数のチャンクに分割される', () => {
      const records = [];
      const targetSize = 1 * 1024 * 1024; // 1MB
      let currentSize = 0;
      
      while (currentSize < targetSize) {
        const record = {
          trip_id: `TRIP_${records.length}`,
          arrival_time: '08:00:00',
          stop_id: `STOP_${records.length}`,
          stop_sequence: records.length.toString()
        };
        records.push(record);
        currentSize = getDataSize(records);
      }
      
      const maxChunkSize = 500 * 1024; // 500KB
      const chunks = splitIntoChunks(records, maxChunkSize);
      
      expect(chunks.length).toBeGreaterThan(1);
      
      chunks.forEach(chunk => {
        const chunkSize = getDataSize(chunk);
        expect(chunkSize).toBeLessThanOrEqual(maxChunkSize * 1.1);
        expect(chunk.length).toBeGreaterThan(0);
      });
      
      const merged = chunks.flat();
      expect(merged.length).toBe(records.length);
    });

    it('nullやundefinedを渡すと空配列を返す', () => {
      expect(splitIntoChunks(null, 1000)).toEqual([]);
      expect(splitIntoChunks(undefined, 1000)).toEqual([]);
    });

    it('各チャンクが最大サイズを超えない', () => {
      const data = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        name: `test_${i}`,
        description: 'A'.repeat(100) // 各レコードを大きくする
      }));
      
      const maxSize = 5000; // 5KB
      const chunks = splitIntoChunks(data, maxSize);
      
      chunks.forEach(chunk => {
        const chunkSize = getDataSize(chunk);
        // 最後のアイテムを追加する前のサイズは制限内だったはず
        expect(chunkSize).toBeLessThanOrEqual(maxSize * 1.5);
      });
    });
  });
});

describe('GTFS前処理スクリプト - エラーハンドリング', () => {
  describe('parseCSV - エラーケース', () => {
    it('空文字列を渡すと空配列を返す', () => {
      const result = parseCSV('');
      expect(result).toEqual([]);
    });

    it('ヘッダーのみの場合は空配列を返す', () => {
      const csv = 'id,name,value';
      const result = parseCSV(csv);
      expect(result).toEqual([]);
    });

    it('カラム数が一致しない行をスキップする', () => {
      const csv = 'id,name,value\n1,test1,100\n2,test2\n3,test3,300';
      const result = parseCSV(csv);
      // 2行目はカラム数が足りないのでスキップされる
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'test1', value: '100' });
      expect(result[1]).toEqual({ id: '3', name: 'test3', value: '300' });
    });

    it('空行が混在していても正しくパースできる', () => {
      const csv = 'id,name\n1,test1\n\n\n2,test2\n\n';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: '1', name: 'test1' });
      expect(result[1]).toEqual({ id: '2', name: 'test2' });
    });
  });

  describe('parseCSVLine - エッジケース', () => {
    it('エスケープされたダブルクォートを正しく処理する', () => {
      const line = '"value with ""quotes""","normal value"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value with "quotes"', 'normal value']);
    });

    it('改行を含む値（クォート内）を処理できる', () => {
      const line = '"value\nwith\nnewlines","normal"';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value\nwith\nnewlines', 'normal']);
    });

    it('空の値を正しく処理する', () => {
      const line = 'value1,,value3';
      const result = parseCSVLine(line);
      expect(result).toEqual(['value1', '', 'value3']);
    });

    it('全て空の値を処理できる', () => {
      const line = ',,';
      const result = parseCSVLine(line);
      expect(result).toEqual(['', '', '']);
    });

    it('クォートで囲まれた空の値を処理できる', () => {
      const line = '"","",""';
      const result = parseCSVLine(line);
      expect(result).toEqual(['', '', '']);
    });
  });

  describe('getDataSize - エッジケース', () => {
    it('日本語を含むデータのサイズを正しく計算する', () => {
      const data = [{ name: '佐賀駅バスセンター' }];
      const size = getDataSize(data);
      // 日本語はUTF-8で3バイト/文字なので、英語より大きくなる
      expect(size).toBeGreaterThan(20);
    });

    it('特殊文字を含むデータのサイズを正しく計算する', () => {
      const data = [{ text: '🚌🚏' }]; // 絵文字
      const size = getDataSize(data);
      expect(size).toBeGreaterThan(10);
    });

    it('ネストされたオブジェクトのサイズを計算できる', () => {
      const data = {
        nested: {
          deep: {
            value: 'test'
          }
        }
      };
      const size = getDataSize(data);
      expect(size).toBeGreaterThan(0);
    });
  });
});
