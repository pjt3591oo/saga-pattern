const orderService = require('../services/orderService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class OrderEventHandler {
  async handlePaymentProcessed(payload) {
    const { orderId, paymentId, status } = payload.message.value;
    console.log(`Payment processed for order ${orderId}:`, status);

    try {
      if (status === 'SUCCESS') {
        await orderService.updateOrderStatus(orderId, 'PAYMENT_COMPLETED', {
          paymentId
        });
      } else {
        await orderService.updateOrderStatus(orderId, 'FAILED', {
          failureReason: 'Payment failed'
        });
        
        // Publish cancellation event
        await producer.publish(topics.ORDER_CANCELLED, {
          orderId,
          reason: 'Payment failed',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error handling payment processed event:', error);
    }
  }

  async handlePaymentFailed(payload) {
    const { orderId, reason } = payload.message.value;
    console.log(`Payment failed for order ${orderId}:`, reason);

    try {
      await orderService.updateOrderStatus(orderId, 'FAILED', {
        failureReason: reason
      });
      
      // No need to publish cancellation as payment service already handles compensation
    } catch (error) {
      console.error('Error handling payment failed event:', error);
    }
  }

  async handleInventoryReserved(payload) {
    const { orderId, reservationId, status } = payload.message.value;
    console.log(`Inventory reserved for order ${orderId}:`, status);

    try {
      if (status === 'SUCCESS') {
        await orderService.updateOrderStatus(orderId, 'COMPLETED', {
          inventoryReservationId: reservationId
        });
      } else {
        await orderService.updateOrderStatus(orderId, 'FAILED', {
          failureReason: 'Inventory reservation failed'
        });
      }
    } catch (error) {
      console.error('Error handling inventory reserved event:', error);
    }
  }

  async handleInventoryFailed(payload) {
    const { orderId, reason } = payload.message.value;
    console.log(`Inventory reservation failed for order ${orderId}:`, reason);

    try {
      await orderService.updateOrderStatus(orderId, 'FAILED', {
        failureReason: reason
      });
      
      // Payment compensation will be triggered by inventory service
    } catch (error) {
      console.error('Error handling inventory failed event:', error);
    }
  }
}

module.exports = new OrderEventHandler();