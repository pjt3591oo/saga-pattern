const Inventory = require('../models/Inventory');
const Reservation = require('../models/Reservation');
const { v4: uuidv4 } = require('uuid');

class InventoryService {
  async initializeInventory() {
    // Initialize some sample inventory data
    const sampleProducts = [
      { productId: 'PROD001', productName: 'Laptop', availableQuantity: 50, price: 999.99 },
      { productId: 'PROD002', productName: 'Mouse', availableQuantity: 200, price: 29.99 },
      { productId: 'PROD003', productName: 'Keyboard', availableQuantity: 150, price: 79.99 },
      { productId: 'PROD004', productName: 'Monitor', availableQuantity: 30, price: 299.99 },
      { productId: 'PROD005', productName: 'Headphones', availableQuantity: 100, price: 89.99 }
    ];

    const products = []
    for (const product of sampleProducts) {
      const updated = await Inventory.findOneAndUpdate(
        { productId: product.productId },
        product,
        { upsert: true, new: true }
      );

      products.push(updated);
    }


    console.log('Sample inventory initialized');
    return products
  }

  async reserveInventory(orderData) {
    const reservationId = uuidv4();
    const session = await Inventory.startSession();
    
    try {
      await session.startTransaction();
      
      const reservedItems = [];
      
      // Check and reserve inventory for each item
      for (const item of orderData.items) {
        const inventory = await Inventory.findOne({ productId: item.productId }).session(session);
        
        if (!inventory) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        
        if (!inventory.canReserve(item.quantity)) {
          throw new Error(`Insufficient inventory for product: ${item.productId} (${inventory.productName})`);
        }
        
        inventory.reserve(item.quantity);
        await inventory.save({ session });
        
        reservedItems.push({
          productId: item.productId,
          quantity: item.quantity
        });
      }
      
      // Create reservation record
      const reservation = new Reservation({
        reservationId,
        orderId: orderData.orderId,
        items: reservedItems,
        status: 'RESERVED'
      });
      
      await reservation.save({ session });
      await session.commitTransaction();
      
      return {
        success: true,
        reservationId,
        orderId: orderData.orderId,
        items: reservedItems
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async releaseInventory(orderId) {
    const session = await Inventory.startSession();
    
    try {
      await session.startTransaction();
      
      const reservation = await Reservation.findOne({ orderId, status: 'RESERVED' }).session(session);
      
      if (!reservation) {
        console.log(`No reservation found for order: ${orderId}`);
        return null;
      }
      
      // Release inventory for each item
      for (const item of reservation.items) {
        const inventory = await Inventory.findOne({ productId: item.productId }).session(session);
        
        if (inventory) {
          inventory.release(item.quantity);
          await inventory.save({ session });
        }
      }
      
      // Update reservation status
      reservation.status = 'RELEASED';
      await reservation.save({ session });
      
      await session.commitTransaction();
      
      return reservation;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async getInventory(productId) {
    const inventory = await Inventory.findOne({ productId });
    if (!inventory) {
      throw new Error(`Product not found: ${productId}`);
    }
    return inventory;
  }

  async getAllInventory() {
    return await Inventory.find().sort({ productId: 1 });
  }

  async getReservationsByOrderId(orderId) {
    return await Reservation.findOne({ orderId });
  }

  async updateInventory(productId, updateData) {
    const inventory = await Inventory.findOneAndUpdate(
      { productId },
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );
    
    if (!inventory) {
      throw new Error(`Product not found: ${productId}`);
    }
    
    return inventory;
  }
}

module.exports = new InventoryService();