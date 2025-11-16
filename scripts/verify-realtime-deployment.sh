#!/bin/bash

# リアルタイム車両追跡機能のデプロイメント準備確認スクリプト

set -e

echo "=========================================="
echo "リアルタイム車両追跡機能"
echo "デプロイメント準備確認"
echo "=========================================="
echo ""

# カラーコード
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# チェック結果カウンター
PASSED=0
FAILED=0
WARNINGS=0

# チェック関数
check_file() {
  local file=$1
  local description=$2
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description: $file"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $description: $file が見つかりません"
    ((FAILED++))
    return 1
  fi
}

check_directory() {
  local dir=$1
  local description=$2
  
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✓${NC} $description: $dir"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $description: $dir が見つかりません"
    ((FAILED++))
    return 1
  fi
}

check_npm_package() {
  local package=$1
  local description=$2
  
  if npm list "$package" > /dev/null 2>&1; then
    local version=$(npm list "$package" --depth=0 2>/dev/null | grep "$package" | awk '{print $2}')
    echo -e "${GREEN}✓${NC} $description: $package@$version"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $description: $package がインストールされていません"
    ((FAILED++))
    return 1
  fi
}

check_file_content() {
  local file=$1
  local pattern=$2
  local description=$3
  
  if [ -f "$file" ] && grep -q "$pattern" "$file"; then
    echo -e "${GREEN}✓${NC} $description"
    ((PASSED++))
    return 0
  else
    echo -e "${RED}✗${NC} $description: $file に '$pattern' が見つかりません"
    ((FAILED++))
    return 1
  fi
}

echo "1. 依存ライブラリの確認"
echo "----------------------------------------"
check_npm_package "gtfs-realtime-bindings" "gtfs-realtime-bindings"
check_npm_package "protobufjs" "protobufjs"
echo ""

echo "2. Cloudflare Functionsの確認"
echo "----------------------------------------"
check_directory "functions/api" "functions/apiディレクトリ"
check_file "functions/api/vehicle.ts" "vehicle.pbプロキシ"
check_file "functions/api/route.ts" "route.pbプロキシ"
check_file "functions/api/alert.ts" "alert.pbプロキシ"

# CORSヘッダーの確認
check_file_content "functions/api/vehicle.ts" "Access-Control-Allow-Origin" "vehicle.ts: CORSヘッダー設定"
check_file_content "functions/api/route.ts" "Access-Control-Allow-Origin" "route.ts: CORSヘッダー設定"
check_file_content "functions/api/alert.ts" "Access-Control-Allow-Origin" "alert.ts: CORSヘッダー設定"

# キャッシュヘッダーの確認
check_file_content "functions/api/vehicle.ts" "max-age=30" "vehicle.ts: キャッシュヘッダー設定"
check_file_content "functions/api/route.ts" "max-age=30" "route.ts: キャッシュヘッダー設定"
check_file_content "functions/api/alert.ts" "max-age=30" "alert.ts: キャッシュヘッダー設定"
echo ""

echo "3. 静的ファイルの確認"
echo "----------------------------------------"
check_file "js/realtime-data-loader.js" "RealtimeDataLoader"
check_file "js/realtime-vehicle-controller.js" "RealtimeVehicleController"
check_file "index.html" "index.html"
check_file "_headers" "セキュリティヘッダー設定"

# スクリプトタグの確認
check_file_content "index.html" "realtime-data-loader.js" "index.html: realtime-data-loader.jsのスクリプトタグ"
check_file_content "index.html" "realtime-vehicle-controller.js" "index.html: realtime-vehicle-controller.jsのスクリプトタグ"

# CSPヘッダーの確認
check_file_content "_headers" "http://opendata.sagabus.info" "_headers: connect-srcディレクティブ"
echo ""

echo "4. ドキュメントの確認"
echo "----------------------------------------"
check_file "docs/REALTIME_DEPLOYMENT.md" "デプロイメントガイド"
check_file "docs/REALTIME_DEPLOYMENT_CHECKLIST.md" "デプロイメントチェックリスト"
check_file ".kiro/specs/realtime-vehicle-tracking/requirements.md" "要件定義書"
check_file ".kiro/specs/realtime-vehicle-tracking/design.md" "設計書"
check_file ".kiro/specs/realtime-vehicle-tracking/tasks.md" "タスクリスト"
echo ""

echo "5. コード品質の確認"
echo "----------------------------------------"

# RealtimeDataLoaderの主要メソッド確認
if [ -f "js/realtime-data-loader.js" ]; then
  if grep -q "fetchVehiclePositions" "js/realtime-data-loader.js"; then
    echo -e "${GREEN}✓${NC} RealtimeDataLoader: fetchVehiclePositions メソッド"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} RealtimeDataLoader: fetchVehiclePositions メソッドが見つかりません"
    ((FAILED++))
  fi
  
  if grep -q "fetchTripUpdates" "js/realtime-data-loader.js"; then
    echo -e "${GREEN}✓${NC} RealtimeDataLoader: fetchTripUpdates メソッド"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} RealtimeDataLoader: fetchTripUpdates メソッドが見つかりません"
    ((FAILED++))
  fi
  
  if grep -q "fetchAlerts" "js/realtime-data-loader.js"; then
    echo -e "${GREEN}✓${NC} RealtimeDataLoader: fetchAlerts メソッド"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} RealtimeDataLoader: fetchAlerts メソッドが見つかりません"
    ((FAILED++))
  fi
fi

# RealtimeVehicleControllerの主要メソッド確認
if [ -f "js/realtime-vehicle-controller.js" ]; then
  if grep -q "handleVehiclePositionsUpdate" "js/realtime-vehicle-controller.js"; then
    echo -e "${GREEN}✓${NC} RealtimeVehicleController: handleVehiclePositionsUpdate メソッド"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} RealtimeVehicleController: handleVehiclePositionsUpdate メソッドが見つかりません"
    ((FAILED++))
  fi
  
  if grep -q "updateVehicleMarker" "js/realtime-vehicle-controller.js"; then
    echo -e "${GREEN}✓${NC} RealtimeVehicleController: updateVehicleMarker メソッド"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} RealtimeVehicleController: updateVehicleMarker メソッドが見つかりません"
    ((FAILED++))
  fi
  
  if grep -q "handleAlertsUpdate" "js/realtime-vehicle-controller.js"; then
    echo -e "${GREEN}✓${NC} RealtimeVehicleController: handleAlertsUpdate メソッド"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC} RealtimeVehicleController: handleAlertsUpdate メソッドが見つかりません"
    ((FAILED++))
  fi
fi
echo ""

echo "=========================================="
echo "確認結果"
echo "=========================================="
echo -e "${GREEN}成功: $PASSED${NC}"
echo -e "${RED}失敗: $FAILED${NC}"
echo -e "${YELLOW}警告: $WARNINGS${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ デプロイメント準備が完了しました！${NC}"
  echo ""
  echo "次のステップ:"
  echo "1. git add . && git commit -m 'feat: リアルタイム車両追跡機能を追加'"
  echo "2. git push origin main"
  echo "3. Cloudflare Pagesダッシュボードでデプロイを確認"
  echo "4. docs/REALTIME_DEPLOYMENT_CHECKLIST.md を使用してデプロイ後の確認を実施"
  echo ""
  exit 0
else
  echo -e "${RED}✗ デプロイメント準備に問題があります${NC}"
  echo ""
  echo "上記のエラーを修正してから再度実行してください。"
  echo ""
  exit 1
fi
