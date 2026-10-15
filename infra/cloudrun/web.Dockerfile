FROM node:22.22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npx prisma generate --schema packages/database/prisma/schema.prisma
RUN npm run build:packages
RUN npm run build -w @ckace/hr-web

FROM node:22.22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/packages/contracts ./packages/contracts

EXPOSE 8080

CMD ["npm", "run", "start", "-w", "@ckace/hr-web", "--", "-p", "8080"]
