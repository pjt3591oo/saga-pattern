#!/bin/bash

echo "Starting all services..."

# Kill any existing Node.js processes on our ports
echo "Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
lsof -ti:3003 | xargs kill -9 2>/dev/null
lsof -ti:3004 | xargs kill -9 2>/dev/null

# Start services in background
echo "Starting Order Service..."
cd services/order-service && npm start > order.log 2>&1 &
echo "Order Service PID: $!"

echo "Starting Payment Service..."
cd services/payment-service && npm start > payment.log 2>&1 &
echo "Payment Service PID: $!"

echo "Starting Inventory Service..."
cd services/inventory-service && npm start > inventory.log 2>&1 &
echo "Inventory Service PID: $!"

echo "Starting Orchestrator Service..."
cd services/orchestrator-service && npm start > orchestrator.log 2>&1 &
echo "Orchestrator Service PID: $!"

echo ""
echo "All services started! Check logs in each service directory."
echo "To stop all services, run: ./stop-services.sh"
echo ""
echo "Service URLs:"
echo "- Order Service: http://localhost:3001/health"
echo "- Payment Service: http://localhost:3002/health"
echo "- Inventory Service: http://localhost:3003/health"
echo "- Orchestrator Service: http://localhost:3004/health"