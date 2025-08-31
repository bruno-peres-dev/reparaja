const express = require('express');
const MessageController = require('../controllers/MessageController');
const { authenticateJWT, validateTenantHeader, requireScope, checkPlanLimits } = require('../middleware/auth');
const { tenantRateLimiter, whatsappRateLimiter, checkIdempotency } = require('../middleware/rateLimit');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateJWT);
router.use(validateTenantHeader);
router.use(requireScope(['messages']));

/**
 * @swagger
 * /v1/messages/whatsapp/text:
 *   post:
 *     summary: Enviar mensagem de texto via WhatsApp
 *     description: Envia uma mensagem de texto simples via WhatsApp
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - message
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Número do telefone (formato internacional)
 *                 example: "5511999999999"
 *               message:
 *                 type: string
 *                 description: Texto da mensagem
 *                 example: "Olá! Seu veículo está pronto para retirada."
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do veículo relacionado (opcional)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Mensagem enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/whatsapp/text', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendText
);

/**
 * @swagger
 * /v1/messages/whatsapp/template:
 *   post:
 *     summary: Enviar template via WhatsApp
 *     description: Envia uma mensagem usando template pré-aprovado do WhatsApp
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - template_id
 *               - variables
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Número do telefone (formato internacional)
 *                 example: "5511999999999"
 *               template_id:
 *                 type: string
 *                 description: ID do template aprovado
 *                 example: "manutencao_concluida"
 *               variables:
 *                 type: object
 *                 description: Variáveis para o template
 *                 example: {
 *                   "cliente": "João Silva",
 *                   "veiculo": "Toyota Corolla 2022",
 *                   "data": "15/12/2024"
 *                 }
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do veículo relacionado (opcional)
 *     responses:
 *       201:
 *         description: Template enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/whatsapp/template', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendTemplate
);

/**
 * @swagger
 * /v1/messages/whatsapp/interactive:
 *   post:
 *     summary: Enviar mensagem interativa com botões
 *     description: Envia uma mensagem interativa com botões via WhatsApp
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - header
 *               - body
 *               - buttons
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Número do telefone (formato internacional)
 *                 example: "5511999999999"
 *               header:
 *                 type: string
 *                 description: Cabeçalho da mensagem
 *                 example: "Manutenção Concluída"
 *               body:
 *                 type: string
 *                 description: Corpo da mensagem
 *                 example: "Seu veículo está pronto para retirada. O que gostaria de fazer?"
 *               buttons:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ID do botão
 *                     title:
 *                       type: string
 *                       description: Texto do botão
 *                 example: [
 *                   {"id": "agendar", "title": "Agendar Retirada"},
 *                   {"id": "info", "title": "Mais Informações"}
 *                 ]
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do veículo relacionado (opcional)
 *     responses:
 *       201:
 *         description: Mensagem interativa enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/whatsapp/interactive', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendInteractive
);

/**
 * @swagger
 * /v1/messages/whatsapp/list:
 *   post:
 *     summary: Enviar mensagem interativa com lista
 *     description: Envia uma mensagem interativa com lista de opções via WhatsApp
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - header
 *               - body
 *               - sections
 *             properties:
 *               phone:
 *                 type: string
 *                 description: Número do telefone (formato internacional)
 *                 example: "5511999999999"
 *               header:
 *                 type: string
 *                 description: Cabeçalho da mensagem
 *                 example: "Serviços Disponíveis"
 *               body:
 *                 type: string
 *                 description: Corpo da mensagem
 *                 example: "Escolha um dos serviços abaixo:"
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       description: Título da seção
 *                     rows:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: ID da opção
 *                           title:
 *                             type: string
 *                             description: Título da opção
 *                           description:
 *                             type: string
 *                             description: Descrição da opção
 *                 example: [
 *                   {
 *                     "title": "Manutenção",
 *                     "rows": [
 *                       {"id": "oleo", "title": "Troca de Óleo", "description": "R$ 150,00"},
 *                       {"id": "filtros", "title": "Troca de Filtros", "description": "R$ 80,00"}
 *                     ]
 *                   }
 *                 ]
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do veículo relacionado (opcional)
 *     responses:
 *       201:
 *         description: Lista enviada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/whatsapp/list', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendList
);

/**
 * @swagger
 * /v1/messages:
 *   get:
 *     summary: Listar mensagens
 *     description: Lista todas as mensagens do tenant autenticado
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número de itens por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, delivered, read, failed]
 *         description: Filtrar por status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [whatsapp, sms, email]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: vehicle_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por veículo
 *     responses:
 *       200:
 *         description: Lista de mensagens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', 
  tenantRateLimiter,
  MessageController.list
);

/**
 * @swagger
 * /v1/messages/{messageId}/status:
 *   get:
 *     summary: Verificar status de mensagem
 *     description: Retorna o status atual de uma mensagem específica
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único da mensagem
 *     responses:
 *       200:
 *         description: Status da mensagem
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message_id:
 *                   type: string
 *                   format: uuid
 *                 status:
 *                   type: string
 *                   enum: [pending, sent, delivered, read, failed]
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                 details:
 *                   type: object
 *                   description: Detalhes adicionais do status
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Mensagem não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:messageId/status', 
  tenantRateLimiter,
  MessageController.getStatus
);

module.exports = router;
