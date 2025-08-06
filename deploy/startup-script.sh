#!/bin/bash

# Complete startup script with Firecracker and proper app setup
export DEBIAN_FRONTEND=noninteractive

# Update system
apt-get update -y

# Install all required packages
apt-get install -y \
    curl \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    nginx \
    ufw \
    htop \
    unzip \
    debootstrap

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify Node.js and npm versions
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install essential global packages for building
npm install -g npm@latest
npm install -g vite@latest
npm install -g typescript@latest

# Create application user
useradd -m -s /bin/bash appuser

# Create application directory
mkdir -p /opt/tutorials-dojo
chown appuser:appuser /opt/tutorials-dojo

# Install Firecracker
cd /tmp
echo "Installing Firecracker..."
curl -LOJ https://github.com/firecracker-microvm/firecracker/releases/latest/download/firecracker-v1.4.1-x86_64.tgz
tar xvf firecracker-v1.4.1-x86_64.tgz
cp release-v1.4.1-x86_64/firecracker-v1.4.1-x86_64 /usr/local/bin/firecracker
chmod +x /usr/local/bin/firecracker

# Setup Firecracker directories
mkdir -p /opt/firecracker
cd /opt/firecracker

# Download kernel
echo "Downloading Firecracker kernel..."
curl -fsSL -o vmlinux.bin https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin

# Create rootfs (smaller for faster setup)
echo "Creating Firecracker rootfs..."
dd if=/dev/zero of=rootfs.ext4 bs=1M count=300
mkfs.ext4 -F rootfs.ext4

# Mount and setup basic rootfs
mkdir -p /mnt/firecracker-rootfs
mount rootfs.ext4 /mnt/firecracker-rootfs

# Install minimal Ubuntu system in rootfs
echo "Setting up minimal Ubuntu in rootfs..."
debootstrap --arch amd64 --include=nodejs,npm,python3,gcc,make,git focal /mnt/firecracker-rootfs http://archive.ubuntu.com/ubuntu/

# Setup basic init system in VM
cat > /mnt/firecracker-rootfs/sbin/init << 'INIT_EOF'
#!/bin/bash
mount -t proc proc /proc
mount -t sysfs sysfs /sys
mount -t devtmpfs devtmpfs /dev

# Setup networking
ip link set lo up
ip link set eth0 up
dhclient eth0

# Execute any provided script
if [ -f /tmp/user_script.sh ]; then
    chmod +x /tmp/user_script.sh
    cd /tmp && ./user_script.sh
fi

# Keep the VM running
while true; do
    sleep 10
done
INIT_EOF

chmod +x /mnt/firecracker-rootfs/sbin/init

# Unmount
umount /mnt/firecracker-rootfs

# Setup networking for Firecracker
ip tuntap add tap-firecracker mode tap
ip addr add 172.16.0.1/24 dev tap-firecracker
ip link set tap-firecracker up

# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf
sysctl -p

# Configure iptables for Firecracker
iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
iptables -A FORWARD -i tap-firecracker -o eth0 -j ACCEPT
iptables -A FORWARD -i eth0 -o tap-firecracker -j ACCEPT

# Configure UFW
ufw --force enable
ufw allow ssh
ufw allow 8080
ufw allow 80

# Create systemd service for the application (fixed for ES modules)
cat > /etc/systemd/system/tutorials-dojo.service << 'SYSTEMD_EOF'
[Unit]
Description=Tutorials Dojo API Server
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/tutorials-dojo
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStart=/usr/bin/node --experimental-modules backend/server.js
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=tutorials-dojo

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF

# Enable the service
systemctl daemon-reload
systemctl enable tutorials-dojo

# Configure Nginx as reverse proxy
cat > /etc/nginx/sites-available/tutorials-dojo << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static files
    location / {
        root /opt/tutorials-dojo/dist;
        try_files $uri $uri/ /index.html;
        
        # Fallback to index.html for SPA
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Handle case where dist doesn't exist yet
    error_page 404 = @fallback;
    location @fallback {
        return 200 '<!DOCTYPE html><html><head><title>Tutorials Dojo</title></head><body><h1>Application Starting...</h1><p>Please wait while the application is being deployed.</p><script>setTimeout(function(){location.reload()}, 5000);</script></body></html>';
        add_header Content-Type text/html;
    }
}
NGINX_EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/tutorials-dojo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# Set Firecracker permissions
chown -R appuser:appuser /opt/firecracker
chmod 755 /opt/firecracker

# Create deployment completion flag
touch /tmp/deployment-complete

echo "Startup script completed successfully"
