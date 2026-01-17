# ORS経路描画機能 統合ドキュメント

## 機能概要

OpenRouteService (ORS) APIを使用して、佐賀市バスナビゲーションアプリに道路に沿ったバス経路描画機能を追加しました。従来の直線経路表示から、実際の道路ネットワークに沿った経路表示にアップグレードしています。

### 主な機能

- **道路沿いの経路描画**: バス停間の経路を実際の道路に沿って表示
- **キャッシュ機能**: API呼び出しを最小化し、パフォーマンスを向上
- **レート制限管理**: ORS無料プランの制限内で動作
- **エラーハンドリング**: APIエラー時は自動的にフォールバック（直線描画）に切り替え
- **ズーム連動**: ズームアウト時は経路を非表示にしてパフォーマンスを最適化

## アーキテクチャ説明

### コンポーネント構成

```
┌─────────────────┐
│  MapController  │
│  (統合レイヤー)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│Route  │ │ Route      │
│Control│ │ Renderer   │
│ler    │ │ (描画)     │
└───┬───┘ └────────────┘
    │
┌───▼───┐ ┌──────────┐
│ORS    │ │ Cache     │
│Client │ │ Manager   │
│(API)  │ │ (キャッシュ)│
└───────┘ └───────────┘
```

### 主要コンポーネント

#### 1. ORSClient (`js/ors-client.js`)

ORS Directions APIとの通信を担当。

- **責務**:
  - HTTPリクエストの送信
  - 座標変換（[lat, lon] → [lon, lat]）
  - 座標検証
  - エラーハンドリングと再試行（指数バックオフ）
  - レート制限の管理

#### 2. CacheManager (`js/cache-manager.js`)

API応答のキャッシュを管理。

- **責務**:
  - 経路データのキャッシュ保存・取得
  - キャッシュキーの生成
  - TTLベースの有効期限管理
  - ストレージエラーのハンドリング

#### 3. RouteRenderer (`js/route-renderer.js`)

Leaflet地図上に経路を描画。

- **責務**:
  - GeoJSONレイヤーの作成と追加
  - 経路スタイルの適用
  - レイヤー参照の管理
  - 経路の削除・クリア

#### 4. RouteController (`js/route-controller.js`)

経路描画のオーケストレーション。

- **責務**:
  - ORSClient、CacheManager、RouteRendererの統合
  - デバウンス処理
  - 重複描画の防止
  - フォールバック処理（直線描画）
  - エラーハンドリング

#### 5. MapController統合 (`js/map-controller.js`)

既存のMapControllerにORS機能を統合。

- **責務**:
  - ORSコンポーネントの初期化
  - ズームレベル連動の実装
  - UIフィードバック（ローディング/エラー表示）
  - 既存機能との統合

## 使用方法

### 基本的な使用

1. **APIキーの設定**: `.dev.vars`またはCloudflare Pages環境変数に`ORS_API_KEY`を設定
2. **自動描画**: バス路線を選択すると、自動的にORS経路が描画されます
3. **フォールバック**: APIキーが未設定またはエラー時は、自動的に直線経路が表示されます

### プログラムからの使用

```javascript
// MapController経由で使用（推奨）
mapController.displayRoute(routeData, direction);
mapController.displayRouteStops(routeId, direction);

// 直接使用（上級者向け）
const routeController = new RouteController(orsClient, cacheManager, routeRenderer);
await routeController.drawBusRoute(routeId, stops, options);
```

## 設定

詳細は [ORS_CONFIG.md](./ORS_CONFIG.md) を参照してください。

### 主要設定項目

- `apiKey`: ORS APIキー（必須）
- `profile`: ルーティングプロファイル（デフォルト: `'driving-car'`）
- `cacheTtlMs`: キャッシュ有効期限（デフォルト: 24時間）
- `hideRouteBelowZoom`: 経路非表示のズーム閾値（デフォルト: 12）

## トラブルシューティング

### 経路が表示されない

1. **APIキーの確認**: `.dev.vars`または環境変数に`ORS_API_KEY`が設定されているか確認
2. **ブラウザコンソールの確認**: エラーメッセージを確認
3. **ズームレベルの確認**: ズームレベルが`hideRouteBelowZoom`（デフォルト: 12）以上か確認
4. **ネットワークタブの確認**: ORS APIへのリクエストが成功しているか確認

### エラーメッセージが表示される

- **レート制限エラー**: 1分あたり40リクエスト、1日あたり2000リクエストの制限を超えています。しばらく待ってから再試行してください。
- **無効な座標エラー**: バス停の座標が無効です。データを確認してください。
- **ネットワークエラー**: インターネット接続またはORS APIの状態を確認してください。

### パフォーマンスの問題

1. **キャッシュの確認**: ブラウザの開発者ツールで`localStorage`のキャッシュを確認
2. **ズームレベルの調整**: `hideRouteBelowZoom`を調整して、低ズーム時に経路を非表示にする
3. **デバウンス時間の調整**: `debounceMs`を調整して、連続リクエストを制御

### フォールバック（直線描画）が表示される

- **APIキー未設定**: `.dev.vars`または環境変数に`ORS_API_KEY`を設定
- **APIエラー**: ORS APIが利用できない場合、自動的にフォールバックが使用されます
- **レート制限**: レート制限に達した場合、フォールバックが使用されます

## セキュリティ考慮事項

- **APIキーの保護**: APIキーは`.dev.vars`（Gitにコミットしない）または環境変数で管理
- **クライアント側の制限**: APIキーはクライアント側に露出しますが、ORS APIの無料プラン制限により、悪用のリスクは低いです
- **CORS**: ORS APIはCORSをサポートしており、ブラウザから直接呼び出し可能です

## パフォーマンス最適化

- **キャッシュ**: 同じ経路は24時間キャッシュされます
- **デバウンス**: 連続リクエストは300msデバウンスされます
- **ズーム連動**: 低ズーム時は経路を非表示にしてパフォーマンスを向上
- **座標数制限**: 1リクエストあたり50座標までに制限し、自動的に分割されます

## テスト

### ユニットテスト

- `tests/ors-client.test.js`: ORSClientのユニットテスト
- `tests/route-renderer.test.js`: RouteRendererのユニットテスト
- `tests/route-controller.test.js`: RouteControllerのユニットテスト
- `tests/ors-ui-feedback.test.js`: UIフィードバックのテスト

### プロパティテスト

- `tests/ors-client.property.test.js`: ORSClientのプロパティテスト
- `tests/route-renderer.property.test.js`: RouteRendererのプロパティテスト
- `tests/route-controller.property.test.js`: RouteControllerのプロパティテスト
- `tests/map-controller-ors-integration.property.test.js`: 統合のプロパティテスト

### E2Eテスト

- `e2e/test-ors-route-rendering.spec.js`: 経路描画のE2Eテスト
- `e2e/test-ors-integration.spec.js`: 既存機能との統合E2Eテスト

## 関連ドキュメント

- [ORS_CONFIG.md](./ORS_CONFIG.md) - 設定ファイルの詳細ドキュメント
- [API.md](./API.md) - API仕様
- [SECURITY.md](./SECURITY.md) - セキュリティガイドライン
