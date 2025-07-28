const orderService = require('../services/orderService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class OrchestratorHandler {
  async handleOrchestratorCommand(payload) {
    const { sagaId, orderId, command, data } = payload.message.value;
    console.log(`Received orchestrator command: ${command} for saga ${sagaId}`);

    try {
      switch (command) {
        case 'CANCEL_ORDER':
          await this.cancelOrder(sagaId, orderId, data);
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

  async cancelOrder(sagaId, orderId, data) {
    console.log(`Cancelling order ${orderId} in saga ${sagaId}`);
    
    const order = await orderService.cancelOrder(orderId, data.reason || 'Saga compensation');

    // Send reply to orchestrator
    await producer.publish(topics.ORCHESTRATOR_REPLY, {
      sagaId,
      orderId,
      command: 'CANCEL_ORDER',
      status: 'SUCCESS',
      data: {
        cancelledAt: new Date()
      }
    });
  }
}

module.exports = new OrchestratorHandler();