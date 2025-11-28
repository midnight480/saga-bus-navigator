# 設計書

## 概要

佐賀バスナビゲーターアプリにおいて、時刻表UIに方向情報を表示する機能を実装します。現在、方向判定機能はDataLoaderに統合されていますが、時刻表UIには方向情報が表示されていません。

この設計では、検索結果リスト、時刻表モーダル、路線選択画面に方向情報を追加し、ユーザーが往路・復路を視覚的に理解できるようにします。

## アーキテクチャ

### 現在の問題点

1. **方向情報の未表示**: 時刻表UIに方向情報が表示されていない
2. **方向フィルタの欠如**: 往路/復路でフィルタリングできない
3. **メタデータの未活用**: 方向判定成功率などの統計情報が表示されていない
4. **アクセシビリティの不足**: スクリーンリーダーで方向情報を理解できない

### 解決アプローチ

1. **検索結果リストの拡張**: 各便に方向ラベルを追加
2. **時刻表モーダルの拡張**: 方向列と方向フィルタを追加
3. **路線選択画面の拡張**: 方向判定成功率バッジを追加
4. **アクセシビリティ対応**: aria属性とキーボードナビゲーションを実装

### データフロー

```
DataLoader（方向判定済み）
  ↓
SearchController（検索結果に方向情報を含む）
  ↓
UIController.createResultItem()
  ├─ 方向ラベルを表示
  └─ aria-label属性を設定
  ↓
TimetableController.getTimetable()
  ├─ 方向情報を含む時刻表データを返す
  └─ 方向でフィルタリング可能
  ↓
TimetableUI.createTimetableTable()
  ├─ 方向列を追加
  ├─ 方向フィルタボタンを表示
  └─ aria属性を設定
```

## コンポーネントとインターフェース

### 1. UIController（拡張）

検索結果リストに方向情報を表示。

```javascript
class UIController {
  /**
   * 検索結果アイテムのHTML生成（拡張）
   * @param {object} result - 検索結果オブジェクト
   * @returns {HTMLElement} リストアイテム要素
   */
  createResultItem(result)
  
  /**
   * 方向ラベルを作成（新規メソッド）
   * @param {string} direction - 方向（'0', '1', 'unknown'）
   * @returns {HTMLElement} 方向ラベル要素
   */
  createDirectionLabel(direction)
}
```

### 2. TimetableUI（拡張）

時刻表モーダルに方向情報と方向フィルタを追加。

```javascript
class TimetableUI {
  /**
   * 時刻表テーブルを作成（拡張）
   * @param {Array<Object>} timetable - 時刻表データ
   * @param {string} currentFilter - 現在の方向フィルタ（'all', '0', '1'）
   * @returns {HTMLElement} テーブル要素
   */
  createTimetableTable(timetable, currentFilter = 'all')
  
  /**
   * 方向フィルタボタンを作成（新規メソッド）
   * @param {string} currentFilter - 現在の方向フィルタ
   * @returns {HTMLElement} フィルタボタンコンテナ
   */
  createDirectionFilter(currentFilter)
  
  /**
   * 方向フィルタを適用（新規メソッド）
   * @param {string} direction - フィルタ方向（'all', '0', '1'）
   */
  applyDirectionFilter(direction)
  
  /**
   * 路線選択画面を表示（拡張）
   * @param {Array<Object>} routes - 路線一覧
   * @param {Map<string, Object>} routeMetadata - 路線メタデータ
   */
  displayRouteSelection(routes, routeMetadata)
  
  /**
   * 方向判定バッジを作成（新規メソッド）
   * @param {number} detectionRate - 方向判定成功率（0.0-1.0）
   * @returns {HTMLElement} バッジ要素
   */
  createDetectionBadge(detectionRate)
}
```

### 3. TimetableController（既存）

既存のメソッドを使用。変更なし。

```javascript
class TimetableController {
  /**
   * 特定路線の時刻表を取得（既存メソッド）
   * 既にdirection情報を含んでいる
   * @param {string} stopId - バス停ID
   * @param {string} routeId - 路線ID
   * @param {string} serviceDayType - 運行日種別
   * @returns {Array<Object>} 時刻表データ（direction含む）
   */
  getTimetable(stopId, routeId, serviceDayType)
}
```

### 4. DataLoader（既存）

既存のメソッドを使用。変更なし。

```javascript
class DataLoader {
  /**
   * 路線メタデータを生成（既存メソッド）
   * 既にdirectionDetectionRateを含んでいる
   * @returns {Map<string, Object>} 路線メタデータ
   */
  generateRouteMetadata()
}
```

## データモデル

### 検索結果オブジェクト（拡張）

```javascript
{
  tripId: string,
  routeNumber: string,
  routeName: string,
  operator: string,
  departureStop: string,
  arrivalStop: string,
  departureTime: string,
  arrivalTime: string,
  duration: number,
  adultFare: number,
  childFare: number,
  weekdayType: string,
  viaStops: Array<Object>,
  tripHeadsign: string,
  direction: string  // 既に含まれている（'0', '1', 'unknown'）
}
```

### 時刻表データオブジェクト（既存）

```javascript
{
  stopId: string,
  stopName: string,
  routeId: string,
  routeName: string,
  tripId: string,
  tripHeadsign: string,
  departureTime: string,
  departureHour: number,
  departureMinute: number,
  serviceDayType: string,
  stopSequence: number,
  direction: string  // 既に含まれている（'0', '1', 'unknown'）
}
```

### 路線メタデータオブジェクト（既存）

```javascript
{
  routeId: string,
  routeName: string,
  tripCount: number,
  stopCount: number,
  directionDetectionRate: number,     // 既に含まれている
  detectionMethod: string,            // 既に含まれている
  unknownDirectionCount: number       // 既に含まれている
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しをします。*

### プロパティ1: 検索結果の方向ラベル表示

*任意の*検索結果において、direction='0'または'1'の便は対応する方向ラベルを持つ

**検証: 要件1.1, 1.2, 1.3**

### プロパティ2: 方向不明時のラベル非表示

*任意の*検索結果において、direction='unknown'の便は方向ラベルを持たない、または「方向不明」ラベルを持つ

**検証: 要件1.4**

### プロパティ3: 時刻表の方向列表示

*任意の*時刻表モーダルにおいて、時刻表テーブルは「方向」列を含む

**検証: 要件2.2**

### プロパティ4: 時刻表の方向情報

*任意の*時刻表エントリにおいて、direction='0'または'1'の便は対応する方向ラベルを持つ

**検証: 要件2.3**

### プロパティ5: 方向フィルタの適用

*任意の*方向フィルタ適用後、表示される便は全て選択された方向と一致する

**検証: 要件4.2, 4.3**

### プロパティ6: 方向フィルタの状態表示

*任意の*方向フィルタボタンにおいて、選択状態はaria-pressed属性で示される

**検証: 要件4.5, 5.3**

### プロパティ7: 方向判定バッジの表示

*任意の*路線選択画面において、directionDetectionRate < 0.5の路線は警告バッジを持つ

**検証: 要件3.2**

### プロパティ8: アクセシビリティ属性

*任意の*方向ラベルにおいて、適切なaria-label属性が設定されている

**検証: 要件5.1, 5.2**

### プロパティ9: レスポンシブ表示

*任意の*画面幅において、方向情報は適切な形式（アイコン/短縮形/完全形）で表示される

**検証: 要件6.1, 6.2, 6.3**

### プロパティ10: パフォーマンス

*任意の*方向情報表示において、処理時間は指定された閾値を超えない

**検証: 要件7.1, 7.2, 7.3**

## エラーハンドリング

### エラーケース1: 方向情報が存在しない

- **検出**: `direction`プロパティが`undefined`または`null`
- **処理**: デフォルト値`'unknown'`を使用
- **ログ**: デバッグレベルでログ出力

### エラーケース2: 方向情報の取得に失敗

- **検出**: `try-catch`ブロックで例外をキャッチ
- **処理**: エラーログを出力し、`'unknown'`を使用して処理を継続
- **ログ**: エラーレベルでログ出力

### エラーケース3: 方向判定成功率が計算できない

- **検出**: `directionDetectionRate`が`undefined`、`null`、または`NaN`
- **処理**: 「N/A」と表示
- **ログ**: 警告レベルでログ出力

### エラーケース4: 方向フィルタリング中のエラー

- **検出**: `try-catch`ブロックで例外をキャッチ
- **処理**: フィルタをリセットし、全ての便を表示
- **ログ**: エラーレベルでログ出力

## テスト戦略

### ユニットテスト

1. **UIController.createDirectionLabel()のテスト**
   - direction='0'の場合のラベル生成
   - direction='1'の場合のラベル生成
   - direction='unknown'の場合のラベル生成
   - aria-label属性の設定

2. **TimetableUI.createDirectionFilter()のテスト**
   - フィルタボタンの生成
   - 初期選択状態の設定
   - aria-pressed属性の設定

3. **TimetableUI.applyDirectionFilter()のテスト**
   - 'all'フィルタの適用
   - '0'フィルタの適用
   - '1'フィルタの適用
   - フィルタ後のデータ検証

4. **TimetableUI.createDetectionBadge()のテスト**
   - 成功率50%未満の警告バッジ
   - 成功率50-80%の注意バッジ
   - 成功率80%以上のバッジ

### プロパティベーステスト

プロパティベーステストには**fast-check**ライブラリを使用します。各テストは最低100回の反復を実行します。

1. **プロパティ1のテスト: 検索結果の方向ラベル表示**
   - ランダムな検索結果を生成
   - direction='0'または'1'の便が方向ラベルを持つことを検証

2. **プロパティ5のテスト: 方向フィルタの適用**
   - ランダムな時刻表データを生成
   - 方向フィルタを適用
   - 全ての表示される便が選択された方向と一致することを検証

3. **プロパティ7のテスト: 方向判定バッジの表示**
   - ランダムな路線メタデータを生成
   - directionDetectionRate < 0.5の路線が警告バッジを持つことを検証

### E2Eテスト

1. **検索結果リストの方向情報表示テスト**
   - 検索を実行
   - 検索結果に方向ラベルが表示されることを確認

2. **時刻表モーダルの方向情報表示テスト**
   - 時刻表モーダルを開く
   - 方向列が表示されることを確認
   - 方向フィルタボタンが表示されることを確認

3. **方向フィルタリングテスト**
   - 時刻表モーダルを開く
   - 「往路のみ」ボタンをクリック
   - 往路の便のみが表示されることを確認

4. **路線選択画面のバッジ表示テスト**
   - 路線選択画面を開く
   - 方向判定成功率が低い路線に警告バッジが表示されることを確認

## 実装の詳細

### 方向ラベルのスタイル

```css
/* 方向ラベル */
.direction-label {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  margin-left: 8px;
}

.direction-label-outbound {
  background-color: #e3f2fd;
  color: #1976d2;
}

.direction-label-inbound {
  background-color: #fff3e0;
  color: #f57c00;
}

.direction-label-unknown {
  background-color: #f5f5f5;
  color: #757575;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .direction-label-text {
    display: none;
  }
  
  .direction-label-icon {
    display: inline;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .direction-label-text {
    display: inline;
  }
  
  .direction-label-text::before {
    content: attr(data-short);
  }
}

@media (min-width: 1025px) {
  .direction-label-text {
    display: inline;
  }
  
  .direction-label-text::before {
    content: attr(data-full);
  }
}
```

### 方向フィルタボタンのスタイル

```css
/* 方向フィルタ */
.direction-filter {
  display: flex;
  gap: 8px;
  margin: 16px 20px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.direction-filter-button {
  flex: 1;
  padding: 8px 16px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.direction-filter-button:hover {
  background-color: #f0f0f0;
}

.direction-filter-button:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}

.direction-filter-button[aria-pressed="true"] {
  background-color: #007bff;
  color: #fff;
  border-color: #007bff;
}

/* レスポンシブ対応 */
@media (max-width: 480px) {
  .direction-filter {
    flex-direction: column;
  }
  
  .direction-filter-button {
    width: 100%;
  }
}
```

### 方向判定バッジのスタイル

```css
/* 方向判定バッジ */
.detection-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  margin-left: 8px;
}

.detection-badge-warning {
  background-color: #ffebee;
  color: #c62828;
}

.detection-badge-caution {
  background-color: #fff3e0;
  color: #f57c00;
}

.detection-badge-success {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.detection-badge-tooltip {
  position: relative;
  cursor: help;
}

.detection-badge-tooltip:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 12px;
  background-color: #333;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 1000;
}
```

## パフォーマンス考慮事項

### 処理時間の目標

- **検索結果の方向情報表示**: 10ms以内
- **時刻表モーダルの方向情報表示**: 50ms以内
- **方向フィルタの適用**: 100ms以内

### 最適化戦略

1. **方向情報のキャッシュ**: 既に判定された方向情報を再利用
2. **仮想スクロール**: 大量の便データを表示する場合に使用
3. **遅延レンダリング**: 方向フィルタ適用時に必要な要素のみを再レンダリング

### メモリ使用量の最適化

- 方向情報は既存のデータオブジェクトに含まれているため、追加のメモリは最小限
- フィルタリング時は新しい配列を作成せず、既存の配列をフィルタ

## アクセシビリティ考慮事項

### スクリーンリーダー対応

- 方向ラベルに`aria-label`属性を設定（例: "往路"、"復路"）
- 方向フィルタボタンに`aria-pressed`属性を設定
- 方向判定バッジに`aria-describedby`属性を設定

### キーボードナビゲーション

- 方向フィルタボタンは`Tab`キーでフォーカス可能
- `Enter`または`Space`キーでフィルタを適用
- `Escape`キーでモーダルを閉じる

### カラーコントラスト

- 方向ラベルの背景色と文字色のコントラスト比は4.5:1以上
- 方向フィルタボタンの選択状態は色だけでなく、ボーダーでも示す

## セキュリティ考慮事項

- 方向情報はクライアント側で生成されるため、サーバー側の検証は不要
- XSS対策: 方向ラベルのテキストは固定値（'往路'、'復路'）のみ使用

## デプロイメント戦略

1. **段階的ロールアウト**: 検索結果リスト → 時刻表モーダル → 路線選択画面の順に実装
2. **後方互換性の確保**: 既存のUIを壊さないように注意
3. **ロールバック計画**: 問題が発生した場合は方向情報の表示を無効化

## 今後の拡張性

1. **方向名のカスタマイズ**: 路線ごとに方向名を設定可能にする
2. **方向情報のエクスポート**: カレンダー登録時に方向情報を含める
3. **方向別の統計情報**: 往路/復路ごとの便数や運行時間帯を表示
