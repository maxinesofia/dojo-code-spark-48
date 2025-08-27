#!/bin/bash

# Simple GCP Firecracker VM Deployment using gcloud CLI
# Based on the official Firecracker guide and your specifications

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 Simple GCP Firecracker Deployment                     ║
║                                                              ║
║    Using gcloud CLI and official Firecracker setup          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"

# Set Variables (as per your guide)
FC_VM_NAME="td-firecracker-starter01"
FC_PROJECT="td-playcloud-labs"
FC_ZONE="us-east1-b"
FC_MACHINE_TYPE="n2-standard-2"
FC_CPU_PLATFORM="AUTOMATIC"

echo -e "${GREEN}[INFO]${NC} Configuration:"
echo "  VM Name: $FC_VM_NAME"
echo "  Project: $FC_PROJECT"
echo "  Zone: $FC_ZONE"
echo "  Machine Type: $FC_MACHINE_TYPE"
echo ""

# Confirm deployment
read -p "Do you want to proceed with this deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} gcloud CLI is not installed!"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${YELLOW}[STEP 1]${NC} Setting up GCP project..."

# Create or set project
if ! gcloud projects describe $FC_PROJECT &>/dev/null; then
    echo "Creating project $FC_PROJECT..."
    gcloud projects create ${FC_PROJECT} --enable-cloud-apis --set-as-default
else
    echo "Using existing project $FC_PROJECT"
    gcloud config set project $FC_PROJECT
fi

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable compute.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com

echo -e "${YELLOW}[STEP 2]${NC} Creating startup script..."

# Create startup script for VM initialization
cat > startup-script.sh << 'STARTUP_EOF'
#!/bin/bash
# Firecracker VM Setup Script - Official Method

set -e
export DEBIAN_FRONTEND=noninteractive

# Logging
LOGFILE="/var/log/firecracker-setup.log"
exec 1> >(tee -a "$LOGFILE")
exec 2>&1

echo "===== Firecracker Setup Started at $(date) ====="

# Update system
echo "[1/8] Updating system..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
echo "[2/8] Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    jq \
    acl \
    qemu-kvm \
    squashfs-tools \
    nginx \
    nodejs \
    npm

# Verify VMX is enabled
echo "[3/8] Checking virtualization support..."
VMX_COUNT=$(grep -cw vmx /proc/cpuinfo || echo "0")
echo "VMX support detected: $VMX_COUNT cores"

# Setup KVM permissions
echo "[4/8] Setting up KVM permissions..."
setfacl -m u:${USER}:rw /dev/kvm

# Add user to kvm group if it exists
if getent group kvm >/dev/null; then
    usermod -aG kvm ${USER}
    echo "Added user to kvm group"
fi

# Verify KVM permissions
if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then
    echo "✓ KVM permissions OK"
else
    echo "⚠ KVM permissions may need adjustment"
fi

# Create application user
echo "[5/8] Setting up application user..."
useradd -m -s /bin/bash appuser || true
usermod -aG sudo appuser
usermod -aG kvm appuser || true

# Setup Firecracker
echo "[6/8] Installing Firecracker (Official Method)..."
mkdir -p /opt/firecracker
cd /opt/firecracker

# Get architecture and download components
ARCH="$(uname -m)"
echo "Architecture: $ARCH"

# Download latest kernel (5.10 series)
echo "Downloading kernel..."
latest=$(wget "http://spec.ccfc.min.s3.amazonaws.com/?prefix=firecracker-ci/v1.11/$ARCH/vmlinux-5.10&list-type=2" -O - 2>/dev/null | grep -oP "(?<=<Key>)(firecracker-ci/v1.11/$ARCH/vmlinux-5\.10\.[0-9]{1,3})(?=</Key>)" | head -1)
wget "https://s3.amazonaws.com/spec.ccfc.min/${latest}" -O vmlinux-5.10

# Download Ubuntu 24.04 rootfs
echo "Downloading rootfs..."
wget -O ubuntu-24.04.squashfs.upstream "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.11/${ARCH}/ubuntu-24.04.squashfs"

# Extract and prepare rootfs
echo "Preparing rootfs..."
unsquashfs ubuntu-24.04.squashfs.upstream

# Create SSH key for VM access
ssh-keygen -f id_rsa -N "" -C "firecracker-vm-key"
mkdir -p squashfs-root/root/.ssh
cp -v id_rsa.pub squashfs-root/root/.ssh/authorized_keys
chmod 600 id_rsa
mv id_rsa ubuntu-24.04.id_rsa

# Install Node.js and development tools in rootfs
echo "Setting up development environment in rootfs..."
chroot squashfs-root /bin/bash -c "
    apt-get update
    apt-get install -y nodejs npm python3 python3-pip gcc g++ make git curl
    npm install -g typescript ts-node
"

# Create ext4 filesystem
echo "Creating filesystem..."
chown -R root:root squashfs-root
truncate -s 400M ubuntu-24.04.ext4
mkfs.ext4 -d squashfs-root -F ubuntu-24.04.ext4

# Download latest Firecracker binary
echo "Installing Firecracker binary..."
release_url="https://github.com/firecracker-microvm/firecracker/releases"
latest_release=$(basename $(curl -fsSLI -o /dev/null -w %{url_effective} ${release_url}/latest))
curl -L ${release_url}/download/${latest_release}/firecracker-${latest_release}-${ARCH}.tgz | tar -xz

# Install binary
mv release-${latest_release}-${ARCH}/firecracker-${latest_release}-${ARCH} /usr/local/bin/firecracker
chmod +x /usr/local/bin/firecracker

echo "Firecracker version: $(/usr/local/bin/firecracker --version)"

# Setup application directory and clone repository
echo "[7/8] Setting up application..."
mkdir -p /opt/tutorials-dojo
chown appuser:appuser /opt/tutorials-dojo

# Clone repository (using HTTPS for simplicity)
cd /opt/tutorials-dojo
sudo -u appuser git clone https://github.com/maxinesofia/dojo-code-spark-48.git .

# Install dependencies
sudo -u appuser npm install
cd backend && sudo -u appuser npm install && cd ..

# Build frontend
sudo -u appuser npm run build

# Create simple systemd service
echo "[8/8] Setting up services..."
cat > /etc/systemd/system/tutorials-dojo.service << 'SERVICE_EOF'
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
StandardOutput=append:/var/log/tutorials-dojo.log
StandardError=append:/var/log/tutorials-dojo-error.log

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Configure Nginx
cat > /etc/nginx/sites-available/tutorials-dojo << 'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # API routes
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files
    location / {
        root /opt/tutorials-dojo/dist;
        try_files $uri $uri/ /index.html;
    }
}
NGINX_EOF

# Enable services
ln -sf /etc/nginx/sites-available/tutorials-dojo /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

systemctl daemon-reload
systemctl enable tutorials-dojo
systemctl enable nginx

# Start services
systemctl start tutorials-dojo
systemctl restart nginx

# Setup firewall
ufw --force enable
ufw allow ssh
ufw allow http
ufw allow 8080

# Set permissions
chown -R appuser:appuser /opt/firecracker
chmod +x /opt/firecracker/*.sh 2>/dev/null || true

echo "===== Firecracker Setup Completed at $(date) ====="
echo "✓ Firecracker installed and configured"
echo "✓ Application deployed and running"
echo "✓ Services started"

# Create status file
cat > /tmp/deployment-complete << EOF
Deployment completed at: $(date)
Firecracker version: $(/usr/local/bin/firecracker --version)
Application status: $(systemctl is-active tutorials-dojo)
Nginx status: $(systemctl is-active nginx)
External IP: $(curl -s ifconfig.me)
EOF

STARTUP_EOF

echo -e "${YELLOW}[STEP 3]${NC} Creating firewall rules..."

# Create firewall rules
echo "Creating firewall rules..."
gcloud compute firewall-rules create allow-http-td --allow tcp:80 --source-ranges 0.0.0.0/0 --quiet 2>/dev/null || true
gcloud compute firewall-rules create allow-https-td --allow tcp:443 --source-ranges 0.0.0.0/0 --quiet 2>/dev/null || true
gcloud compute firewall-rules create allow-app-td --allow tcp:8080 --source-ranges 0.0.0.0/0 --quiet 2>/dev/null || true

echo -e "${YELLOW}[STEP 4]${NC} Creating GCP VM..."

# Check if VM already exists
if gcloud compute instances describe $FC_VM_NAME --zone=$FC_ZONE --quiet &>/dev/null; then
    echo -e "${YELLOW}[WARN]${NC} VM $FC_VM_NAME already exists"
    read -p "Delete and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing VM..."
        gcloud compute instances delete $FC_VM_NAME --zone=$FC_ZONE --quiet
    else
        echo "Keeping existing VM. Deployment stopped."
        exit 0
    fi
fi

# Create the GCP VM with nested virtualization (required for Firecracker)
echo "Creating VM with nested virtualization enabled..."
gcloud compute instances create ${FC_VM_NAME} \
    --enable-nested-virtualization \
    --project=${FC_PROJECT} \
    --zone=${FC_ZONE} \
    --machine-type=${FC_MACHINE_TYPE} \
    --cpu-platform=${FC_CPU_PLATFORM} \
    --image=projects/ubuntu-os-pro-cloud/global/images/ubuntu-pro-2204-jammy-v20220923 \
    --boot-disk-size=100GB \
    --boot-disk-type=pd-ssd \
    --metadata-from-file startup-script=startup-script.sh \
    --tags=http-server,https-server \
    --labels=purpose=firecracker,project=tutorials-dojo

echo -e "${GREEN}[SUCCESS]${NC} VM created successfully!"

echo -e "${YELLOW}[STEP 5]${NC} Waiting for deployment to complete..."

# Wait for deployment to complete
echo "Waiting for startup script to complete (this may take 5-10 minutes)..."
echo "You can monitor progress with:"
echo "gcloud compute ssh $FC_VM_NAME --zone=$FC_ZONE --command='tail -f /var/log/firecracker-setup.log'"

# Simple wait loop
for i in {1..60}; do
    echo -n "."
    if gcloud compute ssh $FC_VM_NAME --zone=$FC_ZONE --command="test -f /tmp/deployment-complete" --quiet 2>/dev/null; then
        echo ""
        echo -e "${GREEN}[SUCCESS]${NC} Deployment completed!"
        break
    fi
    sleep 10
done

if [ $i -eq 60 ]; then
    echo ""
    echo -e "${YELLOW}[WARN]${NC} Deployment may still be in progress. Check manually."
fi

# Get deployment info
echo -e "${YELLOW}[STEP 6]${NC} Getting deployment information..."

EXTERNAL_IP=$(gcloud compute instances describe $FC_VM_NAME --zone=$FC_ZONE --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null)

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 DEPLOYMENT COMPLETED!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📋 Deployment Details:${NC}"
echo "  VM Name: $FC_VM_NAME"
echo "  Project: $FC_PROJECT"
echo "  Zone: $FC_ZONE"
echo "  External IP: $EXTERNAL_IP"
echo ""
echo -e "${BLUE}🔗 Access URLs:${NC}"
echo "  Application: http://$EXTERNAL_IP"
echo "  API: http://$EXTERNAL_IP/api"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "  SSH: gcloud compute ssh $FC_VM_NAME --zone=$FC_ZONE"
echo "  Logs: gcloud compute ssh $FC_VM_NAME --zone=$FC_ZONE --command='tail -f /var/log/tutorials-dojo.log'"
echo "  Status: gcloud compute ssh $FC_VM_NAME --zone=$FC_ZONE --command='systemctl status tutorials-dojo'"
echo ""
echo -e "${BLUE}🚀 Firecracker Testing:${NC}"
echo "  SSH into VM and run: cd /opt/firecracker"
echo "  Test Firecracker: sudo ./firecracker --version"
echo ""
echo -e "${BLUE}💰 Cost Management:${NC}"
echo "  Stop VM: gcloud compute instances stop $FC_VM_NAME --zone=$FC_ZONE"
echo "  Start VM: gcloud compute instances start $FC_VM_NAME --zone=$FC_ZONE"
echo "  Delete VM: gcloud compute instances delete $FC_VM_NAME --zone=$FC_ZONE"
echo ""

# Test if application is accessible
echo -e "${YELLOW}[INFO]${NC} Testing application accessibility..."
if curl -s --connect-timeout 10 "http://$EXTERNAL_IP" > /dev/null; then
    echo -e "${GREEN}✅ Application is accessible!${NC}"
else
    echo -e "${YELLOW}⚠ Application may still be starting up. Try again in a few minutes.${NC}"
fi

# Clean up startup script
rm -f startup-script.sh

echo ""
echo -e "${GREEN}🎯 Next Steps:${NC}"
echo "1. Visit your application: http://$EXTERNAL_IP"
echo "2. SSH into VM to test Firecracker: gcloud compute ssh $FC_VM_NAME --zone=$FC_ZONE"
echo "3. Check Firecracker setup: ls -la /opt/firecracker/"
echo "4. Test VM creation following the official Firecracker guide"
echo ""
echo -e "${GREEN}Happy coding with Firecracker! 🔥${NC}"
