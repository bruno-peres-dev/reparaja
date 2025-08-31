const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware para autenticação JWT
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Token de autenticação é obrigatório',
          details: { required: 'Bearer <JWT>' }
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verifica se o token não expirou
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Token expirado',
          details: { expired_at: new Date(decoded.exp * 1000).toISOString() }
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }

    // Busca informações do tenant
    const tenantResult = await query(
      'SELECT id, name, plan, status, limits FROM tenants WHERE id = $1 AND status = $2',
      [decoded.tenant_id, 'active']
    );

    if (tenantResult.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Tenant inválido ou inativo',
          details: { tenant_id: decoded.tenant_id }
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }

    req.user = {
      tenant_id: decoded.tenant_id,
      client_id: decoded.client_id,
      scopes: decoded.scopes || [],
      tenant: tenantResult.rows[0]
    };

    next();
  } catch (error) {
    logger.error('Erro na autenticação JWT', { error: error.message });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Token inválido',
          details: { reason: 'malformed_token' }
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }

    return res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Erro interno na autenticação'
      },
      correlation_id: req.headers['x-correlation-id'] || 'unknown'
    });
  }
};

/**
 * Middleware para validar tenant ID no header
 */
const validateTenantHeader = (req, res, next) => {
  const tenantId = req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'Header X-Tenant-ID é obrigatório',
        details: { required: 'X-Tenant-ID: <tenant_id>' }
      },
      correlation_id: req.headers['x-correlation-id'] || 'unknown'
    });
  }

  // Verifica se o tenant do token corresponde ao header
  if (req.user && req.user.tenant_id !== tenantId) {
    return res.status(403).json({
      error: {
        code: 'forbidden',
        message: 'Tenant ID não corresponde ao token',
        details: { 
          token_tenant: req.user.tenant_id,
          header_tenant: tenantId 
        }
      },
      correlation_id: req.headers['x-correlation-id'] || 'unknown'
    });
  }

  req.tenantId = tenantId;
  next();
};

/**
 * Middleware para verificar escopo de permissão
 */
const requireScope = (requiredScopes) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'unauthorized',
          message: 'Autenticação necessária'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }

    const userScopes = req.user.scopes || [];
    const hasRequiredScope = requiredScopes.some(scope => userScopes.includes(scope));

    if (!hasRequiredScope) {
      return res.status(403).json({
        error: {
          code: 'forbidden',
          message: 'Permissão insuficiente',
          details: { 
            required: requiredScopes,
            granted: userScopes 
          }
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar limites do plano
 */
const checkPlanLimits = async (req, res, next) => {
  try {
    const tenant = req.user.tenant;
    
    // Verifica limite de placas
    if (req.path.includes('/vehicles') && req.method === 'POST') {
      const vehicleCount = await query(
        'SELECT COUNT(*) as count FROM vehicles WHERE tenant_id = $1',
        [tenant.id]
      );
      
      if (parseInt(vehicleCount.rows[0].count) >= tenant.limits.plates) {
        return res.status(429).json({
          error: {
            code: 'plan_limit_exceeded',
            message: 'Limite de placas do plano atingido',
            details: {
              limit: tenant.limits.plates,
              current: parseInt(vehicleCount.rows[0].count),
              plan: tenant.plan
            }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }
    }

    // Verifica limite de mensagens
    if (req.path.includes('/messages') && req.method === 'POST') {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const messageCount = await query(
        'SELECT COUNT(*) as count FROM messages WHERE tenant_id = $1 AND DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', $2::date)',
        [tenant.id, currentMonth]
      );
      
      if (parseInt(messageCount.rows[0].count) >= tenant.limits.messages) {
        return res.status(429).json({
          error: {
            code: 'plan_limit_exceeded',
            message: 'Limite de mensagens do plano atingido',
            details: {
              limit: tenant.limits.messages,
              current: parseInt(messageCount.rows[0].count),
              period: currentMonth,
              plan: tenant.plan
            }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Erro ao verificar limites do plano', { error: error.message });
    next(); // Continua em caso de erro na verificação
  }
};

module.exports = {
  authenticateJWT,
  validateTenantHeader,
  requireScope,
  checkPlanLimits
};
