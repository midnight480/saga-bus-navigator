/**
 * LoadingScreenController
 * ローディング画面の表示・非表示、進捗メッセージの更新、エラー表示、タイムアウト処理を制御
 */
class LoadingScreenController {
  constructor() {
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingMessage = null;
    this.loadingError = null;
    this.errorMessage = null;
    this.retryButton = null;
    
    this.timeoutId = null;
    this.warningTimeoutId = null;
    this.startTime = null;
    
    // DOM要素の初期化は遅延実行（テスト時にモック可能にするため）
    this._initializeElements();
  }
  
  _initializeElements() {
    if (this.loadingScreen) {
      this.loadingMessage = this.loadingScreen.querySelector('.loading-message');
      this.loadingError = this.loadingScreen.querySelector('.loading-error');
      if (this.loadingError) {
        this.errorMessage = this.loadingError.querySelector('.error-message');
        this.retryButton = this.loadingError.querySelector('.retry-button');
      }
    }
  }
  
  /**
   * ローディング画面を表示（スケルトン型）
   */
  show() {
    if (!this.loadingScreen) return;
    
    // スケルトンローディングではblock表示
    this.loadingScreen.style.display = 'block';
    this.loadingScreen.classList.remove('fade-out');
    
    if (this.loadingError) {
      this.loadingError.setAttribute('hidden', '');
    }
    
    // 初期メッセージを設定
    if (this.loadingMessage) {
      this.loadingMessage.textContent = 'データを読み込んでいます...';
    }
    
    this.startTime = Date.now();
    
    // フォーカストラップを有効化
    this._enableFocusTrap();
  }
  
  /**
   * ローディング画面を非表示（フェードアウトアニメーション付き）
   */
  hide() {
    if (!this.loadingScreen) return;
    
    this.loadingScreen.classList.add('fade-out');
    
    // フォーカストラップを無効化
    this._disableFocusTrap();
    
    // フェードアウトアニメーション完了後に非表示
    setTimeout(() => {
      if (this.loadingScreen) {
        this.loadingScreen.style.display = 'none';
      }
    }, 300); // CSSのtransition時間と一致
  }
  
  /**
   * 進捗メッセージを更新
   * @param {string} message - 表示するメッセージ
   */
  updateProgress(message) {
    if (this.loadingMessage) {
      this.loadingMessage.textContent = message;
    }
  }
  
  /**
   * エラーメッセージを表示
   * @param {string} message - エラーメッセージ
   * @param {Function} retryCallback - リトライボタンクリック時のコールバック
   */
  showError(message, retryCallback) {
    if (this.loadingMessage) {
      this.loadingMessage.textContent = '';
    }
    
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
    }
    
    if (this.loadingError) {
      this.loadingError.removeAttribute('hidden');
    }
    
    // リトライボタンのイベントリスナー
    if (this.retryButton && retryCallback) {
      this.retryButton.onclick = () => {
        if (this.loadingError) {
          this.loadingError.setAttribute('hidden', '');
        }
        this.show();
        retryCallback();
      };
      
      // キーボードフォーカスをリトライボタンに移動
      // 短い遅延を入れてDOMの更新を待つ
      setTimeout(() => {
        if (this.retryButton) {
          this.retryButton.focus();
        }
      }, 100);
    }
  }
  
  /**
   * タイムアウトタイマーを開始
   * @param {number} warningDuration - 警告表示までの時間（ミリ秒）
   * @param {Function} warningCallback - 警告時のコールバック
   */
  startTimeout(warningDuration, warningCallback) {
    // 既存のタイマーをクリア
    this.clearTimeout();
    
    // 30秒警告タイマー
    this.warningTimeoutId = setTimeout(() => {
      if (warningCallback) {
        warningCallback();
      }
    }, warningDuration);
    
    // 60秒エラータイマー
    this.timeoutId = setTimeout(() => {
      this.showError(
        'データの読み込みがタイムアウトしました。再試行してください。',
        () => {
          // リトライ時は親コンテキストから再実行される
          // このコールバックは空でOK（showErrorの第2引数が必要なため）
        }
      );
    }, warningDuration * 2);
  }
  
  /**
   * タイムアウトタイマーをクリア
   */
  clearTimeout() {
    if (this.warningTimeoutId) {
      clearTimeout(this.warningTimeoutId);
      this.warningTimeoutId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
  
  /**
   * フォーカストラップを有効化
   * ローディング画面が表示されている間、フォーカスがローディング画面内に留まるようにする
   * @private
   */
  _enableFocusTrap() {
    if (!this.loadingScreen) return;
    
    // フォーカス可能な要素を取得
    this._focusableElements = this.loadingScreen.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    
    // フォーカストラップのイベントリスナーを追加
    this._handleFocusTrap = (e) => {
      if (e.key !== 'Tab') return;
      
      const focusableArray = Array.from(this._focusableElements);
      const firstFocusable = focusableArray[0];
      const lastFocusable = focusableArray[focusableArray.length - 1];
      
      // フォーカス可能な要素がない場合は何もしない
      if (focusableArray.length === 0) {
        e.preventDefault();
        return;
      }
      
      // Shift + Tab: 最初の要素から最後の要素へ
      if (e.shiftKey && document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
      // Tab: 最後の要素から最初の要素へ
      else if (!e.shiftKey && document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    };
    
    document.addEventListener('keydown', this._handleFocusTrap);
  }
  
  /**
   * フォーカストラップを無効化
   * @private
   */
  _disableFocusTrap() {
    if (this._handleFocusTrap) {
      document.removeEventListener('keydown', this._handleFocusTrap);
      this._handleFocusTrap = null;
    }
    this._focusableElements = null;
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LoadingScreenController;
}
