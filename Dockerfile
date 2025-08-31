# Dockerfile para Repara-Já API
FROM node:18-alpine

# Instala dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Define diretório de trabalho
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm ci --only=production && npm cache clean --force

# Copia código da aplicação
COPY . .

# Cria diretório para logs
RUN mkdir -p logs

# Cria usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Muda propriedade dos arquivos
RUN chown -R nodejs:nodejs /app

# Muda para usuário não-root
USER nodejs

# Expõe porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Comando para iniciar a aplicação
CMD ["npm", "start"]
