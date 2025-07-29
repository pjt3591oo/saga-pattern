const paymentService = require('../services/paymentService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class PaymentEventHandler {
  // handleOrderCreated method removed - payments now handled via Toss Payments UI

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