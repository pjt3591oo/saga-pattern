require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { Consumer, topics, consumerGroups } = require('../../kafka-broker');
const orchestratorRoutes = require('./routes/orchestratorRoutes');
const sagaOrchestrator = require('./services/sagaOrchestrator');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Enable array query parameters
app.set('query parser', 'extended');

// Routes
app.use('/api', orchestratorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'orchestrator-service',
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
const consumer = new Consumer(consumerGroups.ORCHESTRATOR_SERVICE);

async function startConsumer() {
  try {
    // Subscribe to reply topic
    await consumer.subscribe(topics.ORCHESTRATOR_REPLY);

    // Register event handler for replies
    consumer.registerHandler(topics.ORCHESTRATOR_REPLY, async (payload) => {
      try {
        await sagaOrchestrator.handleReply(payload.message.value);
      } catch (error) {
        console.error('Error handling orchestrator reply:', error);
      }
    });

    // Start consuming
    await consumer.start();
    console.log('Orchestrator service consumer started');
  } catch (error) {
    console.error('Error starting consumer:', error);
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Orchestrator service running on port ${PORT}`);
  startConsumer();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down orchestrator service...');
  await consumer.disconnect();
  await mongoose.connection.close();
  process.exit(0);
});