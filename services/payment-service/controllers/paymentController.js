const paymentService = require('../services/paymentService');
const tossPaymentsService = require('../services/tossPaymentsService');
const { v4: uuidv4 } = require('uuid');

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

  async confirmTossPayment(req, res) {
    try {
      const { paymentKey, orderId, amount } = req.body;

      // 토스페이먼츠 결제 승인 요청
      const tossPaymentData = await tossPaymentsService.confirmPayment(paymentKey, orderId, amount);
      
      // DB에서 기존 결제 정보 조회 또는 생성
      let payment = await paymentService.getPaymentByOrderId(orderId);
      
      if (!payment) {
        // 결제 정보가 없으면 새로 생성
        payment = await paymentService.createPayment({
          paymentId: uuidv4(),
          orderId,
          customerId: tossPaymentData.metadata?.customerId || 'UNKNOWN',
          amount,
          status: 'SUCCESS',
          paymentMethod: tossPaymentData.method || 'CARD',
          transactionId: tossPaymentData.transactionKey,
          tossPaymentKey: paymentKey,
          tossOrderId: orderId,
          receiptUrl: tossPaymentData.receipt?.url,
          processedAt: new Date()
        });
      } else {
        // 기존 결제 정보 업데이트
        payment.status = 'SUCCESS';
        payment.paymentMethod = tossPaymentData.method || 'CARD';
        payment.transactionId = tossPaymentData.transactionKey;
        payment.tossPaymentKey = paymentKey;
        payment.tossOrderId = orderId;
        payment.receiptUrl = tossPaymentData.receipt?.url;
        payment.processedAt = new Date();
        await payment.save();
      }

      res.json({
        message: 'Payment confirmed successfully',
        payment,
        tossPaymentData
      });
    } catch (error) {
      console.error('Error confirming Toss payment:', error);
      res.status(500).json({ 
        error: 'Failed to confirm payment',
        message: error.response?.data?.message || error.message 
      });
    }
  }
}

module.exports = new PaymentController();