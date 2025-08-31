const rateLimit = require('express-rate-limit');
const redis = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Rate limiter personalizado usando Redis
 */
const createRateLimiter = (windowMs, maxRequests, keyGenerator) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator,
    handler: (req, res) => {
      const retryAfter = Math.ceil(windowMs / 1000);
      
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': 0,
        'Retry-After': retryAfter
      });

      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: 'Limite de requisições excedido',
          details: {
            limit: maxRequests,
            window_seconds: Math.ceil(windowMs / 1000),
            retry_after: retryAfter
          }
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    },
    skip: (req) => {
      // Pula rate limiting para webhooks
      return req.path.startsWith('/webhooks');
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

/**
 * Rate limiter por tenant
 */
const tenantRateLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minuto
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 600, // 600 req/min
  (req) => {
    // Usa tenant_id do header ou do token
    const tenantId = req.headers['x-tenant-id'] || (req.user ? req.user.tenant_id : 'anonymous');
    return `rate_limit:${tenantId}`;
  }
);

/**
 * Rate limiter específico para WhatsApp (70 req/min por número)
 */
const whatsappRateLimiter = createRateLimiter(
  60000, // 1 minuto
  70, // 70 req/min por número
  (req) => {
    const tenantId = req.headers['x-tenant-id'] || (req.user ? req.user.tenant_id : 'anonymous');
    const phoneNumber = req.body?.to || 'unknown';
    return `whatsapp_rate:${tenantId}:${phoneNumber}`;
  }
);

/**
 * Rate limiter para criação de recursos (mais restritivo)
 */
const createResourceRateLimiter = createRateLimiter(
  60000, // 1 minuto
  100, // 100 req/min para criação
  (req) => {
    const tenantId = req.headers['x-tenant-id'] || (req.user ? req.user.tenant_id : 'anonymous');
    return `create_rate:${tenantId}`;
  }
);

/**
 * Middleware para adicionar headers de rate limit
 */
const addRateLimitHeaders = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] || (req.user ? req.user.tenant_id : 'anonymous');
  const key = `rate_limit:${tenantId}`;
  
  // Adiciona headers básicos
  res.set({
    'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX_REQUESTS || 600,
    'X-RateLimit-Window': Math.ceil((process.env.RATE_LIMIT_WINDOW_MS || 60000) / 1000)
  });
  
  next();
};

/**
 * Função para verificar rate limit manualmente
 */
const checkRateLimit = async (key, limit, windowMs) => {
  try {
    const current = await redis.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + windowMs
      };
    }
    
    // Incrementa contador
    await redis.multi()
      .incr(key)
      .expire(key, Math.ceil(windowMs / 1000))
      .exec();
    
    return {
      allowed: true,
      remaining: limit - count - 1,
      resetTime: Date.now() + windowMs
    };
  } catch (error) {
    logger.error('Erro ao verificar rate limit', { error: error.message, key });
    // Em caso de erro, permite a requisição
    return { allowed: true, remaining: 999, resetTime: Date.now() + windowMs };
  }
};

/**
 * Middleware para verificar idempotência
 */
const checkIdempotency = async (req, res, next) => {
  const idempotencyKey = req.headers['idempotency-key'];
  
  if (!idempotencyKey) {
    return next();
  }
  
  // Valida formato UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    return res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'Idempotency-Key deve ser um UUID válido',
        details: { provided: idempotencyKey }
      },
      correlation_id: req.headers['x-correlation-id'] || 'unknown'
    });
  }
  
  const tenantId = req.headers['x-tenant-id'] || (req.user ? req.user.tenant_id : 'anonymous');
  const key = `idempotency:${tenantId}:${idempotencyKey}`;
  
  try {
    const existing = await redis.get(key);
    
    if (existing) {
      // Retorna resposta anterior
      const cachedResponse = JSON.parse(existing);
      return res.status(cachedResponse.status).json(cachedResponse.data);
    }
    
    // Intercepta a resposta para cache
    const originalSend = res.json;
    res.json = function(data) {
      // Cache da resposta por 24 horas
      redis.setex(key, 86400, JSON.stringify({
        status: res.statusCode,
        data: data
      }));
      
      originalSend.call(this, data);
    };
    
    next();
  } catch (error) {
    logger.error('Erro ao verificar idempotência', { error: error.message });
    next(); // Continua em caso de erro
  }
};

module.exports = {
  tenantRateLimiter,
  whatsappRateLimiter,
  createResourceRateLimiter,
  addRateLimitHeaders,
  checkRateLimit,
  checkIdempotency
};
