'use strict';

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Connected to the database');

    const server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`🚀 Server listening on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      try {
        console.log(`\n${signal} received. Shutting down...`);
        await prisma.$disconnect();
        server.close(() => {
          console.log('🛑 Server closed');
          process.exit(0);
        });
      } catch (err) {
        console.error('Error during shutdown', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Failed to start server', err);
    process.exit(1);
  }
}

start();


