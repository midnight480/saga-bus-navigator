# 設計書

## 概要

佐賀バスナビのフッターに「使い方」「お問い合わせ」ページを追加する機能の設計書。モーダルウィンドウを使用してページ遷移なしでコンテンツを表示し、ユーザー体験を向上させる。

## アーキテクチャ

### コンポーネント構成

```
index.html
├── フッターリンク（既存）
│   ├── 使い方リンク
│   └── お問い合わせリンク
├── 使い方モーダル（新規）
│   ├── モーダルヘッダー
│   ├── タブナビゲーション
│   │   ├── 使い方タブ
│   │   ├── 謝辞タブ
│   │   └── 利用規約タブ
│   └── タブコンテンツ
└── お問い合わせモーダル（新規）
    ├── モーダルヘッダー
    └── Google Form埋め込み
```

### ファイル構成

```
saga-bus-navigator/
├── index.html                    # モーダルHTML追加
├── css/
│   └── footer-pages.css         # 新規：フッターページ専用CSS
└── js/
    └── footer-pages.js          # 新規：フッターページ制御JS
```

## コンポーネントと インターフェース

### 1. HTMLマークアップ

#### 使い方モーダル

```html
<div id="usage-modal" class="footer-modal" role="dialog" aria-labelledby="usage-modal-title" aria-modal="true" hidden>
  <div class="footer-modal-overlay"></div>
  <div class="footer-modal-content">
    <div class="footer-modal-header">
      <h2 id="usage-modal-title" class="footer-modal-title">佐賀バスナビ</h2>
      <button type="button" class="footer-modal-close" aria-label="閉じる">×</button>
    </div>
    
    <div class="footer-modal-tabs">
      <button type="button" class="footer-tab-button active" data-tab="usage" role="tab" aria-selected="true">
        使い方
      </button>
      <button type="button" class="footer-tab-button" data-tab="acknowledgments" role="tab" aria-selected="false">
        謝辞
      </button>
      <button type="button" class="footer-tab-button" data-tab="terms" role="tab" aria-selected="false">
        利用規約
      </button>
    </div>
    
    <div class="footer-modal-body">
      <!-- 使い方タブ -->
      <div id="usage-tab" class="footer-tab-content active" role="tabpanel">
        <!-- コンテンツ -->
      </div>
      
      <!-- 謝辞タブ -->
      <div id="acknowledgments-tab" class="footer-tab-content" role="tabpanel" hidden>
        <!-- コンテンツ -->
      </div>
      
      <!-- 利用規約タブ -->
      <div id="terms-tab" class="footer-tab-content" role="tabpanel" hidden>
        <!-- コンテンツ -->
      </div>
    </div>
  </div>
</div>
```

#### お問い合わせモーダル

```html
<div id="contact-modal" class="footer-modal" role="dialog" aria-labelledby="contact-modal-title" aria-modal="true" hidden>
  <div class="footer-modal-overlay"></div>
  <div class="footer-modal-content">
    <div class="footer-modal-header">
      <h2 id="contact-modal-title" class="footer-modal-title">お問い合わせ</h2>
      <button type="button" class="footer-modal-close" aria-label="閉じる">×</button>
    </div>
    
    <div class="footer-modal-body">
      <iframe 
        src="https://docs.google.com/forms/d/e/1FAIpQLSew5RP-DNfGSjRIQvglb74sCw5t-Cg3xMWen3pjnkuTcXtV5g/viewform?embedded=true"
        width="100%"
        height="600"
        frameborder="0"
        marginheight="0"
        marginwidth="0"
        title="お問い合わせフォーム"
        loading="lazy">
        読み込んでいます…
      </iframe>
    </div>
  </div>
</div>
```

### 2. CSSスタイル設計

#### レイアウト構造

```css
/* モーダルオーバーレイ */
.footer-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* 背景オーバーレイ */
.footer-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

/* モーダルコンテンツ */
.footer-modal-content {
  position: relative;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: modalSlideIn 0.3s ease-out;
}

/* アニメーション */
@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

#### タブナビゲーション

```css
.footer-modal-tabs {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background-color: #f8f9fa;
}

.footer-tab-button {
  flex: 1;
  padding: 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  color: #666;
}

.footer-tab-button:hover {
  background-color: #e9ecef;
  color: #333;
}

.footer-tab-button.active {
  color: #0066cc;
  border-bottom-color: #0066cc;
  background-color: white;
}
```

#### レスポンシブデザイン

```css
/* モバイル（768px未満）：全画面表示 */
@media (max-width: 767px) {
  .footer-modal {
    padding: 0;
  }
  
  .footer-modal-content {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .footer-modal-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .footer-tab-button {
    flex: 0 0 auto;
    min-width: 100px;
    padding: 0.875rem 1rem;
    font-size: 0.875rem;
  }
}

/* タブレット・PC（768px以上） */
@media (min-width: 768px) {
  .footer-modal-content {
    max-width: 800px;
  }
}
```

### 3. JavaScript制御

#### モジュール構造

```javascript
// footer-pages.js

class FooterPagesController {
  constructor() {
    this.usageModal = null;
    this.contactModal = null;
    this.activeTab = 'usage';
    this.previousFocus = null;
    this.init();
  }
  
  init() {
    this.cacheElements();
    this.attachEventListeners();
  }
  
  cacheElements() {
    // モーダル要素
    this.usageModal = document.getElementById('usage-modal');
    this.contactModal = document.getElementById('contact-modal');
    
    // リンク要素
    this.usageLink = document.querySelector('a[href="#usage"]');
    this.contactLink = document.querySelector('a[href="#contact"]');
  }
  
  attachEventListeners() {
    // リンククリック
    this.usageLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openUsageModal();
    });
    
    this.contactLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openContactModal();
    });
    
    // モーダル閉じる
    this.attachCloseListeners(this.usageModal);
    this.attachCloseListeners(this.contactModal);
    
    // タブ切り替え
    this.attachTabListeners();
  }
  
  openUsageModal() {
    this.openModal(this.usageModal);
  }
  
  openContactModal() {
    this.openModal(this.contactModal);
  }
  
  openModal(modal) {
    if (!modal) return;
    
    // 現在のフォーカスを保存
    this.previousFocus = document.activeElement;
    
    // モーダル表示
    modal.removeAttribute('hidden');
    
    // body スクロール無効化
    document.body.style.overflow = 'hidden';
    
    // フォーカス移動
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.focus();
    
    // フォーカストラップ設定
    this.setupFocusTrap(modal);
  }
  
  closeModal(modal) {
    if (!modal) return;
    
    // モーダル非表示
    modal.setAttribute('hidden', '');
    
    // body スクロール有効化
    document.body.style.overflow = '';
    
    // フォーカスを戻す
    this.previousFocus?.focus();
    this.previousFocus = null;
  }
  
  attachCloseListeners(modal) {
    if (!modal) return;
    
    // 閉じるボタン
    const closeButton = modal.querySelector('.footer-modal-close');
    closeButton?.addEventListener('click', () => this.closeModal(modal));
    
    // オーバーレイクリック
    const overlay = modal.querySelector('.footer-modal-overlay');
    overlay?.addEventListener('click', () => this.closeModal(modal));
    
    // ESCキー
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal(modal);
      }
    });
  }
  
  attachTabListeners() {
    const tabButtons = document.querySelectorAll('.footer-tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }
  
  switchTab(tabName) {
    // ボタンの状態更新
    const tabButtons = document.querySelectorAll('.footer-tab-button');
    tabButtons.forEach(button => {
      const isActive = button.dataset.tab === tabName;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive);
    });
    
    // コンテンツの表示切り替え
    const tabContents = document.querySelectorAll('.footer-tab-content');
    tabContents.forEach(content => {
      const isActive = content.id === `${tabName}-tab`;
      content.classList.toggle('active', isActive);
      
      if (isActive) {
        content.removeAttribute('hidden');
      } else {
        content.setAttribute('hidden', '');
      }
    });
    
    this.activeTab = tabName;
  }
  
  setupFocusTrap(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    });
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  new FooterPagesController();
});
```

## データモデル

### コンテンツデータ

#### 使い方コンテンツ

```javascript
const usageContent = {
  sections: [
    {
      title: 'バス停の検索',
      items: [
        {
          subtitle: 'テキスト入力で検索',
          description: 'バス停名を入力すると、候補が表示されます。1文字以上入力すると自動的に候補が絞り込まれます。'
        },
        {
          subtitle: '地図から選択',
          description: '「地図から選択」ボタンをクリックすると、地図上でバス停を選択できます。'
        }
      ]
    },
    {
      title: '時刻表の検索',
      items: [
        {
          subtitle: '出発時刻指定',
          description: '指定した時刻以降に出発するバスを検索します。'
        },
        {
          subtitle: '到着時刻指定',
          description: '指定した時刻までに到着するバスを検索します。'
        },
        {
          subtitle: '今すぐ',
          description: '現在時刻から最も近いバスを検索します。'
        },
        {
          subtitle: '始発',
          description: 'その日の最初のバスを検索します。'
        },
        {
          subtitle: '終電',
          description: 'その日の最後のバスを検索します。'
        }
      ]
    }
  ]
};
```

#### 謝辞コンテンツ

```javascript
const acknowledgmentsContent = {
  title: 'データ提供元への謝辞',
  description: 'このアプリケーションは、佐賀県が提供するオープンデータを利用しています。',
  sources: [
    {
      name: '佐賀県バス情報',
      url: 'https://www.sagabus.info/home',
      description: '佐賀県内のバス情報を提供'
    },
    {
      name: 'オープンデータポータル',
      url: 'http://opendata.sagabus.info/',
      description: 'GTFS形式のバスデータを公開'
    }
  ],
  note: 'GTFS（General Transit Feed Specification）形式のデータを利用して、リアルタイムなバス情報を提供しています。'
};
```

#### 利用規約コンテンツ

```javascript
const termsContent = {
  sections: [
    {
      title: 'サービスの提供範囲',
      content: '本サービスは佐賀県内の路線バス情報を提供します。情報は予告なく変更される場合があります。'
    },
    {
      title: 'データの正確性',
      content: '本サービスで提供する情報は、オープンデータを基にしていますが、その正確性、完全性、有用性について保証するものではありません。'
    },
    {
      title: '位置情報の取り扱い',
      content: '現在地機能を使用する際に位置情報を取得しますが、サーバーへの送信や保存は行いません。位置情報はブラウザ内での利用に限定されます。'
    },
    {
      title: '個人情報の取り扱い',
      content: '本サービスは個人を特定する情報を取得・保存しません。'
    }
  ]
};
```

## エラーハンドリング

### エラーケース

1. **モーダル要素が見つからない**
   - コンソールに警告を出力
   - 機能を無効化

2. **Google Form読み込み失敗**
   - iframeのエラーメッセージを表示
   - 代替テキストを提供

3. **フォーカストラップ失敗**
   - 基本的なモーダル機能は維持
   - アクセシビリティは低下するが使用可能

### エラーメッセージ

```javascript
const ERROR_MESSAGES = {
  MODAL_NOT_FOUND: 'モーダル要素が見つかりません',
  FORM_LOAD_ERROR: 'フォームの読み込みに失敗しました',
  FOCUS_TRAP_ERROR: 'フォーカス管理でエラーが発生しました'
};
```

## テスト戦略

### 単体テスト

1. **モーダル開閉テスト**
   - モーダルが正しく開く
   - モーダルが正しく閉じる
   - body のスクロールが制御される

2. **タブ切り替えテスト**
   - タブが正しく切り替わる
   - ARIA属性が正しく更新される

3. **フォーカス管理テスト**
   - モーダルを開いたときにフォーカスが移動する
   - モーダルを閉じたときにフォーカスが戻る
   - フォーカストラップが機能する

### E2Eテスト

1. **使い方ページ表示テスト**
   - フッターリンクをクリックしてモーダルが開く
   - 各タブが正しく表示される
   - 閉じるボタンで閉じる

2. **お問い合わせページ表示テスト**
   - フッターリンクをクリックしてモーダルが開く
   - Google Formが正しく表示される

3. **アクセシビリティテスト**
   - キーボードナビゲーションが機能する
   - スクリーンリーダーで読み上げ可能

4. **レスポンシブテスト**
   - モバイルで全画面表示される
   - タブレット・PCで中央配置される

## パフォーマンス最適化

### 最適化戦略

1. **コンテンツの事前読み込み**
   - HTMLに直接埋め込み（外部ファイル読み込みなし）
   - 初回表示を高速化

2. **CSS アニメーション**
   - GPU アクセラレーションを使用（transform, opacity）
   - スムーズな表示・非表示

3. **遅延読み込み**
   - Google Form の iframe に `loading="lazy"` 属性
   - 初回ページ読み込みを軽量化

4. **イベントリスナーの最適化**
   - イベント委譲を使用
   - メモリリークを防止

### パフォーマンス目標

- モーダル表示開始: 100ms以内
- タブ切り替え: 50ms以内
- アニメーション: 60fps維持

## セキュリティ考慮事項

### CSP（Content Security Policy）対応

```
Content-Security-Policy:
  default-src 'self';
  frame-src https://docs.google.com;
  style-src 'self' 'unsafe-inline';
  script-src 'self';
```

### XSS対策

- ユーザー入力は受け付けない（静的コンテンツのみ）
- Google Form は iframe でサンドボックス化

### プライバシー保護

- 位置情報はブラウザ内のみで使用
- サーバーへのデータ送信なし
- Cookie不使用

## デプロイメント

### ファイル配置

```
/
├── index.html              # モーダルHTML追加
├── css/
│   ├── app.css            # 既存
│   └── footer-pages.css   # 新規
└── js/
    ├── app.js             # 既存
    └── footer-pages.js    # 新規
```

### 読み込み順序

```html
<!-- CSS -->
<link rel="stylesheet" href="/css/app.css">
<link rel="stylesheet" href="/css/footer-pages.css">

<!-- JavaScript -->
<script src="/js/app.js"></script>
<script src="/js/footer-pages.js"></script>
```

### キャッシュ戦略

- CSS/JS ファイルはブラウザキャッシュ（1週間）
- HTML は常に最新版を取得
- Service Worker でオフライン対応

## 将来の拡張性

### 拡張可能な設計

1. **多言語対応**
   - コンテンツを JSON で管理
   - 言語切り替え機能の追加

2. **FAQ セクション追加**
   - アコーディオン形式で表示
   - 検索機能の追加

3. **動画チュートリアル**
   - 使い方タブに動画埋め込み
   - YouTube iframe 対応

4. **フィードバック機能**
   - 各ページに「役に立ちましたか？」ボタン
   - 匿名フィードバック収集
