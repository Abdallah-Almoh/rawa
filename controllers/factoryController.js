'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const checkRole = require('../utils/roleChecker');

const createFactorySchema = z.object({
  engName: z.string().min(2, 'English name must be at least 2 characters'),
  arName: z.string().min(2, 'Arabic name must be at least 2 characters'),
  phone: z.string().min(7, 'Phone must be at least 7 characters'),
  email: z.string().email(),
  address: z.string().optional(),
  countryId: z.number().int().optional(),
});

const updateFactorySchema = z.object({
  engName: z.string().min(2).optional(),
  arName: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  countryId: z.number().int().optional(),
});

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

/**
 * @swagger
 * /factories:
 *   post:
 *     summary: Create a new factory
 *     tags: [Factories]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can create a factory.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - engName
 *               - arName
 *               - phone
 *               - email
 *             properties:
 *               engName:
 *                 type: string
 *               arName:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               countryId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Factory created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */

// Create Factory
async function createFactory(req, res) {
  try {
    const validation = createFactorySchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const { engName, arName, phone, email, address, countryId } = validation.data;

    // Check if factory with same email exists
    const existing = await prisma.factory.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: 'Email already exists' });

    const factory = await prisma.factory.create({
      data: { engName, arName, phone, email, address, countryId },
    });

    return res.status(201).json({ factory });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /factories:
 *   get:
 *     summary: Get all factories
 *     tags: [Factories]
 *     description: Retrieve a list of all factories.
 *     responses:
 *       200:
 *         description: List of factories
 *       500:
 *         description: Internal server error
 */

// Get all factories
async function getFactories(req, res) {
  try {
    const factories = await prisma.factory.findMany({
      orderBy: { engName: 'asc' },
    });
    return res.json({ factories });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /factories/{id}:
 *   get:
 *     summary: Get factory by ID
 *     tags: [Factories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Factory ID
 *     responses:
 *       200:
 *         description: Factory found
 *       400:
 *         description: Invalid factory ID
 *       404:
 *         description: Factory not found
 *       500:
 *         description: Internal server error
 */

async function getFactoryById(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid factory ID' });

    const factory = await prisma.factory.findUnique({ where: { id } });
    if (!factory) return res.status(404).json({ message: 'Factory not found' });

    return res.json({ factory });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /factories/{id}:
 *   put:
 *     summary: Update a factory
 *     tags: [Factories]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can update a factory.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Factory ID
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
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               countryId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Factory updated successfully
 *       400:
 *         description: Validation error / Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Factory not found
 *       409:
 *         description: Email already exists
 *       500:
 *         description: Internal server error
 */

async function updateFactory(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid factory ID' });

    const validation = updateFactorySchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const factory = await prisma.factory.findUnique({ where: { id } });
    if (!factory) return res.status(404).json({ message: 'Factory not found' });

    if (validation.data.email && validation.data.email !== factory.email) {
      const conflict = await prisma.factory.findUnique({ where: { email: validation.data.email } });
      if (conflict) return res.status(409).json({ message: 'Email already exists' });
    }

    const updatedFactory = await prisma.factory.update({
      where: { id },
      data: { ...validation.data },
    });

    return res.json({ factory: updatedFactory });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /factories/{id}:
 *   delete:
 *     summary: Delete a factory
 *     tags: [Factories]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can delete a factory.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Factory ID
 *     responses:
 *       200:
 *         description: Factory deleted successfully
 *       400:
 *         description: Invalid factory ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Factory not found
 *       500:
 *         description: Internal server error
 */

async function deleteFactory(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid factory ID' });

    const factory = await prisma.factory.findUnique({ where: { id } });
    if (!factory) return res.status(404).json({ message: 'Factory not found' });

    await prisma.factory.delete({ where: { id } });
    return res.json({ message: 'Factory deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  createFactory,
  getFactories,
  getFactoryById,
  updateFactory,
  deleteFactory,
};
