const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');

// Initialize sample inventory data
router.post('/inventory/initialize', inventoryController.initializeInventory);

// Get all inventory
router.get('/inventory', inventoryController.getAllInventory);

// Get inventory by product ID
router.get('/inventory/:productId', inventoryController.getInventory);

// Update inventory
router.put('/inventory/:productId', inventoryController.updateInventory);

// Get reservation by order ID
router.get('/reservations/order/:orderId', inventoryController.getReservation);

module.exports = router;