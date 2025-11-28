/**
 * TimetableUI - 方向列表示のプロパティベーステスト
 * 
 * **Feature: timetable-direction-display, Property 3: 時刻表の方向列表示**
 * **Feature: timetable-direction-display, Property 4: 時刻表の方向情報**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import '../js/direction-detector.js';
import '../js/timetable-controller.js';
import '../js/timetable-ui.js';

describe('TimetableUI - 方向列表示のプロパティベーステスト', () => {
  let timetableUI;

  beforeEach(() => {
    // DOM環境をセットアップ
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
   * プロパティ3: 時刻表の方向列表示
   * *任意の*時刻表モーダルにおいて、時刻表テーブルは「方向」列を含む
   * **検証: 要件2.2**
   */
  it('プロパティ3: 任意の時刻表テーブルは方向列を含む', () => {
    fc.assert(
      fc.property(
        // ランダムな時刻表データを生成
        fc.array(
          fc.record({
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            stopId: fc.string({ minLength: 1, maxLength: 20 }),
            stopName: fc.string({ minLength: 1, maxLength: 50 }),
            routeId: fc.string({ minLength: 1, maxLength: 20 }),
            routeName: fc.string({ minLength: 1, maxLength: 50 }),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 50 }),
            departureTime: fc.oneof(
              fc.constant('08:00'),
              fc.constant('09:30'),
              fc.constant('12:45'),
              fc.constant('18:20'),
              fc.constant('翌01:30')
            ),
            departureHour: fc.integer({ min: 0, max: 27 }),
            departureMinute: fc.integer({ min: 0, max: 59 }),
            serviceDayType: fc.oneof(fc.constant('平日'), fc.constant('土日祝')),
            stopSequence: fc.integer({ min: 1, max: 50 }),
            direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (timetableData) => {
          // テストデータからGTFSデータを構築
          const stops = Array.from(new Set(timetableData.map(e => e.stopId))).map(stopId => ({
            stop_id: stopId,
            stop_name: timetableData.find(e => e.stopId === stopId).stopName,
            stop_lat: '33.2490',
            stop_lon: '130.2990'
          }));

          const routes = Array.from(new Set(timetableData.map(e => e.routeId))).map(routeId => ({
            route_id: routeId,
            route_long_name: timetableData.find(e => e.routeId === routeId).routeName,
            route_short_name: '1',
            agency_id: '1',
            route_type: '3'
          }));

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
            },
            {
              service_id: 'WEEKEND',
              monday: '0',
              tuesday: '0',
              wednesday: '0',
              thursday: '0',
              friday: '0',
              saturday: '1',
              sunday: '1'
            }
          ];

          const trips = Array.from(new Set(timetableData.map(e => e.tripId))).map(tripId => {
            const entry = timetableData.find(e => e.tripId === tripId);
            return {
              trip_id: tripId,
              route_id: entry.routeId,
              service_id: entry.serviceDayType === '平日' ? 'WEEKDAY' : 'WEEKEND',
              trip_headsign: entry.tripHeadsign,
              direction_id: entry.direction === 'unknown' ? undefined : entry.direction
            };
          });

          const stopTimes = timetableData.map(entry => ({
            trip_id: entry.tripId,
            stop_id: entry.stopId,
            arrival_time: entry.departureTime.includes('翌') 
              ? `${entry.departureHour}:${String(entry.departureMinute).padStart(2, '0')}:00`
              : entry.departureTime + ':00',
            departure_time: entry.departureTime.includes('翌')
              ? `${entry.departureHour}:${String(entry.departureMinute).padStart(2, '0')}:00`
              : entry.departureTime + ':00',
            stop_sequence: String(entry.stopSequence)
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

          // 時刻表を表示
          const firstStop = stops[0];
          const firstRoute = routes[0];
          timetableUI.currentStopId = firstStop.stop_id;
          timetableUI.currentStopName = firstStop.stop_name;
          timetableUI.currentRouteId = firstRoute.route_id;
          timetableUI.currentRouteName = firstRoute.route_long_name;
          timetableUI.displayTimetable();

          // 時刻表テーブルを取得
          const table = document.querySelector('.timetable-table');
          
          // プロパティ3の検証: 時刻表テーブルは「方向」列を含む
          expect(table).toBeTruthy();
          const headers = table.querySelectorAll('th');
          const directionHeader = Array.from(headers).find(h => h.textContent === '方向');
          expect(directionHeader).toBeTruthy();
          expect(directionHeader.getAttribute('scope')).toBe('col');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * プロパティ4: 時刻表の方向情報
   * *任意の*時刻表エントリにおいて、direction='0'または'1'の便は対応する方向ラベルを持つ
   * **検証: 要件2.3**
   */
  it('プロパティ4: direction="0"または"1"の便は対応する方向ラベルを持つ', () => {
    fc.assert(
      fc.property(
        // ランダムな時刻表データを生成（方向情報を含む）
        fc.array(
          fc.record({
            tripId: fc.string({ minLength: 1, maxLength: 20 }),
            stopId: fc.constant('STOP001'),
            stopName: fc.constant('テストバス停'),
            routeId: fc.constant('ROUTE001'),
            routeName: fc.constant('テスト路線'),
            tripHeadsign: fc.string({ minLength: 1, maxLength: 50 }),
            departureTime: fc.oneof(
              fc.constant('08:00'),
              fc.constant('09:30'),
              fc.constant('12:45')
            ),
            departureHour: fc.integer({ min: 8, max: 20 }),
            departureMinute: fc.integer({ min: 0, max: 59 }),
            serviceDayType: fc.constant('平日'),
            stopSequence: fc.integer({ min: 1, max: 50 }),
            direction: fc.oneof(fc.constant('0'), fc.constant('1'), fc.constant('unknown'))
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (timetableData) => {
          // テストデータからGTFSデータを構築
          const stops = [{
            stop_id: 'STOP001',
            stop_name: 'テストバス停',
            stop_lat: '33.2490',
            stop_lon: '130.2990'
          }];

          const routes = [{
            route_id: 'ROUTE001',
            route_long_name: 'テスト路線',
            route_short_name: '1',
            agency_id: '1',
            route_type: '3'
          }];

          const calendar = [{
            service_id: 'WEEKDAY',
            monday: '1',
            tuesday: '1',
            wednesday: '1',
            thursday: '1',
            friday: '1',
            saturday: '0',
            sunday: '0'
          }];

          const trips = timetableData.map(entry => ({
            trip_id: entry.tripId,
            route_id: entry.routeId,
            service_id: 'WEEKDAY',
            trip_headsign: entry.tripHeadsign,
            direction_id: entry.direction === 'unknown' ? undefined : entry.direction
          }));

          const stopTimes = timetableData.map(entry => ({
            trip_id: entry.tripId,
            stop_id: entry.stopId,
            arrival_time: entry.departureTime + ':00',
            departure_time: entry.departureTime + ':00',
            stop_sequence: String(entry.stopSequence)
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

          // 時刻表を表示
          timetableUI.currentStopId = 'STOP001';
          timetableUI.currentStopName = 'テストバス停';
          timetableUI.currentRouteId = 'ROUTE001';
          timetableUI.currentRouteName = 'テスト路線';
          timetableUI.displayTimetable();

          // 時刻表テーブルを取得
          const table = document.querySelector('.timetable-table');
          const rows = table.querySelectorAll('tbody tr');

          // TimetableControllerから実際の時刻表データを取得
          const actualTimetable = timetableController.getTimetable('STOP001', 'ROUTE001', '平日');
          
          // プロパティ4の検証: direction='0'または'1'の便は対応する方向ラベルを持つ
          // 注意: TimetableControllerが方向を再計算する可能性があるため、実際のデータを使用
          expect(rows.length).toBe(actualTimetable.length);
          
          rows.forEach((row, index) => {
            const entry = actualTimetable[index];
            const directionCell = row.querySelector('.timetable-direction');
            expect(directionCell).toBeTruthy();

            const direction = entry.direction || 'unknown';
            
            if (direction === '0') {
              // 往路ラベルが表示されている
              const label = directionCell.querySelector('.direction-label-outbound');
              expect(label).toBeTruthy();
              expect(label.textContent).toBe('往路');
              expect(label.getAttribute('aria-label')).toBe('往路');
            } else if (direction === '1') {
              // 復路ラベルが表示されている
              const label = directionCell.querySelector('.direction-label-inbound');
              expect(label).toBeTruthy();
              expect(label.textContent).toBe('復路');
              expect(label.getAttribute('aria-label')).toBe('復路');
            } else {
              // direction='unknown'の場合は「－」が表示されている
              expect(directionCell.textContent).toBe('－');
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
