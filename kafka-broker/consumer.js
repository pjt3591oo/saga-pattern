const { Kafka } = require('kafkajs');
const config = require('./config');

class Consumer {
  constructor(groupId) {
    this.kafka = new Kafka(config.kafka);
    this.consumer = this.kafka.consumer({ 
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    });
    this.connected = false;
    this.handlers = new Map();
  }

  async connect() {
    if (!this.connected) {
      await this.consumer.connect();
      this.connected = true;
      console.log(`Kafka Consumer connected for group: ${this.consumer.groupId}`);
    }
  }

  async subscribe(topics) {
    await this.connect();
    await this.consumer.subscribe({ 
      topics: Array.isArray(topics) ? topics : [topics],
      fromBeginning: false 
    });
    console.log(`Subscribed to topics: ${topics}`);
  }

  registerHandler(topic, handler) {
    this.handlers.set(topic, handler);
  }

  async start() {
    await this.connect();
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const handler = this.handlers.get(topic);
        
        if (!handler) {
          console.log(`No handler registered for topic: ${topic}`);
          return;
        }

        try {
          const payload = JSON.parse(message.value.toString());
          console.log(`Processing message from ${topic}:`, {
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            timestamp: message.timestamp
          });

          await handler({
            topic,
            partition,
            message: {
              ...message,
              key: message.key?.toString(),
              value: payload,
              headers: message.headers
            }
          });
        } catch (error) {
          console.error(`Error processing message from ${topic}:`, error);
          // In production, you might want to send to DLQ or retry
        }
      }
    });
  }

  async disconnect() {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
      console.log('Kafka Consumer disconnected');
    }
  }
}

module.exports = Consumer;