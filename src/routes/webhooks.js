const express = require('express');
const WhatsAppService = require('../services/WhatsAppService');
const { verifyHmac } = require('../utils/crypto');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /webhooks/whatsapp - Verificação do webhook do WhatsApp
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
 * POST /webhooks/whatsapp - Recebimento de webhooks do WhatsApp
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
 * POST /webhooks/partners - Cadastro de webhooks de parceiros
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
 * GET /webhooks/partners - Lista webhooks de parceiros
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
 * DELETE /webhooks/partners/:id - Remove webhook de parceiro
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
