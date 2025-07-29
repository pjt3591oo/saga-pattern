import axios from 'axios';

const ORDER_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const PAYMENT_API_BASE_URL = 'http://localhost:3002';
const INVENTORY_API_BASE_URL = 'http://localhost:3003';
const ORCHESTRATOR_API_BASE_URL = 'http://localhost:3004';

const orderApi = axios.create({
  baseURL: ORDER_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const paymentApi = axios.create({
  baseURL: PAYMENT_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const inventoryApi = axios.create({
  baseURL: INVENTORY_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const orchestratorApi = axios.create({
  baseURL: ORCHESTRATOR_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const orderService = {
  getAllOrders: () => orderApi.get('/api/orders'),
  getOrder: (orderId: string) => orderApi.get(`/api/orders/${orderId}`),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createOrder: (data: any) => orderApi.post('/api/orders', data),
  cancelOrder: (orderId: string) => orderApi.post(`/api/orders/${orderId}/cancel`),
};

export const paymentService = {
  getAllPayments: () => paymentApi.get('/api/payments'),
  getPayment: (paymentId: string) => paymentApi.get(`/api/payments/${paymentId}`),
  getPaymentByOrderId: (orderId: string) => paymentApi.get(`/api/payments/order/${orderId}`),
  refundPayment: (orderId: string) => paymentApi.post(`/api/payments/order/${orderId}/refund`),
  confirmPayment: (data: { paymentKey: string; orderId: string; amount: number }) =>
    paymentApi.post('/api/payments/confirm', data),
};

export const inventoryService = {
  initializeInventory: () => inventoryApi.post('/api/inventory/initialize'),
  getAllInventory: () => inventoryApi.get('/api/inventory'),
  getInventory: (productId: string) => inventoryApi.get(`/api/inventory/${productId}`),
  updateInventory: (productId: string, data: { quantity: number }) =>
    inventoryApi.put(`/api/inventory/${productId}`, data),
  getReservation: (orderId: string) => inventoryApi.get(`/api/reservations/order/${orderId}`),
};

export const orchestratorService = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createOrder: (data: any) => orchestratorApi.post('/api/orchestrator/orders', data),
  getAllSagas: (params?: { page?: number; limit?: number; status?: string[] }) =>
    orchestratorApi.get('/api/orchestrator/sagas', { params }),
  getSaga: (sagaId: string) => orchestratorApi.get(`/api/orchestrator/sagas/${sagaId}`),
  getSagaByOrderId: (orderId: string) => orchestratorApi.get(`/api/orchestrator/sagas/order/${orderId}`),
  retrySaga: (sagaId: string) => orchestratorApi.post(`/api/orchestrator/sagas/${sagaId}/retry`),
};

export default orderApi;