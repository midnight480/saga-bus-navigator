/**
 * データローダーの単体テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// DataLoaderクラスをインポート
// ブラウザ環境をシミュレートするため、グローバルオブジェクトに追加
import '../js/data-loader.js';

describe('DataLoader', () => {
  let dataLoader;

  beforeEach(() => {
    // 各テストの前に新しいインスタンスを作成
    dataLoader = new window.DataLoader();
  });

  describe('parseCSVLine', () => {
    it('シンプルなカンマ区切りをパースできる', () => {
      const line = 'value1,value2,value3';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('ダブルクォートで囲まれた値をパースできる', () => {
      const line = '"value1","value2","value3"';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('カンマを含む値をダブルクォートで囲んでパースできる', () => {
      const line = '"value1,with,comma","value2","value3"';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1,with,comma', 'value2', 'value3']);
    });

    it('エスケープされたダブルクォートをパースできる', () => {
      const line = '"value""with""quotes","value2"';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value"with"quotes', 'value2']);
    });

    it('空の値をパースできる', () => {
      const line = 'value1,,value3';
      const result = dataLoader.parseCSVLine(line);
      expect(result).toEqual(['value1', '', 'value3']);
    });
  });

  describe('parseCSV', () => {
    it('正常なCSVをパースできる', () => {
      const csvText = `name,age,city
Alice,30,Tokyo
Bob,25,Osaka`;
      
      const result = dataLoader.parseCSV(csvText);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: '30', city: 'Tokyo' });
      expect(result[1]).toEqual({ name: 'Bob', age: '25', city: 'Osaka' });
    });

    it('空行をスキップする', () => {
      const csvText = `name,age,city
Alice,30,Tokyo

Bob,25,Osaka`;
      
      const result = dataLoader.parseCSV(csvText);
      
      expect(result).toHaveLength(2);
    });

    it('ヘッダーのみのCSVは空配列を返す', () => {
      const csvText = 'name,age,city';
      
      const result = dataLoader.parseCSV(csvText);
      
      // ヘッダーのみでデータ行がない場合は空配列
      expect(result).toHaveLength(0);
    });

    it('カラム数が一致しない行を警告してスキップする', () => {
      const csvText = `name,age,city
Alice,30,Tokyo
Bob,25
Charlie,35,Fukuoka`;
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = dataLoader.parseCSV(csvText);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Alice', age: '30', city: 'Tokyo' });
      expect(result[1]).toEqual({ name: 'Charlie', age: '35', city: 'Fukuoka' });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('loadBusStops', () => {
    it('バス停データを正しくパースする', async () => {
      const mockCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008
SAGA-002,県庁前,33.2495,130.3005`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      const result = await dataLoader.loadBusStops();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'SAGA-001',
        name: '佐賀駅バスセンター',
        lat: 33.2649,
        lng: 130.3008
      });
      expect(result[1]).toEqual({
        id: 'SAGA-002',
        name: '県庁前',
        lat: 33.2495,
        lng: 130.3005
      });
    });

    it('キャッシュされたデータを返す', async () => {
      const mockCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      // 1回目の呼び出し
      await dataLoader.loadBusStops();
      
      // 2回目の呼び出し
      await dataLoader.loadBusStops();

      // fetchは1回だけ呼ばれる
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('loadTimetable', () => {
    it('時刻表データを正しくパースする', async () => {
      const mockCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,18,50,平日,佐賀大学・西与賀線,佐賀市営バス
11,100,2,県庁前,18,55,平日,佐賀大学・西与賀線,佐賀市営バス`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      const result = await dataLoader.loadTimetable();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        routeNumber: '11',
        tripId: '100',
        stopSequence: 1,
        stopName: '佐賀駅バスセンター',
        hour: 18,
        minute: 50,
        weekdayType: '平日',
        routeName: '佐賀大学・西与賀線',
        operator: '佐賀市営バス'
      });
    });
  });

  describe('loadFares', () => {
    it('運賃データを正しくパースする', async () => {
      const mockCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,県庁前,佐賀市営バス,160,80
佐賀駅BC,佐賀大学,佐賀市営バス,180,90`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      const result = await dataLoader.loadFares();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        from: '佐賀駅BC',
        to: '県庁前',
        operator: '佐賀市営バス',
        adultFare: 160,
        childFare: 80
      });
    });
  });

  describe('loadAllData', () => {
    it('全データを並列読み込みできる', async () => {
      const mockBusStopsCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

      const mockTimetableCSV = `路線番号,便ID,バス停順序,バス停名,時,分,曜日区分,路線名,運行会社
11,100,1,佐賀駅バスセンター,18,50,平日,佐賀大学・西与賀線,佐賀市営バス`;

      const mockFaresCSV = `出発地,目的地,運行会社,大人運賃,小児運賃
佐賀駅BC,県庁前,佐賀市営バス,160,80`;

      global.fetch = vi.fn((url) => {
        if (url.includes('bus_stop.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopsCSV)
          });
        } else if (url.includes('timetable_all_complete.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockTimetableCSV)
          });
        } else if (url.includes('fare_major_routes.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockFaresCSV)
          });
        }
      });

      const result = await dataLoader.loadAllData();

      expect(result.busStops).toHaveLength(1);
      expect(result.timetable).toHaveLength(1);
      expect(result.fares).toHaveLength(1);
    });

    it('読み込み失敗時にエラーをスローする', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404
        })
      );

      await expect(dataLoader.loadAllData()).rejects.toThrow('データの読み込みに失敗しました');
    });
  });

  describe('fetchWithTimeout', () => {
    it('タイムアウト時にエラーをスローする', async () => {
      // タイムアウトを短く設定
      dataLoader.timeout = 100;

      // AbortErrorをシミュレート
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn(() => Promise.reject(abortError));

      await expect(dataLoader.fetchWithTimeout('test.csv')).rejects.toThrow('タイムアウト');
    });

    it('HTTP エラー時にエラーをスローする', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      );

      await expect(dataLoader.fetchWithTimeout('test.csv')).rejects.toThrow('HTTP error');
    });
  });

  describe('clearCache', () => {
    it('キャッシュをクリアできる', async () => {
      const mockCSV = `バス停ID,バス停名,緯度,経度
SAGA-001,佐賀駅バスセンター,33.2649,130.3008`;

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockCSV)
        })
      );

      // データを読み込み
      await dataLoader.loadBusStops();
      expect(dataLoader.busStops).not.toBeNull();

      // キャッシュをクリア
      dataLoader.clearCache();
      expect(dataLoader.busStops).toBeNull();
    });
  });
});
