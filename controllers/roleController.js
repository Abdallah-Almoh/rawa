'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const checkRole = require('../utils/roleChecker');

// Validation Schemas
const createRoleSchema = z.object({
  name: z.string().min(2, 'Role name must be at least 2 characters'),
});

const updateRoleSchema = z.object({
  name: z.string().min(2).optional(),
});

// Error handler
function handleError(res, err) {
  console.error(err);
  return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
}

// Create Role
async function createRole(req, res) {
  try {
    const validation = createRoleSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const { name } = validation.data;

    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) return res.status(409).json({ message: 'Role already exists' });

    const role = await prisma.role.create({ data: { name } });
    return res.status(201).json({ role });
  } catch (err) {
    return handleError(res, err);
  }
}

// Get All Roles
async function getRoles(req, res) {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    return res.json({ roles });
  } catch (err) {
    return handleError(res, err);
  }
}

// Get Single Role
async function getRole(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid role ID' });

    const role = await prisma.role.findUnique({ where: { id }, include: { users: true } });
    if (!role) return res.status(404).json({ message: 'Role not found' });

    return res.json({ role });
  } catch (err) {
    return handleError(res, err);
  }
}

// Update Role
async function updateRole(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid role ID' });

    const validation = updateRoleSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ message: 'Role not found' });

    if (validation.data.name) {
      const conflict = await prisma.role.findUnique({ where: { name: validation.data.name } });
      if (conflict && conflict.id !== id) {
        return res.status(409).json({ message: 'Role name already exists' });
      }
    }

    const updatedRole = await prisma.role.update({ where: { id }, data: validation.data });
    return res.json({ role: updatedRole });
  } catch (err) {
    return handleError(res, err);
  }
}

// Delete Role
async function deleteRole(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid role ID' });

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) return res.status(404).json({ message: 'Role not found' });

    await prisma.role.delete({ where: { id } });
    return res.json({ message: 'Role deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

module.exports = {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
};
