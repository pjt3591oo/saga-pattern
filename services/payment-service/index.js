require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Consumer, topics, consumerGroups } = require('../../kafka-broker');
const paymentRoutes = require('./routes/paymentRoutes');
const paymentEventHandler = require('./events/paymentEventHandler');
const orchestratorHandler = require('./events/orchestratorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', paymentRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'payment-service',
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
const consumer = new Consumer(consumerGroups.PAYMENT_SERVICE);

async function startConsumer() {
  try {
    // Subscribe to topics
    await consumer.subscribe([
      topics.ORDER_CREATED,
      topics.ORDER_CANCELLED,
      topics.INVENTORY_FAILED,
      topics.ORCHESTRATOR_SAGA
    ]);

    // Register event handlers
    consumer.registerHandler(topics.ORDER_CREATED, paymentEventHandler.handleOrderCreated.bind(paymentEventHandler));
    consumer.registerHandler(topics.ORDER_CANCELLED, paymentEventHandler.handleOrderCancelled.bind(paymentEventHandler));
    consumer.registerHandler(topics.INVENTORY_FAILED, paymentEventHandler.handleInventoryFailed.bind(paymentEventHandler));
    consumer.registerHandler(topics.ORCHESTRATOR_SAGA, orchestratorHandler.handleOrchestratorCommand.bind(orchestratorHandler));

    // Start consuming
    await consumer.start();
    console.log('Payment service consumer started');
  } catch (error) {
    console.error('Error starting consumer:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
  startConsumer();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down payment service...');
  await consumer.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});