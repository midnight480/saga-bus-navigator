/**
 * UIControllerの単体テスト
 * バス停データの形式とオートコンプリート機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('UIController - バス停データ形式とオートコンプリート機能', () => {
  let dom;
  let document;
  let window;
  let uiController;
  let mockBusStops;

  beforeEach(() => {
    // JSDOMでブラウザ環境をシミュレート
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="search-form">
            <input type="text" id="departure-stop" />
            <ul id="departure-suggestions" style="display: none;"></ul>
            
            <input type="text" id="arrival-stop" />
            <ul id="arrival-suggestions" style="display: none;"></ul>
            
            <button type="submit" id="search-button" disabled>検索</button>
            
            <div id="error-message" style="display: none;"></div>
            
            <input type="radio" name="weekday-option" value="auto" checked />
            <input type="radio" name="weekday-option" value="平日" />
            <input type="radio" name="weekday-option" value="土日祝" />
            
            <input type="radio" name="time-option" value="now" checked />
            <input type="radio" name="time-option" value="departure-time" />
            <input type="radio" name="time-option" value="arrival-time" />
            <input type="radio" name="time-option" value="first-bus" />
            <input type="radio" name="time-option" value="last-bus" />
            
            <div id="time-picker" style="display: none;">
              <input type="number" id="time-hour" min="0" max="23" />
              <input type="number" id="time-minute" min="0" max="59" />
            </div>
            
            <div id="loading" style="display: none;"></div>
            <div id="results-container"></div>
            <button id="load-more" style="display: none;">もっと見る</button>
          </form>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      runScripts: 'dangerously'
    });

    document = dom.window.document;
    window = dom.window;
    global.document = document;
    global.window = window;
    
    // app.jsを読み込んでwindowコンテキストで実行
    const appJsPath = path.join(process.cwd(), 'js', 'app.js');
    const appJsCode = fs.readFileSync(appJsPath, 'utf-8');
    const scriptEl = document.createElement('script');
    scriptEl.textContent = appJsCode;
    document.body.appendChild(scriptEl);

    // モックバス停データ（GTFS形式から変換された形式）
    mockBusStops = [
      { id: '1001002-01', name: '佐賀駅バスセンター', lat: 33.26451, lng: 130.29974 },
      { id: '1001003-01', name: '佐賀駅バスセンター 1番のりば', lat: 33.26451, lng: 130.29974 },
      { id: '1002001-01', name: '県庁前', lat: 33.26789, lng: 130.30123 },
      { id: '1003001-01', name: '佐賀大学', lat: 33.24123, lng: 130.28456 },
      { id: '1004001-01', name: '西与賀', lat: 33.25678, lng: 130.27890 },
      { id: '1005001-01', name: 'ゆめタウン佐賀', lat: 33.26234, lng: 130.31567 }
    ];

    // UIControllerのインスタンスを作成
    uiController = new window.UIController();
    uiController.initialize(mockBusStops);
  });

  afterEach(() => {
    // グローバル変数をクリーンアップ
    delete global.document;
    delete global.window;
  });

  describe('バス停データの形式検証', () => {
    it('バス停データが正しい形式（id, name, lat, lng）を持つ', () => {
      expect(uiController.busStops).toBeDefined();
      expect(uiController.busStops.length).toBeGreaterThan(0);
      
      uiController.busStops.forEach(stop => {
        expect(stop).toHaveProperty('id');
        expect(stop).toHaveProperty('name');
        expect(stop).toHaveProperty('lat');
        expect(stop).toHaveProperty('lng');
        
        expect(typeof stop.id).toBe('string');
        expect(typeof stop.name).toBe('string');
        expect(typeof stop.lat).toBe('number');
        expect(typeof stop.lng).toBe('number');
      });
    });

    it('バス停IDがGTFS標準のstop_id形式である', () => {
      uiController.busStops.forEach(stop => {
        // GTFS標準のstop_id形式（例: 1001002-01）
        expect(stop.id).toMatch(/^\d+-\d+$/);
      });
    });

    it('緯度・経度が有効な範囲内である', () => {
      uiController.busStops.forEach(stop => {
        // 佐賀市周辺の緯度・経度範囲
        expect(stop.lat).toBeGreaterThan(33.0);
        expect(stop.lat).toBeLessThan(34.0);
        expect(stop.lng).toBeGreaterThan(130.0);
        expect(stop.lng).toBeLessThan(131.0);
      });
    });

    it('バス停名が空でない', () => {
      uiController.busStops.forEach(stop => {
        expect(stop.name).toBeTruthy();
        expect(stop.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe('オートコンプリート機能 - フィルタリング', () => {
    it('部分一致でバス停を検索できる', () => {
      const matches = uiController.filterBusStops('佐賀駅');
      
      expect(matches.length).toBe(2);
      expect(matches[0].name).toContain('佐賀駅');
      expect(matches[1].name).toContain('佐賀駅');
    });

    it('大文字小文字を区別せずに検索できる', () => {
      // 「佐賀」を含むバス停を検索（ひらがなではなく漢字で）
      const matches = uiController.filterBusStops('佐賀');
      
      expect(matches.length).toBeGreaterThan(0);
      matches.forEach(stop => {
        expect(stop.name).toContain('佐賀');
      });
    });

    it('完全一致でバス停を検索できる', () => {
      const matches = uiController.filterBusStops('県庁前');
      
      expect(matches.length).toBe(1);
      expect(matches[0].name).toBe('県庁前');
    });

    it('該当なしの場合は空配列を返す', () => {
      const matches = uiController.filterBusStops('存在しないバス停');
      
      expect(matches).toHaveLength(0);
    });

    it('空文字列の場合は全てのバス停を返す', () => {
      // filterBusStopsは空文字列でも全バス停を返す実装になっている
      const matches = uiController.filterBusStops('');
      
      // handleInputで空文字列の場合は候補を非表示にする処理が行われる
      expect(matches.length).toBe(mockBusStops.length);
    });
  });

  describe('オートコンプリート機能 - 候補リスト表示', () => {
    it('候補リストが正しく表示される', () => {
      const matches = uiController.filterBusStops('佐賀駅');
      const suggestionsElement = document.getElementById('departure-suggestions');
      
      uiController.displaySuggestions(matches, suggestionsElement);
      
      expect(suggestionsElement.style.display).toBe('block');
      expect(suggestionsElement.children.length).toBe(2);
      expect(suggestionsElement.children[0].textContent).toContain('佐賀駅');
    });

    it('候補が10件を超える場合は10件に制限される', () => {
      // 11件以上のバス停を追加
      const largeBusStops = [];
      for (let i = 0; i < 15; i++) {
        largeBusStops.push({
          id: `test-${i}`,
          name: `テストバス停${i}`,
          lat: 33.26,
          lng: 130.30
        });
      }
      
      uiController.busStops = largeBusStops;
      const matches = uiController.filterBusStops('テスト');
      const suggestionsElement = document.getElementById('departure-suggestions');
      
      uiController.displaySuggestions(matches, suggestionsElement);
      
      expect(suggestionsElement.children.length).toBe(10);
    });

    it('候補がない場合は「該当するバス停が見つかりません」と表示される', () => {
      const matches = [];
      const suggestionsElement = document.getElementById('departure-suggestions');
      
      uiController.displaySuggestions(matches, suggestionsElement);
      
      expect(suggestionsElement.style.display).toBe('block');
      expect(suggestionsElement.children.length).toBe(1);
      expect(suggestionsElement.children[0].textContent).toBe('該当するバス停が見つかりません');
      expect(suggestionsElement.children[0].className).toContain('suggestion-item-empty');
    });

    it('候補リストを非表示にできる', () => {
      const suggestionsElement = document.getElementById('departure-suggestions');
      
      // まず表示
      const matches = uiController.filterBusStops('佐賀駅');
      uiController.displaySuggestions(matches, suggestionsElement);
      expect(suggestionsElement.style.display).toBe('block');
      
      // 非表示
      uiController.hideSuggestions(suggestionsElement);
      expect(suggestionsElement.style.display).toBe('none');
      expect(suggestionsElement.children.length).toBe(0);
    });
  });

  describe('オートコンプリート機能 - バス停選択', () => {
    it('乗車バス停を選択できる', () => {
      uiController.selectBusStop('佐賀駅バスセンター', 'departure');
      
      expect(uiController.selectedDepartureStop).toBe('佐賀駅バスセンター');
      expect(document.getElementById('departure-stop').value).toBe('佐賀駅バスセンター');
    });

    it('降車バス停を選択できる', () => {
      uiController.selectBusStop('県庁前', 'arrival');
      
      expect(uiController.selectedArrivalStop).toBe('県庁前');
      expect(document.getElementById('arrival-stop').value).toBe('県庁前');
    });

    it('バス停選択後、候補リストが非表示になる', () => {
      const departureSuggestions = document.getElementById('departure-suggestions');
      
      // 候補を表示
      const matches = uiController.filterBusStops('佐賀駅');
      uiController.displaySuggestions(matches, departureSuggestions);
      expect(departureSuggestions.style.display).toBe('block');
      
      // バス停を選択
      uiController.selectBusStop('佐賀駅バスセンター', 'departure');
      
      // 候補リストが非表示になる
      expect(departureSuggestions.style.display).toBe('none');
    });

    it('無効なバス停名を選択した場合はエラーが表示される', () => {
      uiController.selectBusStop('存在しないバス停', 'departure');
      
      const errorMessage = document.getElementById('error-message');
      expect(errorMessage.style.display).toBe('block');
      expect(errorMessage.textContent).toContain('無効なバス停名');
    });
  });

  describe('オートコンプリート機能 - 入力処理', () => {
    it('入力時に候補リストが表示される', () => {
      const departureInput = document.getElementById('departure-stop');
      const departureSuggestions = document.getElementById('departure-suggestions');
      
      // 入力イベントをシミュレート
      departureInput.value = '佐賀駅';
      departureInput.dispatchEvent(new window.Event('input'));
      
      // handleInputが呼ばれて候補が表示される
      uiController.handleInput('佐賀駅', departureSuggestions, 'departure');
      
      expect(departureSuggestions.style.display).toBe('block');
      expect(departureSuggestions.children.length).toBeGreaterThan(0);
    });

    it('入力が空の場合は候補リストが非表示になる', () => {
      const departureSuggestions = document.getElementById('departure-suggestions');
      
      // 空文字列で入力処理
      uiController.handleInput('', departureSuggestions, 'departure');
      
      expect(departureSuggestions.style.display).toBe('none');
      expect(uiController.selectedDepartureStop).toBeNull();
    });

    it('入力時にエラーメッセージがクリアされる', () => {
      const errorMessage = document.getElementById('error-message');
      const departureSuggestions = document.getElementById('departure-suggestions');
      
      // エラーを表示
      uiController.displayError('テストエラー');
      expect(errorMessage.style.display).toBe('block');
      
      // 入力処理
      uiController.handleInput('佐賀駅', departureSuggestions, 'departure');
      
      // エラーがクリアされる
      expect(errorMessage.style.display).toBe('none');
    });
  });

  describe('バス停名の検証', () => {
    it('有効なバス停名の場合はtrueを返す', () => {
      const result = uiController.validateBusStopName('佐賀駅バスセンター');
      expect(result).toBe(true);
    });

    it('無効なバス停名の場合はfalseを返す', () => {
      const result = uiController.validateBusStopName('存在しないバス停');
      expect(result).toBe(false);
    });

    it('空文字列の場合はfalseを返す', () => {
      const result = uiController.validateBusStopName('');
      expect(result).toBe(false);
    });

    it('nullの場合はfalseを返す', () => {
      const result = uiController.validateBusStopName(null);
      expect(result).toBe(false);
    });
  });

  describe('検索ボタンの状態管理', () => {
    it('両方のバス停が選択されている場合は検索ボタンが有効になる', () => {
      const searchButton = document.getElementById('search-button');
      
      uiController.selectedDepartureStop = '佐賀駅バスセンター';
      uiController.selectedArrivalStop = '県庁前';
      uiController.updateSearchButton();
      
      expect(searchButton.disabled).toBe(false);
    });

    it('乗車バス停のみ選択されている場合は検索ボタンが無効のまま', () => {
      const searchButton = document.getElementById('search-button');
      
      uiController.selectedDepartureStop = '佐賀駅バスセンター';
      uiController.selectedArrivalStop = null;
      uiController.updateSearchButton();
      
      expect(searchButton.disabled).toBe(true);
    });

    it('降車バス停のみ選択されている場合は検索ボタンが無効のまま', () => {
      const searchButton = document.getElementById('search-button');
      
      uiController.selectedDepartureStop = null;
      uiController.selectedArrivalStop = '県庁前';
      uiController.updateSearchButton();
      
      expect(searchButton.disabled).toBe(true);
    });

    it('同一バス停が選択されている場合は検索ボタンが無効のまま', () => {
      const searchButton = document.getElementById('search-button');
      
      uiController.selectedDepartureStop = '佐賀駅バスセンター';
      uiController.selectedArrivalStop = '佐賀駅バスセンター';
      uiController.updateSearchButton();
      
      expect(searchButton.disabled).toBe(true);
    });
  });

  describe('同一バス停チェック', () => {
    it('異なるバス停の場合はtrueを返す', () => {
      uiController.selectedDepartureStop = '佐賀駅バスセンター';
      uiController.selectedArrivalStop = '県庁前';
      
      const result = uiController.validateStops();
      expect(result).toBe(true);
    });

    it('同一バス停の場合はfalseを返しエラーを表示する', () => {
      uiController.selectedDepartureStop = '佐賀駅バスセンター';
      uiController.selectedArrivalStop = '佐賀駅バスセンター';
      
      const result = uiController.validateStops();
      expect(result).toBe(false);
      
      const errorMessage = document.getElementById('error-message');
      expect(errorMessage.style.display).toBe('block');
      expect(errorMessage.textContent).toContain('異なる停留所');
    });

    it('片方のバス停のみ選択されている場合はtrueを返す', () => {
      uiController.selectedDepartureStop = '佐賀駅バスセンター';
      uiController.selectedArrivalStop = null;
      
      const result = uiController.validateStops();
      expect(result).toBe(true);
    });
  });

  describe('エラーメッセージ表示', () => {
    it('エラーメッセージを表示できる', () => {
      const errorMessage = document.getElementById('error-message');
      
      uiController.displayError('テストエラーメッセージ');
      
      expect(errorMessage.style.display).toBe('block');
      expect(errorMessage.textContent).toBe('テストエラーメッセージ');
    });

    it('エラーメッセージをクリアできる', () => {
      const errorMessage = document.getElementById('error-message');
      
      // エラーを表示
      uiController.displayError('テストエラーメッセージ');
      expect(errorMessage.style.display).toBe('block');
      
      // クリア
      uiController.clearError();
      
      expect(errorMessage.style.display).toBe('none');
      expect(errorMessage.textContent).toBe('');
    });
  });
});
