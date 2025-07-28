const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  reservationId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true
  },
  items: [{
    productId: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true
    }
  }],
  status: {
    type: String,
    enum: ['RESERVED', 'RELEASED', 'FAILED'],
    default: 'RESERVED'
  },
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

module.exports = mongoose.model('Reservation', reservationSchema);