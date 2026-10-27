export type NextOutputMode = 'default' | 'standalone' | 'export'

// env ที่ต้อง bake ตอน build (client-side bundle) แยกตาม framework
const BUILD_TIME_ENV_PREFIX: Record<string, string> = {
  react: 'VITE_',
  next: 'NEXT_PUBLIC_',
}

export const getBuildTimeEnv = (framework: string, envVars: Record<string, string> = {}): Record<string, string> => {
  const prefix = BUILD_TIME_ENV_PREFIX[framework]
  if (!prefix) return {}
  return Object.fromEntries(Object.entries(envVars).filter(([k]) => k.startsWith(prefix)))
}

const buildArgLines = (framework: string, envVars: Record<string, string>): string =>
  Object.keys(getBuildTimeEnv(framework, envVars))
    .map(k => `ARG ${k}\n        ENV ${k}=$${k}`)
    .join('\n        ')

// $uri.html รองรับ next export ที่ได้ไฟล์เป็น /about.html
export const generateNginxConf = (): string => `
server {
  listen 8080;
  location / {
    root /usr/share/nginx/html;
    index index.html;
    try_files $uri $uri.html $uri/ /index.html;
  }
}
`.trim()

// migrate deploy -> seed ก่อน start app
// seed ไม่ให้ fail ทั้ง container เพราะรันทุกครั้งที่ pod start ถ้า seed ไม่ idempotent จะ crashloop
const prismaStartPrefix = (hasPrisma: boolean, seedCommand: string | null): string => {
  if (!hasPrisma) return ''
  const seed = seedCommand ? `(${seedCommand} || echo 'Seed failed, continuing startup') && ` : ''
  return `npx prisma migrate deploy && ${seed}`
}

const nginxRuntimeStage = (distDir: string): string => `
        FROM nginx:1.27-alpine
        RUN rm -rf /usr/share/nginx/html/*
        COPY --from=builder /app/${distDir} /usr/share/nginx/html
        COPY nginx.conf /etc/nginx/conf.d/default.conf

        RUN addgroup -S appgroup && adduser -S appuser -G appgroup \\
            && chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d/default.conf \\
            && touch /var/run/nginx.pid && chown appuser:appgroup /var/run/nginx.pid
        USER appuser
        EXPOSE 8080

        CMD ["nginx", "-g", "daemon off;"]`

export const generateDockerfile = (
  framework: string,
  buildStrategy: string,
  startCommand: string,
  hasPrisma: boolean,
  envVars: Record<string, string> = {},
  nextOutput: NextOutputMode = 'default',
  seedCommand: string | null = null
): string => {
  const prismaGenerateCmd = hasPrisma ? 'RUN npx prisma generate' : ''
  const prismaPrefix = prismaStartPrefix(hasPrisma, seedCommand)
  // หลาย project มี postinstall: prisma generate -> ต้องมี schema/config ก่อน npm install
  // prisma.config.* เป็น glob ได้เพราะ package.json match อยู่แล้ว ไม่มีไฟล์ config ก็ไม่ error
  const depsCopy = hasPrisma
    ? 'COPY package*.json prisma.config.* ./\n        COPY prisma ./prisma'
    : 'COPY package*.json ./'

  if (framework === 'react') {
    const viteArgs = buildArgLines('react', envVars)

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

  if (framework === 'next') {
    const nextArgs = buildArgLines('next', envVars)
    const builderStage = `
        FROM node:22-alpine AS builder
        WORKDIR /app
        ENV NEXT_TELEMETRY_DISABLED=1
        ${depsCopy}
        RUN npm install
        COPY . .
        ${prismaGenerateCmd}
        ${nextArgs}
        RUN npm run build
        RUN mkdir -p public`

    if (nextOutput === 'export') {
      return `${builderStage}
${nginxRuntimeStage('out')}`.trim()
    }

    // k8s set HOSTNAME เป็นชื่อ pod ทับ ENV ใน image เสมอ -> ต้อง force 0.0.0.0 ตอน start
    // standalone ไม่มี prisma CLI ติดมา เลยใช้ standalone เฉพาะตอนไม่มี prisma
    if (nextOutput === 'standalone' && !hasPrisma) {
      return `${builderStage}

        FROM node:22-alpine
        WORKDIR /app
        ENV NODE_ENV=production
        ENV NEXT_TELEMETRY_DISABLED=1
        ENV PORT=3000
        RUN addgroup -S appgroup && adduser -S appuser -G appgroup
        COPY --from=builder --chown=appuser:appgroup /app/public ./public
        COPY --from=builder --chown=appuser:appgroup /app/.next/standalone ./
        COPY --from=builder --chown=appuser:appgroup /app/.next/static ./.next/static
        USER appuser
        EXPOSE 3000
        CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
        `.trim()
    }

    // ไม่ได้เปิด output: 'standalone' -> เก็บ node_modules ทั้งหมดไว้เพื่อให้ next start / next.config ทำงานได้แน่นอน
    const nextStart = 'npx next start -H 0.0.0.0 -p ${PORT:-3000}'
    const startCmd = `CMD ["sh", "-c", "${prismaPrefix}exec ${nextStart}"]`

    return `${builderStage}

        FROM node:22-alpine
        WORKDIR /app
        ENV NODE_ENV=production
        ENV NEXT_TELEMETRY_DISABLED=1
        ENV PORT=3000
        RUN addgroup -S appgroup && adduser -S appuser -G appgroup
        COPY --from=builder --chown=appuser:appgroup /app ./
        USER appuser
        EXPOSE 3000
        ${startCmd}
        `.trim()
  }

  if (framework === 'nest') {
    // nest start ต้องใช้ @nestjs/cli (devDependency) -> production รัน node dist/main ตรงๆ
    // บาง project ได้ dist/src/main.js (ถ้า tsconfig include ไฟล์นอก src) เลยเช็คทั้งสองที่
    const nodeStart = 'if [ -f dist/main.js ]; then exec node dist/main.js; else exec node dist/src/main.js; fi'
    const startCmd = `CMD ["sh", "-c", "${prismaPrefix}${nodeStart}"]`

    // มี prisma -> ต้องมี prisma CLI + schema/migrations (+ seed runner อย่าง tsx) ตอน runtime เลย copy ทั้ง /app จาก builder
    const runtimeFiles = hasPrisma
      ? 'COPY --from=builder --chown=appuser:appgroup /app ./'
      : `COPY package*.json ./
        RUN npm install --omit=dev
        COPY --from=builder --chown=appuser:appgroup /app/dist ./dist`

    return `
        FROM node:22-alpine AS builder
        WORKDIR /app
        ${depsCopy}
        RUN npm install
        COPY . .
        ${prismaGenerateCmd}
        RUN npm run build

        FROM node:22-alpine
        WORKDIR /app
        ENV NODE_ENV=production
        ENV PORT=3000
        RUN addgroup -S appgroup && adduser -S appuser -G appgroup
        ${runtimeFiles}
        RUN chown appuser:appgroup /app
        USER appuser
        EXPOSE 3000
        ${startCmd}
        `.trim()
  }

  if (framework === 'express') {
    // ถ้ามี prisma/schema.prisma ใน repo -> migrate deploy (+ seed) ก่อน start เสมอ
    // sh -c ใช้เพราะ exec form ("CMD [...]") ไม่รองรับ && เลย ต้องผ่าน shell
    const startCmd = `CMD ["sh", "-c", "${prismaPrefix}npm start"]`
    // prisma CLI / seed runner เป็น devDependency -> มี prisma ต้องลง deps ครบ
    const installCmd = hasPrisma ? 'RUN npm install' : 'RUN npm install --production'

    switch (buildStrategy) {
      case 'build':
        return `
        FROM node:22-alpine AS builder
        WORKDIR /app
        ${depsCopy}
        RUN npm install
        COPY . .
        ${prismaGenerateCmd}
        RUN npm run build

        FROM node:22-alpine
        WORKDIR /app
        ENV NODE_ENV=production
        ${hasPrisma
          ? 'COPY --from=builder /app ./'
          : `COPY package*.json ./
        RUN npm install --production
        COPY --from=builder /app/dist ./dist`}
        RUN addgroup -S appgroup && adduser -S appuser -G appgroup && chown -R appuser:appgroup /app
        USER appuser
        EXPOSE 3000
        ${startCmd}
        `.trim()

      case 'ts-node':
        return `
          FROM node:22-alpine
          WORKDIR /app
          ${depsCopy}
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
          FROM node:22-alpine
          WORKDIR /app
          ENV NODE_ENV=production
          ${depsCopy}
          ${installCmd}
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