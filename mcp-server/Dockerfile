FROM node:20-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド済みコードのコピー
COPY build ./build

# 環境変数のデフォルト値
ENV API_BASE_URL=https://saga-bus.midnight480.com/api

# MCPサーバの起動
CMD ["node", "build/index.js"]
