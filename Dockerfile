FROM node:20-alpine

WORKDIR /app

# Install from the committed pnpm lockfile so the server builds exactly the
# dependency versions that were tested (plain `npm install` resolves the newest
# versions each time and currently crashes with an npm "edgesOut" error).
RUN npm install -g pnpm@10.33.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
