const express = require('express');
const WorkshopController = require('../controllers/WorkshopController');
const { authenticateJWT, validateTenantHeader, requireScope, checkPlanLimits } = require('../middleware/auth');
const { tenantRateLimiter, createResourceRateLimiter, checkIdempotency } = require('../middleware/rateLimit');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateJWT);
router.use(validateTenantHeader);
router.use(requireScope(['workshops']));

/**
 * @swagger
 * /v1/workshops:
 *   post:
 *     summary: Criar nova oficina
 *     description: Cria uma nova oficina para o tenant autenticado
 *     tags: [Workshops]
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Nome da oficina
 *                 example: "Oficina Central"
 *               cnpj:
 *                 type: string
 *                 pattern: '^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$'
 *                 description: CNPJ da oficina (formato XX.XXX.XXX/XXXX-XX)
 *                 example: "12.345.678/0001-90"
 *               corporate_name:
 *                 type: string
 *                 description: Razão social da oficina
 *                 example: "Oficina Central Ltda"
 *               address:
 *                 type: object
 *                 description: Endereço completo da oficina
 *                 properties:
 *                   street:
 *                     type: string
 *                     description: Rua
 *                     example: "Rua das Oficinas"
 *                   number:
 *                     type: string
 *                     description: Número
 *                     example: "123"
 *                   complement:
 *                     type: string
 *                     description: Complemento
 *                     example: "Sala 45"
 *                   neighborhood:
 *                     type: string
 *                     description: Bairro
 *                     example: "Centro"
 *                   city:
 *                     type: string
 *                     description: Cidade
 *                     example: "São Paulo"
 *                   state:
 *                     type: string
 *                     description: Estado
 *                     example: "SP"
 *                   zip_code:
 *                     type: string
 *                     description: CEP
 *                     example: "01234-567"
 *                   coordinates:
 *                     type: object
 *                     description: Coordenadas geográficas
 *                     properties:
 *                       lat:
 *                         type: number
 *                         description: Latitude
 *                         example: -23.5505
 *                       lng:
 *                         type: number
 *                         description: Longitude
 *                         example: -46.6333
 *               phone:
 *                 type: string
 *                 description: Telefone da oficina
 *                 example: "+5511999999999"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email da oficina
 *                 example: "contato@oficinacentral.com"
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Website da oficina
 *                 example: "https://oficinacentral.com"
 *               type:
 *                 type: string
 *                 enum: [main, branch, partner]
 *                 default: branch
 *                 description: Tipo da oficina
 *                 example: "branch"
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 default: active
 *                 description: Status da oficina
 *                 example: "active"
 *               timezone:
 *                 type: string
 *                 default: "America/Sao_Paulo"
 *                 description: Fuso horário da oficina
 *                 example: "America/Sao_Paulo"
 *               working_hours:
 *                 type: object
 *                 description: Horário de funcionamento
 *                 properties:
 *                   monday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                         description: Horário de abertura
 *                         example: "08:00"
 *                       close:
 *                         type: string
 *                         description: Horário de fechamento
 *                         example: "18:00"
 *                   tuesday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                       close:
 *                         type: string
 *                   wednesday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                       close:
 *                         type: string
 *                   thursday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                       close:
 *                         type: string
 *                   friday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                       close:
 *                         type: string
 *                   saturday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                       close:
 *                         type: string
 *                   sunday:
 *                     type: object
 *                     properties:
 *                       open:
 *                         type: string
 *                       close:
 *                         type: string
 *               max_vehicles_per_day:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 default: 50
 *                 description: Máximo de veículos atendidos por dia
 *                 example: 50
 *               max_mechanics:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 default: 10
 *                 description: Máximo de mecânicos na oficina
 *                 example: 10
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Especialidades da oficina
 *                 example: ["manutencao", "reparo", "diagnostico", "eletrica"]
 *               erp_id:
 *                 type: string
 *                 description: ID da oficina no sistema ERP
 *                 example: "ERP_001"
 *               erp_sync_enabled:
 *                 type: boolean
 *                 default: false
 *                 description: Habilitar sincronização com ERP
 *                 example: false
 *     responses:
 *       201:
 *         description: Oficina criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workshop'
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
 *       409:
 *         description: CNPJ já existe
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
router.post('/', 
  createResourceRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  WorkshopController.create
);

/**
 * @swagger
 * /v1/workshops:
 *   get:
 *     summary: Listar oficinas
 *     description: Lista todas as oficinas do tenant autenticado
 *     tags: [Workshops]
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
 *           enum: [active, inactive, suspended]
 *         description: Filtrar por status
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [main, branch, partner]
 *         description: Filtrar por tipo
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca (nome ou CNPJ)
 *     responses:
 *       200:
 *         description: Lista de oficinas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Workshop'
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
  WorkshopController.list
);

/**
 * @swagger
 * /v1/workshops/{id}:
 *   get:
 *     summary: Buscar oficina por ID
 *     description: Retorna os detalhes de uma oficina específica
 *     tags: [Workshops]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único da oficina
 *     responses:
 *       200:
 *         description: Detalhes da oficina
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workshop'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Oficina não encontrada
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
router.get('/:id', 
  tenantRateLimiter,
  WorkshopController.getById
);

/**
 * @swagger
 * /v1/workshops/{id}:
 *   patch:
 *     summary: Atualizar oficina
 *     description: Atualiza os dados de uma oficina existente
 *     tags: [Workshops]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único da oficina
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Nome da oficina
 *               cnpj:
 *                 type: string
 *                 pattern: '^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$'
 *                 description: CNPJ da oficina
 *               corporate_name:
 *                 type: string
 *                 description: Razão social da oficina
 *               address:
 *                 type: object
 *                 description: Endereço completo da oficina
 *               phone:
 *                 type: string
 *                 description: Telefone da oficina
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email da oficina
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Website da oficina
 *               type:
 *                 type: string
 *                 enum: [main, branch, partner]
 *                 description: Tipo da oficina
 *               status:
 *                 type: string
 *                 enum: [active, inactive, suspended]
 *                 description: Status da oficina
 *               timezone:
 *                 type: string
 *                 description: Fuso horário da oficina
 *               working_hours:
 *                 type: object
 *                 description: Horário de funcionamento
 *               max_vehicles_per_day:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Máximo de veículos atendidos por dia
 *               max_mechanics:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Máximo de mecânicos na oficina
 *               specialties:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Especialidades da oficina
 *               erp_id:
 *                 type: string
 *                 description: ID da oficina no sistema ERP
 *               erp_sync_enabled:
 *                 type: boolean
 *                 description: Habilitar sincronização com ERP
 *     responses:
 *       200:
 *         description: Oficina atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workshop'
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
 *       404:
 *         description: Oficina não encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: CNPJ já existe
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
router.patch('/:id', 
  tenantRateLimiter,
  checkIdempotency,
  WorkshopController.update
);

/**
 * @swagger
 * /v1/workshops/{id}:
 *   delete:
 *     summary: Deletar oficina
 *     description: Remove uma oficina do sistema (não pode ser a principal)
 *     tags: [Workshops]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único da oficina
 *     responses:
 *       204:
 *         description: Oficina removida com sucesso
 *       400:
 *         description: Não é possível deletar oficina principal ou com dependências
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
 *       404:
 *         description: Oficina não encontrada
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
router.delete('/:id', 
  tenantRateLimiter,
  WorkshopController.delete
);

/**
 * @swagger
 * /v1/workshops/{id}/vehicles:
 *   get:
 *     summary: Veículos da oficina
 *     description: Lista todos os veículos atendidos em uma oficina específica
 *     tags: [Workshops]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da oficina
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
 *           enum: [active, inactive, maintenance, completed]
 *         description: Filtrar por status do veículo
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filtrar por marca
 *     responses:
 *       200:
 *         description: Lista de veículos da oficina
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
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
 *       404:
 *         description: Oficina não encontrada
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
router.get('/:id/vehicles', 
  tenantRateLimiter,
  WorkshopController.getVehicles
);

/**
 * @swagger
 * /v1/workshops/{id}/orders:
 *   get:
 *     summary: Ordens de serviço da oficina
 *     description: Lista todas as ordens de serviço de uma oficina específica
 *     tags: [Workshops]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da oficina
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
 *           enum: [pending, in_progress, completed, cancelled]
 *         description: Filtrar por status da ordem
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial para filtro
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final para filtro
 *     responses:
 *       200:
 *         description: Lista de ordens de serviço da oficina
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
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
 *       404:
 *         description: Oficina não encontrada
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
router.get('/:id/orders', 
  tenantRateLimiter,
  WorkshopController.getOrders
);

/**
 * @swagger
 * /v1/workshops/{id}/stats:
 *   get:
 *     summary: Estatísticas da oficina
 *     description: Retorna estatísticas completas de uma oficina específica
 *     tags: [Workshops]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da oficina
 *     responses:
 *       200:
 *         description: Estatísticas da oficina
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 workshop:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     type:
 *                       type: string
 *                     status:
 *                       type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     vehicles:
 *                       type: object
 *                       properties:
 *                         total_vehicles:
 *                           type: integer
 *                         active_vehicles:
 *                           type: integer
 *                     orders:
 *                       type: object
 *                       properties:
 *                         total_orders:
 *                           type: integer
 *                         completed_orders:
 *                           type: integer
 *                         pending_orders:
 *                           type: integer
 *                     revenue:
 *                       type: object
 *                       properties:
 *                         total_revenue:
 *                           type: number
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Oficina não encontrada
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
router.get('/:id/stats', 
  tenantRateLimiter,
  WorkshopController.getStats
);

/**
 * @swagger
 * /v1/workshops/{id}/sync-erp:
 *   post:
 *     summary: Sincronizar com ERP
 *     description: Inicia sincronização da oficina com sistema ERP
 *     tags: [Workshops]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da oficina
 *     responses:
 *       200:
 *         description: Sincronização iniciada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Sincronização com ERP iniciada com sucesso"
 *                 last_sync:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Sincronização com ERP não habilitada
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
 *       404:
 *         description: Oficina não encontrada
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
router.post('/:id/sync-erp', 
  tenantRateLimiter,
  WorkshopController.syncWithERP
);

module.exports = router;
