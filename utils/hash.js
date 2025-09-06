'use strict';

const bcrypt = require('bcrypt');

const DEFAULT_SALT_ROUNDS = 10;

async function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new Error('Password must be a non-empty string');
  }
  return bcrypt.hash(plainPassword, DEFAULT_SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hashedPassword) {
  if (!hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

module.exports = {
  hashPassword,
  verifyPassword,
};


