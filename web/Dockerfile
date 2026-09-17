# Imagen del servidor de desarrollo de Vite para la interfaz de Rumb@.
# Variante slim basada en Debian, no Alpine, por los binarios nativos de la cadena de build.

FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS development
WORKDIR /app
ENV NODE_ENV=development
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
USER node
CMD ["npm", "run", "dev"]
