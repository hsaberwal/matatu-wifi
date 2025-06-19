#!/bin/bash
set -e

echo "Starting FreeRADIUS configuration..."

# Wait for MySQL to be ready
echo "Waiting for MySQL..."
while ! mysqladmin ping -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" --silent; do
    sleep 1
done
echo "MySQL is ready!"

# Substitute environment variables in configuration files
envsubst < /etc/freeradius/3.0/clients.conf > /tmp/clients.conf && mv /tmp/clients.conf /etc/freeradius/3.0/clients.conf
envsubst < /etc/freeradius/3.0/mods-available/sql > /tmp/sql && mv /tmp/sql /etc/freeradius/3.0/mods-available/sql

# Create RADIUS user entries for MAC-based authentication
mysql -h"$MYSQL_HOST" -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" <<EOF
-- Ensure tables exist
CREATE TABLE IF NOT EXISTS radgroupreply (
    id int(11) unsigned NOT NULL auto_increment,
    groupname varchar(64) NOT NULL default '',
    attribute varchar(64) NOT NULL default '',
    op char(2) NOT NULL DEFAULT '=',
    value varchar(253) NOT NULL default '',
    PRIMARY KEY (id),
    KEY groupname (groupname(32))
);

CREATE TABLE IF NOT EXISTS radgroupcheck (
    id int(11) unsigned NOT NULL auto_increment,
    groupname varchar(64) NOT NULL default '',
    attribute varchar(64) NOT NULL default '',
    op char(2) NOT NULL DEFAULT ':=',
    value varchar(253) NOT NULL default '',
    PRIMARY KEY (id),
    KEY groupname (groupname(32))
);

CREATE TABLE IF NOT EXISTS radusergroup (
    username varchar(64) NOT NULL default '',
    groupname varchar(64) NOT NULL default '',
    priority int(11) NOT NULL default '1',
    KEY username (username(32))
);

-- Create WiFi user group with 15-minute session timeout
INSERT IGNORE INTO radgroupreply (groupname, attribute, op, value) VALUES
('wifi_users', 'Session-Timeout', ':=', '900'),
('wifi_users', 'Idle-Timeout', ':=', '300'),
('wifi_users', 'Acct-Interim-Interval', ':=', '60'),
('wifi_users', 'Mikrotik-Rate-Limit', ':=', '2M/2M');

-- Create expired group for users who need to watch ads again
INSERT IGNORE INTO radgroupreply (groupname, attribute, op, value) VALUES
('expired_users', 'Reply-Message', ':=', 'Your session has expired. Please watch an ad to continue.');
EOF

# Set proper permissions
chown -R freerad:freerad /etc/freeradius/3.0/

echo "FreeRADIUS configuration completed!"

# Start FreeRADIUS
exec "$@"