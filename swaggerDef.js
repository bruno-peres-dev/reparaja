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
            workshop_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID da oficina onde o veículo está sendo atendido'
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
        Workshop: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único da oficina'
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do tenant proprietário'
            },
            name: {
              type: 'string',
              minLength: 2,
              description: 'Nome da oficina'
            },
            cnpj: {
              type: 'string',
              pattern: '^\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}$',
              description: 'CNPJ da oficina (formato XX.XXX.XXX/XXXX-XX)'
            },
            corporate_name: {
              type: 'string',
              description: 'Razão social da oficina'
            },
            address: {
              type: 'object',
              description: 'Endereço completo da oficina',
              properties: {
                street: {
                  type: 'string',
                  description: 'Rua'
                },
                number: {
                  type: 'string',
                  description: 'Número'
                },
                complement: {
                  type: 'string',
                  description: 'Complemento'
                },
                neighborhood: {
                  type: 'string',
                  description: 'Bairro'
                },
                city: {
                  type: 'string',
                  description: 'Cidade'
                },
                state: {
                  type: 'string',
                  description: 'Estado'
                },
                zip_code: {
                  type: 'string',
                  description: 'CEP'
                },
                coordinates: {
                  type: 'object',
                  description: 'Coordenadas geográficas',
                  properties: {
                    lat: {
                      type: 'number',
                      description: 'Latitude'
                    },
                    lng: {
                      type: 'number',
                      description: 'Longitude'
                    }
                  }
                }
              }
            },
            phone: {
              type: 'string',
              description: 'Telefone da oficina'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email da oficina'
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Website da oficina'
            },
            type: {
              type: 'string',
              enum: ['main', 'branch', 'partner'],
              default: 'main',
              description: 'Tipo da oficina'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              default: 'active',
              description: 'Status da oficina'
            },
            timezone: {
              type: 'string',
              default: 'America/Sao_Paulo',
              description: 'Fuso horário da oficina'
            },
            working_hours: {
              type: 'object',
              description: 'Horário de funcionamento',
              properties: {
                monday: {
                  type: 'object',
                  properties: {
                    open: {
                      type: 'string',
                      description: 'Horário de abertura'
                    },
                    close: {
                      type: 'string',
                      description: 'Horário de fechamento'
                    }
                  }
                },
                tuesday: {
                  type: 'object',
                  properties: {
                    open: {
                      type: 'string'
                    },
                    close: {
                      type: 'string'
                    }
                  }
                },
                wednesday: {
                  type: 'object',
                  properties: {
                    open: {
                      type: 'string'
                    },
                    close: {
                      type: 'string'
                    }
                  }
                },
                thursday: {
                  type: 'object',
                  properties: {
                    open: {
                      type: 'string'
                    },
                    close: {
                      type: 'string'
                    }
                  }
                },
                friday: {
                  type: 'object',
                  properties: {
                    open: {
                      type: 'string'
                    },
                    close: {
                      type: 'string'
                    }
                  }
                },
                saturday: {
                  type: 'object',
                  properties: {
                    open: {
                      type: 'string'
                    },
                    close: {
                      type: 'string'
                    }
                  }
                },
                sunday: {
                  type: 'object',
                  properties: {
                    open: {
                      type: 'string'
                    },
                    close: {
                      type: 'string'
                    }
                  }
                }
              }
            },
            max_vehicles_per_day: {
              type: 'integer',
              minimum: 1,
              maximum: 1000,
              default: 50,
              description: 'Máximo de veículos atendidos por dia'
            },
            max_mechanics: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Máximo de mecânicos na oficina'
            },
            specialties: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Especialidades da oficina'
            },
            erp_id: {
              type: 'string',
              description: 'ID da oficina no sistema ERP'
            },
            erp_sync_enabled: {
              type: 'boolean',
              default: false,
              description: 'Sincronização com ERP habilitada'
            },
            last_erp_sync: {
              type: 'string',
              format: 'date-time',
              description: 'Última sincronização com ERP'
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
          required: ['name']
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
        },
        Order: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único da ordem de serviço'
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do tenant'
            },
            workshop_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID da oficina onde o serviço será realizado'
            },
            vehicle_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do veículo'
            },
            customer_name: {
              type: 'string',
              description: 'Nome do cliente'
            },
            customer_phone: {
              type: 'string',
              description: 'Telefone do cliente'
            },
            customer_email: {
              type: 'string',
              format: 'email',
              description: 'Email do cliente'
            },
            service_description: {
              type: 'string',
              description: 'Descrição do serviço'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled'],
              description: 'Status da ordem de serviço'
            },
            total_amount: {
              type: 'number',
              minimum: 0,
              description: 'Valor total do serviço'
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
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único do usuário'
            },
            tenant_id: {
              type: 'string',
              format: 'uuid',
              description: 'ID do tenant'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário'
            },
            name: {
              type: 'string',
              description: 'Nome completo do usuário'
            },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'user', 'viewer'],
              description: 'Papel do usuário no sistema'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'locked', 'deleted'],
              description: 'Status da conta do usuário'
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              description: 'Data do último login'
            },
            login_attempts: {
              type: 'integer',
              description: 'Número de tentativas de login falhadas'
            },
            locked_until: {
              type: 'string',
              format: 'date-time',
              description: 'Data até quando a conta está bloqueada'
            },
            mfa_enabled: {
              type: 'boolean',
              description: 'Se autenticação de dois fatores está habilitada'
            },
            preferences: {
              type: 'object',
              description: 'Preferências do usuário'
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
