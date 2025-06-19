#!/bin/bash
# Script to rename HTML files to EJS

cd services/portal/views/

# Rename files if they exist
[ -f "index.html" ] && mv index.html index.ejs
[ -f "ad.html" ] && mv ad.html ad.ejs
[ -f "success.html" ] && mv success.html success.ejs
[ -f "error.html" ] && mv error.html error.ejs

# Create missing views
cat > terms.ejs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Terms of Service - Matatu WiFi</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <h1>Terms of Service</h1>
        <p>By using Matatu WiFi, you agree to these terms...</p>
        <a href="/" class="btn btn-primary">Back to Home</a>
    </div>
</body>
</html>
EOF

cat > privacy.ejs << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Privacy Policy - Matatu WiFi</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>
    <div class="container">
        <h1>Privacy Policy</h1>
        <p>We respect your privacy...</p>
        <a href="/" class="btn btn-primary">Back to Home</a>
    </div>
</body>
</html>
EOF

echo "Views renamed to EJS format"
