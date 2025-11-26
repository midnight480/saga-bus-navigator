/**
 * DataTransformerのプロパティテスト（方向情報）
 * Feature: bidirectional-route-support, Property 3: 時刻表エントリの方向情報
 * Validates: Requirements 1.4
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// direction-detector.jsとdata-loader.jsを読み込み
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

const DirectionDetector = global.DirectionDetector;
const DataTransformer = global.DataTransformer;

describe('DataTransformer - プロパティテスト（方向情報）', () => {
  describe('Property 3: 時刻表エントリの方向情報', () => {
    /**
     * Feature: bidirectional-route-support, Property 3: 時刻表エントリの方向情報
     * Validates: Requirements 1.4
     * 
     * 任意の変換された時刻表エントリは方向情報フィールドを含む
     */
    it('should include direction field in all timetable entries', () => {
      fc.assert(
        fc.property(
          // GTFSデータのジェネレータ
          fc.record({
            stopTimesData: fc.array(
              fc.record({
                trip_id: fc.string({ minLength: 1, maxLength: 20 }),
                stop_id: fc.string({ minLength: 1, maxLength: 10 }),
                arrival_time: fc.tuple(
                  fc.integer({ min: 0, max: 23 }),
                  fc.integer({ min: 0, max: 59 }),
                  fc.integer({ min: 0, max: 59 })
                ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`),
                stop_sequence: fc.integer({ min: 1, max: 100 }).map(String)
              }),
              { minLength: 1, maxLength: 10 }
            ),
            tripsData: fc.array(
              fc.record({
                trip_id: fc.string({ minLength: 1, maxLength: 20 }),
                route_id: fc.string({ minLength: 1, maxLength: 10 }),
                service_id: fc.string({ minLength: 1, maxLength: 10 }),
                direction_id: fc.oneof(
                  fc.constant(''),
                  fc.constant('0'),
                  fc.constant('1'),
                  fc.constant(null),
                  fc.constant(undefined)
                ),
                trip_headsign: fc.oneof(
                  fc.constant(''),
                  fc.string({ minLength: 1, maxLength: 30 })
                )
              }),
              { minLength: 1, maxLength: 10 }
            ),
            routesData: fc.array(
              fc.record({
                route_id: fc.string({ minLength: 1, maxLength: 10 }),
                route_long_name: fc.string({ minLength: 1, maxLength: 30 }),
                agency_id: fc.string({ minLength: 1, maxLength: 10 })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            calendarData: fc.array(
              fc.record({
                service_id: fc.string({ minLength: 1, maxLength: 10 }),
                monday: fc.oneof(fc.constant('0'), fc.constant('1')),
                tuesday: fc.oneof(fc.constant('0'), fc.constant('1')),
                wednesday: fc.oneof(fc.constant('0'), fc.constant('1')),
                thursday: fc.oneof(fc.constant('0'), fc.constant('1')),
                friday: fc.oneof(fc.constant('0'), fc.constant('1')),
                saturday: fc.oneof(fc.constant('0'), fc.constant('1')),
                sunday: fc.oneof(fc.constant('0'), fc.constant('1'))
              }),
              { minLength: 1, maxLength: 5 }
            ),
            agencyData: fc.array(
              fc.record({
                agency_id: fc.string({ minLength: 1, maxLength: 10 }),
                agency_name: fc.string({ minLength: 1, maxLength: 30 })
              }),
              { minLength: 1, maxLength: 3 }
            ),
            stopsData: fc.array(
              fc.record({
                stop_id: fc.string({ minLength: 1, maxLength: 10 }),
                stop_name: fc.string({ minLength: 1, maxLength: 30 })
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          (gtfsData) => {
            // データの整合性を確保（stop_timesのtrip_idがtripsDataに存在するようにする）
            const validTripIds = gtfsData.tripsData.map(t => t.trip_id);
            const validStopIds = gtfsData.stopsData.map(s => s.stop_id);
            const validRouteIds = gtfsData.routesData.map(r => r.route_id);
            const validServiceIds = gtfsData.calendarData.map(c => c.service_id);
            const validAgencyIds = gtfsData.agencyData.map(a => a.agency_id);
            
            // データが空でないことを確認
            if (validTripIds.length === 0 || validStopIds.length === 0 || 
                validRouteIds.length === 0 || validServiceIds.length === 0 || 
                validAgencyIds.length === 0) {
              return true; // スキップ
            }
            
            // stop_timesのtrip_idとstop_idを有効な値に調整
            const adjustedStopTimes = gtfsData.stopTimesData.map(st => ({
              ...st,
              trip_id: validTripIds[0], // 最初の有効なtrip_idを使用
              stop_id: validStopIds[0]  // 最初の有効なstop_idを使用
            }));
            
            // tripsのroute_idとservice_idを有効な値に調整
            const adjustedTrips = gtfsData.tripsData.map(t => ({
              ...t,
              route_id: validRouteIds[0],   // 最初の有効なroute_idを使用
              service_id: validServiceIds[0] // 最初の有効なservice_idを使用
            }));
            
            // routesのagency_idを有効な値に調整
            const adjustedRoutes = gtfsData.routesData.map(r => ({
              ...r,
              agency_id: validAgencyIds[0] // 最初の有効なagency_idを使用
            }));
            
            // transformTimetable()を呼び出し
            const result = DataTransformer.transformTimetable(
              adjustedStopTimes,
              adjustedTrips,
              adjustedRoutes,
              gtfsData.calendarData,
              gtfsData.agencyData,
              gtfsData.stopsData
            );
            
            // 全ての時刻表エントリがdirectionフィールドを持つことを検証
            return result.every(entry => {
              return entry.hasOwnProperty('direction') &&
                     (entry.direction === '0' || entry.direction === '1' || entry.direction === 'unknown');
            });
          }
        ),
        { numRuns: 100 } // 100回イテレーション
      );
    });

    /**
     * direction_idが設定されているtripの場合、その値がdirectionフィールドに反映されることを検証
     * Validates: Requirements 1.1, 1.4
     */
    it('should reflect direction_id in direction field when set', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('0'), fc.constant('1')), // direction_id
          fc.string({ minLength: 1, maxLength: 20 }), // trip_id
          fc.string({ minLength: 1, maxLength: 10 }), // stop_id
          (directionId, tripId, stopId) => {
            // direction_idが設定されているGTFSデータを作成
            const stopTimesData = [{
              trip_id: tripId,
              stop_id: stopId,
              arrival_time: '10:30:00',
              stop_sequence: '1'
            }];
            
            const tripsData = [{
              trip_id: tripId,
              route_id: 'route1',
              service_id: 'service1',
              direction_id: directionId,
              trip_headsign: '佐賀駅'
            }];
            
            const routesData = [{
              route_id: 'route1',
              route_long_name: 'テスト路線',
              agency_id: 'agency1'
            }];
            
            const calendarData = [{
              service_id: 'service1',
              monday: '1',
              tuesday: '1',
              wednesday: '1',
              thursday: '1',
              friday: '1',
              saturday: '0',
              sunday: '0'
            }];
            
            const agencyData = [{
              agency_id: 'agency1',
              agency_name: 'テスト事業者'
            }];
            
            const stopsData = [{
              stop_id: stopId,
              stop_name: 'テストバス停'
            }];
            
            // transformTimetable()を呼び出し
            const result = DataTransformer.transformTimetable(
              stopTimesData,
              tripsData,
              routesData,
              calendarData,
              agencyData,
              stopsData
            );
            
            // directionフィールドがdirection_idと一致することを検証
            return result.length > 0 && result[0].direction === directionId;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * direction_idが空の場合、trip_headsignから推測された方向がdirectionフィールドに反映されることを検証
     * Validates: Requirements 1.2, 1.4
     */
    it('should infer direction from trip_headsign when direction_id is empty', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.string({ minLength: 1, maxLength: 30 })
          ).filter(([h1, h2]) => h1 !== h2), // 2つの異なるheadsign
          fc.string({ minLength: 1, maxLength: 10 }), // stop_id
          ([headsign1, headsign2], stopId) => {
            // 2つの異なるtrip_headsignを持つtripsを作成
            const stopTimesData = [
              {
                trip_id: 'trip1',
                stop_id: stopId,
                arrival_time: '10:30:00',
                stop_sequence: '1'
              },
              {
                trip_id: 'trip2',
                stop_id: stopId,
                arrival_time: '11:30:00',
                stop_sequence: '1'
              }
            ];
            
            const tripsData = [
              {
                trip_id: 'trip1',
                route_id: 'route1',
                service_id: 'service1',
                direction_id: '',
                trip_headsign: headsign1
              },
              {
                trip_id: 'trip2',
                route_id: 'route1',
                service_id: 'service1',
                direction_id: '',
                trip_headsign: headsign2
              }
            ];
            
            const routesData = [{
              route_id: 'route1',
              route_long_name: 'テスト路線',
              agency_id: 'agency1'
            }];
            
            const calendarData = [{
              service_id: 'service1',
              monday: '1',
              tuesday: '1',
              wednesday: '1',
              thursday: '1',
              friday: '1',
              saturday: '0',
              sunday: '0'
            }];
            
            const agencyData = [{
              agency_id: 'agency1',
              agency_name: 'テスト事業者'
            }];
            
            const stopsData = [{
              stop_id: stopId,
              stop_name: 'テストバス停'
            }];
            
            // transformTimetable()を呼び出し
            const result = DataTransformer.transformTimetable(
              stopTimesData,
              tripsData,
              routesData,
              calendarData,
              agencyData,
              stopsData
            );
            
            // 2つのエントリが異なる方向を持つことを検証
            return result.length === 2 &&
                   result[0].direction !== result[1].direction &&
                   (result[0].direction === '0' || result[0].direction === '1') &&
                   (result[1].direction === '0' || result[1].direction === '1');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 方向判定ができない場合、'unknown'がdirectionフィールドに設定されることを検証
     * Validates: Requirements 1.5, 1.4
     */
    it('should set direction to "unknown" when direction cannot be determined', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }), // trip_headsign
          fc.string({ minLength: 1, maxLength: 10 }), // stop_id
          (headsign, stopId) => {
            // 全てのtripsが同じtrip_headsignを持つ場合
            const stopTimesData = [
              {
                trip_id: 'trip1',
                stop_id: stopId,
                arrival_time: '10:30:00',
                stop_sequence: '1'
              },
              {
                trip_id: 'trip2',
                stop_id: stopId,
                arrival_time: '11:30:00',
                stop_sequence: '1'
              }
            ];
            
            const tripsData = [
              {
                trip_id: 'trip1',
                route_id: 'route1',
                service_id: 'service1',
                direction_id: '',
                trip_headsign: headsign
              },
              {
                trip_id: 'trip2',
                route_id: 'route1',
                service_id: 'service1',
                direction_id: '',
                trip_headsign: headsign
              }
            ];
            
            const routesData = [{
              route_id: 'route1',
              route_long_name: 'テスト路線',
              agency_id: 'agency1'
            }];
            
            const calendarData = [{
              service_id: 'service1',
              monday: '1',
              tuesday: '1',
              wednesday: '1',
              thursday: '1',
              friday: '1',
              saturday: '0',
              sunday: '0'
            }];
            
            const agencyData = [{
              agency_id: 'agency1',
              agency_name: 'テスト事業者'
            }];
            
            const stopsData = [{
              stop_id: stopId,
              stop_name: 'テストバス停'
            }];
            
            // transformTimetable()を呼び出し
            const result = DataTransformer.transformTimetable(
              stopTimesData,
              tripsData,
              routesData,
              calendarData,
              agencyData,
              stopsData
            );
            
            // 全てのエントリのdirectionが'unknown'であることを検証
            return result.every(entry => entry.direction === 'unknown');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
