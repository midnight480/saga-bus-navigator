/**
 * UIController地図機能拡張の単体テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// UIControllerクラスをインポート
import '../js/app.js';

describe('UIController - 地図機能拡張', () => {
  let uiController;
  let mockBusStops;
  let mockMapController;

  beforeEach(() => {
    // テスト用バス停データ
    mockBusStops = [
      { id: 'SAGA-001', name: '佐賀駅バスセンター', lat: 33.2649, lng: 130.3008 },
      { id: 'SAGA-002', name: '県庁前', lat: 33.2495, lng: 130.3005 },
      { id: 'SAGA-003', name: '佐賀大学', lat: 33.2400, lng: 130.2900 }
    ];

    // MapControllerのモック
    mockMapController = {
      setSelectionMode: vi.fn(),
      displayRoute: vi.fn()
    };

    // グローバルにMapControllerを設定
    window.mapController = mockMapController;

    // DOM要素をモック
    document.body.innerHTML = `
      <input id="departure-stop" />
      <input id="arrival-stop" />
      <ul id="departure-suggestions"></ul>
      <ul id="arrival-suggestions"></ul>
      <button id="search-button"></button>
      <div id="error-message"></div>
      <input type="radio" name="weekday-option" value="auto" checked />
      <input type="radio" name="weekday-option" value="平日" />
      <input type="radio" name="weekday-option" value="土日祝" />
      <input type="radio" name="time-option" value="now" checked />
      <input type="radio" name="time-option" value="departure-time" />
      <input type="radio" name="time-option" value="arrival-time" />
      <input type="radio" name="time-option" value="first-bus" />
      <input type="radio" name="time-option" value="last-bus" />
      <div id="time-picker" style="display: none;">
        <input id="time-hour" type="number" />
        <input id="time-minute" type="number" />
      </div>
      <div id="results-container"></div>
      <button id="load-more"></button>
      <div id="loading"></div>
      <button id="map-select-departure">地図から選択</button>
      <button id="map-select-arrival">地図から選択</button>
      <div id="map-container"></div>
    `;

    // UIControllerを初期化
    uiController = new window.UIController();
    uiController.initialize(mockBusStops);
  });

  afterEach(() => {
    // グローバルモックをクリア
    delete window.mapController;
  });

  describe('setupMapSelectionButtons', () => {
    it('地図選択ボタンのイベントリスナーが設定される', () => {
      expect(uiController.mapSelectionButtons.departure).toBeDefined();
      expect(uiController.mapSelectionButtons.arrival).toBeDefined();
    });
  });

  describe('startMapSelection', () => {
    it('乗車バス停の地図選択モードを開始する', () => {
      uiController.startMapSelection('departure');

      expect(uiController.isMapSelectionActive).toBe(true);
      expect(uiController.currentMapSelectionType).toBe('departure');
      expect(mockMapController.setSelectionMode).toHaveBeenCalledWith('departure');
    });

    it('降車バス停の地図選択モードを開始する', () => {
      uiController.startMapSelection('arrival');

      expect(uiController.isMapSelectionActive).toBe(true);
      expect(uiController.currentMapSelectionType).toBe('arrival');
      expect(mockMapController.setSelectionMode).toHaveBeenCalledWith('arrival');
    });

    it('ボタンの表示を更新する', () => {
      const departureButton = document.getElementById('map-select-departure');

      uiController.startMapSelection('departure');

      expect(departureButton.textContent).toBe('選択を中止');
      expect(departureButton.classList.contains('map-selection-active')).toBe(true);
    });

    it('不正な選択タイプの場合はエラーを出力する', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      uiController.startMapSelection('invalid');

      expect(consoleSpy).toHaveBeenCalled();
      expect(uiController.isMapSelectionActive).toBe(false);

      consoleSpy.mockRestore();
    });

    it('既に選択モードがアクティブな場合は一旦停止する', () => {
      uiController.startMapSelection('departure');
      expect(uiController.isMapSelectionActive).toBe(true);

      uiController.startMapSelection('arrival');
      expect(uiController.currentMapSelectionType).toBe('arrival');
    });
  });

  describe('stopMapSelection', () => {
    beforeEach(() => {
      uiController.startMapSelection('departure');
    });

    it('地図選択モードを終了する', () => {
      uiController.stopMapSelection();

      expect(uiController.isMapSelectionActive).toBe(false);
      expect(uiController.currentMapSelectionType).toBeNull();
      expect(mockMapController.setSelectionMode).toHaveBeenCalledWith('none');
    });

    it('ボタンの表示を元に戻す', () => {
      const departureButton = document.getElementById('map-select-departure');

      uiController.stopMapSelection();

      expect(departureButton.textContent).toBe('地図から選択');
      expect(departureButton.classList.contains('map-selection-active')).toBe(false);
    });

    it('選択モードがアクティブでない場合は何もしない', () => {
      uiController.stopMapSelection();
      uiController.stopMapSelection(); // 2回目の呼び出し

      // エラーが発生しないことを確認
      expect(uiController.isMapSelectionActive).toBe(false);
    });
  });

  describe('updateMapSelectionButtonState', () => {
    it('ボタンをアクティブ状態に更新する', () => {
      const departureButton = document.getElementById('map-select-departure');

      uiController.updateMapSelectionButtonState('departure', true);

      expect(departureButton.textContent).toBe('選択を中止');
      expect(departureButton.classList.contains('map-selection-active')).toBe(true);
    });

    it('ボタンを非アクティブ状態に更新する', () => {
      const departureButton = document.getElementById('map-select-departure');
      departureButton.textContent = '選択を中止';
      departureButton.classList.add('map-selection-active');

      uiController.updateMapSelectionButtonState('departure', false);

      expect(departureButton.textContent).toBe('地図から選択');
      expect(departureButton.classList.contains('map-selection-active')).toBe(false);
    });
  });

  describe('handleMapStopSelection', () => {
    beforeEach(() => {
      uiController.startMapSelection('departure');
    });

    it('乗車バス停を検索フォームに自動入力する', () => {
      const stopName = '佐賀駅バスセンター';

      uiController.handleMapStopSelection('departure', stopName);

      expect(uiController.selectedDepartureStop).toBe(stopName);
      expect(uiController.departureInput.value).toBe(stopName);
    });

    it('降車バス停を検索フォームに自動入力する', () => {
      uiController.stopMapSelection();
      uiController.startMapSelection('arrival');

      const stopName = '佐賀大学';

      uiController.handleMapStopSelection('arrival', stopName);

      expect(uiController.selectedArrivalStop).toBe(stopName);
      expect(uiController.arrivalInput.value).toBe(stopName);
    });

    it('選択後に選択モードを終了する', () => {
      const stopName = '佐賀駅バスセンター';

      uiController.handleMapStopSelection('departure', stopName);

      expect(uiController.isMapSelectionActive).toBe(false);
      expect(mockMapController.setSelectionMode).toHaveBeenCalledWith('none');
    });

    it('検索ボタンの状態を更新する', () => {
      const stopName = '佐賀駅バスセンター';

      uiController.handleMapStopSelection('departure', stopName);

      // 乗車バス停のみ選択された状態では検索ボタンは無効
      expect(uiController.searchButton.disabled).toBe(true);

      // 降車バス停も選択
      uiController.startMapSelection('arrival');
      uiController.handleMapStopSelection('arrival', '佐賀大学');

      // 両方選択された状態では検索ボタンは有効
      expect(uiController.searchButton.disabled).toBe(false);
    });

    it('無効なバス停名の場合はエラーを表示する', () => {
      const stopName = '存在しないバス停';

      uiController.handleMapStopSelection('departure', stopName);

      expect(uiController.errorMessage.textContent).toContain('無効なバス停');
      expect(uiController.errorMessage.style.display).toBe('block');
    });
  });

  describe('buildRouteDataFromResult', () => {
    it('検索結果から経路データを構築する', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        viaStops: [
          { name: '県庁前', time: '08:05' }
        ],
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      };

      const routeData = uiController.buildRouteDataFromResult(result);

      expect(routeData).toBeDefined();
      expect(routeData.departureStop.name).toBe('佐賀駅バスセンター');
      expect(routeData.departureStop.lat).toBe(33.2649);
      expect(routeData.departureStop.lng).toBe(130.3008);
      expect(routeData.arrivalStop.name).toBe('佐賀大学');
      expect(routeData.viaStops).toHaveLength(1);
      expect(routeData.viaStops[0].name).toBe('県庁前');
      expect(routeData.routeCoordinates).toHaveLength(3);
    });

    it('乗車バス停が見つからない場合はnullを返す', () => {
      const result = {
        departureStop: '存在しないバス停',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        viaStops: []
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const routeData = uiController.buildRouteDataFromResult(result);

      expect(routeData).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('降車バス停が見つからない場合はnullを返す', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '存在しないバス停',
        departureTime: '08:00',
        arrivalTime: '08:15',
        viaStops: []
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const routeData = uiController.buildRouteDataFromResult(result);

      expect(routeData).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('経由バス停が見つからない場合は警告を出力する', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        viaStops: [
          { name: '存在しないバス停', time: '08:05' }
        ]
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const routeData = uiController.buildRouteDataFromResult(result);

      expect(routeData).toBeDefined();
      expect(routeData.viaStops).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('handleMapDisplayButtonClick', () => {
    it('経路データを構築してMapControllerに渡す', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        viaStops: [],
        routeName: '佐賀大学線',
        operator: '佐賀市営バス'
      };

      uiController.handleMapDisplayButtonClick(result);

      expect(mockMapController.displayRoute).toHaveBeenCalled();
    });

    it('MapControllerが初期化されていない場合はエラーを表示する', () => {
      delete window.mapController;

      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        viaStops: []
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      uiController.handleMapDisplayButtonClick(result);

      expect(consoleSpy).toHaveBeenCalled();
      expect(uiController.errorMessage.textContent).toContain('地図機能が利用できません');

      consoleSpy.mockRestore();
    });

    it('経路データの構築に失敗した場合はエラーを表示する', () => {
      const result = {
        departureStop: '存在しないバス停',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        viaStops: []
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      uiController.handleMapDisplayButtonClick(result);

      expect(consoleSpy).toHaveBeenCalled();
      expect(uiController.errorMessage.textContent).toContain('経路情報が不足しています');

      consoleSpy.mockRestore();
    });
  });

  describe('createResultItem - 地図表示ボタン', () => {
    it('検索結果に「地図で表示」ボタンが追加される', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        duration: 15,
        adultFare: 180,
        childFare: 90,
        operator: '佐賀市営バス',
        routeName: '佐賀大学線',
        viaStops: []
      };

      const resultItem = uiController.createResultItem(result);

      const mapButton = resultItem.querySelector('.map-display-button');
      expect(mapButton).toBeDefined();
      expect(mapButton.textContent).toBe('地図で表示');
    });

    it('「地図で表示」ボタンをクリックするとhandleMapDisplayButtonClickが呼ばれる', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        duration: 15,
        adultFare: 180,
        childFare: 90,
        operator: '佐賀市営バス',
        routeName: '佐賀大学線',
        viaStops: []
      };

      const handleSpy = vi.spyOn(uiController, 'handleMapDisplayButtonClick');

      const resultItem = uiController.createResultItem(result);
      const mapButton = resultItem.querySelector('.map-display-button');

      mapButton.click();

      expect(handleSpy).toHaveBeenCalledWith(result);

      handleSpy.mockRestore();
    });
  });
});
