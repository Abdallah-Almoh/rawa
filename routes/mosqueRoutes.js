'use strict';

const express = require('express');
const router = express.Router();
const mosqueController = require('../controllers/mosqueController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../utils/roleChecker');

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post(
  '/',
  authMiddleware,
  checkRole(allowedRoles),
  mosqueController.createMosque
);

router.put(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  mosqueController.updateMosque
);

router.delete(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  mosqueController.deleteMosque
);

router.get(
  '/',
  mosqueController.getMosques
);

router.get(
  '/:id',
  mosqueController.getMosqueById
);

module.exports = router;
