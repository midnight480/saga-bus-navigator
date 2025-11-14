/**
 * セキュリティ対策のテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

describe('セキュリティ対策', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // DOMを初期化
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <input id="departure-stop" type="text">
          <input id="arrival-stop" type="text">
          <ul id="departure-suggestions"></ul>
          <ul id="arrival-suggestions"></ul>
          <button id="search-button"></button>
          <div id="error-message"></div>
          <div id="loading"></div>
          <div id="results-container"></div>
          <button id="load-more"></button>
          <input type="radio" name="time-option" value="now" checked>
          <div id="time-picker"></div>
          <input id="time-hour" type="number">
          <input id="time-minute" type="number">
        </body>
      </html>
    `);
    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
  });

  describe('バス停名の入力検証', () => {
    it('有効なバス停名を受け入れる', async () => {
      // UIControllerをロード
      await import('../js/app.js');
      const UIController = window.UIController;
      
      const busStops = [
        { name: '佐賀駅バスセンター', lat: 33.2649, lng: 130.3008 },
        { name: '県庁前', lat: 33.2500, lng: 130.3000 }
      ];
      
      const uiController = new UIController();
      uiController.busStops = busStops;
      
      // 有効なバス停名
      expect(uiController.validateBusStopName('佐賀駅バスセンター')).toBe(true);
      expect(uiController.validateBusStopName('県庁前')).toBe(true);
    });

    it('無効なバス停名を拒否する', async () => {
      await import('../js/app.js');
      const UIController = window.UIController;
      
      const busStops = [
        { name: '佐賀駅バスセンター', lat: 33.2649, lng: 130.3008 },
        { name: '県庁前', lat: 33.2500, lng: 130.3000 }
      ];
      
      const uiController = new UIController();
      uiController.busStops = busStops;
      
      // 無効なバス停名
      expect(uiController.validateBusStopName('存在しないバス停')).toBe(false);
      expect(uiController.validateBusStopName('')).toBe(false);
      expect(uiController.validateBusStopName('<script>alert("XSS")</script>')).toBe(false);
    });
  });

  describe('時刻の入力検証', () => {
    it('有効な時刻を受け入れる', async () => {
      await import('../js/app.js');
      const UIController = window.UIController;
      
      const uiController = new UIController();
      
      // 有効な時刻
      expect(uiController.validateTime(0, 0)).toBe(true);
      expect(uiController.validateTime(12, 30)).toBe(true);
      expect(uiController.validateTime(23, 59)).toBe(true);
    });

    it('無効な時刻を拒否する', async () => {
      await import('../js/app.js');
      const UIController = window.UIController;
      
      const uiController = new UIController();
      
      // 無効な時刻
      expect(uiController.validateTime(-1, 0)).toBe(false);
      expect(uiController.validateTime(24, 0)).toBe(false);
      expect(uiController.validateTime(12, -1)).toBe(false);
      expect(uiController.validateTime(12, 60)).toBe(false);
      expect(uiController.validateTime(NaN, 30)).toBe(false);
      expect(uiController.validateTime(12, NaN)).toBe(false);
      expect(uiController.validateTime('12', '30')).toBe(false);
    });
  });

  describe('DOM操作のセキュリティ', () => {
    it('textContentを使用してXSSを防ぐ', async () => {
      await import('../js/app.js');
      const UIController = window.UIController;
      
      const uiController = new UIController();
      
      // エラーメッセージにスクリプトタグを含む文字列を設定
      const maliciousMessage = '<script>alert("XSS")</script>';
      uiController.errorMessage = document.getElementById('error-message');
      uiController.displayError(maliciousMessage);
      
      // textContentで設定されているため、スクリプトは実行されない
      expect(uiController.errorMessage.textContent).toBe(maliciousMessage);
      expect(uiController.errorMessage.innerHTML).not.toContain('<script>');
    });

    it('createElementを使用して安全にDOM要素を作成する', async () => {
      await import('../js/app.js');
      const UIController = window.UIController;
      
      const uiController = new UIController();
      uiController.busStops = [
        { name: '<script>alert("XSS")</script>', lat: 33.2649, lng: 130.3008 }
      ];
      
      const suggestionsElement = document.getElementById('departure-suggestions');
      
      // 候補リストを表示
      uiController.displaySuggestions(uiController.busStops, suggestionsElement);
      
      // createElementとtextContentで作成されているため、スクリプトは実行されない
      const firstItem = suggestionsElement.querySelector('.suggestion-item');
      expect(firstItem.textContent).toBe('<script>alert("XSS")</script>');
      expect(firstItem.innerHTML).not.toContain('<script>');
    });
  });

  describe('入力のサニタイゼーション', () => {
    it('バス停選択時に無効な入力を拒否する', async () => {
      await import('../js/app.js');
      const UIController = window.UIController;
      
      const busStops = [
        { name: '佐賀駅バスセンター', lat: 33.2649, lng: 130.3008 }
      ];
      
      const uiController = new UIController();
      uiController.busStops = busStops;
      uiController.errorMessage = document.getElementById('error-message');
      
      // 無効なバス停名を選択しようとする
      uiController.selectBusStop('<script>alert("XSS")</script>', 'departure');
      
      // 選択されない
      expect(uiController.selectedDepartureStop).toBeNull();
      
      // エラーメッセージが表示される
      expect(uiController.errorMessage.style.display).toBe('block');
    });
  });
});
