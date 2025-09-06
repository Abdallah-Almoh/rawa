'use strict';

const express = require('express');
const router = express.Router();
const factoryController = require('../controllers/factoryController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../utils/roleChecker');
const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post(
  '/',
  authMiddleware,
  checkRole(allowedRoles),
  factoryController.createFactory
);

router.put(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  factoryController.updateFactory
);

router.delete(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  factoryController.deleteFactory
);

router.get(
  '/',
  factoryController.getFactories
);

router.get(
  '/:id',
  factoryController.getFactoryById
);

module.exports = router;
