import { useSearchParams, Link } from 'react-router-dom';

function PaymentFail() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const message = searchParams.get('message');
  const orderId = searchParams.get('orderId');

  const getErrorMessage = (code: string | null) => {
    const errorMessages: { [key: string]: string } = {
      PAY_PROCESS_CANCELED: '사용자가 결제를 취소했습니다.',
      PAY_PROCESS_ABORTED: '결제가 중단되었습니다.',
      REJECT_CARD_COMPANY: '카드사에서 결제를 거부했습니다.',
      INVALID_CARD_NUMBER: '유효하지 않은 카드 번호입니다.',
      INVALID_CARD_EXPIRY: '카드 유효기간이 올바르지 않습니다.',
      INVALID_CARD_CVC: 'CVC 번호가 올바르지 않습니다.',
      EXCEED_MAX_AMOUNT: '결제 한도를 초과했습니다.',
      EXCEED_MAX_DAILY_AMOUNT: '일일 결제 한도를 초과했습니다.',
      EXCEED_MAX_MONTHLY_AMOUNT: '월 결제 한도를 초과했습니다.',
    };

    return errorMessages[code || ''] || message || '결제 처리 중 오류가 발생했습니다.';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">결제 실패</h1>
            <p className="text-gray-600">{getErrorMessage(code)}</p>
          </div>

          {(code || orderId) && (
            <div className="border-t pt-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">오류 정보</h2>
              <div className="text-left space-y-2">
                {orderId && (
                  <p>
                    <span className="font-medium">주문번호:</span> {orderId}
                  </p>
                )}
                {code && (
                  <p>
                    <span className="font-medium">오류 코드:</span> {code}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Link
              to="/orders"
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition"
            >
              주문 목록으로
            </Link>
            {orderId && (
              <Link
                to={`/payment/${orderId}`}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
              >
                다시 시도
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentFail;