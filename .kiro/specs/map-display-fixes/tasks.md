# 実装タスクリスト

- [x] 1. Leafletライブラリファイルのダウンロードと配置
  - Leaflet v1.9.4とLeaflet.markercluster v1.5.3のファイルをダウンロードし、適切なディレクトリに配置する
  - JavaScriptファイル（leaflet.js, leaflet.markercluster.js）を`js/`ディレクトリに配置
  - CSSファイル（leaflet.css, MarkerCluster.css, MarkerCluster.Default.css）を`css/`ディレクトリに配置
  - _要件: 1.1, 1.2, 1.3, 1.4_

- [x] 2. index.htmlのCDNリンクをローカルパスに変更
  - `<link>`タグのLeaflet CSSリンクをローカルパス（/css/leaflet.css等）に変更
  - `<script>`タグのLeaflet JavaScriptリンクをローカルパス（/js/leaflet.js等）に変更
  - `integrity`属性と`crossorigin`属性を削除
  - _要件: 1.1, 1.2, 1.3, 1.4_

- [x] 3. _headersファイルのCSPポリシーを更新
  - `img-src`ディレクティブに`https://tile.openstreetmap.org`と`https://tile.openstreetmap.fr`を追加
  - 地図タイル画像の読み込みを許可する
  - _要件: 1.5_

- [x] 4. map-controller.jsの経路矢印の角度計算を修正
  - `displayRoute`メソッド内の角度計算式を修正
  - `Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI + 90`を`Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI`に変更
  - コメントを追加して、座標系と角度計算の関係を明確にする
  - _要件: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 5. ローカル環境でのテスト実行
  - 開発サーバーを起動してアプリケーションを確認
  - ブラウザのコンソールでCSP違反エラーがないことを確認
  - 地図が正常に表示されることを確認
  - 検索結果から「地図で表示」を選択し、経路矢印が正しい方向を示すことを確認
  - 複数の方向（北、東、南、西）の経路で矢印の向きを確認
  - _要件: 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_
