export const generateNginxConf = (): string => `
server {
  listen 8080;
  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri/ /index.html;
  }
}
`.trim()

export const generateDockerfile = (
  framework: string,
  buildStrategy: string,
  startCommand: string,
  hasPrisma: boolean,
  envVars: Record<string, string> = {}
): string => {
  if (framework === 'react') {
    const viteKeys = Object.keys(envVars).filter(k => k.startsWith('VITE_'))
    const viteArgs = viteKeys.map(k => `ARG ${k}\n        ENV ${k}=$${k}`).join('\n        ')

    return `
        FROM node:22-alpine AS builder
        WORKDIR /app
        COPY package.json package-lock.json ./
        RUN npm ci
        COPY . .
        ${viteArgs}
        RUN npm run build

        FROM nginx:1.27-alpine
        RUN rm -rf /usr/share/nginx/html/*
        COPY --from=builder /app/dist /usr/share/nginx/html
        COPY nginx.conf /etc/nginx/conf.d/default.conf

        RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
            && chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d/default.conf \
            && touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
        USER appuser
        EXPOSE 8080

        CMD ["nginx", "-g", "daemon off;"]
        `.trim()
  }

  if (framework === 'express') {
    // ถ้ามี prisma/schema.prisma ใน repo -> migrate deploy ก่อน start เสมอ
    // sh -c ใช้เพราะ exec form ("CMD [...]") ไม่รองรับ && เลย ต้องผ่าน shell
    const startCmd = hasPrisma
      ? `CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]`
      : `CMD ["sh", "-c", "npm start"]`
    const prismaGenerateCmd = hasPrisma ? 'RUN npx prisma generate' : ''

    switch (buildStrategy) {
      case 'build':
        return `
        FROM node:20-alpine AS builder
        WORKDIR /app
        COPY package*.json ./
        RUN npm install
        COPY . .
        ${prismaGenerateCmd}
        RUN npm run build

        FROM node:20-alpine
        WORKDIR /app
        ENV NODE_ENV=production
        COPY package*.json ./
        RUN npm install --production
        COPY --from=builder /app/dist ./dist
        ${hasPrisma ? 'COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma' : ''}
        RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
        USER appuser
        EXPOSE 3000
        ${startCmd}
        `.trim()

      case 'ts-node':
        return `
          FROM node:20-alpine
          WORKDIR /app
          COPY package*.json ./
          RUN npm install
          COPY . .
          ${prismaGenerateCmd}
          ENV NODE_ENV=production
          RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
          USER appuser
          EXPOSE 3000
          ${startCmd}
          `.trim()

      case 'node':
        return `
          FROM node:20-alpine
          WORKDIR /app
          ENV NODE_ENV=production
          COPY package*.json ./
          RUN npm install --production
          COPY . .
          ${prismaGenerateCmd}
          RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
          USER appuser
          EXPOSE 3000
          ${startCmd}
          `.trim()
    }
  }

  throw new Error(`Unsupported framework: ${framework}`)
}