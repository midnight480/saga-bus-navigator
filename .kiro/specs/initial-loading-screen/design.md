# 設計書

## 概要

佐賀バスナビゲーターアプリケーションの初期表示時に、GTFSデータのロード完了までローディング画面を表示する機能を実装します。この機能により、ユーザーはデータロード中であることを視覚的に理解でき、アプリケーションの信頼性とユーザー体験が向上します。

## アーキテクチャ

### システム構成

```
┌─────────────────────────────────────────┐
│         index.html (起動時)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      LoadingScreen (即座に表示)          │
│  - オーバーレイ表示                       │
│  - ローディングインジケーター              │
│  - 進捗メッセージ                         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         DataLoader (データロード)         │
│  - GTFSファイル検索                       │
│  - ZIPファイル読み込み                    │
│  - データパース                           │
│  - データ変換                             │
└──────────────┬──────────────────────────┘
               │
               ▼ (完了時)
┌─────────────────────────────────────────┐
│      LoadingScreen (フェードアウト)       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Main UI (表示)                   │
│  - 地図表示                              │
│  - 検索機能                              │
└─────────────────────────────────────────┘
```

### レイヤー構造

1. **プレゼンテーション層**: LoadingScreen UI (HTML/CSS)
2. **制御層**: LoadingScreenController (JavaScript)
3. **データ層**: DataLoader (既存)

## コンポーネントとインターフェース

### LoadingScreenController

ローディング画面の表示・非表示、進捗メッセージの更新を制御するコントローラークラス。

```javascript
class LoadingScreenController {
  constructor()
  show()                              // ローディング画面を表示
  hide()                              // ローディング画面を非表示（フェードアウト）
  updateProgress(message)             // 進捗メッセージを更新
  showError(message, retryCallback)   // エラーメッセージを表示
  startTimeout(duration, callback)    // タイムアウトタイマーを開始
  clearTimeout()                      // タイムアウトタイマーをクリア
}
```

### LoadingScreen HTML構造

```html
<div id="loading-screen" class="loading-screen">
  <div class="loading-content">
    <div class="loading-logo">
      <h1>佐賀バスナビ</h1>
    </div>
    <div class="loading-spinner"></div>
    <div class="loading-message">データを読み込んでいます...</div>
    <div class="loading-error" hidden>
      <p class="error-message"></p>
      <button class="retry-button">再試行</button>
    </div>
  </div>
</div>
```

### DataLoader統合ポイント

既存の`DataLoader`クラスに以下の統合ポイントを追加:

```javascript
// app.js内のinitializeApp関数
async function initializeApp() {
  const loadingController = new LoadingScreenController();
  
  try {
    // ローディング画面を表示
    loadingController.show();
    
    // タイムアウトタイマーを開始（30秒で警告、60秒でエラー）
    loadingController.startTimeout(30000, () => {
      loadingController.updateProgress('データの読み込みに時間がかかっています...');
    });
    
    // データロード開始
    loadingController.updateProgress('GTFSデータを検索しています...');
    const dataLoader = new DataLoader();
    
    // 進捗コールバックを設定
    dataLoader.onProgress = (message) => {
      loadingController.updateProgress(message);
    };
    
    // データロード実行
    const data = await dataLoader.loadAllData();
    
    // タイムアウトタイマーをクリア
    loadingController.clearTimeout();
    
    // ローディング画面を非表示
    loadingController.hide();
    
    // メインUIを初期化
    initializeMainUI(data);
    
  } catch (error) {
    // エラー処理
    loadingController.showError(
      'データの読み込みに失敗しました。再試行してください。',
      () => initializeApp() // リトライコールバック
    );
  }
}
```

## データモデル

### LoadingState

```javascript
{
  isVisible: boolean,           // ローディング画面の表示状態
  message: string,              // 現在の進捗メッセージ
  hasError: boolean,            // エラー状態
  errorMessage: string,         // エラーメッセージ
  timeoutWarningShown: boolean, // タイムアウト警告表示済みフラグ
  startTime: number             // ロード開始時刻（ミリ秒）
}
```

## 正確性プロパティ

*プロパティとは、システムの全ての有効な実行において真であるべき特性や振る舞いのことです。プロパティは、人間が読める仕様と機械が検証可能な正確性保証の橋渡しとなります。*

### プロパティ 1: ローディング画面の即座表示

*任意の*アプリケーション起動時において、ローディング画面はDOM読み込み完了後、即座に表示されるべきである

**検証: 要件 1.1**

### プロパティ 2: データロード完了時の非表示

*任意の*データロード処理において、`DataLoader.loadAllData()`が正常に完了した場合、ローディング画面は非表示になるべきである

**検証: 要件 1.3**

### プロパティ 3: エラー時のエラー表示

*任意の*データロード処理において、`DataLoader.loadAllData()`がエラーをスローした場合、ローディング画面上にエラーメッセージとリトライボタンが表示されるべきである

**検証: 要件 1.4**

### プロパティ 4: 進捗メッセージの更新

*任意の*`updateProgress(message)`呼び出しにおいて、ローディング画面の進捗メッセージテキストが指定されたメッセージに更新されるべきである

**検証: 要件 2.1**

### プロパティ 5: タイムアウト警告の表示

*任意の*データロード処理において、30秒経過した場合、警告メッセージが表示されるべきである

**検証: 要件 5.1**

### プロパティ 6: タイムアウトエラーの表示

*任意の*データロード処理において、60秒経過した場合、タイムアウトエラーメッセージとリトライボタンが表示されるべきである

**検証: 要件 5.2**

### プロパティ 7: リトライ機能の動作

*任意の*エラー状態において、リトライボタンをクリックした場合、データロード処理が再実行されるべきである

**検証: 要件 5.3**

### プロパティ 8: フェードアウトアニメーション

*任意の*`hide()`呼び出しにおいて、ローディング画面はフェードアウトアニメーションを伴って非表示になるべきである

**検証: 要件 4.5**

## エラーハンドリング

### エラーケース

1. **GTFSファイルが見つからない** (`GTFS_FILE_NOT_FOUND`)
   - エラーメッセージ: 「データファイルが見つかりません。再試行してください。」
   - リトライボタンを表示

2. **ZIPファイルの解凍失敗** (`GTFS_UNZIP_FAILED`)
   - エラーメッセージ: 「データの解凍に失敗しました。再試行してください。」
   - リトライボタンを表示

3. **データ形式が不正** (`GTFS_INVALID_FORMAT`)
   - エラーメッセージ: 「データ形式が不正です。管理者に連絡してください。」
   - リトライボタンを表示（再試行しても解決しない可能性が高いが、ユーザーに選択肢を提供）

4. **ネットワークエラー** (`GTFS_NETWORK_ERROR`)
   - エラーメッセージ: 「ネットワークエラーが発生しました。接続を確認して再試行してください。」
   - リトライボタンを表示

5. **タイムアウト** (`GTFS_TIMEOUT`)
   - エラーメッセージ: 「データの読み込みがタイムアウトしました。再試行してください。」
   - リトライボタンを表示

### エラー表示フロー

```
エラー発生
  ↓
LoadingScreenController.showError()
  ↓
エラーメッセージ表示
  ↓
リトライボタン表示
  ↓
ユーザーがリトライボタンをクリック
  ↓
retryCallback()実行
  ↓
initializeApp()再実行
```

## テスト戦略

### 単体テスト

1. **LoadingScreenController.show()のテスト**
   - ローディング画面が表示されることを確認
   - `display: block`が設定されることを確認

2. **LoadingScreenController.hide()のテスト**
   - フェードアウトアニメーション後にローディング画面が非表示になることを確認
   - `display: none`が設定されることを確認

3. **LoadingScreenController.updateProgress()のテスト**
   - 進捗メッセージが更新されることを確認
   - メッセージテキストが正しく設定されることを確認

4. **LoadingScreenController.showError()のテスト**
   - エラーメッセージが表示されることを確認
   - リトライボタンが表示されることを確認
   - リトライボタンクリック時にコールバックが実行されることを確認

5. **LoadingScreenController.startTimeout()のテスト**
   - 指定時間経過後にコールバックが実行されることを確認
   - 30秒タイムアウトで警告メッセージが表示されることを確認
   - 60秒タイムアウトでエラーメッセージが表示されることを確認

6. **LoadingScreenController.clearTimeout()のテスト**
   - タイムアウトタイマーがクリアされることを確認
   - タイムアウトコールバックが実行されないことを確認

### プロパティベーステスト

1. **プロパティ 1: ローディング画面の即座表示**
   - **テストライブラリ**: fast-check (JavaScript用プロパティベーステストライブラリ)
   - **テスト内容**: アプリケーション起動時に`LoadingScreenController.show()`が呼び出され、ローディング画面が表示されることを検証
   - **イテレーション数**: 100回

2. **プロパティ 2: データロード完了時の非表示**
   - **テストライブラリ**: fast-check
   - **テスト内容**: `DataLoader.loadAllData()`が正常に完了した後、`LoadingScreenController.hide()`が呼び出され、ローディング画面が非表示になることを検証
   - **イテレーション数**: 100回

3. **プロパティ 3: エラー時のエラー表示**
   - **テストライブラリ**: fast-check
   - **テスト内容**: `DataLoader.loadAllData()`がエラーをスローした場合、`LoadingScreenController.showError()`が呼び出され、エラーメッセージとリトライボタンが表示されることを検証
   - **イテレーション数**: 100回

4. **プロパティ 4: 進捗メッセージの更新**
   - **テストライブラリ**: fast-check
   - **テスト内容**: 任意の文字列を`updateProgress()`に渡した場合、ローディング画面の進捗メッセージが更新されることを検証
   - **イテレーション数**: 100回

5. **プロパティ 5: タイムアウト警告の表示**
   - **テストライブラリ**: fast-check
   - **テスト内容**: データロード処理が30秒経過した場合、警告メッセージが表示されることを検証
   - **イテレーション数**: 100回

6. **プロパティ 6: タイムアウトエラーの表示**
   - **テストライブラリ**: fast-check
   - **テスト内容**: データロード処理が60秒経過した場合、タイムアウトエラーメッセージとリトライボタンが表示されることを検証
   - **イテレーション数**: 100回

7. **プロパティ 7: リトライ機能の動作**
   - **テストライブラリ**: fast-check
   - **テスト内容**: エラー状態でリトライボタンをクリックした場合、データロード処理が再実行されることを検証
   - **イテレーション数**: 100回

8. **プロパティ 8: フェードアウトアニメーション**
   - **テストライブラリ**: fast-check
   - **テスト内容**: `hide()`呼び出し時にフェードアウトアニメーションが適用されることを検証
   - **イテレーション数**: 100回

### E2Eテスト

1. **初期表示時のローディング画面表示**
   - アプリケーションを起動
   - ローディング画面が表示されることを確認
   - データロード完了後、ローディング画面が非表示になることを確認
   - メインUIが表示されることを確認

2. **エラー時のリトライ機能**
   - データロードエラーをシミュレート
   - エラーメッセージとリトライボタンが表示されることを確認
   - リトライボタンをクリック
   - データロードが再実行されることを確認

3. **タイムアウト処理**
   - データロードを意図的に遅延させる
   - 30秒経過後に警告メッセージが表示されることを確認
   - 60秒経過後にタイムアウトエラーが表示されることを確認

## 実装の詳細

### CSS設計

```css
/* ローディング画面のオーバーレイ */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  transition: opacity 0.3s ease-out;
}

.loading-screen.fade-out {
  opacity: 0;
}

/* ローディングコンテンツ */
.loading-content {
  text-align: center;
  max-width: 400px;
  padding: 2rem;
}

/* ロゴ */
.loading-logo h1 {
  font-size: 2rem;
  color: #2c5aa0;
  margin-bottom: 2rem;
}

/* スピナー */
.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2c5aa0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 進捗メッセージ */
.loading-message {
  font-size: 1rem;
  color: #666;
  margin-bottom: 1rem;
}

/* エラー表示 */
.loading-error {
  margin-top: 1.5rem;
}

.error-message {
  color: #d32f2f;
  margin-bottom: 1rem;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  background-color: #2c5aa0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.retry-button:hover {
  background-color: #1e3a6f;
}

/* レスポンシブデザイン */
@media (max-width: 768px) {
  .loading-logo h1 {
    font-size: 1.5rem;
  }
  
  .loading-content {
    padding: 1rem;
  }
}
```

### JavaScript実装パターン

```javascript
class LoadingScreenController {
  constructor() {
    this.loadingScreen = document.getElementById('loading-screen');
    this.loadingMessage = this.loadingScreen.querySelector('.loading-message');
    this.loadingError = this.loadingScreen.querySelector('.loading-error');
    this.errorMessage = this.loadingError.querySelector('.error-message');
    this.retryButton = this.loadingError.querySelector('.retry-button');
    
    this.timeoutId = null;
    this.warningTimeoutId = null;
    this.startTime = null;
  }
  
  show() {
    this.loadingScreen.style.display = 'flex';
    this.loadingScreen.classList.remove('fade-out');
    this.loadingError.setAttribute('hidden', '');
    this.startTime = Date.now();
  }
  
  hide() {
    this.loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 300); // フェードアウトアニメーション時間
  }
  
  updateProgress(message) {
    this.loadingMessage.textContent = message;
  }
  
  showError(message, retryCallback) {
    this.loadingMessage.textContent = '';
    this.errorMessage.textContent = message;
    this.loadingError.removeAttribute('hidden');
    
    // リトライボタンのイベントリスナー
    this.retryButton.onclick = () => {
      this.loadingError.setAttribute('hidden', '');
      this.show();
      retryCallback();
    };
  }
  
  startTimeout(warningDuration, warningCallback) {
    // 30秒警告タイマー
    this.warningTimeoutId = setTimeout(() => {
      warningCallback();
    }, warningDuration);
    
    // 60秒エラータイマー
    this.timeoutId = setTimeout(() => {
      this.showError(
        'データの読み込みがタイムアウトしました。再試行してください。',
        () => {
          // リトライ時は親コンテキストから再実行される
        }
      );
    }, warningDuration * 2);
  }
  
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
}
```

### DataLoaderへの進捗コールバック追加

既存の`DataLoader`クラスに進捗コールバックを追加:

```javascript
class DataLoader {
  constructor() {
    // 既存のコード...
    this.onProgress = null; // 進捗コールバック
  }
  
  async loadAllData() {
    try {
      if (this.onProgress) {
        this.onProgress('GTFSデータを検索しています...');
      }
      
      // 既存のコード...
      
      if (this.onProgress) {
        this.onProgress('バス停データを読み込んでいます...');
      }
      const busStopsData = await this.loadBusStops();
      
      if (this.onProgress) {
        this.onProgress('時刻表データを読み込んでいます...');
      }
      const timetableData = await this.loadTimetable();
      
      if (this.onProgress) {
        this.onProgress('運賃データを読み込んでいます...');
      }
      const faresData = await this.loadFares();
      
      if (this.onProgress) {
        this.onProgress('データの読み込みが完了しました');
      }
      
      return {
        busStops: busStopsData,
        timetable: timetableData,
        fares: faresData
      };
    } catch (error) {
      // 既存のエラーハンドリング...
    }
  }
}
```

## パフォーマンス考慮事項

1. **ローディング画面の即座表示**
   - HTMLに直接埋め込むことで、JavaScriptの読み込みを待たずに表示
   - CSSアニメーションを使用してスムーズな表示

2. **フェードアウトアニメーション**
   - CSS transitionを使用して、GPUアクセラレーションを活用
   - アニメーション時間は300msに設定（ユーザーが認識できる最小時間）

3. **タイムアウト処理**
   - 30秒警告、60秒エラーの2段階タイムアウト
   - ユーザーに適切なフィードバックを提供

## セキュリティ考慮事項

1. **XSS対策**
   - 進捗メッセージやエラーメッセージは`textContent`を使用して設定
   - HTMLインジェクションを防止

2. **リトライ攻撃対策**
   - リトライボタンは手動クリックのみ
   - 自動リトライは実装しない

## アクセシビリティ

1. **スクリーンリーダー対応**
   - ローディング画面に`role="status"`を追加
   - 進捗メッセージに`aria-live="polite"`を追加

2. **キーボード操作**
   - リトライボタンはキーボードでフォーカス可能
   - Enterキーでリトライ実行

3. **カラーコントラスト**
   - WCAG 2.1 AA基準を満たすコントラスト比を確保
   - エラーメッセージは色だけでなくテキストでも明示
