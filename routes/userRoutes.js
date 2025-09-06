'use strict';

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkRole = require('../utils/roleChecker');

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post(
  '/',
  authMiddleware,
  checkRole(allowedRoles),
  userController.createUser
);

router.put(
  '/:id',
  authMiddleware,
  userController.updateUser 
);

router.delete(
  '/:id',
  authMiddleware,
  userController.deleteUser 
);

router.get(
  '/',
  authMiddleware,
  checkRole(allowedRoles),
  userController.getUsers 
);

router.get(
  '/:id',
  authMiddleware,
  userController.getUser 
);

module.exports = router;
