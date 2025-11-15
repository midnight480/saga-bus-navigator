# 設計書

## 概要

OpenStreetMapの地図タイル画像が現在のCSP設定によってブロックされている問題を解決します。Leafletライブラリが使用する負荷分散用のサブドメイン（a.tile.openstreetmap.org、b.tile.openstreetmap.org、c.tile.openstreetmap.org）を許可するため、`_headers`ファイルのCSP設定を修正します。

## 問題の詳細分析

### 現在の状況

**CSP設定（_headers）:**
```
img-src 'self' data: https://tile.openstreetmap.org https://tile.openstreetmap.fr
```

**実際のタイルURL（map-controller.js）:**
```javascript
const primaryTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
```

**Leafletによる展開:**
- `{s}` → `a`, `b`, `c` のいずれか（負荷分散）
- 実際のリクエスト例:
  - `https://a.tile.openstreetmap.org/13/7234/3245.png`
  - `https://b.tile.openstreetmap.org/13/7235/3245.png`
  - `https://c.tile.openstreetmap.org/13/7236/3245.png`

**問題:**
- CSPは`https://tile.openstreetmap.org`のみを許可
- サブドメイン付きURL（`a.tile.openstreetmap.org`等）はブロックされる
- 結果: 地図タイルが表示されず、CSP違反エラーが発生

### エラーメッセージ

```
Loading the image 'https://a.tile.openstreetmap.org/...' violates the following 
Content Security Policy directive: "img-src 'self' data: https://tile.openstreetmap.org 
https://tile.openstreetmap.fr". The action has been blocked.
```

## アーキテクチャ

### 現在のフロー（問題あり）

```
ブラウザ
  ↓ 地図表示リクエスト
Leaflet.js
  ↓ タイルURL生成
https://a.tile.openstreetmap.org/13/7234/3245.png
  ↓ 画像読み込み試行
CSP: img-src ... https://tile.openstreetmap.org
  ↓ サブドメイン不一致
❌ ブロック: CSP違反エラー
```

### 修正後のフロー

```
ブラウザ
  ↓ 地図表示リクエスト
Leaflet.js
  ↓ タイルURL生成
https://a.tile.openstreetmap.org/13/7234/3245.png
  ↓ 画像読み込み試行
CSP: img-src ... https://*.tile.openstreetmap.org
  ↓ ワイルドカードマッチ
✅ 許可: 正常に表示
```

## コンポーネントと修正内容

### 1. _headersファイルの修正

#### 現在の設定

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org https://tile.openstreetmap.fr; connect-src 'self' https://ntp-a1.nict.go.jp https://holidays-jp.github.io; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```

#### 修正後の設定

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.tile.openstreetmap.org https://*.tile.openstreetmap.fr; connect-src 'self' https://ntp-a1.nict.go.jp https://holidays-jp.github.io; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```

#### 変更点の詳細

**変更前:**
```
img-src 'self' data: https://tile.openstreetmap.org https://tile.openstreetmap.fr
```

**変更後:**
```
img-src 'self' data: https://*.tile.openstreetmap.org https://*.tile.openstreetmap.fr
```

**具体的な変更:**
1. `https://tile.openstreetmap.org` → `https://*.tile.openstreetmap.org`
2. `https://tile.openstreetmap.fr` → `https://*.tile.openstreetmap.fr`

**許可されるドメイン:**
- `https://a.tile.openstreetmap.org`
- `https://b.tile.openstreetmap.org`
- `https://c.tile.openstreetmap.org`
- `https://a.tile.openstreetmap.fr`
- `https://b.tile.openstreetmap.fr`
- `https://c.tile.openstreetmap.fr`

### 2. セキュリティ考慮事項

#### ワイルドカードの使用

**メリット:**
- OpenStreetMapの負荷分散サブドメイン（a, b, c）を全て許可
- 将来的にサブドメインが追加されても対応可能
- 保守性が高い

**セキュリティリスク:**
- `*.tile.openstreetmap.org`は`tile.openstreetmap.org`のサブドメイン全体を許可
- 理論上、攻撃者が`evil.tile.openstreetmap.org`を作成できれば悪用可能

**リスク評価:**
- OpenStreetMapは信頼できるオープンソースプロジェクト
- `tile.openstreetmap.org`ドメインはOpenStreetMap Foundationが管理
- 攻撃者が任意のサブドメインを作成することは不可能
- **結論: リスクは極めて低い**

#### 代替案の検討

**案1: 個別サブドメインを明示的に指定**
```
img-src 'self' data: 
  https://a.tile.openstreetmap.org 
  https://b.tile.openstreetmap.org 
  https://c.tile.openstreetmap.org
  https://a.tile.openstreetmap.fr
  https://b.tile.openstreetmap.fr
  https://c.tile.openstreetmap.fr
```

**メリット:**
- 最小権限の原則に最も忠実
- 許可するドメインが明確

**デメリット:**
- CSPヘッダーが長くなる
- 将来的にサブドメインが追加された場合、手動で更新が必要
- 保守性が低い

**案2: ワイルドカードを使用（推奨）**
```
img-src 'self' data: 
  https://*.tile.openstreetmap.org 
  https://*.tile.openstreetmap.fr
```

**メリット:**
- 簡潔で読みやすい
- 保守性が高い
- OpenStreetMapの仕様変更に対応しやすい

**デメリット:**
- 理論上のセキュリティリスク（実際のリスクは極めて低い）

**選択: 案2（ワイルドカード）を採用**

理由:
- OpenStreetMapは信頼できるプロバイダー
- 保守性とセキュリティのバランスが最適
- 実際のセキュリティリスクは極めて低い

### 3. コメントの更新

#### 現在のコメント

```
# - img-src 'self' data: https://tile.openstreetmap.org https://tile.openstreetmap.fr: 画像は同一オリジン + data:スキーム + OpenStreetMap地図タイル
```

#### 修正後のコメント

```
# - img-src 'self' data: https://*.tile.openstreetmap.org https://*.tile.openstreetmap.fr: 画像は同一オリジン + data:スキーム + OpenStreetMap地図タイル（負荷分散用サブドメイン a, b, c を含む）
```

## データモデル

このタスクはHTTPヘッダー設定の変更のみで、データモデルの変更はありません。

## エラーハンドリング

### CSP違反の検出

**修正前:**
```javascript
// ブラウザコンソールに表示されるエラー（複数回）
Loading the image 'https://a.tile.openstreetmap.org/13/7234/3245.png' 
violates the following Content Security Policy directive: 
"img-src 'self' data: https://tile.openstreetmap.org https://tile.openstreetmap.fr".

[MapController] エラー #1: Object
[MapController] エラー #2: Object
[MapController] エラー #3: Object
...
```

**修正後:**
```javascript
// エラーなし、正常に読み込まれる
[MapController] バス停マーカーを表示しました (有効: 2549, 無効: 0, 読み込み時間: 851.30ms)
```

### 既存のエラーハンドリング機能

map-controller.jsには既にタイル読み込みエラーのハンドリング機能が実装されています：

```javascript
// タイル読み込みエラーイベントを監視
currentTileLayer.on('tileerror', (error) => {
  tileLoadErrorCount++;
  
  this.logError('地図タイルの読み込みに失敗しました', {
    message: error.error ? error.error.message : 'Unknown error',
    // ...
  });
  
  // 一定回数エラーが発生したら代替タイルサーバーに切り替え
  if (tileLoadErrorCount >= 5 && currentTileLayer._url === primaryTileUrl) {
    // フォールバック処理
  }
});
```

CSP修正後は、このエラーハンドリングが正常に機能し、必要に応じて代替タイルサーバーへの切り替えが行われます。

## テスト戦略

### 1. 手動テスト

#### テストケース1: CSP違反エラーの解消

**修正前の確認:**
- **前提条件**: 修正前の_headersファイルがデプロイされている
- **手順**:
  1. ブラウザでアプリケーションを開く
  2. デベロッパーツールのコンソールを確認
- **期待結果**: CSP違反エラーが複数回表示される

**修正後の確認:**
- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. ブラウザでアプリケーションを開く
  2. デベロッパーツールのコンソールを確認
- **期待結果**: CSP違反エラーが表示されない

#### テストケース2: 地図タイルの表示確認

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. アプリケーションを開く
  2. 地図が正常に表示されることを確認
  3. 地図をズームイン/ズームアウトして、全てのズームレベルでタイルが表示されることを確認
  4. 地図をドラッグして、新しいタイルが正常に読み込まれることを確認
- **期待結果**: 全てのズームレベルと位置で地図タイルが正常に表示される

#### テストケース3: バス停マーカーの表示確認

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. アプリケーションを開く
  2. 地図上にバス停マーカーが表示されることを確認
  3. コンソールログで「バス停マーカーを表示しました (有効: 2549, ...）」が表示されることを確認
- **期待結果**: 2549個のバス停マーカーが正常に表示される

#### テストケース4: 既存機能の動作確認

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. バス停検索が正常に動作することを確認
  2. 時刻表検索が正常に動作することを確認
  3. 経路表示が正常に動作することを確認
- **期待結果**: 全ての機能が正常に動作する

### 2. ネットワークテスト

#### テストケース5: タイル読み込みの確認

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. デベロッパーツールのネットワークタブを開く
  2. アプリケーションを開く
  3. 地図タイルのリクエストを確認
- **期待結果**:
  - `a.tile.openstreetmap.org`、`b.tile.openstreetmap.org`、`c.tile.openstreetmap.org`からのリクエストが成功（HTTPステータス200）
  - CSPエラーが発生しない

### 3. セキュリティテスト

#### テストケース6: 不正な画像のブロック

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. デベロッパーツールのコンソールで以下を実行:
     ```javascript
     const img = document.createElement('img');
     img.src = 'https://evil.example.com/malicious.png';
     document.body.appendChild(img);
     ```
  2. コンソールを確認
- **期待結果**: CSP違反エラーが表示され、画像がブロックされる

#### テストケース7: OpenStreetMap以外のタイルサーバーのブロック

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. デベロッパーツールのコンソールで以下を実行:
     ```javascript
     const img = document.createElement('img');
     img.src = 'https://tile.example.com/13/7234/3245.png';
     document.body.appendChild(img);
     ```
  2. コンソールを確認
- **期待結果**: CSP違反エラーが表示され、画像がブロックされる

### 4. パフォーマンステスト

#### テストケース8: 読み込み速度の確認

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. アプリケーションを開く
  2. コンソールログで読み込み時間を確認
- **期待結果**:
  - データ読み込み: 約1000ms
  - バス停マーカー表示: 約850ms
  - 合計: 約2秒以内

## 実装の優先順位

1. **高優先度**: _headersファイルのCSP設定修正
2. **高優先度**: 動作確認（CSPエラーの解消）
3. **中優先度**: 全機能の動作確認
4. **低優先度**: パフォーマンステスト

## 設計上の決定事項

### 決定1: ワイルドカードを使用する

**理由:**
- OpenStreetMapの負荷分散サブドメイン（a, b, c）を全て許可
- 保守性が高い
- 将来的な仕様変更に対応しやすい

**代替案:**
- 個別サブドメインを明示的に指定する

**選択理由:**
- OpenStreetMapは信頼できるプロバイダー
- 実際のセキュリティリスクは極めて低い
- 保守性とセキュリティのバランスが最適

### 決定2: 代替タイルサーバーも同様に修正する

**理由:**
- `tile.openstreetmap.fr`も同様にサブドメインを使用する可能性がある
- 一貫性を保つ
- 将来的なフォールバック機能の正常動作を保証

**対象:**
- `https://tile.openstreetmap.fr` → `https://*.tile.openstreetmap.fr`

## 影響範囲

### 変更あり
- `_headers`ファイルのCSP設定

### 変更なし
- JavaScriptコード（map-controller.js等）
- HTMLファイル
- CSSファイル
- その他の設定ファイル

## 参考資料

- [Content Security Policy (CSP) - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP: img-src - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/img-src)
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/platform/headers/)
