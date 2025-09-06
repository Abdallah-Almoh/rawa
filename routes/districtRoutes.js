'use strict';

const express = require('express');
const router = express.Router();
const districtController = require('../controllers/districtController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../utils/roleChecker');

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post(
  '/',
  authMiddleware,
  checkRole(allowedRoles),
  districtController.createDistrict
);

router.put(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  districtController.updateDistrict
);

router.delete(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  districtController.deleteDistrict
);

router.get(
  '/',
  districtController.getDistricts
);

router.get(
  '/:id',
  districtController.getDistrictById
);

module.exports = router;
