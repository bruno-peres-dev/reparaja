const redis = require('redis');
const logger = require('../utils/logger');

const client = redis.createClient({
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD || undefined,
});

client.on('connect', () => {
  logger.info('Conectado ao Redis');
});

client.on('error', (err) => {
  logger.error('Erro no Redis:', err);
});

client.on('ready', () => {
  logger.info('Redis pronto para uso');
});

client.on('end', () => {
  logger.info('Conexão Redis encerrada');
});

// Conectar ao Redis
client.connect().catch((err) => {
  logger.error('Falha ao conectar ao Redis:', err);
});

module.exports = client;
