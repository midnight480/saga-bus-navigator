/**
 * フッターページコントローラー
 * 使い方モーダルとお問い合わせモーダルを管理
 */
class FooterPagesController {
  constructor() {
    this.usageModal = null;
    this.contactModal = null;
    this.activeTab = 'usage';
    this.previousFocus = null;
    this.translationManager = null;
    this.init();
    this.setupTranslationManager();
  }
  
  /**
   * TranslationManagerの参照を取得
   */
  setupTranslationManager() {
    // グローバルスコープからTranslationManagerを取得
    const tryGetTranslationManager = () => {
      if (typeof window !== 'undefined' && window.uiController && window.uiController.translationManager) {
        this.translationManager = window.uiController.translationManager;
        return true;
      } else if (typeof window !== 'undefined' && window.translationManager) {
        this.translationManager = window.translationManager;
        return true;
      }
      return false;
    };
    
    // 即座に試行
    if (!tryGetTranslationManager()) {
      // uiControllerがまだ初期化されていない場合、少し待ってから再試行
      let retryCount = 0;
      const maxRetries = 50; // 最大5秒待機（100ms × 50回）
      const checkInterval = setInterval(() => {
        if (tryGetTranslationManager() || retryCount >= maxRetries) {
          clearInterval(checkInterval);
        }
        retryCount++;
      }, 100);
    }
    
    // 言語変更イベントをリッスン
    if (typeof window !== 'undefined') {
      window.addEventListener('languageChanged', () => {
        this.updateModalTranslations();
      });
    }
  }
  
  /**
   * モーダル内の翻訳を更新
   */
  updateModalTranslations() {
    if (!this.translationManager) return;
    
    // 開いているモーダル内の翻訳を更新
    if (this.usageModal && !this.usageModal.hasAttribute('hidden')) {
      this.translationManager.updateDOMTranslations();
    }
    if (this.contactModal && !this.contactModal.hasAttribute('hidden')) {
      this.translationManager.updateDOMTranslations();
    }
  }

  /**
   * 初期化処理
   */
  init() {
    this.cacheElements();
    this.attachEventListeners();
  }

  /**
   * DOM要素をキャッシュ
   */
  cacheElements() {
    // モーダル要素
    this.usageModal = document.getElementById('usage-modal');
    this.contactModal = document.getElementById('contact-modal');
    
    // リンク要素
    this.usageLink = document.querySelector('a[href="#usage"]');
    this.contactLink = document.querySelector('a[href="#contact"]');
    
    if (!this.usageModal || !this.contactModal) {
      console.warn('モーダル要素が見つかりません');
    }
  }

  /**
   * 使い方モーダルを開く
   */
  openUsageModal() {
    this.openModal(this.usageModal);
  }

  /**
   * お問い合わせモーダルを開く
   */
  openContactModal() {
    this.openModal(this.contactModal);
  }

  /**
   * モーダルを開く
   * @param {HTMLElement} modal - 開くモーダル要素
   */
  openModal(modal) {
    if (!modal) return;
    
    // 現在のフォーカスを保存
    this.previousFocus = document.activeElement;
    
    // モーダル表示
    modal.removeAttribute('hidden');
    
    // 翻訳を更新（モーダルが表示された後に実行）
    if (this.translationManager) {
      // 少し遅延させて、DOMが完全に表示された後に翻訳を適用
      setTimeout(() => {
        this.translationManager.updateDOMTranslations();
      }, 0);
    }
    
    // bodyのスクロール無効化
    document.body.style.overflow = 'hidden';
    
    // フォーカス移動
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // フォーカストラップ設定
    this.setupFocusTrap(modal);
  }

  /**
   * モーダルを閉じる
   * @param {HTMLElement} modal - 閉じるモーダル要素
   */
  closeModal(modal) {
    if (!modal) return;
    
    // モーダル非表示
    modal.setAttribute('hidden', '');
    
    // bodyのスクロール有効化
    document.body.style.overflow = '';
    
    // フォーカスを戻す
    if (this.previousFocus) {
      this.previousFocus.focus();
      this.previousFocus = null;
    }
  }

  /**
   * タブを切り替える
   * @param {string} tabName - 切り替え先のタブ名
   */
  switchTab(tabName) {
    // ボタンの状態更新
    const tabButtons = document.querySelectorAll('.footer-tab-button');
    tabButtons.forEach(button => {
      const isActive = button.dataset.tab === tabName;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', isActive.toString());
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

  /**
   * フォーカストラップを設定
   * @param {HTMLElement} modal - モーダル要素
   */
  setupFocusTrap(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // 既存のリスナーを削除するため、新しいハンドラーを作成
    const handleKeyDown = (e) => {
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
    };
    
    // モーダルにイベントリスナーを追加
    modal.addEventListener('keydown', handleKeyDown);
  }

  /**
   * イベントリスナーを設定
   */
  attachEventListeners() {
    // フッターリンククリック
    if (this.usageLink) {
      this.usageLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openUsageModal();
      });
    }
    
    if (this.contactLink) {
      this.contactLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.openContactModal();
      });
    }
    
    // モーダル閉じる処理
    this.attachCloseListeners(this.usageModal);
    this.attachCloseListeners(this.contactModal);
    
    // タブ切り替え
    this.attachTabListeners();
  }

  /**
   * モーダルの閉じるイベントリスナーを設定
   * @param {HTMLElement} modal - モーダル要素
   */
  attachCloseListeners(modal) {
    if (!modal) return;
    
    // 閉じるボタン
    const closeButton = modal.querySelector('.footer-modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.closeModal(modal));
    }
    
    // オーバーレイクリック
    const overlay = modal.querySelector('.footer-modal-overlay');
    if (overlay) {
      overlay.addEventListener('click', () => this.closeModal(modal));
    }
    
    // ESCキー
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal(modal);
      }
    });
  }

  /**
   * タブのイベントリスナーを設定
   */
  attachTabListeners() {
    const tabButtons = document.querySelectorAll('.footer-tab-button');
    
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        this.switchTab(tabName);
      });
    });
  }
}


// 初期化
document.addEventListener('DOMContentLoaded', () => {
  new FooterPagesController();
});
