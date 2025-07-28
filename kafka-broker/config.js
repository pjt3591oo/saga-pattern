module.exports = {
  kafka: {
    clientId: 'saga-app',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    connectionTimeout: 3000,
    retry: {
      initialRetryTime: 100,
      retries: 8
    }
  },
  topics: {
    // Choreography events
    ORDER_CREATED: 'order.created',
    ORDER_CANCELLED: 'order.cancelled',
    PAYMENT_PROCESSED: 'payment.processed',
    PAYMENT_FAILED: 'payment.failed',
    INVENTORY_RESERVED: 'inventory.reserved',
    INVENTORY_FAILED: 'inventory.failed',
    INVENTORY_RELEASED: 'inventory.released',
    
    // Orchestration commands
    ORCHESTRATOR_SAGA: 'orchestrator.saga',
    ORCHESTRATOR_REPLY: 'orchestrator.reply'
  },
  consumerGroups: {
    ORDER_SERVICE: 'order-service-group',
    PAYMENT_SERVICE: 'payment-service-group',
    INVENTORY_SERVICE: 'inventory-service-group',
    ORCHESTRATOR_SERVICE: 'orchestrator-service-group'
  }
};