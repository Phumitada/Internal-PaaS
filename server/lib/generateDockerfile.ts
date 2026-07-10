export const generateNginxConf = (): string => `
server {
  listen 80;
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
  startCommand: string
): string => {
  if (framework === 'react') {
    return `
        FROM node:22-alpine AS builder
        WORKDIR /app
        COPY package.json package-lock.json ./
        RUN npm ci
        COPY . .
        RUN npm run build

        FROM nginx:1.27-alpine
        RUN rm -rf /usr/share/nginx/html/*
        COPY --from=builder /app/dist /usr/share/nginx/html
        COPY nginx.conf /etc/nginx/conf.d/default.conf

        EXPOSE 80

        CMD ["nginx", "-g", "daemon off;"]
        `.trim()
  }

  if (framework === 'express') {
    switch (buildStrategy) {
      case 'build':
        return `
        FROM node:20-alpine AS builder
        WORKDIR /app
        COPY package*.json ./
        RUN npm install
        COPY . .
        RUN npm run build

        FROM node:20-alpine
        WORKDIR /app
        COPY package*.json ./
        RUN npm install --production
        COPY --from=builder /app/dist ./dist
        RUN addgroup -S appgroup && adduser -S appuser -G appgroup
        RUN chown -R appuser:appgroup /app
        USER appuser
        EXPOSE 3000
        CMD ["npm","start"]
        `.trim()

      case 'ts-node':
        return `
          FROM node:20-alpine
          WORKDIR /app
          COPY package*.json ./
          RUN npm install
          COPY . .
          RUN addgroup -S appgroup && adduser -S appuser -G appgroup
          RUN chown -R appuser:appgroup /app
          USER appuser
          EXPOSE 3000
          CMD ["npm","start"]
          `.trim()

      case 'node':
        return `
          FROM node:20-alpine
          WORKDIR /app
          COPY package*.json ./
          RUN npm install --production
          COPY . .
          RUN addgroup -S appgroup && adduser -S appuser -G appgroup
          RUN chown -R appuser:appgroup /app
          USER appuser
          EXPOSE 3000
          CMD ["sh", "-c", "npm start"]
          `.trim()
    }
  }

  throw new Error(`Unsupported framework: ${framework}`)
}
