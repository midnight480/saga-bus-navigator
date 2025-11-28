/**
 * TimetableUIクラスの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../js/direction-detector.js';
import '../js/timetable-controller.js';
import '../js/timetable-ui.js';

describe('TimetableUI - 基本機能', () => {
  let timetableController;
  let timetableUI;
  let stopTimes;
  let trips;
  let routes;
  let calendar;
  let stops;

  beforeEach(() => {
    // テストデータの準備
    stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      },
      {
        stop_id: 'STOP002',
        stop_name: 'ゆめタウン佐賀',
        stop_lat: '33.2500',
        stop_lon: '130.3000'
      }
    ];

    routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
        route_short_name: '1',
        agency_id: '1',
        route_type: '3'
      },
      {
        route_id: 'ROUTE002',
        route_long_name: '市内循環線',
        route_short_name: '2',
        agency_id: '2',
        route_type: '3'
      }
    ];

    calendar = [
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

    trips = [
      {
        trip_id: 'TRIP001',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀'
      },
      {
        trip_id: 'TRIP002',
        route_id: 'ROUTE002',
        service_id: 'WEEKDAY',
        trip_headsign: '佐賀駅'
      }
    ];

    stopTimes = [
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP001',
        arrival_time: '08:00:00',
        departure_time: '08:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP001',
        stop_id: 'STOP002',
        arrival_time: '08:15:00',
        departure_time: '08:15:00',
        stop_sequence: '2'
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP001',
        arrival_time: '09:00:00',
        departure_time: '09:00:00',
        stop_sequence: '1'
      }
    ];

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

    // TimetableControllerとTimetableUIのインスタンスを作成
    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );

    timetableUI = new window.TimetableUI(timetableController);
  });

  afterEach(() => {
    // モーダルをクリーンアップ
    if (timetableUI.modal) {
      timetableUI.closeModal();
    }
    document.body.innerHTML = '';
  });

  describe('showTimetableModal', () => {
    it('バス停IDとバス停名を指定してモーダルを表示できる', () => {
      timetableUI.showTimetableModal('STOP001', '佐賀駅バスセンター');

      // モーダルが作成されている
      expect(timetableUI.modal).toBeTruthy();
      expect(timetableUI.modal.style.display).toBe('block');

      // 現在の状態が保存されている
      expect(timetableUI.currentStopId).toBe('STOP001');
      expect(timetableUI.currentStopName).toBe('佐賀駅バスセンター');
    });

    it('バス停IDが指定されていない場合はエラーを出力する', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      timetableUI.showTimetableModal(null, '佐賀駅バスセンター');

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(timetableUI.modal).toBeFalsy();

      consoleErrorSpy.mockRestore();
    });

    it('路線が存在しない場合はエラーメッセージを表示する', () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      // 存在しないバス停
      timetableUI.showTimetableModal('STOP999', '存在しないバス停');

      expect(alertSpy).toHaveBeenCalledWith('この停留所に路線が見つかりません');

      alertSpy.mockRestore();
    });
  });

  describe('displayRouteSelection', () => {
    it('路線一覧を表示できる', () => {
      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // 路線リストが表示されている
      const routeList = document.querySelector('.timetable-route-list');
      expect(routeList).toBeTruthy();

      // 路線アイテムが表示されている
      const routeItems = document.querySelectorAll('.timetable-route-item');
      expect(routeItems.length).toBeGreaterThan(0);
    });

    it('路線名と事業者名が表示される', () => {
      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // 路線名が表示されている
      const routeNames = document.querySelectorAll('.timetable-route-name');
      expect(routeNames.length).toBeGreaterThan(0);

      // 事業者名が表示されている
      const agencyNames = document.querySelectorAll('.timetable-agency-name');
      expect(agencyNames.length).toBeGreaterThan(0);
    });

    it('路線クリック時にdisplayTimetable()が呼び出される', () => {
      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // displayTimetableメソッドをスパイ
      const displayTimetableSpy = vi.spyOn(timetableUI, 'displayTimetable');

      // 最初の路線アイテムをクリック
      const firstRouteItem = document.querySelector('.timetable-route-item');
      firstRouteItem.click();

      // displayTimetableが呼び出されたことを確認
      expect(displayTimetableSpy).toHaveBeenCalled();
      expect(timetableUI.currentRouteId).toBe('ROUTE001');
      expect(timetableUI.currentRouteName).toBe('ゆめタウン線');

      displayTimetableSpy.mockRestore();
    });

    it('路線をEnterキーで選択できる', () => {
      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      const displayTimetableSpy = vi.spyOn(timetableUI, 'displayTimetable');

      // 最初の路線アイテムにEnterキーを送信
      const firstRouteItem = document.querySelector('.timetable-route-item');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      firstRouteItem.dispatchEvent(enterEvent);

      expect(displayTimetableSpy).toHaveBeenCalled();

      displayTimetableSpy.mockRestore();
    });

    it('路線をSpaceキーで選択できる', () => {
      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      const displayTimetableSpy = vi.spyOn(timetableUI, 'displayTimetable');

      // 最初の路線アイテムにSpaceキーを送信
      const firstRouteItem = document.querySelector('.timetable-route-item');
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
      firstRouteItem.dispatchEvent(spaceEvent);

      expect(displayTimetableSpy).toHaveBeenCalled();

      displayTimetableSpy.mockRestore();
    });

    it('routes.txtとtrips.txtから路線情報を取得している', () => {
      const routes = timetableController.getRoutesAtStop('STOP001');
      
      // routes.txtから取得した情報が含まれている
      expect(routes.length).toBeGreaterThan(0);
      expect(routes[0]).toHaveProperty('routeId');
      expect(routes[0]).toHaveProperty('routeName');
      expect(routes[0]).toHaveProperty('agencyId');
      
      // 路線名がroutes.txtのroute_long_nameから取得されている
      expect(routes[0].routeName).toBe('ゆめタウン線');
    });
  });

  describe('displayTimetable', () => {
    it('時刻表を表示できる', () => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
      timetableUI.displayTimetable();

      // タブが表示されている
      const tabs = document.querySelectorAll('.timetable-tab');
      expect(tabs.length).toBe(2);

      // 時刻表コンテンツが表示されている
      const timetableContent = document.querySelector('.timetable-content');
      expect(timetableContent).toBeTruthy();
    });

    it('平日タブがデフォルトで選択されている', () => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
      timetableUI.displayTimetable();

      const weekdayTab = document.getElementById('tab-weekday');
      expect(weekdayTab.classList.contains('active')).toBe(true);
      expect(weekdayTab.getAttribute('aria-selected')).toBe('true');
    });

    it('戻るボタンが表示される', () => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
      timetableUI.displayTimetable();

      const backButton = document.querySelector('.timetable-back-button');
      expect(backButton).toBeTruthy();
      expect(backButton.textContent).toContain('路線選択に戻る');
    });

    it('発車時刻と行き先が表示される', () => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
      timetableUI.displayTimetable();

      // 時刻表テーブルが表示されている
      const table = document.querySelector('.timetable-table');
      expect(table).toBeTruthy();

      // ヘッダーが表示されている
      const headers = table.querySelectorAll('th');
      expect(headers.length).toBe(3);
      expect(headers[0].textContent).toBe('発車時刻');
      expect(headers[1].textContent).toBe('方向');
      expect(headers[2].textContent).toBe('行き先');

      // データ行が表示されている
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);

      // 時刻、方向、行き先が表示されている
      const firstRow = rows[0];
      const timeCells = firstRow.querySelectorAll('.timetable-time');
      const directionCells = firstRow.querySelectorAll('.timetable-direction');
      const destCells = firstRow.querySelectorAll('.timetable-destination');
      expect(timeCells.length).toBe(1);
      expect(directionCells.length).toBe(1);
      expect(destCells.length).toBe(1);
    });

    it('方向列が表示される', () => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
      timetableUI.displayTimetable();

      // 時刻表テーブルが表示されている
      const table = document.querySelector('.timetable-table');
      expect(table).toBeTruthy();

      // 方向列ヘッダーが表示されている
      const headers = table.querySelectorAll('th');
      const directionHeader = Array.from(headers).find(h => h.textContent === '方向');
      expect(directionHeader).toBeTruthy();
      expect(directionHeader.getAttribute('scope')).toBe('col');
    });

    it('各便の方向ラベルが表示される', () => {
      // 方向情報を含むテストデータを準備
      const directionStops = [
        {
          stop_id: 'STOP001',
          stop_name: '佐賀駅バスセンター',
          stop_lat: '33.2490',
          stop_lon: '130.2990'
        }
      ];

      const directionRoutes = [
        {
          route_id: 'ROUTE001',
          route_long_name: 'ゆめタウン線',
          route_short_name: '1',
          agency_id: '1',
          route_type: '3'
        }
      ];

      const directionCalendar = [
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

      const directionTrips = [
        {
          trip_id: 'TRIP001',
          route_id: 'ROUTE001',
          service_id: 'WEEKDAY',
          trip_headsign: 'ゆめタウン佐賀',
          direction_id: '0'
        },
        {
          trip_id: 'TRIP002',
          route_id: 'ROUTE001',
          service_id: 'WEEKDAY',
          trip_headsign: '佐賀駅',
          direction_id: '1'
        },
        {
          trip_id: 'TRIP003',
          route_id: 'ROUTE001',
          service_id: 'WEEKDAY',
          trip_headsign: 'ゆめタウン佐賀', // TRIP001と同じheadsign
          direction_id: '0' // TRIP001と同じdirection_idに変更（unknownのテストは別途追加）
        }
      ];

      const directionStopTimes = [
        {
          trip_id: 'TRIP001',
          stop_id: 'STOP001',
          arrival_time: '08:00:00',
          departure_time: '08:00:00',
          stop_sequence: '1'
        },
        {
          trip_id: 'TRIP002',
          stop_id: 'STOP001',
          arrival_time: '09:00:00',
          departure_time: '09:00:00',
          stop_sequence: '1'
        },
        {
          trip_id: 'TRIP003',
          stop_id: 'STOP001',
          arrival_time: '10:00:00',
          departure_time: '10:00:00',
          stop_sequence: '1'
        }
      ];

      const directionController = new window.TimetableController(
        directionStopTimes,
        directionTrips,
        directionRoutes,
        directionCalendar,
        directionStops
      );

      const directionUI = new window.TimetableUI(directionController);

      directionUI.currentStopId = 'STOP001';
      directionUI.currentStopName = '佐賀駅バスセンター';
      directionUI.currentRouteId = 'ROUTE001';
      directionUI.currentRouteName = 'ゆめタウン線';
      directionUI.displayTimetable();

      // 時刻表テーブルから方向セルを取得
      const table = document.querySelector('.timetable-table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);

      // 1行目: direction='0'（往路）
      const row1DirectionCell = rows[0].querySelector('.timetable-direction');
      expect(row1DirectionCell).toBeTruthy();
      const row1Label = row1DirectionCell.querySelector('.direction-label-outbound');
      expect(row1Label).toBeTruthy();
      expect(row1Label.textContent).toBe('往路');
      expect(row1Label.getAttribute('aria-label')).toBe('往路');

      // 2行目: direction='1'（復路）
      const row2DirectionCell = rows[1].querySelector('.timetable-direction');
      expect(row2DirectionCell).toBeTruthy();
      const row2Label = row2DirectionCell.querySelector('.direction-label-inbound');
      expect(row2Label).toBeTruthy();
      expect(row2Label.textContent).toBe('復路');
      expect(row2Label.getAttribute('aria-label')).toBe('復路');

      // 3行目: direction='0'（往路）- TRIP003もTRIP001と同じ方向
      const row3DirectionCell = rows[2].querySelector('.timetable-direction');
      expect(row3DirectionCell).toBeTruthy();
      const row3Label = row3DirectionCell.querySelector('.direction-label-outbound');
      expect(row3Label).toBeTruthy();
      expect(row3Label.textContent).toBe('往路');

      // クリーンアップ
      directionUI.closeModal();
    });

    it('深夜便（25:00以降）の時刻が正しく表示される', () => {
      // 深夜便のテストデータを準備
      const lateNightStops = [
        {
          stop_id: 'STOP001',
          stop_name: '佐賀駅バスセンター',
          stop_lat: '33.2490',
          stop_lon: '130.2990'
        }
      ];

      const lateNightRoutes = [
        {
          route_id: 'ROUTE001',
          route_long_name: '深夜便',
          route_short_name: '1',
          agency_id: '1',
          route_type: '3'
        }
      ];

      const lateNightCalendar = [
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

      const lateNightTrips = [
        {
          trip_id: 'TRIP001',
          route_id: 'ROUTE001',
          service_id: 'WEEKDAY',
          trip_headsign: '深夜便'
        }
      ];

      const lateNightStopTimes = [
        {
          trip_id: 'TRIP001',
          stop_id: 'STOP001',
          arrival_time: '25:30:00',
          departure_time: '25:30:00',
          stop_sequence: '1'
        }
      ];

      const lateNightController = new window.TimetableController(
        lateNightStopTimes,
        lateNightTrips,
        lateNightRoutes,
        lateNightCalendar,
        lateNightStops
      );

      const lateNightUI = new window.TimetableUI(lateNightController);

      lateNightUI.currentStopId = 'STOP001';
      lateNightUI.currentStopName = '佐賀駅バスセンター';
      lateNightUI.currentRouteId = 'ROUTE001';
      lateNightUI.currentRouteName = '深夜便';
      lateNightUI.displayTimetable();

      // 時刻表テーブルから時刻を取得
      const table = document.querySelector('.timetable-table');
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);

      const timeCell = rows[0].querySelector('.timetable-time');
      expect(timeCell.textContent).toBe('翌01:30');

      // クリーンアップ
      lateNightUI.closeModal();
    });
  });

  describe('switchTab', () => {
    beforeEach(() => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
      timetableUI.displayTimetable();
    });

    it('土日祝タブに切り替えられる', () => {
      timetableUI.switchTab('weekend');

      const weekdayTab = document.getElementById('tab-weekday');
      const weekendTab = document.getElementById('tab-weekend');

      expect(weekdayTab.classList.contains('active')).toBe(false);
      expect(weekendTab.classList.contains('active')).toBe(true);
      expect(timetableUI.currentTab).toBe('weekend');
    });

    it('平日タブに切り替えられる', () => {
      timetableUI.switchTab('weekend');
      timetableUI.switchTab('weekday');

      const weekdayTab = document.getElementById('tab-weekday');
      const weekendTab = document.getElementById('tab-weekend');

      expect(weekdayTab.classList.contains('active')).toBe(true);
      expect(weekendTab.classList.contains('active')).toBe(false);
      expect(timetableUI.currentTab).toBe('weekday');
    });

    it('無効なタブタイプを指定した場合はエラーを出力する', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      timetableUI.switchTab('invalid');

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('closeModal', () => {
    it('モーダルを閉じることができる', () => {
      timetableUI.showTimetableModal('STOP001', '佐賀駅バスセンター');
      
      expect(timetableUI.modal).toBeTruthy();
      
      timetableUI.closeModal();
      
      expect(timetableUI.modal).toBeFalsy();
      expect(timetableUI.currentStopId).toBe(null);
      expect(timetableUI.currentStopName).toBe(null);
    });
  });

  describe('getAgencyName', () => {
    it('事業者IDから事業者名を取得できる', () => {
      expect(timetableUI.getAgencyName('1')).toBe('佐賀市営バス');
      expect(timetableUI.getAgencyName('2')).toBe('祐徳バス');
      expect(timetableUI.getAgencyName('3')).toBe('西鉄バス');
    });

    it('未知の事業者IDの場合はIDをそのまま返す', () => {
      expect(timetableUI.getAgencyName('999')).toBe('999');
    });

    it('事業者IDが空の場合は空文字を返す', () => {
      expect(timetableUI.getAgencyName('')).toBe('');
    });
  });
});

describe('TimetableUI - 方向フィルタ機能', () => {
  let timetableController;
  let timetableUI;

  beforeEach(() => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
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
        trip_headsign: 'ゆめタウン佐賀',
        direction_id: '0'
      },
      {
        trip_id: 'TRIP002',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: '佐賀駅',
        direction_id: '1'
      },
      {
        trip_id: 'TRIP003',
        route_id: 'ROUTE001',
        service_id: 'WEEKDAY',
        trip_headsign: 'ゆめタウン佐賀',
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
      },
      {
        trip_id: 'TRIP002',
        stop_id: 'STOP001',
        arrival_time: '09:00:00',
        departure_time: '09:00:00',
        stop_sequence: '1'
      },
      {
        trip_id: 'TRIP003',
        stop_id: 'STOP001',
        arrival_time: '10:00:00',
        departure_time: '10:00:00',
        stop_sequence: '1'
      }
    ];

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

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );

    timetableUI = new window.TimetableUI(timetableController);
  });

  afterEach(() => {
    if (timetableUI.modal) {
      timetableUI.closeModal();
    }
    document.body.innerHTML = '';
  });

  describe('createDirectionFilter', () => {
    it('方向フィルタボタンが作成される', () => {
      const filter = timetableUI.createDirectionFilter('all');

      expect(filter).toBeTruthy();
      expect(filter.className).toBe('direction-filter');
      expect(filter.getAttribute('role')).toBe('group');
      expect(filter.getAttribute('aria-label')).toBe('方向フィルタ');
    });

    it('3つのフィルタボタンが作成される', () => {
      const filter = timetableUI.createDirectionFilter('all');
      const buttons = filter.querySelectorAll('.direction-filter-button');

      expect(buttons.length).toBe(3);
      expect(buttons[0].textContent).toBe('すべて');
      expect(buttons[1].textContent).toBe('往路のみ');
      expect(buttons[2].textContent).toBe('復路のみ');
    });

    it('現在のフィルタが"all"の場合、すべてボタンがアクティブになる', () => {
      const filter = timetableUI.createDirectionFilter('all');
      const buttons = filter.querySelectorAll('.direction-filter-button');

      expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[0].classList.contains('active')).toBe(true);
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[2].getAttribute('aria-pressed')).toBe('false');
    });

    it('現在のフィルタが"0"の場合、往路のみボタンがアクティブになる', () => {
      const filter = timetableUI.createDirectionFilter('0');
      const buttons = filter.querySelectorAll('.direction-filter-button');

      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[1].classList.contains('active')).toBe(true);
      expect(buttons[2].getAttribute('aria-pressed')).toBe('false');
    });

    it('現在のフィルタが"1"の場合、復路のみボタンがアクティブになる', () => {
      const filter = timetableUI.createDirectionFilter('1');
      const buttons = filter.querySelectorAll('.direction-filter-button');

      expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[1].getAttribute('aria-pressed')).toBe('false');
      expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
      expect(buttons[2].classList.contains('active')).toBe(true);
    });
  });

  describe('applyDirectionFilter', () => {
    beforeEach(() => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
    });

    it('"all"フィルタを適用すると全ての便が表示される', () => {
      timetableUI.applyDirectionFilter('all');

      expect(timetableUI.currentDirectionFilter).toBe('all');

      // displayTimetableが呼び出されたことを確認
      const table = document.querySelector('.timetable-table');
      expect(table).toBeTruthy();

      // 全ての便が表示されている
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(3);
    });

    it('"0"フィルタを適用すると往路の便のみが表示される', () => {
      timetableUI.applyDirectionFilter('0');

      expect(timetableUI.currentDirectionFilter).toBe('0');

      const table = document.querySelector('.timetable-table');
      expect(table).toBeTruthy();

      // 往路の便のみが表示されている（direction='0'の便が2つ）
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('"1"フィルタを適用すると復路の便のみが表示される', () => {
      timetableUI.applyDirectionFilter('1');

      expect(timetableUI.currentDirectionFilter).toBe('1');

      const table = document.querySelector('.timetable-table');
      expect(table).toBeTruthy();

      // 復路の便のみが表示されている（direction='1'の便が1つ）
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(1);
    });

    it('無効な方向フィルタを指定した場合はエラーを出力する', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      timetableUI.applyDirectionFilter('invalid');

      expect(consoleErrorSpy).toHaveBeenCalled();
      // フィルタは変更されない
      expect(timetableUI.currentDirectionFilter).toBe('all');

      consoleErrorSpy.mockRestore();
    });

    it('エラー発生時はフィルタがリセットされる', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // displayTimetableでエラーを発生させる
      const originalDisplayTimetable = timetableUI.displayTimetable;
      let callCount = 0;
      timetableUI.displayTimetable = () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Test error');
        }
        // 2回目の呼び出し（リセット後）は成功させる
        originalDisplayTimetable.call(timetableUI);
      };

      timetableUI.currentDirectionFilter = '0';
      timetableUI.applyDirectionFilter('1');

      // エラー時はフィルタが'all'にリセットされる
      expect(timetableUI.currentDirectionFilter).toBe('all');
      // displayTimetableが2回呼ばれたことを確認（1回目はエラー、2回目はリセット後）
      expect(callCount).toBe(2);

      consoleErrorSpy.mockRestore();
      timetableUI.displayTimetable = originalDisplayTimetable;
    });
  });

  describe('フィルタボタンのクリックイベント', () => {
    beforeEach(() => {
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.currentRouteId = 'ROUTE001';
      timetableUI.currentRouteName = 'ゆめタウン線';
      timetableUI.displayTimetable();
    });

    it('すべてボタンをクリックすると"all"フィルタが適用される', () => {
      const filter = document.querySelector('.direction-filter');
      const allButton = filter.querySelectorAll('.direction-filter-button')[0];

      allButton.click();

      expect(timetableUI.currentDirectionFilter).toBe('all');
    });

    it('往路のみボタンをクリックすると"0"フィルタが適用される', () => {
      const filter = document.querySelector('.direction-filter');
      const outboundButton = filter.querySelectorAll('.direction-filter-button')[1];

      outboundButton.click();

      expect(timetableUI.currentDirectionFilter).toBe('0');
    });

    it('復路のみボタンをクリックすると"1"フィルタが適用される', () => {
      const filter = document.querySelector('.direction-filter');
      const inboundButton = filter.querySelectorAll('.direction-filter-button')[2];

      inboundButton.click();

      expect(timetableUI.currentDirectionFilter).toBe('1');
    });
  });
});

describe('TimetableUI - アクセシビリティ', () => {
  let timetableController;
  let timetableUI;

  beforeEach(() => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
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
        trip_headsign: 'ゆめタウン佐賀'
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

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );

    timetableUI = new window.TimetableUI(timetableController);
  });

  afterEach(() => {
    if (timetableUI.modal) {
      timetableUI.closeModal();
    }
    document.body.innerHTML = '';
  });

  it('モーダルにARIA属性が設定されている', () => {
    timetableUI.showTimetableModal('STOP001', '佐賀駅バスセンター');

    expect(timetableUI.modal.getAttribute('role')).toBe('dialog');
    expect(timetableUI.modal.getAttribute('aria-modal')).toBe('true');
    expect(timetableUI.modal.getAttribute('aria-labelledby')).toBe('timetable-modal-title');
  });

  it('タブにARIA属性が設定されている', () => {
    timetableUI.currentStopId = 'STOP001';
    timetableUI.currentStopName = '佐賀駅バスセンター';
    timetableUI.currentRouteId = 'ROUTE001';
    timetableUI.currentRouteName = 'ゆめタウン線';
    timetableUI.displayTimetable();

    const weekdayTab = document.getElementById('tab-weekday');
    const weekendTab = document.getElementById('tab-weekend');

    expect(weekdayTab.getAttribute('role')).toBe('tab');
    expect(weekdayTab.getAttribute('aria-selected')).toBe('true');
    expect(weekdayTab.getAttribute('aria-controls')).toBe('timetable-weekday');

    expect(weekendTab.getAttribute('role')).toBe('tab');
    expect(weekendTab.getAttribute('aria-selected')).toBe('false');
    expect(weekendTab.getAttribute('aria-controls')).toBe('timetable-weekend');
  });
});

describe('TimetableUI - 方向判定バッジ機能', () => {
  let timetableController;
  let timetableUI;

  beforeEach(() => {
    const stops = [
      {
        stop_id: 'STOP001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2490',
        stop_lon: '130.2990'
      }
    ];

    const routes = [
      {
        route_id: 'ROUTE001',
        route_long_name: 'ゆめタウン線',
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
        trip_headsign: 'ゆめタウン佐賀'
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

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );

    timetableUI = new window.TimetableUI(timetableController);
  });

  afterEach(() => {
    if (timetableUI.modal) {
      timetableUI.closeModal();
    }
    document.body.innerHTML = '';
  });

  describe('createDetectionBadge', () => {
    it('成功率50%未満の場合、警告バッジを作成する', () => {
      const badge = timetableUI.createDetectionBadge(0.3);

      expect(badge).toBeTruthy();
      expect(badge.className).toContain('detection-badge');
      expect(badge.className).toContain('detection-badge-warning');
      expect(badge.textContent).toBe('⚠');
      expect(badge.getAttribute('role')).toBe('status');
      expect(badge.getAttribute('aria-label')).toContain('警告');
      expect(badge.getAttribute('aria-label')).toContain('30%');
      expect(badge.getAttribute('data-tooltip')).toContain('30%');
      expect(badge.getAttribute('data-tooltip')).toContain('低');
      expect(badge.hasAttribute('aria-describedby')).toBe(true);
    });

    it('成功率50-80%の場合、注意バッジを作成する', () => {
      const badge = timetableUI.createDetectionBadge(0.65);

      expect(badge).toBeTruthy();
      expect(badge.className).toContain('detection-badge');
      expect(badge.className).toContain('detection-badge-caution');
      expect(badge.textContent).toBe('!');
      expect(badge.getAttribute('role')).toBe('status');
      expect(badge.getAttribute('aria-label')).toContain('注意');
      expect(badge.getAttribute('aria-label')).toContain('65%');
      expect(badge.getAttribute('data-tooltip')).toContain('65%');
      expect(badge.getAttribute('data-tooltip')).toContain('中');
      expect(badge.hasAttribute('aria-describedby')).toBe(true);
    });

    it('成功率80%以上の場合、バッジを作成しない（nullを返す）', () => {
      const badge = timetableUI.createDetectionBadge(0.85);

      expect(badge).toBe(null);
    });

    it('成功率がundefinedの場合、N/Aバッジを作成する', () => {
      const badge = timetableUI.createDetectionBadge(undefined);

      expect(badge).toBeTruthy();
      expect(badge.className).toContain('detection-badge');
      expect(badge.className).toContain('detection-badge-na');
      expect(badge.textContent).toBe('N/A');
      expect(badge.getAttribute('role')).toBe('status');
      expect(badge.getAttribute('aria-label')).toContain('不明');
      expect(badge.getAttribute('data-tooltip')).toContain('計算できません');
      expect(badge.hasAttribute('aria-describedby')).toBe(true);
    });

    it('成功率がnullの場合、N/Aバッジを作成する', () => {
      const badge = timetableUI.createDetectionBadge(null);

      expect(badge).toBeTruthy();
      expect(badge.className).toContain('detection-badge');
      expect(badge.className).toContain('detection-badge-na');
      expect(badge.textContent).toBe('N/A');
    });

    it('成功率がNaNの場合、N/Aバッジを作成する', () => {
      const badge = timetableUI.createDetectionBadge(NaN);

      expect(badge).toBeTruthy();
      expect(badge.className).toContain('detection-badge');
      expect(badge.className).toContain('detection-badge-na');
      expect(badge.textContent).toBe('N/A');
    });

    it('成功率0%の場合、警告バッジを作成する', () => {
      const badge = timetableUI.createDetectionBadge(0);

      expect(badge).toBeTruthy();
      expect(badge.className).toContain('detection-badge-warning');
      expect(badge.getAttribute('aria-label')).toContain('0%');
    });

    it('成功率100%の場合、バッジを作成しない', () => {
      const badge = timetableUI.createDetectionBadge(1.0);

      expect(badge).toBe(null);
    });

    it('成功率50%ちょうどの場合、注意バッジを作成する', () => {
      const badge = timetableUI.createDetectionBadge(0.5);

      expect(badge).toBeTruthy();
      expect(badge.className).toContain('detection-badge-caution');
      expect(badge.getAttribute('aria-label')).toContain('50%');
    });

    it('成功率80%ちょうどの場合、バッジを作成しない', () => {
      const badge = timetableUI.createDetectionBadge(0.8);

      expect(badge).toBe(null);
    });

    it('エラー発生時はnullを返す', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // createDetectionBadgeの内部でエラーを発生させるために、
      // Math.roundをモックしてエラーをスローさせる
      const originalMathRound = Math.round;
      Math.round = () => {
        throw new Error('Test error');
      };

      const badge = timetableUI.createDetectionBadge(0.5);

      expect(badge).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalled();

      // 元に戻す
      Math.round = originalMathRound;
      consoleErrorSpy.mockRestore();
    });

    it('ツールチップIDがユニークである', () => {
      const badge1 = timetableUI.createDetectionBadge(0.3);
      const badge2 = timetableUI.createDetectionBadge(0.3);

      const tooltipId1 = badge1.getAttribute('aria-describedby');
      const tooltipId2 = badge2.getAttribute('aria-describedby');

      expect(tooltipId1).not.toBe(tooltipId2);
    });
  });

  describe('displayRouteSelection - バッジ表示', () => {
    it('方向判定成功率が低い路線に警告バッジが表示される', () => {
      // DataLoaderをモック（オブジェクトを返す）
      const mockDataLoader = {
        generateRouteMetadata: () => {
          return {
            'ROUTE001': {
              routeId: 'ROUTE001',
              routeName: 'ゆめタウン線',
              tripCount: 100,
              stopCount: 20,
              directionDetectionRate: 0.3,
              detectionMethod: 'headsign',
              unknownDirectionCount: 70
            }
          };
        }
      };

      window.dataLoader = mockDataLoader;

      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // 警告バッジが表示されている
      const badge = document.querySelector('.detection-badge-warning');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('⚠');

      // クリーンアップ
      delete window.dataLoader;
    });

    it('方向判定成功率が中程度の路線に注意バッジが表示される', () => {
      // DataLoaderをモック（オブジェクトを返す）
      const mockDataLoader = {
        generateRouteMetadata: () => {
          return {
            'ROUTE001': {
              routeId: 'ROUTE001',
              routeName: 'ゆめタウン線',
              tripCount: 100,
              stopCount: 20,
              directionDetectionRate: 0.65,
              detectionMethod: 'headsign',
              unknownDirectionCount: 35
            }
          };
        }
      };

      window.dataLoader = mockDataLoader;

      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // 注意バッジが表示されている
      const badge = document.querySelector('.detection-badge-caution');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('!');

      // クリーンアップ
      delete window.dataLoader;
    });

    it('方向判定成功率が高い路線にはバッジが表示されない', () => {
      // DataLoaderをモック（オブジェクトを返す）
      const mockDataLoader = {
        generateRouteMetadata: () => {
          return {
            'ROUTE001': {
              routeId: 'ROUTE001',
              routeName: 'ゆめタウン線',
              tripCount: 100,
              stopCount: 20,
              directionDetectionRate: 0.95,
              detectionMethod: 'headsign',
              unknownDirectionCount: 5
            }
          };
        }
      };

      window.dataLoader = mockDataLoader;

      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // バッジが表示されていない
      const badge = document.querySelector('.detection-badge');
      expect(badge).toBe(null);

      // クリーンアップ
      delete window.dataLoader;
    });

    it('DataLoaderが利用できない場合はバッジを表示しない', () => {
      // DataLoaderを削除
      delete window.dataLoader;

      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // バッジが表示されていない
      const badge = document.querySelector('.detection-badge');
      expect(badge).toBe(null);
    });

    it('路線メタデータが存在しない場合はバッジを表示しない', () => {
      // DataLoaderをモック（空のオブジェクトを返す）
      const mockDataLoader = {
        generateRouteMetadata: () => {
          return {};
        }
      };

      window.dataLoader = mockDataLoader;

      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // バッジが表示されていない
      const badge = document.querySelector('.detection-badge');
      expect(badge).toBe(null);

      // クリーンアップ
      delete window.dataLoader;
    });

    it('方向判定成功率がundefinedの場合はN/Aバッジを表示する', () => {
      // DataLoaderをモック（オブジェクトを返す）
      const mockDataLoader = {
        generateRouteMetadata: () => {
          return {
            'ROUTE001': {
              routeId: 'ROUTE001',
              routeName: 'ゆめタウン線',
              tripCount: 100,
              stopCount: 20,
              directionDetectionRate: undefined,
              detectionMethod: 'headsign',
              unknownDirectionCount: 100
            }
          };
        }
      };

      window.dataLoader = mockDataLoader;

      const routes = timetableController.getRoutesAtStop('STOP001');
      
      timetableUI.currentStopId = 'STOP001';
      timetableUI.currentStopName = '佐賀駅バスセンター';
      timetableUI.displayRouteSelection(routes);

      // N/Aバッジが表示されている
      const badge = document.querySelector('.detection-badge-na');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('N/A');

      // クリーンアップ
      delete window.dataLoader;
    });
  });
});
