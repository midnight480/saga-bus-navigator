# 設計書

## 概要

本ドキュメントは、佐賀バスナビの地図表示機能における2つの不具合修正の設計を定義します。

1. **CSP違反エラーの修正**: Leafletライブラリの外部CDNからの読み込みがCloudflare PagesのCSPポリシーに違反している問題を、ライブラリをローカルホスティングすることで解決します。
2. **経路表示の矢印方向修正**: 地図上の経路表示で矢印が逆方向（到着→出発）になっている問題を、座標配列の順序を修正することで解決します。

## アーキテクチャ

### 現在の構成

```
saga-bus-navigator/
├── index.html                    # Leaflet CDNリンクを含む
├── _headers                      # CSPポリシー定義
├── js/
│   ├── app.js                   # 経路データ構築ロジック
│   ├── map-controller.js        # 地図表示・経路描画
│   └── jszip.min.js            # ローカルホスティング済み
└── css/
    └── app.css
```

### 修正後の構成

```
saga-bus-navigator/
├── index.html                    # ローカルLeafletリンクに変更
├── _headers                      # CSPポリシー更新（unpkg.comを削除）
├── js/
│   ├── app.js                   # 経路データ構築ロジック（変更なし）
│   ├── map-controller.js        # 地図表示・経路描画（変更なし）
│   ├── jszip.min.js            # 既存
│   ├── leaflet.js              # 新規追加（v1.9.4）
│   └── leaflet.markercluster.js # 新規追加（v1.5.3）
└── css/
    ├── app.css
    ├── leaflet.css              # 新規追加
    ├── MarkerCluster.css        # 新規追加
    └── MarkerCluster.Default.css # 新規追加
```

## コンポーネントと実装

### 1. CSP違反エラーの修正

#### 1.1 Leafletライブラリのダウンロード

**対象ファイル:**
- Leaflet v1.9.4
  - `leaflet.js` (JavaScript)
  - `leaflet.css` (スタイルシート)
- Leaflet.markercluster v1.5.3
  - `leaflet.markercluster.js` (JavaScript)
  - `MarkerCluster.css` (スタイルシート)
  - `MarkerCluster.Default.css` (スタイルシート)

**ダウンロード元:**
- Leaflet: https://unpkg.com/leaflet@1.9.4/dist/
- Leaflet.markercluster: https://unpkg.com/leaflet.markercluster@1.5.3/dist/

**配置先:**
- JavaScriptファイル: `./js/`
- CSSファイル: `./css/`

#### 1.2 index.htmlの修正

**変更前:**
```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
  crossorigin=""/>
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />

<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
  crossorigin=""></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
```

**変更後:**
```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="/css/leaflet.css">
<link rel="stylesheet" href="/css/MarkerCluster.css">
<link rel="stylesheet" href="/css/MarkerCluster.Default.css">

<!-- Leaflet JS -->
<script src="/js/leaflet.js"></script>
<script src="/js/leaflet.markercluster.js"></script>
```

**変更理由:**
- CDNからの読み込みをローカルファイルに変更することで、CSPポリシーの`script-src 'self'`および`style-src 'self'`に準拠
- `integrity`属性と`crossorigin`属性は、ローカルファイルでは不要なため削除

#### 1.3 _headersファイルの修正

**変更前:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://ntp-a1.nict.go.jp https://holidays-jp.github.io; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```

**変更後:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org https://tile.openstreetmap.fr; connect-src 'self' https://ntp-a1.nict.go.jp https://holidays-jp.github.io; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```

**変更内容:**
- `img-src`に`https://tile.openstreetmap.org`と`https://tile.openstreetmap.fr`を追加
  - Leafletが地図タイルを読み込むために必要
  - プライマリタイルサーバー（openstreetmap.org）と代替タイルサーバー（openstreetmap.fr）の両方を許可

**変更理由:**
- 地図タイル画像の読み込みを許可するため
- 既存のmap-controller.jsの実装で、タイル読み込みエラー時に代替サーバーに切り替える機能があるため、両方のドメインを許可

### 2. 経路表示の矢印方向修正

#### 2.1 問題の原因分析

**現在の実装（map-controller.js）:**
```javascript
// 矢印を追加（進行方向を示す）
for (let i = 0; i < routeData.routeCoordinates.length - 1; i++) {
  const start = routeData.routeCoordinates[i];
  const end = routeData.routeCoordinates[i + 1];
  
  // 中点を計算
  const midLat = (start[0] + end[0]) / 2;
  const midLng = (start[1] + end[1]) / 2;
  
  // 角度を計算（北を0度として時計回り）
  const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI + 90;
  
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
```

**問題点:**
- 角度計算の式が正しくない
- `Math.atan2(end[1] - start[1], end[0] - start[0])`は経度差と緯度差から角度を計算しているが、座標系の向きが考慮されていない
- Leafletの座標系では`[緯度, 経度]`の順序だが、角度計算では`[経度, 緯度]`として扱う必要がある

**正しい角度計算:**
```javascript
// 角度を計算（北を0度として時計回り）
// Leafletの座標は[lat, lng]だが、角度計算では[lng, lat]として扱う
const angle = Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI;
```

#### 2.2 修正内容

**修正箇所:** `js/map-controller.js`の`displayRoute`メソッド内の角度計算部分

**変更前:**
```javascript
const angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI + 90;
```

**変更後:**
```javascript
// 角度を計算（北を0度として時計回り）
// Leafletの座標は[lat, lng]の順序
// Math.atan2は(y, x)の順序で引数を取るため、緯度差を第一引数、経度差を第二引数とする
const angle = Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI;
```

**変更理由:**
- Leafletの座標系は`[緯度, 経度]`の順序
- `Math.atan2(y, x)`は、点(0,0)から点(x,y)への角度を返す（ラジアン単位、東を0度として反時計回り）
- 地図上の北を0度とするためには、緯度差（南北方向）を第一引数、経度差（東西方向）を第二引数とする
- `+ 90`の補正は不要（既に正しい向きになる）

#### 2.3 検証方法

**テストケース:**
1. 佐賀駅から北方向のバス停への経路
   - 期待結果: 矢印が上向き（北向き）
2. 佐賀駅から東方向のバス停への経路
   - 期待結果: 矢印が右向き（東向き）
3. 佐賀駅から南方向のバス停への経路
   - 期待結果: 矢印が下向き（南向き）
4. 佐賀駅から西方向のバス停への経路
   - 期待結果: 矢印が左向き（西向き）

**検証手順:**
1. アプリケーションを起動
2. 検索フォームで出発地と到着地を選択
3. 検索を実行
4. 検索結果から「地図で表示」をクリック
5. 地図上の矢印の向きが、出発地から到着地への方向と一致することを確認

## データモデル

### 経路データ構造（変更なし）

```javascript
{
  departureStop: {
    name: string,      // バス停名
    lat: number,       // 緯度
    lng: number,       // 経度
    time: string       // 出発時刻（HH:MM形式）
  },
  arrivalStop: {
    name: string,      // バス停名
    lat: number,       // 緯度
    lng: number,       // 経度
    time: string       // 到着時刻（HH:MM形式）
  },
  viaStops: [         // 経由バス停の配列
    {
      name: string,    // バス停名
      lat: number,     // 緯度
      lng: number,     // 経度
      time: string     // 通過時刻（HH:MM形式）
    }
  ],
  routeCoordinates: [  // 経路の座標配列（[緯度, 経度]の配列）
    [number, number],  // 出発地の座標
    [number, number],  // 経由地1の座標
    ...
    [number, number]   // 到着地の座標
  ],
  routeName: string,   // 路線名
  operator: string     // 事業者名
}
```

## エラーハンドリング

### CSP違反エラー

**エラー発生時の動作:**
- ブラウザのコンソールにCSP違反エラーが表示される
- Leafletライブラリが読み込まれず、地図が表示されない
- MapControllerの初期化時にエラーが発生し、エラーメッセージが表示される

**修正後の動作:**
- ローカルファイルからライブラリが読み込まれる
- CSP違反エラーが発生しない
- 地図が正常に表示される

### 地図タイル読み込みエラー

**既存のエラーハンドリング（変更なし）:**
- `map-controller.js`の`setupTileLayer`メソッドで、タイル読み込みエラーを監視
- エラーが5回以上発生した場合、代替タイルサーバーに自動切り替え
- ユーザーに通知メッセージを表示

**CSPポリシーの更新:**
- `img-src`に地図タイルサーバーのドメインを追加することで、タイル画像の読み込みを許可

## テスト戦略

### 1. CSP違反エラーの修正テスト

**テスト環境:**
- ローカル開発環境（http-server）
- Cloudflare Pages（本番環境）

**テストケース:**

| テストID | テスト内容 | 期待結果 |
|---------|----------|---------|
| CSP-001 | アプリケーションを起動し、ブラウザのコンソールを確認 | CSP違反エラーが表示されない |
| CSP-002 | 地図が正常に表示されることを確認 | 地図が表示され、バス停マーカーが表示される |
| CSP-003 | 地図タイルが正常に読み込まれることを確認 | 地図タイルが表示され、ズーム・パン操作が可能 |
| CSP-004 | Leafletライブラリの機能が正常に動作することを確認 | マーカークラスタリング、ポップアップ表示が正常に動作 |

### 2. 経路表示の矢印方向修正テスト

**テスト環境:**
- ローカル開発環境（http-server）
- Cloudflare Pages（本番環境）

**テストケース:**

| テストID | テスト内容 | 期待結果 |
|---------|----------|---------|
| ARROW-001 | 北方向への経路を表示 | 矢印が上向き（北向き）に表示される |
| ARROW-002 | 東方向への経路を表示 | 矢印が右向き（東向き）に表示される |
| ARROW-003 | 南方向への経路を表示 | 矢印が下向き（南向き）に表示される |
| ARROW-004 | 西方向への経路を表示 | 矢印が左向き（西向き）に表示される |
| ARROW-005 | 複数の経由地を含む経路を表示 | 各セグメントの矢印が正しい方向を示す |
| ARROW-006 | 経路をクリアして再表示 | 矢印が正しく再描画される |

### 3. 統合テスト

**テストケース:**

| テストID | テスト内容 | 期待結果 |
|---------|----------|---------|
| INT-001 | 検索→地図表示→経路クリアの一連の操作 | 全ての機能が正常に動作する |
| INT-002 | 複数回の検索と地図表示 | メモリリークが発生せず、パフォーマンスが維持される |
| INT-003 | 異なるブラウザでの動作確認（Chrome, Firefox, Safari, Edge） | 全てのブラウザで正常に動作する |

### 4. パフォーマンステスト

**テストケース:**

| テストID | テスト内容 | 期待結果 |
|---------|----------|---------|
| PERF-001 | 初期読み込み時間の計測 | 3秒以内にデータ読み込みが完了する |
| PERF-002 | 地図表示のフレームレート計測 | 60FPS以上を維持する |
| PERF-003 | 経路表示の応答時間計測 | 1秒以内に経路が表示される |

## セキュリティ考慮事項

### CSPポリシーの更新

**追加されるドメイン:**
- `https://tile.openstreetmap.org` - プライマリ地図タイルサーバー
- `https://tile.openstreetmap.fr` - 代替地図タイルサーバー

**セキュリティリスク評価:**
- OpenStreetMapは信頼できるオープンソースプロジェクト
- タイルサーバーは画像ファイルのみを提供（JavaScriptやCSSは含まれない）
- `img-src`ディレクティブに限定されているため、スクリプト実行のリスクはない

**推奨事項:**
- 定期的にOpenStreetMapのセキュリティアドバイザリを確認
- 可能であれば、将来的に地図タイルもローカルホスティングを検討（ただし、ストレージとトラフィックのコストが高い）

## デプロイメント手順

### 1. ライブラリファイルのダウンロード

```bash
# Leaflet v1.9.4
curl -o js/leaflet.js https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
curl -o css/leaflet.css https://unpkg.com/leaflet@1.9.4/dist/leaflet.css

# Leaflet.markercluster v1.5.3
curl -o js/leaflet.markercluster.js https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js
curl -o css/MarkerCluster.css https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css
curl -o css/MarkerCluster.Default.css https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css
```

### 2. ファイルの修正

1. `index.html`のCDNリンクをローカルパスに変更
2. `_headers`のCSPポリシーを更新
3. `js/map-controller.js`の角度計算を修正

### 3. ローカルテスト

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:8080 を開く
# ブラウザのコンソールでCSPエラーがないことを確認
# 地図表示と経路表示が正常に動作することを確認
```

### 4. Cloudflare Pagesへのデプロイ

```bash
# Gitにコミット
git add .
git commit -m "fix: CSP違反エラーと経路矢印方向を修正"

# リモートリポジトリにプッシュ
git push origin main

# Cloudflare Pagesが自動的にデプロイを開始
# デプロイ完了後、本番環境で動作確認
```

## 設計上の決定事項

### 1. Leafletライブラリのローカルホスティング

**決定:** Leafletライブラリをローカルにホスティングする

**理由:**
- CSPポリシーに準拠するため
- 外部CDNへの依存を減らし、可用性を向上
- ネットワーク遅延を削減（特に日本国内からのアクセス）

**代替案:**
- CSPポリシーを緩和してCDNを許可する
  - 却下理由: セキュリティリスクが高い

### 2. 地図タイルサーバーの許可

**決定:** CSPポリシーの`img-src`にOpenStreetMapのタイルサーバーを追加する

**理由:**
- 地図タイルは画像ファイルであり、スクリプト実行のリスクがない
- OpenStreetMapは信頼できるオープンソースプロジェクト
- 地図タイルのローカルホスティングはコストが高い

**代替案:**
- 地図タイルもローカルにホスティングする
  - 却下理由: ストレージとトラフィックのコストが非常に高い（数百GB〜数TB）

### 3. 角度計算の修正方法

**決定:** `Math.atan2`の引数順序を修正する

**理由:**
- 最小限の変更で問題を解決できる
- Leafletの座標系に合わせた正しい計算方法

**代替案:**
- Leaflet-polylineDecoratorプラグインを使用する
  - 却下理由: 新しい依存関係を追加する必要があり、既存の実装で十分

## 今後の改善案

### 1. 地図タイルのキャッシュ戦略

**提案:** Service Workerを使用して地図タイルをキャッシュする

**メリット:**
- オフライン時でも地図を表示できる
- ネットワーク遅延を削減
- タイルサーバーへの負荷を軽減

**実装方法:**
- Service Workerで地図タイルのリクエストをインターセプト
- Cache APIを使用してタイルをキャッシュ
- キャッシュの有効期限を設定（例: 7日間）

### 2. 経路表示の視覚的改善

**提案:** 経路線にアニメーション効果を追加する

**メリット:**
- 進行方向がより明確になる
- ユーザーエクスペリエンスの向上

**実装方法:**
- CSS animationを使用して経路線を点滅させる
- または、SVGアニメーションを使用して矢印を移動させる

### 3. Leafletライブラリのバージョン管理

**提案:** package.jsonにLeafletライブラリを追加し、npm/yarnで管理する

**メリット:**
- バージョン管理が容易
- 依存関係の明確化
- 自動更新が可能

**実装方法:**
```bash
npm install leaflet leaflet.markercluster
```

ビルドプロセスでライブラリファイルを`js/`と`css/`にコピーする
