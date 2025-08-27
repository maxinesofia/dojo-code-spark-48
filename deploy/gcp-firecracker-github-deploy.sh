#!/bin/bash

# Enhanced GCP Firecracker VM Deployment Script with GitHub Integration
# This script creates and configures a GCP VM instance with Firecracker for your tutorials-dojo project
# Includes GitHub integration for easy cloning and continuous deployment

set -e

# =============================================================================
# CONFIGURATION VARIABLES
# =============================================================================

# GCP Configuration - Following Firecracker best practices
PROJECT_ID="td-playcloud-labs"
REGION="us-east1"
ZONE="us-east1-b"
INSTANCE_NAME="td-firecracker-starter01"
MACHINE_TYPE="n2-standard-2"  # n2 series for better nested virtualization support
CPU_PLATFORM="AUTOMATIC"
BOOT_DISK_SIZE="100GB"
DISK_TYPE="pd-ssd"
IMAGE_FAMILY="ubuntu-pro-2204-jammy-v20220923"
IMAGE_PROJECT="ubuntu-os-pro-cloud"
NETWORK="default"
TAGS="firecracker-vm,http-server,https-server,ssh-server"

# GitHub Configuration
GITHUB_REPO_URL="https://github.com/maxinesofia/dojo-code-spark-48.git"
GITHUB_BRANCH="main"
DEPLOY_KEY_NAME="tutorials-dojo-deploy-key"

# Application Configuration
APP_PORT="8080"
NGINX_PORT="80"
SSL_PORT="443"

# Firecracker Configuration
FIRECRACKER_KERNEL_URL="https://s3.amazonaws.com/spec.ccfc.min/img/quickstart_guide/x86_64/kernels/vmlinux.bin"
ROOTFS_SIZE="500"  # MB

# Zone fallback list
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
    "europe-west1-b"
    "europe-west1-c"
    "asia-southeast1-a"
    "asia-southeast1-b"
)

# =============================================================================
# COLOR UTILITIES
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${CYAN}[SUCCESS]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# =============================================================================
# PREREQUISITE CHECKS
# =============================================================================

check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        log_info "Visit: https://cloud.google.com/sdk/docs/install"
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
    
    # Check if git is available for local operations
    if ! command -v git &> /dev/null; then
        log_error "git is not installed. Please install git first."
        exit 1
    fi
    
    log_info "Using project: $PROJECT_ID"
    gcloud config set project $PROJECT_ID
    
    log_success "Prerequisites check passed"
}

# =============================================================================
# ZONE AND RESOURCE MANAGEMENT
# =============================================================================

find_available_zone() {
    log_step "Finding available zone for machine type $MACHINE_TYPE..."
    
    # If zone is already specified, test it first
    if [ -n "$ZONE" ]; then
        log_info "Testing specified zone: $ZONE"
        if check_zone_availability "$ZONE"; then
            log_success "Using specified zone: $ZONE"
            REGION="${ZONE%-*}"
            return 0
        else
            log_warn "Specified zone $ZONE is not available, trying alternatives..."
        fi
    fi
    
    # Try fallback zones
    for zone in "${FALLBACK_ZONES[@]}"; do
        log_info "Testing zone: $zone"
        if check_zone_availability "$zone"; then
            ZONE="$zone"
            REGION="${zone%-*}"
            log_success "Found available zone: $ZONE"
            return 0
        else
            log_warn "Zone $zone is not available"
        fi
    done
    
    log_error "No available zones found for machine type $MACHINE_TYPE"
    log_error "Try using a different machine type or region"
    exit 1
}

check_zone_availability() {
    local test_zone="$1"
    
    # Check if zone exists and has capacity
    if gcloud compute zones describe "$test_zone" --quiet >/dev/null 2>&1; then
        # Try to get machine type in the zone
        if gcloud compute machine-types describe "$MACHINE_TYPE" --zone="$test_zone" --quiet >/dev/null 2>&1; then
            return 0
        fi
    fi
    
    return 1
}

# =============================================================================
# GCP SETUP
# =============================================================================

enable_apis() {
    log_step "Enabling required GCP APIs..."
    
    apis=(
        "compute.googleapis.com"
        "cloudresourcemanager.googleapis.com" 
        "iam.googleapis.com"
        "secretmanager.googleapis.com"
    )
    
    for api in "${apis[@]}"; do
        log_info "Enabling $api..."
        gcloud services enable "$api"
    done
    
    log_success "APIs enabled successfully"
}

create_firewall_rules() {
    log_step "Creating firewall rules..."
    
    # SSH access
    if ! gcloud compute firewall-rules describe allow-ssh-tutorials-dojo --quiet 2>/dev/null; then
        gcloud compute firewall-rules create allow-ssh-tutorials-dojo \
            --direction=INGRESS \
            --priority=1000 \
            --network=$NETWORK \
            --action=ALLOW \
            --rules=tcp:22 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=ssh-server
    fi
    
    # HTTP traffic (80)
    if ! gcloud compute firewall-rules describe allow-http-tutorials-dojo --quiet 2>/dev/null; then
        gcloud compute firewall-rules create allow-http-tutorials-dojo \
            --direction=INGRESS \
            --priority=1000 \
            --network=$NETWORK \
            --action=ALLOW \
            --rules=tcp:80 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=http-server
    fi
    
    # Application port (8080)
    if ! gcloud compute firewall-rules describe allow-app-tutorials-dojo --quiet 2>/dev/null; then
        gcloud compute firewall-rules create allow-app-tutorials-dojo \
            --direction=INGRESS \
            --priority=1000 \
            --network=$NETWORK \
            --action=ALLOW \
            --rules=tcp:8080 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=http-server
    fi
    
    # HTTPS traffic (443)
    if ! gcloud compute firewall-rules describe allow-https-tutorials-dojo --quiet 2>/dev/null; then
        gcloud compute firewall-rules create allow-https-tutorials-dojo \
            --direction=INGRESS \
            --priority=1000 \
            --network=$NETWORK \
            --action=ALLOW \
            --rules=tcp:443 \
            --source-ranges=0.0.0.0/0 \
            --target-tags=https-server
    fi
    
    log_success "Firewall rules created successfully"
}

# =============================================================================
# STARTUP SCRIPT GENERATION
# =============================================================================

create_startup_script() {
    log_step "Creating comprehensive startup script..."
    
    cat > startup-script.sh << 'STARTUP_EOF'
#!/bin/bash

# Comprehensive startup script for Tutorials Dojo with Firecracker and GitHub integration
set -e
export DEBIAN_FRONTEND=noninteractive

# Logging setup
LOGFILE="/var/log/tutorials-dojo-startup.log"
exec 1> >(tee -a "$LOGFILE")
exec 2>&1

echo "===== Tutorials Dojo Startup Script ====="
echo "Started at: $(date)"

# =============================================================================
# SYSTEM UPDATES AND PACKAGES
# =============================================================================

echo "[1/10] Updating system packages..."
apt-get update -y
apt-get upgrade -y

echo "[2/10] Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    nginx \
    ufw \
    htop \
    unzip \
    debootstrap \
    iptables-persistent \
    jq \
    vim \
    tmux \
    tree \
    net-tools \
    ca-certificates \
    gnupg \
    lsb-release

# =============================================================================
# NODE.JS INSTALLATION
# =============================================================================

echo "[3/10] Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify installation
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Install global packages
npm install -g npm@latest
npm install -g vite@latest
npm install -g typescript@latest
npm install -g pm2@latest

# =============================================================================
# USER AND DIRECTORY SETUP
# =============================================================================

echo "[4/10] Setting up application user and directories..."

# Create application user
if ! id "appuser" &>/dev/null; then
    useradd -m -s /bin/bash appuser
    usermod -aG sudo appuser
fi

# Create application directories
mkdir -p /opt/tutorials-dojo
mkdir -p /opt/firecracker
mkdir -p /var/log/tutorials-dojo
mkdir -p /home/appuser/.ssh

# Set permissions
chown -R appuser:appuser /opt/tutorials-dojo
chown -R appuser:appuser /var/log/tutorials-dojo
chown -R appuser:appuser /home/appuser

# =============================================================================
# FIRECRACKER INSTALLATION - Following Official Guide
# =============================================================================

echo "[5/10] Installing and configuring Firecracker (Official Method)..."

# Verify VMX is enabled for nested virtualization
echo "Verifying VMX is enabled..."
VMX_COUNT=$(grep -cw vmx /proc/cpuinfo || echo "0")
if [ "$VMX_COUNT" -gt 0 ]; then
    echo "✓ VMX enabled (count: $VMX_COUNT)"
else
    echo "⚠ VMX not detected - nested virtualization may not work"
fi

# Install required packages for KVM and Firecracker
echo "Installing QEMU, KVM, and ACL packages..."
apt-get install -y acl qemu-kvm unsquashfs

# Set permissions for KVM access
setfacl -m u:${USER}:rw /dev/kvm
setfacl -m u:appuser:rw /dev/kvm

# Verify KVM permissions
if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
    echo "✓ KVM permissions OK"
else
    echo "⚠ KVM permissions may need adjustment"
fi

# Add users to kvm group if it exists
if getent group kvm >/dev/null; then
    usermod -aG kvm root
    usermod -aG kvm appuser
    echo "✓ Users added to kvm group"
fi

# Setup Firecracker working directory
mkdir -p /opt/firecracker
cd /opt/firecracker

# Get architecture and download kernel and rootfs following official guide
ARCH="$(uname -m)"
echo "Architecture: $ARCH"

# Download latest kernel
echo "Downloading latest 5.10 kernel..."
latest=$(wget "http://spec.ccfc.min.s3.amazonaws.com/?prefix=firecracker-ci/v1.11/$ARCH/vmlinux-5.10&list-type=2" -O - 2>/dev/null | grep -oP "(?<=<Key>)(firecracker-ci/v1.11/$ARCH/vmlinux-5\.10\.[0-9]{1,3})(?=</Key>)" | head -1)
wget "https://s3.amazonaws.com/spec.ccfc.min/${latest}" -O vmlinux-5.10

# Download Ubuntu 24.04 rootfs
echo "Downloading Ubuntu 24.04 rootfs..."
wget -O ubuntu-24.04.squashfs.upstream "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.11/${ARCH}/ubuntu-24.04.squashfs"

# Extract and prepare rootfs with SSH key
echo "Preparing rootfs with SSH access..."
unsquashfs ubuntu-24.04.squashfs.upstream

# Create SSH key for rootfs access
ssh-keygen -f id_rsa -N "" -C "firecracker-vm-access"
mkdir -p squashfs-root/root/.ssh
cp -v id_rsa.pub squashfs-root/root/.ssh/authorized_keys
mv -v id_rsa ./ubuntu-24.04.id_rsa
chmod 600 ./ubuntu-24.04.id_rsa

# Create ext4 filesystem image
echo "Creating ext4 filesystem image..."
chown -R root:root squashfs-root
truncate -s 400M ubuntu-24.04.ext4
mkfs.ext4 -d squashfs-root -F ubuntu-24.04.ext4

# Download latest Firecracker binary
echo "Downloading latest Firecracker binary..."
release_url="https://github.com/firecracker-microvm/firecracker/releases"
latest_release=$(basename $(curl -fsSLI -o /dev/null -w %{url_effective} ${release_url}/latest))
curl -L ${release_url}/download/${latest_release}/firecracker-${latest_release}-${ARCH}.tgz | tar -xz

# Rename and install binary
mv release-${latest_release}-${ARCH}/firecracker-${latest_release}-${ARCH} /usr/local/bin/firecracker
chmod +x /usr/local/bin/firecracker

# Verify Firecracker installation
echo "Firecracker version: $(/usr/local/bin/firecracker --version)"

# Create Firecracker management scripts
cat > /opt/firecracker/start-firecracker.sh << 'FC_START_EOF'
#!/bin/bash
# Start Firecracker VM management script

set -e

API_SOCKET="/tmp/firecracker.socket"
TAP_DEV="tap0"
TAP_IP="172.16.0.1"
MASK_SHORT="/30"
FC_MAC="06:00:AC:10:00:02"

# Function to setup network
setup_network() {
    echo "Setting up network interface..."
    
    # Remove existing interface if present
    ip link del "$TAP_DEV" 2> /dev/null || true
    
    # Create tap interface
    ip tuntap add dev "$TAP_DEV" mode tap
    ip addr add "${TAP_IP}${MASK_SHORT}" dev "$TAP_DEV"
    ip link set dev "$TAP_DEV" up
    
    # Enable IP forwarding
    echo 1 > /proc/sys/net/ipv4/ip_forward
    iptables -P FORWARD ACCEPT
    
    # Determine host interface
    HOST_IFACE=$(ip -j route list default | jq -r '.[0].dev' 2>/dev/null || echo "eth0")
    
    # Set up NAT for internet access
    iptables -t nat -D POSTROUTING -o "$HOST_IFACE" -j MASQUERADE 2>/dev/null || true
    iptables -t nat -A POSTROUTING -o "$HOST_IFACE" -j MASQUERADE
    
    echo "Network setup completed. TAP interface: $TAP_DEV"
}

# Function to start Firecracker VM
start_vm() {
    local vm_id="$1"
    local script_content="$2"
    
    cd /opt/firecracker
    
    # Remove old socket
    rm -f "$API_SOCKET"
    
    # Setup network
    setup_network
    
    # Start Firecracker in background
    /usr/local/bin/firecracker --api-sock "${API_SOCKET}" &
    FC_PID=$!
    
    # Wait for socket to be ready
    sleep 1
    
    # Configure VM
    KERNEL="./vmlinux-5.10"
    ROOTFS="./ubuntu-24.04.ext4"
    LOGFILE="./firecracker-${vm_id}.log"
    
    # Create log file
    touch "$LOGFILE"
    
    # Set log file
    curl -X PUT --unix-socket "${API_SOCKET}" \
        --data "{
            \"log_path\": \"${LOGFILE}\",
            \"level\": \"Info\",
            \"show_level\": true,
            \"show_log_origin\": true
        }" \
        "http://localhost/logger"
    
    # Set boot source
    KERNEL_BOOT_ARGS="console=ttyS0 reboot=k panic=1 pci=off"
    [ "$(uname -m)" = "aarch64" ] && KERNEL_BOOT_ARGS="keep_bootcon ${KERNEL_BOOT_ARGS}"
    
    curl -X PUT --unix-socket "${API_SOCKET}" \
        --data "{
            \"kernel_image_path\": \"${KERNEL}\",
            \"boot_args\": \"${KERNEL_BOOT_ARGS}\"
        }" \
        "http://localhost/boot-source"
    
    # Set rootfs
    curl -X PUT --unix-socket "${API_SOCKET}" \
        --data "{
            \"drive_id\": \"rootfs\",
            \"path_on_host\": \"${ROOTFS}\",
            \"is_root_device\": true,
            \"is_read_only\": false
        }" \
        "http://localhost/drives/rootfs"
    
    # Set network interface
    curl -X PUT --unix-socket "${API_SOCKET}" \
        --data "{
            \"iface_id\": \"net1\",
            \"guest_mac\": \"$FC_MAC\",
            \"host_dev_name\": \"$TAP_DEV\"
        }" \
        "http://localhost/network-interfaces/net1"
    
    # Wait for configuration
    sleep 0.1
    
    # Start microVM
    curl -X PUT --unix-socket "${API_SOCKET}" \
        --data "{
            \"action_type\": \"InstanceStart\"
        }" \
        "http://localhost/actions"
    
    # Wait for VM to start
    sleep 3
    
    # Setup internet access in the guest
    ssh -i ./ubuntu-24.04.id_rsa -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
        root@172.16.0.2 "ip route add default via 172.16.0.1 dev eth0" 2>/dev/null || true
    
    # Setup DNS in the guest
    ssh -i ./ubuntu-24.04.id_rsa -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
        root@172.16.0.2 "echo 'nameserver 8.8.8.8' > /etc/resolv.conf" 2>/dev/null || true
    
    # Execute user script if provided
    if [ -n "$script_content" ]; then
        echo "$script_content" | ssh -i ./ubuntu-24.04.id_rsa -o StrictHostKeyChecking=no \
            root@172.16.0.2 "cat > /tmp/user_script.sh && chmod +x /tmp/user_script.sh && /tmp/user_script.sh"
    fi
    
    # Return VM info
    echo "VM_ID:$vm_id"
    echo "VM_IP:172.16.0.2"
    echo "FC_PID:$FC_PID"
    echo "LOG_FILE:$LOGFILE"
}

# Main execution
if [ "$1" = "start" ] && [ -n "$2" ]; then
    start_vm "$2" "$3"
else
    echo "Usage: $0 start <vm_id> [script_content]"
    exit 1
fi
FC_START_EOF

chmod +x /opt/firecracker/start-firecracker.sh

# Create Firecracker stop script
cat > /opt/firecracker/stop-firecracker.sh << 'FC_STOP_EOF'
#!/bin/bash
# Stop Firecracker VM script

API_SOCKET="/tmp/firecracker.socket"
TAP_DEV="tap0"

# Stop Firecracker
if [ -S "$API_SOCKET" ]; then
    echo "Stopping Firecracker VM..."
    curl -X PUT --unix-socket "${API_SOCKET}" \
        --data '{"action_type": "SendCtrlAltDel"}' \
        "http://localhost/actions" 2>/dev/null || true
    
    sleep 2
    
    # Force kill if still running
    pkill -f "firecracker --api-sock" || true
fi

# Clean up network
ip link del "$TAP_DEV" 2>/dev/null || true

# Remove socket
rm -f "$API_SOCKET"

echo "Firecracker VM stopped and cleaned up"
FC_STOP_EOF

chmod +x /opt/firecracker/stop-firecracker.sh

# Set Firecracker permissions
chown -R appuser:appuser /opt/firecracker

# =============================================================================
# GITHUB SETUP
# =============================================================================

echo "[6/10] Setting up GitHub integration..."

# Generate SSH key for GitHub if it doesn't exist
if [ ! -f /home/appuser/.ssh/id_rsa ]; then
    sudo -u appuser ssh-keygen -t rsa -b 4096 -f /home/appuser/.ssh/id_rsa -N ""
fi

# Create GitHub known_hosts
sudo -u appuser ssh-keyscan github.com >> /home/appuser/.ssh/known_hosts

# Create git configuration
sudo -u appuser git config --global user.name "Tutorials Dojo Server"
sudo -u appuser git config --global user.email "server@tutorials-dojo.com"

# Display public key for manual addition to GitHub
echo "==================== GITHUB SETUP ===================="
echo "Add this public key to your GitHub repository as a deploy key:"
echo "Repository > Settings > Deploy keys > Add deploy key"
echo ""
cat /home/appuser/.ssh/id_rsa.pub
echo ""
echo "======================================================"

# =============================================================================
# APPLICATION DEPLOYMENT
# =============================================================================

echo "[7/10] Cloning and setting up application..."

# Clone the repository
cd /opt/tutorials-dojo
if [ -d ".git" ]; then
    echo "Repository already exists, pulling latest changes..."
    sudo -u appuser git pull origin main
else
    echo "Cloning repository..."
    # Try SSH first, fallback to HTTPS
    if sudo -u appuser git clone git@github.com:maxinesofia/dojo-code-spark-48.git . 2>/dev/null; then
        echo "Cloned via SSH successfully"
    else
        echo "SSH clone failed, trying HTTPS..."
        sudo -u appuser git clone https://github.com/maxinesofia/dojo-code-spark-48.git .
    fi
fi

# Install dependencies
echo "Installing frontend dependencies..."
sudo -u appuser npm install

echo "Installing backend dependencies..."
cd backend
sudo -u appuser npm install
cd ..

# Build frontend
echo "Building frontend..."
sudo -u appuser npm run build

# =============================================================================
# SYSTEMD SERVICES
# =============================================================================

echo "[8/10] Creating systemd services..."

# Create main application service
cat > /etc/systemd/system/tutorials-dojo.service << 'SERVICE_EOF'
[Unit]
Description=Tutorials Dojo API Server
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/tutorials-dojo
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=DATABASE_URL=sqlite:/opt/tutorials-dojo/database.sqlite
ExecStart=/usr/bin/node backend/server.js
Restart=always
RestartSec=5
StandardOutput=append:/var/log/tutorials-dojo/app.log
StandardError=append:/var/log/tutorials-dojo/error.log

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Create auto-update service
cat > /etc/systemd/system/tutorials-dojo-update.service << 'UPDATE_SERVICE_EOF'
[Unit]
Description=Tutorials Dojo Auto Update
After=network.target

[Service]
Type=oneshot
User=appuser
WorkingDirectory=/opt/tutorials-dojo
ExecStart=/opt/tutorials-dojo/scripts/auto-update.sh
UPDATE_SERVICE_EOF

# Create auto-update timer (runs every 5 minutes)
cat > /etc/systemd/system/tutorials-dojo-update.timer << 'UPDATE_TIMER_EOF'
[Unit]
Description=Run Tutorials Dojo Auto Update every 5 minutes
Requires=tutorials-dojo-update.service

[Timer]
OnCalendar=*:0/5
Persistent=true

[Install]
WantedBy=timers.target
UPDATE_TIMER_EOF

# Create auto-update script
mkdir -p /opt/tutorials-dojo/scripts
cat > /opt/tutorials-dojo/scripts/auto-update.sh << 'AUTO_UPDATE_EOF'
#!/bin/bash
# Auto-update script for Tutorials Dojo

set -e
cd /opt/tutorials-dojo

# Check for updates
git fetch origin main

# Get current and remote commit hashes
CURRENT_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/main)

if [ "$CURRENT_COMMIT" != "$REMOTE_COMMIT" ]; then
    echo "[$(date)] Updates found, deploying..."
    
    # Pull changes
    git pull origin main
    
    # Install/update dependencies if package.json changed
    if git diff --name-only $CURRENT_COMMIT $REMOTE_COMMIT | grep -q "package.json"; then
        echo "Package.json changed, updating dependencies..."
        npm install
        cd backend && npm install && cd ..
    fi
    
    # Rebuild frontend
    npm run build
    
    # Restart services
    sudo systemctl restart tutorials-dojo
    sudo systemctl reload nginx
    
    echo "[$(date)] Deployment completed successfully"
else
    echo "[$(date)] No updates available"
fi
AUTO_UPDATE_EOF

chmod +x /opt/tutorials-dojo/scripts/auto-update.sh
chown appuser:appuser /opt/tutorials-dojo/scripts/auto-update.sh

# =============================================================================
# NGINX CONFIGURATION
# =============================================================================

echo "[9/10] Configuring Nginx..."

# Create Nginx configuration
cat > /etc/nginx/sites-available/tutorials-dojo << 'NGINX_CONFIG_EOF'
# Tutorials Dojo Nginx Configuration
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # API routes
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
        proxy_send_timeout 300s;
    }

    # Static files with caching
    location / {
        root /opt/tutorials-dojo/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Handle case where dist doesn't exist yet (during initial deployment)
    error_page 404 = @fallback;
    location @fallback {
        return 200 '<!DOCTYPE html>
<html>
<head>
    <title>Tutorials Dojo - Deploying</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .status { color: #666; margin: 20px 0; }
        .progress-bar { width: 100%; height: 4px; background: #f3f3f3; border-radius: 2px; overflow: hidden; }
        .progress-fill { height: 100%; background: #3498db; width: 0%; animation: progress 30s ease-out forwards; }
        @keyframes progress { to { width: 100%; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Tutorials Dojo</h1>
        <div class="spinner"></div>
        <p class="status">Application is being deployed...</p>
        <div class="progress-bar"><div class="progress-fill"></div></div>
        <p><small>This may take a few minutes. The page will automatically refresh when ready.</small></p>
    </div>
    <script>
        function checkStatus() {
            fetch("/api/health").then(response => {
                if (response.ok) {
                    location.reload();
                }
            }).catch(() => {
                setTimeout(checkStatus, 5000);
            });
        }
        setTimeout(checkStatus, 10000);
    </script>
</body>
</html>';
        add_header Content-Type text/html;
    }
}
NGINX_CONFIG_EOF

# Enable site
ln -sf /etc/nginx/sites-available/tutorials-dojo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

# =============================================================================
# FIREWALL CONFIGURATION
# =============================================================================

echo "[10/10] Configuring firewall..."

# Configure UFW
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 8080/tcp
ufw allow 443/tcp

# =============================================================================
# SERVICE STARTUP
# =============================================================================

echo "Starting services..."

# Enable and start services
systemctl daemon-reload
systemctl enable tutorials-dojo
systemctl enable tutorials-dojo-update.timer
systemctl start tutorials-dojo-update.timer

# Start application (might fail if dependencies not installed yet)
if systemctl start tutorials-dojo; then
    echo "Application started successfully"
else
    echo "Application start failed, will retry after dependency installation"
fi

# =============================================================================
# COMPLETION
# =============================================================================

# Create status file
cat > /tmp/deployment-status.json << STATUS_EOF
{
    "status": "completed",
    "timestamp": "$(date -Iseconds)",
    "services": {
        "nginx": "$(systemctl is-active nginx)",
        "tutorials-dojo": "$(systemctl is-active tutorials-dojo)",
        "firecracker": "available"
    },
    "versions": {
        "node": "$(node --version)",
        "npm": "$(npm --version)",
        "firecracker": "$(firecracker --version)"
    },
    "network": {
        "internal_ip": "$(hostname -I | awk '{print $1}')",
        "external_ip": "$(curl -s ifconfig.me || echo 'unknown')"
    }
}
STATUS_EOF

# Final status
echo "===== DEPLOYMENT COMPLETED ====="
echo "Timestamp: $(date)"
echo "Status: SUCCESS"
echo ""
echo "🔧 Services Status:"
echo "   - Nginx: $(systemctl is-active nginx)"
echo "   - Application: $(systemctl is-active tutorials-dojo)"
echo "   - Auto-update: $(systemctl is-active tutorials-dojo-update.timer)"
echo ""
echo "🌐 Access Information:"
echo "   - HTTP: http://$(curl -s ifconfig.me || echo 'YOUR_VM_IP')"
echo "   - API: http://$(curl -s ifconfig.me || echo 'YOUR_VM_IP')/api"
echo "   - SSH: gcloud compute ssh tutorials-dojo-firecracker-github --zone=us-east1-b"
echo ""
echo "📋 Next Steps:"
echo "   1. Add the deploy key (shown above) to your GitHub repository"
echo "   2. Verify the application is running properly"
echo "   3. Set up SSL certificate if needed"
echo ""
echo "🔍 Logs:"
echo "   - Application: tail -f /var/log/tutorials-dojo/app.log"
echo "   - Deployment: tail -f /var/log/tutorials-dojo-startup.log"
echo "   - Nginx: tail -f /var/log/nginx/access.log"

STARTUP_EOF

    log_success "Startup script created successfully"
}

# =============================================================================
# DEPLOYMENT PACKAGE CREATION
# =============================================================================

create_deployment_package() {
    log_step "Creating deployment package..."
    
    # Create deployment package directory
    mkdir -p ./deployment-temp
    
    # Copy essential files
    cp startup-script.sh ./deployment-temp/
    
    # Create metadata file
    cat > ./deployment-temp/deployment-metadata.json << META_EOF
{
    "deployment_type": "gcp-firecracker-github",
    "created_at": "$(date -Iseconds)",
    "github_repo": "$GITHUB_REPO_URL",
    "github_branch": "$GITHUB_BRANCH",
    "machine_type": "$MACHINE_TYPE",
    "zone": "$ZONE",
    "region": "$REGION"
}
META_EOF
    
    log_success "Deployment package created"
}

# =============================================================================
# VM INSTANCE CREATION
# =============================================================================

create_vm_instance() {
    log_step "Creating VM instance: $INSTANCE_NAME"
    
    # Check if instance already exists
    if gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --quiet 2>/dev/null; then
        log_warn "Instance $INSTANCE_NAME already exists"
        read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "Deleting existing instance..."
            gcloud compute instances delete "$INSTANCE_NAME" --zone="$ZONE" --quiet
        else
            log_info "Keeping existing instance. Deployment aborted."
            return 1
        fi
    fi
    
    # Create the VM instance with nested virtualization enabled (required for Firecracker)
    log_info "Creating new VM instance with nested virtualization..."
    gcloud compute instances create "$INSTANCE_NAME" \
        --enable-nested-virtualization \
        --project="$PROJECT_ID" \
        --zone="$ZONE" \
        --machine-type="$MACHINE_TYPE" \
        --cpu-platform="$CPU_PLATFORM" \
        --network-interface=network-tier=PREMIUM,subnet=default \
        --metadata-from-file startup-script=startup-script.sh \
        --maintenance-policy=MIGRATE \
        --provisioning-model=STANDARD \
        --tags="$TAGS" \
        --image="projects/$IMAGE_PROJECT/global/images/$IMAGE_FAMILY" \
        --boot-disk-size="$BOOT_DISK_SIZE" \
        --boot-disk-type="$DISK_TYPE" \
        --boot-disk-device-name="$INSTANCE_NAME" \
        --shielded-secure-boot \
        --shielded-vtpm \
        --shielded-integrity-monitoring \
        --labels=project=tutorials-dojo,environment=production,purpose=firecracker \
        --reservation-affinity=any
    
    log_success "VM instance created successfully"
}

# =============================================================================
# POST-DEPLOYMENT OPERATIONS
# =============================================================================

wait_for_deployment() {
    log_step "Waiting for deployment to complete..."
    
    local max_attempts=60  # 30 minutes
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        echo -n "."
        
        # Check if deployment is complete
        if gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="test -f /tmp/deployment-status.json" 2>/dev/null; then
            echo ""
            log_success "Deployment completed!"
            break
        fi
        
        sleep 30
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo ""
        log_warn "Deployment timeout reached. The deployment might still be in progress."
        log_info "You can check the status manually with:"
        log_info "gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='tail -f /var/log/tutorials-dojo-startup.log'"
    fi
}

get_deployment_info() {
    log_step "Getting deployment information..."
    
    # Get external IP
    EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
    
    # Get deployment status if available
    if gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="test -f /tmp/deployment-status.json" 2>/dev/null; then
        log_info "Getting deployment status..."
        gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="cat /tmp/deployment-status.json" 2>/dev/null | jq . || true
    fi
    
    # Get SSH key for GitHub
    log_info "Getting GitHub deploy key..."
    echo "============== GITHUB DEPLOY KEY =============="
    gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="cat /home/appuser/.ssh/id_rsa.pub" 2>/dev/null || echo "Key not ready yet"
    echo "==============================================="
    
    # Display connection info
    echo ""
    log_success "Deployment Information:"
    echo "🌐 External IP: $EXTERNAL_IP"
    echo "🔗 Application URL: http://$EXTERNAL_IP"
    echo "🔗 API URL: http://$EXTERNAL_IP/api"
    echo "🔑 SSH Command: gcloud compute ssh $INSTANCE_NAME --zone=$ZONE"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Add the deploy key (shown above) to your GitHub repository:"
    echo "   GitHub Repository → Settings → Deploy keys → Add deploy key"
    echo "   ✓ Allow write access (to enable pushing)"
    echo ""
    echo "2. Verify the application is running:"
    echo "   curl http://$EXTERNAL_IP/health"
    echo ""
    echo "3. Check application logs if needed:"
    echo "   gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command='tail -f /var/log/tutorials-dojo/app.log'"
}

# =============================================================================
# CLEANUP FUNCTION
# =============================================================================

cleanup() {
    log_step "Cleaning up temporary files..."
    rm -rf ./deployment-temp
    rm -f startup-script.sh
    log_success "Cleanup completed"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    echo "
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║    🚀 Tutorials Dojo - GCP Firecracker GitHub Deploy        ║
    ║                                                              ║
    ║    This script will create a GCP VM with:                   ║
    ║    • Firecracker virtualization for secure code execution   ║
    ║    • GitHub integration for easy deployment                 ║
    ║    • Auto-update mechanism                                  ║
    ║    • Full application stack (Frontend + Backend)           ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    "
    
    # Confirm deployment
    echo "Configuration:"
    echo "  Project ID: $PROJECT_ID"
    echo "  Instance Name: $INSTANCE_NAME"
    echo "  Machine Type: $MACHINE_TYPE"
    echo "  Zone: $ZONE"
    echo "  GitHub Repo: $GITHUB_REPO_URL"
    echo ""
    
    read -p "Do you want to proceed with this deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled by user"
        exit 0
    fi
    
    # Set trap for cleanup
    trap cleanup EXIT
    
    # Execute deployment steps
    check_prerequisites
    find_available_zone
    enable_apis
    create_firewall_rules
    create_startup_script
    create_deployment_package
    create_vm_instance
    
    log_success "VM instance created! Waiting for deployment to complete..."
    wait_for_deployment
    get_deployment_info
    
    log_success "🎉 Deployment completed successfully!"
    log_info "Your Tutorials Dojo application with Firecracker is now running on GCP!"
}

# Execute main function
main "$@"
