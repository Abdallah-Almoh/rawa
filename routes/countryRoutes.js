'use strict';

const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const checkRole = require('../utils/roleChecker');
const authMiddleware = require('../middleware/auth'); 

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post(
  '/',
  authMiddleware,
  checkRole(allowedRoles),
  countryController.createCountry
);

router.put(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  countryController.updateCountry
);

router.delete(
  '/:id',
  authMiddleware,
  checkRole(allowedRoles),
  countryController.deleteCountry
);

router.get(
  '/',
  countryController.getCountries
);

router.get(
  '/:id',
  countryController.getCountry
);

module.exports = router;
