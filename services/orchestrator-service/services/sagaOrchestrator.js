const Saga = require('../models/Saga');
const { v4: uuidv4 } = require('uuid');
const { Producer, topics } = require('../../../kafka-broker');
const axios = require('axios');

const producer = new Producer();

class SagaOrchestrator {
  async startSaga(orderData) {
    const sagaId = `SAGA-${uuidv4()}`;
    // Toss Payments orderId 제한 (6-64자)을 위해 짧은 형식 사용
    const orderId = `S${uuidv4().substring(0, 8)}O${uuidv4().substring(0, 8)}`;

    const saga = new Saga({
      sagaId,
      orderId,
      status: 'STARTED',
      currentStep: 'CREATE_ORDER',
      orderData: {
        customerId: orderData.customerId,
        items: orderData.items,
        totalAmount: this.calculateTotal(orderData.items)
      },
      steps: [
        { name: 'CREATE_ORDER', status: 'PENDING' },
        { name: 'PROCESS_PAYMENT', status: 'PENDING' },
        { name: 'RESERVE_INVENTORY', status: 'PENDING' },
        { name: 'COMPLETE_ORDER', status: 'PENDING' }
      ]
    });

    await saga.save();
    // Start the saga by sending the first command
    await this.executeNextStep(saga);
    
    return saga;
  }

  async executeNextStep(saga) {
    try {
      switch (saga.currentStep) {
        case 'CREATE_ORDER':
          await this.createOrder(saga);
          break;
        case 'PROCESS_PAYMENT':
          await this.processPayment(saga);
          break;
        case 'RESERVE_INVENTORY':
          await this.reserveInventory(saga);
          break;
        case 'COMPLETE_ORDER':
          await this.completeOrder(saga);
          break;
        case 'COMPENSATE':
          await this.compensateSaga(saga);
          break;
        case 'COMPLETED':
          // Saga is already completed, nothing to do
          console.log(`Saga ${saga.sagaId} is already completed`);
          break;
      }
    } catch (error) {
      console.error(`Error executing step ${saga.currentStep}:`, error);
      await this.handleStepFailure(saga, error);
    }
  }

  async createOrder(saga) {
    const step = saga.steps.find(s => s.name === 'CREATE_ORDER');
    step.status = 'IN_PROGRESS';
    step.startedAt = new Date();
    
    saga.status = 'STARTED'; // Order already created when saga starts
    await saga.save();

    try {
      // In real scenario, would call order service
      // For now, we'll simulate success
      step.status = 'SUCCESS';
      step.completedAt = new Date();
      saga.currentStep = 'PROCESS_PAYMENT';
      
      await saga.save();
      // await this.executeNextStep(saga);
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async processPayment(saga) {
    const step = saga.steps.find(s => s.name === 'PROCESS_PAYMENT');
    step.status = 'IN_PROGRESS';
    step.startedAt = new Date();
    
    saga.status = 'PAYMENT_PROCESSING';
    await saga.save();

    // Send payment command
    await producer.publish(topics.ORCHESTRATOR_SAGA, {
      sagaId: saga.sagaId,
      orderId: saga.orderId,
      command: 'PROCESS_PAYMENT',
      data: {
        customerId: saga.orderData.customerId,
        amount: saga.orderData.totalAmount
      }
    });
  }

  async reserveInventory(saga) {
    const step = saga.steps.find(s => s.name === 'RESERVE_INVENTORY');
    step.status = 'IN_PROGRESS';
    step.startedAt = new Date();
    
    saga.status = 'INVENTORY_RESERVING';
    await saga.save();

    // Send inventory reservation command
    await producer.publish(topics.ORCHESTRATOR_SAGA, {
      sagaId: saga.sagaId,
      orderId: saga.orderId,
      command: 'RESERVE_INVENTORY',
      data: {
        items: saga.orderData.items
      }
    });
  }

  async completeOrder(saga) {
    const step = saga.steps.find(s => s.name === 'COMPLETE_ORDER');
    step.status = 'IN_PROGRESS';
    step.startedAt = new Date();
    
    // Mark saga as completed
    step.status = 'SUCCESS';
    step.completedAt = new Date();
    saga.status = 'COMPLETED';
    saga.currentStep = 'COMPLETED';
    
    await saga.save();
    
    console.log(`Saga completed successfully for order ${saga.orderId}`);
  }

  async handleStepFailure(saga, error) {
    const step = saga.steps.find(s => s.name === saga.currentStep);
    if (step) {
      step.status = 'FAILED';
      step.completedAt = new Date();
      step.error = error.message;
    }
    
    saga.status = 'COMPENSATING';
    saga.currentStep = 'COMPENSATE';
    saga.compensationReason = error.message;
    
    await saga.save();
    await this.compensateSaga(saga);
  }

  async compensateSaga(saga) {
    console.log(`Starting compensation for saga ${saga.sagaId}`);
    
    // Compensate in reverse order
    const completedSteps = saga.steps.filter(s => s.status === 'SUCCESS').reverse();
    console.log(completedSteps.length)
    // If no steps were completed successfully, mark as FAILED instead of COMPENSATED
    if (completedSteps.length === 0) {
      saga.status = 'FAILED';
      await saga.save();
      console.log(`No steps to compensate for saga ${saga.sagaId}, marked as FAILED`);
      return;
    }
    
    for (const step of completedSteps) {
      switch (step.name) {
        case 'RESERVE_INVENTORY':
          await producer.publish(topics.ORCHESTRATOR_SAGA, {
            sagaId: saga.sagaId,
            orderId: saga.orderId,
            command: 'RELEASE_INVENTORY',
            data: { items: saga.orderData.items }
          });
          break;
        case 'PROCESS_PAYMENT':
          await producer.publish(topics.ORCHESTRATOR_SAGA, {
            sagaId: saga.sagaId,
            orderId: saga.orderId,
            command: 'REFUND_PAYMENT',
            data: { paymentId: saga.paymentId }
          });
          break;
        case 'CREATE_ORDER':
          await producer.publish(topics.ORCHESTRATOR_SAGA, {
            sagaId: saga.sagaId,
            orderId: saga.orderId,
            command: 'CANCEL_ORDER',
            data: { reason: saga.compensationReason }
          });
          break;
      }
      
      step.status = 'COMPENSATED';
    }
    
    saga.status = 'COMPENSATED';
    await saga.save();
    
    console.log(`Saga compensation completed for ${saga.sagaId}`);
  }

  async handleReply(message) {
    const { sagaId, command, status, data } = message;
    
    console.log(`Handling reply for saga ${sagaId}, command: ${command}, status: ${status}`);

    const saga = await Saga.findOne({ sagaId });
    if (!saga) {
      console.error(`Saga not found: ${sagaId}`);
      return;
    }
    
    const step = saga.steps.find(s => s.name === saga.currentStep);
    if (!step) {
      console.error(`Step not found: ${saga.currentStep}`);
      return;
    }
    console.log()
    console.log('Step found:', step.name);

    if (status === 'SUCCESS') {
      step.status = 'SUCCESS';
      step.completedAt = new Date();
      step.data = data;
      
      // Store relevant IDs
      if (command === 'PROCESS_PAYMENT' && data.paymentId) {
        saga.paymentId = data.paymentId;
        saga.status = 'PAYMENT_COMPLETED';
        saga.currentStep = 'RESERVE_INVENTORY';
      } else if (command === 'RESERVE_INVENTORY' && data.reservationId) {
        saga.reservationId = data.reservationId;
        saga.status = 'INVENTORY_RESERVED';
        saga.currentStep = 'COMPLETE_ORDER';
      }
      
      await saga.save();
      await this.executeNextStep(saga);
    } else {
      // Check if this is a payment failure with tossPaymentData
      if (command === 'PROCESS_PAYMENT' && data?.tossPaymentData?.status === 'DONE' && data?.tossPaymentData?.tossResponseData?.status === 'DONE') {
        console.log(`Payment failed but Toss payment was successful. Storing payment data for saga ${sagaId}`);
        
        // Store the payment information even though the step failed
        saga.paymentId = data.tossPaymentData.paymentId;
        saga.tossPaymentData = data.tossPaymentData;
        
        // Check if payment document needs to be created
        await this.ensurePaymentDocumentExists(data.tossPaymentData);
        await saga.save()

        return await this.executeNextStep(saga);
      }
      
      await this.handleStepFailure(saga, new Error(data.reason || 'Step failed'));
      
    }
  }

  async getSaga(sagaId) {
    return await Saga.findOne({ sagaId });
  }

  async getSagaByOrderId(orderId) {
    return await Saga.findOne({ orderId });
  }

  async getAllSagas(options = {}) {
    const {
      page = 1,
      limit = 10,
      statusArray = [],
      sortBy = 'createdAt',
      sortOrder = -1
    } = options;

    // Build query
    const query = {};
    if (statusArray && statusArray.length > 0) {
      query.status = { $in: statusArray };
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const [sagas, totalCount] = await Promise.all([
      Saga.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      Saga.countDocuments(query)
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      data: sagas,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      }
    };
  }

  calculateTotal(items) {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  async ensurePaymentDocumentExists(tossPaymentData) {
    try {
      console.log('ensurePaymentDocumentExists')
      // First check if payment already exists
      const paymentResponse = await axios.get(`http://localhost:3002/api/payments/${tossPaymentData.paymentId}`)
        .catch(async (error) => {
          if (error.response && error.response.status === 404) {
            // Payment doesn't exist, create it
            console.log(`Payment document not found for ${tossPaymentData.paymentId}, creating new payment document`);
            
            const createPaymentData = {
              paymentId: tossPaymentData.paymentId,
              orderId: tossPaymentData.orderId,
              customerId: tossPaymentData.customerId,
              amount: tossPaymentData.amount,
              status: tossPaymentData.status,
              paymentMethod: tossPaymentData.paymentMethod,
              transactionId: tossPaymentData.transactionId,
              tossPaymentKey: tossPaymentData.tossPaymentKey,
              tossOrderId: tossPaymentData.tossOrderId,
              receiptUrl: tossPaymentData.receiptUrl,
              processedAt: tossPaymentData.processedAt,
              tossResponseData: tossPaymentData.tossResponseData
            };
            
            // Call payment service to create the payment document
            const createResponse = await axios.post('http://localhost:3002/api/payments/create-from-toss', createPaymentData);
            console.log(`Payment document created: ${createResponse.data.paymentId}`);
            return createResponse.data.payment;
          }
          throw error;
        });
      
      if (paymentResponse && paymentResponse.data) {
        console.log(`Payment document already exists for ${tossPaymentData.paymentId}`);
        return paymentResponse.data;
      }
    } catch (error) {
      console.error(`Error ensuring payment document exists:`, error.message);
      // Don't throw error, as this is a recovery mechanism
    }
  }

  async retrySaga(sagaId) {
    const saga = await Saga.findOne({ sagaId });
    
    if (!saga) {
      throw new Error(`Saga not found: ${sagaId}`);
    }
    
    // 상태 검증
    if (!['FAILED', 'COMPENSATED'].includes(saga.status)) {
      throw new Error(`Saga can only be retried when in FAILED or COMPENSATED state. Current status: ${saga.status}`);
    }
    
    // COMPLETED 상태의 Saga는 재시도할 수 없음
    if (saga.currentStep === 'COMPLETED') {
      throw new Error(`Cannot retry a completed saga`);
    }
    
    // 실패한 단계 찾기
    const failedStep = saga.steps.find(s => s.status === 'FAILED');
    if (!failedStep) {
      throw new Error('No failed step found to retry');
    }
    
    console.log(`Retrying saga ${sagaId} from step ${failedStep.name}`);
    
    // 재시도 기록 추가
    if (!saga.retryHistory) {
      saga.retryHistory = [];
    }
    saga.retryHistory.push({
      retryAt: new Date(),
      fromStep: failedStep.name,
      result: 'STARTED'
    });
    saga.lastRetryAt = new Date();
    
    // 해당 단계와 이후 단계들을 PENDING으로 리셋
    let resetStep = false;
    saga.steps.forEach(step => {
      if (step.name === failedStep.name) {
        resetStep = true;
      }
      if (resetStep && (step.status === 'FAILED' || step.status === 'COMPENSATED')) {
        step.status = 'PENDING';
        step.error = undefined;
        step.completedAt = undefined;
      }
    });
    
    // Saga 상태 초기화
    saga.currentStep = failedStep.name;
    saga.status = failedStep.name === 'PROCESS_PAYMENT' ? 'PAYMENT_PROCESSING' : 
                  failedStep.name === 'RESERVE_INVENTORY' ? 'PAYMENT_COMPLETED' : 'STARTED';
    saga.compensationReason = undefined;
    
    await saga.save();
    
    // 재시도 실행
    await this.executeNextStep(saga);
    
    return saga;
  }
}

module.exports = new SagaOrchestrator();