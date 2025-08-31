const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class MediaExamples {
  constructor(baseURL, token, tenantId) {
    this.baseURL = baseURL;
    this.token = token;
    this.tenantId = tenantId;
    this.headers = {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': tenantId,
      'Idempotency-Key': `media_${Date.now()}`
    };
  }

  // Upload de imagem
  async uploadImage(vehicleId, imagePath) {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(imagePath));
      form.append('vehicle_id', vehicleId);
      form.append('description', 'Foto do veículo para diagnóstico');
      form.append('tags', 'diagnóstico,veículo,foto');

      const response = await axios.post(
        `${this.baseURL}/v1/media/upload`,
        form,
        {
          headers: {
            ...this.headers,
            ...form.getHeaders()
          }
        }
      );

      console.log('✅ Imagem enviada:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Erro no upload:', error.response?.data || error.message);
    }
  }

  // Upload múltiplo
  async uploadMultiple(vehicleId, orderId, files) {
    try {
      const form = new FormData();
      
      files.forEach((filePath, index) => {
        form.append('file', fs.createReadStream(filePath));
      });
      
      form.append('vehicle_id', vehicleId);
      form.append('order_id', orderId);
      form.append('description', 'Documentos da ordem de serviço');

      const response = await axios.post(
        `${this.baseURL}/v1/media/upload`,
        form,
        {
          headers: {
            ...this.headers,
            ...form.getHeaders()
          }
        }
      );

      console.log('✅ Múltiplos arquivos enviados:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Erro no upload múltiplo:', error.response?.data || error.message);
    }
  }

  // Listar mídia
  async listMedia(filters = {}) {
    try {
      const params = new URLSearchParams(filters);
      
      const response = await axios.get(
        `${this.baseURL}/v1/media?${params}`,
        { headers: this.headers }
      );

      console.log('✅ Mídia listada:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Erro ao listar:', error.response?.data || error.message);
    }
  }

  // Obter mídia por veículo
  async getVehicleMedia(vehicleId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/media/vehicle/${vehicleId}`,
        { headers: this.headers }
      );

      console.log('✅ Mídia do veículo:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Erro ao obter mídia do veículo:', error.response?.data || error.message);
    }
  }

  // Estatísticas de armazenamento
  async getStorageStats() {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/media/stats/storage`,
        { headers: this.headers }
      );

      console.log('✅ Estatísticas de armazenamento:', response.data);
      return response.data;

    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error.response?.data || error.message);
    }
  }
}

// Exemplo de uso
async function executarExemplos() {
  const examples = new MediaExamples(
    'http://localhost:3000',
    'seu_token_aqui',
    'seu_tenant_id_aqui'
  );

  console.log('�� Testando funcionalidades de mídia...\n');

  // Upload de imagem
  await examples.uploadImage(
    'vehicle_uuid_aqui',
    './exemplo_imagem.jpg'
  );

  // Upload múltiplo
  await examples.uploadMultiple(
    'vehicle_uuid_aqui',
    'order_uuid_aqui',
    ['./doc1.pdf', './doc2.pdf', './foto.jpg']
  );

  // Listar mídia
  await examples.listMedia({
    type: 'image',
    limit: 10
  });

  // Mídia do veículo
  await examples.getVehicleMedia('vehicle_uuid_aqui');

  // Estatísticas
  await examples.getStorageStats();
}

module.exports = { MediaExamples, executarExemplos };

// Executar se chamado diretamente
if (require.main === module) {
  executarExemplos().catch(console.error);
}