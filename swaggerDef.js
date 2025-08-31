const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Repara-Já API',
      version: '1.0.0',
      description: 'API profissional para oficinas mecânicas - Repara-Já',
      contact: {
        name: 'Repara-Já Team',
        email: 'contato@reparaja.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'https://api.reparaja.com',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT para autenticação'
        },
        tenantHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Tenant-ID',
          description: 'ID do tenant (cliente)'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Código do erro'
                },
                message: {
                  type: 'string',
                  description: 'Mensagem de erro'
                },
                details: {
                  type: 'object',
                  description: 'Detalhes adicionais do erro'
                }
              }
            },
            correlation_id: {
              type: 'string',
              description: 'ID de correlação para rastreamento'
            }
          }
        },
        Vehicle: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do veículo'
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do tenant'
            },
            code16: {
              type: 'string',
              maxLength: 16,
              description: 'Código de 16 caracteres do veículo'
            },
            brand: {
              type: 'string',
              description: 'Marca do veículo'
            },
            model: {
              type: 'string',
              description: 'Modelo do veículo'
            },
            year: {
              type: 'integer',
              minimum: 1900,
              maximum: 2030,
              description: 'Ano do veículo'
            },
            color: {
              type: 'string',
              description: 'Cor do veículo'
            },
            license_plate: {
              type: 'string',
              description: 'Placa do veículo'
            },
            vin: {
              type: 'string',
              description: 'Número do chassi (VIN)'
            },
            engine: {
              type: 'string',
              description: 'Motor do veículo'
            },
            fuel_type: {
              type: 'string',
              enum: ['gasolina', 'etanol', 'flex', 'diesel', 'elétrico', 'híbrido'],
              description: 'Tipo de combustível'
            },
            transmission: {
              type: 'string',
              enum: ['manual', 'automático', 'cvt'],
              description: 'Tipo de transmissão'
            },
            mileage: {
              type: 'integer',
              minimum: 0,
              description: 'Quilometragem atual'
            },
            owner_name: {
              type: 'string',
              description: 'Nome do proprietário'
            },
            owner_phone: {
              type: 'string',
              description: 'Telefone do proprietário'
            },
            owner_email: {
              type: 'string',
              format: 'email',
              description: 'Email do proprietário'
            },
            notes: {
              type: 'string',
              description: 'Observações sobre o veículo'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          },
          required: ['brand', 'model', 'year', 'license_plate']
        },
        Message: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único da mensagem'
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do tenant'
            },
            vehicle_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do veículo relacionado'
            },
            type: {
              type: 'string',
              enum: ['whatsapp', 'sms', 'email'],
              description: 'Tipo de mensagem'
            },
            status: {
              type: 'string',
              enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
              description: 'Status da mensagem'
            },
            recipient: {
              type: 'string',
              description: 'Destinatário da mensagem'
            },
            content: {
              type: 'string',
              description: 'Conteúdo da mensagem'
            },
            template_id: {
              type: 'string',
              description: 'ID do template usado'
            },
            variables: {
              type: 'object',
              description: 'Variáveis do template'
            },
            scheduled_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data agendada para envio'
            },
            sent_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de envio'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            }
          }
        },
        Media: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único da mídia'
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do tenant'
            },
            vehicle_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do veículo relacionado'
            },
            type: {
              type: 'string',
              enum: ['image', 'video', 'document'],
              description: 'Tipo de mídia'
            },
            filename: {
              type: 'string',
              description: 'Nome do arquivo'
            },
            original_name: {
              type: 'string',
              description: 'Nome original do arquivo'
            },
            mime_type: {
              type: 'string',
              description: 'Tipo MIME do arquivo'
            },
            size: {
              type: 'integer',
              description: 'Tamanho do arquivo em bytes'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL para acesso ao arquivo'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
        tenantHeader: []
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/server.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
