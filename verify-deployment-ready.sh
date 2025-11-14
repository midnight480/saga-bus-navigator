#!/bin/bash

# デプロイ準備確認スクリプト
# このスクリプトは、Cloudflare Pagesへのデプロイ前に必要なファイルが揃っているか確認します

echo "🔍 デプロイ準備確認を開始します..."
echo ""

# カラー定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック結果カウンター
PASS=0
FAIL=0
WARN=0

# 必須ファイルのチェック
echo "📁 必須ファイルの確認..."

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 が見つかりません"
        ((FAIL++))
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1/ が見つかりません"
        ((FAIL++))
    fi
}

# HTMLファイル
check_file "index.html"

# 設定ファイル
check_file "manifest.json"
check_file "_headers"

# CSSファイル
check_dir "css"
check_file "css/app.css"

# JavaScriptファイル
check_dir "js"
check_file "js/app.js"
check_file "js/data-loader.js"
check_file "js/utils.js"

# アイコンファイル
check_dir "icons"
check_file "icons/favicon.ico"
check_file "icons/favicon-16x16.png"
check_file "icons/favicon-32x32.png"
check_file "icons/apple-touch-icon.png"
check_file "icons/icon-192.png"
check_file "icons/icon-512.png"

# データファイル
check_dir "data"
check_dir "data/master"
check_dir "data/timetable"
check_dir "data/fare"
check_file "data/master/bus_stop.csv"
check_file "data/timetable/timetable_all_complete.csv"
check_file "data/fare/fare_major_routes.csv"

echo ""
echo "📄 ドキュメントの確認..."
check_file "README.md"
check_file "DEPLOYMENT.md"
check_file "DEPLOYMENT_CHECKLIST.md"
check_file "QUICKSTART_DEPLOY.md"

echo ""
echo "🔧 Git状態の確認..."

# Gitの状態確認
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Gitリポジトリが初期化されています"
    ((PASS++))
    
    # 現在のブランチ
    BRANCH=$(git branch --show-current)
    echo "  現在のブランチ: $BRANCH"
    
    # コミットされていない変更
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${GREEN}✓${NC} 全ての変更がコミットされています"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} コミットされていない変更があります"
        ((WARN++))
        git status --short
    fi
    
    # リモートリポジトリの確認
    if git remote -v | grep -q "origin"; then
        echo -e "${GREEN}✓${NC} リモートリポジトリが設定されています"
        ((PASS++))
        git remote -v | head -2
    else
        echo -e "${RED}✗${NC} リモートリポジトリが設定されていません"
        ((FAIL++))
    fi
else
    echo -e "${RED}✗${NC} Gitリポジトリが初期化されていません"
    ((FAIL++))
fi

echo ""
echo "📊 結果サマリー"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✓ 成功: $PASS${NC}"
if [ $WARN -gt 0 ]; then
    echo -e "${YELLOW}⚠ 警告: $WARN${NC}"
fi
if [ $FAIL -gt 0 ]; then
    echo -e "${RED}✗ 失敗: $FAIL${NC}"
fi
echo ""

# 最終判定
if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 デプロイ準備が完了しています！${NC}"
    echo ""
    echo "次のステップ:"
    echo "1. QUICKSTART_DEPLOY.md を参照してCloudflare Pagesにデプロイ"
    echo "2. または DEPLOYMENT.md で詳細な手順を確認"
    echo ""
    exit 0
else
    echo -e "${RED}❌ デプロイ準備が完了していません${NC}"
    echo ""
    echo "不足しているファイルを確認して、再度実行してください。"
    echo ""
    exit 1
fi
