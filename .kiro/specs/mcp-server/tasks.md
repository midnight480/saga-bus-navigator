# Implementation Plan: MCP Server for Saga Bus Navigator

## Overview

佐賀バスナビゲーターのMCPサーバを実装します。TypeScriptとMCP SDKを使用し、3つのツール（バス停検索、経路検索、始発・終電検索）を提供します。最終的にDocker Hubで配布可能なコンテナイメージを作成します。

## Tasks

- [x] 1. プロジェクトのセットアップ
  - TypeScriptプロジェクトの初期化
  - 必要な依存関係のインストール（@modelcontextprotocol/sdk、typescript、@types/node）
  - tsconfig.jsonの設定（strict mode有効化）
  - package.jsonのビルドスクリプト設定
  - ディレクトリ構造の作成（src/, build/）
  - _Requirements: 7.1, 7.4, 7.5_

- [ ] 2. API Clientの実装
  - [x] 2.1 API Client基本実装
    - ApiClientConfigインターフェースの定義
    - ApiClientクラスの実装（constructor、get メソッド）
    - 環境変数からのAPI_BASE_URL読み込み
    - デフォルトURL設定（https://saga-bus.midnight480.com/api）
    - _Requirements: 4.1, 6.2, 6.3_
  
  - [x] 2.2 タイムアウト処理の実装
    - AbortControllerを使用したタイムアウト実装
    - タイムアウト時のエラーメッセージ生成
    - _Requirements: 4.2_
  
  - [x] 2.3 エラーハンドリングの実装
    - HTTPエラー（非200ステータス）の処理
    - ネットワークエラーの処理
    - エラーメッセージの整形
    - _Requirements: 4.3, 4.4_
  
  - [x] 2.4 レスポンス検証の実装
    - JSONパースとレスポンス構造の検証
    - 型安全なレスポンス返却
    - _Requirements: 4.5_
  
  - [x] 2.5 API Clientのプロパティテスト
    - **Property 4: エラーメッセージの記述性**
    - **Property 5: 環境変数の優先順位**
    - **Property 6: レスポンス検証の実行**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 6.2**

- [x] 3. Checkpoint - API Clientの動作確認
  - 全てのテストが通ることを確認し、質問があればユーザーに確認してください。

- [ ] 4. バス停検索ツールの実装
  - [x] 4.1 型定義とスキーマ
    - SearchBusStopsArgs、BusStop、SearchBusStopsResponseインターフェースの定義
    - searchBusStopsSchemaの定義（MCPツールスキーマ）
    - _Requirements: 1.1, 5.2_
  
  - [x] 4.2 searchBusStops関数の実装
    - パラメータの検証
    - API Clientを使用したAPI呼び出し
    - レスポンスの整形（MCP形式）
    - エラーハンドリング
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 4.3 バス停検索のプロパティテスト
    - **Property 1: ツール呼び出しのAPI転送**
    - **Property 2: パラメータの完全な転送**
    - **Property 3: レスポンス構造の完全性**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ] 5. 経路検索ツールの実装
  - [x] 5.1 型定義とスキーマ
    - SearchRoutesArgs、Route、SearchRoutesResponseインターフェースの定義
    - searchRoutesSchemaの定義（MCPツールスキーマ）
    - _Requirements: 2.1, 5.2_
  
  - [x] 5.2 searchRoutes関数の実装
    - パラメータの検証
    - API Clientを使用したAPI呼び出し
    - レスポンスの整形（MCP形式）
    - エラーハンドリング
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 5.3 経路検索のプロパティテスト
    - **Property 1: ツール呼び出しのAPI転送**
    - **Property 2: パラメータの完全な転送**
    - **Property 3: レスポンス構造の完全性**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

- [ ] 6. 始発・終電検索ツールの実装
  - [x] 6.1 型定義とスキーマ
    - GetFirstLastBusArgs、FirstLastBus、GetFirstLastBusResponseインターフェースの定義
    - getFirstLastBusSchemaの定義（MCPツールスキーマ）
    - _Requirements: 3.1, 5.2_
  
  - [x] 6.2 getFirstLastBus関数の実装
    - パラメータの検証
    - API Clientを使用したAPI呼び出し
    - レスポンスの整形（MCP形式）
    - エラーハンドリング
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 6.3 始発・終電検索のプロパティテスト
    - **Property 1: ツール呼び出しのAPI転送**
    - **Property 2: パラメータの完全な転送**
    - **Property 3: レスポンス構造の完全性**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 7. Checkpoint - 全ツールの動作確認
  - 全てのテストが通ることを確認し、質問があればユーザーに確認してください。

- [ ] 8. MCPサーバの実装
  - [x] 8.1 サーバの初期化
    - Serverインスタンスの作成（name、version、capabilities設定）
    - StdioServerTransportの設定
    - _Requirements: 5.1_
  
  - [x] 8.2 ツール一覧ハンドラの実装
    - ListToolsRequestSchemaハンドラの実装
    - 3つのツールスキーマの登録
    - _Requirements: 5.2_
  
  - [x] 8.3 ツール実行ハンドラの実装
    - CallToolRequestSchemaハンドラの実装
    - ツール名によるルーティング（switch文）
    - 各ツール関数の呼び出し
    - 未知のツールに対するエラー処理
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [x] 8.4 サーバの起動
    - transportとserverの接続
    - エントリーポイントの設定（#!/usr/bin/env node）
    - _Requirements: 5.1_
  
  - [x] 8.5 MCPサーバのプロパティテスト
    - **Property 7: ツールスキーマの完全性**
    - **Property 8: パラメータ検証の実行**
    - **Property 9: MCPレスポンス形式の準拠**
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

- [ ] 9. Dockerコンテナの構築
  - [x] 9.1 Dockerfileの作成
    - Node.js 20 Alpineベースイメージの使用
    - 依存関係のインストール
    - ビルド済みコードのコピー
    - 環境変数のデフォルト値設定
    - CMDでサーバ起動
    - _Requirements: 6.1_
  
  - [x] 9.2 docker-compose.ymlの作成
    - サービス定義（イメージ指定）
    - 環境変数の設定
    - stdin_open、ttyの設定
    - _Requirements: 6.1_
  
  - [x] 9.3 .dockerignoreの作成
    - node_modules、build、テストファイルの除外
    - 不要なファイルの除外

- [ ] 10. ドキュメントの作成
  - [x] 10.1 README.mdの作成
    - プロジェクト概要
    - 機能説明（3つのツール）
    - インストール手順（Docker Hubからのpull）
    - 使用方法（docker-compose、Claude Desktop設定例）
    - 環境変数の説明
    - ライセンス情報
  
  - [x] 10.2 CONTRIBUTING.mdの作成（開発者向け）
    - 開発環境のセットアップ
    - ビルド手順
    - テスト実行方法
    - Docker Hubへのプッシュ手順

- [x] 11. Checkpoint - 最終動作確認
  - 全てのテストが通ることを確認
  - Dockerイメージのビルドが成功することを確認
  - 質問があればユーザーに確認してください。

## Notes

- 全てのタスクが必須です（包括的なテストを最初から実装）
- 各タスクは要件番号を参照しており、トレーサビリティを確保しています
- Checkpointタスクで段階的に検証を行い、問題を早期に発見します
- プロパティテストは正確性プロパティを検証し、ユニットテストは具体例とエッジケースを検証します
