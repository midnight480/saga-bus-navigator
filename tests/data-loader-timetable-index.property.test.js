/**
 * DataLoader - 方向別時刻表インデックスのプロパティテスト
 * Feature: data-structure-optimization, Property 5, 6, 7
 * Validates: Requirements 2.2, 2.3, 2.4
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

describe('DataLoader - 方向別時刻表インデックス プロパティテスト', () => {
  describe('Property 5: 方向別時刻表インデックスの完全性 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 5: 方向別時刻表インデックスの完全性
     * Validates: Requirements 2.2
     * 
     * 任意の路線IDと方向の組み合わせにおいて、
     * 方向別時刻表インデックスから対応する時刻表データを取得できる
     */
    it('should retrieve timetable data for any valid route and direction combination', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              routeNumber: nonEmptyString(1, 10),
              tripId: nonEmptyString(1, 20),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              stopName: nonEmptyString(1, 30),
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
              routeName: nonEmptyString(1, 30),
              operator: nonEmptyString(1, 20),
              direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (timetableData) => {
            const loader = new DataLoader();
            loader.timetable = timetableData;
            
            const index = loader.generateTimetableByRouteAndDirection();
            
            // 全ての時刻表エントリについて検証
            for (const entry of timetableData) {
              const routeId = entry.routeNumber;
              const direction = entry.direction || 'unknown';
              
              // インデックスに路線IDが存在することを検証
              if (!index[routeId]) {
                return false;
              }
              
              // インデックスに方向が存在することを検証
              if (!index[routeId][direction]) {
                return false;
              }
              
              // インデックスにエントリが含まれることを検証
              const found = index[routeId][direction].some(e => 
                e.tripId === entry.tripId && 
                e.stopSequence === entry.stopSequence
              );
              
              if (!found) {
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
     * インデックスの構造が正しいことを検証
     */
    it('should have correct index structure with route and direction keys', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              routeNumber: nonEmptyString(1, 10),
              tripId: nonEmptyString(1, 20),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              stopName: nonEmptyString(1, 30),
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
              routeName: nonEmptyString(1, 30),
              operator: nonEmptyString(1, 20),
              direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (timetableData) => {
            const loader = new DataLoader();
            loader.timetable = timetableData;
            
            const index = loader.generateTimetableByRouteAndDirection();
            
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
              }
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: 時刻表データの保存性 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 6: 時刻表データの保存性
     * Validates: Requirements 2.3
     * 
     * 任意の時刻表エントリにおいて、
     * 元のtimetable配列の全エントリが方向別インデックスのいずれかに含まれる
     */
    it('should preserve all timetable entries in the direction-based index', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              routeNumber: nonEmptyString(1, 10),
              tripId: nonEmptyString(1, 20),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              stopName: nonEmptyString(1, 30),
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
              routeName: nonEmptyString(1, 30),
              operator: nonEmptyString(1, 20),
              direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (timetableData) => {
            const loader = new DataLoader();
            loader.timetable = timetableData;
            
            const index = loader.generateTimetableByRouteAndDirection();
            
            // インデックスから全エントリを収集
            const indexedEntries = [];
            for (const routeId in index) {
              for (const direction in index[routeId]) {
                if (Array.isArray(index[routeId][direction])) {
                  indexedEntries.push(...index[routeId][direction]);
                }
              }
            }
            
            // 元の時刻表と同じ数のエントリが存在することを検証
            if (indexedEntries.length !== timetableData.length) {
              return false;
            }
            
            // 全ての元のエントリがインデックスに含まれることを検証
            for (const entry of timetableData) {
              const found = indexedEntries.some(e => 
                e.tripId === entry.tripId && 
                e.stopSequence === entry.stopSequence &&
                e.routeNumber === entry.routeNumber
              );
              
              if (!found) {
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
     * エントリの重複がないことを検証
     */
    it('should not duplicate entries in the index', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              routeNumber: nonEmptyString(1, 10),
              tripId: nonEmptyString(1, 20),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              stopName: nonEmptyString(1, 30),
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
              routeName: nonEmptyString(1, 30),
              operator: nonEmptyString(1, 20),
              direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (timetableData) => {
            const loader = new DataLoader();
            loader.timetable = timetableData;
            
            const index = loader.generateTimetableByRouteAndDirection();
            
            // インデックスから全エントリを収集
            const indexedEntries = [];
            for (const routeId in index) {
              for (const direction in index[routeId]) {
                if (Array.isArray(index[routeId][direction])) {
                  indexedEntries.push(...index[routeId][direction]);
                }
              }
            }
            
            // 重複がないことを検証（tripId + stopSequenceの組み合わせで判定）
            const seen = new Set();
            for (const entry of indexedEntries) {
              const key = `${entry.tripId}-${entry.stopSequence}`;
              if (seen.has(key)) {
                return false; // 重複が見つかった
              }
              seen.add(key);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: unknown方向の格納 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 7: unknown方向の格納
     * Validates: Requirements 2.4
     * 
     * 任意の方向がunknownの時刻表エントリにおいて、
     * それらは'unknown'キーの配列に格納される
     */
    it('should store entries with unknown direction in the "unknown" key', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 10), // routeNumber
          fc.array(
            fc.record({
              tripId: nonEmptyString(1, 20),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              stopName: nonEmptyString(1, 30),
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
              routeName: nonEmptyString(1, 30),
              operator: nonEmptyString(1, 20)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (routeNumber, entries) => {
            // 全てのエントリにrouteNumberとdirection='unknown'を設定
            const timetableData = entries.map(e => ({
              ...e,
              routeNumber: routeNumber,
              direction: 'unknown'
            }));
            
            const loader = new DataLoader();
            loader.timetable = timetableData;
            
            const index = loader.generateTimetableByRouteAndDirection();
            
            // 'unknown'キーが存在することを検証
            if (!index[routeNumber] || !index[routeNumber]['unknown']) {
              return false;
            }
            
            // 全てのエントリが'unknown'キーに格納されていることを検証
            const unknownEntries = index[routeNumber]['unknown'];
            if (unknownEntries.length !== timetableData.length) {
              return false;
            }
            
            // 各エントリが正しく格納されていることを検証
            for (const entry of timetableData) {
              const found = unknownEntries.some(e => 
                e.tripId === entry.tripId && 
                e.stopSequence === entry.stopSequence
              );
              
              if (!found) {
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
     * directionフィールドがnullまたはundefinedの場合も'unknown'として扱われることを検証
     */
    it('should treat null or undefined direction as "unknown"', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 10), // routeNumber
          fc.array(
            fc.record({
              tripId: nonEmptyString(1, 20),
              stopSequence: fc.integer({ min: 1, max: 100 }),
              stopName: nonEmptyString(1, 30),
              hour: fc.integer({ min: 0, max: 23 }),
              minute: fc.integer({ min: 0, max: 59 }),
              weekdayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
              routeName: nonEmptyString(1, 30),
              operator: nonEmptyString(1, 20)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.oneof(fc.constant(null), fc.constant(undefined)),
          (routeNumber, entries, directionValue) => {
            // 全てのエントリにrouteNumberとdirection=null/undefinedを設定
            const timetableData = entries.map(e => ({
              ...e,
              routeNumber: routeNumber,
              direction: directionValue
            }));
            
            const loader = new DataLoader();
            loader.timetable = timetableData;
            
            const index = loader.generateTimetableByRouteAndDirection();
            
            // 'unknown'キーが存在することを検証
            if (!index[routeNumber] || !index[routeNumber]['unknown']) {
              return false;
            }
            
            // 全てのエントリが'unknown'キーに格納されていることを検証
            const unknownEntries = index[routeNumber]['unknown'];
            return unknownEntries.length === timetableData.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 混在する方向（'0', '1', 'unknown'）が正しく分類されることを検証
     */
    it('should correctly classify mixed directions including unknown', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 10), // routeNumber
          fc.integer({ min: 1, max: 10 }), // direction '0' のエントリ数
          fc.integer({ min: 1, max: 10 }), // direction '1' のエントリ数
          fc.integer({ min: 1, max: 10 }), // direction 'unknown' のエントリ数
          (routeNumber, count0, count1, countUnknown) => {
            // 各方向のエントリを生成
            const timetableData = [
              ...Array.from({ length: count0 }, (_, i) => ({
                routeNumber: routeNumber,
                tripId: `trip_0_${i}`,
                stopSequence: i + 1,
                stopName: `Stop ${i}`,
                hour: 8,
                minute: i,
                weekdayType: '平日',
                routeName: 'Route 1',
                operator: 'Operator 1',
                direction: '0'
              })),
              ...Array.from({ length: count1 }, (_, i) => ({
                routeNumber: routeNumber,
                tripId: `trip_1_${i}`,
                stopSequence: i + 1,
                stopName: `Stop ${i}`,
                hour: 9,
                minute: i,
                weekdayType: '平日',
                routeName: 'Route 1',
                operator: 'Operator 1',
                direction: '1'
              })),
              ...Array.from({ length: countUnknown }, (_, i) => ({
                routeNumber: routeNumber,
                tripId: `trip_unknown_${i}`,
                stopSequence: i + 1,
                stopName: `Stop ${i}`,
                hour: 10,
                minute: i,
                weekdayType: '平日',
                routeName: 'Route 1',
                operator: 'Operator 1',
                direction: 'unknown'
              }))
            ];
            
            const loader = new DataLoader();
            loader.timetable = timetableData;
            
            const index = loader.generateTimetableByRouteAndDirection();
            
            // 各方向のエントリ数が正しいことを検証
            const entries0 = index[routeNumber]?.['0'] || [];
            const entries1 = index[routeNumber]?.['1'] || [];
            const entriesUnknown = index[routeNumber]?.['unknown'] || [];
            
            return entries0.length === count0 &&
                   entries1.length === count1 &&
                   entriesUnknown.length === countUnknown;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
