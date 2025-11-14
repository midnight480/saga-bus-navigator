# アイコン生成プロンプト

## AI画像生成ツール用プロンプト

### 英語版（DALL-E, Midjourney等）

```
App icon design for a bus navigation app in Saga City, Japan.
- Main element: Simple, modern bus icon in front view
- Background: Gradient blue (#0066cc to lighter blue)
- Optional: Small hot air balloon silhouette in the background (Saga's symbol)
- Style: Flat design, minimalist, clean
- Shape: Square with rounded corners
- Colors: Blue (#0066cc), white, light blue
- Text: None (icon only)
- Size: 512x512px, high resolution
- Format: PNG with transparency
```

### 日本語版

```
佐賀市のバスナビゲーションアプリのアイコンデザイン
- メイン要素: シンプルでモダンなバスのアイコン（正面図）
- 背景: 青のグラデーション（#0066ccから明るい青へ）
- オプション: 背景に小さな熱気球のシルエット（佐賀のシンボル）
- スタイル: フラットデザイン、ミニマリスト、クリーン
- 形状: 角丸の正方形
- 色: 青（#0066cc）、白、ライトブルー
- テキスト: なし（アイコンのみ）
- サイズ: 512x512px、高解像度
- フォーマット: 透過PNG
```

## 生成手順

1. 上記のプロンプトを使用してAI画像生成ツールで512x512pxのマスター画像を生成
2. 生成された画像を `icons/icon-512.png` として保存
3. `generate-icons.sh` スクリプトを実行して各サイズのアイコンを生成

## 必要なアイコンサイズ

- `icon-512.png`: 512x512px（PWA用、マスター画像）
- `icon-192.png`: 192x192px（PWA用）
- `apple-touch-icon.png`: 180x180px（iOS用）
- `favicon-32x32.png`: 32x32px（ブラウザタブ用）
- `favicon-16x16.png`: 16x16px（ブラウザタブ用）
- `favicon.ico`: 16x16, 32x32, 48x48を含むマルチサイズアイコン
