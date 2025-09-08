'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const checkRole = require('../utils/roleChecker');

const createMosqueSchema = z.object({
  engName: z.string().min(2, 'English name must be at least 2 characters'),
  arName: z.string().min(2, 'Arabic name must be at least 2 characters'),
  engServName: z.string().min(2, 'English service name required'),
  arServName: z.string().min(2, 'Arabic service name required'),
  phone: z.string().min(7, 'Phone must be at least 7 characters'),
  address: z.string().optional(),
  countryId: z.number().int().optional(),
  provinceId: z.number().int().optional(),
  districtId: z.number().int().optional(),
});

const updateMosqueSchema = z.object({
  engName: z.string().min(2).optional(),
  arName: z.string().min(2).optional(),
  engServName: z.string().min(2).optional(),
  arServName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  address: z.string().optional(),
  countryId: z.number().int().optional(),
  provinceId: z.number().int().optional(),
  districtId: z.number().int().optional(),
});

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

/**
 * @swagger
 * /mosques:
 *   post:
 *     summary: Create a new mosque
 *     tags: [Mosques]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only logged-in users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can create a new mosque. All required fields must be provided.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               engName:
 *                 type: string
 *               arName:
 *                 type: string
 *               engServName:
 *                 type: string
 *               arServName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               countryId:
 *                 type: integer
 *               provinceId:
 *                 type: integer
 *               districtId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Mosque created successfully
 *       400:
 *         description: Validation errors
 *       409:
 *         description: Mosque already exists in this district
 *       500:
 *         description: Internal server error
 */

async function createMosque(req, res) {
  try {
    const validation = createMosqueSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const data = validation.data;

    const existing = await prisma.mosque.findFirst({
      where: {
        OR: [
          { engName: data.engName },
          { arName: data.arName }
        ],
        AND: [
          data.districtId ? { districtId: data.districtId } : {},
        ]
      }
    });
    if (existing) return res.status(409).json({ message: 'Mosque already exists in this district' });

    const mosque = await prisma.mosque.create({ data });

    return res.status(201).json({ mosque });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /mosques:
 *   get:
 *     summary: Get all mosques
 *     tags: [Mosques]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Retrieve a list of all mosques.
 *     responses:
 *       200:
 *         description: List of mosques
 *       500:
 *         description: Internal server error
 */

async function getMosques(req, res) {
  try {
    const mosques = await prisma.mosque.findMany({
      orderBy: { engName: 'asc' },
    });
    return res.json({ mosques });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /mosques/{id}:
 *   get:
 *     summary: Get mosque by ID
 *     tags: [Mosques]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Retrieve a mosque by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mosque ID
 *     responses:
 *       200:
 *         description: Mosque found
 *       400:
 *         description: Invalid mosque ID
 *       404:
 *         description: Mosque not found
 *       500:
 *         description: Internal server error
 */

async function getMosqueById(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid mosque ID' });

    const mosque = await prisma.mosque.findUnique({ where: { id } });
    if (!mosque) return res.status(404).json({ message: 'Mosque not found' });

    return res.json({ mosque });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /mosques/{id}:
 *   put:
 *     summary: Update a mosque
 *     tags: [Mosques]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only logged-in users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can update mosque details. Fields are optional.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mosque ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               engName:
 *                 type: string
 *               arName:
 *                 type: string
 *               engServName:
 *                 type: string
 *               arServName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               countryId:
 *                 type: integer
 *               provinceId:
 *                 type: integer
 *               districtId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Mosque updated successfully
 *       400:
 *         description: Invalid request / Validation errors
 *       404:
 *         description: Mosque not found
 *       409:
 *         description: Mosque name conflict
 *       500:
 *         description: Internal server error
 */

async function updateMosque(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid mosque ID' });

    const validation = updateMosqueSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const mosque = await prisma.mosque.findUnique({ where: { id } });
    if (!mosque) return res.status(404).json({ message: 'Mosque not found' });

    if (validation.data.engName || validation.data.arName) {
      const conflict = await prisma.mosque.findFirst({
        where: {
          OR: [
            validation.data.engName ? { engName: validation.data.engName } : undefined,
            validation.data.arName ? { arName: validation.data.arName } : undefined,
          ].filter(Boolean),
          NOT: { id }
        }
      });
      if (conflict) return res.status(409).json({ message: 'Mosque name already exists' });
    }

    const updatedMosque = await prisma.mosque.update({
      where: { id },
      data: { ...validation.data },
    });

    return res.json({ mosque: updatedMosque });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /mosques/{id}:
 *   delete:
 *     summary: Delete a mosque
 *     tags: [Mosques]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only logged-in users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can delete a mosque by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mosque ID
 *     responses:
 *       200:
 *         description: Mosque deleted successfully
 *       400:
 *         description: Invalid mosque ID
 *       404:
 *         description: Mosque not found
 *       500:
 *         description: Internal server error
 */

async function deleteMosque(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid mosque ID' });

    const mosque = await prisma.mosque.findUnique({ where: { id } });
    if (!mosque) return res.status(404).json({ message: 'Mosque not found' });

    await prisma.mosque.delete({ where: { id } });
    return res.json({ message: 'Mosque deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  createMosque,
  getMosques,
  getMosqueById,
  updateMosque,
  deleteMosque,
};
