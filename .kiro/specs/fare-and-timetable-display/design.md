# 設計書

## 概要

本ドキュメントは、佐賀バスナビゲーターアプリケーションに運賃計算・表示機能と時刻表表示機能を追加するための設計を定義します。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Search Form  │  │ Timetable UI │  │ Map Display      │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │UIController  │  │TimetableCtrl │  │ FareCalculator   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ DataLoader   │  │ GTFS Parser  │  │ DataTransformer  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      GTFS Data                               │
│  fare_attributes.txt, fare_rules.txt, stop_times.txt,       │
│  calendar.txt, routes.txt, trips.txt, stops.txt             │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

#### 運賃計算フロー
```
User Input (乗車・降車バス停)
    ↓
FareCalculator.calculateFare()
    ↓
fare_rules.txt から該当ルールを検索
    ↓
fare_attributes.txt から運賃情報を取得
    ↓
運賃を表示
```

#### 時刻表表示フロー
```
User clicks "時刻表を見る"
    ↓
TimetableController.showRouteSelection()
    ↓
routes.txt から該当路線を取得
    ↓
User selects route
    ↓
TimetableController.showTimetable()
    ↓
stop_times.txt + calendar.txt から時刻表を生成
    ↓
平日・土日祝タブで表示
```

## コンポーネントと インターフェース

### 1. FareCalculator クラス

運賃計算ロジックを担当するクラス。

#### プロパティ
- `fareAttributes`: fare_attributes.txtから読み込んだ運賃属性データ
- `fareRules`: fare_rules.txtから読み込んだ運賃ルールデータ
- `routes`: routes.txtから読み込んだ路線データ

#### メソッド

```javascript
/**
 * 運賃を計算
 * @param {string} originStopId - 乗車バス停ID
 * @param {string} destinationStopId - 降車バス停ID
 * @param {string} routeId - 路線ID
 * @returns {Object} { adultFare: number, childFare: number } または null
 */
calculateFare(originStopId, destinationStopId, routeId)

/**
 * fare_rules.txtから該当するルールを検索
 * @param {string} originStopId - 乗車バス停ID
 * @param {string} destinationStopId - 降車バス停ID
 * @param {string} routeId - 路線ID
 * @returns {Object} fare_rule または null
 */
findFareRule(originStopId, destinationStopId, routeId)

/**
 * fare_attributes.txtから運賃情報を取得
 * @param {string} fareId - 運賃ID
 * @returns {Object} { price: number, currency_type: string } または null
 */
getFareAttributes(fareId)
```

### 2. TimetableController クラス

時刻表表示ロジックを担当するクラス。

#### プロパティ
- `stopTimes`: stop_times.txtから読み込んだ停車時刻データ
- `trips`: trips.txtから読み込んだ便データ
- `routes`: routes.txtから読み込んだ路線データ
- `calendar`: calendar.txtから読み込んだ運行カレンダーデータ
- `stops`: stops.txtから読み込んだバス停データ

#### メソッド

```javascript
/**
 * バス停で運行している路線一覧を取得
 * @param {string} stopId - バス停ID
 * @returns {Array<Object>} 路線情報の配列
 */
getRoutesAtStop(stopId)

/**
 * 特定路線の時刻表を取得
 * @param {string} stopId - バス停ID
 * @param {string} routeId - 路線ID
 * @param {string} serviceDayType - 運行日種別（'平日' or '土日祝'）
 * @returns {Array<Object>} 時刻表データの配列
 */
getTimetable(stopId, routeId, serviceDayType)

/**
 * 路線の経路情報を取得（地図表示用）
 * @param {string} routeId - 路線ID
 * @param {string} tripId - 便ID（オプション）
 * @returns {Array<Object>} バス停座標の配列
 */
getRouteStops(routeId, tripId = null)
```

### 3. TimetableUI クラス

時刻表UIを担当するクラス。

#### メソッド

```javascript
/**
 * 時刻表モーダルを表示
 * @param {string} stopName - バス停名
 * @param {Array<Object>} routes - 路線一覧
 */
showTimetableModal(stopName, routes)

/**
 * 路線選択画面を表示
 * @param {Array<Object>} routes - 路線一覧
 */
displayRouteSelection(routes)

/**
 * 時刻表を表示
 * @param {string} routeName - 路線名
 * @param {Object} timetableData - 時刻表データ { weekday: [], weekend: [] }
 */
displayTimetable(routeName, timetableData)

/**
 * 平日・土日祝タブを切り替え
 * @param {string} tabType - タブタイプ（'weekday' or 'weekend'）
 */
switchTab(tabType)

/**
 * 地図表示ボタンのイベントハンドラー
 * @param {string} routeId - 路線ID
 */
handleMapDisplayClick(routeId)
```

### 4. DataLoader 拡張

既存のDataLoaderクラスに以下のメソッドを追加します。

```javascript
/**
 * fare_rules.txtを読み込み
 * @returns {Promise<Array>}
 */
async loadFareRules()

/**
 * 既存のloadFares()メソッドを拡張してfare_rules.txtも読み込む
 */
async loadFares()
```

### 5. DataTransformer 拡張

既存のDataTransformerクラスに以下のメソッドを追加します。

```javascript
/**
 * fare_rules.txtを変換
 * @param {Array} fareRulesData - fare_rules.txtのデータ
 * @returns {Array} 変換された運賃ルールデータ
 */
static transformFareRules(fareRulesData)
```

## データモデル

### FareRule モデル

```javascript
{
  fareId: string,           // 運賃ID
  routeId: string,          // 路線ID（オプション）
  originId: string,         // 乗車ゾーンID（オプション）
  destinationId: string,    // 降車ゾーンID（オプション）
  containsId: string        // 含まれるゾーンID（オプション）
}
```

### FareAttribute モデル

```javascript
{
  fareId: string,           // 運賃ID
  price: number,            // 運賃（円）
  currencyType: string,     // 通貨タイプ（'JPY'）
  paymentMethod: number,    // 支払い方法（0: 乗車時、1: 降車時）
  transfers: number         // 乗り換え回数（0: 乗り換え不可、1: 1回可能、2: 2回可能）
}
```

### Timetable モデル

```javascript
{
  stopId: string,           // バス停ID
  stopName: string,         // バス停名
  routeId: string,          // 路線ID
  routeName: string,        // 路線名
  tripId: string,           // 便ID
  tripHeadsign: string,     // 行き先
  departureTime: string,    // 発車時刻（HH:MM形式）
  serviceDayType: string,   // 運行日種別（'平日' or '土日祝'）
  operator: string          // 事業者名
}
```

### RouteStop モデル（地図表示用）

```javascript
{
  stopId: string,           // バス停ID
  stopName: string,         // バス停名
  stopSequence: number,     // 停車順序
  lat: number,              // 緯度
  lng: number               // 経度
}
```

## エラーハンドリング

### エラーケース

1. **運賃情報が見つからない場合**
   - fare_rules.txtに該当ルールが存在しない
   - fare_attributes.txtに該当運賃が存在しない
   - 対応: 「運賃情報なし」と表示

2. **時刻表データが見つからない場合**
   - 指定されたバス停に路線が存在しない
   - 指定された路線・運行日種別に時刻データが存在しない
   - 対応: 「該当する時刻表がありません」と表示

3. **GTFSデータの不整合**
   - stop_times.txtのtrip_idがtrips.txtに存在しない
   - trips.txtのroute_idがroutes.txtに存在しない
   - 対応: コンソールに警告を出力し、該当データをスキップ

### エラーメッセージ

```javascript
const ERROR_MESSAGES = {
  FARE_NOT_FOUND: '運賃情報が見つかりません',
  TIMETABLE_NOT_FOUND: '該当する時刻表がありません',
  ROUTE_NOT_FOUND: 'この停留所に路線が見つかりません',
  DATA_INCONSISTENCY: 'データに不整合があります',
  GTFS_LOAD_ERROR: 'GTFSデータの読み込みに失敗しました'
};
```

## テスト戦略

### 単体テスト

1. **FareCalculator**
   - 正常系: 有効な区間の運賃計算
   - 異常系: 運賃情報が見つからない場合
   - 境界値: 同一バス停間の運賃計算

2. **TimetableController**
   - 正常系: 路線一覧取得、時刻表取得
   - 異常系: 存在しないバス停・路線の指定
   - 境界値: 深夜便（25:00以降）の時刻表示

3. **DataTransformer**
   - fare_rules.txtの変換
   - 不正なデータ形式の処理

### 統合テスト

1. **運賃計算・表示フロー**
   - バス停選択 → 運賃計算 → 運賃表示
   - 複数事業者の運賃計算

2. **時刻表表示フロー**
   - バス停選択 → 路線選択 → 時刻表表示
   - 平日・土日祝タブ切り替え
   - 地図表示ボタン → 経路表示

### E2Eテスト

1. **ユーザーシナリオ**
   - バス停を選択して運賃を確認
   - 時刻表を見るボタンから時刻表を表示
   - 路線を選択して地図で経路を確認

## パフォーマンス考慮事項

### データキャッシュ

- fare_rules.txtとfare_attributes.txtはメモリにキャッシュ
- 時刻表データは路線・運行日種別ごとにキャッシュ
- キャッシュサイズの上限を設定（最大100路線分）

### 検索最適化

- fare_rules.txtをroute_id + origin_id + destination_idでインデックス化
- stop_times.txtをstop_id + route_idでインデックス化
- 時刻表データを事前にソート（発車時刻順）

### レンダリング最適化

- 時刻表は仮想スクロールを使用（大量データ対応）
- 地図の経路表示は既存のMapController.displayRoute()を再利用

## セキュリティ考慮事項

### XSS対策

- ユーザー入力（バス停名、路線名）はサニタイズ
- HTMLエスケープ処理を実施

### CSP対応

- インラインスタイルを使用しない
- 外部スクリプトの読み込みは既存のCSP設定に準拠

## UI/UXデザイン

### 時刻表モーダル

```
┌─────────────────────────────────────────┐
│  時刻表 - [バス停名]              [×]   │
├─────────────────────────────────────────┤
│                                         │
│  路線を選択してください                 │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 1. 佐賀市営バス - 市内循環線   │   │
│  ├─────────────────────────────────┤   │
│  │ 2. 祐徳バス - 佐賀駅～嬉野線   │   │
│  ├─────────────────────────────────┤   │
│  │ 3. 西鉄バス - 佐賀～福岡線     │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### 時刻表表示

```
┌─────────────────────────────────────────┐
│  時刻表 - [路線名]                [×]   │
├─────────────────────────────────────────┤
│  [平日] [土日祝]                        │
│                                         │
│  [地図で表示する]                       │
│                                         │
│  発車時刻        行き先                 │
│  ─────────────────────────────────     │
│  06:15          佐賀駅バスセンター      │
│  06:45          佐賀駅バスセンター      │
│  07:15          佐賀駅バスセンター      │
│  07:45          佐賀駅バスセンター      │
│  ...                                    │
│                                         │
└─────────────────────────────────────────┘
```

### 運賃表示（検索結果に統合）

既存の検索結果表示に運賃情報を追加します。

```
┌─────────────────────────────────────────┐
│  出発 06:15  →  到着 06:45              │
│                                         │
│  所要時間: 30分                         │
│  運賃: 大人 200円 / 小人 100円          │  ← 追加
│  事業者: 佐賀市営バス                   │
│  路線: 市内循環線                       │
│                                         │
│  [地図で表示]                           │
└─────────────────────────────────────────┘
```

## 実装の優先順位

### Phase 1: 運賃計算・表示機能
1. DataLoaderにfare_rules.txt読み込み機能を追加
2. FareCalculatorクラスを実装
3. 検索結果に運賃情報を表示

### Phase 2: 時刻表表示UI
1. TimetableControllerクラスを実装
2. TimetableUIクラスを実装
3. バス停選択時の「時刻表を見る」ボタンを追加

### Phase 3: 路線選択・時刻表表示
1. 路線選択画面を実装
2. 時刻表表示画面を実装
3. 平日・土日祝タブ切り替えを実装

### Phase 4: 地図表示統合
1. 「地図で表示する」ボタンを実装
2. MapController.displayRoute()との統合
3. 経路表示機能のテスト

## 既存コードとの統合

### 既存のSearchController

- SearchController.getFare()メソッドを拡張
- FareCalculatorを使用して運賃を計算
- 既存の運賃データ（fares配列）との互換性を維持

### 既存のUIController

- UIController.displaySearchResults()を拡張
- 運賃情報を検索結果に追加
- 既存のレイアウトを維持

### 既存のMapController

- MapController.displayRoute()を再利用
- 時刻表の「地図で表示する」ボタンから呼び出し
- 既存の経路表示機能を活用

## 依存関係

### 新規追加ファイル
- `js/fare-calculator.js` - FareCalculatorクラス
- `js/timetable-controller.js` - TimetableControllerクラス
- `js/timetable-ui.js` - TimetableUIクラス
- `css/timetable.css` - 時刻表UI用スタイル

### 既存ファイルの変更
- `js/data-loader.js` - fare_rules.txt読み込み機能を追加
- `js/app.js` - SearchController、UIControllerを拡張
- `css/app.css` - 運賃表示用スタイルを追加
- `index.html` - 時刻表モーダル用HTMLを追加

## 制約事項

### GTFSデータの制約

1. **fare_rules.txtの存在**
   - fare_rules.txtが存在しない場合、運賃計算機能は利用不可
   - 既存のfares配列（fare_major_routes.csv由来）をフォールバックとして使用

2. **ゾーン運賃の対応**
   - GTFSのゾーン運賃（origin_id、destination_id）に対応
   - 区間運賃（contains_id）は将来的に対応

3. **深夜便の時刻表示**
   - 25:00以降の時刻は「翌01:00」のように表示
   - calendar.txtの日付判定に注意

### ブラウザ互換性

- モダンブラウザ（Chrome、Firefox、Safari、Edge）をサポート
- IE11は非サポート
- モバイルブラウザ対応（レスポンシブデザイン）

### パフォーマンス制約

- 時刻表データは最大1000件まで表示
- 地図の経路表示は最大50バス停まで
- データキャッシュは最大100路線分
