# CORS対応実装ドキュメント

## 概要

佐賀バスナビゲーターのPublic APIエンドポイントに、CORS（Cross-Origin Resource Sharing）対応を実装しました。これにより、異なるドメインからAPIを利用できるようになります。

## 実装内容

### 対象エンドポイント

以下の3つのAPIエンドポイントにOPTIONSリクエストハンドラーを実装しました：

1. **バス停検索API**: `/api/stops/search`
2. **経路検索API**: `/api/routes/search`
3. **始発・終電検索API**: `/api/stops/first-last`

### OPTIONSハンドラーの実装

各エンドポイントに以下のOPTIONSハンドラーを追加：

```typescript
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
```

### CORSヘッダー

#### プリフライトリクエスト（OPTIONS）

- **ステータスコード**: 204 No Content
- **Access-Control-Allow-Origin**: `*` - 全てのオリジンからのアクセスを許可
- **Access-Control-Allow-Methods**: `GET, OPTIONS` - 許可されるHTTPメソッド
- **Access-Control-Allow-Headers**: `Content-Type` - 許可されるリクエストヘッダー

#### 実際のリクエスト（GET）

全てのGETリクエストのレスポンスに以下のヘッダーを含めています：

- **Access-Control-Allow-Origin**: `*` - 全てのオリジンからのアクセスを許可

## 要件との対応

### 要件5.1: クロスオリジンリクエストへの対応

✅ 全てのAPIエンドポイントが適切なCORSヘッダーを返します。

### 要件5.2: プリフライトリクエストへの対応

✅ OPTIONSメソッドのハンドラーを実装し、許可されたメソッドとヘッダーを返します。

### 要件5.3: Access-Control-Allow-Origin ヘッダー

✅ 全てのレスポンスに `Access-Control-Allow-Origin: *` を含めています。

### 要件5.4: Access-Control-Allow-Methods ヘッダー

✅ プリフライトレスポンスに `Access-Control-Allow-Methods: GET, OPTIONS` を含めています。

### 要件5.5: Access-Control-Allow-Headers ヘッダー

✅ プリフライトレスポンスに `Access-Control-Allow-Headers: Content-Type` を含めています。

## 使用例

### JavaScriptからのAPIコール

```javascript
// 異なるドメインからのAPIコール
fetch('https://saga-bus-navigator.pages.dev/api/stops/search?q=佐賀駅')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));
```

### curlでのプリフライトリクエスト確認

```bash
# プリフライトリクエスト（OPTIONS）
curl -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  https://saga-bus-navigator.pages.dev/api/stops/search

# 実際のGETリクエスト
curl -X GET \
  -H "Origin: https://example.com" \
  -v \
  "https://saga-bus-navigator.pages.dev/api/stops/search?q=佐賀駅"
```

## テスト

### 単体テスト

`tests/api-cors.test.ts` にCORS対応の検証テストを実装しました。

テスト項目：
- OPTIONSハンドラーが正しいCORSヘッダーを返すことを確認
- GETリクエストのレスポンスにCORSヘッダーが含まれることを確認
- 要件5.1〜5.5の全てを検証

### テスト実行

```bash
npm test -- tests/api-cors.test.ts
```

全てのテストが通過することを確認済みです。

## セキュリティ考慮事項

### Access-Control-Allow-Origin: *

現在の実装では全てのオリジンからのアクセスを許可しています（`*`）。これは以下の理由によります：

1. **Public API**: このAPIは公開APIとして設計されており、誰でも利用可能
2. **認証不要**: 現在のバージョンでは認証機能を実装していない
3. **読み取り専用**: 全てのエンドポイントがGETメソッドのみで、データの変更は行わない

### 将来の改善案

認証機能を実装する場合は、以下の対応を検討：

1. **オリジンの制限**: 特定のドメインのみを許可
2. **認証トークン**: APIキーまたはJWTトークンによる認証
3. **レート制限**: IPアドレスごとのリクエスト数制限

## まとめ

- ✅ 全てのAPIエンドポイントにOPTIONSハンドラーを実装
- ✅ 適切なCORSヘッダーを設定
- ✅ 要件5.1〜5.5を全て満たす
- ✅ 単体テストで動作を検証
- ✅ 異なるドメインからのAPIコールが可能

これにより、外部のWebアプリケーションやモバイルアプリから佐賀バスナビゲーターのAPIを利用できるようになりました。
