export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  _id?: string;
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  paymentId: string;
  orderId: string;
  customerId: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
  paymentMethod: string;
  transactionId?: string;
  failureReason?: string;
  tossPaymentKey?: string;
  tossOrderId?: string;
  receiptUrl?: string;
  processedAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  _id: string;
  productId: string;
  productName: string;
  availableQuantity: number;
  reservedQuantity: number;
  price: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  availableQuantity: number;
  price: number;
  maxQuantity: number;
}