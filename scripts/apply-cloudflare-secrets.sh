#!/bin/bash
set -euo pipefail

# Cloudflare Pages の Secrets（環境変数）を .dev.vars から反映する
#
# 前提:
# - wrangler がインストール済み（`wrangler --version` が通る）
# - Cloudflare にログイン済み（`wrangler whoami` が通る）
# - `.dev.vars` に KEY=VALUE 形式で値が入っている（Gitにはコミットしない）
#
# 使い方:
#   ./scripts/apply-cloudflare-secrets.sh
#   PROJECT_NAME=your-pages-project ./scripts/apply-cloudflare-secrets.sh
#

PROJECT_NAME="${PROJECT_NAME:-saga-bus-navigator}"
DEV_VARS_FILE="${DEV_VARS_FILE:-.dev.vars}"

if [ ! -f "$DEV_VARS_FILE" ]; then
  echo "ERROR: $DEV_VARS_FILE が見つかりません。先に .dev.vars を作成してください。" >&2
  exit 1
fi

echo "Applying secrets to Cloudflare Pages project: ${PROJECT_NAME}"
echo "Source file: ${DEV_VARS_FILE}"

# .dev.vars の内容をそのまま Pages Secrets に投入する
# - value は出力されない（CLIがstdin/ファイルから読み込む）
wrangler pages secret bulk "$DEV_VARS_FILE" --project-name "$PROJECT_NAME"

echo "Done."

