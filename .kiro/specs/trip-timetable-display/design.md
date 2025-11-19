# 設計書

## 概要

本機能は、リアルタイム車両追跡機能で表示される車両マーカーに、便の全停車バス停と到着時刻を時刻表形式で表示する機能を追加します。既存のRealtimeVehicleControllerとMapControllerを拡張し、新たにTripTimetableFormatterクラスを追加することで、ユーザーが便の詳細な運行情報を一目で確認できるようになります。

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
│  │   (拡張: 時刻表表示機能を追加)                 │          │
│  └──────┬────────────────────────────────────────┘          │
│         │                                                    │
│  ┌──────▼────────────────────────────────────────┐          │
│  │   trip-timetable-formatter.js (新規)          │          │
│  │   (時刻表データの取得・フォーマット)            │          │
│  └──────┬────────────────────────────────────────┘          │
│         │                                                    │
│  ┌──────▼────────────────────────────────────────┐          │
│  │   data-loader.js (既存)                       │          │
│  │   (GTFSデータの読み込み・キャッシュ)           │          │
│  └───────────────────────────────────────────────┘          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### データフロー

1. **車両マーカークリック時のフロー**
   - ユーザーが車両マーカーをクリック
   - MapController → RealtimeVehicleController
   - RealtimeVehicleController → TripTimetableFormatter
   - TripTimetableFormatter → DataLoader（キャッシュからstop_times、stopsを取得）
   - TripTimetableFormatter → 時刻表HTML生成
   - RealtimeVehicleController → MapController（吹き出しに時刻表を追加）

2. **時刻表データ取得フロー**
   - TripTimetableFormatter.getTimetableData(tripId)
   - DataLoaderのキャッシュからstop_timesをフィルタ
   - stop_sequenceでソート
   - 各stop_idに対応するバス停名を取得
   - 時刻表データオブジェクトを返す

3. **時刻表HTML生成フロー**
   - TripTimetableFormatter.formatTimetableHTML(timetableData, options)
   - 便ID・路線名のヘッダー生成
   - 各停車バス停の情報を「バス停名（到着HH:MM）」形式で生成
   - 矢印（→）で区切って結合
   - 現在位置の強調表示を適用
   - 折りたたみ機能を適用（10停車以上の場合）
   - HTMLを返す

## コンポーネントとインターフェース

### 1. TripTimetableFormatter (新規)

**責務**: 便の時刻表データの取得、フォーマット、HTML生成

**主要メソッド**:

```javascript
class TripTimetableFormatter {
  constructor(dataLoader)
  
  // 時刻表データを取得
  getTimetableData(tripId)
  
  // 時刻表HTMLを生成
  formatTimetableHTML(tripId, options = {})
  
  // 時刻表文字列を生成（テキスト形式）
  formatTimetableText(tripId, options = {})
  
  // 到着時刻をHH:MM形式に変換
  formatArrivalTime(arrivalTime)
  
  // バス停名を取得（stop_idから）
  getStopName(stopId)
  
  // 現在位置のバス停を判定
  getCurrentStopIndex(tripId, currentStopSequence)
  
  // 時刻表をキャッシュ
  cacheTimetable(tripId, html)
  
  // キャッシュから時刻表を取得
  getCachedTimetable(tripId)
  
  // キャッシュをクリア
  clearCache()
}
```

**依存関係**:
- DataLoader (既存)

**キャッシュ管理**:
- 生成済みの時刻表HTMLをMapで管理 (tripId → html)
- 最大100件までキャッシュ（LRU方式）

### 2. RealtimeVehicleController (拡張)

**既存機能**: 車両位置と運行情報の表示制御

**追加メソッド**:

```javascript
class RealtimeVehicleController {
  // 既存メソッド...
  
  // 車両マーカーの吹き出しに時刻表を追加
  addTimetableToPopup(tripId, currentStopSequence, popupElement)
  
  // 時刻表表示エラーハンドリング
  handleTimetableError(error, tripId)
}
```

**変更点**:
- `updateVehicleMarker()`メソッド内で`addTimetableToPopup()`を呼び出し
- TripTimetableFormatterのインスタンスを保持

### 3. MapController (拡張)

**既存機能**: 地図表示、マーカー管理

**追加メソッド**:

```javascript
class MapController {
  // 既存メソッド...
  
  // 車両マーカーの吹き出しに時刻表セクションを追加
  appendTimetableToPopup(markerId, timetableHTML)
  
  // 折りたたみリンクのイベントリスナーを設定
  setupTimetableToggleListeners(popupElement)
}
```

**変更点**:
- 車両マーカーの吹き出しHTML構造を拡張
- 時刻表セクション用のCSSクラスを追加

## データモデル

### 時刻表データオブジェクト

```javascript
{
  tripId: "trip_456",
  routeId: "route_789",
  routeName: "佐賀駅～大和線",
  stops: [
    {
      stopId: "stop_001",
      stopName: "佐賀駅バスセンター",
      stopSequence: 1,
      arrivalTime: "08:00:00",
      formattedTime: "08:00"
    },
    {
      stopId: "stop_002",
      stopName: "県庁前",
      stopSequence: 2,
      arrivalTime: "08:05:00",
      formattedTime: "08:05"
    },
    // ...
  ],
  currentStopSequence: 2, // 現在位置（オプション）
  totalStops: 15
}
```

### 時刻表HTMLオプション

```javascript
{
  currentStopSequence: 2,        // 現在位置の停車順序（強調表示用）
  collapsed: true,               // 折りたたみ状態（デフォルト: 10停車以上の場合true）
  showRouteInfo: true,           // 路線情報を表示（デフォルト: true）
  maxVisibleStops: 6,            // 折りたたみ時の表示停車数（デフォルト: 6）
  highlightCurrent: true         // 現在位置を強調表示（デフォルト: true）
}
```

### 時刻表HTML構造

```html
<div class="trip-timetable">
  <div class="timetable-header">
    <strong>時刻表</strong>
    <span class="route-info">便ID: trip_456 | 路線: 佐賀駅～大和線</span>
  </div>
  <div class="timetable-content" data-collapsed="true">
    <div class="timetable-stops">
      <span class="stop-item">佐賀駅バスセンター（08:00）</span>
      <span class="stop-arrow">→</span>
      <span class="stop-item current-stop">県庁前（08:05）<span class="current-marker">← 現在地</span></span>
      <span class="stop-arrow">→</span>
      <span class="stop-item">...</span>
      <span class="stop-arrow">→</span>
      <span class="stop-item">大和温泉病院（08:45）</span>
    </div>
    <a href="#" class="timetable-toggle" data-action="expand">時刻表を表示（全15停車）</a>
  </div>
</div>
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。これは仕様と機械検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: 時刻表データ取得の完全性

*任意の*有効なtrip_idに対して、getTimetableData()は該当便の全停車時刻データを返し、データはstop_sequenceの昇順でソートされている
**Validates: Requirements 1.1, 1.2**

### プロパティ2: バス停名取得の正確性

*任意の*有効なstop_idに対して、getStopName()は対応するバス停名を返し、存在しないstop_idに対しては「バス停名不明」を返す
**Validates: Requirements 1.3, 1.4**

### プロパティ3: 時刻フォーマットの正確性

*任意の*arrival_time（HH:MM:SS形式）に対して、formatArrivalTime()はHH:MM形式の文字列を返す
**Validates: Requirements 1.5**

### プロパティ4: 時刻表フォーマットの正確性

*任意の*時刻表データに対して、formatTimetableText()は「バス停名（到着HH:MM）→ バス停名（到着HH:MM）→ ...」の形式で文字列を生成する
**Validates: Requirements 2.1, 2.2, 2.3**

### プロパティ5: 時刻表HTMLの構造

*任意の*trip_idに対して、formatTimetableHTML()は便IDと路線名を含むHTMLを生成し、時刻表セクションには「時刻表」ラベルが含まれる
**Validates: Requirements 2.5, 3.2**

### プロパティ6: 吹き出しへの統合

*任意の*車両マーカーに対して、吹き出しには運行状態情報と時刻表情報の両方が含まれ、時刻表は運行状態情報の下に配置される
**Validates: Requirements 3.1**

### プロパティ7: スクロール可能なスタイル

*任意の*時刻表HTMLに対して、時刻表コンテンツ要素にはスクロール可能なCSSクラスが適用されている
**Validates: Requirements 3.3**

### プロパティ8: 視覚的区別のスタイル

*任意の*時刻表HTMLに対して、時刻表セクションには視覚的区別のためのCSSクラス（trip-timetable）が適用されている
**Validates: Requirements 3.4**

### プロパティ9: ログ出力の完全性

*任意の*時刻表生成処理に対して、処理完了時にコンソールに処理時間がログ出力される
**Validates: Requirements 4.5**

### プロパティ10: エラー時のログ出力

*任意の*エラー発生時に対して、コンソールにtrip_idとエラーメッセージが出力される
**Validates: Requirements 5.5**

### プロパティ11: 現在位置の強調表示

*任意の*current_stop_sequenceが指定された時刻表に対して、該当するバス停には強調表示のCSSクラスが適用され、「現在地」マーカーが含まれる
**Validates: Requirements 6.1, 6.2, 6.3**

### プロパティ12: 折りたたみ状態の判定

*任意の*時刻表データに対して、停車バス停数が10個を超える場合、デフォルトで折りたたまれた状態（collapsed=true）で表示される
**Validates: Requirements 7.1**

### プロパティ13: 折りたたみリンクの表示

*任意の*折りたたまれた時刻表に対して、「時刻表を表示（全○停車）」というテキストを含むリンクが表示される
**Validates: Requirements 7.2**

### プロパティ14: 展開・折りたたみの動作

*任意の*時刻表に対して、折りたたみリンクをクリックすると展開状態が切り替わり、展開時は全停車バス停が表示され、折りたたみ時は最初の3停車と最後の3停車のみが表示される
**Validates: Requirements 7.3, 7.5**

### プロパティ15: 展開時のリンクテキスト

*任意の*展開された時刻表に対して、「時刻表を折りたたむ」というテキストを含むリンクが表示される
**Validates: Requirements 7.4**

## エラーハンドリング

### エラー分類

1. **データ取得エラー**
   - trip_idに対応するstop_timesデータが存在しない
   - DataLoaderが初期化されていない
   - stop_idに対応するバス停名が存在しない

2. **データ処理エラー**
   - arrival_timeのフォーマットが不正
   - stop_sequenceが不正（数値でない、重複など）
   - 時刻表データが空

3. **HTML生成エラー**
   - DOM操作エラー
   - イベントリスナー設定エラー

### エラーハンドリング戦略

**レベル1: データ検証**
- trip_idの存在チェック
- stop_timesデータの妥当性チェック
- arrival_timeフォーマットの検証

**レベル2: フォールバック**
- stop_idが存在しない場合: 「バス停名不明」を表示
- arrival_timeが不正な場合: 「--:--」を表示
- 時刻表データが取得できない場合: 「時刻表情報が取得できません」を表示

**レベル3: ユーザー通知**
- データ取得エラー: 「時刻表情報が見つかりません」
- データ処理エラー: 「時刻表情報の取得に失敗しました」
- HTML生成エラー: 既存の運行状態情報は引き続き表示

**エラーログ**:
```javascript
{
  timestamp: "2025-11-18T10:30:00Z",
  errorType: "DATA_NOT_FOUND" | "DATA_PROCESSING_ERROR" | "HTML_GENERATION_ERROR",
  message: "Failed to get timetable data",
  details: {
    tripId: "trip_456",
    error: "No stop_times data found for trip_id"
  }
}
```

## テスト戦略

### 単体テスト

**TripTimetableFormatter**:
- getTimetableData()の正常系・異常系
- formatTimetableHTML()の各オプション
- formatArrivalTime()の時刻フォーマット
- getStopName()の存在・非存在ケース
- キャッシュ機能の動作確認

**RealtimeVehicleController**:
- addTimetableToPopup()の統合
- エラーハンドリングの検証

### 統合テスト

**データフロー**:
- 車両マーカークリック → 時刻表表示
- 時刻表データ取得 → HTML生成 → 吹き出し表示
- エラー発生時のフォールバック動作

### E2Eテスト

**シナリオ1: 時刻表表示**
1. アプリケーション起動
2. 車両マーカーをクリック
3. 吹き出しに時刻表が表示されることを確認
4. 時刻表のフォーマットを確認（矢印、括弧、時刻）

**シナリオ2: 現在位置の強調表示**
1. 運行中の車両マーカーをクリック
2. 時刻表内で現在位置のバス停が強調表示されることを確認
3. 「現在地」マーカーが表示されることを確認

**シナリオ3: 折りたたみ機能**
1. 10停車以上の便の車両マーカーをクリック
2. 時刻表が折りたたまれた状態で表示されることを確認
3. 「時刻表を表示」リンクをクリック
4. 全停車バス停が表示されることを確認
5. 「時刻表を折りたたむ」リンクをクリック
6. 最初の3停車と最後の3停車のみが表示されることを確認

**シナリオ4: エラーハンドリング**
1. 存在しないtrip_idの車両マーカーをクリック（モック）
2. 「時刻表情報が見つかりません」と表示されることを確認
3. 既存の運行状態情報は引き続き表示されることを確認

## パフォーマンス最適化

### データ取得の最適化

1. **キャッシュ活用**
   - DataLoaderのキャッシュされたstop_times、stopsデータを使用
   - 追加のネットワークリクエストなし

2. **時刻表HTMLのキャッシュ**
   - 生成済みの時刻表HTMLをMapで管理
   - 同じtrip_idの時刻表を再度表示する際はキャッシュから取得
   - LRU方式で最大100件までキャッシュ

3. **データフィルタリングの最適化**
   - stop_timesデータのフィルタリングにArray.filter()を使用
   - インデックスを使用した高速検索（必要に応じて）

### HTML生成の最適化

1. **文字列結合**
   - DOM操作を避けて文字列結合でHTML生成
   - テンプレートリテラルを使用

2. **遅延レンダリング**
   - 折りたたみ状態では最小限のHTMLのみ生成
   - 展開時に追加のHTMLを生成

3. **イベントリスナーの最適化**
   - イベント委譲を使用してリスナー数を削減

### メモリ管理

1. **キャッシュサイズ制限**
   - 時刻表HTMLキャッシュは最大100件
   - LRU方式で古いエントリを削除

2. **DOM要素のクリーンアップ**
   - 吹き出しが閉じられた際にイベントリスナーを削除

## セキュリティ

### XSS対策

- バス停名、路線名などのユーザー入力データをエスケープ
- HTMLテンプレートリテラル内でエスケープ関数を使用

### データ検証

- trip_idの形式検証
- stop_sequenceの数値検証
- arrival_timeのフォーマット検証

## デプロイメント

### 新規ファイル

- `js/trip-timetable-formatter.js` - 時刻表フォーマッタークラス

### 変更ファイル

- `js/realtime-vehicle-controller.js` - 時刻表表示機能を追加
- `js/map-controller.js` - 吹き出しHTML構造を拡張
- `css/app.css` - 時刻表表示用のCSSを追加

### ビルド手順

1. 新規ファイルの追加
2. 既存ファイルの変更
3. CSSの追加
4. テストの実行
5. デプロイ

### ロールバック手順

1. 変更ファイルを元に戻す
2. 新規ファイルを削除
3. CSSの変更を元に戻す

## 運用監視

### ログ出力

**成功ログ**:
```
[TripTimetableFormatter] Timetable generated: tripId=trip_456, duration=15ms
[RealtimeVehicleController] Timetable added to popup: tripId=trip_456
```

**エラーログ**:
```
[TripTimetableFormatter] Failed to get timetable data: tripId=trip_456, error=No stop_times data found
[RealtimeVehicleController] Timetable display error: tripId=trip_456, error=Data processing error
```

### メトリクス

- 時刻表生成時間（平均、最大）
- キャッシュヒット率
- エラー発生回数
- 折りたたみ機能の使用率

### アラート条件

- 時刻表生成時間が100msを超える
- エラー発生率が10%を超える
- キャッシュヒット率が50%を下回る

## 今後の拡張

### フェーズ2: 遅延情報の統合

- 時刻表内に遅延時間を表示
- 予定時刻と実際の到着時刻を並べて表示

### フェーズ3: バス停詳細情報

- 時刻表内のバス停名をクリックするとバス停詳細を表示
- バス停の位置を地図上で強調表示

### フェーズ4: 時刻表のエクスポート

- 時刻表をテキストファイルとしてダウンロード
- カレンダーアプリへのエクスポート

## 参考資料

- [GTFS仕様](https://gtfs.org/reference/static/)
- [Leaflet.js Popup API](https://leafletjs.com/reference.html#popup)
- [既存のリアルタイム車両追跡設計書](.kiro/specs/realtime-vehicle-tracking/design.md)
