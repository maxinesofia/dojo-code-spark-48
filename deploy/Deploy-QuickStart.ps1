# Simple GCP VM Creation Script for Firecracker
param(
    [string]$ProjectId = "td-playcloud-labs",
    [string]$VmName = "td-firecracker-starter01", 
    [string]$Zone = "us-east1-b",
    [string]$MachineType = "n2-standard-2"
)

Write-Host "GCP Firecracker VM Deployment" -ForegroundColor Cyan
Write-Host "Project: $ProjectId" 
Write-Host "VM Name: $VmName"
Write-Host "Zone: $Zone"
Write-Host "Machine Type: $MachineType"
Write-Host ""

$confirmation = Read-Host "Proceed with deployment? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

# Check gcloud
try {
    gcloud --version | Out-Null
    Write-Host "gcloud CLI found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: gcloud CLI not found!" -ForegroundColor Red
    exit 1
}

# Set project
Write-Host "Setting project..." -ForegroundColor Yellow
gcloud config set project $ProjectId

# Enable APIs
Write-Host "Enabling APIs..." -ForegroundColor Yellow
gcloud services enable compute.googleapis.com

# Create basic startup script
$startupContent = @"
#!/bin/bash
apt-get update
apt-get install -y curl wget git nodejs npm nginx

# Install Firecracker
cd /opt
mkdir -p firecracker
cd firecracker

# Download Firecracker binary  
ARCH=`$(uname -m)
RELEASE_URL="https://github.com/firecracker-microvm/firecracker/releases"
LATEST_RELEASE=`$(basename `$(curl -fsSLI -o /dev/null -w %{url_effective} `$RELEASE_URL/latest))
curl -L `$RELEASE_URL/download/`$LATEST_RELEASE/firecracker-`$LATEST_RELEASE-`$ARCH.tgz | tar -xz
mv release-*/firecracker-* /usr/local/bin/firecracker
chmod +x /usr/local/bin/firecracker

# Clone and setup app
cd /opt
git clone https://github.com/maxinesofia/dojo-code-spark-48.git tutorials-dojo
cd tutorials-dojo
npm install
cd backend && npm install

# Mark setup complete
touch /tmp/setup-complete
"@

$startupContent | Out-File -FilePath "startup.sh" -Encoding UTF8

Write-Host "Creating firewall rules..." -ForegroundColor Yellow
gcloud compute firewall-rules create allow-http-8080 --allow tcp:8080 --source-ranges 0.0.0.0/0 --quiet 2>$null

Write-Host "Creating VM..." -ForegroundColor Yellow

# Check if VM exists
$vmExists = $null
try {
    $vmExists = gcloud compute instances describe $VmName --zone=$Zone --quiet 2>$null
} catch {
    # VM doesn't exist
}

if ($vmExists) {
    Write-Host "VM exists. Delete it first? (y/N)" -ForegroundColor Yellow
    $delete = Read-Host
    if ($delete -eq 'y' -or $delete -eq 'Y') {
        gcloud compute instances delete $VmName --zone=$Zone --quiet
    } else {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
}

# Create VM
gcloud compute instances create $VmName --enable-nested-virtualization --project=$ProjectId --zone=$Zone --machine-type=$MachineType --image-family=ubuntu-2204-lts --image-project=ubuntu-os-cloud --boot-disk-size=100GB --metadata-from-file=startup-script=startup.sh --tags=http-server

if ($LASTEXITCODE -eq 0) {
    Write-Host "VM created successfully!" -ForegroundColor Green
    
    # Get external IP
    $externalIp = gcloud compute instances describe $VmName --zone=$Zone --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "DEPLOYMENT COMPLETED!" -ForegroundColor Green  
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "VM Name: $VmName"
    Write-Host "External IP: $externalIp"
    Write-Host ""
    Write-Host "SSH into VM: gcloud compute ssh $VmName --zone=$Zone"
    Write-Host "Test Firecracker: ssh and run 'sudo firecracker --version'"
    Write-Host ""
    Write-Host "Stop VM: gcloud compute instances stop $VmName --zone=$Zone"
    Write-Host "Delete VM: gcloud compute instances delete $VmName --zone=$Zone"
    Write-Host ""
} else {
    Write-Host "VM creation failed!" -ForegroundColor Red
}

# Cleanup
Remove-Item -Path "startup.sh" -Force -ErrorAction SilentlyContinue
