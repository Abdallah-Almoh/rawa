'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');

// Validation schemas
const createCurrencySchema = z.object({
  code: z.string().length(3, 'Currency code must be 3 letters'),
  symbol: z.string().min(1, 'Currency symbol is required'),
  exchangeRate: z.number().positive('Exchange rate must be positive'),
});

const updateCurrencySchema = z.object({
  code: z.string().length(3).optional(),
  symbol: z.string().min(1).optional(),
  exchangeRate: z.number().positive().optional(),
});

// Error handler
function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

/**
 * @swagger
 * /currencies:
 *   post:
 *     summary: Create a new currency
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can create a new currency.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - symbol
 *               - exchangeRate
 *             properties:
 *               code:
 *                 type: string
 *                 description: 3-letter currency code
 *               symbol:
 *                 type: string
 *               exchangeRate:
 *                 type: number
 *     responses:
 *       201:
 *         description: Currency created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Currency code already exists
 *       500:
 *         description: Internal server error
 */

// Create currency
async function createCurrency(req, res) {
  try {
    const validation = createCurrencySchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const { code, symbol, exchangeRate } = validation.data;

    // Check if code exists
    const existing = await prisma.currency.findUnique({ where: { code } });
    if (existing) return res.status(409).json({ message: 'Currency code already exists' });

    const currency = await prisma.currency.create({
      data: { code, symbol, exchangeRate },
    });

    return res.status(201).json({ currency });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /currencies:
 *   get:
 *     summary: Get all currencies
 *     tags: [Currencies]
 *     description: Retrieve a list of all currencies.
 *     responses:
 *       200:
 *         description: List of currencies
 *       500:
 *         description: Internal server error
 */

// Get all currencies
async function getCurrencies(req, res) {
  try {
    const currencies = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
    return res.json({ currencies });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /currencies/{id}:
 *   get:
 *     summary: Get currency by ID
 *     tags: [Currencies]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Currency ID
 *     responses:
 *       200:
 *         description: Currency found
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Currency not found
 *       500:
 *         description: Internal server error
 */

// Get one currency
async function getCurrency(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid currency ID' });

    const currency = await prisma.currency.findUnique({ where: { id } });
    if (!currency) return res.status(404).json({ message: 'Currency not found' });

    return res.json({ currency });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /currencies/{id}:
 *   put:
 *     summary: Update a currency
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can update a  currency.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Currency ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: 3-letter currency code
 *               symbol:
 *                 type: string
 *               exchangeRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Currency updated successfully
 *       400:
 *         description: Validation error / Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Currency not found
 *       409:
 *         description: Currency code conflict
 *       500:
 *         description: Internal server error
 */

// Update currency
async function updateCurrency(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid currency ID' });

    const validation = updateCurrencySchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const existing = await prisma.currency.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Currency not found' });

    // Check for duplicate code
    if (validation.data.code) {
      const conflict = await prisma.currency.findUnique({ where: { code: validation.data.code } });
      if (conflict && conflict.id !== id) return res.status(409).json({ message: 'Currency code already exists' });
    }

    const updated = await prisma.currency.update({
      where: { id },
      data: validation.data,
    });

    return res.json({ currency: updated });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /currencies/{id}:
 *   delete:
 *     summary: Delete a currency
 *     tags: [Currencies]
 *     security:
 *       - bearerAuth: []
 *     description: Only SUPER_ADMIN, ADMIN, or DATA_ENTRY can delete a  currency.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Currency ID
 *     responses:
 *       200:
 *         description: Currency deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Currency not found
 *       500:
 *         description: Internal server error
 */

// Delete currency
async function deleteCurrency(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid currency ID' });

    const existing = await prisma.currency.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Currency not found' });

    await prisma.currency.delete({ where: { id } });
    return res.json({ message: 'Currency deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  createCurrency,
  getCurrencies,
  getCurrency,
  updateCurrency,
  deleteCurrency,
};
