#!/bin/bash
# Git setup script for Matatu WiFi project

echo "Setting up Git repository for Matatu WiFi..."

# Initialize git repository
git init

# Add all files (respecting .gitignore)
git add .

# Create initial commit
git commit -m "Initial commit: Matatu WiFi System

- Complete Docker-based infrastructure
- FreeRADIUS server for authentication
- Node.js portal with captive portal support
- MySQL database schema
- MikroTik configuration scripts
- Nginx reverse proxy setup
- Redis for session management

Components included:
- Portal: Authentication, session management, ad display
- Database: User sessions, ad impressions, analytics
- RADIUS: MAC-based authentication, 15-minute sessions
- Infrastructure: Docker Compose, monitoring setup

TODO:
- Ad service implementation (Python/Flask)
- Client-side JavaScript completion
- Monitoring dashboards
- Production deployment scripts"

# Show status
echo ""
echo "Git repository initialized!"
echo ""
git status

echo ""
echo "Repository Summary:"
echo "=================="
git log --oneline
echo ""
echo "Files tracked:"
git ls-files | wc -l
echo ""
echo "Repository size:"
du -sh .git

echo ""
echo "Next steps:"
echo "1. Create a repository on GitHub/GitLab"
echo "2. Add remote: git remote add origin <your-repo-url>"
echo "3. Push code: git push -u origin main"
