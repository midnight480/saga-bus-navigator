# 設計書

## 概要

佐賀バスナビゲーターアプリに、外部から利用可能なREST APIエンドポイントを追加します。Cloudflare Pages Functionsを使用してサーバーレス環境で動作し、既存のDataLoaderとSearchControllerのロジックを再利用することで、Webアプリケーションと同じデータと検索結果を提供します。

## アーキテクチャ

### システム構成

```
┌─────────────────┐
│  外部クライアント │
│  (Web/Mobile)   │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────┐
│  Cloudflare Pages Functions         │
│  ┌─────────────────────────────┐   │
│  │ /api/stops/search           │   │
│  │ /api/routes/search          │   │
│  │ /api/stops/first-last       │   │
│  └─────────────────────────────┘   │
│         │                            │
│         ▼                            │
│  ┌─────────────────────────────┐   │
│  │ DataLoader (共有モジュール)  │   │
│  │ SearchController (共有)      │   │
│  │ FareCalculator (共有)        │   │
│  └─────────────────────────────┘   │
│         │                            │
│         ▼                            │
│  ┌─────────────────────────────┐   │
│  │ GTFS Data (./data/*.zip)    │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### データフロー

1. **クライアント → API**: HTTPSリクエスト（GET）
2. **API → DataLoader**: GTFSデータの読み込み（初回のみ、以降はキャッシュ）
3. **API → SearchController**: 検索ロジックの実行
4. **API → クライアント**: JSON形式のレスポンス

### キャッシュ戦略

- **GTFSデータ**: メモリキャッシュ（DataLoaderの既存機能を使用）
- **APIレスポンス**: Cloudflare Edgeキャッシュ（30秒）
- **静的データ**: 長期キャッシュ（バス停マスタなど）

## コンポーネントと インターフェース

### 1. APIエンドポイント

#### 1.1 バス停検索API

**エンドポイント**: `GET /api/stops/search`

**クエリパラメータ**:
- `q` (必須): バス停名（部分一致検索）
- `limit` (オプション): 最大結果件数（デフォルト: 10、最大: 50）

**レスポンス形式**:
```json
{
  "stops": [
    {
      "id": "stop_id",
      "name": "バス停名",
      "lat": 33.2634,
      "lon": 130.3006,
      "nextDepartures": [
        {
          "routeNumber": "1",
          "routeName": "佐賀駅バスセンター～佐賀大学",
          "destination": "佐賀大学",
          "departureTime": "09:30",
          "operator": "佐賀市営バス"
        }
      ]
    }
  ],
  "count": 1
}
```

**エラーレスポンス**:
```json
{
  "error": "エラーメッセージ"
}
```

#### 1.2 経路検索API

**エンドポイント**: `GET /api/routes/search`

**クエリパラメータ**:
- `from` (必須): 乗車バス停名
- `to` (必須): 降車バス停名
- `time` (オプション): 検索時刻（HH:MM形式、デフォルト: 現在時刻）
- `type` (オプション): 検索タイプ（`departure-time` | `arrival-time` | `now` | `first-bus` | `last-bus`、デフォルト: `now`）
- `weekday` (オプション): 曜日区分（`平日` | `土日祝` | `auto`、デフォルト: `auto`）
- `limit` (オプション): 最大結果件数（デフォルト: 5、最大: 20）

**レスポンス形式**:
```json
{
  "routes": [
    {
      "tripId": "trip_id",
      "routeNumber": "1",
      "routeName": "佐賀駅バスセンター～佐賀大学",
      "operator": "佐賀市営バス",
      "departureStop": "佐賀駅バスセンター",
      "arrivalStop": "佐賀大学",
      "departureTime": "09:30",
      "arrivalTime": "09:50",
      "duration": 20,
      "adultFare": 200,
      "childFare": 100,
      "weekdayType": "平日",
      "viaStops": [
        {
          "name": "県庁前",
          "time": "09:35"
        }
      ],
      "tripHeadsign": "佐賀大学"
    }
  ],
  "count": 1,
  "searchCriteria": {
    "from": "佐賀駅バスセンター",
    "to": "佐賀大学",
    "time": "09:30",
    "type": "now",
    "weekday": "平日"
  }
}
```

**エラーレスポンス**:
```json
{
  "error": "エラーメッセージ"
}
```

#### 1.3 始発・終電検索API

**エンドポイント**: `GET /api/stops/first-last`

**クエリパラメータ**:
- `stop` (必須): バス停名
- `to` (オプション): 行先バス停名（指定した場合、その行先への始発・終電のみ）
- `weekday` (オプション): 曜日区分（`平日` | `土日祝` | `auto`、デフォルト: `auto`）

**レスポンス形式**:
```json
{
  "stop": "佐賀駅バスセンター",
  "weekdayType": "平日",
  "firstBus": {
    "tripId": "trip_id",
    "routeNumber": "1",
    "routeName": "佐賀駅バスセンター～佐賀大学",
    "operator": "佐賀市営バス",
    "departureTime": "06:00",
    "destination": "佐賀大学",
    "arrivalTime": "06:20",
    "duration": 20,
    "adultFare": 200,
    "childFare": 100
  },
  "lastBus": {
    "tripId": "trip_id",
    "routeNumber": "1",
    "routeName": "佐賀駅バスセンター～佐賀大学",
    "operator": "佐賀市営バス",
    "departureTime": "22:30",
    "destination": "佐賀大学",
    "arrivalTime": "22:50",
    "duration": 20,
    "adultFare": 200,
    "childFare": 100
  }
}
```

**エラーレスポンス**:
```json
{
  "error": "エラーメッセージ"
}
```

### 2. 共有モジュール

#### 2.1 DataLoaderAdapter

既存のDataLoaderをCloudflare Pages Functions環境で使用するためのアダプター。

**責務**:
- GTFSデータの読み込み
- データのキャッシュ管理
- バス停マスタの提供
- 時刻表データの提供

**インターフェース**:
```typescript
class DataLoaderAdapter {
  private dataLoader: DataLoader;
  
  constructor();
  
  // GTFSデータを読み込み（初回のみ、以降はキャッシュ）
  async loadData(): Promise<void>;
  
  // バス停マスタを取得
  getBusStops(): BusStop[];
  
  // 時刻表データを取得
  getTimetable(): TimetableEntry[];
  
  // 運賃データを取得
  getFares(): Fare[];
  
  // GTFSデータを取得（SearchController用）
  getGTFSData(): GTFSData;
}
```

#### 2.2 SearchControllerAdapter

既存のSearchControllerをAPI用にラップするアダプター。

**責務**:
- 直通便の検索
- 始発・終電の検索
- 検索結果のフォーマット

**インターフェース**:
```typescript
class SearchControllerAdapter {
  private searchController: SearchController;
  
  constructor(dataLoader: DataLoaderAdapter);
  
  // 直通便を検索
  searchDirectTrips(
    from: string,
    to: string,
    searchCriteria: SearchCriteria,
    weekdayType: string
  ): SearchResult[];
  
  // 始発を検索
  searchFirstBus(
    stop: string,
    to?: string,
    weekdayType?: string
  ): SearchResult | null;
  
  // 終電を検索
  searchLastBus(
    stop: string,
    to?: string,
    weekdayType?: string
  ): SearchResult | null;
}
```

#### 2.3 TimeUtils

NTPから現在時刻を取得するユーティリティ。

**責務**:
- NTPサーバーから正確な時刻を取得
- 曜日区分の自動判定

**インターフェース**:
```typescript
class TimeUtils {
  // NTPから現在時刻を取得
  static async getCurrentTimeFromNTP(): Promise<Date>;
  
  // 曜日区分を判定
  static getWeekdayType(date: Date): '平日' | '土日祝';
  
  // 時刻文字列をパース
  static parseTime(timeStr: string): { hour: number; minute: number };
}
```

### 3. エラーハンドリング

#### 3.1 エラークラス

```typescript
class APIError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

// 400 Bad Request
class BadRequestError extends APIError {
  constructor(message: string, details?: any) {
    super(400, message, details);
  }
}

// 404 Not Found
class NotFoundError extends APIError {
  constructor(message: string, details?: any) {
    super(404, message, details);
  }
}

// 500 Internal Server Error
class InternalServerError extends APIError {
  constructor(message: string, details?: any) {
    super(500, message, details);
  }
}

// 504 Gateway Timeout
class TimeoutError extends APIError {
  constructor(message: string, details?: any) {
    super(504, message, details);
  }
}
```

#### 3.2 エラーハンドラー

```typescript
function handleError(error: Error): Response {
  if (error instanceof APIError) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
  
  // 予期しないエラー
  console.error('Unexpected error:', error);
  return new Response(
    JSON.stringify({ error: 'Internal Server Error' }),
    {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
```

## データモデル

### BusStop（バス停）

```typescript
interface BusStop {
  id: string;           // stop_id
  name: string;         // stop_name
  lat: number;          // stop_lat
  lon: number;          // stop_lon
}
```

### TimetableEntry（時刻表エントリ）

```typescript
interface TimetableEntry {
  tripId: string;       // trip_id
  stopId: string;       // stop_id
  stopName: string;     // stop_name
  routeNumber: string;  // route_short_name
  routeName: string;    // route_long_name
  operator: string;     // agency_name
  hour: number;         // arrival_time (hour)
  minute: number;       // arrival_time (minute)
  stopSequence: number; // stop_sequence
  weekdayType: string;  // '平日' | '土日祝'
  tripHeadsign: string; // trip_headsign
  direction: string;    // direction_id
}
```

### SearchResult（検索結果）

```typescript
interface SearchResult {
  tripId: string;
  routeNumber: string;
  routeName: string;
  operator: string;
  departureStop: string;
  arrivalStop: string;
  departureTime: string;  // HH:MM
  arrivalTime: string;    // HH:MM
  duration: number;       // 分
  adultFare: number | null;
  childFare: number | null;
  weekdayType: string;
  viaStops: ViaStop[];
  tripHeadsign: string;
  direction: string;
}

interface ViaStop {
  name: string;
  time: string;  // HH:MM
}
```

### SearchCriteria（検索条件）

```typescript
interface SearchCriteria {
  type: 'departure-time' | 'arrival-time' | 'now' | 'first-bus' | 'last-bus';
  hour?: number;
  minute?: number;
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や振る舞いのことです。プロパティは人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: バス停検索の完全性

*任意の*有効なバス停名に対して、バス停検索APIは既存のWebアプリケーションと同じ検索結果を返す

**検証方法**: 要件1.2, 1.3

### プロパティ2: 経路検索の一貫性

*任意の*有効な始点・終点・検索条件に対して、経路検索APIは既存のSearchControllerと同じ検索結果を返す

**検証方法**: 要件2.2, 2.3, 2.4

### プロパティ3: 始発・終電検索の正確性

*任意の*有効なバス停名に対して、始発・終電検索APIは既存のSearchControllerと同じ始発・終電情報を返す

**検証方法**: 要件3.2, 3.3, 3.4

### プロパティ4: エラーレスポンスの適切性

*任意の*不正なリクエストに対して、APIは適切なHTTPステータスコードとエラーメッセージを返す

**検証方法**: 要件6.1, 6.2, 6.3, 6.4

### プロパティ5: CORS対応の完全性

*任意の*クロスオリジンリクエストに対して、APIは適切なCORSヘッダーを返す

**検証方法**: 要件5.1, 5.2, 5.3, 5.4, 5.5

### プロパティ6: レスポンスタイムの保証

*任意の*有効なリクエストに対して、APIは500ms以内にレスポンスを返す

**検証方法**: 要件7.1, 7.2, 7.3

### プロパティ7: データ整合性の保証

*任意の*APIレスポンスに対して、返されるデータは既存のDataLoaderから取得したGTFSデータと一致する

**検証方法**: 要件8.1, 8.2, 8.3, 8.4, 8.5

## エラーハンドリング

### エラーの種類

1. **バリデーションエラー（400 Bad Request）**
   - 必須パラメータの不足
   - パラメータの形式不正
   - パラメータの値が範囲外

2. **リソース未検出エラー（404 Not Found）**
   - 指定されたバス停が存在しない
   - 検索結果が0件

3. **サーバーエラー（500 Internal Server Error）**
   - GTFSデータの読み込み失敗
   - 予期しない例外

4. **タイムアウトエラー（504 Gateway Timeout）**
   - NTPサーバーへの接続タイムアウト
   - GTFSデータの読み込みタイムアウト

### エラーレスポンス形式

全てのエラーレスポンスは以下の形式で返されます：

```json
{
  "error": "エラーメッセージ"
}
```

### エラーハンドリングフロー

```
リクエスト受信
    ↓
パラメータバリデーション
    ↓ (エラー)
400 Bad Request
    ↓ (成功)
データ読み込み
    ↓ (エラー)
500 Internal Server Error
    ↓ (成功)
検索実行
    ↓ (結果なし)
404 Not Found
    ↓ (成功)
レスポンス返却
```

## テスト戦略

### 単体テスト

**対象**:
- DataLoaderAdapter
- SearchControllerAdapter
- TimeUtils
- エラーハンドラー

**テストケース**:
- 正常系: 有効なパラメータでの動作確認
- 異常系: 不正なパラメータでのエラーハンドリング確認
- エッジケース: 境界値、空文字列、nullなど

**ツール**: Vitest

### プロパティベーステスト

**対象**:
- バス停検索の完全性（プロパティ1）
- 経路検索の一貫性（プロパティ2）
- 始発・終電検索の正確性（プロパティ3）
- エラーレスポンスの適切性（プロパティ4）
- CORS対応の完全性（プロパティ5）
- レスポンスタイムの保証（プロパティ6）
- データ整合性の保証（プロパティ7）

**テストケース**:
- ランダムなバス停名で検索し、Webアプリケーションと同じ結果が返ることを確認
- ランダムな始点・終点で検索し、SearchControllerと同じ結果が返ることを確認
- ランダムな不正パラメータで適切なエラーが返ることを確認

**ツール**: fast-check（JavaScriptのプロパティベーステストライブラリ）

**設定**: 各プロパティテストは最低100回実行

### 統合テスト

**対象**:
- APIエンドポイント全体
- Cloudflare Pages Functions環境での動作

**テストケース**:
- 各エンドポイントへのHTTPリクエスト
- CORSヘッダーの確認
- レスポンスタイムの測定
- エラーレスポンスの確認

**ツール**: Playwright（E2Eテスト）

### パフォーマンステスト

**対象**:
- レスポンスタイム
- 同時リクエスト処理

**テストケース**:
- 各エンドポイントのレスポンスタイムが500ms以内であることを確認
- 複数の同時リクエストを処理できることを確認

**ツール**: Apache Bench（ab）またはk6
