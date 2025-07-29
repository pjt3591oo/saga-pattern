import { useState, useEffect } from 'react';
import { orchestratorService, paymentService } from '../services/api';

interface Saga {
  sagaId: string;
  orderId: string;
  status: string;
  currentStep: string;
  orderData: {
    customerId: string;
    totalAmount: number;
    items: Array<{
      productId: string;
      productName: string;
      quantity: number;
      price: number;
    }>;
  };
  stepStatuses?: {
    [key: string]: string;
  };
  error?: string;
  retryCount?: number;
  createdAt: string;
  updatedAt: string;
  paymentId?: string;
}

interface Payment {
  paymentId: string;
  orderId: string;
  status: string;
  amount: number;
}

export const useOrchestrationOrders = () => {
  const [sagas, setSagas] = useState<Saga[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [payments, setPayments] = useState<{ [orderId: string]: Payment }>({});

  useEffect(() => {
    fetchSagas();
    const interval = setInterval(fetchSagas, 5000); // 5초마다 자동 새로고침
    return () => clearInterval(interval);
  }, [page]);

  const fetchSagas = async () => {
    try {
      console.log('Fetching sagas with page:', page);
      const response = await orchestratorService.getAllSagas({ page, limit: 10 });
      console.log('Sagas response:', response.data);
      const sagasData = response.data.data || [];
      setSagas(sagasData);
      setTotalPages(response.data.pagination?.totalPages || 1);
      
      // Fetch payment information for each saga
      const paymentPromises = sagasData.map(async (saga: Saga) => {
        if (saga.paymentId || saga.orderId) {
          try {
            const paymentResponse = await paymentService.getPaymentByOrderId(saga.orderId);
            return { orderId: saga.orderId, payment: paymentResponse.data };
          } catch (error) {
            console.error(`Failed to fetch payment for order ${saga.orderId}:`, error);
            return null;
          }
        }
        return null;
      });
      
      const paymentResults = await Promise.all(paymentPromises);
      const paymentsMap: { [orderId: string]: Payment } = {};
      paymentResults.forEach(result => {
        if (result && result.payment) {
          paymentsMap[result.orderId] = result.payment;
        }
      });
      setPayments(paymentsMap);
    } catch (error) {
      console.error('Failed to fetch sagas:', error);
      setSagas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (sagaId: string) => {
    setRetrying(sagaId);
    try {
      await orchestratorService.retrySaga(sagaId);
      await fetchSagas(); // 새로고침
    } catch (error) {
      console.error('Failed to retry saga:', error);
      alert('재시도에 실패했습니다.');
    } finally {
      setRetrying(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      STARTED: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white',
      PAYMENT_PROCESSING: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
      PAYMENT_COMPLETED: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white',
      INVENTORY_RESERVING: 'bg-gradient-to-r from-purple-400 to-pink-500 text-white',
      INVENTORY_RESERVED: 'bg-gradient-to-r from-teal-400 to-green-500 text-white',
      COMPLETED: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
      COMPENSATING: 'bg-gradient-to-r from-orange-400 to-red-500 text-white',
      COMPENSATED: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white',
      FAILED: 'bg-gradient-to-r from-red-500 to-pink-600 text-white',
    };
    return badges[status] || 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
  };

  const getStepStatus = (stepStatuses: { [key: string]: string } | undefined, step: string) => {
    if (!stepStatuses) return '⏳';
    const status = stepStatuses[step];
    if (status === 'SUCCESS') return '✅';
    if (status === 'FAILED') return '❌';
    if (status === 'COMPENSATED') return '↩️';
    return '⏳';
  };

  return {
    sagas,
    loading,
    page,
    totalPages,
    retrying,
    payments,
    setPage,
    handleRetry,
    getStatusBadge,
    getStepStatus
  };
};