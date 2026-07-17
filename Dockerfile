FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_FILE=/data/content.json

WORKDIR /app

COPY --chown=node:node package.json server.mjs ./
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node assets/fonts ./fonts

RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1

CMD ["node", "server.mjs"]
