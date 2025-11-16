# 設計書

## 概要

本機能は、佐賀バスオープンデータから提供されるGTFS-Realtime形式の動的データを活用し、バス車両のリアルタイム位置情報と運行情報を地図上に表示します。既存のMapControllerとDataLoaderを拡張し、新たにRealtimeDataLoaderとRealtimeVehicleControllerを追加することで、静的データと動的データを統合した包括的なバス情報システムを実現します。

## アーキテクチャ

### システム構成図

```
┌─────────────────────────────────────────────────────────────┐
│                     ブラウザ (クライアント)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   app.js     │  │map-controller│  │timetable-    │      │
│  │              │  │    .js       │  │controller.js │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                  │                                 │
│         │                  │                                 │
│  ┌──────▼──────────────────▼─────────────────────┐          │
│  │   realtime-vehicle-controller.js              │          │
│  │   (新規: 車両位置・運行情報の表示制御)         │          │
│  └──────┬────────────────────────────────────────┘          │
│         │                                                    │
│  ┌──────▼────────────────────────────────────────┐          │
│  │   realtime-data-loader.js                     │          │
│  │   (新規: GTFS-Realtimeデータの取得・デコード)  │          │
│  └──────┬────────────────────────────────────────┘          │
│         │                                                    │
│         │ fetch (30秒ごと)                                  │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          │ HTTPS
          │
┌─────────▼────────────────────────────────────────────────────┐
│              Cloudflare Functions (プロキシ)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  functions/api/vehicle.ts  - vehicle.pbのプロキシ            │
│  functions/api/route.ts    - route.pbのプロキシ              │
│  functions/api/alert.ts    - alert.pbのプロキシ              │
│                                                               │
│  - CORSヘッダー設定                                           │
│  - 30秒エッジキャッシュ                                       │
│  - エラーハンドリング                                         │
│                                                               │
└─────────┬───────────────────────────────────────────────────┘
          │
          │ HTTP
          │
┌─────────▼────────────────────────────────────────────────────┐
│         佐賀バスオープンデータ                                 │
│         http://opendata.sagabus.info/                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  - vehicle.pb  (車両位置情報)                                 │
│  - route.pb    (ルート最新情報/TripUpdates)                   │
│  - alert.pb    (運行情報)                                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **初期化フロー**
   - アプリケーション起動時にRealtimeVehicleControllerを初期化
   - 静的データ(DataLoader)の読み込み完了を待機
   - RealtimeDataLoaderを初期化し、30秒ごとのポーリングを開始

2. **リアルタイムデータ取得フロー**
   - RealtimeDataLoader → Cloudflare Functions → 佐賀バスオープンデータ
   - Protocol Buffersデータをデコード
   - 静的データ(trips.txt, stops.txt)と突合
   - RealtimeVehicleControllerに通知

3. **車両位置表示フロー**
   - RealtimeVehicleController → MapController
   - 車両マーカーの作成・更新・削除
   - 運行状態に応じた吹き出し表示

4. **運行情報表示フロー**
   - RealtimeVehicleController → DOM操作
   - 地図上部に運行情報カードを表示
   - 運休/遅延の分類と表示制御

## コンポーネントと インターフェース

### 1. RealtimeDataLoader (新規)

**責務**: GTFS-Realtimeデータの取得、デコード、キャッシュ管理

**主要メソッド**:

```javascript
class RealtimeDataLoader {
  constructor(proxyBaseUrl = '/api')
  
  // 初期化とポーリング開始
  async initialize()
  
  // ポーリング停止
  stopPolling()
  
  // 車両位置情報を取得
  async fetchVehiclePositions()
  
  // ルート最新情報を取得 (TripUpdates)
  async fetchTripUpdates()
  
  // 運行情報を取得
  async fetchAlerts()
  
  // Protocol Buffersデコード
  decodeProtobuf(arrayBuffer, messageType)
  
  // エラーハンドリング
  handleFetchError(error, dataType)
  
  // リトライロジック
  async fetchWithRetry(url, maxRetries = 3)
}
```

**依存関係**:
- gtfs-realtime-bindings (Protocol Buffersデコード用)
- protobufjs (gtfs-realtime-bindingsの依存)

**イベント**:
- `vehiclePositionsUpdated`: 車両位置情報が更新された
- `tripUpdatesUpdated`: ルート最新情報が更新された
- `alertsUpdated`: 運行情報が更新された
- `fetchError`: データ取得エラーが発生した

### 2. RealtimeVehicleController (新規)

**責務**: 車両位置と運行情報の表示制御、MapControllerとの連携

**主要メソッド**:

```javascript
class RealtimeVehicleController {
  constructor(mapController, dataLoader, realtimeDataLoader)
  
  // 初期化
  async initialize()
  
  // 車両位置情報の処理
  handleVehiclePositionsUpdate(vehiclePositions)
  
  // 車両マーカーの作成・更新
  updateVehicleMarker(vehicleData)
  
  // 車両マーカーの削除 (30秒以上更新なし)
  removeStaleVehicleMarkers()
  
  // 運行状態の判定
  determineVehicleStatus(vehicleData, tripData)
  
  // 遅延時間の計算
  calculateDelay(vehicleData, tripData)
  
  // 運行情報の処理
  handleAlertsUpdate(alerts)
  
  // 運行情報の表示
  displayAlerts(alerts)
  
  // 運行情報のクリア
  clearAlerts()
  
  // 便選択時の車両強調表示
  highlightVehicleForTrip(tripId)
}
```

**依存関係**:
- MapController (既存)
- DataLoader (既存)
- RealtimeDataLoader (新規)

### 3. MapController (拡張)

**既存機能**: バス停マーカー、経路表示、現在地表示

**追加メソッド**:

```javascript
class MapController {
  // 既存メソッド...
  
  // 車両マーカーの作成
  createVehicleMarker(lat, lng, status, tripInfo)
  
  // 車両マーカーの更新
  updateVehicleMarkerPosition(markerId, lat, lng)
  
  // 車両マーカーの削除
  removeVehicleMarker(markerId)
  
  // 車両マーカーの強調表示
  highlightVehicleMarker(markerId)
  
  // 車両アイコンの作成
  createVehicleIcon(status)
}
```

**車両マーカーの管理**:
- 車両マーカーは`vehicleMarkers` Mapで管理 (tripId → marker)
- バス停マーカーとは別のレイヤーで管理
- クラスタリングは適用しない (リアルタイム性を優先)

### 4. Cloudflare Functions (新規)

**ファイル構成**:
```
functions/
├── api/
│   ├── vehicle.ts    # vehicle.pbプロキシ
│   ├── route.ts      # route.pbプロキシ
│   └── alert.ts      # alert.pbプロキシ
```

**共通機能**:
- CORSヘッダー設定 (Access-Control-Allow-Origin)
- 30秒エッジキャッシュ (Cache-Control: max-age=30)
- エラーハンドリング (502 Bad Gateway)
- OPTIONSリクエスト対応 (プリフライト)

**実装例** (vehicle.ts):

```typescript
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://saga-bus.midnight480.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
      "Vary": "Origin",
    },
  });
};

export const onRequestGet: PagesFunction = async (ctx) => {
  const upstreamUrl = "http://opendata.sagabus.info/vehicle.pb";
  const cache = caches.default;
  const req = new Request(upstreamUrl, { 
    headers: { "Cache-Control": "no-cache" } 
  });

  let res = await cache.match(req);
  if (!res) {
    const upstream = await fetch(req);
    if (!upstream.ok) {
      return new Response(`upstream ${upstream.status}`, { status: 502 });
    }

    res = new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/x-protobuf",
        "Cache-Control": "public, max-age=30, s-maxage=30",
        "Access-Control-Allow-Origin": "https://saga-bus.midnight480.com",
        "Vary": "Origin",
      },
    });
    ctx.waitUntil(cache.put(req, res.clone()));
  }
  return res;
};
```

## データモデル

### 車両位置情報 (vehicle.pb)

```javascript
{
  entity: [
    {
      id: "vehicle_123",
      vehicle: {
        trip: {
          trip_id: "trip_456",
          route_id: "route_789",
          start_date: "20251116"
        },
        position: {
          latitude: 33.2635,
          longitude: 130.3005,
          bearing: 90.0,
          speed: 30.0
        },
        current_stop_sequence: 5,
        current_status: "IN_TRANSIT_TO",
        timestamp: 1700000000,
        vehicle: {
          id: "bus_001",
          label: "佐賀1号"
        }
      }
    }
  ]
}
```

### ルート最新情報 (route.pb / TripUpdates)

```javascript
{
  entity: [
    {
      id: "trip_update_123",
      trip_update: {
        trip: {
          trip_id: "trip_456",
          route_id: "route_789"
        },
        stop_time_update: [
          {
            stop_sequence: 5,
            arrival: {
              delay: 180,  // 秒単位 (3分遅れ)
              time: 1700000180
            },
            departure: {
              delay: 180,
              time: 1700000200
            }
          }
        ]
      }
    }
  ]
}
```

### 運行情報 (alert.pb)

```javascript
{
  entity: [
    {
      id: "alert_123",
      alert: {
        active_period: [
          {
            start: 1700000000,
            end: 1700010000
          }
        ],
        informed_entity: [
          {
            route_id: "route_789",
            trip_id: "trip_456"
          }
        ],
        cause: "ACCIDENT",
        effect: "SIGNIFICANT_DELAYS",
        header_text: {
          translation: [
            {
              text: "事故による遅延",
              language: "ja"
            }
          ]
        },
        description_text: {
          translation: [
            {
              text: "国道34号線で事故が発生したため、約10分の遅延が発生しています。",
              language: "ja"
            }
          ]
        }
      }
    }
  ]
}
```

### 内部データモデル (変換後)

**VehiclePosition**:
```javascript
{
  tripId: "trip_456",
  routeId: "route_789",
  latitude: 33.2635,
  longitude: 130.3005,
  currentStopSequence: 5,
  timestamp: 1700000000,
  vehicleId: "bus_001",
  vehicleLabel: "佐賀1号"
}
```

**TripUpdate**:
```javascript
{
  tripId: "trip_456",
  routeId: "route_789",
  stopTimeUpdates: [
    {
      stopSequence: 5,
      arrivalDelay: 180,  // 秒
      departureDelay: 180
    }
  ]
}
```

**Alert**:
```javascript
{
  id: "alert_123",
  type: "delay" | "cancellation",  // 遅延 or 運休
  headerText: "事故による遅延",
  descriptionText: "国道34号線で事故が発生したため...",
  activeStart: 1700000000,
  activeEnd: 1700010000,
  affectedRoutes: ["route_789"],
  affectedTrips: ["trip_456"]
}
```

## エラーハンドリング

### エラー分類

1. **ネットワークエラー**
   - Cloudflare Functionsへの接続失敗
   - タイムアウト (15秒)
   - 502 Bad Gateway

2. **データエラー**
   - Protocol Buffersデコード失敗
   - 不正なデータ形式
   - 必須フィールドの欠落

3. **データ整合性エラー**
   - trip_idが静的データに存在しない
   - stop_idが静的データに存在しない
   - 座標が不正 (範囲外)

### エラーハンドリング戦略

**レベル1: 自動リトライ**
- ネットワークエラー: 最大3回リトライ (指数バックオフ)
- 連続3回失敗: ポーリング間隔を60秒に延長
- 成功時: ポーリング間隔を30秒に戻す

**レベル2: フォールバック**
- リアルタイムデータ取得失敗: 静的データのみ表示
- route.pb取得失敗: vehicle.pbから遅延を推定
- 座標不正: 該当車両マーカーをスキップ

**レベル3: ユーザー通知**
- 連続失敗時: 「リアルタイム情報が一時的に利用できません」
- データ整合性エラー: コンソールログのみ (ユーザーには通知しない)

**エラーログ**:
```javascript
{
  timestamp: "2025-11-16T10:30:00Z",
  errorType: "NETWORK_ERROR" | "DATA_ERROR" | "INTEGRITY_ERROR",
  message: "Failed to fetch vehicle.pb",
  details: {
    url: "/api/vehicle",
    statusCode: 502,
    retryCount: 3
  }
}
```

## テスト戦略

### 単体テスト

**RealtimeDataLoader**:
- Protocol Buffersデコードの正常系・異常系
- リトライロジックの動作確認
- エラーハンドリングの検証

**RealtimeVehicleController**:
- 車両位置の計算ロジック (運行開始前/運行中/運行終了)
- 遅延時間の計算ロジック
- 運行情報の分類ロジック (運休/遅延)

### 統合テスト

**データフロー**:
- RealtimeDataLoader → RealtimeVehicleController → MapController
- エラー発生時のフォールバック動作
- ポーリング間隔の動的調整

### E2Eテスト

**シナリオ1: 車両位置表示**
1. アプリケーション起動
2. 30秒待機
3. 車両マーカーが地図上に表示されることを確認
4. 吹き出しの内容を確認 (運行状態)

**シナリオ2: 運行情報表示**
1. アプリケーション起動
2. 運行情報が地図上部に表示されることを確認
3. 運休情報が赤色で表示されることを確認
4. 遅延情報が黄色で表示されることを確認

**シナリオ3: エラーハンドリング**
1. ネットワークを切断
2. エラーメッセージが表示されることを確認
3. 静的データは引き続き表示されることを確認

### モックデータ

テスト用のモックデータを用意:
- `mock-vehicle.pb`: サンプル車両位置情報
- `mock-route.pb`: サンプルルート最新情報
- `mock-alert.pb`: サンプル運行情報

## パフォーマンス最適化

### データ取得の最適化

1. **エッジキャッシュ (Cloudflare Functions)**
   - 30秒間のキャッシュでオリジンサーバーの負荷を軽減
   - Cache-Control: max-age=30, s-maxage=30

2. **ポーリング間隔の動的調整**
   - 通常: 30秒ごと
   - エラー時: 60秒ごと (連続3回失敗)
   - 成功時: 30秒に戻す

3. **差分更新**
   - 既存の車両マーカーは位置のみ更新
   - 新規車両のみマーカーを作成
   - 30秒以上更新がない車両マーカーは削除

### レンダリングの最適化

1. **マーカー管理**
   - 車両マーカーはクラスタリングしない (リアルタイム性優先)
   - 最大100台まで表示 (それ以上は古いものから削除)

2. **DOM操作の最小化**
   - 運行情報カードは差分更新
   - 変更がない場合はDOM操作をスキップ

3. **メモリ管理**
   - 古いデータは定期的にクリア
   - 車両マーカーのMapは最大100エントリ

## セキュリティ

### CORS設定

- Access-Control-Allow-Origin: https://saga-bus.midnight480.com
- 本番環境のみ許可 (開発環境は別途設定)

### CSP (Content Security Policy)

既存の_headersファイルに以下を追加:

```
connect-src 'self' https://saga-bus.midnight480.com http://opendata.sagabus.info
```

### データ検証

- Protocol Buffersデコード後に必須フィールドを検証
- 座標の範囲チェック (緯度: -90〜90, 経度: -180〜180)
- trip_idとstop_idの存在チェック (静的データとの突合)

## デプロイメント

### 依存ライブラリの追加

package.jsonに追加:

```json
{
  "dependencies": {
    "gtfs-realtime-bindings": "^1.1.0",
    "protobufjs": "^7.2.5"
  }
}
```

### ビルド手順

1. `npm install` - 依存ライブラリのインストール
2. Cloudflare Functionsのデプロイ
3. 静的ファイルのデプロイ

### 環境変数

不要 (全てハードコード可能)

### ロールバック手順

1. Cloudflare Functionsを無効化
2. RealtimeVehicleControllerの初期化をスキップ
3. 静的データのみで動作

## 運用監視

### ログ出力

**成功ログ**:
```
[RealtimeDataLoader] Vehicle positions updated: 45 vehicles
[RealtimeVehicleController] Vehicle markers updated: 45 markers
```

**エラーログ**:
```
[RealtimeDataLoader] Failed to fetch vehicle.pb: Network error (retry 1/3)
[RealtimeVehicleController] Invalid coordinates for vehicle: tripId=trip_456
```

### メトリクス

- データ取得成功率 (%)
- 平均レスポンスタイム (ms)
- 車両マーカー表示数
- エラー発生回数

### アラート条件

- データ取得成功率が80%を下回る
- 平均レスポンスタイムが5秒を超える
- 連続10回のエラー発生

## 今後の拡張

### フェーズ2: 便選択時の車両強調表示

- 時刻表から便を選択時に該当車両を強調表示
- 車両マーカーをクリックすると便情報を表示

### フェーズ3: 車両追跡機能

- 特定の車両を追跡し、地図の中心を自動的に移動
- 到着予測時刻の表示

### フェーズ4: プッシュ通知

- 選択した便の遅延情報をプッシュ通知
- Service Workerを活用

## 参考資料

- [GTFS-Realtime仕様](https://gtfs.org/realtime/reference/)
- [佐賀バスオープンデータ](http://opendata.sagabus.info/)
- [Cloudflare Functions](https://developers.cloudflare.com/pages/functions/)
- [Leaflet.js](https://leafletjs.com/)
- [Protocol Buffers](https://protobuf.dev/)
