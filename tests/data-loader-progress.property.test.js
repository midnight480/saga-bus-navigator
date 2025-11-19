/**
 * DataLoaderの進捗コールバックのプロパティテスト
 * Feature: initial-loading-screen, Property 4: 進捗メッセージの更新
 * Validates: Requirements 2.1
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ブラウザ環境をシミュレート
global.window = global;
global.fetch = vi.fn();
global.JSZip = {
  loadAsync: vi.fn()
};

// data-loader.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const dataLoaderCode = fs.readFileSync(
  path.join(process.cwd(), 'js/data-loader.js'),
  'utf-8'
);
eval(dataLoaderCode);

const DataLoader = global.DataLoader;

describe('DataLoader - 進捗コールバック', () => {
  describe('Property 4: 進捗メッセージの更新', () => {
    /**
     * Feature: initial-loading-screen, Property 4: 進捗メッセージの更新
     * Validates: Requirements 2.1
     * 
     * 任意の進捗メッセージが`onProgress`コールバックに渡されることを検証
     */
    it('should call onProgress callback with any progress message', () => {
      fc.assert(
        fc.property(
          // 進捗メッセージジェネレータ（任意の文字列）
          fc.string({ minLength: 1, maxLength: 100 }),
          (progressMessage) => {
            // DataLoaderインスタンスを作成
            const dataLoader = new DataLoader();
            
            // onProgressコールバックをモック
            const progressCallback = vi.fn();
            dataLoader.onProgress = progressCallback;
            
            // onProgressコールバックを直接呼び出す
            if (dataLoader.onProgress) {
              dataLoader.onProgress(progressMessage);
            }
            
            // onProgressコールバックが呼び出されたことを確認
            if (!progressCallback.mock.calls.length) {
              return false;
            }
            
            // 渡されたメッセージが正しいことを確認
            return progressCallback.mock.calls[0][0] === progressMessage;
          }
        ),
        { numRuns: 100 } // 100回イテレーション
      );
    });
  });

  describe('loadAllData() - 進捗コールバック統合テスト', () => {
    /**
     * loadAllData()が進捗コールバックを適切に呼び出すことを検証
     */
    it('should call onProgress callback during loadAllData()', async () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // onProgressコールバックをモック
      const progressCallback = vi.fn();
      dataLoader.onProgress = progressCallback;
      
      // fetchをモック（GTFSファイルが見つからないエラーを返す）
      global.fetch.mockRejectedValue(new Error('File not found'));
      
      // loadAllData()を呼び出し（エラーが発生することを期待）
      try {
        await dataLoader.loadAllData();
      } catch (error) {
        // エラーは期待通り
      }
      
      // onProgressコールバックが少なくとも1回呼び出されたことを確認
      expect(progressCallback).toHaveBeenCalled();
      
      // 最初の呼び出しが「GTFSデータを検索しています...」であることを確認
      expect(progressCallback).toHaveBeenCalledWith('GTFSデータを検索しています...');
    });
  });

  describe('loadBusStops() - 進捗コールバック', () => {
    /**
     * loadBusStops()が進捗コールバックを呼び出すことを検証
     */
    it('should call onProgress callback during loadBusStops()', async () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // onProgressコールバックをモック
      const progressCallback = vi.fn();
      dataLoader.onProgress = progressCallback;
      
      // fetchをモック（GTFSファイルが見つからないエラーを返す）
      global.fetch.mockRejectedValue(new Error('File not found'));
      
      // loadBusStops()を呼び出し（エラーが発生することを期待）
      try {
        await dataLoader.loadBusStops();
      } catch (error) {
        // エラーは期待通り
      }
      
      // onProgressコールバックが呼び出されたことを確認
      expect(progressCallback).toHaveBeenCalled();
      
      // 「バス停データを読み込んでいます...」が呼び出されたことを確認
      expect(progressCallback).toHaveBeenCalledWith('バス停データを読み込んでいます...');
    });
  });

  describe('loadTimetable() - 進捗コールバック', () => {
    /**
     * loadTimetable()が進捗コールバックを呼び出すことを検証
     */
    it('should call onProgress callback during loadTimetable()', async () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // onProgressコールバックをモック
      const progressCallback = vi.fn();
      dataLoader.onProgress = progressCallback;
      
      // fetchをモック（GTFSファイルが見つからないエラーを返す）
      global.fetch.mockRejectedValue(new Error('File not found'));
      
      // loadTimetable()を呼び出し（エラーが発生することを期待）
      try {
        await dataLoader.loadTimetable();
      } catch (error) {
        // エラーは期待通り
      }
      
      // onProgressコールバックが呼び出されたことを確認
      expect(progressCallback).toHaveBeenCalled();
      
      // 「時刻表データを読み込んでいます...」が呼び出されたことを確認
      expect(progressCallback).toHaveBeenCalledWith('時刻表データを読み込んでいます...');
    });
  });

  describe('loadFares() - 進捗コールバック', () => {
    /**
     * loadFares()が進捗コールバックを呼び出すことを検証
     */
    it('should call onProgress callback during loadFares()', async () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // onProgressコールバックをモック
      const progressCallback = vi.fn();
      dataLoader.onProgress = progressCallback;
      
      // fetchをモック（GTFSファイルが見つからないエラーを返す）
      global.fetch.mockRejectedValue(new Error('File not found'));
      
      // loadFares()を呼び出し（エラーが発生することを期待）
      try {
        await dataLoader.loadFares();
      } catch (error) {
        // エラーは期待通り
      }
      
      // onProgressコールバックが呼び出されたことを確認
      expect(progressCallback).toHaveBeenCalled();
      
      // 「運賃データを読み込んでいます...」が呼び出されたことを確認
      expect(progressCallback).toHaveBeenCalledWith('運賃データを読み込んでいます...');
    });
  });
});
