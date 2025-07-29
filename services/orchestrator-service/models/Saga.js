const mongoose = require('mongoose');

const sagaSchema = new mongoose.Schema({
  sagaId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['STARTED', 'PAYMENT_PROCESSING', 'PAYMENT_COMPLETED', 
           'INVENTORY_RESERVING', 'INVENTORY_RESERVED', 'COMPLETED', 
           'COMPENSATING', 'COMPENSATED', 'FAILED'],
    default: 'STARTED'
  },
  currentStep: {
    type: String,
    enum: ['CREATE_ORDER', 'PROCESS_PAYMENT', 'RESERVE_INVENTORY', 'COMPLETE_ORDER', 'COMPENSATE', 'COMPLETED'],
    default: 'CREATE_ORDER'
  },
  steps: [{
    name: String,
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'COMPENSATED']
    },
    startedAt: Date,
    completedAt: Date,
    error: String,
    data: mongoose.Schema.Types.Mixed
  }],
  orderData: {
    customerId: String,
    items: [{
      productId: String,
      productName: String,
      quantity: Number,
      price: Number
    }],
    totalAmount: Number
  },
  paymentId: String,
  reservationId: String,
  compensationReason: String,
  tossPaymentData: mongoose.Schema.Types.Mixed,
  retryHistory: [{
    retryAt: {
      type: Date,
      default: Date.now
    },
    fromStep: String,
    result: String,
    error: String
  }],
  lastRetryAt: Date,
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

module.exports = mongoose.model('Saga', sagaSchema);