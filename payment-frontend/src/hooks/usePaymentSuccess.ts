import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderService, paymentService, orchestratorService } from '../services/api';
import type { Order, Payment } from '../types';

export const usePaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOrchestration, setIsOrchestration] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const orderId = searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (orderId && paymentKey && amount) {
      confirmPaymentAndFetchData();
    }
  }, [orderId, paymentKey, amount]);

  const confirmPaymentAndFetchData = async () => {
    console.log('confirmPaymentAndFetchData')
    // 이미 확인 중이면 리턴
    if (isConfirming) {
      console.log('Already confirming payment, skipping duplicate call');
      return;
    }
    
    setIsConfirming(true);
    
    try {
      // 먼저 결제 확인 요청
      if (paymentKey && orderId && amount) {
        await paymentService.confirmPayment({
          paymentKey,
          orderId,
          amount: parseInt(amount)
        });
      }

      // 그 다음 주문과 결제 정보 조회
      try {
        const [orderRes, paymentRes] = await Promise.all([
          orderService.getOrder(orderId!),
          paymentService.getPaymentByOrderId(orderId!),
        ]);
        setOrder(orderRes.data);
        setPayment(paymentRes.data);
      } catch (error) {
        // Choreography에서 못 찾으면 Orchestration에서 찾기
        console.log('Trying to fetch from orchestrator...');
        console.log(error)
        const sagaRes = await orchestratorService.getSagaByOrderId(orderId!);
        if (sagaRes.data && sagaRes.data.orderData) {
          const sagaOrder: Order = {
            orderId: sagaRes.data.orderId,
            customerId: sagaRes.data.orderData.customerId,
            items: sagaRes.data.orderData.items,
            totalAmount: sagaRes.data.orderData.totalAmount,
            status: sagaRes.data.status === 'COMPLETED' ? 'COMPLETED' : 
                    sagaRes.data.status === 'FAILED' ? 'FAILED' : 'PENDING',
            createdAt: sagaRes.data.createdAt,
            updatedAt: sagaRes.data.updatedAt
          };
          setOrder(sagaOrder);
          setIsOrchestration(true);
          
          // Orchestration 주문의 경우에도 결제 정보 조회
          const paymentRes = await paymentService.getPaymentByOrderId(orderId!);
          setPayment(paymentRes.data);
        }
      }
    } catch (error) {
      console.error('Failed to confirm payment or fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    order,
    payment,
    loading,
    isOrchestration
  };
};