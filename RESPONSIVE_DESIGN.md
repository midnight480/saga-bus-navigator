# レスポンシブデザイン実装ドキュメント

## 概要

佐賀バスナビは、Mobile Firstアプローチで設計されたレスポンシブWebアプリケーションです。
スマートフォン、タブレット、デスクトップの各デバイスで最適な表示を提供します。

## ブレークポイント

### モバイル（デフォルト）
- **対象範囲**: 〜767px
- **レイアウト**: 1カラム、縦スクロール
- **特徴**:
  - フルスクリーン表示
  - 検索フォームと結果が縦に配置
  - タップしやすい大きなボタン（最小44x44px）

### タブレット
- **対象範囲**: 768px〜1023px
- **レイアウト**: 2カラムグリッド
- **特徴**:
  - 検索フォームと結果を横並びで表示
  - 検索フォームは上部に固定（sticky）
  - ラジオボタンを2列グリッドで表示

### デスクトップ
- **対象範囲**: 1024px〜
- **レイアウト**: 2カラム（検索400px + 結果可変）
- **特徴**:
  - 最大幅1400pxで中央配置
  - 検索フォームは固定幅400px
  - ラジオボタンを3列グリッドで表示
  - マウスホバー効果

## ビューポート設定

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
```

- `width=device-width`: デバイスの画面幅に合わせる
- `initial-scale=1.0`: 初期ズーム倍率を100%に設定
- `maximum-scale=5.0`: 最大5倍までピンチズーム可能（アクセシビリティ対応）

## タップターゲットサイズ

全てのインタラクティブ要素は、WCAGガイドラインに従い最小44x44pxのタップターゲットを持ちます。

### 対象要素
- ボタン（`.btn`）: `min-height: 44px`, `min-width: 44px`
- ラジオボタンラベル（`.radio-label`）: `min-height: 44px`
- バス停候補リスト（`.suggestion-item`）: `min-height: 44px`
- リトライボタン（`.retry-button`）: `min-height: 44px`

## レスポンシブグリッドレイアウト

### モバイル
```css
.main {
  flex-direction: column;
  padding: 1rem;
}
```

### タブレット（768px+）
```css
.main {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  padding: 2rem;
}
```

### デスクトップ（1024px+）
```css
.main {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 3rem;
  padding: 2rem 3rem;
}
```

## テスト方法

### ブラウザ開発者ツール
1. ブラウザの開発者ツールを開く（F12）
2. デバイスツールバーを有効化（Ctrl+Shift+M / Cmd+Shift+M）
3. 以下のデバイスでテスト:
   - iPhone SE (375x667)
   - iPhone 14 Pro (393x852)
   - iPad (768x1024)
   - Desktop (1920x1080)

### 確認項目
- [ ] モバイル: 1カラムレイアウト、縦スクロール
- [ ] タブレット: 2カラムレイアウト、検索フォームが固定
- [ ] デスクトップ: 検索フォーム400px、結果エリア可変幅
- [ ] 全てのボタンが44x44px以上
- [ ] ピンチズームが5倍まで可能
- [ ] テキストが読みやすいサイズ
- [ ] タップターゲットが十分な間隔で配置

## アクセシビリティ対応

### フォーカス表示
```css
*:focus-visible {
  outline: 3px solid #0066cc;
  outline-offset: 2px;
}
```

### ハイコントラストモード
```css
@media (prefers-contrast: high) {
  .btn-primary {
    border: 2px solid currentColor;
  }
}
```

### モーション削減
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## パフォーマンス最適化

- CSS Grid/Flexboxを使用した効率的なレイアウト
- メディアクエリによる段階的な機能強化
- 不要なJavaScriptの削減（純粋なCSSレスポンシブ）

## ブラウザ互換性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Chrome Android 90+

## 参考資料

- [WCAG 2.1 - Target Size](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [MDN - Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- [CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
