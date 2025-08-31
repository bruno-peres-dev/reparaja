const WhatsAppService = require('../services/WhatsAppService');
const logger = require('../utils/logger');

class MessageController {
  /**
   * Envia mensagem de texto
   */
  static async sendText(req, res) {
    try {
      const { to, text } = req.body;
      const tenantId = req.user.tenant_id;

      // Validações
      if (!to || !text) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Campos "to" e "text" são obrigatórios',
            details: { required: ['to', 'text'] }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      // Valida formato do telefone
      const phoneRegex = /^\+55\d{2}\d{8,9}$/;
      if (!phoneRegex.test(to)) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Formato de telefone inválido',
            details: { 
              format: '+55DDDNNNNNNNN',
              provided: to 
            }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      const metadata = {
        tenant_id: tenantId,
        correlation_id: req.headers['x-correlation-id'],
        user_agent: req.headers['user-agent']
      };

      const result = await WhatsAppService.sendText(to, text, metadata);

      logger.info('Mensagem de texto enviada', { 
        message_id: result.message_id,
        to: WhatsAppService.maskPhone(to),
        tenant_id: tenantId 
      });

      res.status(202).json({
        message_id: result.message_id,
        status: result.status
      });
    } catch (error) {
      logger.error('Erro ao enviar mensagem de texto', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao enviar mensagem'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Envia template
   */
  static async sendTemplate(req, res) {
    try {
      const { to, name, language, components, metadata } = req.body;
      const tenantId = req.user.tenant_id;

      // Validações
      if (!to || !name || !language) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Campos "to", "name" e "language" são obrigatórios',
            details: { required: ['to', 'name', 'language'] }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      // Valida formato do telefone
      const phoneRegex = /^\+55\d{2}\d{8,9}$/;
      if (!phoneRegex.test(to)) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Formato de telefone inválido',
            details: { 
              format: '+55DDDNNNNNNNN',
              provided: to 
            }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      const messageMetadata = {
        tenant_id: tenantId,
        correlation_id: req.headers['x-correlation-id'],
        user_agent: req.headers['user-agent'],
        ...metadata
      };

      const result = await WhatsAppService.sendTemplate(to, name, language, components, messageMetadata);

      logger.info('Template enviado', { 
        message_id: result.message_id,
        template: name,
        to: WhatsAppService.maskPhone(to),
        tenant_id: tenantId 
      });

      res.status(202).json({
        message_id: result.message_id,
        status: result.status
      });
    } catch (error) {
      logger.error('Erro ao enviar template', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao enviar template'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Envia mensagem interativa com botões
   */
  static async sendInteractive(req, res) {
    try {
      const { to, body, buttons, metadata } = req.body;
      const tenantId = req.user.tenant_id;

      // Validações
      if (!to || !body || !buttons) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Campos "to", "body" e "buttons" são obrigatórios',
            details: { required: ['to', 'body', 'buttons'] }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      if (!Array.isArray(buttons) || buttons.length === 0 || buttons.length > 3) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Buttons deve ser um array com 1 a 3 botões',
            details: { 
              min_buttons: 1,
              max_buttons: 3,
              provided: buttons.length 
            }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      // Valida formato dos botões
      for (const button of buttons) {
        if (!button.id || !button.title) {
          return res.status(400).json({
            error: {
              code: 'invalid_request',
              message: 'Cada botão deve ter "id" e "title"',
              details: { button }
            },
            correlation_id: req.headers['x-correlation-id'] || 'unknown'
          });
        }
      }

      // Valida formato do telefone
      const phoneRegex = /^\+55\d{2}\d{8,9}$/;
      if (!phoneRegex.test(to)) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Formato de telefone inválido',
            details: { 
              format: '+55DDDNNNNNNNN',
              provided: to 
            }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      const messageMetadata = {
        tenant_id: tenantId,
        correlation_id: req.headers['x-correlation-id'],
        user_agent: req.headers['user-agent'],
        ...metadata
      };

      const result = await WhatsAppService.sendInteractive(to, body, buttons, messageMetadata);

      logger.info('Mensagem interativa enviada', { 
        message_id: result.message_id,
        buttons_count: buttons.length,
        to: WhatsAppService.maskPhone(to),
        tenant_id: tenantId 
      });

      res.status(202).json({
        message_id: result.message_id,
        status: result.status
      });
    } catch (error) {
      logger.error('Erro ao enviar mensagem interativa', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao enviar mensagem interativa'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Envia mensagem interativa com lista
   */
  static async sendList(req, res) {
    try {
      const { to, body, button, sections, metadata } = req.body;
      const tenantId = req.user.tenant_id;

      // Validações
      if (!to || !body || !button || !sections) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Campos "to", "body", "button" e "sections" são obrigatórios',
            details: { required: ['to', 'body', 'button', 'sections'] }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      if (!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Sections deve ser um array não vazio',
            details: { provided: sections.length }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      // Valida formato do telefone
      const phoneRegex = /^\+55\d{2}\d{8,9}$/;
      if (!phoneRegex.test(to)) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Formato de telefone inválido',
            details: { 
              format: '+55DDDNNNNNNNN',
              provided: to 
            }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      const messageMetadata = {
        tenant_id: tenantId,
        correlation_id: req.headers['x-correlation-id'],
        user_agent: req.headers['user-agent'],
        ...metadata
      };

      const result = await WhatsAppService.sendList(to, body, button, sections, messageMetadata);

      logger.info('Lista enviada', { 
        message_id: result.message_id,
        sections_count: sections.length,
        to: WhatsAppService.maskPhone(to),
        tenant_id: tenantId 
      });

      res.status(202).json({
        message_id: result.message_id,
        status: result.status
      });
    } catch (error) {
      logger.error('Erro ao enviar lista', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao enviar lista'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Verifica status de uma mensagem
   */
  static async getStatus(req, res) {
    try {
      const { messageId } = req.params;
      const tenantId = req.user.tenant_id;

      // Busca mensagem no banco para verificar permissão
      const { query } = require('../config/database');
      const result = await query(
        'SELECT * FROM messages WHERE provider_id = $1 AND tenant_id = $2',
        [messageId, tenantId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Mensagem não encontrada',
            details: { message_id: messageId }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      const message = result.rows[0];

      res.json({
        message_id: message.provider_id,
        status: message.state,
        created_at: message.created_at,
        updated_at: message.updated_at
      });
    } catch (error) {
      logger.error('Erro ao verificar status da mensagem', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao verificar status'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Lista mensagens com filtros
   */
  static async list(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { 
        direction, 
        state, 
        channel,
        page = 1, 
        limit = 50 
      } = req.query;

      const { query } = require('../config/database');
      
      let whereClause = 'WHERE tenant_id = $1';
      let params = [tenantId];
      let paramIndex = 2;

      if (direction) {
        whereClause += ` AND direction = $${paramIndex}`;
        params.push(direction);
        paramIndex++;
      }

      if (state) {
        whereClause += ` AND state = $${paramIndex}`;
        params.push(state);
        paramIndex++;
      }

      if (channel) {
        whereClause += ` AND channel = $${paramIndex}`;
        params.push(channel);
        paramIndex++;
      }

      // Conta total
      const countResult = await query(
        `SELECT COUNT(*) as total FROM messages ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);
      const offset = (page - 1) * limit;

      // Busca mensagens
      const result = await query(
        `SELECT * FROM messages ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      // Headers de paginação
      res.set({
        'X-Total-Count': total,
        'X-Page': page,
        'X-Limit': limit,
        'X-Total-Pages': Math.ceil(total / limit)
      });

      res.json({
        messages: result.rows.map(row => ({
          id: row.id,
          message_id: row.provider_id,
          direction: row.direction,
          channel: row.channel,
          state: row.state,
          created_at: row.created_at,
          updated_at: row.updated_at
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Erro ao listar mensagens', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao listar mensagens'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }
}

module.exports = MessageController;
