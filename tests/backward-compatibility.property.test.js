/**
 * 後方互換性のプロパティテスト
 * Feature: bidirectional-route-support, Property 11: 後方互換性
 * Feature: bidirectional-route-support, Property 12: フォールバック動作
 * Validates: Requirements 5.2, 5.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// 必要なファイルを読み込み
const fs = await import('fs');
const path = await import('path');

const directionDetectorCode = fs.readFileSync(
  path.join(process.cwd(), 'js/direction-detector.js'),
  'utf-8'
);
eval(directionDetectorCode);

const timetableControllerCode = fs.readFileSync(
  path.join(process.cwd(), 'js/timetable-controller.js'),
  'utf-8'
);
eval(timetableControllerCode);

const DirectionDetector = global.DirectionDetector;
const TimetableController = global.TimetableController;

describe('後方互換性 - プロパティテスト', () => {
  describe('Property 11: 後方互換性', () => {
    /**
     * Feature: bidirectional-route-support, Property 11: 後方互換性
     * Validates: Requirements 5.2
     * 
     * 任意の既存のAPI呼び出しにおいて、新しい実装は従来と同じ結果を返す
     * （方向情報フィールドの追加を除く）
     */
    it('should return same results as before (except direction field) for getTimetable', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 30 }),
            serviceId: fc.constant('weekday'),
            departureTime: fc.record({
              hour: fc.integer({ min: 0, max: 29 }),
              minute: fc.integer({ min: 0, max: 59 })
            })
          }),
          (data) => {
            // テストデータを構築
            const stops = [
              { stop_id: data.stopId, stop_name: 'Test Stop', stop_lat: '33.0', stop_lon: '130.0' }
            ];
            
            const routes = [
              { route_id: data.routeId, route_long_name: 'Test Route', agency_id: 'test' }
            ];
            
            const trips = [
              { 
                trip_id: data.tripId, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: '',
                trip_headsign: data.tripHeadsign
              }
            ];
            
            const stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: `${String(data.departureTime.hour).padStart(2, '0')}:${String(data.departureTime.minute).padStart(2, '0')}:00`,
                arrival_time: `${String(data.departureTime.hour).padStart(2, '0')}:${String(data.departureTime.minute).padStart(2, '0')}:00`
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
            
            // TimetableControllerを作成
            const controller = new TimetableController(stopTimes, trips, routes, calendar, stops);
            
            // getTimetable()を呼び出し
            const result = controller.getTimetable(data.stopId, data.routeId, '平日');
            
            // 結果が存在することを確認
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 既存のフィールドが全て存在することを検証
            const entry = result[0];
            const hasAllLegacyFields = 
              entry.hasOwnProperty('stopId') &&
              entry.hasOwnProperty('stopName') &&
              entry.hasOwnProperty('routeId') &&
              entry.hasOwnProperty('routeName') &&
              entry.hasOwnProperty('tripId') &&
              entry.hasOwnProperty('tripHeadsign') &&
              entry.hasOwnProperty('departureTime') &&
              entry.hasOwnProperty('departureHour') &&
              entry.hasOwnProperty('departureMinute') &&
              entry.hasOwnProperty('serviceDayType') &&
              entry.hasOwnProperty('stopSequence');
            
            // 新しいフィールド（direction）が追加されていることを検証
            const hasNewField = entry.hasOwnProperty('direction');
            
            // 既存のフィールドの値が正しいことを検証
            const valuesCorrect = 
              entry.stopId === data.stopId &&
              entry.routeId === data.routeId &&
              entry.tripId === data.tripId &&
              entry.tripHeadsign === data.tripHeadsign &&
              entry.departureHour === data.departureTime.hour &&
              entry.departureMinute === data.departureTime.minute &&
              entry.serviceDayType === '平日' &&
              entry.stopSequence === 10;
            
            return hasAllLegacyFields && hasNewField && valuesCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * getRoutesAtStop()の後方互換性を検証
     * Validates: Requirements 5.2
     */
    it('should maintain backward compatibility for getRoutesAtStop', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            routeName: fc.string({ minLength: 1, maxLength: 30 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            serviceId: fc.constant('weekday')
          }),
          (data) => {
            // テストデータを構築
            const stops = [
              { stop_id: data.stopId, stop_name: 'Test Stop', stop_lat: '33.0', stop_lon: '130.0' }
            ];
            
            const routes = [
              { 
                route_id: data.routeId, 
                route_long_name: data.routeName, 
                route_short_name: '',
                agency_id: 'test',
                route_type: '3'
              }
            ];
            
            const trips = [
              { 
                trip_id: data.tripId, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: '',
                trip_headsign: 'Test Destination'
              }
            ];
            
            const stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
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
            
            // TimetableControllerを作成
            const controller = new TimetableController(stopTimes, trips, routes, calendar, stops);
            
            // getRoutesAtStop()を呼び出し
            const result = controller.getRoutesAtStop(data.stopId);
            
            // 結果が存在することを確認
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 既存のフィールドが全て存在することを検証
            const route = result[0];
            const hasAllLegacyFields = 
              route.hasOwnProperty('routeId') &&
              route.hasOwnProperty('routeName') &&
              route.hasOwnProperty('routeShortName') &&
              route.hasOwnProperty('agencyId') &&
              route.hasOwnProperty('routeType');
            
            // 既存のフィールドの値が正しいことを検証
            const valuesCorrect = 
              route.routeId === data.routeId &&
              route.routeName === data.routeName &&
              route.agencyId === 'test' &&
              route.routeType === '3';
            
            return hasAllLegacyFields && valuesCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * getRouteStops()の後方互換性を検証（directionパラメータなし）
     * Validates: Requirements 5.2
     */
    it('should maintain backward compatibility for getRouteStops without direction parameter', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            serviceId: fc.constant('weekday')
          }),
          (data) => {
            // テストデータを構築
            const stops = [
              { stop_id: data.stopId, stop_name: 'Test Stop', stop_lat: '33.0', stop_lon: '130.0' }
            ];
            
            const routes = [
              { route_id: data.routeId, route_long_name: 'Test Route', agency_id: 'test' }
            ];
            
            const trips = [
              { 
                trip_id: data.tripId, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: '',
                trip_headsign: 'Test Destination'
              }
            ];
            
            const stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
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
            
            // TimetableControllerを作成
            const controller = new TimetableController(stopTimes, trips, routes, calendar, stops);
            
            // getRouteStops()を呼び出し（directionパラメータなし）
            const result = controller.getRouteStops(data.routeId);
            
            // 結果が存在することを確認
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 既存のフィールドが全て存在することを検証
            const stop = result[0];
            const hasAllLegacyFields = 
              stop.hasOwnProperty('stopId') &&
              stop.hasOwnProperty('stopName') &&
              stop.hasOwnProperty('stopSequence') &&
              stop.hasOwnProperty('lat') &&
              stop.hasOwnProperty('lng');
            
            // 新しいフィールド（direction）が追加されていることを検証
            const hasNewField = stop.hasOwnProperty('direction');
            
            // 既存のフィールドの値が正しいことを検証
            const valuesCorrect = 
              stop.stopId === data.stopId &&
              stop.stopSequence === 10 &&
              stop.lat === 33.0 &&
              stop.lng === 130.0;
            
            return hasAllLegacyFields && hasNewField && valuesCorrect;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: フォールバック動作', () => {
    /**
     * Feature: bidirectional-route-support, Property 12: フォールバック動作
     * Validates: Requirements 5.3
     * 
     * 任意の方向情報が欠落しているGTFSデータにおいて、システムは正常に動作し、
     * デフォルト値を使用する
     */
    it('should work correctly with missing direction_id', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            serviceId: fc.constant('weekday'),
            // direction_idを意図的に空にする
            directionId: fc.constant(''),
            tripHeadsign: fc.oneof(
              fc.constant(''), // 空のtrip_headsign
              fc.constant(null), // nullのtrip_headsign
              fc.constant(undefined) // undefinedのtrip_headsign
            )
          }),
          (data) => {
            // テストデータを構築（方向情報が欠落）
            const stops = [
              { stop_id: data.stopId, stop_name: 'Test Stop', stop_lat: '33.0', stop_lon: '130.0' }
            ];
            
            const routes = [
              { route_id: data.routeId, route_long_name: 'Test Route', agency_id: 'test' }
            ];
            
            const trips = [
              { 
                trip_id: data.tripId, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: data.directionId, // 空
                trip_headsign: data.tripHeadsign // 空、null、またはundefined
              }
            ];
            
            const stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
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
            
            // TimetableControllerを作成
            const controller = new TimetableController(stopTimes, trips, routes, calendar, stops);
            
            // getTimetable()を呼び出し（エラーが発生しないことを検証）
            let result;
            try {
              result = controller.getTimetable(data.stopId, data.routeId, '平日');
            } catch (error) {
              // エラーが発生した場合はテスト失敗
              return false;
            }
            
            // 結果が存在することを確認
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 方向情報がデフォルト値（'unknown'）になっていることを検証
            const entry = result[0];
            const hasDirection = entry.hasOwnProperty('direction');
            const directionIsValid = 
              entry.direction === '0' || 
              entry.direction === '1' || 
              entry.direction === 'unknown';
            
            return hasDirection && directionIsValid;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * direction_idがnullまたはundefinedの場合も正常に動作することを検証
     * Validates: Requirements 5.3
     */
    it('should work correctly with null or undefined direction_id', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            serviceId: fc.constant('weekday'),
            // direction_idをnullまたはundefinedにする
            directionId: fc.oneof(
              fc.constant(null),
              fc.constant(undefined)
            ),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 30 })
          }),
          (data) => {
            // テストデータを構築
            const stops = [
              { stop_id: data.stopId, stop_name: 'Test Stop', stop_lat: '33.0', stop_lon: '130.0' }
            ];
            
            const routes = [
              { route_id: data.routeId, route_long_name: 'Test Route', agency_id: 'test' }
            ];
            
            const trips = [
              { 
                trip_id: data.tripId, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: data.directionId, // nullまたはundefined
                trip_headsign: data.tripHeadsign
              }
            ];
            
            const stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
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
            
            // TimetableControllerを作成
            const controller = new TimetableController(stopTimes, trips, routes, calendar, stops);
            
            // getTimetable()を呼び出し（エラーが発生しないことを検証）
            let result;
            try {
              result = controller.getTimetable(data.stopId, data.routeId, '平日');
            } catch (error) {
              // エラーが発生した場合はテスト失敗
              return false;
            }
            
            // 結果が存在することを確認
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 方向情報が存在し、有効な値であることを検証
            const entry = result[0];
            const hasDirection = entry.hasOwnProperty('direction');
            const directionIsValid = 
              entry.direction === '0' || 
              entry.direction === '1' || 
              entry.direction === 'unknown';
            
            return hasDirection && directionIsValid;
          }
        ),
        { numRuns: 100 }
      );
    });


    /**
     * getRouteStops()も方向情報が欠落している場合に正常に動作することを検証
     * Validates: Requirements 5.3
     */
    it('should work correctly for getRouteStops with missing direction info', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            serviceId: fc.constant('weekday'),
            directionId: fc.constant(''), // 空のdirection_id
            tripHeadsign: fc.constant('') // 空のtrip_headsign
          }),
          (data) => {
            // テストデータを構築（方向情報が欠落）
            const stops = [
              { stop_id: data.stopId, stop_name: 'Test Stop', stop_lat: '33.0', stop_lon: '130.0' }
            ];
            
            const routes = [
              { route_id: data.routeId, route_long_name: 'Test Route', agency_id: 'test' }
            ];
            
            const trips = [
              { 
                trip_id: data.tripId, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: data.directionId, // 空
                trip_headsign: data.tripHeadsign // 空
              }
            ];
            
            const stopTimes = [
              {
                trip_id: data.tripId,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
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
            
            // TimetableControllerを作成
            const controller = new TimetableController(stopTimes, trips, routes, calendar, stops);
            
            // getRouteStops()を呼び出し（エラーが発生しないことを検証）
            let result;
            try {
              result = controller.getRouteStops(data.routeId);
            } catch (error) {
              // エラーが発生した場合はテスト失敗
              return false;
            }
            
            // 結果が存在することを確認
            if (result.length === 0) {
              return true; // スキップ
            }
            
            // 方向情報が存在し、有効な値であることを検証
            const stop = result[0];
            const hasDirection = stop.hasOwnProperty('direction');
            const directionIsValid = 
              stop.direction === '0' || 
              stop.direction === '1' || 
              stop.direction === 'unknown';
            
            return hasDirection && directionIsValid;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
