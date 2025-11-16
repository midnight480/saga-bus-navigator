# リアルタイム車両追跡機能 デプロイメントガイド

## 概要

このドキュメントは、リアルタイム車両追跡機能をCloudflare Pagesにデプロイする手順を説明します。

## 前提条件

- Cloudflare Pagesプロジェクトが既に作成されていること
- GitHubリポジトリとCloudflare Pagesが連携されていること
- 本番環境のドメイン: `https://saga-bus.midnight480.com`

## デプロイ対象ファイル

### 1. Cloudflare Functions（サーバーサイド）

以下の3つのエンドポイントが自動的にデプロイされます：

```
functions/api/vehicle.ts  → /api/vehicle
functions/api/route.ts    → /api/route
functions/api/alert.ts    → /api/alert
```

これらのファイルは既にリポジトリに含まれており、Cloudflare Pagesへのデプロイ時に自動的に認識されます。

### 2. 静的ファイル（クライアントサイド）

以下のファイルがデプロイされます：

- `js/realtime-data-loader.js` - GTFS-Realtimeデータの取得・デコード
- `js/realtime-vehicle-controller.js` - 車両位置と運行情報の表示制御
- `index.html` - リアルタイムデータローダーのスクリプトタグを含む
- `_headers` - CSPヘッダーの更新（connect-srcディレクティブ）

### 3. 依存ライブラリ

以下のライブラリがpackage.jsonに含まれています：

- `gtfs-realtime-bindings@^1.1.0` - Protocol Buffersデコード用
- `protobufjs@^7.2.5` - gtfs-realtime-bindingsの依存

## デプロイ手順

### ステップ1: 依存ライブラリの確認

```bash
# 依存ライブラリがインストールされているか確認
npm list gtfs-realtime-bindings protobufjs

# 出力例:
# saga-bus-navigator@1.0.0
# ├─┬ gtfs-realtime-bindings@1.1.1
# │ └── protobufjs@7.5.4
# └── protobufjs@7.5.4
```

### ステップ2: ローカルでの動作確認

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:8080 を開く
# 開発者ツールのコンソールで以下を確認:
# - "RealtimeDataLoader initialized" のログ
# - 30秒ごとに車両位置情報が更新されるログ
# - エラーが発生していないこと
```

### ステップ3: GitHubへのプッシュ

```bash
# 変更をコミット
git add .
git commit -m "feat: リアルタイム車両追跡機能を追加"

# リモートリポジトリにプッシュ
git push origin main
```

### ステップ4: Cloudflare Pagesでの自動デプロイ

GitHubにプッシュすると、Cloudflare Pagesが自動的にデプロイを開始します。

1. Cloudflare Pagesダッシュボードにアクセス
2. プロジェクトを選択
3. "Deployments" タブでデプロイ状況を確認
4. デプロイが完了するまで待機（通常1-3分）

### ステップ5: デプロイ後の動作確認

#### 5.1 Cloudflare Functionsの動作確認

ブラウザまたはcurlで以下のエンドポイントにアクセス:

```bash
# vehicle.pbエンドポイント
curl -I https://saga-bus.midnight480.com/api/vehicle

# 期待されるレスポンスヘッダー:
# HTTP/2 200
# content-type: application/x-protobuf
# cache-control: public, max-age=30, s-maxage=30
# access-control-allow-origin: https://saga-bus.midnight480.com

# route.pbエンドポイント
curl -I https://saga-bus.midnight480.com/api/route

# alert.pbエンドポイント
curl -I https://saga-bus.midnight480.com/api/alert
```

#### 5.2 クライアントサイドの動作確認

1. ブラウザで `https://saga-bus.midnight480.com` を開く
2. 開発者ツールのコンソールを開く
3. 以下のログを確認:

```
[RealtimeDataLoader] Initialized with proxy base URL: /api
[RealtimeDataLoader] Vehicle positions updated: XX vehicles
[RealtimeVehicleController] Vehicle markers updated: XX markers
```

4. 地図上に車両マーカーが表示されることを確認
5. 車両マーカーをクリックして運行状態が表示されることを確認
6. 運行情報（遅延・運休）が地図上部に表示されることを確認（該当する場合）

#### 5.3 エラーハンドリングの確認

開発者ツールのネットワークタブで以下を確認:

- `/api/vehicle`, `/api/route`, `/api/alert` のリクエストが30秒ごとに送信される
- ステータスコードが200または304（キャッシュヒット）
- エラーが発生した場合、コンソールにエラーログが出力される

## トラブルシューティング

### 問題1: Cloudflare Functionsが502エラーを返す

**原因**: アップストリーム（佐賀バスオープンデータ）が応答していない

**対処法**:
1. `http://opendata.sagabus.info/vehicle.pb` に直接アクセスして確認
2. アップストリームが正常な場合、Cloudflare Pagesのログを確認
3. 一時的な問題の場合、30秒後に自動的にリトライされる

### 問題2: CORSエラーが発生する

**原因**: Access-Control-Allow-Originヘッダーが正しく設定されていない

**対処法**:
1. Cloudflare Functionsのコードで`Access-Control-Allow-Origin`ヘッダーを確認
2. 本番環境のドメインが`https://saga-bus.midnight480.com`と一致しているか確認
3. 開発環境の場合、ローカルプロキシを使用するか、CORSヘッダーを調整

### 問題3: 車両マーカーが表示されない

**原因**: Protocol Buffersのデコードに失敗している

**対処法**:
1. 開発者ツールのコンソールでエラーログを確認
2. `gtfs-realtime-bindings`と`protobufjs`が正しくインストールされているか確認
3. ネットワークタブで`/api/vehicle`のレスポンスが正常か確認

### 問題4: 依存ライブラリが見つからない

**原因**: npm installが実行されていない、またはnode_modulesが含まれていない

**対処法**:
1. ローカルで`npm install`を実行
2. Cloudflare Pagesのビルド設定を確認（Build command: `npm install`）
3. package.jsonに`gtfs-realtime-bindings`と`protobufjs`が含まれているか確認

## ロールバック手順

問題が発生した場合、以下の手順でロールバックできます：

### 方法1: Cloudflare Pagesダッシュボードから

1. Cloudflare Pagesダッシュボードにアクセス
2. プロジェクトを選択
3. "Deployments" タブを開く
4. 以前の正常なデプロイメントを選択
5. "Rollback to this deployment" をクリック

### 方法2: Gitから

```bash
# 以前のコミットに戻す
git revert HEAD

# または特定のコミットに戻す
git reset --hard <commit-hash>

# リモートリポジトリにプッシュ
git push origin main --force
```

### 方法3: 機能の無効化

リアルタイム機能のみを無効化する場合:

1. `js/app.js`でRealtimeVehicleControllerの初期化をコメントアウト
2. GitHubにプッシュして再デプロイ

```javascript
// RealtimeVehicleControllerの初期化をコメントアウト
// const realtimeDataLoader = new RealtimeDataLoader('/api');
// const realtimeVehicleController = new RealtimeVehicleController(
//   mapController,
//   dataLoader,
//   realtimeDataLoader
// );
// await realtimeVehicleController.initialize();
```

## 監視とメンテナンス

### ログの確認

Cloudflare Pagesダッシュボードで以下を確認:

- リクエスト数（/api/vehicle, /api/route, /api/alert）
- エラー率
- レスポンスタイム
- キャッシュヒット率

### 定期的な確認項目

- 佐賀バスオープンデータのURL変更がないか確認
- GTFS-Realtime仕様の更新がないか確認
- 依存ライブラリのセキュリティアップデート

## 参考資料

- [Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/)
- [GTFS-Realtime仕様](https://gtfs.org/realtime/reference/)
- [佐賀バスオープンデータ](http://opendata.sagabus.info/)
- [gtfs-realtime-bindings](https://www.npmjs.com/package/gtfs-realtime-bindings)

## サポート

問題が解決しない場合:

1. GitHubのIssueを作成
2. Cloudflare Pagesのサポートに問い合わせ
3. 佐賀バスオープンデータの提供元に確認
