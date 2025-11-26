/**
 * DirectionDetectorクラス
 * GTFSデータから路線の方向（往路/復路）を判定するユーティリティ
 */
class DirectionDetector {
  // 方向判定結果のキャッシュ（静的プロパティ）
  static directionCache = new Map();
  /**
   * 方向判定結果をキャッシュ（新規メソッド）
   * @param {string} routeId - 路線ID
   * @param {Map<string, string>} directionMap - tripIdから方向へのマッピング
   */
  static cacheDirectionResult(routeId, directionMap) {
    this.directionCache.set(routeId, directionMap);
  }

  /**
   * キャッシュから方向判定結果を取得（新規メソッド）
   * @param {string} routeId - 路線ID
   * @returns {Map<string, string>|null} tripIdから方向へのマッピング、またはnull
   */
  static getCachedDirectionResult(routeId) {
    return this.directionCache.get(routeId) || null;
  }

  /**
   * tripの方向を判定
   * @param {Object} trip - trips.txtの1レコード
   * @param {string} routeId - 路線ID
   * @param {Array} allTrips - 同じ路線の全てのtrip
   * @returns {string} 方向識別子（'0'=往路, '1'=復路, 'unknown'=不明）
   */
  static detectDirection(trip, routeId, allTrips) {
    // 1. direction_idが設定されている場合はそれを使用（要件1.1）
    // 空文字列、null、undefinedを全て無効な値として扱う（厳密化）
    if (trip.direction_id !== '' && trip.direction_id !== null && trip.direction_id !== undefined) {
      return trip.direction_id;
    }

    // 2. trip_headsignから方向を推測（要件1.2, 1.3）
    // 同じ路線の全てのtripを取得
    const tripsForRoute = allTrips.filter(t => t.route_id === routeId);

    // trip_headsignでグループ化（Mapを使用してプロトタイプ汚染を回避）
    const headsignGroups = new Map();
    tripsForRoute.forEach(t => {
      const headsign = t.trip_headsign || 'unknown';
      if (!headsignGroups.has(headsign)) {
        headsignGroups.set(headsign, []);
      }
      headsignGroups.get(headsign).push(t);
    });

    // 2つ以上のグループがある場合、それぞれを異なる方向として扱う
    const headsigns = Array.from(headsignGroups.keys());
    if (headsigns.length >= 2) {
      // 最初のグループを'0'、2番目を'1'とする
      const headsign = trip.trip_headsign || 'unknown';
      return headsigns.indexOf(headsign) === 0 ? '0' : '1';
    }

    // 3. headsignベースの判定が失敗した場合、停留所順序から方向を推測（要件1.2）
    // エラーケース2: 方向判定ができない場合の警告ログ（要件2.4）
    if (headsigns.length === 1 && headsigns[0] === 'unknown') {
      console.warn('DirectionDetector: trip_headsignが空のため、停留所順序から方向を推測します', {
        tripId: trip.trip_id,
        routeId: routeId,
        headsigns: headsigns
      });
    } else if (headsigns.length === 1) {
      console.warn('DirectionDetector: 全てのtripが同じtrip_headsignのため、停留所順序から方向を推測します', {
        tripId: trip.trip_id,
        routeId: routeId,
        headsign: headsigns[0],
        tripCount: tripsForRoute.length
      });
    }
    
    // 停留所順序ベースの判定を試行（要件1.2）
    // 注意: この時点ではstopTimesデータが利用できない可能性があるため、
    // detectDirectionByStopSequence()は別途呼び出す必要がある
    // ここでは'unknown'を返し、呼び出し側でstopTimesを使用して判定する
    return 'unknown';
  }

  /**
   * 停留所順序から方向を推測（新規メソッド）
   * @param {string} routeId - 路線ID
   * @param {Array} trips - 同じ路線の全てのtrip
   * @param {Array} stopTimes - stop_times.txtのデータ
   * @returns {Map<string, string>} tripIdから方向へのマッピング
   */
  static detectDirectionByStopSequence(routeId, trips, stopTimes) {
    // キャッシュチェック（要件1.4）
    const cached = this.getCachedDirectionResult(routeId);
    if (cached) {
      return cached;
    }

    // 1. 各tripの最初と最後の停留所を取得
    const tripEndpoints = trips.map(trip => {
      const tripStopTimes = stopTimes
        .filter(st => st.trip_id === trip.trip_id)
        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
      
      if (tripStopTimes.length === 0) return null;
      
      return {
        tripId: trip.trip_id,
        firstStop: tripStopTimes[0].stop_id,
        lastStop: tripStopTimes[tripStopTimes.length - 1].stop_id
      };
    }).filter(ep => ep !== null);

    // 2. 始点・終点の組み合わせでグループ化
    const endpointGroups = new Map();
    tripEndpoints.forEach(ep => {
      const key = `${ep.firstStop}-${ep.lastStop}`;
      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, []);
      }
      endpointGroups.get(key).push(ep.tripId);
    });

    // 3. 2つ以上のグループがある場合、それぞれを異なる方向として扱う（要件1.3）
    const directionMap = new Map();
    
    if (endpointGroups.size >= 2) {
      const keys = Array.from(endpointGroups.keys());
      
      keys.forEach((key, index) => {
        const direction = index === 0 ? '0' : '1';
        endpointGroups.get(key).forEach(tripId => {
          directionMap.set(tripId, direction);
        });
      });
      
      // 結果をキャッシュ（要件1.4）
      this.cacheDirectionResult(routeId, directionMap);
      
      return directionMap;
    }

    // 4. 判定できない場合は空のMapを返す
    console.warn('DirectionDetector: 停留所順序から方向を判定できません', {
      routeId: routeId,
      endpointGroupsCount: endpointGroups.size,
      tripCount: trips.length
    });
    
    return directionMap;
  }

  /**
   * 2つのバス停間の経路が存在するtripを検索
   * @param {string} fromStopId - 乗車バス停ID
   * @param {string} toStopId - 降車バス停ID
   * @param {Array} stopTimes - stop_times.txtのデータ
   * @param {Object} tripsIndex - trip_idでインデックス化されたtrips
   * @returns {Array<string>} 該当するtrip_idの配列
   */
  static findTripsForRoute(fromStopId, toStopId, stopTimes, tripsIndex) {
    // 1. 乗車バス停に停車する全てのstop_timesを取得（要件2.1）
    const fromStopTimes = stopTimes.filter(st => st.stop_id === fromStopId);

    if (fromStopTimes.length === 0) {
      console.warn('DirectionDetector: 乗車バス停に停車する便が見つかりません', {
        fromStopId: fromStopId
      });
    }

    // 2. 各stop_timeについて、同じtripで降車バス停に停車するか確認（要件2.2）
    const validTripIds = [];
    const sequenceErrors = []; // データ不整合を記録

    fromStopTimes.forEach(fromSt => {
      // エラーケース3: stop_sequenceのデータ不整合チェック（要件2.4）
      const fromSequence = parseInt(fromSt.stop_sequence);
      if (isNaN(fromSequence) || fromSequence < 0) {
        sequenceErrors.push({
          tripId: fromSt.trip_id,
          stopId: fromSt.stop_id,
          stopSequence: fromSt.stop_sequence,
          reason: '不正なstop_sequence値'
        });
        return; // このstop_timeをスキップ
      }

      // 同じtripで降車バス停に停車するstop_timeを検索
      const toSt = stopTimes.find(st => 
        st.trip_id === fromSt.trip_id && 
        st.stop_id === toStopId
      );

      if (toSt) {
        const toSequence = parseInt(toSt.stop_sequence);
        
        // エラーケース3: stop_sequenceのデータ不整合チェック（要件2.4）
        if (isNaN(toSequence) || toSequence < 0) {
          sequenceErrors.push({
            tripId: toSt.trip_id,
            stopId: toSt.stop_id,
            stopSequence: toSt.stop_sequence,
            reason: '不正なstop_sequence値'
          });
          return; // このstop_timeをスキップ
        }

        // stop_sequenceの順序チェック
        if (toSequence > fromSequence) {
          validTripIds.push(fromSt.trip_id);
        }
      }
    });

    // エラーケース3: データ不整合の警告ログ出力（要件2.4）
    if (sequenceErrors.length > 0) {
      console.warn('DirectionDetector: stop_sequenceのデータ不整合を検出しました', {
        fromStopId: fromStopId,
        toStopId: toStopId,
        errorCount: sequenceErrors.length,
        errors: sequenceErrors.slice(0, 5) // 最初の5件のみ表示
      });
    }

    // エラーケース1: バス停間に経路が存在しない場合のログ出力（要件2.4）
    if (validTripIds.length === 0) {
      console.warn('DirectionDetector: バス停間の経路が見つかりません', {
        fromStopId: fromStopId,
        toStopId: toStopId,
        fromStopTimesCount: fromStopTimes.length,
        sequenceErrorCount: sequenceErrors.length
      });
    }

    // 3. 重複を除去
    return [...new Set(validTripIds)];
  }
}

// グローバルに公開
if (typeof window !== 'undefined') {
  window.DirectionDetector = DirectionDetector;
}

// Node.js環境用のエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DirectionDetector;
}
