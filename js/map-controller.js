/**
 * MapController - 地図表示とバス停マーカー管理を担当するコントローラー
 */
class MapController {
  /**
   * コンストラクタ
   */
  constructor() {
    // エラーログカウンター
    this.errorCount = 0;
    // Leafletマップインスタンス
    this.map = null;
    
    // バス停ID -> マーカーのマップ
    this.markers = new Map();
    
    // マーカークラスターグループ
    this.markerCluster = null;
    
    // 経路表示用レイヤー
    this.routeLayer = null;
    
    // 選択された乗車バス停マーカー
    this.selectedDepartureMarker = null;
    
    // 選択された降車バス停マーカー
    this.selectedArrivalMarker = null;
    
    // 選択モード: 'none' | 'departure' | 'arrival'
    this.selectionMode = 'none';
    
    // バス停データ
    this.busStops = [];
    
    // バス停選択時のコールバック関数
    this.onStopSelected = null;
    
    // 現在地マーカー
    this.currentLocationMarker = null;
    
    // 車両マーカー管理用のMap (tripId -> marker)
    this.vehicleMarkers = new Map();
    
    // TranslationManager（多言語対応用）
    this.translationManager = null;

    // ORS経路描画（ors-route-rendering）
    this.orsConfig = null;
    this.orsEnabled = false;
    this.orsRouteRenderer = null;
    this.orsRouteController = null;
  }

  /**
   * 地図を初期化する
   * @param {string} containerId - 地図を表示するコンテナのID
   * @param {Array<Object>} busStops - バス停データの配列
   */
  initialize(containerId, busStops) {
    try {
      // Leafletライブラリの読み込みチェック
      if (typeof L === 'undefined') {
        this.logError('Leafletライブラリの読み込みに失敗しました', {
          message: 'Leaflet (L) is not defined',
          suggestion: 'Leaflet.jsのCDNリンクが正しく読み込まれているか確認してください'
        });
        this.displayLibraryError(containerId);
        return;
      }
      
      // バス停データを保存
      this.busStops = busStops;
      
      // iPhoneのChromeを検出（実機でのみ発生する問題のため）
      const isIPhoneChrome = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);
      
      // Leafletマップを初期化（佐賀市中心部を中心にズームレベル13）
      // iPhoneのChromeでは最大ズームレベルを16に制限（読み込みエラーを防ぐため）
      this.map = L.map(containerId, {
        center: [33.2635, 130.3005],
        zoom: 13,
        minZoom: 10,  // ズームレベルを10〜18に制限
        maxZoom: isIPhoneChrome ? 16 : 18,  // iPhoneのChromeでは16に制限
        // 地図の境界を日本国内に制限
        maxBounds: [
          [20.0, 122.0],  // 南西端
          [46.0, 154.0]   // 北東端
        ],
        maxBoundsViscosity: 1.0,
        // 地図操作機能（Leafletのデフォルト機能）
        // - ドラッグ操作による地図の移動
        // - ピンチ/マウスホイールによるズーム
        // - ダブルクリックによるズームイン
        // - タッチ操作対応
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true
      });
      
      // OpenStreetMapタイルレイヤーを追加（エラーハンドリング付き）
      // パフォーマンス最適化: Leafletのデフォルト機能により地図タイルは非同期で読み込まれる
      // - タイルは必要に応じて遅延読み込みされる
      // - ブラウザのキャッシュ機能を活用
      // - 複数のタイルを並列で読み込み
      this.setupTileLayer();
      
      // マーカークラスターグループを初期化
      // パフォーマンス最適化: Leaflet.markerclusterによる自動最適化
      // - 表示範囲外のマーカーは自動的にDOMから削除される
      // - クラスタリングにより大量のマーカーでも60FPS以上を維持
      // - ズーム・パン操作時のスムーズな描画を実現
      this.markerCluster = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        // パフォーマンス最適化オプション
        removeOutsideVisibleBounds: true,  // 表示範囲外のマーカーを削除
        animate: true,                      // アニメーション有効化
        animateAddingMarkers: false,        // マーカー追加時のアニメーション無効化（初期表示高速化）
        disableClusteringAtZoom: 18,        // 最大ズーム時はクラスタリング無効化
        chunkedLoading: true                // チャンク単位での読み込み
      });
      
      // 経路表示用レイヤーを初期化
      this.routeLayer = L.layerGroup().addTo(this.map);

      // ORS経路描画の初期化（設定が無い/無効な場合はフォールバック）
      this.initializeOrsRouteRendering();
      this.setupOrsZoomVisibilityHandler();
      
      // 「経路をクリア」ボタンのイベントリスナーを設定
      this.setupClearRouteButton();
      
      // 「現在地」ボタンをLeafletコントロールとして追加
      this.setupCurrentLocationButton();
      
      console.log('[MapController] 地図の初期化が完了しました');
      
    } catch (error) {
      this.logError('地図の初期化に失敗しました', {
        message: error.message,
        details: error.stack
      });
      this.displayLibraryError(containerId);
      throw error;
    }
  }
  
  /**
   * 地図タイルレイヤーをセットアップする（エラーハンドリング付き）
   */
  setupTileLayer() {
    // プライマリタイルサーバー
    const primaryTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    // 代替タイルサーバー
    const fallbackTileUrl = 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png';
    
    let tileLoadErrorCount = 0;
    let currentTileLayer = null;
    const TILE_ERROR_THRESHOLD = 5;
    
    // iPhoneのChromeを検出（実機でのみ発生する問題のため）
    const isIPhoneChrome = /iPhone|iPad|iPod/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);
    
    // プライマリタイルレイヤーを作成
    // iPhoneのChromeでは読み込み速度を遅くするため、updateWhenZoomingをfalseに設定
    const tileLayerOptions = {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      minZoom: 10,
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    };
    
    // iPhoneのChromeでは、ズーム中のタイル更新を無効化し、ズーム完了後に更新する
    // iPhoneのChromeでは、ズーム中のタイル更新を無効化し、ズーム完了後に更新する
    if (isIPhoneChrome) {
      tileLayerOptions.updateWhenZooming = false; // ズーム中はタイルを更新しない
      // 他の過度な制限（updateWhenIdle: falseなど）は削除し、Leafletのデフォルト動作に任せる
      console.log('[MapController] iPhoneのChromeを検出しました。ズーム中のタイル更新のみ制限します。');
    }
    
    currentTileLayer = L.tileLayer(primaryTileUrl, tileLayerOptions);
    
    // タイル読み込みエラーイベントを監視
    currentTileLayer.on('tileerror', (error) => {
      tileLoadErrorCount++;
      
      // エラーの詳細情報を収集
      const errorDetails = {
        message: error.error ? error.error.message : 'Unknown error',
        tileUrl: error.tile ? error.tile.src : 'Unknown',
        errorCount: tileLoadErrorCount,
        userAgent: navigator.userAgent,
        isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
        timestamp: new Date().toISOString()
      };
      
      this.logError('地図タイルの読み込みに失敗しました', errorDetails);
      
      // モバイル実機での診断情報を出力
      if (errorDetails.isMobile) {
        console.warn('[MapController] モバイル実機でのタイル読み込みエラー:', {
          tileUrl: errorDetails.tileUrl,
          errorCount: errorDetails.errorCount,
          userAgent: errorDetails.userAgent,
          suggestion: 'ネットワーク接続またはCSP設定を確認してください'
        });
      }
      
      // エラーが一定数を超えたら代替サーバーに切り替え
      if (tileLoadErrorCount >= TILE_ERROR_THRESHOLD && currentTileLayer._url === primaryTileUrl) {
        this.logError('代替タイルサーバーに切り替えます', {
          from: primaryTileUrl,
          to: fallbackTileUrl,
          errorCount: tileLoadErrorCount
        });
        
        // 現在のレイヤーを削除
        this.map.removeLayer(currentTileLayer);
        
        // 代替タイルレイヤーを作成
        // iPhoneのChromeでは同じオプションを適用
        const fallbackTileLayerOptions = {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
          minZoom: 10,
          errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        };
        
        if (isIPhoneChrome) {
          fallbackTileLayerOptions.updateWhenZooming = false;
        }
        
        currentTileLayer = L.tileLayer(fallbackTileUrl, fallbackTileLayerOptions);
        
        // 代替サーバーでもエラーを監視
        currentTileLayer.on('tileerror', (fallbackError) => {
          this.logError('代替タイルサーバーでも読み込みに失敗しました', {
            message: fallbackError.error ? fallbackError.error.message : 'Unknown error',
            tileUrl: fallbackError.tile ? fallbackError.tile.src : 'Unknown'
          });
        });
        
        currentTileLayer.addTo(this.map);
        
        // エラーカウントをリセット
        tileLoadErrorCount = 0;
        
        // ユーザーに通知
        this.displayTileErrorNotification();
      }
    });
    
    // タイル読み込み成功を監視（エラーカウントをリセットするため）
    currentTileLayer.on('tileload', () => {
      // タイルが正常に読み込まれた場合は、エラーカウントをリセット
      if (tileLoadErrorCount > 0) {
        console.log(`[MapController] タイルが正常に読み込まれました。エラーカウントをリセットします（以前のエラー数: ${tileLoadErrorCount}）`);
        tileLoadErrorCount = 0;
      }
    });
    
    // タイルレイヤーを地図に追加
    currentTileLayer.addTo(this.map);
    
    // iPhoneのChrome用の手動更新ロジックは削除しました
    // Leafletの標準的な動作で十分であり、手動更新が逆に不具合の原因となっていたため
    
    // タイルレイヤーを保存
    this.currentTileLayer = currentTileLayer;
  }

  /**
   * ORS経路描画を初期化する（設定が無い/無効な場合でもRouteControllerは初期化してフォールバック機能を使用可能にする）
   */
  initializeOrsRouteRendering() {
    try {
      this.orsConfig = typeof window !== 'undefined' ? window.ORS_CONFIG : null;
      
      // ORS関連クラスの読み込み確認
      if (
        typeof CacheManager === 'undefined' ||
        typeof RouteRenderer === 'undefined' ||
        typeof RouteController === 'undefined'
      ) {
        console.warn('[MapController] ORS関連クラスが読み込まれていないため、ORS経路描画を無効化します');
        this.orsEnabled = false;
        this.orsRouteRenderer = null;
        this.orsRouteController = null;
        return;
      }

      // RouteRendererは常に初期化（フォールバック機能のため）
      const routeRenderer = new RouteRenderer(this.map, {
        style: { color: '#2196F3', weight: 4, opacity: 0.7 }
      });

      // ORSが有効な場合のみORSClientを初期化
      let orsClient = null;
      let cacheManager = null;
      
      if (this.orsConfig && this.orsConfig.enabled && this.orsConfig.apiKey) {
        try {
          if (typeof ORSClient === 'undefined' || typeof RateLimiter === 'undefined') {
            throw new Error('ORSClientまたはRateLimiterが読み込まれていません');
          }

          cacheManager = new CacheManager({
            storage: typeof window !== 'undefined' ? window.localStorage : null,
            ttl: this.orsConfig.cacheTtlMs
          });

          orsClient = new ORSClient({
            apiKey: this.orsConfig.apiKey,
            baseUrl: this.orsConfig.baseUrl,
            profile: this.orsConfig.profile,
            RateLimiter: RateLimiter,
            maxCoordinatesPerRequest: this.orsConfig.maxCoordinatesPerRequest,
            maxWaitOnMinuteLimitMs: this.orsConfig.maxWaitOnMinuteLimitMs
          });

          this.orsEnabled = true;
          console.log('[MapController] ORS経路描画を有効化しました（APIキー設定済み）');
        } catch (error) {
          console.warn('[MapController] ORS APIクライアントの初期化に失敗、フォールバックモードで動作します:', error);
          this.orsEnabled = false;
        }
      } else {
        console.log('[MapController] ORS APIキーが設定されていないため、フォールバックモードで動作します');
        this.orsEnabled = false;
      }

      // RouteControllerは常に初期化（フォールバック機能のため）
      // ORSが無効な場合でも、RouteControllerのフォールバック機能（直線描画）を使用可能にする
      if (orsClient && cacheManager) {
        // ORSが有効な場合：完全なRouteControllerを初期化
        const routeController = new RouteController(orsClient, cacheManager, routeRenderer, {
          debounceDelay: this.orsConfig.debounceMs,
          maxCoordinatesPerRequest: this.orsConfig.maxCoordinatesPerRequest
        });
        this.orsRouteController = routeController;
      } else {
        // ORSが無効な場合：フォールバック専用のRouteControllerを初期化
        // ダミーのORSClientとCacheManagerを作成（実際には使用されない）
        const dummyCacheManager = new CacheManager({
          storage: typeof window !== 'undefined' ? window.localStorage : null,
          ttl: 24 * 60 * 60 * 1000
        });
        
        // ダミーのORSClient（実際には使用されず、常にエラーを返す）
        const dummyOrsClient = {
          convertCoordinates: (stops) => stops.map((s) => {
            const lon = typeof s.lon === 'number' ? s.lon : s.lng;
            return [lon, s.lat];
          }),
          getRoute: async () => {
            throw new Error('ORS APIキーが設定されていません');
          }
        };

        const routeController = new RouteController(dummyOrsClient, dummyCacheManager, routeRenderer, {
          debounceDelay: 300,
          maxCoordinatesPerRequest: 50
        });
        this.orsRouteController = routeController;
        console.log('[MapController] フォールバックモードでRouteControllerを初期化しました');
      }

      this.orsRouteRenderer = routeRenderer;
    } catch (error) {
      console.warn('[MapController] ORS経路描画の初期化に失敗したため、フォールバックします', error);
      this.orsEnabled = false;
      this.orsRouteRenderer = null;
      this.orsRouteController = null;
    }
  }

  /**
   * ズームレベルに応じてORS経路描画の表示/非表示を切り替える（要件5.4）
   */
  setupOrsZoomVisibilityHandler() {
    if (!this.map || !this.orsEnabled || !this.orsRouteRenderer || !this.orsConfig) return;
    const threshold = this.orsConfig.hideRouteBelowZoom;
    if (typeof threshold !== 'number') return;

    const updateVisibility = () => {
      const zoom = this.map.getZoom();
      this.orsRouteRenderer.setVisible(zoom >= threshold);
    };

    updateVisibility();
    this.map.on('zoomend', updateVisibility);
  }

  /**
   * ORS描画時のUIフィードバック（ローディング/エラー）
   */
  async drawOrsRouteWithUi(routeId, stopsLonLatCompatible, options) {
    if (!this.orsEnabled || !this.orsRouteController) return;

    if (window.uiController && typeof window.uiController.displayLoading === 'function') {
      window.uiController.displayLoading(true);
    }

    try {
      await this.orsRouteController.drawBusRoute(routeId, stopsLonLatCompatible, options);
    } catch (error) {
      const code = error && typeof error === 'object' ? error.code : null;
      if (window.uiController && typeof window.uiController.displayError === 'function') {
        if (window.uiController.translationManager) {
          const key =
            code === 'RATE_LIMIT' || code === 'RATE_LIMIT_MINUTE' || code === 'RATE_LIMIT_DAILY'
              ? 'error.ors_rate_limited'
              : code === 'INVALID_COORDINATES'
                ? 'error.ors_invalid_coordinates'
                : 'error.ors_unavailable';
          window.uiController.displayError(key, true);
        } else {
          window.uiController.displayError('経路の取得に失敗しました（直線で表示します）');
        }
      }
    } finally {
      if (window.uiController && typeof window.uiController.displayLoading === 'function') {
        window.uiController.displayLoading(false);
      }
    }
  }
  
  /**
   * タイル読み込みエラー通知を表示する
   */
  displayTileErrorNotification() {
    if (this.map) {
      const notification = L.control({ position: 'bottomleft' });
      notification.onAdd = () => {
        const div = L.DomUtil.create('div', 'tile-error-notification');
        const contentDiv = document.createElement('div');
        contentDiv.className = 'notification-content';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'notification-icon';
        iconSpan.textContent = 'ℹ️';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'notification-text';
        textSpan.textContent = '地図の読み込みに問題が発生したため、代替サーバーを使用しています';
        
        contentDiv.appendChild(iconSpan);
        contentDiv.appendChild(textSpan);
        
        div.appendChild(contentDiv);
        
        // 5秒後に自動的に非表示
        setTimeout(() => {
          if (div.parentNode) {
            div.parentNode.removeChild(div);
          }
        }, 5000);
        
        return div;
      };
      notification.addTo(this.map);
    }
  }
  
  /**
   * ライブラリ読み込みエラーを地図コンテナに表示する
   * @param {string} containerId - 地図コンテナのID
   */
  displayLibraryError(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      const wrapper = document.createElement('div');
      wrapper.className = 'map-error-message';
      
      const iconDiv = document.createElement('div');
      iconDiv.className = 'error-icon';
      iconDiv.textContent = '⚠️';
      
      const h3 = document.createElement('h3');
      h3.textContent = '地図ライブラリの読み込みに失敗しました';
      
      const p = document.createElement('p');
      p.textContent = '地図を表示できません。ページを再読み込みしてください。';
      
      const btn = document.createElement('button');
      btn.className = 'retry-button';
      btn.id = 'map-reload-button';
      btn.textContent = '再読み込み';
      
      wrapper.appendChild(iconDiv);
      wrapper.appendChild(h3);
      wrapper.appendChild(p);
      wrapper.appendChild(btn);
      
      container.replaceChildren(wrapper);
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.backgroundColor = '#f5f5f5';
      
      // 再読み込みボタンにイベントリスナーを設定
      const reloadButton = container.querySelector('#map-reload-button');
      if (reloadButton) {
        reloadButton.addEventListener('click', () => {
          location.reload();
        });
      }
    }
  }

  /**
   * 座標の妥当性をチェックする
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
   * 座標エラーの理由を取得する
   * @param {number} lat - 緯度
   * @param {number} lng - 経度
   * @returns {string} エラーの理由
   */
  getCoordinateErrorReason(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return '座標が数値ではありません';
    }
    if (isNaN(lat) || isNaN(lng)) {
      return '座標がNaN（非数値）です';
    }
    if (lat < -90 || lat > 90) {
      return `緯度が範囲外です（-90〜90の範囲内である必要があります）: ${lat}`;
    }
    if (lng < -180 || lng > 180) {
      return `経度が範囲外です（-180〜180の範囲内である必要があります）: ${lng}`;
    }
    return '不明なエラー';
  }
  
  /**
   * バス停アイコンを作成する
   * @param {string} color - アイコンの色 ('blue', 'green', 'red', 'yellow')
   * @returns {L.Icon} Leafletアイコンオブジェクト
   */
  createBusStopIcon(color = 'blue') {
    const iconColors = {
      blue: '#2196F3',
      green: '#4CAF50',
      red: '#F44336',
      yellow: '#FFC107'
    };
    
    const iconColor = iconColors[color] || iconColors.blue;
    
    // SVGマーカーを使用
    const svgIcon = `
      <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" 
              fill="${iconColor}" stroke="#fff" stroke-width="2"/>
        <circle cx="12.5" cy="12.5" r="5" fill="#fff"/>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'bus-stop-marker',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34]
    });
  }
  
  /**
   * 全てのバス停マーカーを表示する（遅延読み込み対応）
   */
  displayAllStops() {
    try {
      if (!this.busStops || this.busStops.length === 0) {
        this.logError('バス停データの読み込みに失敗しました', {
          message: 'バス停データが存在しません',
          busStopsLength: this.busStops ? this.busStops.length : 'undefined'
        });
        this.displayDataError();
        return;
      }
      
      // パフォーマンス計測開始
      const startTime = performance.now();
      
      let validStopCount = 0;
      let invalidStopCount = 0;
      
      // バス停を一度に処理するバッチサイズ
      const BATCH_SIZE = 50;
      let currentIndex = 0;
      
      // バッチ処理関数
      const processBatch = () => {
        const endIndex = Math.min(currentIndex + BATCH_SIZE, this.busStops.length);
        
        for (let i = currentIndex; i < endIndex; i++) {
          const stop = this.busStops[i];
          
          // 座標の妥当性チェック
          if (!this.isValidCoordinate(stop.lat, stop.lng)) {
            this.logError('不正な座標データをスキップしました', {
              stopName: stop.name,
              stopId: stop.id,
              latitude: stop.lat,
              longitude: stop.lng,
              reason: this.getCoordinateErrorReason(stop.lat, stop.lng)
            });
            invalidStopCount++;
            continue;
          }
          
          // マーカーを作成
          const marker = L.marker([stop.lat, stop.lng], {
            icon: this.createBusStopIcon('blue'),
            title: stop.name
          });
          
          // ツールチップを設定
          marker.bindTooltip(stop.name, {
            permanent: false,
            direction: 'top',
            offset: [0, -35]
          });
          
          // ポップアップを設定
          // モバイルではポップアップが地図の上下からはみ出ないように調整
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          const isDesktop = window.innerWidth >= 768;
          marker.bindPopup(this.createPopupContent(stop), {
            maxWidth: isMobile ? 420 : isDesktop ? 900 : 450, // PCでは幅を広く（900px）、タブレットは450px、モバイルは420px
            className: isMobile ? 'bus-stop-popup-container mobile-popup' : 'bus-stop-popup-container',
            // モバイルではautoPanを無効化し、autoPanPaddingを小さくして地図内に収める
            autoPan: !isMobile,
            autoPanPadding: isMobile ? [10, 10] : [50, 50],
            closeOnClick: false,
            // モバイルではポップアップがすぐに閉じないようにする
            autoClose: false,
            closeOnEscapeKey: false
          });
          
          // ポップアップが開かれたときにイベントリスナーを設定
          marker.on('popupopen', () => {
            // ポップアップの内容を最新の翻訳で更新
            const popup = marker.getPopup();
            if (popup) {
              // 最新の翻訳でポップアップの内容を再生成
              const updatedContent = this.createPopupContent(stop);
              popup.setContent(updatedContent);
              
              // ポップアップの内容が更新された後、イベントリスナーを設定
              setTimeout(() => {
                const popupElement = popup.getElement();
                if (popupElement) {
                  // 時刻表を見るボタン
                  const timetableButton = popupElement.querySelector('.popup-button[data-action="timetable"]');
                  if (timetableButton) {
                    const stopId = timetableButton.getAttribute('data-stop-id');
                    timetableButton.addEventListener('click', () => {
                      this.showTimetable(stopId);
                    });
                  }
                  
                  // 乗車バス停に設定するボタン
                  const setDepartureButton = popupElement.querySelector('.popup-button[data-action="set-departure"]');
                  if (setDepartureButton) {
                    const stopName = setDepartureButton.getAttribute('data-stop-name');
                    setDepartureButton.addEventListener('click', () => {
                      this.setBusStopToInput(stopName, 'departure');
                      // ポップアップを閉じる
                      marker.closePopup();
                    });
                  }
                  
                  // 降車バス停に設定するボタン
                  const setArrivalButton = popupElement.querySelector('.popup-button[data-action="set-arrival"]');
                  if (setArrivalButton) {
                    const stopName = setArrivalButton.getAttribute('data-stop-name');
                    setArrivalButton.addEventListener('click', () => {
                      this.setBusStopToInput(stopName, 'arrival');
                      // ポップアップを閉じる
                      marker.closePopup();
                    });
                  }
                }
              }, 0);
            }
            
            // モバイルでは、ポップアップが地図の境界内に収まるように調整
            if (isMobile) {
              const popup = marker.getPopup();
              if (popup && this.map) {
                const popupElement = popup.getElement();
                if (popupElement) {
                  // ポップアップの位置を確認し、地図の境界内に収まるように調整
                  setTimeout(() => {
                    const popupLatLng = marker.getLatLng();
                    const popupPoint = this.map.latLngToContainerPoint(popupLatLng);
                    const popupSize = {
                      width: popupElement.offsetWidth,
                      height: popupElement.offsetHeight
                    };
                    const mapSize = this.map.getSize();
                    
                    // ポップアップが地図の上下からはみ出る場合は、地図をパン
                    let panOffset = { x: 0, y: 0 };
                    
                    // 上にはみ出る場合
                    if (popupPoint.y - popupSize.height < 0) {
                      panOffset.y = popupPoint.y - popupSize.height - 10;
                    }
                    
                    // 下にはみ出る場合
                    if (popupPoint.y + popupSize.height > mapSize.y) {
                      panOffset.y = popupPoint.y + popupSize.height - mapSize.y + 10;
                    }
                    
                    // パンが必要な場合は実行
                    if (panOffset.x !== 0 || panOffset.y !== 0) {
                      const newCenter = this.map.containerPointToLatLng([
                        mapSize.x / 2 - panOffset.x,
                        mapSize.y / 2 - panOffset.y
                      ]);
                      this.map.panTo(newCenter, { duration: 0.3 });
                    }
                  }, 50); // ポップアップのレンダリングを待つ
                }
              }
            }
          });
          
          // クリックイベントを設定
          marker.on('click', () => this.handleMarkerClick(stop));
          
          // マーカーを保存
          this.markers.set(stop.id, marker);
          
          // クラスターに追加
          this.markerCluster.addLayer(marker);
          
          validStopCount++;
        }
        
        currentIndex = endIndex;
        
        // まだ処理するバス停が残っている場合は次のバッチを処理
        if (currentIndex < this.busStops.length) {
          // requestAnimationFrameを使用して次のバッチを非同期で処理
          requestAnimationFrame(processBatch);
        } else {
          // 全てのバッチ処理が完了したらクラスターを地図に追加
          this.map.addLayer(this.markerCluster);
          
          // パフォーマンス計測終了
          const endTime = performance.now();
          const loadTime = endTime - startTime;
          
          console.log(`[MapController] バス停マーカーを表示しました (有効: ${validStopCount}, 無効: ${invalidStopCount}, 読み込み時間: ${loadTime.toFixed(2)}ms)`);
          
          // 3秒以内の表示を確認
          if (loadTime > 3000) {
            console.warn(`[MapController] 警告: マーカーの表示に${(loadTime / 1000).toFixed(2)}秒かかりました（目標: 3秒以内）`);
          }
          
          // 無効なバス停が多い場合は警告
          if (invalidStopCount > 0 && invalidStopCount / (validStopCount + invalidStopCount) > 0.1) {
            this.logError('多数の不正な座標データが検出されました', {
              validCount: validStopCount,
              invalidCount: invalidStopCount,
              invalidRatio: `${Math.round(invalidStopCount / (validStopCount + invalidStopCount) * 100)}%`
            });
          }
        }
      };
      
      // 最初のバッチ処理を開始
      requestAnimationFrame(processBatch);
      
    } catch (error) {
      this.logError('バス停マーカーの表示に失敗しました', {
        message: error.message,
        details: error.stack
      });
      this.displayDataError();
    }
  }
  
  /**
   * データ読み込みエラーメッセージを表示する
   */
  displayDataError() {
    if (this.map) {
      const errorControl = L.control({ position: 'topright' });
      errorControl.onAdd = () => {
        const div = L.DomUtil.create('div', 'map-data-error');
        const contentDiv = document.createElement('div');
        contentDiv.className = 'error-notification';
        
        const iconSpan = document.createElement('span');
        iconSpan.className = 'error-icon';
        iconSpan.textContent = '⚠️';
        
        const textSpan = document.createElement('span');
        textSpan.className = 'error-text';
        textSpan.textContent = 'バス停データの読み込みに失敗しました';
        
        contentDiv.appendChild(iconSpan);
        contentDiv.appendChild(textSpan);
        
        div.appendChild(contentDiv);
        return div;
      };
      errorControl.addTo(this.map);
    }
  }
  
  /**
   * バス停情報のポップアップコンテンツを作成する
   * @param {Object} stop - バス停データ
   * @returns {string} ポップアップのHTMLコンテンツ
   */
  createPopupContent(stop) {
    // バス停名を翻訳
    const translatedStopName = this.translationManager ? 
      this.translationManager.translateBusStop(stop.name) : stop.name;
    
    // 翻訳キーを取得
    const stopIdLabel = this.translationManager ? 
      this.translationManager.translate('map.stop_id') : 'バス停ID';
    const passingRoutesLabel = this.translationManager ? 
      this.translationManager.translate('map.passing_routes') : '通過路線';
    const destinationsLabel = this.translationManager ? 
      this.translationManager.translate('map.destinations') : '行き先';
    const viewTimetableText = this.translationManager ? 
      this.translationManager.translate('map.view_timetable') : '時刻表を見る';
    const setDepartureText = this.translationManager ? 
      this.translationManager.translate('map.set_departure') : '乗車バス停に設定する';
    const setArrivalText = this.translationManager ? 
      this.translationManager.translate('map.set_arrival') : '降車バス停に設定する';
    
    let content = `
      <div class="bus-stop-popup">
        <h3 class="popup-title">${this.escapeHtml(translatedStopName)}</h3>
        <div class="popup-info">
          <p><strong>${this.escapeHtml(stopIdLabel)}:</strong> ${this.escapeHtml(stop.id)}</p>
    `;
    
    // 行き先（方向）情報の表示は非表示にしました（表示の高さが過剰になるため）
    // const destinations = this.getStopDestinations(stop.id);
    // if (destinations && destinations.length > 0) {
    //   content += `
    //       <p><strong>${this.escapeHtml(destinationsLabel)}:</strong></p>
    //       <ul class="destination-list">
    //   `;
    //   destinations.forEach(destination => {
    //     content += `<li>${this.escapeHtml(destination)}</li>`;
    //   });
    //   content += `
    //       </ul>
    //   `;
    // }
    
    // 路線情報が存在する場合は表示
    if (stop.routes && stop.routes.length > 0) {
      content += `
          <p><strong>${this.escapeHtml(passingRoutesLabel)}:</strong></p>
          <ul class="route-list">
      `;
      stop.routes.forEach(route => {
        content += `<li>${this.escapeHtml(route)}</li>`;
      });
      content += `
          </ul>
      `;
    }
    
    content += `
        </div>
        <div class="popup-buttons">
          <button class="popup-button popup-button-primary" data-stop-id="${this.escapeHtml(stop.id)}" data-action="timetable">
            ${this.escapeHtml(viewTimetableText)}
          </button>
          <button class="popup-button popup-button-secondary" data-stop-name="${this.escapeHtml(stop.name)}" data-action="set-departure">
            ${this.escapeHtml(setDepartureText)}
          </button>
          <button class="popup-button popup-button-secondary" data-stop-name="${this.escapeHtml(stop.name)}" data-action="set-arrival">
            ${this.escapeHtml(setArrivalText)}
          </button>
        </div>
      </div>
    `;
    
    return content;
  }

  /**
   * バス停の行き先（方向）情報を取得
   * @param {string} stopId - バス停ID
   * @returns {Array<string>} 行き先の配列（重複除去済み）
   */
  getStopDestinations(stopId) {
    try {
      if (!window.timetableController || !window.timetableController.stopTimes || !window.timetableController.trips) {
        return [];
      }

      const stopTimes = window.timetableController.stopTimes;
      const trips = window.timetableController.trips;
      const tripsIndex = window.timetableController.tripsIndex || {};

      // このバス停に停車するtrip IDのリストを取得
      const tripIds = new Set();
      stopTimes.forEach(stopTime => {
        if (stopTime.stop_id === stopId) {
          tripIds.add(stopTime.trip_id);
        }
      });

      // 各tripの行き先（trip_headsign）を取得
      const destinations = new Set();
      tripIds.forEach(tripId => {
        const trip = tripsIndex[tripId] || trips.find(t => t.trip_id === tripId);
        if (trip && trip.trip_headsign && trip.trip_headsign.trim() !== '') {
          destinations.add(trip.trip_headsign.trim());
        }
      });

      // 配列に変換してソート
      return Array.from(destinations).sort((a, b) => a.localeCompare(b, 'ja'));
    } catch (error) {
      console.warn('[MapController] 行き先情報の取得に失敗しました:', error);
      return [];
    }
  }
  
  /**
   * TranslationManagerを設定
   * @param {TranslationManager} translationManager - TranslationManagerインスタンス
   */
  setTranslationManager(translationManager) {
    this.translationManager = translationManager;
  }
  
  /**
   * HTMLエスケープ処理
   * @param {string} text - エスケープするテキスト
   * @returns {string} エスケープされたテキスト
   */
  escapeHtml(text) {
    if (typeof text !== 'string') {
      return String(text);
    }
    const htmlEntities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
  }
  
  /**
   * バス停名を入力フィールドに設定する
   * @param {string} stopName - バス停名
   * @param {string} type - 入力フィールドの種類 ('departure' | 'arrival')
   */
  setBusStopToInput(stopName, type) {
    console.log('[MapController] バス停を入力フィールドに設定:', stopName, type);
    
    // UIControllerが初期化されているか確認
    if (!window.uiController) {
      console.error('[MapController] UIControllerが初期化されていません');
      return;
    }
    
    // UIControllerのselectBusStopメソッドを呼び出す
    if (typeof window.uiController.selectBusStop === 'function') {
      window.uiController.selectBusStop(stopName, type);
      console.log('[MapController] バス停を入力フィールドに設定しました:', stopName, type);
    } else {
      console.error('[MapController] UIController.selectBusStopメソッドが見つかりません');
    }
  }
  
  /**
   * 時刻表を表示する
   * @param {string} stopId - バス停ID
   */
  showTimetable(stopId) {
    console.log('[MapController] 時刻表を表示:', stopId);
    
    // TimetableControllerとTimetableUIが初期化されているか確認
    if (!window.timetableController) {
      console.error('[MapController] TimetableControllerが初期化されていません');
      return;
    }
    
    if (!window.timetableUI) {
      console.error('[MapController] TimetableUIが初期化されていません');
      return;
    }
    
    // バス停情報を取得
    const stop = this.busStops.find(s => s.id === stopId);
    if (!stop) {
      console.error('[MapController] バス停が見つかりません:', stopId);
      return;
    }
    
    // バス停で運行している路線一覧を取得
    const routes = window.timetableController.getRoutesAtStop(stopId);
    
    if (!routes || routes.length === 0) {
      console.warn('[MapController] この停留所に路線が見つかりません:', stop.name);
      // エラーメッセージを表示するモーダルを表示
      window.timetableUI.showTimetableModal(stopId, stop.name);
      return;
    }
    
    // 時刻表モーダルを表示（stopIdとstopNameを渡す）
    window.timetableUI.showTimetableModal(stopId, stop.name);
  }
  
  /**
   * バス停選択時のコールバック関数を設定する
   * @param {Function} callback - コールバック関数 (type: 'departure'|'arrival', stopName: string) => void
   */
  setOnStopSelectedCallback(callback) {
    if (typeof callback !== 'function') {
      console.error('[MapController] コールバックは関数である必要があります');
      return;
    }
    this.onStopSelected = callback;
    console.log('[MapController] バス停選択コールバックを設定しました');
  }
  
  /**
   * 路線表示時のコールバック関数を設定する（要件4.3）
   * @param {Function} callback - コールバック関数 (routeId: string) => void
   */
  setOnRouteDisplayedCallback(callback) {
    if (typeof callback !== 'function') {
      console.error('[MapController] コールバックは関数である必要があります');
      return;
    }
    this.onRouteDisplayed = callback;
    console.log('[MapController] 路線表示コールバックを設定しました');
  }
  
  /**
   * 選択モードを設定する
   * @param {string} mode - 選択モード ('none' | 'departure' | 'arrival')
   */
  setSelectionMode(mode) {
    if (!['none', 'departure', 'arrival'].includes(mode)) {
      console.error('[MapController] 不正な選択モード:', mode);
      return;
    }
    
    this.selectionMode = mode;
    
    // 全マーカーのカーソルスタイルを変更
    this.markers.forEach(marker => {
      const element = marker.getElement();
      if (element) {
        if (mode === 'none') {
          element.style.cursor = 'pointer';
        } else {
          element.style.cursor = 'crosshair';
        }
      }
    });
    
    console.log('[MapController] 選択モードを変更しました:', mode);
  }
  
  /**
   * マーカークリック時の処理
   * @param {Object} stop - バス停データ
   */
  handleMarkerClick(stop) {
    console.log('[MapController] バス停がクリックされました:', stop.name, '選択モード:', this.selectionMode);
    
    if (this.selectionMode === 'departure') {
      // 乗車バス停として選択
      this.selectDepartureStop(stop);
      if (this.onStopSelected) {
        this.onStopSelected('departure', stop.name);
      }
    } else if (this.selectionMode === 'arrival') {
      // 降車バス停として選択
      this.selectArrivalStop(stop);
      if (this.onStopSelected) {
        this.onStopSelected('arrival', stop.name);
      }
    }
  }
  
  /**
   * 乗車バス停を選択する
   * @param {Object} stop - バス停データ
   */
  selectDepartureStop(stop) {
    console.log('[MapController] 乗車バス停を選択:', stop.name);
    
    // 既存の選択をクリア
    if (this.selectedDepartureMarker) {
      const oldStopId = this.selectedDepartureMarker.stopId;
      const oldMarker = this.markers.get(oldStopId);
      if (oldMarker) {
        // 元の青色アイコンに戻す
        oldMarker.setIcon(this.createBusStopIcon('blue'));
      }
    }
    
    // 新しいマーカーを緑色に変更
    const marker = this.markers.get(stop.id);
    if (marker) {
      marker.setIcon(this.createBusStopIcon('green'));
      marker.stopId = stop.id; // マーカーにstopIdを保存
      this.selectedDepartureMarker = marker;
    }
  }
  
  /**
   * 降車バス停を選択する
   * @param {Object} stop - バス停データ
   */
  selectArrivalStop(stop) {
    console.log('[MapController] 降車バス停を選択:', stop.name);
    
    // 既存の選択をクリア
    if (this.selectedArrivalMarker) {
      const oldStopId = this.selectedArrivalMarker.stopId;
      const oldMarker = this.markers.get(oldStopId);
      if (oldMarker) {
        // 元の青色アイコンに戻す
        oldMarker.setIcon(this.createBusStopIcon('blue'));
      }
    }
    
    // 新しいマーカーを赤色に変更
    const marker = this.markers.get(stop.id);
    if (marker) {
      marker.setIcon(this.createBusStopIcon('red'));
      marker.stopId = stop.id; // マーカーにstopIdを保存
      this.selectedArrivalMarker = marker;
    }
  }
  
  /**
   * 経路を地図上に表示する
   * @param {Object} routeData - 経路データ
   * @param {string} direction - 表示する方向（オプション: '0'=往路, '1'=復路, null=全方向）
   */
  async displayRoute(routeData, direction = null) {
    try {
      console.log('[MapController] 経路を表示します:', routeData, '方向:', direction);
      
      // 既存の経路をクリア
      this.clearRoute();
      
      // 翻訳キーを取得
      const departureStopLabel = this.translationManager ? 
        this.translationManager.translate('map.departure_stop') : '乗車バス停';
      const arrivalStopLabel = this.translationManager ? 
        this.translationManager.translate('map.arrival_stop') : '降車バス停';
      const viaStopLabel = this.translationManager ? 
        this.translationManager.translate('map.via_stop') : '経由バス停';
      const departureTimeLabel = this.translationManager ? 
        this.translationManager.translate('results.departure') : '出発';
      const arrivalTimeLabel = this.translationManager ? 
        this.translationManager.translate('results.arrival') : '到着';
      const passingTimeLabel = this.translationManager ? 
        this.translationManager.translate('map.passing_time') : '通過';
      
      // 乗車バス停マーカー（緑色）
      const departureMarker = L.marker(
        [routeData.departureStop.lat, routeData.departureStop.lng],
        { icon: this.createBusStopIcon('green') }
      );
      
      // バス停名を翻訳
      const translatedDepartureName = this.translationManager ? 
        this.translationManager.translateBusStop(routeData.departureStop.name) : routeData.departureStop.name;
      
      const departurePopupContent = `
        <div class="route-popup">
          <h4 class="route-popup-title">${this.escapeHtml(departureStopLabel)}</h4>
          <p class="route-popup-name">${this.escapeHtml(translatedDepartureName)}</p>
          <p class="route-popup-time">${this.escapeHtml(departureTimeLabel)}: ${this.escapeHtml(routeData.departureStop.time)}</p>
        </div>
      `;
      departureMarker.bindPopup(departurePopupContent);
      this.routeLayer.addLayer(departureMarker);
      
      // 降車バス停マーカー（赤色）
      const arrivalMarker = L.marker(
        [routeData.arrivalStop.lat, routeData.arrivalStop.lng],
        { icon: this.createBusStopIcon('red') }
      );
      
      // バス停名を翻訳
      const translatedArrivalName = this.translationManager ? 
        this.translationManager.translateBusStop(routeData.arrivalStop.name) : routeData.arrivalStop.name;
      
      const arrivalPopupContent = `
        <div class="route-popup">
          <h4 class="route-popup-title">${this.escapeHtml(arrivalStopLabel)}</h4>
          <p class="route-popup-name">${this.escapeHtml(translatedArrivalName)}</p>
          <p class="route-popup-time">${this.escapeHtml(arrivalTimeLabel)}: ${this.escapeHtml(routeData.arrivalStop.time)}</p>
        </div>
      `;
      arrivalMarker.bindPopup(arrivalPopupContent);
      this.routeLayer.addLayer(arrivalMarker);
      
      // 経由バス停マーカー（黄色）
      if (routeData.viaStops && routeData.viaStops.length > 0) {
        routeData.viaStops.forEach(stop => {
          const viaMarker = L.marker(
            [stop.lat, stop.lng],
            { icon: this.createBusStopIcon('yellow') }
          );
          
          // バス停名を翻訳
          const translatedViaName = this.translationManager ? 
            this.translationManager.translateBusStop(stop.name) : stop.name;
          
          const viaPopupContent = `
            <div class="route-popup">
              <h4 class="route-popup-title">${this.escapeHtml(viaStopLabel)}</h4>
              <p class="route-popup-name">${this.escapeHtml(translatedViaName)}</p>
              <p class="route-popup-time">${this.escapeHtml(passingTimeLabel)}: ${this.escapeHtml(stop.time)}</p>
            </div>
          `;
          viaMarker.bindPopup(viaPopupContent);
          this.routeLayer.addLayer(viaMarker);
        });
      }
      
      // 時刻順にバス停を並べ替えて経路座標を構築
      // 出発→経由地→到着の順序を時刻情報で保証する
      const allStops = [
        { ...routeData.departureStop, type: 'departure' },
        ...(routeData.viaStops || []).map(stop => ({ ...stop, type: 'via' })),
        { ...routeData.arrivalStop, type: 'arrival' }
      ];
      
      // 時刻でソート（HH:MM形式の文字列比較）
      allStops.sort((a, b) => {
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      // ソート後の座標配列を作成
      const sortedCoordinates = allStops.map(stop => [stop.lat, stop.lng]);
      
      // 方向に応じて経路線の色を決定（要件4.4）
      // direction='0': 青色（往路）
      // direction='1': 緑色（復路）
      // direction=null: 青色（デフォルト）
      let routeColor = '#2196F3'; // デフォルト: 青色
      if (direction === '1') {
        routeColor = '#4CAF50'; // 復路: 緑色
      }

      // ORS経路描画を優先的に使用（道路沿いの経路を描画）
      // 失敗時はRouteController側で直線フォールバックされる
      const stopsForOrs = allStops.map((s) => ({ lat: s.lat, lon: s.lng }));
      
      if (this.orsEnabled && this.orsRouteController) {
        // ORSが有効な場合：道路沿いの経路を描画
        await this.drawOrsRouteWithUi('direct-trip', stopsForOrs, {
          style: { color: routeColor, weight: 4, opacity: 0.7 },
          fitBounds: false,
          fallback: true
        });
      } else {
        // ORSが無効な場合：フォールバックとして直線描画
        // ただし、RouteControllerが利用可能な場合はそれを使用（フォールバック機能付き）
        if (this.orsRouteController) {
          // RouteControllerが初期化されているが、ORSが無効な場合でも
          // RouteControllerのフォールバック機能を使用
          try {
            await this.orsRouteController.drawBusRoute('direct-trip', stopsForOrs, {
              style: { color: routeColor, weight: 4, opacity: 0.7 },
              fitBounds: false,
              fallback: true
            });
          } catch (error) {
            console.warn('[MapController] ORS経路描画に失敗、直線描画にフォールバック:', error);
            // 従来の直線描画
            this.drawStraightLineRoute(sortedCoordinates, routeColor);
          }
        } else {
          // RouteControllerが利用できない場合のみ、従来の直線描画
          this.drawStraightLineRoute(sortedCoordinates, routeColor);
        }
      }
      
      // 経路全体が見える範囲に自動ズーム
      const bounds = L.latLngBounds(sortedCoordinates);
      this.map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 15
      });
      
      // 「経路をクリア」ボタンを表示
      this.showClearRouteButton();
      
      console.log('[MapController] 経路の表示が完了しました');
      
    } catch (error) {
      console.error('[MapController] 経路の表示に失敗しました:', {
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
  
  /**
   * 路線の全方向のバス停を取得
   * @param {string} routeId - 路線ID
   * @param {string} direction - 方向フィルタ（オプション: '0', '1', null=全方向）
   * @returns {Array<Object>} バス停座標の配列
   */
  getRouteStops(routeId, direction = null) {
    try {
      console.log('[MapController] 路線のバス停を取得します:', routeId, '方向:', direction);
      
      // TimetableControllerが初期化されているか確認
      if (!window.timetableController) {
        console.error('[MapController] TimetableControllerが初期化されていません');
        return [];
      }
      
      // TimetableControllerからstop_timesとtripsを取得
      const stopTimes = window.timetableController.stopTimes || [];
      const trips = window.timetableController.trips || [];
      
      // 指定された路線のtripsを取得
      const routeTrips = trips.filter(t => t.route_id === routeId);
      
      if (routeTrips.length === 0) {
        console.warn('[MapController] 指定された路線のtripが見つかりません:', routeId);
        return [];
      }
      
      // 方向フィルタが指定されている場合は、該当する方向のtripsのみを対象とする
      let filteredTrips = routeTrips;
      if (direction !== null) {
        // DirectionDetectorを使用して方向を判定
        if (window.DirectionDetector) {
          filteredTrips = routeTrips.filter(trip => {
            const detectedDirection = window.DirectionDetector.detectDirection(trip, routeId, trips);
            return detectedDirection === direction;
          });
        }
      }
      
      // 各tripのstop_timesからバス停IDを収集
      const stopIds = new Set();
      filteredTrips.forEach(trip => {
        const tripStopTimes = stopTimes.filter(st => st.trip_id === trip.trip_id);
        tripStopTimes.forEach(st => {
          stopIds.add(st.stop_id);
        });
      });
      
      // バス停IDから座標情報を取得
      const routeStops = [];
      stopIds.forEach(stopId => {
        const stop = this.busStops.find(s => s.id === stopId);
        if (stop && this.isValidCoordinate(stop.lat, stop.lng)) {
          routeStops.push({
            id: stop.id,
            name: stop.name,
            lat: stop.lat,
            lng: stop.lng
          });
        }
      });
      
      console.log('[MapController] 路線のバス停を取得しました:', routeStops.length, '件');
      return routeStops;
      
    } catch (error) {
      this.logError('路線のバス停取得に失敗しました', {
        message: error.message,
        details: error.stack,
        routeId: routeId,
        direction: direction
      });
      return [];
    }
  }

  /**
   * 路線の代表tripから stop_sequence 順にバス停を取得（ORS用）
   * @param {string} routeId - 路線ID
   * @param {string|null} direction - 方向（'0','1',null）
   * @returns {Array<{id:string,name:string,lat:number,lng:number}>}
   */
  getRouteStopSequence(routeId, direction = null) {
    try {
      if (!window.timetableController) return [];
      const stopTimes = window.timetableController.stopTimes || [];
      const trips = window.timetableController.trips || [];

      const routeTrips = trips.filter((t) => t.route_id === routeId);
      if (routeTrips.length === 0) return [];

      let filteredTrips = routeTrips;
      if (direction !== null && window.DirectionDetector) {
        filteredTrips = routeTrips.filter((trip) => {
          const detected = window.DirectionDetector.detectDirection(trip, routeId, trips);
          return detected === direction;
        });
      }

      const representativeTrip = filteredTrips[0] || routeTrips[0];
      if (!representativeTrip) return [];

      const stopTimesForTrip = stopTimes
        .filter((st) => st.trip_id === representativeTrip.trip_id)
        .sort((a, b) => (a.stop_sequence || 0) - (b.stop_sequence || 0));

      const sequence = [];
      let lastStopId = null;
      for (const st of stopTimesForTrip) {
        const stop = this.busStops.find((s) => s.id === st.stop_id);
        if (!stop) continue;
        if (!this.isValidCoordinate(stop.lat, stop.lng)) continue;
        if (stop.id === lastStopId) continue;
        lastStopId = stop.id;
        sequence.push({ id: stop.id, name: stop.name, lat: stop.lat, lng: stop.lng });
      }

      return sequence;
    } catch (error) {
      console.warn('[MapController] ルート停留所シーケンス取得に失敗しました', error);
      return [];
    }
  }
  
  /**
   * 路線を地図上に表示（方向別に色分け）
   * @param {string} routeId - 路線ID
   * @param {string} direction - 表示する方向（オプション: '0', '1', null=全方向）
   */
  async displayRouteStops(routeId, direction = null) {
    try {
      console.log('[MapController] 路線を地図上に表示します:', routeId, '方向:', direction);
      
      // 既存の経路をクリア
      this.clearRoute();
      
      // 路線のバス停を取得
      const stops = this.getRouteStops(routeId, direction);
      
      if (stops.length === 0) {
        console.warn('[MapController] 表示するバス停が見つかりません');
        return;
      }
      
      // 方向に応じてマーカーの色を決定
      let markerColor = 'blue'; // デフォルト
      if (direction === '0') {
        markerColor = 'blue'; // 往路: 青色
      } else if (direction === '1') {
        markerColor = 'green'; // 復路: 緑色
      }
      
      // 各バス停にマーカーを配置
      stops.forEach(stop => {
        const marker = L.marker([stop.lat, stop.lng], {
          icon: this.createBusStopIcon(markerColor)
        });
        
        marker.bindPopup(`
          <div class="route-stop-popup">
            <h4>${this.escapeHtml(stop.name)}</h4>
            <p>路線ID: ${this.escapeHtml(routeId)}</p>
            ${direction !== null ? `<p>方向: ${direction === '0' ? '往路' : '復路'}</p>` : ''}
          </div>
        `);
        
        this.routeLayer.addLayer(marker);
      });

      // ORSで路線の道路沿い経路を描画（優先的に使用）
      const orderedStops = this.getRouteStopSequence(routeId, direction);
      if (orderedStops.length >= 2) {
        const routeColor = direction === '1' ? '#4CAF50' : '#2196F3';
        const routeKey = `route-${routeId}-${direction === null ? 'both' : direction}`;
        const stopsForOrs = orderedStops.map((s) => ({ lat: s.lat, lon: s.lng }));
        
        if (this.orsEnabled && this.orsRouteController) {
          // ORSが有効な場合：道路沿いの経路を描画
          await this.drawOrsRouteWithUi(routeKey, stopsForOrs, {
            style: { color: routeColor, weight: 4, opacity: 0.7 },
            fitBounds: false,
            fallback: true
          });
        } else if (this.orsRouteController) {
          // RouteControllerが利用可能な場合：フォールバック機能付きで描画
          try {
            await this.orsRouteController.drawBusRoute(routeKey, stopsForOrs, {
              style: { color: routeColor, weight: 4, opacity: 0.7 },
              fitBounds: false,
              fallback: true
            });
          } catch (error) {
            console.warn('[MapController] ORS経路描画に失敗、直線描画にフォールバック:', error);
            // フォールバックとして直線描画（必要に応じて実装）
          }
        }
      }
      
      // 全てのバス停が見える範囲に自動ズーム
      const bounds = L.latLngBounds(stops.map(s => [s.lat, s.lng]));
      this.map.fitBounds(bounds, { 
        padding: [50, 50],
        maxZoom: 15
      });
      
      // 「経路をクリア」ボタンを表示
      this.showClearRouteButton();
      
      // 路線表示コールバックを呼び出す（要件4.3）
      if (this.onRouteDisplayed && typeof this.onRouteDisplayed === 'function') {
        this.onRouteDisplayed(routeId);
      }
      
      console.log('[MapController] 路線の表示が完了しました');
      
    } catch (error) {
      this.logError('路線の表示に失敗しました', {
        message: error.message,
        details: error.stack,
        routeId: routeId,
        direction: direction
      });
    }
  }
  
  /**
   * 特定の方向のバス停をハイライト表示する
   * @param {string} routeId - 路線ID
   * @param {string} direction - ハイライトする方向（'0', '1', null=全て通常表示）
   */
  highlightRouteDirection(routeId, direction) {
    try {
      console.log('[MapController] 方向をハイライト表示します:', routeId, '方向:', direction);
      
      if (direction === null) {
        // 全てのマーカーを通常表示に戻す
        this.markers.forEach(marker => {
          const element = marker.getElement();
          if (element) {
            element.style.opacity = '1';
            element.style.filter = 'none';
          }
        });
        return;
      }
      
      // 指定された方向のバス停を取得
      const highlightStops = this.getRouteStops(routeId, direction);
      const highlightStopIds = new Set(highlightStops.map(s => s.id));
      
      // 全てのマーカーを処理
      this.markers.forEach((marker, stopId) => {
        const element = marker.getElement();
        if (element) {
          if (highlightStopIds.has(stopId)) {
            // ハイライト対象: 通常表示
            element.style.opacity = '1';
            element.style.filter = 'none';
          } else {
            // ハイライト対象外: 半透明にする
            element.style.opacity = '0.3';
            element.style.filter = 'grayscale(100%)';
          }
        }
      });
      
      console.log('[MapController] 方向のハイライト表示が完了しました');
      
    } catch (error) {
      this.logError('方向のハイライト表示に失敗しました', {
        message: error.message,
        details: error.stack,
        routeId: routeId,
        direction: direction
      });
    }
  }
  
  /**
   * 経路表示をクリアする
   */
  clearRoute() {
    try {
      if (this.routeLayer) {
        this.routeLayer.clearLayers();
        console.log('[MapController] 経路をクリアしました');
      }

      // ORS経路描画もクリア
      if (this.orsEnabled && this.orsRouteController) {
        this.orsRouteController.clearAllRoutes();
      }
      
      // 「経路をクリア」ボタンを非表示
      this.hideClearRouteButton();
      
    } catch (error) {
      console.error('[MapController] 経路のクリアに失敗しました:', {
        message: error.message,
        details: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * 直線経路を描画（フォールバック用）
   * @param {Array<Array<number>>} coordinates - 座標配列 [[lat, lng], ...]
   * @param {string} routeColor - 経路の色
   */
  drawStraightLineRoute(coordinates, routeColor) {
    try {
      const polyline = L.polyline(coordinates, {
        color: routeColor,
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
      });

      // 矢印を追加（進行方向を示す）
      for (let i = 0; i < coordinates.length - 1; i++) {
        const start = coordinates[i];
        const end = coordinates[i + 1];

        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI - 90;

        const arrowIcon = L.divIcon({
          html: `<div style="transform: rotate(${angle}deg); color: ${routeColor}; font-size: 20px;">▶</div>`,
          className: 'route-arrow-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const arrowMarker = L.marker([midLat, midLng], { icon: arrowIcon });
        this.routeLayer.addLayer(arrowMarker);
      }

      this.routeLayer.addLayer(polyline);
    } catch (error) {
      console.error('[MapController] 直線経路の描画に失敗しました:', error);
    }
  }

  /**
   * 「経路をクリア」ボタンを表示する
   */
  showClearRouteButton() {
    const clearButton = document.getElementById('clear-route-button');
    if (clearButton) {
      clearButton.removeAttribute('hidden');
    }
  }
  
  /**
   * 「経路をクリア」ボタンを非表示にする
   */
  hideClearRouteButton() {
    const clearButton = document.getElementById('clear-route-button');
    if (clearButton) {
      clearButton.setAttribute('hidden', '');
    }
  }
  
  /**
   * 「経路をクリア」ボタンのイベントリスナーを設定する
   */
  setupClearRouteButton() {
    const clearButton = document.getElementById('clear-route-button');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clearRoute();
        
        // 方向選択UIを非表示にする（要件4.3）
        if (window.uiController && typeof window.uiController.hideDirectionSelector === 'function') {
          window.uiController.hideDirectionSelector();
          window.uiController.currentDisplayedRouteId = null;
        }
      });
      console.log('[MapController] 経路クリアボタンのイベントリスナーを設定しました');
    }
  }
  
  /**
   * 「現在地」ボタンをLeafletコントロールとして設定する
   */
  setupCurrentLocationButton() {
    // Leafletのコントロールとして現在地ボタンを作成
    const currentLocationControl = L.control({ position: 'bottomright' });
    
    currentLocationControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'current-location-control');
      const button = L.DomUtil.create('button', 'current-location-button');
      button.type = 'button';
      button.setAttribute('aria-label', '現在地を表示');
      button.innerHTML = '<span class="location-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="2" fill="currentColor"/><line x1="12" y1="4" x2="12" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="16" x2="12" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="12" x2="8" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>';
      
      // クリックイベントを設定
      L.DomEvent.on(button, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        this.showCurrentLocation();
      });
      
      // タッチデバイスでのダブルタップズームを防ぐ
      L.DomEvent.disableClickPropagation(button);
      
      div.appendChild(button);
      return div;
    };
    
    // 地図にコントロールを追加
    currentLocationControl.addTo(this.map);
    this.currentLocationControl = currentLocationControl;
    
    console.log('[MapController] 現在地ボタンをLeafletコントロールとして追加しました');
  }
  
  /**
   * 現在地を表示する
   */
  async showCurrentLocation() {
    try {
      console.log('[MapController] 現在地の取得を開始します');
      
      // Geolocation APIで現在地を取得
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
      console.log('[MapController] 現在地を取得しました:', { latitude, longitude });
      
      // 地図を現在地中心に移動（ズームレベル15）
      this.map.setView([latitude, longitude], 15);
      
      // 現在地マーカーを表示
      this.displayCurrentLocationMarker(latitude, longitude);
      
    } catch (error) {
      this.handleLocationError(error);
    }
  }
  
  /**
   * Geolocation APIで現在地を取得
   * @returns {Promise<GeolocationPosition>} 位置情報
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolocation APIがサポートされていません');
        error.code = 'NOT_SUPPORTED';
        reject(error);
        return;
      }
      
      // Permissions-Policyのチェック（可能な場合）
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: 'geolocation' }).then((result) => {
          if (result.state === 'denied') {
            const error = new Error('位置情報の使用が許可されていません（Permissions-Policyにより無効化されています）');
            error.code = 'PERMISSION_DENIED';
            error.permissionsPolicyState = result.state;
            reject(error);
            return;
          }
          
          // 許可されている場合は通常の位置情報取得を実行
          this.requestCurrentPosition(resolve, reject);
        }).catch(() => {
          // permissions.queryが失敗した場合は通常の位置情報取得を実行
          this.requestCurrentPosition(resolve, reject);
        });
      } else {
        // permissions.queryがサポートされていない場合は通常の位置情報取得を実行
        this.requestCurrentPosition(resolve, reject);
      }
    });
  }
  
  /**
   * 実際の位置情報取得を実行する
   * @param {Function} resolve - 成功時のコールバック
   * @param {Function} reject - 失敗時のコールバック
   */
  requestCurrentPosition(resolve, reject) {
    const options = {
      enableHighAccuracy: true,
      timeout: 15000, // モバイル実機ではタイムアウトを長めに設定
      maximumAge: 0
    };
    
    // モバイル実機での診断情報を出力
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      console.log('[MapController] モバイル実機での位置情報取得を開始します', {
        userAgent: navigator.userAgent,
        options: options
      });
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (isMobile) {
          console.log('[MapController] モバイル実機での位置情報取得に成功しました', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        }
        resolve(position);
      },
      (error) => {
        // エラーに詳細情報を追加
        const enhancedError = {
          ...error,
          userAgent: navigator.userAgent,
          isMobile: isMobile,
          timestamp: new Date().toISOString()
        };
        
        if (isMobile) {
          console.error('[MapController] モバイル実機での位置情報取得に失敗しました', enhancedError);
          
          // エラーコードに応じた診断情報を出力
          if (error.code === error.PERMISSION_DENIED) {
            console.warn('[MapController] 位置情報が拒否されました。ブラウザの設定またはPermissions-Policyを確認してください。');
          }
        }
        
        reject(enhancedError);
      },
      options
    );
  }
  
  /**
   * 現在地マーカーを表示
   * @param {number} lat - 緯度
   * @param {number} lng - 経度
   */
  displayCurrentLocationMarker(lat, lng) {
    // 既存の現在地マーカーを削除
    if (this.currentLocationMarker) {
      this.map.removeLayer(this.currentLocationMarker);
    }
    
    // 現在地アイコンを作成（位置ピンアイコン - 赤オレンジ色）
    const icon = L.divIcon({
      html: '<div class="current-location-marker"><svg width="30" height="41" viewBox="0 0 30 41" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pinGradient" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" /><stop offset="100%" style="stop-color:#FFB74D;stop-opacity:1" /></linearGradient></defs><path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 26 15 26s15-15.5 15-26C30 6.716 23.284 0 15 0z" fill="url(#pinGradient)"/><circle cx="15" cy="15" r="6" fill="white"/></svg></div>',
      className: 'current-location-icon',
      iconSize: [30, 41],
      iconAnchor: [15, 41]
    });
    
    // マーカーを作成
    this.currentLocationMarker = L.marker([lat, lng], { icon });
    this.currentLocationMarker.addTo(this.map);
    
    // ポップアップを追加
    this.currentLocationMarker.bindPopup('現在地');
    
    console.log('[MapController] 現在地マーカーを表示しました');
  }
  
  /**
   * 位置情報エラーハンドリング
   * @param {GeolocationPositionError|Error} error - エラーオブジェクト
   */
  handleLocationError(error) {
    let message = '位置情報の取得に失敗しました';
    
    if (error.code) {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = '位置情報の使用が許可されていません';
          break;
        case error.POSITION_UNAVAILABLE:
          message = '位置情報が利用できません';
          break;
        case error.TIMEOUT:
          message = '位置情報の取得がタイムアウトしました';
          break;
      }
    } else if (error.message) {
      message = error.message;
    }
    
    console.error('[MapController] 位置情報エラー:', message, error);
    this.displayLocationError(message);
  }
  
  /**
   * 位置情報エラーメッセージを表示
   * @param {string} message - エラーメッセージ
   */
  displayLocationError(message) {
    // エラー通知を表示（3秒後に自動消去）
    const notification = L.control({ position: 'topright' });
    notification.onAdd = () => {
      const div = L.DomUtil.create('div', 'location-error-notification');
      const contentDiv = document.createElement('div');
      contentDiv.className = 'notification-content';
      
      const iconSpan = document.createElement('span');
      iconSpan.className = 'notification-icon';
      iconSpan.textContent = '⚠️';
      
      const textSpan = document.createElement('span');
      textSpan.className = 'notification-text';
      textSpan.textContent = message; // Using textContent makes it safe, no escapeHtml needed
      
      contentDiv.appendChild(iconSpan);
      contentDiv.appendChild(textSpan);
      
      div.appendChild(contentDiv);
      
      setTimeout(() => {
        if (div.parentNode) {
          div.parentNode.removeChild(div);
        }
      }, 3000);
      
      return div;
    };
    notification.addTo(this.map);
  }
  
  /**
   * 統一されたエラーログを出力する
   * @param {string} message - エラーメッセージ
   * @param {Object} details - エラーの詳細情報
   */
  logError(message, details = {}) {
    this.errorCount++;
    
    const errorLog = {
      errorId: this.errorCount,
      timestamp: new Date().toISOString(),
      component: 'MapController',
      message: message,
      details: details
    };
    
    console.error(`[MapController] エラー #${this.errorCount}:`, errorLog);
    
    // エラーログを保存（デバッグ用）
    if (!window.mapControllerErrors) {
      window.mapControllerErrors = [];
    }
    window.mapControllerErrors.push(errorLog);
    
    // エラーが多数発生している場合は警告
    if (this.errorCount >= 10 && this.errorCount % 10 === 0) {
      console.warn(`[MapController] 警告: ${this.errorCount}件のエラーが発生しています`);
    }
  }
  
  /**
   * エラーログをクリアする
   */
  clearErrorLog() {
    this.errorCount = 0;
    if (window.mapControllerErrors) {
      window.mapControllerErrors = [];
    }
    console.log('[MapController] エラーログをクリアしました');
  }
  
  /**
   * エラーログを取得する
   * @returns {Array<Object>} エラーログの配列
   */
  getErrorLog() {
    return window.mapControllerErrors || [];
  }
  
  /**
   * パフォーマンス統計を取得する
   * @returns {Object} パフォーマンス統計情報
   */
  getPerformanceStats() {
    const stats = {
      markerCount: this.markers.size,
      clusterCount: this.markerCluster ? this.markerCluster.getLayers().length : 0,
      routeLayerCount: this.routeLayer ? this.routeLayer.getLayers().length : 0,
      errorCount: this.errorCount,
      mapZoom: this.map ? this.map.getZoom() : null,
      mapCenter: this.map ? this.map.getCenter() : null
    };
    
    // パフォーマンスAPIが利用可能な場合は追加情報を取得
    if (window.performance && window.performance.memory) {
      stats.memory = {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: window.performance.memory.jsHeapSizeLimit
      };
    }
    
    return stats;
  }
  
  /**
   * フレームレートを計測する（デバッグ用）
   * @param {number} duration - 計測時間（ミリ秒）
   * @returns {Promise<Object>} フレームレート統計
   */
  measureFrameRate(duration = 5000) {
    return new Promise((resolve) => {
      const frames = [];
      let lastTime = performance.now();
      let frameCount = 0;
      const startTime = lastTime;
      
      const measureFrame = (currentTime) => {
        const delta = currentTime - lastTime;
        const fps = 1000 / delta;
        frames.push(fps);
        frameCount++;
        lastTime = currentTime;
        
        if (currentTime - startTime < duration) {
          requestAnimationFrame(measureFrame);
        } else {
          // 統計を計算
          const avgFps = frames.reduce((a, b) => a + b, 0) / frames.length;
          const minFps = Math.min(...frames);
          const maxFps = Math.max(...frames);
          
          const stats = {
            duration: currentTime - startTime,
            frameCount: frameCount,
            averageFPS: avgFps.toFixed(2),
            minFPS: minFps.toFixed(2),
            maxFPS: maxFps.toFixed(2),
            meets60FPS: avgFps >= 60,
            recommendation: avgFps >= 60 
              ? 'パフォーマンスは良好です（60FPS以上を維持）' 
              : `パフォーマンスが低下しています（平均${avgFps.toFixed(2)}FPS）。マーカー数を減らすか、クラスタリング設定を調整してください。`
          };
          
          console.log('[MapController] フレームレート計測結果:', stats);
          resolve(stats);
        }
      };
      
      requestAnimationFrame(measureFrame);
    });
  }
  
  // ========================================
  // 車両マーカー関連メソッド
  // ========================================
  
  /**
   * 車両アイコンを作成する
   * @param {string} status - 運行状態 ('before_start' | 'on_time' | 'delayed' | 'finished')
   * @returns {L.DivIcon} Leaflet DivIconオブジェクト
   */
  createVehicleIcon(status = 'on_time') {
    // 運行状態に応じた色を設定
    const statusColors = {
      before_start: '#FFC107', // 黄色（運行開始前）
      on_time: '#4CAF50',      // 緑色（定刻通り）
      delayed: '#F44336',      // 赤色（遅延）
      finished: '#757575'      // グレー（運行終了）
    };
    
    const color = status ? (statusColors[status] || statusColors.on_time) : statusColors.on_time;
    
    // バスアイコンのSVG
    const svgIcon = `
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
        <circle cx="15" cy="15" r="14" fill="${color}" stroke="#fff" stroke-width="2"/>
        <path d="M10 10 h10 v8 h-10 z M10 18 h10 v2 h-10 z M11 20 v2 M19 20 v2" 
              stroke="#fff" stroke-width="2" fill="none"/>
        <circle cx="12" cy="21" r="1.5" fill="#fff"/>
        <circle cx="18" cy="21" r="1.5" fill="#fff"/>
      </svg>
    `;
    
    return L.divIcon({
      html: svgIcon,
      className: 'vehicle-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
  }
  
  /**
   * 車両マーカーを作成する
   * @param {number} lat - 緯度
   * @param {number} lng - 経度
   * @param {string} status - 運行状態
   * @param {Object} tripInfo - 便情報
   * @returns {L.Marker} 作成された車両マーカー
   */
  createVehicleMarker(lat, lng, status, tripInfo, popupContent = null) {
    try {
      // 座標の妥当性チェック
      if (!this.isValidCoordinate(lat, lng)) {
        this.logError('不正な座標で車両マーカーを作成しようとしました', {
          latitude: lat,
          longitude: lng,
          tripId: tripInfo.tripId,
          reason: this.getCoordinateErrorReason(lat, lng)
        });
        return null;
      }
      
      // 車両アイコンを作成（statusが指定されている場合のみ）
      const icon = status ? this.createVehicleIcon(status) : this.createVehicleIcon('in_transit');
      
      // マーカーを作成
      const marker = L.marker([lat, lng], {
        icon: icon,
        title: tripInfo.routeName || '車両'
      });
      
      // 吹き出しを作成
      // popupContentが渡された場合はそれを使用、ない場合は既存の方法で生成
      let finalPopupContent;
      if (popupContent) {
        finalPopupContent = popupContent;
      } else {
        const defaultStatus = status || 'in_transit';
        finalPopupContent = this.createVehiclePopupContent(defaultStatus, tripInfo);
      }
      
      marker.bindPopup(finalPopupContent, {
        maxWidth: 400,
        className: 'vehicle-popup-container'
      });
      
      // 地図に追加
      marker.addTo(this.map);
      
      // 車両マーカー管理Mapに追加
      this.vehicleMarkers.set(tripInfo.tripId, marker);
      
      console.log('[MapController] 車両マーカーを作成しました:', {
        tripId: tripInfo.tripId,
        status: status,
        position: [lat, lng],
        hasCustomPopup: !!popupContent
      });
      
      return marker;
      
    } catch (error) {
      this.logError('車両マーカーの作成に失敗しました', {
        message: error.message,
        details: error.stack,
        tripId: tripInfo.tripId
      });
      return null;
    }
  }
  
  /**
   * 車両ポップアップのコンテンツを作成する
   * @param {string} status - 運行状態
   * @param {Object} tripInfo - 便情報
   * @returns {string} ポップアップのHTMLコンテンツ
   */
  createVehiclePopupContent(status, tripInfo) {
    let content = `
      <div class="vehicle-popup">
        <h3 class="popup-title">${this.escapeHtml(tripInfo.routeName || '路線名不明')}</h3>
        <div class="popup-info">
          <p><strong>便ID:</strong> ${this.escapeHtml(tripInfo.tripId)}</p>
        </div>
        <div class="trip-timetable-container" data-trip-id="${this.escapeHtml(tripInfo.tripId)}">
          <!-- 時刻表はRealtimeVehicleControllerによって動的に追加されます -->
        </div>
      </div>
    `;
    
    return content;
  }
  
  /**
   * 車両マーカーの位置を更新する
   * @param {string} tripId - 便ID
   * @param {number} lat - 新しい緯度
   * @param {number} lng - 新しい経度
   * @param {HTMLElement|string} popupContent - ポップアップコンテンツ（HTMLElementまたはHTML文字列）
   * @param {Object} tripInfo - 便情報
   */
  updateVehicleMarkerPosition(tripId, lat, lng, popupContent, tripInfo) {
    try {
      // 座標の妥当性チェック
      if (!this.isValidCoordinate(lat, lng)) {
        this.logError('不正な座標で車両マーカーを更新しようとしました', {
          tripId: tripId,
          latitude: lat,
          longitude: lng,
          reason: this.getCoordinateErrorReason(lat, lng)
        });
        return;
      }
      
      const marker = this.vehicleMarkers.get(tripId);
      
      if (marker) {
        // 既存マーカーの位置を更新
        marker.setLatLng([lat, lng]);
        
        // アイコンを更新（statusが含まれている場合は使用、ない場合は既存のアイコンを維持）
        // popupContentが渡された場合は、status情報がない可能性があるため、アイコン更新はスキップ
        
        // ポップアップの内容を更新
        // popupContentが渡された場合はそれを使用、ない場合は既存の方法で生成
        if (popupContent) {
          marker.setPopupContent(popupContent);
        } else {
          // 後方互換性のため、popupContentが渡されない場合は既存の方法で生成
          const status = tripInfo.status || 'in_transit';
          const defaultPopupContent = this.createVehiclePopupContent(status, tripInfo);
          marker.setPopupContent(defaultPopupContent);
        }
        
        console.log('[MapController] 車両マーカーを更新しました:', {
          tripId: tripId,
          position: [lat, lng],
          hasCustomPopup: !!popupContent
        });
      } else {
        // マーカーが存在しない場合は新規作成
        console.log('[MapController] 車両マーカーが存在しないため新規作成します:', tripId);
        this.createVehicleMarker(lat, lng, null, tripInfo, popupContent);
      }
      
    } catch (error) {
      this.logError('車両マーカーの更新に失敗しました', {
        message: error.message,
        details: error.stack,
        tripId: tripId
      });
    }
  }
  
  /**
   * 車両マーカーを削除する
   * @param {string} tripId - 便ID
   */
  removeVehicleMarker(tripId) {
    try {
      const marker = this.vehicleMarkers.get(tripId);
      
      if (marker) {
        // 地図からマーカーを削除
        this.map.removeLayer(marker);
        
        // 車両マーカー管理Mapから削除
        this.vehicleMarkers.delete(tripId);
        
        console.log('[MapController] 車両マーカーを削除しました:', tripId);
      }
      
    } catch (error) {
      this.logError('車両マーカーの削除に失敗しました', {
        message: error.message,
        details: error.stack,
        tripId: tripId
      });
    }
  }
  
  /**
   * 車両マーカーを強調表示する
   * @param {string} tripId - 強調表示する便ID（nullの場合は全て通常表示に戻す）
   */
  highlightVehicleMarker(tripId) {
    try {
      this.vehicleMarkers.forEach((marker, id) => {
        const element = marker.getElement();
        if (element) {
          if (tripId === null) {
            // 全て通常表示に戻す
            element.style.opacity = '1';
            element.style.zIndex = '1000';
          } else if (id === tripId) {
            // 選択された車両を強調表示
            element.style.opacity = '1';
            element.style.zIndex = '2000';
            element.style.transform = 'scale(1.2)';
          } else {
            // 他の車両を半透明にする
            element.style.opacity = '0.4';
            element.style.zIndex = '1000';
            element.style.transform = 'scale(1)';
          }
        }
      });
      
      console.log('[MapController] 車両マーカーを強調表示しました:', tripId);
      
    } catch (error) {
      this.logError('車両マーカーの強調表示に失敗しました', {
        message: error.message,
        details: error.stack,
        tripId: tripId
      });
    }
  }
  
}

// MapControllerをグローバルスコープに公開
if (typeof window !== 'undefined') {
  window.MapController = MapController;
}
