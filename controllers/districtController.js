'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const checkRole = require('../utils/roleChecker');

const createDistrictSchema = z.object({
  engName: z.string().min(2, 'English name must be at least 2 characters'),
  arName: z.string().min(2, 'Arabic name must be at least 2 characters'),
  provinceId: z.number().int(),
});

const updateDistrictSchema = z.object({
  engName: z.string().min(2).optional(),
  arName: z.string().min(2).optional(),
  provinceId: z.number().int().optional(),
});

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

/**
 * @swagger
 * /districts:
 *   post:
 *     summary: Create a new district
 *     tags: [Districts]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can create a district.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - engName
 *               - arName
 *               - provinceId
 *             properties:
 *               engName:
 *                 type: string
 *               arName:
 *                 type: string
 *               provinceId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: District created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: District already exists in this province
 *       500:
 *         description: Internal server error
 */

async function createDistrict(req, res) {
  try {
    const validation = createDistrictSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const { engName, arName, provinceId } = validation.data;

    const existing = await prisma.district.findFirst({
      where: { provinceId, OR: [{ engName }, { arName }] },
    });
    if (existing)
      return res.status(409).json({ message: "District already exists in this province" });

    const district = await prisma.district.create({
      data: { engName, arName, provinceId },
      include: { province: true },
    });

    return res.status(201).json({ district });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /districts:
 *   get:
 *     summary: Get all districts
 *     tags: [Districts]
 *     description: Retrieve a list of all districts with their province.
 *     responses:
 *       200:
 *         description: List of districts
 *       500:
 *         description: Internal server error
 */

async function getDistricts(req, res) {
  try {
    const districts = await prisma.district.findMany({
      include: { province: true },
      orderBy: { engName: 'asc' },
    });
    return res.json({ districts });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /districts/{id}:
 *   get:
 *     summary: Get district by ID
 *     tags: [Districts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: District ID
 *     responses:
 *       200:
 *         description: District found
 *       400:
 *         description: Invalid district ID
 *       404:
 *         description: District not found
 *       500:
 *         description: Internal server error
 */

async function getDistrictById(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid district ID' });

    const district = await prisma.district.findUnique({
      where: { id },
      include: { province: true },
    });
    if (!district) return res.status(404).json({ message: 'District not found' });

    return res.json({ district });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /districts/{id}:
 *   put:
 *     summary: Update a district
 *     tags: [Districts]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can update a district.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: District ID
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
 *               provinceId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: District updated successfully
 *       400:
 *         description: Validation error / Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: District not found
 *       409:
 *         description: District name conflict in the same province
 *       500:
 *         description: Internal server error
 */

async function updateDistrict(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid district ID' });

    const validation = updateDistrictSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const district = await prisma.district.findUnique({ where: { id } });
    if (!district) return res.status(404).json({ message: 'District not found' });

    if (validation.data.engName || validation.data.arName) {
      const conflict = await prisma.district.findFirst({
        where: {
          OR: [
            validation.data.engName ? { engName: validation.data.engName } : undefined,
            validation.data.arName ? { arName: validation.data.arName } : undefined,
          ].filter(Boolean),
          NOT: { id },
          provinceId: validation.data.provinceId || district.provinceId,
        },
      });
      if (conflict) return res.status(409).json({ message: 'District English or Arabic name already exists in this province' });
    }

    const updatedDistrict = await prisma.district.update({
      where: { id },
      data: { ...validation.data },
      include: { province: true },
    });

    return res.json({ district: updatedDistrict });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /districts/{id}:
 *   delete:
 *     summary: Delete a district
 *     tags: [Districts]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can delete a district.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: District ID
 *     responses:
 *       200:
 *         description: District deleted successfully
 *       400:
 *         description: Invalid district ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: District not found
 *       500:
 *         description: Internal server error
 */

async function deleteDistrict(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid district ID' });

    const district = await prisma.district.findUnique({ where: { id } });
    if (!district) return res.status(404).json({ message: 'District not found' });

    await prisma.district.delete({ where: { id } });
    return res.json({ message: 'District deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  createDistrict,
  getDistricts,
  getDistrictById,
  updateDistrict,
  deleteDistrict,
};
