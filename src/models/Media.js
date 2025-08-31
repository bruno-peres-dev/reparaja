const { query } = require('../config/database');
const { generateUUID } = require('../utils/crypto');
const path = require('path');

class Media {
  static async create(mediaData) {
    const {
      tenant_id,
      vehicle_id,
      order_id,
      type,
      filename,
      original_name,
      mime_type,
      size,
      url,
      thumbnail_url,
      metadata,
      uploaded_by
    } = mediaData;

    const sql = `
      INSERT INTO media (
        id, tenant_id, vehicle_id, order_id, type, filename, 
        original_name, mime_type, size, url, thumbnail_url, 
        metadata, uploaded_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      generateUUID(), tenant_id, vehicle_id, order_id, type, filename,
      original_name, mime_type, size, url, thumbnail_url, 
      JSON.stringify(metadata), uploaded_by
    ];

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async findById(id, tenant_id) {
    const sql = `
      SELECT * FROM media 
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await query(sql, [id, tenant_id]);
    return result.rows[0];
  }

  static async findByVehicle(vehicle_id, tenant_id, filters = {}) {
    let sql = `
      SELECT m.*, 
             v.plate as vehicle_plate,
             v.brand as vehicle_brand,
             v.model as vehicle_model
      FROM media m
      JOIN vehicles v ON m.vehicle_id = v.id
      WHERE m.vehicle_id = $1 AND m.tenant_id = $2
    `;

    const values = [vehicle_id, tenant_id];
    let paramCount = 2;

    if (filters.type) {
      paramCount++;
      sql += ` AND m.type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.order_id) {
      paramCount++;
      sql += ` AND m.order_id = $${paramCount}`;
      values.push(filters.order_id);
    }

    sql += ` ORDER BY m.created_at DESC`;

    if (filters.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
    }

    const result = await query(sql, values);
    return result.rows;
  }

  static async list(tenant_id, filters = {}, pagination = {}) {
    let sql = `
      SELECT m.*, 
             v.plate as vehicle_plate,
             v.brand as vehicle_brand,
             v.model as vehicle_model,
             o.code as order_code
      FROM media m
      LEFT JOIN vehicles v ON m.vehicle_id = v.id
      LEFT JOIN orders o ON m.order_id = o.id
      WHERE m.tenant_id = $1
    `;

    const values = [tenant_id];
    let paramCount = 1;

    if (filters.vehicle_id) {
      paramCount++;
      sql += ` AND m.vehicle_id = $${paramCount}`;
      values.push(filters.vehicle_id);
    }

    if (filters.order_id) {
      paramCount++;
      sql += ` AND m.order_id = $${paramCount}`;
      values.push(filters.order_id);
    }

    if (filters.type) {
      paramCount++;
      sql += ` AND m.type = $${paramCount}`;
      values.push(filters.type);
    }

    if (filters.uploaded_by) {
      paramCount++;
      sql += ` AND m.uploaded_by = $${paramCount}`;
      values.push(filters.uploaded_by);
    }

    // Contar total para paginação
    const countSql = sql.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await query(countSql, values);
    const total = parseInt(countResult.rows[0].count);

    sql += ` ORDER BY m.created_at DESC`;

    if (pagination.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      values.push(pagination.limit);
    }

    if (pagination.offset) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      values.push(pagination.offset);
    }

    const result = await query(sql, values);
    return {
      media: result.rows,
      pagination: {
        total,
        page: pagination.page || 1,
        limit: pagination.limit || 50,
        pages: Math.ceil(total / (pagination.limit || 50))
      }
    };
  }

  static async update(id, tenant_id, updateData) {
    const allowedFields = ['type', 'metadata', 'order_id'];
    const updates = [];
    const values = [];
    let paramCount = 0;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        paramCount++;
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      throw new Error('Nenhum campo válido para atualização');
    }

    paramCount++;
    updates.push(`updated_at = NOW()`);
    paramCount++;
    values.push(id);
    paramCount++;
    values.push(tenant_id);

    const sql = `
      UPDATE media 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount - 1} AND tenant_id = $${paramCount}
      RETURNING *
    `;

    const result = await query(sql, values);
    return result.rows[0];
  }

  static async delete(id, tenant_id) {
    const sql = `
      DELETE FROM media 
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `;
    const result = await query(sql, [id, tenant_id]);
    return result.rows[0];
  }

  static async getStorageStats(tenant_id) {
    const sql = `
      SELECT 
        COUNT(*) as total_files,
        SUM(size) as total_size,
        type,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as files_last_30_days
      FROM media 
      WHERE tenant_id = $1
      GROUP BY type
    `;
    
    const result = await query(sql, [tenant_id]);
    return result.rows;
  }
}

module.exports = Media;