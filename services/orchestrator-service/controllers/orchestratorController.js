const sagaOrchestrator = require('../services/sagaOrchestrator');

class OrchestratorController {
  async createOrder(req, res) {
    try {
      const orderData = req.body;
      // Validate request
      if (!orderData.customerId || !orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ 
          error: 'Invalid order data. customerId and items are required.' 
        });
      }

      // Start saga
      const saga = await sagaOrchestrator.startSaga(orderData);
      
      res.status(201).json({
        message: 'Order processing started',
        sagaId: saga.sagaId,
        orderId: saga.orderId,
        status: saga.status
      });
    } catch (error) {
      console.error('Error starting saga:', error);
      res.status(500).json({ 
        error: 'Failed to start order processing',
        message: error.message 
      });
    }
  }

  async getSaga(req, res) {
    try {
      const { sagaId } = req.params;
      const saga = await sagaOrchestrator.getSaga(sagaId);
      
      if (!saga) {
        return res.status(404).json({ 
          error: 'Saga not found',
          sagaId 
        });
      }
      
      res.json(saga);
    } catch (error) {
      console.error('Error fetching saga:', error);
      res.status(500).json({ 
        error: 'Failed to fetch saga',
        message: error.message 
      });
    }
  }

  async getSagaByOrderId(req, res) {
    try {
      const { orderId } = req.params;
      const saga = await sagaOrchestrator.getSagaByOrderId(orderId);
      
      if (!saga) {
        return res.status(404).json({ 
          error: 'Saga not found for order',
          orderId 
        });
      }
      
      res.json(saga);
    } catch (error) {
      console.error('Error fetching saga by order ID:', error);
      res.status(500).json({ 
        error: 'Failed to fetch saga',
        message: error.message 
      });
    }
  }

  async getAllSagas(req, res) {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const sortBy = req.query.sortBy || 'createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      
      // Parse status parameter as array
      let statusArray = [];
      if (req.query.status) {
        statusArray = Array.isArray(req.query.status) ? req.query.status : [req.query.status];
      }
      
      const result = await sagaOrchestrator.getAllSagas({
        page,
        limit,
        statusArray,
        sortBy,
        sortOrder
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching sagas:', error);
      res.status(500).json({ 
        error: 'Failed to fetch sagas',
        message: error.message 
      });
    }
  }

  async retrySaga(req, res) {
    try {
      const { sagaId } = req.params;
      const saga = await sagaOrchestrator.retrySaga(sagaId);
      
      res.json({
        message: 'Saga retry initiated',
        sagaId: saga.sagaId,
        status: saga.status,
        currentStep: saga.currentStep
      });
    } catch (error) {
      console.error('Error retrying saga:', error);
      res.status(400).json({ 
        error: 'Failed to retry saga',
        message: error.message 
      });
    }
  }
}

module.exports = new OrchestratorController();