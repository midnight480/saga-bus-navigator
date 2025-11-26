# 設計書

## 概要

佐賀バスナビゲーターアプリに双方向のバス路線検索機能を追加します。現在は佐賀駅から出発する方向（往路）のみが検索可能ですが、佐賀駅へ向かう方向（復路）も検索できるようにします。

GTFSデータの`direction_id`フィールドが空の場合でも、`trip_headsign`と`stop_sequence`を使用して方向を判定し、正しい検索結果を返すようにします。

## アーキテクチャ

### 現在の問題点

1. `direction_id`フィールドが空のため、往路・復路の区別ができない
2. 検索時に`stop_sequence`を考慮していないため、バス停の順序が逆の場合に検索できない
3. 路線図表示が一方向のみを想定している

### 解決アプローチ

1. **方向判定ロジックの追加**: `trip_headsign`と`stop_sequence`から方向を推測
2. **検索ロジックの改善**: 乗車バス停と降車バス停の`stop_sequence`を比較して、正しい方向のtripのみを検索対象とする
3. **路線図表示の改善**: 往路・復路の両方のバス停を表示し、視覚的に区別する

## コンポーネントとインターフェース

### 1. DirectionDetector（新規）

方向判定を担当する新しいユーティリティクラス。

```javascript
class DirectionDetector {
  /**
   * tripの方向を判定
   * @param {Object} trip - trips.txtの1レコード
   * @param {string} routeId - 路線ID
   * @param {Array} allTrips - 同じ路線の全てのtrip
   * @returns {string} 方向識別子（'0'=往路, '1'=復路, 'unknown'=不明）
   */
  static detectDirection(trip, routeId, allTrips)

  /**
   * 2つのバス停間の経路が存在するtripを検索
   * @param {string} fromStopId - 乗車バス停ID
   * @param {string} toStopId - 降車バス停ID
   * @param {Array} stopTimes - stop_times.txtのデータ
   * @param {Object} tripsIndex - trip_idでインデックス化されたtrips
   * @returns {Array<string>} 該当するtrip_idの配列
   */
  static findTripsForRoute(fromStopId, toStopId, stopTimes, tripsIndex)
}
```

### 2. TimetableController（拡張）

既存のTimetableControllerに以下のメソッドを追加。

```javascript
class TimetableController {
  /**
   * 2つのバス停間の時刻表を取得（新規メソッド）
   * @param {string} fromStopId - 乗車バス停ID
   * @param {string} toStopId - 降車バス停ID
   * @param {string} routeId - 路線ID
   * @param {string} serviceDayType - 運行日種別
   * @returns {Array<Object>} 時刻表データの配列
   */
  getTimetableBetweenStops(fromStopId, toStopId, routeId, serviceDayType)

  /**
   * 路線の全方向のバス停を取得（既存メソッドの拡張）
   * @param {string} routeId - 路線ID
   * @param {string} direction - 方向フィルタ（オプション: '0', '1', null=全方向）
   * @returns {Array<Object>} バス停座標の配列
   */
  getRouteStops(routeId, direction = null)
}
```

### 3. MapController（拡張）

地図表示に方向情報を追加。

```javascript
class MapController {
  /**
   * 路線を地図上に表示（方向別に色分け）
   * @param {string} routeId - 路線ID
   * @param {string} direction - 表示する方向（オプション）
   */
  displayRoute(routeId, direction = null)
}
```

## データモデル

### 拡張されたTimetableエントリ

```javascript
{
  stopId: string,           // バス停ID
  stopName: string,         // バス停名
  routeId: string,          // 路線ID
  routeName: string,        // 路線名
  tripId: string,           // 便ID
  tripHeadsign: string,     // 行き先
  departureTime: string,    // 発車時刻（表示用）
  departureHour: number,    // 発車時（数値）
  departureMinute: number,  // 発車分（数値）
  serviceDayType: string,   // 運行日種別
  stopSequence: number,     // 停車順序
  direction: string         // 方向（'0'=往路, '1'=復路, 'unknown'=不明）← 新規追加
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しをします。*

### プロパティ1: 方向情報の存在

*任意の*GTFSデータ読み込み後、全てのtripは方向情報（`direction_id`、推測された方向、またはデフォルト値）を持つ

**検証: 要件1.1, 1.2, 1.5**

### プロパティ2: 方向判定の一貫性

*任意の*路線において、同じ`trip_headsign`を持つ全てのtripは同じ方向として分類される

**検証: 要件1.3**

### プロパティ3: 時刻表エントリの方向情報

*任意の*変換された時刻表エントリは方向情報フィールドを含む

**検証: 要件1.4**

### プロパティ4: バス停順序による検索フィルタリング

*任意の*バス停ペア(A, B)とtripにおいて、Aの`stop_sequence`がBの`stop_sequence`より小さい場合のみ、そのtripはA→Bの検索結果に含まれる

**検証: 要件2.1, 2.2**

### プロパティ5: 双方向検索の対称性

*任意の*往復路線のバス停ペア(A, B)において、A→Bの検索で見つかるtripとB→Aの検索で見つかるtripは異なるtripセットである

**検証: 要件2.3, 3.1**

### プロパティ6: 検索結果の行き先表示

*任意の*検索結果において、各バスエントリは`trip_headsign`フィールドを含む

**検証: 要件3.2**

### プロパティ7: 同時刻複数方向の表示

*任意の*同じ時刻に複数方向のバスが存在する場合、全ての方向のバスが検索結果に含まれる

**検証: 要件3.3**

### プロパティ8: 路線図の完全性

*任意の*路線において、往路と復路の全てのバス停が地図表示に含まれる

**検証: 要件4.1, 4.2**

### プロパティ9: 方向別ハイライト

*任意の*方向選択において、選択された方向のバス停のみがハイライト表示され、他の方向のバス停はハイライトされない

**検証: 要件4.3**

### プロパティ10: 方向の視覚的区別

*任意の*路線図表示において、往路と復路は視覚的に区別可能である（色、矢印などの属性が異なる）

**検証: 要件4.4**

### プロパティ11: 後方互換性

*任意の*既存のAPI呼び出しにおいて、新しい実装は従来と同じ結果を返す（方向情報フィールドの追加を除く）

**検証: 要件5.2**

### プロパティ12: フォールバック動作

*任意の*方向情報が欠落しているGTFSデータにおいて、システムは正常に動作し、デフォルト値を使用する

**検証: 要件5.3**

## エラーハンドリング

### エラーケース1: バス停間に経路が存在しない

- **検出**: `findTripsForRoute()`が空配列を返す
- **処理**: 「該当する便が見つかりません」メッセージを表示
- **ログ**: 検索条件（乗車バス停、降車バス停、路線ID）をログ出力

### エラーケース2: 方向判定ができない

- **検出**: `trip_headsign`が空または全てのtripで同じ
- **処理**: 方向を'unknown'として扱い、`stop_sequence`のみで判定
- **ログ**: 警告ログを出力

### エラーケース3: データ不整合

- **検出**: `stop_sequence`が連続していない、または重複している
- **処理**: データをスキップし、警告ログを出力
- **ログ**: 不整合の詳細（trip_id、stop_id、stop_sequence）を出力

## テスト戦略

### ユニットテスト

1. **DirectionDetector.detectDirection()のテスト**
   - `direction_id`が設定されている場合
   - `trip_headsign`から方向を推測する場合
   - 方向判定ができない場合

2. **DirectionDetector.findTripsForRoute()のテスト**
   - 正常な経路が存在する場合
   - 逆方向の経路のみが存在する場合
   - 経路が存在しない場合

3. **TimetableController.getTimetableBetweenStops()のテスト**
   - 往路の検索
   - 復路の検索
   - 両方向の検索

### プロパティベーステスト

プロパティベーステストには**fast-check**ライブラリを使用します。各テストは最低100回の反復を実行します。

1. **プロパティ1のテスト**
   - ランダムなtrip、乗車バス停、降車バス停を生成
   - `stop_sequence`の順序が正しいtripのみが検索結果に含まれることを検証

2. **プロパティ2のテスト**
   - ランダムなバス停ペアを生成
   - A→BとB→Aの検索結果が異なることを検証（往復がある場合）

3. **プロパティ3のテスト**
   - ランダムなtripセットを生成
   - 同じ`trip_headsign`を持つtripが同じ方向として分類されることを検証

4. **プロパティ4のテスト**
   - ランダムな有効なバス停ペアを生成
   - 少なくとも一方向で検索結果が存在することを検証

5. **プロパティ5のテスト**
   - ランダムな路線を生成
   - 全てのバス停が地図表示に含まれることを検証

6. **プロパティ6のテスト**
   - ランダムなAPI呼び出しパラメータを生成
   - 新旧実装の結果が一致することを検証（方向情報を除く）

### E2Eテスト

1. **佐賀駅を降車バス停とした検索**
   - 任意のバス停から佐賀駅への検索が成功することを確認

2. **路線図の双方向表示**
   - 往路・復路の両方のバス停が地図上に表示されることを確認

3. **検索結果の行き先表示**
   - 各バスの`trip_headsign`が正しく表示されることを確認

## 実装の詳細

### 方向判定アルゴリズム

```javascript
// 1. direction_idが設定されている場合はそれを使用
if (trip.direction_id !== '' && trip.direction_id !== null) {
  return trip.direction_id;
}

// 2. trip_headsignから方向を推測
// 同じ路線の全てのtripを取得
const tripsForRoute = allTrips.filter(t => t.route_id === routeId);

// trip_headsignでグループ化
const headsignGroups = {};
tripsForRoute.forEach(t => {
  const headsign = t.trip_headsign || 'unknown';
  if (!headsignGroups[headsign]) {
    headsignGroups[headsign] = [];
  }
  headsignGroups[headsign].push(t);
});

// 2つ以上のグループがある場合、それぞれを異なる方向として扱う
const headsigns = Object.keys(headsignGroups);
if (headsigns.length >= 2) {
  // 最初のグループを'0'、2番目を'1'とする
  const headsign = trip.trip_headsign || 'unknown';
  return headsigns.indexOf(headsign) === 0 ? '0' : '1';
}

// 3. 判定できない場合は'unknown'
return 'unknown';
```

### バス停間経路検索アルゴリズム

```javascript
// 1. 乗車バス停に停車する全てのstop_timesを取得
const fromStopTimes = stopTimes.filter(st => st.stop_id === fromStopId);

// 2. 各stop_timeについて、同じtripで降車バス停に停車するか確認
const validTripIds = [];

fromStopTimes.forEach(fromSt => {
  // 同じtripで降車バス停に停車するstop_timeを検索
  const toSt = stopTimes.find(st => 
    st.trip_id === fromSt.trip_id && 
    st.stop_id === toStopId &&
    parseInt(st.stop_sequence) > parseInt(fromSt.stop_sequence)
  );

  if (toSt) {
    validTripIds.push(fromSt.trip_id);
  }
});

// 3. 重複を除去
return [...new Set(validTripIds)];
```

## パフォーマンス考慮事項

### インデックス戦略

1. **trip_idインデックス**: 既存のまま維持
2. **stop_idインデックス**: 既存のまま維持
3. **新規インデックス不要**: 方向判定は初回のみ実行し、結果をtripオブジェクトにキャッシュ

### 検索最適化

1. **stop_sequenceの比較**: 数値比較のため高速
2. **早期リターン**: 最初の有効なtripが見つかった時点で検索を継続するか判断
3. **フィルタリングの順序**: 最も制約の強い条件（stop_sequence）を最初に適用

## セキュリティ考慮事項

- 入力値の検証: バス停ID、路線IDの形式チェック
- SQLインジェクション対策: 不要（クライアントサイドのみ）
- XSS対策: `trip_headsign`などのユーザー表示データをエスケープ

## デプロイメント戦略

1. **段階的ロールアウト**: 新機能をフィーチャーフラグで制御
2. **A/Bテスト**: 一部のユーザーに新機能を提供し、フィードバックを収集
3. **ロールバック計画**: 問題が発生した場合は旧実装に戻す

## 今後の拡張性

1. **リアルタイムデータ対応**: 方向情報をリアルタイムデータにも適用
2. **複数路線の乗り換え**: 方向を考慮した乗り換え検索
3. **ユーザー設定**: 往路・復路の表示/非表示を切り替え可能に
