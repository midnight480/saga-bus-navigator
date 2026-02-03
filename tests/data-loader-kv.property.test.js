/**
 * DataLoader KV読み込みのプロパティベーステスト
 * 
 * このテストは、DataLoaderのKVからのデータ読み込み機能の正確性プロパティを検証します。
 * fast-checkを使用してランダムな入力で包括的にテストします。
 * 
 * Feature: cloudflare-kv-gtfs-deployment
 * Task: 5.1 DataLoader KV読み込みのプロパティテストを作成
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';

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

// GTFSデータジェネレーター
const gtfsStopArbitrary = fc.record({
  stop_id: fc.integer({ min: 1, max: 1000 }).map(n => `STOP_${n}`),
  stop_name: fc.oneof(
    fc.constant('佐賀駅バスセンター'),
    fc.constant('県庁前'),
    fc.constant('市役所前'),
    fc.constant('中央郵便局前'),
    fc.constant('呉服元町'),
    fc.array(fc.constantFrom('あ', 'い', 'う', 'え', 'お', '駅', '前', '通り'), { minLength: 3, maxLength: 10 }).map(arr => arr.join(''))
  ),
  stop_lat: fc.double({ min: 33.2, max: 33.3, noNaN: true }).map(n => n.toFixed(6)),
  stop_lon: fc.double({ min: 130.2, max: 130.4, noNaN: true }).map(n => n.toFixed(6)),
  location_type: fc.constant('0')
});

const gtfsRouteArbitrary = fc.record({
  route_id: fc.integer({ min: 1, max: 100 }).map(n => `ROUTE_${n}`),
  route_long_name: fc.oneof(
    fc.constant('佐賀駅～県庁線'),
    fc.constant('市役所循環線'),
    fc.constant('空港連絡線'),
    fc.array(fc.constantFrom('東', '西', '南', '北', '線', '循環'), { minLength: 4, maxLength: 8 }).map(arr => arr.join(''))
  ),
  agency_id: fc.constantFrom('SAGA_CITY', 'YUTOKU', 'NISHITETSU')
});

const gtfsTripArbitrary = (routeIds) => fc.record({
  trip_id: fc.integer({ min: 1, max: 10000 }).map(n => `TRIP_${n}`),
  route_id: fc.constantFrom(...routeIds),
  service_id: fc.constantFrom('WEEKDAY', 'SATURDAY', 'SUNDAY'),
  direction_id: fc.constantFrom('0', '1', ''),
  trip_headsign: fc.option(fc.oneof(
    fc.constant('佐賀駅行き'),
    fc.constant('県庁行き'),
    fc.constant('市役所行き')
  ), { nil: undefined })
});

const gtfsCalendarArbitrary = fc.record({
  service_id: fc.constantFrom('WEEKDAY', 'SATURDAY', 'SUNDAY'),
  monday: fc.constantFrom('0', '1'),
  tuesday: fc.constantFrom('0', '1'),
  wednesday: fc.constantFrom('0', '1'),
  thursday: fc.constantFrom('0', '1'),
  friday: fc.constantFrom('0', '1'),
  saturday: fc.constantFrom('0', '1'),
  sunday: fc.constantFrom('0', '1'),
  start_date: fc.constant('20250101'),
  end_date: fc.constant('20251231')
});

const gtfsAgencyArbitrary = fc.record({
  agency_id: fc.constantFrom('SAGA_CITY', 'YUTOKU', 'NISHITETSU'),
  agency_name: fc.constantFrom('佐賀市営バス', '祐徳バス', '西鉄バス'),
  agency_url: fc.constant('https://example.com'),
  agency_timezone: fc.constant('Asia/Tokyo')
});

const gtfsFareAttributeArbitrary = fc.record({
  fare_id: fc.integer({ min: 1, max: 10 }).map(n => `FARE_${n}`),
  price: fc.constantFrom('150', '200', '250', '300'),
  currency_type: fc.constant('JPY'),
  payment_method: fc.constant('0'),
  transfers: fc.constantFrom('0', '1', '2')
});

const gtfsStopTimeArbitrary = (tripIds, stopIds) => fc.record({
  trip_id: fc.constantFrom(...tripIds),
  stop_id: fc.constantFrom(...stopIds),
  arrival_time: fc.tuple(
    fc.integer({ min: 6, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([h, m, s]) => 
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  ),
  departure_time: fc.tuple(
    fc.integer({ min: 6, max: 23 }),
    fc.integer({ min: 0, max: 59 }),
    fc.integer({ min: 0, max: 59 })
  ).map(([h, m, s]) => 
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  ),
  stop_sequence: fc.integer({ min: 1, max: 50 }).map(n => String(n))
});

// 完全なGTFSデータセットジェネレーター
const gtfsDatasetArbitrary = fc.tuple(
  fc.array(gtfsStopArbitrary, { minLength: 2, maxLength: 10 }),
  fc.array(gtfsRouteArbitrary, { minLength: 1, maxLength: 5 }),
  fc.array(gtfsCalendarArbitrary, { minLength: 1, maxLength: 3 }),
  fc.array(gtfsAgencyArbitrary, { minLength: 1, maxLength: 3 }),
  fc.array(gtfsFareAttributeArbitrary, { minLength: 1, maxLength: 5 })
).chain(([stops, routes, calendar, agency, fareAttributes]) => {
  const stopIds = stops.map(s => s.stop_id);
  const routeIds = routes.map(r => r.route_id);
  
  return fc.tuple(
    fc.constant(stops),
    fc.constant(routes),
    fc.array(gtfsTripArbitrary(routeIds), { minLength: 1, maxLength: 20 }),
    fc.constant(calendar),
    fc.constant(agency),
    fc.constant(fareAttributes)
  ).chain(([stops, routes, trips, calendar, agency, fareAttributes]) => {
    const tripIds = trips.map(t => t.trip_id);
    
    return fc.tuple(
      fc.constant(stops),
      fc.constant(routes),
      fc.constant(trips),
      fc.constant(calendar),
      fc.constant(agency),
      fc.constant(fareAttributes),
      fc.array(gtfsStopTimeArbitrary(tripIds, stopIds), { minLength: 2, maxLength: 100 })
    );
  });
}).map(([stops, routes, trips, calendar, agency, fareAttributes, stopTimes]) => ({
  stops,
  routes,
  trips,
  calendar,
  agency,
  fare_attributes: fareAttributes,
  stop_times: stopTimes
}));

describe('DataLoader KV読み込み - プロパティベーステスト', () => {
  let DataLoader;
  let DataTransformer;

  beforeEach(async () => {
    // モジュールをリセット
    vi.resetModules();
    
    // グローバルオブジェクトをモック
    global.window = {
      DataLoader: null,
      DataTransformer: null,
      DirectionDetector: {
        detectDirectionByStopSequence: vi.fn().mockReturnValue(new Map())
      }
    };
    
    // data-loader.jsを動的にインポート
    await import('../js/data-loader.js');
    DataLoader = global.window.DataLoader;
    DataTransformer = global.window.DataTransformer;
  });

  describe('プロパティ7: DataLoaderのKVからのデータ読み込み', () => {
    /**
     * **検証: 要件 4.1, 4.2**
     * 
     * 任意のDataLoader初期化に対して、KVから`gtfs:current_version`を取得し、
     * そのバージョンの全てのGTFSテーブルを読み込んだ場合、
     * 読み込まれたデータは元のGTFSデータと等価である
     */
    it('KVから読み込んだGTFSデータは元のデータと等価である', async () => {
      await fc.assert(
        fc.asyncProperty(
          gtfsDatasetArbitrary,
          async (gtfsData) => {
            // モックKVを初期化
            const mockKV = new MockKVNamespace();
            
            // バージョン番号を生成
            const version = '20250115143045';
            
            // 現在のバージョンを設定
            await mockKV.put('gtfs:current_version', version);
            
            // 全てのテーブルをKVに保存
            await mockKV.put(`gtfs:v${version}:stops`, gtfsData.stops);
            await mockKV.put(`gtfs:v${version}:routes`, gtfsData.routes);
            await mockKV.put(`gtfs:v${version}:trips`, gtfsData.trips);
            await mockKV.put(`gtfs:v${version}:calendar`, gtfsData.calendar);
            await mockKV.put(`gtfs:v${version}:agency`, gtfsData.agency);
            await mockKV.put(`gtfs:v${version}:fare_attributes`, gtfsData.fare_attributes);
            await mockKV.put(`gtfs:v${version}:stop_times`, gtfsData.stop_times);
            
            // DataLoaderを初期化
            const loader = new DataLoader();
            loader.setKVNamespace(mockKV);
            
            // KVからデータを読み込み
            const loadedData = await loader.loadFromKV();
            
            // 読み込まれたデータが元のデータと等価であることを確認
            expect(loadedData.stops).toEqual(gtfsData.stops);
            expect(loadedData.routes).toEqual(gtfsData.routes);
            expect(loadedData.trips).toEqual(gtfsData.trips);
            expect(loadedData.calendar).toEqual(gtfsData.calendar);
            expect(loadedData.agency).toEqual(gtfsData.agency);
            expect(loadedData.fareAttributes).toEqual(gtfsData.fare_attributes);
            expect(loadedData.stopTimes).toEqual(gtfsData.stop_times);
            
            // データの整合性を確認
            expect(loadedData.stops.length).toBeGreaterThan(0);
            expect(loadedData.routes.length).toBeGreaterThan(0);
            expect(loadedData.trips.length).toBeGreaterThan(0);
            expect(loadedData.stopTimes.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * **検証: 要件 4.1**
     * 
     * KVに現在のバージョンが存在しない場合、エラーがスローされる
     */
    it('現在のバージョンが存在しない場合はエラーをスローする', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            const mockKV = new MockKVNamespace();
            const loader = new DataLoader();
            loader.setKVNamespace(mockKV);
            
            // 現在のバージョンを設定しない
            
            // エラーがスローされることを確認
            await expect(loader.loadFromKV()).rejects.toThrow('KVに現在のバージョンが見つかりません');
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * **検証: 要件 4.2**
     * 
     * 必須テーブルが欠けている場合、エラーがスローされる
     */
    it('必須テーブルが欠けている場合はエラーをスローする', async () => {
      await fc.assert(
        fc.asyncProperty(
          gtfsDatasetArbitrary,
          fc.constantFrom('stops', 'routes', 'trips', 'calendar', 'agency', 'fare_attributes'),
          async (gtfsData, missingTable) => {
            const mockKV = new MockKVNamespace();
            const version = '20250115143045';
            
            await mockKV.put('gtfs:current_version', version);
            
            // 指定されたテーブル以外を保存
            if (missingTable !== 'stops') {
              await mockKV.put(`gtfs:v${version}:stops`, gtfsData.stops);
            }
            if (missingTable !== 'routes') {
              await mockKV.put(`gtfs:v${version}:routes`, gtfsData.routes);
            }
            if (missingTable !== 'trips') {
              await mockKV.put(`gtfs:v${version}:trips`, gtfsData.trips);
            }
            if (missingTable !== 'calendar') {
              await mockKV.put(`gtfs:v${version}:calendar`, gtfsData.calendar);
            }
            if (missingTable !== 'agency') {
              await mockKV.put(`gtfs:v${version}:agency`, gtfsData.agency);
            }
            if (missingTable !== 'fare_attributes') {
              await mockKV.put(`gtfs:v${version}:fare_attributes`, gtfsData.fare_attributes);
            }
            await mockKV.put(`gtfs:v${version}:stop_times`, gtfsData.stop_times);
            
            const loader = new DataLoader();
            loader.setKVNamespace(mockKV);
            
            // エラーがスローされることを確認
            await expect(loader.loadFromKV()).rejects.toThrow();
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * **検証: 要件 4.3**
     * 
     * 分割されたstop_timesデータを正しく読み込んで結合できる
     */
    it('分割されたstop_timesデータを正しく読み込んで結合できる', async () => {
      await fc.assert(
        fc.asyncProperty(
          gtfsDatasetArbitrary,
          fc.integer({ min: 2, max: 5 }), // チャンク数
          async (gtfsData, numChunks) => {
            const mockKV = new MockKVNamespace();
            const version = '20250115143045';
            
            await mockKV.put('gtfs:current_version', version);
            
            // 他のテーブルを保存
            await mockKV.put(`gtfs:v${version}:stops`, gtfsData.stops);
            await mockKV.put(`gtfs:v${version}:routes`, gtfsData.routes);
            await mockKV.put(`gtfs:v${version}:trips`, gtfsData.trips);
            await mockKV.put(`gtfs:v${version}:calendar`, gtfsData.calendar);
            await mockKV.put(`gtfs:v${version}:agency`, gtfsData.agency);
            await mockKV.put(`gtfs:v${version}:fare_attributes`, gtfsData.fare_attributes);
            
            // stop_timesを分割して保存
            const stopTimes = gtfsData.stop_times;
            const chunkSize = Math.ceil(stopTimes.length / numChunks);
            
            for (let i = 0; i < numChunks; i++) {
              const start = i * chunkSize;
              const end = Math.min((i + 1) * chunkSize, stopTimes.length);
              const chunk = stopTimes.slice(start, end);
              
              if (chunk.length > 0) {
                await mockKV.put(`gtfs:v${version}:stop_times_${i}`, chunk);
              }
            }
            
            const loader = new DataLoader();
            loader.setKVNamespace(mockKV);
            
            // データを読み込み
            const loadedData = await loader.loadFromKV();
            
            // 結合されたstop_timesが元のデータと等価であることを確認
            expect(loadedData.stopTimes.length).toBe(stopTimes.length);
            
            // 各要素が含まれていることを確認（順序は保証されないため、ソートして比較）
            const sortedOriginal = [...stopTimes].sort((a, b) => 
              a.trip_id.localeCompare(b.trip_id) || 
              parseInt(a.stop_sequence) - parseInt(b.stop_sequence)
            );
            const sortedLoaded = [...loadedData.stopTimes].sort((a, b) => 
              a.trip_id.localeCompare(b.trip_id) || 
              parseInt(a.stop_sequence) - parseInt(b.stop_sequence)
            );
            
            expect(sortedLoaded).toEqual(sortedOriginal);
          }
        ),
        { numRuns: 50 }
      );
    });

    /**
     * **検証: 要件 4.2**
     * 
     * 複数のテーブルを並列に読み込んでも正しく動作する
     */
    it('複数のテーブルを並列に読み込んでも正しく動作する', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(gtfsDatasetArbitrary, { minLength: 1, maxLength: 3 }),
          async (datasets) => {
            for (const gtfsData of datasets) {
              const mockKV = new MockKVNamespace();
              const version = `2025011514304${datasets.indexOf(gtfsData)}`;
              
              await mockKV.put('gtfs:current_version', version);
              
              // 全てのテーブルを並列に保存
              await Promise.all([
                mockKV.put(`gtfs:v${version}:stops`, gtfsData.stops),
                mockKV.put(`gtfs:v${version}:routes`, gtfsData.routes),
                mockKV.put(`gtfs:v${version}:trips`, gtfsData.trips),
                mockKV.put(`gtfs:v${version}:calendar`, gtfsData.calendar),
                mockKV.put(`gtfs:v${version}:agency`, gtfsData.agency),
                mockKV.put(`gtfs:v${version}:fare_attributes`, gtfsData.fare_attributes),
                mockKV.put(`gtfs:v${version}:stop_times`, gtfsData.stop_times)
              ]);
              
              const loader = new DataLoader();
              loader.setKVNamespace(mockKV);
              
              // データを読み込み（内部で並列読み込みが行われる）
              const loadedData = await loader.loadFromKV();
              
              // 全てのテーブルが正しく読み込まれていることを確認
              expect(loadedData.stops).toEqual(gtfsData.stops);
              expect(loadedData.routes).toEqual(gtfsData.routes);
              expect(loadedData.trips).toEqual(gtfsData.trips);
              expect(loadedData.calendar).toEqual(gtfsData.calendar);
              expect(loadedData.agency).toEqual(gtfsData.agency);
              expect(loadedData.fareAttributes).toEqual(gtfsData.fare_attributes);
              expect(loadedData.stopTimes).toEqual(gtfsData.stop_times);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * **検証: データの整合性**
     * 
     * 読み込まれたデータの参照整合性が保たれている
     */
    it('読み込まれたデータの参照整合性が保たれている', async () => {
      await fc.assert(
        fc.asyncProperty(
          gtfsDatasetArbitrary,
          async (gtfsData) => {
            const mockKV = new MockKVNamespace();
            const version = '20250115143045';
            
            await mockKV.put('gtfs:current_version', version);
            
            await mockKV.put(`gtfs:v${version}:stops`, gtfsData.stops);
            await mockKV.put(`gtfs:v${version}:routes`, gtfsData.routes);
            await mockKV.put(`gtfs:v${version}:trips`, gtfsData.trips);
            await mockKV.put(`gtfs:v${version}:calendar`, gtfsData.calendar);
            await mockKV.put(`gtfs:v${version}:agency`, gtfsData.agency);
            await mockKV.put(`gtfs:v${version}:fare_attributes`, gtfsData.fare_attributes);
            await mockKV.put(`gtfs:v${version}:stop_times`, gtfsData.stop_times);
            
            const loader = new DataLoader();
            loader.setKVNamespace(mockKV);
            
            const loadedData = await loader.loadFromKV();
            
            // 参照整合性を確認
            const stopIds = new Set(loadedData.stops.map(s => s.stop_id));
            const routeIds = new Set(loadedData.routes.map(r => r.route_id));
            const tripIds = new Set(loadedData.trips.map(t => t.trip_id));
            
            // stop_timesの全てのstop_idがstopsに存在する
            loadedData.stopTimes.forEach(st => {
              expect(stopIds.has(st.stop_id)).toBe(true);
            });
            
            // stop_timesの全てのtrip_idがtripsに存在する
            loadedData.stopTimes.forEach(st => {
              expect(tripIds.has(st.trip_id)).toBe(true);
            });
            
            // tripsの全てのroute_idがroutesに存在する
            loadedData.trips.forEach(trip => {
              expect(routeIds.has(trip.route_id)).toBe(true);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
