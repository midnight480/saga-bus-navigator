/**
 * RealtimeVehicleControllerとAlertEnhancerの統合テスト
 * Feature: alert-enhancement
 * Task: 6.1 統合テスト実装
 * 
 * RealtimeVehicleControllerとAlertEnhancerの統合動作テスト
 * 実際のお知らせデータを使用したエンドツーエンドテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// 必要なモジュールを読み込み
const fs = await import('fs');
const path = await import('path');

// グローバルスコープの設定
global.window = global;

// fetchのモック
global.fetch = vi.fn();

// localStorageのモック
global.localStorage = {
  data: {},
  getItem: function(key) { return this.data[key] || null; },
  setItem: function(key, value) { this.data[key] = value; },
  removeItem: function(key) { delete this.data[key]; },
  clear: function() { this.data = {}; }
};

// URLParserを読み込み
const urlParserCode = fs.readFileSync(
  path.join(process.cwd(), 'js/url-parser.js'),
  'utf-8'
);
eval(urlParserCode);

// TranslationCacheを読み込み
const translationCacheCode = fs.readFileSync(
  path.join(process.cwd(), 'js/translation-cache.js'),
  'utf-8'
);
eval(translationCacheCode);

// TranslationServiceを読み込み
const translationServiceCode = fs.readFileSync(
  path.join(process.cwd(), 'js/translation-service.js'),
  'utf-8'
);
eval(translationServiceCode);

// AlertEnhancerを読み込み
const alertEnhancerCode = fs.readFileSync(
  path.join(process.cwd(), 'js/alert-enhancer.js'),
  'utf-8'
);
eval(alertEnhancerCode);

const URLParser = global.URLParser;
const TranslationCache = global.TranslationCache;
const TranslationService = global.TranslationService;
const AlertEnhancer = global.AlertEnhancer;

// MapControllerのモック
const createMapControllerMock = () => {
  return {
    createVehicleMarker: vi.fn(),
    updateVehicleMarkerPosition: vi.fn(),
    removeVehicleMarker: vi.fn(),
    vehicleMarkers: new Map()
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
      }
    ],
    stopTimes: [
      {
        trip_id: 'trip_123',
        stop_id: 'stop_001',
        stop_sequence: '1',
        arrival_time: '08:00:00',
        departure_time: '08:00:00'
      }
    ],
    routes: [
      {
        route_id: 'route_456',
        route_long_name: '佐賀駅～大和線'
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

// TripTimetableFormatterのモック
const createTripTimetableFormatterMock = () => {
  return {
    formatTimetableText: vi.fn((tripId) => `時刻表: ${tripId}`)
  };
};

// RealtimeVehicleControllerを読み込み
const realtimeVehicleControllerCode = fs.readFileSync(
  path.join(process.cwd(), 'js/realtime-vehicle-controller.js'),
  'utf-8'
);
eval(realtimeVehicleControllerCode);

const RealtimeVehicleController = global.RealtimeVehicleController;

describe('RealtimeVehicleController - AlertEnhancer統合テスト', () => {
  let controller;
  let mapControllerMock;
  let dataLoaderMock;
  let realtimeDataLoaderMock;
  let alertEnhancer;
  let translationService;

  beforeEach(() => {
    vi.clearAllMocks();
    global.localStorage.clear();

    // DOM要素をモック
    document.body.innerHTML = `
      <div class="map-section">
        <div id="map-container"></div>
      </div>
    `;

    // モックを作成
    mapControllerMock = createMapControllerMock();
    dataLoaderMock = createDataLoaderMock();
    realtimeDataLoaderMock = createRealtimeDataLoaderMock();

    // RealtimeVehicleControllerインスタンスを作成
    controller = new RealtimeVehicleController(
      mapControllerMock,
      dataLoaderMock,
      realtimeDataLoaderMock,
      createTripTimetableFormatterMock()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('setAlertEnhancer', () => {
    it('AlertEnhancerを正しく設定できる', () => {
      const languageManager = { getLanguage: () => 'ja' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });

      controller.setAlertEnhancer(alertEnhancer);

      expect(controller.alertEnhancer).toBe(alertEnhancer);
    });
  });

  describe('createAlertCard - URLハイパーリンク化', () => {
    beforeEach(async () => {
      await controller.initialize();
      
      const languageManager = { getLanguage: () => 'ja' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);
    });

    it('お知らせ内のURLがハイパーリンク化される', () => {
      const alert = {
        id: 'alert_1',
        headerText: '運休のお知らせ',
        descriptionText: '詳細は https://example.com をご確認ください。'
      };

      const card = controller.createAlertCard(alert, 'red');

      // 説明文を展開
      const titleContainer = card.querySelector('.alert-title-container');
      titleContainer.click();

      const description = card.querySelector('.alert-description');
      expect(description.innerHTML).toContain('<a href="https://example.com"');
      expect(description.innerHTML).toContain('target="_blank"');
      expect(description.innerHTML).toContain('rel="noopener noreferrer"');
    });

    it('複数のURLが全てハイパーリンク化される', () => {
      const alert = {
        id: 'alert_2',
        headerText: 'お知らせ',
        descriptionText: 'サイト1: https://example1.com サイト2: https://example2.com'
      };

      const card = controller.createAlertCard(alert, 'yellow');

      // 説明文を展開
      const titleContainer = card.querySelector('.alert-title-container');
      titleContainer.click();

      const description = card.querySelector('.alert-description');
      const links = description.querySelectorAll('a');
      expect(links.length).toBe(2);
    });

    it('URLがない場合はテキストがそのまま表示される', () => {
      const alert = {
        id: 'alert_3',
        headerText: '運休のお知らせ',
        descriptionText: '本日は運休します。'
      };

      const card = controller.createAlertCard(alert, 'red');

      // 説明文を展開
      const titleContainer = card.querySelector('.alert-title-container');
      titleContainer.click();

      const description = card.querySelector('.alert-description');
      expect(description.innerHTML).toBe('本日は運休します。');
    });
  });

  describe('createAlertCard - 翻訳機能', () => {
    it('日本語設定の場合は翻訳が行われない', async () => {
      await controller.initialize();
      
      const languageManager = { getLanguage: () => 'ja' };
      translationService = new TranslationService({
        apiEndpoint: 'https://api.example.com/translate'
      });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);

      const alert = {
        id: 'alert_4',
        headerText: '運休のお知らせ',
        descriptionText: '本日は運休します。'
      };

      const card = controller.createAlertCard(alert, 'red');

      // 翻訳APIが呼ばれないことを確認
      expect(global.fetch).not.toHaveBeenCalled();

      // 日本語テキストが表示される
      const header = card.querySelector('.alert-header');
      expect(header.textContent).toBe('運休のお知らせ');
    });

    it('英語設定で翻訳が設定されていない場合は日本語が表示される', async () => {
      await controller.initialize();
      
      const languageManager = { getLanguage: () => 'en' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);

      const alert = {
        id: 'alert_5',
        headerText: '運休のお知らせ',
        descriptionText: '本日は運休します。'
      };

      const card = controller.createAlertCard(alert, 'red');

      // 日本語テキストが表示される
      const header = card.querySelector('.alert-header');
      expect(header.textContent).toBe('運休のお知らせ');
    });

    it('英語設定で翻訳が設定されている場合は非同期翻訳が開始される', async () => {
      await controller.initialize();
      
      const languageManager = { getLanguage: () => 'en' };
      translationService = new TranslationService({
        apiEndpoint: 'https://api.example.com/translate'
      });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);

      // 翻訳APIをモック
      global.fetch.mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ translatedText: 'Service Suspension Notice' })
        });
      });

      const alert = {
        id: 'alert_6',
        headerText: '運休のお知らせ',
        descriptionText: '本日は運休します。'
      };

      const card = controller.createAlertCard(alert, 'red');

      // ローディング状態が設定される
      expect(card.classList.contains('alert-card-loading')).toBe(true);

      // 非同期処理の完了を待つ
      await new Promise(resolve => setTimeout(resolve, 100));

      // 翻訳APIが呼ばれることを確認
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('onLanguageChange', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    it('言語変更時にキャッシュがクリアされる', () => {
      const languageManager = { getLanguage: () => 'ja' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);

      // キャッシュにデータを追加
      controller.enhancedAlertsCache.set('alert_1', { id: 'alert_1' });
      expect(controller.enhancedAlertsCache.size).toBe(1);

      // 言語変更
      controller.onLanguageChange();

      // キャッシュがクリアされる
      expect(controller.enhancedAlertsCache.size).toBe(0);
    });

    it('言語変更時にAlertEnhancerに通知される', () => {
      const languageManager = { getLanguage: () => 'en' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);

      const onLanguageChangeSpy = vi.spyOn(alertEnhancer, 'onLanguageChange');

      controller.onLanguageChange();

      expect(onLanguageChangeSpy).toHaveBeenCalledWith('en');
    });
  });

  describe('displayAlerts - AlertEnhancer統合', () => {
    beforeEach(async () => {
      await controller.initialize();
      
      const languageManager = { getLanguage: () => 'ja' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);
    });

    it('運休情報と遅延情報が正しく表示される', () => {
      const cancellations = [
        {
          id: 'cancel_1',
          headerText: '運休のお知らせ',
          descriptionText: '詳細は https://example.com をご確認ください。'
        }
      ];

      const delays = [
        {
          id: 'delay_1',
          headerText: '遅延のお知らせ',
          descriptionText: '約10分の遅延が発生しています。'
        }
      ];

      controller.displayAlerts(cancellations, delays);

      // 運休情報セクションが表示される
      const cancellationSection = controller.alertsContainer.querySelector('.alert-section-cancellation');
      expect(cancellationSection).toBeTruthy();

      // 遅延情報セクションが表示される
      const delaySection = controller.alertsContainer.querySelector('.alert-section-delay');
      expect(delaySection).toBeTruthy();

      // URLがハイパーリンク化されている
      const cancellationCard = cancellationSection.querySelector('.alert-card');
      const titleContainer = cancellationCard.querySelector('.alert-title-container');
      titleContainer.click();
      
      const description = cancellationCard.querySelector('.alert-description');
      expect(description.innerHTML).toContain('<a href="https://example.com"');
    });
  });

  describe('handleAlertsUpdate - AlertEnhancer統合', () => {
    beforeEach(async () => {
      await controller.initialize();
      
      const languageManager = { getLanguage: () => 'ja' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);
    });

    it('お知らせ更新時にAlertEnhancerが適用される', () => {
      const alerts = [
        {
          id: 'alert_1',
          headerText: 'お知らせ',
          descriptionText: '詳細は https://example.com をご確認ください。'
        }
      ];

      controller.handleAlertsUpdate(alerts);

      // お知らせが表示される
      expect(controller.alertsContainer.style.display).toBe('block');

      // URLがハイパーリンク化されている
      const alertCard = controller.alertsContainer.querySelector('.alert-card');
      const titleContainer = alertCard.querySelector('.alert-title-container');
      titleContainer.click();
      
      const description = alertCard.querySelector('.alert-description');
      expect(description.innerHTML).toContain('<a href="https://example.com"');
    });
  });

  describe('実際のお知らせデータを使用したテスト', () => {
    beforeEach(async () => {
      await controller.initialize();
      
      const languageManager = { getLanguage: () => 'ja' };
      translationService = new TranslationService({ apiEndpoint: null });
      alertEnhancer = new AlertEnhancer({
        translationService,
        languageManager
      });
      controller.setAlertEnhancer(alertEnhancer);
    });

    it('佐賀バスの実際のお知らせ形式を処理できる', () => {
      // 実際のGTFS-RTアラート形式に近いデータ
      const alerts = [
        {
          id: '1',
          headerText: '【重要】年末年始の運行について',
          descriptionText: '12月31日～1月3日は特別ダイヤで運行します。詳細は https://www.sagabus.info/schedule をご確認ください。',
          activeStart: Math.floor(Date.now() / 1000) - 3600,
          activeEnd: Math.floor(Date.now() / 1000) + 86400
        },
        {
          id: '2',
          headerText: '運休のお知らせ',
          descriptionText: '佐賀駅～大和線は道路工事のため本日運休します。',
          activeStart: Math.floor(Date.now() / 1000) - 3600,
          activeEnd: Math.floor(Date.now() / 1000) + 86400
        }
      ];

      controller.handleAlertsUpdate(alerts);

      // 運休情報と遅延情報が正しく分類される
      const cancellationSection = controller.alertsContainer.querySelector('.alert-section-cancellation');
      const delaySection = controller.alertsContainer.querySelector('.alert-section-delay');

      expect(cancellationSection).toBeTruthy();
      expect(delaySection).toBeTruthy();

      // 運休情報に「運休」を含むお知らせが表示される
      const cancellationCards = cancellationSection.querySelectorAll('.alert-card');
      expect(cancellationCards.length).toBe(1);

      // 遅延情報（その他のお知らせ）が表示される
      const delayCards = delaySection.querySelectorAll('.alert-card');
      expect(delayCards.length).toBe(1);

      // URLがハイパーリンク化されている
      const delayCard = delayCards[0];
      const titleContainer = delayCard.querySelector('.alert-title-container');
      titleContainer.click();
      
      const description = delayCard.querySelector('.alert-description');
      expect(description.innerHTML).toContain('<a href="https://www.sagabus.info/schedule"');
    });

    it('有効期間外のお知らせがフィルタリングされる', () => {
      const now = Math.floor(Date.now() / 1000);
      
      const alerts = [
        {
          id: '1',
          headerText: '有効なお知らせ',
          descriptionText: 'このお知らせは有効期間内です。',
          activeStart: now - 3600,
          activeEnd: now + 3600
        },
        {
          id: '2',
          headerText: '期限切れのお知らせ',
          descriptionText: 'このお知らせは期限切れです。',
          activeStart: now - 7200,
          activeEnd: now - 3600
        }
      ];

      controller.handleAlertsUpdate(alerts);

      // 有効なお知らせのみ表示される
      const alertCards = controller.alertsContainer.querySelectorAll('.alert-card');
      expect(alertCards.length).toBe(1);
    });
  });
});
