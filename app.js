'use strict';
const express = require('express');
const cors = require('cors');
const setupSwagger = require('./swagger');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const { scheduleAdExpirationJob } = require('./controllers/adController');

// Create express app
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname,'public')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(setupSwagger));
setupSwagger(app);
// Middlewares
app.use(cors());
// app.use(express.json({ limit: '1mb' }));

scheduleAdExpirationJob();
// Routes
app.use('/rawa', require('./routes/auth.routes'));
app.use('/rawa/country',require('./routes/countryRoutes'));
app.use('rawa/currency',require('./routes/currencyController'));
app.use('/rawa/roles', require('./routes/roleRoutes'));
app.use('/rawa/province', require('./routes/provinceRoutes'));
app.use('/rawa/district', require('./routes/districtRoutes'));
app.use('/rawa/factory', require('./routes/factoryRoutes'));
app.use('/rawa/mosque', require('./routes/mosqueRoutes'));
app.use('/rawa/product', require('./routes/productRoutes'));
app.use('/rawa/ads', require('./routes/adRoutes'));

module.exports = app;


