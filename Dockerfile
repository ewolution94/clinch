FROM node:22-alpine AS build
WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
COPY client/package.json client/package-lock.json* ./client/
RUN npm install --prefix server && npm install --prefix client

COPY server ./server
COPY client ./client
RUN npm run build --prefix client && npm run build --prefix server


FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4600

COPY server/package.json server/package-lock.json* ./server/
RUN npm install --omit=dev --prefix server

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 4600

# No volume: everything Clinch knows comes from ESPN and is re-fetched on boot.
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:4600/api/health || exit 1

CMD ["node", "server/dist/index.js"]
