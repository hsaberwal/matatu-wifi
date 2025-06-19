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
