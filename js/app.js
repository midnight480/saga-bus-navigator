/**
 * 佐賀バスナビ - メインアプリケーション
 * SearchController: 検索ロジックの実行
 * UIController: ユーザーインターフェースの制御
 */

/**
 * SearchController - 検索コントローラー
 * 直通便の検索、フィルタリング、ソートを担当
 */
class SearchController {
  constructor(timetable, fares, fareCalculator = null, busStops = [], trips = []) {
    this.timetable = timetable;
    this.fares = fares;
    this.fareCalculator = fareCalculator;
    this.busStops = busStops;
    this.trips = trips;
    
    // tripIdでグループ化したインデックスを作成（検索最適化）
    this.tripIndex = this.createTripIndex();
    
    // バス停名からstop_idへのマッピングを作成
    this.stopNameToIdMap = this.createStopNameToIdMap(busStops);
    
    // tripIdからroute_idへのマッピングを作成
    this.tripToRouteMap = this.createTripToRouteMap(trips);
  }
  
  /**
   * バス停名からstop_idへのマッピングを作成
   */
  createStopNameToIdMap(busStops) {
    const map = {};
    busStops.forEach(stop => {
      map[stop.name] = stop.id;
    });
    return map;
  }
  
  /**
   * tripIdからroute_idへのマッピングを作成
   */
  createTripToRouteMap(trips) {
    const map = {};
    trips.forEach(trip => {
      map[trip.trip_id] = trip.route_id;
    });
    return map;
  }

  /**
   * tripIdでグループ化したインデックスを作成
   */
  createTripIndex() {
    const index = {};
    
    this.timetable.forEach(entry => {
      if (!index[entry.tripId]) {
        index[entry.tripId] = [];
      }
      index[entry.tripId].push(entry);
    });
    
    // 各tripの停車順にソート
    Object.keys(index).forEach(tripId => {
      index[tripId].sort((a, b) => a.stopSequence - b.stopSequence);
    });
    
    return index;
  }

  /**
   * 直通便を検索
   * @param {string} departureStop - 乗車バス停名
   * @param {string} arrivalStop - 降車バス停名
   * @param {object} searchCriteria - 検索条件 { type, hour, minute }
   * @param {string} weekdayType - 曜日区分（平日 or 土日祝）
   * @returns {Array} 検索結果の配列
   */
  searchDirectTrips(departureStop, arrivalStop, searchCriteria, weekdayType) {
    const results = [];
    
    // 各tripを検索
    Object.keys(this.tripIndex).forEach(tripId => {
      const stops = this.tripIndex[tripId];
      
      // 曜日区分でフィルタ
      if (stops[0].weekdayType !== weekdayType) {
        return;
      }
      
      // 乗車バス停と降車バス停のインデックスを検索
      const departureIndex = stops.findIndex(s => s.stopName === departureStop);
      const arrivalIndex = stops.findIndex(s => s.stopName === arrivalStop);
      
      // 直通便チェック: 乗車バス停が降車バス停より前に出現
      if (departureIndex === -1 || arrivalIndex === -1 || departureIndex >= arrivalIndex) {
        return;
      }
      
      const departureEntry = stops[departureIndex];
      const arrivalEntry = stops[arrivalIndex];
      
      // 時刻フィルタリング
      if (!this.matchesTimeFilter(departureEntry, arrivalEntry, searchCriteria)) {
        return;
      }
      
      // 所要時間を計算
      const duration = this.calculateTravelTime(
        departureEntry.hour,
        departureEntry.minute,
        arrivalEntry.hour,
        arrivalEntry.minute
      );
      
      // 運賃を取得（tripIdを渡してFareCalculatorを使用）
      const fare = this.getFare(departureStop, arrivalStop, departureEntry.operator, tripId);
      
      // 経由バス停を取得（乗車バス停と降車バス停の間）
      const viaStops = stops
        .slice(departureIndex + 1, arrivalIndex)
        .map(stop => ({
          name: stop.stopName,
          time: this.formatTime(stop.hour, stop.minute)
        }));
      
      // 結果に追加
      results.push({
        tripId: tripId,
        routeNumber: departureEntry.routeNumber,
        routeName: departureEntry.routeName,
        operator: departureEntry.operator,
        departureStop: departureStop,
        arrivalStop: arrivalStop,
        departureTime: this.formatTime(departureEntry.hour, departureEntry.minute),
        arrivalTime: this.formatTime(arrivalEntry.hour, arrivalEntry.minute),
        departureHour: departureEntry.hour,
        departureMinute: departureEntry.minute,
        arrivalHour: arrivalEntry.hour,
        arrivalMinute: arrivalEntry.minute,
        duration: duration,
        adultFare: fare.adultFare,
        childFare: fare.childFare,
        weekdayType: weekdayType,
        viaStops: viaStops
      });
    });
    
    // ソート
    this.sortResults(results, searchCriteria.type);
    
    // 最大20件に制限
    return results.slice(0, 20);
  }

  /**
   * 時刻フィルタリング
   */
  matchesTimeFilter(departureEntry, arrivalEntry, searchCriteria) {
    const { type, hour, minute } = searchCriteria;
    
    switch (type) {
      case 'departure-time':
      case 'now':
        // 出発時刻が指定時刻以降
        return this.isTimeAfterOrEqual(
          departureEntry.hour,
          departureEntry.minute,
          hour,
          minute
        );
      
      case 'arrival-time':
        // 到着時刻が指定時刻以前
        return this.isTimeBeforeOrEqual(
          arrivalEntry.hour,
          arrivalEntry.minute,
          hour,
          minute
        );
      
      case 'first-bus':
      case 'last-bus':
        // 始発・終電は全ての便を対象にして、後でソート
        return true;
      
      default:
        return true;
    }
  }

  /**
   * 時刻比較: time1 >= time2
   */
  isTimeAfterOrEqual(hour1, minute1, hour2, minute2) {
    if (hour1 > hour2) return true;
    if (hour1 < hour2) return false;
    return minute1 >= minute2;
  }

  /**
   * 時刻比較: time1 <= time2
   */
  isTimeBeforeOrEqual(hour1, minute1, hour2, minute2) {
    if (hour1 < hour2) return true;
    if (hour1 > hour2) return false;
    return minute1 <= minute2;
  }

  /**
   * 所要時間を計算（分単位）
   */
  calculateTravelTime(startHour, startMinute, endHour, endMinute) {
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    let duration = endMinutes - startMinutes;
    
    // 日をまたぐ場合（深夜便）
    if (duration < 0) {
      duration += 24 * 60;
    }
    
    return duration;
  }

  /**
   * 運賃を取得
   * FareCalculatorを優先的に使用し、見つからない場合は既存のfares配列にフォールバック
   */
  getFare(departureStop, arrivalStop, operator, tripId = null) {
    // FareCalculatorが利用可能な場合は優先的に使用
    if (this.fareCalculator && tripId) {
      // バス停名からstop_idを取得
      const departureStopId = this.stopNameToIdMap[departureStop];
      const arrivalStopId = this.stopNameToIdMap[arrivalStop];
      
      // tripIdからroute_idを取得
      const routeId = this.tripToRouteMap[tripId];
      
      if (departureStopId && arrivalStopId && routeId) {
        const fareResult = this.fareCalculator.calculateFare(
          departureStopId,
          arrivalStopId,
          routeId
        );
        
        if (fareResult) {
          return fareResult;
        }
        
        // FareCalculatorで見つからない場合は、既存のfares配列にフォールバック
        console.warn('FareCalculatorで運賃が見つからないため、既存のfares配列を使用します', {
          departureStop,
          arrivalStop,
          operator,
          tripId,
          routeId
        });
      }
    }
    
    // 既存のfares配列から運賃を検索（フォールバック処理）
    // 完全一致で検索
    let fare = this.fares.find(f => 
      f.from === departureStop && 
      f.to === arrivalStop && 
      f.operator === operator
    );
    
    // 逆方向も検索
    if (!fare) {
      fare = this.fares.find(f => 
        f.from === arrivalStop && 
        f.to === departureStop && 
        f.operator === operator
      );
    }
    
    // バス停名の略称対応（例: 佐賀駅バスセンター → 佐賀駅BC）
    if (!fare) {
      fare = this.findFareWithAbbreviation(departureStop, arrivalStop, operator);
    }
    
    if (fare) {
      return {
        adultFare: fare.adultFare,
        childFare: fare.childFare
      };
    }
    
    // 運賃情報が見つからない場合
    return {
      adultFare: null,
      childFare: null
    };
  }

  /**
   * 略称を考慮した運賃検索
   */
  findFareWithAbbreviation(departureStop, arrivalStop, operator) {
    // バス停名の略称マッピング
    const abbreviations = {
      '佐賀駅バスセンター': '佐賀駅BC',
      '佐賀駅BC': '佐賀駅バスセンター'
    };
    
    const depAbbrev = abbreviations[departureStop] || departureStop;
    const arrAbbrev = abbreviations[arrivalStop] || arrivalStop;
    
    // 略称で検索
    let fare = this.fares.find(f => 
      (f.from === depAbbrev || f.from === departureStop) && 
      (f.to === arrAbbrev || f.to === arrivalStop) && 
      f.operator === operator
    );
    
    // 逆方向も検索
    if (!fare) {
      fare = this.fares.find(f => 
        (f.from === arrAbbrev || f.from === arrivalStop) && 
        (f.to === depAbbrev || f.to === departureStop) && 
        f.operator === operator
      );
    }
    
    return fare;
  }

  /**
   * 検索結果のソート
   */
  sortResults(results, searchType) {
    if (searchType === 'arrival-time' || searchType === 'last-bus') {
      // 到着時刻降順（遅い順）
      results.sort((a, b) => {
        if (a.arrivalHour !== b.arrivalHour) {
          return b.arrivalHour - a.arrivalHour;
        }
        return b.arrivalMinute - a.arrivalMinute;
      });
      
      // 終電の場合は最初の1件のみ（最も遅い便）
      if (searchType === 'last-bus' && results.length > 0) {
        const lastBus = results[0];
        results.length = 0;
        results.push(lastBus);
      }
    } else {
      // 出発時刻昇順（早い順）
      results.sort((a, b) => {
        if (a.departureHour !== b.departureHour) {
          return a.departureHour - b.departureHour;
        }
        return a.departureMinute - b.departureMinute;
      });
      
      // 始発の場合は最初の1件のみ（最も早い便）
      if (searchType === 'first-bus' && results.length > 0) {
        const firstBus = results[0];
        results.length = 0;
        results.push(firstBus);
      }
    }
  }

  /**
   * 時刻フォーマット（HH:MM形式）
   */
  formatTime(hour, minute) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
}

class UIController {
  constructor() {
    this.departureInput = null;
    this.arrivalInput = null;
    this.departureSuggestions = null;
    this.arrivalSuggestions = null;
    this.searchButton = null;
    this.errorMessage = null;
    
    this.selectedDepartureStop = null;
    this.selectedArrivalStop = null;
    
    this.busStops = [];
    
    // 曜日区分選択関連
    this.weekdayOptions = null;
    this.selectedWeekdayOption = 'auto'; // デフォルトは「自動判定」
    
    // 時刻選択関連
    this.timeOptions = null;
    this.timePicker = null;
    this.timeHourInput = null;
    this.timeMinuteInput = null;
    this.selectedTimeOption = 'now'; // デフォルトは「今すぐ」
    this.currentTime = null; // NTPから取得した現在時刻
    
    // 地図選択モード関連
    this.mapSelectionButtons = null;
    this.isMapSelectionActive = false;
    this.currentMapSelectionType = null; // 'departure' | 'arrival'
    
    // カレンダー機能関連
    this.calendarExporter = null;
    this.calendarModal = null;
    this.currentScheduleForCalendar = null;
  }

  /**
   * UIの初期化
   */
  initialize(busStops) {
    this.busStops = busStops;
    
    // DOM要素の取得
    this.departureInput = document.getElementById('departure-stop');
    this.arrivalInput = document.getElementById('arrival-stop');
    this.departureSuggestions = document.getElementById('departure-suggestions');
    this.arrivalSuggestions = document.getElementById('arrival-suggestions');
    this.searchButton = document.getElementById('search-button');
    this.errorMessage = document.getElementById('error-message');
    
    // 曜日区分選択関連のDOM要素
    this.weekdayOptions = document.querySelectorAll('input[name="weekday-option"]');
    
    // 時刻選択関連のDOM要素
    this.timeOptions = document.querySelectorAll('input[name="time-option"]');
    this.timePicker = document.getElementById('time-picker');
    this.timeHourInput = document.getElementById('time-hour');
    this.timeMinuteInput = document.getElementById('time-minute');
    
    // 地図選択ボタンのDOM要素
    this.mapSelectionButtons = {
      departure: document.getElementById('map-select-departure'),
      arrival: document.getElementById('map-select-arrival')
    };
    
    // カレンダーエクスポーターの初期化
    this.calendarExporter = new CalendarExporter();
    
    // イベントリスナーの設定
    this.setupAutocomplete();
    this.setupClickOutside();
    this.setupWeekdaySelection();
    this.setupTimeSelection();
    this.setupSearchButton();
    this.setupMapSelectionButtons();
    this.setupClearSearchResultsButton();
    this.setupCalendarModal();
  }

  /**
   * 検索ボタンのイベントリスナー設定
   */
  setupSearchButton() {
    const searchForm = document.getElementById('search-form');
    
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeSearch();
    });
  }

  /**
   * オートコンプリートの設定
   */
  setupAutocomplete() {
    // 乗車バス停のインクリメンタルサーチ
    this.departureInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.handleInput(query, this.departureSuggestions, 'departure');
    });

    // 降車バス停のインクリメンタルサーチ
    this.arrivalInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      this.handleInput(query, this.arrivalSuggestions, 'arrival');
    });

    // 乗車バス停のblurイベント（入力検証）
    this.departureInput.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      if (value && !this.validateBusStopName(value)) {
        // 無効なバス停名の場合はクリア
        this.departureInput.value = '';
        this.selectedDepartureStop = null;
        this.updateSearchButton();
      }
    });

    // 降車バス停のblurイベント（入力検証）
    this.arrivalInput.addEventListener('blur', (e) => {
      const value = e.target.value.trim();
      if (value && !this.validateBusStopName(value)) {
        // 無効なバス停名の場合はクリア
        this.arrivalInput.value = '';
        this.selectedArrivalStop = null;
        this.updateSearchButton();
      }
    });

    // 乗車バス停の候補選択
    this.departureSuggestions.addEventListener('click', (e) => {
      if (e.target.tagName === 'LI') {
        this.selectBusStop(e.target.textContent, 'departure');
      }
    });

    // 降車バス停の候補選択
    this.arrivalSuggestions.addEventListener('click', (e) => {
      if (e.target.tagName === 'LI') {
        this.selectBusStop(e.target.textContent, 'arrival');
      }
    });

    // キーボードナビゲーション対応
    this.departureInput.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e, this.departureSuggestions, 'departure');
    });

    this.arrivalInput.addEventListener('keydown', (e) => {
      this.handleKeyboardNavigation(e, this.arrivalSuggestions, 'arrival');
    });
  }

  /**
   * 入力処理
   */
  handleInput(query, suggestionsElement, type) {
    // エラーメッセージをクリア
    this.clearError();

    if (query.length === 0) {
      // 入力が空の場合、候補リストを非表示
      this.hideSuggestions(suggestionsElement);
      
      // 選択状態をクリア
      if (type === 'departure') {
        this.selectedDepartureStop = null;
      } else {
        this.selectedArrivalStop = null;
      }
      
      this.updateSearchButton();
      return;
    }

    // 1文字以上で候補を表示
    const matches = this.filterBusStops(query);
    this.displaySuggestions(matches, suggestionsElement);
  }

  /**
   * バス停名のフィルタリング
   */
  filterBusStops(query) {
    const lowerQuery = query.toLowerCase();
    return this.busStops.filter(stop => 
      stop.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 候補リストの表示
   */
  displaySuggestions(matches, suggestionsElement) {
    // 既存の候補をクリア（安全な方法）
    while (suggestionsElement.firstChild) {
      suggestionsElement.removeChild(suggestionsElement.firstChild);
    }

    if (matches.length === 0) {
      // 候補がない場合
      const li = document.createElement('li');
      li.className = 'suggestion-item suggestion-item-empty';
      li.textContent = '該当するバス停が見つかりません';
      suggestionsElement.appendChild(li);
      suggestionsElement.style.display = 'block';
      return;
    }

    // 候補を表示（最大10件）
    const displayMatches = matches.slice(0, 10);
    displayMatches.forEach((stop, index) => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.textContent = stop.name;
      li.setAttribute('role', 'option');
      li.setAttribute('data-index', index);
      suggestionsElement.appendChild(li);
    });

    suggestionsElement.style.display = 'block';
  }

  /**
   * 候補リストの非表示
   */
  hideSuggestions(suggestionsElement) {
    // 既存の候補をクリア（安全な方法）
    while (suggestionsElement.firstChild) {
      suggestionsElement.removeChild(suggestionsElement.firstChild);
    }
    suggestionsElement.style.display = 'none';
  }

  /**
   * バス停の選択
   */
  selectBusStop(stopName, type) {
    // バス停名の検証（既存リストに存在するかチェック）
    if (!this.validateBusStopName(stopName)) {
      this.displayError('無効なバス停名です。候補リストから選択してください。');
      return;
    }
    
    if (type === 'departure') {
      this.selectedDepartureStop = stopName;
      this.departureInput.value = stopName;
      this.hideSuggestions(this.departureSuggestions);
    } else {
      this.selectedArrivalStop = stopName;
      this.arrivalInput.value = stopName;
      this.hideSuggestions(this.arrivalSuggestions);
    }

    // 同一バス停チェック
    this.validateStops();
    
    // 検索ボタンの状態を更新
    this.updateSearchButton();
  }

  /**
   * バス停名の検証（既存リストに存在するかチェック）
   * @param {string} stopName - 検証するバス停名
   * @returns {boolean} 有効な場合true
   */
  validateBusStopName(stopName) {
    return this.busStops.some(stop => stop.name === stopName);
  }

  /**
   * バス停の検証（同一バス停チェック）
   */
  validateStops() {
    if (this.selectedDepartureStop && this.selectedArrivalStop) {
      if (this.selectedDepartureStop === this.selectedArrivalStop) {
        this.displayError('乗車バス停と降車バス停は異なる停留所を選択してください');
        return false;
      }
    }
    return true;
  }

  /**
   * 検索ボタンの状態更新
   */
  updateSearchButton() {
    const isValid = this.selectedDepartureStop && 
                    this.selectedArrivalStop && 
                    this.selectedDepartureStop !== this.selectedArrivalStop;
    
    this.searchButton.disabled = !isValid;
  }

  /**
   * エラーメッセージの表示
   */
  displayError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.style.display = 'block';
  }

  /**
   * エラーメッセージのクリア
   */
  clearError() {
    this.errorMessage.textContent = '';
    this.errorMessage.style.display = 'none';
  }

  /**
   * 外側クリックで候補リストを閉じる
   */
  setupClickOutside() {
    document.addEventListener('click', (e) => {
      // 乗車バス停の候補リストを閉じる
      if (!this.departureInput.contains(e.target) && 
          !this.departureSuggestions.contains(e.target)) {
        this.hideSuggestions(this.departureSuggestions);
      }

      // 降車バス停の候補リストを閉じる
      if (!this.arrivalInput.contains(e.target) && 
          !this.arrivalSuggestions.contains(e.target)) {
        this.hideSuggestions(this.arrivalSuggestions);
      }
    });
  }

  /**
   * キーボードナビゲーション
   */
  handleKeyboardNavigation(e, suggestionsElement, type) {
    const items = suggestionsElement.querySelectorAll('.suggestion-item:not(.suggestion-item-empty)');
    
    if (items.length === 0) return;

    const currentIndex = Array.from(items).findIndex(item => 
      item.classList.contains('suggestion-item-active')
    );

    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      
      case 'Enter':
        e.preventDefault();
        if (currentIndex >= 0) {
          this.selectBusStop(items[currentIndex].textContent, type);
        }
        return;
      
      case 'Escape':
        e.preventDefault();
        this.hideSuggestions(suggestionsElement);
        return;
      
      default:
        return;
    }

    // アクティブ状態の更新
    items.forEach((item, index) => {
      if (index === newIndex) {
        item.classList.add('suggestion-item-active');
      } else {
        item.classList.remove('suggestion-item-active');
      }
    });
  }

  /**
   * 曜日区分選択UIのセットアップ
   */
  setupWeekdaySelection() {
    // ラジオボタンの変更イベント
    this.weekdayOptions.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.selectedWeekdayOption = e.target.value;
        this.clearError();
      });
    });
  }

  /**
   * 時刻選択UIのセットアップ
   */
  setupTimeSelection() {
    // ラジオボタンの変更イベント
    this.timeOptions.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.handleTimeOptionChange(e.target.value);
      });
    });

    // 時刻入力の検証
    this.timeHourInput.addEventListener('input', (e) => {
      this.validateTimeInput(e.target, 0, 23);
    });

    this.timeMinuteInput.addEventListener('input', (e) => {
      this.validateTimeInput(e.target, 0, 59);
    });

    // 時刻入力のblurイベント（0埋め）
    this.timeHourInput.addEventListener('blur', (e) => {
      this.padTimeInput(e.target);
    });

    this.timeMinuteInput.addEventListener('blur', (e) => {
      this.padTimeInput(e.target);
    });
  }

  /**
   * 時刻オプション変更ハンドラー
   */
  async handleTimeOptionChange(option) {
    this.selectedTimeOption = option;
    this.clearError();

    // タイムピッカーの表示/非表示
    if (option === 'departure-time' || option === 'arrival-time') {
      this.timePicker.style.display = 'block';
      
      // 現在時刻を初期値として設定
      if (!this.timeHourInput.value && !this.timeMinuteInput.value) {
        await this.setCurrentTimeToTimePicker();
      }
    } else {
      this.timePicker.style.display = 'none';
    }

    // 「今すぐ」選択時はNTPから時刻を取得
    if (option === 'now') {
      await this.fetchCurrentTime();
    }
  }

  /**
   * NTPから現在時刻を取得
   */
  async fetchCurrentTime() {
    try {
      // TimeUtilsを使用してNTPから時刻を取得
      this.currentTime = await window.timeUtils.getCurrentTimeFromNTP();
      
      // NTPが成功したかどうかはTimeUtilsのconsole.warnで既にログ出力されている
      
    } catch (error) {
      console.error('時刻取得エラー:', error);
      this.currentTime = new Date();
      this.displayError('端末の時刻を使用しています（時刻サーバーに接続できませんでした）');
    }
  }

  /**
   * タイムピッカーに現在時刻を設定
   */
  async setCurrentTimeToTimePicker() {
    try {
      const now = await window.timeUtils.getCurrentTimeFromNTP();
      this.timeHourInput.value = String(now.getHours()).padStart(2, '0');
      this.timeMinuteInput.value = String(now.getMinutes()).padStart(2, '0');
    } catch (error) {
      console.error('時刻設定エラー:', error);
      const now = new Date();
      this.timeHourInput.value = String(now.getHours()).padStart(2, '0');
      this.timeMinuteInput.value = String(now.getMinutes()).padStart(2, '0');
    }
  }

  /**
   * 時刻入力の検証
   * @param {HTMLInputElement} input - 入力要素
   * @param {number} min - 最小値
   * @param {number} max - 最大値
   */
  validateTimeInput(input, min, max) {
    let value = parseInt(input.value, 10);
    
    // 数値でない場合は空にする
    if (isNaN(value)) {
      input.value = '';
      return;
    }

    // 範囲外の場合は範囲内に収める
    if (value < min) {
      input.value = min;
    } else if (value > max) {
      input.value = max;
    }
  }

  /**
   * 時刻の妥当性を検証
   * @param {number} hour - 時（0-23）
   * @param {number} minute - 分（0-59）
   * @returns {boolean} 有効な場合true
   */
  validateTime(hour, minute) {
    // 数値チェック
    if (typeof hour !== 'number' || typeof minute !== 'number') {
      return false;
    }
    
    // NaNチェック
    if (isNaN(hour) || isNaN(minute)) {
      return false;
    }
    
    // 範囲チェック
    if (hour < 0 || hour > 23) {
      return false;
    }
    
    if (minute < 0 || minute > 59) {
      return false;
    }
    
    return true;
  }

  /**
   * 時刻入力の0埋め
   */
  padTimeInput(input) {
    if (input.value) {
      const value = parseInt(input.value, 10);
      if (!isNaN(value)) {
        input.value = String(value).padStart(2, '0');
      }
    }
  }

  /**
   * 選択された時刻オプションと時刻を取得
   */
  getSelectedTimeOption() {
    const option = this.selectedTimeOption;
    
    if (option === 'departure-time' || option === 'arrival-time') {
      const hour = parseInt(this.timeHourInput.value, 10);
      const minute = parseInt(this.timeMinuteInput.value, 10);
      
      if (isNaN(hour) || isNaN(minute)) {
        return null;
      }
      
      return {
        type: option,
        hour: hour,
        minute: minute
      };
    }
    
    if (option === 'now') {
      // 「今すぐ」の場合は、currentTimeがnullでもオプションを返す
      // 実際の時刻はexecuteSearch()内で取得される
      return {
        type: 'now',
        hour: this.currentTime ? this.currentTime.getHours() : null,
        minute: this.currentTime ? this.currentTime.getMinutes() : null
      };
    }
    
    return {
      type: option // 'first-bus' or 'last-bus'
    };
  }

  /**
   * 検索結果の表示
   * @param {Array} results - 検索結果の配列
   */
  displaySearchResults(results) {
    const resultsContainer = document.getElementById('results-container');
    const loadMoreButton = document.getElementById('load-more');
    
    // コンテナをクリア（安全な方法）
    while (resultsContainer.firstChild) {
      resultsContainer.removeChild(resultsContainer.firstChild);
    }
    
    // 検索結果が0件の場合
    if (results.length === 0) {
      const noResultsMessage = document.createElement('p');
      noResultsMessage.className = 'no-results-message';
      noResultsMessage.textContent = '指定された条件に該当する便が見つかりませんでした';
      resultsContainer.appendChild(noResultsMessage);
      
      // もっと見るボタンを非表示
      loadMoreButton.style.display = 'none';
      
      // クリアボタンを非表示
      this.hideClearSearchResultsButton();
      return;
    }
    
    // 検索結果リストを作成
    const resultsList = document.createElement('ul');
    resultsList.className = 'results-list';
    resultsList.setAttribute('role', 'list');
    
    // 全ての結果をリストに追加
    results.forEach(result => {
      const listItem = this.createResultItem(result);
      resultsList.appendChild(listItem);
    });
    
    // スクロール可能なコンテナを作成（5件まで初期表示）
    const scrollableContainer = document.createElement('div');
    scrollableContainer.className = 'results-list-scrollable';
    
    scrollableContainer.appendChild(resultsList);
    resultsContainer.appendChild(scrollableContainer);
    
    // もっと見るボタンは現在非表示（20件制限のため）
    // 将来的に実装する場合はここで表示制御
    loadMoreButton.style.display = 'none';
    
    // 検索結果が表示されたらクリアボタンを表示
    this.showClearSearchResultsButton();
  }
  
  /**
   * 検索結果クリアボタンのイベントリスナー設定
   */
  setupClearSearchResultsButton() {
    const clearButton = document.getElementById('clear-search-results-button');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearSearchResults();
      });
    }
  }
  
  /**
   * 検索結果をクリア
   */
  clearSearchResults() {
    // 検索結果コンテナをクリア
    const resultsContainer = document.getElementById('results-container');
    if (resultsContainer) {
      // 既存の内容をクリア
      while (resultsContainer.firstChild) {
        resultsContainer.removeChild(resultsContainer.firstChild);
      }
      
      // プレースホルダーを表示
      const placeholder = document.createElement('p');
      placeholder.className = 'results-placeholder';
      placeholder.textContent = '検索条件を入力して検索ボタンを押してください';
      resultsContainer.appendChild(placeholder);
    }
    
    // 検索入力フィールドをクリア
    if (this.departureInput) {
      this.departureInput.value = '';
      this.selectedDepartureStop = null;
    }
    
    if (this.arrivalInput) {
      this.arrivalInput.value = '';
      this.selectedArrivalStop = null;
    }
    
    // 検索ボタンを無効化
    this.updateSearchButton();
    
    // クリアボタンを非表示
    this.hideClearSearchResultsButton();
    
    // エラーメッセージをクリア
    this.clearError();
    
    console.log('[UIController] 検索結果をクリアしました');
  }
  
  /**
   * 検索結果クリアボタンを表示
   */
  showClearSearchResultsButton() {
    const clearButton = document.getElementById('clear-search-results-button');
    if (clearButton) {
      clearButton.removeAttribute('hidden');
    }
  }
  
  /**
   * 検索結果クリアボタンを非表示
   */
  hideClearSearchResultsButton() {
    const clearButton = document.getElementById('clear-search-results-button');
    if (clearButton) {
      clearButton.setAttribute('hidden', '');
    }
  }

  /**
   * カレンダーモーダルのセットアップ
   */
  setupCalendarModal() {
    this.calendarModal = document.getElementById('calendar-modal');
    
    if (!this.calendarModal) {
      console.error('[UIController] カレンダーモーダルが見つかりません');
      return;
    }
    
    // 閉じるボタンのイベントリスナー
    const closeButton = this.calendarModal.querySelector('.calendar-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeCalendarModal();
      });
    }
    
    // モーダル外側クリックで閉じる
    this.calendarModal.addEventListener('click', (e) => {
      if (e.target === this.calendarModal) {
        this.closeCalendarModal();
      }
    });
    
    // Escapeキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.calendarModal.hasAttribute('hidden')) {
        this.closeCalendarModal();
      }
    });
    
    // カレンダーオプションボタンのイベントリスナー
    const optionButtons = this.calendarModal.querySelectorAll('.calendar-option-button');
    optionButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const format = e.currentTarget.getAttribute('data-format');
        this.handleCalendarExport(format);
      });
    });
  }
  
  /**
   * 「カレンダーに登録」ボタンクリック時の処理
   * @param {Object} result - 検索結果オブジェクト
   */
  handleAddToCalendarClick(result) {
    console.log('[UIController] カレンダーに登録ボタンがクリックされました:', result);
    
    // スケジュール情報を保存
    this.currentScheduleForCalendar = result;
    
    // モーダルを表示
    this.showCalendarModal();
  }
  
  /**
   * カレンダーモーダルを表示
   */
  showCalendarModal() {
    if (this.calendarModal) {
      this.calendarModal.removeAttribute('hidden');
      
      // フォーカスをモーダルに移動
      const firstButton = this.calendarModal.querySelector('.calendar-option-button');
      if (firstButton) {
        firstButton.focus();
      }
    }
  }
  
  /**
   * カレンダーモーダルを閉じる
   */
  closeCalendarModal() {
    if (this.calendarModal) {
      this.calendarModal.setAttribute('hidden', '');
      this.currentScheduleForCalendar = null;
    }
  }
  
  /**
   * カレンダーエクスポート処理
   * @param {string} format - エクスポート形式 ('ical' | 'google')
   */
  handleCalendarExport(format) {
    if (!this.currentScheduleForCalendar) {
      console.error('[UIController] スケジュール情報がありません');
      return;
    }
    
    try {
      if (format === 'ical') {
        this.calendarExporter.exportToICal(this.currentScheduleForCalendar);
      } else if (format === 'google') {
        this.calendarExporter.exportToGoogleCalendar(this.currentScheduleForCalendar);
      }
      
      // モーダルを閉じる
      this.closeCalendarModal();
      
    } catch (error) {
      console.error('[UIController] カレンダーエクスポートエラー:', error);
      this.displayError('カレンダーへの登録に失敗しました');
    }
  }

  /**
   * 検索結果アイテムのHTML生成
   * @param {object} result - 検索結果オブジェクト
   * @returns {HTMLElement} リストアイテム要素
   */
  createResultItem(result) {
    const li = document.createElement('li');
    li.className = 'result-item';
    li.setAttribute('role', 'listitem');
    
    // 時刻情報コンテナ
    const timeContainer = document.createElement('div');
    timeContainer.className = 'result-time-container';
    
    // 出発時刻
    const departureTime = document.createElement('div');
    departureTime.className = 'result-departure-time';
    
    const departureLabel = document.createElement('span');
    departureLabel.className = 'result-time-label';
    departureLabel.textContent = '出発';
    
    const departureValue = document.createElement('span');
    departureValue.className = 'result-time-value';
    departureValue.textContent = result.departureTime;
    
    departureTime.appendChild(departureLabel);
    departureTime.appendChild(departureValue);
    
    // 矢印
    const arrow = document.createElement('div');
    arrow.className = 'result-arrow';
    arrow.textContent = '→';
    
    // 到着時刻
    const arrivalTime = document.createElement('div');
    arrivalTime.className = 'result-arrival-time';
    
    const arrivalLabel = document.createElement('span');
    arrivalLabel.className = 'result-time-label';
    arrivalLabel.textContent = '到着';
    
    const arrivalValue = document.createElement('span');
    arrivalValue.className = 'result-time-value';
    arrivalValue.textContent = result.arrivalTime;
    
    arrivalTime.appendChild(arrivalLabel);
    arrivalTime.appendChild(arrivalValue);
    
    timeContainer.appendChild(departureTime);
    timeContainer.appendChild(arrow);
    timeContainer.appendChild(arrivalTime);
    
    // 詳細情報コンテナ
    const detailsContainer = document.createElement('div');
    detailsContainer.className = 'result-details-container';
    
    // 所要時間
    const duration = document.createElement('div');
    duration.className = 'result-duration';
    
    const durationLabel = document.createElement('span');
    durationLabel.className = 'result-detail-label';
    durationLabel.textContent = '所要時間: ';
    
    const durationValue = document.createElement('span');
    durationValue.className = 'result-detail-value';
    durationValue.textContent = `${result.duration}分`;
    
    duration.appendChild(durationLabel);
    duration.appendChild(durationValue);
    
    // 運賃
    const fare = document.createElement('div');
    fare.className = 'result-fare';
    
    const fareLabel = document.createElement('span');
    fareLabel.className = 'result-detail-label';
    fareLabel.textContent = '運賃: ';
    
    const fareValue = document.createElement('span');
    fareValue.className = 'result-detail-value';
    
    if (result.adultFare !== null && result.childFare !== null) {
      fareValue.textContent = `大人 ${result.adultFare}円 / 小人 ${result.childFare}円`;
    } else {
      fareValue.textContent = '運賃情報なし';
    }
    
    fare.appendChild(fareLabel);
    fare.appendChild(fareValue);
    
    // 事業者
    const operator = document.createElement('div');
    operator.className = 'result-operator';
    
    const operatorLabel = document.createElement('span');
    operatorLabel.className = 'result-detail-label';
    operatorLabel.textContent = '事業者: ';
    
    const operatorValue = document.createElement('span');
    operatorValue.className = 'result-detail-value';
    operatorValue.textContent = result.operator;
    
    operator.appendChild(operatorLabel);
    operator.appendChild(operatorValue);
    
    // 路線名
    const route = document.createElement('div');
    route.className = 'result-route';
    
    const routeLabel = document.createElement('span');
    routeLabel.className = 'result-detail-label';
    routeLabel.textContent = '路線: ';
    
    const routeValue = document.createElement('span');
    routeValue.className = 'result-detail-value';
    routeValue.textContent = result.routeName;
    
    route.appendChild(routeLabel);
    route.appendChild(routeValue);
    
    detailsContainer.appendChild(duration);
    detailsContainer.appendChild(fare);
    detailsContainer.appendChild(operator);
    detailsContainer.appendChild(route);
    
    // 経由バス停（ある場合のみ表示）
    if (result.viaStops && result.viaStops.length > 0) {
      const viaStops = document.createElement('div');
      viaStops.className = 'result-via-stops';
      
      const viaLabel = document.createElement('span');
      viaLabel.className = 'result-detail-label';
      viaLabel.textContent = '経由: ';
      
      const viaValue = document.createElement('span');
      viaValue.className = 'result-detail-value result-via-stops-list';
      
      // 経由バス停を「バス停名 (時刻)」形式で表示
      const viaStopsText = result.viaStops
        .map(stop => `${stop.name} (${stop.time})`)
        .join(' → ');
      
      viaValue.textContent = viaStopsText;
      
      viaStops.appendChild(viaLabel);
      viaStops.appendChild(viaValue);
      
      detailsContainer.appendChild(viaStops);
    }
    
    // アクションボタンコンテナを作成
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'result-actions';
    
    // 「地図で表示」ボタンを追加
    const mapButton = document.createElement('button');
    mapButton.className = 'map-display-button';
    mapButton.textContent = '地図で表示';
    mapButton.setAttribute('type', 'button');
    mapButton.setAttribute('aria-label', `${result.departureStop}から${result.arrivalStop}への経路を地図で表示`);
    
    // ボタンクリック時のイベントハンドラー
    mapButton.addEventListener('click', () => {
      this.handleMapDisplayButtonClick(result);
    });
    
    actionsContainer.appendChild(mapButton);
    
    // 「カレンダーに登録」ボタンを追加
    const calendarButton = document.createElement('button');
    calendarButton.className = 'add-to-calendar-button';
    calendarButton.textContent = 'カレンダーに登録';
    calendarButton.setAttribute('type', 'button');
    calendarButton.setAttribute('aria-label', `${result.departureStop}から${result.arrivalStop}のバスをカレンダーに登録`);
    
    // ボタンクリック時のイベントハンドラー
    calendarButton.addEventListener('click', () => {
      this.handleAddToCalendarClick(result);
    });
    
    actionsContainer.appendChild(calendarButton);
    
    detailsContainer.appendChild(actionsContainer);
    
    // リストアイテムに追加
    li.appendChild(timeContainer);
    li.appendChild(detailsContainer);
    
    return li;
  }
  
  /**
   * 「地図で表示」ボタンクリック時の処理
   * @param {object} result - 検索結果オブジェクト
   */
  handleMapDisplayButtonClick(result) {
    console.log('[UIController] 地図で表示ボタンがクリックされました:', result);
    
    // MapControllerが初期化されているか確認
    if (!window.mapController) {
      console.error('[UIController] MapControllerが初期化されていません');
      this.displayError('地図機能が利用できません');
      return;
    }
    
    // 経路データを構築
    const routeData = this.buildRouteDataFromResult(result);
    
    if (!routeData) {
      console.error('[UIController] 経路データの構築に失敗しました');
      this.displayError('経路情報が不足しています');
      return;
    }
    
    // MapControllerに経路表示を依頼
    window.mapController.displayRoute(routeData);
    
    // 地図エリアにスクロール
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  /**
   * 検索結果から経路データを構築
   * @param {object} result - 検索結果オブジェクト
   * @returns {object|null} 経路データ、または構築失敗時はnull
   */
  buildRouteDataFromResult(result) {
    // 乗車バス停の座標を取得
    const departureStop = this.busStops.find(stop => stop.name === result.departureStop);
    if (!departureStop) {
      console.error('[UIController] 乗車バス停が見つかりません:', result.departureStop);
      return null;
    }
    
    // 降車バス停の座標を取得
    const arrivalStop = this.busStops.find(stop => stop.name === result.arrivalStop);
    if (!arrivalStop) {
      console.error('[UIController] 降車バス停が見つかりません:', result.arrivalStop);
      return null;
    }
    
    // 経由バス停の座標を取得
    const viaStops = [];
    if (result.viaStops && result.viaStops.length > 0) {
      for (const viaStop of result.viaStops) {
        const stop = this.busStops.find(s => s.name === viaStop.name);
        if (stop) {
          viaStops.push({
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng,
            time: viaStop.time
          });
        } else {
          console.warn('[UIController] 経由バス停が見つかりません:', viaStop.name);
        }
      }
    }
    
    // 経路の座標配列を構築（乗車 → 経由 → 降車の順）
    const routeCoordinates = [
      [departureStop.lat, departureStop.lng]
    ];
    
    viaStops.forEach(stop => {
      routeCoordinates.push([stop.lat, stop.lng]);
    });
    
    routeCoordinates.push([arrivalStop.lat, arrivalStop.lng]);
    
    return {
      departureStop: {
        name: departureStop.name,
        lat: departureStop.lat,
        lng: departureStop.lng,
        time: result.departureTime
      },
      arrivalStop: {
        name: arrivalStop.name,
        lat: arrivalStop.lat,
        lng: arrivalStop.lng,
        time: result.arrivalTime
      },
      viaStops: viaStops,
      routeCoordinates: routeCoordinates,
      routeName: result.routeName,
      operator: result.operator
    };
  }

  /**
   * ローディング表示の制御
   * @param {boolean} show - 表示するかどうか
   */
  displayLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'block' : 'none';
  }

  /**
   * 地図選択ボタンのイベントリスナー設定
   */
  setupMapSelectionButtons() {
    // 乗車バス停の地図選択ボタン
    if (this.mapSelectionButtons.departure) {
      this.mapSelectionButtons.departure.addEventListener('click', () => {
        // 既に選択モードがアクティブで、同じタイプの場合は中止
        if (this.isMapSelectionActive && this.currentMapSelectionType === 'departure') {
          this.stopMapSelection();
        } else {
          this.startMapSelection('departure');
        }
      });
    }
    
    // 降車バス停の地図選択ボタン
    if (this.mapSelectionButtons.arrival) {
      this.mapSelectionButtons.arrival.addEventListener('click', () => {
        // 既に選択モードがアクティブで、同じタイプの場合は中止
        if (this.isMapSelectionActive && this.currentMapSelectionType === 'arrival') {
          this.stopMapSelection();
        } else {
          this.startMapSelection('arrival');
        }
      });
    }
  }
  
  /**
   * 地図からバス停選択モードを開始
   * @param {string} type - 選択タイプ ('departure' | 'arrival')
   */
  startMapSelection(type) {
    if (!['departure', 'arrival'].includes(type)) {
      console.error('[UIController] 不正な選択タイプ:', type);
      return;
    }
    
    // 既に選択モードがアクティブな場合は一旦停止
    if (this.isMapSelectionActive) {
      this.stopMapSelection();
    }
    
    // 選択モードをアクティブに設定
    this.isMapSelectionActive = true;
    this.currentMapSelectionType = type;
    
    // MapControllerに選択モードを設定
    if (window.mapController) {
      window.mapController.setSelectionMode(type);
    }
    
    // ボタンの表示を更新
    this.updateMapSelectionButtonState(type, true);
    
    // 地図エリアにスクロール
    const mapContainer = document.getElementById('map-container');
    if (mapContainer) {
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    console.log('[UIController] 地図選択モードを開始:', type);
  }
  
  /**
   * 地図からバス停選択モードを終了
   */
  stopMapSelection() {
    if (!this.isMapSelectionActive) {
      return;
    }
    
    // 選択モードを非アクティブに設定
    this.isMapSelectionActive = false;
    const previousType = this.currentMapSelectionType;
    this.currentMapSelectionType = null;
    
    // MapControllerの選択モードを解除
    if (window.mapController) {
      window.mapController.setSelectionMode('none');
    }
    
    // ボタンの表示を更新
    if (previousType) {
      this.updateMapSelectionButtonState(previousType, false);
    }
    
    console.log('[UIController] 地図選択モードを終了');
  }
  
  /**
   * 地図選択ボタンの状態を更新
   * @param {string} type - 選択タイプ ('departure' | 'arrival')
   * @param {boolean} isActive - アクティブ状態
   */
  updateMapSelectionButtonState(type, isActive) {
    const button = this.mapSelectionButtons[type];
    if (!button) return;
    
    if (isActive) {
      button.textContent = '選択を中止';
      button.classList.add('map-selection-active');
    } else {
      button.textContent = '地図から選択';
      button.classList.remove('map-selection-active');
    }
  }
  
  /**
   * 地図からバス停が選択されたときの処理
   * @param {string} type - 選択タイプ ('departure' | 'arrival')
   * @param {string} stopName - バス停名
   */
  handleMapStopSelection(type, stopName) {
    console.log('[UIController] 地図からバス停が選択されました:', type, stopName);
    
    // バス停名の検証
    if (!this.validateBusStopName(stopName)) {
      this.displayError('無効なバス停が選択されました');
      return;
    }
    
    // 検索フォームに自動入力
    if (type === 'departure') {
      this.selectedDepartureStop = stopName;
      this.departureInput.value = stopName;
    } else if (type === 'arrival') {
      this.selectedArrivalStop = stopName;
      this.arrivalInput.value = stopName;
    }
    
    // 同一バス停チェック
    this.validateStops();
    
    // 検索ボタンの状態を更新
    this.updateSearchButton();
    
    // 選択モードを終了
    this.stopMapSelection();
    
    // エラーメッセージをクリア
    this.clearError();
  }

  /**
   * 検索実行
   */
  async executeSearch() {
    // 入力検証: 乗車バス停
    if (!this.selectedDepartureStop) {
      this.displayError('乗車バス停を選択してください');
      return;
    }
    
    // バス停名の検証（既存リストに存在するかチェック）
    if (!this.validateBusStopName(this.selectedDepartureStop)) {
      this.displayError('無効な乗車バス停です。候補リストから選択してください。');
      return;
    }
    
    // 入力検証: 降車バス停
    if (!this.selectedArrivalStop) {
      this.displayError('降車バス停を選択してください');
      return;
    }
    
    // バス停名の検証（既存リストに存在するかチェック）
    if (!this.validateBusStopName(this.selectedArrivalStop)) {
      this.displayError('無効な降車バス停です。候補リストから選択してください。');
      return;
    }
    
    // 同一バス停チェック
    if (this.selectedDepartureStop === this.selectedArrivalStop) {
      this.displayError('乗車バス停と降車バス停は異なる停留所を選択してください');
      return;
    }
    
    // エラーメッセージをクリア
    this.clearError();
    
    // ローディング表示
    this.displayLoading(true);
    
    try {
      // 時刻オプションを取得
      const timeOption = this.getSelectedTimeOption();
      
      if (!timeOption) {
        this.displayError('時刻を正しく入力してください');
        this.displayLoading(false);
        return;
      }
      
      // 「今すぐ」の場合は現在時刻を取得
      if (timeOption.type === 'now' && (timeOption.hour === null || timeOption.minute === null)) {
        await this.fetchCurrentTime();
        timeOption.hour = this.currentTime.getHours();
        timeOption.minute = this.currentTime.getMinutes();
      }
      
      // 時刻指定の場合は時刻の妥当性を検証
      if ((timeOption.type === 'departure-time' || timeOption.type === 'arrival-time') &&
          !this.validateTime(timeOption.hour, timeOption.minute)) {
        this.displayError('時刻を正しく入力してください（時: 0-23、分: 0-59）');
        this.displayLoading(false);
        return;
      }
      
      // 曜日区分を取得
      let weekdayType;
      if (this.selectedWeekdayOption === 'auto') {
        // 自動判定
        weekdayType = await window.timeUtils.getWeekdayType(
          this.currentTime || new Date()
        );
      } else {
        // 手動選択
        weekdayType = this.selectedWeekdayOption;
      }
      
      // 検索実行
      const results = window.searchController.searchDirectTrips(
        this.selectedDepartureStop,
        this.selectedArrivalStop,
        timeOption,
        weekdayType
      );
      
      // 結果表示
      this.displaySearchResults(results);
      
    } catch (error) {
      console.error('検索エラー:', error);
      this.displayError('検索中にエラーが発生しました。もう一度お試しください。');
    } finally {
      // ローディング非表示
      this.displayLoading(false);
    }
  }
}

// SearchControllerをグローバルにエクスポート（テスト用）
if (typeof window !== 'undefined') {
  window.SearchController = SearchController;
  window.UIController = UIController;
}

// アプリケーションの初期化
window.uiController = null;
window.searchController = null;

/**
 * UIを無効化する
 */
function disableUI() {
  const departureInput = document.getElementById('departure-stop');
  const arrivalInput = document.getElementById('arrival-stop');
  const searchButton = document.getElementById('search-button');
  const weekdayOptions = document.querySelectorAll('input[name="weekday-option"]');
  const timeOptions = document.querySelectorAll('input[name="time-option"]');
  const timeHourInput = document.getElementById('time-hour');
  const timeMinuteInput = document.getElementById('time-minute');
  const mapSelectDeparture = document.getElementById('map-select-departure');
  const mapSelectArrival = document.getElementById('map-select-arrival');
  
  if (departureInput) departureInput.disabled = true;
  if (arrivalInput) arrivalInput.disabled = true;
  if (searchButton) searchButton.disabled = true;
  
  weekdayOptions.forEach(radio => {
    radio.disabled = true;
  });
  
  timeOptions.forEach(radio => {
    radio.disabled = true;
  });
  
  if (timeHourInput) timeHourInput.disabled = true;
  if (timeMinuteInput) timeMinuteInput.disabled = true;
  if (mapSelectDeparture) mapSelectDeparture.disabled = true;
  if (mapSelectArrival) mapSelectArrival.disabled = true;
}

/**
 * UIを有効化する
 */
function enableUI() {
  const departureInput = document.getElementById('departure-stop');
  const arrivalInput = document.getElementById('arrival-stop');
  const searchButton = document.getElementById('search-button');
  const weekdayOptions = document.querySelectorAll('input[name="weekday-option"]');
  const timeOptions = document.querySelectorAll('input[name="time-option"]');
  const timeHourInput = document.getElementById('time-hour');
  const timeMinuteInput = document.getElementById('time-minute');
  const mapSelectDeparture = document.getElementById('map-select-departure');
  const mapSelectArrival = document.getElementById('map-select-arrival');
  
  if (departureInput) departureInput.disabled = false;
  if (arrivalInput) arrivalInput.disabled = false;
  // 検索ボタンは選択状態に応じて有効化されるため、ここでは有効化しない
  
  weekdayOptions.forEach(radio => {
    radio.disabled = false;
  });
  
  timeOptions.forEach(radio => {
    radio.disabled = false;
  });
  
  if (timeHourInput) timeHourInput.disabled = false;
  if (timeMinuteInput) timeMinuteInput.disabled = false;
  if (mapSelectDeparture) mapSelectDeparture.disabled = false;
  if (mapSelectArrival) mapSelectArrival.disabled = false;
}

/**
 * ローディング表示を制御する
 */
function showInitialLoading(show) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = show ? 'block' : 'none';
  }
}

/**
 * エラーメッセージとリトライボタンを表示する
 */
function showInitializationError(message) {
  const errorMessage = document.getElementById('error-message');
  
  // エラーメッセージを表示
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  
  // リトライボタンを作成
  const retryButton = document.createElement('button');
  retryButton.id = 'retry-button';
  retryButton.className = 'retry-button';
  retryButton.textContent = '再読み込み';
  retryButton.addEventListener('click', () => {
    location.reload();
  });
  
  // 既存のリトライボタンがあれば削除
  const existingRetryButton = document.getElementById('retry-button');
  if (existingRetryButton) {
    existingRetryButton.remove();
  }
  
  // エラーメッセージの後にリトライボタンを追加
  errorMessage.parentNode.insertBefore(retryButton, errorMessage.nextSibling);
}

/**
 * アプリケーションの初期化
 */
async function initializeApp() {
  const startTime = Date.now();
  
  try {
    // UIを無効化
    disableUI();
    
    // ローディング表示
    showInitialLoading(true);
    
    // データローダーの初期化
    const dataLoader = new DataLoader();
    
    // データの読み込み（5秒タイムアウト）
    console.log('データを読み込んでいます...');
    
    const loadPromise = Promise.all([
      dataLoader.loadAllData(),
      dataLoader.loadGTFSData()
    ]);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('データ読み込みがタイムアウトしました（5秒超過）')), 5000);
    });
    
    // タイムアウト付きでデータ読み込み
    await Promise.race([loadPromise, timeoutPromise]);
    
    const loadTime = Date.now() - startTime;
    console.log(`データの読み込みが完了しました（${loadTime}ms）`);
    console.log(`バス停数: ${dataLoader.busStops.length}`);
    console.log(`時刻表データ数: ${dataLoader.timetable.length}`);
    console.log(`運賃データ数: ${dataLoader.fares.length}`);
    console.log(`GTFSデータ: stopTimes=${dataLoader.stopTimes.length}, trips=${dataLoader.trips.length}, routes=${dataLoader.routes.length}, calendar=${dataLoader.calendar.length}, gtfsStops=${dataLoader.gtfsStops.length}`);
    
    // 3秒以内に読み込み完了したか確認
    if (loadTime > 3000) {
      console.warn('データ読み込みに3秒以上かかりました');
    }
    
    // FareCalculatorの初期化
    let fareCalculator = null;
    try {
      if (dataLoader.fareRules && dataLoader.fareRules.length > 0) {
        fareCalculator = new FareCalculator(
          dataLoader.fares,
          dataLoader.fareRules,
          dataLoader.routes || [] // routesデータを渡す
        );
        console.log('FareCalculatorの初期化が完了しました');
        console.log(`運賃ルール数: ${dataLoader.fareRules.length}`);
      } else {
        console.warn('fare_rules.txtが存在しないため、FareCalculatorは初期化されませんでした');
        console.warn('既存のfares配列を使用して運賃計算を行います');
      }
    } catch (error) {
      console.error('FareCalculator初期化エラー:', error);
      console.warn('既存のfares配列を使用して運賃計算を行います');
      fareCalculator = null;
    }
    
    // TimetableControllerの初期化
    try {
      if (!dataLoader.stopTimes || !dataLoader.trips || !dataLoader.routes || !dataLoader.calendar || !dataLoader.gtfsStops) {
        throw new Error('TimetableControllerに必要なGTFSデータが不足しています');
      }
      
      window.timetableController = new TimetableController(
        dataLoader.stopTimes,
        dataLoader.trips,
        dataLoader.routes,
        dataLoader.calendar,
        dataLoader.gtfsStops // 生のstops.txtデータを渡す（stop_idプロパティを持つ）
      );
      console.log('TimetableControllerの初期化が完了しました');
      
      // TimetableUIの初期化
      window.timetableUI = new TimetableUI(window.timetableController);
      console.log('TimetableUIの初期化が完了しました');
    } catch (error) {
      console.error('TimetableController初期化エラー:', error);
      console.warn('時刻表表示機能は利用できません');
      window.timetableController = null;
      window.timetableUI = null;
    }
    
    // SearchControllerの初期化
    window.searchController = new SearchController(
      dataLoader.timetable,
      dataLoader.fares,
      fareCalculator,
      dataLoader.busStops, // 変換後のバス停データ（name -> idマッピング用）
      dataLoader.trips // tripId -> route_idマッピング用
    );
    console.log('SearchControllerの初期化が完了しました');
    
    // UIControllerの初期化
    window.uiController = new UIController();
    window.uiController.initialize(dataLoader.busStops);
    
    console.log('UIの初期化が完了しました');
    
    // MapControllerの初期化
    const mapStartTime = performance.now();
    window.mapController = new MapController();
    window.mapController.initialize('map-container', dataLoader.busStops);
    
    // バス停マーカーを表示
    window.mapController.displayAllStops();
    
    // MapControllerのコールバックを設定（地図からバス停選択時）
    window.mapController.setOnStopSelectedCallback((type, stopName) => {
      window.uiController.handleMapStopSelection(type, stopName);
    });
    
    const mapLoadTime = performance.now() - mapStartTime;
    console.log(`MapControllerの初期化が完了しました（${mapLoadTime.toFixed(2)}ms）`);
    
    // パフォーマンス統計を出力（デバッグ用）
    if (window.mapController) {
      const stats = window.mapController.getPerformanceStats();
      console.log('[MapController] パフォーマンス統計:', stats);
    }
    
    // TripTimetableFormatterの初期化
    console.log('TripTimetableFormatterを初期化しています...');
    window.tripTimetableFormatter = new TripTimetableFormatter(dataLoader);
    console.log('TripTimetableFormatterの初期化が完了しました');
    
    // RealtimeVehicleControllerの初期化
    try {
      console.log('RealtimeVehicleControllerを初期化しています...');
      
      // RealtimeDataLoaderのインスタンス化
      window.realtimeDataLoader = new RealtimeDataLoader('/api');
      
      // RealtimeVehicleControllerのインスタンス化
      window.realtimeVehicleController = new RealtimeVehicleController(
        window.mapController,
        dataLoader,
        window.realtimeDataLoader,
        window.tripTimetableFormatter
      );
      
      // 初期化とポーリング開始
      await window.realtimeVehicleController.initialize();
      
      // エラーハンドリングの統合
      window.realtimeDataLoader.addEventListener('fetchError', (data) => {
        const { error, dataType } = data;
        console.error(`[App] リアルタイムデータ取得エラー (${dataType}):`, error);
        
        // UIにエラーメッセージを表示（一時的に表示して自動的に消す）
        const errorMessage = document.getElementById('error-message');
        if (errorMessage) {
          errorMessage.textContent = 'リアルタイム情報が一時的に利用できません';
          errorMessage.style.display = 'block';
          
          // 5秒後に自動的に消す
          setTimeout(() => {
            if (errorMessage.textContent === 'リアルタイム情報が一時的に利用できません') {
              errorMessage.textContent = '';
              errorMessage.style.display = 'none';
            }
          }, 5000);
        }
      });
      
      console.log('RealtimeVehicleControllerの初期化が完了しました');
    } catch (error) {
      console.error('RealtimeVehicleController初期化エラー:', error);
      console.warn('リアルタイム車両追跡機能は利用できません（静的データのみ表示）');
      window.realtimeVehicleController = null;
      window.realtimeDataLoader = null;
    }
    
    // UIを有効化
    enableUI();
    
    // ローディング非表示
    showInitialLoading(false);
    
    // プレースホルダーを表示
    const placeholder = document.querySelector('.results-placeholder');
    if (placeholder) {
      placeholder.style.display = 'block';
    }
    
  } catch (error) {
    console.error('初期化エラー:', error);
    
    // ローディング非表示
    showInitialLoading(false);
    
    // エラーメッセージとリトライボタンを表示
    showInitializationError('データの読み込みに失敗しました。再読み込みボタンをクリックしてください。');
    
    // UIは無効のまま
  }
}

// DOMContentLoaded時にアプリケーションを初期化
document.addEventListener('DOMContentLoaded', initializeApp);
