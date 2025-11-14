# 時刻表検索機能 - 設計書

## Overview

時刻表検索機能は、佐賀市内の3事業者のバス時刻表データ（CSV形式、約180KB）をブラウザメモリに読み込み、JavaScriptで高速検索を実行するクライアントサイドアプリケーションとして実装する。コストを最小化するため、サーバーサイドのデータベースは使用せず、静的ファイルホスティング（Cloudflare Pages推奨）で運用する。

### 技術スタック

- **フロントエンド**: HTML5, CSS3, Vanilla JavaScript（フレームワーク不要）
- **レスポンシブ対応**: Mobile First、CSS Media Queries
- **データ形式**: CSV（UTF-8）
- **ホスティング**: Cloudflare Pages（無料枠、CDN付き）
- **時刻取得**: NTP over HTTP（ntp.nict.jp API）
- **オフライン対応**: Service Worker（後のPWA実装フェーズで追加）

### 設計原則

1. **シンプル第一**: フレームワーク不要、Vanilla JSで実装
2. **高速起動**: 3秒以内にデータ読み込み完了
3. **高速検索**: 2秒以内に検索結果表示
4. **コスト最小**: サーバーレス、静的ホスティングのみ
5. **段階的実装**: まず動くものを作り、後で最適化

## Architecture

### システム構成図

```
┌─────────────────────────────────────────────────────────┐
│                    User (Browser)                        │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Static Web App (HTML/CSS/JS)                │
│  ┌───────────────────────────────────────────────────┐  │
│  │  UI Layer (index.html + app.css)                  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Application Layer (app.js)                       │  │
│  │  - Search Controller                              │  │
│  │  - UI Controller                                  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Data Layer (data-loader.js)                      │  │
│  │  - CSV Parser                                     │  │
│  │  - Data Cache (in-memory)                        │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Utility Layer (utils.js)                         │  │
│  │  - Time Utilities (NTP client)                    │  │
│  │  - Search Utilities                               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         Cloudflare Pages (Static Hosting)                │
│  - /index.html                                           │
│  - /js/app.js, data-loader.js, utils.js                 │
│  - /css/app.css                                          │
│  - /data/*.csv                                           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│         External API (ntp.nict.jp)                       │
│  - Current time retrieval                                │
└─────────────────────────────────────────────────────────┘
```

### データフロー

1. **初期化フロー**
   ```
   User opens app
   → Load HTML/CSS/JS
   → data-loader.js loads CSV files (parallel fetch)
   → Parse CSV to JavaScript objects
   → Store in memory (global variables)
   → Enable search UI
   ```

2. **検索フロー**
   ```
   User inputs search criteria
   → Validate inputs
   → Get current time (NTP or local)
   → Filter timetable data (in-memory)
   → Calculate travel time and fare
   → Sort results by departure time
   → Display results (max 20 items)
   ```

## Components and Interfaces

### 1. Data Loader Module (`data-loader.js`)

**責任**: CSVファイルの読み込みとパース

```javascript
// Public API
class DataLoader {
  async loadAllData()
  async loadBusStops()
  async loadTimetable()
  async loadFares()
  parseCSV(csvText)
}

// Data structures (in-memory cache)
const busStops = [
  {
    name: "佐賀駅バスセンター",
    lat: 33.2649,
    lng: 130.3008,
    id: "佐賀駅バスセンター"
  },
  // ...
]

const timetable = [
  {
    routeNumber: "11",
    tripId: "100",
    stopSequence: 1,
    stopName: "佐賀駅バスセンター",
    hour: 18,
    minute: 50,
    weekdayType: "平日",
    routeName: "佐賀大学・西与賀線",
    operator: "佐賀市営バス"
  },
  // ...
]

const fares = [
  {
    from: "佐賀駅BC",
    to: "県庁前",
    operator: "佐賀市営バス",
    adultFare: 160,
    childFare: 80
  },
  // ...
]
```

### 2. Search Controller (`app.js`)

**責任**: 検索ロジックの実行

```javascript
class SearchController {
  // Search for direct trips
  searchDirectTrips(departureStop, arrivalStop, searchCriteria, weekdayType)
  
  // Search criteria types
  // - departureTime: 指定時刻以降に出発
  // - arrivalTime: 指定時刻までに到着
  // - now: 現在時刻以降に出発
  // - firstBus: 始発（当日最初の便）
  // - lastBus: 終電（当日最後の便）
  
  // Filter trips by criteria
  filterTripsByStops(trips, departureStop, arrivalStop)
  filterTripsByDepartureTime(trips, departureTime)
  filterTripsByArrivalTime(trips, arrivalTime)
  filterTripsByWeekday(trips, weekdayType)
  
  // Calculate trip details
  calculateTravelTime(trip, departureStop, arrivalStop)
  getFare(departureStop, arrivalStop, operator)
  
  // Sort and limit results
  sortByDepartureTime(trips)
  sortByArrivalTime(trips)
  limitResults(trips, maxCount)
}
```

**検索アルゴリズム**:
```
1. Filter timetable by weekday type
2. Group by tripId
3. For each trip:
   a. Find departure stop index
   b. Find arrival stop index
   c. If arrival index > departure index (same trip):
      - Extract departure time
      - Extract arrival time
      - Calculate duration
      - Get fare
      - Add to results
4. Apply time filter based on search criteria:
   - Departure Time: departure time >= specified time
   - Arrival Time: arrival time <= specified time
   - Now: departure time >= current time
   - First Bus: select earliest departure time
   - Last Bus: select latest departure time
5. Sort results:
   - Departure Time/Now/First Bus: sort by departure time ascending
   - Arrival Time/Last Bus: sort by arrival time descending
6. Return top 20 results
```

### 3. UI Controller (`app.js`)

**責任**: ユーザーインターフェースの制御

```javascript
class UIController {
  // Initialize UI
  initializeUI()
  
  // Bus stop search (incremental)
  setupBusStopAutocomplete(inputElement, busStops)
  filterBusStops(query, busStops)
  
  // Time selection
  setupTimeSelector()
  getCurrentTime() // from NTP
  getFirstBusTime() // 始発
  getLastBusTime() // 終電
  
  // Display results
  displaySearchResults(results)
  displayError(message)
  displayLoading(show)
  
  // Event handlers
  onSearchButtonClick()
  onDepartureStopSelect()
  onArrivalStopSelect()
  onTimeOptionChange()
}
```

### 4. Time Utilities (`utils.js`)

**責任**: 時刻関連のユーティリティ

```javascript
class TimeUtils {
  // Get current time from NTP
  async getCurrentTimeFromNTP()
  
  // Fallback to local time
  getCurrentTimeLocal()
  
  // Get weekday type (平日 or 土日祝)
  async getWeekdayType(date)
  
  // Check if date is holiday
  async isHoliday(date)
  
  // Load Japanese holiday calendar
  async loadHolidayCalendar()
  
  // Time formatting
  formatTime(hour, minute)
  calculateDuration(startHour, startMinute, endHour, endMinute)
}
```

**NTP実装**:
```javascript
async getCurrentTimeFromNTP() {
  try {
    const response = await fetch('https://ntp-a1.nict.go.jp/cgi-bin/json', {
      timeout: 5000
    });
    const data = await response.json();
    return new Date(data.st * 1000); // Unix timestamp to Date
  } catch (error) {
    console.warn('NTP failed, using local time:', error);
    return new Date(); // Fallback
  }
}
```

**祝日判定実装**:
```javascript
// 日本の祝日カレンダーAPI（無料）
// https://holidays-jp.github.io/
// 年ごとのAPI: https://holidays-jp.github.io/api/v1/{year}/datetime.json
// 形式: { "2025-01-01": "元日", "2025-01-13": "成人の日", ... }

let holidayCache = {}; // { 2025: {...}, 2026: {...} }

async loadHolidayCalendar(year) {
  if (holidayCache[year]) return holidayCache[year];
  
  try {
    const response = await fetch(`https://holidays-jp.github.io/api/v1/${year}/datetime.json`, {
      timeout: 5000
    });
    const holidays = await response.json();
    holidayCache[year] = holidays;
    return holidays;
  } catch (error) {
    console.warn(`Holiday calendar load failed for ${year}:`, error);
    return {}; // Empty object as fallback
  }
}

async isHoliday(date) {
  const year = date.getFullYear();
  const holidays = await this.loadHolidayCalendar(year);
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return dateStr in holidays;
}

async getWeekdayType(date) {
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
  const isHolidayDate = await this.isHoliday(date);
  
  // 月〜金 かつ 祝日でない → 平日
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHolidayDate) {
    return "平日";
  }
  
  // 土日 または 祝日 → 土日祝
  return "土日祝";
}
```

## Data Models

### BusStop Model
```javascript
{
  name: String,      // "佐賀駅バスセンター"
  lat: Number,       // 33.2649
  lng: Number,       // 130.3008
  id: String         // "佐賀駅バスセンター"
}
```

### TimetableEntry Model
```javascript
{
  routeNumber: String,    // "11"
  tripId: String,         // "100"
  stopSequence: Number,   // 1
  stopName: String,       // "佐賀駅バスセンター"
  hour: Number,           // 18
  minute: Number,         // 50
  weekdayType: String,    // "平日"
  routeName: String,      // "佐賀大学・西与賀線"
  operator: String        // "佐賀市営バス"
}
```

### SearchResult Model
```javascript
{
  tripId: String,           // "100"
  routeNumber: String,      // "11"
  routeName: String,        // "佐賀大学・西与賀線"
  operator: String,         // "佐賀市営バス"
  departureStop: String,    // "佐賀駅バスセンター"
  arrivalStop: String,      // "西与賀"
  departureTime: String,    // "18:50"
  arrivalTime: String,      // "19:20"
  duration: Number,         // 30 (minutes)
  adultFare: Number,        // 180
  childFare: Number,        // 90
  weekdayType: String       // "平日"
}
```

### Fare Model
```javascript
{
  from: String,        // "佐賀駅BC"
  to: String,          // "県庁前"
  operator: String,    // "佐賀市営バス"
  adultFare: Number,   // 160
  childFare: Number    // 80
}
```

## Error Handling

### エラー分類と対応

1. **データ読み込みエラー**
   - CSV fetch失敗 → リトライボタン表示
   - CSV parse失敗 → エラーメッセージ表示
   - タイムアウト（3秒超過） → 部分的に読み込み済みのデータで継続

2. **検索実行エラー**
   - 入力未選択 → フィールド別エラーメッセージ
   - 同一バス停選択 → 警告メッセージ
   - 検索結果0件 → 「該当する便がありません」メッセージ

3. **NTPエラー**
   - 接続失敗 → ローカル時刻使用 + 警告表示
   - タイムアウト（5秒） → ローカル時刻使用

4. **ブラウザ互換性エラー**
   - Fetch API未対応 → 代替手段（XMLHttpRequest）
   - ES6未対応 → Babel transpile（ビルド時）

### エラーメッセージ設計

```javascript
const ERROR_MESSAGES = {
  NO_DEPARTURE_STOP: "乗車バス停を選択してください",
  NO_ARRIVAL_STOP: "降車バス停を選択してください",
  SAME_STOP: "乗車バス停と降車バス停は異なる停留所を選択してください",
  DATA_LOAD_FAILED: "データの読み込みに失敗しました。再読み込みしてください。",
  NO_RESULTS: "指定された条件に該当する便が見つかりませんでした",
  NTP_WARNING: "端末の時刻を使用しています（時刻サーバーに接続できませんでした）",
  SEARCH_TIMEOUT: "検索に時間がかかっています。しばらくお待ちください。"
};
```

## Development Environment

### ローカル開発サーバー

```bash
# シンプルなHTTPサーバーを起動
npx http-server . -p 8080

# または
python3 -m http.server 8080
```

アクセス: `http://localhost:8080`

### Lint設定

**ESLint設定** (`.eslintrc.json`):
```json
{
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off",
    "semi": ["error", "always"],
    "quotes": ["error", "single"]
  }
}
```

**実行コマンド**:
```bash
npm install --save-dev eslint
npx eslint js/**/*.js
```

### コードフォーマット

**Prettier設定** (`.prettierrc.json`):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**実行コマンド**:
```bash
npm install --save-dev prettier
npx prettier --write js/**/*.js
```

## Testing Strategy

### 単体テスト

**Vitest設定** (`vitest.config.js`):
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

**テスト対象**:
- CSV parser (`data-loader.test.js`)
- Search algorithm (`search.test.js`)
- Time utilities (`utils.test.js`)

**実行コマンド**:
```bash
npm install --save-dev vitest jsdom
npm test
```

### E2Eテスト

**Playwright設定** (`playwright.config.js`):
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 8080,
    reuseExistingServer: true,
  },
});
```

**テストシナリオ** (`e2e/search.spec.js`):
- バス停選択フロー
- 検索実行フロー
- 検索結果表示確認
- エラーハンドリング確認

**実行コマンド**:
```bash
npm install --save-dev @playwright/test
npx playwright install
npm run test:e2e
```

### 手動テスト（必須）

**テストケース**:

1. **正常系**
   - 佐賀駅バスセンター → 佐賀大学（平日、現在時刻）
   - 佐賀駅バスセンター → 県庁前（平日、時刻指定）
   - 佐賀駅バスセンター → 西与賀（平日、終電）

2. **異常系**
   - 乗車バス停未選択
   - 降車バス停未選択
   - 同一バス停選択
   - 該当便なし（深夜時刻指定）

3. **境界値**
   - 最初の便（6:00台）
   - 最後の便（21:00台）
   - 検索結果20件以上

4. **パフォーマンス**
   - データ読み込み時間（3秒以内）
   - 検索実行時間（2秒以内）
   - メモリ使用量（50MB以内）

### ブラウザ互換性テスト

**デスクトップ**:
- Chrome (最新版)
- Firefox (最新版)
- Edge (最新版)
- Safari (macOS)

**モバイル**:
- Safari (iOS 14+)
- Chrome (Android)

### レスポンシブテスト

**テストデバイス**:
- iPhone SE (375x667)
- iPhone 14 Pro (393x852)
- iPad (768x1024)
- Desktop (1920x1080)

**Playwrightでのテスト**:
```javascript
test.describe('Responsive Design', () => {
  test('Mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // テストコード
  });
  
  test('Desktop view', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    // テストコード
  });
});
```

## Performance Optimization

### 初期読み込み最適化

1. **並列読み込み**: 3つのCSVファイルを並列fetch
2. **圧縮**: gzip圧縮（Cloudflare自動対応）
3. **CDN**: Cloudflare CDNで配信

### 検索最適化

1. **インデックス作成**: 起動時にtripIdでグループ化
2. **早期リターン**: 条件不一致で即座にスキップ
3. **結果制限**: 最大20件で打ち切り

### メモリ最適化

1. **データ構造**: 配列のみ使用（Map/Set不要）
2. **不要データ削除**: 使用しないフィールドは読み込まない
3. **ガベージコレクション**: 検索後に一時変数をクリア

## Deployment

### ファイル構成

```
saga-bus-navigator/
├── index.html
├── manifest.json
├── sw.js (Service Worker - Phase 5で追加)
├── _headers (Cloudflare Pages設定)
├── package.json
├── .eslintrc.json
├── .prettierrc.json
├── vitest.config.js
├── icons/
│   ├── favicon.ico
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png (180x180)
│   ├── icon-192.png (PWA用)
│   └── icon-512.png (PWA用)
├── css/
│   └── app.css
├── js/
│   ├── app.js
│   ├── data-loader.js
│   └── utils.js
├── tests/
│   ├── data-loader.test.js
│   ├── search.test.js
│   └── utils.test.js
├── e2e/
│   └── search.spec.js
├── playwright.config.js
└── data/
    ├── master/
    │   └── bus_stop.csv
    ├── timetable/
    │   └── timetable_all_complete.csv
    └── fare/
        └── fare_major_routes.csv
```

### package.json

```json
{
  "name": "saga-bus-navigator",
  "version": "1.0.0",
  "description": "佐賀市内バスナビゲーションアプリ",
  "scripts": {
    "dev": "http-server . -p 8080",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "lint": "eslint js/**/*.js",
    "format": "prettier --write js/**/*.js"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "vitest": "^1.0.0",
    "jsdom": "^23.0.0",
    "http-server": "^14.0.0"
  }
}
```

### Cloudflare Pages デプロイ手順

1. GitHubリポジトリ作成
2. Cloudflare Pagesプロジェクト作成
3. GitHubリポジトリ連携
4. ビルド設定: なし（静的ファイルのみ）
5. 出力ディレクトリ: `/`（ルート）
6. カスタムドメイン設定: `saga-bus.midnight480.com`
7. 自動デプロイ有効化

### ドメイン構成

**現在（Phase 1）**:
```
saga-bus.midnight480.com/              → Cloudflare Pages (静的サイト)
```

**将来（Phase 2以降）**:
```
saga-bus.midnight480.com/              → Cloudflare Pages (フロントエンド)
saga-bus.midnight480.com/api/*         → Cloudflare Workers (API)
```

**移行手順**（将来必要になった場合）:
1. Cloudflare Workersでプロジェクト作成
2. Workers Routesで `saga-bus.midnight480.com/api/*` を設定
3. Pagesはそのまま動作継続（CORS設定不要）

### 環境変数（不要）

静的ファイルのみのため、環境変数は使用しない。

## Responsive Design

### ブレークポイント

```css
/* Mobile First アプローチ */

/* スマートフォン（デフォルト） */
/* 320px - 767px */

/* タブレット */
@media (min-width: 768px) {
  /* タブレット用スタイル */
}

/* デスクトップ */
@media (min-width: 1024px) {
  /* デスクトップ用スタイル */
}
```

### デバイス別UI設計

**スマートフォン（優先）**:
- 縦スクロール中心
- タップしやすい大きなボタン（最小44x44px）
- フルスクリーン表示
- 検索フォームは上部固定
- 結果リストは下部スクロール

**タブレット**:
- 2カラムレイアウト（検索フォーム | 結果）
- より多くの情報を同時表示

**デスクトップ**:
- 3カラムレイアウト（検索フォーム | 結果 | 詳細）
- マウスホバー効果
- キーボードショートカット対応

### ビューポート設定

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

### タッチ対応

- タップターゲット: 最小44x44px
- スワイプジェスチャー: 結果リストのスクロール
- ピンチズーム: 有効（最大5倍）

## Security Considerations

### 脅威分析

**リスクが低い理由**:
- ユーザー入力: バス停選択のみ（自由入力なし）
- データベース: なし（CSV読み取り専用）
- 認証: なし（公開データのみ）
- サーバーサイド処理: なし（静的ファイルのみ）

### 実装する対策

1. **XSS対策**
   ```javascript
   // NG: innerHTML使用
   element.innerHTML = userInput;
   
   // OK: textContent使用
   element.textContent = userInput;
   
   // OK: DOM API使用
   const option = document.createElement('option');
   option.value = stopName;
   option.textContent = stopName;
   ```

2. **CSP (Content Security Policy)**
   
   Cloudflare Pages設定（`_headers`ファイル）:
   ```
   /*
     Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://ntp-a1.nict.go.jp https://holidays-jp.github.io; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Permissions-Policy: geolocation=(), microphone=(), camera=()
   ```

3. **HTTPS強制**
   - Cloudflare Pagesは自動的にHTTPS対応
   - HTTP → HTTPS自動リダイレクト

4. **入力検証**
   ```javascript
   // バス停名の検証
   function validateBusStop(stopName) {
     // 既存のバス停リストに存在するかチェック
     return busStops.some(stop => stop.name === stopName);
   }
   
   // 時刻の検証
   function validateTime(hour, minute) {
     return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
   }
   ```

5. **CORS対策**
   - CSVファイルは同一オリジン（saga-bus.midnight480.com）
   - 外部API（NTP、祝日）は読み取り専用

6. **依存関係の脆弱性チェック**
   ```bash
   npm audit
   npm audit fix
   ```

7. **Subresource Integrity (SRI)**
   
   外部CDNを使用する場合（現在は不要）:
   ```html
   <script src="https://cdn.example.com/lib.js" 
           integrity="sha384-..." 
           crossorigin="anonymous"></script>
   ```

### セキュリティチェックリスト

- [ ] textContent/createElementを使用（innerHTML禁止）
- [ ] CSPヘッダー設定
- [ ] HTTPS強制
- [ ] 入力検証実装
- [ ] npm audit実行
- [ ] 外部APIは読み取り専用
- [ ] 認証情報なし（APIキー不要）

## PWA Support (Phase 5で実装予定)

### 基本構成

**manifest.json**:
```json
{
  "name": "佐賀バスナビ",
  "short_name": "佐賀バス",
  "description": "佐賀市内バス時刻表検索",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0066cc",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker** (`sw.js`):
```javascript
const CACHE_NAME = 'saga-bus-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/data-loader.js',
  '/js/utils.js',
  '/data/master/bus_stop.csv',
  '/data/timetable/timetable_all_complete.csv',
  '/data/fare/fare_major_routes.csv'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event (Cache First strategy)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

**HTML head追加**:
```html
<!-- Favicon -->
<link rel="icon" type="image/x-icon" href="/icons/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">

<!-- PWA Manifest -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#0066cc">
```

### アイコンデザイン仕様

**デザインコンセプト**:
- 佐賀市のシンボル（バルーン）とバスを組み合わせ
- シンプルで視認性の高いデザイン
- ブランドカラー: #0066cc（青）

**AI画像生成プロンプト**（DALL-E, Midjourney等）:

```
App icon design for a bus navigation app in Saga City, Japan.
- Main element: Simple, modern bus icon in front view
- Background: Gradient blue (#0066cc to lighter blue)
- Optional: Small hot air balloon silhouette in the background (Saga's symbol)
- Style: Flat design, minimalist, clean
- Shape: Square with rounded corners
- Colors: Blue (#0066cc), white, light blue
- Text: None (icon only)
- Size: 512x512px, high resolution
- Format: PNG with transparency
```

**日本語プロンプト**:
```
佐賀市のバスナビゲーションアプリのアイコンデザイン
- メイン要素: シンプルでモダンなバスのアイコン（正面図）
- 背景: 青のグラデーション（#0066ccから明るい青へ）
- オプション: 背景に小さな熱気球のシルエット（佐賀のシンボル）
- スタイル: フラットデザイン、ミニマリスト、クリーン
- 形状: 角丸の正方形
- 色: 青（#0066cc）、白、ライトブルー
- テキスト: なし（アイコンのみ）
- サイズ: 512x512px、高解像度
- フォーマット: 透過PNG
```

**必要なサイズ**:
- favicon.ico: 16x16, 32x32, 48x48（複数サイズを含む）
- favicon-16x16.png: 16x16
- favicon-32x32.png: 32x32
- apple-touch-icon.png: 180x180
- icon-192.png: 192x192（PWA用）
- icon-512.png: 512x512（PWA用）

**生成後の処理**:
```bash
# 512x512のマスター画像から各サイズを生成
# ImageMagick使用例
convert icon-512.png -resize 192x192 icon-192.png
convert icon-512.png -resize 180x180 apple-touch-icon.png
convert icon-512.png -resize 32x32 favicon-32x32.png
convert icon-512.png -resize 16x16 favicon-16x16.png

# favicon.ico生成（複数サイズを含む）
convert icon-512.png -resize 16x16 -resize 32x32 -resize 48x48 favicon.ico
```

### PWA機能

1. **オフライン対応**: CSVデータをキャッシュ
2. **ホーム画面追加**: アプリアイコンで起動
3. **フルスクリーン表示**: ブラウザUIなし
4. **自動更新**: 新しいバージョンを自動検出

### インストール促進

```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // インストールボタンを表示
  showInstallButton();
});

function showInstallButton() {
  const installBtn = document.getElementById('install-btn');
  installBtn.style.display = 'block';
  installBtn.addEventListener('click', async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    deferredPrompt = null;
  });
}
```

## Future Enhancements

このフェーズでは実装しないが、将来的に検討する機能：

1. **検索履歴**: LocalStorageに保存
2. **お気に入りバス停**: LocalStorageに保存
3. **検索結果キャッシュ**: 同じ条件の再検索を高速化
4. **IndexedDB移行**: データ量が増えた場合
5. **Web Worker**: 検索処理をバックグラウンド実行
6. **プッシュ通知**: バス接近通知（Phase 6以降）
