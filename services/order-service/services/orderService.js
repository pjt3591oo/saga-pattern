const Order = require('../models/Order');
const { v4: uuidv4 } = require('uuid');

class OrderService {
  async createOrder(orderData) {
    const orderId = uuidv4();
    
    const order = new Order({
      orderId,
      customerId: orderData.customerId,
      items: orderData.items,
      totalAmount: this.calculateTotal(orderData.items),
      status: 'PENDING'
    });

    await order.save();
    return order;
  }

  async updateOrderStatus(orderId, status, additionalData = {}) {
    const updateData = {
      status,
      updatedAt: new Date(),
      ...additionalData
    };

    const order = await Order.findOneAndUpdate(
      { orderId },
      updateData,
      { new: true }
    );

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    return order;
  }

  async getOrder(orderId) {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order;
  }

  async getAllOrders() {
    return await Order.find().sort({ createdAt: -1 });
  }

  async cancelOrder(orderId, reason) {
    return await this.updateOrderStatus(orderId, 'CANCELLED', {
      failureReason: reason
    });
  }

  calculateTotal(items) {
    return items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }
}

module.exports = new OrderService();