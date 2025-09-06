'use strict';

const router = require('express').Router();
const roleController = require('../controllers/roleController');
const authMiddleware = require('../middleware/auth');
const checkRole = require('../utils/roleChecker');

router.post(
  '/',
  authMiddleware,
  checkRole(['SUPER_ADMIN']),
  roleController.createRole
);

router.put(
  '/:id',
  authMiddleware,
  checkRole(['SUPER_ADMIN']),
  roleController.updateRole
);

router.delete(
  '/:id',
  authMiddleware,
  checkRole(['SUPER_ADMIN']),
  roleController.deleteRole
);

router.get('/', roleController.getRoles);

router.get('/:id', roleController.getRole);

module.exports = router;
