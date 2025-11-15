# 要件定義書

## はじめに

本ドキュメントは、佐賀バスナビの地図表示機能における2つの不具合修正に関する要件を定義します。

## 用語集

- **CSP (Content Security Policy)**: Webアプリケーションのセキュリティポリシーで、外部リソースの読み込みを制御するHTTPヘッダー
- **Leaflet**: オープンソースのJavaScript地図ライブラリ
- **CDN (Content Delivery Network)**: 外部ホスティングされたライブラリやリソースを配信するネットワーク
- **経路表示**: 検索結果から「地図で表示」を選択した際に、出発地から到着地までの経路を地図上に矢印で表示する機能
- **Cloudflare Pages**: 本アプリケーションのホスティング環境

## 要件

### 要件1: CSP違反エラーの修正

**ユーザーストーリー:** アプリケーション管理者として、Cloudflare Pages上でアプリケーションが正常に動作するように、CSPエラーを解消したい

#### 受入基準

1. WHEN アプリケーションがCloudflare Pages上で読み込まれる時、THE システム SHALL Leaflet CSSファイルをCSP違反なく読み込む
2. WHEN アプリケーションがCloudflare Pages上で読み込まれる時、THE システム SHALL Leaflet JavaScriptファイルをCSP違反なく読み込む
3. WHEN アプリケーションがCloudflare Pages上で読み込まれる時、THE システム SHALL Leaflet MarkerCluster CSSファイルをCSP違反なく読み込む
4. WHEN アプリケーションがCloudflare Pages上で読み込まれる時、THE システム SHALL Leaflet MarkerCluster JavaScriptファイルをCSP違反なく読み込む
5. WHEN ブラウザの開発者コンソールを確認する時、THE システム SHALL CSP違反に関するエラーメッセージを表示しない

### 要件2: 経路表示の矢印方向修正

**ユーザーストーリー:** バス利用者として、検索結果から「地図で表示」を選択した際に、出発地から到着地への正しい方向の矢印を見たい

#### 受入基準

1. WHEN ユーザーが検索結果から「地図で表示」を選択する時、THE システム SHALL 出発バス停から到着バス停への方向に矢印を表示する
2. WHEN 経路に複数のセグメントが存在する時、THE システム SHALL 各セグメントで進行方向を示す矢印を表示する
3. WHEN 矢印が表示される時、THE システム SHALL 矢印の向きが経路の進行方向と一致する
4. WHEN 経路が地図上に表示される時、THE システム SHALL 出発地（緑色マーカー）から到着地（赤色マーカー）への視覚的な流れを明確に示す
5. WHEN ユーザーが経路を確認する時、THE システム SHALL 到着地から出発地への逆方向の矢印を表示しない
