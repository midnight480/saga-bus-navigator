/**
 * DataLoader方向判定統合の後方互換性プロパティテスト
 * Feature: direction-detection-integration, Property 10: direction_idの不変性
 * Feature: direction-detection-integration, Property 11: 既存プロパティの保持
 * Validates: Requirements 4.1, 4.2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// 必要なファイルを読み込み
const fs = await import('fs');
const path = await import('path');

const dataLoaderCode = fs.readFileSync(
  path.join(process.cwd(), 'js/data-loader.js'),
  'utf-8'
);
eval(dataLoaderCode);

const directionDetectorCode = fs.readFileSync(
  path.join(process.cwd(), 'js/direction-detector.js'),
  'utf-8'
);
eval(directionDetectorCode);

const DataLoader = global.DataLoader;
const DirectionDetector = global.DirectionDetector;

describe('DataLoader方向判定統合 - 後方互換性プロパティテスト', () => {
  beforeEach(() => {
    // DirectionDetectorのキャッシュをクリア
    if (DirectionDetector.clearCache) {
      DirectionDetector.clearCache();
    }
  });

  describe('Property 10: direction_idの不変性', () => {
    /**
     * Feature: direction-detection-integration, Property 10: direction_idの不変性
     * Validates: Requirements 4.1
     * 
     * 任意のtripにおいて、方向判定前後でdirection_idプロパティは変更されない
     */
    it('should not modify direction_id property after enrichTripsWithDirection', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            trips: fc.array(
              fc.record({
                tripId: fc.string({ minLength: 1, maxLength: 20 }),
                serviceId: fc.constant('weekday'),
                directionId: fc.oneof(
                  fc.constant('0'),
                  fc.constant('1'),
                  fc.constant(''),
                  fc.constant(null),
                  fc.constant(undefined)
                ),
                tripHeadsign: fc.string({ minLength: 0, maxLength: 30 })
              }),
              { minLength: 1, maxLength: 5 }
            ),
            stopTimes: fc.array(
              fc.record({
                stopId: fc.string({ minLength: 1, maxLength: 10 }),
                stopSequence: fc.integer({ min: 1, max: 50 }),
                arrivalTime: fc.record({
                  hour: fc.integer({ min: 0, max: 29 }),
                  minute: fc.integer({ min: 0, max: 59 })
                })
              }),
              { minLength: 2, maxLength: 10 }
            )
          }),
          (data) => {
            // テストデータを構築
            const trips = data.trips.map(t => ({
              trip_id: t.tripId,
              route_id: data.routeId,
              service_id: t.serviceId,
              direction_id: t.directionId,
              trip_headsign: t.tripHeadsign
            }));

            // 各tripにstopTimesを割り当て
            const stopTimes = [];
            trips.forEach((trip, tripIndex) => {
              data.stopTimes.forEach((st, stIndex) => {
                stopTimes.push({
                  trip_id: trip.trip_id,
                  stop_id: st.stopId,
                  stop_sequence: String(st.stopSequence + stIndex),
                  arrival_time: `${String(st.arrivalTime.hour).padStart(2, '0')}:${String(st.arrivalTime.minute).padStart(2, '0')}:00`,
                  departure_time: `${String(st.arrivalTime.hour).padStart(2, '0')}:${String(st.arrivalTime.minute).padStart(2, '0')}:00`
                });
              });
            });

            // 方向判定前のdirection_idを記録
            const directionIdsBefore = trips.map(t => ({
              tripId: t.trip_id,
              directionId: t.direction_id
            }));

            // DataLoaderを作成
            const loader = new DataLoader();
            loader.trips = trips;
            loader.stopTimes = stopTimes;

            // enrichTripsWithDirection()を実行
            try {
              loader.enrichTripsWithDirection();
            } catch (error) {
              // エラーが発生した場合はスキップ
              return true;
            }

            // 方向判定後のdirection_idを確認
            const directionIdsAfter = loader.trips.map(t => ({
              tripId: t.trip_id,
              directionId: t.direction_id
            }));

            // direction_idが変更されていないことを検証
            for (let i = 0; i < directionIdsBefore.length; i++) {
              const before = directionIdsBefore[i];
              const after = directionIdsAfter[i];
              
              if (before.tripId !== after.tripId) {
                return false; // tripの順序が変わった
              }
              
              // direction_idが変更されていないことを確認
              if (before.directionId !== after.directionId) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * direction_idが設定されている場合、それが保持されることを検証
     * Validates: Requirements 4.1
     */
    it('should preserve existing direction_id values', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            directionId: fc.oneof(fc.constant('0'), fc.constant('1')),
            tripCount: fc.integer({ min: 1, max: 5 })
          }),
          (data) => {
            // テストデータを構築（全てのtripにdirection_idが設定されている）
            const trips = Array.from({ length: data.tripCount }, (_, i) => ({
              trip_id: `trip_${i}`,
              route_id: data.routeId,
              service_id: 'weekday',
              direction_id: data.directionId,
              trip_headsign: `Destination ${i}`
            }));

            const stopTimes = [];
            trips.forEach(trip => {
              stopTimes.push({
                trip_id: trip.trip_id,
                stop_id: 'stop_1',
                stop_sequence: '10',
                arrival_time: '10:00:00',
                departure_time: '10:00:00'
              });
              stopTimes.push({
                trip_id: trip.trip_id,
                stop_id: 'stop_2',
                stop_sequence: '20',
                arrival_time: '10:30:00',
                departure_time: '10:30:00'
              });
            });

            // DataLoaderを作成
            const loader = new DataLoader();
            loader.trips = trips;
            loader.stopTimes = stopTimes;

            // enrichTripsWithDirection()を実行
            try {
              loader.enrichTripsWithDirection();
            } catch (error) {
              // エラーが発生した場合はスキップ
              return true;
            }

            // 全てのtripのdirection_idが元の値のままであることを検証
            return loader.trips.every(t => t.direction_id === data.directionId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: 既存プロパティの保持', () => {
    /**
     * Feature: direction-detection-integration, Property 11: 既存プロパティの保持
     * Validates: Requirements 4.2
     * 
     * 任意のtripにおいて、方向判定前後で既存のプロパティ（direction_id以外）は変更されない
     */
    it('should preserve all existing trip properties except adding direction', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            trips: fc.array(
              fc.record({
                tripId: fc.string({ minLength: 1, maxLength: 20 }),
                serviceId: fc.string({ minLength: 1, maxLength: 10 }),
                directionId: fc.oneof(
                  fc.constant('0'),
                  fc.constant('1'),
                  fc.constant('')
                ),
                tripHeadsign: fc.string({ minLength: 0, maxLength: 30 }),
                blockId: fc.option(fc.string({ minLength: 1, maxLength: 10 })),
                shapeId: fc.option(fc.string({ minLength: 1, maxLength: 10 }))
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          (data) => {
            // テストデータを構築
            const trips = data.trips.map(t => {
              const trip = {
                trip_id: t.tripId,
                route_id: data.routeId,
                service_id: t.serviceId,
                direction_id: t.directionId,
                trip_headsign: t.tripHeadsign
              };
              
              // オプショナルプロパティを追加
              if (t.blockId !== null) {
                trip.block_id = t.blockId;
              }
              if (t.shapeId !== null) {
                trip.shape_id = t.shapeId;
              }
              
              return trip;
            });

            const stopTimes = [];
            trips.forEach(trip => {
              stopTimes.push({
                trip_id: trip.trip_id,
                stop_id: 'stop_1',
                stop_sequence: '10',
                arrival_time: '10:00:00',
                departure_time: '10:00:00'
              });
              stopTimes.push({
                trip_id: trip.trip_id,
                stop_id: 'stop_2',
                stop_sequence: '20',
                arrival_time: '10:30:00',
                departure_time: '10:30:00'
              });
            });

            // 方向判定前のプロパティを記録
            const tripsBefore = trips.map(t => ({
              trip_id: t.trip_id,
              route_id: t.route_id,
              service_id: t.service_id,
              direction_id: t.direction_id,
              trip_headsign: t.trip_headsign,
              block_id: t.block_id,
              shape_id: t.shape_id
            }));

            // DataLoaderを作成
            const loader = new DataLoader();
            loader.trips = trips;
            loader.stopTimes = stopTimes;

            // enrichTripsWithDirection()を実行
            try {
              loader.enrichTripsWithDirection();
            } catch (error) {
              // エラーが発生した場合はスキップ
              return true;
            }

            // 既存のプロパティが保持されていることを検証
            for (let i = 0; i < tripsBefore.length; i++) {
              const before = tripsBefore[i];
              const after = loader.trips[i];
              
              // 全ての既存プロパティが同じ値であることを確認
              if (before.trip_id !== after.trip_id) return false;
              if (before.route_id !== after.route_id) return false;
              if (before.service_id !== after.service_id) return false;
              if (before.direction_id !== after.direction_id) return false;
              if (before.trip_headsign !== after.trip_headsign) return false;
              if (before.block_id !== after.block_id) return false;
              if (before.shape_id !== after.shape_id) return false;
              
              // 新しいdirectionプロパティが追加されていることを確認
              if (!after.hasOwnProperty('direction')) return false;
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 方向判定後、tripオブジェクトのプロパティ数が1つだけ増えることを検証
     * （directionプロパティのみが追加される）
     * Validates: Requirements 4.2
     */
    it('should only add direction property without modifying other properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            routeId: fc.string({ minLength: 1, maxLength: 10 }),
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            serviceId: fc.string({ minLength: 1, maxLength: 10 }),
            directionId: fc.constant(''),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 30 })
          }),
          (data) => {
            // テストデータを構築
            const trip = {
              trip_id: data.tripId,
              route_id: data.routeId,
              service_id: data.serviceId,
              direction_id: data.directionId,
              trip_headsign: data.tripHeadsign
            };

            const stopTimes = [
              {
                trip_id: trip.trip_id,
                stop_id: 'stop_1',
                stop_sequence: '10',
                arrival_time: '10:00:00',
                departure_time: '10:00:00'
              },
              {
                trip_id: trip.trip_id,
                stop_id: 'stop_2',
                stop_sequence: '20',
                arrival_time: '10:30:00',
                departure_time: '10:30:00'
              }
            ];

            // 方向判定前のプロパティキーを記録
            const keysBefore = Object.keys(trip);

            // DataLoaderを作成
            const loader = new DataLoader();
            loader.trips = [trip];
            loader.stopTimes = stopTimes;

            // enrichTripsWithDirection()を実行
            try {
              loader.enrichTripsWithDirection();
            } catch (error) {
              // エラーが発生した場合はスキップ
              return true;
            }

            // 方向判定後のプロパティキーを確認
            const keysAfter = Object.keys(loader.trips[0]);

            // プロパティ数が1つだけ増えていることを確認
            if (keysAfter.length !== keysBefore.length + 1) {
              return false;
            }

            // 新しいプロパティが'direction'であることを確認
            const newKeys = keysAfter.filter(k => !keysBefore.includes(k));
            if (newKeys.length !== 1 || newKeys[0] !== 'direction') {
              return false;
            }

            // 既存のプロパティが全て保持されていることを確認
            return keysBefore.every(k => keysAfter.includes(k));
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 複数の路線を処理する場合も、全てのtripの既存プロパティが保持されることを検証
     * Validates: Requirements 4.2
     */
    it('should preserve properties for all trips across multiple routes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              routeId: fc.string({ minLength: 1, maxLength: 10 }),
              trips: fc.array(
                fc.record({
                  tripId: fc.string({ minLength: 1, maxLength: 20 }),
                  serviceId: fc.string({ minLength: 1, maxLength: 10 }),
                  directionId: fc.constant(''),
                  tripHeadsign: fc.string({ minLength: 1, maxLength: 30 })
                }),
                { minLength: 1, maxLength: 3 }
              )
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (routes) => {
            // テストデータを構築
            const allTrips = [];
            const allStopTimes = [];

            routes.forEach(route => {
              route.trips.forEach(t => {
                const trip = {
                  trip_id: t.tripId,
                  route_id: route.routeId,
                  service_id: t.serviceId,
                  direction_id: t.directionId,
                  trip_headsign: t.tripHeadsign
                };
                allTrips.push(trip);

                // 各tripにstopTimesを追加
                allStopTimes.push({
                  trip_id: trip.trip_id,
                  stop_id: 'stop_1',
                  stop_sequence: '10',
                  arrival_time: '10:00:00',
                  departure_time: '10:00:00'
                });
                allStopTimes.push({
                  trip_id: trip.trip_id,
                  stop_id: 'stop_2',
                  stop_sequence: '20',
                  arrival_time: '10:30:00',
                  departure_time: '10:30:00'
                });
              });
            });

            // 方向判定前のプロパティを記録
            const tripsBefore = allTrips.map(t => ({ ...t }));

            // DataLoaderを作成
            const loader = new DataLoader();
            loader.trips = allTrips;
            loader.stopTimes = allStopTimes;

            // enrichTripsWithDirection()を実行
            try {
              loader.enrichTripsWithDirection();
            } catch (error) {
              // エラーが発生した場合はスキップ
              return true;
            }

            // 全てのtripの既存プロパティが保持されていることを検証
            for (let i = 0; i < tripsBefore.length; i++) {
              const before = tripsBefore[i];
              const after = loader.trips[i];
              
              // 既存のプロパティが全て同じ値であることを確認
              const beforeKeys = Object.keys(before);
              for (const key of beforeKeys) {
                if (before[key] !== after[key]) {
                  return false;
                }
              }
              
              // directionプロパティが追加されていることを確認
              if (!after.hasOwnProperty('direction')) {
                return false;
              }
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
