// 'use strict';

// const swaggerJsdoc = require('swagger-jsdoc');
// const swaggerUi = require('swagger-ui-express');

// const options = {
//   definition: {
//     openapi: '3.0.0',
//     info: {
//       title: 'Rawaa API',
//       version: '1.0.0',
//       description: 'API documentation for Rawa project in port 3000',
//     },
//     servers: [
//       { url: 'http://localhost:3000', description: 'Local server' }
//     ],
//   },
//   apis: ['./routes/*.js', './controllers/*.js'], 
// };

// const swaggerSpec = swaggerJsdoc(options);

// function setupSwagger(app) {
//   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// }

// module.exports = setupSwagger;

'use strict';

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rawaa API',
      version: '1.0.0',
      description: 'API documentation for Rawaa project',
    },
    servers: [
      {
        url: 'http://tacticjo.ashyaaaonline.com:3001',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3001',
        description: 'Local development server',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'], 
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = setupSwagger;
