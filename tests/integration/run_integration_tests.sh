#!/bin/bash
# Integration tests for Matatu WiFi

echo "Running integration tests..."

# Test 1: Health checks
echo "Test 1: Service health checks"
curl -f http://localhost/health || echo "Portal health check failed"
curl -f http://localhost:5000/health || echo "Ad service health check failed"

# Test 2: Authentication flow
echo "Test 2: Authentication flow"
# Add integration test logic here

echo "Integration tests complete"
