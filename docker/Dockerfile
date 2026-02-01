# BUILD STAGE
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY tsconfig.json ./
RUN npm install

COPY src ./src
COPY public ./public
COPY next.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.mjs ./

RUN --mount=type=secret,id=supabase,target=/run/secrets/supabase.env \
    export $(cat /run/secrets/supabase.env | xargs) && \
    npm run build


# RUNTIME STAGE
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

EXPOSE 3000

CMD ["npm", "start"]
