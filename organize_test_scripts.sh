#!/bin/bash
# Script to organize all test scripts in proper directories

echo "Organizing test scripts..."

# 1. Setup and deployment scripts go in deployment/scripts/
echo "Moving deployment scripts..."
mv start_testing.sh deployment/scripts/
mv create_test_videos.sh deployment/scripts/
mv rename_views.sh deployment/scripts/ 2>/dev/null || true
mv git_setup.sh deployment/scripts/

# 2. Create test data directory
mkdir -p tests/test-data

# 3. Move SQL test data to tests
cp services/database/seeds/test_data.sql tests/test-data/

# 4. Create a main test runner in the root
cat > run_tests.sh << 'EOF'
#!/bin/bash
# Main test runner script

echo "Matatu WiFi - Test Runner"
echo "========================"

# Check if we're in the project root
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Display test options
echo ""
echo "Available test commands:"
echo "1. Setup and start all services:"
echo "   ./deployment/scripts/start_testing.sh"
echo ""
echo "2. Create test video files:"
echo "   ./deployment/scripts/create_test_videos.sh"
echo ""
echo "3. Run unit tests:"
echo "   docker-compose run --rm portal npm test"
echo "   docker-compose run --rm ad-service pytest"
echo ""
echo "4. Run integration tests:"
echo "   ./tests/integration/run_integration_tests.sh"
echo ""
echo "5. Load test data:"
echo "   docker exec -i matatu-mysql mysql -u root -p < tests/test-data/test_data.sql"
echo ""

# If argument provided, run that test
case "$1" in
    setup)
        ./deployment/scripts/start_testing.sh
        ;;
    unit)
        echo "Running unit tests..."
        docker-compose run --rm portal npm test
        docker-compose run --rm ad-service pytest
        ;;
    integration)
        echo "Running integration tests..."
        ./tests/integration/run_integration_tests.sh
        ;;
    load-data)
        echo "Loading test data..."
        docker exec -i matatu-mysql mysql -u root -p$MYSQL_ROOT_PASSWORD < tests/test-data/test_data.sql
        ;;
    *)
        echo "Usage: ./run_tests.sh [setup|unit|integration|load-data]"
        ;;
esac
EOF

chmod +x run_tests.sh

# 5. Create integration test runner
mkdir -p tests/integration
cat > tests/integration/run_integration_tests.sh << 'EOF'
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
EOF

chmod +x tests/integration/run_integration_tests.sh

# 6. Create load testing script
mkdir -p tests/load
cat > tests/load/load_test.sh << 'EOF'
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
EOF

chmod +x tests/load/load_test.sh

# 7. Create MikroTik testing directory
mkdir -p tests/mikrotik
cp config/mikrotik/*.rsc tests/mikrotik/

# 8. Create API testing collection
mkdir -p tests/api
cat > tests/api/test_endpoints.sh << 'EOF'
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
EOF

chmod +x tests/api/test_endpoints.sh

echo ""
echo "Test scripts organized!"
echo ""
echo "Directory structure:"
echo "==================="
echo "tests/"
echo "├── api/              # API endpoint tests"
echo "│   └── test_endpoints.sh"
echo "├── e2e/              # End-to-end tests"
echo "├── integration/      # Integration tests"
echo "│   └── run_integration_tests.sh"
echo "├── load/             # Load/performance tests"
echo "│   └── load_test.sh"
echo "├── mikrotik/         # MikroTik config tests"
echo "│   └── *.rsc"
echo "├── test-data/        # Test data files"
echo "│   └── test_data.sql"
echo "└── unit/             # Unit tests"
echo ""
echo "deployment/scripts/   # Setup and deployment scripts"
echo "├── start_testing.sh"
echo "├── create_test_videos.sh"
echo "├── git_setup.sh"
echo "└── ..."
echo ""
echo "Root directory:"
echo "├── run_tests.sh      # Main test runner"
echo ""
echo "To run tests: ./run_tests.sh [setup|unit|integration|load-data]"
