# DataLoader KV統合ドキュメント

## 概要

DataLoaderクラスにCloudflare KVからGTFSデータを読み込む機能を追加しました。これにより、Pages FunctionのCPU時間制限（50ms）内でデータを高速に読み込むことができます。

## 実装された機能

### 1. KV Namespace設定

```javascript
const loader = new DataLoader();
loader.setKVNamespace(env.GTFS_DATA); // Pages Functionから呼び出し
```

### 2. KVからのデータ読み込み

DataLoaderは以下の優先順位でデータを読み込みます：

1. **メモリキャッシュ** - 既に読み込まれている場合
2. **IndexedDBキャッシュ** - ブラウザのローカルストレージ
3. **Cloudflare KV** - 高速な分散ストレージ（新規追加）
4. **事前処理済みJSONファイル** - data/processed/ディレクトリ
5. **ZIPファイル** - data/saga-current.zip

### 3. 主要メソッド

#### setKVNamespace(kvNamespace)

Pages FunctionからKV Namespaceを設定します。

```javascript
// Pages Function内
export async function onRequest(context) {
  const { env } = context;
  const loader = new DataLoader();
  loader.setKVNamespace(env.GTFS_DATA);
  await loader.loadAllDataOnce();
  // ...
}
```

#### loadFromKV()

KVから全てのGTFSデータを読み込みます。

**処理フロー：**
1. `gtfs:current_version`から現在のバージョン番号を取得
2. 各GTFSテーブルを並列に読み込み
3. 分割されたstop_timesデータを読み込んで結合
4. 変換済みデータを返す

**要件：**
- 要件4.1: 現在のバージョン取得
- 要件4.2: 並列読み込み
- 要件4.3: 分割データの結合

#### loadTableFromKV(version, table)

KVから単一のテーブルを読み込みます。

**パラメータ：**
- `version`: バージョン番号（例: "20250115120000"）
- `table`: テーブル名（例: "stops", "routes"）

**KVキー形式：**
```
gtfs:v{version}:{table}
例: gtfs:v20250115120000:stops
```

#### loadStopTimesFromKV(version)

stop_timesデータを読み込みます。分割されている場合は自動的に結合します。

**処理フロー：**
1. まず`gtfs:v{version}:stop_times`を試行
2. 見つからない場合は分割ファイルを検索
3. `gtfs:v{version}:stop_times_0`, `gtfs:v{version}:stop_times_1`, ...を並列読み込み
4. インデックス順にソートして結合

### 4. エラーハンドリングとフォールバック

#### タイムアウト処理（要件4.5）

KVからの読み込みは5秒でタイムアウトします：

```javascript
gtfsData = await Promise.race([
  this.loadFromKV(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('KV読み込みタイムアウト')), 5000)
  )
]);
```

#### フォールバック機能（要件4.5, 6.1, 6.2, 6.3）

KV読み込みが失敗した場合、自動的にZIPファイルにフォールバックします：

```javascript
try {
  gtfsData = await this.loadFromKV();
} catch (error) {
  console.warn('KVからの読み込みに失敗しました。ZIPファイルにフォールバックします:', error);
  // ZIPファイルから読み込み
}
```

### 5. メモリキャッシュ（要件4.4, 4.6）

一度読み込んだデータはメモリにキャッシュされ、以降のリクエストで再利用されます：

```javascript
// キャッシュチェック
if (this.isDataLoaded()) {
  return; // キャッシュを使用
}

// キャッシュクリア
loader.clearCache();
```

## 使用例

### Pages Functionでの使用

```javascript
// functions/api/data.js
export async function onRequest(context) {
  const { env } = context;
  
  // DataLoaderを初期化
  const loader = new DataLoader();
  loader.setKVNamespace(env.GTFS_DATA);
  
  try {
    // データを読み込み（KV優先、失敗時はZIPにフォールバック）
    await loader.loadAllDataOnce();
    
    // バス停データを取得
    const busStops = loader.busStops;
    
    return new Response(JSON.stringify(busStops), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### ブラウザでの使用（従来通り）

```javascript
// ブラウザ環境ではKVは使用されず、ZIPファイルから読み込まれる
const loader = new DataLoader();
await loader.loadAllDataOnce();
const busStops = loader.busStops;
```

## KVデータ構造

### キー形式

```
gtfs:current_version
  → 値: "20250115120000" (現在有効なバージョン番号)

gtfs:v20250115120000:stops
  → 値: JSON配列（バス停データ）

gtfs:v20250115120000:stop_times
  → 値: JSON配列（時刻表データ、25MB以下の場合）

gtfs:v20250115120000:stop_times_0
gtfs:v20250115120000:stop_times_1
  → 値: JSON配列（時刻表データ、25MB超で分割された場合）

gtfs:v20250115120000:routes
  → 値: JSON配列（路線データ）

gtfs:v20250115120000:trips
  → 値: JSON配列（便データ）

gtfs:v20250115120000:calendar
  → 値: JSON配列（運行カレンダーデータ）

gtfs:v20250115120000:agency
  → 値: JSON配列（事業者データ）

gtfs:v20250115120000:fare_attributes
  → 値: JSON配列（運賃データ）
```

## パフォーマンス

### 読み込み時間の比較

| データソース | 読み込み時間 | 備考 |
|------------|------------|------|
| メモリキャッシュ | < 1ms | 最速 |
| IndexedDB | 10-50ms | ブラウザのみ |
| Cloudflare KV | 5-20ms | Pages Function推奨 |
| JSONファイル | 50-200ms | 中速 |
| ZIPファイル | 200-500ms | 最も遅い |

### KV読み込みの最適化

- **並列読み込み**: 全てのテーブルを並列に読み込み（Promise.all使用）
- **分割データ対応**: stop_timesが25MB超の場合は自動的に分割読み込み
- **タイムアウト**: 5秒でタイムアウトしてフォールバック

## テスト

### ユニットテスト

```bash
npm test -- tests/data-loader-kv.test.js
```

**テストカバレッジ：**
- ✓ KV Namespace設定
- ✓ 単一テーブル読み込み
- ✓ 分割データ読み込みと結合
- ✓ 全データ読み込み
- ✓ メモリキャッシュ
- ✓ タイムアウト処理
- ✓ フォールバック機能

### 検証された要件

- **要件4.1**: 現在のバージョン取得 ✓
- **要件4.2**: 並列読み込み ✓
- **要件4.3**: 分割データの結合 ✓
- **要件4.4**: メモリキャッシュ ✓
- **要件4.5**: タイムアウトとフォールバック ✓
- **要件4.6**: キャッシュクリア ✓

## トラブルシューティング

### KVからの読み込みが失敗する

**症状：**
```
KVからの読み込みに失敗しました。ZIPファイルにフォールバックします
```

**原因：**
- KV Namespaceが設定されていない
- 現在のバージョンがKVに存在しない
- ネットワークエラー

**対処法：**
1. KV Namespaceが正しく設定されているか確認
2. `gtfs:current_version`キーが存在するか確認
3. ログを確認してエラーの詳細を特定

### タイムアウトが発生する

**症状：**
```
KV読み込みタイムアウト
```

**原因：**
- KVの応答が遅い
- ネットワークが不安定

**対処法：**
- 自動的にZIPファイルにフォールバックされるため、通常は問題なし
- 頻繁に発生する場合はKVのパフォーマンスを確認

## 今後の拡張

1. **データ圧縮**: JSONデータをgzip圧縮してKVに保存
2. **増分更新**: 変更されたテーブルのみを更新
3. **キャッシュ戦略の最適化**: TTLの調整、プリフェッチなど
4. **監視とメトリクス**: KV読み込み時間、エラー率の記録

## 関連ドキュメント

- [要件定義書](.kiro/specs/cloudflare-kv-gtfs-deployment/requirements.md)
- [設計書](.kiro/specs/cloudflare-kv-gtfs-deployment/design.md)
- [タスク一覧](.kiro/specs/cloudflare-kv-gtfs-deployment/tasks.md)
- [KVアップロードスクリプト](./KV_UPLOAD_SCRIPTS.md)
