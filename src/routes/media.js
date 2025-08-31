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

// Upload de arquivos
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

// Listar mídia
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

// Obter mídia por ID
router.get('/:id',
  tenantRateLimiter,
  [
    param('id').isUUID()
  ],
  mediaController.getById.bind(mediaController)
);

// Obter mídia por veículo
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

// Atualizar mídia
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

// Deletar mídia
router.delete('/:id',
  tenantRateLimiter,
  [
    param('id').isUUID()
  ],
  mediaController.delete.bind(mediaController)
);

// Estatísticas de armazenamento
router.get('/stats/storage',
  tenantRateLimiter,
  mediaController.getStorageStats.bind(mediaController)
);

module.exports = router;