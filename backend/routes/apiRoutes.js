// backend/routes/apiRoutes.js
const express = require('express');
const router = express.Router();
const queryController = require('../controllers/queryController');
const dataController = require('../controllers/dataController');

// Query route - single endpoint for all query types
router.post('/query', queryController.processQuery);

// Data management routes
// router.post('/update', dataController.updateOuraData);
// router.get('/test-oura', dataController.testOuraConnection);
// router.get('/data/:type', dataController.getData);

module.exports = router;