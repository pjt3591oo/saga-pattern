const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true
  },
  productName: {
    type: String,
    required: true
  },
  availableQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  reservedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  price: {
    type: Number,
    required: true
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

inventorySchema.methods.canReserve = function(quantity) {
  return this.availableQuantity >= quantity;
};

inventorySchema.methods.reserve = function(quantity) {
  if (!this.canReserve(quantity)) {
    throw new Error(`Insufficient inventory for product ${this.productId}`);
  }
  this.availableQuantity -= quantity;
  this.reservedQuantity += quantity;
};

inventorySchema.methods.release = function(quantity) {
  this.availableQuantity += quantity;
  this.reservedQuantity = Math.max(0, this.reservedQuantity - quantity);
};

module.exports = mongoose.model('Inventory', inventorySchema);