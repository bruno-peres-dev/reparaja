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

### Autenticação

A API usa dois tipos de autenticação:

1. **Bearer Token (JWT)**:
   - Clique no botão "Authorize" no topo da página
   - Digite seu token JWT no formato: `Bearer seu_token_aqui`
   - Clique em "Authorize"

2. **Tenant Header**:
   - Adicione o header `X-Tenant-ID` com o ID do seu tenant
   - Exemplo: `123e4567-e89b-12d3-a456-426614174000`

### Endpoints Principais

#### Veículos
- `POST /v1/vehicles` - Criar veículo
- `GET /v1/vehicles` - Listar veículos
- `GET /v1/vehicles/{id}` - Buscar veículo por ID
- `PATCH /v1/vehicles/{id}` - Atualizar veículo
- `DELETE /v1/vehicles/{id}` - Remover veículo
- `GET /v1/vehicles/code/{code16}` - Buscar por código de 16 caracteres

#### Mensagens
- `POST /v1/messages/whatsapp/text` - Enviar mensagem de texto
- `POST /v1/messages/whatsapp/template` - Enviar template
- `POST /v1/messages/whatsapp/interactive` - Enviar mensagem interativa
- `POST /v1/messages/whatsapp/list` - Enviar lista de opções
- `GET /v1/messages` - Listar mensagens
- `GET /v1/messages/{id}/status` - Verificar status

#### Mídia
- `POST /v1/media/upload` - Upload de arquivo
- `GET /v1/media` - Listar mídia
- `GET /v1/media/{id}` - Obter mídia por ID
- `GET /v1/media/vehicle/{id}` - Mídia por veículo
- `PATCH /v1/media/{id}` - Atualizar mídia
- `DELETE /v1/media/{id}` - Deletar mídia
- `GET /v1/media/stats/storage` - Estatísticas de armazenamento

#### Webhooks
- `GET /v1/webhooks/whatsapp` - Verificação do webhook WhatsApp
- `POST /v1/webhooks/whatsapp` - Recebimento de webhooks
- `POST /v1/webhooks/partners` - Cadastrar webhook de parceiro
- `GET /v1/webhooks/partners` - Listar webhooks
- `DELETE /v1/webhooks/partners/{id}` - Remover webhook

#### Utilitários
- `POST /v1/utils/code16` - Gerar código de 16 caracteres

### Exemplos de Uso

#### Criar um Veículo
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

#### Enviar Mensagem WhatsApp
```json
{
  "phone": "5511999999999",
  "message": "Olá! Seu veículo está pronto para retirada.",
  "vehicle_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### Upload de Arquivo
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
- `413` - Payload muito grande
- `429` - Limite de taxa excedido
- `500` - Erro interno do servidor

### Headers Importantes

- `Authorization: Bearer <token>` - Token JWT
- `X-Tenant-ID: <tenant_id>` - ID do tenant
- `X-Correlation-ID: <correlation_id>` - ID de correlação (opcional)
- `Idempotency-Key: <key>` - Chave de idempotência (opcional)

### Limites e Rate Limiting

- **Rate Limiting**: 100 requisições por minuto por tenant
- **Upload de arquivos**: 10MB máximo
- **Tamanho de resposta**: 10MB máximo
- **Timeout**: 30 segundos

### Suporte

Para dúvidas sobre a API, entre em contato:
- Email: contato@reparaja.com
- Documentação: https://docs.reparaja.com
