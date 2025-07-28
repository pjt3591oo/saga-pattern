const orderService = require('../services/orderService');
const { Producer, topics } = require('../../../kafka-broker');

const producer = new Producer();

class OrderController {
  async createOrder(req, res) {
    try {
      const orderData = req.body;
      
      // Validate request
      if (!orderData.customerId || !orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid order data. customerId and items are required.' 
        });
      }

      // Create order
      const order = await orderService.createOrder(orderData);
      
      // Publish ORDER_CREATED event for choreography
      await producer.publish(topics.ORDER_CREATED, {
        orderId: order.orderId,
        customerId: order.customerId,
        items: order.items,
        totalAmount: order.totalAmount,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        message: 'Order created successfully',
        order
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({ 
        error: 'Failed to create order',
        message: error.message 
      });
    }
  }

  async getOrder(req, res) {
    try {
      const { orderId } = req.params;
      const order = await orderService.getOrder(orderId);
      res.json(order);
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(404).json({ 
        error: 'Order not found',
        message: error.message 
      });
    }
  }

  async getAllOrders(req, res) {
    try {
      const orders = await orderService.getAllOrders();
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ 
        error: 'Failed to fetch orders',
        message: error.message 
      });
    }
  }

  async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      
      const order = await orderService.cancelOrder(orderId, reason || 'User requested cancellation');
      
      // Publish ORDER_CANCELLED event
      await producer.publish(topics.ORDER_CANCELLED, {
        orderId: order.orderId,
        reason: reason || 'User requested cancellation',
        timestamp: new Date().toISOString()
      });

      res.json({
        message: 'Order cancelled successfully',
        order
      });
    } catch (error) {
      console.error('Error cancelling order:', error);
      res.status(500).json({ 
        error: 'Failed to cancel order',
        message: error.message 
      });
    }
  }
}

module.exports = new OrderController();