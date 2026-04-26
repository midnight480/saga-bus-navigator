/**
 * RealtimeVehicleControllerの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// RealtimeVehicleControllerクラスをインポート
import '../js/realtime-vehicle-controller.js';

// MapControllerのモック
const createMapControllerMock = () => {
  return {
    updateVehicleMarkerPosition: vi.fn(),
    updateVehicleMarkerPosition: vi.fn(),
    removeVehicleMarker: vi.fn()
  };
};

// DataLoaderのモック
const createDataLoaderMock = () => {
  return {
    loadGTFSData: vi.fn().mockResolvedValue(),
    trips: [
      {
        trip_id: 'trip_123',
        route_id: 'route_456',
        service_id: 'weekday'
      }
    ],
    gtfsStops: [
      {
        stop_id: 'stop_001',
        stop_name: '佐賀駅バスセンター',
        stop_lat: '33.2649',
        stop_lon: '130.3008'
      },
      {
        stop_id: 'stop_002',
        stop_name: '県庁前',
        stop_lat: '33.2495',
        stop_lon: '130.3005'
      }
    ],
    stopTimes: [
      {
        trip_id: 'trip_123',
        stop_id: 'stop_001',
        stop_sequence: '1',
        arrival_time: '08:00:00',
        departure_time: '08:00:00'
      },
      {
        trip_id: 'trip_123',
        stop_id: 'stop_002',
        stop_sequence: '2',
        arrival_time: '08:10:00',
        departure_time: '08:10:00'
      }
    ]
  };
};

// RealtimeDataLoaderのモック
const createRealtimeDataLoaderMock = () => {
  return {
    initialize: vi.fn().mockResolvedValue(),
    addEventListener: vi.fn(),
    vehiclePositions: [],
    tripUpdates: [],
    alerts: []
  };
};

describe('RealtimeVehicleController', () => {
  let controller;
  let mapControllerMock;
  let dataLoaderMock;
  let realtimeDataLoaderMock;

  beforeEach(() => {
    // DOM要素をモック
    document.body.innerHTML = `
      <div class="map-section">
        <div id="map-container">
          <div id="map"></div>
        </div>
      </div>
    `;

    // モックを作成
    mapControllerMock = createMapControllerMock();
    dataLoaderMock = createDataLoaderMock();
    realtimeDataLoaderMock = createRealtimeDataLoaderMock();

    // TripTimetableFormatterのモック
    const tripTimetableFormatterMock = {
      formatTimetableHTML: vi.fn((tripId, options) => {
        return `<div class="trip-timetable"><p>時刻表: ${tripId}</p></div>`;
      }),
      formatTimetableText: vi.fn((tripId, options) => {
        return `時刻表: ${tripId}`;
      })
    };

    // RealtimeVehicleControllerインスタンスを作成
    controller = new window.RealtimeVehicleController(
      mapControllerMock,
      dataLoaderMock,
      realtimeDataLoaderMock,
      tripTimetableFormatterMock
    );
  });

  afterEach(() => {
    // DOM要素をクリア
    document.body.innerHTML = '';
  });

  describe('constructor', () => {
    it('依存オブジェクトを正しく設定する', () => {
      expect(controller.mapController).toBe(mapControllerMock);
      expect(controller.dataLoader).toBe(dataLoaderMock);
      expect(controller.realtimeDataLoader).toBe(realtimeDataLoaderMock);
    });

    it('車両マーカー管理用のMapを初期化する', () => {
      expect(controller.vehicleMarkers).toBeInstanceOf(Map);
      expect(controller.vehicleMarkers.size).toBe(0);
    });

    it('最終更新時刻の管理用のMapを初期化する', () => {
      expect(controller.lastUpdateTimes).toBeInstanceOf(Map);
      expect(controller.lastUpdateTimes.size).toBe(0);
    });
  });

  describe('initialize', () => {
    it('DataLoaderから静的データを取得する', async () => {
      await controller.initialize();

      expect(dataLoaderMock.loadGTFSData).toHaveBeenCalled();
      expect(controller.trips).toBe(dataLoaderMock.trips);
      expect(controller.stops).toBe(dataLoaderMock.gtfsStops);
      expect(controller.stopTimes).toBe(dataLoaderMock.stopTimes);
    });

    it('運行情報表示エリアを作成する', async () => {
      await controller.initialize();

      const alertsContainer = document.getElementById('realtime-alerts-container');
      expect(alertsContainer).toBeTruthy();
      expect(controller.alertsContainer).toBe(alertsContainer);
    });

    it('RealtimeDataLoaderを初期化する', async () => {
      await controller.initialize();

      expect(realtimeDataLoaderMock.initialize).toHaveBeenCalled();
    });

    it('初期化失敗時にエラーをスローする', async () => {
      dataLoaderMock.loadGTFSData.mockRejectedValue(new Error('Load error'));

      await expect(controller.initialize()).rejects.toThrow('Load error');
    });
  });

  describe('isValidCoordinate', () => {
    it('有効な座標の場合trueを返す', () => {
      expect(controller.isValidCoordinate(33.2649, 130.3008)).toBe(true);
      expect(controller.isValidCoordinate(0, 0)).toBe(true);
      expect(controller.isValidCoordinate(-90, -180)).toBe(true);
      expect(controller.isValidCoordinate(90, 180)).toBe(true);
    });

    it('緯度が範囲外の場合falseを返す', () => {
      expect(controller.isValidCoordinate(-91, 130.3008)).toBe(false);
      expect(controller.isValidCoordinate(91, 130.3008)).toBe(false);
    });

    it('経度が範囲外の場合falseを返す', () => {
      expect(controller.isValidCoordinate(33.2649, -181)).toBe(false);
      expect(controller.isValidCoordinate(33.2649, 181)).toBe(false);
    });

    it('数値でない場合falseを返す', () => {
      expect(controller.isValidCoordinate('33.2649', 130.3008)).toBe(false);
      expect(controller.isValidCoordinate(33.2649, '130.3008')).toBe(false);
      expect(controller.isValidCoordinate(null, 130.3008)).toBe(false);
      expect(controller.isValidCoordinate(33.2649, undefined)).toBe(false);
    });

    it('NaNの場合falseを返す', () => {
      expect(controller.isValidCoordinate(NaN, 130.3008)).toBe(false);
      expect(controller.isValidCoordinate(33.2649, NaN)).toBe(false);
    });
  });

  describe('determineVehicleStatus', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('運行開始前の状態を判定する', () => {
      // 現在時刻を7:00に設定（出発時刻8:00より前）
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T07:00:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2649,
        longitude: 130.3008
      };

      const trip = dataLoaderMock.trips[0];

      const status = controller.determineVehicleStatus(vehicleData, trip);

      expect(status.state).toBe('before_start');
      expect(status.message).toBe('運行開始前です');
      expect(status.color).toBe('yellow');

      vi.useRealTimers();
    });

    it('運行終了の状態を判定する', () => {
      // 現在時刻を9:00に設定（到着時刻8:10より後）
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T09:00:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2649,
        longitude: 130.3008
      };

      const trip = dataLoaderMock.trips[0];

      const status = controller.determineVehicleStatus(vehicleData, trip);

      expect(status.state).toBe('after_end');
      expect(status.message).toBe('運行終了しました');
      expect(status.color).toBe('black');

      vi.useRealTimers();
    });

    it('定刻通りの状態を判定する', () => {
      // 現在時刻を8:05に設定（運行中、遅延なし）
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2649,
        longitude: 130.3008,
        currentStopSequence: 1
      };

      const trip = dataLoaderMock.trips[0];

      // calculateDelayが0を返すようにモック
      vi.spyOn(controller, 'calculateDelay').mockReturnValue(0);

      const status = controller.determineVehicleStatus(vehicleData, trip);

      expect(status.state).toBe('on_time');
      expect(status.message).toBe('定刻通りです');
      expect(status.color).toBe('green');

      vi.useRealTimers();
    });

    it('遅延の状態を判定する', () => {
      // 現在時刻を8:05に設定（運行中）
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2649,
        longitude: 130.3008,
        currentStopSequence: 1
      };

      const trip = dataLoaderMock.trips[0];

      // calculateDelayが5分を返すようにモック
      vi.spyOn(controller, 'calculateDelay').mockReturnValue(5);

      const status = controller.determineVehicleStatus(vehicleData, trip);

      expect(status.state).toBe('delayed');
      expect(status.message).toBe('予定より5分遅れ');
      expect(status.color).toBe('red');

      vi.useRealTimers();
    });

    it('stop_timesが見つからない場合は不明状態を返す', () => {
      const vehicleData = {
        tripId: 'unknown_trip',
        latitude: 33.2649,
        longitude: 130.3008
      };

      const trip = {
        trip_id: 'unknown_trip',
        route_id: 'route_456'
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const status = controller.determineVehicleStatus(vehicleData, trip);

      expect(status.state).toBe('unknown');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('calculateDelay', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('route.pbからdelay値を取得して分単位に変換する', () => {
      controller.tripUpdates = [
        {
          tripId: 'trip_123',
          stopTimeUpdates: [
            {
              stopSequence: 1,
              arrivalDelay: 180 // 3分（180秒）
            }
          ]
        }
      ];

      const vehicleData = {
        tripId: 'trip_123'
      };

      const trip = dataLoaderMock.trips[0];

      const delay = controller.calculateDelay(vehicleData, trip);

      expect(delay).toBe(3);
    });

    it('route.pbが利用できない場合はcurrent_stop_sequenceから推定する', () => {
      // 現在時刻を8:05に設定（予定到着時刻8:00より5分遅れ）
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      controller.tripUpdates = [];

      const vehicleData = {
        tripId: 'trip_123',
        currentStopSequence: 1
      };

      const trip = dataLoaderMock.trips[0];

      const delay = controller.calculateDelay(vehicleData, trip);

      expect(delay).toBe(5);

      vi.useRealTimers();
    });

    it('遅延情報が取得できない場合はnullを返す', () => {
      controller.tripUpdates = [];

      const vehicleData = {
        tripId: 'trip_123'
        // currentStopSequenceがない
      };

      const trip = dataLoaderMock.trips[0];

      const delay = controller.calculateDelay(vehicleData, trip);

      expect(delay).toBeNull();
    });
  });

  describe('updateVehicleMarker', () => {
    beforeEach(async () => {
      await controller.initialize();
    });



    it('運行中の車両マーカーをvehicle.pbの座標に配置する', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2600,
        longitude: 130.3000,
        vehicleId: 'bus_001',
        vehicleLabel: '佐賀1号'
      };

      const trip = dataLoaderMock.trips[0];

      const status = controller.determineVehicleStatus(vehicleData, trip);
      controller.updateVehicleMarker(vehicleData, trip);

      expect(mapControllerMock.updateVehicleMarkerPosition).toHaveBeenCalledWith(
        'trip_123',
        33.2600,
        130.3000,
        expect.anything(),
        expect.objectContaining({
          tripId: 'trip_123',
          routeId: 'route_456'
        })
      );

      vi.useRealTimers();
    });

    it('既存マーカーがある場合は位置を更新する', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2600,
        longitude: 130.3000,
        vehicleId: 'bus_001',
        vehicleLabel: '佐賀1号'
      };

      const trip = dataLoaderMock.trips[0];

      // 既存マーカーを設定
      const existingMarker = { _leaflet_id: 123 };
      controller.vehicleMarkers.set('trip_123', existingMarker);

      const status = controller.determineVehicleStatus(vehicleData, trip);
      controller.updateVehicleMarker(vehicleData, trip);

      expect(mapControllerMock.updateVehicleMarkerPosition).toHaveBeenCalledWith(
        'trip_123',
        33.2600,
        130.3000,
        expect.anything(),
        expect.objectContaining({ tripId: 'trip_123' })
      );

      vi.useRealTimers();
    });

    it('不正な座標の場合はマーカーを作成しない', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 999, // 不正な緯度
        longitude: 130.3000,
        vehicleId: 'bus_001',
        vehicleLabel: '佐賀1号'
      };

      const trip = dataLoaderMock.trips[0];

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const status = controller.determineVehicleStatus(vehicleData, trip);
      controller.updateVehicleMarker(vehicleData, trip);

      expect(mapControllerMock.updateVehicleMarkerPosition).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it('最終更新時刻を記録する', () => {
      vi.useFakeTimers();
      const now = Date.now();
      vi.setSystemTime(now);

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2600,
        longitude: 130.3000,
        vehicleId: 'bus_001',
        vehicleLabel: '佐賀1号'
      };

      const trip = dataLoaderMock.trips[0];

      const status = controller.determineVehicleStatus(vehicleData, trip);
      controller.updateVehicleMarker(vehicleData, trip);

      expect(controller.lastUpdateTimes.get('trip_123')).toBe(now);

      vi.useRealTimers();
    });
  });

  describe('removeStaleVehicleMarkers', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('30秒以上更新がない車両マーカーを削除する', () => {
      vi.useFakeTimers();
      const now = Date.now();

      // 古いマーカーを設定（35秒前）
      const oldMarker = { _leaflet_id: 123 };
      controller.vehicleMarkers.set('trip_old', oldMarker);
      controller.lastUpdateTimes.set('trip_old', now - 35000);

      // 新しいマーカーを設定（10秒前）
      const newMarker = { _leaflet_id: 456 };
      controller.vehicleMarkers.set('trip_new', newMarker);
      controller.lastUpdateTimes.set('trip_new', now - 10000);

      vi.setSystemTime(now);

      controller.removeStaleVehicleMarkers();

      expect(mapControllerMock.removeVehicleMarker).toHaveBeenCalledWith('trip_old');
      expect(controller.vehicleMarkers.has('trip_old')).toBe(false);
      expect(controller.lastUpdateTimes.has('trip_old')).toBe(false);

      expect(mapControllerMock.removeVehicleMarker).not.toHaveBeenCalledWith('trip_new');
      expect(controller.vehicleMarkers.has('trip_new')).toBe(true);
      expect(controller.lastUpdateTimes.has('trip_new')).toBe(true);

      vi.useRealTimers();
    });

    it('古いマーカーがない場合は何もしない', () => {
      vi.useFakeTimers();
      const now = Date.now();

      // 新しいマーカーのみ設定
      const newMarker = { _leaflet_id: 456 };
      controller.vehicleMarkers.set('trip_new', newMarker);
      controller.lastUpdateTimes.set('trip_new', now - 10000);

      vi.setSystemTime(now);

      controller.removeStaleVehicleMarkers();

      expect(mapControllerMock.removeVehicleMarker).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('handleAlertsUpdate', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('運休情報と遅延情報を分類する', () => {
      const alerts = [
        {
          id: 'alert_1',
          type: 'cancellation',
          headerText: '運休のお知らせ',
          descriptionText: '本日は運休します。'
        },
        {
          id: 'alert_2',
          type: 'delay',
          headerText: '遅延のお知らせ',
          descriptionText: '約10分の遅延が発生しています。'
        }
      ];

      const displayAlertsSpy = vi.spyOn(controller, 'displayAlerts').mockImplementation(() => {});

      controller.handleAlertsUpdate(alerts);

      expect(displayAlertsSpy).toHaveBeenCalledWith(
        [alerts[0]], // 運休情報
        [alerts[1]]  // 遅延情報
      );

      displayAlertsSpy.mockRestore();
    });

    it('運行情報がない場合はクリアする', () => {
      const clearAlertsSpy = vi.spyOn(controller, 'clearAlerts').mockImplementation(() => {});

      controller.handleAlertsUpdate([]);

      expect(clearAlertsSpy).toHaveBeenCalled();

      clearAlertsSpy.mockRestore();
    });

    it('有効期間外の運行情報をフィルタする', () => {
      vi.useFakeTimers();
      const now = Date.now() / 1000;

      const alerts = [
        {
          id: 'alert_1',
          type: 'delay',
          headerText: '有効なアラート',
          activeStart: now - 1000,
          activeEnd: now + 1000
        },
        {
          id: 'alert_2',
          type: 'delay',
          headerText: '期限切れアラート',
          activeStart: now - 2000,
          activeEnd: now - 1000
        }
      ];

      const displayAlertsSpy = vi.spyOn(controller, 'displayAlerts').mockImplementation(() => {});

      controller.handleAlertsUpdate(alerts);

      expect(displayAlertsSpy).toHaveBeenCalledWith(
        [],
        [alerts[0]] // 有効なアラートのみ
      );

      displayAlertsSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('displayAlerts', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('運休情報を赤色で表示する', () => {
      const cancellations = [
        {
          id: 'alert_1',
          headerText: '運休のお知らせ',
          descriptionText: '本日は運休します。'
        }
      ];

      controller.displayAlerts(cancellations, []);

      const alertsContainer = controller.alertsContainer;
      expect(alertsContainer.style.display).toBe('block');

      const cancellationSection = alertsContainer.querySelector('.alert-section-cancellation');
      expect(cancellationSection).toBeTruthy();

      const alertCard = cancellationSection.querySelector('.alert-card-red');
      expect(alertCard).toBeTruthy();
    });

    it('遅延情報を黄色で最大5件表示する', () => {
      const delays = Array.from({ length: 7 }, (_, i) => ({
        id: `alert_${i}`,
        headerText: `遅延${i + 1}`,
        descriptionText: `遅延情報${i + 1}`
      }));

      controller.displayAlerts([], delays);

      const alertsContainer = controller.alertsContainer;
      const delaySection = alertsContainer.querySelector('.alert-section-delay');
      expect(delaySection).toBeTruthy();

      const alertCards = delaySection.querySelectorAll('.alert-card-yellow');
      expect(alertCards.length).toBe(5);
    });

    it('遅延情報が6件以上の場合は「詳細はこちら」リンクを表示する', () => {
      const delays = Array.from({ length: 7 }, (_, i) => ({
        id: `alert_${i}`,
        headerText: `遅延${i + 1}`,
        descriptionText: `遅延情報${i + 1}`
      }));

      controller.displayAlerts([], delays);

      const alertsContainer = controller.alertsContainer;
      const moreLink = alertsContainer.querySelector('.alert-more-link');
      expect(moreLink).toBeTruthy();
      expect(moreLink.textContent).toContain('詳細はこちら');
      expect(moreLink.textContent).toContain('他2件');
    });
  });

  describe('clearAlerts', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('運行情報表示エリアをクリアして非表示にする', () => {
      // まず運行情報を表示
      const cancellations = [
        {
          id: 'alert_1',
          headerText: '運休のお知らせ',
          descriptionText: '本日は運休します。'
        }
      ];

      controller.displayAlerts(cancellations, []);

      const alertsContainer = controller.alertsContainer;
      expect(alertsContainer.style.display).toBe('block');
      expect(alertsContainer.children.length).toBeGreaterThan(0);

      // クリア
      controller.clearAlerts();

      expect(alertsContainer.style.display).toBe('none');
      expect(alertsContainer.children.length).toBe(0);
    });
  });

  /**
   * タスク6.3: RealtimeVehicleController.handleVehiclePositionsUpdate()のテスト
   * 要件: 2.1, 2.2, 2.3
   */
  describe('handleVehiclePositionsUpdate() - 運行終了バスのフィルタリング', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('運行終了バスがフィルタリングされることを検証', () => {
      vi.useFakeTimers();
      // 現在時刻を9:00に設定（到着時刻8:10より後）
      vi.setSystemTime(new Date('2025-11-16T09:00:00'));

      const vehiclePositions = [
        {
          tripId: 'trip_123',
          latitude: 33.2649,
          longitude: 130.3008,
          vehicleId: 'bus_001',
          vehicleLabel: '佐賀1号'
        }
      ];

      // handleVehiclePositionsUpdateを呼び出し
      controller.handleVehiclePositionsUpdate(vehiclePositions);

      // 運行終了バスのマーカーが削除されることを確認
      expect(mapControllerMock.removeVehicleMarker).toHaveBeenCalledWith('trip_123');
      
      // 運行終了バスのマーカーが作成されないことを確認
      expect(mapControllerMock.updateVehicleMarkerPosition).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('運行中バスのみがマーカー更新されることを検証', () => {
      vi.useFakeTimers();
      // 現在時刻を8:05に設定（運行中）
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehiclePositions = [
        {
          tripId: 'trip_123',
          latitude: 33.2600,
          longitude: 130.3000,
          vehicleId: 'bus_001',
          vehicleLabel: '佐賀1号',
          currentStopSequence: 1
        }
      ];

      // handleVehiclePositionsUpdateを呼び出し
      controller.handleVehiclePositionsUpdate(vehiclePositions);

      // 運行中バスのマーカーが作成されることを確認
      expect(mapControllerMock.updateVehicleMarkerPosition).toHaveBeenCalled();
      
      // 運行終了バスのマーカーが削除されないことを確認
      expect(mapControllerMock.removeVehicleMarker).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('運行終了バスと運行中バスが混在する場合の処理を検証', () => {
      vi.useFakeTimers();
      // 現在時刻を8:05に設定
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      // 運行中バスと運行終了バスを含む配列
      const vehiclePositions = [
        {
          tripId: 'trip_123',
          latitude: 33.2600,
          longitude: 130.3000,
          vehicleId: 'bus_001',
          vehicleLabel: '佐賀1号',
          currentStopSequence: 1
        },
        {
          tripId: 'trip_456',
          latitude: 33.2700,
          longitude: 130.3100,
          vehicleId: 'bus_002',
          vehicleLabel: '佐賀2号'
        }
      ];

      // trip_456の運行終了時刻を過去に設定
      dataLoaderMock.stopTimes.push({
        trip_id: 'trip_456',
        stop_id: 'stop_001',
        stop_sequence: '1',
        arrival_time: '07:00:00',
        departure_time: '07:00:00'
      });
      dataLoaderMock.stopTimes.push({
        trip_id: 'trip_456',
        stop_id: 'stop_002',
        stop_sequence: '2',
        arrival_time: '07:10:00',
        departure_time: '07:10:00'
      });
      dataLoaderMock.trips.push({
        trip_id: 'trip_456',
        route_id: 'route_789',
        service_id: 'weekday'
      });

      // handleVehiclePositionsUpdateを呼び出し
      controller.handleVehiclePositionsUpdate(vehiclePositions);

      // 運行中バス(trip_123)のマーカーが作成されることを確認
      expect(mapControllerMock.updateVehicleMarkerPosition).toHaveBeenCalledWith(
        'trip_123',
        33.2600,
        130.3000,
        expect.anything(),
        expect.objectContaining({ tripId: 'trip_123' })
      );

      // 運行終了バス(trip_456)のマーカーが削除されることを確認
      expect(mapControllerMock.removeVehicleMarker).toHaveBeenCalledWith('trip_456');

      vi.useRealTimers();
    });

    it('空の車両位置情報配列を処理できることを検証', () => {
      const vehiclePositions = [];

      // エラーが発生しないことを確認
      expect(() => {
        controller.handleVehiclePositionsUpdate(vehiclePositions);
      }).not.toThrow();

      // マーカーが作成されないことを確認
      expect(mapControllerMock.updateVehicleMarkerPosition).not.toHaveBeenCalled();
    });

    it('不正なtripIdを持つ車両をスキップすることを検証', () => {
      const vehiclePositions = [
        {
          tripId: 'invalid_trip_id',
          latitude: 33.2600,
          longitude: 130.3000,
          vehicleId: 'bus_999',
          vehicleLabel: '不明'
        }
      ];

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // handleVehiclePositionsUpdateを呼び出し
      controller.handleVehiclePositionsUpdate(vehiclePositions);

      // 警告ログが出力されることを確認
      expect(consoleSpy).toHaveBeenCalled();

      // マーカーが作成されないことを確認
      expect(mapControllerMock.updateVehicleMarkerPosition).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  /**
   * Property 6: 吹き出しへの統合
   * Feature: trip-timetable-display, Property 6: 吹き出しへの統合
   * 
   * 任意の車両マーカーに対して、吹き出しには運行状態情報と時刻表情報の両方が含まれ、
   * 時刻表は運行状態情報の下に配置される
   * 
   * Validates: Requirements 3.1
   */
  describe('Property 6: 吹き出しへの統合', () => {
    beforeEach(async () => {
      await controller.initialize();
      
      // TripTimetableFormatterのモックを設定
      controller.tripTimetableFormatter = {
        formatTimetableText: vi.fn((tripId, options) => {
          return `時刻表: ${tripId}`;
        })
      };
    });

    it('任意の車両マーカーの吹き出しに運行状態情報と時刻表情報の両方が含まれる', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2600,
        longitude: 130.3000,
        currentStopSequence: 1
      };

      const trip = dataLoaderMock.trips[0];

      // 吹き出しコンテンツを作成
      const vehicleStatus = controller.determineVehicleStatus(vehicleData, trip);
      const tripInfo = {
        tripId: 'trip_123',
        routeId: 'route_456',
        routeName: '佐賀駅～大和線'
      };
      
      const popupContent = controller.createVehiclePopupContent(vehicleData, trip, tripInfo, vehicleStatus);

      // 運行状態情報が含まれることを確認
      expect(popupContent.querySelector('.vehicle-status')).toBeTruthy();
      expect(popupContent.textContent).toContain('便ID: trip_123');
      expect(popupContent.textContent).toContain('路線: 佐賀駅～大和線');

      expect(popupContent.querySelector('.trip-timetable-text')).toBeTruthy();
      expect(popupContent.textContent).toContain('時刻表: trip_123');

      // 時刻表が運行状態情報の下に配置されることを確認
      const vehicleStatusElement = popupContent.querySelector('.vehicle-status');
      const timetableElement = popupContent.querySelector('.trip-timetable-text');
      
      // DOMツリー内での順序を確認
      const vehicleStatusIndex = Array.from(popupContent.children).indexOf(vehicleStatusElement);
      const timetableIndex = Array.from(popupContent.children).indexOf(timetableElement);
      
      expect(timetableIndex).toBeGreaterThan(vehicleStatusIndex);

      vi.useRealTimers();
    });

    it('時刻表生成エラー時も運行状態情報は表示される', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      // TripTimetableFormatterがエラーをスローするように設定
      controller.tripTimetableFormatter.formatTimetableText = vi.fn(() => {
        throw new Error('時刻表生成エラー');
      });

      const vehicleData = {
        tripId: 'trip_123',
        latitude: 33.2600,
        longitude: 130.3000,
        currentStopSequence: 1
      };

      const trip = dataLoaderMock.trips[0];

      const vehicleStatus = controller.determineVehicleStatus(vehicleData, trip);
      const tripInfo = {
        tripId: 'trip_123',
        routeId: 'route_456',
        routeName: '佐賀駅～大和線'
      };
      
      const popupContent = controller.createVehiclePopupContent(vehicleData, trip, tripInfo, vehicleStatus);

      // 運行状態情報は表示される
      expect(popupContent.querySelector('.vehicle-status')).toBeTruthy();
      expect(popupContent.textContent).toContain('便ID: trip_123');

      // エラーメッセージが表示される
      expect(popupContent.textContent).toContain('時刻表情報の取得に失敗しました');

      vi.useRealTimers();
    });

    it('複数の車両マーカーでそれぞれ正しい時刻表が表示される', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-11-16T08:05:00'));

      const vehicleData1 = {
        tripId: 'trip_123',
        latitude: 33.2600,
        longitude: 130.3000,
        currentStopSequence: 1
      };

      const vehicleData2 = {
        tripId: 'trip_456',
        latitude: 33.2700,
        longitude: 130.3100,
        currentStopSequence: 2
      };

      const trip = dataLoaderMock.trips[0];
      const vehicleStatus = controller.determineVehicleStatus(vehicleData1, trip);
      const tripInfo1 = {
        tripId: 'trip_123',
        routeId: 'route_456',
        routeName: '佐賀駅～大和線'
      };
      const tripInfo2 = {
        tripId: 'trip_456',
        routeId: 'route_789',
        routeName: '佐賀駅～鳥栖線'
      };

      const popupContent1 = controller.createVehiclePopupContent(vehicleData1, trip, tripInfo1, vehicleStatus);
      const popupContent2 = controller.createVehiclePopupContent(vehicleData2, trip, tripInfo2, vehicleStatus);

      // それぞれの吹き出しに正しい時刻表が含まれる
      expect(popupContent1.textContent).toContain('時刻表: trip_123');
      expect(popupContent2.textContent).toContain('時刻表: trip_456');

      // TripTimetableFormatterが正しいパラメータで呼び出される
      expect(controller.tripTimetableFormatter.formatTimetableText).toHaveBeenCalledWith(
        'trip_123',
        expect.objectContaining({ currentStopSequence: 1 })
      );
      expect(controller.tripTimetableFormatter.formatTimetableText).toHaveBeenCalledWith(
        'trip_456',
        expect.objectContaining({ currentStopSequence: 2 })
      );

      vi.useRealTimers();
    });
  });
});
