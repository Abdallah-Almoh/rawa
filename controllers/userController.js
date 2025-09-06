'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { z } = require('zod');
const bcrypt = require('bcrypt');

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Phone number must be at least 7 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.string().optional(), 
});

const updateUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  password: z.string().min(6).optional(),
  role: z.string().optional(),
});

function handleError(res, err) {
  console.error(err);
  return res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
}


async function createUser(req, res) {
  try {
    const validation = createUserSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const { username, email, phone, password, role } = validation.data;

    let allowedRolesToCreate = [];
    switch(req.user.role) {
      case 'SUPER_ADMIN':
        allowedRolesToCreate = ['SUPER_ADMIN','ADMIN','DATA_ENTRY','FACTORY_OWNER','EMPLOYEE','USER'];
        break;
      case 'ADMIN':
        allowedRolesToCreate = ['ADMIN','DATA_ENTRY','FACTORY_OWNER','EMPLOYEE','USER'];
        break;
      case 'DATA_ENTRY':
        allowedRolesToCreate = ['ADMIN','DATA_ENTRY','USER'];
        break;
      default:
        return res.status(403).json({ message: 'لا يمكنك إنشاء مستخدم هنا' });
    }

    if (role && !allowedRolesToCreate.includes(role)) {
      return res.status(403).json({ message: 'لا يمكنك إنشاء هذا النوع من المستخدمين' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) return res.status(409).json({ message: 'Username or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const emailVerified = ['SUPER_ADMIN','ADMIN','DATA_ENTRY'].includes(req.user.role) ? true : false;

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        phone,
        password: hashedPassword,
        role: role || 'USER',
        emailVerified
      },
    });

    if (!emailVerified && email) {
      await sendVerificationEmail(newUser);
    }

    return res.status(201).json({ user: newUser });
  } catch (err) {
    return handleError(res, err);
  }
}

async function updateUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid user ID' });

    const validation = updateUserSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.errors });

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) return res.status(404).json({ message: 'User not found' });

    const currentUser = req.user;
    const isSelf = currentUser.id === id;
    const canEditOthers = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'].includes(currentUser.role);

    if (!canEditOthers && !isSelf) {
      return res.status(403).json({ message: 'للاسف انت لا تملك صلاحية تعديل هذا الحساب' });
    }

    if (validation.data.role) {
      if (!['SUPER_ADMIN','ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({ message: 'لا يمكنك تعديل الدور' });
      }
      if (currentUser.role === 'ADMIN' && validation.data.role === 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'لا يمكن للادمن تعيين دور SUPER_ADMIN' });
      }
    }

    if (validation.data.username || validation.data.email) {
      const conflict = await prisma.user.findFirst({
        where: {
          OR: [
            validation.data.username ? { username: validation.data.username } : undefined,
            validation.data.email ? { email: validation.data.email } : undefined,
          ].filter(Boolean),
          NOT: { id },
        },
      });
      if (conflict) return res.status(409).json({ message: 'Username or email already exists' });
    }

    let emailVerified = userToUpdate.emailVerified;
    if (validation.data.email && !['SUPER_ADMIN','ADMIN','DATA_ENTRY'].includes(currentUser.role)) {
      emailVerified = false;
      await sendVerificationEmail(userToUpdate, validation.data.email);
    }

    // let password = userToUpdate.password;
    // if (validation.data.password) {
    //   password = await bcrypt.hash(validation.data.password, 10);
    // }
let password = userToUpdate.password;
    if (validation.data.password) {
      // if (currentUser.role == 'USER') {
      if (!['SUPER_ADMIN','ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({ message: ' لا يمكنه تغيير كلمة السر هنا' });
      }
      if (currentUser.role === 'ADMIN' && userToUpdate.role === 'SUPER_ADMIN') {
        return res.status(403).json({ message: 'لا يمكن للادمن تغيير كلمة سر حساب سوبر ادمن' });
      }
      password = await bcrypt.hash(validation.data.password, 10);
    }
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...validation.data,
        password,
        emailVerified
      },
    });

    return res.json({ user: updatedUser });
  } catch (err) {
    return handleError(res, err);
  }
}

async function deleteUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid user ID' });

    const userToDelete = await prisma.user.findUnique({ where: { id } });
    if (!userToDelete) return res.status(404).json({ message: 'User not found' });

    const currentUser = req.user;
    const isSelf = currentUser.id === id;
    const canDeleteOthers = ['SUPER_ADMIN', 'ADMIN', 'DATA_ENTRY'].includes(currentUser.role);

    if (!canDeleteOthers && !isSelf) {
      return res.status(403).json({ message: 'للاسف انت لا تملك صلاحية حذف هذا الحساب' });
    }

    if (currentUser.role === 'ADMIN' && userToDelete.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'لا يمكن للادمن حذف حساب SUPER_ADMIN' });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({ orderBy: { username: 'asc' } });
    return res.json({ users });
  } catch (err) {
    return handleError(res, err);
  }
}

async function getUser(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid user ID' });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentUser = req.user;
    const isSelf = currentUser.id === id;
    const hasFullAccess = ['SUPER_ADMIN','ADMIN','DATA_ENTRY','FACTORY_OWNER'].includes(currentUser.role) || isSelf;

    if (!hasFullAccess) {
      return res.json({
        id: user.id,
        username: user.username,
        phone: user.phone
      });
    }

    return res.json({ user });
  } catch (err) {
    return handleError(res, err);
  }
}


module.exports = {
  createUser,
  updateUser,
  deleteUser,
  getUsers,
  getUser,
};
