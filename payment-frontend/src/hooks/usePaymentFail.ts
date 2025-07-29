import { useSearchParams } from 'react-router-dom';

export const usePaymentFail = () => {
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

  return {
    code,
    message,
    orderId,
    getErrorMessage
  };
};