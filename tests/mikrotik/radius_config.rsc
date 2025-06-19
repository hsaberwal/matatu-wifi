# MikroTik RADIUS Configuration for Matatu WiFi
# This script configures RADIUS-specific settings

# Variables
:local radiusServer "freeradius"
:local radiusSecret "your_radius_secret"
:local radiusTimeout "3s"
:local nasIdentifier "matatu-wifi-nas"

# Remove existing RADIUS configurations
/radius
remove [find]

# Add primary RADIUS server
/radius
add \
    service=hotspot,wireless,login \
    address=$radiusServer \
    secret=$radiusSecret \
    authentication-port=1812 \
    accounting-port=1813 \
    timeout=$radiusTimeout \
    called-id="" \
    domain="" \
    realm="" \
    certificate="" \
    nas-port-type=ethernet \
    accounting-backup=no \
    realm-format=suffix \
    disabled=no \
    comment="Primary RADIUS for Matatu WiFi"

# Configure RADIUS CoA (Change of Authorization) support
/radius incoming
set accept=yes port=3799

# Configure RADIUS-specific attributes
/radius
set [ find address=$radiusServer ] src-address=[:pick [/ip address get [find interface="bridge-hotspot"] address] 0 [:find [/ip address get [find interface="bridge-hotspot"] address] "/"]]

# Configure AAA (Authentication, Authorization, Accounting)
/user aaa
set use-radius=yes \
    accounting=yes \
    interim-update=1m \
    default-group=read

# Configure system identity as NAS-Identifier
/system identity
set name=$nasIdentifier

# Configure RADIUS MAC authentication format
/ip hotspot profile
set [ find ] \
    mac-auth-mode=mac-as-username-and-password \
    mac-auth-password="" \
    split-user-domain=no \
    use-radius=yes

# Add RADIUS monitoring script
/system script
add name="radius-monitor" source={
    :local radiusStatus [/radius monitor 0 once as-value]
    :local isResponding ($radiusStatus->"status")
    
    :if ($isResponding = "no-response") do={
        :log error "RADIUS server not responding!"
        # You could add fallback logic here
    } else={
        :log info "RADIUS server is responding. Round-trip: $($radiusStatus->\"round-trip-time\")"
    }
}

# Schedule RADIUS monitoring
/system scheduler
add name="check-radius" \
    on-event="radius-monitor" \
    interval=5m \
    comment="Monitor RADIUS server connectivity"

# Configure RADIUS disconnect messages
/ip hotspot profile
set [ find ] \
    radius-accounting=yes \
    radius-mac-format=XX:XX:XX:XX:XX:XX \
    radius-location-id="" \
    radius-location-name="Matatu-$[/system identity get name]" \
    radius-default-domain="" \
    radius-interim-update=1m

# Print configuration
:put "======================================"
:put "RADIUS Configuration Complete"
:put "======================================"
:put "RADIUS Server: $radiusServer"
:put "NAS Identifier: $nasIdentifier"
:put "Authentication Port: 1812"
:put "Accounting Port: 1813"
:put "CoA Port: 3799"
:put "======================================"