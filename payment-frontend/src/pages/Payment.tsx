import { useEffect, useState } from 'react';
import { useParams, } from 'react-router-dom';
import { loadPaymentWidget } from '@tosspayments/payment-widget-sdk';
import { orderService, orchestratorService } from '../services/api';
import type { Order } from '../types';

const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;

function Payment() {
  const { orderId } = useParams<{ orderId: string }>();
  // const [searchParams] = useSearchParams();
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
        // payButton.replaceWith(payButton.cloneNode(true));
        const newPayButton = document.getElementById('payment-button');
        newPayButton?.addEventListener('click', handlePaymentRequest);
      }
    } catch (error) {
      console.error('Failed to initialize payment widget:', error);
      setError('결제 위젯을 초기화할 수 없습니다.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">오류</h1>
          <p className="text-gray-600">{error || '주문을 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  if (order.status !== 'PENDING') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">결제 불가</h1>
          <p className="text-gray-600">
            이 주문은 이미 처리되었습니다. (상태: {order.status})
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">결제하기</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">주문 정보</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">주문번호:</span> {order.orderId}
            </p>
            <p>
              <span className="font-medium">고객 ID:</span> {order.customerId}
            </p>
            <div className="border-t pt-3 mt-3">
              <h3 className="font-medium mb-2">주문 상품</h3>
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between py-2">
                  <span>
                    {item.productName} x {item.quantity}
                  </span>
                  <span>₩{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>총 결제금액</span>
                <span>₩{order.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div id="payment-widget" className="mb-4"></div>
          <div id="agreement" className="mb-4"></div>
          
          <button
            id="payment-button"
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            ₩{order.totalAmount.toLocaleString()} 결제하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default Payment;