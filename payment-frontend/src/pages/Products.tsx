import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryService, orderService, orchestratorService } from '../services/api';
import type { Inventory, CartItem } from '../types';

function Products() {
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

      if (useOrchestration) {
        // Orchestration 방식
        await orchestratorService.createOrder(orderData);
      } else {
        // Choreography 방식
        await orderService.createOrder(orderData);
      }
      
      setCart([]); // 카트 비우기
      navigate('/orders'); // 주문 목록으로 이동
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('주문 생성에 실패했습니다.');
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">상품 목록</h1>
          <p className="text-gray-600">원하는 상품을 선택하여 장바구니에 담아보세요</p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 상품 목록 */}
        <div className="lg:col-span-2">
          <div className="grid gap-4">
            {inventory.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">상품이 없습니다.</p>
              </div>
            ) : (
              inventory.map((product) => {
                const availableQuantity = product.availableQuantity;
                const cartItem = cart.find(item => item.productId === product.productId);
                
                return (
                  <div key={product.productId} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900">{product.productName}</h3>
                        {product.description && (
                          <p className="text-sm text-gray-600 mt-2">{product.description}</p>
                        )}
                        <div className="mt-4">
                          <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            ₩{product.price.toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            재고: {availableQuantity}개
                          </span>
                          {product.reservedQuantity > 0 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              예약: {product.reservedQuantity}개
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        {cartItem ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(product.productId, cartItem.availableQuantity - 1, availableQuantity)}
                              className="w-10 h-10 rounded-xl bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 flex items-center justify-center font-bold text-gray-700 transition-all duration-200 shadow-sm"
                            >
                              -
                            </button>
                            <span className="w-14 text-center font-bold text-lg">{cartItem.availableQuantity}</span>
                            <button
                              onClick={() => updateQuantity(product.productId, cartItem.availableQuantity + 1, availableQuantity)}
                              disabled={cartItem.availableQuantity >= availableQuantity}
                              className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 flex items-center justify-center font-bold text-white transition-all duration-200 shadow-sm disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            disabled={availableQuantity <= 0}
                            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-105"
                          >
                            {availableQuantity > 0 ? '카트에 담기' : '품절'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 카트 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-xl p-8 sticky top-8 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">장바구니</h2>
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                고객 ID
              </label>
              <input
                type="text"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <p className="text-gray-500">카트가 비어있습니다</p>
                <p className="text-sm text-gray-400 mt-2">원하는 상품을 선택해주세요</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item.productId} className="group bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{item.productName}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            ₩{item.price.toLocaleString()} x {item.availableQuantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-gray-900">
                            ₩{(item.price * item.availableQuantity).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                          >
                            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-gray-200 pt-6">
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium text-gray-700">총 금액</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        ₩{getTotalAmount().toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => handleCreateOrder(false)}
                      disabled={orderLoading || cart.length === 0}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-105 flex items-center justify-center gap-3"
                    >
                      {orderLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          주문 처리 중...
                        </span>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          Choreography 방식으로 주문
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleCreateOrder(true)}
                      disabled={orderLoading || cart.length === 0}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transform hover:scale-105 flex items-center justify-center gap-3"
                    >
                      {orderLoading ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          주문 처리 중...
                        </span>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          Orchestration 방식으로 주문
                        </>
                      )}
                    </button>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">Choreography</span>: 이벤트 기반 분산 처리<br/>
                        <span className="font-semibold">Orchestration</span>: 중앙 오케스트레이터 제어
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Products;