# 翻訳機能設定ガイド

## 概要

佐賀バスナビゲーターアプリのお知らせ機能は、Amazon Translateを使用した多言語対応（日本語→英語翻訳）をサポートしています。このドキュメントでは、翻訳機能の設定方法と運用について説明します。

## 機能概要

- **URLハイパーリンク化**: お知らせ内のURLを自動的にクリック可能なリンクに変換
- **多言語翻訳**: 日本語のお知らせを英語に自動翻訳（Amazon Translate使用）
- **翻訳キャッシュ**: 翻訳結果をローカルストレージにキャッシュしてAPI使用量を最適化

## アーキテクチャ

```
ブラウザ (js/translation-service.js)
    ↓ fetch('/api/translate')
Cloudflare Pages Functions (functions/api/translate.ts)
    ↓ AWS SDK for JavaScript v3
Amazon Translate
```

翻訳処理はCloudflare Pages Functionsを経由してサーバーサイドで実行されます。これにより、AWS認証情報がクライアントに露出することを防ぎます。

## AWS認証情報の設定

### 必要な環境変数

翻訳機能を有効にするには、以下の環境変数をCloudflare Pagesに設定する必要があります。

| 環境変数 | 説明 | 例 |
|---------|------|-----|
| `AWS_ACCESS_KEY_ID` | AWSアクセスキーID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWSシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | AWSリージョン | `ap-northeast-1` |

### Cloudflare Pagesでの設定手順

1. [Cloudflareダッシュボード](https://dash.cloudflare.com/)にログイン
2. 対象のPagesプロジェクトを選択
3. 「Settings」→「Environment variables」を選択
4. 「Add variable」をクリックして以下の変数を追加：

```
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=ap-northeast-1
```

**注意**: 
- 「Production」と「Preview」の両方に設定することを推奨
- シークレットアクセスキーは「Encrypt」オプションを有効にして保護

### ローカル開発環境での設定

#### 1. 環境変数ファイルの作成

`.dev.vars.example`をコピーして`.dev.vars`を作成します：

```bash
cp .dev.vars.example .dev.vars
```

`.dev.vars`ファイルを編集して実際のAWS認証情報を設定：

```bash
# .dev.vars
AWS_ACCESS_KEY_ID=your-actual-access-key-id
AWS_SECRET_ACCESS_KEY=your-actual-secret-access-key
AWS_REGION=ap-northeast-1
```

**注意**: `.dev.vars`は`.gitignore`に含まれているため、Gitにコミットされません。

#### 2. 依存関係のインストール

Cloudflare Pages Functionsの依存関係をインストールします：

```bash
cd functions
npm install
cd ..
```

#### 3. ローカル開発サーバーの起動

Wranglerを使用してローカル開発サーバーを起動します：

```bash
npx wrangler pages dev .
```

これにより、以下が起動します：
- 静的ファイルサーバー（`http://localhost:8788`）
- Cloudflare Pages Functions（`/api/*`エンドポイント）
- `.dev.vars`の環境変数が自動的に読み込まれます

#### 4. 翻訳機能のテスト

ブラウザで`http://localhost:8788`を開き、以下を確認：

1. 言語設定を英語（`en`）に変更
2. お知らせ機能を開く
3. 日本語のお知らせが英語に翻訳されることを確認

ブラウザのコンソールで翻訳サービスの状態を確認：

```javascript
console.log(window.translationService?.getStatus());
```

#### 5. APIエンドポイントの直接テスト

curlを使用して翻訳APIを直接テスト：

```bash
curl -X POST http://localhost:8788/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "こんにちは", "sourceLanguage": "ja", "targetLanguage": "en"}'
```

期待されるレスポンス：

```json
{"translatedText":"Hello","sourceLanguage":"ja","targetLanguage":"en"}
```

### AWS IAMポリシー

翻訳機能に必要な最小限のIAMポリシー：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "translate:TranslateText"
      ],
      "Resource": "*"
    }
  ]
}
```

## 翻訳APIエンドポイント

### エンドポイント

```
POST /api/translate
```

### リクエスト形式

```json
{
  "text": "翻訳対象のテキスト",
  "sourceLanguage": "ja",
  "targetLanguage": "en"
}
```

### レスポンス形式（成功時）

```json
{
  "translatedText": "Translated text",
  "sourceLanguage": "ja",
  "targetLanguage": "en"
}
```

### レスポンス形式（エラー時）

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### エラーコード一覧

| コード | HTTPステータス | 説明 |
|-------|--------------|------|
| `AUTH_NOT_CONFIGURED` | 503 | AWS認証情報が設定されていない |
| `AUTH_ERROR` | 401 | AWS認証に失敗 |
| `INVALID_REQUEST` | 400 | リクエスト形式が不正 |
| `TEXT_TOO_LONG` | 400 | テキストが長すぎる |
| `UNSUPPORTED_LANGUAGE` | 400 | サポートされていない言語ペア |
| `RATE_LIMIT` | 429 | レート制限に達した |
| `TRANSLATION_ERROR` | 500 | 翻訳処理エラー |

## 翻訳機能の有効/無効設定

### 翻訳機能の有効化条件

翻訳機能は、以下の条件が全て満たされた場合に自動的に有効になります：

1. AWS認証情報（`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`）が設定されている
2. ユーザーの言語設定が英語（`en`）に設定されている

### 翻訳機能の無効化

翻訳機能を無効にするには、以下のいずれかの方法を使用します：

1. **環境変数を削除**: AWS認証情報を削除または空にする
2. **言語設定を日本語に**: ユーザーが言語設定を日本語（`ja`）に変更する

### 動作確認

翻訳機能の状態は、ブラウザのコンソールで確認できます：

```javascript
// TranslationServiceの状態を確認
if (window.translationService) {
  console.log(window.translationService.getStatus());
}
// 出力例:
// {
//   configured: true,
//   enabled: true,
//   authFailed: false,
//   apiEndpoint: "/api/translate",
//   timeout: 5000,
//   hasCache: true
// }
```

## パフォーマンス最適化

### キャッシュ設定

翻訳結果は自動的にローカルストレージにキャッシュされます：

| 設定項目 | デフォルト値 | 説明 |
|---------|------------|------|
| 最大エントリ数 | 100 | キャッシュに保存される翻訳結果の最大数 |
| 有効期限（TTL） | 24時間 | キャッシュエントリの有効期限 |

### キャッシュのカスタマイズ

キャッシュ設定をカスタマイズする場合：

```javascript
// カスタムキャッシュ設定
const customCache = new TranslationCache(
  200,  // 最大200エントリ
  48 * 60 * 60 * 1000  // 48時間TTL
);

const translationService = new TranslationService({
  cache: customCache
});
```

### タイムアウト設定

翻訳APIのタイムアウトはデフォルトで5秒に設定されています：

```javascript
const translationService = new TranslationService({
  timeout: 10000  // 10秒に変更
});
```

### パフォーマンス目標

| 処理 | 目標時間 | 説明 |
|-----|---------|------|
| URL解析 | 100ms以内 | テキスト内のURL検出とハイパーリンク化 |
| キャッシュ読み取り | 10ms以内 | ローカルストレージからの翻訳結果取得 |
| キャッシュ書き込み | 10ms以内 | ローカルストレージへの翻訳結果保存 |
| 翻訳API呼び出し | 5秒以内 | Amazon Translate APIへのリクエスト |

## エラーハンドリング

### フォールバック動作

翻訳機能は、以下のエラー発生時に元の日本語テキストを表示します：

- **ネットワークエラー**: インターネット接続の問題
- **APIエラー**: 翻訳APIからのエラーレスポンス
- **タイムアウト**: 5秒以内に翻訳が完了しない場合
- **認証エラー**: AWS認証情報が無効な場合
- **認証情報未設定**: AWS認証情報が設定されていない場合

### エラーログ

エラーはブラウザのコンソールに記録されます：

```
TranslationService: 翻訳エラーが発生しました { message: "...", code: "...", timestamp: "..." }
```

### 認証エラー時の自動無効化

認証エラー（401/403/503）が発生した場合、翻訳機能は自動的に無効化されます。これにより、無効な認証情報での繰り返しリクエストを防ぎます。

## トラブルシューティング

### 翻訳が表示されない

1. **環境変数を確認**: Cloudflare Pagesダッシュボードで`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY`、`AWS_REGION`が正しく設定されているか確認
2. **言語設定を確認**: ユーザーの言語設定が英語（`en`）になっているか確認
3. **コンソールを確認**: ブラウザのコンソールでエラーメッセージを確認
4. **ネットワークタブを確認**: `/api/translate`へのリクエストが成功しているか確認

### AWS認証エラー

1. **アクセスキーの有効性**: AWSコンソールでアクセスキーが有効か確認
2. **IAMポリシー**: `translate:TranslateText`権限が付与されているか確認
3. **リージョン設定**: `AWS_REGION`が正しく設定されているか確認

### キャッシュの問題

キャッシュをクリアするには：

```javascript
// ブラウザのコンソールで実行
localStorage.removeItem('saga-bus-nav-translation-cache');
```

### パフォーマンスの問題

1. **キャッシュサイズを確認**: キャッシュが満杯になっていないか確認
2. **ネットワーク状態を確認**: 翻訳APIへの接続が安定しているか確認
3. **タイムアウト設定を調整**: 必要に応じてタイムアウト値を増やす

## セキュリティ考慮事項

### AWS認証情報の保護

- AWS認証情報はCloudflare Pagesの環境変数として設定し、ソースコードにハードコードしない
- `.dev.vars`ファイルは`.gitignore`に追加してバージョン管理から除外
- シークレットアクセスキーは「Encrypt」オプションを有効にして保護
- 翻訳処理はサーバーサイド（Cloudflare Pages Functions）で実行され、認証情報はクライアントに露出しない

### URLハイパーリンクのセキュリティ

- 全てのハイパーリンクに`rel="noopener noreferrer"`属性を設定
- `target="_blank"`で新しいタブで開く
- HTMLエスケープによるXSS攻撃の防止

### IAM最小権限の原則

- 翻訳機能に必要な最小限の権限（`translate:TranslateText`）のみを付与
- 専用のIAMユーザーまたはロールを作成することを推奨

## 依存関係

### Cloudflare Pages Functions

```json
// functions/package.json
{
  "dependencies": {
    "@aws-sdk/client-translate": "^3.700.0"
  }
}
```

### wrangler.toml設定

```toml
name = "saga-bus-navigator"
pages_build_output_dir = "."
compatibility_date = "2025-11-16"
compatibility_flags = ["nodejs_compat"]
```

## 関連ドキュメント

- [API.md](./API.md) - API仕様
- [SECURITY.md](./SECURITY.md) - セキュリティガイドライン
- [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) - パフォーマンス最適化
