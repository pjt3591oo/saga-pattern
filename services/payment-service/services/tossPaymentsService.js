const axios = require('axios');

const TOSS_API_BASE_URL = 'https://api.tosspayments.com/v1';
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || 'test_sk_D4yKeq5bgrpKRd0JYbLpGX0lzW6Y';

// Base64 인코딩된 인증 헤더 생성
const authHeader = `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`;

const tossPaymentsAPI = axios.create({
  baseURL: TOSS_API_BASE_URL,
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  }
});

class TossPaymentsService {
  // 결제 승인
  async confirmPayment(paymentKey, orderId, amount) {
    try {
      const response = await tossPaymentsAPI.post(`/payments/${paymentKey}`, {
        orderId,
        amount
      });
      return response.data;
    } catch (error) {
      console.error('Toss payment confirmation error:', error.response?.data || error);
      throw error;
    }
  }

  // 결제 조회
  async getPayment(paymentKey) {
    try {
      const response = await tossPaymentsAPI.get(`/payments/${paymentKey}`);
      return response.data;
    } catch (error) {
      console.error('Toss payment inquiry error:', error.response?.data || error);
      throw error;
    }
  }

  // 결제 취소
  async cancelPayment(paymentKey, cancelReason) {
    try {
      const response = await tossPaymentsAPI.post(`/payments/${paymentKey}/cancel`, {
        cancelReason: cancelReason || '고객 요청'
      });
      return response.data;
    } catch (error) {
      console.error('Toss payment cancellation error:', error.response?.data || error);
      throw error;
    }
  }

  // 결제 부분 취소
  async partialCancelPayment(paymentKey, cancelAmount, cancelReason) {
    try {
      const response = await tossPaymentsAPI.post(`/payments/${paymentKey}/cancel`, {
        cancelAmount,
        cancelReason: cancelReason || '고객 요청'
      });
      return response.data;
    } catch (error) {
      console.error('Toss partial cancellation error:', error.response?.data || error);
      throw error;
    }
  }
}

module.exports = new TossPaymentsService();