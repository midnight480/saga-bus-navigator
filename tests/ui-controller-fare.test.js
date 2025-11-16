/**
 * UIController運賃表示機能の単体テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// UIControllerクラスをインポート
import '../js/app.js';

describe('UIController - 運賃表示機能', () => {
  let uiController;
  let mockBusStops;

  beforeEach(() => {
    // テスト用バス停データ
    mockBusStops = [
      { id: 'SAGA-001', name: '佐賀駅バスセンター', lat: 33.2649, lng: 130.3008 },
      { id: 'SAGA-002', name: '県庁前', lat: 33.2495, lng: 130.3005 },
      { id: 'SAGA-003', name: '佐賀大学', lat: 33.2400, lng: 130.2900 }
    ];

    // DOM要素をモック
    document.body.innerHTML = `
      <form id="search-form">
        <input id="departure-stop" />
        <input id="arrival-stop" />
        <ul id="departure-suggestions"></ul>
        <ul id="arrival-suggestions"></ul>
        <button id="search-button"></button>
        <div id="error-message"></div>
        <input type="radio" name="weekday-option" value="auto" checked />
        <input type="radio" name="time-option" value="now" checked />
        <div id="time-picker" style="display: none;">
          <input id="time-hour" type="number" />
          <input id="time-minute" type="number" />
        </div>
        <button id="map-select-departure">地図から選択</button>
        <button id="map-select-arrival">地図から選択</button>
      </form>
      <div id="results-container"></div>
      <button id="load-more"></button>
      <div id="loading"></div>
      <div id="map-container"></div>
    `;

    // UIControllerを初期化
    uiController = new window.UIController();
    uiController.initialize(mockBusStops);
  });

  describe('createResultItem - 運賃表示', () => {
    it('運賃情報が存在する場合は大人・小人運賃を表示する', () => {
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

      // 運賃情報が表示されているか確認
      const fareElement = resultItem.querySelector('.result-fare');
      expect(fareElement).toBeDefined();
      
      const fareValue = fareElement.querySelector('.result-detail-value');
      expect(fareValue).toBeDefined();
      expect(fareValue.textContent).toBe('大人 180円 / 小人 90円');
    });

    it('運賃情報が存在しない場合は「運賃情報なし」と表示する', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        duration: 15,
        adultFare: null,
        childFare: null,
        operator: '佐賀市営バス',
        routeName: '佐賀大学線',
        viaStops: []
      };

      const resultItem = uiController.createResultItem(result);

      // 運賃情報が表示されているか確認
      const fareElement = resultItem.querySelector('.result-fare');
      expect(fareElement).toBeDefined();
      
      const fareValue = fareElement.querySelector('.result-detail-value');
      expect(fareValue).toBeDefined();
      expect(fareValue.textContent).toBe('運賃情報なし');
    });

    it('大人運賃のみnullの場合は「運賃情報なし」と表示する', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        duration: 15,
        adultFare: null,
        childFare: 90,
        operator: '佐賀市営バス',
        routeName: '佐賀大学線',
        viaStops: []
      };

      const resultItem = uiController.createResultItem(result);

      const fareValue = resultItem.querySelector('.result-fare .result-detail-value');
      expect(fareValue.textContent).toBe('運賃情報なし');
    });

    it('小人運賃のみnullの場合は「運賃情報なし」と表示する', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        duration: 15,
        adultFare: 180,
        childFare: null,
        operator: '佐賀市営バス',
        routeName: '佐賀大学線',
        viaStops: []
      };

      const resultItem = uiController.createResultItem(result);

      const fareValue = resultItem.querySelector('.result-fare .result-detail-value');
      expect(fareValue.textContent).toBe('運賃情報なし');
    });

    it('運賃が0円の場合も正しく表示する', () => {
      const result = {
        departureStop: '佐賀駅バスセンター',
        arrivalStop: '佐賀大学',
        departureTime: '08:00',
        arrivalTime: '08:15',
        duration: 15,
        adultFare: 0,
        childFare: 0,
        operator: '佐賀市営バス',
        routeName: '佐賀大学線',
        viaStops: []
      };

      const resultItem = uiController.createResultItem(result);

      const fareValue = resultItem.querySelector('.result-fare .result-detail-value');
      expect(fareValue.textContent).toBe('大人 0円 / 小人 0円');
    });
  });

  describe('createResultItem - 運賃表示スタイル', () => {
    it('運賃要素に正しいCSSクラスが設定される', () => {
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

      // 運賃要素のクラスを確認
      const fareElement = resultItem.querySelector('.result-fare');
      expect(fareElement).toBeDefined();
      expect(fareElement.className).toBe('result-fare');

      // ラベルのクラスを確認
      const fareLabel = fareElement.querySelector('.result-detail-label');
      expect(fareLabel).toBeDefined();
      expect(fareLabel.className).toBe('result-detail-label');
      expect(fareLabel.textContent).toBe('運賃: ');

      // 値のクラスを確認
      const fareValue = fareElement.querySelector('.result-detail-value');
      expect(fareValue).toBeDefined();
      expect(fareValue.className).toBe('result-detail-value');
    });
  });

  describe('createResultItem - レイアウト確認', () => {
    it('運賃情報が詳細情報コンテナ内に配置される', () => {
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

      // 詳細情報コンテナを取得
      const detailsContainer = resultItem.querySelector('.result-details-container');
      expect(detailsContainer).toBeDefined();

      // 運賃要素が詳細情報コンテナ内に存在するか確認
      const fareElement = detailsContainer.querySelector('.result-fare');
      expect(fareElement).toBeDefined();
    });

    it('運賃情報が所要時間の後に配置される', () => {
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

      const detailsContainer = resultItem.querySelector('.result-details-container');
      const children = Array.from(detailsContainer.children);

      // 所要時間と運賃の順序を確認
      const durationIndex = children.findIndex(el => el.classList.contains('result-duration'));
      const fareIndex = children.findIndex(el => el.classList.contains('result-fare'));

      expect(durationIndex).toBeGreaterThanOrEqual(0);
      expect(fareIndex).toBeGreaterThan(durationIndex);
    });
  });
});
