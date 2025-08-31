const Workshop = require('../models/Workshop');
const logger = require('../utils/logger');

class WorkshopController {
  // Criar nova oficina
  static async create(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const workshopData = { ...req.body, tenant_id };

      // Validar dados obrigatórios
      if (!workshopData.name) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Nome da oficina é obrigatório'
          }
        });
      }

      // Criar instância para validação
      const workshop = new Workshop(workshopData);
      const validationErrors = workshop.validate();

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: {
            code: 'validation_error',
            message: 'Dados inválidos',
            details: validationErrors
          }
        });
      }

      // Verificar se já existe oficina com mesmo CNPJ
      if (workshopData.cnpj) {
        const existingWorkshop = await Workshop.findByTenant(tenant_id, { cnpj: workshopData.cnpj });
        if (existingWorkshop.data.length > 0) {
          return res.status(409).json({
            error: {
              code: 'duplicate_cnpj',
              message: 'Já existe uma oficina com este CNPJ'
            }
          });
        }
      }

      // Criar oficina
      const newWorkshop = await Workshop.create(workshopData);

      logger.info('Oficina criada com sucesso', {
        workshop_id: newWorkshop.id,
        tenant_id,
        name: newWorkshop.name
      });

      res.status(201).json(newWorkshop.toJSON());
    } catch (error) {
      logger.error('Erro ao criar oficina', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao criar oficina'
        }
      });
    }
  }

  // Listar oficinas
  static async list(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { page, limit, status, type, search } = req.query;

      const filters = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        type,
        search
      };

      const workshops = await Workshop.findByTenant(tenant_id, filters);

      logger.info('Oficinas listadas com sucesso', {
        tenant_id,
        total: workshops.pagination.total,
        page: filters.page
      });

      res.json(workshops);
    } catch (error) {
      logger.error('Erro ao listar oficinas', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao listar oficinas'
        }
      });
    }
  }

  // Buscar oficina por ID
  static async getById(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      const workshop = await Workshop.findById(id, tenant_id);

      if (!workshop) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Oficina não encontrada',
            details: { workshop_id: id }
          }
        });
      }

      logger.info('Oficina encontrada com sucesso', {
        workshop_id: id,
        tenant_id,
        name: workshop.name
      });

      res.json(workshop.toJSON());
    } catch (error) {
      logger.error('Erro ao buscar oficina', { error: error.message, workshop_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao buscar oficina'
        }
      });
    }
  }

  // Atualizar oficina
  static async update(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;
      const updateData = req.body;

      // Buscar oficina existente
      const workshop = await Workshop.findById(id, tenant_id);

      if (!workshop) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Oficina não encontrada',
            details: { workshop_id: id }
          }
        });
      }

      // Validar dados se CNPJ foi alterado
      if (updateData.cnpj && updateData.cnpj !== workshop.cnpj) {
        const existingWorkshop = await Workshop.findByTenant(tenant_id, { cnpj: updateData.cnpj });
        if (existingWorkshop.data.length > 0) {
          return res.status(409).json({
            error: {
              code: 'duplicate_cnpj',
              message: 'Já existe uma oficina com este CNPJ'
            }
          });
        }
      }

      // Atualizar oficina
      await workshop.update(updateData);

      logger.info('Oficina atualizada com sucesso', {
        workshop_id: id,
        tenant_id,
        name: workshop.name
      });

      res.json(workshop.toJSON());
    } catch (error) {
      logger.error('Erro ao atualizar oficina', { error: error.message, workshop_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao atualizar oficina'
        }
      });
    }
  }

  // Deletar oficina
  static async delete(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      // Buscar oficina existente
      const workshop = await Workshop.findById(id, tenant_id);

      if (!workshop) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Oficina não encontrada',
            details: { workshop_id: id }
          }
        });
      }

      // Verificar se é a oficina principal
      if (workshop.type === 'main') {
        return res.status(400).json({
          error: {
            code: 'cannot_delete_main',
            message: 'Não é possível deletar a oficina principal'
          }
        });
      }

      // Verificar se há veículos ou ordens vinculadas
      const vehicles = await Workshop.getVehicles(id, tenant_id);
      const orders = await Workshop.getOrders(id, tenant_id);

      if (vehicles.data.length > 0 || orders.data.length > 0) {
        return res.status(400).json({
          error: {
            code: 'workshop_has_dependencies',
            message: 'Não é possível deletar oficina com veículos ou ordens vinculadas',
            details: {
              vehicles_count: vehicles.data.length,
              orders_count: orders.data.length
            }
          }
        });
      }

      // Deletar oficina
      await workshop.delete();

      logger.info('Oficina deletada com sucesso', {
        workshop_id: id,
        tenant_id,
        name: workshop.name
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Erro ao deletar oficina', { error: error.message, workshop_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao deletar oficina'
        }
      });
    }
  }

  // Buscar veículos da oficina
  static async getVehicles(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;
      const { page, limit, status, brand } = req.query;

      // Verificar se oficina existe
      const workshop = await Workshop.findById(id, tenant_id);
      if (!workshop) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Oficina não encontrada',
            details: { workshop_id: id }
          }
        });
      }

      const filters = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        brand
      };

      const vehicles = await Workshop.getVehicles(id, tenant_id, filters);

      logger.info('Veículos da oficina listados com sucesso', {
        workshop_id: id,
        tenant_id,
        total: vehicles.pagination.total
      });

      res.json(vehicles);
    } catch (error) {
      logger.error('Erro ao listar veículos da oficina', { error: error.message, workshop_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao listar veículos da oficina'
        }
      });
    }
  }

  // Buscar ordens de serviço da oficina
  static async getOrders(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;
      const { page, limit, status, date_from, date_to } = req.query;

      // Verificar se oficina existe
      const workshop = await Workshop.findById(id, tenant_id);
      if (!workshop) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Oficina não encontrada',
            details: { workshop_id: id }
          }
        });
      }

      const filters = {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        status,
        date_from,
        date_to
      };

      const orders = await Workshop.getOrders(id, tenant_id, filters);

      logger.info('Ordens da oficina listadas com sucesso', {
        workshop_id: id,
        tenant_id,
        total: orders.pagination.total
      });

      res.json(orders);
    } catch (error) {
      logger.error('Erro ao listar ordens da oficina', { error: error.message, workshop_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao listar ordens da oficina'
        }
      });
    }
  }

  // Estatísticas da oficina
  static async getStats(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      // Verificar se oficina existe
      const workshop = await Workshop.findById(id, tenant_id);
      if (!workshop) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Oficina não encontrada',
            details: { workshop_id: id }
          }
        });
      }

      const stats = await Workshop.getStats(id, tenant_id);

      logger.info('Estatísticas da oficina obtidas com sucesso', {
        workshop_id: id,
        tenant_id,
        name: workshop.name
      });

      res.json({
        workshop: {
          id: workshop.id,
          name: workshop.name,
          type: workshop.type,
          status: workshop.status
        },
        stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas da oficina', { error: error.message, workshop_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao obter estatísticas da oficina'
        }
      });
    }
  }

  // Sincronizar com ERP
  static async syncWithERP(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      // Verificar se oficina existe
      const workshop = await Workshop.findById(id, tenant_id);
      if (!workshop) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Oficina não encontrada',
            details: { workshop_id: id }
          }
        });
      }

      // Verificar se sincronização está habilitada
      if (!workshop.erp_sync_enabled) {
        return res.status(400).json({
          error: {
            code: 'erp_sync_disabled',
            message: 'Sincronização com ERP não está habilitada para esta oficina'
          }
        });
      }

      // TODO: Implementar sincronização real com ERP
      // Por enquanto, apenas atualizar timestamp
      await workshop.update({
        last_erp_sync: new Date().toISOString()
      });

      logger.info('Sincronização com ERP iniciada', {
        workshop_id: id,
        tenant_id,
        name: workshop.name
      });

      res.json({
        message: 'Sincronização com ERP iniciada com sucesso',
        last_sync: workshop.last_erp_sync
      });
    } catch (error) {
      logger.error('Erro ao sincronizar com ERP', { error: error.message, workshop_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao sincronizar com ERP'
        }
      });
    }
  }
}

module.exports = WorkshopController;
