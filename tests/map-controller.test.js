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
    addTo: vi.fn().mockReturnThis(),
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

  describe('現在地表示機能', () => {
    beforeEach(() => {
      mapController.initialize('map-container', mockBusStops);
      // 現在地ボタンはLeafletコントロールとして自動的に追加される
    });

    afterEach(() => {
      // 現在地コントロールを削除
      if (mapController.currentLocationControl) {
        mapController.map.removeControl(mapController.currentLocationControl);
        mapController.currentLocationControl = null;
      }
      
      // Geolocation APIをクリーンアップ
      if (global.navigator && global.navigator.geolocation) {
        delete global.navigator.geolocation;
      }
    });

    describe('getCurrentPosition', () => {
      it('位置情報を正常に取得する', async () => {
        // Geolocation APIをモック
        const mockPosition = {
          coords: {
            latitude: 33.2649,
            longitude: 130.3008,
            accuracy: 10
          }
        };

        global.navigator.geolocation = {
          getCurrentPosition: vi.fn((successCallback) => {
            successCallback(mockPosition);
          })
        };

        const position = await mapController.getCurrentPosition();

        expect(position).toEqual(mockPosition);
        expect(global.navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          expect.objectContaining({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          })
        );
      });

      it('位置情報の取得に失敗した場合はエラーを返す', async () => {
        // Geolocation APIをモック（エラーケース）
        const mockError = {
          code: 1,
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1
        };

        global.navigator.geolocation = {
          getCurrentPosition: vi.fn((successCallback, errorCallback) => {
            errorCallback(mockError);
          })
        };

        await expect(mapController.getCurrentPosition()).rejects.toEqual(mockError);
      });

      it('Geolocation APIがサポートされていない場合はエラーを返す', async () => {
        // Geolocation APIを削除
        delete global.navigator.geolocation;

        await expect(mapController.getCurrentPosition()).rejects.toThrow('Geolocation APIがサポートされていません');
      });

      it('位置情報取得時に正しいオプションを渡す', async () => {
        const mockPosition = {
          coords: {
            latitude: 33.2649,
            longitude: 130.3008
          }
        };

        global.navigator.geolocation = {
          getCurrentPosition: vi.fn((successCallback) => {
            successCallback(mockPosition);
          })
        };

        await mapController.getCurrentPosition();

        expect(global.navigator.geolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      });
    });

    describe('displayCurrentLocationMarker', () => {
      it('現在地マーカーを表示する', () => {
        const lat = 33.2649;
        const lng = 130.3008;

        mapController.displayCurrentLocationMarker(lat, lng);

        expect(leafletMock.marker).toHaveBeenCalledWith([lat, lng], expect.any(Object));
        expect(mapController.currentLocationMarker).toBeDefined();
      });

      it('現在地マーカーにポップアップを設定する', () => {
        const lat = 33.2649;
        const lng = 130.3008;

        mapController.displayCurrentLocationMarker(lat, lng);

        expect(mapController.currentLocationMarker.bindPopup).toHaveBeenCalledWith('現在地');
      });

      it('既存の現在地マーカーを削除してから新しいマーカーを表示する', () => {
        const lat1 = 33.2649;
        const lng1 = 130.3008;
        const lat2 = 33.2495;
        const lng2 = 130.3005;

        // 最初のマーカーを表示
        mapController.displayCurrentLocationMarker(lat1, lng1);
        const firstMarker = mapController.currentLocationMarker;

        // 2番目のマーカーを表示
        mapController.displayCurrentLocationMarker(lat2, lng2);

        // 既存のマーカーが削除されたことを確認
        expect(mapController.map.removeLayer).toHaveBeenCalledWith(firstMarker);
        
        // 新しいマーカーが作成されたことを確認（leafletMock.markerが2回呼ばれる）
        expect(leafletMock.marker).toHaveBeenCalledTimes(2);
        expect(leafletMock.marker).toHaveBeenLastCalledWith([lat2, lng2], expect.any(Object));
      });

      it('現在地マーカーが地図に追加される', () => {
        const lat = 33.2649;
        const lng = 130.3008;

        mapController.displayCurrentLocationMarker(lat, lng);

        expect(mapController.currentLocationMarker.addTo).toBeDefined();
      });
    });

    describe('showCurrentLocation', () => {
      it('現在地を取得して地図を移動する', async () => {
        const mockPosition = {
          coords: {
            latitude: 33.2649,
            longitude: 130.3008
          }
        };

        global.navigator.geolocation = {
          getCurrentPosition: vi.fn((successCallback) => {
            successCallback(mockPosition);
          })
        };

        await mapController.showCurrentLocation();

        expect(mapController.map.setView).toHaveBeenCalledWith(
          [mockPosition.coords.latitude, mockPosition.coords.longitude],
          15
        );
        expect(mapController.currentLocationMarker).toBeDefined();
      });

      it('現在地を取得して地図をズームレベル15で表示する', async () => {
        const mockPosition = {
          coords: {
            latitude: 33.2649,
            longitude: 130.3008
          }
        };

        global.navigator.geolocation = {
          getCurrentPosition: vi.fn((successCallback) => {
            successCallback(mockPosition);
          })
        };

        await mapController.showCurrentLocation();

        expect(mapController.map.setView).toHaveBeenCalledWith(
          expect.any(Array),
          15
        );
      });

      it('位置情報の取得に失敗した場合はエラーを表示する', async () => {
        const mockError = {
          code: 1,
          message: 'User denied Geolocation',
          PERMISSION_DENIED: 1
        };

        global.navigator.geolocation = {
          getCurrentPosition: vi.fn((successCallback, errorCallback) => {
            errorCallback(mockError);
          })
        };

        const displayErrorSpy = vi.spyOn(mapController, 'displayLocationError');

        await mapController.showCurrentLocation();

        expect(displayErrorSpy).toHaveBeenCalled();

        displayErrorSpy.mockRestore();
      });

      it('位置情報取得成功時にコンソールログを出力する', async () => {
        const mockPosition = {
          coords: {
            latitude: 33.2649,
            longitude: 130.3008
          }
        };

        global.navigator.geolocation = {
          getCurrentPosition: vi.fn((successCallback) => {
            successCallback(mockPosition);
          })
        };

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await mapController.showCurrentLocation();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[MapController] 現在地を取得しました'),
          expect.objectContaining({
            latitude: mockPosition.coords.latitude,
            longitude: mockPosition.coords.longitude
          })
        );

        consoleSpy.mockRestore();
      });
    });

    describe('handleLocationError', () => {
      it('PERMISSION_DENIEDエラーを処理する', () => {
        const error = {
          code: 1,
          PERMISSION_DENIED: 1
        };

        const displayErrorSpy = vi.spyOn(mapController, 'displayLocationError');

        mapController.handleLocationError(error);

        expect(displayErrorSpy).toHaveBeenCalledWith('位置情報の使用が許可されていません');

        displayErrorSpy.mockRestore();
      });

      it('POSITION_UNAVAILABLEエラーを処理する', () => {
        const error = {
          code: 2,
          POSITION_UNAVAILABLE: 2
        };

        const displayErrorSpy = vi.spyOn(mapController, 'displayLocationError');

        mapController.handleLocationError(error);

        expect(displayErrorSpy).toHaveBeenCalledWith('位置情報が利用できません');

        displayErrorSpy.mockRestore();
      });

      it('TIMEOUTエラーを処理する', () => {
        const error = {
          code: 3,
          TIMEOUT: 3
        };

        const displayErrorSpy = vi.spyOn(mapController, 'displayLocationError');

        mapController.handleLocationError(error);

        expect(displayErrorSpy).toHaveBeenCalledWith('位置情報の取得がタイムアウトしました');

        displayErrorSpy.mockRestore();
      });

      it('一般的なエラーを処理する', () => {
        const error = new Error('Unknown error');

        const displayErrorSpy = vi.spyOn(mapController, 'displayLocationError');

        mapController.handleLocationError(error);

        expect(displayErrorSpy).toHaveBeenCalledWith('Unknown error');

        displayErrorSpy.mockRestore();
      });

      it('エラーコードがない場合はエラーメッセージを使用する', () => {
        const error = {
          message: 'Custom error message'
        };

        const displayErrorSpy = vi.spyOn(mapController, 'displayLocationError');

        mapController.handleLocationError(error);

        expect(displayErrorSpy).toHaveBeenCalledWith('Custom error message');

        displayErrorSpy.mockRestore();
      });

      it('エラーログをコンソールに出力する', () => {
        const error = {
          code: 1,
          PERMISSION_DENIED: 1
        };

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const displayErrorSpy = vi.spyOn(mapController, 'displayLocationError').mockImplementation(() => {});

        mapController.handleLocationError(error);

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[MapController] 位置情報エラー'),
          expect.any(String),
          error
        );

        consoleSpy.mockRestore();
        displayErrorSpy.mockRestore();
      });
    });

    describe('displayLocationError', () => {
      it('エラーメッセージを表示する', () => {
        const message = 'テストエラーメッセージ';

        mapController.displayLocationError(message);

        expect(leafletMock.control).toHaveBeenCalledWith({ position: 'topright' });
      });

      it('エラー通知に正しいメッセージを含む', () => {
        const message = 'テストエラーメッセージ';
        let createdDiv = null;
        let onAddCallback = null;

        // L.controlのonAddメソッドをキャプチャ
        leafletMock.control = vi.fn(() => {
          const control = {
            onAdd: null,
            addTo: vi.fn()
          };
          return control;
        });

        mapController.displayLocationError(message);

        // controlが呼ばれたことを確認
        expect(leafletMock.control).toHaveBeenCalledWith({ position: 'topright' });
      });

      it('エラー通知が3秒後に自動的に削除される', () => {
        const message = 'テストエラーメッセージ';
        
        vi.useFakeTimers();

        mapController.displayLocationError(message);

        // 3秒後にタイマーを進める
        vi.advanceTimersByTime(3000);

        // タイマーをクリーンアップ
        vi.useRealTimers();
        
        // テストが完了したことを確認
        expect(leafletMock.control).toHaveBeenCalled();
      });
    });

    describe('setupCurrentLocationButton', () => {
      it('現在地ボタンをLeafletコントロールとして追加する', () => {
        const showLocationSpy = vi.spyOn(mapController, 'showCurrentLocation').mockImplementation(() => {});

        mapController.setupCurrentLocationButton();

        // コントロールが追加されていることを確認
        expect(mapController.currentLocationControl).toBeDefined();
        
        // ボタンが存在することを確認
        const locationButton = document.querySelector('.current-location-button');
        expect(locationButton).toBeTruthy();

        // ボタンをクリック
        locationButton.click();

        expect(showLocationSpy).toHaveBeenCalled();

        showLocationSpy.mockRestore();
      });

      it('現在地ボタンが正しい位置（bottomright）に配置される', () => {
        mapController.setupCurrentLocationButton();

        // コントロールがbottomrightに配置されていることを確認
        expect(mapController.currentLocationControl.options.position).toBe('bottomright');
      });

      it('現在地ボタン追加時にコンソールログを出力する', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        mapController.setupCurrentLocationButton();

        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[MapController] 現在地ボタンをLeafletコントロールとして追加しました')
        );

        consoleSpy.mockRestore();
      });
    });
  });
});
