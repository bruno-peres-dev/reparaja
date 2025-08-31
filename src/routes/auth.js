const express = require('express');
const AuthController = require('../controllers/AuthController');
const { authenticateJWT, validateTenantHeader, requireScope } = require('../middleware/auth');
const { tenantRateLimiter, createResourceRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/**
 * @swagger
 * /v1/auth/login:
 *   post:
 *     summary: Login de usuário
 *     description: Autentica um usuário e retorna JWT token
 *     tags: [Authentication]
 *     security:
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email do usuário
 *                 example: "usuario@empresa.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *                 example: "minhasenha123"
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: JWT token para acesso à API
 *                 refresh_token:
 *                   type: string
 *                   description: Token para renovar o access token
 *                 token_type:
 *                   type: string
 *                   example: "Bearer"
 *                 expires_in:
 *                   type: integer
 *                   description: Tempo de expiração em segundos
 *                   example: 86400
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', 
  validateTenantHeader,
  createResourceRateLimiter,
  AuthController.login
);

/**
 * @swagger
 * /v1/auth/refresh:
 *   post:
 *     summary: Renovar token de acesso
 *     description: Renova o access token usando o refresh token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refresh_token
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 description: Refresh token válido
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: Novo JWT token
 *                 token_type:
 *                   type: string
 *                   example: "Bearer"
 *                 expires_in:
 *                   type: integer
 *                   description: Tempo de expiração em segundos
 *                   example: 86400
 *       400:
 *         description: Refresh token obrigatório
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Refresh token inválido ou expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', 
  tenantRateLimiter,
  AuthController.refreshToken
);

/**
 * @swagger
 * /v1/auth/logout:
 *   post:
 *     summary: Logout do usuário
 *     description: Invalida o refresh token do usuário atual
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     responses:
 *       204:
 *         description: Logout realizado com sucesso
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', 
  authenticateJWT,
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.logout
);

/**
 * @swagger
 * /v1/auth/logout-all:
 *   post:
 *     summary: Logout de todos os dispositivos
 *     description: Invalida todos os refresh tokens do usuário
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     responses:
 *       204:
 *         description: Logout de todos os dispositivos realizado
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout-all', 
  authenticateJWT,
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.logoutAll
);

/**
 * @swagger
 * /v1/auth/change-password:
 *   post:
 *     summary: Alterar senha
 *     description: Altera a senha do usuário atual
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 format: password
 *                 description: Senha atual
 *                 example: "minhasenha123"
 *               new_password:
 *                 type: string
 *                 format: password
 *                 description: Nova senha (mínimo 8 caracteres)
 *                 example: "minhanovasenha456"
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Senha alterada com sucesso. Faça login novamente."
 *       400:
 *         description: Dados inválidos ou senha atual incorreta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/change-password', 
  authenticateJWT,
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.changePassword
);

/**
 * @swagger
 * /v1/auth/request-password-reset:
 *   post:
 *     summary: Solicitar reset de senha
 *     description: Solicita o reset de senha para um email
 *     tags: [Authentication]
 *     security:
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email para reset de senha
 *                 example: "usuario@empresa.com"
 *     responses:
 *       200:
 *         description: Reset solicitado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Se o email existir, você receberá instruções para resetar sua senha"
 *       400:
 *         description: Email obrigatório
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/request-password-reset', 
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.requestPasswordReset
);

/**
 * @swagger
 * /v1/auth/reset-password:
 *   post:
 *     summary: Reset de senha
 *     description: Reseta a senha usando token de reset
 *     tags: [Authentication]
 *     security:
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reset_token
 *               - new_password
 *             properties:
 *               reset_token:
 *                 type: string
 *                 description: Token de reset recebido por email
 *                 example: "abc123def456..."
 *               new_password:
 *                 type: string
 *                 format: password
 *                 description: Nova senha (mínimo 8 caracteres)
 *                 example: "minhanovasenha456"
 *     responses:
 *       200:
 *         description: Senha resetada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Senha alterada com sucesso"
 *       400:
 *         description: Dados inválidos ou token expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', 
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.resetPassword
);

/**
 * @swagger
 * /v1/auth/profile:
 *   get:
 *     summary: Obter perfil do usuário
 *     description: Retorna o perfil do usuário autenticado
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     responses:
 *       200:
 *         description: Perfil do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', 
  authenticateJWT,
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.getProfile
);

/**
 * @swagger
 * /v1/auth/profile:
 *   patch:
 *     summary: Atualizar perfil do usuário
 *     description: Atualiza o perfil do usuário autenticado
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Novo nome do usuário
 *                 example: "João Silva"
 *               preferences:
 *                 type: object
 *                 description: Preferências do usuário
 *                 example: {"theme": "dark", "notifications": true}
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuário não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/profile', 
  authenticateJWT,
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.updateProfile
);

/**
 * @swagger
 * /v1/auth/verify:
 *   get:
 *     summary: Verificar token
 *     description: Verifica se o token JWT é válido
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     responses:
 *       200:
 *         description: Token válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     user_id:
 *                       type: string
 *                       format: uuid
 *                     tenant_id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     scopes:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Token inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/verify', 
  authenticateJWT,
  validateTenantHeader,
  tenantRateLimiter,
  AuthController.verifyToken
);

module.exports = router;
