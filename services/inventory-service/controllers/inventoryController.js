const inventoryService = require('../services/inventoryService');

class InventoryController {
  async getInventory(req, res) {
    try {
      const { productId } = req.params;
      const inventory = await inventoryService.getInventory(productId);
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(404).json({ 
        error: 'Product not found',
        message: error.message 
      });
    }
  }

  async getAllInventory(req, res) {
    try {
      const inventory = await inventoryService.getAllInventory();
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ 
        error: 'Failed to fetch inventory',
        message: error.message 
      });
    }
  }

  async updateInventory(req, res) {
    try {
      const { productId } = req.params;
      const updateData = req.body;
      
      const inventory = await inventoryService.updateInventory(productId, updateData);
      res.json({
        message: 'Inventory updated successfully',
        inventory
      });
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({ 
        error: 'Failed to update inventory',
        message: error.message 
      });
    }
  }

  async getReservation(req, res) {
    try {
      const { orderId } = req.params;
      const reservation = await inventoryService.getReservationsByOrderId(orderId);
      
      if (!reservation) {
        return res.status(404).json({ 
          error: 'Reservation not found for order',
          orderId 
        });
      }
      
      res.json(reservation);
    } catch (error) {
      console.error('Error fetching reservation:', error);
      res.status(500).json({ 
        error: 'Failed to fetch reservation',
        message: error.message 
      });
    }
  }

  async initializeInventory(req, res) {
    try {
      const products = await inventoryService.initializeInventory();
      res.json({
        message: 'Inventory initialized successfully',
        products
      });
    } catch (error) {
      console.error('Error initializing inventory:', error);
      res.status(500).json({ 
        error: 'Failed to initialize inventory',
        message: error.message 
      });
    }
  }
}

module.exports = new InventoryController();