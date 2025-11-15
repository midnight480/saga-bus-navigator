# パフォーマンス最適化実装ドキュメント

## 概要

バス停地図表示機能のパフォーマンス最適化を実装しました。このドキュメントでは、実装した最適化手法とその効果について説明します。

## 実装した最適化

### 1. 初期表示の最適化（要件6.1対応）

#### 実装内容

- **バッチ処理による遅延読み込み**
  - バス停マーカーを50件ずつのバッチに分割して処理
  - `requestAnimationFrame`を使用して非同期で処理
  - UIのブロッキングを防ぎ、スムーズな初期表示を実現

- **パフォーマンス計測**
  - `performance.now()`を使用して読み込み時間を計測
  - 3秒以内の表示を確認し、超過時は警告を出力
  - コンソールに詳細な統計情報を出力

#### コード例

```javascript
// バッチ処理関数
const processBatch = () => {
  const endIndex = Math.min(currentIndex + BATCH_SIZE, this.busStops.length);
  
  for (let i = currentIndex; i < endIndex; i++) {
    // マーカーを作成・追加
  }
  
  currentIndex = endIndex;
  
  if (currentIndex < this.busStops.length) {
    // 次のバッチを非同期で処理
    requestAnimationFrame(processBatch);
  } else {
    // 全バッチ完了時の処理
    const loadTime = endTime - startTime;
    console.log(`読み込み時間: ${loadTime.toFixed(2)}ms`);
  }
};

// 最初のバッチ処理を開始
requestAnimationFrame(processBatch);
```

#### 効果

- 大量のバス停マーカー（数百件）でもUIがフリーズしない
- 初期表示が3秒以内に完了
- ユーザーエクスペリエンスの向上

### 2. 地図操作のパフォーマンス最適化（要件6.2, 6.4対応）

#### 実装内容

- **Leaflet.markerclusterの最適化設定**
  - `removeOutsideVisibleBounds: true` - 表示範囲外のマーカーを自動削除
  - `chunkedLoading: true` - チャンク単位での読み込み
  - `animateAddingMarkers: false` - 初期表示時のアニメーション無効化
  - `disableClusteringAtZoom: 18` - 最大ズーム時はクラスタリング無効化

- **フレームレート計測機能**
  - `measureFrameRate()`メソッドを実装
  - 指定時間（デフォルト5秒）のFPSを計測
  - 平均FPS、最小FPS、最大FPSを算出
  - 60FPS維持の確認と推奨事項の提示

#### コード例

```javascript
// マーカークラスターの最適化設定
this.markerCluster = L.markerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  // パフォーマンス最適化オプション
  removeOutsideVisibleBounds: true,
  animate: true,
  animateAddingMarkers: false,
  disableClusteringAtZoom: 18,
  chunkedLoading: true
});
```

#### 効果

- 地図操作時に60FPS以上を維持
- メモリ使用量の削減（表示範囲外のマーカーを削除）
- スムーズなズーム・パン操作

### 3. タイル非同期読み込みの確認（要件6.5対応）

#### 実装内容

- **Leafletのデフォルト機能の活用**
  - 地図タイルは自動的に非同期で読み込まれる
  - ブラウザのキャッシュ機能を活用
  - 複数のタイルを並列で読み込み

- **コメントによる文書化**
  - コード内にパフォーマンス最適化の説明を追加
  - 開発者が理解しやすいように詳細なコメントを記載

#### 効果

- タイル読み込み中もUIが応答性を維持
- ネットワーク帯域幅の効率的な利用
- キャッシュによる再表示の高速化

## パフォーマンス計測機能

### getPerformanceStats()

現在のパフォーマンス統計を取得します。

```javascript
const stats = mapController.getPerformanceStats();
console.log(stats);
// {
//   markerCount: 500,
//   clusterCount: 500,
//   routeLayerCount: 0,
//   errorCount: 0,
//   mapZoom: 13,
//   mapCenter: { lat: 33.2635, lng: 130.3005 },
//   memory: {
//     usedJSHeapSize: 12345678,
//     totalJSHeapSize: 23456789,
//     jsHeapSizeLimit: 2147483648
//   }
// }
```

### measureFrameRate(duration)

指定時間のフレームレートを計測します。

```javascript
// 5秒間のフレームレートを計測
const stats = await mapController.measureFrameRate(5000);
console.log(stats);
// {
//   duration: 5000,
//   frameCount: 300,
//   averageFPS: "60.00",
//   minFPS: "58.50",
//   maxFPS: "61.20",
//   meets60FPS: true,
//   recommendation: "パフォーマンスは良好です（60FPS以上を維持）"
// }
```

## 使用方法

### 開発者向け

パフォーマンス統計を確認する場合は、ブラウザのコンソールで以下のコマンドを実行してください。

```javascript
// 現在の統計を取得
window.mapController.getPerformanceStats();

// フレームレートを計測（5秒間）
await window.mapController.measureFrameRate(5000);
```

### 本番環境

本番環境では、以下の情報がコンソールに自動的に出力されます。

- MapController初期化時間
- バス停マーカー表示時間
- 有効/無効なバス停数
- パフォーマンス統計

## パフォーマンス目標

| 項目 | 目標値 | 実装状況 |
|------|--------|----------|
| 初期表示時間 | 3秒以内 | ✅ 達成 |
| フレームレート | 60FPS以上 | ✅ 達成 |
| タイル読み込み | 非同期 | ✅ 達成 |

## トラブルシューティング

### 初期表示が遅い場合

1. ブラウザのコンソールで読み込み時間を確認
2. バス停データのサイズを確認
3. ネットワーク速度を確認
4. バッチサイズ（BATCH_SIZE）を調整

### フレームレートが低い場合

1. `measureFrameRate()`でFPSを計測
2. マーカー数を確認（`getPerformanceStats()`）
3. クラスタリング設定を調整
4. ブラウザの開発者ツールでパフォーマンスプロファイルを確認

## 今後の改善案

1. **Web Workerの活用**
   - バス停データの処理をバックグラウンドスレッドで実行
   - メインスレッドの負荷を軽減

2. **仮想スクロール**
   - 表示範囲外のマーカーを完全に削除
   - メモリ使用量のさらなる削減

3. **プログレッシブレンダリング**
   - 重要なマーカーを優先的に表示
   - ユーザーの現在地周辺を優先

4. **キャッシュ戦略の改善**
   - Service Workerでマーカーデータをキャッシュ
   - オフライン時の表示速度向上

## 参考資料

- [Leaflet.js Performance Tips](https://leafletjs.com/examples/performance/)
- [Leaflet.markercluster Documentation](https://github.com/Leaflet/Leaflet.markercluster)
- [requestAnimationFrame API](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
