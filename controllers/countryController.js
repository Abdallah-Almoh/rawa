'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');

const createCountrySchema = z.object({
  engName: z.string().min(2, 'English name must be at least 2 characters'),
  arName: z.string().min(2, 'Arabic name must be at least 2 characters'),
  currency: z.object({
    code: z.string().length(3, 'Currency code must be 3 letters'),
    symbol: z.string().min(1, 'Currency symbol is required'),
    exchangeRate: z.number().positive('Exchange rate must be positive'),
  }),
});

const updateCountrySchema = z.object({
  engName: z.string().min(2).optional(),
  arName: z.string().min(2).optional(),
  currency: z.object({
    code: z.string().length(3),
    symbol: z.string().min(1),
    exchangeRate: z.number().positive(),
  }).optional(),
});

function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

/**
 * @swagger
 * /rawa/countries:
 *   post:
 *     summary: Create a new country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only logged-in users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can create a new country. Includes English & Arabic names and currency info.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - engName
 *               - arName
 *               - currency
 *             properties:
 *               engName:
 *                 type: string
 *               arName:
 *                 type: string
 *               currency:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   symbol:
 *                     type: string
 *                   exchangeRate:
 *                     type: number
 *     responses:
 *       201:
 *         description: Country created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Country name already exists
 *       500:
 *         description: Internal server error
 */

async function createCountry(req, res) {
  try {
    const validation = createCountrySchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const { engName, arName, currency } = validation.data;

    const existing = await prisma.country.findFirst({
      where: { OR: [{ engName }, { arName }] },
    });
    if (existing) return res.status(409).json({ message: 'Country English or Arabic name already exists' });

    let currencyRecord = await prisma.currency.findUnique({ where: { code: currency.code } });
    if (!currencyRecord) {
      currencyRecord = await prisma.currency.create({ data: currency });
    }

    const country = await prisma.country.create({
      data: { engName, arName, currencyId: currencyRecord.id },
      include: { currency: true },
    });

    return res.status(201).json({ country });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @swagger
 * /rawa/countries:
 *   get:
 *     summary: Get all countries
 *     tags: [Countries]
 *     description: Retrieve all countries with their currency information.
 *     responses:
 *       200:
 *         description: List of countries
 *       500:
 *         description: Internal server error
 */

async function getCountries(req, res) {
  try {
    const countries = await prisma.country.findMany({ include: { currency: true }, orderBy: { engName: 'asc' } });
    return res.json({ countries });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /rawa/countries/{id}:
 *   get:
 *     summary: Get country by ID
 *     tags: [Countries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Country found
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */

async function getCountry(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid country ID' });

    const country = await prisma.country.findUnique({ where: { id }, include: { currency: true } });
    if (!country) return res.status(404).json({ message: 'Country not found' });

    return res.json({ country });
  } catch (err) {
    return handleError(res, err);
  }
}

/**
 * @swagger
 * /rawa/countries/{id}:
 *   put:
 *     summary: Update a country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only logged-in users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can update a  country. Includes English & Arabic names and currency info.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
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
 *               currency:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   symbol:
 *                     type: string
 *                   exchangeRate:
 *                     type: number
 *     responses:
 *       200:
 *         description: Country updated successfully
 *       400:
 *         description: Validation error / Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Country not found
 *       409:
 *         description: Country name conflict
 *       500:
 *         description: Internal server error
 */

async function updateCountry(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid country ID' });

    const validation = updateCountrySchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const country = await prisma.country.findUnique({ where: { id } });
    if (!country) return res.status(404).json({ message: 'Country not found' });

    if (validation.data.engName || validation.data.arName) {
      const conflict = await prisma.country.findFirst({
        where: {
          OR: [{ engName: validation.data.engName }, { arName: validation.data.arName }],
          NOT: { id },
        },
      });
      if (conflict) return res.status(409).json({ message: 'Country English or Arabic name already exists' });
    }

    if (validation.data.currency) {
      await prisma.currency.update({
        where: { id: country.currencyId },
        data: validation.data.currency,
      });
    }

    const updatedCountry = await prisma.country.update({
      where: { id },
      data: { ...validation.data, currencyId: country.currencyId },
      include: { currency: true },
    });

    return res.json({ country: updatedCountry });
  } catch (err) {
    return handleError(res, err);
  }
}
/**
 * @swagger
 * /rawa/countries/{id}:
 *   delete:
 *     summary: Delete a country
 *     tags: [Countries]
 *     security:
 *       - bearerAuth: []
 *     description: >
 *       Only logged-in users with roles SUPER_ADMIN, ADMIN, or DATA_ENTRY
 *       can delete a new country. Includes English & Arabic names and currency info.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Country ID
 *     responses:
 *       200:
 *         description: Country deleted successfully
 *       400:
 *         description: Invalid ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Country not found
 *       500:
 *         description: Internal server error
 */

async function deleteCountry(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid country ID' });

    const country = await prisma.country.findUnique({ where: { id } });
    if (!country) return res.status(404).json({ message: 'Country not found' });

    await prisma.country.delete({ where: { id } });
    return res.json({ message: 'Country deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  createCountry,
  getCountries,
  getCountry,
  updateCountry,
  deleteCountry,
};
