# Imagen de la api de Rumb@. Multietapa: dependencias, desarrollo y producción.
# Se usa la variante slim basada en Debian y no Alpine, porque Alpine usa musl
# y los binarios nativos de algunas dependencias no están compilados para musl.

# --- Etapa 1: dependencias ---------------------------------------------------
# Se copian primero los manifiestos y solo después el código fuente, para que un
# cambio en el código no invalide la capa de instalación de dependencias.
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Etapa 2: desarrollo -----------------------------------------------------
# El código fuente llega por bind mount desde el compose, así que aquí solo hace
# falta dejar las dependencias y el usuario sin privilegios preparados.
FROM node:24-bookworm-slim AS development
WORKDIR /app
ENV NODE_ENV=development
# `nest start --watch` mata la api anterior buscando sus procesos hijos con `ps`, que la
# imagen slim no trae. Sin `procps` el fallo es silencioso: la api vieja queda huérfana con
# el puerto tomado y sigue sirviendo el código anterior (ver CLAUDE.md, error 8).
RUN apt-get update \
  && apt-get install -y --no-install-recommends procps \
  && rm -rf /var/lib/apt/lists/*
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
CMD ["npm", "run", "start:dev"]

# --- Etapa 3: compilación ----------------------------------------------------
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --omit=dev

# --- Etapa 4: producción -----------------------------------------------------
FROM node:24-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json
USER node
CMD ["node", "dist/main"]
