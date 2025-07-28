const paymentService = require('../services/paymentService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class OrchestratorHandler {
  async handleOrchestratorCommand(payload) {
    const { sagaId, orderId, command, data } = payload.message.value;
    console.log(`Received orchestrator command: ${command} for saga ${sagaId}`);

    try {
      switch (command) {
        case 'PROCESS_PAYMENT':
          await this.processPayment(sagaId, orderId, data);
          break;
        case 'REFUND_PAYMENT':
          await this.refundPayment(sagaId, orderId, data);
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

  async processPayment(sagaId, orderId, data) {
    console.log(`Processing payment for order ${orderId} in saga ${sagaId}`);
    
    const orderData = {
      orderId,
      customerId: data.customerId,
      totalAmount: data.amount
    };

    const payment = await paymentService.processPayment(orderData);
    console.log(`Payment processed with status: ${payment.status}`);
    // Send reply to orchestrator
    await producer.publish(topics.ORCHESTRATOR_REPLY, {
      sagaId,
      orderId,
      command: 'PROCESS_PAYMENT',
      status: payment.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      data: {
        paymentId: payment.paymentId,
        transactionId: payment.transactionId,
        reason: payment.failureReason
      }
    });
  }

  async refundPayment(sagaId, orderId, data) {
    console.log(`Refunding payment for order ${orderId} in saga ${sagaId}`);
    
    const payment = await paymentService.refundPayment(orderId);

    // Send reply to orchestrator
    await producer.publish(topics.ORCHESTRATOR_REPLY, {
      sagaId,
      orderId,
      command: 'REFUND_PAYMENT',
      status: 'SUCCESS',
      data: {
        paymentId: payment.paymentId,
        refundedAt: payment.refundedAt
      }
    });
  }
}

module.exports = new OrchestratorHandler();