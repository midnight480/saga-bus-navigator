# リアルタイム車両追跡機能 デプロイメントチェックリスト

このチェックリストを使用して、リアルタイム車両追跡機能のデプロイメントが正しく完了したことを確認してください。

## デプロイ前チェック

### 1. 依存ライブラリ

- [ ] `gtfs-realtime-bindings@^1.1.0` がpackage.jsonに含まれている
- [ ] `protobufjs@^7.2.5` がpackage.jsonに含まれている
- [ ] `npm install` を実行して依存関係がインストールされている
- [ ] `npm list gtfs-realtime-bindings protobufjs` でインストールを確認

### 2. Cloudflare Functions

- [ ] `functions/api/vehicle.ts` が存在する
- [ ] `functions/api/route.ts` が存在する
- [ ] `functions/api/alert.ts` が存在する
- [ ] 各ファイルにOPTIONSハンドラー（CORSプリフライト）が実装されている
- [ ] 各ファイルにGETハンドラー（データ取得とキャッシュ）が実装されている
- [ ] CORSヘッダーに`Access-Control-Allow-Origin: https://saga-bus.midnight480.com`が設定されている
- [ ] キャッシュヘッダーに`Cache-Control: public, max-age=30, s-maxage=30`が設定されている

### 3. 静的ファイル

- [ ] `js/realtime-data-loader.js` が存在する
- [ ] `js/realtime-vehicle-controller.js` が存在する
- [ ] `index.html` にrealtime-data-loader.jsのスクリプトタグが含まれている
- [ ] `index.html` にrealtime-vehicle-controller.jsのスクリプトタグが含まれている
- [ ] `_headers` ファイルのconnect-srcに`http://opendata.sagabus.info`が含まれている

### 4. ローカルテスト

- [ ] `npm run dev` で開発サーバーが起動する
- [ ] ブラウザで http://localhost:8080 にアクセスできる
- [ ] コンソールに「RealtimeDataLoader initialized」が表示される
- [ ] 30秒後に車両位置情報が更新される
- [ ] エラーが発生していない

### 5. コードレビュー

- [ ] RealtimeDataLoaderのエラーハンドリングが実装されている
- [ ] RealtimeVehicleControllerの車両マーカー管理が実装されている
- [ ] Protocol Buffersのデコード処理が実装されている
- [ ] 静的データとの突合処理が実装されている

## デプロイ実行

### 6. Gitコミット

- [ ] 全ての変更がステージングされている
- [ ] コミットメッセージが適切（例: "feat: リアルタイム車両追跡機能を追加"）
- [ ] `git push origin main` でリモートリポジトリにプッシュ

### 7. Cloudflare Pagesデプロイ

- [ ] Cloudflare Pagesダッシュボードでデプロイが開始された
- [ ] ビルドログにエラーがない
- [ ] デプロイが成功した（緑色のチェックマーク）
- [ ] デプロイ完了時刻を記録: _______________

## デプロイ後チェック

### 8. Cloudflare Functionsの動作確認

#### vehicle.pbエンドポイント

```bash
curl -I https://saga-bus.midnight480.com/api/vehicle
```

- [ ] ステータスコード: 200
- [ ] Content-Type: application/x-protobuf
- [ ] Cache-Control: public, max-age=30, s-maxage=30
- [ ] Access-Control-Allow-Origin: https://saga-bus.midnight480.com

#### route.pbエンドポイント

```bash
curl -I https://saga-bus.midnight480.com/api/route
```

- [ ] ステータスコード: 200
- [ ] Content-Type: application/x-protobuf
- [ ] Cache-Control: public, max-age=30, s-maxage=30
- [ ] Access-Control-Allow-Origin: https://saga-bus.midnight480.com

#### alert.pbエンドポイント

```bash
curl -I https://saga-bus.midnight480.com/api/alert
```

- [ ] ステータスコード: 200
- [ ] Content-Type: application/x-protobuf
- [ ] Cache-Control: public, max-age=30, s-maxage=30
- [ ] Access-Control-Allow-Origin: https://saga-bus.midnight480.com

### 9. クライアントサイドの動作確認

#### 基本動作

- [ ] ブラウザで https://saga-bus.midnight480.com にアクセスできる
- [ ] 地図が正常に表示される
- [ ] 開発者ツールのコンソールを開く
- [ ] 「RealtimeDataLoader initialized」が表示される
- [ ] 「Vehicle positions updated」が表示される（30秒以内）
- [ ] 「Vehicle markers updated」が表示される

#### 車両マーカー表示

- [ ] 地図上に車両マーカー（バスアイコン）が表示される
- [ ] 車両マーカーをクリックすると吹き出しが表示される
- [ ] 吹き出しに運行状態が表示される（運行開始前/定刻通り/遅延/運行終了）
- [ ] 運行状態に応じた色が表示される（黄色/緑色/赤色/黒色）

#### 運行情報表示

- [ ] 運行情報（遅延・運休）がある場合、地図上部に表示される
- [ ] 運休情報は赤色で表示される
- [ ] 遅延情報は黄色で表示される
- [ ] 運行情報カードにheader_textとdescription_textが表示される

#### リアルタイム更新

- [ ] 30秒ごとに車両位置が更新される
- [ ] 車両マーカーの位置が移動する
- [ ] 古い車両マーカー（30秒以上更新なし）が削除される

### 10. エラーハンドリングの確認

#### ネットワークタブ

- [ ] `/api/vehicle` のリクエストが30秒ごとに送信される
- [ ] `/api/route` のリクエストが30秒ごとに送信される
- [ ] `/api/alert` のリクエストが30秒ごとに送信される
- [ ] ステータスコードが200または304（キャッシュヒット）

#### エラーログ

- [ ] コンソールにエラーが表示されていない
- [ ] ネットワークエラーが発生した場合、適切なエラーメッセージが表示される
- [ ] エラー発生後、自動的にリトライされる

### 11. パフォーマンス確認

- [ ] 初回ロード時間が5秒以内
- [ ] 車両マーカーの更新が滑らか
- [ ] メモリリークが発生していない（開発者ツールのメモリプロファイラで確認）
- [ ] CPU使用率が異常に高くない

### 12. セキュリティ確認

- [ ] CSPヘッダーが正しく設定されている
- [ ] CORSヘッダーが正しく設定されている
- [ ] HTTPSで通信されている
- [ ] 外部スクリプトが読み込まれていない

### 13. ブラウザ互換性確認

#### デスクトップ

- [ ] Chrome（最新版）で動作する
- [ ] Firefox（最新版）で動作する
- [ ] Safari（最新版）で動作する
- [ ] Edge（最新版）で動作する

#### モバイル

- [ ] iOS Safari（最新版）で動作する
- [ ] Android Chrome（最新版）で動作する
- [ ] レスポンシブデザインが正しく表示される

### 14. ドキュメント確認

- [ ] `docs/REALTIME_DEPLOYMENT.md` が作成されている
- [ ] `docs/REALTIME_DEPLOYMENT_CHECKLIST.md` が作成されている
- [ ] README.mdにリアルタイム機能の説明が追加されている（必要に応じて）

## トラブルシューティング

### 問題が発生した場合

1. **Cloudflare Functionsが502エラーを返す**
   - [ ] アップストリーム（http://opendata.sagabus.info/vehicle.pb）に直接アクセスして確認
   - [ ] Cloudflare Pagesのログを確認
   - [ ] 一時的な問題の場合、30秒後に自動リトライされる

2. **CORSエラーが発生する**
   - [ ] Cloudflare Functionsのコードで`Access-Control-Allow-Origin`ヘッダーを確認
   - [ ] 本番環境のドメインが正しいか確認

3. **車両マーカーが表示されない**
   - [ ] コンソールでエラーログを確認
   - [ ] `gtfs-realtime-bindings`と`protobufjs`がインストールされているか確認
   - [ ] ネットワークタブで`/api/vehicle`のレスポンスを確認

4. **依存ライブラリが見つからない**
   - [ ] `npm install`を実行
   - [ ] Cloudflare Pagesのビルド設定を確認

## ロールバック手順

問題が解決しない場合、以下の手順でロールバックしてください：

### Cloudflare Pagesダッシュボードから

1. [ ] Cloudflare Pagesダッシュボードにアクセス
2. [ ] プロジェクトを選択
3. [ ] "Deployments" タブを開く
4. [ ] 以前の正常なデプロイメントを選択
5. [ ] "Rollback to this deployment" をクリック
6. [ ] ロールバック完了を確認

### Gitから

```bash
# 以前のコミットに戻す
git revert HEAD
git push origin main
```

## 完了確認

- [ ] 全てのチェック項目が完了した
- [ ] デプロイメント完了日時: _______________
- [ ] デプロイ担当者: _______________
- [ ] レビュー担当者: _______________
- [ ] 承認者: _______________

## 備考

デプロイ時に発生した問題や特記事項を記録してください：

```
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________
```

## 次のステップ

- [ ] 運用監視の設定（Cloudflare Analytics）
- [ ] エラーアラートの設定
- [ ] 定期的な動作確認（週次）
- [ ] ユーザーフィードバックの収集
