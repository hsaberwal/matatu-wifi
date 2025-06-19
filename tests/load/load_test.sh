#!/bin/bash
# Load testing script for Matatu WiFi

echo "Load Testing - Simulating multiple users"

# Simulate 10 concurrent users
for i in {1..10}; do
    MAC=$(printf "AA:BB:CC:DD:EE:%02X" $i)
    echo "Testing user $i with MAC: $MAC"
    
    curl -X POST http://localhost/api/auth/request \
        -H "Content-Type: application/json" \
        -d "{\"mac\":\"$MAC\",\"ip\":\"10.10.10.$i\",\"userAgent\":\"LoadTest$i\"}" &
done

wait
echo "Load test complete"
