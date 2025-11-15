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
      
      // Leafletマップを初期化（佐賀市中心部を中心にズームレベル13）
      this.map = L.map(containerId, {
        center: [33.2635, 130.3005],
        zoom: 13,
        minZoom: 10,  // ズームレベルを10〜18に制限
        maxZoom: 18,
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
      
      // 「経路をクリア」ボタンのイベントリスナーを設定
      this.setupClearRouteButton();
      
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
    
    // プライマリタイルレイヤーを作成
    currentTileLayer = L.tileLayer(primaryTileUrl, {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
      minZoom: 10,
      errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    });
    
    // タイル読み込みエラーイベントを監視
    currentTileLayer.on('tileerror', (error) => {
      tileLoadErrorCount++;
      
      this.logError('地図タイルの読み込みに失敗しました', {
        message: error.error ? error.error.message : 'Unknown error',
        tileUrl: error.tile ? error.tile.src : 'Unknown',
        errorCount: tileLoadErrorCount
      });
      
      // エラーが一定数を超えたら代替サーバーに切り替え
      if (tileLoadErrorCount >= 5 && currentTileLayer._url === primaryTileUrl) {
        this.logError('代替タイルサーバーに切り替えます', {
          from: primaryTileUrl,
          to: fallbackTileUrl
        });
        
        // 現在のレイヤーを削除
        this.map.removeLayer(currentTileLayer);
        
        // 代替タイルレイヤーを作成
        currentTileLayer = L.tileLayer(fallbackTileUrl, {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
          minZoom: 10
        });
        
        currentTileLayer.addTo(this.map);
        
        // エラーカウントをリセット
        tileLoadErrorCount = 0;
        
        // ユーザーに通知
        this.displayTileErrorNotification();
      }
    });
    
    // タイルレイヤーを地図に追加
    currentTileLayer.addTo(this.map);
    
    // タイルレイヤーを保存
    this.currentTileLayer = currentTileLayer;
  }
  
  /**
   * タイル読み込みエラー通知を表示する
   */
  displayTileErrorNotification() {
    if (this.map) {
      const notification = L.control({ position: 'bottomleft' });
      notification.onAdd = () => {
        const div = L.DomUtil.create('div', 'tile-error-notification');
        div.innerHTML = `
          <div class="notification-content">
            <span class="notification-icon">ℹ️</span>
            <span class="notification-text">地図の読み込みに問題が発生したため、代替サーバーを使用しています</span>
          </div>
        `;
        
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
      container.innerHTML = `
        <div class="map-error-message">
          <div class="error-icon">⚠️</div>
          <h3>地図ライブラリの読み込みに失敗しました</h3>
          <p>地図を表示できません。ページを再読み込みしてください。</p>
          <button class="retry-button" onclick="location.reload()">再読み込み</button>
        </div>
      `;
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.backgroundColor = '#f5f5f5';
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
          marker.bindPopup(this.createPopupContent(stop), {
            maxWidth: 300,
            className: 'bus-stop-popup-container'
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
        div.innerHTML = `
          <div class="error-notification">
            <span class="error-icon">⚠️</span>
            <span class="error-text">バス停データの読み込みに失敗しました</span>
          </div>
        `;
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
    let content = `
      <div class="bus-stop-popup">
        <h3 class="popup-title">${this.escapeHtml(stop.name)}</h3>
        <div class="popup-info">
          <p><strong>バス停ID:</strong> ${this.escapeHtml(stop.id)}</p>
    `;
    
    // 路線情報が存在する場合は表示
    if (stop.routes && stop.routes.length > 0) {
      content += `
          <p><strong>通過路線:</strong></p>
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
        <button class="popup-button" onclick="window.mapController.showTimetable('${this.escapeHtml(stop.id)}')">
          時刻表を見る
        </button>
      </div>
    `;
    
    return content;
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
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /**
   * 時刻表を表示する（プレースホルダー）
   * @param {string} stopId - バス停ID
   */
  showTimetable(stopId) {
    console.log('[MapController] 時刻表を表示:', stopId);
    // 実際の時刻表表示機能は後のタスクで実装
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
   */
  displayRoute(routeData) {
    try {
      console.log('[MapController] 経路を表示します:', routeData);
      
      // 既存の経路をクリア
      this.clearRoute();
      
      // 乗車バス停マーカー（緑色）
      const departureMarker = L.marker(
        [routeData.departureStop.lat, routeData.departureStop.lng],
        { icon: this.createBusStopIcon('green') }
      );
      
      const departurePopupContent = `
        <div class="route-popup">
          <h4 class="route-popup-title">乗車バス停</h4>
          <p class="route-popup-name">${this.escapeHtml(routeData.departureStop.name)}</p>
          <p class="route-popup-time">出発: ${this.escapeHtml(routeData.departureStop.time)}</p>
        </div>
      `;
      departureMarker.bindPopup(departurePopupContent);
      this.routeLayer.addLayer(departureMarker);
      
      // 降車バス停マーカー（赤色）
      const arrivalMarker = L.marker(
        [routeData.arrivalStop.lat, routeData.arrivalStop.lng],
        { icon: this.createBusStopIcon('red') }
      );
      
      const arrivalPopupContent = `
        <div class="route-popup">
          <h4 class="route-popup-title">降車バス停</h4>
          <p class="route-popup-name">${this.escapeHtml(routeData.arrivalStop.name)}</p>
          <p class="route-popup-time">到着: ${this.escapeHtml(routeData.arrivalStop.time)}</p>
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
          
          const viaPopupContent = `
            <div class="route-popup">
              <h4 class="route-popup-title">経由バス停</h4>
              <p class="route-popup-name">${this.escapeHtml(stop.name)}</p>
              <p class="route-popup-time">通過: ${this.escapeHtml(stop.time)}</p>
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
      
      // 経路線を描画（青色）
      const polyline = L.polyline(sortedCoordinates, {
        color: '#2196F3',
        weight: 4,
        opacity: 0.7,
        smoothFactor: 1
      });
      
      // 矢印を追加（進行方向を示す）
      // 時刻順にソートされた座標を使用するため、必ず出発→到着の方向になる
      for (let i = 0; i < sortedCoordinates.length - 1; i++) {
        const start = sortedCoordinates[i];
        const end = sortedCoordinates[i + 1];
        
        // 中点を計算
        const midLat = (start[0] + end[0]) / 2;
        const midLng = (start[1] + end[1]) / 2;
        
        // 角度を計算（進行方向を示す）
        // Leafletの座標は[lat, lng]の順序
        // Math.atan2(dy, dx)で東を0度とした角度を計算
        // ▶アイコンは右向きなので、startからendへの方向に向けるため-90度を加算
        // （90度ではなく-90度にすることで180度反転した正しい方向になる）
        const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI - 90;
        
        // 矢印アイコンを作成
        const arrowIcon = L.divIcon({
          html: `<div style="transform: rotate(${angle}deg); color: #2196F3; font-size: 20px;">▶</div>`,
          className: 'route-arrow-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        
        // 矢印マーカーを配置
        const arrowMarker = L.marker([midLat, midLng], { icon: arrowIcon });
        this.routeLayer.addLayer(arrowMarker);
      }
      
      this.routeLayer.addLayer(polyline);
      
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
   * 経路表示をクリアする
   */
  clearRoute() {
    try {
      if (this.routeLayer) {
        this.routeLayer.clearLayers();
        console.log('[MapController] 経路をクリアしました');
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
   * 「経路をクリア」ボタンを表示する
   */
  showClearRouteButton() {
    const clearButton = document.getElementById('clear-route-button');
    if (clearButton) {
      clearButton.style.display = 'block';
    }
  }
  
  /**
   * 「経路をクリア」ボタンを非表示にする
   */
  hideClearRouteButton() {
    const clearButton = document.getElementById('clear-route-button');
    if (clearButton) {
      clearButton.style.display = 'none';
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
      });
      console.log('[MapController] 経路クリアボタンのイベントリスナーを設定しました');
    }
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
}
