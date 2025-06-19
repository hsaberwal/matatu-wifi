FROM freeradius/freeradius-server:latest

# Install MySQL client and other dependencies
RUN apt-get update && \
    apt-get install -y \
    mysql-client \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration files
COPY ./clients.conf /etc/freeradius/3.0/clients.conf
COPY ./sql.conf /etc/freeradius/3.0/mods-available/sql
COPY ./radiusd.conf /etc/freeradius/3.0/radiusd.conf
COPY ./dictionary /etc/freeradius/3.0/dictionary
COPY ./entrypoint.sh /entrypoint.sh

# Enable SQL module
RUN ln -s /etc/freeradius/3.0/mods-available/sql /etc/freeradius/3.0/mods-enabled/sql

# Set permissions
RUN chmod +x /entrypoint.sh && \
    chown -R freerad:freerad /etc/freeradius/3.0/

EXPOSE 1812/udp 1813/udp

ENTRYPOINT ["/entrypoint.sh"]
CMD ["freeradius", "-X"]