FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .
# Build Neti's system prompt from corpus at image build time
RUN node scripts/build-neti-prompt.mjs
# .env is NEVER baked into the image — pass env vars at runtime
CMD ["node", "src/index.js"]
