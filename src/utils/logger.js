const winston = require('winston');
const path = require('path');

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    return log;
  })
);

// Configuração dos transportes
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Adicionar arquivo de log em produção
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'error.log'),
      level: 'error',
      format: logFormat
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'combined.log'),
      format: logFormat
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  // Não sair em caso de erro não tratado
  exitOnError: false
});

// Função para mascarar dados sensíveis
const maskSensitiveData = (data) => {
  if (typeof data === 'string') {
    // Mascarar números de telefone
    return data.replace(/(\+55\d{2})(\d{4})(\d{4})/, '+55$1****$3');
  }
  return data;
};

// Logger wrapper com mascaramento de dados sensíveis
const safeLogger = {
  info: (message, meta = {}) => {
    const maskedMeta = Object.keys(meta).reduce((acc, key) => {
      acc[key] = maskSensitiveData(meta[key]);
      return acc;
    }, {});
    logger.info(message, maskedMeta);
  },
  
  error: (message, meta = {}) => {
    const maskedMeta = Object.keys(meta).reduce((acc, key) => {
      acc[key] = maskSensitiveData(meta[key]);
      return acc;
    }, {});
    logger.error(message, maskedMeta);
  },
  
  warn: (message, meta = {}) => {
    const maskedMeta = Object.keys(meta).reduce((acc, key) => {
      acc[key] = maskSensitiveData(meta[key]);
      return acc;
    }, {});
    logger.warn(message, maskedMeta);
  },
  
  debug: (message, meta = {}) => {
    const maskedMeta = Object.keys(meta).reduce((acc, key) => {
      acc[key] = maskSensitiveData(meta[key]);
      return acc;
    }, {});
    logger.debug(message, maskedMeta);
  }
};

module.exports = safeLogger;
