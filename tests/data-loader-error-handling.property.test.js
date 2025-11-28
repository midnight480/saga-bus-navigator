/**
 * DataLoader.enrichTripsWithDirection()のエラー処理プロパティテスト
 * 
 * Feature: direction-detection-integration, Property 15: エラー時の処理継続
 * 検証: 要件6.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

describe('DataLoader.enrichTripsWithDirection() エラー処理プロパティテスト', () => {
  let DataLoader;
  let DirectionDetector;
  let consoleErrorSpy;
  let consoleDebugSpy;

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
    
    // console.errorとconsole.logをスパイ
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // スパイをリストア
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  /**
   * Arbitrary: 路線IDを生成
   */
  const routeIdArb = fc.string({ minLength: 5, maxLength: 10 }).map(s => `route_${s}`);

  /**
   * Arbitrary: tripを生成
   */
  const tripArb = (routeId) => fc.record({
    trip_id: fc.string({ minLength: 5, maxLength: 15 }).map(s => `trip_${s}`),
    route_id: fc.constant(routeId),
    service_id: fc.constant('weekday'),
    trip_headsign: fc.oneof(
      fc.constant('佐賀駅'),
      fc.constant('県庁前'),
      fc.constant('バスセンター'),
      fc.constant('市役所')
    ),
    direction_id: fc.constant('') // direction_idは空文字列
  });

  /**
   * Arbitrary: stopTimeを生成
   */
  const stopTimeArb = (tripId) => fc.record({
    trip_id: fc.constant(tripId),
    stop_id: fc.string({ minLength: 5, maxLength: 10 }).map(s => `stop_${s}`),
    stop_sequence: fc.integer({ min: 1, max: 20 }).map(n => n.toString()),
    arrival_time: fc.integer({ min: 6, max: 23 }).chain(hour =>
      fc.integer({ min: 0, max: 59 }).map(minute =>
        `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
      )
    ),
    departure_time: fc.integer({ min: 6, max: 23 }).chain(hour =>
      fc.integer({ min: 0, max: 59 }).map(minute =>
        `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
      )
    )
  });

  /**
   * Arbitrary: 複数の路線データを生成
   * 各路線には複数のtripとstopTimesが含まれる
   */
  const multipleRoutesDataArb = fc.tuple(
    fc.integer({ min: 3, max: 10 }), // 路線数
    fc.integer({ min: 2, max: 5 })   // 各路線のtrip数
  ).chain(([routeCount, tripsPerRoute]) =>
    fc.tuple(
      fc.array(routeIdArb, { minLength: routeCount, maxLength: routeCount }),
      fc.constant(tripsPerRoute)
    ).chain(([routeIds, tripCount]) => {
      // 各路線のtripsとstopTimesを生成
      const routeDataArbs = routeIds.map(routeId =>
        fc.array(tripArb(routeId), { minLength: tripCount, maxLength: tripCount })
          .chain(trips => {
            // 各tripのstopTimesを生成
            const stopTimesArbs = trips.map(trip =>
              fc.array(stopTimeArb(trip.trip_id), { minLength: 2, maxLength: 5 })
                .map(stopTimes => 
                  stopTimes.map((st, idx) => ({
                    ...st,
                    stop_sequence: (idx + 1).toString()
                  }))
                )
            );
            
            return fc.tuple(
              fc.constant(trips),
              fc.tuple(...stopTimesArbs).map(stopTimesArrays => stopTimesArrays.flat())
            ).map(([trips, stopTimes]) => ({ routeId, trips, stopTimes }));
          })
      );
      
      return fc.tuple(...routeDataArbs).map(routeDataArray => {
        const allTrips = routeDataArray.flatMap(rd => rd.trips);
        const allStopTimes = routeDataArray.flatMap(rd => rd.stopTimes);
        return {
          routeIds,
          trips: allTrips,
          stopTimes: allStopTimes,
          routeData: routeDataArray
        };
      });
    })
  );

  /**
   * プロパティ15: エラー時の処理継続
   * 
   * 任意の路線で方向判定エラーが発生しても、他の路線の処理は継続される
   * 
   * 検証: 要件6.4
   */
  it('プロパティ15: 任意の路線でエラーが発生しても、他の路線の処理は継続される', () => {
    fc.assert(
      fc.property(
        multipleRoutesDataArb,
        fc.integer({ min: 0, max: 2 }), // エラーを発生させる路線のインデックス
        ({ routeIds, trips, stopTimes, routeData }, errorRouteIndex) => {
          // エラーを発生させる路線を選択
          const errorRouteId = routeIds[errorRouteIndex % routeIds.length];
          
          const loader = new DataLoader();
          loader.trips = trips;
          loader.stopTimes = stopTimes;
          
          // DirectionDetector.detectDirectionByStopSequence()をモック化
          const originalDetect = DirectionDetector.detectDirectionByStopSequence;
          DirectionDetector.detectDirectionByStopSequence = vi.fn((routeId, trips, stopTimes) => {
            if (routeId === errorRouteId) {
              throw new Error(`テスト用エラー: 路線${routeId}の方向判定に失敗`);
            }
            return originalDetect.call(DirectionDetector, routeId, trips, stopTimes);
          });
          
          // enrichTripsWithDirection()を実行
          loader.enrichTripsWithDirection();
          
          // エラーログが出力されたことを確認
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            expect.stringContaining(`路線${errorRouteId}の方向判定中にエラーが発生しました`),
            expect.any(Error)
          );
          
          // エラーが発生した路線のtripは全てunknownに設定されている
          const errorRouteTrips = trips.filter(t => t.route_id === errorRouteId);
          for (const trip of errorRouteTrips) {
            expect(trip.direction).toBe('unknown');
          }
          
          // 他の路線のtripは正常に処理されている（directionプロパティが設定されている）
          const otherRouteTrips = trips.filter(t => t.route_id !== errorRouteId);
          for (const trip of otherRouteTrips) {
            expect(trip).toHaveProperty('direction');
            expect(['0', '1', 'unknown']).toContain(trip.direction);
          }
          
          // 全てのtripがdirectionプロパティを持つことを確認
          for (const trip of trips) {
            expect(trip).toHaveProperty('direction');
          }
          
          // モックをリストア
          DirectionDetector.detectDirectionByStopSequence = originalDetect;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ15の補足: 複数の路線でエラーが発生しても処理は継続される
   * 
   * 検証: 要件6.4
   */
  it('プロパティ15（補足）: 複数の路線でエラーが発生しても、残りの路線の処理は継続される', () => {
    fc.assert(
      fc.property(
        multipleRoutesDataArb,
        fc.array(fc.integer({ min: 0, max: 2 }), { minLength: 1, maxLength: 2 }), // エラーを発生させる路線のインデックス配列
        ({ routeIds, trips, stopTimes, routeData }, errorRouteIndices) => {
          // エラーを発生させる路線を選択
          const errorRouteIds = errorRouteIndices.map(idx => routeIds[idx % routeIds.length]);
          
          const loader = new DataLoader();
          loader.trips = trips;
          loader.stopTimes = stopTimes;
          
          // DirectionDetector.detectDirectionByStopSequence()をモック化
          const originalDetect = DirectionDetector.detectDirectionByStopSequence;
          DirectionDetector.detectDirectionByStopSequence = vi.fn((routeId, trips, stopTimes) => {
            if (errorRouteIds.includes(routeId)) {
              throw new Error(`テスト用エラー: 路線${routeId}の方向判定に失敗`);
            }
            return originalDetect.call(DirectionDetector, routeId, trips, stopTimes);
          });
          
          // enrichTripsWithDirection()を実行
          loader.enrichTripsWithDirection();
          
          // エラーが発生した路線のtripは全てunknownに設定されている
          for (const errorRouteId of errorRouteIds) {
            const errorRouteTrips = trips.filter(t => t.route_id === errorRouteId);
            for (const trip of errorRouteTrips) {
              expect(trip.direction).toBe('unknown');
            }
          }
          
          // 他の路線のtripは正常に処理されている
          const otherRouteTrips = trips.filter(t => !errorRouteIds.includes(t.route_id));
          for (const trip of otherRouteTrips) {
            expect(trip).toHaveProperty('direction');
            expect(['0', '1', 'unknown']).toContain(trip.direction);
          }
          
          // 全てのtripがdirectionプロパティを持つことを確認
          for (const trip of trips) {
            expect(trip).toHaveProperty('direction');
          }
          
          // モックをリストア
          DirectionDetector.detectDirectionByStopSequence = originalDetect;
        }
      ),
      { numRuns: 100 }
    );
  });
});
