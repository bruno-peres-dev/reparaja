const express = require('express');
const VehicleController = require('../controllers/VehicleController');

const router = express.Router();

/**
 * @swagger
 * /v1/utils/code16:
 *   post:
 *     summary: Gerar código de 16 caracteres
 *     description: Gera um código único de 16 caracteres para identificação de veículos
 *     tags: [Utils]
 *     responses:
 *       200:
 *         description: Código gerado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code16:
 *                   type: string
 *                   maxLength: 16
 *                   minLength: 16
 *                   description: Código único de 16 caracteres
 *                   example: "ABC123DEF456GHIJ"
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/code16', VehicleController.generateCode16);

module.exports = router;
