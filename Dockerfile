FROM node:22-alpine AS build
WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps --loglevel error

COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build && cp -r /app/public/* /app/.output/public/ 2>/dev/null || true

FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_SERVE_STATIC=true
ENV HOST=0.0.0.0
ENV PORT=8085

COPY --from=build /app/.output ./.output
COPY --from=build /app/package.json ./package.json

EXPOSE 8085

CMD ["node", ".output/server/index.mjs"]
