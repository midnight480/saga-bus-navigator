/**
 * TimetableControllerクラス
 * 時刻表表示ロジックを担当
 */
class TimetableController {
  /**
   * コンストラクタ
   * @param {Array} stopTimes - stop_times.txtから読み込んだ停車時刻データ
   * @param {Array} trips - trips.txtから読み込んだ便データ
   * @param {Array} routes - routes.txtから読み込んだ路線データ
   * @param {Array} calendar - calendar.txtから読み込んだ運行カレンダーデータ
   * @param {Array} stops - stops.txtから読み込んだバス停データ
   */
  constructor(stopTimes = [], trips = [], routes = [], calendar = [], stops = []) {
    this.stopTimes = stopTimes;
    this.trips = trips;
    this.routes = routes;
    this.calendar = calendar;
    this.stops = stops;
    
    // 検索最適化のためのインデックスを作成
    this.tripsIndex = this.createIndex(trips, 'trip_id');
    this.routesIndex = this.createIndex(routes, 'route_id');
    this.calendarIndex = this.createIndex(calendar, 'service_id');
    this.stopsIndex = this.createIndex(stops, 'stop_id');
    
    // stop_id + route_idでインデックス化（検索最適化）
    this.stopTimesIndex = this.createStopTimesIndex(stopTimes);
  }

  /**
   * バス停で運行している路線一覧を取得
   * @param {string} stopId - バス停ID
   * @returns {Array<Object>} 路線情報の配列
   */
  getRoutesAtStop(stopId) {
    // 入力値の検証
    if (!stopId) {
      console.warn('TimetableController: stopIdが指定されていません');
      return [];
    }

    // バス停が存在するか確認
    const stop = this.stopsIndex[stopId];
    if (!stop) {
      console.warn('TimetableController: 存在しないバス停が指定されました', { stopId });
      return [];
    }

    // このバス停に停車する全てのstop_timesを取得
    const stopTimesAtStop = this.stopTimes.filter(st => st.stop_id === stopId);
    
    if (stopTimesAtStop.length === 0) {
      console.warn('TimetableController: このバス停に停車する便が見つかりません', { stopId });
      return [];
    }

    // trip_idから路線情報を取得（重複を除く）
    const routeMap = new Map();
    
    stopTimesAtStop.forEach(stopTime => {
      const trip = this.tripsIndex[stopTime.trip_id];
      if (!trip) {
        console.warn('TimetableController: trip_idに対応するtripが見つかりません', { 
          tripId: stopTime.trip_id 
        });
        return;
      }

      const route = this.routesIndex[trip.route_id];
      if (!route) {
        console.warn('TimetableController: route_idに対応するrouteが見つかりません', { 
          routeId: trip.route_id 
        });
        return;
      }

      // 路線が既に追加されていない場合のみ追加
      if (!routeMap.has(route.route_id)) {
        routeMap.set(route.route_id, {
          routeId: route.route_id,
          routeName: route.route_long_name || route.route_short_name || route.route_id,
          routeShortName: route.route_short_name || '',
          agencyId: route.agency_id || '',
          routeType: route.route_type || ''
        });
      }
    });

    // Map を配列に変換
    const routes = Array.from(routeMap.values());
    
    // 路線名でソート
    routes.sort((a, b) => a.routeName.localeCompare(b.routeName, 'ja'));
    
    return routes;
  }

  /**
   * 特定路線の時刻表を取得
   * @param {string} stopId - バス停ID
   * @param {string} routeId - 路線ID
   * @param {string} serviceDayType - 運行日種別（'平日' or '土日祝'）
   * @returns {Array<Object>} 時刻表データの配列（方向情報を含む）
   */
  getTimetable(stopId, routeId, serviceDayType) {
    // 入力値の検証
    if (!stopId || !routeId || !serviceDayType) {
      console.warn('TimetableController: 必須パラメータが不足しています', {
        stopId,
        routeId,
        serviceDayType
      });
      return [];
    }

    // バス停が存在するか確認
    const stop = this.stopsIndex[stopId];
    if (!stop) {
      console.warn('TimetableController: 存在しないバス停が指定されました', { stopId });
      console.log('TimetableController: 利用可能なstop_idの例:', Object.keys(this.stopsIndex).slice(0, 5));
      return [];
    }

    // 路線が存在するか確認
    const route = this.routesIndex[routeId];
    if (!route) {
      console.warn('TimetableController: 存在しない路線が指定されました', { routeId });
      console.log('TimetableController: 利用可能なroute_idの例:', Object.keys(this.routesIndex).slice(0, 5));
      return [];
    }

    // インデックスを使用して該当するstop_timesを取得
    const indexKey = `${stopId}_${routeId}`;
    const stopTimesAtStop = this.stopTimesIndex[indexKey] || [];
    
    console.log('TimetableController: インデックスキー:', indexKey);
    console.log('TimetableController: 該当するstop_times数:', stopTimesAtStop.length);
    
    if (stopTimesAtStop.length === 0) {
      console.warn('TimetableController: 該当する時刻表データが見つかりません', {
        stopId,
        routeId,
        indexKey
      });
      console.log('TimetableController: 利用可能なインデックスキーの例:', Object.keys(this.stopTimesIndex).slice(0, 10));
      return [];
    }

    // 時刻表データを構築
    const timetable = [];
    const seenKeys = new Set(); // 重複チェック用のSet
    let filteredCount = 0;
    let dataErrors = 0; // データ不整合カウント
    
    stopTimesAtStop.forEach(stopTime => {
      const trip = this.tripsIndex[stopTime.trip_id];
      if (!trip) {
        return;
      }

      // service_idから運行日種別を判定
      const calendar = this.calendarIndex[trip.service_id];
      const weekdayType = this.determineWeekdayType(calendar);
      
      // 指定された運行日種別でフィルタ
      if (weekdayType !== serviceDayType) {
        filteredCount++;
        return;
      }

      // エラーケース3: stop_sequenceのデータ不整合チェック（要件2.4）
      const stopSequence = parseInt(stopTime.stop_sequence);
      if (isNaN(stopSequence) || stopSequence < 0) {
        console.warn('TimetableController: 不正なstop_sequenceを検出しました', {
          tripId: stopTime.trip_id,
          stopId: stopTime.stop_id,
          stopSequence: stopTime.stop_sequence,
          routeId: routeId
        });
        dataErrors++;
        return; // このstop_timeをスキップ
      }

      // departure_timeをパース（HH:MM:SS形式）
      const timeMatch = stopTime.departure_time.match(/^(\d+):(\d+):(\d+)$/);
      if (!timeMatch) {
        console.warn('TimetableController: 不正なdeparture_time形式を検出しました', {
          tripId: stopTime.trip_id,
          stopId: stopTime.stop_id,
          departureTime: stopTime.departure_time,
          routeId: routeId
        });
        dataErrors++;
        return; // このstop_timeをスキップ
      }
      
      const [hour, minute, second] = timeMatch.slice(1).map(Number);
      
      // 重複チェック: trip_id + departure_timeの組み合わせで一意性を確保
      const uniqueKey = `${stopTime.trip_id}_${stopTime.departure_time}`;
      if (seenKeys.has(uniqueKey)) {
        console.warn('TimetableController: 重複データを検出しました', {
          tripId: stopTime.trip_id,
          departureTime: stopTime.departure_time,
          stopId: stopId,
          routeId: routeId
        });
        dataErrors++;
        return;
      }
      seenKeys.add(uniqueKey);
      
      // 方向情報を判定（要件1.4）
      const direction = DirectionDetector.detectDirection(trip, routeId, this.trips);
      
      timetable.push({
        stopId: stopId,
        stopName: stop.stop_name,
        routeId: routeId,
        routeName: route.route_long_name || route.route_short_name || routeId,
        tripId: stopTime.trip_id,
        tripHeadsign: trip.trip_headsign || '',
        departureTime: this.formatTime(hour, minute),
        departureHour: hour,
        departureMinute: minute,
        serviceDayType: serviceDayType,
        stopSequence: stopSequence,
        direction: direction // 方向情報を追加
      });
    });

    console.log('TimetableController: 時刻表データ構築完了', {
      serviceDayType,
      totalStopTimes: stopTimesAtStop.length,
      filteredByServiceType: filteredCount,
      dataErrors: dataErrors,
      resultCount: timetable.length
    });

    // エラーケース3: データ不整合が多い場合は警告（要件2.4）
    if (dataErrors > 0) {
      console.warn('TimetableController: データ不整合が検出されました', {
        stopId: stopId,
        routeId: routeId,
        serviceDayType: serviceDayType,
        errorCount: dataErrors,
        message: 'データに不整合があるため、一部の便が表示されていない可能性があります。'
      });
    }

    // 発車時刻順にソート
    timetable.sort((a, b) => {
      if (a.departureHour !== b.departureHour) {
        return a.departureHour - b.departureHour;
      }
      return a.departureMinute - b.departureMinute;
    });

    return timetable;
  }

  /**
   * 2つのバス停間の時刻表を取得（新規メソッド）
   * @param {string} fromStopId - 乗車バス停ID
   * @param {string} toStopId - 降車バス停ID
   * @param {string} routeId - 路線ID
   * @param {string} serviceDayType - 運行日種別（'平日' or '土日祝'）
   * @returns {Array<Object>} 時刻表データの配列
   */
  getTimetableBetweenStops(fromStopId, toStopId, routeId, serviceDayType) {
    // 入力値の検証
    if (!fromStopId || !toStopId || !routeId || !serviceDayType) {
      console.warn('TimetableController: 必須パラメータが不足しています', {
        fromStopId,
        toStopId,
        routeId,
        serviceDayType
      });
      return [];
    }

    // バス停が存在するか確認
    const fromStop = this.stopsIndex[fromStopId];
    const toStop = this.stopsIndex[toStopId];
    
    if (!fromStop) {
      console.warn('TimetableController: 存在しない乗車バス停が指定されました', { fromStopId });
      return [];
    }
    
    if (!toStop) {
      console.warn('TimetableController: 存在しない降車バス停が指定されました', { toStopId });
      return [];
    }

    // 路線が存在するか確認
    const route = this.routesIndex[routeId];
    if (!route) {
      console.warn('TimetableController: 存在しない路線が指定されました', { routeId });
      return [];
    }

    // DirectionDetectorを使用してバス停間の経路が存在するtripを検索（要件2.1, 2.2）
    const validTripIds = DirectionDetector.findTripsForRoute(
      fromStopId,
      toStopId,
      this.stopTimes,
      this.tripsIndex
    );

    // エラーケース1: バス停間に経路が存在しない場合（要件2.4）
    if (validTripIds.length === 0) {
      console.error('TimetableController: バス停間の経路が見つかりません', {
        fromStopId: fromStopId,
        fromStopName: fromStop.stop_name,
        toStopId: toStopId,
        toStopName: toStop.stop_name,
        routeId: routeId,
        routeName: route.route_long_name || route.route_short_name,
        serviceDayType: serviceDayType,
        message: '該当する便が見つかりません。別の路線または時間帯をお試しください。'
      });
      return [];
    }

    // 該当するtripの時刻表データを構築
    const timetable = [];
    const seenKeys = new Set(); // 重複チェック用のSet
    let dataErrors = 0; // データ不整合カウント

    validTripIds.forEach(tripId => {
      const trip = this.tripsIndex[tripId];
      if (!trip) {
        return;
      }

      // 路線IDでフィルタ
      if (trip.route_id !== routeId) {
        return;
      }

      // service_idから運行日種別を判定
      const calendar = this.calendarIndex[trip.service_id];
      const weekdayType = this.determineWeekdayType(calendar);
      
      // 指定された運行日種別でフィルタ
      if (weekdayType !== serviceDayType) {
        return;
      }

      // 乗車バス停のstop_timeを取得
      const fromStopTime = this.stopTimes.find(st => 
        st.trip_id === tripId && st.stop_id === fromStopId
      );

      if (!fromStopTime) {
        return;
      }

      // エラーケース3: stop_sequenceのデータ不整合チェック（要件2.4）
      const stopSequence = parseInt(fromStopTime.stop_sequence);
      if (isNaN(stopSequence) || stopSequence < 0) {
        console.warn('TimetableController: 不正なstop_sequenceを検出しました', {
          tripId: tripId,
          stopId: fromStopId,
          stopSequence: fromStopTime.stop_sequence,
          routeId: routeId
        });
        dataErrors++;
        return; // このstop_timeをスキップ
      }

      // departure_timeをパース（HH:MM:SS形式）
      const timeMatch = fromStopTime.departure_time.match(/^(\d+):(\d+):(\d+)$/);
      if (!timeMatch) {
        console.warn('TimetableController: 不正なdeparture_time形式を検出しました', {
          tripId: tripId,
          stopId: fromStopId,
          departureTime: fromStopTime.departure_time,
          routeId: routeId
        });
        dataErrors++;
        return; // このstop_timeをスキップ
      }
      
      const [hour, minute, second] = timeMatch.slice(1).map(Number);
      
      // 重複チェック: trip_id + departure_timeの組み合わせで一意性を確保
      const uniqueKey = `${tripId}_${fromStopTime.departure_time}`;
      if (seenKeys.has(uniqueKey)) {
        console.warn('TimetableController: 重複データを検出しました', {
          tripId: tripId,
          departureTime: fromStopTime.departure_time,
          fromStopId: fromStopId,
          toStopId: toStopId,
          routeId: routeId
        });
        dataErrors++;
        return;
      }
      seenKeys.add(uniqueKey);
      
      // 方向情報を判定
      const direction = DirectionDetector.detectDirection(trip, routeId, this.trips);
      
      timetable.push({
        stopId: fromStopId,
        stopName: fromStop.stop_name,
        routeId: routeId,
        routeName: route.route_long_name || route.route_short_name || routeId,
        tripId: tripId,
        tripHeadsign: trip.trip_headsign || '', // 要件3.2: 行き先を表示
        departureTime: this.formatTime(hour, minute),
        departureHour: hour,
        departureMinute: minute,
        serviceDayType: serviceDayType,
        stopSequence: stopSequence,
        direction: direction,
        toStopId: toStopId,
        toStopName: toStop.stop_name
      });
    });

    console.log('TimetableController: バス停間時刻表データ構築完了', {
      fromStopId,
      toStopId,
      routeId,
      serviceDayType,
      validTripIds: validTripIds.length,
      dataErrors: dataErrors,
      resultCount: timetable.length
    });

    // エラーケース3: データ不整合が多い場合は警告（要件2.4）
    if (dataErrors > 0) {
      console.warn('TimetableController: データ不整合が検出されました', {
        fromStopId: fromStopId,
        toStopId: toStopId,
        routeId: routeId,
        serviceDayType: serviceDayType,
        errorCount: dataErrors,
        message: 'データに不整合があるため、一部の便が表示されていない可能性があります。'
      });
    }

    // 発車時刻順にソート
    timetable.sort((a, b) => {
      if (a.departureHour !== b.departureHour) {
        return a.departureHour - b.departureHour;
      }
      return a.departureMinute - b.departureMinute;
    });

    return timetable;
  }

  /**
   * 路線の経路情報を取得（地図表示用）
   * @param {string} routeId - 路線ID
   * @param {string|null} directionOrTripId - 方向フィルタ（'0','1',null）または tripId
   * @returns {Array<Object>} バス停座標の配列
   */
  getRouteStops(routeId, directionOrTripId = null) {
    // 入力値の検証
    if (!routeId) {
      console.warn('TimetableController: routeIdが指定されていません');
      return [];
    }

    // 第2引数が方向ではなくtripIdとして渡された場合に対応（テスト/呼び出し側互換）
    const isDirection = directionOrTripId === null || directionOrTripId === '0' || directionOrTripId === '1';
    if (!isDirection && typeof directionOrTripId === 'string') {
      const tripId = directionOrTripId;
      const trip = this.tripsIndex[tripId];
      if (!trip) {
        console.warn('TimetableController: 存在しない便が指定されました', { tripId });
        return [];
      }
      if (trip.route_id !== routeId) {
        console.warn('TimetableController: 指定されたtripがrouteIdと一致しません', { routeId, tripId });
        return [];
      }
      return this.getRouteStopsForTrip(tripId);
    }

    const direction = directionOrTripId;

    // 路線が存在するか確認
    const route = this.routesIndex[routeId];
    if (!route) {
      console.warn('TimetableController: 存在しない路線が指定されました', { routeId });
      return [];
    }

    // 路線に属する全ての便を取得
    let tripsForRoute = this.trips.filter(trip => trip.route_id === routeId);
    
    if (tripsForRoute.length === 0) {
      console.warn('TimetableController: 路線に属する便が見つかりません', { routeId });
      return [];
    }

    // 方向でフィルタ（要件4.1, 4.2, 4.3）
    if (direction !== null) {
      tripsForRoute = tripsForRoute.filter(trip => {
        const tripDirection = DirectionDetector.detectDirection(trip, routeId, this.trips);
        return tripDirection === direction;
      });
      
      if (tripsForRoute.length === 0) {
        console.warn('TimetableController: 指定された方向の便が見つかりません', { 
          routeId, 
          direction 
        });
        return [];
      }
    }

    // 全ての便のバス停を収集（重複を除く）
    const stopMap = new Map();
    
    tripsForRoute.forEach(trip => {
      const tripStops = this.getRouteStopsForTrip(trip.trip_id);
      
      tripStops.forEach(stop => {
        const key = stop.stopId;
        
        // 既に存在する場合は、より詳細な情報を保持
        if (!stopMap.has(key)) {
          stopMap.set(key, {
            ...stop,
            direction: DirectionDetector.detectDirection(trip, routeId, this.trips)
          });
        }
      });
    });

    // Mapを配列に変換してstop_sequence順にソート
    const routeStops = Array.from(stopMap.values());
    routeStops.sort((a, b) => a.stopSequence - b.stopSequence);

    return routeStops;
  }

  /**
   * 特定の便の経路情報を取得
   * @param {string} tripId - 便ID
   * @returns {Array<Object>} バス停座標の配列
   * @private
   */
  getRouteStopsForTrip(tripId) {
    // 便が存在するか確認
    const trip = this.tripsIndex[tripId];
    if (!trip) {
      console.warn('TimetableController: 存在しない便が指定されました', { tripId });
      return [];
    }

    // 便に属する全てのstop_timesを取得
    const stopTimesForTrip = this.stopTimes
      .filter(st => st.trip_id === tripId)
      .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));

    if (stopTimesForTrip.length === 0) {
      console.warn('TimetableController: 便に属するstop_timesが見つかりません', { tripId });
      return [];
    }

    // バス停情報を取得
    const routeStops = [];
    let dataErrors = 0; // データ不整合カウント
    
    stopTimesForTrip.forEach(stopTime => {
      const stop = this.stopsIndex[stopTime.stop_id];
      if (!stop) {
        console.warn('TimetableController: stop_idに対応するstopが見つかりません', { 
          stopId: stopTime.stop_id,
          tripId: tripId
        });
        dataErrors++;
        return;
      }

      // エラーケース3: stop_sequenceのデータ不整合チェック（要件2.4）
      const stopSequence = parseInt(stopTime.stop_sequence);
      if (isNaN(stopSequence) || stopSequence < 0) {
        console.warn('TimetableController: 不正なstop_sequenceを検出しました', {
          tripId: tripId,
          stopId: stopTime.stop_id,
          stopSequence: stopTime.stop_sequence
        });
        dataErrors++;
        return; // このstop_timeをスキップ
      }

      // 時刻をパース
      const timeMatch = stopTime.departure_time.match(/^(\d+):(\d+):(\d+)$/);
      let formattedTime = '－';
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        formattedTime = this.formatTime(hour, minute);
      } else {
        console.warn('TimetableController: 不正なdeparture_time形式を検出しました', {
          tripId: tripId,
          stopId: stopTime.stop_id,
          departureTime: stopTime.departure_time
        });
        dataErrors++;
      }

      routeStops.push({
        stopId: stop.stop_id,
        stopName: stop.stop_name,
        stopSequence: stopSequence,
        lat: parseFloat(stop.stop_lat),
        lng: parseFloat(stop.stop_lon),
        time: formattedTime
      });
    });

    // エラーケース3: データ不整合が多い場合は警告（要件2.4）
    if (dataErrors > 0) {
      console.warn('TimetableController: 路線バス停データに不整合が検出されました', {
        tripId: tripId,
        errorCount: dataErrors,
        message: 'データに不整合があるため、一部のバス停が表示されていない可能性があります。'
      });
    }

    return routeStops;
  }

  /**
   * インデックスを作成（キーでの高速検索用）
   * @param {Array} data - データ配列
   * @param {string} key - インデックスキー
   * @returns {Object} インデックス
   * @private
   */
  createIndex(data, key) {
    const index = {};
    data.forEach(item => {
      if (item[key]) {
        index[item[key]] = item;
      }
    });
    return index;
  }

  /**
   * stop_times用のインデックスを作成（stop_id + route_idでグループ化）
   * @param {Array} stopTimes - stop_times.txtのデータ
   * @returns {Object} stop_id + route_id をキーとするインデックス
   * @private
   */
  createStopTimesIndex(stopTimes) {
    const index = {};
    
    stopTimes.forEach(stopTime => {
      const trip = this.tripsIndex[stopTime.trip_id];
      if (!trip) {
        return;
      }

      const key = `${stopTime.stop_id}_${trip.route_id}`;
      
      if (!index[key]) {
        index[key] = [];
      }
      
      index[key].push(stopTime);
    });

    return index;
  }

  /**
   * カレンダー情報から曜日区分を判定
   * @param {Object} calendar - calendar.txtの1レコード
   * @returns {string} 曜日区分（'平日' or '土日祝'）
   * @private
   */
  determineWeekdayType(calendar) {
    if (!calendar) {
      return '平日';
    }

    // service_idに「平日」「土日祝」などのキーワードが含まれているか確認
    const serviceId = calendar.service_id.toLowerCase();
    if (serviceId.includes('土日祝') || serviceId.includes('土曜') || serviceId.includes('日曜')) {
      return '土日祝';
    }

    // monday-fridayが1で、saturday-sundayが0なら平日
    if (calendar.monday === '1' && calendar.friday === '1' && 
        calendar.saturday === '0' && calendar.sunday === '0') {
      return '平日';
    }

    // saturday-sundayが1なら土日祝
    if (calendar.saturday === '1' || calendar.sunday === '1') {
      return '土日祝';
    }

    // デフォルトは平日
    return '平日';
  }

  /**
   * 時刻フォーマット（HH:MM形式）
   * 深夜便（25:00以降）も正しく表示
   * @param {number} hour - 時（0-29）
   * @param {number} minute - 分（0-59）
   * @returns {string} フォーマットされた時刻
   * @private
   */
  formatTime(hour, minute) {
    // 25:00以降の深夜便は「翌XX:XX」形式で表示
    if (hour >= 24) {
      const nextDayHour = hour - 24;
      return `翌${String(nextDayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  /**
   * データを更新
   * @param {Array} stopTimes - 新しい停車時刻データ
   * @param {Array} trips - 新しい便データ
   * @param {Array} routes - 新しい路線データ
   * @param {Array} calendar - 新しい運行カレンダーデータ
   * @param {Array} stops - 新しいバス停データ
   */
  updateData(stopTimes, trips, routes, calendar, stops) {
    this.stopTimes = stopTimes;
    this.trips = trips;
    this.routes = routes;
    this.calendar = calendar;
    this.stops = stops;
    
    // インデックスを再作成
    this.tripsIndex = this.createIndex(trips, 'trip_id');
    this.routesIndex = this.createIndex(routes, 'route_id');
    this.calendarIndex = this.createIndex(calendar, 'service_id');
    this.stopsIndex = this.createIndex(stops, 'stop_id');
    this.stopTimesIndex = this.createStopTimesIndex(stopTimes);
  }
}

// グローバルに公開
window.TimetableController = TimetableController;
