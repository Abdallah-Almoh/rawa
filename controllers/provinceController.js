'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');

const createProvinceSchema = z.object({
  engName: z.string().min(2, "English name is required"),
  arName: z.string().min(2, "Arabic name is required"),
  countryId: z.number().int("Country ID must be an integer"),
});

const updateProvinceSchema = z.object({
  engName: z.string().min(2).optional(),
  arName: z.string().min(2).optional(),
  countryId: z.number().int().optional(),
});

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ message: err.message || "Internal server error" });
}

/**
 * @swagger
 * /provinces:
 *   post:
 *     summary: Create a new province
 *     tags: [Provinces]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can create a province. Duplicate names within the same country are not allowed.
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
 *               countryId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Province created successfully
 *       400:
 *         description: Validation errors
 *       409:
 *         description: Province already exists in this country
 *       500:
 *         description: Internal server error
 */
async function createProvince(req, res) {
  try {
    const validation = createProvinceSchema.safeParse(req.body);
    if (!validation.success)
      return res.status(400).json({ errors: validation.error.errors });

    const { engName, arName, countryId } = validation.data;

    // تحقق من التكرار داخل نفس الدولة
    const existing = await prisma.province.findFirst({
      where: { countryId, OR: [{ engName }, { arName }] },
    });
    if (existing)
      return res.status(409).json({ message: "Province already exists in this country" });

    const province = await prisma.province.create({
      data: { engName, arName, countryId },
      include: { country: true },
    });

    return res.status(201).json({ province });
  } catch (err) {
    return handleError(res, err);
  }
}


/**
 * @swagger
 * /provinces:
 *   get:
 *     summary: Get all provinces
 *     tags: [Provinces]
 *     responses:
 *       200:
 *         description: List of provinces with their country, mosques, and districts
 *       500:
 *         description: Internal server error
 */
async function getProvinces(req, res) {
  try {
    const provinces = await prisma.province.findMany({
      include: { country: true },
      orderBy: { id: "asc" },
    });
    return res.json({ provinces });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @swagger
 * /provinces/{id}:
 *   get:
 *     summary: Get a province by ID
 *     tags: [Provinces]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Province ID
 *     responses:
 *       200:
 *         description: Province found
 *       400:
 *         description: Invalid province ID
 *       404:
 *         description: Province not found
 *       500:
 *         description: Internal server error
 */


async function getProvinceById(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const province = await prisma.province.findUnique({
      where: { id },
      include: { country: true, mosques: true, districts: true },
    });
    if (!province) return res.status(404).json({ message: "Province not found" });

    return res.json({ province });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @swagger
 * /provinces/{id}:
 *   put:
 *     summary: Update a province
 *     tags: [Provinces]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can update a province. Duplicate names within the same country are not allowed.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Province ID
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
 *               countryId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Province updated successfully
 *       400:
 *         description: Invalid request or validation errors
 *       404:
 *         description: Province not found
 *       409:
 *         description: Province name already exists in this country
 *       500:
 *         description: Internal server error
 */

async function updateProvince(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const validation = updateProvinceSchema.safeParse(req.body);
    if (!validation.success)
      return res.status(400).json({ errors: validation.error.errors });

    const province = await prisma.province.findUnique({ where: { id } });
    if (!province) return res.status(404).json({ message: "Province not found" });

    if (validation.data.engName || validation.data.arName || validation.data.countryId) {
      const conflict = await prisma.province.findFirst({
        where: {
          countryId: validation.data.countryId ?? province.countryId,
          OR: [
            validation.data.engName ? { engName: validation.data.engName } : undefined,
            validation.data.arName ? { arName: validation.data.arName } : undefined,
          ].filter(Boolean),
          NOT: { id },
        },
      });
      if (conflict)
        return res.status(409).json({ message: "Province name already exists in this country" });
    }

    const updated = await prisma.province.update({
      where: { id },
      data: validation.data,
      include: { country: true },
    });

    return res.json({ province: updated });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @swagger
 * /provinces/{id}:
 *   delete:
 *     summary: Delete a province
 *     tags: [Provinces]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can delete a province.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Province ID
 *     responses:
 *       200:
 *         description: Province deleted successfully
 *       400:
 *         description: Invalid province ID
 *       404:
 *         description: Province not found
 *       500:
 *         description: Internal server error
 */
async function deleteProvince(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const province = await prisma.province.findUnique({ where: { id } });
    if (!province) return res.status(404).json({ message: "Province not found" });

    await prisma.province.delete({ where: { id } });
    return res.json({ message: "Province deleted successfully" });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  createProvince,
  getProvinces,
  getProvinceById,
  updateProvince,
  deleteProvince,
};
