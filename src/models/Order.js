const { query } = require('../config/database');
const logger = require('../utils/logger');

class Order {
  constructor(data) {
    this.id = data.id;
    this.tenant_id = data.tenant_id;
    this.vehicle_id = data.vehicle_id;
    this.status = data.status;
    this.estimate_amount = data.estimate_amount;
    this.approved = data.approved;
    this.notes = data.notes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Cria uma nova ordem de serviço
   */
  static async create(tenantId, orderData) {
    try {
      const { vehicle_id, estimate_amount, status, notes } = orderData;
      
      const result = await query(
        `INSERT INTO orders (tenant_id, vehicle_id, estimate_amount, status, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [tenantId, vehicle_id, estimate_amount, status || 'awaiting_approval', notes]
      );

      return new Order(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao criar ordem de serviço', { error: error.message, tenantId, vehicle_id });
      throw error;
    }
  }

  /**
   * Busca ordem por ID
   */
  static async findById(tenantId, orderId) {
    try {
      const result = await query(
        `SELECT o.*, v.plate, v.code16, v.owner
         FROM orders o
         LEFT JOIN vehicles v ON o.vehicle_id = v.id
         WHERE o.id = $1 AND o.tenant_id = $2`,
        [orderId, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const orderData = result.rows[0];
      return {
        ...new Order(orderData),
        vehicle: {
          id: orderData.vehicle_id,
          plate: orderData.plate,
          code16: orderData.code16,
          owner: orderData.owner
        }
      };
    } catch (error) {
      logger.error('Erro ao buscar ordem por ID', { error: error.message, orderId, tenantId });
      throw error;
    }
  }

  /**
   * Lista ordens com paginação e filtros
   */
  static async list(tenantId, filters = {}, page = 1, limit = 50) {
    try {
      let whereClause = 'WHERE o.tenant_id = $1';
      let params = [tenantId];
      let paramIndex = 2;

      // Filtros opcionais
      if (filters.status) {
        whereClause += ` AND o.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.approved !== undefined) {
        whereClause += ` AND o.approved = $${paramIndex}`;
        params.push(filters.approved);
        paramIndex++;
      }

      if (filters.plate) {
        whereClause += ` AND v.plate ILIKE $${paramIndex}`;
        params.push(`%${filters.plate}%`);
        paramIndex++;
      }

      if (filters.code16) {
        whereClause += ` AND v.code16 = $${paramIndex}`;
        params.push(filters.code16);
        paramIndex++;
      }

      if (filters.min_amount) {
        whereClause += ` AND o.estimate_amount >= $${paramIndex}`;
        params.push(filters.min_amount);
        paramIndex++;
      }

      if (filters.max_amount) {
        whereClause += ` AND o.estimate_amount <= $${paramIndex}`;
        params.push(filters.max_amount);
        paramIndex++;
      }

      // Conta total de registros
      const countResult = await query(
        `SELECT COUNT(*) as total 
         FROM orders o
         LEFT JOIN vehicles v ON o.vehicle_id = v.id
         ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);
      const offset = (page - 1) * limit;

      // Busca registros paginados
      const result = await query(
        `SELECT o.*, v.plate, v.code16, v.owner
         FROM orders o
         LEFT JOIN vehicles v ON o.vehicle_id = v.id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const orders = result.rows.map(row => ({
        ...new Order(row),
        vehicle: {
          id: row.vehicle_id,
          plate: row.plate,
          code16: row.code16,
          owner: row.owner
        }
      }));

      return {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar ordens', { error: error.message, tenantId });
      throw error;
    }
  }

  /**
   * Atualiza ordem
   */
  async update(updateData) {
    try {
      const { status, estimate_amount, approved, notes } = updateData;
      
      const result = await query(
        `UPDATE orders 
         SET status = COALESCE($1, status),
             estimate_amount = COALESCE($2, estimate_amount),
             approved = COALESCE($3, approved),
             notes = COALESCE($4, notes),
             updated_at = NOW()
         WHERE id = $5 AND tenant_id = $6
         RETURNING *`,
        [status, estimate_amount, approved, notes, this.id, this.tenant_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Ordem não encontrada');
      }

      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar ordem', { error: error.message, orderId: this.id });
      throw error;
    }
  }

  /**
   * Remove ordem
   */
  async delete() {
    try {
      const result = await query(
        'DELETE FROM orders WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [this.id, this.tenant_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Ordem não encontrada');
      }

      return true;
    } catch (error) {
      logger.error('Erro ao remover ordem', { error: error.message, orderId: this.id });
      throw error;
    }
  }

  /**
   * Busca ordens por veículo
   */
  static async findByVehicle(tenantId, vehicleId) {
    try {
      const result = await query(
        'SELECT * FROM orders WHERE vehicle_id = $1 AND tenant_id = $2 ORDER BY created_at DESC',
        [vehicleId, tenantId]
      );

      return result.rows.map(row => new Order(row));
    } catch (error) {
      logger.error('Erro ao buscar ordens por veículo', { error: error.message, vehicleId, tenantId });
      throw error;
    }
  }

  /**
   * Estatísticas de conversão
   */
  static async getConversionStats(tenantId, fromDate, toDate) {
    try {
      const result = await query(
        `SELECT 
           COUNT(*) as total_orders,
           COUNT(CASE WHEN approved = true THEN 1 END) as approved_orders,
           COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
           AVG(CASE WHEN approved = true THEN 
             EXTRACT(EPOCH FROM (updated_at - created_at)) / 60 
           END) as avg_time_to_approve_minutes,
           AVG(estimate_amount) as avg_estimate_amount
         FROM orders 
         WHERE tenant_id = $1 
           AND created_at >= $2 
           AND created_at <= $3`,
        [tenantId, fromDate, toDate]
      );

      const stats = result.rows[0];
      
      return {
        total_orders: parseInt(stats.total_orders),
        approved_orders: parseInt(stats.approved_orders),
        completed_orders: parseInt(stats.completed_orders),
        approval_rate: stats.total_orders > 0 ? (stats.approved_orders / stats.total_orders) : 0,
        completion_rate: stats.total_orders > 0 ? (stats.completed_orders / stats.total_orders) : 0,
        avg_time_to_approve_minutes: parseFloat(stats.avg_time_to_approve_minutes) || 0,
        avg_estimate_amount: parseFloat(stats.avg_estimate_amount) || 0
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de conversão', { error: error.message, tenantId });
      throw error;
    }
  }

  /**
   * Converte para objeto JSON
   */
  toJSON() {
    return {
      id: this.id,
      tenant_id: this.tenant_id,
      vehicle_id: this.vehicle_id,
      status: this.status,
      estimate_amount: this.estimate_amount,
      approved: this.approved,
      notes: this.notes,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Order;
