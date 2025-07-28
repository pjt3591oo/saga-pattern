#!/bin/bash

echo "=== Saga Pattern Test Scenarios ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Base URLs
ORDER_SERVICE="http://localhost:3001"
PAYMENT_SERVICE="http://localhost:3002"
INVENTORY_SERVICE="http://localhost:3003"
ORCHESTRATOR_SERVICE="http://localhost:3004"

# Function to print section headers
print_section() {
    echo ""
    echo -e "${YELLOW}=== $1 ===${NC}"
    echo ""
}

# Function to wait
wait_for() {
    echo "Waiting $1 seconds for processing..."
    sleep $1
}

# Initialize inventory
print_section "Initializing Inventory"
curl -X POST ${INVENTORY_SERVICE}/api/inventory/initialize
echo ""
wait_for 2

# Show initial inventory
print_section "Current Inventory Status"
curl ${INVENTORY_SERVICE}/api/inventory | jq '.'
wait_for 2

# Test 1: Successful order (Choreography)
print_section "Test 1: Successful Order - Choreography Pattern"
echo "Creating order for 2 Laptops..."
ORDER_RESPONSE=$(curl -s -X POST ${ORDER_SERVICE}/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST001",
    "items": [
      {
        "productId": "PROD001",
        "productName": "Laptop",
        "quantity": 2,
        "price": 999.99
      }
    ]
  }')

ORDER_ID=$(echo $ORDER_RESPONSE | jq -r '.order.orderId')
echo "Order created with ID: $ORDER_ID"
wait_for 3

# Check order status
echo ""
echo "Order Status:"
curl -s ${ORDER_SERVICE}/api/orders/${ORDER_ID} | jq '.status'

# Check payment status
echo ""
echo "Payment Status:"
curl -s ${PAYMENT_SERVICE}/api/payments/order/${ORDER_ID} | jq '.status'

# Check inventory
echo ""
echo "Updated Inventory for PROD001:"
curl -s ${INVENTORY_SERVICE}/api/inventory/PROD001 | jq '{productId, availableQuantity, reservedQuantity}'
wait_for 2

# Test 2: Failed payment (will trigger compensation)
print_section "Test 2: Order with Payment Failure - Compensation Test"
echo "Creating multiple orders to trigger payment failures..."

for i in {1..5}; do
    echo "Attempt $i:"
    curl -s -X POST ${ORDER_SERVICE}/api/orders \
      -H "Content-Type: application/json" \
      -d '{
        "customerId": "CUST002",
        "items": [
          {
            "productId": "PROD002",
            "productName": "Mouse",
            "quantity": 1,
            "price": 29.99
          }
        ]
      }' | jq '.message'
    sleep 1
done

wait_for 3
echo ""
echo "Check order statuses (some should be FAILED due to payment failure):"
curl -s ${ORDER_SERVICE}/api/orders | jq '.[] | {orderId, status, failureReason}'
wait_for 2

# Test 3: Inventory shortage
print_section "Test 3: Inventory Shortage - Compensation Test"
echo "Creating order for 100 Monitors (exceeds available inventory)..."

LARGE_ORDER=$(curl -s -X POST ${ORDER_SERVICE}/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST003",
    "items": [
      {
        "productId": "PROD004",
        "productName": "Monitor",
        "quantity": 100,
        "price": 299.99
      }
    ]
  }')

LARGE_ORDER_ID=$(echo $LARGE_ORDER | jq -r '.order.orderId')
echo "Large order created with ID: $LARGE_ORDER_ID"
wait_for 3

echo ""
echo "Order Status (should be FAILED):"
curl -s ${ORDER_SERVICE}/api/orders/${LARGE_ORDER_ID} | jq '{orderId, status, failureReason}'

echo ""
echo "Payment Status (should be REFUNDED if payment was successful):"
curl -s ${PAYMENT_SERVICE}/api/payments/order/${LARGE_ORDER_ID} | jq '{orderId, status}'
wait_for 2

# Test 4: Order cancellation
print_section "Test 4: Order Cancellation"
echo "Creating an order to cancel..."

CANCEL_ORDER=$(curl -s -X POST ${ORDER_SERVICE}/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST004",
    "items": [
      {
        "productId": "PROD005",
        "productName": "Headphones",
        "quantity": 1,
        "price": 89.99
      }
    ]
  }')

CANCEL_ORDER_ID=$(echo $CANCEL_ORDER | jq -r '.order.orderId')
echo "Order created with ID: $CANCEL_ORDER_ID"
wait_for 2

echo ""
echo "Cancelling order..."
curl -X POST ${ORDER_SERVICE}/api/orders/${CANCEL_ORDER_ID}/cancel \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer changed mind"}'
wait_for 2

echo ""
echo "Cancelled Order Status:"
curl -s ${ORDER_SERVICE}/api/orders/${CANCEL_ORDER_ID} | jq '{orderId, status, failureReason}'
wait_for 2

# Test 5: Orchestration pattern
print_section "Test 5: Orchestration Pattern"
echo "Creating order through Orchestrator..."

SAGA_RESPONSE=$(curl -s -X POST ${ORCHESTRATOR_SERVICE}/api/orchestrator/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST005",
    "items": [
      {
        "productId": "PROD003",
        "productName": "Keyboard",
        "quantity": 3,
        "price": 79.99
      }
    ]
  }')

SAGA_ID=$(echo $SAGA_RESPONSE | jq -r '.sagaId')
echo "Saga started with ID: $SAGA_ID"
wait_for 3

echo ""
echo "Saga Status:"
curl -s ${ORCHESTRATOR_SERVICE}/api/orchestrator/sagas/${SAGA_ID} | jq '{sagaId, status, currentStep, steps}'

# Show pagination example
echo ""
echo "All Sagas (Page 1, Limit 5):"
curl -s "${ORCHESTRATOR_SERVICE}/api/orchestrator/sagas?page=1&limit=5" | jq '{
  data: [.data[] | {sagaId, status, createdAt}],
  pagination
}'

# Show status filter example
echo ""
echo "Failed and Compensated Sagas:"
curl -s "${ORCHESTRATOR_SERVICE}/api/orchestrator/sagas?status[]=FAILED&status[]=COMPENSATED&limit=10" | jq '{
  data: [.data[] | {sagaId, status}],
  totalCount: .pagination.totalCount
}'

# Test 6: Saga Retry
print_section "Test 6: Saga Retry (Orchestration)"
echo "Getting failed sagas..."
FAILED_SAGAS=$(curl -s "${ORCHESTRATOR_SERVICE}/api/orchestrator/sagas?status=FAILED&limit=1" | jq '.data[0]')

if [ "$FAILED_SAGAS" != "null" ] && [ ! -z "$FAILED_SAGAS" ]; then
    FAILED_SAGA_ID=$(echo $FAILED_SAGAS | jq -r '.sagaId')
    echo "Found failed saga: $FAILED_SAGA_ID"
    echo "Retrying saga..."
    
    RETRY_RESPONSE=$(curl -s -X POST ${ORCHESTRATOR_SERVICE}/api/orchestrator/sagas/${FAILED_SAGA_ID}/retry)
    echo "Retry response:"
    echo $RETRY_RESPONSE | jq '.'
    
    wait_for 3
    echo ""
    echo "Saga status after retry:"
    curl -s ${ORCHESTRATOR_SERVICE}/api/orchestrator/sagas/${FAILED_SAGA_ID} | jq '{sagaId, status, currentStep, retryHistory}'
else
    echo "No failed sagas found to retry"
fi

# Final summary
print_section "Final Summary"
echo "All Orders:"
curl -s ${ORDER_SERVICE}/api/orders | jq '.[] | {orderId, status, totalAmount}'

echo ""
echo "All Payments:"
curl -s ${PAYMENT_SERVICE}/api/payments | jq '.[] | {paymentId, orderId, status, amount}'

echo ""
echo "Current Inventory:"
curl -s ${INVENTORY_SERVICE}/api/inventory | jq '.[] | {productId, productName, availableQuantity, reservedQuantity}'

echo ""
echo -e "${GREEN}=== Test Scenarios Completed ===${NC}"