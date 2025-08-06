#!/bin/bash

# Quick setup script to get the application running
INSTANCE_NAME="tutorials-dojo-firecracker"
ZONE="us-east1-b"

echo "🚀 Quick deployment setup..."

# First, let's complete the basic setup manually
gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
    set -e
    
    # Skip iptables-persistent for now - it's causing the hang
    sudo pkill -f 'apt-get install.*iptables-persistent' || true
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo 'Installing Node.js...'
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
        sudo apt-get install -y nodejs
    fi
    
    # Create application user if not exists
    if ! id appuser &>/dev/null; then
        sudo useradd -m -s /bin/bash appuser
    fi
    
    # Create application directory
    sudo mkdir -p /opt/tutorials-dojo
    sudo chown appuser:appuser /opt/tutorials-dojo
    
    # Create basic systemd service
    sudo tee /etc/systemd/system/tutorials-dojo.service > /dev/null << 'EOF'
[Unit]
Description=Tutorials Dojo API Server
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/tutorials-dojo
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=5
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=tutorials-dojo

[Install]
WantedBy=multi-user.target
EOF

    # Enable the service
    sudo systemctl daemon-reload
    sudo systemctl enable tutorials-dojo
    
    # Configure basic Nginx
    sudo tee /etc/nginx/sites-available/tutorials-dojo > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location / {
        root /opt/tutorials-dojo/dist;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

    # Enable Nginx site
    sudo ln -sf /etc/nginx/sites-available/tutorials-dojo /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl restart nginx
    
    # Create completion flag
    sudo touch /tmp/deployment-complete
    
    echo 'Basic setup completed!'
"

echo "✅ Basic setup completed. Now deploying your application..."
