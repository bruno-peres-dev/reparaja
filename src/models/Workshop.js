const { query } = require('../config/database');
const logger = require('../utils/logger');

class Workshop {
  constructor(data = {}) {
    this.id = data.id;
    this.tenant_id = data.tenant_id;
    this.name = data.name;
    this.cnpj = data.cnpj;
    this.corporate_name = data.corporate_name;
    this.address = data.address || {};
    this.phone = data.phone;
    this.email = data.email;
    this.website = data.website;
    this.type = data.type || 'main';
    this.status = data.status || 'active';
    this.timezone = data.timezone || 'America/Sao_Paulo';
    this.working_hours = data.working_hours || {};
    this.max_vehicles_per_day = data.max_vehicles_per_day || 50;
    this.max_mechanics = data.max_mechanics || 10;
    this.specialties = data.specialties || [];
    this.erp_id = data.erp_id;
    this.erp_sync_enabled = data.erp_sync_enabled || false;
    this.last_erp_sync = data.last_erp_sync;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar nova oficina
  static async create(workshopData) {
    try {
      const {
        tenant_id,
        name,
        cnpj,
        corporate_name,
        address,
        phone,
        email,
        website,
        type,
        status,
        timezone,
        working_hours,
        max_vehicles_per_day,
        max_mechanics,
        specialties,
        erp_id,
        erp_sync_enabled
      } = workshopData;

      const result = await query(`
        INSERT INTO workshops (
          tenant_id, name, cnpj, corporate_name, address, phone, email, website,
          type, status, timezone, working_hours, max_vehicles_per_day,
          max_mechanics, specialties, erp_id, erp_sync_enabled
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `, [
        tenant_id, name, cnpj, corporate_name, JSON.stringify(address), phone, email, website,
        type, status, timezone, JSON.stringify(working_hours), max_vehicles_per_day,
        max_mechanics, specialties, erp_id, erp_sync_enabled
      ]);

      return new Workshop(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao criar oficina', { error: error.message, workshopData });
      throw error;
    }
  }

  // Buscar oficina por ID
  static async findById(id, tenant_id) {
    try {
      const result = await query(`
        SELECT * FROM workshops 
        WHERE id = $1 AND tenant_id = $2
      `, [id, tenant_id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new Workshop(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar oficina por ID', { error: error.message, id, tenant_id });
      throw error;
    }
  }

  // Listar oficinas do tenant
  static async findByTenant(tenant_id, filters = {}) {
    try {
      let sql = 'SELECT * FROM workshops WHERE tenant_id = $1';
      const params = [tenant_id];
      let paramIndex = 2;

      // Filtros
      if (filters.status) {
        sql += ` AND status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.type) {
        sql += ` AND type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${paramIndex} OR cnpj ILIKE $${paramIndex})`;
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Paginação
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);

      // Contar total para paginação
      const countSql = 'SELECT COUNT(*) FROM workshops WHERE tenant_id = $1';
      const countResult = await query(countSql, [tenant_id]);
      const total = parseInt(countResult.rows[0].count);

      return {
        data: result.rows.map(row => new Workshop(row)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar oficinas', { error: error.message, tenant_id, filters });
      throw error;
    }
  }

  // Atualizar oficina
  async update(updateData) {
    try {
      const fields = [];
      const values = [];
      let paramIndex = 1;

      // Construir query dinamicamente
      Object.keys(updateData).forEach(key => {
        if (key !== 'id' && key !== 'tenant_id' && key !== 'created_at') {
          fields.push(`${key} = $${paramIndex}`);
          values.push(updateData[key]);
          paramIndex++;
        }
      });

      if (fields.length === 0) {
        return this;
      }

      // Adicionar updated_at
      fields.push(`updated_at = NOW()`);

      // Adicionar WHERE
      values.push(this.id, this.tenant_id);

      const sql = `
        UPDATE workshops 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await query(sql, values);

      if (result.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      // Atualizar instância
      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar oficina', { error: error.message, id: this.id, updateData });
      throw error;
    }
  }

  // Deletar oficina
  async delete() {
    try {
      const result = await query(`
        DELETE FROM workshops 
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `, [this.id, this.tenant_id]);

      if (result.rows.length === 0) {
        throw new Error('Oficina não encontrada');
      }

      return true;
    } catch (error) {
      logger.error('Erro ao deletar oficina', { error: error.message, id: this.id });
      throw error;
    }
  }

  // Buscar veículos da oficina
  static async getVehicles(workshopId, tenant_id, filters = {}) {
    try {
      let sql = `
        SELECT v.* FROM vehicles v
        WHERE v.workshop_id = $1 AND v.tenant_id = $2
      `;
      const params = [workshopId, tenant_id];
      let paramIndex = 3;

      // Filtros
      if (filters.status) {
        sql += ` AND v.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.brand) {
        sql += ` AND v.brand ILIKE $${paramIndex}`;
        params.push(`%${filters.brand}%`);
        paramIndex++;
      }

      // Paginação
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      sql += ` ORDER BY v.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);

      // Contar total
      const countSql = `
        SELECT COUNT(*) FROM vehicles v
        WHERE v.workshop_id = $1 AND v.tenant_id = $2
      `;
      const countResult = await query(countSql, [workshopId, tenant_id]);
      const total = parseInt(countResult.rows[0].count);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao buscar veículos da oficina', { error: error.message, workshopId, tenant_id });
      throw error;
    }
  }

  // Buscar ordens de serviço da oficina
  static async getOrders(workshopId, tenant_id, filters = {}) {
    try {
      let sql = `
        SELECT o.* FROM orders o
        WHERE o.workshop_id = $1 AND o.tenant_id = $2
      `;
      const params = [workshopId, tenant_id];
      let paramIndex = 3;

      // Filtros
      if (filters.status) {
        sql += ` AND o.status = $${paramIndex}`;
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.date_from) {
        sql += ` AND o.created_at >= $${paramIndex}`;
        params.push(filters.date_from);
        paramIndex++;
      }

      if (filters.date_to) {
        sql += ` AND o.created_at <= $${paramIndex}`;
        params.push(filters.date_to);
        paramIndex++;
      }

      // Paginação
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const offset = (page - 1) * limit;

      sql += ` ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);

      // Contar total
      const countSql = `
        SELECT COUNT(*) FROM orders o
        WHERE o.workshop_id = $1 AND o.tenant_id = $2
      `;
      const countResult = await query(countSql, [workshopId, tenant_id]);
      const total = parseInt(countResult.rows[0].count);

      return {
        data: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao buscar ordens da oficina', { error: error.message, workshopId, tenant_id });
      throw error;
    }
  }

  // Estatísticas da oficina
  static async getStats(workshopId, tenant_id) {
    try {
      // Total de veículos
      const vehiclesResult = await query(`
        SELECT COUNT(*) as total_vehicles,
               COUNT(CASE WHEN status = 'active' THEN 1 END) as active_vehicles
        FROM vehicles 
        WHERE workshop_id = $1 AND tenant_id = $2
      `, [workshopId, tenant_id]);

      // Total de ordens de serviço
      const ordersResult = await query(`
        SELECT COUNT(*) as total_orders,
               COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
               COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
        FROM orders 
        WHERE workshop_id = $1 AND tenant_id = $2
      `, [workshopId, tenant_id]);

      // Receita total
      const revenueResult = await query(`
        SELECT COALESCE(SUM(total_amount), 0) as total_revenue
        FROM orders 
        WHERE workshop_id = $1 AND tenant_id = $2 AND status = 'completed'
      `, [workshopId, tenant_id]);

      return {
        vehicles: vehiclesResult.rows[0],
        orders: ordersResult.rows[0],
        revenue: revenueResult.rows[0]
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas da oficina', { error: error.message, workshopId, tenant_id });
      throw error;
    }
  }

  // Validar dados
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Nome da oficina deve ter pelo menos 2 caracteres');
    }

    if (this.cnpj && !/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(this.cnpj)) {
      errors.push('CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX');
    }

    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors.push('Email deve ter formato válido');
    }

    if (this.max_vehicles_per_day && (this.max_vehicles_per_day < 1 || this.max_vehicles_per_day > 1000)) {
      errors.push('Máximo de veículos por dia deve estar entre 1 e 1000');
    }

    if (this.max_mechanics && (this.max_mechanics < 1 || this.max_mechanics > 100)) {
      errors.push('Máximo de mecânicos deve estar entre 1 e 100');
    }

    return errors;
  }

  // Converter para objeto simples
  toJSON() {
    return {
      id: this.id,
      tenant_id: this.tenant_id,
      name: this.name,
      cnpj: this.cnpj,
      corporate_name: this.corporate_name,
      address: this.address,
      phone: this.phone,
      email: this.email,
      website: this.website,
      type: this.type,
      status: this.status,
      timezone: this.timezone,
      working_hours: this.working_hours,
      max_vehicles_per_day: this.max_vehicles_per_day,
      max_mechanics: this.max_mechanics,
      specialties: this.specialties,
      erp_id: this.erp_id,
      erp_sync_enabled: this.erp_sync_enabled,
      last_erp_sync: this.last_erp_sync,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Workshop;
