#!/bin/bash

echo "Initializing MongoDB Replica Sets..."

# Function to wait for MongoDB to be ready
wait_for_mongo() {
    local host=$1
    local port=$2
    echo "Waiting for $host:$port to be ready..."
    until mongosh --host $host --port $port --eval "db.adminCommand('ping')" &>/dev/null; do
        echo "Waiting for MongoDB at $host:$port..."
        sleep 2
    done
    echo "$host:$port is ready!"
}

# Wait for all MongoDB instances to be ready
wait_for_mongo mongodb-order 27017
wait_for_mongo mongodb-payment 27017
wait_for_mongo mongodb-inventory 27017
wait_for_mongo mongodb-orchestrator 27017

# Initialize Order DB Replica Set
echo "Initializing Order DB Replica Set..."
mongosh --host mongodb-order:27017 --eval "
if (rs.status().ok != 1) {
  rs.initiate({
    _id: 'rs-order',
    members: [
      { _id: 0, host: 'mongodb-order:27017' }
    ]
  });
} else {
  print('Replica set rs-order already initialized');
}
"

# Initialize Payment DB Replica Set
echo "Initializing Payment DB Replica Set..."
mongosh --host mongodb-payment:27017 --eval "
if (rs.status().ok != 1) {
  rs.initiate({
    _id: 'rs-payment',
    members: [
      { _id: 0, host: 'mongodb-payment:27017' }
    ]
  });
} else {
  print('Replica set rs-payment already initialized');
}
"

# Initialize Inventory DB Replica Set
echo "Initializing Inventory DB Replica Set..."
mongosh --host mongodb-inventory:27017 --eval "
if (rs.status().ok != 1) {
  rs.initiate({
    _id: 'rs-inventory',
    members: [
      { _id: 0, host: 'mongodb-inventory:27017' }
    ]
  });
} else {
  print('Replica set rs-inventory already initialized');
}
"

# Initialize Orchestrator DB Replica Set
echo "Initializing Orchestrator DB Replica Set..."
mongosh --host mongodb-orchestrator:27017 --eval "
if (rs.status().ok != 1) {
  rs.initiate({
    _id: 'rs-orchestrator',
    members: [
      { _id: 0, host: 'mongodb-orchestrator:27017' }
    ]
  });
} else {
  print('Replica set rs-orchestrator already initialized');
}
"

echo "All MongoDB Replica Sets initialized successfully!"