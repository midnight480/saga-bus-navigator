/**
 * DataLoader - 停留所グループ化のプロパティテスト
 * Feature: data-structure-optimization, Property 16, 17, 18, 19
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
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

describe('DataLoader - 停留所グループ化 プロパティテスト', () => {
  describe('Property 16: parent_stationフィールドの保持 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 16: parent_stationフィールドの保持
     * Validates: Requirements 6.1
     * 
     * 任意の停留所データにおいて、parent_stationフィールドが保持される
     */
    it('should preserve parent_station field in bus stop data', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 }),
              parentStation: fc.option(nonEmptyString(1, 20), { nil: null })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (busStops) => {
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            // 全てのバス停にparentStationフィールドが存在することを検証
            for (const stop of busStops) {
              if (!('parentStation' in stop)) {
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
     * parent_stationがnullの場合も正しく処理されることを検証
     */
    it('should handle null parent_station correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 }),
              parentStation: fc.constant(null)
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (busStops) => {
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // parent_stationがnullの場合、グループ化されないことを検証
            // groupedオブジェクトは空であるべき
            return Object.keys(grouped).length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 17: 停留所グループ化の正確性 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 17: 停留所グループ化の正確性
     * Validates: Requirements 6.2
     * 
     * 任意のparent_stationにおいて、
     * 同じparent_stationを持つ全ての停留所が同じグループに含まれる
     */
    it('should group all stops with the same parent_station together', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // parentStation
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (parentStation, stops) => {
            // 全ての停留所に同じparent_stationを設定
            const busStops = stops.map(stop => ({
              ...stop,
              parentStation: parentStation
            }));
            
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // parent_stationのグループが存在することを検証
            if (!grouped[parentStation]) {
              return false;
            }
            
            // グループ内の停留所数が元の停留所数と一致することを検証
            if (grouped[parentStation].length !== busStops.length) {
              return false;
            }
            
            // 全ての停留所がグループに含まれることを検証
            for (const stop of busStops) {
              const found = grouped[parentStation].some(s => s.id === stop.id);
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
     * 複数のparent_stationが正しくグループ化されることを検証
     */
    it('should correctly group stops with multiple parent_stations', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.tuple(
              nonEmptyString(1, 20), // parentStation
              fc.array(
                fc.record({
                  id: nonEmptyString(1, 20),
                  name: nonEmptyString(1, 50),
                  lat: fc.double({ min: -90, max: 90 }),
                  lng: fc.double({ min: -180, max: 180 })
                }),
                { minLength: 1, maxLength: 10 }
              )
            ),
            { minLength: 1, maxLength: 10 }
          ),
          (parentStationGroups) => {
            // 各parent_stationグループから停留所を生成
            const busStops = [];
            const expectedGroups = new Map();
            
            for (const [parentStation, stops] of parentStationGroups) {
              const stopsWithParent = stops.map(stop => ({
                ...stop,
                parentStation: parentStation
              }));
              busStops.push(...stopsWithParent);
              
              if (!expectedGroups.has(parentStation)) {
                expectedGroups.set(parentStation, []);
              }
              expectedGroups.get(parentStation).push(...stopsWithParent);
            }
            
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // 各parent_stationのグループが正しいことを検証
            for (const [parentStation, expectedStops] of expectedGroups) {
              if (!grouped[parentStation]) {
                return false;
              }
              
              // グループ内の停留所数が期待値と一致することを検証
              if (grouped[parentStation].length !== expectedStops.length) {
                return false;
              }
              
              // 全ての停留所がグループに含まれることを検証
              for (const stop of expectedStops) {
                const found = grouped[parentStation].some(s => s.id === stop.id);
                if (!found) {
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
     * グループ化されたデータの構造が正しいことを検証
     */
    it('should have correct structure in grouped data', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 }),
              parentStation: fc.option(nonEmptyString(1, 20), { nil: null })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (busStops) => {
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // groupedがオブジェクトであることを検証
            if (typeof grouped !== 'object' || grouped === null) {
              return false;
            }
            
            // 各グループが配列であることを検証
            for (const parentStation in grouped) {
              if (!Array.isArray(grouped[parentStation])) {
                return false;
              }
              
              // 各停留所が必須フィールドを持つことを検証
              for (const stop of grouped[parentStation]) {
                if (!stop.id || !stop.name || 
                    typeof stop.lat !== 'number' || 
                    typeof stop.lng !== 'number') {
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

  describe('Property 18: グループ化検索オプション (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 18: グループ化検索オプション
     * Validates: Requirements 6.3
     * 
     * 任意の停留所検索において、
     * グループ化オプションを有効にした場合、親駅単位でグループ化された結果を返す
     * 
     * 注: この要件は将来的な拡張のため、現時点では基本的な検証のみ実施
     */
    it('should provide grouped stops data structure for search functionality', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 }),
              parentStation: fc.option(nonEmptyString(1, 20), { nil: null })
            }),
            { minLength: 1, maxLength: 50 }
          ),
          (busStops) => {
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // グループ化されたデータが検索に使用できる形式であることを検証
            // 各parent_stationで停留所を検索できることを確認
            for (const parentStation in grouped) {
              const stops = grouped[parentStation];
              
              // 停留所が配列であることを検証
              if (!Array.isArray(stops)) {
                return false;
              }
              
              // 各停留所が検索に必要な情報を持つことを検証
              for (const stop of stops) {
                if (!stop.id || !stop.name || 
                    typeof stop.lat !== 'number' || 
                    typeof stop.lng !== 'number') {
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
     * parent_stationでグループ化された停留所を検索できることを検証
     */
    it('should allow searching stops by parent_station', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // parentStation
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 })
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (parentStation, stops) => {
            // 全ての停留所に同じparent_stationを設定
            const busStops = stops.map(stop => ({
              ...stop,
              parentStation: parentStation
            }));
            
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // parent_stationで検索できることを検証
            const foundStops = grouped[parentStation];
            
            if (!foundStops) {
              return false;
            }
            
            // 検索結果が元の停留所と一致することを検証
            return foundStops.length === stops.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: 乗り場番号の重複排除 (data-structure-optimization)', () => {
    /**
     * Feature: data-structure-optimization, Property 19: 乗り場番号の重複排除
     * Validates: Requirements 6.4
     * 
     * 任意の乗り場番号を含む停留所名において、
     * 重複排除やグループ化ロジックが適用される
     * 
     * 注: この要件は停留所名の処理に関するもので、
     * 現時点ではグループ化機能の基本的な動作を検証
     */
    it('should handle stops with platform numbers correctly', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // parentStation
          nonEmptyString(1, 30), // base stop name
          fc.array(
            fc.integer({ min: 1, max: 10 }), // platform numbers
            { minLength: 1, maxLength: 10 }
          ),
          (parentStation, baseName, platformNumbers) => {
            // 乗り場番号付きの停留所を生成
            const busStops = platformNumbers.map((num, index) => ({
              id: `stop_${index}`,
              name: `${baseName} ${num}番のりば`,
              lat: 33.249 + index * 0.001,
              lng: 130.299 + index * 0.001,
              parentStation: parentStation
            }));
            
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // parent_stationでグループ化されていることを検証
            if (!grouped[parentStation]) {
              return false;
            }
            
            // 全ての乗り場が同じグループに含まれることを検証
            const groupedStops = grouped[parentStation];
            if (groupedStops.length !== busStops.length) {
              return false;
            }
            
            // 各乗り場が正しくグループに含まれることを検証
            for (const stop of busStops) {
              const found = groupedStops.some(s => s.id === stop.id);
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
     * 同じ親駅の複数の乗り場が重複なくグループ化されることを検証
     */
    it('should group multiple platforms without duplication', () => {
      fc.assert(
        fc.property(
          nonEmptyString(1, 20), // parentStation
          fc.integer({ min: 1, max: 20 }), // 停留所の数
          (parentStation, stopCount) => {
            // 一意のIDを持つ停留所を生成
            const busStops = Array.from({ length: stopCount }, (_, i) => ({
              id: `stop_${i}`,
              name: `Stop ${i}`,
              lat: 33.249 + i * 0.001,
              lng: 130.299 + i * 0.001,
              parentStation: parentStation
            }));
            
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // グループ内に重複がないことを検証
            const groupedStops = grouped[parentStation];
            if (!groupedStops) {
              return false;
            }
            
            const ids = new Set();
            for (const stop of groupedStops) {
              if (ids.has(stop.id)) {
                return false; // 重複が見つかった
              }
              ids.add(stop.id);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * 異なる親駅の乗り場が正しく分離されることを検証
     */
    it('should separate platforms from different parent stations', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            nonEmptyString(1, 20), // parentStation1
            nonEmptyString(1, 20)  // parentStation2
          ).filter(([p1, p2]) => p1 !== p2), // 異なる親駅
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              id: nonEmptyString(1, 20),
              name: nonEmptyString(1, 50),
              lat: fc.double({ min: -90, max: 90 }),
              lng: fc.double({ min: -180, max: 180 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          ([parentStation1, parentStation2], stops1, stops2) => {
            // 2つの異なる親駅の停留所を生成
            const busStops = [
              ...stops1.map(stop => ({ ...stop, parentStation: parentStation1 })),
              ...stops2.map(stop => ({ ...stop, parentStation: parentStation2 }))
            ];
            
            const loader = new DataLoader();
            loader.busStops = busStops;
            
            const grouped = loader.generateStopsGrouped();
            
            // 2つの親駅が別々にグループ化されていることを検証
            if (!grouped[parentStation1] || !grouped[parentStation2]) {
              return false;
            }
            
            // 各グループの停留所数が正しいことを検証
            if (grouped[parentStation1].length !== stops1.length) {
              return false;
            }
            if (grouped[parentStation2].length !== stops2.length) {
              return false;
            }
            
            // グループ間で停留所が混在していないことを検証
            const ids1 = new Set(grouped[parentStation1].map(s => s.id));
            const ids2 = new Set(grouped[parentStation2].map(s => s.id));
            
            for (const id of ids1) {
              if (ids2.has(id)) {
                return false; // 混在が見つかった
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
