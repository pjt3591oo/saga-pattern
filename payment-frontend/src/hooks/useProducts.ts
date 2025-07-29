import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryService, orderService, orchestratorService } from '../services/api';
import type { Inventory, CartItem } from '../types';

export const useProducts = () => {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerId, setCustomerId] = useState('CUST001');
  const [orderLoading, setOrderLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await inventoryService.getAllInventory();
      setInventory(response.data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
      // 재고 데이터가 없으면 초기화
      try {
        await inventoryService.initializeInventory();
        const retryResponse = await inventoryService.getAllInventory();
        setInventory(retryResponse.data);
      } catch (initError) {
        console.error('Failed to initialize inventory:', initError);
      }
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Inventory) => {
    const existingItem = cart.find(item => item.productId === product.productId);
    
    if (existingItem) {
      // 이미 카트에 있으면 수량 증가
      updateQuantity(product.productId, existingItem.availableQuantity + 1, product.availableQuantity - product.reservedQuantity);
    } else {
      // 새로 추가
      setCart([...cart, {
        productId: product.productId,
        productName: product.productName,
        availableQuantity: 1,
        price: product.price,
        maxQuantity: product.availableQuantity
      }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number, maxQuantity: number) => {
    if (newQuantity <= 0) {
      // 수량이 0이면 카트에서 제거
      setCart(cart.filter(item => item.productId !== productId));
    } else if (newQuantity <= maxQuantity) {
      // 재고 범위 내에서 수량 업데이트
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, availableQuantity: newQuantity }
          : item
      ));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.availableQuantity), 0);
  };

  const handleCreateOrder = async (useOrchestration: boolean = false) => {
    if (cart.length === 0) {
      alert('카트가 비어있습니다.');
      return;
    }

    setOrderLoading(true);
    try {
      const orderData = {
        customerId,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.availableQuantity,
          price: item.price
        }))
      };

      let response;
      if (useOrchestration) {
        // Orchestration 방식
        response = await orchestratorService.createOrder(orderData);
      } else {
        // Choreography 방식
        response = await orderService.createOrder(orderData);
      }
      
      setCart([]); // 카트 비우기
      
      // 생성된 주문 ID로 결제 페이지로 이동
      const orderId = response.data.orderId || response.data.order?.orderId;
      if (orderId) {
        navigate(`/payment/${orderId}`);
      } else {
        console.error('Order ID not found in response:', response.data);
        alert('주문 생성은 완료했지만 결제 페이지로 이동할 수 없습니다.');
      }
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('주문 생성에 실패했습니다.');
    } finally {
      setOrderLoading(false);
    }
  };

  return {
    inventory,
    cart,
    loading,
    customerId,
    orderLoading,
    setCustomerId,
    addToCart,
    updateQuantity,
    removeFromCart,
    getTotalAmount,
    handleCreateOrder
  };
};