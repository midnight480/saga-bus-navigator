/**
 * DataLoader統合テスト
 * GTFS ZIPファイル読み込みとKVフォールバックの統合テストを実施
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import JSZip from 'jszip';

// DataLoaderクラスをインポート
import '../js/data-loader.js';

// JSZipをグローバルに設定
global.JSZip = JSZip;

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
  stops: `stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station
1001002-01,,佐賀駅バスセンター 1番のりば,,33.26451,130.29974,1001002-01,,0,1001002
1001002-02,,佐賀駅バスセンター 2番のりば,,33.26451,130.29974,1001002-02,,0,1001002`,
  
  stop_times: `trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type
trip_123,08:00:00,08:00:00,1001002-01,1,,,
trip_123,08:10:00,08:10:00,1001002-02,2,,,`,
  
  routes: `route_id,agency_id,route_short_name,route_long_name,route_desc,route_type
route_456,agency_1,1,佐賀駅～大和線,,3`,
  
  trips: `route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,block_id,shape_id
route_456,weekday,trip_123,大和方面,,,0,`,
  
  calendar: `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
weekday,1,1,1,1,1,0,0,20250101,20251231`,
  
  agency: `agency_id,agency_name,agency_url,agency_timezone,agency_lang
agency_1,佐賀市営バス,https://example.com,Asia/Tokyo,ja`,
  
  fare_attributes: `fare_id,price,currency_type,payment_method,transfers,agency_id
fare_1,160,JPY,0,0,agency_1`,
  
  fare_rules: `fare_id,route_id,origin_id,destination_id,contains_id
fare_1,route_456,,,`
};

// モックマッピングCSVデータ
const mockBusStopMapping = `stop_id,ja,en
1001002-01,佐賀駅バスセンター 1番のりば,Saga Station Bus Center Platform 1
1001002-02,佐賀駅バスセンター 2番のりば,Saga Station Bus Center Platform 2`;

const mockRouteNameMapping = `route_id,ja,en
route_456,佐賀駅～大和線,Saga Station - Yamato Line`;

/**
 * モックGTFS ZIPファイルを作成
 */
async function createMockGTFSZip() {
  const zip = new JSZip();
  
  zip.file('stops.txt', mockGTFSData.stops);
  zip.file('stop_times.txt', mockGTFSData.stop_times);
  zip.file('routes.txt', mockGTFSData.routes);
  zip.file('trips.txt', mockGTFSData.trips);
  zip.file('calendar.txt', mockGTFSData.calendar);
  zip.file('agency.txt', mockGTFSData.agency);
  zip.file('fare_attributes.txt', mockGTFSData.fare_attributes);
  zip.file('fare_rules.txt', mockGTFSData.fare_rules);
  
  return await zip.generateAsync({ type: 'arraybuffer' });
}

describe('GTFSParser', () => {
  describe('parseCSVLine', () => {
    it('シンプルなカンマ区切りをパースできる', () => {
      const line = 'value1,value2,value3';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('ダブルクォートで囲まれた値をパースできる', () => {
      const line = '"value1","value2","value3"';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1', 'value2', 'value3']);
    });

    it('カンマを含む値をダブルクォートで囲んでパースできる', () => {
      const line = '"value1,with,comma","value2","value3"';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1,with,comma', 'value2', 'value3']);
    });

    it('エスケープされたダブルクォートをパースできる', () => {
      const line = '"value""with""quotes","value2"';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value"with"quotes', 'value2']);
    });

    it('空の値をパースできる', () => {
      const line = 'value1,,value3';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual(['value1', '', 'value3']);
    });

    it('GTFS stops.txtのヘッダー行をパースできる', () => {
      const line = 'stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual([
        'stop_id', 'stop_code', 'stop_name', 'stop_desc', 'stop_lat', 
        'stop_lon', 'zone_id', 'stop_url', 'location_type', 'parent_station'
      ]);
    });

    it('GTFS stops.txtのデータ行をパースできる', () => {
      const line = '1001002-01,,佐賀駅バスセンター 1番のりば,,33.26451,130.29974,1001002-01,,0,1001002';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual([
        '1001002-01', '', '佐賀駅バスセンター 1番のりば', '', '33.26451',
        '130.29974', '1001002-01', '', '0', '1001002'
      ]);
    });

    it('GTFS trips.txtの複雑なデータ行をパースできる', () => {
      const line = '1ゆめタウン線,1_平日,1_平日_08時30分_系統51111,"5　ゆめタウン佐賀（ほほえみ館・夢咲コスモスタウン 経由）",,,1ゆめタウン線(51111),,0';
      const result = window.GTFSParser.parseCSVLine(line);
      expect(result).toEqual([
        '1ゆめタウン線', '1_平日', '1_平日_08時30分_系統51111',
        '5　ゆめタウン佐賀（ほほえみ館・夢咲コスモスタウン 経由）',
        '', '', '1ゆめタウン線(51111)', '', '0'
      ]);
    });
  });

  describe('parse', () => {
    it('GTFS stops.txtをパースできる', () => {
      const text = `stop_id,stop_code,stop_name,stop_lat,stop_lon,location_type
1001002-01,,佐賀駅バスセンター 1番のりば,33.26451,130.29974,0
1001002-02,,佐賀駅バスセンター 2番のりば,33.26451,130.29974,0`;
      
      const result = window.GTFSParser.parse(text);
      
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        stop_id: '1001002-01',
        stop_code: '',
        stop_name: '佐賀駅バスセンター 1番のりば',
        stop_lat: '33.26451',
        stop_lon: '130.29974',
        location_type: '0'
      });
    });

    it('空のテキストは空配列を返す', () => {
      const text = '';
      const result = window.GTFSParser.parse(text);
      expect(result).toEqual([]);
    });

    it('空行をスキップする', () => {
      const text = `stop_id,stop_name
1001002-01,佐賀駅バスセンター

1001002-02,県庁前`;
      
      const result = window.GTFSParser.parse(text);
      expect(result).toHaveLength(2);
    });
  });
});

describe('DataLoader - GTFS ZIP統合テスト', () => {
  let dataLoader;
  let mockKV;
  let fetchSpy;

  beforeEach(() => {
    // 各テストの前に新しいインスタンスを作成
    dataLoader = new window.DataLoader();
    mockKV = new MockKVNamespace();
  });

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.mockRestore();
    }
  });

  describe('loadAllDataOnce - GTFS ZIP読み込み', () => {
    it('GTFS ZIPファイルから全データを読み込める', async () => {
      // モックGTFS ZIPを作成
      const mockZipBuffer = await createMockGTFSZip();
      
      // fetchをモック
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (url.includes('saga-current.zip')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockZipBuffer)
          });
        } else if (url.includes('bus_stops_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopMapping)
          });
        } else if (url.includes('route_names_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRouteNameMapping)
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // データを読み込み
      await dataLoader.loadAllDataOnce();

      // 全てのデータが読み込まれていることを確認
      expect(dataLoader.busStops).not.toBeNull();
      expect(dataLoader.timetable).not.toBeNull();
      expect(dataLoader.fares).not.toBeNull();
      expect(dataLoader.fareRules).not.toBeNull();
      expect(dataLoader.stopTimes).not.toBeNull();
      expect(dataLoader.trips).not.toBeNull();
      expect(dataLoader.routes).not.toBeNull();
      expect(dataLoader.calendar).not.toBeNull();
      expect(dataLoader.gtfsStops).not.toBeNull();

      // データの内容を確認
      expect(dataLoader.busStops.length).toBeGreaterThan(0);
      expect(dataLoader.timetable.length).toBeGreaterThan(0);
      expect(dataLoader.stopTimes.length).toBeGreaterThan(0);
      expect(dataLoader.trips.length).toBeGreaterThan(0);
    });

    it('キャッシュが正しく機能する', async () => {
      const mockZipBuffer = await createMockGTFSZip();
      
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (url.includes('saga-current.zip')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockZipBuffer)
          });
        } else if (url.includes('bus_stops_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopMapping)
          });
        } else if (url.includes('route_names_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRouteNameMapping)
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // 1回目の呼び出し
      await dataLoader.loadAllDataOnce();
      const firstCallCount = fetchSpy.mock.calls.length;

      // 2回目の呼び出し（キャッシュから取得されるべき）
      await dataLoader.loadAllDataOnce();
      const secondCallCount = fetchSpy.mock.calls.length;

      // fetchが追加で呼ばれていないことを確認
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('GTFS ZIPファイルが見つからない場合はエラーをスローする', async () => {
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() => {
        return Promise.resolve({ ok: false, status: 404 });
      });

      await expect(dataLoader.loadAllDataOnce()).rejects.toThrow('GTFSデータファイル(saga-*.zip)が見つかりません');
    });
  });

  describe('KVフォールバック統合テスト', () => {
    it('KVからデータを読み込み、失敗時にZIPにフォールバックする', async () => {
      const mockZipBuffer = await createMockGTFSZip();
      
      // KVを設定（空のKV）
      dataLoader.setKVNamespace(mockKV);
      
      // fetchをモック
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (url.includes('saga-current.zip')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockZipBuffer)
          });
        } else if (url.includes('bus_stops_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopMapping)
          });
        } else if (url.includes('route_names_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRouteNameMapping)
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // データを読み込み（KVは空なのでZIPにフォールバック）
      await dataLoader.loadAllDataOnce();

      // データが読み込まれていることを確認
      expect(dataLoader.busStops).not.toBeNull();
      expect(dataLoader.busStops.length).toBeGreaterThan(0);
    });

    it('KVにデータがある場合はKVから読み込む', async () => {
      const version = '20250115120000';
      
      // KVにテストデータを保存
      await mockKV.put('gtfs:current_version', version);
      await mockKV.put(`gtfs:v${version}:stops`, [
        { stop_id: '1', stop_name: 'テストバス停', stop_lat: '33.2634', stop_lon: '130.3000', location_type: '0' }
      ]);
      await mockKV.put(`gtfs:v${version}:routes`, [
        { route_id: 'R1', route_long_name: 'テスト路線', agency_id: 'A1' }
      ]);
      await mockKV.put(`gtfs:v${version}:trips`, [
        { trip_id: 'T1', route_id: 'R1', service_id: 'S1', direction_id: '0' }
      ]);
      await mockKV.put(`gtfs:v${version}:calendar`, [
        { service_id: 'S1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0' }
      ]);
      await mockKV.put(`gtfs:v${version}:agency`, [
        { agency_id: 'A1', agency_name: 'テスト事業者' }
      ]);
      await mockKV.put(`gtfs:v${version}:fare_attributes`, [
        { fare_id: 'F1', price: '200', currency_type: 'JPY', payment_method: '0', transfers: '0' }
      ]);
      await mockKV.put(`gtfs:v${version}:stop_times`, [
        { trip_id: 'T1', stop_id: '1', arrival_time: '08:00:00', departure_time: '08:00:00', stop_sequence: '1' }
      ]);
      
      // KVを設定
      dataLoader.setKVNamespace(mockKV);
      
      // fetchをモック（マッピングファイル用）
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (url.includes('bus_stops_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopMapping)
          });
        } else if (url.includes('route_names_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRouteNameMapping)
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
      
      // データを読み込み
      await dataLoader.loadAllDataOnce();

      // KVからデータが読み込まれていることを確認
      expect(dataLoader.gtfsStops).not.toBeNull();
      expect(dataLoader.gtfsStops.length).toBe(1);
      expect(dataLoader.gtfsStops[0].stop_name).toBe('テストバス停');
    });
  });

  describe('isDataLoaded', () => {
    it('データ読み込み前はfalseを返す', () => {
      expect(dataLoader.isDataLoaded()).toBe(false);
    });

    it('データ読み込み後はtrueを返す', async () => {
      const mockZipBuffer = await createMockGTFSZip();
      
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (url.includes('saga-current.zip')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockZipBuffer)
          });
        } else if (url.includes('bus_stops_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopMapping)
          });
        } else if (url.includes('route_names_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRouteNameMapping)
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      await dataLoader.loadAllDataOnce();
      
      expect(dataLoader.isDataLoaded()).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('キャッシュをクリアできる', async () => {
      const mockZipBuffer = await createMockGTFSZip();
      
      fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
        if (url.includes('saga-current.zip')) {
          return Promise.resolve({
            ok: true,
            arrayBuffer: () => Promise.resolve(mockZipBuffer)
          });
        } else if (url.includes('bus_stops_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockBusStopMapping)
          });
        } else if (url.includes('route_names_mapping.csv')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRouteNameMapping)
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      // データを読み込み
      await dataLoader.loadAllDataOnce();
      expect(dataLoader.busStops).not.toBeNull();

      // キャッシュをクリア
      dataLoader.clearCache();
      expect(dataLoader.busStops).toBeNull();
      expect(dataLoader.isDataLoaded()).toBe(false);
    });
  });
});


