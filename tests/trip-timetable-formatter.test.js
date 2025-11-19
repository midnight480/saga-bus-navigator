/**
 * TripTimetableFormatterのテスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';

// モックDataLoaderクラス
class MockDataLoader {
  constructor(data = {}) {
    this.stopTimes = data.stopTimes || [];
    this.trips = data.trips || [];
    this.routes = data.routes || [];
    this.gtfsStops = data.gtfsStops || [];
  }
}

// TripTimetableFormatterクラスをインポート
// ブラウザ環境をシミュレート
global.window = global;

// trip-timetable-formatter.jsを読み込み
const fs = await import('fs');
const path = await import('path');
const formatterCode = fs.readFileSync(
  path.join(process.cwd(), 'js/trip-timetable-formatter.js'),
  'utf-8'
);
eval(formatterCode);

const TripTimetableFormatter = global.TripTimetableFormatter;

describe('TripTimetableFormatter', () => {
  describe('Property 1: 時刻表データ取得の完全性', () => {
    /**
     * Feature: trip-timetable-display, Property 1: 時刻表データ取得の完全性
     * Validates: Requirements 1.1, 1.2
     * 
     * 任意の有効なtrip_idに対して、getTimetableData()は該当便の全停車時刻データを返し、
     * データはstop_sequenceの昇順でソートされている
     */
    it('should return all stop times sorted by stop_sequence for any valid trip_id', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（2-20個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (tripId, stopTimesTemplate) => {
            // stop_timesデータを生成（trip_idを設定）
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            // tripsデータを生成
            const trips = [{
              trip_id: tripId,
              route_id: 'route_1'
            }];

            // routesデータを生成
            const routes = [{
              route_id: 'route_1',
              route_long_name: 'テスト路線'
            }];

            // gtfsStopsデータを生成
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            // MockDataLoaderを作成
            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            // TripTimetableFormatterを作成
            const formatter = new TripTimetableFormatter(dataLoader);

            // getTimetableData()を呼び出し
            const result = formatter.getTimetableData(tripId);

            // 結果が存在することを確認
            expect(result).not.toBeNull();
            expect(result.tripId).toBe(tripId);

            // 全停車時刻データが返されることを確認
            expect(result.stops.length).toBe(stopTimes.length);

            // stop_sequenceの昇順でソートされていることを確認
            for (let i = 1; i < result.stops.length; i++) {
              expect(result.stops[i].stopSequence).toBeGreaterThanOrEqual(
                result.stops[i - 1].stopSequence
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: バス停名取得の正確性', () => {
    /**
     * Feature: trip-timetable-display, Property 2: バス停名取得の正確性
     * Validates: Requirements 1.3, 1.4
     * 
     * 任意の有効なstop_idに対して、getStopName()は対応するバス停名を返し、
     * 存在しないstop_idに対しては「バス停名不明」を返す
     */
    it('should return correct stop name for valid stop_id and "バス停名不明" for invalid', () => {
      fc.assert(
        fc.property(
          // gtfsStopsジェネレータ（ユニークなstop_idを生成）
          fc.array(
            fc.record({
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              stop_name: fc.string({ minLength: 1, maxLength: 50 })
            }),
            { minLength: 1, maxLength: 20 }
          ).map(stops => {
            // stop_idをユニークにする
            const uniqueStops = [];
            const seenIds = new Set();
            for (const stop of stops) {
              if (!seenIds.has(stop.stop_id)) {
                uniqueStops.push(stop);
                seenIds.add(stop.stop_id);
              }
            }
            return uniqueStops;
          }).filter(stops => stops.length > 0), // 空配列を除外
          // 存在しないstop_idジェネレータ
          fc.string({ minLength: 1, maxLength: 10 }),
          (gtfsStops, invalidStopId) => {
            // invalidStopIdがgtfsStopsに存在しないことを確保
            fc.pre(!gtfsStops.some(s => s.stop_id === invalidStopId));

            // MockDataLoaderを作成
            const dataLoader = new MockDataLoader({ gtfsStops });

            // TripTimetableFormatterを作成
            const formatter = new TripTimetableFormatter(dataLoader);

            // 有効なstop_idに対してバス停名が返されることを確認
            gtfsStops.forEach(stop => {
              const result = formatter.getStopName(stop.stop_id);
              expect(result).toBe(stop.stop_name);
            });

            // 存在しないstop_idに対して「バス停名不明」が返されることを確認
            const result = formatter.getStopName(invalidStopId);
            expect(result).toBe('バス停名不明');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: 時刻フォーマットの正確性', () => {
    /**
     * Feature: trip-timetable-display, Property 3: 時刻フォーマットの正確性
     * Validates: Requirements 1.5
     * 
     * 任意のarrival_time（HH:MM:SS形式）に対して、formatArrivalTime()はHH:MM形式の文字列を返す
     */
    it('should format arrival_time to HH:MM format for any valid time', () => {
      fc.assert(
        fc.property(
          // arrival_timeジェネレータ（HH:MM:SS形式）
          fc.tuple(
            fc.integer({ min: 0, max: 23 }),
            fc.integer({ min: 0, max: 59 }),
            fc.integer({ min: 0, max: 59 })
          ),
          ([hour, minute, second]) => {
            const arrivalTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;

            // MockDataLoaderを作成
            const dataLoader = new MockDataLoader({});

            // TripTimetableFormatterを作成
            const formatter = new TripTimetableFormatter(dataLoader);

            // formatArrivalTime()を呼び出し
            const result = formatter.formatArrivalTime(arrivalTime);

            // HH:MM形式であることを確認
            expect(result).toMatch(/^\d{2}:\d{2}$/);

            // 時と分が正しいことを確認
            const [resultHour, resultMinute] = result.split(':').map(Number);
            expect(resultHour).toBe(hour);
            expect(resultMinute).toBe(minute);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return "--:--" for invalid arrival_time', () => {
      const dataLoader = new MockDataLoader({});
      const formatter = new TripTimetableFormatter(dataLoader);

      // 不正なフォーマット
      expect(formatter.formatArrivalTime('')).toBe('--:--');
      expect(formatter.formatArrivalTime(null)).toBe('--:--');
      expect(formatter.formatArrivalTime(undefined)).toBe('--:--');
      expect(formatter.formatArrivalTime('invalid')).toBe('--:--');
      expect(formatter.formatArrivalTime('12')).toBe('--:--');
    });
  });

  describe('Property 4: 時刻表フォーマットの正確性', () => {
    /**
     * Feature: trip-timetable-display, Property 4: 時刻表フォーマットの正確性
     * Validates: Requirements 2.1, 2.2, 2.3
     * 
     * 任意の時刻表データに対して、formatTimetableText()は
     * 「バス停名（到着HH:MM）→ バス停名（到着HH:MM）→ ...」の形式で文字列を生成する
     */
    it('should format timetable text with correct format for any timetable data', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（2-10個の停車、ユニークなstop_idを生成）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 2, maxLength: 10 }
          ).map(stops => {
            // stop_idをユニークにする
            const uniqueStops = [];
            const seenIds = new Set();
            for (const stop of stops) {
              if (!seenIds.has(stop.stop_id)) {
                uniqueStops.push(stop);
                seenIds.add(stop.stop_id);
              }
            }
            return uniqueStops;
          }).filter(stops => stops.length >= 2), // 最低2個の停車を確保
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // formatTimetableText()を呼び出し
            const result = formatter.formatTimetableText(tripId);

            // 結果が文字列であることを確認
            expect(typeof result).toBe('string');

            // 矢印（→）で区切られていることを確認
            const parts = result.split(' → ');
            expect(parts.length).toBe(stopTimes.length);

            // 各部分が「バス停名（HH:MM）」形式であることを確認
            parts.forEach(part => {
              // **で囲まれている場合は除去
              const cleanPart = part.replace(/\*\*/g, '');
              expect(cleanPart).toMatch(/^.+（\d{2}:\d{2}）$/);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: 時刻表HTMLの構造', () => {
    /**
     * Feature: trip-timetable-display, Property 5: 時刻表HTMLの構造
     * Validates: Requirements 2.5, 3.2
     * 
     * 任意のtrip_idに対して、formatTimetableHTML()は便IDと路線名を含むHTMLを生成し、
     * 時刻表セクションには「時刻表」ラベルが含まれる
     */
    it('should generate HTML with trip_id, route name, and "時刻表" label', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // route_nameジェネレータ
          fc.string({ minLength: 1, maxLength: 50 }),
          // stop_timesジェネレータ（2-10個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tripId, routeName, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: routeName }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // formatTimetableHTML()を呼び出し
            const result = formatter.formatTimetableHTML(tripId);

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // 「時刻表」ラベルが含まれることを確認
            expect(result).toContain('時刻表');

            // trip_idが含まれることを確認
            expect(result).toContain(tripId);

            // 路線名が含まれることを確認
            expect(result).toContain(routeName);

            // trip-timetableクラスが含まれることを確認
            expect(result).toContain('trip-timetable');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: ログ出力の完全性', () => {
    /**
     * Feature: trip-timetable-display, Property 9: ログ出力の完全性
     * Validates: Requirements 4.5
     * 
     * 任意の時刻表生成処理に対して、処理完了時にコンソールに処理時間がログ出力される
     */
    it('should log processing time for any timetable generation', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tripId, stopTimesTemplate) => {
            // console.logをモック
            const originalLog = console.log;
            let logCalled = false;
            let logMessage = '';

            console.log = (message, ...args) => {
              if (message.includes('時刻表生成完了') && message.includes('duration')) {
                logCalled = true;
                logMessage = message;
              }
            };

            try {
              // データを生成
              const stopTimes = stopTimesTemplate.map(st => ({
                ...st,
                trip_id: tripId
              }));

              const trips = [{ trip_id: tripId, route_id: 'route_1' }];
              const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
              const gtfsStops = stopTimesTemplate.map(st => ({
                stop_id: st.stop_id,
                stop_name: `バス停_${st.stop_id}`
              }));

              const dataLoader = new MockDataLoader({
                stopTimes,
                trips,
                routes,
                gtfsStops
              });

              const formatter = new TripTimetableFormatter(dataLoader);

              // formatTimetableHTML()を呼び出し
              formatter.formatTimetableHTML(tripId);

              // ログが出力されたことを確認
              expect(logCalled).toBe(true);
              expect(logMessage).toContain('tripId');
              expect(logMessage).toContain('duration');
            } finally {
              // console.logを元に戻す
              console.log = originalLog;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: エラー時のログ出力', () => {
    /**
     * Feature: trip-timetable-display, Property 10: エラー時のログ出力
     * Validates: Requirements 5.5
     * 
     * 任意のエラー発生時に対して、コンソールにtrip_idとエラーメッセージが出力される
     */
    it('should log trip_id and error message for any error', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ（存在しないtrip_id）
          fc.string({ minLength: 1, maxLength: 20 }),
          (tripId) => {
            // console.errorをモック
            const originalError = console.error;
            let errorCalled = false;
            let errorMessage = '';

            console.error = (message, ...args) => {
              if (message.includes('trip_id') && message.includes(tripId)) {
                errorCalled = true;
                errorMessage = message;
              }
            };

            try {
              // 空のデータでMockDataLoaderを作成（trip_idが存在しない）
              const dataLoader = new MockDataLoader({
                stopTimes: [],
                trips: [],
                routes: [],
                gtfsStops: []
              });

              const formatter = new TripTimetableFormatter(dataLoader);

              // getTimetableData()を呼び出し（エラーが発生する）
              const result = formatter.getTimetableData(tripId);

              // 結果がnullであることを確認
              expect(result).toBeNull();

              // エラーログが出力されたことを確認
              expect(errorCalled).toBe(true);
              expect(errorMessage).toContain('trip_id');
              expect(errorMessage).toContain(tripId);
            } finally {
              // console.errorを元に戻す
              console.error = originalError;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: 折りたたみ状態の判定', () => {
    /**
     * Feature: trip-timetable-display, Property 12: 折りたたみ状態の判定
     * Validates: Requirements 7.1
     * 
     * 任意の時刻表データに対して、停車バス停数が10個を超える場合、
     * デフォルトで折りたたまれた状態（collapsed=true）で表示される
     */
    it('should default to collapsed state when stops exceed 10', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（11-20個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 11, maxLength: 20 }
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // formatTimetableHTML()を呼び出し（オプション指定なし）
            const result = formatter.formatTimetableHTML(tripId);

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // data-collapsed="true"が含まれることを確認
            expect(result).toContain('data-collapsed="true"');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not collapse when stops are 10 or fewer', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（2-10個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // formatTimetableHTML()を呼び出し（オプション指定なし）
            const result = formatter.formatTimetableHTML(tripId);

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // data-collapsed="false"が含まれることを確認
            expect(result).toContain('data-collapsed="false"');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: 折りたたみリンクの表示', () => {
    /**
     * Feature: trip-timetable-display, Property 13: 折りたたみリンクの表示
     * Validates: Requirements 7.2
     * 
     * 任意の折りたたまれた時刻表に対して、
     * 「時刻表を表示（全○停車）」というテキストを含むリンクが表示される
     */
    it('should display expand link with total stops count when collapsed', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（11-20個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 11, maxLength: 20 }
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // formatTimetableHTML()を呼び出し（折りたたみ状態）
            const result = formatter.formatTimetableHTML(tripId, { collapsed: true });

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // 「時刻表を表示」リンクが含まれることを確認
            expect(result).toContain('時刻表を表示');

            // 全停車数が含まれることを確認
            expect(result).toContain(`全${stopTimes.length}停車`);

            // data-action="expand"が含まれることを確認
            expect(result).toContain('data-action="expand"');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not display toggle link when stops are 10 or fewer', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（2-10個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // formatTimetableHTML()を呼び出し
            const result = formatter.formatTimetableHTML(tripId);

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // 折りたたみリンクが含まれないことを確認
            expect(result).not.toContain('timetable-toggle');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 14: 展開・折りたたみの動作', () => {
    /**
     * Feature: trip-timetable-display, Property 14: 展開・折りたたみの動作
     * Validates: Requirements 7.3, 7.5
     * 
     * 任意の時刻表に対して、折りたたみリンクをクリックすると展開状態が切り替わり、
     * 展開時は全停車バス停が表示され、折りたたみ時は最初の3停車と最後の3停車のみが表示される
     */
    it('should show all stops when expanded and limited stops when collapsed', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ（空白のみを除外）
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          // stop_timesジェネレータ（11-20個の停車、stop_sequenceは連番、stop_idはユニーク）
          fc.integer({ min: 11, max: 20 }).chain(count =>
            fc.constantFrom(...Array(count).fill(null).map((_, i) => i + 1)).chain(() =>
              fc.tuple(
                ...Array(count).fill(null).map((_, i) =>
                  fc.record({
                    stop_id: fc.constant(`stop_${i + 1}`), // ユニークなstop_idを生成
                    arrival_time: fc.tuple(
                      fc.integer({ min: 0, max: 23 }),
                      fc.integer({ min: 0, max: 59 }),
                      fc.integer({ min: 0, max: 59 })
                    ).map(([h, m, s]) => 
                      `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
                    )
                  }).map(st => ({ ...st, stop_sequence: i + 1 }))
                )
              )
            )
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // getTimetableDataを呼び出してソート後のデータを取得
            const timetableData = formatter.getTimetableData(tripId);
            const sortedStops = timetableData.stops;

            // キャッシュをクリア（異なるオプションで生成するため）
            formatter.clearCache();

            // 展開状態のHTMLを生成
            const expandedHTML = formatter.formatTimetableHTML(tripId, { collapsed: false });

            // 全停車バス停が含まれることを確認
            sortedStops.forEach(stop => {
              expect(expandedHTML).toContain(stop.stopName);
            });

            // キャッシュをクリア（異なるオプションで生成するため）
            formatter.clearCache();

            // 折りたたみ状態のHTMLを生成（11停車以上なので折りたたまれる）
            const collapsedHTML = formatter.formatTimetableHTML(tripId, { collapsed: true });

            // 最初の3停車が含まれることを確認
            for (let i = 0; i < Math.min(3, sortedStops.length); i++) {
              expect(collapsedHTML).toContain(sortedStops[i].stopName);
            }

            // 最後の3停車が含まれることを確認
            const lastThreeStart = Math.max(0, sortedStops.length - 3);
            for (let i = lastThreeStart; i < sortedStops.length; i++) {
              expect(collapsedHTML).toContain(sortedStops[i].stopName);
            }

            // 省略記号が含まれることを確認（11停車以上の場合のみ）
            if (sortedStops.length > 10) {
              // デバッグ: HTMLに"..."が含まれているか確認
              if (!collapsedHTML.includes('...')) {
                console.log('Collapsed HTML:', collapsedHTML);
                console.log('Sorted stops length:', sortedStops.length);
              }
              expect(collapsedHTML).toContain('...');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: 展開時のリンクテキスト', () => {
    /**
     * Feature: trip-timetable-display, Property 15: 展開時のリンクテキスト
     * Validates: Requirements 7.4
     * 
     * 任意の展開された時刻表に対して、
     * 「時刻表を折りたたむ」というテキストを含むリンクが表示される
     */
    it('should display collapse link when expanded', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（11-20個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 11, maxLength: 20 }
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // formatTimetableHTML()を呼び出し（展開状態）
            const result = formatter.formatTimetableHTML(tripId, { collapsed: false });

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // 「時刻表を折りたたむ」リンクが含まれることを確認
            expect(result).toContain('時刻表を折りたたむ');

            // data-action="collapse"が含まれることを確認
            expect(result).toContain('data-action="collapse"');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: 現在位置の強調表示', () => {
    /**
     * Feature: trip-timetable-display, Property 11: 現在位置の強調表示
     * Validates: Requirements 6.1, 6.2, 6.3
     * 
     * 任意のcurrent_stop_sequenceが指定された時刻表に対して、
     * 該当するバス停には強調表示のCSSクラスが適用され、「現在地」マーカーが含まれる
     */
    it('should apply current-stop class and marker for any current_stop_sequence', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ（3-10個の停車）
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 3, maxLength: 10 }
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // 中間のstop_sequenceを現在位置として選択
            const middleIndex = Math.floor(stopTimes.length / 2);
            const currentStopSequence = stopTimes[middleIndex].stop_sequence;

            // formatTimetableHTML()を呼び出し
            const result = formatter.formatTimetableHTML(tripId, {
              currentStopSequence,
              highlightCurrent: true
            });

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // current-stopクラスが含まれることを確認
            expect(result).toContain('current-stop');

            // 「現在地」マーカーが含まれることを確認
            expect(result).toContain('current-marker');
            expect(result).toContain('← 現在地');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not apply current-stop class when highlightCurrent is false', () => {
      fc.assert(
        fc.property(
          // trip_idジェネレータ
          fc.string({ minLength: 1, maxLength: 20 }),
          // stop_timesジェネレータ
          fc.array(
            fc.record({
              stop_sequence: fc.integer({ min: 1, max: 100 }),
              stop_id: fc.string({ minLength: 1, maxLength: 10 }),
              arrival_time: fc.tuple(
                fc.integer({ min: 0, max: 23 }),
                fc.integer({ min: 0, max: 59 }),
                fc.integer({ min: 0, max: 59 })
              ).map(([h, m, s]) => 
                `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
              )
            }),
            { minLength: 3, maxLength: 10 }
          ),
          (tripId, stopTimesTemplate) => {
            // データを生成
            const stopTimes = stopTimesTemplate.map(st => ({
              ...st,
              trip_id: tripId
            }));

            const trips = [{ trip_id: tripId, route_id: 'route_1' }];
            const routes = [{ route_id: 'route_1', route_long_name: 'テスト路線' }];
            const gtfsStops = stopTimesTemplate.map(st => ({
              stop_id: st.stop_id,
              stop_name: `バス停_${st.stop_id}`
            }));

            const dataLoader = new MockDataLoader({
              stopTimes,
              trips,
              routes,
              gtfsStops
            });

            const formatter = new TripTimetableFormatter(dataLoader);

            // 中間のstop_sequenceを現在位置として選択
            const middleIndex = Math.floor(stopTimes.length / 2);
            const currentStopSequence = stopTimes[middleIndex].stop_sequence;

            // formatTimetableHTML()を呼び出し（highlightCurrent: false）
            const result = formatter.formatTimetableHTML(tripId, {
              currentStopSequence,
              highlightCurrent: false
            });

            // HTMLが生成されることを確認
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);

            // current-stopクラスが含まれないことを確認
            expect(result).not.toContain('current-stop');

            // 「現在地」マーカーが含まれないことを確認
            expect(result).not.toContain('← 現在地');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
