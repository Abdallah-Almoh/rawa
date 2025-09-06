'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // local storage location
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}-${Date.now()}${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('الملف ليس صورة! يرجى رفع صورة فقط.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  // limits: { fileSize: Infinity } // size limit here no limit 
});

// cloudinary code
// const cloudinary = require('cloudinary').v2;
// cloudinary.config({ cloud_name: 'xxx', api_key: 'xxx', api_secret: 'xxx' });


const uploadMultiplePhotos = upload.array('photos', 20); // upload many photos max 20

async function createProduct(req, res) {
  try {
    const { engName, arName, quantity, value, price, discountType, discountValue, status, description } = req.body;

    // const existing = await prisma.product.findFirst({
    //   where: { OR: [{ engName }, { arName }] },
    // });
    // if (existing) return res.status(409).json({ message: 'Product with same name exists' });

    //local upload
    const files = req.files || [];
    const fileData = files.map(f => ({
      fileName: f.filename,
      fileType: f.mimetype,
      fileSize: f.size,
      fileUrl: `/uploads/${f.filename}`, // رابط الوصول للملف محلياً
    }));

    // Cloudinary code:
    // for (const file of files) {
    //   const result = await cloudinary.uploader.upload(file.path, { folder: 'products' });
    //   fileData.push({
    //     fileName: file.originalname,
    //     fileType: file.mimetype,
    //     fileSize: file.size,
    //     fileUrl: result.secure_url,
    //   });
    // }

    const product = await prisma.product.create({
      data: {
        engName,
        arName,
        quantity: quantity || 0,
        value,
        price,
        discountType,
        discountValue,
        status,
        description,
        files: { create: fileData },
      },
      include: { files: true },
    });

    return res.status(201).json({ product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getProducts(req, res) {
  try {
    const products = await prisma.product.findMany({ include: { files: true }, orderBy: { engName: 'asc' } });
    return res.json({ products });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function getProductById(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await prisma.product.findUnique({ where: { id }, include: { files: true } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    return res.json({ product });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateProduct(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await prisma.product.findUnique({ where: { id }, include: { files: true } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const { engName, arName, quantity, value, price, discountType, discountValue, status, description } = req.body;

    const files = req.files || [];
    const fileData = files.map(f => ({
      fileName: f.filename,
      fileType: f.mimetype,
      fileSize: f.size,
      fileUrl: `/uploads/${f.filename}`,
    }));

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        engName,
        arName,
        quantity,
        value,
        price,
        discountType,
        discountValue,
        status,
        description,
        files: { create: fileData },
      },
      include: { files: true },
    });

    return res.json({ product: updatedProduct });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteProduct(req, res) {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid product ID' });

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    await prisma.product.delete({ where: { id } });
    return res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  uploadMultiplePhotos,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
