/**
 * DataLoaderのインデックス生成のプロパティテスト
 * Feature: data-structure-optimization, Property 20: インデックス生成の単一実行
 * Validates: Requirements 7.1
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// ブラウザ環境をシミュレート
global.window = global;
global.fetch = vi.fn();
global.JSZip = {
  loadAsync: vi.fn()
};

// data-loader.jsとdirection-detector.jsを読み込み
const fs = await import('fs');
const path = await import('path');

const directionDetectorCode = fs.readFileSync(
  path.join(process.cwd(), 'js/direction-detector.js'),
  'utf-8'
);
eval(directionDetectorCode);

const dataLoaderCode = fs.readFileSync(
  path.join(process.cwd(), 'js/data-loader.js'),
  'utf-8'
);
eval(dataLoaderCode);

const DataLoader = global.DataLoader;
const DirectionDetector = global.DirectionDetector;

describe('DataLoader - インデックス生成', () => {
  describe('Property 20: インデックス生成の単一実行', () => {
    /**
     * Feature: data-structure-optimization, Property 20: インデックス生成の単一実行
     * Validates: Requirements 7.1
     * 
     * 任意のデータ読み込みにおいて、loadAllDataOnce()を複数回呼び出しても
     * インデックス生成は1回のみ実行されることを検証
     */
    it('should generate indexes only once even when loadAllDataOnce() is called multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 呼び出し回数ジェネレータ（2〜10回）
          fc.integer({ min: 2, max: 10 }),
          async (callCount) => {
            // DataLoaderインスタンスを作成
            const dataLoader = new DataLoader();
            
            // generateIndexes()をスパイ
            const originalGenerateIndexes = dataLoader.generateIndexes.bind(dataLoader);
            let generateIndexesCallCount = 0;
            dataLoader.generateIndexes = function() {
              generateIndexesCallCount++;
              return originalGenerateIndexes();
            };
            
            // モックデータを設定（最初の呼び出しでデータが読み込まれる）
            const mockStops = [
              { stop_id: 'stop1', stop_name: 'Stop 1', stop_lat: '33.249', stop_lon: '130.299', location_type: '0', parent_station: '' }
            ];
            const mockStopTimes = [
              { trip_id: 'trip1', stop_id: 'stop1', arrival_time: '08:00:00', departure_time: '08:00:00', stop_sequence: '1' }
            ];
            const mockTrips = [
              { trip_id: 'trip1', route_id: 'route1', service_id: 'service1', trip_headsign: 'Destination 1', direction: '0' }
            ];
            const mockRoutes = [
              { route_id: 'route1', route_long_name: 'Route 1', agency_id: 'agency1' }
            ];
            const mockCalendar = [
              { service_id: 'service1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0' }
            ];
            const mockAgency = [
              { agency_id: 'agency1', agency_name: 'Agency 1' }
            ];
            
            // fetchとJSZipをモック
            const mockZip = {
              file: (filename) => {
                const files = {
                  'stops.txt': 'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nstop1,Stop 1,33.249,130.299,0,',
                  'stop_times.txt': 'trip_id,stop_id,arrival_time,departure_time,stop_sequence\ntrip1,stop1,08:00:00,08:00:00,1',
                  'trips.txt': 'trip_id,route_id,service_id,trip_headsign,direction\ntrip1,route1,service1,Destination 1,0',
                  'routes.txt': 'route_id,route_long_name,agency_id\nroute1,Route 1,agency1',
                  'calendar.txt': 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday\nservice1,1,1,1,1,1,0,0',
                  'agency.txt': 'agency_id,agency_name\nagency1,Agency 1',
                  'fare_attributes.txt': 'fare_id,price,currency_type,payment_method,transfers,agency_id\nfare1,200,JPY,0,0,agency1'
                };
                
                if (files[filename]) {
                  return {
                    async: async () => files[filename]
                  };
                }
                return null;
              },
              files: {
                'stops.txt': {},
                'stop_times.txt': {},
                'trips.txt': {},
                'routes.txt': {},
                'calendar.txt': {},
                'agency.txt': {},
                'fare_attributes.txt': {}
              }
            };
            
            global.fetch.mockResolvedValue({
              ok: true,
              arrayBuffer: async () => new ArrayBuffer(0)
            });
            
            global.JSZip.loadAsync.mockResolvedValue(mockZip);
            
            // loadAllDataOnce()を複数回呼び出し
            for (let i = 0; i < callCount; i++) {
              await dataLoader.loadAllDataOnce();
            }
            
            // generateIndexes()が1回のみ呼び出されたことを検証
            return generateIndexesCallCount === 1;
          }
        ),
        { numRuns: 100 } // 100回イテレーション
      );
    });

    /**
     * インデックスが正しく生成されることを検証
     */
    it('should generate all indexes correctly on first call', async () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // モックデータを設定
      const mockZip = {
        file: (filename) => {
          const files = {
            'stops.txt': 'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nstop1,Stop 1,33.249,130.299,0,station1\nstop2,Stop 2,33.250,130.300,0,station1',
            'stop_times.txt': 'trip_id,stop_id,arrival_time,departure_time,stop_sequence\ntrip1,stop1,08:00:00,08:00:00,1\ntrip1,stop2,08:10:00,08:10:00,2\ntrip2,stop1,09:00:00,09:00:00,1',
            'trips.txt': 'trip_id,route_id,service_id,trip_headsign,direction\ntrip1,route1,service1,Destination 1,0\ntrip2,route1,service1,Destination 2,1',
            'routes.txt': 'route_id,route_long_name,agency_id\nroute1,Route 1,agency1',
            'calendar.txt': 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday\nservice1,1,1,1,1,1,0,0',
            'agency.txt': 'agency_id,agency_name\nagency1,Agency 1',
            'fare_attributes.txt': 'fare_id,price,currency_type,payment_method,transfers,agency_id\nfare1,200,JPY,0,0,agency1'
          };
          
          if (files[filename]) {
            return {
              async: async () => files[filename]
            };
          }
          return null;
        },
        files: {
          'stops.txt': {},
          'stop_times.txt': {},
          'trips.txt': {},
          'routes.txt': {},
          'calendar.txt': {},
          'agency.txt': {},
          'fare_attributes.txt': {}
        }
      };
      
      global.fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0)
      });
      
      global.JSZip.loadAsync.mockResolvedValue(mockZip);
      
      // loadAllDataOnce()を呼び出し
      await dataLoader.loadAllDataOnce();
      
      // 全てのインデックスが生成されたことを検証
      expect(dataLoader.timetableByRouteAndDirection).not.toBeNull();
      expect(dataLoader.tripStops).not.toBeNull();
      expect(dataLoader.routeMetadata).not.toBeNull();
      expect(dataLoader.stopToTrips).not.toBeNull();
      expect(dataLoader.routeToTrips).not.toBeNull();
      expect(dataLoader.stopsGrouped).not.toBeNull();
      
      // timetableByRouteAndDirectionの内容を検証
      expect(dataLoader.timetableByRouteAndDirection).toHaveProperty('route1');
      expect(dataLoader.timetableByRouteAndDirection.route1).toHaveProperty('0');
      expect(dataLoader.timetableByRouteAndDirection.route1).toHaveProperty('1');
      
      // tripStopsの内容を検証
      expect(dataLoader.tripStops).toHaveProperty('trip1');
      expect(dataLoader.tripStops.trip1).toHaveLength(2);
      expect(dataLoader.tripStops.trip1[0].stopId).toBe('stop1');
      expect(dataLoader.tripStops.trip1[1].stopId).toBe('stop2');
      
      // routeMetadataの内容を検証
      expect(dataLoader.routeMetadata).toHaveProperty('route1');
      expect(dataLoader.routeMetadata.route1.directions).toContain('0');
      expect(dataLoader.routeMetadata.route1.directions).toContain('1');
      
      // stopToTripsの内容を検証
      expect(dataLoader.stopToTrips).toHaveProperty('stop1');
      expect(dataLoader.stopToTrips.stop1).toContain('trip1');
      expect(dataLoader.stopToTrips.stop1).toContain('trip2');
      
      // routeToTripsの内容を検証
      expect(dataLoader.routeToTrips).toHaveProperty('route1');
      expect(dataLoader.routeToTrips.route1).toHaveProperty('0');
      expect(dataLoader.routeToTrips.route1).toHaveProperty('1');
      expect(dataLoader.routeToTrips.route1['0']).toContain('trip1');
      expect(dataLoader.routeToTrips.route1['1']).toContain('trip2');
      
      // stopsGroupedの内容を検証
      expect(dataLoader.stopsGrouped).toHaveProperty('station1');
      expect(dataLoader.stopsGrouped.station1).toHaveLength(2);
    });

    /**
     * キャッシュクリア後に再度インデックスが生成されることを検証
     */
    it('should regenerate indexes after cache is cleared', async () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // generateIndexes()をスパイ
      const originalGenerateIndexes = dataLoader.generateIndexes.bind(dataLoader);
      let generateIndexesCallCount = 0;
      dataLoader.generateIndexes = function() {
        generateIndexesCallCount++;
        return originalGenerateIndexes();
      };
      
      // モックデータを設定
      const mockZip = {
        file: (filename) => {
          const files = {
            'stops.txt': 'stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station\nstop1,Stop 1,33.249,130.299,0,',
            'stop_times.txt': 'trip_id,stop_id,arrival_time,departure_time,stop_sequence\ntrip1,stop1,08:00:00,08:00:00,1',
            'trips.txt': 'trip_id,route_id,service_id,trip_headsign,direction\ntrip1,route1,service1,Destination 1,0',
            'routes.txt': 'route_id,route_long_name,agency_id\nroute1,Route 1,agency1',
            'calendar.txt': 'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday\nservice1,1,1,1,1,1,0,0',
            'agency.txt': 'agency_id,agency_name\nagency1,Agency 1',
            'fare_attributes.txt': 'fare_id,price,currency_type,payment_method,transfers,agency_id\nfare1,200,JPY,0,0,agency1'
          };
          
          if (files[filename]) {
            return {
              async: async () => files[filename]
            };
          }
          return null;
        },
        files: {
          'stops.txt': {},
          'stop_times.txt': {},
          'trips.txt': {},
          'routes.txt': {},
          'calendar.txt': {},
          'agency.txt': {},
          'fare_attributes.txt': {}
        }
      };
      
      global.fetch.mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(0)
      });
      
      global.JSZip.loadAsync.mockResolvedValue(mockZip);
      
      // 最初の呼び出し
      await dataLoader.loadAllDataOnce();
      expect(generateIndexesCallCount).toBe(1);
      
      // キャッシュをクリア
      dataLoader.clearCache();
      
      // 2回目の呼び出し
      await dataLoader.loadAllDataOnce();
      expect(generateIndexesCallCount).toBe(2);
      
      // インデックスが再生成されたことを検証
      expect(dataLoader.timetableByRouteAndDirection).not.toBeNull();
      expect(dataLoader.tripStops).not.toBeNull();
      expect(dataLoader.routeMetadata).not.toBeNull();
      expect(dataLoader.stopToTrips).not.toBeNull();
      expect(dataLoader.routeToTrips).not.toBeNull();
      expect(dataLoader.stopsGrouped).not.toBeNull();
    });
  });

  describe('isDataLoaded() - インデックスチェック', () => {
    /**
     * isDataLoaded()がインデックスの存在もチェックすることを検証
     */
    it('should return false if indexes are not generated', () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // データを手動で設定（インデックスなし）
      dataLoader.busStops = [];
      dataLoader.timetable = [];
      dataLoader.fares = [];
      dataLoader.fareRules = [];
      dataLoader.stopTimes = [];
      dataLoader.trips = [];
      dataLoader.routes = [];
      dataLoader.calendar = [];
      dataLoader.gtfsStops = [];
      
      // インデックスが生成されていないため、falseを返すべき
      expect(dataLoader.isDataLoaded()).toBe(false);
    });

    /**
     * isDataLoaded()が全てのデータとインデックスが存在する場合にtrueを返すことを検証
     */
    it('should return true if all data and indexes are loaded', () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // データとインデックスを手動で設定
      dataLoader.busStops = [];
      dataLoader.timetable = [];
      dataLoader.fares = [];
      dataLoader.fareRules = [];
      dataLoader.stopTimes = [];
      dataLoader.trips = [];
      dataLoader.routes = [];
      dataLoader.calendar = [];
      dataLoader.gtfsStops = [];
      dataLoader.timetableByRouteAndDirection = {};
      dataLoader.tripStops = {};
      dataLoader.routeMetadata = {};
      dataLoader.stopToTrips = {};
      dataLoader.routeToTrips = {};
      dataLoader.stopsGrouped = {};
      
      // 全てのデータとインデックスが存在するため、trueを返すべき
      expect(dataLoader.isDataLoaded()).toBe(true);
    });
  });

  describe('clearCache() - インデックスクリア', () => {
    /**
     * clearCache()が全てのインデックスをクリアすることを検証
     */
    it('should clear all indexes', () => {
      // DataLoaderインスタンスを作成
      const dataLoader = new DataLoader();
      
      // データとインデックスを手動で設定
      dataLoader.busStops = [];
      dataLoader.timetable = [];
      dataLoader.fares = [];
      dataLoader.fareRules = [];
      dataLoader.timetableByRouteAndDirection = {};
      dataLoader.tripStops = {};
      dataLoader.routeMetadata = {};
      dataLoader.stopToTrips = {};
      dataLoader.routeToTrips = {};
      dataLoader.stopsGrouped = {};
      
      // キャッシュをクリア
      dataLoader.clearCache();
      
      // 全てのインデックスがnullになっていることを検証
      expect(dataLoader.busStops).toBeNull();
      expect(dataLoader.timetable).toBeNull();
      expect(dataLoader.fares).toBeNull();
      expect(dataLoader.fareRules).toBeNull();
      expect(dataLoader.timetableByRouteAndDirection).toBeNull();
      expect(dataLoader.tripStops).toBeNull();
      expect(dataLoader.routeMetadata).toBeNull();
      expect(dataLoader.stopToTrips).toBeNull();
      expect(dataLoader.routeToTrips).toBeNull();
      expect(dataLoader.stopsGrouped).toBeNull();
    });
  });
});
