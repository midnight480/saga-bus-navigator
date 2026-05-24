/**
 * 言語切り替えプルダウンUI制御クラス
 * フッター部分に配置される言語切り替えコンポーネント
 */
class LanguageSwitcher {
  constructor(container, translationManager) {
    this.container = container;
    this.translationManager = translationManager;
    this.isOpen = false;
    this.isLoading = false;
    
    // サポートされている言語の設定
    this.supportedLanguages = [
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'en', name: 'English', flag: '🇺🇸' }
    ];
    
    this.init();
  }
  
  /**
   * 初期化処理
   */
  init() {
    this.render();
    this.setupEventListeners();
    this.setupKeyboardNavigation();
  }
  
  /**
   * 言語切り替えプルダウンをレンダリング
   */
  render() {
    const currentLanguage = this.getCurrentLanguage();
    
    const dropdownDiv = document.createElement('div');
    dropdownDiv.className = 'language-switcher-dropdown';
    dropdownDiv.setAttribute('role', 'combobox');
    dropdownDiv.setAttribute('aria-label', '言語選択');
    dropdownDiv.setAttribute('aria-expanded', 'false');
    
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'language-dropdown-button';
    button.setAttribute('aria-haspopup', 'listbox');
    button.setAttribute('aria-label', `現在の言語: ${currentLanguage.name}`);
    button.textContent = `${currentLanguage.flag} ${currentLanguage.name} ▼`;
    
    const ul = document.createElement('ul');
    ul.className = 'language-dropdown-menu';
    ul.setAttribute('role', 'listbox');
    ul.hidden = true;
    
    const options = this.createDropdownOptionsNodes();
    options.forEach(opt => ul.appendChild(opt));
    
    dropdownDiv.appendChild(button);
    dropdownDiv.appendChild(ul);
    
    this.container.replaceChildren(dropdownDiv);
  }
  
  /**
   * プルダウンオプションのノードを生成
   */
  createDropdownOptionsNodes() {
    const currentLanguageCode = this.translationManager ? this.translationManager.getLanguage() : 'ja';
    
    return this.supportedLanguages.map(lang => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', lang.code === currentLanguageCode ? 'true' : 'false');
      
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.locale = lang.code;
      btn.textContent = `${lang.flag} ${lang.name}`;
      
      li.appendChild(btn);
      return li;
    });
  }
  
  /**
   * 現在の言語情報を取得
   */
  getCurrentLanguage() {
    const currentCode = this.translationManager ? this.translationManager.getLanguage() : 'ja';
    return this.supportedLanguages.find(lang => lang.code === currentCode) || this.supportedLanguages[0];
  }
  
  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    const button = this.container.querySelector('.language-dropdown-button');
    const menu = this.container.querySelector('.language-dropdown-menu');
    
    // プルダウンボタンのクリック
    button.addEventListener('click', (e) => {
      e.preventDefault();
      this.toggleDropdown();
    });
    
    // 言語選択ボタンのクリック
    menu.addEventListener('click', (e) => {
      if (e.target.dataset.locale) {
        e.preventDefault();
        this.handleLanguageChange(e.target.dataset.locale);
      }
    });
    
    // 外部クリックでプルダウンを閉じる
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }
  
  /**
   * キーボードナビゲーションの設定
   */
  setupKeyboardNavigation() {
    const button = this.container.querySelector('.language-dropdown-button');
    const menu = this.container.querySelector('.language-dropdown-menu');
    
    button.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleDropdown();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.openDropdown();
        this.focusFirstOption();
      }
    });
    
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeDropdown();
        button.focus();
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.dataset.locale) {
          e.preventDefault();
          this.handleLanguageChange(e.target.dataset.locale);
        }
      }
    });
  }
  
  /**
   * プルダウンの開閉切り替え
   */
  toggleDropdown() {
    if (this.isOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }
  
  /**
   * プルダウンを開く
   */
  openDropdown() {
    if (this.isLoading) return;
    
    const dropdown = this.container.querySelector('.language-switcher-dropdown');
    const menu = this.container.querySelector('.language-dropdown-menu');
    
    dropdown.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    this.isOpen = true;
  }
  
  /**
   * プルダウンを閉じる
   */
  closeDropdown() {
    const dropdown = this.container.querySelector('.language-switcher-dropdown');
    const menu = this.container.querySelector('.language-dropdown-menu');
    
    dropdown.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    this.isOpen = false;
  }
  
  /**
   * 最初のオプションにフォーカス
   */
  focusFirstOption() {
    const firstOption = this.container.querySelector('.language-dropdown-menu button');
    if (firstOption) {
      firstOption.focus();
    }
  }
  
  /**
   * 言語変更処理
   */
  async handleLanguageChange(locale) {
    if (this.isLoading) return;
    
    try {
      this.setLoadingState(true);
      
      if (this.translationManager) {
        await this.translationManager.setLanguage(locale);
        
        // BusStopTranslatorの言語も更新
        if (window.busStopTranslator) {
          window.busStopTranslator.setCurrentLanguage(locale);
        }
        
        // RouteNameTranslatorの言語も更新
        if (window.routeNameTranslator) {
          window.routeNameTranslator.setCurrentLanguage(locale);
        }
      }
      
      this.updateActiveState();
      this.closeDropdown();
      
    } catch (error) {
      console.error('言語切り替えエラー:', error);
    } finally {
      this.setLoadingState(false);
    }
  }
  
  /**
   * アクティブ状態の更新
   */
  updateActiveState() {
    const currentLanguage = this.getCurrentLanguage();
    const button = this.container.querySelector('.language-dropdown-button');
    
    // ボタンのテキストと aria-label を更新
    button.textContent = `${currentLanguage.flag} ${currentLanguage.name} ▼`;
    button.setAttribute('aria-label', `現在の言語: ${currentLanguage.name}`);
    
    // プルダウンオプションの選択状態を更新
    const options = this.container.querySelectorAll('.language-dropdown-menu li');
    options.forEach(option => {
      const button = option.querySelector('button');
      const isSelected = button.dataset.locale === currentLanguage.code;
      option.setAttribute('aria-selected', isSelected);
      
      if (isSelected) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }
  
  /**
   * ローディング状態の設定
   */
  setLoadingState(loading) {
    this.isLoading = loading;
    const button = this.container.querySelector('.language-dropdown-button');
    
    if (loading) {
      button.classList.add('loading');
      button.disabled = true;
      button.setAttribute('aria-label', '言語切り替え中...');
    } else {
      button.classList.remove('loading');
      button.disabled = false;
      const currentLanguage = this.getCurrentLanguage();
      button.setAttribute('aria-label', `現在の言語: ${currentLanguage.name}`);
    }
  }
  
  /**
   * 現在選択されている言語が視覚的に正しく示されているかを検証
   * @returns {boolean} 視覚的一貫性が保たれているかどうか
   */
  isVisuallyConsistent() {
    const currentLanguage = this.getCurrentLanguage();
    const button = this.container.querySelector('.language-dropdown-button');
    
    if (!button) return false;
    
    // ボタンのテキストに現在の言語が含まれているか
    const buttonText = button.textContent || button.innerText;
    const hasCorrectFlag = buttonText.includes(currentLanguage.flag);
    const hasCorrectName = buttonText.includes(currentLanguage.name);
    
    // aria-labelが正しく設定されているか
    const ariaLabel = button.getAttribute('aria-label');
    const hasCorrectAriaLabel = ariaLabel && ariaLabel.includes(currentLanguage.name);
    
    // プルダウンオプションの選択状態が正しいか
    const selectedOption = this.container.querySelector('.language-dropdown-menu li[aria-selected="true"]');
    const hasCorrectSelection = selectedOption && 
      selectedOption.querySelector('button').dataset.locale === currentLanguage.code;
    
    return hasCorrectFlag && hasCorrectName && hasCorrectAriaLabel && hasCorrectSelection;
  }
}

// グローバルスコープに公開（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LanguageSwitcher;
} else if (typeof window !== 'undefined') {
  window.LanguageSwitcher = LanguageSwitcher;
}