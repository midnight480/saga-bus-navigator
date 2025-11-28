/**
 * DataLoader.enrichTripsWithDirection()のプロパティベーステスト
 * 
 * Feature: direction-detection-integration, Property 1: 全tripへの方向情報付与
 * Feature: direction-detection-integration, Property 2: direction_idの優先と一貫性
 * Feature: direction-detection-integration, Property 3: 判定失敗時のデフォルト値
 * Feature: direction-detection-integration, Property 5: 全路線の処理
 * Feature: direction-detection-integration, Property 6: trip方向プロパティの更新
 * 
 * 検証: 要件1.2, 1.3, 1.4, 2.2, 2.4
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
 * 有効なstop_idを生成
 */
const stopIdArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => `stop_${s}`);

/**
 * 有効なdirection_idを生成（'0', '1', '', null, undefined）
 */
const directionIdArb = fc.oneof(
  fc.constant('0'),
  fc.constant('1'),
  fc.constant(''),
  fc.constant(null),
  fc.constant(undefined)
);

/**
 * 有効なstop_sequenceを生成
 */
const stopSequenceArb = fc.integer({ min: 1, max: 50 });

/**
 * 有効なtripオブジェクトを生成
 */
const tripArb = fc.record({
  trip_id: tripIdArb,
  route_id: routeIdArb,
  direction_id: directionIdArb,
  trip_headsign: fc.oneof(
    fc.constant('佐賀駅'),
    fc.constant('県庁前'),
    fc.constant('バスセンター'),
    fc.constant(null),
    fc.constant(undefined),
    fc.constant('')
  )
});

/**
 * 有効なstopTimeオブジェクトを生成
 */
const stopTimeArb = (tripId) => fc.record({
  trip_id: fc.constant(tripId),
  stop_id: stopIdArb,
  stop_sequence: stopSequenceArb.map(s => s.toString()),
  arrival_time: fc.constant('10:00:00')
});

/**
 * 複数のtripとstopTimesを生成（同じroute_idを持つtripのグループ）
 */
const tripsAndStopTimesForRouteArb = (routeId, minTrips = 2, maxTrips = 5) => {
  return fc.array(
    fc.record({
      trip_id: tripIdArb,
      route_id: fc.constant(routeId),
      direction_id: directionIdArb,
      trip_headsign: fc.oneof(
        fc.constant('佐賀駅'),
        fc.constant('県庁前'),
        fc.constant(null)
      )
    }),
    { minLength: minTrips, maxLength: maxTrips }
  ).chain(trips => {
    // 各tripに対してstopTimesを生成
    return fc.tuple(
      fc.constant(trips),
      fc.array(
        fc.oneof(...trips.map(trip => 
          fc.array(stopTimeArb(trip.trip_id), { minLength: 2, maxLength: 10 })
        ))
      ).map(stopTimesArrays => stopTimesArrays.flat())
    );
  });
};

/**
 * 複数の路線のtripsとstopTimesを生成
 */
const multipleRoutesDataArb = fc.array(
  fc.tuple(routeIdArb, fc.integer({ min: 2, max: 5 }))
    .chain(([routeId, tripCount]) => 
      tripsAndStopTimesForRouteArb(routeId, tripCount, tripCount)
    ),
  { minLength: 1, maxLength: 3 }
).map(routeDataArrays => {
  const allTrips = [];
  const allStopTimes = [];
  
  routeDataArrays.forEach(([trips, stopTimes]) => {
    allTrips.push(...trips);
    allStopTimes.push(...stopTimes);
  });
  
  return { trips: allTrips, stopTimes: allStopTimes };
});

describe('DataLoader.enrichTripsWithDirection() プロパティテスト', () => {
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
    
    // キャッシュをクリア
    DirectionDetector.directionCache.clear();
  });

  /**
   * プロパティ1: 全tripへの方向情報付与
   * 
   * 任意のデータ読み込み完了後、全てのtripオブジェクトはdirectionプロパティを持つ
   * 
   * 検証: 要件1.2
   */
  it('プロパティ1: 任意のtripsについて、enrichTripsWithDirection()実行後、全てのtripがdirectionプロパティを持つ', () => {
    fc.assert(
      fc.property(multipleRoutesDataArb, ({ trips, stopTimes }) => {
        // DataLoaderインスタンスを作成
        const loader = new DataLoader();
        loader.trips = trips;
        loader.stopTimes = stopTimes;
        
        // enrichTripsWithDirection()を実行
        loader.enrichTripsWithDirection();
        
        // 全てのtripがdirectionプロパティを持つことを確認
        for (const trip of trips) {
          expect(trip).toHaveProperty('direction');
          expect(trip.direction).toBeDefined();
          expect(typeof trip.direction).toBe('string');
          expect(['0', '1', 'unknown']).toContain(trip.direction);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ2: direction_idの優先と一貫性
   * 
   * 任意のtripにおいて、direction_idが設定されている場合、
   * trip.directionはtrip.direction_idと同じ値を持つ
   * 
   * 検証: 要件1.3
   */
  it('プロパティ2: 任意のtripについて、direction_idが設定されている場合、directionはdirection_idと一致する', () => {
    fc.assert(
      fc.property(multipleRoutesDataArb, ({ trips, stopTimes }) => {
        // DataLoaderインスタンスを作成
        const loader = new DataLoader();
        loader.trips = trips;
        loader.stopTimes = stopTimes;
        
        // enrichTripsWithDirection()を実行
        loader.enrichTripsWithDirection();
        
        // direction_idが設定されているtripについて検証
        for (const trip of trips) {
          if (trip.direction_id !== '' && trip.direction_id !== null && trip.direction_id !== undefined) {
            expect(trip.direction).toBe(trip.direction_id);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ3: 判定失敗時のデフォルト値
   * 
   * 任意の方向判定が失敗したtripにおいて、trip.directionは'unknown'である
   * 
   * 検証: 要件1.4
   */
  it('プロパティ3: 方向判定が失敗した場合、directionは"unknown"になる', () => {
    // 方向判定が失敗するケース: 全てのtripが同じ始点・終点を持つ
    fc.assert(
      fc.property(routeIdArb, (routeId) => {
        const sameStopId = 'stop_same';
        
        // 全てのtripが同じ始点・終点を持つ
        const trips = [
          { trip_id: 'trip_1', route_id: routeId, direction_id: '', trip_headsign: null },
          { trip_id: 'trip_2', route_id: routeId, direction_id: '', trip_headsign: null }
        ];
        
        const stopTimes = [
          { trip_id: 'trip_1', stop_id: sameStopId, stop_sequence: '1', arrival_time: '10:00:00' },
          { trip_id: 'trip_1', stop_id: sameStopId, stop_sequence: '2', arrival_time: '10:10:00' },
          { trip_id: 'trip_2', stop_id: sameStopId, stop_sequence: '1', arrival_time: '11:00:00' },
          { trip_id: 'trip_2', stop_id: sameStopId, stop_sequence: '2', arrival_time: '11:10:00' }
        ];
        
        const loader = new DataLoader();
        loader.trips = trips;
        loader.stopTimes = stopTimes;
        
        // enrichTripsWithDirection()を実行
        loader.enrichTripsWithDirection();
        
        // 全てのtripのdirectionが'unknown'であることを確認
        for (const trip of trips) {
          expect(trip.direction).toBe('unknown');
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ5: 全路線の処理
   * 
   * 任意のデータセットにおいて、enrichTripsWithDirection()実行後、
   * 全ての路線が処理される
   * 
   * 検証: 要件2.2
   */
  it('プロパティ5: 任意のデータセットについて、全ての路線が処理される', () => {
    fc.assert(
      fc.property(multipleRoutesDataArb, ({ trips, stopTimes }) => {
        // DataLoaderインスタンスを作成
        const loader = new DataLoader();
        loader.trips = trips;
        loader.stopTimes = stopTimes;
        
        // 処理前の路線IDを収集
        const routeIdsBefore = new Set(trips.map(t => t.route_id));
        
        // enrichTripsWithDirection()を実行
        loader.enrichTripsWithDirection();
        
        // 処理後の路線IDを収集（directionプロパティが設定されているtripの路線ID）
        const routeIdsAfter = new Set(
          trips
            .filter(t => t.direction !== undefined)
            .map(t => t.route_id)
        );
        
        // 全ての路線が処理されたことを確認
        expect(routeIdsAfter.size).toBe(routeIdsBefore.size);
        
        for (const routeId of routeIdsBefore) {
          expect(routeIdsAfter.has(routeId)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ6: trip方向プロパティの更新
   * 
   * 任意の方向判定結果において、対応する全てのtripオブジェクトの
   * directionプロパティが更新される
   * 
   * 検証: 要件2.4
   */
  it('プロパティ6: 任意のtripsについて、全てのtripのdirectionプロパティが更新される', () => {
    fc.assert(
      fc.property(multipleRoutesDataArb, ({ trips, stopTimes }) => {
        // DataLoaderインスタンスを作成
        const loader = new DataLoader();
        loader.trips = trips;
        loader.stopTimes = stopTimes;
        
        // 処理前にdirectionプロパティが存在しないことを確認
        const tripsWithoutDirection = trips.filter(t => t.direction === undefined);
        expect(tripsWithoutDirection.length).toBe(trips.length);
        
        // enrichTripsWithDirection()を実行
        loader.enrichTripsWithDirection();
        
        // 処理後に全てのtripがdirectionプロパティを持つことを確認
        const tripsWithDirection = trips.filter(t => t.direction !== undefined);
        expect(tripsWithDirection.length).toBe(trips.length);
        
        // 各tripのdirectionプロパティが有効な値であることを確認
        for (const trip of trips) {
          expect(['0', '1', 'unknown']).toContain(trip.direction);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * エッジケース: tripsが空の場合
   */
  it('エッジケース: tripsが空の場合、警告ログを出力して処理をスキップ', () => {
    const loader = new DataLoader();
    loader.trips = [];
    loader.stopTimes = [
      { trip_id: 'trip_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' }
    ];
    
    // enrichTripsWithDirection()を実行（エラーが発生しないことを確認）
    expect(() => loader.enrichTripsWithDirection()).not.toThrow();
  });

  /**
   * エッジケース: stopTimesが空の場合
   */
  it('エッジケース: stopTimesが空の場合、全てのtripにデフォルト値を設定', () => {
    fc.assert(
      fc.property(
        fc.array(tripArb, { minLength: 1, maxLength: 10 }),
        (trips) => {
          const loader = new DataLoader();
          loader.trips = trips;
          loader.stopTimes = [];
          
          // enrichTripsWithDirection()を実行
          loader.enrichTripsWithDirection();
          
          // 全てのtripがdirectionプロパティを持つことを確認
          for (const trip of trips) {
            expect(trip).toHaveProperty('direction');
            
            // direction_idが設定されている場合はそれを使用、そうでない場合は'unknown'
            if (trip.direction_id !== '' && trip.direction_id !== null && trip.direction_id !== undefined) {
              expect(trip.direction).toBe(trip.direction_id);
            } else {
              expect(trip.direction).toBe('unknown');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * エッジケース: 全てのtripがdirection_idを持つ場合
   */
  it('エッジケース: 全てのtripがdirection_idを持つ場合、停留所順序ベースの判定をスキップ', () => {
    fc.assert(
      fc.property(routeIdArb, (routeId) => {
        const trips = [
          { trip_id: 'trip_1', route_id: routeId, direction_id: '0', trip_headsign: '佐賀駅' },
          { trip_id: 'trip_2', route_id: routeId, direction_id: '1', trip_headsign: '県庁前' }
        ];
        
        const stopTimes = [
          { trip_id: 'trip_1', stop_id: 'stop_1', stop_sequence: '1', arrival_time: '10:00:00' },
          { trip_id: 'trip_1', stop_id: 'stop_2', stop_sequence: '2', arrival_time: '10:10:00' },
          { trip_id: 'trip_2', stop_id: 'stop_2', stop_sequence: '1', arrival_time: '11:00:00' },
          { trip_id: 'trip_2', stop_id: 'stop_1', stop_sequence: '2', arrival_time: '11:10:00' }
        ];
        
        const loader = new DataLoader();
        loader.trips = trips;
        loader.stopTimes = stopTimes;
        
        // enrichTripsWithDirection()を実行
        loader.enrichTripsWithDirection();
        
        // 全てのtripのdirectionがdirection_idと一致することを確認
        expect(trips[0].direction).toBe('0');
        expect(trips[1].direction).toBe('1');
      }),
      { numRuns: 100 }
    );
  });
});
