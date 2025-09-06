'use strict';

const router = require('express').Router();
const productController = require('../controllers/productController');
const auth = require('../middleware/auth'); 
const checkRole = require('../utils/roleChecker');

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];


router.post(
  '/',
  auth,
  checkRole(allowedRoles), 
  productController.uploadMultiplePhotos,
  productController.createProduct
);

router.get('/', auth, productController.getProducts);

router.get('/:id', auth, productController.getProductById);

router.put(
  '/:id',
  auth,
  checkRole(allowedRoles),
    productController.uploadMultiplePhotos,
  productController.updateProduct
);

router.delete(
  '/:id',
  auth,
  checkRole(allowedRoles),
  productController.deleteProduct
);

module.exports = router;
