import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import { orderService, orchestratorService } from '../services/api';
import type { Order } from '../types';

const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

export const usePayment = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    if (order?.status === 'PENDING') {
      initializePayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  const fetchOrder = async () => {
    try {
      // 먼저 일반 주문 서비스에서 찾기
      try {
        const response = await orderService.getOrder(orderId!);
        setOrder(response.data);
      } catch (err) {
        // 일반 주문에서 못 찾으면 orchestrator에서 찾기
        console.error('Order not found in order service, trying orchestrator...');
        console.error(err);
        const sagaResponse = await orchestratorService.getSagaByOrderId(orderId!);
        if (sagaResponse.data && sagaResponse.data.orderData) {
          // Saga 데이터를 Order 형식으로 변환
          const sagaOrder: Order = {
            _id: sagaResponse.data.sagaId, // saga ID를 _id로 사용
            orderId: sagaResponse.data.orderId,
            customerId: sagaResponse.data.orderData.customerId,
            items: sagaResponse.data.orderData.items,
            totalAmount: sagaResponse.data.orderData.totalAmount,
            status: 'PENDING', // 결제 페이지에서는 항상 PENDING
            createdAt: sagaResponse.data.createdAt,
            updatedAt: sagaResponse.data.updatedAt
          };
          setOrder(sagaOrder);
        } else {
          throw new Error('Order not found in both services');
        }
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setError('주문 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const initializePayment = async () => {
    try {
      console.log('Initializing payment widget...');
      const paymentWidget = await loadPaymentWidget(clientKey, orderId!);

      // DOM이 준비될 때까지 잠시 대기
      await new Promise(resolve => setTimeout(resolve, 100));

      await paymentWidget.renderPaymentMethods(
        '#payment-widget',
        order!.totalAmount,
        {
          variantKey: 'DEFAULT',
        }
      );

      await paymentWidget.renderAgreement('#agreement', {
        variantKey: 'AGREEMENT',
      });

      // 버튼 클릭 핸들러를 별도 함수로 분리
      const handlePaymentRequest = async () => {
        try {
          const successUrl = `${window.location.origin}/payment/success`;
          const failUrl = `${window.location.origin}/payment/fail`;

          await paymentWidget.requestPayment({
            orderId: orderId!,
            orderName: `주문`,
            customerName: order!.customerId,
            customerEmail: `${order!.customerId}@example.com`,
            successUrl: successUrl,
            failUrl: failUrl,
          });
        } catch (error) {
          console.error('Payment request failed:', error);
          // 사용자에게 에러 메시지 표시
          alert('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
      };

      const payButton = document.getElementById('payment-button');
      if (payButton) {
        // 기존 이벤트 리스너 제거
        const newPayButton = document.getElementById('payment-button');
        newPayButton?.addEventListener('click', handlePaymentRequest);
      }
    } catch (error) {
      console.error('Failed to initialize payment widget:', error);
      setError('결제 위젯을 초기화할 수 없습니다.');
    }
  };

  return {
    order,
    loading,
    error
  };
};