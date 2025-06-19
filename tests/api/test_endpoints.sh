#!/bin/bash
# API endpoint testing

echo "Testing API endpoints..."

# Test auth request
echo "1. Testing /api/auth/request"
curl -X POST http://localhost/api/auth/request \
    -H "Content-Type: application/json" \
    -d '{"mac":"AA:BB:CC:DD:EE:FF","ip":"10.10.10.100","userAgent":"TestDevice"}'

# Test ad selection
echo -e "\n2. Testing /api/ads/next"
curl "http://localhost/api/ads/next?session=test-session&macAddress=AA:BB:CC:DD:EE:FF"

# Test health endpoints
echo -e "\n3. Testing health endpoints"
curl http://localhost/health
curl http://localhost:5000/health

echo -e "\nAPI tests complete"
