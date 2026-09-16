FROM moby/buildkit:rootless AS buildctl

FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache git openssl

# buildctl: the CLI client build.worker.ts shells out to talk to the
# in-cluster buildkitd Deployment (no official Node.js client exists).
COPY --from=buildctl /usr/bin/buildctl /usr/local/bin/buildctl

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 5001

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx index.ts"]
