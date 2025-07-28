const Payment = require('../models/Payment');
const { v4: uuidv4 } = require('uuid');

class PaymentService {
  async processPayment(orderData) {
    const paymentId = uuidv4();
    
    // Simulate payment processing logic
    const paymentSuccess = Math.random() > 0.2; // 80% success rate for demo
    
    console.log(paymentSuccess ? '>>>>>>>> Payment processed successfully' : '>>>>>>>>  Payment failed');

    const payment = new Payment({
      paymentId,
      orderId: orderData.orderId,
      customerId: orderData.customerId,
      amount: orderData.totalAmount,
      status: 'PROCESSING'
    });

    await payment.save();

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (paymentSuccess) {
      payment.status = 'SUCCESS';
      payment.transactionId = `TXN_${uuidv4()}`;
      payment.processedAt = new Date();
    } else {
      payment.status = 'FAILED';
      payment.failureReason = 'Insufficient funds';
    }

    await payment.save();
    return payment;
  }

  async refundPayment(orderId) {
    const payment = await Payment.findOne({ orderId, status: 'SUCCESS' });
    
    if (!payment) {
      throw new Error(`No successful payment found for order: ${orderId}`);
    }

    payment.status = 'REFUNDED';
    payment.refundedAt = new Date();
    await payment.save();

    return payment;
  }

  async cancelPayment(orderId) {
    const payment = await Payment.findOne({ orderId });
    
    if (!payment) {
      console.log(`No payment found for order: ${orderId}`);
      return null;
    }

    if (payment.status === 'SUCCESS') {
      // If payment was successful, refund it
      return await this.refundPayment(orderId);
    } else if (payment.status === 'PROCESSING' || payment.status === 'PENDING') {
      // If payment is still processing, cancel it
      payment.status = 'CANCELLED';
      await payment.save();
      return payment;
    }

    return payment;
  }

  async getPayment(paymentId) {
    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }
    return payment;
  }

  async getPaymentByOrderId(orderId) {
    return await Payment.findOne({ orderId });
  }

  async getAllPayments() {
    return await Payment.find().sort({ createdAt: -1 });
  }
}

module.exports = new PaymentService();