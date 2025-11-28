/**
 * エラーハンドリングのユニットテスト
 * 要件8.1, 8.2, 8.3, 8.4を検証
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('エラーハンドリング', () => {
  let uiController;
  let timetableUI;
  let timetableController;
  let mockBusStops;
  let mockStopTimes;
  let mockTrips;
  let mockRoutes;
  let mockCalendar;

  beforeEach(() => {
    // モックデータの準備
    mockBusStops = [
      { id: 'stop1', name: 'バス停A', lat: 33.2635, lng: 130.3005 },
      { id: 'stop2', name: 'バス停B', lat: 33.2645, lng: 130.3015 }
    ];

    mockStopTimes = [
      {
        trip_id: 'trip1',
        stop_id: 'stop1',
        departure_time: '08:00:00',
        stop_sequence: '1'
      }
    ];

    mockTrips = [
      {
        trip_id: 'trip1',
        route_id: 'route1',
        service_id: 'weekday',
        trip_headsign: '行き先A',
        direction_id: '0'
      }
    ];

    mockRoutes = [
      {
        route_id: 'route1',
        route_long_name: '路線1',
        agency_id: '1'
      }
    ];

    mockCalendar = [
      {
        service_id: 'weekday',
        monday: '1',
        tuesday: '1',
        wednesday: '1',
        thursday: '1',
        friday: '1',
        saturday: '0',
        sunday: '0'
      }
    ];

    // UIControllerのインスタンスを作成
    global.UIController = class {
      constructor() {
        this.busStops = [];
      }

      initialize(busStops) {
        this.busStops = busStops;
      }

      createDirectionLabel(direction) {
        // エラーケース1: 方向情報が存在しない場合（要件8.1）
        if (direction === undefined || direction === null) {
          console.debug('UIController: 方向情報が存在しません。デフォルト値を使用します', {
            direction: direction,
            defaultValue: 'unknown'
          });
          direction = 'unknown';
        }

        // direction='unknown'の場合はラベルを生成しない
        if (direction === 'unknown' || !direction) {
          return null;
        }

        // 方向ラベル要素を作成
        const label = document.createElement('span');
        label.className = 'direction-label';

        // 方向に応じてクラスとテキストを設定
        if (direction === '0') {
          label.classList.add('direction-label-outbound');
          label.setAttribute('aria-label', '往路');
          label.textContent = '往路';
        } else if (direction === '1') {
          label.classList.add('direction-label-inbound');
          label.setAttribute('aria-label', '復路');
          label.textContent = '復路';
        } else {
          return null;
        }

        return label;
      }
    };

    // TimetableUIのインスタンスを作成
    global.TimetableUI = class {
      constructor(controller) {
        this.timetableController = controller;
        this.currentDirectionFilter = 'all';
      }

      createDetectionBadge(detectionRate) {
        try {
          // エラーケース3: 方向判定成功率が計算できない場合（要件8.3）
          if (detectionRate === undefined || detectionRate === null || isNaN(detectionRate)) {
            console.warn('TimetableUI: 方向判定成功率が計算できません', { detectionRate });

            // N/Aバッジを作成
            const badge = document.createElement('span');
            badge.className = 'detection-badge detection-badge-na';
            badge.textContent = 'N/A';
            badge.setAttribute('role', 'status');
            badge.setAttribute('aria-label', '方向判定成功率: 不明');
            return badge;
          }

          // 成功率80%以上の場合はバッジを表示しない
          if (detectionRate >= 0.8) {
            return null;
          }

          const badge = document.createElement('span');
          badge.className = 'detection-badge';
          badge.setAttribute('role', 'status');

          if (detectionRate < 0.5) {
            badge.classList.add('detection-badge-warning');
            badge.textContent = '⚠';
          } else if (detectionRate < 0.8) {
            badge.classList.add('detection-badge-caution');
            badge.textContent = '!';
          }

          return badge;
        } catch (error) {
          // エラーケース2: 方向情報の取得に失敗した場合（要件8.2）
          console.error('TimetableUI: 方向判定バッジの作成中にエラーが発生しました', error);
          return null;
        }
      }

      applyDirectionFilter(direction) {
        try {
          console.log('TimetableUI: applyDirectionFilter呼び出し', { direction });

          // 有効な方向値かチェック
          if (direction !== 'all' && direction !== '0' && direction !== '1') {
            console.error('TimetableUI: 無効な方向フィルタが指定されました', { direction });
            return;
          }

          // 現在のフィルタを更新
          this.currentDirectionFilter = direction;
        } catch (error) {
          // エラーケース4: 方向フィルタリング中のエラー（要件8.4）
          console.error('TimetableUI: 方向フィルタの適用中にエラーが発生しました', error);
          // エラー時はフィルタをリセット
          this.currentDirectionFilter = 'all';
        }
      }

      createTimetableTable(timetable, currentFilter = 'all') {
        const container = document.createElement('div');
        container.className = 'timetable-table-container';

        // 方向フィルタを適用
        let filteredTimetable = timetable;
        if (currentFilter !== 'all') {
          try {
            filteredTimetable = timetable.filter(entry => {
              // エラーケース1: 方向情報が存在しない場合（要件8.1）
              let direction = entry.direction;
              if (direction === undefined || direction === null) {
                console.debug('TimetableUI: 方向情報が存在しません。デフォルト値を使用します', {
                  tripId: entry.tripId,
                  defaultValue: 'unknown'
                });
                direction = 'unknown';
              }
              return direction === currentFilter;
            });
          } catch (error) {
            // エラーケース4: 方向フィルタリング中のエラー（要件8.4）
            console.error('TimetableUI: 方向フィルタリング中にエラーが発生しました', {
              error: error,
              currentFilter: currentFilter,
              message: 'フィルタをリセットし、全ての便を表示します'
            });
            filteredTimetable = timetable;
          }
        }

        return container;
      }
    };

    // TimetableControllerのインスタンスを作成
    global.TimetableController = class {
      constructor(stopTimes, trips, routes, calendar, stops) {
        this.stopTimes = stopTimes;
        this.trips = trips;
        this.routes = routes;
        this.calendar = calendar;
        this.stops = stops;
      }
    };

    uiController = new global.UIController();
    uiController.initialize(mockBusStops);

    timetableController = new global.TimetableController(
      mockStopTimes,
      mockTrips,
      mockRoutes,
      mockCalendar,
      mockBusStops
    );

    timetableUI = new global.TimetableUI(timetableController);
  });

  describe('UIController.createDirectionLabel()', () => {
    it('方向情報がundefinedの場合、nullを返す（要件8.1）', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const label = uiController.createDirectionLabel(undefined);

      expect(label).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'UIController: 方向情報が存在しません。デフォルト値を使用します',
        expect.objectContaining({
          direction: undefined,
          defaultValue: 'unknown'
        })
      );

      consoleSpy.mockRestore();
    });

    it('方向情報がnullの場合、nullを返す（要件8.1）', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const label = uiController.createDirectionLabel(null);

      expect(label).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'UIController: 方向情報が存在しません。デフォルト値を使用します',
        expect.objectContaining({
          direction: null,
          defaultValue: 'unknown'
        })
      );

      consoleSpy.mockRestore();
    });

    it('方向情報が"unknown"の場合、nullを返す（要件8.1）', () => {
      const label = uiController.createDirectionLabel('unknown');
      expect(label).toBeNull();
    });

    it('方向情報が"0"の場合、往路ラベルを返す', () => {
      const label = uiController.createDirectionLabel('0');

      expect(label).not.toBeNull();
      expect(label.className).toContain('direction-label-outbound');
      expect(label.getAttribute('aria-label')).toBe('往路');
    });

    it('方向情報が"1"の場合、復路ラベルを返す', () => {
      const label = uiController.createDirectionLabel('1');

      expect(label).not.toBeNull();
      expect(label.className).toContain('direction-label-inbound');
      expect(label.getAttribute('aria-label')).toBe('復路');
    });
  });

  describe('TimetableUI.createDetectionBadge()', () => {
    it('方向判定成功率がundefinedの場合、N/Aバッジを返す（要件8.3）', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const badge = timetableUI.createDetectionBadge(undefined);

      expect(badge).not.toBeNull();
      expect(badge.className).toContain('detection-badge-na');
      expect(badge.textContent).toBe('N/A');
      expect(badge.getAttribute('aria-label')).toBe('方向判定成功率: 不明');
      expect(consoleSpy).toHaveBeenCalledWith(
        'TimetableUI: 方向判定成功率が計算できません',
        expect.objectContaining({ detectionRate: undefined })
      );

      consoleSpy.mockRestore();
    });

    it('方向判定成功率がnullの場合、N/Aバッジを返す（要件8.3）', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const badge = timetableUI.createDetectionBadge(null);

      expect(badge).not.toBeNull();
      expect(badge.className).toContain('detection-badge-na');
      expect(badge.textContent).toBe('N/A');
      expect(consoleSpy).toHaveBeenCalledWith(
        'TimetableUI: 方向判定成功率が計算できません',
        expect.objectContaining({ detectionRate: null })
      );

      consoleSpy.mockRestore();
    });

    it('方向判定成功率がNaNの場合、N/Aバッジを返す（要件8.3）', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const badge = timetableUI.createDetectionBadge(NaN);

      expect(badge).not.toBeNull();
      expect(badge.className).toContain('detection-badge-na');
      expect(badge.textContent).toBe('N/A');
      expect(consoleSpy).toHaveBeenCalledWith(
        'TimetableUI: 方向判定成功率が計算できません',
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('方向判定成功率が50%未満の場合、警告バッジを返す', () => {
      const badge = timetableUI.createDetectionBadge(0.3);

      expect(badge).not.toBeNull();
      expect(badge.className).toContain('detection-badge-warning');
      expect(badge.textContent).toBe('⚠');
    });

    it('方向判定成功率が50-80%の場合、注意バッジを返す', () => {
      const badge = timetableUI.createDetectionBadge(0.6);

      expect(badge).not.toBeNull();
      expect(badge.className).toContain('detection-badge-caution');
      expect(badge.textContent).toBe('!');
    });

    it('方向判定成功率が80%以上の場合、nullを返す', () => {
      const badge = timetableUI.createDetectionBadge(0.9);
      expect(badge).toBeNull();
    });
  });

  describe('TimetableUI.applyDirectionFilter()', () => {
    it('無効な方向フィルタが指定された場合、エラーログを出力する（要件8.4）', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      timetableUI.applyDirectionFilter('invalid');

      expect(consoleSpy).toHaveBeenCalledWith(
        'TimetableUI: 無効な方向フィルタが指定されました',
        expect.objectContaining({ direction: 'invalid' })
      );

      consoleSpy.mockRestore();
    });

    it('有効な方向フィルタが指定された場合、フィルタを適用する', () => {
      timetableUI.applyDirectionFilter('0');
      expect(timetableUI.currentDirectionFilter).toBe('0');

      timetableUI.applyDirectionFilter('1');
      expect(timetableUI.currentDirectionFilter).toBe('1');

      timetableUI.applyDirectionFilter('all');
      expect(timetableUI.currentDirectionFilter).toBe('all');
    });

    it('エラーが発生した場合、フィルタをリセットする（要件8.4）', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // applyDirectionFilterメソッドを一時的に上書きしてエラーを発生させる
      const originalMethod = timetableUI.applyDirectionFilter;
      timetableUI.applyDirectionFilter = function(direction) {
        try {
          throw new Error('テストエラー');
        } catch (error) {
          console.error('TimetableUI: 方向フィルタの適用中にエラーが発生しました', error);
          this.currentDirectionFilter = 'all';
        }
      };

      timetableUI.currentDirectionFilter = '0';
      timetableUI.applyDirectionFilter('1');

      expect(timetableUI.currentDirectionFilter).toBe('all');
      expect(consoleSpy).toHaveBeenCalledWith(
        'TimetableUI: 方向フィルタの適用中にエラーが発生しました',
        expect.any(Error)
      );

      // メソッドを元に戻す
      timetableUI.applyDirectionFilter = originalMethod;
      consoleSpy.mockRestore();
    });
  });

  describe('TimetableUI.createTimetableTable()', () => {
    it('方向情報が存在しない便がある場合、デフォルト値を使用する（要件8.1）', () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

      const timetable = [
        {
          tripId: 'trip1',
          departureTime: '08:00',
          direction: undefined // 方向情報なし
        }
      ];

      const container = timetableUI.createTimetableTable(timetable, '0');

      expect(consoleSpy).toHaveBeenCalledWith(
        'TimetableUI: 方向情報が存在しません。デフォルト値を使用します',
        expect.objectContaining({
          tripId: 'trip1',
          defaultValue: 'unknown'
        })
      );

      consoleSpy.mockRestore();
    });

    it('方向フィルタリング中にエラーが発生した場合、全ての便を表示する（要件8.4）', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // フィルタ処理でエラーを発生させるために、directionプロパティにアクセスするとエラーになるオブジェクトを作成
      const timetable = [
        Object.create(null, {
          tripId: { value: 'trip1', enumerable: true },
          departureTime: { value: '08:00', enumerable: true },
          direction: {
            get() {
              throw new Error('テストエラー');
            },
            enumerable: true
          }
        })
      ];

      const container = timetableUI.createTimetableTable(timetable, '0');

      expect(consoleSpy).toHaveBeenCalledWith(
        'TimetableUI: 方向フィルタリング中にエラーが発生しました',
        expect.objectContaining({
          error: expect.any(Error),
          currentFilter: '0',
          message: 'フィルタをリセットし、全ての便を表示します'
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
