# ORS設定ファイル ドキュメント

## 概要

`js/ors-config.js` は、OpenRouteService (ORS) APIを使用した経路描画機能の設定を管理するファイルです。

## 設定項目

### `baseUrl`

- **型**: `string`
- **デフォルト値**: `'https://api.openrouteservice.org/v2'`
- **説明**: ORS Directions APIのベースURL
- **要件**: 10.2

### `profile`

- **型**: `string`
- **デフォルト値**: `'driving-car'`
- **説明**: ルーティングプロファイル。以下の値が使用可能:
  - `'driving-car'`: 自動車用（デフォルト）
  - `'foot-walking'`: 徒歩用
  - `'cycling-regular'`: 自転車用
  - その他ORS APIでサポートされているプロファイル
- **要件**: 10.3

### `cacheTtlMs`

- **型**: `number`
- **デフォルト値**: `24 * 60 * 60 * 1000` (24時間、ミリ秒)
- **説明**: キャッシュの有効期限（Time To Live）。この時間が経過すると、キャッシュされた経路データは無効となり、再取得されます。
- **要件**: 10.4

### `rateLimitPerMinute`

- **型**: `number`
- **デフォルト値**: `40`
- **説明**: 1分あたりの最大リクエスト数（ORS無料プランの制限）
- **要件**: 3.2

### `rateLimitPerDay`

- **型**: `number`
- **デフォルト値**: `2000`
- **説明**: 1日あたりの最大リクエスト数（ORS無料プランの制限）
- **要件**: 3.1

### `maxCoordinatesPerRequest`

- **型**: `number`
- **デフォルト値**: `50`
- **説明**: 1回のORS APIリクエストで送信する座標点の最大数。この値を超える座標がある場合、自動的に分割されます。
- **要件**: 9.5

### `debounceMs`

- **型**: `number`
- **デフォルト値**: `300`
- **説明**: 連続する経路リクエストをデバウンスする時間（ミリ秒）。この時間内に複数のリクエストが発生した場合、最後のリクエストのみが実行されます。
- **要件**: 9.3

### `hideRouteBelowZoom`

- **型**: `number`
- **デフォルト値**: `12`
- **説明**: このズームレベル未満では経路を非表示にします。地図をズームアウトした際に、詳細な経路描画を非表示にしてパフォーマンスを向上させます。
- **要件**: 5.4

### `maxWaitOnMinuteLimitMs`

- **型**: `number`
- **デフォルト値**: `4000`
- **説明**: 分次レート制限に達した場合の最大待機時間（ミリ秒）。`0` を指定すると待機しません。
- **要件**: 3.4

### `enabled`

- **型**: `boolean`
- **デフォルト値**: `true`（`apiKey`が設定されている場合）、`false`（`apiKey`が未設定の場合）
- **説明**: ORS経路描画機能の有効/無効フラグ。`apiKey`が設定されていない場合、自動的に`false`になります。
- **要件**: 10.1

### `apiKey`

- **型**: `string | null`
- **デフォルト値**: `null`
- **説明**: ORS APIキー。`.dev.vars`またはCloudflare Pages環境変数から`runtime-env.js`経由で注入されます。
- **設定方法**: 
  - ローカル開発: `.dev.vars`に`ORS_API_KEY=your-api-key`を設定
  - 本番環境: Cloudflare Pagesダッシュボードで環境変数`ORS_API_KEY`を設定
- **要件**: 10.1

## 設定の変更方法

### ローカル開発環境

1. `.dev.vars`ファイルを編集:
   ```bash
   ORS_API_KEY=your-api-key
   ```

2. `js/ors-config.js`の`DEFAULTS`オブジェクトを編集して、その他の設定を変更できます。

### 本番環境

1. Cloudflare Pagesダッシュボードで環境変数`ORS_API_KEY`を設定
2. その他の設定は`js/ors-config.js`の`DEFAULTS`を編集してデプロイ

## デフォルト値の一覧

| 設定項目 | デフォルト値 | 説明 |
|---------|------------|------|
| `baseUrl` | `'https://api.openrouteservice.org/v2'` | ORS APIベースURL |
| `profile` | `'driving-car'` | ルーティングプロファイル |
| `cacheTtlMs` | `86400000` (24時間) | キャッシュ有効期限 |
| `rateLimitPerMinute` | `40` | 分次レート制限 |
| `rateLimitPerDay` | `2000` | 日次レート制限 |
| `maxCoordinatesPerRequest` | `50` | 1リクエストあたりの座標点数上限 |
| `debounceMs` | `300` | デバウンス時間 |
| `hideRouteBelowZoom` | `12` | 経路非表示のズーム閾値 |
| `maxWaitOnMinuteLimitMs` | `4000` | 分次レート制限時の最大待機時間 |
| `enabled` | `true` (apiKey設定時) / `false` (apiKey未設定時) | 機能有効フラグ |
| `apiKey` | `null` | ORS APIキー |

## 注意事項

- `apiKey`が設定されていない場合、ORS経路描画機能は自動的に無効化され、フォールバックとして直線経路が表示されます。
- レート制限を超えると、エラーメッセージが表示され、フォールバック（直線描画）が使用されます。
- キャッシュはブラウザの`localStorage`に保存されます。ユーザーがブラウザのデータをクリアすると、キャッシュも削除されます。

## 関連ドキュメント

- [ORS_INTEGRATION.md](./ORS_INTEGRATION.md) - ORS統合の詳細ドキュメント
- [API.md](./API.md) - API仕様
