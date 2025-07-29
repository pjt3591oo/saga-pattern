import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../services/api';
import type { Order } from '../types';

export const useChoreographyOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // 5초마다 자동 새로고침
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderService.getAllOrders();
      setOrders(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = (orderId: string) => {
    navigate(`/payment/${orderId}`);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white',
      PAID: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white',
      CONFIRMED: 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white',
      FAILED: 'bg-gradient-to-r from-red-400 to-pink-500 text-white',
      CANCELLED: 'bg-gradient-to-r from-gray-400 to-gray-600 text-white',
      REFUNDED: 'bg-gradient-to-r from-purple-400 to-indigo-500 text-white',
    };
    return badges[status as keyof typeof badges] || 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
  };

  const getStatusIcon = (status: string) => {
    // Return icon class names instead of JSX
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'PAID':
        return 'paid';
      case 'FAILED':
        return 'failed';
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      PENDING: '결제 대기',
      PAID: '결제 완료',
      CONFIRMED: '주문 확정',
      FAILED: '주문 실패',
      CANCELLED: '주문 취소',
      REFUNDED: '환불 완료',
    };
    return statusMap[status] || status;
  };

  return {
    orders,
    loading,
    handlePayment,
    getStatusBadge,
    getStatusIcon,
    getStatusText
  };
};