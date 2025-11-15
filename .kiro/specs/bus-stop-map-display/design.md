# 設計書

## 概要

本設計書は、GTFS形式のstops.txtに格納されているバス停の位置情報をOpenStreetMap上に表示する機能の詳細設計を記述します。この機能により、ユーザーは地図上でバス停の位置を視覚的に確認でき、地図からバス停を選択して検索したり、検索結果の経路を地図上で確認したりできるようになります。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                      index.html                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 検索フォーム  │  │  地図表示    │  │  検索結果    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│  UIController  │  │ MapController  │  │SearchControl│
│                │  │                │  │    ler      │
│ - バス停選択   │  │ - 地図初期化   │  │ - 検索実行  │
│ - 検索実行     │  │ - マーカー表示 │  │ - 結果表示  │
│ - 結果表示     │  │ - 経路描画     │  │             │
└────────────────┘  └────────────────┘  └─────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  DataLoader    │
                    │                │
                    │ - GTFS読み込み │
                    │ - データ変換   │
                    └────────────────┘
                            │
                    ┌───────▼────────┐
                    │  stops.txt     │
                    │  (GTFS)        │
                    └────────────────┘
```

### 技術スタック

- **地図ライブラリ**: Leaflet.js v1.9.4
- **マーカークラスタリング**: Leaflet.markercluster v1.5.3
- **地図タイル**: OpenStreetMap
- **データ形式**: GTFS (stops.txt)
- **既存コンポーネント**: DataLoader, UIController, SearchController

## コンポーネントと インターフェース

### 1. MapController クラス

地図の表示、バス停マーカーの管理、経路描画を担当するコントローラー。


#### プロパティ

```javascript
class MapController {
  map: L.Map                          // Leafletマップインスタンス
  markers: Map<string, L.Marker>      // バス停ID -> マーカーのマップ
  markerCluster: L.MarkerClusterGroup // マーカークラスターグループ
  routeLayer: L.LayerGroup            // 経路表示用レイヤー
  selectedDepartureMarker: L.Marker   // 選択された乗車バス停マーカー
  selectedArrivalMarker: L.Marker     // 選択された降車バス停マーカー
  selectionMode: string               // 'none' | 'departure' | 'arrival'
  busStops: Array<BusStop>            // バス停データ
  onStopSelected: Function            // バス停選択時のコールバック
}
```

#### メソッド

```javascript
// 地図の初期化
initialize(containerId: string, busStops: Array<BusStop>): void

// バス停マーカーを全て表示
displayAllStops(): void

// バス停選択モードを設定
setSelectionMode(mode: 'none' | 'departure' | 'arrival'): void

// 経路を地図上に表示
displayRoute(route: RouteData): void

// 経路表示をクリア
clearRoute(): void

// 特定のバス停にズーム
zoomToStop(stopId: string): void

// 複数のバス停を含む範囲にズーム
fitBounds(stopIds: Array<string>): void
```

### 2. BusStop インターフェース

```javascript
interface BusStop {
  id: string        // stop_id
  name: string      // stop_name
  lat: number       // stop_lat
  lng: number       // stop_lon
}
```

### 3. RouteData インターフェース

```javascript
interface RouteData {
  departureStop: BusStop    // 乗車バス停
  arrivalStop: BusStop      // 降車バス停
  viaStops: Array<BusStop>  // 経由バス停
  routeCoordinates: Array<[number, number]> // 経路の座標配列
}
```

### 4. UIController の拡張

既存のUIControllerに地図関連の機能を追加します。

#### 追加メソッド

```javascript
// 地図からバス停選択モードを開始
startMapSelection(type: 'departure' | 'arrival'): void

// 地図からバス停選択モードを終了
stopMapSelection(): void

// 地図からバス停が選択されたときの処理
handleMapStopSelection(stopName: string): void

// 検索結果に「地図で表示」ボタンを追加
addMapDisplayButton(resultElement: HTMLElement, result: SearchResult): void
```

## データモデル

### バス停データ (stops.txt)

GTFSのstops.txtから以下のフィールドを使用：

```
stop_id: バス停の一意識別子
stop_name: バス停名
stop_lat: 緯度（WGS84）
stop_lon: 経度（WGS84）
location_type: 0（バス停）のみを使用
```

### 経路データ

検索結果から以下の情報を抽出して経路を構築：

```
departureStop: 乗車バス停名
arrivalStop: 降車バス停名
viaStops: 経由バス停のリスト（名前と時刻）
```

## エラーハンドリング

### エラー種別と対処

1. **Leafletライブラリ読み込み失敗**
   - エラーメッセージ: "地図ライブラリの読み込みに失敗しました"
   - 対処: 地図コンテナにエラーメッセージを表示

2. **GTFSデータ読み込み失敗**
   - エラーメッセージ: "バス停データの読み込みに失敗しました"
   - 対処: 既存のDataLoaderのエラーハンドリングを利用

3. **地図タイル読み込み失敗**
   - 対処: 代替タイルサーバーへの自動切り替え
   - 代替サーバー: tile.openstreetmap.org → tile-a.openstreetmap.fr

4. **不正な座標データ**
   - 対処: 該当バス停をスキップしてログ出力
   - 検証: 緯度 -90〜90、経度 -180〜180

5. **経路データ不足**
   - エラーメッセージ: "経路情報が不足しています"
   - 対処: 「地図で表示」ボタンを無効化

### エラーログ出力

全てのエラーは以下の形式でコンソールに出力：

```javascript
console.error('[MapController] エラー種別:', {
  message: 'エラーメッセージ',
  details: '詳細情報',
  timestamp: new Date().toISOString()
});
```


## テスト戦略

### 単体テスト

#### MapController のテスト

1. **地図初期化テスト**
   - 正しい中心座標とズームレベルで初期化されるか
   - 地図コンテナが正しく設定されるか

2. **マーカー表示テスト**
   - 全バス停のマーカーが正しく表示されるか
   - マーカークラスタリングが機能するか
   - 不正な座標データがスキップされるか

3. **バス停選択テスト**
   - 選択モードが正しく切り替わるか
   - 選択されたマーカーの色が変わるか
   - コールバックが正しく呼ばれるか

4. **経路表示テスト**
   - 経路が正しく描画されるか
   - マーカーの色分けが正しいか
   - 経路クリアが正しく動作するか

#### UIController 拡張のテスト

1. **地図選択モードテスト**
   - 選択モードの開始/終了が正しく動作するか
   - 検索フォームへの自動入力が正しいか

2. **地図表示ボタンテスト**
   - ボタンが検索結果に追加されるか
   - ボタンクリックで経路が表示されるか

### E2Eテスト

1. **地図表示テスト**
   - アプリ起動時に地図が表示されるか
   - バス停マーカーが表示されるか

2. **バス停選択フローテスト**
   - 地図から乗車バス停を選択できるか
   - 地図から降車バス停を選択できるか
   - 選択後に検索が実行できるか

3. **経路表示フローテスト**
   - 検索結果から「地図で表示」をクリックできるか
   - 経路が地図上に表示されるか
   - 経路クリアが動作するか

### パフォーマンステスト

1. **初期表示時間**
   - 地図とマーカーが3秒以内に表示されるか

2. **フレームレート**
   - 地図操作時に60FPS以上を維持できるか

3. **メモリ使用量**
   - 表示範囲外のマーカーが適切に削除されるか

## 実装の詳細

### 地図の初期化

```javascript
initialize(containerId, busStops) {
  // 1. Leafletマップを初期化
  this.map = L.map(containerId).setView([33.2635, 130.3005], 13);
  
  // 2. OpenStreetMapタイルレイヤーを追加
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18,
    minZoom: 10
  }).addTo(this.map);
  
  // 3. マーカークラスターグループを初期化
  this.markerCluster = L.markerClusterGroup();
  
  // 4. 経路レイヤーを初期化
  this.routeLayer = L.layerGroup().addTo(this.map);
  
  // 5. バス停データを保存
  this.busStops = busStops;
  
  // 6. 全バス停のマーカーを表示
  this.displayAllStops();
}
```

### バス停マーカーの表示

```javascript
displayAllStops() {
  this.busStops.forEach(stop => {
    // 座標の妥当性チェック
    if (!this.isValidCoordinate(stop.lat, stop.lng)) {
      console.warn(`不正な座標: ${stop.name} (${stop.lat}, ${stop.lng})`);
      return;
    }
    
    // マーカーを作成
    const marker = L.marker([stop.lat, stop.lng], {
      icon: this.createBusStopIcon('blue'),
      title: stop.name
    });
    
    // ポップアップを設定
    marker.bindPopup(this.createPopupContent(stop));
    
    // クリックイベントを設定
    marker.on('click', () => this.handleMarkerClick(stop));
    
    // マーカーを保存
    this.markers.set(stop.id, marker);
    
    // クラスターに追加
    this.markerCluster.addLayer(marker);
  });
  
  // クラスターを地図に追加
  this.map.addLayer(this.markerCluster);
}
```

### バス停選択モード

```javascript
setSelectionMode(mode) {
  this.selectionMode = mode;
  
  // 全マーカーのカーソルスタイルを変更
  this.markers.forEach(marker => {
    if (mode === 'none') {
      marker.getElement().style.cursor = 'pointer';
    } else {
      marker.getElement().style.cursor = 'crosshair';
    }
  });
}

handleMarkerClick(stop) {
  if (this.selectionMode === 'departure') {
    // 乗車バス停として選択
    this.selectDepartureStop(stop);
    this.onStopSelected('departure', stop.name);
  } else if (this.selectionMode === 'arrival') {
    // 降車バス停として選択
    this.selectArrivalStop(stop);
    this.onStopSelected('arrival', stop.name);
  }
}
```

### 経路の描画

```javascript
displayRoute(route) {
  // 既存の経路をクリア
  this.clearRoute();
  
  // 乗車バス停マーカー（緑）
  const departureMarker = L.marker(
    [route.departureStop.lat, route.departureStop.lng],
    { icon: this.createBusStopIcon('green') }
  );
  departureMarker.bindPopup(`乗車: ${route.departureStop.name}`);
  this.routeLayer.addLayer(departureMarker);
  
  // 降車バス停マーカー（赤）
  const arrivalMarker = L.marker(
    [route.arrivalStop.lat, route.arrivalStop.lng],
    { icon: this.createBusStopIcon('red') }
  );
  arrivalMarker.bindPopup(`降車: ${route.arrivalStop.name}`);
  this.routeLayer.addLayer(arrivalMarker);
  
  // 経由バス停マーカー（黄）
  route.viaStops.forEach(stop => {
    const viaMarker = L.marker(
      [stop.lat, stop.lng],
      { icon: this.createBusStopIcon('yellow') }
    );
    viaMarker.bindPopup(`経由: ${stop.name}`);
    this.routeLayer.addLayer(viaMarker);
  });
  
  // 経路線を描画（青）
  const polyline = L.polyline(route.routeCoordinates, {
    color: 'blue',
    weight: 4,
    opacity: 0.7
  });
  
  // 矢印を追加（進行方向を示す）
  polyline.setText('  ►  ', {
    repeat: true,
    offset: 5,
    attributes: { fill: 'blue' }
  });
  
  this.routeLayer.addLayer(polyline);
  
  // 経路全体が見えるようにズーム
  const bounds = L.latLngBounds(route.routeCoordinates);
  this.map.fitBounds(bounds, { padding: [50, 50] });
}
```

### レスポンシブ対応

```css
/* 地図コンテナのスタイル */
#map-container {
  width: 100%;
  height: 50vh;
  min-height: 300px;
}

/* モバイル（768px未満） */
@media (max-width: 767px) {
  #map-container {
    height: 40vh;
  }
}

/* タブレット・PC（768px以上） */
@media (min-width: 768px) {
  #map-container {
    height: 60vh;
  }
}
```

### パフォーマンス最適化

1. **遅延読み込み**
   - 初回表示時はマーカーを遅延読み込み
   - requestAnimationFrameを使用

2. **表示範囲外のマーカー削除**
   - Leaflet.markerclusterの機能を活用
   - 自動的にDOMから削除される

3. **タイル非同期読み込み**
   - Leafletのデフォルト機能で対応済み

## セキュリティ考慮事項

1. **XSS対策**
   - バス停名などのユーザー入力をエスケープ
   - DOMPurifyライブラリの使用を検討

2. **HTTPS通信**
   - 地図タイルはHTTPSで取得
   - Mixed Contentエラーを回避

3. **CSP設定**
   - Content-Security-Policyヘッダーで外部リソースを制限
   - OpenStreetMapドメインを許可リストに追加

## デプロイメント考慮事項

1. **CDN使用**
   - Leaflet.jsとLeaflet.markerclusterはCDNから読み込み
   - フォールバック用にローカルコピーも用意

2. **ファイルサイズ**
   - Leaflet.js: 約150KB (minified + gzipped)
   - Leaflet.markercluster: 約30KB (minified + gzipped)

3. **ブラウザ互換性**
   - Chrome 90+
   - Firefox 88+
   - Safari 14+
   - Edge 90+

## 今後の拡張性

1. **リアルタイムバス位置表示**
   - WebSocketでバス位置情報を受信
   - 動的にマーカーを更新

2. **ルート検索**
   - OpenStreetMap Routing APIを使用
   - 徒歩ルートの表示

3. **周辺施設表示**
   - Overpass APIで周辺施設を取得
   - 病院、学校などのアイコン表示

4. **オフライン地図**
   - Service Workerで地図タイルをキャッシュ
   - オフライン時も地図を表示
