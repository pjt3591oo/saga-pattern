const inventoryService = require('../services/inventoryService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class OrchestratorHandler {
  async handleOrchestratorCommand(payload) {
    const { sagaId, orderId, command, data } = payload.message.value;
    console.log(`Received orchestrator command: ${command} for saga ${sagaId}`);

    try {
      switch (command) {
        case 'RESERVE_INVENTORY':
          await this.reserveInventory(sagaId, orderId, data);
          break;
        case 'RELEASE_INVENTORY':
          await this.releaseInventory(sagaId, orderId, data);
          break;
        default:
          console.log(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`Error handling orchestrator command ${command}:`, error);
      // Send failure reply
      await producer.publish(topics.ORCHESTRATOR_REPLY, {
        sagaId,
        orderId,
        command,
        status: 'FAILED',
        data: {
          reason: error.message
        }
      });
    }
  }

  async reserveInventory(sagaId, orderId, data) {
    console.log(`Reserving inventory for order ${orderId} in saga ${sagaId}`);
    
    const orderData = {
      orderId,
      items: data.items
    };

    const reservation = await inventoryService.reserveInventory(orderData);

    // Send reply to orchestrator
    await producer.publish(topics.ORCHESTRATOR_REPLY, {
      sagaId,
      orderId,
      command: 'RESERVE_INVENTORY',
      status: 'SUCCESS',
      data: {
        reservationId: reservation.reservationId,
        items: reservation.items
      }
    });
  }

  async releaseInventory(sagaId, orderId, data) {
    console.log(`Releasing inventory for order ${orderId} in saga ${sagaId}`);
    
    const reservation = await inventoryService.releaseInventory(orderId);

    // Send reply to orchestrator
    await producer.publish(topics.ORCHESTRATOR_REPLY, {
      sagaId,
      orderId,
      command: 'RELEASE_INVENTORY',
      status: 'SUCCESS',
      data: {
        released: reservation ? true : false
      }
    });
  }
}

module.exports = new OrchestratorHandler();