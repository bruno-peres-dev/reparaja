const Order = require('../models/Order');
const logger = require('../utils/logger');

class OrderController {
  // Criar nova ordem de serviço
  static async create(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { vehicle_id, estimate_amount, status, notes, workshop_id } = req.body;

      // Validar dados obrigatórios
      if (!vehicle_id) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'ID do veículo é obrigatório'
          }
        });
      }

      if (!estimate_amount || estimate_amount <= 0) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Valor estimado deve ser maior que zero'
          }
        });
      }

      // Criar ordem
      const orderData = {
        vehicle_id,
        estimate_amount,
        status: status || 'awaiting_approval',
        notes
      };

      const newOrder = await Order.create(tenant_id, orderData);

      // Se workshop_id foi fornecido, atualizar a ordem
      if (workshop_id) {
        await newOrder.update({ workshop_id });
      }

      logger.info('Ordem de serviço criada com sucesso', {
        order_id: newOrder.id,
        tenant_id,
        vehicle_id,
        estimate_amount
      });

      res.status(201).json(newOrder.toJSON());
    } catch (error) {
      logger.error('Erro ao criar ordem de serviço', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao criar ordem de serviço'
        }
      });
    }
  }

  // Listar ordens de serviço
  static async list(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { page, limit, status, approved, plate, code16, min_amount, max_amount } = req.query;

      const filters = {
        status,
        approved: approved === 'true' ? true : approved === 'false' ? false : undefined,
        plate,
        code16,
        min_amount: min_amount ? parseFloat(min_amount) : undefined,
        max_amount: max_amount ? parseFloat(max_amount) : undefined
      };

      const pageNum = parseInt(page) || 1;
      const limitNum = Math.min(parseInt(limit) || 50, 100);

      const result = await Order.list(tenant_id, filters, pageNum, limitNum);

      logger.info('Ordens de serviço listadas com sucesso', {
        tenant_id,
        total: result.pagination.total,
        page: pageNum
      });

      res.json(result);
    } catch (error) {
      logger.error('Erro ao listar ordens de serviço', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao listar ordens de serviço'
        }
      });
    }
  }

  // Buscar ordem por ID
  static async getById(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      const order = await Order.findById(tenant_id, id);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Ordem de serviço não encontrada',
            details: { order_id: id }
          }
        });
      }

      logger.info('Ordem de serviço encontrada com sucesso', {
        order_id: id,
        tenant_id,
        vehicle_id: order.vehicle_id
      });

      res.json(order);
    } catch (error) {
      logger.error('Erro ao buscar ordem de serviço', { error: error.message, order_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao buscar ordem de serviço'
        }
      });
    }
  }

  // Atualizar ordem de serviço
  static async update(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;
      const updateData = req.body;

      // Buscar ordem existente
      const order = await Order.findById(tenant_id, id);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Ordem de serviço não encontrada',
            details: { order_id: id }
          }
        });
      }

      // Validar dados se estimate_amount foi alterado
      if (updateData.estimate_amount && updateData.estimate_amount <= 0) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Valor estimado deve ser maior que zero'
          }
        });
      }

      // Atualizar ordem
      await order.update(updateData);

      logger.info('Ordem de serviço atualizada com sucesso', {
        order_id: id,
        tenant_id,
        vehicle_id: order.vehicle_id
      });

      res.json(order.toJSON());
    } catch (error) {
      logger.error('Erro ao atualizar ordem de serviço', { error: error.message, order_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao atualizar ordem de serviço'
        }
      });
    }
  }

  // Deletar ordem de serviço
  static async delete(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      // Buscar ordem existente
      const order = await Order.findById(tenant_id, id);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Ordem de serviço não encontrada',
            details: { order_id: id }
          }
        });
      }

      // Verificar se pode ser deletada
      if (order.status === 'completed' || order.status === 'in_progress') {
        return res.status(400).json({
          error: {
            code: 'cannot_delete_active',
            message: 'Não é possível deletar ordem em andamento ou concluída'
          }
        });
      }

      // Deletar ordem
      await order.delete();

      logger.info('Ordem de serviço deletada com sucesso', {
        order_id: id,
        tenant_id,
        vehicle_id: order.vehicle_id
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Erro ao deletar ordem de serviço', { error: error.message, order_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao deletar ordem de serviço'
        }
      });
    }
  }

  // Buscar ordens por veículo
  static async getByVehicle(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { vehicle_id } = req.params;

      const orders = await Order.findByVehicle(tenant_id, vehicle_id);

      logger.info('Ordens do veículo listadas com sucesso', {
        tenant_id,
        vehicle_id,
        total: orders.length
      });

      res.json({
        vehicle_id,
        orders: orders.map(order => order.toJSON()),
        total: orders.length
      });
    } catch (error) {
      logger.error('Erro ao listar ordens do veículo', { error: error.message, vehicle_id: req.params.vehicle_id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao listar ordens do veículo'
        }
      });
    }
  }

  // Estatísticas de conversão
  static async getConversionStats(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { from_date, to_date } = req.query;

      // Validar datas
      if (!from_date || !to_date) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Datas de início e fim são obrigatórias'
          }
        });
      }

      const fromDate = new Date(from_date);
      const toDate = new Date(to_date);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Formato de data inválido'
          }
        });
      }

      const stats = await Order.getConversionStats(tenant_id, fromDate, toDate);

      logger.info('Estatísticas de conversão obtidas com sucesso', {
        tenant_id,
        from_date,
        to_date
      });

      res.json({
        period: { from_date, to_date },
        stats
      });
    } catch (error) {
      logger.error('Erro ao obter estatísticas de conversão', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao obter estatísticas de conversão'
        }
      });
    }
  }

  // Aprovar ordem de serviço
  static async approve(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      // Buscar ordem existente
      const order = await Order.findById(tenant_id, id);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Ordem de serviço não encontrada',
            details: { order_id: id }
          }
        });
      }

      if (order.approved) {
        return res.status(400).json({
          error: {
            code: 'already_approved',
            message: 'Ordem já foi aprovada'
          }
        });
      }

      // Aprovar ordem
      await order.update({
        approved: true,
        status: 'approved'
      });

      logger.info('Ordem de serviço aprovada com sucesso', {
        order_id: id,
        tenant_id,
        vehicle_id: order.vehicle_id
      });

      res.json(order.toJSON());
    } catch (error) {
      logger.error('Erro ao aprovar ordem de serviço', { error: error.message, order_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao aprovar ordem de serviço'
        }
      });
    }
  }

  // Iniciar ordem de serviço
  static async start(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      // Buscar ordem existente
      const order = await Order.findById(tenant_id, id);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Ordem de serviço não encontrada',
            details: { order_id: id }
          }
        });
      }

      if (!order.approved) {
        return res.status(400).json({
          error: {
            code: 'not_approved',
            message: 'Ordem deve ser aprovada antes de ser iniciada'
          }
        });
      }

      if (order.status === 'in_progress') {
        return res.status(400).json({
          error: {
            code: 'already_started',
            message: 'Ordem já foi iniciada'
          }
        });
      }

      if (order.status === 'completed') {
        return res.status(400).json({
          error: {
            code: 'already_completed',
            message: 'Ordem já foi concluída'
          }
        });
      }

      // Iniciar ordem
      await order.update({
        status: 'in_progress'
      });

      logger.info('Ordem de serviço iniciada com sucesso', {
        order_id: id,
        tenant_id,
        vehicle_id: order.vehicle_id
      });

      res.json(order.toJSON());
    } catch (error) {
      logger.error('Erro ao iniciar ordem de serviço', { error: error.message, order_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao iniciar ordem de serviço'
        }
      });
    }
  }

  // Concluir ordem de serviço
  static async complete(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { id } = req.params;

      // Buscar ordem existente
      const order = await Order.findById(tenant_id, id);

      if (!order) {
        return res.status(404).json({
          error: {
            code: 'not_found',
            message: 'Ordem de serviço não encontrada',
            details: { order_id: id }
          }
        });
      }

      if (order.status !== 'in_progress') {
        return res.status(400).json({
          error: {
            code: 'invalid_status',
            message: 'Ordem deve estar em andamento para ser concluída'
          }
        });
      }

      // Concluir ordem
      await order.update({
        status: 'completed'
      });

      logger.info('Ordem de serviço concluída com sucesso', {
        order_id: id,
        tenant_id,
        vehicle_id: order.vehicle_id
      });

      res.json(order.toJSON());
    } catch (error) {
      logger.error('Erro ao concluir ordem de serviço', { error: error.message, order_id: req.params.id, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao concluir ordem de serviço'
        }
      });
    }
  }
}

module.exports = OrderController;
