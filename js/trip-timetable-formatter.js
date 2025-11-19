/**
 * TripTimetableFormatterクラス
 * 便の時刻表データの取得、フォーマット、HTML生成を担当
 */
class TripTimetableFormatter {
  /**
   * コンストラクタ
   * @param {DataLoader} dataLoader - DataLoaderインスタンス
   */
  constructor(dataLoader) {
    this.dataLoader = dataLoader;
    
    // LRU方式のキャッシュ（最大100件）
    this.cache = new Map();
    this.maxCacheSize = 100;
  }

  /**
   * 時刻表データを取得
   * @param {string} tripId - 便ID
   * @returns {Object|null} 時刻表データオブジェクト、エラーの場合はnull
   */
  getTimetableData(tripId) {
    try {
      // DataLoaderが初期化されているかチェック
      if (!this.dataLoader) {
        console.error('[TripTimetableFormatter] DataLoaderが初期化されていません');
        return null;
      }

      // GTFSデータが読み込まれているかチェック
      if (!this.dataLoader.stopTimes || !this.dataLoader.trips || 
          !this.dataLoader.routes || !this.dataLoader.gtfsStops) {
        console.error('[TripTimetableFormatter] GTFSデータが読み込まれていません');
        return null;
      }

      // trip_idでstopTimesをフィルタ
      const stopTimes = this.dataLoader.stopTimes.filter(
        st => st.trip_id === tripId
      );

      if (stopTimes.length === 0) {
        console.error(`[TripTimetableFormatter] trip_id=${tripId}に対応するstop_timesデータが見つかりません`);
        return null;
      }

      // stop_sequenceの昇順でソート
      stopTimes.sort((a, b) => {
        const seqA = parseInt(a.stop_sequence);
        const seqB = parseInt(b.stop_sequence);
        return seqA - seqB;
      });

      // trip情報を取得
      const trip = this.dataLoader.trips.find(t => t.trip_id === tripId);
      if (!trip) {
        console.error(`[TripTimetableFormatter] trip_id=${tripId}に対応するtripsデータが見つかりません`);
        return null;
      }

      // route情報を取得
      const route = this.dataLoader.routes.find(r => r.route_id === trip.route_id);
      const routeName = route ? route.route_long_name : '路線名不明';

      // 各stop_idに対応するバス停名を取得
      const stops = stopTimes.map(st => ({
        stopId: st.stop_id,
        stopName: this.getStopName(st.stop_id),
        stopSequence: parseInt(st.stop_sequence),
        arrivalTime: st.arrival_time,
        formattedTime: this.formatArrivalTime(st.arrival_time)
      }));

      return {
        tripId: tripId,
        routeId: trip.route_id,
        routeName: routeName,
        stops: stops,
        totalStops: stops.length
      };
    } catch (error) {
      console.error(`[TripTimetableFormatter] 時刻表データ取得エラー: trip_id=${tripId}`, error.message);
      return null;
    }
  }

  /**
   * バス停名を取得
   * @param {string} stopId - バス停ID
   * @returns {string} バス停名、存在しない場合は「バス停名不明」
   */
  getStopName(stopId) {
    try {
      if (!this.dataLoader || !this.dataLoader.gtfsStops) {
        return 'バス停名不明';
      }

      const stop = this.dataLoader.gtfsStops.find(s => s.stop_id === stopId);
      return stop ? stop.stop_name : 'バス停名不明';
    } catch (error) {
      console.error(`[TripTimetableFormatter] バス停名取得エラー: stop_id=${stopId}`, error.message);
      return 'バス停名不明';
    }
  }

  /**
   * 到着時刻をHH:MM形式にフォーマット
   * @param {string} arrivalTime - 到着時刻（HH:MM:SS形式）
   * @returns {string} フォーマットされた時刻（HH:MM形式）、不正な場合は「--:--」
   */
  formatArrivalTime(arrivalTime) {
    try {
      if (!arrivalTime || typeof arrivalTime !== 'string') {
        return '--:--';
      }

      const parts = arrivalTime.split(':');
      if (parts.length < 2) {
        return '--:--';
      }

      const hour = parts[0].padStart(2, '0');
      const minute = parts[1].padStart(2, '0');

      return `${hour}:${minute}`;
    } catch (error) {
      console.error(`[TripTimetableFormatter] 時刻フォーマットエラー: arrivalTime=${arrivalTime}`, error.message);
      return '--:--';
    }
  }

  /**
   * 時刻表をテキスト形式でフォーマット
   * @param {string} tripId - 便ID
   * @param {Object} options - オプション
   * @returns {string} フォーマットされた時刻表テキスト
   */
  formatTimetableText(tripId, options = {}) {
    try {
      const timetableData = this.getTimetableData(tripId);
      if (!timetableData) {
        return '時刻表情報が取得できません';
      }

      const { currentStopSequence = null, highlightCurrent = true } = options;

      // 各停車バス停を「バス停名（到着HH:MM）」形式で生成
      const stopTexts = timetableData.stops.map(stop => {
        const text = `${stop.stopName}（${stop.formattedTime}）`;
        
        // 現在位置の強調表示
        if (highlightCurrent && currentStopSequence !== null && 
            stop.stopSequence === currentStopSequence) {
          return `**${text}**`;
        }
        
        return text;
      });

      // 矢印（→）で区切って結合
      return stopTexts.join(' → ');
    } catch (error) {
      console.error(`[TripTimetableFormatter] 時刻表テキストフォーマットエラー: trip_id=${tripId}`, error.message);
      return '時刻表情報の取得に失敗しました';
    }
  }

  /**
   * 時刻表をHTML形式でフォーマット
   * @param {string} tripId - 便ID
   * @param {Object} options - オプション
   * @returns {string} フォーマットされた時刻表HTML
   */
  formatTimetableHTML(tripId, options = {}) {
    const startTime = Date.now();
    
    try {
      // キャッシュチェック
      const cached = this.getCachedTimetable(tripId);
      if (cached && !options.currentStopSequence) {
        console.log(`[TripTimetableFormatter] キャッシュから時刻表を取得: tripId=${tripId}`);
        return cached;
      }

      const timetableData = this.getTimetableData(tripId);
      if (!timetableData) {
        return '<div class="trip-timetable"><p>時刻表情報が取得できません</p></div>';
      }

      const {
        currentStopSequence = null,
        collapsed = timetableData.totalStops > 10,
        showRouteInfo = true,
        maxVisibleStops = 6,
        highlightCurrent = true
      } = options;

      // ヘッダーHTML生成
      let headerHTML = '<div class="timetable-header"><strong>時刻表</strong>';
      if (showRouteInfo) {
        headerHTML += `<span class="route-info">便ID: ${tripId} | 路線: ${timetableData.routeName}</span>`;
      }
      headerHTML += '</div>';

      // 停車バス停のHTML生成
      let stopsHTML = '';
      const stops = timetableData.stops;
      
      if (collapsed && stops.length > 10) {
        // 折りたたみ状態：最初の3停車と最後の3停車のみ表示
        const firstStops = stops.slice(0, 3);
        const lastStops = stops.slice(-3);
        
        stopsHTML = this._generateCollapsedStopsHTML(firstStops, lastStops, currentStopSequence, highlightCurrent);
      } else {
        // 展開状態：全停車バス停を表示
        stopsHTML = this._generateStopsHTML(stops, currentStopSequence, highlightCurrent, false);
      }

      // 折りたたみリンク
      let toggleHTML = '';
      if (timetableData.totalStops > 10) {
        if (collapsed) {
          toggleHTML = `<a href="#" class="timetable-toggle" data-action="expand">時刻表を表示（全${timetableData.totalStops}停車）</a>`;
        } else {
          toggleHTML = `<a href="#" class="timetable-toggle" data-action="collapse">時刻表を折りたたむ</a>`;
        }
      }

      // 完全なHTML生成
      const html = `
        <div class="trip-timetable">
          ${headerHTML}
          <div class="timetable-content" data-collapsed="${collapsed}">
            <div class="timetable-stops">
              ${stopsHTML}
            </div>
            ${toggleHTML}
          </div>
        </div>
      `;

      // キャッシュに保存（現在位置指定がない場合のみ）
      if (!currentStopSequence) {
        this.cacheTimetable(tripId, html);
      }

      const endTime = Date.now();
      console.log(`[TripTimetableFormatter] 時刻表生成完了: tripId=${tripId}, duration=${endTime - startTime}ms`);

      return html;
    } catch (error) {
      console.error(`[TripTimetableFormatter] 時刻表HTML生成エラー: trip_id=${tripId}`, error.message);
      return '<div class="trip-timetable"><p>時刻表情報の取得に失敗しました</p></div>';
    }
  }

  /**
   * 停車バス停のHTMLを生成（内部ヘルパー）
   * @param {Array} stops - 停車バス停配列
   * @param {number|null} currentStopSequence - 現在位置の停車順序
   * @param {boolean} highlightCurrent - 現在位置を強調表示するか
   * @param {boolean} showEllipsis - 省略記号を表示するか
   * @returns {string} 停車バス停のHTML
   */
  _generateStopsHTML(stops, currentStopSequence, highlightCurrent, showEllipsis) {
    let html = '';
    
    stops.forEach((stop, index) => {
      const isCurrent = highlightCurrent && currentStopSequence !== null && 
                       stop.stopSequence === currentStopSequence;
      
      const stopClass = isCurrent ? 'stop-item current-stop' : 'stop-item';
      const currentMarker = isCurrent ? '<span class="current-marker">← 現在地</span>' : '';
      
      html += `<span class="${stopClass}">${stop.stopName}（${stop.formattedTime}）${currentMarker}</span>`;
      
      // 矢印を追加（最後の要素以外）
      if (index < stops.length - 1) {
        html += '<span class="stop-arrow">→</span>';
      }
    });
    
    return html;
  }

  /**
   * 折りたたみ時の停車バス停HTMLを生成（内部ヘルパー）
   * @param {Array} firstStops - 最初の停車バス停配列
   * @param {Array} lastStops - 最後の停車バス停配列
   * @param {number|null} currentStopSequence - 現在位置の停車順序
   * @param {boolean} highlightCurrent - 現在位置を強調表示するか
   * @returns {string} 停車バス停のHTML
   */
  _generateCollapsedStopsHTML(firstStops, lastStops, currentStopSequence, highlightCurrent) {
    let html = '';
    
    // 最初の3停車を生成
    firstStops.forEach((stop, index) => {
      const isCurrent = highlightCurrent && currentStopSequence !== null && 
                       stop.stopSequence === currentStopSequence;
      
      const stopClass = isCurrent ? 'stop-item current-stop' : 'stop-item';
      const currentMarker = isCurrent ? '<span class="current-marker">← 現在地</span>' : '';
      
      html += `<span class="${stopClass}">${stop.stopName}（${stop.formattedTime}）${currentMarker}</span>`;
      html += '<span class="stop-arrow">→</span>';
    });
    
    // 省略記号を追加
    html += '<span class="stop-item">...</span>';
    html += '<span class="stop-arrow">→</span>';
    
    // 最後の3停車を生成
    lastStops.forEach((stop, index) => {
      const isCurrent = highlightCurrent && currentStopSequence !== null && 
                       stop.stopSequence === currentStopSequence;
      
      const stopClass = isCurrent ? 'stop-item current-stop' : 'stop-item';
      const currentMarker = isCurrent ? '<span class="current-marker">← 現在地</span>' : '';
      
      html += `<span class="${stopClass}">${stop.stopName}（${stop.formattedTime}）${currentMarker}</span>`;
      
      // 最後の要素以外は矢印を追加
      if (index < lastStops.length - 1) {
        html += '<span class="stop-arrow">→</span>';
      }
    });
    
    return html;
  }

  /**
   * 現在位置のバス停インデックスを取得
   * @param {string} tripId - 便ID
   * @param {number} currentStopSequence - 現在位置の停車順序
   * @returns {number} 現在位置のインデックス、見つからない場合は-1
   */
  getCurrentStopIndex(tripId, currentStopSequence) {
    try {
      const timetableData = this.getTimetableData(tripId);
      if (!timetableData) {
        return -1;
      }

      const index = timetableData.stops.findIndex(
        stop => stop.stopSequence === currentStopSequence
      );

      return index;
    } catch (error) {
      console.error(`[TripTimetableFormatter] 現在位置取得エラー: trip_id=${tripId}`, error.message);
      return -1;
    }
  }

  /**
   * 時刻表をキャッシュに保存（LRU方式）
   * @param {string} tripId - 便ID
   * @param {string} html - 時刻表HTML
   */
  cacheTimetable(tripId, html) {
    try {
      // キャッシュサイズが上限に達している場合、最も古いエントリを削除
      if (this.cache.size >= this.maxCacheSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      // 新しいエントリを追加
      this.cache.set(tripId, html);
    } catch (error) {
      console.error(`[TripTimetableFormatter] キャッシュ保存エラー: trip_id=${tripId}`, error.message);
    }
  }

  /**
   * キャッシュから時刻表を取得
   * @param {string} tripId - 便ID
   * @returns {string|null} キャッシュされた時刻表HTML、存在しない場合はnull
   */
  getCachedTimetable(tripId) {
    try {
      if (this.cache.has(tripId)) {
        // LRU: アクセスされたエントリを最後に移動
        const html = this.cache.get(tripId);
        this.cache.delete(tripId);
        this.cache.set(tripId, html);
        return html;
      }
      return null;
    } catch (error) {
      console.error(`[TripTimetableFormatter] キャッシュ取得エラー: trip_id=${tripId}`, error.message);
      return null;
    }
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
    console.log('[TripTimetableFormatter] キャッシュをクリアしました');
  }
}

// グローバルに公開
window.TripTimetableFormatter = TripTimetableFormatter;
