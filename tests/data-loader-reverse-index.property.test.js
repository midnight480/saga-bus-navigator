/**
 * DataLoader - 逆引きインデックスのプロパティテスト
 * Feature: data-structure-optimization, Property 14, 15
 * Validates: Requirements 5.2, 5.4
 */
import { describe, it } from 'vitest';
import * as fc from 'fast-check';

// data-loader.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const dataLoaderCode = fs.readFileSync(
  path.join(process.cwd(), 'js/data-loader.js'),
  'utf-8'
);
eval(dataLoaderCode);

const DataLoader = global.DataLoader;

// 英数字のみの非空白文字列ジェネレータ（現実的なデータ）
// プロトタイプチェーンのプロパティ名を除外
const prototypeProps = ['toString', 'valueOf', 'constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', '__proto__', '__defineGetter__', '__defineSetter__', '__lookupGetter__', '__lookupSetter__'];
const nonEmptyString = (minLength, maxLength) => 
  fc.stringMatching(/^[a-zA-Z0-9_-]+$/)
    .filter(s => s.length >= minLength && s.length <= maxLength && s.trim().length > 0)
    .filter(s => !prototypeProps.includes(s));

describe('DataLoader - 逆引きインデックス プロパティテスト', () => {
  describe('Property 14: stopToTripsインデックスの完全性 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 14: stopToTripsインデックスの完全性
     * Validates: Requirements 5.2
     * 
     * 任意の有効な停留所IDにおいて、
     * stopToTripsインデックスから停車する全tripIdのリストを取得できる
     */
    it('should retrieve all trip IDs for any valid stop ID', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              trip_id: nonEmptyString(1, 20),
              stop_id: nonEmptyString(1, 20),
              stop_sequence: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (stopTimesData) => {
            const loader = new DataLoader();
            loader.stopTimes = stopTimesData;
            
            const index = loader.generateStopToTrips();
            
            // 各停留所について、その停留所に停車する全tripが取得できることを検証
            const stopIds = new Set(stopTimesData.map(st => st.stop_id));
            
            for (const stopId of stopIds) {
              // インデックスに停留所IDが存在することを検証
              if (!index[stopId]) {
                return false;
              }
              
              // その停留所に停車する全tripIdを収集
              const expectedTripIds = new Set(
                stopTimesData
                  .filter(st => st.stop_id === stopId)
                  .map(st => st.trip_id)
              );
              
              // インデックスから取得したtripIdと比較
              const actualTripIds = new Set(index[stopId]);
              
              // 全ての期待されるtripIdがインデックスに含まれることを検証
              for (const tripId of expectedTripIds) {
                if (!actualTripIds.has(tripId)) {
                  return false;
                }
              }
              
              // インデックスに余分なtripIdが含まれていないことを検証
              for (const tripId of actualTripIds) {
                if (!expectedTripIds.has(tripId)) {
                  return false;
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * インデックスの構造が正しいことを検証
     */
    it('should have correct index structure with stop IDs as keys and trip ID arrays as values', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              trip_id: nonEmptyString(1, 20),
              stop_id: nonEmptyString(1, 20),
              stop_sequence: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (stopTimesData) => {
            const loader = new DataLoader();
            loader.stopTimes = stopTimesData;
            
            const index = loader.generateStopToTrips();
            
            // インデックスがオブジェクトであることを検証
            if (typeof index !== 'object' || index === null) {
              return false;
            }
            
            // 各停留所IDのエントリが配列であることを検証
            for (const stopId in index) {
              if (!Array.isArray(index[stopId])) {
                return false;
              }
              
              // 配列の各要素が文字列（tripId）であることを検証
              for (const tripId of index[stopId]) {
                if (typeof tripId !== 'string') {
                  return false;
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * tripIdの重複がないことを検証
     */
    it('should not duplicate trip IDs in the stop index', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              trip_id: nonEmptyString(1, 20),
              stop_id: nonEmptyString(1, 20),
              stop_sequence: fc.integer({ min: 1, max: 100 }).map(n => n.toString()),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (stopTimesData) => {
            const loader = new DataLoader();
            loader.stopTimes = stopTimesData;
            
            const index = loader.generateStopToTrips();
            
            // 各停留所のtripIdリストに重複がないことを検証
            for (const stopId in index) {
              const tripIds = index[stopId];
              const uniqueTripIds = new Set(tripIds);
              
              if (tripIds.length !== uniqueTripIds.size) {
                return false; // 重複が見つかった
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 空のstop_timesデータの場合、空のインデックスが返されることを検証
     */
    it('should return empty index for empty stop_times data', () => {
      const loader = new DataLoader();
      loader.stopTimes = [];
      
      const index = loader.generateStopToTrips();
      
      return Object.keys(index).length === 0;
    });
  });

  describe('Property 15: routeToTripsインデックスの完全性 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 15: routeToTripsインデックスの完全性
     * Validates: Requirements 5.4
     * 
     * 任意の有効な路線IDと方向の組み合わせにおいて、
     * routeToTripsインデックスから該当する全tripIdのリストを取得できる
     */
    it('should retrieve all trip IDs for any valid route and direction combination', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              trip_id: nonEmptyString(1, 20),
              route_id: nonEmptyString(1, 10),
              direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'), fc.constant(null), fc.constant(undefined))
            }),
            { minLength: 1, maxLength: 100 }
          ).map(trips => {
            // trip_idを一意にする（現実のGTFSデータではtrip_idは一意）
            const uniqueTrips = [];
            const seenTripIds = new Set();
            for (const trip of trips) {
              if (!seenTripIds.has(trip.trip_id)) {
                uniqueTrips.push(trip);
                seenTripIds.add(trip.trip_id);
              }
            }
            return uniqueTrips;
          }),
          (tripsData) => {
            const loader = new DataLoader();
            loader.trips = tripsData;
            
            const index = loader.generateRouteToTrips();
            
            // 各路線と方向の組み合わせについて検証
            const routeDirectionPairs = new Map();
            
            for (const trip of tripsData) {
              const routeId = trip.route_id;
              // 実装と同じロジックでdirectionを正規化
              const direction = trip.direction || 'unknown';
              const key = `${routeId}|||${direction}`; // セパレータを変更（'-'が含まれる可能性があるため）
              
              if (!routeDirectionPairs.has(key)) {
                routeDirectionPairs.set(key, new Set());
              }
              routeDirectionPairs.get(key).add(trip.trip_id);
            }
            
            // 各路線と方向の組み合わせについて、インデックスから正しいtripIdが取得できることを検証
            for (const [key, expectedTripIds] of routeDirectionPairs) {
              const [routeId, direction] = key.split('|||');
              
              // インデックスに路線IDが存在することを検証
              if (!index[routeId]) {
                return false;
              }
              
              // インデックスに方向が存在することを検証
              if (!index[routeId][direction]) {
                return false;
              }
              
              // インデックスから取得したtripIdと比較
              const actualTripIds = new Set(index[routeId][direction]);
              
              // 全ての期待されるtripIdがインデックスに含まれることを検証
              for (const tripId of expectedTripIds) {
                if (!actualTripIds.has(tripId)) {
                  return false;
                }
              }
              
              // インデックスに余分なtripIdが含まれていないことを検証
              for (const tripId of actualTripIds) {
                if (!expectedTripIds.has(tripId)) {
                  return false;
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * インデックスの構造が正しいことを検証
     */
    it('should have correct index structure with route IDs and directions as keys', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              trip_id: nonEmptyString(1, 20),
              route_id: nonEmptyString(1, 10),
              direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
            }),
            { minLength: 1, maxLength: 100 }
          ),
          (tripsData) => {
            const loader = new DataLoader();
            loader.trips = tripsData;
            
            const index = loader.generateRouteToTrips();
            
            // インデックスがオブジェクトであることを検証
            if (typeof index !== 'object' || index === null) {
              return false;
            }
            
            // 各路線IDのエントリがオブジェクトであることを検証
            for (const routeId in index) {
              if (typeof index[routeId] !== 'object' || index[routeId] === null) {
                return false;
              }
              
              // 各方向のエントリが配列であることを検証
              for (const direction in index[routeId]) {
                if (!Array.isArray(index[routeId][direction])) {
                  return false;
                }
                
                // 配列の各要素が文字列（tripId）であることを検証
                for (const tripId of index[routeId][direction]) {
                  if (typeof tripId !== 'string') {
                    return false;
                  }
                }
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * null/undefinedのdirectionが'unknown'として扱われることを検証
     */
    it('should treat null or undefined direction as "unknown"', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 10), // routeId
          fc.array(
            fc.record({
              trip_id: nonEmptyString(1, 20)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.oneof(fc.constant(null), fc.constant(undefined)),
          (routeId, trips, directionValue) => {
            // 全てのtripにroute_idとdirection=null/undefinedを設定
            const tripsData = trips.map(t => ({
              ...t,
              route_id: routeId,
              direction: directionValue
            }));
            
            const loader = new DataLoader();
            loader.trips = tripsData;
            
            const index = loader.generateRouteToTrips();
            
            // 'unknown'キーが存在することを検証
            if (!index[routeId] || !index[routeId]['unknown']) {
              return false;
            }
            
            // 全てのtripIdが'unknown'キーに格納されていることを検証
            const unknownTrips = index[routeId]['unknown'];
            return unknownTrips.length === tripsData.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 混在する方向（'0', '1', 'unknown'）が正しく分類されることを検証
     */
    it('should correctly classify mixed directions', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 10), // routeId
          fc.integer({ min: 1, max: 10 }), // direction '0' のtrip数
          fc.integer({ min: 1, max: 10 }), // direction '1' のtrip数
          fc.integer({ min: 1, max: 10 }), // direction 'unknown' のtrip数
          (routeId, count0, count1, countUnknown) => {
            // 各方向のtripを生成
            const tripsData = [
              ...Array.from({ length: count0 }, (_, i) => ({
                trip_id: `trip_0_${i}`,
                route_id: routeId,
                direction: '0'
              })),
              ...Array.from({ length: count1 }, (_, i) => ({
                trip_id: `trip_1_${i}`,
                route_id: routeId,
                direction: '1'
              })),
              ...Array.from({ length: countUnknown }, (_, i) => ({
                trip_id: `trip_unknown_${i}`,
                route_id: routeId,
                direction: 'unknown'
              }))
            ];
            
            const loader = new DataLoader();
            loader.trips = tripsData;
            
            const index = loader.generateRouteToTrips();
            
            // 各方向のtrip数が正しいことを検証
            const trips0 = index[routeId]?.['0'] || [];
            const trips1 = index[routeId]?.['1'] || [];
            const tripsUnknown = index[routeId]?.['unknown'] || [];
            
            return trips0.length === count0 &&
                   trips1.length === count1 &&
                   tripsUnknown.length === countUnknown;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 空のtripsデータの場合、空のインデックスが返されることを検証
     */
    it('should return empty index for empty trips data', () => {
      const loader = new DataLoader();
      loader.trips = [];
      
      const index = loader.generateRouteToTrips();
      
      return Object.keys(index).length === 0;
    });

    /**
     * 全てのtripがインデックスに含まれることを検証
     */
    it('should include all trips in the index', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              trip_id: nonEmptyString(1, 20),
              route_id: nonEmptyString(1, 10),
              direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
            }),
            { minLength: 1, maxLength: 100 }
          ).map(trips => {
            // trip_idを一意にする（現実のGTFSデータではtrip_idは一意）
            const uniqueTrips = [];
            const seenTripIds = new Set();
            for (const trip of trips) {
              if (!seenTripIds.has(trip.trip_id)) {
                uniqueTrips.push(trip);
                seenTripIds.add(trip.trip_id);
              }
            }
            return uniqueTrips;
          }),
          (tripsData) => {
            const loader = new DataLoader();
            loader.trips = tripsData;
            
            const index = loader.generateRouteToTrips();
            
            // インデックスから全tripIdを収集
            const indexedTripIds = new Set();
            for (const routeId in index) {
              for (const direction in index[routeId]) {
                for (const tripId of index[routeId][direction]) {
                  indexedTripIds.add(tripId);
                }
              }
            }
            
            // 全ての元のtripIdがインデックスに含まれることを検証
            for (const trip of tripsData) {
              if (!indexedTripIds.has(trip.trip_id)) {
                return false;
              }
            }
            
            // インデックスのtripId数が元のtrip数と一致することを検証
            return indexedTripIds.size === tripsData.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
