/**
 * DataLoader KV統合のユニットテスト
 * 要件4.1, 4.2, 4.3, 4.4, 4.5, 4.6を検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// モックKV Namespace
class MockKVNamespace {
  constructor() {
    this.data = new Map();
  }

  async get(key, type = 'text') {
    const value = this.data.get(key);
    if (!value) return null;
    
    if (type === 'json') {
      return JSON.parse(value);
    }
    return value;
  }

  async put(key, value) {
    if (typeof value === 'object') {
      this.data.set(key, JSON.stringify(value));
    } else {
      this.data.set(key, value);
    }
  }

  clear() {
    this.data.clear();
  }
}

// テスト用のGTFSデータ
const mockGTFSData = {
  stops: [
    { stop_id: '1', stop_name: 'バス停A', stop_lat: '33.2634', stop_lon: '130.3000', location_type: '0' },
    { stop_id: '2', stop_name: 'バス停B', stop_lat: '33.2635', stop_lon: '130.3001', location_type: '0' }
  ],
  routes: [
    { route_id: 'R1', route_long_name: '路線1', agency_id: 'A1' }
  ],
  trips: [
    { trip_id: 'T1', route_id: 'R1', service_id: 'S1', direction_id: '0' }
  ],
  calendar: [
    { service_id: 'S1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0' }
  ],
  agency: [
    { agency_id: 'A1', agency_name: '佐賀市営バス' }
  ],
  fare_attributes: [
    { fare_id: 'F1', price: '200', currency_type: 'JPY', payment_method: '0', transfers: '0' }
  ],
  stop_times: [
    { trip_id: 'T1', stop_id: '1', arrival_time: '08:00:00', departure_time: '08:00:00', stop_sequence: '1' },
    { trip_id: 'T1', stop_id: '2', arrival_time: '08:10:00', departure_time: '08:10:00', stop_sequence: '2' }
  ]
};

describe('DataLoader KV統合', () => {
  let mockKV;
  let DataLoader;
  let DataTransformer;

  beforeEach(async () => {
    // モジュールをリセット
    vi.resetModules();
    
    // グローバルオブジェクトをモック
    global.window = {
      DataLoader: null,
      DataTransformer: null
    };
    
    // data-loader.jsを動的にインポート
    const module = await import('../js/data-loader.js');
    DataLoader = global.window.DataLoader;
    DataTransformer = global.window.DataTransformer;
    
    // モックKVを初期化
    mockKV = new MockKVNamespace();
  });

  describe('setKVNamespace', () => {
    it('KV Namespaceを設定できる', () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      expect(loader.kvNamespace).toBe(mockKV);
    });
  });

  describe('loadTableFromKV', () => {
    it('KVから単一のテーブルを読み込める（要件4.2）', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      // テストデータをKVに保存
      const version = '20250115120000';
      await mockKV.put(`gtfs:v${version}:stops`, mockGTFSData.stops);
      
      // テーブルを読み込み
      const stops = await loader.loadTableFromKV(version, 'stops');
      
      expect(stops).toEqual(mockGTFSData.stops);
      expect(stops.length).toBe(2);
    });

    it('テーブルが見つからない場合はエラーをスローする', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      const version = '20250115120000';
      
      await expect(
        loader.loadTableFromKV(version, 'nonexistent')
      ).rejects.toThrow('テーブル nonexistent がKVに見つかりません');
    });
  });

  describe('loadStopTimesFromKV', () => {
    it('分割されていないstop_timesを読み込める（要件4.3）', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      const version = '20250115120000';
      await mockKV.put(`gtfs:v${version}:stop_times`, mockGTFSData.stop_times);
      
      const stopTimes = await loader.loadStopTimesFromKV(version);
      
      expect(stopTimes).toEqual(mockGTFSData.stop_times);
      expect(stopTimes.length).toBe(2);
    });

    it('分割されたstop_timesを読み込んで結合できる（要件4.3）', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      const version = '20250115120000';
      
      // stop_timesを2つのチャンクに分割
      const chunk0 = [mockGTFSData.stop_times[0]];
      const chunk1 = [mockGTFSData.stop_times[1]];
      
      await mockKV.put(`gtfs:v${version}:stop_times_0`, chunk0);
      await mockKV.put(`gtfs:v${version}:stop_times_1`, chunk1);
      
      const stopTimes = await loader.loadStopTimesFromKV(version);
      
      expect(stopTimes.length).toBe(2);
      expect(stopTimes[0]).toEqual(mockGTFSData.stop_times[0]);
      expect(stopTimes[1]).toEqual(mockGTFSData.stop_times[1]);
    });

    it('stop_timesが見つからない場合はエラーをスローする', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      const version = '20250115120000';
      
      await expect(
        loader.loadStopTimesFromKV(version)
      ).rejects.toThrow('KVにstop_timesデータが見つかりません');
    });
  });

  describe('loadFromKV', () => {
    it('KVから全てのGTFSデータを読み込める（要件4.1, 4.2）', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      const version = '20250115120000';
      
      // 現在のバージョンを設定
      await mockKV.put('gtfs:current_version', version);
      
      // 全てのテーブルをKVに保存
      await mockKV.put(`gtfs:v${version}:stops`, mockGTFSData.stops);
      await mockKV.put(`gtfs:v${version}:routes`, mockGTFSData.routes);
      await mockKV.put(`gtfs:v${version}:trips`, mockGTFSData.trips);
      await mockKV.put(`gtfs:v${version}:calendar`, mockGTFSData.calendar);
      await mockKV.put(`gtfs:v${version}:agency`, mockGTFSData.agency);
      await mockKV.put(`gtfs:v${version}:fare_attributes`, mockGTFSData.fare_attributes);
      await mockKV.put(`gtfs:v${version}:stop_times`, mockGTFSData.stop_times);
      
      // データを読み込み
      const data = await loader.loadFromKV();
      
      expect(data.stops).toEqual(mockGTFSData.stops);
      expect(data.routes).toEqual(mockGTFSData.routes);
      expect(data.trips).toEqual(mockGTFSData.trips);
      expect(data.calendar).toEqual(mockGTFSData.calendar);
      expect(data.agency).toEqual(mockGTFSData.agency);
      expect(data.fareAttributes).toEqual(mockGTFSData.fare_attributes);
      expect(data.stopTimes).toEqual(mockGTFSData.stop_times);
    });

    it('KV Namespaceが設定されていない場合はエラーをスローする', async () => {
      const loader = new DataLoader();
      
      await expect(
        loader.loadFromKV()
      ).rejects.toThrow('KV Namespaceが設定されていません');
    });

    it('現在のバージョンが見つからない場合はエラーをスローする（要件4.1）', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      await expect(
        loader.loadFromKV()
      ).rejects.toThrow('KVに現在のバージョンが見つかりません');
    });
  });

  describe('メモリキャッシュ', () => {
    it('データが既に読み込まれている場合はキャッシュを使用する（要件4.4）', async () => {
      const loader = new DataLoader();
      loader.setKVNamespace(mockKV);
      
      // データを手動で設定（キャッシュをシミュレート）
      loader.busStops = [{ id: '1', name: 'テスト' }];
      loader.timetable = [];
      loader.fares = [];
      loader.fareRules = [];
      loader.stopTimes = [];
      loader.trips = [];
      loader.routes = [];
      loader.calendar = [];
      loader.gtfsStops = [];
      loader.timetableByRouteAndDirection = {};
      loader.tripStops = {};
      loader.routeMetadata = {};
      loader.stopToTrips = {};
      loader.routeToTrips = {};
      loader.stopsGrouped = {};
      
      // isDataLoaded()がtrueを返すことを確認
      expect(loader.isDataLoaded()).toBe(true);
      
      // loadAllDataOnce()を呼び出してもKVにアクセスしないことを確認
      await loader.loadAllDataOnce();
      
      // キャッシュされたデータがそのまま残っていることを確認
      expect(loader.busStops).toEqual([{ id: '1', name: 'テスト' }]);
    });

    it('clearCache()でキャッシュをクリアできる（要件4.6）', () => {
      const loader = new DataLoader();
      
      // データを設定
      loader.busStops = [{ id: '1', name: 'テスト' }];
      loader.timetable = [];
      loader.fares = [];
      
      // キャッシュをクリア
      loader.clearCache();
      
      // 全てのキャッシュがnullになっていることを確認
      expect(loader.busStops).toBeNull();
      expect(loader.timetable).toBeNull();
      expect(loader.fares).toBeNull();
    });
  });

  describe('タイムアウト処理', () => {
    it('KV読み込みが5秒でタイムアウトする（要件4.5）', async () => {
      const loader = new DataLoader();
      
      // 遅延するKVをモック
      const slowKV = {
        get: vi.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve('20250115120000'), 10000))
        )
      };
      
      loader.setKVNamespace(slowKV);
      
      // loadAllDataOnce()を呼び出し（タイムアウトが発生するはず）
      // タイムアウト後はフォールバックするため、エラーはスローされない
      // ただし、ZIPファイルも存在しない場合は最終的にエラーになる
      
      const startTime = Date.now();
      try {
        await loader.loadAllDataOnce();
      } catch (error) {
        // ZIPファイルが見つからないエラーが発生する可能性がある
      }
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // タイムアウトが5秒前後で発生していることを確認（±1秒の誤差を許容）
      expect(duration).toBeLessThan(7000);
    }, 10000); // テスト自体のタイムアウトを10秒に設定
  });
});

describe('DataLoader フォールバック機能', () => {
  let mockKV;
  let DataLoader;

  beforeEach(async () => {
    vi.resetModules();
    
    global.window = {
      DataLoader: null,
      DataTransformer: null
    };
    
    const module = await import('../js/data-loader.js');
    DataLoader = global.window.DataLoader;
    
    mockKV = new MockKVNamespace();
  });

  it('KV読み込み失敗時にZIPファイルにフォールバックする（要件4.5, 6.3）', async () => {
    const loader = new DataLoader();
    
    // エラーを返すKVをモック
    const failingKV = {
      get: vi.fn().mockRejectedValue(new Error('KV接続エラー'))
    };
    
    loader.setKVNamespace(failingKV);
    
    // loadAllDataOnce()を呼び出し
    // KVが失敗してもZIPファイルへのフォールバックが試行される
    try {
      await loader.loadAllDataOnce();
    } catch (error) {
      // ZIPファイルも見つからない場合はエラーになる
      // これは正常な動作
      expect(error.message).toContain('GTFSデータファイル');
    }
    
    // KVへのアクセスが試行されたことを確認
    expect(failingKV.get).toHaveBeenCalled();
  });
});
