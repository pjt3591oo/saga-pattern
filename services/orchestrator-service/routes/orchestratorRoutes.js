const express = require('express');
const router = express.Router();
const orchestratorController = require('../controllers/orchestratorController');

// Create a new order (start saga)
router.post('/orchestrator/orders', orchestratorController.createOrder);

// Get all sagas
router.get('/orchestrator/sagas', orchestratorController.getAllSagas);

// Get saga by ID
router.get('/orchestrator/sagas/:sagaId', orchestratorController.getSaga);

// Get saga by order ID
router.get('/orchestrator/sagas/order/:orderId', orchestratorController.getSagaByOrderId);

// Retry failed saga
router.post('/orchestrator/sagas/:sagaId/retry', orchestratorController.retrySaga);

module.exports = router;