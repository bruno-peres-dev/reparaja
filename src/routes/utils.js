const express = require('express');
const VehicleController = require('../controllers/VehicleController');

const router = express.Router();

// POST /utils/code16 - Gerar código de 16 caracteres
router.post('/code16', VehicleController.generateCode16);

module.exports = router;
