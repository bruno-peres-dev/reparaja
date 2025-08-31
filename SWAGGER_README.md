# Documentação da API - Repara-Já

## Swagger UI

A documentação interativa da API está disponível através do Swagger UI.

### Acesso à Documentação

- **URL da Documentação**: `http://localhost:3000/api-docs`
- **Especificação JSON**: `http://localhost:3000/api-docs.json`

### Como Usar

1. **Inicie o servidor**:
   ```bash
   npm run dev
   ```

2. **Acesse a documentação**:
   - Abra seu navegador e vá para `http://localhost:3000/api-docs`
   - Você verá a interface interativa do Swagger

3. **Teste os Endpoints**:
   - Clique em qualquer endpoint para expandir
   - Clique em "Try it out" para testar
   - Preencha os parâmetros necessários
   - Clique em "Execute" para fazer a requisição

### 🔐 Autenticação

A API oferece **dois tipos de autenticação** para diferentes cenários de uso:

#### **1. Autenticação de Usuário (JWT)**
Para usuários finais que acessam a API através de aplicações web/mobile:

- **Endpoint**: `POST /v1/auth/login`
- **Headers**: `X-Tenant-ID: <tenant_id>`
- **Body**: `{ "email": "usuario@empresa.com", "password": "senha123" }`
- **Retorna**: JWT token + refresh token

#### **2. Autenticação de Cliente (Client Credentials)**
Para integrações automáticas e sistemas:

- **Headers**: 
  - `X-Tenant-ID: <tenant_id>`
  - `Authorization: Bearer <client_token>`

### **📋 Fluxo de Autenticação**

#### **Login de Usuário**
```
1. POST /v1/auth/login
   ├── Headers: X-Tenant-ID
   ├── Body: { email, password }
   └── Retorna: { access_token, refresh_token, user }

2. Usar access_token
   ├── Header: Authorization: Bearer <access_token>
   └── Acesso às APIs protegidas

3. Renovar token (quando expirar)
   ├── POST /v1/auth/refresh
   ├── Body: { refresh_token }
   └── Retorna: novo access_token
```

#### **Integração com Client Token**
```
1. Usar client_token diretamente
   ├── Header: Authorization: Bearer <client_token>
   └── Acesso às APIs (sem refresh)

2. Para usuários finais
   ├── Fazer login via /v1/auth/login
   ├── Usar JWT token retornado
   └── Renovar quando necessário
```

### **🛡️ Segurança**

- **JWT Tokens**: Expiração de 24 horas
- **Refresh Tokens**: Expiração de 7 dias
- **Rate Limiting**: 100 req/min por tenant
- **Bloqueio de Conta**: Após 5 tentativas de login falhadas
- **Senhas**: Hash bcrypt + validação de força

### Endpoints Principais

#### 🔐 Authentication (Novo!)
- `POST /v1/auth/login` - Login de usuário
- `POST /v1/auth/refresh` - Renovar token
- `POST /v1/auth/logout` - Logout
- `POST /v1/auth/logout-all` - Logout de todos os dispositivos
- `POST /v1/auth/change-password` - Alterar senha
- `POST /v1/auth/request-password-reset` - Solicitar reset de senha
- `POST /v1/auth/reset-password` - Reset de senha
- `GET /v1/auth/profile` - Perfil do usuário
- `PATCH /v1/auth/profile` - Atualizar perfil
- `GET /v1/auth/verify` - Verificar token

#### 🏢 Workshops
- `POST /v1/workshops` - Criar oficina
- `GET /v1/workshops` - Listar oficinas
- `GET /v1/workshops/{id}` - Buscar oficina por ID
- `PATCH /v1/workshops/{id}` - Atualizar oficina
- `DELETE /v1/workshops/{id}` - Remover oficina
- `GET /v1/workshops/{id}/vehicles` - Veículos da oficina
- `GET /v1/workshops/{id}/orders` - Ordens de serviço da oficina
- `GET /v1/workshops/{id}/stats` - Estatísticas da oficina
- `POST /v1/workshops/{id}/sync-erp` - Sincronizar com ERP

#### 📝 Orders
- `POST /v1/orders` - Criar ordem de serviço
- `GET /v1/orders` - Listar ordens de serviço
- `GET /v1/orders/{id}` - Buscar ordem por ID
- `PATCH /v1/orders/{id}` - Atualizar ordem
- `DELETE /v1/orders/{id}` - Remover ordem
- `GET /v1/orders/vehicle/{vehicle_id}` - Ordens por veículo
- `GET /v1/orders/stats/conversion` - Estatísticas de conversão
- `POST /v1/orders/{id}/approve` - Aprovar ordem
- `POST /v1/orders/{id}/start` - Iniciar ordem
- `POST /v1/orders/{id}/complete` - Concluir ordem

#### 🚗 Veículos
- `POST /v1/vehicles` - Criar veículo
- `GET /v1/vehicles` - Listar veículos
- `GET /v1/vehicles/{id}` - Buscar veículo por ID
- `PATCH /v1/vehicles/{id}` - Atualizar veículo
- `DELETE /v1/vehicles/{id}` - Remover veículo
- `GET /v1/vehicles/code/{code16}` - Buscar por código de 16 caracteres

#### 💬 Mensagens
- `POST /v1/messages/whatsapp/text` - Enviar mensagem de texto
- `POST /v1/messages/whatsapp/template` - Enviar template
- `POST /v1/messages/whatsapp/interactive` - Enviar mensagem interativa
- `POST /v1/messages/whatsapp/list` - Enviar lista de opções
- `GET /v1/messages` - Listar mensagens
- `GET /v1/messages/{id}/status` - Verificar status

#### 🖼️ Mídia
- `POST /v1/media/upload` - Upload de arquivo
- `GET /v1/media` - Listar mídia
- `GET /v1/media/{id}` - Obter mídia por ID
- `GET /v1/media/vehicle/{id}` - Mídia por veículo
- `PATCH /v1/media/{id}` - Atualizar mídia
- `DELETE /v1/media/{id}` - Deletar mídia
- `GET /v1/media/stats/storage` - Estatísticas de armazenamento

#### 🔗 Webhooks
- `GET /v1/webhooks/whatsapp` - Verificação do webhook WhatsApp
- `POST /v1/webhooks/whatsapp` - Recebimento de webhooks
- `POST /v1/webhooks/partners` - Cadastrar webhook de parceiro
- `GET /v1/webhooks/partners` - Listar webhooks
- `DELETE /v1/webhooks/partners/{id}` - Remover webhook

#### 🛠️ Utilitários
- `POST /v1/utils/code16` - Gerar código de 16 caracteres

### Exemplos de Uso

#### 🔐 Login de Usuário
```json
POST /v1/auth/login
Headers: {
  "X-Tenant-ID": "123e4567-e89b-12d3-a456-426614174000",
  "Content-Type": "application/json"
}
Body: {
  "email": "usuario@empresa.com",
  "password": "minhasenha123"
}
```

#### 🔐 Usar JWT Token
```json
GET /v1/workshops
Headers: {
  "X-Tenant-ID": "123e4567-e89b-12d3-a456-426614174000",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 🔐 Renovar Token
```json
POST /v1/auth/refresh
Body: {
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 🏢 Criar uma Oficina
```json
{
  "name": "Oficina Central",
  "cnpj": "12.345.678/0001-90",
  "corporate_name": "Oficina Central Ltda",
  "address": {
    "street": "Rua das Oficinas",
    "number": "123",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zip_code": "01234-567"
  },
  "phone": "+5511999999999",
  "email": "contato@oficinacentral.com",
  "type": "main",
  "max_vehicles_per_day": 50,
  "max_mechanics": 10,
  "specialties": ["manutencao", "reparo", "diagnostico"]
}
```

#### 📝 Criar uma Ordem de Serviço
```json
{
  "vehicle_id": "123e4567-e89b-12d3-a456-426614174000",
  "estimate_amount": 150.00,
  "status": "awaiting_approval",
  "notes": "Troca de óleo e filtros",
  "workshop_id": "456e7890-e89b-12d3-a456-426614174000"
}
```

#### 🚗 Criar um Veículo
```json
{
  "brand": "Toyota",
  "model": "Corolla",
  "year": 2022,
  "color": "Prata",
  "license_plate": "ABC1234",
  "owner_name": "João Silva",
  "owner_phone": "+5511999999999",
  "owner_email": "joao@email.com"
}
```

#### 💬 Enviar Mensagem WhatsApp
```json
{
  "phone": "5511999999999",
  "message": "Olá! Seu veículo está pronto para retirada.",
  "vehicle_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### 🖼️ Upload de Arquivo
```
POST /v1/media/upload
Content-Type: multipart/form-data

file: [arquivo]
vehicle_id: "123e4567-e89b-12d3-a456-426614174000"
description: "Foto do motor antes da manutenção"
tags: "motor,manutencao,antes"
```

### Códigos de Status

- `200` - Sucesso
- `201` - Criado com sucesso
- `204` - Sem conteúdo (sucesso)
- `400` - Dados inválidos
- `401` - Não autorizado
- `404` - Não encontrado
- `409` - Conflito (ex: CNPJ duplicado)
- `413` - Payload muito grande
- `429` - Limite de taxa excedido
- `500` - Erro interno do servidor

### Headers Importantes

- `Authorization: Bearer <token>` - JWT token ou client token
- `X-Tenant-ID: <tenant_id>` - ID do tenant
- `X-Correlation-ID: <correlation_id>` - ID de correlação (opcional)
- `Idempotency-Key: <key>` - Chave de idempotência (opcional)

### Limites e Rate Limiting

- **Rate Limiting**: 100 requisições por minuto por tenant
- **Upload de arquivos**: 10MB máximo
- **Tamanho de resposta**: 10MB máximo
- **Timeout**: 30 segundos
- **JWT Token**: 24 horas
- **Refresh Token**: 7 dias

### 🔐 Funcionalidades de Autenticação

#### **Gestão de Usuários**
- **Multi-tenant**: Usuários isolados por tenant
- **Roles**: Admin, Manager, User, Viewer
- **Scopes**: Permissões baseadas em roles
- **Status**: Active, Inactive, Locked, Deleted

#### **Segurança Avançada**
- **Bloqueio de conta**: Após 5 tentativas falhadas
- **Refresh tokens**: Renovação automática de sessões
- **MFA**: Preparado para autenticação de dois fatores
- **Reset de senha**: Via email com tokens seguros

#### **Sessões e Tokens**
- **JWT Access Token**: Para acesso à API (24h)
- **Refresh Token**: Para renovar sessões (7 dias)
- **Logout**: Invalidação de tokens
- **Logout All**: Invalidação de todos os dispositivos

### Funcionalidades Especiais

#### Gestão de Oficinas
- **Multi-oficina**: Suporte a múltiplas oficinas por tenant
- **Tipos de oficina**: Principal, filial ou parceira
- **Capacidade**: Controle de veículos e mecânicos por oficina
- **Especialidades**: Definição de serviços oferecidos
- **Horários**: Configuração de funcionamento por dia da semana

#### Gestão de Ordens de Serviço
- **Workflow completo**: Criação → Aprovação → Início → Conclusão
- **Valores estimados**: Controle de orçamentos e aprovações
- **Vinculação**: Ordens vinculadas a veículos e oficinas
- **Estatísticas**: Taxa de conversão e tempo de aprovação
- **Status tracking**: Acompanhamento completo do ciclo de vida

#### Integração ERP
- **Sincronização**: API preparada para integração com sistemas ERP
- **IDs externos**: Suporte a identificadores de sistemas externos
- **Webhooks**: Recebimento de atualizações de sistemas parceiros

#### Rastreabilidade
- **Workshop ID**: Todos os recursos vinculados a oficinas específicas
- **Vehicle ID**: Ordens e mídia vinculados a veículos
- **User ID**: Todas as operações rastreadas por usuário
- **Correlation ID**: Rastreamento de requisições
- **Auditoria**: Logs detalhados de todas as operações

### Suporte

Para dúvidas sobre a API, entre em contato:
- Email: contato@reparaja.com
- Documentação: https://docs.reparaja.com
