const express = require('express');
const MessageController = require('../controllers/MessageController');
const { authenticateJWT, validateTenantHeader, requireScope, checkPlanLimits } = require('../middleware/auth');
const { tenantRateLimiter, whatsappRateLimiter, checkIdempotency } = require('../middleware/rateLimit');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateJWT);
router.use(validateTenantHeader);
router.use(requireScope(['messages']));

// POST /messages/whatsapp/text - Enviar mensagem de texto
router.post('/whatsapp/text', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendText
);

// POST /messages/whatsapp/template - Enviar template
router.post('/whatsapp/template', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendTemplate
);

// POST /messages/whatsapp/interactive - Enviar mensagem interativa com botões
router.post('/whatsapp/interactive', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendInteractive
);

// POST /messages/whatsapp/list - Enviar mensagem interativa com lista
router.post('/whatsapp/list', 
  whatsappRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  MessageController.sendList
);

// GET /messages - Listar mensagens
router.get('/', 
  tenantRateLimiter,
  MessageController.list
);

// GET /messages/:messageId/status - Verificar status de mensagem
router.get('/:messageId/status', 
  tenantRateLimiter,
  MessageController.getStatus
);

module.exports = router;
