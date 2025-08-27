# PowerShell version of the GCP Firecracker deployment script
# For Windows users who want to deploy directly from PowerShell

param(
    [string]$ProjectId = "td-playcloud-labs",
    [string]$VmName = "td-firecracker-starter01", 
    [string]$Zone = "us-east1-b",
    [string]$MachineType = "n2-standard-2",
    [string]$BootDiskSize = "100GB"
)

Write-Host "
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 GCP Firecracker Deployment (PowerShell)               ║
║                                                              ║
║    Deploying your Tutorials Dojo app to GCP with            ║
║    Firecracker virtualization support                       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "`[INFO`] Configuration:" -ForegroundColor Green
Write-Host "  Project: $ProjectId"
Write-Host "  VM Name: $VmName"
Write-Host "  Zone: $Zone" 
Write-Host "  Machine Type: $MachineType"
Write-Host ""

# Confirm deployment
$confirmation = Read-Host "Do you want to proceed with this deployment? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

# Check if gcloud is available
try {
    $gcloudVersion = gcloud --version 2>$null
    Write-Host "`[INFO`] gcloud CLI found: $($gcloudVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "`[ERROR`] gcloud CLI not found! Please install Google Cloud SDK." -ForegroundColor Red
    Write-Host "Visit: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    exit 1
}

Write-Host "`[STEP 1`] Setting up GCP project..." -ForegroundColor Yellow

# Check if project exists, create if it doesn't
$projectExists = gcloud projects describe $ProjectId 2>$null
if (!$projectExists) {
    Write-Host "Creating project $ProjectId..." -ForegroundColor Blue
    gcloud projects create $ProjectId --enable-cloud-apis --set-as-default
    
    Write-Host "[WARNING] New project created. You may need to:" -ForegroundColor Yellow
    Write-Host "1. Enable billing for the project" -ForegroundColor Yellow
    Write-Host "2. Wait a few minutes for APIs to be fully enabled" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue with deployment? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        Write-Host "Deployment paused. Please set up billing and run again." -ForegroundColor Yellow
        exit 0
    }
} else {
    Write-Host "Using existing project $ProjectId" -ForegroundColor Blue
    gcloud config set project $ProjectId
}

# Enable required APIs
Write-Host "Enabling required APIs..." -ForegroundColor Blue
gcloud services enable compute.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com

Write-Host "[STEP 2] Creating startup script..." -ForegroundColor Yellow

# Create startup script content
$startupScript = @"
#!/bin/bash
# Firecracker VM Setup Script - Official Method for PowerShell deployment

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
VMX_COUNT=`$(grep -cw vmx /proc/cpuinfo || echo "0")`
echo "VMX support detected: `$VMX_COUNT cores"

# Setup KVM permissions
echo "[4/8] Setting up KVM permissions..."
setfacl -m u:`${USER}:rw /dev/kvm

# Add user to kvm group if it exists
if getent group kvm >/dev/null; then
    usermod -aG kvm `${USER}
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
ARCH="`$(uname -m)"
echo "Architecture: `$ARCH"

# Download latest kernel (5.10 series)
echo "Downloading kernel..."
latest=`$(wget "http://spec.ccfc.min.s3.amazonaws.com/?prefix=firecracker-ci/v1.11/`$ARCH/vmlinux-5.10&list-type=2" -O - 2>/dev/null | grep -oP "(?<=<Key>)(firecracker-ci/v1.11/`$ARCH/vmlinux-5\.10\.[0-9]{1,3})(?=</Key>)" | head -1)
wget "https://s3.amazonaws.com/spec.ccfc.min/`${latest}" -O vmlinux-5.10

# Download Ubuntu 24.04 rootfs
echo "Downloading rootfs..."
wget -O ubuntu-24.04.squashfs.upstream "https://s3.amazonaws.com/spec.ccfc.min/firecracker-ci/v1.11/`${ARCH}/ubuntu-24.04.squashfs"

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
latest_release=`$(basename `$(curl -fsSLI -o /dev/null -w %{url_effective} `${release_url}/latest))
curl -L `${release_url}/download/`${latest_release}/firecracker-`${latest_release}-`${ARCH}.tgz | tar -xz

# Install binary
mv release-`${latest_release}-`${ARCH}/firecracker-`${latest_release}-`${ARCH} /usr/local/bin/firecracker
chmod +x /usr/local/bin/firecracker

echo "Firecracker version: `$(/usr/local/bin/firecracker --version)"

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
        proxy_set_header Host `$host;
        proxy_set_header X-Real-IP `$remote_addr;
        proxy_set_header X-Forwarded-For `$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto `$scheme;
    }

    # Static files
    location / {
        root /opt/tutorials-dojo/dist;
        try_files `$uri `$uri/ /index.html;
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

echo "===== Firecracker Setup Completed at `$(date) ====="
echo "✓ Firecracker installed and configured"
echo "✓ Application deployed and running"
echo "✓ Services started"

# Create status file
cat > /tmp/deployment-complete << EOF
Deployment completed at: `$(date)
Firecracker version: `$(/usr/local/bin/firecracker --version)
Application status: `$(systemctl is-active tutorials-dojo)
Nginx status: `$(systemctl is-active nginx)
External IP: `$(curl -s ifconfig.me)
EOF
"@

# Write startup script to file
$startupScript | Out-File -FilePath "startup-script-powershell.sh" -Encoding UTF8

Write-Host "[STEP 3] Creating firewall rules..." -ForegroundColor Yellow

# Create firewall rules
Write-Host "Creating firewall rules..." -ForegroundColor Blue
try {
    gcloud compute firewall-rules create allow-http-td --allow tcp:80 --source-ranges 0.0.0.0/0 --quiet 2>$null
} catch {
    Write-Host "Firewall rule allow-http-td already exists or failed to create" -ForegroundColor Yellow
}

try {
    gcloud compute firewall-rules create allow-https-td --allow tcp:443 --source-ranges 0.0.0.0/0 --quiet 2>$null  
} catch {
    Write-Host "Firewall rule allow-https-td already exists or failed to create" -ForegroundColor Yellow
}

try {
    gcloud compute firewall-rules create allow-app-td --allow tcp:8080 --source-ranges 0.0.0.0/0 --quiet 2>$null
} catch {
    Write-Host "Firewall rule allow-app-td already exists or failed to create" -ForegroundColor Yellow
}

Write-Host "[STEP 4] Creating GCP VM..." -ForegroundColor Yellow

# Check if VM already exists
$vmExists = gcloud compute instances describe $VmName --zone=$Zone --quiet 2>$null
if ($vmExists) {
    Write-Host "[WARN] VM $VmName already exists" -ForegroundColor Yellow
    $deleteConfirm = Read-Host "Delete and recreate? (y/N)"
    if ($deleteConfirm -eq 'y' -or $deleteConfirm -eq 'Y') {
        Write-Host "Deleting existing VM..." -ForegroundColor Blue
        gcloud compute instances delete $VmName --zone=$Zone --quiet
    } else {
        Write-Host "Keeping existing VM. Deployment stopped." -ForegroundColor Yellow
        exit 0
    }
}

# Create the GCP VM with nested virtualization
Write-Host "Creating VM with nested virtualization enabled..." -ForegroundColor Blue
$createCommand = @(
    "gcloud", "compute", "instances", "create", $VmName,
    "--enable-nested-virtualization",
    "--project=$ProjectId", 
    "--zone=$Zone",
    "--machine-type=$MachineType",
    "--cpu-platform=AUTOMATIC",
    "--image=projects/ubuntu-os-pro-cloud/global/images/ubuntu-pro-2204-jammy-v20220923",
    "--boot-disk-size=$BootDiskSize",
    "--boot-disk-type=pd-ssd",
    "--metadata-from-file=startup-script=startup-script-powershell.sh",
    "--tags=http-server,https-server",
    "--labels=purpose=firecracker,project=tutorials-dojo"
)

& $createCommand[0] $createCommand[1..($createCommand.Length-1)]

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] VM created successfully!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] VM creation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "[STEP 5] Waiting for deployment to complete..." -ForegroundColor Yellow

# Wait for deployment to complete
Write-Host "Waiting for startup script to complete (this may take 5-10 minutes)..." -ForegroundColor Blue
Write-Host "You can monitor progress with:" -ForegroundColor Blue
Write-Host "gcloud compute ssh $VmName --zone=$Zone --command='tail -f /var/log/firecracker-setup.log'" -ForegroundColor Cyan

# Simple wait loop
$maxAttempts = 60
for ($i = 1; $i -le $maxAttempts; $i++) {
    Write-Host "." -NoNewline
    $deploymentComplete = gcloud compute ssh $VmName --zone=$Zone --command="test -f /tmp/deployment-complete" --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Deployment completed!" -ForegroundColor Green
        break
    }
    Start-Sleep -Seconds 10
}

if ($i -gt $maxAttempts) {
    Write-Host ""
    Write-Host "[WARN] Deployment may still be in progress. Check manually." -ForegroundColor Yellow
}

# Get deployment info
Write-Host "[STEP 6] Getting deployment information..." -ForegroundColor Yellow

$externalIp = gcloud compute instances describe $VmName --zone=$Zone --format="get(networkInterfaces[0].accessConfigs[0].natIP)" 2>$null

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETED!" -ForegroundColor Green  
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Deployment Details:" -ForegroundColor Blue
Write-Host "  VM Name: $VmName"
Write-Host "  Project: $ProjectId" 
Write-Host "  Zone: $Zone"
Write-Host "  External IP: $externalIp"
Write-Host ""
Write-Host "🔗 Access URLs:" -ForegroundColor Blue
Write-Host "  Application: http://$externalIp"
Write-Host "  API: http://$externalIp/api"
Write-Host ""
Write-Host "🔧 Management Commands:" -ForegroundColor Blue
Write-Host "  SSH: gcloud compute ssh $VmName --zone=$Zone"
Write-Host "  Logs: gcloud compute ssh $VmName --zone=$Zone --command='tail -f /var/log/tutorials-dojo.log'"
Write-Host "  Status: gcloud compute ssh $VmName --zone=$Zone --command='systemctl status tutorials-dojo'"
Write-Host ""
Write-Host "🚀 Firecracker Testing:" -ForegroundColor Blue
Write-Host "  SSH into VM and run: cd /opt/firecracker"
Write-Host "  Test Firecracker: sudo ./firecracker --version"
Write-Host ""
Write-Host "💰 Cost Management:" -ForegroundColor Blue
Write-Host "  Stop VM: gcloud compute instances stop $VmName --zone=$Zone"
Write-Host "  Start VM: gcloud compute instances start $VmName --zone=$Zone"
Write-Host "  Delete VM: gcloud compute instances delete $VmName --zone=$Zone"
Write-Host ""

# Test if application is accessible
Write-Host "[INFO] Testing application accessibility..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$externalIp" -TimeoutSec 10 -UseBasicParsing 2>$null
    Write-Host "✅ Application is accessible!" -ForegroundColor Green
} catch {
    Write-Host "⚠ Application may still be starting up. Try again in a few minutes." -ForegroundColor Yellow
}

# Clean up startup script
Remove-Item -Path "startup-script-powershell.sh" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Green
Write-Host "1. Visit your application: http://$externalIp"
Write-Host "2. SSH into VM to test Firecracker: gcloud compute ssh $VmName --zone=$Zone"
Write-Host "3. Check Firecracker setup: ls -la /opt/firecracker/"
Write-Host "4. Test VM creation following the official Firecracker guide"
Write-Host ""
Write-Host "Happy coding with Firecracker! 🔥" -ForegroundColor Green
