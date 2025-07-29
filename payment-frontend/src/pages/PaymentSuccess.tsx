import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { orderService, paymentService } from '../services/api';
import type { Order, Payment } from '../types';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = searchParams.get('orderId');
  const paymentKey = searchParams.get('paymentKey');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (orderId && paymentKey && amount) {
      confirmPaymentAndFetchData();
    }
  }, [orderId, paymentKey, amount]);

  const confirmPaymentAndFetchData = async () => {
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
      const [orderRes, paymentRes] = await Promise.all([
        orderService.getOrder(orderId!),
        paymentService.getPaymentByOrderId(orderId!),
      ]);
      setOrder(orderRes.data);
      setPayment(paymentRes.data);
    } catch (error) {
      console.error('Failed to confirm payment or fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <svg
                  className="w-14 h-14 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">결제 성공!</h1>
              <p className="text-lg text-gray-600">결제가 성공적으로 완료되었습니다</p>
            </div>

            {order && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">주문 정보</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white rounded-xl p-4">
                    <span className="font-medium text-gray-600">주문번호</span>
                    <span className="font-bold text-gray-900">{order.orderId.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between items-center bg-white rounded-xl p-4">
                    <span className="font-medium text-gray-600">결제금액</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ₩{order.totalAmount.toLocaleString()}
                    </span>
                  </div>
                  {payment && (
                    <>
                      <div className="flex justify-between items-center bg-white rounded-xl p-4">
                        <span className="font-medium text-gray-600">결제수단</span>
                        <span className="font-bold text-gray-900">{payment.paymentMethod}</span>
                      </div>
                      {payment.tossPaymentKey && (
                        <div className="flex justify-between items-center bg-white rounded-xl p-4">
                          <span className="font-medium text-gray-600">결제키</span>
                          <span className="font-mono text-sm text-gray-700">{payment.tossPaymentKey.slice(0, 20)}...</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Link
                to="/"
                className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold rounded-xl transition-all duration-200 transform hover:scale-105"
              >
                계속 쇼핑하기
              </Link>
              <Link
                to="/orders"
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                주문 내역 보기
              </Link>
              {payment?.receiptUrl && (
                <a
                  href={payment.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  영수증 보기
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentSuccess;