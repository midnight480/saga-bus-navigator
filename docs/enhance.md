# 改善案

点検で見つかった問題と修正方針を、日付ごとに記録する。新しい点検は、この見出しのすぐ下に日付の見出しを足して追記する。実装はこの文書をもとに別途行い、終わった項目には対応した PR を書き添える。

## 2026-10-20 不要なアクセスへの応答と公開範囲の見直し

### 共通の方針

想定していないパスへのアクセスには 404 を返す。わざと 200 で偽のデータを返すハニーポットは作らない。存在しないパスに 200 でトップページを返すと、検索エンジンにソフト 404 と判定され、ログでもスキャナと正常なアクセスの区別がつかなくなるためである。401 や 403 は「そこに何かある」と相手に教えるので、認証の内側でない限り使わない。

### 経緯

Cloudflare のログで、`.env` や `phpinfo.php`、`.git/HEAD` などを探す自動スキャナのリクエストに 200 が返っているのが見つかった。調べると、200 の正体はトップページの HTML で、秘密情報が漏れていたわけではなかった。一方で、その過程で次の問題が見つかった。

| 優先度 | 問題 | 影響 |
| --- | --- | --- |
| 高 | リポジトリのルートがそのまま公開されている | 設定ファイルや設計書を誰でも取得できる |
| 高 | `/deploy-hook` が認証なしで POST を受け付ける | 本番の Cloudflare API トークンを使う処理を外部から起動できる |
| 高 | `/api/translate` を誰でも呼べる | AWS Translate の利用料を第三者に使われうる |
| 中 | 存在しないパスに 200 でトップページを返す | スキャナに「何かある」と思わせ、ログの判別も難しくなる |
| 中 | デバッグ用 API が本番に残っている | KV の中身の一部とバージョンが外から見える |
| 中 | ORS の API キーを `/runtime-env.js` で配っている | キーを抜かれて無料枠を使い切られうる |
| 低 | Preview 環境が本番の KV を共有している | 現状は読み取りのみだが、将来書き込みが入ると事故になる |

以下、上から順に方針を書く。

### 1. 公開するファイルを限定する（優先度: 高）

#### 現状

`wrangler.toml` が `pages_build_output_dir = "."` になっており、Git で管理しているファイルがほぼすべて配信されている。点検時点で、`package.json`、`wrangler.toml`（KV の namespace ID を含む）、`README.md`、`.github/workflows/guard.yml`、`.coderabbit.yaml`、`.gitignore`、`.dev.vars.example`、`.kiro/specs/` 以下の設計書、`mcp-server/package.json` が本番で 200 を返すことを確認した。`.agents/`、`tests/`、`scripts/` 以下も同じく公開されているとみてよい。

`.dev.vars` は `.gitignore` に入っているので、Git 連携のデプロイには含まれない。ただし、手元から `wrangler pages deploy .` を実行すると含まれてしまう。

#### 方針

公開するファイルを許可リストで列挙し、ビルド時に `dist/` へコピーする。出力先を `dist/` に変える。

`index.html`、`manifest.json`、`js/*.js` の参照先を調べたところ、フロントエンドが使っているのは `index.html`、`manifest.json`、`_headers`、`css/`（`css/images/` の Leaflet 用画像を含む）、`js/`、`data/`、`icons/` の画像だけだった。`js/` には `translations/`、`i18n/`、`gtfs-realtime.proto` も含まれる。`data/` からは `bus_stops_mapping.csv`、`route_names_mapping.csv`、`saga-current.zip` と、ローカルで生成した `processed/` を読む。`icons/` には生成用の `.sh` と説明の `.md` も入っているので、画像（`.png`、`.ico`）だけを公開する。

注意: `data/processed/` は `.gitignore` 対象で、本番のビルドコマンドも前処理を実行しないため、Git 連携のデプロイには存在しない。フロント（`data-loader.js`）は `data/processed/metadata.json` が取れないとき `saga-current.zip` にフォールバックするので、本番は既に ZIP 経由で動いている。許可リストでは `data/processed/` を「あればコピー」の任意扱いにしないと、CI のビルドが必ず失敗する。

`gtfs-json/` と `docs/` はフロントから参照されていないので、公開しない。`functions/` は Pages がリポジトリのルートから読むので、`dist/` に入れなくてよい。

#### 作業内容

1. `scripts/build-dist.js` を作る。`dist/` を消してから作り直し、上の許可リストだけをコピーする。必須ファイル（`index.html`、`manifest.json`、`_headers` など）が存在しなければエラーで止める。`data/processed/` はローカル生成物で Git に入らないため、存在するときだけコピーする。
2. `wrangler.toml` の `pages_build_output_dir` を `"dist"` にする。
3. `package.json` の `build` を、`dist/` の作成と `functions/` の `npm install` を両方行う形にする。`dev` は `dist/` を作ってから `wrangler pages dev dist --port 8788` を起動する。
4. `.gitignore` の `dist/` は既に除外済みなので変更不要。
5. Cloudflare ダッシュボードで、ビルドコマンドを `npm run build` に変える。現在は `cd functions && npm install --omit=dev && cd ..` になっている。この変更はダッシュボードかAPIで行う必要があり、コードの変更だけでは反映されない。
6. `docs/GTFS_PREPROCESSING.md`、`docs/TRANSLATION_SETUP.md`、`e2e/README.md`、`README.md` にある `wrangler pages dev .` と `pages_build_output_dir = "."` の記述を更新する。`docs/deployment/CLOUDFLARE_BUILD_CONFIG.md` もビルドコマンドと出力ディレクトリ `.` を記録しているので、同じ PR で直す。なお `tests/wrangler-dev-environment.property.test.js` は `dev` スクリプトに `wrangler pages dev` と `8788` が含まれることだけを検査しているので、`wrangler pages dev dist --port 8788` への変更でも壊れない。

#### 確認方法

- [ ] 本番で `/package.json`、`/wrangler.toml`、`/.gitignore`、`/.kiro/specs/aws-migration/design.md` が 404 になる
- [ ] 本番で `/`、`/js/app.js`、`/data/saga-current.zip`、`/icons/icon-192.png`、`/manifest.json` が 200 になる
- [ ] `_headers` のセキュリティヘッダー（CSP など）が引き続き付いている
- [ ] `npm test` と `npm run test:e2e` が通る

### 2. `/deploy-hook` を削除する（優先度: 高）

#### 現状

`functions/deploy-hook.js` は、`DEPLOY_HOOK_SECRET` が未設定だと認証を省略する作りになっている。本番環境には `DEPLOY_HOOK_SECRET` が設定されておらず、`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`KV_NAMESPACE_ID` は設定されている。GET で 405 が返るので、エンドポイント自体は本番で生きている。

このファイルは `require('../scripts/...')` とファイルシステムに依存しており、Workers のランタイムで設計どおりに動くとは考えにくい。GTFS の KV 更新は `scripts/upload_to_kv.js` をローカルや CI から実行する運用になっているので、Pages Functions として残す理由がない。

#### 作業内容

1. `functions/deploy-hook.js` と `functions/tests/unit/deploy-hook.test.ts` を削除する。
2. Pages の本番環境変数から `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`KV_NAMESPACE_ID` を削除する。Functions のコードでこれらを参照しているのは `deploy-hook.js` だけであることを確認済み。
3. 削除したトークンが他で使われていなければ、Cloudflare のダッシュボードでトークン自体も失効させる。
4. ドキュメント中の `deploy-hook` への言及を整理する。対象は `docs/deployment/KV_DEPLOYMENT.md`（`/api/deploy-hook` という実在しないパスで言及している。実際のエンドポイントは `/deploy-hook`）と、`.kiro/specs/cloudflare-kv-gtfs-deployment/` 以下の設計書とタスク。

#### 確認方法

- [ ] 本番で `/deploy-hook` が 404 になる
- [ ] Pages の本番環境変数に Cloudflare の API トークンが残っていない

### 3. `/api/translate` を自サイト専用にする（優先度: 高）

#### 現状

`functions/api/translate.ts` は `Access-Control-Allow-Origin: *` を返し、送信元を確認していない。翻訳元と翻訳先の言語も自由に指定でき、1 回あたり 5,000 文字まで受け付ける。誰でも curl で叩けば、こちらの AWS アカウントで翻訳を実行できる。

フロントエンド（`js/translation-service.js`）が使うのは、運行情報の日本語から英語への翻訳だけである。

#### 方針

ブラウザ以外からの呼び出しを完全には防げないので、いくつかの対策を重ねる。

1. CORS の許可元を `https://saga-bus.midnight480.com` と `https://bus.saga-city.link` に絞る。`Access-Control-Allow-Origin` は値を 1 つしか返せないので、リクエストの `Origin` を許可リストと照合して一致した値をそのまま返し、`Vary: Origin` を付ける方式にする。なお `vehicle.ts`、`route.ts`、`alert.ts` は `saga-bus.midnight480.com` だけを固定で返しており、`bus.saga-city.link` は入っていない。フロントは同一オリジンで呼ぶため実害はないが、揃えるかどうかは別途決める。
2. `Origin` ヘッダーを確認し、許可リストにないオリジンからの POST は 403 で断る。`Origin` がない場合は `Sec-Fetch-Site` を見て `same-origin` 以外を断り、どちらのヘッダーも無いリクエスト（curl など）も 403 にする。ローカル開発のために `localhost` は許可する。OPTIONS のプリフライトも同じ許可リストで応答する。
3. 言語の組み合わせを `ja` から `en` に固定する。リクエストで指定された値は使わない。
4. 文字数の上限を、運行情報の実際の長さに合わせて下げる（目安は 1,000 文字）。
5. 翻訳結果を、入力テキストのハッシュをキーにして Cache API に保存する。同じ運行情報の翻訳を繰り返さないようにするためで、コスト削減にもなる。
6. Cloudflare の WAF で、`/api/translate` に IP 単位のレート制限をかける（コードの外の作業）。

AWS 側では、IAM ユーザーの権限が `translate:TranslateText` だけになっているかと、AWS Budgets で月額の上限アラートを設定しているかを確認する。

#### 確認方法

- [ ] 自サイトの画面から運行情報の英訳が従来どおり表示される
- [ ] `Origin` を付けない curl や、別オリジンからの POST が 403 になる
- [ ] `targetLanguage` に `fr` などを指定しても英訳しか返らない

### 4. 存在しないパスには 404 を返す（優先度: 中）

#### 現状

Cloudflare Pages は、出力先の直下に `404.html` がないと SPA モードとして動き、知らないパスにはすべて `index.html` を 200 で返す。このアプリは `history.pushState` を使っておらず、パスによる画面遷移もないので、SPA フォールバックは不要である。`data/processed/` 配下への fetch も、現状は `index.html` が返って JSON パースに失敗し ZIP へフォールバックしているので、404 に変わっても挙動は同じである。

#### 作業内容

`404.html` を作り、許可リストに加える。中身は日本語と英語の短い案内とトップへのリンクにし、`<meta name="robots" content="noindex">` を付ける。

#### 確認方法

- [ ] 本番で `/zz-nonexistent`、`/test.php`、`/.env` が 404 になる
- [ ] `/?stop=...` のようなクエリ付きの URL は従来どおり動く

### 5. デバッグ用 API を削除する（優先度: 中）

`functions/api/test-kv.ts` と `functions/api/routes-test.ts` は動作確認用のエンドポイントで、本番では不要である。`test-kv` は KV の現在のバージョンとバス停データの先頭 5 件を、`Access-Control-Allow-Origin: *` 付きで返している。どちらも他のコードやテストからは参照されていないので、削除する。

ついでに、同じくフロントから参照されていない `functions/api/stops-simple.ts`（`/api/stops/search` と機能が重複する簡易版）と `functions/api/health.ts`（`status: ok` を返すだけ）も要否を確認し、不要なら同じ PR で削除する。

#### 確認方法

- [ ] 本番で `/api/test-kv` と `/api/routes-test` が 404 になる
- [ ] 削除した場合は `/api/stops-simple` と `/api/health` も 404 になる

### 6. ORS の API キーをブラウザに渡さない（優先度: 中）

#### 現状

`functions/runtime-env.js.ts` が、本番の `ORS_API_KEY` を JavaScript として誰にでも返している。コードのコメントにも「完全秘匿はできない」とある。無料枠（1 日 2,000 リクエスト）を第三者に使い切られると、経路描画が直線のフォールバックになる。

#### 方針

ORS への問い合わせを Pages Functions 経由にして、キーをサーバー側だけに置く。

1. `functions/api/ors/` に、フロントが使っている ORS のエンドポイントだけを中継するプロキシを作る。`js/ors-client.js` が実際に使っているのは `POST /v2/directions/{profile}/geojson` だけなので、中継先はそこに固定し、任意の URL へは転送しない。プロキシ側で `Authorization` ヘッダーにキーを付ける。
2. プロキシにも 3 と同じ送信元チェックを入れる。
3. `js/ors-client.js` と `js/ors-config.js` の宛先をプロキシに変え、`runtime-env.js` の読み込みを `index.html` から外す。
4. `functions/runtime-env.js.ts` を削除し、`_headers` の CSP にある `connect-src` から `https://api.openrouteservice.org` を外す。
5. 切り替えが終わったら、ORS のダッシュボードで API キーを再発行する。現在のキーは公開済みとみなす。

この項目は機能の変更を伴うので、他の項目とは別の PR にしてよい。

#### 確認方法

- [ ] 本番で `/runtime-env.js` が 404 になる
- [ ] 経路の描画が従来どおり道路に沿って表示される
- [ ] ブラウザの開発者ツールで、ORS のキーがどこにも現れない

### 7. Preview 環境の KV を分ける（優先度: 低）

Preview 環境も本番と同じ KV namespace（`3ae3f515...`）を使っている。Preview は全ブランチで自動作成される設定なので、どのブランチのコードも本番の KV に触れる。現在の Functions は KV を読むだけだが、MCP のレート制限（`RATE_LIMIT_KV`）など書き込みが入ると危ない。Preview 用の KV を別に作るか、Preview を作るブランチを絞る。

### 参考: ゾーン全体での対策

`midnight480.com` の WAF にカスタムルールを 1 本入れると、各アプリを触らずにスキャナをまとめて遮断できる。たとえば、パスに `/.env`、`/.git`、`/.aws`、`.php` を含むリクエストをブロックする。このアプリ以外に `saga-sake-fes-navi` も同じ SPA フォールバックで 200 を返しているので、ゾーン側の対策も合わせて検討する。
