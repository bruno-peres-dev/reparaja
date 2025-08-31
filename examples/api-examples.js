/**
 * Exemplos de uso da API Repara-Já
 * 
 * Este arquivo contém exemplos práticos de como usar a API
 * para diferentes cenários de oficinas mecânicas.
 */

const axios = require('axios');

// Configuração base
const API_BASE_URL = 'https://api.reparaja.com.br/v1';
const TENANT_ID = 'tn_9f3a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5';
const JWT_TOKEN = 'your-jwt-token-here';

// Headers padrão
const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'X-Tenant-ID': TENANT_ID,
  'Content-Type': 'application/json'
};

/**
 * Exemplo 1: Cadastro completo de veículo e envio de mensagem
 */
async function exemploCadastroVeiculo() {
  try {
    console.log('🚗 Exemplo 1: Cadastro de veículo e comunicação\n');

    // 1. Cadastrar veículo
    const vehicleData = {
      plate: 'ABC1D23',
      owner: {
        name: 'João Silva',
        phone: '+5511999999999'
      },
      meta: {
        brand: 'Ford',
        model: 'Fiesta 1.6',
        year: 2016,
        color: 'Prata'
      }
    };

    console.log('📝 Cadastrando veículo...');
    const vehicleResponse = await axios.post(`${API_BASE_URL}/vehicles`, vehicleData, { headers });
    const vehicle = vehicleResponse.data;
    console.log(`✅ Veículo cadastrado: ${vehicle.plate} (Código: ${vehicle.code16})\n`);

    // 2. Criar ordem de serviço
    const orderData = {
      vehicle_id: vehicle.id,
      estimate_amount: 780.00,
      status: 'awaiting_approval',
      notes: 'Troca de amortecedor dianteiro esquerdo'
    };

    console.log('🔧 Criando ordem de serviço...');
    const orderResponse = await axios.post(`${API_BASE_URL}/orders`, orderData, { headers });
    const order = orderResponse.data;
    console.log(`✅ Ordem criada: R$ ${order.estimate_amount}\n`);

    // 3. Enviar template de orçamento
    const templateData = {
      to: vehicle.owner.phone,
      name: 'orcamento_update',
      language: 'pt_BR',
      components: {
        body: [
          vehicle.owner.name,
          `${vehicle.meta.brand} ${vehicle.meta.model}`,
          'Amortecedor dianteiro',
          'R$ 780,00'
        ]
      },
      metadata: {
        order_id: order.id,
        vehicle_id: vehicle.id
      }
    };

    console.log('📱 Enviando template de orçamento...');
    const messageResponse = await axios.post(`${API_BASE_URL}/messages/whatsapp/template`, templateData, { headers });
    console.log(`✅ Mensagem enviada: ${messageResponse.data.message_id}\n`);

    return { vehicle, order, message: messageResponse.data };

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo 2: Envio de mensagem interativa com botões
 */
async function exemploMensagemInterativa() {
  try {
    console.log('🎯 Exemplo 2: Mensagem interativa com botões\n');

    const interactiveData = {
      to: '+5511999999999',
      body: 'Olá! Seu carro está em manutenção. Escolha uma opção:',
      buttons: [
        {
          id: 'opt_status',
          title: '📋 Ver Status'
        },
        {
          id: 'opt_orc',
          title: '💰 Aprovar Orçamento'
        },
        {
          id: 'opt_pagto',
          title: '💳 Pagar'
        }
      ],
      metadata: {
        order_id: 'ord_987',
        vehicle_id: 'veh_123'
      }
    };

    console.log('📱 Enviando mensagem interativa...');
    const response = await axios.post(`${API_BASE_URL}/messages/whatsapp/interactive`, interactiveData, { headers });
    console.log(`✅ Mensagem interativa enviada: ${response.data.message_id}\n`);

    return response.data;

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo 3: Busca de veículo por código
 */
async function exemploBuscaVeiculo() {
  try {
    console.log('🔍 Exemplo 3: Busca de veículo por código\n');

    const code16 = 'A1B2-C3D4-E5F6-G7H8';
    console.log(`🔍 Buscando veículo com código: ${code16}`);

    const response = await axios.get(`${API_BASE_URL}/vehicles/code/${code16}`, { headers });
    const vehicle = response.data;

    console.log(`✅ Veículo encontrado:`);
    console.log(`   Placa: ${vehicle.plate}`);
    console.log(`   Proprietário: ${vehicle.owner.name}`);
    console.log(`   Telefone: ${vehicle.owner.phone}`);
    console.log(`   Modelo: ${vehicle.meta.brand} ${vehicle.meta.model}\n`);

    return vehicle;

  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Veículo não encontrado\n');
    } else {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
    throw error;
  }
}

/**
 * Exemplo 4: Listagem com filtros e paginação
 */
async function exemploListagemFiltrada() {
  try {
    console.log('📋 Exemplo 4: Listagem com filtros e paginação\n');

    const params = {
      page: 1,
      limit: 10,
      plate: 'ABC',
      owner_name: 'João'
    };

    console.log('🔍 Buscando veículos com filtros...');
    const response = await axios.get(`${API_BASE_URL}/vehicles`, { 
      headers,
      params 
    });

    const { vehicles, pagination } = response.data;

    console.log(`✅ Encontrados ${pagination.total} veículos:`);
    vehicles.forEach((vehicle, index) => {
      console.log(`   ${index + 1}. ${vehicle.plate} - ${vehicle.owner.name}`);
    });

    console.log(`\n📊 Paginação: Página ${pagination.page} de ${pagination.pages}\n`);

    return { vehicles, pagination };

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo 5: Cadastro de webhook para integração
 */
async function exemploCadastroWebhook() {
  try {
    console.log('🔗 Exemplo 5: Cadastro de webhook para integração\n');

    const webhookData = {
      url: 'https://erp.suaempresa.com.br/webhooks/reparaja',
      events: [
        'message.delivered',
        'message.read',
        'button.clicked',
        'order.updated'
      ],
      secret: 'webhook-secret-key-123'
    };

    console.log('🔗 Cadastrando webhook...');
    const response = await axios.post(`${API_BASE_URL}/webhooks/partners`, webhookData, { headers });
    const webhook = response.data;

    console.log(`✅ Webhook cadastrado:`);
    console.log(`   ID: ${webhook.id}`);
    console.log(`   URL: ${webhook.url}`);
    console.log(`   Eventos: ${webhook.events.join(', ')}\n`);

    return webhook;

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo 6: Geração de código de 16 caracteres
 */
async function exemploGeracaoCodigo() {
  try {
    console.log('🔐 Exemplo 6: Geração de código de 16 caracteres\n');

    const seedData = {
      seed: 'veh_123'
    };

    console.log('🔐 Gerando código para seed...');
    const response = await axios.post(`${API_BASE_URL}/utils/code16`, seedData, { headers });
    const { code16 } = response.data;

    console.log(`✅ Código gerado: ${code16}\n`);

    return { code16 };

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Exemplo 7: Verificação de status de mensagem
 */
async function exemploVerificacaoStatus() {
  try {
    console.log('📊 Exemplo 7: Verificação de status de mensagem\n');

    const messageId = 'wamid.HBgL...'; // ID da mensagem do WhatsApp

    console.log(`📊 Verificando status da mensagem: ${messageId}`);
    const response = await axios.get(`${API_BASE_URL}/messages/${messageId}/status`, { headers });
    const status = response.data;

    console.log(`✅ Status da mensagem:`);
    console.log(`   ID: ${status.message_id}`);
    console.log(`   Status: ${status.status}`);
    console.log(`   Criada em: ${status.created_at}\n`);

    return status;

  } catch (error) {
    if (error.response?.status === 404) {
      console.log('❌ Mensagem não encontrada\n');
    } else {
      console.error('❌ Erro:', error.response?.data || error.message);
    }
    throw error;
  }
}

/**
 * Função principal para executar todos os exemplos
 */
async function executarExemplos() {
  console.log('🚀 Iniciando exemplos da API Repara-Já\n');
  console.log('=' .repeat(50));

  try {
    // Executa exemplos em sequência
    await exemploGeracaoCodigo();
    await exemploCadastroVeiculo();
    await exemploMensagemInterativa();
    await exemploBuscaVeiculo();
    await exemploListagemFiltrada();
    await exemploCadastroWebhook();
    await exemploVerificacaoStatus();

    console.log('🎉 Todos os exemplos executados com sucesso!');

  } catch (error) {
    console.error('💥 Erro ao executar exemplos:', error.message);
  }
}

// Exporta funções para uso individual
module.exports = {
  exemploCadastroVeiculo,
  exemploMensagemInterativa,
  exemploBuscaVeiculo,
  exemploListagemFiltrada,
  exemploCadastroWebhook,
  exemploGeracaoCodigo,
  exemploVerificacaoStatus,
  executarExemplos
};

// Executa se chamado diretamente
if (require.main === module) {
  executarExemplos();
}
