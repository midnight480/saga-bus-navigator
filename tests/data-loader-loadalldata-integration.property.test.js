/**
 * DataLoader.loadAllDataOnce() 統合テスト
 * 
 * タスク2.1: loadAllDataOnce()の統合テストを作成
 * - enrichTripsWithDirection()が呼び出されることを検証
 * - インデックスに方向情報が含まれることを検証
 * - プロパティ7: インデックスの方向情報
 * - 検証: 要件2.1, 2.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../js/direction-detector.js';
import '../js/data-loader.js';

describe('DataLoader.loadAllDataOnce() 統合テスト', () => {
  let dataLoader;
  let fetchSpy;
  let DirectionDetector;

  beforeEach(() => {
    // DirectionDetectorをグローバルから取得
    DirectionDetector = global.DirectionDetector;
    
    dataLoader = new window.DataLoader();
    
    // JSZipのモック
    global.JSZip = {
      loadAsync: vi.fn().mockResolvedValue({
        file: vi.fn((filename) => ({
          async: vi.fn().mockResolvedValue(getMockGTFSContent(filename))
        })),
        files: {
          'stops.txt': {},
          'stop_times.txt': {},
          'routes.txt': {},
          'trips.txt': {},
          'calendar.txt': {},
          'agency.txt': {},
          'fare_attributes.txt': {},
          'fare_rules.txt': {}
        }
      })
    };
  });

  afterEach(() => {
    if (fetchSpy) {
      fetchSpy.mockRestore();
    }
  });

  /**
   * モックGTFSコンテンツを生成
   */
  function getMockGTFSContent(filename) {
    const mockData = {
      'stops.txt': `stop_id,stop_code,stop_name,stop_desc,stop_lat,stop_lon,zone_id,stop_url,location_type,parent_station
stop_1,,佐賀駅,,33.26451,130.29974,,,0,
stop_2,,大和,,33.27000,130.30000,,,0,
stop_3,,嘉瀬,,33.28000,130.31000,,,0,`,
      'stop_times.txt': `trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,pickup_type,drop_off_type
trip_1,08:00:00,08:00:00,stop_1,1,,,
trip_1,08:10:00,08:10:00,stop_2,2,,,
trip_1,08:20:00,08:20:00,stop_3,3,,,
trip_2,09:00:00,09:00:00,stop_3,1,,,
trip_2,09:10:00,09:10:00,stop_2,2,,,
trip_2,09:20:00,09:20:00,stop_1,3,,,`,
      'routes.txt': `route_id,agency_id,route_short_name,route_long_name,route_desc,route_type
route_1,agency_1,1,佐賀駅～大和線,,3`,
      'trips.txt': `route_id,service_id,trip_id,trip_headsign,trip_short_name,direction_id,block_id,shape_id
route_1,weekday,trip_1,大和方面,,,,
route_1,weekday,trip_2,佐賀駅方面,,,,`,
      'calendar.txt': `service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date
weekday,1,1,1,1,1,0,0,20250101,20251231`,
      'agency.txt': `agency_id,agency_name,agency_url,agency_timezone,agency_lang
agency_1,佐賀市営バス,https://example.com,Asia/Tokyo,ja`,
      'fare_attributes.txt': `fare_id,price,currency_type,payment_method,transfers,agency_id
fare_1,160,JPY,0,0,agency_1`,
      'fare_rules.txt': `fare_id,route_id,origin_id,destination_id,contains_id
fare_1,route_1,,,`
    };
    return mockData[filename] || '';
  }

  /**
   * テスト: enrichTripsWithDirection()が呼び出されることを検証
   * 要件2.1: loadAllDataOnce()がenrichTripsWithDirection()を呼び出す
   */
  it('enrichTripsWithDirection()が呼び出されることを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    // enrichTripsWithDirection()をスパイ
    const enrichSpy = vi.spyOn(dataLoader, 'enrichTripsWithDirection');

    await dataLoader.loadAllDataOnce();

    // enrichTripsWithDirection()が呼び出されたことを確認
    expect(enrichSpy).toHaveBeenCalledTimes(1);
  });

  /**
   * テスト: 全てのtripにdirectionプロパティが設定されることを検証
   * 要件2.4: 方向判定結果を各tripオブジェクトのdirectionプロパティに設定
   */
  it('全てのtripにdirectionプロパティが設定されることを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    await dataLoader.loadAllDataOnce();

    // 全てのtripにdirectionプロパティが設定されていることを確認
    expect(dataLoader.trips).not.toBeNull();
    expect(dataLoader.trips.length).toBeGreaterThan(0);
    
    dataLoader.trips.forEach(trip => {
      expect(trip).toHaveProperty('direction');
      expect(trip.direction).toBeDefined();
      expect(['0', '1', 'unknown']).toContain(trip.direction);
    });
  });

  /**
   * プロパティ7: インデックスの方向情報
   * 任意のインデックス生成後、生成されたインデックスは正確な方向情報を含む
   * 検証: 要件2.5
   * 
   * Feature: direction-detection-integration, Property 7: インデックスの方向情報
   */
  it('プロパティ7: インデックスに方向情報が含まれることを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    await dataLoader.loadAllDataOnce();

    // インデックスが生成されていることを確認
    expect(dataLoader.timetableByRouteAndDirection).not.toBeNull();
    expect(dataLoader.routeMetadata).not.toBeNull();
    expect(dataLoader.routeToTrips).not.toBeNull();

    // 方向別時刻表インデックスに方向情報が含まれることを確認
    const routeIds = Object.keys(dataLoader.timetableByRouteAndDirection);
    expect(routeIds.length).toBeGreaterThan(0);

    routeIds.forEach(routeId => {
      const directions = Object.keys(dataLoader.timetableByRouteAndDirection[routeId]);
      expect(directions.length).toBeGreaterThan(0);
      
      // 各方向に時刻表エントリが含まれることを確認
      directions.forEach(direction => {
        expect(['0', '1', 'unknown']).toContain(direction);
        const entries = dataLoader.timetableByRouteAndDirection[routeId][direction];
        expect(Array.isArray(entries)).toBe(true);
        expect(entries.length).toBeGreaterThan(0);
        
        // 各エントリにdirectionフィールドが含まれることを確認
        entries.forEach(entry => {
          expect(entry).toHaveProperty('direction');
          expect(entry.direction).toBe(direction);
        });
      });
    });

    // 路線メタデータに方向情報が含まれることを確認
    const metadataRouteIds = Object.keys(dataLoader.routeMetadata);
    expect(metadataRouteIds.length).toBeGreaterThan(0);

    metadataRouteIds.forEach(routeId => {
      const metadata = dataLoader.routeMetadata[routeId];
      expect(metadata).toHaveProperty('directions');
      expect(Array.isArray(metadata.directions)).toBe(true);
      expect(metadata.directions.length).toBeGreaterThan(0);
      
      // 各方向が有効な値であることを確認
      metadata.directions.forEach(direction => {
        expect(['0', '1', 'unknown']).toContain(direction);
      });
    });

    // routeToTripsインデックスに方向情報が含まれることを確認
    const routeToTripsIds = Object.keys(dataLoader.routeToTrips);
    expect(routeToTripsIds.length).toBeGreaterThan(0);

    routeToTripsIds.forEach(routeId => {
      const directions = Object.keys(dataLoader.routeToTrips[routeId]);
      expect(directions.length).toBeGreaterThan(0);
      
      // 各方向にtripIdの配列が含まれることを確認
      directions.forEach(direction => {
        expect(['0', '1', 'unknown']).toContain(direction);
        const tripIds = dataLoader.routeToTrips[routeId][direction];
        expect(Array.isArray(tripIds)).toBe(true);
        expect(tripIds.length).toBeGreaterThan(0);
      });
    });
  });

  /**
   * テスト: 方向判定がインデックス生成前に実行されることを検証
   * 要件2.5: インデックス生成前に方向判定が完了する
   */
  it('方向判定がインデックス生成前に実行されることを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    // enrichTripsWithDirection()とgenerateIndexes()をスパイ
    const enrichSpy = vi.spyOn(dataLoader, 'enrichTripsWithDirection');
    const generateIndexesSpy = vi.spyOn(dataLoader, 'generateIndexes');

    await dataLoader.loadAllDataOnce();

    // enrichTripsWithDirection()が呼び出されたことを確認
    expect(enrichSpy).toHaveBeenCalledTimes(1);
    
    // generateIndexes()が呼び出されたことを確認
    expect(generateIndexesSpy).toHaveBeenCalledTimes(1);

    // enrichTripsWithDirection()がgenerateIndexes()より前に呼び出されたことを確認
    const enrichCallOrder = enrichSpy.mock.invocationCallOrder[0];
    const generateIndexesCallOrder = generateIndexesSpy.mock.invocationCallOrder[0];
    expect(enrichCallOrder).toBeLessThan(generateIndexesCallOrder);
  });

  /**
   * テスト: 進捗コールバックが「方向情報を判定しています...」を含むことを検証
   * 要件2.1: 進捗コールバックを追加
   */
  it('進捗コールバックが「方向情報を判定しています...」を含むことを検証', async () => {
    // fetchをモック
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'data/saga-current.zip') {
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });

    // 進捗コールバックをモック
    const progressMessages = [];
    dataLoader.onProgress = (message) => {
      progressMessages.push(message);
    };

    await dataLoader.loadAllDataOnce();

    // 進捗メッセージに「方向情報を判定しています...」が含まれることを確認
    expect(progressMessages).toContain('方向情報を判定しています...');
    
    // 進捗メッセージの順序を確認
    const directionIndex = progressMessages.indexOf('方向情報を判定しています...');
    const indexGenerationIndex = progressMessages.indexOf('インデックスを生成しています...');
    
    // 方向判定がインデックス生成より前に実行されることを確認
    expect(directionIndex).toBeGreaterThan(-1);
    expect(indexGenerationIndex).toBeGreaterThan(-1);
    expect(directionIndex).toBeLessThan(indexGenerationIndex);
  });
});
