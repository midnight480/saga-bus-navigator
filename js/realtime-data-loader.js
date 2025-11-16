/**
 * RealtimeDataLoader
 * GTFS-Realtimeデータの取得、デコード、キャッシュ管理を担当
 */
class RealtimeDataLoader {
  /**
   * コンストラクタ
   * @param {string} proxyBaseUrl - Cloudflare FunctionsプロキシのベースURL
   */
  constructor(proxyBaseUrl = '/api') {
    this.proxyBaseUrl = proxyBaseUrl;
    
    // ポーリング間隔の管理
    this.pollingInterval = 30000; // 30秒（ミリ秒）
    this.pollingIntervalId = null;
    
    // エラーカウンター
    this.consecutiveErrorCount = 0;
    this.maxConsecutiveErrors = 3;
    
    // データキャッシュ
    this.vehiclePositions = [];
    this.tripUpdates = [];
    this.alerts = [];
    
    // イベントリスナー
    this.eventListeners = {
      vehiclePositionsUpdated: [],
      tripUpdatesUpdated: [],
      alertsUpdated: [],
      fetchError: []
    };
  }

  /**
   * イベントリスナーを登録
   * @param {string} eventName - イベント名
   * @param {Function} callback - コールバック関数
   */
  addEventListener(eventName, callback) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].push(callback);
    }
  }

  /**
   * イベントを発火
   * @param {string} eventName - イベント名
   * @param {*} data - イベントデータ
   */
  fireEvent(eventName, data) {
    if (this.eventListeners[eventName]) {
      this.eventListeners[eventName].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[RealtimeDataLoader] Error in event listener for ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Protocol Buffersデータをデコード
   * @param {ArrayBuffer} arrayBuffer - Protocol Buffersのバイナリデータ
   * @returns {Promise<Object>} デコードされたFeedMessage
   */
  async decodeProtobuf(arrayBuffer) {
    try {
      // protobufjsが読み込まれているか確認
      if (typeof protobuf === 'undefined') {
        throw new Error('protobufjs is not loaded');
      }
      
      // GTFS-Realtimeの.protoファイルを読み込む（キャッシュを利用）
      if (!this._protoRoot) {
        // ローカルの.protoファイルを読み込む
        const response = await fetch('/js/gtfs-realtime.proto');
        if (!response.ok) {
          throw new Error(`Failed to load proto file: ${response.status} ${response.statusText}`);
        }
        const protoText = await response.text();
        this._protoRoot = protobuf.parse(protoText).root;
      }
      
      const FeedMessage = this._protoRoot.lookupType('transit_realtime.FeedMessage');
      
      // Protocol Buffersをデコード
      const uint8Array = new Uint8Array(arrayBuffer);
      const message = FeedMessage.decode(uint8Array);
      
      // JSON形式に変換
      const jsonData = FeedMessage.toObject(message, {
        longs: String,
        enums: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true,
        oneofs: true
      });
      
      return jsonData;
    } catch (error) {
      console.error('[RealtimeDataLoader] Failed to decode protobuf:', error);
      throw error;
    }
  }

  /**
   * 車両位置情報を取得
   * @returns {Promise<Array>} 車両位置情報の配列
   */
  async fetchVehiclePositions() {
    try {
      const url = `${this.proxyBaseUrl}/vehicle`;
      const response = await this.fetchWithRetry(url);
      
      // Protocol Buffersのバイナリデータを取得
      const arrayBuffer = await response.arrayBuffer();
      
      // Protocol Buffersをデコード
      const feedMessage = await this.decodeProtobuf(arrayBuffer);
      
      // 内部データモデルに変換
      const vehiclePositions = this.convertVehiclePositions(feedMessage);
      
      // キャッシュを更新
      this.vehiclePositions = vehiclePositions;
      
      // 成功時の処理
      this.handleFetchSuccess();
      
      // イベントを発火
      this.fireEvent('vehiclePositionsUpdated', vehiclePositions);
      
      console.log(`[RealtimeDataLoader] Vehicle positions updated: ${vehiclePositions.length} vehicles`);
      
      return vehiclePositions;
    } catch (error) {
      console.error('[RealtimeDataLoader] Failed to fetch vehicle positions:', error);
      this.handleFetchError(error, 'vehicle');
      throw error;
    }
  }

  /**
   * 車両位置情報を内部データモデルに変換
   * @param {Object} feedMessage - デコードされたFeedMessage
   * @returns {Array} 変換された車両位置情報
   */
  convertVehiclePositions(feedMessage) {
    if (!feedMessage || !feedMessage.entity) {
      return [];
    }
    
    const positions = [];
    
    for (const entity of feedMessage.entity) {
      if (!entity.vehicle) {
        continue;
      }
      
      const vehicle = entity.vehicle;
      
      // 必須フィールドのチェック
      if (!vehicle.trip || !vehicle.position) {
        continue;
      }
      
      const position = {
        tripId: vehicle.trip.tripId || vehicle.trip.trip_id || null,
        routeId: vehicle.trip.routeId || vehicle.trip.route_id || null,
        latitude: vehicle.position.latitude || null,
        longitude: vehicle.position.longitude || null,
        currentStopSequence: vehicle.currentStopSequence || vehicle.current_stop_sequence || null,
        timestamp: vehicle.timestamp ? (typeof vehicle.timestamp === 'number' ? vehicle.timestamp : parseInt(vehicle.timestamp) || Date.now() / 1000) : Date.now() / 1000,
        vehicleId: vehicle.vehicle?.id || null,
        vehicleLabel: vehicle.vehicle?.label || null
      };
      
      // 座標の範囲チェック
      if (position.latitude < -90 || position.latitude > 90 ||
          position.longitude < -180 || position.longitude > 180) {
        console.warn(`[RealtimeDataLoader] Invalid coordinates for vehicle: tripId=${position.tripId}`);
        continue;
      }
      
      positions.push(position);
    }
    
    return positions;
  }

  /**
   * ルート最新情報（TripUpdates）を取得
   * @returns {Promise<Array>} TripUpdatesの配列
   */
  async fetchTripUpdates() {
    try {
      const url = `${this.proxyBaseUrl}/route`;
      const response = await this.fetchWithRetry(url);
      
      // Protocol Buffersのバイナリデータを取得
      const arrayBuffer = await response.arrayBuffer();
      
      // Protocol Buffersをデコード
      const feedMessage = await this.decodeProtobuf(arrayBuffer);
      
      // 内部データモデルに変換
      const tripUpdates = this.convertTripUpdates(feedMessage);
      
      // キャッシュを更新
      this.tripUpdates = tripUpdates;
      
      // 成功時の処理
      this.handleFetchSuccess();
      
      // イベントを発火
      this.fireEvent('tripUpdatesUpdated', tripUpdates);
      
      console.log(`[RealtimeDataLoader] Trip updates updated: ${tripUpdates.length} trips`);
      
      return tripUpdates;
    } catch (error) {
      console.error('[RealtimeDataLoader] Failed to fetch trip updates:', error);
      this.handleFetchError(error, 'route');
      throw error;
    }
  }

  /**
   * TripUpdatesを内部データモデルに変換
   * @param {Object} feedMessage - デコードされたFeedMessage
   * @returns {Array} 変換されたTripUpdates
   */
  convertTripUpdates(feedMessage) {
    if (!feedMessage || !feedMessage.entity) {
      return [];
    }
    
    const updates = [];
    
    for (const entity of feedMessage.entity) {
      // tripUpdateとtrip_updateの両方に対応
      const tripUpdate = entity.tripUpdate || entity.trip_update;
      if (!tripUpdate) {
        continue;
      }
      
      // 必須フィールドのチェック
      if (!tripUpdate.trip) {
        continue;
      }
      
      const update = {
        tripId: tripUpdate.trip.tripId || tripUpdate.trip.trip_id || null,
        routeId: tripUpdate.trip.routeId || tripUpdate.trip.route_id || null,
        stopTimeUpdates: []
      };
      
      // stop_time_updateを変換（snake_caseとcamelCaseの両方に対応）
      const stopTimeUpdates = tripUpdate.stopTimeUpdate || tripUpdate.stop_time_update || [];
      if (Array.isArray(stopTimeUpdates)) {
        for (const stopTimeUpdate of stopTimeUpdates) {
          const arrival = stopTimeUpdate.arrival || {};
          const departure = stopTimeUpdate.departure || {};
          const stu = {
            stopSequence: stopTimeUpdate.stopSequence || stopTimeUpdate.stop_sequence || null,
            arrivalDelay: arrival.delay || 0,
            departureDelay: departure.delay || 0
          };
          
          update.stopTimeUpdates.push(stu);
        }
      }
      
      updates.push(update);
    }
    
    return updates;
  }

  /**
   * 運行情報（Alerts）を取得
   * @returns {Promise<Array>} Alertsの配列
   */
  async fetchAlerts() {
    try {
      const url = `${this.proxyBaseUrl}/alert`;
      const response = await this.fetchWithRetry(url);
      
      // Protocol Buffersのバイナリデータを取得
      const arrayBuffer = await response.arrayBuffer();
      
      // Protocol Buffersをデコード
      const feedMessage = await this.decodeProtobuf(arrayBuffer);
      
      // 内部データモデルに変換
      const alerts = this.convertAlerts(feedMessage);
      
      // キャッシュを更新
      this.alerts = alerts;
      
      // 成功時の処理
      this.handleFetchSuccess();
      
      // イベントを発火
      this.fireEvent('alertsUpdated', alerts);
      
      console.log(`[RealtimeDataLoader] Alerts updated: ${alerts.length} alerts`);
      
      return alerts;
    } catch (error) {
      console.error('[RealtimeDataLoader] Failed to fetch alerts:', error);
      this.handleFetchError(error, 'alert');
      throw error;
    }
  }

  /**
   * Alertsを内部データモデルに変換（運休/遅延の分類を含む）
   * @param {Object} feedMessage - デコードされたFeedMessage
   * @returns {Array} 変換されたAlerts
   */
  convertAlerts(feedMessage) {
    if (!feedMessage || !feedMessage.entity) {
      return [];
    }
    
    const alerts = [];
    const currentTime = Math.floor(Date.now() / 1000);
    
    for (const entity of feedMessage.entity) {
      if (!entity.alert) {
        continue;
      }
      
      const alert = entity.alert;
      
      // active_periodを確認し、現在時刻が有効期間内かチェック
      let isActive = false;
      let activeStart = null;
      let activeEnd = null;
      
      // activePeriodとactive_periodの両方に対応
      const activePeriods = alert.activePeriod || alert.active_period || [];
      if (activePeriods.length > 0) {
        for (const period of activePeriods) {
          const start = period.start ? (typeof period.start === 'number' ? period.start : parseInt(period.start) || 0) : 0;
          const end = period.end ? (typeof period.end === 'number' ? period.end : parseInt(period.end) || Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
          
          if (currentTime >= start && currentTime <= end) {
            isActive = true;
            activeStart = start;
            activeEnd = end;
            break;
          }
        }
      } else {
        // active_periodが指定されていない場合は常に有効
        isActive = true;
      }
      
      // 有効期間外の場合はスキップ
      if (!isActive) {
        continue;
      }
      
      // header_textとdescription_textを取得（headerTextとheader_textの両方に対応）
      const headerText = this.extractTranslatedText(alert.headerText || alert.header_text);
      const descriptionText = this.extractTranslatedText(alert.descriptionText || alert.description_text);
      
      // 運休/遅延の分類
      const isCancellation = 
        (headerText && headerText.includes('運休')) ||
        (descriptionText && descriptionText.includes('運休'));
      
      const alertData = {
        id: entity.id || `alert_${Date.now()}`,
        type: isCancellation ? 'cancellation' : 'delay',
        headerText: headerText || '',
        descriptionText: descriptionText || '',
        activeStart: activeStart,
        activeEnd: activeEnd,
        affectedRoutes: [],
        affectedTrips: []
      };
      
      // informed_entityから影響を受ける路線・便を抽出（informedEntityとinformed_entityの両方に対応）
      const informedEntities = alert.informedEntity || alert.informed_entity || [];
      if (Array.isArray(informedEntities)) {
        for (const entity of informedEntities) {
          const routeId = entity.routeId || entity.route_id;
          const tripId = entity.tripId || entity.trip_id;
          if (routeId) {
            alertData.affectedRoutes.push(routeId);
          }
          if (tripId) {
            alertData.affectedTrips.push(tripId);
          }
        }
      }
      
      alerts.push(alertData);
    }
    
    return alerts;
  }

  /**
   * TranslatedStringから日本語テキストを抽出
   * @param {Object} translatedString - TranslatedStringオブジェクト
   * @returns {string|null} 抽出されたテキスト
   */
  extractTranslatedText(translatedString) {
    if (!translatedString || !translatedString.translation) {
      return null;
    }
    
    // 日本語の翻訳を優先的に探す
    for (const translation of translatedString.translation) {
      if (translation.language === 'ja' && translation.text) {
        return translation.text;
      }
    }
    
    // 日本語がない場合は最初の翻訳を返す
    if (translatedString.translation.length > 0 && translatedString.translation[0].text) {
      return translatedString.translation[0].text;
    }
    
    return null;
  }

  /**
   * 初期化とポーリング開始
   */
  async initialize() {
    console.log('[RealtimeDataLoader] Initializing...');
    
    // 初回データ取得
    await this.fetchAllData();
    
    // ポーリング開始
    this.startPolling();
    
    console.log(`[RealtimeDataLoader] Polling started with interval: ${this.pollingInterval}ms`);
  }

  /**
   * 全データを取得
   */
  async fetchAllData() {
    const promises = [];
    
    // 並列で全データを取得
    promises.push(
      this.fetchVehiclePositions().catch(err => {
        console.error('[RealtimeDataLoader] Vehicle positions fetch failed:', err);
      })
    );
    
    promises.push(
      this.fetchTripUpdates().catch(err => {
        console.error('[RealtimeDataLoader] Trip updates fetch failed:', err);
      })
    );
    
    promises.push(
      this.fetchAlerts().catch(err => {
        console.error('[RealtimeDataLoader] Alerts fetch failed:', err);
      })
    );
    
    await Promise.allSettled(promises);
  }

  /**
   * ポーリング開始
   */
  startPolling() {
    // 既存のポーリングがあれば停止
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
    }
    
    // 新しいポーリングを開始
    this.pollingIntervalId = setInterval(() => {
      this.fetchAllData();
    }, this.pollingInterval);
  }

  /**
   * ポーリング停止
   */
  stopPolling() {
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
      console.log('[RealtimeDataLoader] Polling stopped');
    }
  }

  /**
   * リトライ機能付きfetch（最大3回リトライ、指数バックオフ）
   * @param {string} url - リクエストURL
   * @param {number} maxRetries - 最大リトライ回数
   * @returns {Promise<Response>} レスポンス
   */
  async fetchWithRetry(url, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(15000) // 15秒タイムアウト
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        
        // 最後の試行でない場合は待機してリトライ
        if (attempt < maxRetries - 1) {
          const backoffTime = Math.pow(2, attempt) * 1000; // 指数バックオフ: 1秒, 2秒, 4秒
          console.log(`[RealtimeDataLoader] Retry ${attempt + 1}/${maxRetries} after ${backoffTime}ms`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
    
    // 全てのリトライが失敗
    throw lastError;
  }

  /**
   * データ取得エラーのハンドリング
   * @param {Error} error - エラーオブジェクト
   * @param {string} dataType - データタイプ（vehicle, route, alert）
   */
  handleFetchError(error, dataType) {
    this.consecutiveErrorCount++;
    
    console.error(`[RealtimeDataLoader] Fetch error for ${dataType} (consecutive errors: ${this.consecutiveErrorCount}):`, error);
    
    // 連続3回失敗時にポーリング間隔を60秒に延長
    if (this.consecutiveErrorCount >= this.maxConsecutiveErrors) {
      const newInterval = 60000; // 60秒
      
      if (this.pollingInterval !== newInterval) {
        this.pollingInterval = newInterval;
        console.warn(`[RealtimeDataLoader] Polling interval extended to ${newInterval}ms due to consecutive errors`);
        
        // ポーリングを再起動して新しい間隔を適用
        this.startPolling();
      }
    }
    
    // エラーイベントを発火
    this.fireEvent('fetchError', {
      dataType: dataType,
      error: error,
      consecutiveErrorCount: this.consecutiveErrorCount,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * データ取得成功時の処理
   */
  handleFetchSuccess() {
    // エラーカウンターをリセット
    if (this.consecutiveErrorCount > 0) {
      this.consecutiveErrorCount = 0;
      
      // ポーリング間隔を30秒に戻す
      const normalInterval = 30000; // 30秒
      
      if (this.pollingInterval !== normalInterval) {
        this.pollingInterval = normalInterval;
        console.log(`[RealtimeDataLoader] Polling interval restored to ${normalInterval}ms`);
        
        // ポーリングを再起動して新しい間隔を適用
        this.startPolling();
      }
    }
  }
}

// グローバルスコープに公開
if (typeof window !== 'undefined') {
  window.RealtimeDataLoader = RealtimeDataLoader;
}
