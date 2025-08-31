const User = require('../models/User');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { query } = require('../config/database');

class AuthController {
  // Login de usuário
  static async login(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { email, password } = req.body;

      // Validar dados obrigatórios
      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Email e senha são obrigatórios'
          }
        });
      }

      // Autenticar usuário
      const authResult = await User.authenticate(tenant_id, email, password);
      
      if (!authResult.success) {
        return res.status(401).json({
          error: {
            code: 'invalid_credentials',
            message: authResult.error
          }
        });
      }

      const user = authResult.user;

      // Gerar JWT token
      const token = jwt.sign(
        {
          user_id: user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          role: user.role,
          scopes: AuthController.getUserScopes(user.role)
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Gerar refresh token
      const refreshToken = jwt.sign(
        {
          user_id: user.id,
          tenant_id: user.tenant_id,
          type: 'refresh'
        },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      // Salvar refresh token no banco
      await query(`
        INSERT INTO refresh_tokens (user_id, tenant_id, token, expires_at, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
        token = EXCLUDED.token,
        expires_at = EXCLUDED.expires_at,
        updated_at = NOW()
      `, [
        user.id,
        user.tenant_id,
        refreshToken,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
      ]);

      logger.info('Login realizado com sucesso', {
        user_id: user.id,
        tenant_id,
        email
      });

      res.json({
        access_token: token,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60, // 24 horas em segundos
        user: user.toJSON()
      });
    } catch (error) {
      logger.error('Erro no login', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno no login'
        }
      });
    }
  }

  // Refresh token
  static async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Refresh token é obrigatório'
          }
        });
      }

      // Verificar refresh token
      const decoded = jwt.verify(
        refresh_token,
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key'
      );

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          error: {
            code: 'invalid_token',
            message: 'Token inválido'
          }
        });
      }

      // Verificar se token existe no banco
      const tokenResult = await query(`
        SELECT * FROM refresh_tokens 
        WHERE user_id = $1 AND tenant_id = $2 AND token = $3 AND expires_at > NOW()
      `, [decoded.user_id, decoded.tenant_id, refresh_token]);

      if (tokenResult.rows.length === 0) {
        return res.status(401).json({
          error: {
            code: 'invalid_token',
            message: 'Refresh token inválido ou expirado'
          }
        });
      }

      // Buscar usuário
      const user = await User.findById(decoded.tenant_id, decoded.user_id);
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          error: {
            code: 'user_inactive',
            message: 'Usuário inativo ou não encontrado'
          }
        });
      }

      // Gerar novo access token
      const newToken = jwt.sign(
        {
          user_id: user.id,
          tenant_id: user.tenant_id,
          email: user.email,
          role: user.role,
          scopes: AuthController.getUserScopes(user.role)
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      logger.info('Token renovado com sucesso', {
        user_id: user.id,
        tenant_id: user.tenant_id
      });

      res.json({
        access_token: newToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60
      });
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: {
            code: 'invalid_token',
            message: 'Refresh token inválido'
          }
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: {
            code: 'token_expired',
            message: 'Refresh token expirado'
          }
        });
      }

      logger.error('Erro ao renovar token', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao renovar token'
        }
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      const { user_id, tenant_id } = req.user;

      // Invalidar refresh token
      await query(`
        DELETE FROM refresh_tokens 
        WHERE user_id = $1 AND tenant_id = $2
      `, [user_id, tenant_id]);

      logger.info('Logout realizado com sucesso', {
        user_id,
        tenant_id
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Erro no logout', { error: error.message, user_id: req.user?.user_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno no logout'
        }
      });
    }
  }

  // Logout de todos os dispositivos
  static async logoutAll(req, res) {
    try {
      const { user_id, tenant_id } = req.user;

      // Invalidar todos os refresh tokens do usuário
      await query(`
        DELETE FROM refresh_tokens 
        WHERE user_id = $1 AND tenant_id = $2
      `, [user_id, tenant_id]);

      logger.info('Logout de todos os dispositivos realizado', {
        user_id,
        tenant_id
      });

      res.status(204).send();
    } catch (error) {
      logger.error('Erro no logout de todos os dispositivos', { error: error.message, user_id: req.user?.user_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno no logout'
        }
      });
    }
  }

  // Alterar senha
  static async changePassword(req, res) {
    try {
      const { user_id, tenant_id } = req.user;
      const { current_password, new_password } = req.body;

      // Validar dados obrigatórios
      if (!current_password || !new_password) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Senha atual e nova senha são obrigatórias'
          }
        });
      }

      // Validar nova senha
      if (new_password.length < 8) {
        return res.status(400).json({
          error: {
            code: 'invalid_password',
            message: 'Nova senha deve ter pelo menos 8 caracteres'
          }
        });
      }

      // Buscar usuário
      const user = await User.findById(tenant_id, user_id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'user_not_found',
            message: 'Usuário não encontrado'
          }
        });
      }

      // Alterar senha
      await user.changePassword(current_password, new_password);

      // Invalidar todos os tokens (força novo login)
      await query(`
        DELETE FROM refresh_tokens 
        WHERE user_id = $1 AND tenant_id = $2
      `, [user_id, tenant_id]);

      logger.info('Senha alterada com sucesso', {
        user_id,
        tenant_id
      });

      res.json({
        message: 'Senha alterada com sucesso. Faça login novamente.'
      });
    } catch (error) {
      if (error.message === 'Senha atual incorreta') {
        return res.status(400).json({
          error: {
            code: 'invalid_current_password',
            message: 'Senha atual incorreta'
          }
        });
      }

      logger.error('Erro ao alterar senha', { error: error.message, user_id: req.user?.user_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao alterar senha'
        }
      });
    }
  }

  // Solicitar reset de senha
  static async requestPasswordReset(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Email é obrigatório'
          }
        });
      }

      // Solicitar reset
      await User.requestPasswordReset(tenant_id, email);

      logger.info('Reset de senha solicitado', {
        tenant_id,
        email
      });

      res.json({
        message: 'Se o email existir, você receberá instruções para resetar sua senha'
      });
    } catch (error) {
      logger.error('Erro ao solicitar reset de senha', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao solicitar reset de senha'
        }
      });
    }
  }

  // Reset de senha com token
  static async resetPassword(req, res) {
    try {
      const { tenant_id } = req.tenant;
      const { reset_token, new_password } = req.body;

      if (!reset_token || !new_password) {
        return res.status(400).json({
          error: {
            code: 'invalid_request',
            message: 'Token de reset e nova senha são obrigatórios'
          }
        });
      }

      // Validar nova senha
      if (new_password.length < 8) {
        return res.status(400).json({
          error: {
            code: 'invalid_password',
            message: 'Nova senha deve ter pelo menos 8 caracteres'
          }
        });
      }

      // Resetar senha
      await User.resetPassword(tenant_id, reset_token, new_password);

      logger.info('Senha resetada com sucesso', {
        tenant_id
      });

      res.json({
        message: 'Senha alterada com sucesso'
      });
    } catch (error) {
      if (error.message === 'Token de reset inválido ou expirado') {
        return res.status(400).json({
          error: {
            code: 'invalid_reset_token',
            message: 'Token de reset inválido ou expirado'
          }
        });
      }

      logger.error('Erro ao resetar senha', { error: error.message, tenant_id: req.tenant?.tenant_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao resetar senha'
        }
      });
    }
  }

  // Perfil do usuário
  static async getProfile(req, res) {
    try {
      const { user_id, tenant_id } = req.user;

      const user = await User.findById(tenant_id, user_id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'user_not_found',
            message: 'Usuário não encontrado'
          }
        });
      }

      res.json(user.toJSON());
    } catch (error) {
      logger.error('Erro ao buscar perfil', { error: error.message, user_id: req.user?.user_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao buscar perfil'
        }
      });
    }
  }

  // Atualizar perfil
  static async updateProfile(req, res) {
    try {
      const { user_id, tenant_id } = req.user;
      const { name, preferences } = req.body;

      // Buscar usuário
      const user = await User.findById(tenant_id, user_id);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'user_not_found',
            message: 'Usuário não encontrado'
          }
        });
      }

      // Atualizar perfil
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (preferences !== undefined) updateData.preferences = preferences;

      await user.update(updateData);

      logger.info('Perfil atualizado com sucesso', {
        user_id,
        tenant_id
      });

      res.json(user.toJSON());
    } catch (error) {
      logger.error('Erro ao atualizar perfil', { error: error.message, user_id: req.user?.user_id });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao atualizar perfil'
        }
      });
    }
  }

  // Verificar token
  static async verifyToken(req, res) {
    try {
      const { user_id, tenant_id, email, role, scopes } = req.user;

      res.json({
        valid: true,
        user: {
          user_id,
          tenant_id,
          email,
          role,
          scopes
        }
      });
    } catch (error) {
      logger.error('Erro ao verificar token', { error: error.message });
      res.status(500).json({
        error: {
          code: 'internal_error',
          message: 'Erro interno ao verificar token'
        }
      });
    }
  }

  // Mapear roles para scopes
  static getUserScopes(role) {
    const roleScopes = {
      'admin': ['*'],
      'manager': ['workshops', 'orders', 'vehicles', 'users', 'media', 'messages', 'webhooks', 'reports'],
      'user': ['workshops', 'orders', 'vehicles', 'media', 'messages'],
      'viewer': ['workshops', 'orders', 'vehicles', 'media', 'reports']
    };

    return roleScopes[role] || ['orders', 'vehicles'];
  }
}

module.exports = AuthController;
