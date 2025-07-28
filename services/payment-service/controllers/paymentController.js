const paymentService = require('../services/paymentService');

class PaymentController {
  async getPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getPayment(paymentId);
      res.json(payment);
    } catch (error) {
      console.error('Error fetching payment:', error);
      res.status(404).json({ 
        error: 'Payment not found',
        message: error.message 
      });
    }
  }

  async getPaymentByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      const payment = await paymentService.getPaymentByOrderId(orderId);
      
      if (!payment) {
        return res.status(404).json({ 
          error: 'Payment not found for order',
          orderId 
        });
      }
      
      res.json(payment);
    } catch (error) {
      console.error('Error fetching payment by order ID:', error);
      res.status(500).json({ 
        error: 'Failed to fetch payment',
        message: error.message 
      });
    }
  }

  async getAllPayments(req, res) {
    try {
      const payments = await paymentService.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({ 
        error: 'Failed to fetch payments',
        message: error.message 
      });
    }
  }

  async refundPayment(req, res) {
    try {
      const { orderId } = req.params;
      const payment = await paymentService.refundPayment(orderId);
      
      res.json({
        message: 'Payment refunded successfully',
        payment
      });
    } catch (error) {
      console.error('Error refunding payment:', error);
      res.status(500).json({ 
        error: 'Failed to refund payment',
        message: error.message 
      });
    }
  }
}

module.exports = new PaymentController();