const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Create a new order
router.post('/orders', orderController.createOrder);

// Get all orders
router.get('/orders', orderController.getAllOrders);

// Get order by ID
router.get('/orders/:orderId', orderController.getOrder);

// Cancel order
router.post('/orders/:orderId/cancel', orderController.cancelOrder);

module.exports = router;