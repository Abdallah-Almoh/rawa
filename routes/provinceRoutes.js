'use strict';

const express = require('express');
const router = express.Router();
const provinceController = require('../controllers/provinceController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../utils/roleChecker');

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post(
  '/',
  authMiddleware,
  checkRole(allowedRoles),
  provinceController.createProvince
);

router.put(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  provinceController.updateProvince
);

router.delete(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  provinceController.deleteProvince
);

router.get(
  '/',
  provinceController.getProvinces
);

router.get(
  '/:id',
  provinceController.getProvinceById
);

module.exports = router;
