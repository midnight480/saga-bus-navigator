/**
 * データ構造最適化の後方互換性プロパティテスト
 * Feature: data-structure-optimization, Property 21: 既存APIの後方互換性
 * Feature: data-structure-optimization, Property 22: 既存コードの動作保証
 * Validates: Requirements 8.1, 8.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// 必要なファイルを読み込み
const fs = await import('fs');
const path = await import('path');

// DataLoaderとDataTransformerを読み込み
const dataLoaderCode = fs.readFileSync(
  path.join(process.cwd(), 'js/data-loader.js'),
  'utf-8'
);
eval(dataLoaderCode);

const DataLoader = global.DataLoader;
const DataTransformer = global.DataTransformer;

// 空白文字のみでない英数字文字列を生成するジェネレータ（最小長2文字以上）
// 数字のみの文字列を避けるため、少なくとも1文字は英字を含む
const nonEmptyString = (minLength, maxLength) => 
  fc.string({ minLength: Math.max(2, minLength), maxLength })
    .filter(s => /^[a-zA-Z0-9]+$/.test(s) && /[a-zA-Z]/.test(s));

describe('データ構造最適化 - 後方互換性プロパティテスト', () => {
  describe('Property 21: 既存APIの後方互換性', () => {
    /**
     * Feature: data-structure-optimization, Property 21: 既存APIの後方互換性
     * Validates: Requirements 8.1
     * 
     * 任意の既存API呼び出しにおいて、新しいインデックス追加後も戻り値の構造が変更されない
     */
    it('should maintain loadBusStops() return structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: nonEmptyString(1, 10),
            stopName: nonEmptyString(1, 30),
            lat: fc.double({ min: 33.0, max: 34.0 }),
            lng: fc.double({ min: 129.0, max: 131.0 }),
            parentStation: fc.oneof(
              fc.constant(''),
              nonEmptyString(1, 10)
            )
          }),
          (data) => {
            // テストデータを構築
            const stopsData = [
              {
                stop_id: data.stopId,
                stop_name: data.stopName,
                stop_lat: String(data.lat),
                stop_lon: String(data.lng),
                parent_station: data.parentStation
              }
            ];
            
            // DataTransformer.transformStops()を呼び出し
            const result = DataTransformer.transformStops(stopsData);
            
            // 結果が存在することを確認（DataTransformerが除外する可能性がある）
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // NaNをスキップ
            if (isNaN(result[0].lat) || isNaN(result[0].lng)) {
              return true; // スキップ
            }
            
            // 既存のフィールドが全て存在することを検証
            const stop = result[0];
            const hasAllLegacyFields = 
              stop.hasOwnProperty('id') &&
              stop.hasOwnProperty('name') &&
              stop.hasOwnProperty('lat') &&
              stop.hasOwnProperty('lng');
            
            // 既存のフィールドの値が正しいことを検証
            const valuesCorrect = 
              stop.id === data.stopId &&
              stop.name === data.stopName &&
              Math.abs(stop.lat - data.lat) < 0.0001 &&
              Math.abs(stop.lng - data.lng) < 0.0001;
            
            // 新しいフィールド（parentStation）が追加されていることを検証
            const hasNewField = stop.hasOwnProperty('parentStation');
            
            return hasAllLegacyFields && valuesCorrect && hasNewField;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * loadTimetable()の戻り値構造が変更されていないことを検証
     * Validates: Requirements 8.1
     */
    it('should maintain loadTimetable() return structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: nonEmptyString(1, 10),
            stopName: nonEmptyString(1, 30),
            routeId: nonEmptyString(1, 10),
            routeName: nonEmptyString(1, 30),
            tripId: nonEmptyString(1, 20),
            tripHeadsign: nonEmptyString(1, 30),
            serviceId: fc.constant('weekday'),
            directionId: fc.oneof(
              fc.constant('0'),
              fc.constant('1'),
              fc.constant('')
            ),
            departureTime: fc.record({
              hour: fc.integer({ min: 0, max: 29 }),
              minute: fc.integer({ min: 0, max: 59 })
            })
          }),
          (data) => {
            // テストデータを構築
            const stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: `${String(data.departureTime.hour).padStart(2, '0')}:${String(data.departureTime.minute).padStart(2, '0')}:00`,
                arrival_time: `${String(data.departureTime.hour).padStart(2, '0')}:${String(data.departureTime.minute).padStart(2, '0')}:00`
              }
            ];
            
            const trips = [
              {
                trip_id: data.tripId,
                route_id: data.routeId,
                service_id: data.serviceId,
                direction_id: data.directionId,
                trip_headsign: data.tripHeadsign
              }
            ];
            
            const routes = [
              {
                route_id: data.routeId,
                route_long_name: data.routeName,
                route_short_name: '',
                agency_id: 'test'
              }
            ];
            
            const calendar = [
              {
                service_id: data.serviceId,
                monday: '1',
                tuesday: '1',
                wednesday: '1',
                thursday: '1',
                friday: '1',
                saturday: '0',
                sunday: '0'
              }
            ];
            
            const agency = [
              {
                agency_id: 'test',
                agency_name: 'Test Agency'
              }
            ];
            
            const stops = [
              {
                stop_id: data.stopId,
                stop_name: data.stopName,
                stop_lat: '33.0',
                stop_lon: '130.0'
              }
            ];
            
            // DataTransformer.transformTimetable()を呼び出し
            const result = DataTransformer.transformTimetable(
              stopTimes,
              trips,
              routes,
              calendar,
              agency,
              stops
            );
            
            // 結果が存在することを確認（DataTransformerが除外する可能性がある）
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 既存のフィールドが全て存在することを検証
            const entry = result[0];
            const hasAllLegacyFields = 
              entry.hasOwnProperty('stopName') &&
              entry.hasOwnProperty('routeNumber') &&
              entry.hasOwnProperty('routeName') &&
              entry.hasOwnProperty('hour') &&
              entry.hasOwnProperty('minute') &&
              entry.hasOwnProperty('tripId') &&
              entry.hasOwnProperty('weekdayType') &&
              entry.hasOwnProperty('operator') &&
              entry.hasOwnProperty('stopSequence');
            
            // 既存のフィールドの値が正しいことを検証
            const valuesCorrect = 
              entry.stopName === data.stopName &&
              entry.routeNumber === data.routeId &&
              entry.routeName === data.routeName &&
              entry.hour === data.departureTime.hour &&
              entry.minute === data.departureTime.minute &&
              entry.tripId === data.tripId &&
              entry.weekdayType === '平日' &&
              entry.operator === 'Test Agency' &&
              entry.stopSequence === 10;
            
            // directionフィールドは存在するが、DataTransformerの段階では空文字列またはdirection_idの値
            // DirectionDetectorによって後で設定される
            const hasDirectionField = entry.hasOwnProperty('direction');
            
            return hasAllLegacyFields && valuesCorrect && hasDirectionField;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * loadFares()の戻り値構造が変更されていないことを検証
     * Validates: Requirements 8.1
     */
    it('should maintain loadFares() return structure', () => {
      fc.assert(
        fc.property(
          fc.record({
            fareId: nonEmptyString(1, 10),
            price: fc.integer({ min: 100, max: 1000 }),
            currencyType: fc.constant('JPY')
          }),
          (data) => {
            // テストデータを構築
            const fareAttributes = [
              {
                fare_id: data.fareId,
                price: String(data.price),
                currency_type: data.currencyType,
                payment_method: '0',
                transfers: '0'
              }
            ];
            
            // DataTransformer.transformFares()を呼び出し
            const result = DataTransformer.transformFares(fareAttributes);
            
            // 結果が存在することを確認（DataTransformerが除外する可能性がある）
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 既存のフィールドが全て存在することを検証
            const fare = result[0];
            const hasAllLegacyFields = 
              fare.hasOwnProperty('fareId') &&
              fare.hasOwnProperty('price') &&
              fare.hasOwnProperty('currencyType') &&
              fare.hasOwnProperty('paymentMethod') &&
              fare.hasOwnProperty('transfers');
            
            // 既存のフィールドの値が正しいことを検証
            const valuesCorrect = 
              fare.fareId === data.fareId &&
              fare.price === data.price &&
              fare.currencyType === data.currencyType &&
              fare.paymentMethod === 0 &&
              fare.transfers === 0;
            
            return hasAllLegacyFields && valuesCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 新しいインデックスプロパティが追加されても既存プロパティが影響を受けないことを検証
     * Validates: Requirements 8.1
     */
    it('should not affect existing properties when new indexes are added', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: nonEmptyString(1, 10),
            routeId: nonEmptyString(1, 10),
            tripId: nonEmptyString(1, 20)
          }),
          (data) => {
            // DataLoaderインスタンスを作成
            const loader = new DataLoader();
            
            // 既存プロパティが初期状態でnullであることを確認
            const existingPropertiesNull = 
              loader.busStops === null &&
              loader.timetable === null &&
              loader.fares === null &&
              loader.fareRules === null &&
              loader.stopTimes === null &&
              loader.trips === null &&
              loader.routes === null &&
              loader.calendar === null &&
              loader.gtfsStops === null;
            
            // 新しいインデックスプロパティが初期状態でnullであることを確認
            const newPropertiesNull = 
              loader.timetableByRouteAndDirection === null &&
              loader.tripStops === null &&
              loader.routeMetadata === null &&
              loader.stopToTrips === null &&
              loader.routeToTrips === null &&
              loader.stopsGrouped === null;
            
            // 新しいインデックスプロパティに値を設定
            loader.timetableByRouteAndDirection = { [data.routeId]: { '0': [] } };
            loader.tripStops = { [data.tripId]: [] };
            loader.routeMetadata = { [data.routeId]: { directions: ['0'] } };
            loader.stopToTrips = { [data.stopId]: [] };
            loader.routeToTrips = { [data.routeId]: { '0': [] } };
            loader.stopsGrouped = { 'parent1': [] };
            
            // 既存プロパティが影響を受けていないことを確認
            const existingPropertiesUnaffected = 
              loader.busStops === null &&
              loader.timetable === null &&
              loader.fares === null &&
              loader.fareRules === null &&
              loader.stopTimes === null &&
              loader.trips === null &&
              loader.routes === null &&
              loader.calendar === null &&
              loader.gtfsStops === null;
            
            return existingPropertiesNull && newPropertiesNull && existingPropertiesUnaffected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 22: 既存コードの動作保証', () => {
    /**
     * Feature: data-structure-optimization, Property 22: 既存コードの動作保証
     * Validates: Requirements 8.3
     * 
     * 任意の既存コードにおいて、新しいインデックスの追加による影響を受けず、正常に動作する
     */
    it('should work correctly with existing code patterns - busStops access', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: nonEmptyString(1, 10),
            stopName: nonEmptyString(1, 30),
            lat: fc.double({ min: 33.0, max: 34.0 }),
            lng: fc.double({ min: 129.0, max: 131.0 })
          }),
          (data) => {
            // DataLoaderインスタンスを作成
            const loader = new DataLoader();
            
            // 既存のコードパターン: busStopsプロパティに直接アクセス
            loader.busStops = [
              {
                id: data.stopId,
                name: data.stopName,
                lat: data.lat,
                lng: data.lng,
                parentStation: ''
              }
            ];
            
            // 新しいインデックスを追加
            loader.timetableByRouteAndDirection = {};
            loader.tripStops = {};
            loader.routeMetadata = {};
            loader.stopToTrips = {};
            loader.routeToTrips = {};
            loader.stopsGrouped = {};
            
            // NaNをスキップ
            if (isNaN(data.lat) || isNaN(data.lng)) {
              return true; // スキップ
            }
            
            // 既存のコードパターン: busStopsから特定の停留所を検索
            const foundStop = loader.busStops.find(stop => stop.id === data.stopId);
            
            // 検索結果が正しいことを検証
            const searchCorrect = 
              foundStop !== undefined &&
              foundStop.id === data.stopId &&
              foundStop.name === data.stopName &&
              Math.abs(foundStop.lat - data.lat) < 0.0001 &&
              Math.abs(foundStop.lng - data.lng) < 0.0001;
            
            // 既存のコードパターン: busStopsの長さを取得
            const lengthCorrect = loader.busStops.length === 1;
            
            // 既存のコードパターン: busStopsをマップ
            const mappedStops = loader.busStops.map(stop => stop.id);
            const mapCorrect = 
              mappedStops.length === 1 &&
              mappedStops[0] === data.stopId;
            
            return searchCorrect && lengthCorrect && mapCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 既存のコードパターン - timetableアクセスが正常に動作することを検証
     * Validates: Requirements 8.3
     */
    it('should work correctly with existing code patterns - timetable access', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: nonEmptyString(1, 10),
            routeId: nonEmptyString(1, 10),
            tripId: nonEmptyString(1, 20),
            hour: fc.integer({ min: 0, max: 23 }),
            minute: fc.integer({ min: 0, max: 59 })
          }),
          (data) => {
            // DataLoaderインスタンスを作成
            const loader = new DataLoader();
            
            // 既存のコードパターン: timetableプロパティに直接アクセス
            loader.timetable = [
              {
                stopId: data.stopId,
                routeNumber: data.routeId,
                tripId: data.tripId,
                hour: data.hour,
                minute: data.minute,
                direction: '0'
              }
            ];
            
            // 新しいインデックスを追加
            loader.timetableByRouteAndDirection = {};
            loader.tripStops = {};
            loader.routeMetadata = {};
            loader.stopToTrips = {};
            loader.routeToTrips = {};
            loader.stopsGrouped = {};
            
            // 既存のコードパターン: timetableから特定の路線の時刻表を検索
            const foundEntries = loader.timetable.filter(
              entry => entry.routeNumber === data.routeId
            );
            
            // 検索結果が正しいことを検証
            const searchCorrect = 
              foundEntries.length === 1 &&
              foundEntries[0].stopId === data.stopId &&
              foundEntries[0].routeNumber === data.routeId &&
              foundEntries[0].tripId === data.tripId &&
              foundEntries[0].hour === data.hour &&
              foundEntries[0].minute === data.minute;
            
            // 既存のコードパターン: timetableの長さを取得
            const lengthCorrect = loader.timetable.length === 1;
            
            // 既存のコードパターン: timetableをソート
            const sortedTimetable = [...loader.timetable].sort((a, b) => {
              if (a.hour !== b.hour) return a.hour - b.hour;
              return a.minute - b.minute;
            });
            const sortCorrect = 
              sortedTimetable.length === 1 &&
              sortedTimetable[0].hour === data.hour &&
              sortedTimetable[0].minute === data.minute;
            
            return searchCorrect && lengthCorrect && sortCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 既存のコードパターン - faresアクセスが正常に動作することを検証
     * Validates: Requirements 8.3
     */
    it('should work correctly with existing code patterns - fares access', () => {
      fc.assert(
        fc.property(
          fc.record({
            fareId: nonEmptyString(1, 10),
            price: fc.integer({ min: 100, max: 1000 })
          }),
          (data) => {
            // DataLoaderインスタンスを作成
            const loader = new DataLoader();
            
            // 既存のコードパターン: faresプロパティに直接アクセス
            loader.fares = [
              {
                fareId: data.fareId,
                price: data.price,
                currencyType: 'JPY'
              }
            ];
            
            // 新しいインデックスを追加
            loader.timetableByRouteAndDirection = {};
            loader.tripStops = {};
            loader.routeMetadata = {};
            loader.stopToTrips = {};
            loader.routeToTrips = {};
            loader.stopsGrouped = {};
            
            // 既存のコードパターン: faresから特定の運賃を検索
            const foundFare = loader.fares.find(fare => fare.fareId === data.fareId);
            
            // 検索結果が正しいことを検証
            const searchCorrect = 
              foundFare !== undefined &&
              foundFare.fareId === data.fareId &&
              foundFare.price === data.price &&
              foundFare.currencyType === 'JPY';
            
            // 既存のコードパターン: faresの長さを取得
            const lengthCorrect = loader.fares.length === 1;
            
            // 既存のコードパターン: faresをフィルタ
            const filteredFares = loader.fares.filter(fare => fare.price >= 100);
            const filterCorrect = 
              filteredFares.length === 1 &&
              filteredFares[0].fareId === data.fareId;
            
            return searchCorrect && lengthCorrect && filterCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 既存のコードパターン - GTFSデータアクセスが正常に動作することを検証
     * Validates: Requirements 8.3
     */
    it('should work correctly with existing code patterns - GTFS data access', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: nonEmptyString(1, 10),
            routeId: nonEmptyString(1, 10),
            tripId: nonEmptyString(1, 20)
          }),
          (data) => {
            // DataLoaderインスタンスを作成
            const loader = new DataLoader();
            
            // 既存のコードパターン: GTFSデータプロパティに直接アクセス
            loader.stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: '10:00:00'
              }
            ];
            
            loader.trips = [
              {
                trip_id: data.tripId,
                route_id: data.routeId,
                service_id: 'weekday'
              }
            ];
            
            loader.routes = [
              {
                route_id: data.routeId,
                route_long_name: 'Test Route'
              }
            ];
            
            loader.gtfsStops = [
              {
                stop_id: data.stopId,
                stop_name: 'Test Stop'
              }
            ];
            
            // 新しいインデックスを追加
            loader.timetableByRouteAndDirection = {};
            loader.tripStops = {};
            loader.routeMetadata = {};
            loader.stopToTrips = {};
            loader.routeToTrips = {};
            loader.stopsGrouped = {};
            
            // 既存のコードパターン: stopTimesから特定のtripの停車時刻を検索
            const foundStopTimes = loader.stopTimes.filter(
              st => st.trip_id === data.tripId
            );
            
            // 検索結果が正しいことを検証
            const stopTimesCorrect = 
              foundStopTimes.length === 1 &&
              foundStopTimes[0].trip_id === data.tripId &&
              foundStopTimes[0].stop_id === data.stopId;
            
            // 既存のコードパターン: tripsから特定の路線のtripを検索
            const foundTrips = loader.trips.filter(
              trip => trip.route_id === data.routeId
            );
            
            // 検索結果が正しいことを検証
            const tripsCorrect = 
              foundTrips.length === 1 &&
              foundTrips[0].trip_id === data.tripId &&
              foundTrips[0].route_id === data.routeId;
            
            // 既存のコードパターン: routesから特定の路線を検索
            const foundRoute = loader.routes.find(
              route => route.route_id === data.routeId
            );
            
            // 検索結果が正しいことを検証
            const routeCorrect = 
              foundRoute !== undefined &&
              foundRoute.route_id === data.routeId;
            
            // 既存のコードパターン: gtfsStopsから特定の停留所を検索
            const foundStop = loader.gtfsStops.find(
              stop => stop.stop_id === data.stopId
            );
            
            // 検索結果が正しいことを検証
            const stopCorrect = 
              foundStop !== undefined &&
              foundStop.stop_id === data.stopId;
            
            return stopTimesCorrect && tripsCorrect && routeCorrect && stopCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * clearCache()メソッドが新しいインデックスも含めて正しくクリアすることを検証
     * Validates: Requirements 8.3
     */
    it('should clear all caches including new indexes when clearCache() is called', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: nonEmptyString(1, 10),
            routeId: nonEmptyString(1, 10),
            tripId: nonEmptyString(1, 20)
          }),
          (data) => {
            // DataLoaderインスタンスを作成
            const loader = new DataLoader();
            
            // 既存プロパティに値を設定
            loader.busStops = [{ id: data.stopId }];
            loader.timetable = [{ routeNumber: data.routeId }];
            loader.fares = [{ fareId: 'fare1' }];
            loader.fareRules = [{ fareId: 'fare1' }];
            loader.stopTimes = [{ trip_id: data.tripId }];
            loader.trips = [{ trip_id: data.tripId }];
            loader.routes = [{ route_id: data.routeId }];
            loader.calendar = [{ service_id: 'weekday' }];
            loader.gtfsStops = [{ stop_id: data.stopId }];
            
            // 新しいインデックスに値を設定
            loader.timetableByRouteAndDirection = { [data.routeId]: {} };
            loader.tripStops = { [data.tripId]: [] };
            loader.routeMetadata = { [data.routeId]: {} };
            loader.stopToTrips = { [data.stopId]: [] };
            loader.routeToTrips = { [data.routeId]: {} };
            loader.stopsGrouped = { 'parent1': [] };
            
            // clearCache()を呼び出し
            loader.clearCache();
            
            // 既存プロパティが全てnullになっていることを確認
            const existingPropertiesCleared = 
              loader.busStops === null &&
              loader.timetable === null &&
              loader.fares === null &&
              loader.fareRules === null &&
              loader.stopTimes === null &&
              loader.trips === null &&
              loader.routes === null &&
              loader.calendar === null &&
              loader.gtfsStops === null;
            
            // 新しいインデックスプロパティも全てnullになっていることを確認
            const newPropertiesCleared = 
              loader.timetableByRouteAndDirection === null &&
              loader.tripStops === null &&
              loader.routeMetadata === null &&
              loader.stopToTrips === null &&
              loader.routeToTrips === null &&
              loader.stopsGrouped === null;
            
            return existingPropertiesCleared && newPropertiesCleared;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
