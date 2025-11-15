# 実装タスクリスト

- [x] 1. JSZipライブラリの統合
  - index.htmlにJSZipのCDNリンクを追加
  - JSZipライブラリの読み込みを確認
  - _要件: 1.2, 1.4_

- [x] 2. GTFSParserクラスの実装
  - [x] 2.1 GTFSParserクラスの基本構造を作成
    - data-loader.js内にGTFSParserクラスを定義
    - parse()静的メソッドのスケルトンを作成
    - parseCSVLine()静的メソッドのスケルトンを作成
    - _要件: 2.1_

  - [x] 2.2 parseCSVLine()メソッドの実装
    - CSV行をパースするロジックを実装
    - ダブルクォート、エスケープ処理を実装
    - カンマ区切りの処理を実装
    - _要件: 2.1_

  - [x] 2.3 parse()メソッドの実装
    - ヘッダー行の抽出
    - データ行のパース
    - オブジェクト配列への変換
    - _要件: 2.1_

- [x] 3. DataTransformerクラスの実装
  - [x] 3.1 DataTransformerクラスの基本構造を作成
    - data-loader.js内にDataTransformerクラスを定義
    - transformStops()静的メソッドのスケルトンを作成
    - transformTimetable()静的メソッドのスケルトンを作成
    - transformFares()静的メソッドのスケルトンを作成
    - createIndex()静的メソッドのスケルトンを作成
    - determineWeekdayType()静的メソッドのスケルトンを作成
    - _要件: 2.2_

  - [x] 3.2 transformStops()メソッドの実装
    - stops.txtのデータを既存形式に変換
    - location_type='0'のバス停のみをフィルタ
    - id, name, lat, lngフィールドを抽出
    - _要件: 2.1_

  - [x] 3.3 createIndex()メソッドの実装
    - 配列からキーでインデックスを作成
    - O(1)検索を実現
    - _要件: 2.2_

  - [x] 3.4 determineWeekdayType()メソッドの実装
    - calendar.txtから曜日区分を判定
    - service_idのキーワード検索
    - 曜日フラグの判定
    - _要件: 2.2_

  - [x] 3.5 transformTimetable()メソッドの実装
    - stop_times.txt、trips.txt、routes.txt、calendar.txt、agency.txtを結合
    - インデックスを使用した高速結合
    - arrival_timeから時と分を抽出
    - 既存形式のオブジェクトに変換
    - _要件: 2.2_

  - [x] 3.6 transformFares()メソッドの実装
    - fare_attributes.txtを既存形式に変換
    - 基本運賃の抽出
    - 小児運賃の計算（大人の半額）
    - _要件: 2.3_

- [x] 4. DataLoaderクラスの拡張
  - [x] 4.1 新しいプロパティの追加
    - gtfsVersionプロパティを追加
    - debugModeプロパティを追加
    - timeoutを5000msに変更
    - _要件: 1.1, 7.4_

  - [x] 4.2 findGTFSZipFile()メソッドの実装
    - ./dataディレクトリ内のsaga-*.zipファイルを検索
    - saga-current.zipを優先的に選択
    - saga-YYYY-MM-DD.zipから最新日付のファイルを選択
    - ファイル名から日付を抽出して降順ソート
    - _要件: 1.1, 5.1, 5.2, 5.3, 5.4_

  - [x] 4.3 loadGTFSZip()メソッドの実装
    - fetchWithTimeout()を使用してZIPファイルを読み込み
    - JSZipを使用してZIPファイルを解凍
    - 読み込んだZIPファイル名とサイズをログ出力
    - _要件: 1.2, 5.5_

  - [x] 4.4 extractGTFSFile()メソッドの実装
    - ZIPアーカイブから特定のファイルを抽出
    - テキストとして読み込み
    - エラーハンドリング
    - _要件: 1.3_

  - [x] 4.5 parseGTFSFiles()メソッドの実装
    - stops.txt、stop_times.txt、routes.txt、trips.txt、calendar.txt、agency.txtを並列で抽出
    - 各ファイルをGTFSParserでパース
    - feed_info.txtからバージョン情報を読み取り
    - パースされたデータをオブジェクトで返す
    - _要件: 1.3, 5.6, 6.1_

  - [x] 4.6 loadBusStops()メソッドの更新
    - キャッシュチェック
    - parseGTFSFiles()を呼び出してGTFSデータを取得
    - DataTransformer.transformStops()でデータを変換
    - キャッシュに保存
    - _要件: 2.1, 2.4, 3.1_

  - [x] 4.7 loadTimetable()メソッドの更新
    - キャッシュチェック
    - parseGTFSFiles()を呼び出してGTFSデータを取得
    - DataTransformer.transformTimetable()でデータを変換
    - キャッシュに保存
    - _要件: 2.2, 2.4, 3.2_

  - [x] 4.8 loadFares()メソッドの更新
    - キャッシュチェック
    - parseGTFSFiles()を呼び出してGTFSデータを取得
    - DataTransformer.transformFares()でデータを変換
    - キャッシュに保存
    - _要件: 2.3, 2.4, 3.3_

  - [x] 4.9 setDebugMode()メソッドの実装
    - デバッグモードの有効/無効を設定
    - _要件: 7.4_

  - [x] 4.10 logDebug()メソッドの実装
    - デバッグモードが有効な場合のみログ出力
    - 読み込み時間、レコード数、進捗状況を出力
    - _要件: 7.1, 7.2, 7.3, 7.5_

- [x] 5. エラーハンドリングの実装
  - [x] 5.1 ZIPファイルが見つからない場合のエラー処理
    - エラーメッセージ「GTFSデータファイル(saga-*.zip)が見つかりません」を表示
    - _要件: 1.6, 4.1_

  - [x] 5.2 ZIPファイルの解凍に失敗した場合のエラー処理
    - エラーメッセージ「GTFSデータの解凍に失敗しました」を表示
    - _要件: 1.7, 4.2_

  - [x] 5.3 GTFSファイルの形式が不正な場合のエラー処理
    - エラーメッセージ「GTFSデータの形式が不正です」を表示
    - 詳細なエラー情報をコンソールに出力
    - _要件: 4.4, 4.5_

  - [x] 5.4 タイムアウトエラーの処理
    - エラーメッセージ「データの読み込みがタイムアウトしました」を表示
    - _要件: 4.2_

  - [x] 5.5 ネットワークエラーの処理
    - エラーメッセージ「ネットワークエラーが発生しました」を表示
    - _要件: 4.3_

- [x] 6. パフォーマンス最適化
  - [x] 6.1 並列読み込みの実装
    - Promise.allを使用してGTFSファイルを並列で読み込み
    - _要件: 6.1_

  - [x] 6.2 不要なデータの除外
    - shapes.txt、translations.txtなどの不要なファイルは読み込まない
    - location_type='0'のバス停のみをフィルタ
    - _要件: 6.3_

  - [x] 6.3 読み込み時間の計測とログ出力
    - 各GTFSファイルの読み込み時間を計測
    - デバッグモードで読み込み時間をログ出力
    - _要件: 7.1_

- [-] 7. 既存機能との互換性テスト
  - [x] 7.1 SearchControllerとの連携テスト
    - 時刻表データの形式が正しいことを確認
    - 検索機能が正常に動作することを確認
    - _要件: 3.1, 3.2_

  - [x] 7.2 UIControllerとの連携テスト
    - バス停データの形式が正しいことを確認
    - オートコンプリート機能が正常に動作することを確認
    - _要件: 3.1, 3.2_

  - [x] 7.3 app.jsのinitializeApp()関数との連携テスト
    - データ読み込みが正常に完了することを確認
    - エラーハンドリングが正常に動作することを確認
    - _要件: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 8. ドキュメントの更新
  - [x] 8.1 README.mdの更新
    - GTFS形式への移行について記載
    - データ更新手順を記載
    - _要件: なし_

  - [x] 8.2 tech.mdの更新
    - データ形式をGTFSに変更
    - 共通コマンドを更新
    - _要件: なし_

  - [x] 8.3 structure.mdの更新
    - ディレクトリ構造を更新
    - データファイルの役割を更新
    - _要件: なし_
