# アイコンファイル

このディレクトリには、PWA対応のためのアイコンファイルが含まれています。

## 現在のアイコン

現在は開発用のプレースホルダーアイコンが配置されています。本番環境では、AI画像生成ツールで作成した高品質なアイコンに置き換えることを推奨します。

## ファイル一覧

- `icon-512.png` - 512x512px（PWA用、マスター画像）
- `icon-192.png` - 192x192px（PWA用）
- `apple-touch-icon.png` - 180x180px（iOS用）
- `favicon-32x32.png` - 32x32px（ブラウザタブ用）
- `favicon-16x16.png` - 16x16px（ブラウザタブ用）
- `favicon.ico` - マルチサイズアイコン（16x16, 32x32, 48x48）

## アイコンの再生成方法

### 方法1: プレースホルダーアイコンを生成（開発用）

```bash
./icons/generate-placeholder-icon.sh
```

これにより、青いグラデーション背景に「BUS」の文字が入った簡易的なアイコンが生成されます。

### 方法2: AI画像生成ツールで高品質なアイコンを作成（本番用）

1. `ICON_GENERATION_PROMPT.md` に記載されているプロンプトを使用
2. DALL-E、Midjourney、Stable Diffusion等のAI画像生成ツールで512x512pxの画像を生成
3. 生成された画像を `icons/icon-512.png` として保存
4. 以下のコマンドで各サイズのアイコンを生成：

```bash
./icons/generate-icons.sh
```

## 必要な環境

- ImageMagick（アイコンのリサイズに使用）

### ImageMagickのインストール

**macOS:**
```bash
brew install imagemagick
```

**Ubuntu/Debian:**
```bash
sudo apt-get install imagemagick
```

## デザインコンセプト

- **メイン要素**: シンプルでモダンなバスのアイコン（正面図）
- **背景**: 青のグラデーション（#0066ccから明るい青へ）
- **オプション**: 背景に小さな熱気球のシルエット（佐賀のシンボル）
- **スタイル**: フラットデザイン、ミニマリスト、クリーン
- **色**: 青（#0066cc）、白、ライトブルー

## 使用箇所

これらのアイコンは以下の場所で使用されます：

- `index.html` - faviconとApple Touch Iconのlinkタグ
- `manifest.json` - PWAアイコンの定義
- ブラウザのタブ、ブックマーク
- iOSのホーム画面
- Androidのホーム画面（PWAインストール時）
