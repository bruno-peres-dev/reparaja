const { query } = require('../config/database');
const { generateCode16, validateCode16 } = require('../utils/crypto');
const logger = require('../utils/logger');

class Vehicle {
  constructor(data) {
    this.id = data.id;
    this.tenant_id = data.tenant_id;
    this.plate = data.plate;
    this.code16 = data.code16;
    this.owner = data.owner;
    this.meta = data.meta;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Cria um novo veículo
   */
  static async create(tenantId, vehicleData) {
    try {
      const { plate, owner, meta } = vehicleData;
      
      // Gera código de 16 caracteres
      const code16 = generateCode16(`${tenantId}:${plate}:${Date.now()}`);
      
      const result = await query(
        `INSERT INTO vehicles (tenant_id, plate, code16, owner, meta)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [tenantId, plate, code16, JSON.stringify(owner), JSON.stringify(meta)]
      );

      return new Vehicle(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao criar veículo', { error: error.message, tenantId, plate });
      throw error;
    }
  }

  /**
   * Busca veículo por ID
   */
  static async findById(tenantId, vehicleId) {
    try {
      const result = await query(
        'SELECT * FROM vehicles WHERE id = $1 AND tenant_id = $2',
        [vehicleId, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new Vehicle(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar veículo por ID', { error: error.message, vehicleId, tenantId });
      throw error;
    }
  }

  /**
   * Busca veículo por placa
   */
  static async findByPlate(tenantId, plate) {
    try {
      const result = await query(
        'SELECT * FROM vehicles WHERE plate = $1 AND tenant_id = $2',
        [plate, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new Vehicle(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar veículo por placa', { error: error.message, plate, tenantId });
      throw error;
    }
  }

  /**
   * Busca veículo por código de 16 caracteres
   */
  static async findByCode16(tenantId, code16) {
    try {
      if (!validateCode16(code16)) {
        return null;
      }

      const result = await query(
        'SELECT * FROM vehicles WHERE code16 = $1 AND tenant_id = $2',
        [code16, tenantId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new Vehicle(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar veículo por código', { error: error.message, code16, tenantId });
      throw error;
    }
  }

  /**
   * Lista veículos com paginação
   */
  static async list(tenantId, filters = {}, page = 1, limit = 50) {
    try {
      let whereClause = 'WHERE tenant_id = $1';
      let params = [tenantId];
      let paramIndex = 2;

      // Filtros opcionais
      if (filters.plate) {
        whereClause += ` AND plate ILIKE $${paramIndex}`;
        params.push(`%${filters.plate}%`);
        paramIndex++;
      }

      if (filters.code16) {
        whereClause += ` AND code16 = $${paramIndex}`;
        params.push(filters.code16);
        paramIndex++;
      }

      if (filters.owner_name) {
        whereClause += ` AND owner->>'name' ILIKE $${paramIndex}`;
        params.push(`%${filters.owner_name}%`);
        paramIndex++;
      }

      if (filters.owner_phone) {
        whereClause += ` AND owner->>'phone' ILIKE $${paramIndex}`;
        params.push(`%${filters.owner_phone}%`);
        paramIndex++;
      }

      // Conta total de registros
      const countResult = await query(
        `SELECT COUNT(*) as total FROM vehicles ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);
      const offset = (page - 1) * limit;

      // Busca registros paginados
      const result = await query(
        `SELECT * FROM vehicles ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const vehicles = result.rows.map(row => new Vehicle(row));

      return {
        vehicles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar veículos', { error: error.message, tenantId });
      throw error;
    }
  }

  /**
   * Atualiza veículo
   */
  async update(updateData) {
    try {
      const { plate, owner, meta } = updateData;
      
      const result = await query(
        `UPDATE vehicles 
         SET plate = COALESCE($1, plate),
             owner = COALESCE($2, owner),
             meta = COALESCE($3, meta),
             updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5
         RETURNING *`,
        [
          plate,
          owner ? JSON.stringify(owner) : null,
          meta ? JSON.stringify(meta) : null,
          this.id,
          this.tenant_id
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('Veículo não encontrado');
      }

      Object.assign(this, result.rows[0]);
      return this;
    } catch (error) {
      logger.error('Erro ao atualizar veículo', { error: error.message, vehicleId: this.id });
      throw error;
    }
  }

  /**
   * Remove veículo
   */
  async delete() {
    try {
      const result = await query(
        'DELETE FROM vehicles WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [this.id, this.tenant_id]
      );

      if (result.rows.length === 0) {
        throw new Error('Veículo não encontrado');
      }

      return true;
    } catch (error) {
      logger.error('Erro ao remover veículo', { error: error.message, vehicleId: this.id });
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
      plate: this.plate,
      code16: this.code16,
      owner: this.owner,
      meta: this.meta,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = Vehicle;
