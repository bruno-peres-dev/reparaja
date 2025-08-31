const Vehicle = require('../models/Vehicle');
const { generateCode16 } = require('../utils/crypto');
const logger = require('../utils/logger');

class VehicleController {
  /**
   * Cria um novo veículo
   */
  static async create(req, res) {
    try {
      const { plate, owner, meta } = req.body;
      const tenantId = req.user.tenant_id;

      // Validações
      if (!plate) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Placa é obrigatória',
            details: { field: 'plate' }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      // Verifica se a placa já existe
      const existingVehicle = await Vehicle.findByPlate(tenantId, plate);
      if (existingVehicle) {
        return res.status(409).json({
          error: {
            code: 'conflict',
            message: 'Veículo com esta placa já existe',
            details: { plate }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      // Cria o veículo
      const vehicle = await Vehicle.create(tenantId, { plate, owner, meta });

      logger.info('Veículo criado com sucesso', { 
        vehicle_id: vehicle.id, 
        plate: vehicle.plate,
        tenant_id: tenantId 
      });

      res.status(201).json(vehicle.toJSON());
    } catch (error) {
      logger.error('Erro ao criar veículo', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao criar veículo'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Lista veículos com filtros e paginação
   */
  static async list(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const { 
        plate, 
        code16, 
        owner_name, 
        owner_phone,
        page = 1, 
        limit = 50 
      } = req.query;

      const filters = {};
      if (plate) filters.plate = plate;
      if (code16) filters.code16 = code16;
      if (owner_name) filters.owner_name = owner_name;
      if (owner_phone) filters.owner_phone = owner_phone;

      const result = await Vehicle.list(tenantId, filters, parseInt(page), parseInt(limit));

      // Headers de paginação
      const { pagination } = result;
      res.set({
        'X-Total-Count': pagination.total,
        'X-Page': pagination.page,
        'X-Limit': pagination.limit,
        'X-Total-Pages': pagination.pages
      });

      // Link header para paginação (RFC 5988)
      const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
      const links = [];
      
      if (pagination.page > 1) {
        links.push(`<${baseUrl}?page=${pagination.page - 1}&limit=${pagination.limit}>; rel="prev"`);
      }
      
      if (pagination.page < pagination.pages) {
        links.push(`<${baseUrl}?page=${pagination.page + 1}&limit=${pagination.limit}>; rel="next"`);
      }
      
      if (links.length > 0) {
        res.set('Link', links.join(', '));
      }

      res.json({
        vehicles: result.vehicles.map(v => v.toJSON()),
        pagination: pagination
      });
    } catch (error) {
      logger.error('Erro ao listar veículos', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao listar veículos'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Busca veículo por ID
   */
  static async getById(req, res) {
    try {
      const { vehicleId } = req.params;
      const tenantId = req.user.tenant_id;

      const vehicle = await Vehicle.findById(tenantId, vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Veículo não encontrado',
            details: { vehicle_id: vehicleId }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      res.json(vehicle.toJSON());
    } catch (error) {
      logger.error('Erro ao buscar veículo', { error: error.message, vehicleId: req.params.vehicleId });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao buscar veículo'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Atualiza veículo
   */
  static async update(req, res) {
    try {
      const { vehicleId } = req.params;
      const tenantId = req.user.tenant_id;
      const updateData = req.body;

      const vehicle = await Vehicle.findById(tenantId, vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Veículo não encontrado',
            details: { vehicle_id: vehicleId }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      // Verifica se a nova placa já existe (se estiver sendo alterada)
      if (updateData.plate && updateData.plate !== vehicle.plate) {
        const existingVehicle = await Vehicle.findByPlate(tenantId, updateData.plate);
        if (existingVehicle && existingVehicle.id !== vehicleId) {
          return res.status(409).json({
            error: {
              code: 'conflict',
              message: 'Veículo com esta placa já existe',
              details: { plate: updateData.plate }
            },
            correlation_id: req.headers['x-correlation-id'] || 'unknown'
          });
        }
      }

      await vehicle.update(updateData);

      logger.info('Veículo atualizado com sucesso', { 
        vehicle_id: vehicle.id, 
        tenant_id: tenantId 
      });

      res.json(vehicle.toJSON());
    } catch (error) {
      logger.error('Erro ao atualizar veículo', { error: error.message, vehicleId: req.params.vehicleId });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao atualizar veículo'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Remove veículo
   */
  static async delete(req, res) {
    try {
      const { vehicleId } = req.params;
      const tenantId = req.user.tenant_id;

      const vehicle = await Vehicle.findById(tenantId, vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Veículo não encontrado',
            details: { vehicle_id: vehicleId }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      await vehicle.delete();

      logger.info('Veículo removido com sucesso', { 
        vehicle_id: vehicle.id, 
        tenant_id: tenantId 
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Erro ao remover veículo', { error: error.message, vehicleId: req.params.vehicleId });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao remover veículo'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Busca veículo por código de 16 caracteres
   */
  static async getByCode16(req, res) {
    try {
      const { code16 } = req.params;
      const tenantId = req.user.tenant_id;

      const vehicle = await Vehicle.findByCode16(tenantId, code16);
      
      if (!vehicle) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Veículo não encontrado',
            details: { code16 }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      res.json(vehicle.toJSON());
    } catch (error) {
      logger.error('Erro ao buscar veículo por código', { error: error.message, code16: req.params.code16 });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao buscar veículo'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }

  /**
   * Gera código de 16 caracteres para um seed
   */
  static async generateCode16(req, res) {
    try {
      const { seed } = req.body;

      if (!seed) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Seed é obrigatório',
            details: { field: 'seed' }
          },
          correlation_id: req.headers['x-correlation-id'] || 'unknown'
        });
      }

      const code16 = generateCode16(seed);

      res.json({ code16 });
    } catch (error) {
      logger.error('Erro ao gerar código 16', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao gerar código'
        },
        correlation_id: req.headers['x-correlation-id'] || 'unknown'
      });
    }
  }
}

module.exports = VehicleController;
