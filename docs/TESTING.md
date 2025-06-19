# Testing Guide for Matatu WiFi System

## Overview

This guide covers all testing procedures for the Matatu WiFi system, including unit tests, integration tests, load testing, and manual testing procedures.

## Test Organization

```
tests/
├── api/              # API endpoint tests
├── e2e/              # End-to-end tests  
├── integration/      # Integration tests
├── load/             # Performance tests
├── mikrotik/         # Router config tests
├── test-data/        # Test data and fixtures
└── unit/             # Unit tests

deployment/scripts/   # Setup and utility scripts
```

## Quick Start

From the project root, run:

```bash
# Setup and start all services
./run_tests.sh setup

# Run all unit tests
./run_tests.sh unit

# Run integration tests
./run_tests.sh integration

# Load test data
./run_tests.sh load-data
```

## Types of Tests

### 1. Unit Tests

Unit tests for individual components:

#### Portal (Node.js)
```bash
# Run all portal tests
docker-compose run --rm portal npm test

# Run specific test suite
docker-compose run --rm portal npm test -- --grep "auth"
```

#### Ad Service (Python)
```bash
# Run all ad service tests
docker-compose run --rm ad-service pytest

# Run with coverage
docker-compose run --rm ad-service pytest --cov=src
```

### 2. Integration Tests

Test interactions between services:

```bash
# Run integration test suite
./tests/integration/run_integration_tests.sh

# Test specific flow
./tests/integration/test_auth_flow.sh
```

### 3. API Tests

Test all API endpoints:

```bash
# Test all endpoints
./tests/api/test_endpoints.sh

# Test specific endpoint
curl -X POST http://localhost/api/auth/request \
  -H "Content-Type: application/json" \
  -d '{"mac":"AA:BB:CC:DD:EE:FF","ip":"10.10.10.100"}'
```

### 4. Load Tests

Simulate multiple concurrent users:

```bash
# Run load test with 10 users
./tests/load/load_test.sh

# Custom load test
for i in {1..50}; do
  ./tests/load/single_user_test.sh &
done
```

### 5. End-to-End Tests

Test complete user flows:

```bash
# Run E2E test suite
./tests/e2e/test_user_journey.py

# Test specific scenario
./tests/e2e/test_session_expiry.py
```

## Manual Testing Procedures

### 1. Portal Flow Test

1. Open browser to http://localhost
2. Append MAC parameters: `?mac=AA:BB:CC:DD:EE:FF&ip=10.10.10.100`
3. Click "Connect to WiFi"
4. Verify redirect to ad page
5. Watch ad (or wait for skip button)
6. Click "Continue to WiFi"
7. Verify redirect to success page
8. Check 15-minute countdown

### 2. Admin Interface Test

1. Navigate to http://localhost/admin
2. Check dashboard statistics
3. Click "Upload New Ad"
4. Upload a test video file
5. Verify ad appears in list
6. Test activate/deactivate functionality

### 3. Session Expiry Test

1. Complete authentication flow
2. Note session ID from success page
3. Wait 15 minutes (or modify database)
4. Verify session expires
5. Check redirect to portal

### 4. MikroTik Integration Test

1. Configure MikroTik with test scripts
2. Connect device to WiFi
3. Verify redirect to portal
4. Complete authentication
5. Test internet access
6. Verify bandwidth limits (2 Mbps)

## Test Data

### Loading Test Data

```bash
# Load sample advertisers and ads
docker exec -i matatu-mysql mysql -u root -p < tests/test-data/test_data.sql

# Create test video files
./deployment/scripts/create_test_videos.sh
```

### Test User Accounts

| MAC Address | Purpose |
|-------------|---------|
| AA:BB:CC:DD:EE:01 | Regular user test |
| AA:BB:CC:DD:EE:02 | Session expiry test |
| AA:BB:CC:DD:EE:03 | Multiple session test |
| AA:BB:CC:DD:EE:99 | Load testing |

## Debugging Tests

### View Logs

```bash
# All service logs
docker-compose logs -f

# Specific service
docker-compose logs -f portal
docker-compose logs -f ad-service

# Filter by time
docker-compose logs --since 5m
```

### Database Queries

```bash
# Connect to MySQL
docker exec -it matatu-mysql mysql -u matatu_user -p

# Check active sessions
SELECT * FROM user_sessions WHERE status='active';

# View recent ad impressions
SELECT * FROM ad_impressions ORDER BY impression_time DESC LIMIT 10;
```

### Redis Debugging

```bash
# Connect to Redis
docker exec -it matatu-redis redis-cli

# List all keys
KEYS *

# Get session data
GET session:AA:BB:CC:DD:EE:FF
```

## Performance Benchmarks

Expected performance metrics:

- Portal response time: < 200ms
- Ad selection: < 100ms
- Authentication complete: < 500ms
- Concurrent users: 100+
- Memory usage: < 512MB per service

## Continuous Integration

For CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build containers
        run: docker-compose build
      - name: Run tests
        run: |
          docker-compose up -d
          ./run_tests.sh unit
          ./run_tests.sh integration
      - name: Cleanup
        run: docker-compose down -v
```

## Troubleshooting Tests

### Common Issues

1. **Port conflicts**: Ensure ports 80, 3000, 5000 are free
2. **Database connection**: Check MySQL is running and accessible
3. **Redis connection**: Verify Redis is running
4. **File permissions**: Ensure scripts are executable

### Reset Test Environment

```bash
# Complete reset
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d

# Reload test data
./run_tests.sh load-data
```
