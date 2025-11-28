/**
 * TimetableUIクラス
 * 時刻表UIを担当
 */
class TimetableUI {
  /**
   * コンストラクタ
   * @param {TimetableController} timetableController - TimetableControllerインスタンス
   */
  constructor(timetableController) {
    this.timetableController = timetableController;
    
    // 現在の状態を保持
    this.currentStopId = null;
    this.currentStopName = null;
    this.currentRouteId = null;
    this.currentRouteName = null;
    this.currentTab = 'weekday'; // 'weekday' or 'weekend'
    this.currentDirectionFilter = 'all'; // 'all', '0', '1'
    
    // モーダル要素への参照
    this.modal = null;
    this.modalContent = null;
    
    // イベントリスナーの初期化
    this.initializeEventListeners();
  }

  /**
   * イベントリスナーを初期化
   * @private
   */
  initializeEventListeners() {
    // モーダル要素への参照を取得
    this.modal = document.getElementById('timetable-modal');
    this.modalBody = document.getElementById('timetable-modal-body');
    
    if (!this.modal || !this.modalBody) {
      console.error('TimetableUI: モーダル要素が見つかりません');
      return;
    }

    // モーダルの外側をクリックしたら閉じる
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Escapeキーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.hasAttribute('hidden')) {
        this.closeModal();
      }
    });
    
    // フォーカストラップの設定
    this.setupFocusTrap();
  }
  
  /**
   * フォーカストラップを設定
   * @private
   */
  setupFocusTrap() {
    this.modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      
      const focusableElements = this.modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;
      
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }

  /**
   * 時刻表モーダルを表示
   * @param {string} stopId - バス停ID
   * @param {string} stopName - バス停名
   */
  showTimetableModal(stopId, stopName) {
    // 入力値の検証
    if (!stopId || !stopName) {
      console.error('TimetableUI: stopIdまたはstopNameが指定されていません');
      return;
    }

    // 現在の状態を保存
    this.currentStopId = stopId;
    this.currentStopName = stopName;
    this.currentRouteId = null;
    this.currentRouteName = null;
    this.currentTab = 'weekday';

    // バス停で運行している路線一覧を取得
    const routes = this.timetableController.getRoutesAtStop(stopId);

    if (routes.length === 0) {
      this.showError('この停留所に路線が見つかりません');
      return;
    }

    // 現在のフォーカス要素を保存（モーダルを閉じたときに戻すため）
    this.previousActiveElement = document.activeElement;

    // モーダルを表示
    this.displayRouteSelection(routes);
    this.modal.removeAttribute('hidden');
    
    // アクセシビリティ: フォーカスをモーダルに移動
    this.modal.focus();
  }



  /**
   * 路線選択画面を表示
   * @param {Array<Object>} routes - 路線一覧
   */
  displayRouteSelection(routes) {
    // ヘッダーを作成
    const header = this.createModalHeader(`時刻表 - ${this.currentStopName}`);
    
    // 路線リストを作成
    const routeList = document.createElement('div');
    routeList.className = 'timetable-route-list';
    routeList.setAttribute('role', 'list');

    const instruction = document.createElement('p');
    instruction.className = 'timetable-instruction';
    instruction.textContent = '路線を選択してください';
    routeList.appendChild(instruction);

    // DataLoaderから路線メタデータを取得
    const dataLoader = window.dataLoader;
    let routeMetadata = null;
    if (dataLoader && typeof dataLoader.generateRouteMetadata === 'function') {
      routeMetadata = dataLoader.generateRouteMetadata();
    }

    routes.forEach((route, index) => {
      const routeItem = document.createElement('div');
      routeItem.className = 'timetable-route-item';
      routeItem.setAttribute('role', 'listitem');
      routeItem.setAttribute('tabindex', '0');
      routeItem.setAttribute('aria-label', `${route.routeName}を選択`);

      const routeNumber = document.createElement('span');
      routeNumber.className = 'timetable-route-number';
      routeNumber.textContent = `${index + 1}.`;

      const routeInfo = document.createElement('div');
      routeInfo.className = 'timetable-route-info';

      const routeName = document.createElement('div');
      routeName.className = 'timetable-route-name';
      routeName.textContent = route.routeName;

      const agencyName = document.createElement('div');
      agencyName.className = 'timetable-agency-name';
      agencyName.textContent = this.getAgencyName(route.agencyId);

      routeInfo.appendChild(routeName);
      routeInfo.appendChild(agencyName);

      routeItem.appendChild(routeNumber);
      routeItem.appendChild(routeInfo);

      // 方向判定バッジを追加
      if (routeMetadata && routeMetadata[route.routeId]) {
        const metadata = routeMetadata[route.routeId];
        const detectionRate = metadata.directionDetectionRate;
        // detectionRateがundefined、null、NaNの場合もバッジを表示（N/Aバッジ）
        const badge = this.createDetectionBadge(detectionRate);
        if (badge) {
          routeItem.appendChild(badge);
        }
      }

      // クリックイベント
      routeItem.addEventListener('click', () => {
        this.onRouteSelected(route.routeId, route.routeName);
      });

      // キーボードイベント（Enter/Space）
      routeItem.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.onRouteSelected(route.routeId, route.routeName);
        }
      });

      routeList.appendChild(routeItem);
    });

    // モーダルコンテンツを更新
    this.modalBody.innerHTML = '';
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'timetable-modal-content';
    contentWrapper.appendChild(header);
    contentWrapper.appendChild(routeList);
    this.modalBody.appendChild(contentWrapper);
  }

  /**
   * 方向判定バッジを作成
   * @param {number} detectionRate - 方向判定成功率（0.0-1.0）
   * @returns {HTMLElement|null} バッジ要素、または成功率80%以上の場合はnull
   */
  createDetectionBadge(detectionRate) {
    try {
      // 入力値の検証
      if (detectionRate === undefined || detectionRate === null || isNaN(detectionRate)) {
        console.warn('TimetableUI: 方向判定成功率が計算できません', { detectionRate });
        
        // N/Aバッジを作成
        const badge = document.createElement('span');
        badge.className = 'detection-badge detection-badge-na';
        badge.textContent = 'N/A';
        badge.setAttribute('role', 'status');
        badge.setAttribute('aria-label', '方向判定成功率: 不明');
        
        // ツールチップ用のID
        const tooltipId = `tooltip-na-${Math.random().toString(36).substr(2, 9)}`;
        badge.setAttribute('aria-describedby', tooltipId);
        badge.setAttribute('data-tooltip', '方向判定成功率が計算できません');
        
        return badge;
      }

      // 成功率80%以上の場合はバッジを表示しない
      if (detectionRate >= 0.8) {
        return null;
      }

      const badge = document.createElement('span');
      badge.className = 'detection-badge';
      badge.setAttribute('role', 'status');

      let badgeText = '';
      let badgeClass = '';
      let tooltipText = '';
      const percentage = Math.round(detectionRate * 100);

      if (detectionRate < 0.5) {
        // 成功率50%未満: 警告バッジ
        badgeClass = 'detection-badge-warning';
        badgeText = '⚠';
        tooltipText = `方向判定成功率: ${percentage}% (低)`;
        badge.setAttribute('aria-label', `警告: 方向判定成功率が低い (${percentage}%)`);
      } else if (detectionRate < 0.8) {
        // 成功率50-80%: 注意バッジ
        badgeClass = 'detection-badge-caution';
        badgeText = '!';
        tooltipText = `方向判定成功率: ${percentage}% (中)`;
        badge.setAttribute('aria-label', `注意: 方向判定成功率が中程度 (${percentage}%)`);
      }

      badge.classList.add(badgeClass);
      badge.textContent = badgeText;

      // ツールチップ用のID
      const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
      badge.setAttribute('aria-describedby', tooltipId);
      badge.setAttribute('data-tooltip', tooltipText);

      return badge;
    } catch (error) {
      console.error('TimetableUI: 方向判定バッジの作成中にエラーが発生しました', error);
      return null;
    }
  }

  /**
   * 路線が選択されたときの処理
   * @param {string} routeId - 路線ID
   * @param {string} routeName - 路線名
   * @private
   */
  onRouteSelected(routeId, routeName) {
    this.currentRouteId = routeId;
    this.currentRouteName = routeName;
    this.currentTab = 'weekday';
    this.currentDirectionFilter = 'all';
    
    // 時刻表を表示
    this.displayTimetable();
  }

  /**
   * 時刻表を表示
   */
  displayTimetable() {
    console.log('TimetableUI: displayTimetable呼び出し', { currentTab: this.currentTab });
    
    // 平日と土日祝の時刻表を取得
    const weekdayTimetable = this.timetableController.getTimetable(
      this.currentStopId,
      this.currentRouteId,
      '平日'
    );
    
    const weekendTimetable = this.timetableController.getTimetable(
      this.currentStopId,
      this.currentRouteId,
      '土日祝'
    );

    // ヘッダーを作成
    const header = this.createModalHeader(`時刻表 - ${this.currentRouteName}`);

    // 戻るボタンを追加
    const backButton = document.createElement('button');
    backButton.type = 'button';
    backButton.className = 'timetable-back-button';
    backButton.textContent = '← 路線選択に戻る';
    backButton.setAttribute('aria-label', '路線選択画面に戻る');
    backButton.addEventListener('click', () => {
      const routes = this.timetableController.getRoutesAtStop(this.currentStopId);
      this.displayRouteSelection(routes);
    });

    // タブを作成
    const tabs = this.createTabs();

    // 方向フィルタを作成
    const directionFilter = this.createDirectionFilter(this.currentDirectionFilter);

    // 地図表示ボタンを作成
    const mapButton = this.createMapButton();

    // 時刻表コンテンツを作成
    const timetableContent = document.createElement('div');
    timetableContent.className = 'timetable-content';

    // 平日タブのコンテンツ
    const weekdayContent = this.createTimetableTable(weekdayTimetable, this.currentDirectionFilter);
    weekdayContent.id = 'timetable-weekday';
    weekdayContent.classList.add('timetable-tab-content');
    weekdayContent.setAttribute('role', 'tabpanel');
    weekdayContent.setAttribute('aria-labelledby', 'tab-weekday');
    if (this.currentTab === 'weekday') {
      console.log('TimetableUI: 平日タブを表示', { currentTab: this.currentTab });
      weekdayContent.removeAttribute('hidden');
    } else {
      console.log('TimetableUI: 平日タブにhidden属性を設定', { currentTab: this.currentTab });
      weekdayContent.setAttribute('hidden', '');
    }

    // 土日祝タブのコンテンツ
    const weekendContent = this.createTimetableTable(weekendTimetable, this.currentDirectionFilter);
    weekendContent.id = 'timetable-weekend';
    weekendContent.classList.add('timetable-tab-content');
    weekendContent.setAttribute('role', 'tabpanel');
    weekendContent.setAttribute('aria-labelledby', 'tab-weekend');
    if (this.currentTab === 'weekend') {
      console.log('TimetableUI: 土日祝タブを表示', { currentTab: this.currentTab });
      weekendContent.removeAttribute('hidden');
    } else {
      console.log('TimetableUI: 土日祝タブにhidden属性を設定', { currentTab: this.currentTab });
      weekendContent.setAttribute('hidden', '');
    }

    timetableContent.appendChild(weekdayContent);
    timetableContent.appendChild(weekendContent);

    // モーダルコンテンツを更新
    this.modalBody.innerHTML = '';
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'timetable-modal-content';
    contentWrapper.appendChild(header);
    contentWrapper.appendChild(backButton);
    contentWrapper.appendChild(tabs);
    contentWrapper.appendChild(directionFilter);
    contentWrapper.appendChild(mapButton);
    contentWrapper.appendChild(timetableContent);
    this.modalBody.appendChild(contentWrapper);
  }

  /**
   * タブを作成
   * @returns {HTMLElement} タブ要素
   * @private
   */
  createTabs() {
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'timetable-tabs';
    tabsContainer.setAttribute('role', 'tablist');

    // 平日タブ
    const weekdayTab = document.createElement('button');
    weekdayTab.type = 'button';
    weekdayTab.className = 'timetable-tab';
    weekdayTab.textContent = '平日';
    weekdayTab.setAttribute('role', 'tab');
    weekdayTab.setAttribute('aria-selected', this.currentTab === 'weekday' ? 'true' : 'false');
    weekdayTab.setAttribute('aria-controls', 'timetable-weekday');
    weekdayTab.setAttribute('id', 'tab-weekday');
    if (this.currentTab === 'weekday') {
      weekdayTab.classList.add('active');
    }
    weekdayTab.addEventListener('click', () => this.switchTab('weekday'));

    // 土日祝タブ
    const weekendTab = document.createElement('button');
    weekendTab.type = 'button';
    weekendTab.className = 'timetable-tab';
    weekendTab.textContent = '土日祝';
    weekendTab.setAttribute('role', 'tab');
    weekendTab.setAttribute('aria-selected', this.currentTab === 'weekend' ? 'true' : 'false');
    weekendTab.setAttribute('aria-controls', 'timetable-weekend');
    weekendTab.setAttribute('id', 'tab-weekend');
    if (this.currentTab === 'weekend') {
      weekendTab.classList.add('active');
    }
    weekendTab.addEventListener('click', () => this.switchTab('weekend'));

    tabsContainer.appendChild(weekdayTab);
    tabsContainer.appendChild(weekendTab);

    return tabsContainer;
  }

  /**
   * 方向フィルタボタンを作成
   * @param {string} currentFilter - 現在の方向フィルタ（'all', '0', '1'）
   * @returns {HTMLElement} フィルタボタンコンテナ
   */
  createDirectionFilter(currentFilter) {
    const container = document.createElement('div');
    container.className = 'direction-filter';
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', '方向フィルタ');

    // すべてボタン
    const allButton = document.createElement('button');
    allButton.type = 'button';
    allButton.className = 'direction-filter-button';
    allButton.textContent = 'すべて';
    allButton.setAttribute('aria-pressed', currentFilter === 'all' ? 'true' : 'false');
    allButton.setAttribute('aria-label', 'すべての方向を表示');
    if (currentFilter === 'all') {
      allButton.classList.add('active');
    }
    allButton.addEventListener('click', () => this.applyDirectionFilter('all'));

    // 往路のみボタン
    const outboundButton = document.createElement('button');
    outboundButton.type = 'button';
    outboundButton.className = 'direction-filter-button';
    outboundButton.textContent = '往路のみ';
    outboundButton.setAttribute('aria-pressed', currentFilter === '0' ? 'true' : 'false');
    outboundButton.setAttribute('aria-label', '往路のみを表示');
    if (currentFilter === '0') {
      outboundButton.classList.add('active');
    }
    outboundButton.addEventListener('click', () => this.applyDirectionFilter('0'));

    // 復路のみボタン
    const inboundButton = document.createElement('button');
    inboundButton.type = 'button';
    inboundButton.className = 'direction-filter-button';
    inboundButton.textContent = '復路のみ';
    inboundButton.setAttribute('aria-pressed', currentFilter === '1' ? 'true' : 'false');
    inboundButton.setAttribute('aria-label', '復路のみを表示');
    if (currentFilter === '1') {
      inboundButton.classList.add('active');
    }
    inboundButton.addEventListener('click', () => this.applyDirectionFilter('1'));

    container.appendChild(allButton);
    container.appendChild(outboundButton);
    container.appendChild(inboundButton);

    return container;
  }

  /**
   * 方向フィルタを適用
   * @param {string} direction - フィルタ方向（'all', '0', '1'）
   */
  applyDirectionFilter(direction) {
    try {
      console.log('TimetableUI: applyDirectionFilter呼び出し', { direction });

      // 有効な方向値かチェック
      if (direction !== 'all' && direction !== '0' && direction !== '1') {
        console.error('TimetableUI: 無効な方向フィルタが指定されました', { direction });
        return;
      }

      // 現在のフィルタを更新
      this.currentDirectionFilter = direction;

      // 時刻表を再表示
      this.displayTimetable();
    } catch (error) {
      console.error('TimetableUI: 方向フィルタの適用中にエラーが発生しました', error);
      // エラー時はフィルタをリセット
      this.currentDirectionFilter = 'all';
      this.displayTimetable();
    }
  }

  /**
   * 地図表示ボタンを作成
   * @returns {HTMLElement} ボタン要素
   * @private
   */
  createMapButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'timetable-map-button';
    button.textContent = '地図で表示する';
    button.setAttribute('aria-label', '路線を地図で表示');
    button.addEventListener('click', () => this.handleMapDisplayClick());

    return button;
  }

  /**
   * 時刻表テーブルを作成
   * @param {Array<Object>} timetable - 時刻表データ
   * @param {string} currentFilter - 現在の方向フィルタ（'all', '0', '1'）
   * @returns {HTMLElement} テーブル要素
   * @private
   */
  createTimetableTable(timetable, currentFilter = 'all') {
    console.log('TimetableUI: createTimetableTable呼び出し', { timetableLength: timetable.length, currentFilter });
    
    const container = document.createElement('div');
    container.className = 'timetable-table-container';

    // 方向フィルタを適用
    let filteredTimetable = timetable;
    if (currentFilter !== 'all') {
      try {
        filteredTimetable = timetable.filter(entry => {
          // エラーケース1: 方向情報が存在しない場合（要件8.1）
          let direction = entry.direction;
          if (direction === undefined || direction === null) {
            console.debug('TimetableUI: 方向情報が存在しません。デフォルト値を使用します', {
              tripId: entry.tripId,
              defaultValue: 'unknown'
            });
            direction = 'unknown';
          }
          return direction === currentFilter;
        });
      } catch (error) {
        // エラーケース4: 方向フィルタリング中のエラー（要件8.4）
        console.error('TimetableUI: 方向フィルタリング中にエラーが発生しました', {
          error: error,
          currentFilter: currentFilter,
          message: 'フィルタをリセットし、全ての便を表示します'
        });
        filteredTimetable = timetable;
      }
    }

    if (filteredTimetable.length === 0) {
      console.warn('TimetableUI: フィルタ後の時刻表データが空です');
      const noData = document.createElement('p');
      noData.className = 'timetable-no-data';
      noData.textContent = '該当する時刻表がありません';
      container.appendChild(noData);
      return container;
    }
    
    console.log('TimetableUI: 時刻表テーブルを作成します', { entries: filteredTimetable.length });

    const table = document.createElement('table');
    table.className = 'timetable-table';

    // ヘッダー
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const timeHeader = document.createElement('th');
    timeHeader.textContent = '発車時刻';
    timeHeader.setAttribute('scope', 'col');
    
    const directionHeader = document.createElement('th');
    directionHeader.textContent = '方向';
    directionHeader.setAttribute('scope', 'col');
    
    const destHeader = document.createElement('th');
    destHeader.textContent = '行き先';
    destHeader.setAttribute('scope', 'col');

    headerRow.appendChild(timeHeader);
    headerRow.appendChild(directionHeader);
    headerRow.appendChild(destHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // ボディ
    const tbody = document.createElement('tbody');
    
    filteredTimetable.forEach(entry => {
      const row = document.createElement('tr');
      
      const timeCell = document.createElement('td');
      timeCell.className = 'timetable-time';
      timeCell.textContent = entry.departureTime;
      
      const directionCell = document.createElement('td');
      directionCell.className = 'timetable-direction';
      
      // エラーケース1: 方向情報が存在しない場合（要件8.1）
      let direction = entry.direction;
      if (direction === undefined || direction === null) {
        console.debug('TimetableUI: 方向情報が存在しません。デフォルト値を使用します', {
          tripId: entry.tripId,
          departureTime: entry.departureTime,
          defaultValue: 'unknown'
        });
        direction = 'unknown';
      }
      
      // 方向ラベルを作成
      if (direction === '0') {
        const label = document.createElement('span');
        label.className = 'direction-label direction-label-outbound';
        label.textContent = '往路';
        label.setAttribute('aria-label', '往路');
        directionCell.appendChild(label);
      } else if (direction === '1') {
        const label = document.createElement('span');
        label.className = 'direction-label direction-label-inbound';
        label.textContent = '復路';
        label.setAttribute('aria-label', '復路');
        directionCell.appendChild(label);
      } else {
        // direction='unknown'の場合は「－」を表示
        directionCell.textContent = '－';
      }
      
      const destCell = document.createElement('td');
      destCell.className = 'timetable-destination';
      destCell.textContent = entry.tripHeadsign || '－';

      row.appendChild(timeCell);
      row.appendChild(directionCell);
      row.appendChild(destCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  }

  /**
   * モーダルヘッダーを作成
   * @param {string} title - タイトル
   * @returns {HTMLElement} ヘッダー要素
   * @private
   */
  createModalHeader(title) {
    const header = document.createElement('div');
    header.className = 'timetable-modal-header';

    const titleElement = document.createElement('h2');
    titleElement.id = 'timetable-modal-title';
    titleElement.className = 'timetable-modal-title';
    titleElement.textContent = title;

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'timetable-close-button';
    closeButton.textContent = '×';
    closeButton.setAttribute('aria-label', 'モーダルを閉じる');
    closeButton.addEventListener('click', () => this.closeModal());

    header.appendChild(titleElement);
    header.appendChild(closeButton);

    return header;
  }

  /**
   * 平日・土日祝タブを切り替え
   * @param {string} tabType - タブタイプ（'weekday' or 'weekend'）
   */
  switchTab(tabType) {
    console.log('TimetableUI: switchTab呼び出し', { tabType, currentTab: this.currentTab });
    
    if (tabType !== 'weekday' && tabType !== 'weekend') {
      console.error('TimetableUI: 無効なタブタイプが指定されました', { tabType });
      return;
    }

    this.currentTab = tabType;

    // タブのアクティブ状態を更新
    const weekdayTab = document.getElementById('tab-weekday');
    const weekendTab = document.getElementById('tab-weekend');

    if (weekdayTab && weekendTab) {
      if (tabType === 'weekday') {
        weekdayTab.classList.add('active');
        weekdayTab.setAttribute('aria-selected', 'true');
        weekendTab.classList.remove('active');
        weekendTab.setAttribute('aria-selected', 'false');
      } else {
        weekendTab.classList.add('active');
        weekendTab.setAttribute('aria-selected', 'true');
        weekdayTab.classList.remove('active');
        weekdayTab.setAttribute('aria-selected', 'false');
      }
    }

    // コンテンツの表示を切り替え
    const weekdayContent = document.getElementById('timetable-weekday');
    const weekendContent = document.getElementById('timetable-weekend');

    console.log('TimetableUI: コンテンツ要素の取得', {
      weekdayExists: !!weekdayContent,
      weekendExists: !!weekendContent
    });

    if (weekdayContent && weekendContent) {
      if (tabType === 'weekday') {
        console.log('TimetableUI: 平日タブのhidden属性を削除');
        weekdayContent.removeAttribute('hidden');
        weekendContent.setAttribute('hidden', '');
      } else {
        console.log('TimetableUI: 土日祝タブのhidden属性を削除');
        weekendContent.removeAttribute('hidden');
        weekdayContent.setAttribute('hidden', '');
      }
      
      console.log('TimetableUI: hidden属性の状態', {
        weekdayHidden: weekdayContent.hasAttribute('hidden'),
        weekendHidden: weekendContent.hasAttribute('hidden')
      });
    } else {
      console.error('TimetableUI: コンテンツ要素が見つかりません');
    }
  }

  /**
   * 地図表示ボタンのイベントハンドラー
   */
  handleMapDisplayClick() {
    if (!this.currentRouteId) {
      console.error('TimetableUI: 路線が選択されていません');
      return;
    }

    // 路線の経路情報を取得
    const routeStops = this.timetableController.getRouteStops(this.currentRouteId);

    if (routeStops.length === 0) {
      this.showError('路線の経路情報が見つかりません');
      return;
    }

    // MapControllerが期待する形式に変換
    const routeData = this.buildRouteDataFromStops(routeStops);

    if (!routeData) {
      this.showError('経路データの構築に失敗しました');
      return;
    }

    // MapControllerが利用可能な場合、地図に経路を表示
    const mapController = window.mapController;
    if (mapController && typeof mapController.displayRoute === 'function') {
      mapController.displayRoute(routeData);
      
      // モーダルを閉じる
      this.closeModal();
      
      // 地図エリアにスクロール
      const mapContainer = document.getElementById('map-container');
      if (mapContainer) {
        mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      console.warn('TimetableUI: MapControllerが利用できません');
      this.showError('地図表示機能が利用できません');
    }
  }

  /**
   * バス停配列から経路データを構築
   * @param {Array<Object>} routeStops - バス停配列
   * @returns {Object|null} 経路データ、または構築失敗時はnull
   * @private
   */
  buildRouteDataFromStops(routeStops) {
    if (!routeStops || routeStops.length < 2) {
      console.error('TimetableUI: 経路データが不足しています');
      return null;
    }

    // 最初のバス停を乗車バス停、最後のバス停を降車バス停とする
    const departureStop = routeStops[0];
    const arrivalStop = routeStops[routeStops.length - 1];

    // 中間のバス停を経由バス停とする
    const viaStops = routeStops.slice(1, -1).map(stop => ({
      name: stop.stopName,
      lat: stop.lat,
      lng: stop.lng,
      time: stop.time || '－'
    }));

    return {
      departureStop: {
        name: departureStop.stopName,
        lat: departureStop.lat,
        lng: departureStop.lng,
        time: departureStop.time || '－'
      },
      arrivalStop: {
        name: arrivalStop.stopName,
        lat: arrivalStop.lat,
        lng: arrivalStop.lng,
        time: arrivalStop.time || '－'
      },
      viaStops: viaStops,
      routeName: this.currentRouteName,
      operator: '' // 事業者情報は現時点では不明
    };
  }

  /**
   * モーダルを閉じる
   */
  closeModal() {
    if (this.modal) {
      this.modal.setAttribute('hidden', '');
      this.modalBody.innerHTML = '';
    }

    // フォーカスを元の要素に戻す
    if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
      this.previousActiveElement.focus();
    }

    // 状態をリセット
    this.currentStopId = null;
    this.currentStopName = null;
    this.currentRouteId = null;
    this.currentRouteName = null;
    this.currentTab = 'weekday';
    this.currentDirectionFilter = 'all';
    this.previousActiveElement = null;
  }

  /**
   * エラーメッセージを表示
   * @param {string} message - エラーメッセージ
   * @private
   */
  showError(message) {
    alert(message);
  }

  /**
   * 事業者IDから事業者名を取得
   * @param {string} agencyId - 事業者ID
   * @returns {string} 事業者名
   * @private
   */
  getAgencyName(agencyId) {
    // 事業者IDから事業者名へのマッピング
    const agencyMap = {
      '1': '佐賀市営バス',
      '2': '祐徳バス',
      '3': '西鉄バス'
    };

    return agencyMap[agencyId] || agencyId || '';
  }
}

// グローバルに公開
window.TimetableUI = TimetableUI;
