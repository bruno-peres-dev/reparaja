const express = require('express');
const VehicleController = require('../controllers/VehicleController');
const { authenticateJWT, validateTenantHeader, requireScope, checkPlanLimits } = require('../middleware/auth');
const { tenantRateLimiter, createResourceRateLimiter, checkIdempotency } = require('../middleware/rateLimit');

const router = express.Router();

// Middleware de autenticação para todas as rotas
router.use(authenticateJWT);
router.use(validateTenantHeader);
router.use(requireScope(['vehicles']));

/**
 * @swagger
 * /v1/vehicles:
 *   post:
 *     summary: Criar um novo veículo
 *     description: Cria um novo veículo para o tenant autenticado
 *     tags: [Vehicles]
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
 *               - brand
 *               - model
 *               - year
 *               - license_plate
 *             properties:
 *               brand:
 *                 type: string
 *                 description: Marca do veículo
 *                 example: "Toyota"
 *               model:
 *                 type: string
 *                 description: Modelo do veículo
 *                 example: "Corolla"
 *               year:
 *                 type: integer
 *                 minimum: 1900
 *                 maximum: 2030
 *                 description: Ano do veículo
 *                 example: 2022
 *               color:
 *                 type: string
 *                 description: Cor do veículo
 *                 example: "Prata"
 *               license_plate:
 *                 type: string
 *                 description: Placa do veículo
 *                 example: "ABC1234"
 *               vin:
 *                 type: string
 *                 description: Número do chassi (VIN)
 *                 example: "1HGBH41JXMN109186"
 *               engine:
 *                 type: string
 *                 description: Motor do veículo
 *                 example: "2.0L 4-Cylinder"
 *               fuel_type:
 *                 type: string
 *                 enum: [gasolina, etanol, flex, diesel, elétrico, híbrido]
 *                 description: Tipo de combustível
 *                 example: "flex"
 *               transmission:
 *                 type: string
 *                 enum: [manual, automático, cvt]
 *                 description: Tipo de transmissão
 *                 example: "automático"
 *               mileage:
 *                 type: integer
 *                 minimum: 0
 *                 description: Quilometragem atual
 *                 example: 50000
 *               owner_name:
 *                 type: string
 *                 description: Nome do proprietário
 *                 example: "João Silva"
 *               owner_phone:
 *                 type: string
 *                 description: Telefone do proprietário
 *                 example: "+5511999999999"
 *               owner_email:
 *                 type: string
 *                 format: email
 *                 description: Email do proprietário
 *                 example: "joao@email.com"
 *               notes:
 *                 type: string
 *                 description: Observações sobre o veículo
 *                 example: "Veículo com histórico de manutenção regular"
 *     responses:
 *       201:
 *         description: Veículo criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
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
 *       429:
 *         description: Limite de taxa excedido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', 
  createResourceRateLimiter,
  checkPlanLimits,
  checkIdempotency,
  VehicleController.create
);

/**
 * @swagger
 * /v1/vehicles:
 *   get:
 *     summary: Listar veículos
 *     description: Lista todos os veículos do tenant autenticado
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Número de itens por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Termo de busca (marca, modelo, placa)
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filtrar por marca
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Filtrar por ano
 *     responses:
 *       200:
 *         description: Lista de veículos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vehicle'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Não autorizado
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
router.get('/', 
  tenantRateLimiter,
  VehicleController.list
);

/**
 * @swagger
 * /v1/vehicles/{vehicleId}:
 *   get:
 *     summary: Buscar veículo por ID
 *     description: Retorna os detalhes de um veículo específico
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do veículo
 *     responses:
 *       200:
 *         description: Detalhes do veículo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Veículo não encontrado
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
router.get('/:vehicleId', 
  tenantRateLimiter,
  VehicleController.getById
);

/**
 * @swagger
 * /v1/vehicles/{vehicleId}:
 *   patch:
 *     summary: Atualizar veículo
 *     description: Atualiza os dados de um veículo existente
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do veículo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               brand:
 *                 type: string
 *                 description: Marca do veículo
 *               model:
 *                 type: string
 *                 description: Modelo do veículo
 *               year:
 *                 type: integer
 *                 minimum: 1900
 *                 maximum: 2030
 *                 description: Ano do veículo
 *               color:
 *                 type: string
 *                 description: Cor do veículo
 *               license_plate:
 *                 type: string
 *                 description: Placa do veículo
 *               vin:
 *                 type: string
 *                 description: Número do chassi (VIN)
 *               engine:
 *                 type: string
 *                 description: Motor do veículo
 *               fuel_type:
 *                 type: string
 *                 enum: [gasolina, etanol, flex, diesel, elétrico, híbrido]
 *                 description: Tipo de combustível
 *               transmission:
 *                 type: string
 *                 enum: [manual, automático, cvt]
 *                 description: Tipo de transmissão
 *               mileage:
 *                 type: integer
 *                 minimum: 0
 *                 description: Quilometragem atual
 *               owner_name:
 *                 type: string
 *                 description: Nome do proprietário
 *               owner_phone:
 *                 type: string
 *                 description: Telefone do proprietário
 *               owner_email:
 *                 type: string
 *                 format: email
 *                 description: Email do proprietário
 *               notes:
 *                 type: string
 *                 description: Observações sobre o veículo
 *     responses:
 *       200:
 *         description: Veículo atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
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
 *         description: Veículo não encontrado
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
router.patch('/:vehicleId', 
  tenantRateLimiter,
  checkIdempotency,
  VehicleController.update
);

/**
 * @swagger
 * /v1/vehicles/{vehicleId}:
 *   delete:
 *     summary: Remover veículo
 *     description: Remove um veículo do sistema
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único do veículo
 *     responses:
 *       204:
 *         description: Veículo removido com sucesso
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Veículo não encontrado
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
router.delete('/:vehicleId', 
  tenantRateLimiter,
  VehicleController.delete
);

/**
 * @swagger
 * /v1/vehicles/code/{code16}:
 *   get:
 *     summary: Buscar veículo por código de 16 caracteres
 *     description: Retorna os detalhes de um veículo usando seu código de 16 caracteres
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *       - tenantHeader: []
 *     parameters:
 *       - in: path
 *         name: code16
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 16
 *           minLength: 16
 *         description: Código de 16 caracteres do veículo
 *     responses:
 *       200:
 *         description: Detalhes do veículo
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       401:
 *         description: Não autorizado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Veículo não encontrado
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
router.get('/code/:code16', 
  tenantRateLimiter,
  VehicleController.getByCode16
);

module.exports = router;
