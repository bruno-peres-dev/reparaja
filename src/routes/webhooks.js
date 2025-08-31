const express = require('express');
const WhatsAppService = require('../services/WhatsAppService');
const { verifyHmac } = require('../utils/crypto');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /v1/webhooks/whatsapp:
 *   get:
 *     summary: Verificação do webhook do WhatsApp
 *     description: Endpoint para verificação do webhook do WhatsApp Business API
 *     tags: [Webhooks]
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [subscribe]
 *         description: Modo de verificação
 *       - in: query
 *         name: hub.verify_token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de verificação
 *       - in: query
 *         name: hub.challenge
 *         required: true
 *         schema:
 *           type: string
 *         description: Desafio para verificação
 *     responses:
 *       200:
 *         description: Webhook verificado com sucesso
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "challenge_string"
 *       403:
 *         description: Verificação falhou
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Forbidden"
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verifica se é uma solicitação de verificação
  if (mode === 'subscribe' && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    logger.info('Webhook WhatsApp verificado com sucesso');
    res.status(200).send(challenge);
  } else {
    logger.warn('Falha na verificação do webhook WhatsApp', { 
      mode, 
      token_provided: !!token,
      expected_token: !!process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN 
    });
    res.status(403).send('Forbidden');
  }
});

/**
 * @swagger
 * /v1/webhooks/whatsapp:
 *   post:
 *     summary: Recebimento de webhooks do WhatsApp
 *     description: Endpoint para receber webhooks do WhatsApp Business API
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload do webhook do WhatsApp
 *     responses:
 *       200:
 *         description: Webhook processado com sucesso
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "OK"
 *       401:
 *         description: Assinatura HMAC inválida
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Unauthorized"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Internal Server Error"
 */
router.post('/whatsapp', (req, res) => {
  try {
    const signature = req.headers['x-signature-256'];
    const rawBody = JSON.stringify(req.body);

    // Verifica assinatura HMAC
    if (!verifyHmac(rawBody, signature, process.env.WEBHOOK_SECRET)) {
      logger.warn('Assinatura HMAC inválida no webhook WhatsApp');
      return res.status(401).send('Unauthorized');
    }

    // Processa webhook de forma assíncrona
    WhatsAppService.processWebhook(req.body).catch(error => {
      logger.error('Erro ao processar webhook WhatsApp', { error: error.message });
    });

    // Responde imediatamente
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Erro ao processar webhook WhatsApp', { error: error.message });
    res.status(500).send('Internal Server Error');
  }
});

/**
 * @swagger
 * /v1/webhooks/partners:
 *   post:
 *     summary: Cadastrar webhook de parceiro
 *     description: Cadastra um novo webhook para receber eventos de parceiros
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *               - secret
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 description: URL do webhook
 *                 example: "https://api.parceiro.com/webhook"
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [message.delivered, message.read, message.failed, button.clicked, list.selected, order.updated, order.approved, order.completed]
 *                 description: Lista de eventos para receber
 *                 example: ["message.delivered", "message.read", "order.updated"]
 *               secret:
 *                 type: string
 *                 description: Chave secreta para assinatura HMAC
 *                 example: "webhook_secret_key_123"
 *     responses:
 *       201:
 *         description: Webhook cadastrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID do webhook
 *                 url:
 *                   type: string
 *                   format: uri
 *                 events:
 *                   type: array
 *                   items:
 *                     type: string
 *                 active:
 *                   type: boolean
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/partners', (req, res) => {
  try {
    const { url, events, secret } = req.body;

    // Validações básicas
    if (!url || !events || !secret) {
      return res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Campos url, events e secret são obrigatórios',
          details: { required: ['url', 'events', 'secret'] }
        }
      });
    }

    // Valida URL
    try {
      new URL(url);
    } catch (error) {
      return res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'URL inválida',
          details: { url }
        }
      });
    }

    // Valida eventos
    const validEvents = [
      'message.delivered',
      'message.read',
      'message.failed',
      'button.clicked',
      'list.selected',
      'order.updated',
      'order.approved',
      'order.completed'
    ];

    const invalidEvents = events.filter(event => !validEvents.includes(event));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: {
          code: 'invalid_request',
          message: 'Eventos inválidos',
          details: { 
            invalid_events: invalidEvents,
            valid_events 
          }
        }
      });
    }

    // Salva webhook no banco
    const { query } = require('../config/database');
    query(
      `INSERT INTO webhooks (url, events, secret, active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [url, JSON.stringify(events), secret]
    ).then(result => {
      logger.info('Webhook de parceiro cadastrado', { 
        webhook_id: result.rows[0].id,
        url,
        events 
      });

      res.status(201).json({
        id: result.rows[0].id,
        url,
        events,
        active: true
      });
    }).catch(error => {
      logger.error('Erro ao cadastrar webhook', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao cadastrar webhook'
        }
      });
    });
  } catch (error) {
    logger.error('Erro ao processar cadastro de webhook', { error: error.message });
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Erro interno'
      }
    });
  }
});

/**
 * @swagger
 * /v1/webhooks/partners:
 *   get:
 *     summary: Listar webhooks de parceiros
 *     description: Lista todos os webhooks de parceiros cadastrados
 *     tags: [Webhooks]
 *     responses:
 *       200:
 *         description: Lista de webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ID do webhook
 *                       url:
 *                         type: string
 *                         format: uri
 *                         description: URL do webhook
 *                       events:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Eventos configurados
 *                       active:
 *                         type: boolean
 *                         description: Status do webhook
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: Data de criação
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/partners', (req, res) => {
  try {
    const { query } = require('../config/database');
    
    query('SELECT id, url, events, active, created_at FROM webhooks ORDER BY created_at DESC')
      .then(result => {
        res.json({
          webhooks: result.rows.map(row => ({
            id: row.id,
            url: row.url,
            events: row.events,
            active: row.active,
            created_at: row.created_at
          }))
        });
      })
      .catch(error => {
        logger.error('Erro ao listar webhooks', { error: error.message });
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Erro interno ao listar webhooks'
          }
        });
      });
  } catch (error) {
    logger.error('Erro ao processar listagem de webhooks', { error: error.message });
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Erro interno'
      }
    });
  }
});

/**
 * @swagger
 * /v1/webhooks/partners/{id}:
 *   delete:
 *     summary: Remover webhook de parceiro
 *     description: Remove um webhook de parceiro específico
 *     tags: [Webhooks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID do webhook
 *     responses:
 *       204:
 *         description: Webhook removido com sucesso
 *       404:
 *         description: Webhook não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/partners/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { query } = require('../config/database');
    
    query('DELETE FROM webhooks WHERE id = $1 RETURNING id', [id])
      .then(result => {
        if (result.rows.length === 0) {
          return res.status(404).json({
            error: {
              code: 'not_found',
              message: 'Webhook não encontrado',
              details: { webhook_id: id }
            }
          });
        }

        logger.info('Webhook removido', { webhook_id: id });
        res.status(204).send();
      })
      .catch(error => {
        logger.error('Erro ao remover webhook', { error: error.message });
        res.status(500).json({
          error: {
            code: 'internal_error',
            message: 'Erro interno ao remover webhook'
          }
        });
      });
  } catch (error) {
    logger.error('Erro ao processar remoção de webhook', { error: error.message });
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: 'Erro interno'
      }
    });
  }
});

module.exports = router;
