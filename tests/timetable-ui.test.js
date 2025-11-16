/**
 * TimetableUIクラスの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

    // TimetableControllerとTimetableUIのインスタンスを作成
    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );

    timetableUI = new window.TimetableUI(timetableController);

    // DOM環境をセットアップ
    document.body.innerHTML = '<div id="test-container"></div>';
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
      timetableUI.createModal();
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
      timetableUI.createModal();
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
      timetableUI.createModal();
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
      timetableUI.createModal();
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
      timetableUI.createModal();
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
      timetableUI.createModal();
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
      timetableUI.createModal();
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
      timetableUI.createModal();
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
      timetableUI.createModal();
      timetableUI.displayTimetable();

      // 時刻表テーブルが表示されている
      const table = document.querySelector('.timetable-table');
      expect(table).toBeTruthy();

      // ヘッダーが表示されている
      const headers = table.querySelectorAll('th');
      expect(headers.length).toBe(2);
      expect(headers[0].textContent).toBe('発車時刻');
      expect(headers[1].textContent).toBe('行き先');

      // データ行が表示されている
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);

      // 時刻と行き先が表示されている
      const firstRow = rows[0];
      const timeCells = firstRow.querySelectorAll('.timetable-time');
      const destCells = firstRow.querySelectorAll('.timetable-destination');
      expect(timeCells.length).toBe(1);
      expect(destCells.length).toBe(1);
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
      lateNightUI.createModal();
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
      timetableUI.createModal();
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

    timetableController = new window.TimetableController(
      stopTimes,
      trips,
      routes,
      calendar,
      stops
    );

    timetableUI = new window.TimetableUI(timetableController);
    document.body.innerHTML = '<div id="test-container"></div>';
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
    timetableUI.createModal();
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
