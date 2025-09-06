'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const checkRole = require('../utils/roleChecker');

// ---------------- Validation Schema ----------------
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

// ---------------- Error Handler ----------------
function handleError(res, err) {
  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

// ---------------- Controller Functions ----------------

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
