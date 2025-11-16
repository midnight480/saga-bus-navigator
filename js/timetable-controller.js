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
   * @returns {Array<Object>} 時刻表データの配列
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
    let filteredCount = 0;
    
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

      // departure_timeをパース（HH:MM:SS形式）
      const [hour, minute, second] = stopTime.departure_time.split(':').map(Number);
      
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
        stopSequence: parseInt(stopTime.stop_sequence)
      });
    });

    console.log('TimetableController: 時刻表データ構築完了', {
      serviceDayType,
      totalStopTimes: stopTimesAtStop.length,
      filteredByServiceType: filteredCount,
      resultCount: timetable.length
    });

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
   * @param {string} tripId - 便ID（オプション）
   * @returns {Array<Object>} バス停座標の配列
   */
  getRouteStops(routeId, tripId = null) {
    // 入力値の検証
    if (!routeId) {
      console.warn('TimetableController: routeIdが指定されていません');
      return [];
    }

    // 路線が存在するか確認
    const route = this.routesIndex[routeId];
    if (!route) {
      console.warn('TimetableController: 存在しない路線が指定されました', { routeId });
      return [];
    }

    // tripIdが指定されている場合は、その便の経路を取得
    if (tripId) {
      return this.getRouteStopsForTrip(tripId);
    }

    // tripIdが指定されていない場合は、路線の代表的な便を選択
    // 路線に属する最初の便を使用
    const tripsForRoute = this.trips.filter(trip => trip.route_id === routeId);
    
    if (tripsForRoute.length === 0) {
      console.warn('TimetableController: 路線に属する便が見つかりません', { routeId });
      return [];
    }

    // 最初の便の経路を取得
    return this.getRouteStopsForTrip(tripsForRoute[0].trip_id);
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
    
    stopTimesForTrip.forEach(stopTime => {
      const stop = this.stopsIndex[stopTime.stop_id];
      if (!stop) {
        console.warn('TimetableController: stop_idに対応するstopが見つかりません', { 
          stopId: stopTime.stop_id 
        });
        return;
      }

      // 時刻をパース
      const timeMatch = stopTime.departure_time.match(/^(\d+):(\d+):(\d+)$/);
      let formattedTime = '－';
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const minute = parseInt(timeMatch[2]);
        formattedTime = this.formatTime(hour, minute);
      }

      routeStops.push({
        stopId: stop.stop_id,
        stopName: stop.stop_name,
        stopSequence: parseInt(stopTime.stop_sequence),
        lat: parseFloat(stop.stop_lat),
        lng: parseFloat(stop.stop_lon),
        time: formattedTime
      });
    });

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
