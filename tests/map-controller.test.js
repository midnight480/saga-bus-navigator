/**
 * MapControllerの単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// MapControllerクラスをインポート
import '../js/map-controller.js';

// Leafletのモック
const createLeafletMock = () => {
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    fitBounds: vi.fn(),
    getZoom: vi.fn().mockReturnValue(13),
    getCenter: vi.fn().mockReturnValue({ lat: 33.2635, lng: 130.3005 })
  };

  const mockMarker = {
    bindTooltip: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    setIcon: vi.fn().mockReturnThis(),
    getElement: vi.fn().mockReturnValue({
      style: {}
    })
  };

  const mockMarkerClusterGroup = {
    addLayer: vi.fn(),
    clearLayers: vi.fn(),
    getLayers: vi.fn().mockReturnValue([])
  };

  const mockLayerGroup = {
    addTo: vi.fn().mockReturnThis(),
    addLayer: vi.fn(),
    clearLayers: vi.fn(),
    getLayers: vi.fn().mockReturnValue([])
  };

  const mockTileLayer = {
    addTo: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    _url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  };

  const mockPolyline = {};

  const mockDivIcon = {};

  const mockLatLngBounds = {
    extend: vi.fn()
  };

  return {
    map: vi.fn(() => mockMap),
    marker: vi.fn(() => mockMarker),
    markerClusterGroup: vi.fn(() => mockMarkerClusterGroup),
    layerGroup: vi.fn(() => mockLayerGroup),
    tileLayer: vi.fn(() => mockTileLayer),
    polyline: vi.fn(() => mockPolyline),
    divIcon: vi.fn(() => mockDivIcon),
    latLngBounds: vi.fn(() => mockLatLngBounds),
    DomUtil: {
      create: vi.fn((tag) => {
        const element = document.createElement(tag);
        return element;
      })
    },
    control: vi.fn(() => ({
      onAdd: vi.fn(),
      addTo: vi.fn()
    }))
  };
};

describe('MapController', () => {
  let mapController;
  let mockBusStops;
  let leafletMock;

  beforeEach(() => {
    // Leafletモックをグローバルに設定
    leafletMock = createLeafletMock();
    global.L = leafletMock;

    // MapControllerインスタンスを作成
    mapController = new window.MapController();

    // テスト用バス停データ
    mockBusStops = [
      { id: 'SAGA-001', name: '佐賀駅バスセンター', lat: 33.2649, lng: 130.3008 },
      { id: 'SAGA-002', name: '県庁前', lat: 33.2495, lng: 130.3005 },
      { id: 'SAGA-003', name: '佐賀大学', lat: 33.2400, lng: 130.2900 }
    ];

    // DOM要素をモック
    document.body.innerHTML = `
      <div id="map-container"></div>
      <button id="clear-route-button" style="display: none;"></button>
    `;
  });

  afterEach(() => {
    // グローバルモックをクリア
    delete global.L;
  });

  describe('initialize', () => {
    it('地図を正しい中心座標とズームレベルで初期化する', () => {
      mapController.initialize('map-container', mockBusStops);

      expect(leafletMock.map).toHaveBeenCalledWith('map-container', expect.objectContaining({
        center: [33.2635, 130.3005],
        zoom: 13,
        minZoom: 10,
        maxZoom: 18
      }));
    });

    it('バス停データを保存する', () => {
      mapController.initialize('map-container', mockBusStops);

      expect(mapController.busStops).toEqual(mockBusStops);
    });

    it('マーカークラスターグループを初期化する', () => {
      mapController.initialize('map-container', mockBusStops);

      expect(leafletMock.markerClusterGroup).toHaveBeenCalled();
      expect(mapController.markerCluster).toBeDefined();
    });

    it('経路表示用レイヤーを初期化する', () => {
      mapController.initialize('map-container', mockBusStops);

      expect(leafletMock.layerGroup).toHaveBeenCalled();
      expect(mapController.routeLayer).toBeDefined();
    });

    it('Leafletが未定義の場合はエラーを処理する', () => {
      delete global.L;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        mapController.initialize('map-container', mockBusStops);
      }).toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe('isValidCoordinate', () => {
    it('有効な座標の場合trueを返す', () => {
      expect(mapController.isValidCoordinate(33.2649, 130.3008)).toBe(true);
      expect(mapController.isValidCoordinate(0, 0)).toBe(true);
      expect(mapController.isValidCoordinate(-90, -180)).toBe(true);
      expect(mapController.isValidCoordinate(90, 180)).toBe(true);
    });

    it('緯度が範囲外の場合falseを返す', () => {
      expect(mapController.isValidCoordinate(-91, 130.3008)).toBe(false);
      expect(mapController.isValidCoordinate(91, 130.3008)).toBe(false);
    });

    it('経度が範囲外の場合falseを返す', () => {
      expect(mapController.isValidCoordinate(33.2649, -181)).toBe(false);
      expect(mapController.isValidCoordinate(33.2649, 181)).toBe(false);
    });

    it('数値でない場合falseを返す', () => {
      expect(mapController.isValidCoordinate('33.2649', 130.3008)).toBe(false);
      expect(mapController.isValidCoordinate(33.2649, '130.3008')).toBe(false);
      expect(mapController.isValidCoordinate(null, 130.3008)).toBe(false);
      expect(mapController.isValidCoordinate(33.2649, undefined)).toBe(false);
    });

    it('NaNの場合falseを返す', () => {
      expect(mapController.isValidCoordinate(NaN, 130.3008)).toBe(false);
      expect(mapController.isValidCoordinate(33.2649, NaN)).toBe(false);
    });
  });

  describe('createBusStopIcon', () => {
    it('青色アイコンを作成する', () => {
      mapController.createBusStopIcon('blue');

      expect(leafletMock.divIcon).toHaveBeenCalledWith(expect.objectContaining({
        className: 'bus-stop-marker',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34]
      }));
    });

    it('緑色アイコンを作成する', () => {
      mapController.createBusStopIcon('green');

      expect(leafletMock.divIcon).toHaveBeenCalled();
    });

    it('赤色アイコンを作成する', () => {
      mapController.createBusStopIcon('red');

      expect(leafletMock.divIcon).toHaveBeenCalled();
    });

    it('黄色アイコンを作成する', () => {
      mapController.createBusStopIcon('yellow');

      expect(leafletMock.divIcon).toHaveBeenCalled();
    });

    it('デフォルトで青色アイコンを作成する', () => {
      mapController.createBusStopIcon();

      expect(leafletMock.divIcon).toHaveBeenCalled();
    });
  });

  describe('displayAllStops', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
    });

    it('全てのバス停マーカーを作成する', () => {
      // requestAnimationFrameをモック
      global.requestAnimationFrame = vi.fn((callback) => {
        callback(0);
        return 0;
      });

      mapController.displayAllStops();

      // 全てのバス停に対してマーカーが作成される
      expect(mapController.markers.size).toBe(mockBusStops.length);
    });

    it('不正な座標データをスキップする', () => {
      const invalidBusStops = [
        { id: 'SAGA-001', name: '佐賀駅バスセンター', lat: 33.2649, lng: 130.3008 },
        { id: 'SAGA-INVALID', name: '不正なバス停', lat: 999, lng: 130.3008 }, // 不正な緯度
        { id: 'SAGA-002', name: '県庁前', lat: 33.2495, lng: 130.3005 }
      ];

      mapController.busStops = invalidBusStops;

      global.requestAnimationFrame = vi.fn((callback) => {
        callback(0);
        return 0;
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mapController.displayAllStops();

      // 有効なバス停のみマーカーが作成される
      expect(mapController.markers.size).toBe(2);

      consoleSpy.mockRestore();
    });

    it('バス停データが空の場合はエラーを処理する', () => {
      mapController.busStops = [];

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mapController.displayAllStops();

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('setSelectionMode', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
      
      global.requestAnimationFrame = vi.fn((callback) => {
        callback(0);
        return 0;
      });
      
      mapController.displayAllStops();
    });

    it('選択モードを設定する', () => {
      mapController.setSelectionMode('departure');
      expect(mapController.selectionMode).toBe('departure');

      mapController.setSelectionMode('arrival');
      expect(mapController.selectionMode).toBe('arrival');

      mapController.setSelectionMode('none');
      expect(mapController.selectionMode).toBe('none');
    });

    it('不正な選択モードの場合はエラーを出力する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mapController.setSelectionMode('invalid');

      expect(consoleSpy).toHaveBeenCalled();
      expect(mapController.selectionMode).not.toBe('invalid');

      consoleSpy.mockRestore();
    });
  });

  describe('selectDepartureStop', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
      
      global.requestAnimationFrame = vi.fn((callback) => {
        callback(0);
        return 0;
      });
      
      mapController.displayAllStops();
    });

    it('乗車バス停を選択する', () => {
      const stop = mockBusStops[0];
      mapController.selectDepartureStop(stop);

      expect(mapController.selectedDepartureMarker).toBeDefined();
      expect(mapController.selectedDepartureMarker.stopId).toBe(stop.id);
    });

    it('既存の選択をクリアして新しいバス停を選択する', () => {
      const stop1 = mockBusStops[0];
      const stop2 = mockBusStops[1];

      mapController.selectDepartureStop(stop1);
      const firstMarker = mapController.selectedDepartureMarker;

      mapController.selectDepartureStop(stop2);
      const secondMarker = mapController.selectedDepartureMarker;

      expect(secondMarker).not.toBe(firstMarker);
      expect(secondMarker.stopId).toBe(stop2.id);
    });
  });

  describe('selectArrivalStop', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
      
      global.requestAnimationFrame = vi.fn((callback) => {
        callback(0);
        return 0;
      });
      
      mapController.displayAllStops();
    });

    it('降車バス停を選択する', () => {
      const stop = mockBusStops[0];
      mapController.selectArrivalStop(stop);

      expect(mapController.selectedArrivalMarker).toBeDefined();
      expect(mapController.selectedArrivalMarker.stopId).toBe(stop.id);
    });

    it('既存の選択をクリアして新しいバス停を選択する', () => {
      const stop1 = mockBusStops[0];
      const stop2 = mockBusStops[1];

      mapController.selectArrivalStop(stop1);
      const firstMarker = mapController.selectedArrivalMarker;

      mapController.selectArrivalStop(stop2);
      const secondMarker = mapController.selectedArrivalMarker;

      expect(secondMarker).not.toBe(firstMarker);
      expect(secondMarker.stopId).toBe(stop2.id);
    });
  });

  describe('displayRoute', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
    });

    it('経路を地図上に表示する', () => {
      const routeData = {
        departureStop: {
          name: '佐賀駅バスセンター',
          lat: 33.2649,
          lng: 130.3008,
          time: '08:00'
        },
        arrivalStop: {
          name: '佐賀大学',
          lat: 33.2400,
          lng: 130.2900,
          time: '08:15'
        },
        viaStops: [
          {
            name: '県庁前',
            lat: 33.2495,
            lng: 130.3005,
            time: '08:05'
          }
        ],
        routeCoordinates: [
          [33.2649, 130.3008],
          [33.2495, 130.3005],
          [33.2400, 130.2900]
        ]
      };

      mapController.displayRoute(routeData);

      // マーカーが作成されることを確認
      expect(leafletMock.marker).toHaveBeenCalled();
      
      // 経路線が作成されることを確認
      expect(leafletMock.polyline).toHaveBeenCalled();
    });

    it('経路表示前に既存の経路をクリアする', () => {
      const routeData = {
        departureStop: {
          name: '佐賀駅バスセンター',
          lat: 33.2649,
          lng: 130.3008,
          time: '08:00'
        },
        arrivalStop: {
          name: '佐賀大学',
          lat: 33.2400,
          lng: 130.2900,
          time: '08:15'
        },
        viaStops: [],
        routeCoordinates: [
          [33.2649, 130.3008],
          [33.2400, 130.2900]
        ]
      };

      const clearRouteSpy = vi.spyOn(mapController, 'clearRoute');

      mapController.displayRoute(routeData);

      expect(clearRouteSpy).toHaveBeenCalled();

      clearRouteSpy.mockRestore();
    });
  });

  describe('clearRoute', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
    });

    it('経路レイヤーをクリアする', () => {
      mapController.clearRoute();

      expect(mapController.routeLayer.clearLayers).toHaveBeenCalled();
    });

    it('経路クリアボタンを非表示にする', () => {
      const clearButton = document.getElementById('clear-route-button');
      clearButton.style.display = 'block';

      mapController.clearRoute();

      expect(clearButton.style.display).toBe('none');
    });
  });

  describe('setOnStopSelectedCallback', () => {
    it('コールバック関数を設定する', () => {
      const callback = vi.fn();
      mapController.setOnStopSelectedCallback(callback);

      expect(mapController.onStopSelected).toBe(callback);
    });

    it('関数でない場合はエラーを出力する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mapController.setOnStopSelectedCallback('not a function');

      expect(consoleSpy).toHaveBeenCalled();
      expect(mapController.onStopSelected).not.toBe('not a function');

      consoleSpy.mockRestore();
    });
  });

  describe('handleMarkerClick', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
      
      global.requestAnimationFrame = vi.fn((callback) => {
        callback(0);
        return 0;
      });
      
      mapController.displayAllStops();
    });

    it('乗車バス停選択モードでコールバックを呼び出す', () => {
      const callback = vi.fn();
      mapController.setOnStopSelectedCallback(callback);
      mapController.setSelectionMode('departure');

      const stop = mockBusStops[0];
      mapController.handleMarkerClick(stop);

      expect(callback).toHaveBeenCalledWith('departure', stop.name);
    });

    it('降車バス停選択モードでコールバックを呼び出す', () => {
      const callback = vi.fn();
      mapController.setOnStopSelectedCallback(callback);
      mapController.setSelectionMode('arrival');

      const stop = mockBusStops[0];
      mapController.handleMarkerClick(stop);

      expect(callback).toHaveBeenCalledWith('arrival', stop.name);
    });

    it('選択モードがnoneの場合はコールバックを呼び出さない', () => {
      const callback = vi.fn();
      mapController.setOnStopSelectedCallback(callback);
      mapController.setSelectionMode('none');

      const stop = mockBusStops[0];
      mapController.handleMarkerClick(stop);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('エラーログを出力する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mapController.logError('テストエラー', { detail: 'テスト詳細' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(mapController.errorCount).toBe(1);

      consoleSpy.mockRestore();
    });

    it('エラーログをグローバル配列に保存する', () => {
      mapController.logError('テストエラー', { detail: 'テスト詳細' });

      expect(window.mapControllerErrors).toBeDefined();
      expect(window.mapControllerErrors.length).toBeGreaterThan(0);
    });
  });

  describe('getPerformanceStats', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
    });

    it('パフォーマンス統計を取得する', () => {
      const stats = mapController.getPerformanceStats();

      expect(stats).toHaveProperty('markerCount');
      expect(stats).toHaveProperty('clusterCount');
      expect(stats).toHaveProperty('routeLayerCount');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('mapZoom');
      expect(stats).toHaveProperty('mapCenter');
    });
  });
});
