const { query } = require('../config/database');
const crypto = require('../utils/crypto');
const logger = require('../utils/logger');

class User {
  constructor(data) {
    this.id = data.id;
    this.tenant_id = data.tenant_id;
    this.email = data.email;
    this.name = data.name;
    this.role = data.role;
    this.status = data.status;
    this.last_login = data.last_login;
    this.login_attempts = data.login_attempts;
    this.locked_until = data.locked_until;
    this.password_hash = data.password_hash;
    this.password_reset_token = data.password_reset_token;
    this.password_reset_expires = data.password_reset_expires;
    this.mfa_enabled = data.mfa_enabled;
    this.mfa_secret = data.mfa_secret;
    this.preferences = data.preferences;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar novo usuário
  static async create(tenant_id, userData) {
    try {
      const { email, name, password, role = 'user' } = userData;

      // Validar dados obrigatórios
      if (!email || !name || !password) {
        throw new Error('Email, nome e senha são obrigatórios');
      }

      // Verificar se email já existe no tenant
      const existingUser = await User.findByEmail(tenant_id, email);
      if (existingUser) {
        throw new Error('Email já cadastrado neste tenant');
      }

      // Hash da senha
      const password_hash = await crypto.hashPassword(password);

      // Inserir usuário
      const result = await query(`
        INSERT INTO users (
          tenant_id, email, name, role, status, password_hash, 
          login_attempts, preferences, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        RETURNING *
      `, [
        tenant_id, email, name, role, 'active', password_hash,
        0, JSON.stringify({}), new Date(), new Date()
      ]);

      logger.info('Usuário criado com sucesso', {
        user_id: result.rows[0].id,
        tenant_id,
        email,
        role
      });

      return new User(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao criar usuário', { error: error.message, tenant_id });
      throw error;
    }
  }

  // Buscar usuário por ID
  static async findById(tenant_id, id) {
    try {
      const result = await query(`
        SELECT * FROM users 
        WHERE id = $1 AND tenant_id = $2 AND status != 'deleted'
      `, [id, tenant_id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar usuário por ID', { error: error.message, user_id: id, tenant_id });
      throw error;
    }
  }

  // Buscar usuário por email
  static async findByEmail(tenant_id, email) {
    try {
      const result = await query(`
        SELECT * FROM users 
        WHERE email = $1 AND tenant_id = $2 AND status != 'deleted'
      `, [email, tenant_id]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      logger.error('Erro ao buscar usuário por email', { error: error.message, email, tenant_id });
      throw error;
    }
  }

  // Listar usuários
  static async list(tenant_id, filters = {}, page = 1, limit = 50) {
    try {
      const { role, status, search } = filters;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE tenant_id = $1 AND status != \'deleted\'';
      let params = [tenant_id];
      let paramIndex = 2;

      if (role) {
        whereClause += ` AND role = $${paramIndex}`;
        params.push(role);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Contar total
      const countResult = await query(`
        SELECT COUNT(*) FROM users ${whereClause}
      `, params);

      const total = parseInt(countResult.rows[0].count);

      // Buscar usuários
      const result = await query(`
        SELECT * FROM users 
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      const users = result.rows.map(row => new User(row));

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Erro ao listar usuários', { error: error.message, tenant_id });
      throw error;
    }
  }

  // Autenticar usuário
  static async authenticate(tenant_id, email, password) {
    try {
      const user = await User.findByEmail(tenant_id, email);
      if (!user) {
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Verificar se conta está bloqueada
      if (user.status === 'locked') {
        if (user.locked_until && new Date() < new Date(user.locked_until)) {
          return { success: false, error: 'Conta temporariamente bloqueada' };
        } else {
          // Desbloquear conta
          await user.update({ status: 'active', login_attempts: 0, locked_until: null });
        }
      }

      // Verificar senha
      const isValidPassword = await crypto.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        // Incrementar tentativas de login
        const newAttempts = user.login_attempts + 1;
        let newStatus = user.status;
        let lockedUntil = null;

        if (newAttempts >= 5) {
          newStatus = 'locked';
          lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
        }

        await user.update({ 
          login_attempts: newAttempts, 
          status: newStatus, 
          locked_until: lockedUntil 
        });

        return { success: false, error: 'Credenciais inválidas' };
      }

      // Login bem-sucedido
      await user.update({ 
        last_login: new Date(), 
        login_attempts: 0, 
        locked_until: null 
      });

      logger.info('Usuário autenticado com sucesso', {
        user_id: user.id,
        tenant_id,
        email
      });

      return { success: true, user };
    } catch (error) {
      logger.error('Erro na autenticação', { error: error.message, email, tenant_id });
      throw error;
    }
  }

  // Atualizar usuário
  async update(updateData) {
    try {
      const allowedFields = [
        'name', 'role', 'status', 'password_hash', 'login_attempts', 
        'locked_until', 'last_login', 'preferences', 'mfa_enabled', 'mfa_secret'
      ];

      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        return;
      }

      updates.push(`updated_at = $${paramIndex}`);
      values.push(new Date());
      values.push(this.id, this.tenant_id);

      const result = await query(`
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
        RETURNING *
      `, values);

      if (result.rows.length > 0) {
        Object.assign(this, result.rows[0]);
      }

      logger.info('Usuário atualizado com sucesso', {
        user_id: this.id,
        tenant_id: this.tenant_id
      });
    } catch (error) {
      logger.error('Erro ao atualizar usuário', { error: error.message, user_id: this.id });
      throw error;
    }
  }

  // Alterar senha
  async changePassword(currentPassword, newPassword) {
    try {
      // Verificar senha atual
      const isValidPassword = await crypto.verifyPassword(currentPassword, this.password_hash);
      if (!isValidPassword) {
        throw new Error('Senha atual incorreta');
      }

      // Hash da nova senha
      const newPasswordHash = await crypto.hashPassword(newPassword);

      // Atualizar senha
      await this.update({ password_hash: newPasswordHash });

      logger.info('Senha alterada com sucesso', {
        user_id: this.id,
        tenant_id: this.tenant_id
      });
    } catch (error) {
      logger.error('Erro ao alterar senha', { error: error.message, user_id: this.id });
      throw error;
    }
  }

  // Reset de senha
  static async requestPasswordReset(tenant_id, email) {
    try {
      const user = await User.findByEmail(tenant_id, email);
      if (!user) {
        return { success: true }; // Não revelar se email existe
      }

      // Gerar token de reset
      const resetToken = crypto.generateRandomToken(32);
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await user.update({
        password_reset_token: resetToken,
        password_reset_expires: resetExpires
      });

      // TODO: Enviar email com token
      logger.info('Reset de senha solicitado', {
        user_id: user.id,
        tenant_id,
        email
      });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao solicitar reset de senha', { error: error.message, email, tenant_id });
      throw error;
    }
  }

  // Reset de senha com token
  static async resetPassword(tenant_id, resetToken, newPassword) {
    try {
      const result = await query(`
        SELECT * FROM users 
        WHERE tenant_id = $1 
        AND password_reset_token = $2 
        AND password_reset_expires > NOW()
        AND status != 'deleted'
      `, [tenant_id, resetToken]);

      if (result.rows.length === 0) {
        throw new Error('Token de reset inválido ou expirado');
      }

      const user = new User(result.rows[0]);

      // Hash da nova senha
      const newPasswordHash = await crypto.hashPassword(newPassword);

      // Atualizar senha e limpar token
      await user.update({
        password_hash: newPasswordHash,
        password_reset_token: null,
        password_reset_expires: null
      });

      logger.info('Senha resetada com sucesso', {
        user_id: user.id,
        tenant_id
      });

      return { success: true };
    } catch (error) {
      logger.error('Erro ao resetar senha', { error: error.message, tenant_id });
      throw error;
    }
  }

  // Deletar usuário (soft delete)
  async delete() {
    try {
      await this.update({ status: 'deleted' });

      logger.info('Usuário deletado com sucesso', {
        user_id: this.id,
        tenant_id: this.tenant_id
      });
    } catch (error) {
      logger.error('Erro ao deletar usuário', { error: error.message, user_id: this.id });
      throw error;
    }
  }

  // Verificar permissões
  hasPermission(permission) {
    const rolePermissions = {
      'admin': ['*'],
      'manager': ['read', 'write', 'delete'],
      'user': ['read', 'write'],
      'viewer': ['read']
    };

    const permissions = rolePermissions[this.role] || [];
    return permissions.includes('*') || permissions.includes(permission);
  }

  // Converter para JSON (sem dados sensíveis)
  toJSON() {
    const { password_hash, password_reset_token, password_reset_expires, mfa_secret, ...safeData } = this;
    return safeData;
  }
}

module.exports = User;
