# E2Eテスト実行ガイド

## 前提条件

E2Eテストを実行する前に、以下の準備が必要です：

### 1. 開発サーバーの起動

E2Eテストは`http://localhost:8788`で実行されている開発サーバーに対してテストを実行します。

```bash
# 開発サーバーを起動（別のターミナルで実行）
npm run dev
```

または

```bash
npx wrangler pages dev . --port 8788
```

### 2. GTFSデータの配置

`data/saga-current.zip`が存在することを確認してください。

```bash
ls -lh data/saga-current.zip
```

## テストの実行

### 全てのE2Eテストを実行

```bash
npm run test:e2e
```

### 特定のテストファイルを実行

```bash
npx playwright test e2e/test-direction-detection-integration.spec.js
```

### 特定のテストケースを実行

```bash
npx playwright test e2e/test-direction-detection-integration.spec.js:4
```

## 方向判定統合テスト

`test-direction-detection-integration.spec.js`は、方向判定機能がDataLoaderに正しく統合されていることを検証します。

### テスト内容

1. **loadAllDataOnce()実行後の検証（要件1.2, 3.4, 5.4）**
   - 全てのtripにdirectionプロパティが設定されていることを確認
   - 時刻表データにdirectionフィールドが含まれることを確認
   - コンソールログに統計情報が出力されることを確認

2. **路線メタデータに方向判定統計が含まれることを確認（要件5.1, 5.2, 5.3）**
   - 路線メタデータに方向判定成功率が含まれることを確認
   - 平均方向判定成功率が妥当な範囲内であることを確認

3. **サンプルデータの方向情報を確認**
   - サンプルTripに方向情報が含まれることを確認
   - サンプル時刻表に方向情報が含まれることを確認

4. **読み込み時間が妥当な範囲内であることを確認**
   - データ読み込み時間が10秒以内であることを確認

### トラブルシューティング

#### エラー: "GTFSデータの解凍に失敗しました"

**原因**: 開発サーバーが起動していないか、GTFSデータファイルが見つかりません。

**解決方法**:
1. 開発サーバーが起動していることを確認
   ```bash
   curl http://localhost:8788/
   ```
2. GTFSデータファイルが存在することを確認
   ```bash
   ls -lh data/saga-current.zip
   ```

#### エラー: "TimeoutError: page.waitForSelector: Timeout exceeded"

**原因**: ページの読み込みに時間がかかりすぎています。

**解決方法**:
1. 開発サーバーが正常に動作していることを確認
2. ネットワーク接続を確認
3. タイムアウト時間を延長
   ```bash
   npx playwright test --timeout=60000
   ```

#### エラー: "CSP violation"

**原因**: Content Security Policyによってインラインスクリプトがブロックされています。

**解決方法**:
- テストHTMLファイルは外部JavaScriptファイルを使用するように修正済みです
- `_headers`ファイルのCSP設定を確認してください

## デバッグ

### ブラウザを表示してテストを実行

```bash
npx playwright test --headed
```

### スローモーションでテストを実行

```bash
npx playwright test --headed --slow-mo=1000
```

### テスト結果のレポートを表示

```bash
npx playwright show-report
```

## 参考資料

- [Playwright公式ドキュメント](https://playwright.dev/)
- [方向判定統合の設計書](.kiro/specs/direction-detection-integration/design.md)
- [方向判定統合の要件定義書](.kiro/specs/direction-detection-integration/requirements.md)
