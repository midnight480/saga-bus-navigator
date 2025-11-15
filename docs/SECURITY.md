# セキュリティ対策ドキュメント

## 実装済みのセキュリティ対策

### 1. セキュリティヘッダー設定（_headersファイル）

Cloudflare Pages用のセキュリティヘッダーを設定しました。

#### Content Security Policy (CSP)
- `default-src 'self'`: デフォルトは同一オリジンのみ許可
- `script-src 'self' https://static.cloudflareinsights.com`: スクリプトは同一オリジン + Cloudflare Insights許可
- `style-src 'self' 'unsafe-inline'`: スタイルは同一オリジン + インラインCSS許可
- `img-src 'self' data:`: 画像は同一オリジン + data:スキーム許可
- `connect-src 'self' https://ntp-a1.nict.go.jp https://holidays-jp.github.io`: 外部API接続許可
- `font-src 'self'`: フォントは同一オリジンのみ
- `object-src 'none'`: Flash等のプラグイン禁止
- `base-uri 'self'`: base要素は同一オリジンのみ
- `form-action 'self'`: フォーム送信は同一オリジンのみ
- `frame-ancestors 'none'`: iframe埋め込み禁止

#### その他のセキュリティヘッダー
- `X-Frame-Options: DENY`: iframe埋め込み禁止（クリックジャッキング対策）
- `X-Content-Type-Options: nosniff`: MIMEタイプスニッフィング防止
- `Referrer-Policy: strict-origin-when-cross-origin`: リファラー情報の送信を制限
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`: 不要な機能を無効化

### 2. XSS対策（DOM操作）

#### textContentとcreateElementの使用
すべてのDOM操作で`textContent`または`createElement`を使用し、`innerHTML`の使用を禁止しています。

**実装箇所:**
- `js/app.js` - UIController.displaySuggestions()
- `js/app.js` - UIController.createResultItem()
- `js/app.js` - UIController.displaySearchResults()
- `js/app.js` - UIController.displayError()

**例:**
```javascript
// NG: innerHTML使用
element.innerHTML = userInput;

// OK: textContent使用
element.textContent = userInput;

// OK: createElement使用
const li = document.createElement('li');
li.textContent = stopName;
```

### 3. 入力検証

#### バス停名の検証
バス停名が既存のバス停リストに存在するかチェックします。

**実装箇所:**
- `js/app.js` - UIController.validateBusStopName()
- `js/app.js` - UIController.selectBusStop()
- `js/app.js` - UIController.executeSearch()
- `js/app.js` - UIController.setupAutocomplete() (blurイベント)

**検証ロジック:**
```javascript
validateBusStopName(stopName) {
  return this.busStops.some(stop => stop.name === stopName);
}
```

#### 時刻の入力検証
時刻が0-23時、0-59分の範囲内かチェックします。

**実装箇所:**
- `js/app.js` - UIController.validateTimeInput()
- `js/app.js` - UIController.validateTime()
- `js/app.js` - UIController.executeSearch()

**検証ロジック:**
```javascript
validateTime(hour, minute) {
  // 数値チェック
  if (typeof hour !== 'number' || typeof minute !== 'number') {
    return false;
  }
  
  // NaNチェック
  if (isNaN(hour) || isNaN(minute)) {
    return false;
  }
  
  // 範囲チェック
  if (hour < 0 || hour > 23) {
    return false;
  }
  
  if (minute < 0 || minute > 59) {
    return false;
  }
  
  return true;
}
```

### 4. Cloudflare Insights（Web Analytics）

#### 概要
Cloudflare Pagesが提供するアクセス解析機能です。アプリケーションに自動的にスクリプトを挿入し、ユーザーの利用状況を収集します。

#### 現在の設定
Cloudflare Insightsは**有効**になっており、CSP設定で`https://static.cloudflareinsights.com`からのスクリプト読み込みを許可しています。

#### 選択肢1: Cloudflare Insightsを使用する（現在の設定）

**メリット:**
- アクセス解析データを取得できる
- ユーザーの利用状況を把握し、アプリケーション改善に活用できる
- Cloudflare Pagesとの統合が容易（追加設定不要）
- プライバシーに配慮した解析（Cloudflare公式サービス）
- 無料で利用可能

**デメリット:**
- 外部スクリプトの読み込みが発生する
- CSP設定に`https://static.cloudflareinsights.com`を追加する必要がある
- わずかなパフォーマンスオーバーヘッド（スクリプトサイズ: 約10KB）

**セキュリティ考慮事項:**
- Cloudflareは信頼できるプロバイダー
- HTTPS通信で暗号化
- 最小権限の原則に従い、特定ドメインのみ許可

#### 選択肢2: Cloudflare Insightsを無効化する

**メリット:**
- 外部スクリプトの読み込みがゼロになる
- CSP設定をより厳格に保てる
- わずかなパフォーマンス向上

**デメリット:**
- アクセス解析データが取得できない
- ユーザー行動の把握が困難
- アプリケーション改善の判断材料が減る

**無効化手順:**

1. **Cloudflare Dashboardにログイン**
   - https://dash.cloudflare.com/ にアクセス

2. **プロジェクト設定を開く**
   - Pages → 該当プロジェクト（saga-bus-navigator）を選択
   - Settings タブをクリック

3. **Web Analyticsを無効化**
   - "Web Analytics" セクションを探す
   - トグルスイッチをOFFにする
   - 変更を保存

4. **CSP設定を更新（オプション）**
   - `_headers`ファイルから`https://static.cloudflareinsights.com`を削除
   - より厳格なCSP設定に戻す
   ```
   Content-Security-Policy: default-src 'self'; script-src 'self'; ...
   ```

5. **動作確認**
   - ブラウザコンソールでCSP違反エラーが表示されないことを確認
   - アプリケーションが正常に動作することを確認

#### 推奨設定

**現在の設定（Cloudflare Insights有効）を推奨します。**

理由:
- アクセス解析はアプリケーション改善に有用
- セキュリティリスクは最小限（Cloudflare公式サービス）
- パフォーマンスへの影響は軽微
- プライバシーに配慮した解析が可能

ただし、以下の場合は無効化を検討してください:
- アクセス解析が不要な場合
- より厳格なセキュリティポリシーが必要な場合
- パフォーマンスを最優先する場合

### 5. HTTPS強制

Cloudflare Pagesは自動的にHTTPS対応し、HTTP → HTTPSの自動リダイレクトを行います。

### 6. CORS対策

- CSVファイルは同一オリジン（saga-bus.midnight480.com）から読み込み
- 外部API（NTP、祝日カレンダー）は読み取り専用で使用

### 7. 依存関係の脆弱性チェック

定期的に`npm audit`を実行して、依存関係の脆弱性をチェックします。

```bash
npm audit
npm audit fix
```

## セキュリティチェックリスト

- [x] textContent/createElementを使用（innerHTML禁止）
- [x] CSPヘッダー設定
- [x] Cloudflare Insights対応（CSP設定で許可）
- [x] HTTPS強制（Cloudflare Pages自動対応）
- [x] 入力検証実装（バス停名、時刻）
- [x] 外部APIは読み取り専用
- [x] 認証情報なし（APIキー不要）
- [x] X-Frame-Options設定
- [x] X-Content-Type-Options設定
- [x] Referrer-Policy設定
- [x] Permissions-Policy設定

## 脅威分析

### リスクが低い理由
- ユーザー入力: バス停選択のみ（自由入力は候補リストから選択）
- データベース: なし（CSV読み取り専用）
- 認証: なし（公開データのみ）
- サーバーサイド処理: なし（静的ファイルのみ）

### 実装済みの対策
1. **XSS対策**: textContent/createElementの使用
2. **CSP**: Content Security Policyヘッダー
3. **クリックジャッキング対策**: X-Frame-Options
4. **MIMEタイプスニッフィング防止**: X-Content-Type-Options
5. **入力検証**: バス停名、時刻の検証
6. **HTTPS強制**: Cloudflare Pages自動対応

## 今後の対策

### Phase 2以降で検討
- Subresource Integrity (SRI): 外部CDNを使用する場合
- Rate Limiting: API呼び出しの制限（必要に応じて）
- ログ監視: 異常なアクセスパターンの検出

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Content Security Policy (CSP)](https://developer.mozilla.org/ja/docs/Web/HTTP/CSP)
- [Cloudflare Pages Security](https://developers.cloudflare.com/pages/platform/headers/)
