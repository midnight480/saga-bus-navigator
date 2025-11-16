/**
 * RealtimeVehicleController - リアルタイム車両位置と運行情報の表示制御
 * 
 * 責務:
 * - 車両位置情報の処理と表示
 * - 運行状態の判定（運行開始前/運行中/運行終了/遅延）
 * - 運行情報（運休・遅延）の表示
 * - MapControllerとの連携
 */
class RealtimeVehicleController {
  /**
   * コンストラクタ
   * @param {MapController} mapController - 地図コントローラー
   * @param {DataLoader} dataLoader - データローダー
   * @param {RealtimeDataLoader} realtimeDataLoader - リアルタイムデータローダー
   */
  constructor(mapController, dataLoader, realtimeDataLoader) {
    // 依存オブジェクト
    this.mapController = mapController;
    this.dataLoader = dataLoader;
    this.realtimeDataLoader = realtimeDataLoader;
    
    // 車両マーカー管理用のMap (tripId -> marker)
    this.vehicleMarkers = new Map();
    
    // 最終更新時刻の管理用のMap (tripId -> timestamp)
    this.lastUpdateTimes = new Map();
    
    // 静的データ（trips.txt, stops.txt）
    this.trips = null;
    this.stops = null;
    this.stopTimes = null;
    
    // 運行情報表示エリア
    this.alertsContainer = null;
    
    console.log('[RealtimeVehicleController] コンストラクタが呼び出されました');
  }
  
  /**
   * 初期化処理
   * DataLoaderから静的データを取得し、RealtimeDataLoaderのイベントリスナーを設定
   */
  async initialize() {
    try {
      console.log('[RealtimeVehicleController] 初期化を開始します');
      
      // DataLoaderから静的データ(trips.txt, stops.txt, stop_times.txt)を取得
      await this.dataLoader.loadGTFSData();
      
      this.trips = this.dataLoader.trips;
      this.stops = this.dataLoader.gtfsStops; // 生のstops.txtデータ（stop_idプロパティを持つ）
      this.stopTimes = this.dataLoader.stopTimes;
      
      console.log('[RealtimeVehicleController] 静的データを読み込みました', {
        tripsCount: this.trips ? this.trips.length : 0,
        stopsCount: this.stops ? this.stops.length : 0,
        stopTimesCount: this.stopTimes ? this.stopTimes.length : 0
      });
      
      // 運行情報表示エリアを作成
      this.createAlertsContainer();
      
      // RealtimeDataLoaderのイベントリスナーを設定
      this.setupEventListeners();
      
      // RealtimeDataLoaderを初期化してポーリングを開始
      await this.realtimeDataLoader.initialize();
      
      console.log('[RealtimeVehicleController] 初期化が完了しました');
      
    } catch (error) {
      console.error('[RealtimeVehicleController] 初期化に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * RealtimeDataLoaderのイベントリスナーを設定
   */
  setupEventListeners() {
    // vehiclePositionsUpdatedイベントのハンドラーを登録
    this.realtimeDataLoader.addEventListener('vehiclePositionsUpdated', (data) => {
      this.handleVehiclePositionsUpdate(data);
    });
    
    // tripUpdatesUpdatedイベントのハンドラーを登録
    this.realtimeDataLoader.addEventListener('tripUpdatesUpdated', (data) => {
      this.handleTripUpdatesUpdate(data);
    });
    
    // alertsUpdatedイベントのハンドラーを登録
    this.realtimeDataLoader.addEventListener('alertsUpdated', (data) => {
      this.handleAlertsUpdate(data);
    });
    
    console.log('[RealtimeVehicleController] イベントリスナーを設定しました');
  }
  
  /**
   * 運行情報表示エリアを作成
   */
  createAlertsContainer() {
    // 既存のコンテナがあれば削除
    const existingContainer = document.getElementById('realtime-alerts-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // 新しいコンテナを作成
    const container = document.createElement('div');
    container.id = 'realtime-alerts-container';
    container.className = 'realtime-alerts-container';
    container.style.display = 'none'; // 初期状態は非表示
    
    // 地図コンテナの上部に挿入
    const mapContainer = document.getElementById('map');
    if (mapContainer && mapContainer.parentNode) {
      mapContainer.parentNode.insertBefore(container, mapContainer);
    }
    
    this.alertsContainer = container;
    
    console.log('[RealtimeVehicleController] 運行情報表示エリアを作成しました');
  }
  
  /**
   * 車両位置情報更新ハンドラー
   * @param {Array} vehiclePositions - 車両位置情報の配列
   */
  handleVehiclePositionsUpdate(vehiclePositions) {
    if (!vehiclePositions || !Array.isArray(vehiclePositions)) {
      console.log('[RealtimeVehicleController] 車両位置情報がありません');
      return;
    }
    
    console.log('[RealtimeVehicleController] 車両位置情報が更新されました:', vehiclePositions.length);
    
    if (vehiclePositions.length === 0) {
      console.log('[RealtimeVehicleController] 車両位置情報がありません');
      return;
    }
    
    // 各車両データをループ処理
    vehiclePositions.forEach(vehicleData => {
      try {
        // trip_idを使用して静的データ(trips.txt)と突合
        const trip = this.trips.find(t => t.trip_id === vehicleData.tripId);
        
        if (!trip) {
          console.warn('[RealtimeVehicleController] trip_idが静的データに存在しません:', vehicleData.tripId);
          return;
        }
        
        // 車両の運行状態を判定 (運行開始前/運行中/運行終了)
        const status = this.determineVehicleStatus(vehicleData, trip);
        
        // updateVehicleMarker()を呼び出してマーカーを更新
        this.updateVehicleMarker(vehicleData, trip, status);
        
      } catch (error) {
        console.error('[RealtimeVehicleController] 車両位置情報の処理に失敗しました:', error, vehicleData);
      }
    });
    
    // 古い車両マーカーを削除（30秒以上更新がないもの）
    this.removeStaleVehicleMarkers();
  }
  
  /**
   * 車両マーカーの作成・更新処理
   * @param {Object} vehicleData - 車両位置情報
   * @param {Object} trip - 便情報（trips.txt）
   * @param {Object} status - 運行状態
   */
  updateVehicleMarker(vehicleData, trip, status) {
    const tripId = vehicleData.tripId;
    let lat, lng;
    
    // 運行状態に応じて座標を決定
    if (status.state === 'before_start') {
      // 運行開始前: stop_times.txtから最初のstop_idを取得し、stops.txtから座標を取得
      const firstStopTime = this.stopTimes
        .filter(st => st.trip_id === tripId)
        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence))[0];
      
      if (!firstStopTime) {
        console.warn('[RealtimeVehicleController] 最初のstop_timeが見つかりません:', tripId);
        return;
      }
      
      const stop = this.stops.find(s => s.stop_id === firstStopTime.stop_id);
      if (!stop) {
        console.warn('[RealtimeVehicleController] バス停が見つかりません:', firstStopTime.stop_id);
        return;
      }
      
      lat = parseFloat(stop.stop_lat);
      lng = parseFloat(stop.stop_lon);
      
    } else if (status.state === 'after_end') {
      // 運行終了: stop_times.txtから最後のstop_idを取得し、stops.txtから座標を取得
      const lastStopTime = this.stopTimes
        .filter(st => st.trip_id === tripId)
        .sort((a, b) => parseInt(b.stop_sequence) - parseInt(a.stop_sequence))[0];
      
      if (!lastStopTime) {
        console.warn('[RealtimeVehicleController] 最後のstop_timeが見つかりません:', tripId);
        return;
      }
      
      const stop = this.stops.find(s => s.stop_id === lastStopTime.stop_id);
      if (!stop) {
        console.warn('[RealtimeVehicleController] バス停が見つかりません:', lastStopTime.stop_id);
        return;
      }
      
      lat = parseFloat(stop.stop_lat);
      lng = parseFloat(stop.stop_lon);
      
    } else {
      // 運行中: vehicle.pbの緯度・経度を使用
      lat = vehicleData.latitude;
      lng = vehicleData.longitude;
    }
    
    // 座標の妥当性チェック
    if (!this.isValidCoordinate(lat, lng)) {
      console.warn('[RealtimeVehicleController] 不正な座標:', { lat, lng, tripId });
      return;
    }
    
    // 既存マーカーがある場合は位置を更新、ない場合は新規作成
    const existingMarker = this.vehicleMarkers.get(tripId);
    
    if (existingMarker) {
      // MapController.updateVehicleMarkerPosition()を呼び出す
      this.mapController.updateVehicleMarkerPosition(existingMarker, lat, lng, status);
    } else {
      // MapController.createVehicleMarker()を呼び出す
      const marker = this.mapController.createVehicleMarker(lat, lng, status, {
        tripId: tripId,
        routeId: trip.route_id,
        vehicleId: vehicleData.vehicleId,
        vehicleLabel: vehicleData.vehicleLabel
      });
      
      if (marker) {
        this.vehicleMarkers.set(tripId, marker);
      }
    }
    
    // 最終更新時刻を記録
    this.lastUpdateTimes.set(tripId, Date.now());
  }
  
  /**
   * 座標の妥当性をチェック
   * @param {number} lat - 緯度
   * @param {number} lng - 経度
   * @returns {boolean} 座標が妥当な場合true
   */
  isValidCoordinate(lat, lng) {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }
  
  /**
   * 遅延時間の計算
   * @param {Object} vehicleData - 車両位置情報
   * @param {Object} trip - 便情報（trips.txt）
   * @returns {number|null} 遅延時間（分単位）、取得できない場合はnull
   */
  calculateDelay(vehicleData, trip) {
    const tripId = vehicleData.tripId;
    
    // route.pbからdelay値を取得（秒単位）
    if (this.tripUpdates && this.tripUpdates.length > 0) {
      const tripUpdate = this.tripUpdates.find(tu => tu.tripId === tripId);
      
      if (tripUpdate && tripUpdate.stopTimeUpdates && tripUpdate.stopTimeUpdates.length > 0) {
        // 最新のstop_time_updateからdelay値を取得
        const latestUpdate = tripUpdate.stopTimeUpdates[tripUpdate.stopTimeUpdates.length - 1];
        
        if (latestUpdate.arrivalDelay !== undefined && latestUpdate.arrivalDelay !== null) {
          // delay値を分単位に変換
          const delayMinutes = Math.round(latestUpdate.arrivalDelay / 60);
          return delayMinutes;
        }
      }
    }
    
    // route.pbが利用できない場合: vehicle.pbのcurrent_stop_sequenceとstop_times.txtを突合して遅延を推定
    if (vehicleData.currentStopSequence !== undefined && vehicleData.currentStopSequence !== null) {
      const stopTimes = this.stopTimes
        .filter(st => st.trip_id === tripId)
        .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
      
      const currentStopTime = stopTimes.find(st => parseInt(st.stop_sequence) === vehicleData.currentStopSequence);
      
      if (currentStopTime) {
        // 予定到着時刻をパース（HH:MM:SS形式）
        const [schedHour, schedMinute] = currentStopTime.arrival_time.split(':').map(Number);
        const scheduledMinutes = schedHour * 60 + schedMinute;
        
        // 現在時刻を取得
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        // 遅延時間を計算（分単位）
        const delayMinutes = currentMinutes - scheduledMinutes;
        
        return delayMinutes;
      }
    }
    
    // 遅延情報が取得できない場合
    return null;
  }
  
  /**
   * ルート最新情報更新ハンドラー
   * @param {Array} tripUpdates - ルート最新情報の配列
   */
  handleTripUpdatesUpdate(tripUpdates) {
    if (!tripUpdates || !Array.isArray(tripUpdates)) {
      console.log('[RealtimeVehicleController] ルート最新情報がありません');
      this.tripUpdates = [];
      return;
    }
    
    console.log('[RealtimeVehicleController] ルート最新情報が更新されました:', tripUpdates.length);
    
    // tripUpdatesを保存（calculateDelay()で使用）
    this.tripUpdates = tripUpdates;
  }
  
  /**
   * 運行状態の判定
   * @param {Object} vehicleData - 車両位置情報
   * @param {Object} trip - 便情報（trips.txt）
   * @returns {Object} 運行状態オブジェクト { state, message, color }
   */
  determineVehicleStatus(vehicleData, trip) {
    const now = Date.now();
    const tripId = vehicleData.tripId;
    
    // stop_times.txtから該当便の停車時刻を取得
    const stopTimes = this.stopTimes
      .filter(st => st.trip_id === tripId)
      .sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
    
    if (stopTimes.length === 0) {
      console.warn('[RealtimeVehicleController] stop_timesが見つかりません:', tripId);
      return {
        state: 'unknown',
        message: '運行状態不明',
        color: 'gray'
      };
    }
    
    // 最初と最後の停車時刻を取得
    const firstStopTime = stopTimes[0];
    const lastStopTime = stopTimes[stopTimes.length - 1];
    
    // 現在時刻を取得（HH:MM形式）
    const currentDate = new Date(now);
    const currentHour = currentDate.getHours();
    const currentMinute = currentDate.getMinutes();
    
    // 出発時刻と到着時刻をパース（HH:MM:SS形式）
    const [startHour, startMinute] = firstStopTime.departure_time.split(':').map(Number);
    const [endHour, endMinute] = lastStopTime.arrival_time.split(':').map(Number);
    
    // 時刻を分単位に変換
    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // 運行開始前
    if (currentMinutes < startMinutes) {
      return {
        state: 'before_start',
        message: '運行開始前です',
        color: 'yellow'
      };
    }
    
    // 運行終了
    if (currentMinutes > endMinutes) {
      return {
        state: 'after_end',
        message: '運行終了しました',
        color: 'black'
      };
    }
    
    // 運行中 - 遅延時間を計算
    const delay = this.calculateDelay(vehicleData, trip);
    
    if (delay === null) {
      // 遅延情報が取得できない場合
      return {
        state: 'in_transit',
        message: '運行中',
        color: 'blue'
      };
    }
    
    // 定刻通り (±2分以内)
    if (Math.abs(delay) <= 2) {
      return {
        state: 'on_time',
        message: '定刻通りです',
        color: 'green'
      };
    }
    
    // 遅延 (3分以上)
    if (delay >= 3) {
      return {
        state: 'delayed',
        message: `予定より${delay}分遅れ`,
        color: 'red'
      };
    }
    
    // 早着（マイナスの遅延）
    return {
      state: 'early',
      message: `予定より${Math.abs(delay)}分早い`,
      color: 'green'
    };
  }
  
  /**
   * 古い車両マーカーの削除処理
   * 最終更新時刻が30秒以上前の車両マーカーを削除
   */
  removeStaleVehicleMarkers() {
    const now = Date.now();
    const STALE_THRESHOLD = 30 * 1000; // 30秒
    
    const staleMarkers = [];
    
    // 最終更新時刻が30秒以上前の車両マーカーを検索
    this.lastUpdateTimes.forEach((lastUpdateTime, tripId) => {
      if (now - lastUpdateTime > STALE_THRESHOLD) {
        staleMarkers.push(tripId);
      }
    });
    
    // 古いマーカーを削除
    staleMarkers.forEach(tripId => {
      const marker = this.vehicleMarkers.get(tripId);
      
      if (marker) {
        // MapController.removeVehicleMarker()を呼び出して削除
        this.mapController.removeVehicleMarker(marker);
        
        // 車両マーカー管理Mapから削除
        this.vehicleMarkers.delete(tripId);
        this.lastUpdateTimes.delete(tripId);
        
        console.log('[RealtimeVehicleController] 古い車両マーカーを削除しました:', tripId);
      }
    });
    
    if (staleMarkers.length > 0) {
      console.log('[RealtimeVehicleController] 古い車両マーカーを削除しました:', staleMarkers.length);
    }
  }
  
  /**
   * 運行情報更新ハンドラー
   * @param {Array} alerts - 運行情報の配列
   */
  handleAlertsUpdate(alerts) {
    if (!alerts || !Array.isArray(alerts)) {
      console.log('[RealtimeVehicleController] 運行情報がありません');
      // 運行情報がない場合はクリア
      this.clearAlerts();
      return;
    }
    
    console.log('[RealtimeVehicleController] 運行情報が更新されました:', alerts.length);
    
    if (alerts.length === 0) {
      // 運行情報がない場合はクリア
      this.clearAlerts();
      return;
    }
    
    const now = Date.now() / 1000; // 秒単位に変換
    
    // active_periodを確認し、現在時刻が有効期間内の情報のみをフィルタ
    const activeAlerts = alerts.filter(alert => {
      if (!alert.activeStart || !alert.activeEnd) {
        // active_periodが設定されていない場合は常に有効
        return true;
      }
      
      return now >= alert.activeStart && now <= alert.activeEnd;
    });
    
    if (activeAlerts.length === 0) {
      // 有効な運行情報がない場合はクリア
      this.clearAlerts();
      return;
    }
    
    // header_textまたはdescription_textに「運休」が含まれる場合は運休として分類
    const cancellations = [];
    const delays = [];
    
    activeAlerts.forEach(alert => {
      const headerText = alert.headerText || '';
      const descriptionText = alert.descriptionText || '';
      
      if (headerText.includes('運休') || descriptionText.includes('運休')) {
        cancellations.push(alert);
      } else {
        delays.push(alert);
      }
    });
    
    // displayAlerts()を呼び出して表示
    this.displayAlerts(cancellations, delays);
  }
  
  /**
   * 運行情報表示
   * @param {Array} cancellations - 運休情報の配列
   * @param {Array} delays - 遅延情報の配列
   */
  displayAlerts(cancellations, delays) {
    if (!this.alertsContainer) {
      console.error('[RealtimeVehicleController] 運行情報表示エリアが見つかりません');
      return;
    }
    
    // コンテナをクリア
    while (this.alertsContainer.firstChild) {
      this.alertsContainer.removeChild(this.alertsContainer.firstChild);
    }
    
    // 運休情報: 赤色の文字色で全件表示
    if (cancellations.length > 0) {
      const cancellationSection = document.createElement('div');
      cancellationSection.className = 'alert-section alert-section-cancellation';
      
      const cancellationTitle = document.createElement('h3');
      cancellationTitle.className = 'alert-title';
      cancellationTitle.textContent = '運休情報';
      cancellationSection.appendChild(cancellationTitle);
      
      cancellations.forEach(alert => {
        const alertCard = this.createAlertCard(alert, 'red');
        cancellationSection.appendChild(alertCard);
      });
      
      this.alertsContainer.appendChild(cancellationSection);
    }
    
    // 遅延情報: 黄色の文字色で最大5件表示
    if (delays.length > 0) {
      const delaySection = document.createElement('div');
      delaySection.className = 'alert-section alert-section-delay';
      
      const delayTitle = document.createElement('h3');
      delayTitle.className = 'alert-title';
      delayTitle.textContent = '遅延情報';
      delaySection.appendChild(delayTitle);
      
      const displayDelays = delays.slice(0, 5);
      displayDelays.forEach(alert => {
        const alertCard = this.createAlertCard(alert, 'yellow');
        delaySection.appendChild(alertCard);
      });
      
      // 遅延情報が6件以上の場合: 「詳細はこちら」リンクを表示
      if (delays.length > 5) {
        const moreLink = document.createElement('a');
        moreLink.className = 'alert-more-link';
        moreLink.href = 'http://opendata.sagabus.info/';
        moreLink.target = '_blank';
        moreLink.rel = 'noopener noreferrer';
        moreLink.textContent = `詳細はこちら（他${delays.length - 5}件）`;
        delaySection.appendChild(moreLink);
      }
      
      this.alertsContainer.appendChild(delaySection);
    }
    
    // コンテナを表示
    this.alertsContainer.style.display = 'block';
    
    console.log('[RealtimeVehicleController] 運行情報を表示しました:', {
      cancellations: cancellations.length,
      delays: delays.length
    });
  }
  
  /**
   * 運行情報カードを作成
   * @param {Object} alert - 運行情報
   * @param {string} color - 文字色 ('red' | 'yellow')
   * @returns {HTMLElement} 運行情報カード
   */
  createAlertCard(alert, color) {
    const card = document.createElement('div');
    card.className = `alert-card alert-card-${color}`;
    
    // header_text
    if (alert.headerText) {
      const header = document.createElement('h4');
      header.className = 'alert-header';
      header.textContent = alert.headerText;
      card.appendChild(header);
    }
    
    // description_text
    if (alert.descriptionText) {
      const description = document.createElement('p');
      description.className = 'alert-description';
      description.textContent = alert.descriptionText;
      card.appendChild(description);
    }
    
    return card;
  }
  
  /**
   * 運行情報クリア処理
   */
  clearAlerts() {
    if (!this.alertsContainer) {
      return;
    }
    
    // コンテナをクリア
    while (this.alertsContainer.firstChild) {
      this.alertsContainer.removeChild(this.alertsContainer.firstChild);
    }
    
    // 運行情報表示エリアを非表示にする
    this.alertsContainer.style.display = 'none';
    
    console.log('[RealtimeVehicleController] 運行情報をクリアしました');
  }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.RealtimeVehicleController = RealtimeVehicleController;
}
