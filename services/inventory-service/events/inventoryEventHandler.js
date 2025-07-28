const inventoryService = require('../services/inventoryService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class InventoryEventHandler {
  async handlePaymentProcessed(payload) {
    const { orderId, paymentId, status } = payload.message.value;
    console.log(`Payment processed for order ${orderId}, status: ${status}`);

    if (status !== 'SUCCESS') {
      console.log(`Payment failed for order ${orderId}, skipping inventory reservation`);
      return;
    }

    try {
      // Get order data from payment event (in real system, might need to fetch from order service)
      const orderData = {
        orderId,
        items: payload.message.value.items || [] // Items should be passed in the event
      };

      // Reserve inventory
      const reservation = await inventoryService.reserveInventory(orderData);

      // Publish INVENTORY_RESERVED event
      await producer.publish(topics.INVENTORY_RESERVED, {
        orderId,
        reservationId: reservation.reservationId,
        items: reservation.items,
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });

      console.log(`Inventory reserved successfully for order ${orderId}`);
    } catch (error) {
      console.error(`Error reserving inventory for order ${orderId}:`, error);

      // Publish INVENTORY_FAILED event
      await producer.publish(topics.INVENTORY_FAILED, {
        orderId,
        status: 'FAILED',
        reason: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  async handleOrderCreatedWithItems(payload) {
    // This handler is for choreography when order includes item details
    const orderData = payload.message.value;
    console.log(`Received order created event for order ${orderData.orderId}`);

    // In choreography pattern, inventory waits for payment success
    // So we'll handle this in handlePaymentProcessed instead
  }

  async handleOrderCancelled(payload) {
    const { orderId, reason } = payload.message.value;
    console.log(`Order cancelled for ${orderId}: ${reason}`);

    try {
      // Release reserved inventory
      const reservation = await inventoryService.releaseInventory(orderId);
      
      if (reservation) {
        console.log(`Inventory released for cancelled order ${orderId}`);
        
        // Publish INVENTORY_RELEASED event
        await producer.publish(topics.INVENTORY_RELEASED, {
          orderId,
          reservationId: reservation.reservationId,
          items: reservation.items,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`Error releasing inventory for order ${orderId}:`, error);
    }
  }
}

module.exports = new InventoryEventHandler();