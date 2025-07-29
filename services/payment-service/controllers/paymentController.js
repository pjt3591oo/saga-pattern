const paymentService = require('../services/paymentService');
const tossPaymentsService = require('../services/tossPaymentsService');
const { v4: uuidv4 } = require('uuid');
const { Producer, topics } = require('../../../kafka-broker');
const axios = require('axios');

const producer = new Producer();

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
    const { paymentKey, orderId, amount } = req.body;
    
    // 주문 데이터를 가져오기 위한 변수
    let customerId = 'UNKNOWN';

    let items = [];
    let isOrchestration = false;
    let sagaId = null;
    let sagaData = null;

    let tossPaymentData;
    const generatedPaymentId = uuidv4();

    try {

      // 먼저 Orchestrator service에서 saga를 찾아보기
      try {
        const sagaResponse = await axios.get(`http://localhost:3004/api/orchestrator/sagas/order/${orderId}`);
        if (sagaResponse.data) {
          isOrchestration = true;
          sagaData = sagaResponse.data;
          sagaId = sagaData.sagaId;
          customerId = sagaData.orderData.customerId;
          items = sagaData.orderData.items;
          console.log(`Found saga for order ${orderId}, processing as Orchestration`);
        }
      } catch (sagaError) {
        // Saga가 없으면 Choreography 방식으로 처리
        console.log('No saga found, processing as Choreography');
        try {
          const orderResponse = await axios.get(`http://localhost:3001/api/orders/${orderId}`);
          if (orderResponse.data) {
            customerId = orderResponse.data.customerId || 'UNKNOWN';
            items = orderResponse.data.items || [];
          }
        } catch (orderError) {
          console.log('Could not fetch order details:', orderError.message);
          // Continue without order details
        }
      }
      console.log(`isOrchestration: ${isOrchestration}, sagaId: ${sagaId}, customerId: ${customerId}, items:`, items);
      
      // DB에서 기존 결제 정보 조회
      let payment = await paymentService.getPaymentByOrderId(orderId);
      
      // 이미 성공한 결제가 있으면 중복 처리 방지
      if (payment && payment.status === 'SUCCESS' && payment.tossPaymentKey === paymentKey) {
        console.log(`Payment already confirmed for order ${orderId}, returning existing payment`);
        res.json({
          message: 'Payment already confirmed',
          payment,
          cached: true
        });
        return;
      }
      
      // 토스페이먼츠 결제 승인 요청
      tossPaymentData = await tossPaymentsService.confirmPayment(paymentKey, orderId, amount);
      
      // throw new Error('Toss payment confirmation failed'); // Simulate error for testing

      if (!payment) {
        // 결제 정보가 없으면 새로 생성
        payment = await paymentService.createPayment({
          paymentId: generatedPaymentId,
          orderId,
          customerId: customerId || tossPaymentData.metadata?.customerId || 'UNKNOWN',
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

      // Kafka 이벤트 발행
      if (isOrchestration) {
        // Orchestration 방식: ORCHESTRATOR_REPLY 이벤트 발행
        const replyData = {
          sagaId,
          orderId,
          command: 'PROCESS_PAYMENT',
          status: 'SUCCESS',
          data: {
            paymentId: payment.paymentId,
            transactionId: payment.transactionId,
            amount: payment.amount,
            paymentMethod: payment.paymentMethod
          }
        };
        console.log(`Publishing ORCHESTRATOR_REPLY for saga ${sagaId}`);
        await producer.publish(topics.ORCHESTRATOR_REPLY, replyData);
      } else {
        // Choreography 방식: PAYMENT_PROCESSED 이벤트 발행
        const eventData = {
          orderId,
          paymentId: payment.paymentId,
          customerId: payment.customerId,
          amount: payment.amount,
          status: 'SUCCESS',
          transactionId: payment.transactionId,
          items: items, // 재고 서비스를 위한 items 포함
          timestamp: new Date().toISOString()
        };
        console.log(`Publishing PAYMENT_PROCESSED event with items:`, JSON.stringify(items));
        await producer.publish(topics.PAYMENT_PROCESSED, eventData);
      }
      console.log(`Payment confirmed and event published for order ${orderId}`);

      res.json({
        message: 'Payment confirmed successfully',
        payment,
        tossPaymentData
      });
    } catch (error) {
      console.error('Error confirming Toss payment:', error);

      if (
        error?.response?.status === 500 && 
        error?.response?.data?.code === 'FAILED_PAYMENT_INTERNAL_SYSTEM_PROCESSING' &&
        error?.response?.data?.message.includes('[S008] 기존 요청을 처리중입니다.')
      ) {
        return res.status(500).json({
          error: 'Toss payment confirmation failed',
          message: error.response.data.message || 'Internal server error'
        });
      }
      
      // Kafka 이벤트 발행 - 실패 처리
      try {
        const failedOrderId = req.body.orderId;
        // 실패 시에도 Orchestrator service에서 saga 확인
        let failedSagaId = null;
        let failedCustomerId = customerId || 'UNKNOWN';
        let failedSagaData = null;
        
        try {
          const sagaResponse = await axios.get(`http://localhost:3004/api/orchestrator/sagas/order/${failedOrderId}`);
          if (sagaResponse.data) {
            failedSagaData = sagaResponse.data;
            failedSagaId = failedSagaData.sagaId;
            failedCustomerId = failedSagaData.orderData.customerId || failedCustomerId;
          }
        } catch (e) {
          // Saga not found - use choreography
        }
        
        // Prepare failure data
        const failureData = {
          reason: error.response?.data?.message || error.message
        };
        
        // If Toss payment was successful but saving to DB failed, include tossPaymentData
        if (tossPaymentData) {
          failureData.tossPaymentData = {
            paymentId: generatedPaymentId, // Use the pre-generated paymentId
            orderId: failedOrderId,
            customerId: failedCustomerId,
            amount: amount,
            status: tossPaymentData.status, // Indicate Toss success but DB failure
            paymentMethod: tossPaymentData.method || 'CARD',
            transactionId: tossPaymentData.transactionKey,
            tossPaymentKey: paymentKey,
            tossOrderId: failedOrderId,
            receiptUrl: tossPaymentData.receipt?.url,
            processedAt: new Date(),
            tossResponseData: tossPaymentData // Include full Toss response for recovery
          };
        }

        if (failedSagaId) {
          // Orchestration 방식
          await producer.publish(topics.ORCHESTRATOR_REPLY, {
            sagaId: failedSagaId,
            orderId: failedOrderId,
            command: 'PROCESS_PAYMENT',
            status: 'FAILED',
            data: failureData
          });
        } else {
          // Choreography 방식
          await producer.publish(topics.PAYMENT_FAILED, {
            orderId: failedOrderId,
            customerId: failedCustomerId,
            amount: req.body.amount,
            status: 'FAILED',
            reason: failureData.reason,
            timestamp: new Date().toISOString(),
            ...(failureData.tossPaymentData && { tossPaymentData: failureData.tossPaymentData })
          });
        }
      } catch (publishError) {
        console.error('Failed to publish payment failed event:', publishError);
      }
      
      res.status(500).json({ 
        error: 'Failed to confirm payment',
        message: error.response?.data?.message || error.message 
      });
    }
  }

  async createPaymentFromToss(req, res) {
    try {
      const paymentData = req.body;
      console.log('Creating payment from Toss data:', paymentData);
      // Validate required fields
      if (!paymentData.paymentId || !paymentData.orderId || !paymentData.customerId || !paymentData.amount) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['paymentId', 'orderId', 'customerId', 'amount']
        });
      }
      
      // Check if payment already exists
      try {
        const existingPayment = await paymentService.getPayment(paymentData.paymentId);
        if (existingPayment) {
          return res.json({
            message: 'Payment already exists',
            payment: existingPayment,
            created: false
          });
        }
      } catch(error) {
        console.error('Error checking existing payment:', error);
      }
      
      // Create the payment document
      const payment = await paymentService.createPayment({
        paymentId: paymentData.paymentId,
        orderId: paymentData.orderId,
        customerId: paymentData.customerId,
        amount: paymentData.amount,
        status: paymentData.status === 'DONE' ?  'SUCCESS' : (paymentData.status || 'TOSS_SUCCESS_DB_FAILED'),
        paymentMethod: paymentData.paymentMethod || 'CARD',
        transactionId: paymentData.transactionId,
        tossPaymentKey: paymentData.tossPaymentKey,
        tossOrderId: paymentData.tossOrderId,
        receiptUrl: paymentData.receiptUrl,
        processedAt: paymentData.processedAt ? new Date(paymentData.processedAt) : new Date(),
        metadata: {
          createdFrom: 'recovery',
          tossResponseData: paymentData.tossResponseData,
          recoveredAt: new Date()
        }
      });
      
      console.log(`Payment document created from Toss data: ${payment.paymentId}`);
      
      res.status(201).json({
        message: 'Payment created successfully from Toss data',
        payment,
        created: true
      });
    } catch (error) {
      console.error('Error creating payment from Toss data:', error);
      res.status(500).json({
        error: 'Failed to create payment from Toss data',
        message: error.message
      });
    }
  }
}

module.exports = new PaymentController();