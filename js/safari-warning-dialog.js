/**
 * Safari警告ダイアログモジュール
 * iPhone Safariユーザーに地図表示の不安定性を警告し、Chrome利用を推奨する
 */
class SafariWarningDialog {
  constructor() {
    this.storageKey = 'hideIphoneSafariWarning';
    this.dialogElement = null;
    this.checkboxElement = null;
    this.okButtonElement = null;
  }

  /**
   * ブラウザ判定: iPhone Safariかどうかを判定
   * @returns {boolean} iPhone Safariの場合true
   */
  isIphoneSafari() {
    const ua = navigator.userAgent;

    // iPhoneを含む
    const isIphone = /iPhone/.test(ua);

    // Safariを含む
    const isSafari = /Safari/.test(ua);

    // Chrome/CriOSを含まない（Chrome on iOSを除外）
    const isNotChrome = !/Chrome|CriOS/.test(ua);

    return isIphone && isSafari && isNotChrome;
  }

  /**
   * LocalStorageから警告表示設定を確認
   * @returns {boolean} 警告を表示すべき場合true
   */
  shouldShowWarning() {
    try {
      const hideWarning = localStorage.getItem(this.storageKey);
      return hideWarning !== 'true';
    } catch (error) {
      console.warn('LocalStorageの読み取りに失敗しました:', error);
      // エラー時は警告を表示する
      return true;
    }
  }

  /**
   * ユーザーの「今後表示しない」設定をLocalStorageに保存
   */
  saveHidePreference() {
    try {
      localStorage.setItem(this.storageKey, 'true');
    } catch (error) {
      console.warn('LocalStorageへの保存に失敗しました:', error);
      // エラーが発生しても処理は継続
    }
  }

  /**
   * 警告ダイアログのDOM要素を生成
   * @returns {HTMLElement} ダイアログのルート要素
   */
  createDialogElement() {
    const overlay = document.createElement('div');
    overlay.className = 'safari-warning-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'safari-warning-title');

    const dialog = document.createElement('div');
    dialog.className = 'safari-warning-dialog';

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'safari-warning-header';

    const icon = document.createElement('span');
    icon.className = 'safari-warning-icon';
    icon.textContent = '⚠️';

    const title = document.createElement('h2');
    title.id = 'safari-warning-title';
    title.className = 'safari-warning-title';
    title.textContent = '動作環境について';

    header.appendChild(icon);
    header.appendChild(title);

    // ボディ
    const body = document.createElement('div');
    body.className = 'safari-warning-body';

    const message = document.createElement('p');
    message.className = 'safari-warning-message';
    message.textContent = 'iPhone版Safariでは地図の読み込みが不安定な場合があります。';

    const recommendation = document.createElement('p');
    recommendation.className = 'safari-warning-recommendation';
    recommendation.textContent =
      '快適にご利用いただくため、Google Chromeでのアクセスを推奨します。';

    body.appendChild(message);
    body.appendChild(recommendation);

    // フッター
    const footer = document.createElement('div');
    footer.className = 'safari-warning-footer';

    const checkboxLabel = document.createElement('label');
    checkboxLabel.className = 'safari-warning-checkbox-label';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'safari-warning-checkbox';
    checkbox.className = 'safari-warning-checkbox';

    const checkboxText = document.createElement('span');
    checkboxText.textContent = '今後この警告を表示しない';

    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(checkboxText);

    const okButton = document.createElement('button');
    okButton.type = 'button';
    okButton.className = 'safari-warning-ok-button';
    okButton.textContent = 'OK';

    footer.appendChild(checkboxLabel);
    footer.appendChild(okButton);

    // 全体を組み立て
    dialog.appendChild(header);
    dialog.appendChild(body);
    dialog.appendChild(footer);
    overlay.appendChild(dialog);

    // 参照を保存
    this.checkboxElement = checkbox;
    this.okButtonElement = okButton;

    return overlay;
  }

  /**
   * OKボタンクリック時の処理
   */
  handleOkClick() {
    // チェックボックスの状態を確認
    if (this.checkboxElement && this.checkboxElement.checked) {
      this.saveHidePreference();
    }

    // ダイアログを閉じる
    this.hide();
  }

  /**
   * ダイアログを表示
   */
  show() {
    if (this.dialogElement) {
      // 既に表示されている場合は何もしない
      return;
    }

    try {
      // DOM要素を生成
      this.dialogElement = this.createDialogElement();

      // イベントリスナーを設定
      if (this.okButtonElement) {
        this.okButtonElement.addEventListener('click', () => this.handleOkClick());
      }

      // DOMに追加
      document.body.appendChild(this.dialogElement);
    } catch (error) {
      console.error('警告ダイアログの表示に失敗しました:', error);
    }
  }

  /**
   * ダイアログを非表示
   */
  hide() {
    if (!this.dialogElement) {
      return;
    }

    try {
      // イベントリスナーをクリーンアップ
      if (this.okButtonElement) {
        this.okButtonElement.removeEventListener('click', () => this.handleOkClick());
      }

      // DOMから削除
      if (this.dialogElement.parentNode) {
        this.dialogElement.parentNode.removeChild(this.dialogElement);
      }

      // 参照をクリア
      this.dialogElement = null;
      this.checkboxElement = null;
      this.okButtonElement = null;
    } catch (error) {
      console.error('警告ダイアログの非表示に失敗しました:', error);
    }
  }

  /**
   * 初期化: ブラウザ判定と自動表示
   */
  init() {
    // iPhone Safariかどうかを判定
    if (!this.isIphoneSafari()) {
      return;
    }

    // 警告を表示すべきかを判定
    if (!this.shouldShowWarning()) {
      return;
    }

    // ダイアログを表示
    this.show();
  }
}

// DOMContentLoadedイベントで初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const dialog = new SafariWarningDialog();
    dialog.init();
  });
} else {
  // 既にDOMが読み込まれている場合は即座に実行
  const dialog = new SafariWarningDialog();
  dialog.init();
}

// テスト用にグローバルスコープに公開
if (typeof window !== 'undefined') {
  window.SafariWarningDialog = SafariWarningDialog;
}
