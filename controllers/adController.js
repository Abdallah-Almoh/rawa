'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/ad'); 
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}-${Date.now()}${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new Error('الملف ليس صورة! يرجى رفع صورة فقط.'), false);
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });
const uploadAdPhoto = upload.single('photo'); 

// Cloudinary code
// const cloudinary = require('cloudinary').v2;
// cloudinary.config({
//   cloud_name: 'YOUR_CLOUD_NAME',
//   api_key: 'YOUR_API_KEY',
//   api_secret: 'YOUR_API_SECRET',
// });

// async function uploadToCloudinary(filePath) {
//   const result = await cloudinary.uploader.upload(filePath, { folder: 'ads' });
//   return {
//     fileName: path.basename(filePath),
//     fileType: 'image',
//     fileSize: 0,
//     fileUrl: result.secure_url,
//   };
// }


/**
 * @swagger
 * /rawa/ads:
 *   post:
 *     summary: Create a new advertisement
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only logged-in users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can create a new ad. Upload one image (required). The expiration
 *       date is optional; defaults to 7 days if not provided.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Advertisement created successfully
 *       400:
 *         description: Missing photo or invalid request
 *       401:
 *         description: Unauthorized – user not logged in
 *       403:
 *         description: Forbidden – user does not have required role
 *       500:
 *         description: Internal server error
 */

async function createAd(req, res) {
  try {
    const { title, expiresAt } = req.body;
    if (!req.file) return res.status(400).json({ message: 'يرجى رفع صورة للإعلان' });

    const expireDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const fileData = {
      fileName: req.file.filename,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileUrl: `/uploads/ad/${req.file.filename}`,
    };

    // Cloudinary alternative 
    // const fileData = await uploadToCloudinary(req.file.path);

    const ad = await prisma.ad.create({
      data: {
        title,
        expiresAt: expireDate,
        inShow: false, 
        files: { create: fileData },
      },
      include: { files: true },
    });

    return res.status(201).json({ ad });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}


/**
 * @swagger
 * /rawa/ads/{id}/show:
 *   patch:
 *     summary: Show an ad
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, DATA_ENTRY can make an ad visible.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Advertisement ID
 *     responses:
 *       200:
 *         description: Ad is now visible
 *       404:
 *         description: Ad not found
 *       500:
 *         description: Internal server error
 */
async function showAd(req, res) {
  try {
    const id = Number(req.params.id);
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) return res.status(404).json({ message: 'Ad not found' });

    const updatedAd = await prisma.ad.update({
      where: { id },
      data: { inShow: true },
    });

    return res.json({ ad: updatedAd });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
/**
 * @swagger
 * /rawa/ads/{id}/hide:
 *   patch:
 *     summary: Hide ad manually
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, DATA_ENTRY can hide an ad.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ad ID
 *     responses:
 *       200:
 *         description: Ad is now hidden
 *       404:
 *         description: Ad not found
 *       500:
 *         description: Internal server error
 */


async function hideAd(req, res) {
  try {
    const id = Number(req.params.id);
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) return res.status(404).json({ message: 'Ad not found' });

    const updatedAd = await prisma.ad.update({
      where: { id },
      data: { inShow: false },
    });

    return res.json({ ad: updatedAd });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * @swagger
 * /rawa/ads/active/showing:
 *   get:
 *     summary: Get all currently active & visible ads
 *     tags: [Ads]
 *     description: Returns ads with inShow = true and not expired. Expired ads will be hidden automatically.
 *     responses:
 *       200:
 *         description: List of visible ads
 *       500:
 *         description: Internal server error
 */

async function getShownAds(req, res) {
  try {
    const now = new Date();
    //hide expire date ads
    await prisma.ad.updateMany({
      where: { inShow: true, expiresAt: { lte: now } },
      data: { inShow: false },
    });

    const ads = await prisma.ad.findMany({
      where: { inShow: true, expiresAt: { gt: now } },
      include: { files: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ ads });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * @swagger
 * /rawa/ads:
 *   get:
 *     summary: Get all ads
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all ads. Only authorized 'SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY' can access.
 *     responses:
 *       200:
 *         description: List of ads
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */

async function getAds(req, res) {
  try {
    const ads = await prisma.ad.findMany({ include: { files: true }, orderBy: { createdAt: 'desc' } });
    return res.json({ ads });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
/**
 * @swagger
 * /rawa/ads/{id}:
 *   get:
 *     summary: Get ad by ID
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all ads. Only authorized 'SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY' can access.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Ad ID
 *     responses:
 *       200:
 *         description: Ad found
 *       404:
 *         description: Ad not found
 *       500:
 *         description: Internal server error
 */

async function getAdById(req, res) {
  try {
    const id = Number(req.params.id);
    const ad = await prisma.ad.findUnique({ where: { id }, include: { files: true } });
    if (!ad) return res.status(404).json({ message: 'Ad not found' });
    return res.json({ ad });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

/**
 * @swagger
 * /rawa/ads/{id}:
 *   put:
 *     summary: Update an existing ad
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all ads. Only authorized 'SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY' can access.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Ad ID
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               inShow:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Ad updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ad not found
 *       500:
 *         description: Internal server error
 */

async function updateAd(req, res) {
  try {
    const id = Number(req.params.id);
    const { title, expiresAt, inShow } = req.body;

    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) return res.status(404).json({ message: 'Ad not found' });

    const updatedAd = await prisma.ad.update({
      where: { id },
      data: {
        title,
        expiresAt: expiresAt ? new Date(expiresAt) : ad.expiresAt,
        inShow: inShow !== undefined ? inShow : ad.inShow,
      },
      include: { files: true },
    });

    return res.json({ ad: updatedAd });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
/**
 * @swagger
 * /rawa/ads/{id}:
 *   delete:
 *     summary: Delete an ad
 *     tags: [Ads]
 *     security:
 *       - bearerAuth: []
 *     description: Retrieve all ads. Only authorized 'SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY' can access.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Ad ID
 *     responses:
 *       200:
 *         description: Ad deleted successfully
 *       404:
 *         description: Ad not found
 *       500:
 *         description: Internal server error
 */

async function deleteAd(req, res) {
  try {
    const id = Number(req.params.id);
    const ad = await prisma.ad.findUnique({ where: { id } });
    if (!ad) return res.status(404).json({ message: 'Ad not found' });

    await prisma.ad.delete({ where: { id } });
    return res.json({ message: 'Ad deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
function scheduleAdExpirationJob() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const now = new Date();
      await prisma.ad.updateMany({
        where: {
          inShow: true,
          expiresAt: { lte: now }
        },
        data: { inShow: false }
      });
      console.log('⏰ Ads updated: expired ads hidden successfully.');
    } catch (err) {
      console.error('❌ Error updating ads:', err);
    }
  });
}   
module.exports = {
  createAd,
  getAds,
  getAdById,
  updateAd,
  showAd,
  hideAd,
  getShownAds,
  deleteAd,
  uploadAdPhoto,
  scheduleAdExpirationJob,
};
