require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const specs = require('../swaggerDef');
const { generateUUID } = require('./utils/crypto');
const logger = require('./utils/logger');

// Importa rotas
const vehiclesRoutes = require('./routes/vehicles');
const messagesRoutes = require('./routes/messages');
const webhooksRoutes = require('./routes/webhooks');
const utilsRoutes = require('./routes/utils');
const mediaRoutes = require('./routes/media');
const workshopsRoutes = require('./routes/workshops');
const ordersRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.BASE_URL_PROD, process.env.BASE_URL_SANDBOX]
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Tenant-ID', 
    'X-Correlation-ID',
    'Idempotency-Key'
  ]
}));

// Compressão
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Middleware para adicionar correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || generateUUID();
  res.set('X-Correlation-ID', req.correlationId);
  next();
});

// Parser de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Status da API
app.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// Documentação da API (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Repara-Já API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    deepLinking: true
  }
}));

// Rota para obter especificação JSON do Swagger
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Rotas da API v1
app.use('/v1/auth', authRoutes);
app.use('/v1/vehicles', vehiclesRoutes);
app.use('/v1/messages', messagesRoutes);
app.use('/v1/webhooks', webhooksRoutes);
app.use('/v1/utils', utilsRoutes);
app.use('/v1/media', mediaRoutes);
app.use('/v1/workshops', workshopsRoutes);
app.use('/v1/orders', ordersRoutes);

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  logger.error('Erro não tratado', { 
    error: err.message, 
    stack: err.stack,
    correlation_id: req.correlationId 
  });

  // Se já foi enviada resposta, não faz nada
  if (res.headersSent) {
    return next(err);
  }

  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'Dados inválidos',
        details: err.details
      },
      correlation_id: req.correlationId
    });
  }

  // Erro de sintaxe JSON
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'invalid_request',
        message: 'JSON inválido',
        details: { reason: 'malformed_json' }
      },
      correlation_id: req.correlationId
    });
  }

  // Erro de limite de payload
  if (err.status === 413) {
    return res.status(413).json({
      error: {
        code: 'invalid_request',
        message: 'Payload muito grande',
        details: { max_size: '10MB' }
      },
      correlation_id: req.correlationId
    });
  }

  // Erro genérico
  res.status(500).json({
    error: {
      code: 'internal_error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Erro interno do servidor' 
        : err.message
    },
    correlation_id: req.correlationId
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'not_found',
      message: 'Endpoint não encontrado',
      details: { 
        method: req.method,
        path: req.originalUrl 
      }
    },
    correlation_id: req.correlationId
  });
});

// Inicia o servidor
app.listen(PORT, () => {
  logger.info(`Servidor iniciado na porta ${PORT}`, {
    environment: process.env.NODE_ENV,
    port: PORT,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor...');
  process.exit(0);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  logger.error('Exceção não capturada', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejeitada não tratada', { 
    reason: reason?.message || reason,
    stack: reason?.stack 
  });
  process.exit(1);
});

module.exports = app;
