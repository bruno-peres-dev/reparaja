const express = require('express');
const { body, query, param } = require('express-validator');
const MediaController = require('../controllers/MediaController');
const { 
  authenticateJWT, 
  validateTenantHeader, 
  requireScope,
  checkPlanLimits,
  createResourceRateLimiter,
  checkIdempotency
} = require('../middleware/auth');
const { tenantRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const mediaController = new MediaController();

// Middleware para todas as rotas
router.use(authenticateJWT);
router.use(validateTenantHeader);
router.use(requireScope(['media']));

/**
 * @swagger
 * /v1/media/upload:
 *   post:
 *     summary: Fazer upload de arquivo
 *     description: Faz upload de um arquivo (imagem, vídeo, documento) para o sistema
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo a ser enviado
 *               vehicle_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do veículo relacionado (opcional)
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *               order_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do pedido relacionado (opcional)
 *                 example: "123e4567-e89b-12d3-a456-426614174001"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 description: Descrição do arquivo
 *                 example: "Foto do motor antes da manutenção"
 *               tags:
 *                 type: string
 *                 maxLength: 200
 *                 description: Tags para categorização
 *                 example: "motor,manutencao,antes"
 *     responses:
 *       201:
 *         description: Arquivo enviado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
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
 *       413:
 *         description: Arquivo muito grande
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
router.post('/upload',
  createResourceRateLimiter('media_upload', 10, '1m'), // 10 uploads por minuto
  checkPlanLimits('media_upload'),
  checkIdempotency,
  [
    body('vehicle_id').optional().isUUID(),
    body('order_id').optional().isUUID(),
    body('description').optional().isString().isLength({ max: 500 }),
    body('tags').optional().isString().isLength({ max: 200 })
  ],
  mediaController.upload.bind(mediaController)
);

/**
 * @swagger
 * /v1/media:
 *   get:
 *     summary: Listar mídia
 *     description: Lista todos os arquivos de mídia do tenant autenticado
 *     tags: [Media]
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
 *         name: vehicle_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por veículo
 *       - in: query
 *         name: order_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por pedido
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document, audio]
 *         description: Filtrar por tipo de arquivo
 *       - in: query
 *         name: uploaded_by
 *         schema:
 *           type: string
 *         description: Filtrar por usuário que fez upload
 *     responses:
 *       200:
 *         description: Lista de arquivos de mídia
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Media'
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
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('vehicle_id').optional().isUUID(),
    query('order_id').optional().isUUID(),
    query('type').optional().isIn(['image', 'video', 'document', 'audio']),
    query('uploaded_by').optional().isString()
  ],
  mediaController.list.bind(mediaController)
);

/**
 * @swagger
 * /v1/media/{id}:
 *   get:
 *     summary: Obter mídia por ID
 *     description: Retorna os detalhes de um arquivo de mídia específico
 *     tags: [Media]
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
 *         description: ID único do arquivo de mídia
 *     responses:
 *       200:
 *         description: Detalhes do arquivo de mídia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Arquivo não encontrado
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
  [
    param('id').isUUID()
  ],
  mediaController.getById.bind(mediaController)
);

/**
 * @swagger
 * /v1/media/vehicle/{vehicle_id}:
 *   get:
 *     summary: Obter mídia por veículo
 *     description: Lista todos os arquivos de mídia relacionados a um veículo específico
 *     tags: [Media]
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
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [image, video, document, audio]
 *         description: Filtrar por tipo de arquivo
 *       - in: query
 *         name: order_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por pedido
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número máximo de itens
 *     responses:
 *       200:
 *         description: Lista de arquivos de mídia do veículo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Media'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Veículo não encontrado
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
  [
    param('vehicle_id').isUUID(),
    query('type').optional().isIn(['image', 'video', 'document', 'audio']),
    query('order_id').optional().isUUID(),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  mediaController.getByVehicle.bind(mediaController)
);

/**
 * @swagger
 * /v1/media/{id}:
 *   patch:
 *     summary: Atualizar mídia
 *     description: Atualiza os metadados de um arquivo de mídia
 *     tags: [Media]
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
 *         description: ID único do arquivo de mídia
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [image, video, document, audio]
 *                 description: Tipo do arquivo
 *               metadata:
 *                 type: object
 *                 description: Metadados adicionais do arquivo
 *                 example: {
 *                   "width": 1920,
 *                   "height": 1080,
 *                   "duration": 30
 *                 }
 *               order_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID do pedido relacionado
 *     responses:
 *       200:
 *         description: Mídia atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Media'
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
 *         description: Arquivo não encontrado
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
  [
    param('id').isUUID(),
    body('type').optional().isIn(['image', 'video', 'document', 'audio']),
    body('metadata').optional().isObject(),
    body('order_id').optional().isUUID()
  ],
  mediaController.update.bind(mediaController)
);

/**
 * @swagger
 * /v1/media/{id}:
 *   delete:
 *     summary: Deletar mídia
 *     description: Remove um arquivo de mídia do sistema
 *     tags: [Media]
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
 *         description: ID único do arquivo de mídia
 *     responses:
 *       204:
 *         description: Arquivo removido com sucesso
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Arquivo não encontrado
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
  [
    param('id').isUUID()
  ],
  mediaController.delete.bind(mediaController)
);

/**
 * @swagger
 * /v1/media/stats/storage:
 *   get:
 *     summary: Estatísticas de armazenamento
 *     description: Retorna estatísticas de uso de armazenamento do tenant
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     responses:
 *       200:
 *         description: Estatísticas de armazenamento
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_files:
 *                   type: integer
 *                   description: Número total de arquivos
 *                 total_size:
 *                   type: integer
 *                   description: Tamanho total em bytes
 *                 used_storage:
 *                   type: integer
 *                   description: Armazenamento usado em bytes
 *                 available_storage:
 *                   type: integer
 *                   description: Armazenamento disponível em bytes
 *                 storage_limit:
 *                   type: integer
 *                   description: Limite de armazenamento em bytes
 *                 usage_percentage:
 *                   type: number
 *                   format: float
 *                   description: Percentual de uso
 *                 by_type:
 *                   type: object
 *                   description: Estatísticas por tipo de arquivo
 *                   properties:
 *                     image:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         size:
 *                           type: integer
 *                     video:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         size:
 *                           type: integer
 *                     document:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                         size:
 *                           type: integer
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
router.get('/stats/storage',
  tenantRateLimiter,
  mediaController.getStorageStats.bind(mediaController)
);

module.exports = router;