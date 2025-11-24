/**
 * DirectionDetectorのプロパティテスト
 * Feature: bidirectional-route-support, Property 1: 方向情報の存在
 * Feature: bidirectional-route-support, Property 2: 方向判定の一貫性
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// direction-detector.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const directionDetectorCode = fs.readFileSync(
  path.join(process.cwd(), 'js/direction-detector.js'),
  'utf-8'
);
eval(directionDetectorCode);

const DirectionDetector = global.DirectionDetector;

describe('DirectionDetector - プロパティテスト', () => {
  describe('Property 1: 方向情報の存在', () => {
    /**
     * Feature: bidirectional-route-support, Property 1: 方向情報の存在
     * Validates: Requirements 1.1, 1.2, 1.5
     * 
     * 任意のGTFSデータ読み込み後、全てのtripは方向情報（direction_id、推測された方向、またはデフォルト値）を持つ
     */
    it('should always return a direction value for any trip', () => {
      fc.assert(
        fc.property(
          // tripジェネレータ
          fc.record({
            trip_id: fc.string({ minLength: 1, maxLength: 20 }),
            route_id: fc.string({ minLength: 1, maxLength: 10 }),
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
          // 同じ路線の他のtripsジェネレータ
          fc.array(
            fc.record({
              trip_id: fc.string({ minLength: 1, maxLength: 20 }),
              route_id: fc.string({ minLength: 1, maxLength: 10 }),
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
            { minLength: 0, maxLength: 20 }
          ),
          (trip, otherTrips) => {
            // 同じroute_idを持つtripsを作成
            const allTrips = [trip, ...otherTrips.map(t => ({ ...t, route_id: trip.route_id }))];
            
            // detectDirection()を呼び出し
            const direction = DirectionDetector.detectDirection(trip, trip.route_id, allTrips);
            
            // 方向情報が必ず存在することを検証（'0', '1', 'unknown'のいずれか）
            return direction === '0' || direction === '1' || direction === 'unknown';
          }
        ),
        { numRuns: 100 } // 100回イテレーション
      );
    });

    /**
     * direction_idが設定されている場合、その値が返されることを検証
     * Validates: Requirements 1.1
     */
    it('should return direction_id when it is set', () => {
      fc.assert(
        fc.property(
          // direction_idが設定されているtripジェネレータ
          fc.record({
            trip_id: fc.string({ minLength: 1, maxLength: 20 }),
            route_id: fc.string({ minLength: 1, maxLength: 10 }),
            direction_id: fc.oneof(fc.constant('0'), fc.constant('1')),
            trip_headsign: fc.string({ minLength: 1, maxLength: 30 })
          }),
          fc.array(
            fc.record({
              trip_id: fc.string({ minLength: 1, maxLength: 20 }),
              route_id: fc.string({ minLength: 1, maxLength: 10 }),
              direction_id: fc.oneof(fc.constant('0'), fc.constant('1')),
              trip_headsign: fc.string({ minLength: 1, maxLength: 30 })
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (trip, otherTrips) => {
            const allTrips = [trip, ...otherTrips.map(t => ({ ...t, route_id: trip.route_id }))];
            
            const direction = DirectionDetector.detectDirection(trip, trip.route_id, allTrips);
            
            // direction_idが設定されている場合、その値が返されることを検証
            return direction === trip.direction_id;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * direction_idが空の場合、trip_headsignから方向を推測することを検証
     * Validates: Requirements 1.2
     */
    it('should infer direction from trip_headsign when direction_id is empty', () => {
      fc.assert(
        fc.property(
          // 2つの異なるtrip_headsignを生成
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.string({ minLength: 1, maxLength: 30 })
          ).filter(([h1, h2]) => h1 !== h2),
          fc.string({ minLength: 1, maxLength: 10 }), // route_id
          ([headsign1, headsign2], routeId) => {
            // 2つの異なるtrip_headsignを持つtripsを作成
            const trip1 = {
              trip_id: 'trip1',
              route_id: routeId,
              direction_id: '',
              trip_headsign: headsign1
            };
            const trip2 = {
              trip_id: 'trip2',
              route_id: routeId,
              direction_id: '',
              trip_headsign: headsign2
            };
            
            const allTrips = [trip1, trip2];
            
            const direction1 = DirectionDetector.detectDirection(trip1, routeId, allTrips);
            const direction2 = DirectionDetector.detectDirection(trip2, routeId, allTrips);
            
            // 2つの異なるtrip_headsignを持つtripsは異なる方向として判定されることを検証
            return direction1 !== direction2 && 
                   (direction1 === '0' || direction1 === '1') &&
                   (direction2 === '0' || direction2 === '1');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 方向判定ができない場合、'unknown'が返されることを検証
     * Validates: Requirements 1.5
     */
    it('should return "unknown" when direction cannot be determined', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }), // route_id
          fc.string({ minLength: 1, maxLength: 30 }), // trip_headsign
          (routeId, headsign) => {
            // 全てのtripsが同じtrip_headsignを持つ場合
            const trip = {
              trip_id: 'trip1',
              route_id: routeId,
              direction_id: '',
              trip_headsign: headsign
            };
            const allTrips = [
              trip,
              { trip_id: 'trip2', route_id: routeId, direction_id: '', trip_headsign: headsign },
              { trip_id: 'trip3', route_id: routeId, direction_id: '', trip_headsign: headsign }
            ];
            
            const direction = DirectionDetector.detectDirection(trip, routeId, allTrips);
            
            // 全てのtripsが同じtrip_headsignを持つ場合、'unknown'が返されることを検証
            return direction === 'unknown';
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: 方向判定の一貫性', () => {
    /**
     * Feature: bidirectional-route-support, Property 2: 方向判定の一貫性
     * Validates: Requirements 1.3
     * 
     * 任意の路線において、同じtrip_headsignを持つ全てのtripは同じ方向として分類される
     */
    it('should classify all trips with the same trip_headsign as the same direction', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }), // route_id
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 30 }),
            fc.string({ minLength: 1, maxLength: 30 })
          ).filter(([h1, h2]) => h1 !== h2), // 2つの異なるheadsign
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 10 }), // trip_ids
          (routeId, [headsign1, headsign2], tripIds) => {
            // 2つのグループのtripsを作成（それぞれ異なるtrip_headsignを持つ）
            const group1TripIds = tripIds.slice(0, Math.ceil(tripIds.length / 2));
            const group2TripIds = tripIds.slice(Math.ceil(tripIds.length / 2));
            
            // 両方のグループが空でないことを確認
            if (group1TripIds.length === 0 || group2TripIds.length === 0) {
              return true; // スキップ
            }
            
            const allTrips = [
              ...group1TripIds.map(id => ({
                trip_id: id,
                route_id: routeId,
                direction_id: '',
                trip_headsign: headsign1
              })),
              ...group2TripIds.map(id => ({
                trip_id: id,
                route_id: routeId,
                direction_id: '',
                trip_headsign: headsign2
              }))
            ];
            
            // 各グループの全てのtripsが同じ方向として判定されることを検証
            const group1Directions = group1TripIds.map(id => {
              const trip = allTrips.find(t => t.trip_id === id);
              return DirectionDetector.detectDirection(trip, routeId, allTrips);
            });
            
            const group2Directions = group2TripIds.map(id => {
              const trip = allTrips.find(t => t.trip_id === id);
              return DirectionDetector.detectDirection(trip, routeId, allTrips);
            });
            
            // グループ1の全てのtripsが同じ方向であることを検証
            const group1AllSame = group1Directions.every(d => d === group1Directions[0]);
            
            // グループ2の全てのtripsが同じ方向であることを検証
            const group2AllSame = group2Directions.every(d => d === group2Directions[0]);
            
            // 2つのグループが異なる方向であることを検証
            const groupsDifferent = group1Directions[0] !== group2Directions[0];
            
            return group1AllSame && group2AllSame && groupsDifferent;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('findTripsForRoute - バス停間経路検索', () => {
    /**
     * バス停間の経路が存在するtripを正しく検索できることを検証
     * Validates: Requirements 2.1, 2.2
     */
    it('should find trips that connect two stops in the correct order', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }), // fromStopId
          fc.string({ minLength: 1, maxLength: 10 }), // toStopId
          fc.array(
            fc.record({
              trip_id: fc.string({ minLength: 1, maxLength: 20 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              stop_sequence: fc.integer({ min: 1, max: 100 })
            }),
            { minLength: 2, maxLength: 50 }
          ),
          (fromStopId, toStopId, stopTimesData) => {
            // fromStopIdとtoStopIdが異なることを確認
            if (fromStopId === toStopId) {
              return true; // スキップ
            }
            
            // 有効な経路を持つtripを作成
            const validTripId = 'valid_trip';
            const stopTimes = [
              {
                trip_id: validTripId,
                stop_id: fromStopId,
                stop_sequence: '10'
              },
              {
                trip_id: validTripId,
                stop_id: toStopId,
                stop_sequence: '20'
              },
              ...stopTimesData
            ];
            
            const tripsIndex = {
              [validTripId]: { trip_id: validTripId, route_id: 'route1' }
            };
            
            // findTripsForRoute()を呼び出し
            const result = DirectionDetector.findTripsForRoute(
              fromStopId,
              toStopId,
              stopTimes,
              tripsIndex
            );
            
            // 有効なtripが結果に含まれることを検証
            return result.includes(validTripId);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * stop_sequenceが逆順の場合、tripが検索結果に含まれないことを検証
     * Validates: Requirements 2.2
     */
    it('should not find trips when stop_sequence is in reverse order', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }), // fromStopId
          fc.string({ minLength: 1, maxLength: 10 }), // toStopId
          (fromStopId, toStopId) => {
            // fromStopIdとtoStopIdが異なることを確認
            if (fromStopId === toStopId) {
              return true; // スキップ
            }
            
            // 逆順のstop_sequenceを持つtripを作成
            const invalidTripId = 'invalid_trip';
            const stopTimes = [
              {
                trip_id: invalidTripId,
                stop_id: fromStopId,
                stop_sequence: '20' // 降車バス停より後
              },
              {
                trip_id: invalidTripId,
                stop_id: toStopId,
                stop_sequence: '10' // 乗車バス停より前
              }
            ];
            
            const tripsIndex = {
              [invalidTripId]: { trip_id: invalidTripId, route_id: 'route1' }
            };
            
            // findTripsForRoute()を呼び出し
            const result = DirectionDetector.findTripsForRoute(
              fromStopId,
              toStopId,
              stopTimes,
              tripsIndex
            );
            
            // 逆順のtripが結果に含まれないことを検証
            return !result.includes(invalidTripId);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 重複するtrip_idが除去されることを検証
     */
    it('should remove duplicate trip_ids from results', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 10 }), // fromStopId
          fc.string({ minLength: 1, maxLength: 10 }), // toStopId
          fc.string({ minLength: 1, maxLength: 20 }), // trip_id
          (fromStopId, toStopId, tripId) => {
            // fromStopIdとtoStopIdが異なることを確認
            if (fromStopId === toStopId) {
              return true; // スキップ
            }
            
            // 同じtripが複数回出現するstop_timesを作成
            const stopTimes = [
              { trip_id: tripId, stop_id: fromStopId, stop_sequence: '10' },
              { trip_id: tripId, stop_id: toStopId, stop_sequence: '20' },
              { trip_id: tripId, stop_id: fromStopId, stop_sequence: '30' }, // 重複
              { trip_id: tripId, stop_id: toStopId, stop_sequence: '40' }  // 重複
            ];
            
            const tripsIndex = {
              [tripId]: { trip_id: tripId, route_id: 'route1' }
            };
            
            // findTripsForRoute()を呼び出し
            const result = DirectionDetector.findTripsForRoute(
              fromStopId,
              toStopId,
              stopTimes,
              tripsIndex
            );
            
            // 結果に重複がないことを検証
            const uniqueResult = [...new Set(result)];
            return result.length === uniqueResult.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
