require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Consumer, topics, consumerGroups } = require('../../kafka-broker');
const orderRoutes = require('./routes/orderRoutes');
const orderEventHandler = require('./events/orderEventHandler');
const orchestratorHandler = require('./events/orchestratorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', orderRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'order-service',
    timestamp: new Date().toISOString()
  });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Kafka consumer setup
const consumer = new Consumer(consumerGroups.ORDER_SERVICE);

async function startConsumer() {
  try {
    // Subscribe to topics
    await consumer.subscribe([
      topics.PAYMENT_PROCESSED,
      topics.PAYMENT_FAILED,
      topics.INVENTORY_RESERVED,
      topics.INVENTORY_FAILED,
      topics.ORCHESTRATOR_SAGA
    ]);

    // Register event handlers
    consumer.registerHandler(topics.PAYMENT_PROCESSED, orderEventHandler.handlePaymentProcessed.bind(orderEventHandler));
    consumer.registerHandler(topics.PAYMENT_FAILED, orderEventHandler.handlePaymentFailed.bind(orderEventHandler));
    consumer.registerHandler(topics.INVENTORY_RESERVED, orderEventHandler.handleInventoryReserved.bind(orderEventHandler));
    consumer.registerHandler(topics.INVENTORY_FAILED, orderEventHandler.handleInventoryFailed.bind(orderEventHandler));
    consumer.registerHandler(topics.ORCHESTRATOR_SAGA, orchestratorHandler.handleOrchestratorCommand.bind(orchestratorHandler));

    // Start consuming
    await consumer.start();
    console.log('Order service consumer started');
  } catch (error) {
    console.error('Error starting consumer:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
  startConsumer();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down order service...');
  await consumer.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});