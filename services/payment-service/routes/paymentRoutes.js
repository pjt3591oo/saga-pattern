const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Get all payments
router.get('/payments', paymentController.getAllPayments);

// Get payment by ID
router.get('/payments/:paymentId', paymentController.getPayment);

// Get payment by order ID
router.get('/payments/order/:orderId', paymentController.getPaymentByOrderId);

// Refund payment
router.post('/payments/order/:orderId/refund', paymentController.refundPayment);

// Toss Payments confirmation
router.post('/payments/confirm', paymentController.confirmTossPayment);

module.exports = router;