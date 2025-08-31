const express = require('express');
const OrderController = require('../controllers/OrderController');
const { authenticateJWT, validateTenantHeader, requireScope, checkPlanLimits } = require('../middleware/auth');
const { tenantRateLimiter, createResourceRateLimiter, checkIdempotency } = require('../middleware/rateLimit');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateJWT);
router.use(validateTenantHeader);
router.use(requireScope(['orders']));

/**
 * @swagger
 * /v1/orders:
 *   post:
 *     summary: Criar nova ordem de serviço
 *     description: Cria uma nova ordem de serviço para um veículo
 *     tags: [Orders]
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
 *               - vehicle_id
 *               - estimate_amount
 *             properties:
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do veículo
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               estimate_amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Valor estimado do serviço
 *                 example: 150.00
 *               status:
 *                 type: string
 *                 enum: [awaiting_approval, approved, in_progress, completed, cancelled]
 *                 default: awaiting_approval
 *                 description: Status inicial da ordem
 *                 example: "awaiting_approval"
 *               notes:
 *                 type: string
 *                 description: Observações sobre o serviço
 *                 example: "Troca de óleo e filtros"
 *               workshop_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID da oficina (opcional)
 *                 example: "456e7890-e89b-12d3-a456-426614174000"
 *     responses:
 *       201:
 *         description: Ordem criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
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
router.post('/', 
  createResourceRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  OrderController.create
);

/**
 * @swagger
 * /v1/orders:
 *   get:
 *     summary: Listar ordens de serviço
 *     description: Lista todas as ordens de serviço com filtros e paginação
 *     tags: [Orders]
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
 *           default: 50
 *         description: Número de itens por página
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [awaiting_approval, approved, in_progress, completed, cancelled]
 *         description: Filtrar por status
 *       - in: query
 *         name: approved
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filtrar por aprovação
 *       - in: query
 *         name: plate
 *         schema:
 *           type: string
 *         description: Filtrar por placa do veículo
 *       - in: query
 *         name: code16
 *         schema:
 *           type: string
 *         description: Filtrar por código de 16 caracteres
 *       - in: query
 *         name: min_amount
 *         schema:
 *           type: number
 *         description: Valor mínimo estimado
 *       - in: query
 *         name: max_amount
 *         schema:
 *           type: number
 *         description: Valor máximo estimado
 *     responses:
 *       200:
 *         description: Lista de ordens de serviço
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders:
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
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', 
  tenantRateLimiter,
  OrderController.list
);

/**
 * @swagger
 * /v1/orders/{id}:
 *   get:
 *     summary: Buscar ordem por ID
 *     description: Retorna os detalhes de uma ordem de serviço específica
 *     tags: [Orders]
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
 *         description: ID único da ordem
 *     responses:
 *       200:
 *         description: Detalhes da ordem
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ordem não encontrada
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
  OrderController.getById
);

/**
 * @swagger
 * /v1/orders/{id}:
 *   patch:
 *     summary: Atualizar ordem de serviço
 *     description: Atualiza os dados de uma ordem de serviço existente
 *     tags: [Orders]
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
 *         description: ID único da ordem
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [awaiting_approval, approved, in_progress, completed, cancelled]
 *                 description: Novo status da ordem
 *               estimate_amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Novo valor estimado
 *               approved:
 *                 type: boolean
 *                 description: Status de aprovação
 *               notes:
 *                 type: string
 *                 description: Novas observações
 *     responses:
 *       200:
 *         description: Ordem atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
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
 *         description: Ordem não encontrada
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
  OrderController.update
);

/**
 * @swagger
 * /v1/orders/{id}:
 *   delete:
 *     summary: Deletar ordem de serviço
 *     description: Remove uma ordem de serviço (não pode ser deletada se estiver ativa)
 *     tags: [Orders]
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
 *         description: ID único da ordem
 *     responses:
 *       204:
 *         description: Ordem removida com sucesso
 *       400:
 *         description: Não é possível deletar ordem ativa
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
 *         description: Ordem não encontrada
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
  OrderController.delete
);

/**
 * @swagger
 * /v1/orders/vehicle/{vehicle_id}:
 *   get:
 *     summary: Ordens por veículo
 *     description: Lista todas as ordens de serviço de um veículo específico
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: vehicle_id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do veículo
 *     responses:
 *       200:
 *         description: Lista de ordens do veículo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vehicle_id:
 *                   type: string
 *                   format: uuid
 *                 orders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 total:
 *                   type: integer
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
router.get('/vehicle/:vehicle_id', 
  tenantRateLimiter,
  OrderController.getByVehicle
);

/**
 * @swagger
 * /v1/orders/stats/conversion:
 *   get:
 *     summary: Estatísticas de conversão
 *     description: Retorna estatísticas de conversão das ordens em um período
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: query
 *         name: from_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: to_date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Data final (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Estatísticas de conversão
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     from_date:
 *                       type: string
 *                       format: date
 *                     to_date:
 *                       type: string
 *                       format: date
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total_orders:
 *                       type: integer
 *                     approved_orders:
 *                       type: integer
 *                     completed_orders:
 *                       type: integer
 *                     approval_rate:
 *                       type: number
 *                     completion_rate:
 *                       type: number
 *                     avg_time_to_approve_minutes:
 *                       type: number
 *                     avg_estimate_amount:
 *                       type: number
 *       400:
 *         description: Datas inválidas
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
router.get('/stats/conversion', 
  tenantRateLimiter,
  OrderController.getConversionStats
);

/**
 * @swagger
 * /v1/orders/{id}/approve:
 *   post:
 *     summary: Aprovar ordem de serviço
 *     description: Aprova uma ordem de serviço pendente
 *     tags: [Orders]
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
 *         description: ID da ordem
 *     responses:
 *       200:
 *         description: Ordem aprovada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Ordem já foi aprovada
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
 *         description: Ordem não encontrada
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
router.post('/:id/approve', 
  tenantRateLimiter,
  OrderController.approve
);

/**
 * @swagger
 * /v1/orders/{id}/start:
 *   post:
 *     summary: Iniciar ordem de serviço
 *     description: Inicia uma ordem de serviço aprovada
 *     tags: [Orders]
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
 *         description: ID da ordem
 *     responses:
 *       200:
 *         description: Ordem iniciada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Ordem não pode ser iniciada
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
 *         description: Ordem não encontrada
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
router.post('/:id/start', 
  tenantRateLimiter,
  OrderController.start
);

/**
 * @swagger
 * /v1/orders/{id}/complete:
 *   post:
 *     summary: Concluir ordem de serviço
 *     description: Marca uma ordem de serviço como concluída
 *     tags: [Orders]
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
 *         description: ID da ordem
 *     responses:
 *       200:
 *         description: Ordem concluída com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Ordem não pode ser concluída
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
 *         description: Ordem não encontrada
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
router.post('/:id/complete', 
  tenantRateLimiter,
  OrderController.complete
);

module.exports = router;
