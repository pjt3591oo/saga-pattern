require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Consumer, topics, consumerGroups } = require('../../kafka-broker');
const inventoryRoutes = require('./routes/inventoryRoutes');
const inventoryEventHandler = require('./events/inventoryEventHandler');
const orchestratorHandler = require('./events/orchestratorHandler');
const inventoryService = require('./services/inventoryService');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', inventoryRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'inventory-service',
    timestamp: new Date().toISOString()
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB');
  // Initialize sample inventory on startup
  await inventoryService.initializeInventory();
})
.catch(err => console.error('MongoDB connection error:', err));

// Kafka consumer setup
const consumer = new Consumer(consumerGroups.INVENTORY_SERVICE);

async function startConsumer() {
  try {
    // Subscribe to topics
    await consumer.subscribe([
      topics.PAYMENT_PROCESSED,
      topics.ORDER_CANCELLED,
      topics.ORCHESTRATOR_SAGA
    ]);

    // Register event handlers
    consumer.registerHandler(topics.PAYMENT_PROCESSED, inventoryEventHandler.handlePaymentProcessed.bind(inventoryEventHandler));
    consumer.registerHandler(topics.ORDER_CANCELLED, inventoryEventHandler.handleOrderCancelled.bind(inventoryEventHandler));
    consumer.registerHandler(topics.ORCHESTRATOR_SAGA, orchestratorHandler.handleOrchestratorCommand.bind(orchestratorHandler));

    // Start consuming
    await consumer.start();
    console.log('Inventory service consumer started');
  } catch (error) {
    console.error('Error starting consumer:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Inventory service running on port ${PORT}`);
  startConsumer();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down inventory service...');
  await consumer.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});