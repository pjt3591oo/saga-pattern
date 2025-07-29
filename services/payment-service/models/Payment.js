const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true
  },
  customerId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED', 'TOSS_SUCCESS_DB_FAILED'],
    default: 'PENDING'
  },
  paymentMethod: {
    type: String,
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PAYPAL', 'BANK_TRANSFER', 'CARD', 'VIRTUAL_ACCOUNT', 'MOBILE_PHONE', 'EASY_PAY', '간편결제', '카드', '가상계좌', '휴대폰', '계좌이체', '문화상품권', '도서문화상품권', '게임문화상품권'],
    default: 'CARD'
  },
  transactionId: String,
  failureReason: String,
  tossPaymentKey: String,
  tossOrderId: String,
  receiptUrl: String,
  processedAt: Date,
  refundedAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);