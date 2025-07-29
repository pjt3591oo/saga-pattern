import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import Products from './pages/Products'
import Choreography from './pages/ChoreographyOrders'
import OrchestrationOrders from './pages/OrchestrationOrders'
import Payment from './pages/Payment'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFail from './pages/PaymentFail'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-lg sticky top-0 z-50 backdrop-blur-lg bg-white/90">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-12">
                <Link to="/" className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">멍개의 쇼핑몰</h1>
                </Link>
                <div className="flex gap-2">
                  <Link 
                    to="/" 
                    className="px-6 py-3 rounded-xl font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 transition-all duration-200"
                  >
                    상품 목록
                  </Link>
                  {/* <Link 
                    to="/choreography-orders" 
                    className="px-6 py-3 rounded-xl font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 transition-all duration-200"
                  >
                    Choreography 주문 내역
                  </Link> */}
                  <Link 
                    to="/orchestration-orders" 
                    className="px-6 py-3 rounded-xl font-semibold text-gray-700 hover:text-white hover:bg-gradient-to-r hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                  >
                    Orchestration 주문 내역
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Products />} />
          <Route path="/choreography-orders" element={<Choreography />} />
          <Route path="/orchestration-orders" element={<OrchestrationOrders />} />
          <Route path="/payment/:orderId" element={<Payment />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/fail" element={<PaymentFail />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App