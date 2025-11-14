#!/bin/bash

# プレースホルダーアイコン生成スクリプト
# AI画像生成ツールを使用する前に、開発用の簡易アイコンを生成します
# 前提条件: ImageMagickがインストールされていること

set -e

# ImageMagickのインストール確認
if ! command -v convert &> /dev/null; then
    echo "エラー: ImageMagickがインストールされていません"
    echo "macOSの場合: brew install imagemagick"
    echo "Ubuntuの場合: sudo apt-get install imagemagick"
    exit 1
fi

echo "プレースホルダーアイコンを生成します..."

# 512x512pxのプレースホルダーアイコンを生成
# 青いグラデーション背景に白い「バス」の文字
convert -size 512x512 \
    gradient:'#0066cc-#4da6ff' \
    -gravity center \
    -pointsize 120 \
    -fill white \
    -font "Helvetica-Bold" \
    -annotate +0+0 "BUS" \
    icons/icon-512.png

echo "✓ プレースホルダーアイコン（512x512px）を生成しました"

# 各サイズのアイコンを生成
echo "各サイズのアイコンを生成中..."

convert icons/icon-512.png -resize 192x192 icons/icon-192.png
convert icons/icon-512.png -resize 180x180 icons/apple-touch-icon.png
convert icons/icon-512.png -resize 32x32 icons/favicon-32x32.png
convert icons/icon-512.png -resize 16x16 icons/favicon-16x16.png

convert icons/icon-512.png \
    \( -clone 0 -resize 16x16 \) \
    \( -clone 0 -resize 32x32 \) \
    \( -clone 0 -resize 48x48 \) \
    -delete 0 icons/favicon.ico

echo "✓ 全てのアイコンサイズを生成しました！"
echo ""
echo "生成されたファイル:"
ls -lh icons/*.png icons/*.ico

echo ""
echo "注意: これは開発用のプレースホルダーアイコンです"
echo "本番環境では、AI画像生成ツールで作成した高品質なアイコンに置き換えてください"
echo "詳細は icons/ICON_GENERATION_PROMPT.md を参照してください"
