'use strict';

const { verifyJwt } = require('../utils/jwt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Missing token' });
    }

    const payload = verifyJwt(token);
    if (!payload || !payload.sub) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // تحويل sub إلى رقم إذا لزم الأمر
    const userId = Number(payload.sub);
    if (isNaN(userId)) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      status: user.status,
    };

    return next();
  } catch (err) {
    console.error('authMiddleware error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = authMiddleware;
