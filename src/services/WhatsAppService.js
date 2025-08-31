const axios = require('axios');
const { Queue } = require('bullmq');
const { encrypt } = require('../utils/crypto');
const logger = require('../utils/logger');

class WhatsAppService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    // Filas para processamento assíncrono
    this.sendQueue = new Queue('wa:send', {
      connection: require('../config/redis')
    });
    
    this.statusQueue = new Queue('wa:status', {
      connection: require('../config/redis')
    });
  }

  /**
   * Envia mensagem de texto
   */
  async sendText(to, text, metadata = {}) {
    try {
      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: text
        }
      };

      const response = await this.makeRequest('POST', `/${this.phoneNumberId}/messages`, messageData);
      
      // Salva mensagem no banco
      await this.saveMessage({
        tenant_id: metadata.tenant_id,
        direction: 'outbound',
        channel: 'whatsapp',
        state: 'sent',
        payload: messageData,
        provider_id: response.data.messages[0].id,
        metadata: metadata
      });

      return {
        message_id: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Erro ao enviar mensagem de texto', { 
        error: error.message, 
        to: this.maskPhone(to),
        tenant_id: metadata.tenant_id 
      });
      throw error;
    }
  }

  /**
   * Envia template
   */
  async sendTemplate(to, templateName, language, components = {}, metadata = {}) {
    try {
      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: language
          },
          components: []
        }
      };

      // Adiciona componentes se fornecidos
      if (components.body && components.body.length > 0) {
        messageData.template.components.push({
          type: 'body',
          parameters: components.body.map(text => ({ type: 'text', text }))
        });
      }

      if (components.header && components.header.length > 0) {
        messageData.template.components.push({
          type: 'header',
          parameters: components.header.map(param => {
            if (param.type === 'text') {
              return { type: 'text', text: param.text };
            } else if (param.type === 'image') {
              return { type: 'image', image: { link: param.url } };
            }
          })
        });
      }

      const response = await this.makeRequest('POST', `/${this.phoneNumberId}/messages`, messageData);
      
      // Salva mensagem no banco
      await this.saveMessage({
        tenant_id: metadata.tenant_id,
        direction: 'outbound',
        channel: 'whatsapp',
        state: 'sent',
        payload: messageData,
        provider_id: response.data.messages[0].id,
        metadata: metadata
      });

      return {
        message_id: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Erro ao enviar template', { 
        error: error.message, 
        to: this.maskPhone(to),
        template: templateName,
        tenant_id: metadata.tenant_id 
      });
      throw error;
    }
  }

  /**
   * Envia mensagem interativa com botões
   */
  async sendInteractive(to, body, buttons, metadata = {}) {
    try {
      if (buttons.length > 3) {
        throw new Error('Máximo de 3 botões permitido');
      }

      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: body
          },
          action: {
            buttons: buttons.map(button => ({
              type: 'reply',
              reply: {
                id: button.id,
                title: button.title
              }
            }))
          }
        }
      };

      const response = await this.makeRequest('POST', `/${this.phoneNumberId}/messages`, messageData);
      
      // Salva mensagem no banco
      await this.saveMessage({
        tenant_id: metadata.tenant_id,
        direction: 'outbound',
        channel: 'whatsapp',
        state: 'sent',
        payload: messageData,
        provider_id: response.data.messages[0].id,
        metadata: metadata
      });

      return {
        message_id: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Erro ao enviar mensagem interativa', { 
        error: error.message, 
        to: this.maskPhone(to),
        tenant_id: metadata.tenant_id 
      });
      throw error;
    }
  }

  /**
   * Envia mensagem interativa com lista
   */
  async sendList(to, body, buttonText, sections, metadata = {}) {
    try {
      const messageData = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'list',
          body: {
            text: body
          },
          action: {
            button: buttonText,
            sections: sections
          }
        }
      };

      const response = await this.makeRequest('POST', `/${this.phoneNumberId}/messages`, messageData);
      
      // Salva mensagem no banco
      await this.saveMessage({
        tenant_id: metadata.tenant_id,
        direction: 'outbound',
        channel: 'whatsapp',
        state: 'sent',
        payload: messageData,
        provider_id: response.data.messages[0].id,
        metadata: metadata
      });

      return {
        message_id: response.data.messages[0].id,
        status: 'sent'
      };
    } catch (error) {
      logger.error('Erro ao enviar lista', { 
        error: error.message, 
        to: this.maskPhone(to),
        tenant_id: metadata.tenant_id 
      });
      throw error;
    }
  }

  /**
   * Adiciona mensagem à fila para processamento assíncrono
   */
  async queueMessage(messageData) {
    try {
      await this.sendQueue.add('send_message', messageData, {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      });

      return {
        message_id: `queued_${Date.now()}`,
        status: 'queued'
      };
    } catch (error) {
      logger.error('Erro ao adicionar mensagem à fila', { error: error.message });
      throw error;
    }
  }

  /**
   * Verifica status de uma mensagem
   */
  async checkMessageStatus(messageId) {
    try {
      const response = await this.makeRequest('GET', `/${messageId}`);
      return response.data;
    } catch (error) {
      logger.error('Erro ao verificar status da mensagem', { error: error.message, messageId });
      throw error;
    }
  }

  /**
   * Processa webhook do WhatsApp
   */
  async processWebhook(webhookData) {
    try {
      const { object, entry } = webhookData;
      
      if (object !== 'whatsapp_business_account') {
        return;
      }

      for (const entryItem of entry) {
        for (const change of entryItem.changes) {
          if (change.value && change.value.messages) {
            for (const message of change.value.messages) {
              await this.processInboundMessage(message);
            }
          }
          
          if (change.value && change.value.statuses) {
            for (const status of change.value.statuses) {
              await this.processStatusUpdate(status);
            }
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao processar webhook', { error: error.message });
      throw error;
    }
  }

  /**
   * Processa mensagem recebida
   */
  async processInboundMessage(message) {
    try {
      const messageData = {
        direction: 'inbound',
        channel: 'whatsapp',
        state: 'received',
        payload: message,
        provider_id: message.id,
        metadata: {
          from: message.from,
          timestamp: message.timestamp
        }
      };

      // Salva mensagem recebida
      await this.saveMessage(messageData);

      // Processa interações
      if (message.type === 'interactive') {
        await this.processInteractiveMessage(message);
      }

      // Dispara webhooks para parceiros
      await this.triggerPartnerWebhooks('message.received', messageData);
    } catch (error) {
      logger.error('Erro ao processar mensagem recebida', { error: error.message });
    }
  }

  /**
   * Processa atualização de status
   */
  async processStatusUpdate(status) {
    try {
      // Atualiza status da mensagem no banco
      await this.updateMessageStatus(status.id, status.status);

      // Dispara webhooks para parceiros
      await this.triggerPartnerWebhooks(`message.${status.status}`, {
        message_id: status.id,
        status: status.status,
        timestamp: status.timestamp
      });
    } catch (error) {
      logger.error('Erro ao processar atualização de status', { error: error.message });
    }
  }

  /**
   * Processa mensagem interativa
   */
  async processInteractiveMessage(message) {
    try {
      const interactive = message.interactive;
      
      if (interactive.type === 'button_reply') {
        await this.triggerPartnerWebhooks('button.clicked', {
          message_id: message.id,
          button: {
            id: interactive.button_reply.id,
            title: interactive.button_reply.title
          },
          contact: message.from,
          timestamp: message.timestamp
        });
      } else if (interactive.type === 'list_reply') {
        await this.triggerPartnerWebhooks('list.selected', {
          message_id: message.id,
          list: {
            id: interactive.list_reply.id,
            title: interactive.list_reply.title,
            description: interactive.list_reply.description
          },
          contact: message.from,
          timestamp: message.timestamp
        });
      }
    } catch (error) {
      logger.error('Erro ao processar mensagem interativa', { error: error.message });
    }
  }

  /**
   * Faz requisição para a API do WhatsApp
   */
  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(`WhatsApp API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Salva mensagem no banco de dados
   */
  async saveMessage(messageData) {
    try {
      const { query } = require('../config/database');
      
      const result = await query(
        `INSERT INTO messages (tenant_id, direction, channel, state, payload, provider_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          messageData.tenant_id,
          messageData.direction,
          messageData.channel,
          messageData.state,
          JSON.stringify(messageData.payload),
          messageData.provider_id,
          JSON.stringify(messageData.metadata || {})
        ]
      );

      return result.rows[0].id;
    } catch (error) {
      logger.error('Erro ao salvar mensagem', { error: error.message });
      throw error;
    }
  }

  /**
   * Atualiza status de uma mensagem
   */
  async updateMessageStatus(providerId, status) {
    try {
      const { query } = require('../config/database');
      
      await query(
        'UPDATE messages SET state = $1, updated_at = NOW() WHERE provider_id = $2',
        [status, providerId]
      );
    } catch (error) {
      logger.error('Erro ao atualizar status da mensagem', { error: error.message });
      throw error;
    }
  }

  /**
   * Dispara webhooks para parceiros
   */
  async triggerPartnerWebhooks(event, data) {
    try {
      const { query } = require('../config/database');
      
      // Busca webhooks configurados para o evento
      const webhooks = await query(
        'SELECT * FROM webhooks WHERE events @> $1 AND active = true',
        [JSON.stringify([event])]
      );

      for (const webhook of webhooks.rows) {
        try {
          await this.sendWebhook(webhook.url, webhook.secret, event, data);
        } catch (error) {
          logger.error('Erro ao enviar webhook', { 
            error: error.message, 
            webhook_id: webhook.id,
            event 
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao disparar webhooks', { error: error.message });
    }
  }

  /**
   * Envia webhook para parceiro
   */
  async sendWebhook(url, secret, event, data) {
    try {
      const payload = {
        event,
        data,
        sent_at: new Date().toISOString()
      };

      const signature = require('../utils/crypto').generateHmac(
        JSON.stringify(payload),
        secret
      );

      await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature-256': `sha256=${signature}`
        },
        timeout: 10000
      });
    } catch (error) {
      logger.error('Erro ao enviar webhook', { error: error.message, url });
      throw error;
    }
  }

  /**
   * Mascara número de telefone para logs
   */
  maskPhone(phone) {
    if (!phone) return 'unknown';
    return phone.replace(/(\+55\d{2})(\d{4})(\d{4})/, '+55$1****$3');
  }
}

module.exports = new WhatsAppService();
