# 多言語対応機能 要件定義書

## はじめに

佐賀バスナビゲーターアプリに多言語対応機能を追加し、日本語と英語の切り替えを可能にする。現在日本語のみで提供されているアプリケーションを国際化（I18N）対応し、外国人観光客や英語話者にも利用しやすくする。

## 用語集

- **I18N**: Internationalization（国際化）の略称
- **Language_Switcher**: 言語切り替えコンポーネント
- **Translation_System**: 翻訳システム
- **Locale**: 言語・地域設定（ja-JP、en-USなど）
- **Translation_Key**: 翻訳キー（文字列識別子）
- **Language_Storage**: 言語設定保存システム
- **Bus_Stop_Mapping**: バス停名の日英マッピングCSVファイル
- **Mapped_Translation**: 手動でマッピングされた翻訳（Source: "Mapped"）
- **Auto_Translation**: 機械翻訳による翻訳（Source: "Auto-translated"）

## 要件

### 要件1

**ユーザーストーリー:** ユーザーとして、アプリケーションの表示言語を日本語と英語で切り替えたい。そうすることで、自分の理解しやすい言語でバス情報を確認できる。

#### 受入基準

1. WHEN ユーザーが言語切り替えボタンをクリックする THEN Language_Switcher SHALL 利用可能な言語オプション（日本語、英語）を表示する
2. WHEN ユーザーが特定の言語を選択する THEN Translation_System SHALL 選択された言語でアプリケーション全体の表示を更新する
3. WHEN 言語が切り替えられる THEN Language_Storage SHALL 選択された言語設定をローカルストレージに保存する
4. WHEN アプリケーションが再起動される THEN Translation_System SHALL 保存された言語設定を読み込んで適用する
5. WHEN 言語切り替えが実行される THEN Translation_System SHALL 全ての翻訳可能なテキストを即座に更新する

### 要件2

**ユーザーストーリー:** 開発者として、新しいテキストを追加する際に翻訳キーシステムを使用したい。そうすることで、一貫した多言語対応を維持できる。

#### 受入基準

1. WHEN 新しいテキストが追加される THEN Translation_System SHALL 一意のTranslation_Keyを使用してテキストを管理する
2. WHEN Translation_Keyが参照される THEN Translation_System SHALL 現在のLocaleに対応する翻訳テキストを返す
3. WHEN 翻訳が存在しない THEN Translation_System SHALL フォールバック言語（日本語）のテキストを表示する
4. WHEN 翻訳ファイルが更新される THEN Translation_System SHALL 動的に新しい翻訳を読み込む
5. WHEN 無効なTranslation_Keyが使用される THEN Translation_System SHALL キー名をそのまま表示してエラーを防ぐ

### 要件3

**ユーザーストーリー:** ユーザーとして、バス停名や路線名などの交通情報が適切に翻訳されて表示されたい。そうすることで、英語でも正確にバス情報を理解できる。

#### 受入基準

1. WHEN バス停情報が表示される THEN Translation_System SHALL Bus_Stop_Mappingファイルを使用してバス停名を選択された言語で表示する
2. WHEN 路線情報が表示される THEN Translation_System SHALL 路線名と方向情報を選択された言語で表示する
3. WHEN 時刻表が表示される THEN Translation_System SHALL 時刻表のヘッダーとラベルを選択された言語で表示する
4. WHEN エラーメッセージが表示される THEN Translation_System SHALL エラー内容を選択された言語で表示する
5. WHEN 運賃情報が表示される THEN Translation_System SHALL 運賃関連のテキストを選択された言語で表示する

### 要件4

**ユーザーストーリー:** ユーザーとして、言語切り替えボタンが分かりやすい場所に配置されていてほしい。そうすることで、簡単に言語を変更できる。

#### 受入基準

1. WHEN アプリケーションが読み込まれる THEN Language_Switcher SHALL フッター部分のコピーライト左側にプルダウン形式で表示される
2. WHEN Language_Switcherが表示される THEN Language_Switcher SHALL 現在選択されている言語を視覚的に示す
3. WHEN モバイルデバイスで表示される THEN Language_Switcher SHALL レスポンシブデザインで適切に表示される
4. WHEN Language_Switcherにフォーカスが当たる THEN Language_Switcher SHALL アクセシビリティ対応のフォーカス表示を行う
5. WHEN 言語切り替えが進行中である THEN Language_Switcher SHALL ローディング状態を視覚的に表示する

### 要件5

**ユーザーストーリー:** システム管理者として、翻訳データが効率的に管理されていてほしい。そうすることで、将来的な言語追加や翻訳更新が容易になる。

#### 受入基準

1. WHEN 翻訳データが保存される THEN Translation_System SHALL JSON形式で構造化されたファイルに保存する
2. WHEN 新しい言語が追加される THEN Translation_System SHALL 既存の翻訳構造を変更せずに新言語ファイルを追加できる
3. WHEN 翻訳ファイルが読み込まれる THEN Translation_System SHALL ファイルの整合性を検証する
4. WHEN 翻訳キーが不足している THEN Translation_System SHALL 開発者コンソールに警告を出力する
5. WHEN 翻訳データが更新される THEN Translation_System SHALL キャッシュを適切に更新する

### 要件6

**ユーザーストーリー:** ユーザーとして、バス停名が正確に翻訳されて表示されたい。そうすることで、英語でも正しいバス停を識別できる。

#### 受入基準

1. WHEN バス停名の翻訳が必要な場合 THEN Translation_System SHALL Bus_Stop_Mappingファイルから対応する英語名を取得する
2. WHEN Mapped_Translationが利用可能な場合 THEN Translation_System SHALL 手動マッピングされた翻訳を優先して使用する
3. WHEN Mapped_Translationが利用できない場合 THEN Translation_System SHALL Auto_Translationを使用する
4. WHEN Bus_Stop_Mappingに該当するバス停が存在しない場合 THEN Translation_System SHALL 元の日本語名を表示する
5. WHEN Bus_Stop_Mappingファイルが読み込めない場合 THEN Translation_System SHALL エラーログを出力し、フォールバック処理を実行する