# Repara-Já API

API profissional para oficinas mecânicas com integração WhatsApp Business e sistema multi-tenant.

## 🚀 Características

- **Multi-tenant**: Suporte a múltiplas oficinas com isolamento de dados
- **WhatsApp Business**: Integração completa com Meta WhatsApp Business API
- **Rate Limiting**: Controle de requisições por tenant e número de telefone
- **Idempotência**: Suporte a operações idempotentes com UUID
- **Webhooks**: Sistema de webhooks para integração com ERPs
- **Criptografia**: Dados sensíveis criptografados em repouso
- **Logs Estruturados**: Sistema de logging com mascaramento de dados sensíveis
- **LGPD**: Conformidade com Lei Geral de Proteção de Dados

## 📋 Pré-requisitos

- Node.js 18+
- PostgreSQL 12+
- Redis 6+
- Conta WhatsApp Business API

## 🛠️ Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/reparaja.git
cd reparaja
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

4. **Configure o banco de dados**
```bash
# Crie o banco PostgreSQL
createdb reparaja_db

# Execute as migrações
npm run migrate
```

5. **Inicie o servidor**
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Servidor
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Banco de Dados
DATABASE_URL=postgresql://username:password@localhost:5432/reparaja_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key

# WhatsApp Business API
WHATSAPP_TOKEN=your-whatsapp-business-api-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Criptografia
ENCRYPTION_KEY=your-32-character-encryption-key

# Webhook
WEBHOOK_SECRET=your-webhook-secret-key
```

### WhatsApp Business API

1. Crie uma conta no [Meta for Developers](https://developers.facebook.com/)
2. Configure o WhatsApp Business API
3. Obtenha o token de acesso e Phone Number ID
4. Configure o webhook com a URL: `https://sua-api.com/v1/webhooks/whatsapp`

## 📚 Uso da API

### Autenticação

A API usa JWT Bearer tokens:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "X-Tenant-ID: tn_123" \
     https://api.reparaja.com/v1/vehicles
```

### Endpoints Principais

#### Veículos

```bash
# Criar veículo
POST /v1/vehicles
{
  "plate": "ABC1D23",
  "owner": {
    "name": "João Silva",
    "phone": "+5511999999999"
  },
  "meta": {
    "brand": "Ford",
    "model": "Fiesta 1.6",
    "year": 2016
  }
}

# Listar veículos
GET /v1/vehicles?page=1&limit=50

# Buscar por código
GET /v1/vehicles/code/A1B2-C3D4-E5F6-G7H8
```

#### Mensagens WhatsApp

```bash
# Enviar texto
POST /v1/messages/whatsapp/text
{
  "to": "+5511999999999",
  "text": "Olá! Seu carro está pronto."
}

# Enviar template
POST /v1/messages/whatsapp/template
{
  "to": "+5511999999999",
  "name": "orcamento_update",
  "language": "pt_BR",
  "components": {
    "body": ["João", "Fiesta 1.6", "Amortecedor", "780,00"]
  }
}

# Enviar botões
POST /v1/messages/whatsapp/interactive
{
  "to": "+5511999999999",
  "body": "Escolha uma opção:",
  "buttons": [
    {"id": "opt_status", "title": "📋 Ver Status"},
    {"id": "opt_orc", "title": "💰 Aprovar Orçamento"}
  ]
}
```

#### Webhooks

```bash
# Cadastrar webhook
POST /v1/webhooks/partners
{
  "url": "https://erp.suaempresa.com.br/webhooks/reparaja",
  "events": ["message.delivered", "button.clicked"],
  "secret": "shared_secret_key"
}
```

### Headers Importantes

- `Authorization: Bearer <JWT>` - Token de autenticação
- `X-Tenant-ID: <tenant_id>` - ID do tenant
- `X-Correlation-ID: <uuid>` - ID de correlação para logs
- `Idempotency-Key: <uuid>` - Chave para operações idempotentes

## 🔒 Segurança

### Rate Limiting

- **Geral**: 600 req/min por tenant
- **WhatsApp**: 70 req/min por número de telefone
- **Criação**: 100 req/min por tenant

### Criptografia

- Dados sensíveis criptografados em repouso
- Telefones mascarados em logs
- HMAC para verificação de webhooks

### Validações

- Formato de telefone: `+55DDDNNNNNNNN`
- Código 16: `XXXX-XXXX-XXXX-XXXX` (Base32 Crockford)
- UUID para idempotência

## 📊 Monitoramento

### Logs

```bash
# Visualizar logs
tail -f logs/app.log

# Logs de erro
tail -f logs/error.log
```

### Métricas

- Taxa de entrega de mensagens
- Tempo de resposta da API
- Uso de quotas por tenant
- Erros por endpoint

### Health Check

```bash
curl https://api.reparaja.com/health
```

## 🧪 Testes

```bash
# Executar testes
npm test

# Testes em modo watch
npm run test:watch
```

## 📦 Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## 📖 Documentação Completa

- [Especificação da API](docs/api-specification.md)
- [Guia de Integração](docs/integration-guide.md)
- [Exemplos de Uso](docs/examples.md)
- [Troubleshooting](docs/troubleshooting.md)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Email**: suporte@reparaja.com
- **Documentação**: https://docs.reparaja.com
- **Status**: https://status.reparaja.com

## 🏢 Sobre o Repara-Já

Repara-Já é uma plataforma completa para gestão de oficinas mecânicas, oferecendo:

- Sistema de gestão de veículos e ordens de serviço
- Integração WhatsApp para comunicação com clientes
- API para integração com ERPs e sistemas externos
- Relatórios e analytics
- Conformidade LGPD

---

**Desenvolvido com ❤️ pela equipe Repara-Já**
