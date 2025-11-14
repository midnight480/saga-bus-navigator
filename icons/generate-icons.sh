#!/bin/bash

# アイコン生成スクリプト
# 前提条件: ImageMagickがインストールされていること
# 使用方法: ./generate-icons.sh

set -e

# マスター画像の確認
if [ ! -f "icons/icon-512.png" ]; then
    echo "エラー: icons/icon-512.png が見つかりません"
    echo "AI画像生成ツールで512x512pxのマスター画像を生成し、icons/icon-512.png として保存してください"
    echo "詳細は icons/ICON_GENERATION_PROMPT.md を参照してください"
    exit 1
fi

# ImageMagickのインストール確認
if ! command -v convert &> /dev/null; then
    echo "エラー: ImageMagickがインストールされていません"
    echo "macOSの場合: brew install imagemagick"
    echo "Ubuntuの場合: sudo apt-get install imagemagick"
    exit 1
fi

echo "アイコン生成を開始します..."

# 各サイズのアイコンを生成
echo "192x192pxアイコンを生成中..."
convert icons/icon-512.png -resize 192x192 icons/icon-192.png

echo "180x180pxアイコン（Apple Touch Icon）を生成中..."
convert icons/icon-512.png -resize 180x180 icons/apple-touch-icon.png

echo "32x32pxアイコンを生成中..."
convert icons/icon-512.png -resize 32x32 icons/favicon-32x32.png

echo "16x16pxアイコンを生成中..."
convert icons/icon-512.png -resize 16x16 icons/favicon-16x16.png

echo "favicon.ico（マルチサイズ）を生成中..."
convert icons/icon-512.png \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    -delete 0 icons/favicon.ico

echo "✓ アイコン生成が完了しました！"
echo ""
echo "生成されたファイル:"
ls -lh icons/*.png icons/*.ico

echo ""
echo "次のステップ:"
echo "1. index.htmlにアイコンのlinkタグを追加"
echo "2. manifest.jsonにアイコン情報を追加"
