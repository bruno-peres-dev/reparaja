const express = require('express');
const VehicleController = require('../controllers/VehicleController');
const { authenticateJWT, validateTenantHeader, requireScope, checkPlanLimits } = require('../middleware/auth');
const { tenantRateLimiter, createResourceRateLimiter, checkIdempotency } = require('../middleware/rateLimit');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateJWT);
router.use(validateTenantHeader);
router.use(requireScope(['vehicles']));

// POST /vehicles - Criar veículo
router.post('/', 
  createResourceRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  VehicleController.create
);

// GET /vehicles - Listar veículos
router.get('/', 
  tenantRateLimiter,
  VehicleController.list
);

// GET /vehicles/:vehicleId - Buscar veículo por ID
router.get('/:vehicleId', 
  tenantRateLimiter,
  VehicleController.getById
);

// PATCH /vehicles/:vehicleId - Atualizar veículo
router.patch('/:vehicleId', 
  tenantRateLimiter,
  checkIdempotency,
  VehicleController.update
);

// DELETE /vehicles/:vehicleId - Remover veículo
router.delete('/:vehicleId', 
  tenantRateLimiter,
  VehicleController.delete
);

// GET /vehicles/code/:code16 - Buscar veículo por código de 16 caracteres
router.get('/code/:code16', 
  tenantRateLimiter,
  VehicleController.getByCode16
);

module.exports = router;
