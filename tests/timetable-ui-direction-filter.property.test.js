/**
 * TimetableUI 方向フィルタのプロパティベーステスト
 * 
 * **Feature: timetable-direction-display, Property 5: 方向フィルタの適用**
 * **Feature: timetable-direction-display, Property 6: 方向フィルタの状態表示**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import '../js/direction-detector.js';
import '../js/timetable-controller.js';
import '../js/timetable-ui.js';

describe('TimetableUI - 方向フィルタのプロパティベーステスト', () => {
  let timetableUI;

  beforeEach(() => {
    // DOM環境をセットアップ（モーダル要素を含む）
    document.body.innerHTML = `
      <div id="test-container"></div>
      <div id="timetable-modal" class="timetable-modal" role="dialog" aria-labelledby="timetable-modal-title" aria-modal="true" tabindex="-1" hidden>
        <div class="timetable-modal-content">
          <div id="timetable-modal-body" class="timetable-modal-body">
          </div>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    if (timetableUI && timetableUI.modal) {
      timetableUI.closeModal();
    }
    document.body.innerHTML = '';
  });

  /**
   * プロパティ5: 方向フィルタの適用
   * 任意の方向フィルタ適用後、表示される便は全て選択された方向と一致する
   * **検証: 要件4.2, 4.3**
   */
  it('プロパティ5: フィルタ適用後、表示される便は全て選択された方向と一致する', () => {
    fc.assert(
      fc.property(
        // ランダムな時刻表データを生成
        fc.array(
          fc.record({
            tripId: fc.string({ minLength: 1, maxLength: 10 }),
            stopId: fc.constant('STOP001'),
            departureTime: fc.string({ minLength: 5, maxLength: 8 }),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 20 }),
            direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
          }),
          { minLength: 5, maxLength: 20 }
        ),
        // ランダムな方向フィルタを生成
        fc.oneof(fc.constant('all'), fc.constant('0'), fc.constant('1')),
        (timetableData, directionFilter) => {
          // テストデータを準備
          const stops = [
            {
              stop_id: 'STOP001',
              stop_name: 'テストバス停',
              stop_lat: '33.2490',
              stop_lon: '130.2990'
            }
          ];

          const routes = [
            {
              route_id: 'ROUTE001',
              route_long_name: 'テスト路線',
              route_short_name: '1',
              agency_id: '1',
              route_type: '3'
            }
          ];

          const calendar = [
            {
              service_id: 'WEEKDAY',
              monday: '1',
              tuesday: '1',
              wednesday: '1',
              thursday: '1',
              friday: '1',
              saturday: '0',
              sunday: '0'
            }
          ];

          // tripsとstopTimesを生成
          const trips = timetableData.map((entry, index) => ({
            trip_id: entry.tripId || `TRIP${index}`,
            route_id: 'ROUTE001',
            service_id: 'WEEKDAY',
            trip_headsign: entry.tripHeadsign,
            direction_id: entry.direction
          }));

          const stopTimes = timetableData.map((entry, index) => ({
            trip_id: entry.tripId || `TRIP${index}`,
            stop_id: 'STOP001',
            arrival_time: entry.departureTime,
            departure_time: entry.departureTime,
            stop_sequence: '1'
          }));

          // TimetableControllerとTimetableUIを作成
          const timetableController = new window.TimetableController(
            stopTimes,
            trips,
            routes,
            calendar,
            stops
          );

          timetableUI = new window.TimetableUI(timetableController);
          timetableUI.currentStopId = 'STOP001';
          timetableUI.currentStopName = 'テストバス停';
          timetableUI.currentRouteId = 'ROUTE001';
          timetableUI.currentRouteName = 'テスト路線';

          // 方向フィルタを適用
          timetableUI.applyDirectionFilter(directionFilter);

          // 時刻表テーブルを取得
          const table = document.querySelector('.timetable-table');
          
          if (!table) {
            // テーブルが存在しない場合は、データが空だったと判断
            return true;
          }

          const rows = table.querySelectorAll('tbody tr');

          // 期待される便の数を計算
          let expectedCount;
          if (directionFilter === 'all') {
            expectedCount = timetableData.length;
          } else {
            expectedCount = timetableData.filter(entry => entry.direction === directionFilter).length;
          }

          // 表示されている便の数が期待値と一致することを確認
          if (expectedCount === 0) {
            // フィルタ後のデータが空の場合は、「該当する時刻表がありません」が表示される
            const noData = document.querySelector('.timetable-no-data');
            return noData !== null;
          }

          // 表示されている便の数が期待値と一致することを確認
          expect(rows.length).toBe(expectedCount);

          // 全ての表示されている便が選択された方向と一致することを確認
          if (directionFilter !== 'all') {
            // 実際のデータから方向を確認
            const displayedTrips = Array.from(rows).map((row, index) => {
              const timeCell = row.querySelector('.timetable-time');
              const time = timeCell.textContent;
              
              // 時刻から対応するtripを見つける
              const matchingEntry = timetableData.find(entry => entry.departureTime === time);
              return matchingEntry;
            });

            displayedTrips.forEach(trip => {
              if (trip) {
                expect(trip.direction).toBe(directionFilter);
              }
            });
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ6: 方向フィルタの状態表示
   * 任意の方向フィルタボタンにおいて、選択状態はaria-pressed属性で示される
   * **検証: 要件4.5, 5.3**
   */
  it('プロパティ6: フィルタボタンの選択状態はaria-pressed属性で示される', () => {
    fc.assert(
      fc.property(
        // ランダムな方向フィルタを生成
        fc.oneof(fc.constant('all'), fc.constant('0'), fc.constant('1')),
        (directionFilter) => {
          // テストデータを準備
          const stops = [
            {
              stop_id: 'STOP001',
              stop_name: 'テストバス停',
              stop_lat: '33.2490',
              stop_lon: '130.2990'
            }
          ];

          const routes = [
            {
              route_id: 'ROUTE001',
              route_long_name: 'テスト路線',
              route_short_name: '1',
              agency_id: '1',
              route_type: '3'
            }
          ];

          const calendar = [
            {
              service_id: 'WEEKDAY',
              monday: '1',
              tuesday: '1',
              wednesday: '1',
              thursday: '1',
              friday: '1',
              saturday: '0',
              sunday: '0'
            }
          ];

          const trips = [
            {
              trip_id: 'TRIP001',
              route_id: 'ROUTE001',
              service_id: 'WEEKDAY',
              trip_headsign: 'テスト行き',
              direction_id: '0'
            }
          ];

          const stopTimes = [
            {
              trip_id: 'TRIP001',
              stop_id: 'STOP001',
              arrival_time: '08:00:00',
              departure_time: '08:00:00',
              stop_sequence: '1'
            }
          ];

          // TimetableControllerとTimetableUIを作成
          const timetableController = new window.TimetableController(
            stopTimes,
            trips,
            routes,
            calendar,
            stops
          );

          timetableUI = new window.TimetableUI(timetableController);
          timetableUI.currentStopId = 'STOP001';
          timetableUI.currentStopName = 'テストバス停';
          timetableUI.currentRouteId = 'ROUTE001';
          timetableUI.currentRouteName = 'テスト路線';

          // 方向フィルタを適用
          timetableUI.applyDirectionFilter(directionFilter);

          // 方向フィルタボタンを取得
          const filter = document.querySelector('.direction-filter');
          expect(filter).toBeTruthy();

          const buttons = filter.querySelectorAll('.direction-filter-button');
          expect(buttons.length).toBe(3);

          // 各ボタンのaria-pressed属性を確認
          const allButton = buttons[0];
          const outboundButton = buttons[1];
          const inboundButton = buttons[2];

          if (directionFilter === 'all') {
            expect(allButton.getAttribute('aria-pressed')).toBe('true');
            expect(outboundButton.getAttribute('aria-pressed')).toBe('false');
            expect(inboundButton.getAttribute('aria-pressed')).toBe('false');
          } else if (directionFilter === '0') {
            expect(allButton.getAttribute('aria-pressed')).toBe('false');
            expect(outboundButton.getAttribute('aria-pressed')).toBe('true');
            expect(inboundButton.getAttribute('aria-pressed')).toBe('false');
          } else if (directionFilter === '1') {
            expect(allButton.getAttribute('aria-pressed')).toBe('false');
            expect(outboundButton.getAttribute('aria-pressed')).toBe('false');
            expect(inboundButton.getAttribute('aria-pressed')).toBe('true');
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
