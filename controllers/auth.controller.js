'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const { hashPassword, verifyPassword } = require('../utils/hash');
const { signJwt } = require('../utils/jwt');
const { sendMail, buildVerificationEmail } = require('../utils/mailer');
const checkRole = require('../utils/roleChecker');

function sanitizeUser(user, currentUser) {
  const allowedFull = ['SUPER_ADMIN','ADMIN','DATA_ENTRY'];
  if (!user) return null;
  if (allowedFull.includes(currentUser.role) || currentUser.id === user.id) {
    const { password, ...rest } = user;
    return rest;
  }
  return { username: user.username, phone: user.phone };
}

const signupSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6,'password should be at least 6 params'),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(3), // username or email
  password: z.string().min(6,'password should be at least 6 params'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z.string().min(6),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

function handleError(res, err) {
  console.error(err);
  return res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
}


async function sendVerificationCode(user) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15*60*1000);
  await prisma.emailVerification.create({ data: { userId: user.id, code, expiresAt } });
  const { html, text, subject } = buildVerificationEmail({ username: user.username, code });
  await sendMail({ to: user.email, subject, html, text });
}


/**
 * @swagger
 * /rawa/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: mySecret123
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       201:
 *         description: User created successfully (may need email verification)
 *       400:
 *         description: Validation error
 *       409:
 *         description: Username or email already exists
 *       500:
 *         description: Internal server error
 */

async function signup(req,res) {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });

    const { username, password, email, phone } = parsed.data;

   
    if (await prisma.user.findUnique({ where:{ username } })) return res.status(409).json({ message:'Username exists' });
    if (email && await prisma.user.findUnique({ where:{ email } })) return res.status(409).json({ message:'Email exists' });

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({ data:{ username, password: passwordHash, email, phone, role:'USER' } });

    if (email) {
      await sendVerificationCode(user);
      return res.status(201).json({ needsVerification:true, message:'Verification code sent', user: sanitizeUser(user,user) });
    }

    const token = signJwt({ sub: user.id, username: user.username });
    return res.status(201).json({ token, user: sanitizeUser(user,user) });

  } catch(err){ return handleError(res,err); }
}


/**
 * @swagger
 * /rawa/login:
 *   post:
 *     summary: Login with username or email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: username or email
 *                 example: johndoe
 *               password:
 *                 type: string
 *                 example: mySecret123
 *     responses:
 *       200:
 *         description: Successfully logged in
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 *       500:
 *         description: Internal server error
 */

async function login(req,res) {
  try {
    const parsed = loginSchema.safeParse(req.body);
if (!parsed.success) {
  const errors = parsed.error.issues.map(e => ({
    field: e.path.join('.'),
    message: e.message
  }));
  return res.status(400).json({ errors });
}

    const { identifier, password } = parsed.data;
    const user = await prisma.user.findFirst({ where:{ OR:[{ username: identifier},{ email: identifier }] } });
    if (!user) return res.status(401).json({ message:'email or username is wrong' });

    if (!await verifyPassword(password,user.password)) return res.status(401).json({ message:'password is wrong' });
    console.log(user);
    if (user.email && !user.emailVerified) { await sendVerificationCode(user); return res.status(403).json({ needsVerification:true, message:'Email not verified. Verification code sent.' }); }

    const token = signJwt({ sub:user.id, username:user.username });
    return res.json({ token, user: sanitizeUser(user,user) });

  } catch(err){ return handleError(res,err); }
}

// // Me
// async function me(req,res) {
//   try { return res.json({ user:sanitizeUser(req.user,req.user) }); }
//   catch(err){ return handleError(res,err); }
// }


/**
 * @swagger
 * /rawa/verify-email:
 *   post:
 *     summary: Verify user's email using code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully, JWT token returned
 *       400:
 *         description: Invalid code or missing parameters
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// Verify Email
async function verifyEmail(req,res) {
  try {
    const { code, email } = req.body;
    if (!code || !email) return res.status(400).json({ message:'Code and email required' });

    const user = await prisma.user.findUnique({ where:{ email } });
    if (!user) return res.status(404).json({ message:'User not found' });

    const record = await prisma.emailVerification.findFirst({ where:{ userId:user.id, code, consumed:false }, orderBy:{ id:'desc' } });
    if (!record) return res.status(400).json({ message:'Invalid code' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message:'Code expired' });

    await prisma.$transaction([
      prisma.emailVerification.update({ where:{ id:record.id }, data:{ consumed:true } }),
      prisma.user.update({ where:{ id:user.id }, data:{ emailVerified:true } }),
    ]);

    const token = signJwt({ sub:user.id, username:user.username });
    return res.json({ message:'Email verified', token, user:sanitizeUser(user,user) });

  } catch(err){ return handleError(res,err); }
}

/**
 * @swagger
 * /rawa/resend-code:
 *   post:
 *     summary: Resend verification code to user's email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Verification code sent
 *       400:
 *         description: No email to verify
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// Resend Verification Code
async function resendCode(req,res) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where:{ email } });
    if (!user) return res.status(404).json({ message:'User not found' });
    if (!user.email) return res.status(400).json({ message:'No email to verify' });

    await sendVerificationCode(user);
    return res.json({ message:'Verification code sent' });

  } catch(err){ return handleError(res,err); }
}

/**
 * @swagger
 * /rawa/user/forgot-password:
 *   post:
 *     summary: Send a password reset code to email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *     responses:
 *       200:
 *         description: Verification code sent
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

// Forgot Password
async function forgotPassword(req,res) {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });

    const { email } = parsed.data;
    const user = await prisma.user.findUnique({ where:{ email } });
    if (!user) return res.status(404).json({ message:'User not found' });

    await sendVerificationCode(user);
    return res.json({ message:'Verification code sent' });

  } catch(err){ return handleError(res,err); }
}

/**
 * @swagger
 * /rawa/user/reset-password:
 *   post:
 *     summary: Reset password using code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 example: myNewPass123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid code or validation error
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
// Reset Password (via code)
async function resetPassword(req,res) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });

    const { email, code, newPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where:{ email } });
    if (!user) return res.status(404).json({ message:'User not found' });

    const record = await prisma.emailVerification.findFirst({ where:{ userId:user.id, code, consumed:false }, orderBy:{ id:'desc' } });
    if (!record) return res.status(400).json({ message:'Invalid code' });
    if (record.expiresAt < new Date()) return res.status(400).json({ message:'Code expired' });

    const hashed = await hashPassword(newPassword);
    await prisma.$transaction([
      prisma.user.update({ where:{ id:user.id }, data:{ password:hashed } }),
      prisma.emailVerification.update({ where:{ id:record.id }, data:{ consumed:true } }),
    ]);

    return res.json({ message:'Password reset successfully' });

  } catch(err){ return handleError(res,err); }
}

/**
 * @swagger
 * /rawa/user/change-password/{id}:
 *   post:
 *     summary: Change password (authenticated)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: oldPass123
 *               newPassword:
 *                 type: string
 *                 example: newPass123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or old password incorrect
 *       403:
 *         description: Forbidden – not allowed to change this user's password
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
// Change Password (authenticated)
async function changePassword(req,res) {
  try {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ errors: parsed.error.errors });

    const { oldPassword, newPassword } = parsed.data;
    const userId = Number(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ message:'Invalid user ID' });

    const user = await prisma.user.findUnique({ where:{ id:userId } });
    if (!user) return res.status(404).json({ message:'User not found' });

    const currentUser = req.user;
    const isSelf = currentUser.id === user.id;
    const allowedRoles = ['SUPER_ADMIN','ADMIN','DATA_ENTRY'];

    if (!isSelf && !allowedRoles.includes(currentUser.role)) return res.status(403).json({ message:'No permission to change this password' });
    if (currentUser.role === 'ADMIN' && user.role === 'SUPER_ADMIN') return res.status(403).json({ message:'Cannot change SUPER_ADMIN password' });
    if (currentUser.role === 'DATA_ENTRY' && ['SUPER_ADMIN','ADMIN'].includes(user.role)) return res.status(403).json({ message:'Cannot change password for this user' });

    if (!await verifyPassword(oldPassword,user.password)) return res.status(400).json({ message:'Old password incorrect' });

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where:{ id:user.id }, data:{ password:hashed } });
    return res.json({ message:'Password changed successfully' });

  } catch(err){ return handleError(res,err); }
}

module.exports = {
  signup,
  login,
  // me,
  verifyEmail,
  resendCode,
  forgotPassword,
  resetPassword,
  changePassword
};
