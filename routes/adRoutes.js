'use strict';

const router = require('express').Router();
const adController = require('../controllers/adController');

const auth = require('../middleware/auth'); 
const checkRole = require('../utils/roleChecker');

const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'];

router.post(
    '/',
    auth,
    checkRole(allowedRoles),
    adController.uploadAdPhoto,
    adController.createAd);

router.get(
    '/',
    auth,
    checkRole(allowedRoles),
    adController.getAds
          );

router.get(
    '/:id',
    auth,
    checkRole(allowedRoles),
    adController.getAdById
          );


router.put(
    '/:id',
    auth,
    checkRole(allowedRoles),
    adController.uploadAdPhoto,
    adController.updateAd
          );

router.delete(
    '/:id',
    auth,
    checkRole(allowedRoles),
     adController.deleteAd
             );

router.patch(
    '/:id/show',
    auth,
    checkRole(allowedRoles),
     adController.showAd
            );

router.patch(
    '/:id/hide',
    auth,
    checkRole(allowedRoles),
    adController.hideAd);

router.get('/active/showing', adController.getShownAds);

module.exports = router;
