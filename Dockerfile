FROM node:24-bookworm-slim AS frontend-build

WORKDIR /workspace/rentease-frontend
COPY rentease-frontend/package*.json ./
RUN npm ci
COPY rentease-frontend/ ./
RUN npm run build

FROM node:24-bookworm-slim

WORKDIR /app
COPY rentease-backend/package*.json ./backend/
RUN npm ci --omit=dev --prefix ./backend
COPY rentease-backend/ ./backend/
COPY --from=frontend-build /workspace/rentease-frontend/dist ./backend/public

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "backend/server.js"]
