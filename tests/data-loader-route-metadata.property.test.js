/**
 * DataLoader.generateRouteMetadata()のプロパティベーステスト
 * 
 * Feature: data-structure-optimization, Property 11: 路線メタデータの方向リスト
 * Feature: data-structure-optimization, Property 12: 路線メタデータのheadsignリスト
 * Feature: data-structure-optimization, Property 13: 路線メタデータのtrip数
 * 
 * 検証: 要件4.2, 4.3, 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// DataLoaderとDirectionDetectorをグローバルスコープから取得
const getDataLoader = () => {
  if (typeof window !== 'undefined' && window.DataLoader) {
    return window.DataLoader;
  }
  if (typeof global !== 'undefined' && global.DataLoader) {
    return global.DataLoader;
  }
  throw new Error('DataLoaderが見つかりません');
};

const getDirectionDetector = () => {
  if (typeof window !== 'undefined' && window.DirectionDetector) {
    return window.DirectionDetector;
  }
  if (typeof global !== 'undefined' && global.DirectionDetector) {
    return global.DirectionDetector;
  }
  throw new Error('DirectionDetectorが見つかりません');
};

// テスト用のジェネレーター

/**
 * 有効なtrip_idを生成
 */
const tripIdArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => `trip_${s}`);

/**
 * 有効なroute_idを生成
 */
const routeIdArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => `route_${s}`);

/**
 * 有効なdirectionを生成（'0', '1', 'unknown'）
 */
const directionArb = fc.oneof(
  fc.constant('0'),
  fc.constant('1'),
  fc.constant('unknown')
);

/**
 * 有効なtrip_headsignを生成
 */
const headsignArb = fc.oneof(
  fc.constant('佐賀駅'),
  fc.constant('県庁前'),
  fc.constant('バスセンター'),
  fc.constant('市役所'),
  fc.constant(null),
  fc.constant(undefined),
  fc.constant('')
);

/**
 * 有効なtripオブジェクトを生成
 */
const tripArb = fc.record({
  trip_id: tripIdArb,
  route_id: routeIdArb,
  direction: directionArb,
  trip_headsign: headsignArb
});

/**
 * 複数のtripを生成（同じroute_idを持つtripのグループ）
 */
const tripsForRouteArb = (routeId, minTrips = 1, maxTrips = 10) => {
  return fc.array(
    fc.record({
      trip_id: tripIdArb,
      route_id: fc.constant(routeId),
      direction: directionArb,
      trip_headsign: headsignArb
    }),
    { minLength: minTrips, maxLength: maxTrips }
  );
};

/**
 * 複数の路線のtripsを生成
 */
const multipleRoutesTripsArb = fc.array(
  fc.tuple(routeIdArb, fc.integer({ min: 1, max: 10 }))
    .chain(([routeId, tripCount]) => 
      tripsForRouteArb(routeId, tripCount, tripCount)
    ),
  { minLength: 1, maxLength: 5 }
).map(routeTripsArrays => routeTripsArrays.flat());

describe('DataLoader.generateRouteMetadata() プロパティテスト', () => {
  let DataLoader;
  let DirectionDetector;

  beforeEach(async () => {
    // data-loader.jsとdirection-detector.jsを読み込み
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const dataLoaderCode = fs.readFileSync(
      path.join(__dirname, '../js/data-loader.js'),
      'utf-8'
    );
    const directionDetectorCode = fs.readFileSync(
      path.join(__dirname, '../js/direction-detector.js'),
      'utf-8'
    );
    
    // グローバルスコープで実行
    global.window = global;
    eval(directionDetectorCode);
    eval(dataLoaderCode);
    
    DataLoader = getDataLoader();
    DirectionDetector = getDirectionDetector();
  });

  /**
   * プロパティ11: 路線メタデータの方向リスト
   * 
   * 任意の有効な路線IDにおいて、路線メタデータから利用可能な方向のリストを取得できる
   * 
   * 検証: 要件4.2
   */
  it('プロパティ11: 任意の路線について、メタデータから方向リストを取得できる', () => {
    fc.assert(
      fc.property(multipleRoutesTripsArb, (trips) => {
        // DataLoaderインスタンスを作成
        const loader = new DataLoader();
        loader.trips = trips;
        
        // 路線メタデータを生成
        const metadata = loader.generateRouteMetadata();
        
        // 各路線について検証
        const routeIds = [...new Set(trips.map(t => t.route_id))];
        
        for (const routeId of routeIds) {
          // メタデータが存在することを確認
          expect(metadata[routeId]).toBeDefined();
          
          // directionsプロパティが配列であることを確認
          expect(Array.isArray(metadata[routeId].directions)).toBe(true);
          
          // directionsが空でないことを確認
          expect(metadata[routeId].directions.length).toBeGreaterThan(0);
          
          // 実際の方向を収集
          const actualDirections = new Set(
            trips
              .filter(t => t.route_id === routeId)
              .map(t => t.direction || 'unknown')
          );
          
          // メタデータの方向リストが実際の方向を全て含むことを確認
          for (const direction of actualDirections) {
            expect(metadata[routeId].directions).toContain(direction);
          }
          
          // メタデータの方向リストが実際の方向のみを含むことを確認
          expect(metadata[routeId].directions.length).toBe(actualDirections.size);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ12: 路線メタデータのheadsignリスト
   * 
   * 任意の有効な路線IDにおいて、路線メタデータから全てのheadsignのリストを取得できる
   * 
   * 検証: 要件4.3
   */
  it('プロパティ12: 任意の路線について、メタデータからheadsignリストを取得できる', () => {
    fc.assert(
      fc.property(multipleRoutesTripsArb, (trips) => {
        // DataLoaderインスタンスを作成
        const loader = new DataLoader();
        loader.trips = trips;
        
        // 路線メタデータを生成
        const metadata = loader.generateRouteMetadata();
        
        // 各路線について検証
        const routeIds = [...new Set(trips.map(t => t.route_id))];
        
        for (const routeId of routeIds) {
          // メタデータが存在することを確認
          expect(metadata[routeId]).toBeDefined();
          
          // headsignsプロパティが配列であることを確認
          expect(Array.isArray(metadata[routeId].headsigns)).toBe(true);
          
          // 実際のheadsignを収集（null、undefined、空文字列を除外）
          const actualHeadsigns = new Set(
            trips
              .filter(t => t.route_id === routeId)
              .map(t => t.trip_headsign)
              .filter(h => h && h.trim() !== '')
          );
          
          // メタデータのheadsignリストが実際のheadsignを全て含むことを確認
          for (const headsign of actualHeadsigns) {
            expect(metadata[routeId].headsigns).toContain(headsign);
          }
          
          // メタデータのheadsignリストが実際のheadsignのみを含むことを確認
          expect(metadata[routeId].headsigns.length).toBe(actualHeadsigns.size);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ13: 路線メタデータのtrip数
   * 
   * 任意の有効な路線IDにおいて、路線メタデータから方向別のtrip数を取得できる
   * 
   * 検証: 要件4.4
   */
  it('プロパティ13: 任意の路線について、メタデータから方向別trip数を取得できる', () => {
    fc.assert(
      fc.property(multipleRoutesTripsArb, (trips) => {
        // DataLoaderインスタンスを作成
        const loader = new DataLoader();
        loader.trips = trips;
        
        // 路線メタデータを生成
        const metadata = loader.generateRouteMetadata();
        
        // 各路線について検証
        const routeIds = [...new Set(trips.map(t => t.route_id))];
        
        for (const routeId of routeIds) {
          // メタデータが存在することを確認
          expect(metadata[routeId]).toBeDefined();
          
          // tripCountプロパティがオブジェクトであることを確認
          expect(typeof metadata[routeId].tripCount).toBe('object');
          
          // 実際の方向別trip数を計算
          const actualTripCount = {};
          trips
            .filter(t => t.route_id === routeId)
            .forEach(t => {
              const direction = t.direction || 'unknown';
              if (!actualTripCount[direction]) {
                actualTripCount[direction] = 0;
              }
              actualTripCount[direction]++;
            });
          
          // メタデータのtrip数が実際のtrip数と一致することを確認
          for (const direction of Object.keys(actualTripCount)) {
            expect(metadata[routeId].tripCount[direction]).toBe(actualTripCount[direction]);
          }
          
          // メタデータのtrip数が実際の方向のみを含むことを確認
          expect(Object.keys(metadata[routeId].tripCount).length).toBe(
            Object.keys(actualTripCount).length
          );
          
          // 全方向のtrip数の合計が、その路線の全trip数と一致することを確認
          const totalTripsInMetadata = Object.values(metadata[routeId].tripCount)
            .reduce((sum, count) => sum + count, 0);
          const totalTripsActual = trips.filter(t => t.route_id === routeId).length;
          expect(totalTripsInMetadata).toBe(totalTripsActual);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * エッジケース: tripsが空の場合
   */
  it('エッジケース: tripsが空の場合、空のメタデータを返す', () => {
    const loader = new DataLoader();
    loader.trips = [];
    
    const metadata = loader.generateRouteMetadata();
    
    expect(metadata).toEqual({});
  });

  /**
   * エッジケース: 全てのtripが同じ路線IDを持つ場合
   */
  it('エッジケース: 全てのtripが同じ路線IDを持つ場合、1つの路線メタデータのみを生成', () => {
    fc.assert(
      fc.property(
        routeIdArb,
        fc.array(tripArb, { minLength: 1, maxLength: 20 }),
        (routeId, trips) => {
          // 全てのtripに同じroute_idを設定
          const sameRouteTrips = trips.map(t => ({
            ...t,
            route_id: routeId
          }));
          
          const loader = new DataLoader();
          loader.trips = sameRouteTrips;
          
          const metadata = loader.generateRouteMetadata();
          
          // メタデータが1つの路線のみを含むことを確認
          expect(Object.keys(metadata).length).toBe(1);
          expect(metadata[routeId]).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * エッジケース: 双方向路線（2つの方向を持つ路線）
   */
  it('エッジケース: 双方向路線の場合、2つの方向を持つメタデータを生成', () => {
    fc.assert(
      fc.property(routeIdArb, (routeId) => {
        // 往路と復路のtripを生成
        const trips = [
          { trip_id: 'trip_1', route_id: routeId, direction: '0', trip_headsign: '佐賀駅' },
          { trip_id: 'trip_2', route_id: routeId, direction: '0', trip_headsign: '佐賀駅' },
          { trip_id: 'trip_3', route_id: routeId, direction: '1', trip_headsign: '県庁前' },
          { trip_id: 'trip_4', route_id: routeId, direction: '1', trip_headsign: '県庁前' }
        ];
        
        const loader = new DataLoader();
        loader.trips = trips;
        
        const metadata = loader.generateRouteMetadata();
        
        // 2つの方向を持つことを確認
        expect(metadata[routeId].directions.length).toBe(2);
        expect(metadata[routeId].directions).toContain('0');
        expect(metadata[routeId].directions).toContain('1');
        
        // 各方向のtrip数を確認
        expect(metadata[routeId].tripCount['0']).toBe(2);
        expect(metadata[routeId].tripCount['1']).toBe(2);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * エッジケース: headsignがnull、undefined、空文字列の場合
   */
  it('エッジケース: headsignがnull/undefined/空文字列の場合、headsignリストに含まれない', () => {
    fc.assert(
      fc.property(routeIdArb, (routeId) => {
        const trips = [
          { trip_id: 'trip_1', route_id: routeId, direction: '0', trip_headsign: '佐賀駅' },
          { trip_id: 'trip_2', route_id: routeId, direction: '0', trip_headsign: null },
          { trip_id: 'trip_3', route_id: routeId, direction: '0', trip_headsign: undefined },
          { trip_id: 'trip_4', route_id: routeId, direction: '0', trip_headsign: '' },
          { trip_id: 'trip_5', route_id: routeId, direction: '0', trip_headsign: '県庁前' }
        ];
        
        const loader = new DataLoader();
        loader.trips = trips;
        
        const metadata = loader.generateRouteMetadata();
        
        // headsignリストが有効な値のみを含むことを確認
        expect(metadata[routeId].headsigns.length).toBe(2);
        expect(metadata[routeId].headsigns).toContain('佐賀駅');
        expect(metadata[routeId].headsigns).toContain('県庁前');
        expect(metadata[routeId].headsigns).not.toContain(null);
        expect(metadata[routeId].headsigns).not.toContain(undefined);
        expect(metadata[routeId].headsigns).not.toContain('');
      }),
      { numRuns: 100 }
    );
  });
});
