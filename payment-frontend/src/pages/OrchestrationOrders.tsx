import { useEffect, useState } from 'react';
import { orchestratorService } from '../services/api';

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
}

function OrchestrationOrders() {
  const [sagas, setSagas] = useState<Saga[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [retrying, setRetrying] = useState<string | null>(null);

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
      setSagas(response.data.data || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orchestration 주문 내역</h1>
          <p className="text-gray-600">Saga 패턴으로 처리된 주문의 상세 진행 상황을 확인할 수 있습니다</p>
        </div>

        <div className="grid gap-6">
          {sagas.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl shadow-lg">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">Orchestration 주문 내역이 없습니다</p>
              <p className="text-gray-400 mt-2">Orchestration 방식으로 주문을 생성해보세요</p>
            </div>
          ) : (
            sagas.map((saga) => (
              <div key={saga.sagaId} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Saga ID: {saga.sagaId.slice(0, 8)}...
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        주문: {saga.orderId.slice(0, 8)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {saga.orderData.customerId}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(saga.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(saga.status)} shadow-md`}>
                      {saga.status}
                    </span>
                    {(saga.status === 'FAILED' || saga.status === 'COMPENSATED') && (
                      <button
                        onClick={() => handleRetry(saga.sagaId)}
                        disabled={retrying === saga.sagaId}
                        className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {retrying === saga.sagaId ? '재시도 중...' : '재시도'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Saga 진행 단계 */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
                  <h4 className="font-bold text-gray-900 mb-4">처리 단계</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <span>{getStepStatus(saga.stepStatuses, 'CREATE_ORDER')}</span>
                      <span className="text-sm">주문 생성</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{getStepStatus(saga.stepStatuses, 'PROCESS_PAYMENT')}</span>
                      <span className="text-sm">결제 처리</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{getStepStatus(saga.stepStatuses, 'RESERVE_INVENTORY')}</span>
                      <span className="text-sm">재고 예약</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{getStepStatus(saga.stepStatuses, 'COMPLETE_ORDER')}</span>
                      <span className="text-sm">주문 완료</span>
                    </div>
                  </div>
                  {saga.error && (
                    <div className="mt-4 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm text-red-800">
                        <span className="font-semibold">에러:</span> {saga.error}
                      </p>
                    </div>
                  )}
                  {saga.retryCount && saga.retryCount > 0 && (
                    <p className="text-sm text-gray-600 mt-2">재시도 횟수: {saga.retryCount}</p>
                  )}
                </div>

                {/* 주문 상품 */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    주문 상품
                  </h4>
                  <div className="space-y-3">
                    {saga.orderData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center bg-white rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900">{item.productName}</span>
                            <span className="text-gray-500 ml-2">x {item.quantity}</span>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900">
                          ₩{(item.price * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-700">총액</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ₩{saga.orderData.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-4 py-2 bg-white rounded-lg shadow">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrchestrationOrders;