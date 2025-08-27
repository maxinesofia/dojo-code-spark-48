# 🚀 Tutorials Dojo - GCP Firecracker Deployment with GitHub Integration

This directory contains deployment scripts for setting up your Tutorials Dojo application on Google Cloud Platform (GCP) with Firecracker virtualization and seamless GitHub integration.

## 📋 Overview

The deployment system provides:

- **🔐 Secure Code Execution**: Firecracker microVMs for isolated code execution
- **🔄 GitHub Integration**: Automatic deployment from your GitHub repository
- **🔧 Auto-Updates**: Continuous deployment with git-based updates
- **📊 Monitoring**: Comprehensive logging and monitoring tools
- **🌐 Production Ready**: Nginx, SSL support, and service management

## 🚀 Quick Start

### Prerequisites

1. **Google Cloud Platform Account**
   - Project with billing enabled
   - gcloud CLI installed and authenticated
   - Compute Engine API enabled

2. **GitHub Repository**
   - Your code repository (this project)
   - Admin access to add deploy keys

3. **Local Environment**
   - bash shell (Linux/macOS/WSL)
   - git installed
   - curl installed

### 1. Deploy to GCP

```bash
# Make scripts executable
chmod +x gcp-firecracker-github-deploy.sh
chmod +x github-integration-manager.sh

# Run the deployment script
./gcp-firecracker-github-deploy.sh
```

The deployment script will:
- ✅ Create a GCP VM instance with Firecracker
- ✅ Install all dependencies (Node.js, Nginx, etc.)
- ✅ Set up Firecracker virtualization environment
- ✅ Clone your GitHub repository
- ✅ Build and deploy your application
- ✅ Configure auto-update mechanisms

### 2. Setup GitHub Integration

After deployment completes, you'll see a GitHub deploy key. Add it to your repository:

```bash
# Get the deploy key
./github-integration-manager.sh get-deploy-key
```

**Add the key to GitHub:**
1. Go to your repository on GitHub
2. Navigate to **Settings → Deploy keys**
3. Click **Add deploy key**
4. Paste the public key
5. ✅ **Check "Allow write access"**
6. Save the key

### 3. Verify Deployment

```bash
# Check deployment status
./github-integration-manager.sh check-status

# View application logs
./github-integration-manager.sh view-logs app
```

## 📁 File Structure

```
deploy/
├── gcp-firecracker-github-deploy.sh     # Main deployment script
├── github-integration-manager.sh        # GitHub integration manager
├── gcp-firecracker-deploy.sh            # Original deployment script
├── quick-setup.sh                       # Quick setup helper
├── startup-script.sh                    # VM startup script (generated)
├── config.env                          # Configuration file
└── README.md                           # This file
```

## 🔧 Configuration

### GCP Configuration

Edit the variables at the top of `gcp-firecracker-github-deploy.sh`:

```bash
# GCP Configuration
PROJECT_ID="your-gcp-project-id"
REGION="us-east1"
ZONE="us-east1-b" 
INSTANCE_NAME="tutorials-dojo-firecracker-github"
MACHINE_TYPE="n1-standard-4"
BOOT_DISK_SIZE="100GB"

# GitHub Configuration
GITHUB_REPO_URL="https://github.com/yourusername/your-repo.git"
GITHUB_BRANCH="main"
```

### Application Configuration

The deployment automatically configures:

- **Frontend**: React + Vite application served by Nginx
- **Backend**: Node.js API server on port 8080
- **Database**: SQLite database for development
- **Firecracker**: Secure VM execution environment
- **SSL**: Ready for Let's Encrypt certificates

## 🛠️ Management Commands

Use the GitHub integration manager for ongoing operations:

### Basic Operations

```bash
# Check deployment status
./github-integration-manager.sh check-status

# Deploy latest changes from GitHub
./github-integration-manager.sh deploy-update

# View different types of logs
./github-integration-manager.sh view-logs app          # Application logs
./github-integration-manager.sh view-logs nginx       # Nginx logs
./github-integration-manager.sh view-logs deployment  # Deployment logs

# Restart services
./github-integration-manager.sh restart-services
```

### Advanced Operations

```bash
# Setup SSL certificate
./github-integration-manager.sh setup-ssl

# Create backup
./github-integration-manager.sh backup

# Rollback to previous version
./github-integration-manager.sh rollback

# Real-time monitoring dashboard
./github-integration-manager.sh monitor
```

## 🔒 Security Features

### Firecracker Isolation

- **VM-level isolation**: Each code execution runs in its own microVM
- **Resource limits**: Configurable CPU and memory constraints  
- **Network isolation**: Controlled network access for VMs
- **Time limits**: Automatic timeout for long-running processes

### System Security

- **UFW Firewall**: Configured to allow only necessary ports
- **SSH Key Authentication**: Password authentication disabled
- **Service User**: Application runs as non-root user
- **Secure Headers**: Nginx configured with security headers

### Access Control

```bash
# SSH into the VM
gcloud compute ssh tutorials-dojo-firecracker-github --zone=us-east1-b

# View service status
sudo systemctl status tutorials-dojo

# Check firewall rules
sudo ufw status
```

## 📊 Monitoring & Logging

### Log Locations

```bash
# Application logs
/var/log/tutorials-dojo/app.log        # Application output
/var/log/tutorials-dojo/error.log      # Application errors

# System logs
/var/log/tutorials-dojo-startup.log    # Deployment startup log
/var/log/nginx/access.log              # Nginx access log
/var/log/nginx/error.log               # Nginx error log

# Service logs (via journalctl)
sudo journalctl -u tutorials-dojo -f   # Real-time service logs
```

### Monitoring Dashboard

Start the built-in monitoring dashboard:

```bash
./github-integration-manager.sh monitor
```

This shows:
- Service status (Nginx, Application, Auto-update)
- Resource usage (Memory, Disk, Load)
- Network status and API health
- Recent activity logs

## 🔄 Auto-Update System

The deployment includes an automatic update system that:

1. **Checks for updates** every 5 minutes
2. **Pulls latest changes** from your GitHub repository
3. **Updates dependencies** if package.json changes
4. **Rebuilds the frontend** automatically
5. **Restarts services** as needed
6. **Logs all activities** for monitoring

### Manual Updates

Force an immediate update:

```bash
./github-integration-manager.sh deploy-update
```

### Disable Auto-Updates

```bash
# SSH into the VM
gcloud compute ssh tutorials-dojo-firecracker-github --zone=us-east1-b

# Disable the auto-update timer
sudo systemctl disable tutorials-dojo-update.timer
sudo systemctl stop tutorials-dojo-update.timer
```

## 🌐 Network Configuration

### Ports

- **80**: HTTP (Nginx reverse proxy)
- **443**: HTTPS (SSL - after setup)
- **8080**: Backend API (internal)
- **22**: SSH access

### Firewall Rules

The deployment creates these firewall rules:
- `allow-http-tutorials-dojo`: HTTP traffic (port 80)
- `allow-https-tutorials-dojo`: HTTPS traffic (port 443)  
- `allow-app-tutorials-dojo`: Direct API access (port 8080)
- `allow-ssh-tutorials-dojo`: SSH access (port 22)

### DNS Setup

For production use with SSL:

1. **Point your domain** to the VM's external IP
2. **Wait for DNS propagation** (can take up to 48 hours)
3. **Setup SSL certificate**:
   ```bash
   ./github-integration-manager.sh setup-ssl
   ```

## 🔧 Troubleshooting

### Common Issues

#### Deployment Fails

```bash
# Check the startup log
gcloud compute ssh tutorials-dojo-firecracker-github --zone=us-east1-b --command="sudo tail -f /var/log/tutorials-dojo-startup.log"

# Check if services are running
./github-integration-manager.sh check-status
```

#### Application Not Accessible

```bash
# Check if VM is running
gcloud compute instances list | grep tutorials-dojo

# Check firewall rules
gcloud compute firewall-rules list | grep tutorials-dojo

# Test local API
gcloud compute ssh tutorials-dojo-firecracker-github --zone=us-east1-b --command="curl -s http://localhost:8080/api/health"
```

#### GitHub Integration Issues

```bash
# Test GitHub connectivity
gcloud compute ssh tutorials-dojo-firecracker-github --zone=us-east1-b --command="ssh -T git@github.com"

# Regenerate deploy key
./github-integration-manager.sh get-deploy-key
```

#### Service Restart Issues

```bash
# Check service logs
./github-integration-manager.sh view-logs system

# Manual service restart
gcloud compute ssh tutorials-dojo-firecracker-github --zone=us-east1-b --command="sudo systemctl restart tutorials-dojo"
```

### Performance Issues

```bash
# Check resource usage
./github-integration-manager.sh monitor

# Upgrade VM if needed
gcloud compute instances stop tutorials-dojo-firecracker-github --zone=us-east1-b
gcloud compute instances set-machine-type tutorials-dojo-firecracker-github --machine-type=n1-standard-8 --zone=us-east1-b
gcloud compute instances start tutorials-dojo-firecracker-github --zone=us-east1-b
```

## 🚀 Advanced Configuration

### Firecracker VM Customization

Edit `/opt/firecracker/vm-config-template.json` on the VM:

```json
{
  "machine-config": {
    "vcpu_count": 2,        // Increase CPU cores
    "mem_size_mib": 512,    // Increase memory
    "ht_enabled": false
  }
}
```

### Environment Variables

Set custom environment variables in `/etc/systemd/system/tutorials-dojo.service`:

```ini
[Service]
Environment=NODE_ENV=production
Environment=PORT=8080
Environment=DATABASE_URL=sqlite:/opt/tutorials-dojo/database.sqlite
Environment=CUSTOM_VAR=value
```

### Custom Domains

For multiple domains or subdomains, edit `/etc/nginx/sites-available/tutorials-dojo`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com api.yourdomain.com;
    # ... rest of configuration
}
```

## 🔗 Useful Links

- **GCP Console**: [https://console.cloud.google.com](https://console.cloud.google.com)
- **Firecracker Documentation**: [https://github.com/firecracker-microvm/firecracker](https://github.com/firecracker-microvm/firecracker)
- **GitHub Deploy Keys**: [https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)

## 🆘 Support

If you encounter issues:

1. **Check the logs** using the management commands
2. **Review this README** for common solutions
3. **Test each component** individually
4. **Check GCP quotas and billing**
5. **Verify GitHub repository access**

## 📝 Notes

- **VM Costs**: Remember to stop the VM when not in use to avoid charges
- **Backups**: Regular backups are created automatically during updates
- **Security**: Keep your VM updated with security patches
- **Monitoring**: Set up GCP monitoring for production use

---

**🎉 Happy Coding with Tutorials Dojo on GCP + Firecracker!**
