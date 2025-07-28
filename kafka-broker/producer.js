const { Kafka } = require('kafkajs');
const config = require('./config');

class Producer {
  constructor() {
    this.kafka = new Kafka(config.kafka);
    this.producer = this.kafka.producer();
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      await this.producer.connect();
      this.connected = true;
      console.log('Kafka Producer connected');
    }
  }

  async publish(topic, message, key = null) {
    await this.connect();
    
    const record = {
      topic,
      messages: [{
        key: key ? key.toString() : null,
        value: JSON.stringify(message),
        headers: {
          timestamp: Date.now().toString(),
          eventType: topic
        }
      }]
    };

    try {
      const result = await this.producer.send(record);
      console.log(`Message published to ${topic}:`, result);
      return result;
    } catch (error) {
      console.error(`Error publishing to ${topic}:`, error);
      throw error;
    }
  }

  async publishBatch(topic, messages) {
    await this.connect();
    
    const record = {
      topic,
      messages: messages.map(msg => ({
        key: msg.key ? msg.key.toString() : null,
        value: JSON.stringify(msg.value),
        headers: {
          timestamp: Date.now().toString(),
          eventType: topic
        }
      }))
    };

    try {
      const result = await this.producer.send(record);
      console.log(`Batch published to ${topic}:`, result);
      return result;
    } catch (error) {
      console.error(`Error publishing batch to ${topic}:`, error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
      console.log('Kafka Producer disconnected');
    }
  }
}

module.exports = Producer;