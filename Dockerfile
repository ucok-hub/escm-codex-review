# Build & jalankan Codex Review GUI (backend Node + frontend Vite).
# Dipakai oleh host berbasis container: Koyeb, Railway, Fly.io, Cloud Run, dll.
FROM node:20-alpine

WORKDIR /app

# 1) Dependency backend (express). --omit=dev: hanya runtime.
COPY package*.json ./
RUN npm install --omit=dev

# 2) Dependency frontend (butuh devDeps: vite, typescript) lalu build.
COPY gui/package*.json ./gui/
RUN cd gui && npm install
COPY . .
RUN cd gui && npm run build

ENV NODE_ENV=production
# Server membaca process.env.PORT (default 8787) & bind 0.0.0.0.
EXPOSE 8787
CMD ["node", "server/server.mjs"]
