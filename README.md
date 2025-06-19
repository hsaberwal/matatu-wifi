# Matatu WiFi System

A free WiFi system for matatus (public transport vehicles) that provides internet access to passengers after watching a 30-second advertisement.

## Overview

The system consists of:
- **MikroTik Router**: Provides WiFi hotspot and redirects users to captive portal
- **FreeRADIUS Server**: Manages user authentication and 15-minute sessions
- **Web Portal**: Captive portal for user interaction and ad display
- **Ad Service**: Manages ad inventory and rotation
- **MySQL Database**: Stores user sessions, ad impressions, and statistics
- **Redis**: Session management and caching
- **Nginx**: Reverse proxy and load balancer

## Features

- ✅ MAC-based authentication
- ✅ 15-minute free WiFi sessions after watching ads
- ✅ Ad rotation and targeting
- ✅ Comprehensive analytics and reporting
- ✅ Device detection and profiling
- ✅ Bandwidth management (2 Mbps per user)
- ✅ Docker-based deployment for scalability
- ✅ MikroTik integration with RADIUS

## Quick Start

### Prerequisites

- Docker and Docker Compose
- MikroTik RouterOS device
- Linux server with at least 4GB RAM

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/matatu-wifi.git
cd matatu-wifi
```

2. Copy and configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start the services:
```bash
docker-compose up -d
```

4. Configure your MikroTik router:
```bash
# Upload and run the configuration script
/import file=hotspot_setup.rsc
/import file=radius_config.rsc
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   MikroTik  │────▶│    Nginx     │────▶│   Portal    │
│   Router    │     │ Load Balancer│     │   (Node.js) │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                          │
       │                                          ▼
       ▼                                   ┌─────────────┐
┌─────────────┐                           │  Ad Service │
│ FreeRADIUS  │                           │   (Python)  │
└─────────────┘                           └─────────────┘
       │                                          │
       ▼                                          ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│    MySQL    │────▶│    Redis     │◀────│ Statistics  │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Configuration

### MikroTik Setup

1. Configure WiFi interface and hotspot
2. Set up RADIUS authentication
3. Configure walled garden for portal access
4. Apply bandwidth limits

### Portal Configuration

Edit `services/portal/src/config.js` or use environment variables:

- `WIFI_SESSION_DURATION_MINUTES`: Session length (default: 15)
- `AD_DURATION_SECONDS`: Ad length (default: 30)
- `WIFI_BANDWIDTH_LIMIT_MBPS`: Speed limit (default: 2)

### Ad Service Configuration

Upload ads through the admin interface at `http://your-server/admin`

## API Documentation

### Authentication Endpoints

- `POST /api/auth/request` - Request new session
- `POST /api/auth/complete` - Complete authentication after ad
- `GET /api/auth/status/:sessionId` - Check session status
- `POST /api/auth/disconnect` - End session

### Ad Endpoints

- `GET /api/ads/next` - Get next ad to display
- `POST /api/ads/impression` - Track ad impression

### Statistics Endpoints

- `GET /api/stats/overview` - System overview
- `GET /api/stats/sessions` - Session details
- `GET /api/stats/ads` - Ad performance
- `GET /api/stats/devices` - Device statistics

## Monitoring

Access Grafana dashboards at `http://your-server:3000` for:
- Active sessions
- Ad performance
- System health
- User analytics

## Troubleshooting

### Common Issues

1. **Users can't connect**: Check RADIUS connectivity
2. **Portal not loading**: Verify Nginx configuration
3. **Sessions not expiring**: Check Redis connection
4. **Ads not playing**: Verify file formats and paths

### Logs

View logs with:
```bash
docker-compose logs -f [service-name]
```

## Security Considerations

- Change default passwords in `.env`
- Use SSL certificates for production
- Implement rate limiting
- Regular security updates
- Monitor for abuse

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues and questions:
- GitHub Issues: [Link]
- Email: support@matutuwifi.com
- Documentation: docs/