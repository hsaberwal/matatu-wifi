# Check Ad Service
echo -n "Ad Service: "
curl -s http://localhost:5000/health > /dev/null && echo "OK" || echo "FAILED"#!/bin/bash
# Complete setup and testing script for Matatu WiFi

echo "================================================"
echo "Matatu WiFi System - Setup and Testing Script"
echo "================================================"
echo ""

# Step 1: Rename view files
echo "Step 1: Preparing view files..."
cd services/portal/views/
for file in *.html; do
    if [ -f "$file" ]; then
        mv "$file" "${file%.html}.ejs"
        echo "Renamed $file to ${file%.html}.ejs"
    fi
done
cd ../../../

# Step 2: Create missing view files
echo ""
echo "Step 2: Creating missing view files..."
cat > services/portal/views/terms.ejs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Terms of Service - Matatu WiFi</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>Terms of Service</h1>
            <p>By using Matatu WiFi services, you agree to the following terms:</p>
            <ul>
                <li>The service is provided "as-is" without warranties</li>
                <li>15-minute sessions after watching advertisements</li>
                <li>Bandwidth limited to 2 Mbps per user</li>
                <li>No illegal activities permitted</li>
                <li>We collect anonymized usage statistics</li>
            </ul>
            <a href="/" class="btn btn-primary">Back to Home</a>
        </div>
    </div>
</body>
</html>
EOF

cat > services/portal/views/privacy.ejs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - Matatu WiFi</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <div class="card">
            <h1>Privacy Policy</h1>
            <p>Your privacy is important to us:</p>
            <ul>
                <li>We collect MAC addresses for session management</li>
                <li>No personal information is required</li>
                <li>Usage data is anonymized</li>
                <li>We do not sell your data</li>
                <li>Cookies used for session management only</li>
            </ul>
            <a href="/" class="btn btn-primary">Back to Home</a>
        </div>
    </div>
</body>
</html>
EOF

# Ensure JavaScript files exist with content
echo ""
echo "Creating JavaScript files..."
# The JS files should already exist from the artifacts, but let's ensure they're in place
if [ ! -f "services/portal/public/js/main.js" ]; then
    echo "Warning: main.js not found. Please ensure it's created from the artifact."
fi
if [ ! -f "services/portal/public/js/adPlayer.js" ]; then
    echo "Warning: adPlayer.js not found. Please ensure it's created from the artifact."
fi

# Step 3: Create test videos
echo ""
echo "Step 3: Creating test video placeholders..."
chmod +x create_test_videos.sh
./create_test_videos.sh

# Step 4: Build Docker images
echo ""
echo "Step 4: Building Docker images..."
docker-compose build

# Step 5: Start services
echo ""
echo "Step 5: Starting services..."
docker-compose up -d

# Wait for services to start
echo ""
echo "Waiting for services to initialize..."
sleep 10

# Step 6: Check service health
echo ""
echo "Step 6: Checking service health..."
echo ""
echo "Service Status:"
echo "---------------"
docker-compose ps

echo ""
echo "Health Checks:"
echo "--------------"
# Check MySQL
echo -n "MySQL: "
docker exec matatu-mysql mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} 2>/dev/null && echo "OK" || echo "FAILED"

# Check Redis
echo -n "Redis: "
docker exec matatu-redis redis-cli ping 2>/dev/null && echo "OK" || echo "FAILED"

# Check Portal
echo -n "Portal: "
curl -s http://localhost:3000/health > /dev/null && echo "OK" || echo "FAILED"

# Check Nginx
echo -n "Nginx: "
curl -s http://localhost/health > /dev/null && echo "OK" || echo "FAILED"

# Step 7: Load test data
echo ""
echo "Step 7: Loading test data..."
docker exec -i matatu-mysql mysql -u root -p${MYSQL_ROOT_PASSWORD:-rootpassword} < services/database/seeds/test_data.sql

# Step 8: Test RADIUS
echo ""
echo "Step 8: Testing RADIUS..."
docker exec matatu-radius radtest testuser testpass localhost 0 testing123 || echo "RADIUS test user not configured yet"

# Step 9: Display access information
echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Access Points:"
echo "--------------"
echo "Portal:     http://localhost (or http://YOUR_SERVER_IP)"
echo "Admin:      http://localhost/admin"
echo "Upload Ads: http://localhost/admin/upload"
echo ""
echo "Test URLs:"
echo "----------"
echo "Portal:     http://localhost/?mac=AA:BB:CC:DD:EE:FF&ip=10.10.10.100"
echo "Health:     http://localhost/health"
echo ""
echo "Logs:"
echo "-----"
echo "View all logs:    docker-compose logs -f"
echo "Portal logs:      docker-compose logs -f portal"
echo "Ad service logs:  docker-compose logs -f ad-service"
echo "RADIUS logs:      docker-compose logs -f freeradius"
echo ""
echo "Stop services:    docker-compose down"
echo "================================================"
