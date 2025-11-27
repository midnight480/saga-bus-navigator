/**
 * DataTransformer.transformTimetable()のプロパティベーステスト
 * 
 * Feature: direction-detection-integration, Property 8: DataTransformerの方向参照
 * Feature: direction-detection-integration, Property 9: 時刻表エントリの方向情報
 * 
 * 検証: 要件3.2, 3.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';

// DataTransformerとDirectionDetectorをグローバルスコープから取得
const getDataTransformer = () => {
  if (typeof window !== 'undefined' && window.DataTransformer) {
    return window.DataTransformer;
  }
  if (typeof global !== 'undefined' && global.DataTransformer) {
    return global.DataTransformer;
  }
  throw new Error('DataTransformerが見つかりません');
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
 * 有効なservice_idを生成
 */
const serviceIdArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => `service_${s}`);

/**
 * 有効なagency_idを生成
 */
const agencyIdArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => `agency_${s}`);

/**
 * 有効なdirectionを生成（'0', '1', 'unknown'）
 */
const directionArb = fc.oneof(
  fc.constant('0'),
  fc.constant('1'),
  fc.constant('unknown')
);

/**
 * 有効なstop_sequenceを生成
 */
const stopSequenceArb = fc.integer({ min: 1, max: 50 });

/**
 * 有効な時刻を生成（HH:MM:SS形式）
 */
const timeArb = fc.record({
  hour: fc.integer({ min: 0, max: 23 }),
  minute: fc.integer({ min: 0, max: 59 }),
  second: fc.integer({ min: 0, max: 59 })
}).map(({ hour, minute, second }) => 
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
);

/**
 * 有効なtripオブジェクトを生成（directionプロパティ付き）
 */
const tripWithDirectionArb = fc.record({
  trip_id: tripIdArb,
  route_id: routeIdArb,
  service_id: serviceIdArb,
  trip_headsign: fc.oneof(
    fc.constant('佐賀駅'),
    fc.constant('県庁前'),
    fc.constant('バスセンター')
  ),
  direction_id: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('')),
  direction: directionArb // 新しいdirectionプロパティ
});

/**
 * 有効なtripオブジェクトを生成（directionプロパティなし）
 */
const tripWithoutDirectionArb = fc.record({
  trip_id: tripIdArb,
  route_id: routeIdArb,
  service_id: serviceIdArb,
  trip_headsign: fc.oneof(
    fc.constant('佐賀駅'),
    fc.constant('県庁前'),
    fc.constant('バスセンター')
  ),
  direction_id: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant(''))
});

/**
 * 有効なstopTimeオブジェクトを生成
 */
const stopTimeArb = (tripId) => fc.record({
  trip_id: fc.constant(tripId),
  stop_id: stopIdArb,
  stop_sequence: stopSequenceArb.map(s => s.toString()),
  arrival_time: timeArb,
  departure_time: timeArb
});

/**
 * 有効なrouteオブジェクトを生成
 */
const routeArb = (routeId, agencyId) => fc.record({
  route_id: fc.constant(routeId),
  route_long_name: fc.oneof(
    fc.constant('佐賀市営バス1号線'),
    fc.constant('祐徳バス2号線'),
    fc.constant('西鉄バス3号線')
  ),
  agency_id: fc.constant(agencyId)
});

/**
 * 有効なcalendarオブジェクトを生成
 */
const calendarArb = (serviceId) => fc.record({
  service_id: fc.constant(serviceId),
  monday: fc.oneof(fc.constant('0'), fc.constant('1')),
  tuesday: fc.oneof(fc.constant('0'), fc.constant('1')),
  wednesday: fc.oneof(fc.constant('0'), fc.constant('1')),
  thursday: fc.oneof(fc.constant('0'), fc.constant('1')),
  friday: fc.oneof(fc.constant('0'), fc.constant('1')),
  saturday: fc.oneof(fc.constant('0'), fc.constant('1')),
  sunday: fc.oneof(fc.constant('0'), fc.constant('1'))
});

/**
 * 有効なagencyオブジェクトを生成
 */
const agencyArb = (agencyId) => fc.record({
  agency_id: fc.constant(agencyId),
  agency_name: fc.oneof(
    fc.constant('佐賀市営バス'),
    fc.constant('祐徳バス'),
    fc.constant('西鉄バス')
  )
});

/**
 * 有効なstopオブジェクトを生成
 */
const stopArb = (stopId) => fc.record({
  stop_id: fc.constant(stopId),
  stop_name: fc.oneof(
    fc.constant('佐賀駅バスセンター'),
    fc.constant('県庁前'),
    fc.constant('市役所前')
  ),
  stop_lat: fc.double({ min: 33.0, max: 34.0 }),
  stop_lon: fc.double({ min: 130.0, max: 131.0 })
});

/**
 * 完全なGTFSデータセットを生成（directionプロパティ付きtrip）
 */
const gtfsDataWithDirectionArb = fc.record({
  routeId: routeIdArb,
  agencyId: agencyIdArb,
  serviceId: serviceIdArb,
  tripCount: fc.integer({ min: 1, max: 5 })
}).chain(({ routeId, agencyId, serviceId, tripCount }) => {
  return fc.array(tripWithDirectionArb, { minLength: tripCount, maxLength: tripCount })
    .chain(trips => {
      // 各tripのroute_id, service_idを統一
      const unifiedTrips = trips.map(trip => ({
        ...trip,
        route_id: routeId,
        service_id: serviceId
      }));
      
      // 各tripに対してstopTimesを生成
      return fc.tuple(
        fc.constant(unifiedTrips),
        fc.array(
          fc.oneof(...unifiedTrips.map(trip => 
            fc.array(stopTimeArb(trip.trip_id), { minLength: 1, maxLength: 5 })
          ))
        ).map(stopTimesArrays => stopTimesArrays.flat()),
        routeArb(routeId, agencyId),
        calendarArb(serviceId),
        agencyArb(agencyId),
        fc.array(
          fc.oneof(...unifiedTrips.flatMap(trip => 
            fc.array(stopTimeArb(trip.trip_id), { minLength: 1, maxLength: 5 })
              .map(stopTimes => stopTimes.map(st => stopArb(st.stop_id)))
          )).map(stops => stops.flat())
        ).map(stopsArrays => {
          // 重複を除去
          const uniqueStops = new Map();
          stopsArrays.flat().forEach(stop => {
            if (!uniqueStops.has(stop.stop_id)) {
              uniqueStops.set(stop.stop_id, stop);
            }
          });
          return Array.from(uniqueStops.values());
        })
      );
    });
});

/**
 * 完全なGTFSデータセットを生成（directionプロパティなしtrip）
 */
const gtfsDataWithoutDirectionArb = fc.record({
  routeId: routeIdArb,
  agencyId: agencyIdArb,
  serviceId: serviceIdArb,
  tripCount: fc.integer({ min: 1, max: 5 })
}).chain(({ routeId, agencyId, serviceId, tripCount }) => {
  return fc.array(tripWithoutDirectionArb, { minLength: tripCount, maxLength: tripCount })
    .chain(trips => {
      // 各tripのroute_id, service_idを統一
      const unifiedTrips = trips.map(trip => ({
        ...trip,
        route_id: routeId,
        service_id: serviceId
      }));
      
      // 各tripに対してstopTimesを生成
      return fc.tuple(
        fc.constant(unifiedTrips),
        fc.array(
          fc.oneof(...unifiedTrips.map(trip => 
            fc.array(stopTimeArb(trip.trip_id), { minLength: 1, maxLength: 5 })
          ))
        ).map(stopTimesArrays => stopTimesArrays.flat()),
        routeArb(routeId, agencyId),
        calendarArb(serviceId),
        agencyArb(agencyId),
        fc.array(
          fc.oneof(...unifiedTrips.flatMap(trip => 
            fc.array(stopTimeArb(trip.trip_id), { minLength: 1, maxLength: 5 })
              .map(stopTimes => stopTimes.map(st => stopArb(st.stop_id)))
          )).map(stops => stops.flat())
        ).map(stopsArrays => {
          // 重複を除去
          const uniqueStops = new Map();
          stopsArrays.flat().forEach(stop => {
            if (!uniqueStops.has(stop.stop_id)) {
              uniqueStops.set(stop.stop_id, stop);
            }
          });
          return Array.from(uniqueStops.values());
        })
      );
    });
});

describe('DataTransformer.transformTimetable() プロパティテスト', () => {
  let DataTransformer;
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
    
    DataTransformer = getDataTransformer();
    DirectionDetector = getDirectionDetector();
    
    // キャッシュをクリア
    DirectionDetector.directionCache.clear();
  });

  /**
   * プロパティ8: DataTransformerの方向参照
   * 
   * 任意のtrip.directionが設定されているtripにおいて、
   * 変換後の時刻表エントリは同じdirection値を持つ
   * 
   * 検証: 要件3.2
   */
  it('プロパティ8: 任意のtrip.directionが設定されているtripについて、変換後の時刻表エントリは同じdirection値を持つ', () => {
    fc.assert(
      fc.property(gtfsDataWithDirectionArb, ([trips, stopTimes, route, calendar, agency, stops]) => {
        // DataTransformer.transformTimetable()を実行
        const timetable = DataTransformer.transformTimetable(
          stopTimes,
          trips,
          [route],
          [calendar],
          [agency],
          stops
        );
        
        // 各時刻表エントリについて検証
        for (const entry of timetable) {
          const trip = trips.find(t => t.trip_id === entry.tripId);
          
          if (trip && trip.direction !== undefined && trip.direction !== null) {
            // trip.directionが設定されている場合、時刻表エントリのdirectionと一致することを確認
            expect(entry.direction).toBe(trip.direction);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ9: 時刻表エントリの方向情報
   * 
   * 任意の変換された時刻表エントリはdirectionフィールドを含む
   * 
   * 検証: 要件3.4
   */
  it('プロパティ9: 任意の変換された時刻表エントリはdirectionフィールドを含む', () => {
    fc.assert(
      fc.property(gtfsDataWithDirectionArb, ([trips, stopTimes, route, calendar, agency, stops]) => {
        // DataTransformer.transformTimetable()を実行
        const timetable = DataTransformer.transformTimetable(
          stopTimes,
          trips,
          [route],
          [calendar],
          [agency],
          stops
        );
        
        // 全ての時刻表エントリがdirectionフィールドを持つことを確認
        for (const entry of timetable) {
          expect(entry).toHaveProperty('direction');
          expect(entry.direction).toBeDefined();
          expect(typeof entry.direction).toBe('string');
          expect(['0', '1', 'unknown']).toContain(entry.direction);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ9（directionプロパティなしtrip）: 時刻表エントリの方向情報
   * 
   * trip.directionが設定されていない場合でも、
   * 変換された時刻表エントリはdirectionフィールドを含む
   * 
   * 検証: 要件3.4
   */
  it('プロパティ9（フォールバック）: trip.directionが設定されていない場合でも、時刻表エントリはdirectionフィールドを含む', () => {
    fc.assert(
      fc.property(gtfsDataWithoutDirectionArb, ([trips, stopTimes, route, calendar, agency, stops]) => {
        // DataTransformer.transformTimetable()を実行
        const timetable = DataTransformer.transformTimetable(
          stopTimes,
          trips,
          [route],
          [calendar],
          [agency],
          stops
        );
        
        // 全ての時刻表エントリがdirectionフィールドを持つことを確認
        for (const entry of timetable) {
          expect(entry).toHaveProperty('direction');
          expect(entry.direction).toBeDefined();
          expect(typeof entry.direction).toBe('string');
          expect(['0', '1', 'unknown']).toContain(entry.direction);
        }
      }),
      { numRuns: 100 }
    );
  });
});
