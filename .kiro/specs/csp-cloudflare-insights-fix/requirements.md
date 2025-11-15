# 要件定義書

## はじめに

佐賀バスナビアプリケーションにおいて、Cloudflare Insightsの解析スクリプトがContent Security Policy (CSP)によってブロックされる問題が発生しています。この問題を解決し、セキュリティを維持しながらCloudflare Insightsを適切に動作させる必要があります。

## 用語集

- **CSP (Content Security Policy)**: Webアプリケーションのセキュリティを強化するHTTPヘッダー。外部リソースの読み込みを制御する
- **Cloudflare Insights**: Cloudflare Pagesが提供するアクセス解析機能。自動的にスクリプトを挿入する
- **script-src**: CSPディレクティブの一つ。JavaScriptの読み込み元を制御する
- **_headers**: Cloudflare Pagesで使用されるHTTPヘッダー設定ファイル
- **nonce**: 一度だけ使用される暗号学的に安全なランダム値。CSPでインラインスクリプトを許可する際に使用

## 要件

### 要件1: Cloudflare Insightsスクリプトの許可

**ユーザーストーリー:** アプリケーション管理者として、Cloudflare Insightsによるアクセス解析を有効にしたい。これにより、ユーザーの利用状況を把握できる。

#### 受入基準

1. WHEN アプリケーションがCloudflare Pages上で動作する場合、THE CSP設定 SHALL Cloudflare Insightsスクリプト（static.cloudflareinsights.com）からの読み込みを許可する
2. THE CSP設定 SHALL 既存のセキュリティレベルを維持する
3. THE CSP設定 SHALL 不要な外部スクリプトの読み込みを引き続き禁止する

### 要件2: CSP設定の最適化

**ユーザーストーリー:** セキュリティ担当者として、CSP設定を最小権限の原則に従って構成したい。これにより、セキュリティリスクを最小化できる。

#### 受入基準

1. THE CSP設定 SHALL script-srcディレクティブにCloudflare Insightsドメインのみを追加する
2. THE CSP設定 SHALL 他のディレクティブ（style-src、img-src等）を変更しない
3. THE CSP設定 SHALL 将来的な保守性を考慮したコメントを含む

### 要件3: 動作検証

**ユーザーストーリー:** 開発者として、CSP変更後にアプリケーションが正常に動作することを確認したい。これにより、予期しない問題を防げる。

#### 受入基準

1. WHEN CSP設定を変更した後、THE アプリケーション SHALL ブラウザコンソールにCSP違反エラーを表示しない
2. THE アプリケーション SHALL 既存の全機能（地図表示、検索、時刻表示等）を正常に動作させる
3. THE Cloudflare Insights SHALL アクセス解析データを正常に収集する

### 要件4: 代替案の検討

**ユーザーストーリー:** プロジェクトオーナーとして、Cloudflare Insightsを無効化する選択肢も検討したい。これにより、最適な解決策を選択できる。

#### 受入基準

1. THE ドキュメント SHALL Cloudflare Insightsを無効化する手順を記載する
2. THE ドキュメント SHALL 各選択肢（許可 vs 無効化）のメリット・デメリットを説明する
3. WHERE Cloudflare Insightsを無効化する場合、THE アプリケーション SHALL CSP違反エラーを発生させない
