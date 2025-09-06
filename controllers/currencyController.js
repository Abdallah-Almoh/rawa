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

// Get all currencies
async function getCurrencies(req, res) {
  try {
    const currencies = await prisma.currency.findMany({ orderBy: { code: 'asc' } });
    return res.json({ currencies });
  } catch (err) {
    return handleError(res, err);
  }
}

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
