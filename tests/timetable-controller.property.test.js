/**
 * TimetableControllerのプロパティテスト
 * Feature: bidirectional-route-support, Property 4: バス停順序による検索フィルタリング
 * Feature: bidirectional-route-support, Property 5: 双方向検索の対称性
 * Feature: bidirectional-route-support, Property 6: 検索結果の行き先表示
 * Feature: bidirectional-route-support, Property 7: 同時刻複数方向の表示
 * Validates: Requirements 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
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

describe('TimetableController - プロパティテスト', () => {
  describe('Property 4: バス停順序による検索フィルタリング', () => {
    /**
     * Feature: bidirectional-route-support, Property 4: バス停順序による検索フィルタリング
     * Validates: Requirements 2.1, 2.2
     * 
     * 任意のバス停ペア(A, B)とtripにおいて、Aのstop_sequenceがBのstop_sequenceより小さい場合のみ、
     * そのtripはA→Bの検索結果に含まれる
     */
    it('should only include trips where fromStop stop_sequence < toStop stop_sequence', () => {
      fc.assert(
        fc.property(
          // テストデータジェネレータ
          fc.record({
            fromStopId: fc.string({ minLength: 1, maxLength: 10 }),
            toStopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            fromSequence: fc.integer({ min: 1, max: 50 }),
            toSequence: fc.integer({ min: 1, max: 50 }),
            serviceId: fc.constant('weekday')
          }).filter(data => 
            data.fromStopId !== data.toStopId && 
            data.fromSequence !== data.toSequence
          ),
          (data) => {
            // テストデータを構築
            const stops = [
              { stop_id: data.fromStopId, stop_name: 'From Stop', stop_lat: '33.0', stop_lon: '130.0' },
              { stop_id: data.toStopId, stop_name: 'To Stop', stop_lat: '33.1', stop_lon: '130.1' }
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
                stop_id: data.fromStopId,
                stop_sequence: String(data.fromSequence),
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
              },
              {
                trip_id: data.tripId,
                stop_id: data.toStopId,
                stop_sequence: String(data.toSequence),
                departure_time: '10:30:00',
                arrival_time: '10:30:00'
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
            
            // getTimetableBetweenStops()を呼び出し
            const result = controller.getTimetableBetweenStops(
              data.fromStopId,
              data.toStopId,
              data.routeId,
              '平日'
            );
            
            // stop_sequenceの順序が正しい場合のみ結果に含まれることを検証
            if (data.fromSequence < data.toSequence) {
              // 正順の場合、結果に含まれるべき
              return result.length > 0 && result.some(entry => entry.tripId === data.tripId);
            } else {
              // 逆順の場合、結果に含まれないべき
              return result.length === 0;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: 双方向検索の対称性', () => {
    /**
     * Feature: bidirectional-route-support, Property 5: 双方向検索の対称性
     * Validates: Requirements 2.3, 3.1
     * 
     * 任意の往復路線のバス停ペア(A, B)において、A→Bの検索で見つかるtripと
     * B→Aの検索で見つかるtripは異なるtripセットである
     */
    it('should return different trip sets for A→B and B→A searches', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopAId: fc.string({ minLength: 1, maxLength: 10 }),
            stopBId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            trip1Id: fc.string({ minLength: 1, maxLength: 20 }),
            trip2Id: fc.string({ minLength: 1, maxLength: 20 }),
            serviceId: fc.constant('weekday')
          }).filter(data => 
            data.stopAId !== data.stopBId && 
            data.trip1Id !== data.trip2Id
          ),
          (data) => {
            // テストデータを構築（往復両方向のtripsを含む）
            const stops = [
              { stop_id: data.stopAId, stop_name: 'Stop A', stop_lat: '33.0', stop_lon: '130.0' },
              { stop_id: data.stopBId, stop_name: 'Stop B', stop_lat: '33.1', stop_lon: '130.1' }
            ];
            
            const routes = [
              { route_id: data.routeId, route_long_name: 'Test Route', agency_id: 'test' }
            ];
            
            const trips = [
              { 
                trip_id: data.trip1Id, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: '',
                trip_headsign: 'To B'
              },
              { 
                trip_id: data.trip2Id, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: '',
                trip_headsign: 'To A'
              }
            ];
            
            const stopTimes = [
              // Trip1: A→B
              {
                trip_id: data.trip1Id,
                stop_id: data.stopAId,
                stop_sequence: '10',
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
              },
              {
                trip_id: data.trip1Id,
                stop_id: data.stopBId,
                stop_sequence: '20',
                departure_time: '10:30:00',
                arrival_time: '10:30:00'
              },
              // Trip2: B→A
              {
                trip_id: data.trip2Id,
                stop_id: data.stopBId,
                stop_sequence: '10',
                departure_time: '11:00:00',
                arrival_time: '11:00:00'
              },
              {
                trip_id: data.trip2Id,
                stop_id: data.stopAId,
                stop_sequence: '20',
                departure_time: '11:30:00',
                arrival_time: '11:30:00'
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
            
            // A→Bの検索
            const resultAtoB = controller.getTimetableBetweenStops(
              data.stopAId,
              data.stopBId,
              data.routeId,
              '平日'
            );
            
            // B→Aの検索
            const resultBtoA = controller.getTimetableBetweenStops(
              data.stopBId,
              data.stopAId,
              data.routeId,
              '平日'
            );
            
            // 両方向で結果が存在することを確認
            if (resultAtoB.length === 0 || resultBtoA.length === 0) {
              return true; // スキップ
            }
            
            // A→BとB→Aで異なるtripセットが返されることを検証
            const tripsAtoB = new Set(resultAtoB.map(entry => entry.tripId));
            const tripsBtoA = new Set(resultBtoA.map(entry => entry.tripId));
            
            // 2つのセットが異なることを検証（共通要素がない）
            const hasCommon = [...tripsAtoB].some(id => tripsBtoA.has(id));
            return !hasCommon;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: 検索結果の行き先表示', () => {
    /**
     * Feature: bidirectional-route-support, Property 6: 検索結果の行き先表示
     * Validates: Requirements 3.2
     * 
     * 任意の検索結果において、各バスエントリはtrip_headsignフィールドを含む
     */
    it('should include trip_headsign field in all search results', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 30 }),
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
            
            // getTimetable()を呼び出し
            const result = controller.getTimetable(data.stopId, data.routeId, '平日');
            
            // 全ての結果エントリがtripHeadsignフィールドを含むことを検証
            return result.length > 0 && result.every(entry => 
              entry.hasOwnProperty('tripHeadsign') && 
              entry.tripHeadsign === data.tripHeadsign
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * getTimetableBetweenStops()の結果もtrip_headsignを含むことを検証
     */
    it('should include trip_headsign in getTimetableBetweenStops results', () => {
      fc.assert(
        fc.property(
          fc.record({
            fromStopId: fc.string({ minLength: 1, maxLength: 10 }),
            toStopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 30 }),
            serviceId: fc.constant('weekday')
          }).filter(data => data.fromStopId !== data.toStopId),
          (data) => {
            // テストデータを構築
            const stops = [
              { stop_id: data.fromStopId, stop_name: 'From Stop', stop_lat: '33.0', stop_lon: '130.0' },
              { stop_id: data.toStopId, stop_name: 'To Stop', stop_lat: '33.1', stop_lon: '130.1' }
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
                stop_id: data.fromStopId,
                stop_sequence: '10',
                departure_time: '10:00:00',
                arrival_time: '10:00:00'
              },
              {
                trip_id: data.tripId,
                stop_id: data.toStopId,
                stop_sequence: '20',
                departure_time: '10:30:00',
                arrival_time: '10:30:00'
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
            
            // getTimetableBetweenStops()を呼び出し
            const result = controller.getTimetableBetweenStops(
              data.fromStopId,
              data.toStopId,
              data.routeId,
              '平日'
            );
            
            // 全ての結果エントリがtripHeadsignフィールドを含むことを検証
            return result.length > 0 && result.every(entry => 
              entry.hasOwnProperty('tripHeadsign') && 
              entry.tripHeadsign === data.tripHeadsign
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: 同時刻複数方向の表示', () => {
    /**
     * Feature: bidirectional-route-support, Property 7: 同時刻複数方向の表示
     * Validates: Requirements 3.3
     * 
     * 任意の同じ時刻に複数方向のバスが存在する場合、全ての方向のバスが検索結果に含まれる
     */
    it('should include all directions when multiple buses exist at the same time', () => {
      fc.assert(
        fc.property(
          fc.record({
            stopId: fc.string({ minLength: 1, maxLength: 10 }),
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            trip1Id: fc.string({ minLength: 1, maxLength: 20 }),
            trip2Id: fc.string({ minLength: 1, maxLength: 20 }),
            departureTime: fc.constant('10:00:00'),
            serviceId: fc.constant('weekday')
          }).filter(data => data.trip1Id !== data.trip2Id),
          (data) => {
            // テストデータを構築（同じ時刻に2つの異なる方向のtrips）
            const stops = [
              { stop_id: data.stopId, stop_name: 'Test Stop', stop_lat: '33.0', stop_lon: '130.0' }
            ];
            
            const routes = [
              { route_id: data.routeId, route_long_name: 'Test Route', agency_id: 'test' }
            ];
            
            const trips = [
              { 
                trip_id: data.trip1Id, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: '',
                trip_headsign: 'Direction 1'
              },
              { 
                trip_id: data.trip2Id, 
                route_id: data.routeId, 
                service_id: data.serviceId,
                direction_id: '',
                trip_headsign: 'Direction 2'
              }
            ];
            
            const stopTimes = [
              {
                trip_id: data.trip1Id,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: data.departureTime,
                arrival_time: data.departureTime
              },
              {
                trip_id: data.trip2Id,
                stop_id: data.stopId,
                stop_sequence: '10',
                departure_time: data.departureTime,
                arrival_time: data.departureTime
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
            
            // 同じ時刻に2つの異なるtripsが結果に含まれることを検証
            const tripIds = result.map(entry => entry.tripId);
            return tripIds.includes(data.trip1Id) && tripIds.includes(data.trip2Id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
