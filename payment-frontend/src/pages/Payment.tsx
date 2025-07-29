import { usePayment } from '../hooks/usePayment';

function Payment() {
  const { order, loading, error } = usePayment();

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