const paymentService = require('../services/paymentService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class PaymentEventHandler {
  async handleOrderCreated(payload) {
    const orderData = payload.message.value;

    console.log(`Processing payment for order ${orderData.orderId}`);

    try {
      // Process payment
      const payment = await paymentService.processPayment(orderData);

      if (payment.status === 'SUCCESS') {
        // Publish PAYMENT_PROCESSED event
        await producer.publish(topics.PAYMENT_PROCESSED, {
          orderId: orderData.orderId,
          paymentId: payment.paymentId,
          customerId: orderData.customerId,
          amount: payment.amount,
          status: 'SUCCESS',
          transactionId: payment.transactionId,
          items: orderData.items, // Pass items for inventory service
          timestamp: new Date().toISOString()
        });
        console.log(`Payment successful for order ${orderData.orderId}`);
      } else {
        // Publish PAYMENT_FAILED event
        await producer.publish(topics.PAYMENT_FAILED, {
          orderId: orderData.orderId,
          paymentId: payment.paymentId,
          customerId: orderData.customerId,
          amount: payment.amount,
          status: 'FAILED',
          reason: payment.failureReason,
          timestamp: new Date().toISOString()
        });
        console.log(`Payment failed for order ${orderData.orderId}: ${payment.failureReason}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      
      // Publish PAYMENT_FAILED event on error
      await producer.publish(topics.PAYMENT_FAILED, {
        orderId: orderData.orderId,
        customerId: orderData.customerId,
        amount: orderData.totalAmount,
        status: 'FAILED',
        reason: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleOrderCancelled(payload) {
    const { orderId, reason } = payload.message.value;
    console.log(`Cancelling payment for order ${orderId}: ${reason}`);

    try {
      const payment = await paymentService.cancelPayment(orderId);
      
      if (payment) {
        console.log(`Payment cancelled/refunded for order ${orderId}`);
      }
    } catch (error) {
      console.error('Error cancelling payment:', error);
    }
  }

  async handleInventoryFailed(payload) {
    const { orderId, reason } = payload.message.value;
    console.log(`Inventory failed for order ${orderId}, refunding payment: ${reason}`);

    try {
      // Compensating transaction: refund the payment
      const payment = await paymentService.refundPayment(orderId);
      
      if (payment) {
        console.log(`Payment refunded for order ${orderId} due to inventory failure`);
      }
    } catch (error) {
      console.error('Error refunding payment:', error);
    }
  }
}

module.exports = new PaymentEventHandler();