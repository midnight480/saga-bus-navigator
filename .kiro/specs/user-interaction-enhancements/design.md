# 設計書

## 概要

本ドキュメントは、佐賀バスナビゲーターアプリにおけるユーザー操作機能の強化に関する設計を定義します。以下の4つの機能を実装します：

1. **地図経路クリア機能**: 地図上に表示された経路情報をクリアするボタン
2. **現在地表示機能**: ユーザーの現在地を地図上に表示し、現在地を中心に地図を移動するボタン
3. **検索結果クリア機能**: 表示されている検索結果をクリアするボタン
4. **カレンダー登録機能**: 検索したバスの時刻表をiCalまたはGoogle Calendar形式でカレンダーに登録する機能

## アーキテクチャ

### システム構成

既存のアプリケーションアーキテクチャに以下のコンポーネントを追加します：

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
├─────────────────────────────────────────────────────────────┤
│  - 経路クリアボタン (既存のclear-route-button)               │
│  - 現在地ボタン (新規: current-location-button)              │
│  - 検索結果クリアボタン (新規: clear-search-results-button)  │
│  - カレンダー登録ボタン (新規: add-to-calendar-button)       │
│  - カレンダー登録モーダル (新規: calendar-modal)             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                          │
├─────────────────────────────────────────────────────────────┤
│  - MapController (既存)                                      │
│    - clearRoute() (既存)                                     │
│    - showCurrentLocation() (新規)                            │
│  - UIController (既存)                                       │
│    - clearSearchResults() (新規)                             │
│  - CalendarExporter (新規)                                   │
│    - exportToICal()                                          │
│    - exportToGoogleCalendar()                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     Browser APIs                             │
├─────────────────────────────────────────────────────────────┤
│  - Geolocation API (現在地取得)                              │
│  - Blob API (iCalファイル生成)                               │
│  - URL API (Google Calendar URL生成)                         │
└─────────────────────────────────────────────────────────────┘
```


## コンポーネントと インターフェース

### 1. 地図経路クリア機能

#### 既存実装の活用

既存のMapControllerには`clearRoute()`メソッドと「経路をクリア」ボタンが実装済みです。この機能は要件を満たしているため、新規実装は不要です。

**既存の実装:**
- `MapController.clearRoute()`: 経路レイヤーをクリア
- `MapController.showClearRouteButton()`: ボタンを表示
- `MapController.hideClearRouteButton()`: ボタンを非表示
- HTML: `<button id="clear-route-button">経路をクリア</button>`

**動作フロー:**
1. ユーザーが「地図で表示」をクリック → `MapController.displayRoute()`が呼ばれる
2. 経路が地図に表示される → `showClearRouteButton()`が呼ばれる
3. ユーザーが「経路をクリア」をクリック → `clearRoute()`が呼ばれる
4. 経路とマーカーがクリアされる → `hideClearRouteButton()`が呼ばれる

### 2. 現在地表示機能

#### UI要素

**HTML構造:**
```html
<button id="current-location-button" class="current-location-button" 
        aria-label="現在地を表示">
  <span class="location-icon">◎</span>
</button>
```

**CSS配置:**
```css
.current-location-button {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000; /* 地図レイヤーより前面 */
  width: 40px;
  height: 40px;
  background: white;
  border: 2px solid #333;
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
```

#### MapControllerの拡張

**新規メソッド:**

```javascript
class MapController {
  /**
   * 現在地を表示する
   */
  async showCurrentLocation() {
    try {
      // Geolocation APIで現在地を取得
      const position = await this.getCurrentPosition();
      const { latitude, longitude } = position.coords;
      
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
   */
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation APIがサポートされていません'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  }
  
  /**
   * 現在地マーカーを表示
   */
  displayCurrentLocationMarker(lat, lng) {
    // 既存の現在地マーカーを削除
    if (this.currentLocationMarker) {
      this.map.removeLayer(this.currentLocationMarker);
    }
    
    // 現在地アイコンを作成
    const icon = L.divIcon({
      html: '<div class="current-location-marker">◎</div>',
      className: 'current-location-icon',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
    
    // マーカーを作成
    this.currentLocationMarker = L.marker([lat, lng], { icon });
    this.currentLocationMarker.addTo(this.map);
    
    // ポップアップを追加
    this.currentLocationMarker.bindPopup('現在地');
  }
  
  /**
   * 位置情報エラーハンドリング
   */
  handleLocationError(error) {
    let message = '位置情報の取得に失敗しました';
    
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
    
    this.displayLocationError(message);
  }
  
  /**
   * 位置情報エラーメッセージを表示
   */
  displayLocationError(message) {
    // エラー通知を表示（3秒後に自動消去）
    const notification = L.control({ position: 'topright' });
    notification.onAdd = () => {
      const div = L.DomUtil.create('div', 'location-error-notification');
      div.innerHTML = `
        <div class="notification-content">
          <span class="notification-icon">⚠️</span>
          <span class="notification-text">${message}</span>
        </div>
      `;
      
      setTimeout(() => {
        if (div.parentNode) {
          div.parentNode.removeChild(div);
        }
      }, 3000);
      
      return div;
    };
    notification.addTo(this.map);
  }
}
```


### 3. 検索結果クリア機能

#### UI要素

**HTML構造:**
```html
<section class="search-section">
  <h2 class="section-title">検索条件</h2>
  
  <!-- 既存の検索フォーム -->
  <form id="search-form" class="search-form">
    <!-- ... -->
    <button type="submit" id="search-button">検索</button>
  </form>
  
  <!-- 新規: 検索結果クリアボタン -->
  <button type="button" id="clear-search-results-button" 
          class="btn btn-secondary" hidden>
    検索結果をクリア
  </button>
</section>
```

#### UIControllerの拡張

**新規メソッド:**

```javascript
class UIController {
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
      resultsContainer.innerHTML = '';
      
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
   * 検索結果の表示（既存メソッドを拡張）
   */
  displaySearchResults(results) {
    // ... 既存の実装 ...
    
    // 検索結果が表示されたらクリアボタンを表示
    if (results.length > 0) {
      this.showClearSearchResultsButton();
    }
  }
}
```


#### UIControllerの拡張（カレンダー機能）

**新規メソッド:**

```javascript
class UIController {
  constructor() {
    // 既存のプロパティ...
    
    // カレンダー機能関連
    this.calendarExporter = null;
    this.calendarModal = null;
    this.currentScheduleForCalendar = null;
  }
  
  /**
   * UIの初期化（既存メソッドを拡張）
   */
  initialize(busStops) {
    // 既存の初期化処理...
    
    // カレンダーエクスポーターの初期化
    this.calendarExporter = new CalendarExporter();
    
    // カレンダーモーダルの初期化
    this.setupCalendarModal();
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
   * 検索結果アイテムのHTML生成（既存メソッドを拡張）
   */
  createResultItem(result) {
    // 既存の実装でリストアイテムを作成...
    const li = document.createElement('li');
    // ... 既存のコード ...
    
    // アクションボタンコンテナを作成
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'result-actions';
    
    // 「地図で表示」ボタン（既存）
    const mapButton = document.createElement('button');
    mapButton.className = 'map-display-button';
    mapButton.textContent = '地図で表示';
    mapButton.setAttribute('type', 'button');
    mapButton.addEventListener('click', () => {
      this.handleMapDisplayButtonClick(result);
    });
    actionsContainer.appendChild(mapButton);
    
    // 「カレンダーに登録」ボタン（新規）
    const calendarButton = document.createElement('button');
    calendarButton.className = 'add-to-calendar-button';
    calendarButton.textContent = 'カレンダーに登録';
    calendarButton.setAttribute('type', 'button');
    calendarButton.addEventListener('click', () => {
      this.handleAddToCalendarClick(result);
    });
    actionsContainer.appendChild(calendarButton);
    
    // detailsContainerに追加
    detailsContainer.appendChild(actionsContainer);
    
    // ... 既存のコード ...
    
    return li;
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
}
```

## データモデル

### 検索結果オブジェクト（既存）

カレンダー登録機能で使用する検索結果オブジェクトの構造：

```javascript
{
  tripId: string,           // 便ID
  routeNumber: string,      // 路線番号
  routeName: string,        // 路線名
  operator: string,         // 事業者名
  departureStop: string,    // 乗車バス停名
  arrivalStop: string,      // 降車バス停名
  departureTime: string,    // 出発時刻 (HH:MM)
  arrivalTime: string,      // 到着時刻 (HH:MM)
  departureHour: number,    // 出発時（数値）
  departureMinute: number,  // 出発分（数値）
  arrivalHour: number,      // 到着時（数値）
  arrivalMinute: number,    // 到着分（数値）
  duration: number,         // 所要時間（分）
  adultFare: number|null,   // 大人運賃
  childFare: number|null,   // 小人運賃
  weekdayType: string,      // 曜日区分
  viaStops: Array<{         // 経由バス停
    name: string,
    time: string
  }>
}
```

### iCalイベント形式

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//佐賀バスナビ//NONSGML v1.0//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:1234567890-abc123@saga-bus-navi
DTSTAMP:20250116T120000
DTSTART:20250116T090000
DTEND:20250116T093000
SUMMARY:バス: 佐賀駅バスセンター → 佐賀大学
LOCATION:佐賀駅バスセンター
DESCRIPTION:路線: 佐賀大学線\n事業者: 佐賀市営バス\n出発時刻: 09:00\n到着時刻: 09:30\n運賃: 大人 200円 / 小人 100円
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
END:VCALENDAR
```

### Google Calendar URL形式

```
https://calendar.google.com/calendar/render?
  action=TEMPLATE
  &text=バス: 佐賀駅バスセンター → 佐賀大学
  &dates=20250116T090000Z/20250116T093000Z
  &location=佐賀駅バスセンター
  &details=路線: 佐賀大学線\n事業者: 佐賀市営バス\n出発時刻: 09:00\n到着時刻: 09:30\n運賃: 大人 200円 / 小人 100円
```


## エラーハンドリング

### 1. 現在地取得エラー

**エラーケース:**
- 位置情報の使用が許可されていない（PERMISSION_DENIED）
- 位置情報が利用できない（POSITION_UNAVAILABLE）
- 位置情報の取得がタイムアウト（TIMEOUT）
- Geolocation APIがサポートされていない

**対応:**
- ユーザーフレンドリーなエラーメッセージを表示
- 3秒後に自動的にエラー通知を消去
- エラーログをコンソールに出力

### 2. カレンダーエクスポートエラー

**エラーケース:**
- スケジュール情報が不足している
- ファイルダウンロードに失敗
- Google Calendar URLの生成に失敗

**対応:**
- エラーメッセージを表示
- エラーログをコンソールに出力
- モーダルは開いたままにして再試行を可能にする

### 3. ブラウザ互換性エラー

**エラーケース:**
- Geolocation APIが利用できない
- Blob APIが利用できない
- URL APIが利用できない

**対応:**
- 機能が利用できない旨を通知
- 代替手段を提示（例: 手動でバス停を検索）

## テスト戦略

### 単体テスト

**CalendarExporter:**
- `generateICalContent()`: iCal形式の文字列が正しく生成されるか
- `generateGoogleCalendarURL()`: Google Calendar URLが正しく生成されるか
- `getEventDate()`: 日付をまたぐ場合の処理が正しいか
- `formatICalDateTime()`: 日時フォーマットが正しいか
- `generateUID()`: ユニークIDが生成されるか

**MapController:**
- `showCurrentLocation()`: 現在地が正しく表示されるか
- `getCurrentPosition()`: Geolocation APIが正しく呼ばれるか
- `handleLocationError()`: エラーハンドリングが正しいか

**UIController:**
- `clearSearchResults()`: 検索結果が正しくクリアされるか
- `handleAddToCalendarClick()`: カレンダーモーダルが正しく表示されるか
- `handleCalendarExport()`: エクスポート処理が正しく実行されるか

### 統合テスト

**現在地表示フロー:**
1. 現在地ボタンをクリック
2. 位置情報の許可を求められる
3. 許可すると地図が現在地中心に移動
4. 現在地マーカーが表示される

**カレンダー登録フロー:**
1. バスを検索
2. 検索結果から「カレンダーに登録」をクリック
3. モーダルが表示される
4. iCal形式を選択するとファイルがダウンロードされる
5. Google Calendarを選択すると新しいタブが開く

### E2Eテスト

**検索結果クリアフロー:**
1. バス停を選択して検索
2. 検索結果が表示される
3. 「検索結果をクリア」ボタンが表示される
4. ボタンをクリック
5. 検索結果がクリアされる
6. 検索フォームがリセットされる
7. ボタンが非表示になる

**地図経路クリアフロー:**
1. 検索結果から「地図で表示」をクリック
2. 地図に経路が表示される
3. 「経路をクリア」ボタンが表示される
4. ボタンをクリック
5. 経路とマーカーがクリアされる
6. ボタンが非表示になる

## セキュリティ考慮事項

### 1. 位置情報のプライバシー

- 位置情報は一時的にのみ使用し、保存しない
- ユーザーの明示的な許可が必要
- HTTPS接続でのみ位置情報を取得

### 2. XSS対策

- カレンダーイベントの説明文はエスケープ処理を行う
- ユーザー入力をそのままiCalファイルに含めない
- HTMLエスケープ処理を適用

### 3. CSP（Content Security Policy）

- Blob URLの使用を許可（iCalダウンロード用）
- Google Calendar URLへの外部リンクを許可

## パフォーマンス最適化

### 1. 現在地取得

- タイムアウトを10秒に設定
- キャッシュを使用しない（maximumAge: 0）
- 高精度モードを有効化（enableHighAccuracy: true）

### 2. カレンダーエクスポート

- iCalファイル生成は同期処理で高速
- Google Calendar URLは即座に生成
- モーダル表示は非同期で実行

### 3. UI更新

- 検索結果クリアは即座に実行
- ボタンの表示/非表示はCSSのhidden属性で制御
- DOM操作を最小限に抑える

## アクセシビリティ

### 1. キーボード操作

- 全てのボタンはキーボードでアクセス可能
- Tabキーでフォーカス移動
- Enterキーでボタンを実行
- Escapeキーでモーダルを閉じる

### 2. スクリーンリーダー対応

- aria-label属性でボタンの目的を明示
- role属性でモーダルの役割を明示
- hidden属性で非表示要素をスクリーンリーダーから隠す

### 3. 視覚的フィードバック

- ボタンのホバー状態を明示
- フォーカス状態を視覚的に表示
- エラーメッセージは目立つ色で表示

## ブラウザ互換性

### サポート対象ブラウザ

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### 必要なAPI

- Geolocation API（現在地表示）
- Blob API（iCalダウンロード）
- URL API（Google Calendar URL生成）
- URLSearchParams API（URLパラメータ構築）

### フォールバック

- Geolocation APIが利用できない場合は現在地ボタンを非表示
- Blob APIが利用できない場合はiCalダウンロードを無効化

## 実装の優先順位

1. **高優先度**: 検索結果クリア機能（既存機能の拡張、実装が簡単）
2. **高優先度**: 地図経路クリア機能（既に実装済み、確認のみ）
3. **中優先度**: 現在地表示機能（Geolocation API使用、テストが必要）
4. **中優先度**: カレンダー登録機能（新規クラス作成、複雑な実装）

## 将来的な拡張

### 1. カレンダー登録の拡張

- Outlook Calendar対応
- Apple Calendar対応
- リマインダー設定機能

### 2. 現在地機能の拡張

- 最寄りバス停の自動検索
- 現在地からの経路検索
- 位置情報の継続的な追跡

### 3. 検索履歴機能

- 検索履歴の保存
- よく使う経路の保存
- お気に入り機能

