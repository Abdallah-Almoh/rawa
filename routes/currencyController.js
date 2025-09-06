'use strict';

const express = require('express');
const router = express.Router();
const currencyController = require('../controllers/currencyController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../utils/roleChecker');

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post('/', authMiddleware, checkRole(allowedRoles), currencyController.createCurrency);
router.put('/:id', authMiddleware, checkRole(allowedRoles), currencyController.updateCurrency);
router.delete('/:id', authMiddleware, checkRole(allowedRoles), currencyController.deleteCurrency);

router.get('/', currencyController.getCurrencies);
router.get('/:id', currencyController.getCurrency);

module.exports = router;
