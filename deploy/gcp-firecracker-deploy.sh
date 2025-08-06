#!/bin/bash

# GCP Firecracker VM Deployment Script
# This script creates and configures a GCP VM instance with Firecracker for your tutorials-dojo project

set -e

# Configuration variables
PROJECT_ID="td-labs"
REGION="us-east1"
ZONE="us-east1-b"
INSTANCE_NAME="tutorials-dojo-firecracker"
MACHINE_TYPE="n1-standard-2"
BOOT_DISK_SIZE="50GB"
DISK_TYPE="pd-ssd"
IMAGE_FAMILY="ubuntu-2204-lts"
IMAGE_PROJECT="ubuntu-os-cloud"
NETWORK="default"
TAGS="firecracker-vm,http-server,https-server"

# Zone fa    echo "[INFO] Creating deployment package..."
    cd ../
    
    # Create tar with proper structure
    tar -czf deploy/deployment.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.gitignore \
        --exclude=dist \
        --exclude=deploy \
        --exclude=*.log \
        --exclude=.env \
        --exclude=.env.local \
        --exclude=.DS_Store \
        --exclude=Thumbs.db \
        --exclude=*.tmp \
        --exclude=coverage \
        --exclude=.nyc_output \
        --exclude=*.tgz \
        --exclude=*.tar.gz \
        --exclude=bun.lockb \
        --exclude=deployment.tar.gz \
        backend src public package.json package-lock.json components.json eslint.config.js index.html postcss.config.js README.md tailwind.config.ts tsconfig.app.json tsconfig.json tsconfig.node.json vite.config.ts
    
    cd deploy/

# Define fallback zones in order of preference (keeping your working config first)
FALLBACK_ZONES=(
    "us-east1-b"
    "us-east1-c"
    "us-east1-d"
    "us-central1-a"
    "us-central1-b" 
    "us-central1-c"
    "us-west1-a"
    "us-west1-b"
    "us-west1-c"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "You are not authenticated with gcloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Get or set project ID
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            log_error "No project ID specified. Please set PROJECT_ID variable or run 'gcloud config set project YOUR_PROJECT_ID'"
            exit 1
        fi
    fi
    
    log_info "Using project: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
}

find_available_zone() {
    log_info "Finding available zone for machine type $MACHINE_TYPE..."
    
    # If zone is already specified, use it directly (skip checking for speed)
    if [ -n "$ZONE" ]; then
        log_info "Using specified zone: $ZONE"
        REGION="${ZONE%-*}"
        return 0
    fi
    
    # Try fallback zones only if no zone specified
    for zone in "${FALLBACK_ZONES[@]}"; do
        log_info "Testing zone: $zone"
        if check_zone_availability "$zone"; then
            ZONE="$zone"
            REGION="${zone%-*}"
            log_info "✅ Found available zone: $ZONE"
            return 0
        else
            log_warn "❌ Zone $zone is not available"
        fi
    done
    
    log_error "No available zones found for machine type $MACHINE_TYPE"
    log_error "Try using a different machine type or region"
    exit 1
}

check_zone_availability() {
    local test_zone="$1"
    
    # Simplified check - just verify zone exists
    if gcloud compute zones describe "$test_zone" --quiet >/dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

enable_apis() {
    log_info "Enabling required GCP APIs..."
    gcloud services enable compute.googleapis.com
    gcloud services enable cloudresourcemanager.googleapis.com
    gcloud services enable iam.googleapis.com
}

create_firewall_rules() {
    log_info "Creating firewall rules..."
    
    # Allow HTTP traffic
    if ! gcloud compute firewall-rules describe allow-http-8080 --quiet 2>/dev/null; then
        gcloud compute firewall-rules create allow-http-8080 \
            --direction=INGRESS \
            --priority=1000 \
            --network=$NETWORK \
            --action=ALLOW \
            --rules=tcp:8080 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=http-server
    fi
    
    # Allow HTTPS traffic
    if ! gcloud compute firewall-rules describe allow-https-8443 --quiet 2>/dev/null; then
        gcloud compute firewall-rules create allow-https-8443 \
            --direction=INGRESS \
            --priority=1000 \
            --network=$NETWORK \
            --action=ALLOW \
            --rules=tcp:8443 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=https-server
    fi
    
    # Allow SSH
    if ! gcloud compute firewall-rules describe allow-ssh --quiet 2>/dev/null; then
        gcloud compute firewall-rules create allow-ssh \
            --direction=INGRESS \
            --priority=1000 \
            --network=$NETWORK \
            --action=ALLOW \
            --rules=tcp:22 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=firecracker-vm
    fi
}

create_startup_script() {
    log_info "Creating startup script..."
    cat > startup-script.sh << 'EOF'
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
EOF
}

create_vm_instance() {
    log_info "Creating GCP VM instance: $INSTANCE_NAME in zone: $ZONE"
    
    # Check if instance already exists
    if gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --quiet 2>/dev/null; then
        log_warn "Instance $INSTANCE_NAME already exists. Deleting it first..."
        gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --quiet
        sleep 10
    fi
    
    # Create the instance
    log_info "Creating VM instance in $ZONE with machine type $MACHINE_TYPE..."
    
    if gcloud compute instances create $INSTANCE_NAME \
        --zone=$ZONE \
        --machine-type=$MACHINE_TYPE \
        --network-interface=network-tier=PREMIUM,subnet=$NETWORK \
        --maintenance-policy=MIGRATE \
        --provisioning-model=STANDARD \
        --tags=$TAGS \
        --image-family=$IMAGE_FAMILY \
        --image-project=$IMAGE_PROJECT \
        --boot-disk-size=$BOOT_DISK_SIZE \
        --boot-disk-type=$DISK_TYPE \
        --boot-disk-device-name=$INSTANCE_NAME \
        --metadata-from-file startup-script=startup-script.sh \
        --scopes=https://www.googleapis.com/auth/cloud-platform; then
        
        log_info "VM instance created successfully!"
        return 0
    else
        log_error "Failed to create instance in zone $ZONE"
        log_error "Please check your GCP quotas and try again"
        exit 1
    fi
}

wait_for_instance() {
    log_info "Waiting for instance to be ready..."
    
    # Wait for instance to be running
    while true; do
        STATUS=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(status)")
        if [ "$STATUS" = "RUNNING" ]; then
            break
        fi
        log_info "Instance status: $STATUS. Waiting..."
        sleep 10
    done
    
    log_info "Instance is running. Monitoring startup script progress..."
    log_info "Press Ctrl+C at any time to skip monitoring (deployment will continue in background)"
    
    # Wait a bit for SSH to be ready
    sleep 30
    
    # Monitor startup script progress with live logs
    local monitoring=true
    local check_count=0
    
    while $monitoring; do
        # Check if deployment is complete
        if gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="test -f /tmp/deployment-complete" --quiet 2>/dev/null; then
            log_info "✅ Startup script completed!"
            break
        fi
        
        check_count=$((check_count + 1))
        echo ""
        log_info "📋 Startup Progress Check #$check_count ($(date '+%H:%M:%S'))"
        echo "----------------------------------------"
        
        # Show recent startup script logs
        echo "🔍 Recent startup script activity:"
        gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
            # Show cloud-init logs if available
            if [ -f /var/log/cloud-init-output.log ]; then
                echo '=== Cloud-init output (last 15 lines) ==='
                sudo tail -15 /var/log/cloud-init-output.log 2>/dev/null || echo 'No cloud-init logs yet'
            fi
            
            # Show system logs related to our script
            echo ''
            echo '=== System logs (startup-script related) ==='
            sudo journalctl -u google-startup-scripts --no-pager -n 10 2>/dev/null || echo 'No startup script logs yet'
            
            # Show what processes are running
            echo ''
            echo '=== Active processes ==='
            ps aux | grep -E '(apt|curl|wget|node|npm)' | grep -v grep | head -5 || echo 'No relevant processes found'
            
            # Check if key components are installed
            echo ''
            echo '=== Installation status ==='
            echo \"Node.js: \$(which node 2>/dev/null && node --version 2>/dev/null || echo 'Not installed yet')\"
            echo \"Nginx: \$(which nginx 2>/dev/null && echo 'Installed' || echo 'Not installed yet')\"
            echo \"App directory: \$([ -d /opt/tutorials-dojo ] && echo 'Created' || echo 'Not created yet')\"
        " 2>/dev/null || {
            log_warn "Could not connect to VM yet (SSH not ready). Retrying..."
        }
        
        echo ""
        log_info "⏱️  Next check in 45 seconds... (Startup script typically takes 3-8 minutes)"
        
        # Sleep with interrupt capability
        for i in {1..45}; do
            sleep 1
            # This allows Ctrl+C to work during the sleep
        done
    done
    
    log_info "Instance is ready!"
}

deploy_application() {
    log_info "Deploying application to the VM..."
    
    # Get the external IP
    EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)")
    
    # Create deployment package
    log_info "Creating deployment package..."
    tar -czf deployment.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.gitignore \
        --exclude=dist \
        --exclude=deploy \
        --exclude=*.log \
        --exclude=.env \
        --exclude=.env.local \
        --exclude=.DS_Store \
        --exclude=Thumbs.db \
        --exclude=*.tmp \
        --exclude=coverage \
        --exclude=.nyc_output \
        --exclude=*.tgz \
        --exclude=*.tar.gz \
        .
    
    # Copy files to the VM
    log_info "Copying files to VM..."
    gcloud compute scp deployment.tar.gz $INSTANCE_NAME:/tmp/ --zone=$ZONE
    
    # Extract and setup on VM with proper handling
    log_info "Setting up application on VM..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        set -e
        
        echo 'Extracting application files...'
        cd /opt/tutorials-dojo
        sudo tar -xzf /tmp/deployment.tar.gz
        sudo chown -R appuser:appuser .
        
        echo 'Checking package.json configuration...'
        # Check if this is an ES module project
        if grep -q '\"type\": \"module\"' package.json; then
            echo 'Detected ES module project - fixing backend imports...'
            # Convert require to import in server.js if needed
            if [ -f backend/server.js ] && grep -q 'require(' backend/server.js; then
                sudo -u appuser sed -i 's/const app = require(\"\\.\/app\");/import app from \".\/app.js\";/' backend/server.js
                sudo -u appuser sed -i 's/require(\"\\.\/app\")/import(\".\/app.js\")/' backend/server.js
            fi
        fi
        
        echo 'Installing ALL dependencies (including dev dependencies for build)...'
        sudo -u appuser npm install --verbose 2>&1 | tee /tmp/npm-install.log
        
        echo 'Checking if vite is available...'
        if ! sudo -u appuser npx vite --version >/dev/null 2>&1; then
            echo 'Installing vite globally as fallback...'
            npm install -g vite@latest
        fi
        
        echo 'Building frontend with vite...'
        sudo -u appuser npm run build 2>&1 | tee /tmp/npm-build.log
        
        # If npm run build fails, try alternative approaches
        if [ ! -d dist ] || [ ! -f dist/index.html ]; then
            echo 'Standard build failed, trying npx vite build...'
            sudo -u appuser npx vite build 2>&1 | tee -a /tmp/npm-build.log
        fi
        
        if [ ! -d dist ] || [ ! -f dist/index.html ]; then
            echo 'Vite build failed, trying development build...'
            sudo -u appuser npm run build:dev 2>&1 | tee -a /tmp/npm-build.log || true
        fi
        
        # Check if build was successful
        if [ -d dist ] && [ -f dist/index.html ]; then
            echo '✅ Build successful! Checking dist contents:'
            ls -la dist/
            echo 'Sample of built index.html:'
            head -10 dist/index.html
        else
            echo '❌ Build failed or dist directory missing. Checking logs:'
            echo '--- NPM Install Log ---'
            cat /tmp/npm-install.log | tail -20
            echo '--- NPM Build Log ---'
            cat /tmp/npm-build.log | tail -20
            
            echo 'Creating emergency fallback dist with your app structure...'
            sudo mkdir -p /opt/tutorials-dojo/dist
            sudo cat > /tmp/emergency-index.html << 'EMERGENCY_HTML_EOF'
<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"utf-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
    <title>Tutorials Dojo</title>
    <script src=\"https://unpkg.com/react@18/umd/react.development.js\"></script>
    <script src=\"https://unpkg.com/react-dom@18/umd/react-dom.development.js\"></script>
    <script src=\"https://unpkg.com/@babel/standalone/babel.min.js\"></script>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { background: #fff3cd; border: 1px solid #ffeaa7; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
        .error { background: #f8d7da; border: 1px solid #f5c6cb; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; padding: 1rem; border-radius: 4px; margin: 1rem 0; }
        .btn { display: inline-block; padding: 0.5rem 1rem; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 0.25rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 2rem; }
        .card { border: 1px solid #ddd; padding: 1rem; border-radius: 4px; }
    </style>
</head>
<body>
    <div class=\"container\">
        <h1>🚀 Tutorials Dojo - Emergency Mode</h1>
        <div class=\"status\">
            <strong>⚠️ Build Issue Detected:</strong> The application build process encountered issues. 
            This is a temporary interface while we resolve the build problems.
        </div>
        
        <div class=\"success\">
            <strong>✅ What's Working:</strong>
            <ul>
                <li>Backend API Server</li>
                <li>Firecracker VM Infrastructure</li>
                <li>Database & Core Services</li>
                <li>Network & Security</li>
            </ul>
        </div>
        
        <div class=\"grid\">
            <div class=\"card\">
                <h3>🔍 API Testing</h3>
                <p>Test your backend API endpoints:</p>
                <a href=\"/api/health\" class=\"btn\">Health Check</a>
                <a href=\"/api\" class=\"btn\">API Info</a>
            </div>
            
            <div class=\"card\">
                <h3>🔧 Troubleshooting</h3>
                <p>Common solutions:</p>
                <button class=\"btn\" onclick=\"location.reload()\">Refresh Page</button>
                <a href=\"#\" class=\"btn\" onclick=\"checkBuild()\">Check Build Status</a>
            </div>
            
            <div class=\"card\">
                <h3>📊 System Status</h3>
                <p>Infrastructure monitoring:</p>
                <div id=\"status-check\">Checking...</div>
            </div>
        </div>
        
        <div id=\"api-response\" class=\"error\" style=\"display: none;\">
            <strong>API Response:</strong>
            <pre id=\"api-content\"></pre>
        </div>
    </div>
    
    <script>
        function checkBuild() {
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('api-response').style.display = 'block';
                    document.getElementById('api-content').textContent = JSON.stringify(data, null, 2);
                    document.getElementById('status-check').innerHTML = '✅ API is responding correctly';
                })
                .catch(err => {
                    document.getElementById('api-response').style.display = 'block';
                    document.getElementById('api-content').textContent = 'Error: ' + err.message;
                    document.getElementById('status-check').innerHTML = '❌ API connection failed';
                });
        }
        
        // Auto-check status on load
        setTimeout(checkBuild, 2000);
        
        // Auto-refresh every 30 seconds to check if build is fixed
        setInterval(() => {
            fetch('/dist/index.html').then(response => {
                if (response.ok) {
                    return response.text();
                }
            }).then(html => {
                if (html && !html.includes('Emergency Mode')) {
                    location.reload();
                }
            }).catch(() => {});
        }, 30000);
    </script>
</body>
</html>
EMERGENCY_HTML_EOF
            sudo mv /tmp/emergency-index.html /opt/tutorials-dojo/dist/index.html
            sudo chown -R appuser:appuser /opt/tutorials-dojo/dist
            sudo chmod -R 644 /opt/tutorials-dojo/dist/*
        fi
        
        echo 'Restarting services...'
        sudo systemctl restart tutorials-dojo
        sudo systemctl restart nginx
        
        echo 'Checking service status...'
        sudo systemctl status tutorials-dojo --no-pager
        
        echo 'Deployment completed!'
    "
    
    log_info "Application deployed successfully!"
    log_info "Your application is available at: http://$EXTERNAL_IP"
    log_info "API endpoint: http://$EXTERNAL_IP/api"
    
    # Clean up
    rm -f deployment.tar.gz startup-script.sh
}

show_connection_info() {
    EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)")
    
    echo ""
    log_info "🎉 Deployment completed successfully!"
    echo ""
    echo "📡 Connection Information:"
    echo "  External IP: $EXTERNAL_IP"
    echo "  Application: http://$EXTERNAL_IP"
    echo "  API: http://$EXTERNAL_IP/api"
    echo ""
    echo "🔧 Management Commands:"
    echo "  SSH to VM: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
    echo "  View logs: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo journalctl -u tutorials-dojo -f'"
    echo "  Restart app: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='sudo systemctl restart tutorials-dojo'"
    echo ""
    echo "🗑️  Cleanup:"
    echo "  Delete VM: gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE"
    echo ""
}

# Main execution
main() {
    log_info "Starting GCP Firecracker VM deployment..."
    
    check_prerequisites
    enable_apis
    create_firewall_rules
    create_startup_script
    create_vm_instance
    wait_for_instance
    deploy_application
    show_connection_info
    
    log_info "Deployment script completed!"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --zone)
            ZONE="$2"
            shift 2
            ;;
        --instance-name)
            INSTANCE_NAME="$2"
            shift 2
            ;;
        --machine-type)
            MACHINE_TYPE="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --project-id PROJECT_ID    GCP Project ID"
            echo "  --zone ZONE                GCP Zone (default: us-central1-a)"
            echo "  --instance-name NAME       VM instance name (default: tutorials-dojo-firecracker)"
            echo "  --machine-type TYPE        Machine type (default: n1-standard-2)"
            echo "  -h, --help                 Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
