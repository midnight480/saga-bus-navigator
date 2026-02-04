#!/bin/bash

# MCP Apps デプロイスクリプト
# 
# このスクリプトは佐賀バスナビゲーターのMCP Apps機能をCloudflare Pagesにデプロイします。

set -e

echo "========================================="
echo "MCP Apps デプロイスクリプト"
echo "========================================="
echo ""

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. 環境チェック
echo "1. 環境チェック..."

if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}エラー: wranglerがインストールされていません${NC}"
    echo "インストール方法: npm install -g wrangler"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}エラー: Node.jsがインストールされていません${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 環境チェック完了${NC}"
echo ""

# 2. KVネームスペースの確認
echo "2. KVネームスペースの確認..."

# wrangler.tomlからRATE_LIMIT_KV IDを取得
RATE_LIMIT_KV_ID=$(grep -A 1 'binding = "RATE_LIMIT_KV"' wrangler.toml | grep 'id =' | cut -d'"' -f2)

if [ "$RATE_LIMIT_KV_ID" == "YOUR_RATE_LIMIT_KV_ID_HERE" ]; then
    echo -e "${YELLOW}警告: RATE_LIMIT_KV IDが設定されていません${NC}"
    echo ""
    echo "以下のコマンドでKVネームスペースを作成してください:"
    echo "  wrangler kv:namespace create \"RATE_LIMIT_KV\""
    echo ""
    echo "作成後、wrangler.tomlのRATE_LIMIT_KV IDを更新してください"
    exit 1
fi

echo -e "${GREEN}✓ KVネームスペース設定確認完了${NC}"
echo ""

# 3. テスト実行
echo "3. テスト実行..."

cd functions
npm test
cd ..

echo -e "${GREEN}✓ 全テスト通過${NC}"
echo ""

# 4. TypeScriptビルド
echo "4. TypeScriptビルド..."

cd functions
npm run build
cd ..

echo -e "${GREEN}✓ ビルド完了${NC}"
echo ""

# 5. デプロイ前確認
echo "5. デプロイ前確認..."
echo ""
echo "以下の設定でデプロイします:"
echo "  - プロジェクト: saga-bus-navigator"
echo "  - エンドポイント: /api/mcp"
echo "  - KVネームスペース: GTFS_DATA, RATE_LIMIT_KV"
echo ""
read -p "デプロイを続行しますか? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "デプロイをキャンセルしました"
    exit 0
fi

# 6. デプロイ実行
echo ""
echo "6. デプロイ実行..."

wrangler pages deploy . --project-name=saga-bus-navigator

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}デプロイ完了!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "MCPエンドポイント:"
echo "  https://saga-bus.midnight480.com/api/mcp"
echo ""
echo "動作確認:"
echo "  curl -X POST https://saga-bus.midnight480.com/api/mcp \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\"}'"
echo ""
echo "ドキュメント:"
echo "  docs/MCP_APPS.md を参照してください"
echo ""
