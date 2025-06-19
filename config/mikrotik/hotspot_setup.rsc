# Matatu WiFi Complete Hotspot Configuration
# Run this on your MikroTik router
# Tested on RouterOS 6.x and 7.x

# IMPORTANT: Modify these variables for your setup
:local hotspotInterface "wlan1"
:local hotspotName "MatutuWiFi"
:local hotspotSSID "Matatu-Free-WiFi"
:local networkAddress "10.10.10.0"
:local networkMask "24"
:local dhcpPoolStart "10.10.10.10"
:local dhcpPoolEnd "10.10.10.254"
:local gatewayIP "10.10.10.1"
:local dnsServers "8.8.8.8,8.8.4.4"
:local portalIP "192.168.1.100"  # Change to your portal server IP
:local radiusIP "192.168.1.100"   # Change to your RADIUS server IP
:local radiusSecret "testing123"   # MUST match your .env file

# Step 1: Create bridge for hotspot
/interface bridge
add name=bridge-hotspot comment="Matatu WiFi Bridge"

# Step 2: Configure wireless interface
/interface wireless security-profiles
add name=open-wifi authentication-types="" mode=none

/interface wireless
set [ find default-name=$hotspotInterface ] \
    ssid=$hotspotSSID \
    mode=ap-bridge \
    band=2ghz-g/n \
    channel-width=20/40mhz-XX \
    frequency=auto \
    security-profile=open-wifi \
    wireless-protocol=802.11 \
    wps-mode=disabled \
    default-authentication=yes \
    default-forwarding=yes \
    hide-ssid=no \
    disabled=no

# Step 3: Add wireless to bridge
/interface bridge port
add bridge=bridge-hotspot interface=$hotspotInterface

# Step 4: Configure IP address
/ip address
add address="$gatewayIP/$networkMask" interface=bridge-hotspot network=$networkAddress

# Step 5: Configure DHCP server
/ip pool
add name=hotspot-pool ranges="$dhcpPoolStart-$dhcpPoolEnd"

/ip dhcp-server
add name=hotspot-dhcp interface=bridge-hotspot address-pool=hotspot-pool lease-time=1h disabled=no

/ip dhcp-server network
add address="$networkAddress/$networkMask" gateway=$gatewayIP dns-server=$dnsServers comment="Matatu WiFi Network"

# Step 6: Configure DNS
/ip dns
set allow-remote-requests=yes servers=$dnsServers

# Step 7: Configure Hotspot Server Profile
/ip hotspot profile
remove [find name=$hotspotName]
add name=$hotspotName \
    hotspot-address=$gatewayIP \
    dns-name="wifi.matatu.local" \
    html-directory=hotspot \
    http-proxy=0.0.0.0:0 \
    smtp-server=0.0.0.0 \
    login-by=mac-cookie \
    mac-auth-mode=mac-as-username-and-password \
    mac-auth-password="" \
    split-user-domain=no \
    use-radius=yes \
    radius-accounting=yes \
    radius-mac-format=XX:XX:XX:XX:XX:XX \
    radius-interim-update=1m \
    nas-port-type=wireless-802.11 \
    http-cookie-lifetime=15m \
    rate-limit=""

# Step 8: Configure Hotspot Server
/ip hotspot
remove [find name=$hotspotName]
add name=$hotspotName \
    interface=bridge-hotspot \
    address-pool=hotspot-pool \
    profile=$hotspotName \
    idle-timeout=5m \
    keepalive-timeout=none \
    login-timeout=15m \
    disabled=no

# Step 9: Configure User Profile
/ip hotspot user profile
remove [find name="wifi-users"]
add name="wifi-users" \
    address-pool=hotspot-pool \
    session-timeout=15m \
    idle-timeout=5m \
    keepalive-timeout=2m \
    status-autorefresh=1m \
    shared-users=1 \
    rate-limit="2M/2M" \
    transparent-proxy=yes \
    on-login=":log info \"User $user logged in\"" \
    on-logout=":log info \"User $user logged out\""

# Step 10: Configure RADIUS
/radius
remove [find]
add service=hotspot \
    address=$radiusIP \
    secret=$radiusSecret \
    timeout=3s \
    authentication-port=1812 \
    accounting-port=1813 \
    src-address=$gatewayIP \
    called-id=$hotspotSSID \
    nas-port-type=wireless-802.11 \
    disabled=no

# Step 11: Configure RADIUS Incoming (for CoA/Disconnect)
/radius incoming
set accept=yes port=3799

# Step 12: Configure Firewall for Hotspot
/ip firewall filter
# Allow established connections
add chain=forward action=accept connection-state=established,related comment="Allow established"

# Allow DNS
add chain=input action=accept protocol=udp dst-port=53 src-address="$networkAddress/$networkMask" comment="Allow DNS from hotspot"

# Allow DHCP
add chain=input action=accept protocol=udp dst-port=67 src-address="$networkAddress/$networkMask" comment="Allow DHCP"

# Allow Hotspot
add chain=input action=accept protocol=tcp dst-port=80 src-address="$networkAddress/$networkMask" comment="Allow HTTP from hotspot"
add chain=input action=accept protocol=tcp dst-port=443 src-address="$networkAddress/$networkMask" comment="Allow HTTPS from hotspot"

# Allow hotspot to portal server
add chain=forward action=accept src-address="$networkAddress/$networkMask" dst-address=$portalIP comment="Allow to portal"
add chain=forward action=accept dst-address="$networkAddress/$networkMask" src-address=$portalIP comment="Allow from portal"

# Step 13: Configure NAT
/ip firewall nat
add chain=srcnat action=masquerade src-address="$networkAddress/$networkMask" out-interface-list=WAN comment="NAT for hotspot"

# Step 14: Configure Walled Garden (CRITICAL for external portal)
/ip hotspot walled-garden
# Clear existing entries
remove [find]

# Allow portal server
add dst-host="$portalIP" action=allow comment="Allow portal IP"
add dst-host="portal*" action=allow comment="Allow portal domain"
add dst-host="*.matatu.local" action=allow comment="Allow local domains"

# Allow connectivity checks
add dst-host="connectivitycheck.android.com" dst-port=80 action=allow
add dst-host="connectivitycheck.gstatic.com" dst-port=80 action=allow
add dst-host="detectportal.firefox.com" dst-port=80 action=allow
add dst-host="captive.apple.com" dst-port=80,443 action=allow
add dst-host="www.msftconnecttest.com" dst-port=80 action=allow
add dst-host="www.msftncsi.com" dst-port=80 action=allow

# Allow essential services
add dst-host="*.googleapis.com" action=allow comment="Allow Google APIs"
add dst-host="*.gstatic.com" action=allow comment="Allow Google Static"

# Step 15: Configure Walled Garden IP List (for direct IP access)
/ip hotspot walled-garden ip
add dst-address=$portalIP action=accept
add dst-address=$radiusIP action=accept

# Step 16: Redirect to External Portal
/ip hotspot
set [find name=$hotspotName] \
    login-page="http://$portalIP/?mac=\$(mac)&ip=\$(ip)&username=\$(username)&link-login=\$(link-login)&link-orig=\$(link-orig)&error=\$(error)&trial=\$(trial)&chap-id=\$(chap-id)&chap-challenge=\$(chap-challenge)&link-login-only=\$(link-login-only)&link-orig-esc=\$(link-orig-esc)&mac-esc=\$(mac-esc)"

# Step 17: Add monitoring script
/system script
add name="hotspot-monitor" source={
    :local activeUsers [/ip hotspot active print count-only]
    :local totalUsers [/ip hotspot user print count-only]
    :local cpuLoad [/system resource get cpu-load]
    
    :log info "Hotspot Status - Active: $activeUsers, Total: $totalUsers, CPU: $cpuLoad%"
    
    # Check RADIUS connectivity
    :do {
        /radius monitor 0 once
        :log info "RADIUS server is reachable"
    } on-error={
        :log error "RADIUS server is NOT reachable!"
    }
}

# Step 18: Schedule monitoring
/system scheduler
add name="monitor-hotspot" on-event="hotspot-monitor" interval=5m comment="Monitor hotspot and RADIUS"

# Step 19: Configure bandwidth queues
/queue type
add name="hotspot-users" kind=sfq

/queue simple
add name="hotspot-total" \
    target="$networkAddress/$networkMask" \
    max-limit=50M/50M \
    queue=hotspot-users/hotspot-users \
    comment="Total bandwidth for all hotspot users"

# Step 20: Print summary
:put "=========================================="
:put "Matatu WiFi Hotspot Configuration Complete"
:put "=========================================="
:put "Network Configuration:"
:put "  SSID: $hotspotSSID"
:put "  Network: $networkAddress/$networkMask"
:put "  Gateway: $gatewayIP"
:put "  DHCP Pool: $dhcpPoolStart - $dhcpPoolEnd"
:put "  Portal IP: $portalIP"
:put "  RADIUS IP: $radiusIP"
:put ""
:put "IMPORTANT NEXT STEPS:"
:put "1. Update portal IP address in the script"
:put "2. Update RADIUS IP address in the script"
:put "3. Update RADIUS secret in docker-compose.yml"
:put "4. Ensure portal is accessible at http://$portalIP"
:put "5. Test with: /ip hotspot active print"
:put "=========================================="