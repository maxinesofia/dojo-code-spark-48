# GCP Firecracker VM Deployment Guide

This directory contains scripts and configuration files to deploy your Tutorials Dojo project to a Google Cloud Platform (GCP) VM instance with Firecracker virtualization.

## Prerequisites

1. **GCP Account**: You need a GCP account with billing enabled
2. **gcloud CLI**: Install and authenticate the Google Cloud CLI
3. **Project Setup**: Create or select a GCP project
4. **Permissions**: Ensure you have Compute Engine permissions

### Install gcloud CLI

```bash
# macOS
brew install google-cloud-sdk

# Initialize and authenticate
gcloud init
gcloud auth login
```

## Quick Start

1. **Set up GCP CLI** (if not already done):
   ```bash
   brew install google-cloud-sdk
   gcloud init
   gcloud auth login
   ```

2. **Configure your project**:
   ```bash
   export PROJECT_ID="your-gcp-project-id"
   gcloud config set project $PROJECT_ID
   ```

3. **Check zone availability** (optional):
   ```bash
   ./deploy/check-zones.sh --project-id your-gcp-project-id
   ```

4. **Deploy to GCP** (uses us-east1-b and n1-standard-2 by default):
   ```bash
   ./deploy/gcp-firecracker-deploy.sh --project-id your-gcp-project-id
   ```

5. **Manage your deployment**:
   ```bash
   ./deploy/gcp-vm-manager.sh status    # Check status
   ./deploy/gcp-vm-manager.sh logs      # View logs
   ./deploy/gcp-vm-manager.sh deploy    # Deploy updates
   ```

## Files Overview

### `gcp-firecracker-deploy.sh`
Main deployment script that:
- Creates GCP VM instance with Ubuntu 22.04
- Installs Firecracker, Node.js, and dependencies
- Sets up networking and security
- Deploys your application
- Configures Nginx as reverse proxy
- Sets up systemd services

### `gcp-vm-manager.sh`
Management script for common operations:
- Start/stop/restart VM
- Deploy updates
- View logs and monitor resources
- SSH access
- Backup management
- Firecracker status checks

### `config.env`
Configuration file with all deployment settings:
- VM specifications
- Network configuration
- Application settings
- Security options

### `check-zones.sh`
Zone availability checker that:
- Tests machine type availability across multiple GCP zones
- Provides recommendations for available zones
- Helps avoid deployment failures due to capacity issues
- Supports filtering by region or specific zones

## Deployment Options

### Basic Deployment
```bash
./deploy/gcp-firecracker-deploy.sh
```

### Custom Configuration
```bash
# Using your known working configuration (default)
./deploy/gcp-firecracker-deploy.sh --project-id my-project

# Or specify different settings
./deploy/gcp-firecracker-deploy.sh \
  --project-id my-project \
  --zone us-west1-a \
  --instance-name my-vm \
  --machine-type n1-standard-4
```

### Using Configuration File
Edit `deploy/config.env` with your settings, then:
```bash
source deploy/config.env
./deploy/gcp-firecracker-deploy.sh --project-id $PROJECT_ID
```

## VM Management

### Check Status
```bash
./deploy/gcp-vm-manager.sh status
```

### Deploy Updates
```bash
./deploy/gcp-vm-manager.sh deploy
```

### View Logs
```bash
./deploy/gcp-vm-manager.sh logs
```

### SSH Access
```bash
./deploy/gcp-vm-manager.sh ssh
```

### Monitor Resources
```bash
./deploy/gcp-vm-manager.sh monitor
```

### Restart Services
```bash
./deploy/gcp-vm-manager.sh restart-app
./deploy/gcp-vm-manager.sh restart-nginx
```

## Architecture

```
Internet
    ↓
GCP Load Balancer (optional)
    ↓
VM Instance (Ubuntu 22.04)
    ├── Nginx (Port 80/443) → Reverse Proxy
    ├── Node.js App (Port 8080) → Your Application
    └── Firecracker VMs → Code Execution
```

## Security Features

1. **Firewall Rules**: Only necessary ports are exposed
2. **VM Isolation**: Firecracker provides VM-level isolation
3. **Network Segmentation**: Separate network for Firecracker VMs
4. **Process Isolation**: Application runs as non-root user
5. **Resource Limits**: Memory and CPU limits per execution
6. **Time Limits**: Execution timeout prevents infinite loops

## Cost Optimization

### Machine Types
- **Development**: `e2-micro` ($5-10/month)
- **Production**: `n1-standard-2` ($50-70/month)
- **High Performance**: `n1-standard-4` ($100-140/month)

### Cost Saving Tips
1. Use preemptible instances for development
2. Stop instances when not in use
3. Use sustained use discounts
4. Monitor with GCP billing alerts

## Monitoring and Logging

### Application Logs
```bash
# Real-time logs
./deploy/gcp-vm-manager.sh logs

# System logs
gcloud compute ssh your-instance --command="sudo journalctl -f"
```

### Resource Monitoring
```bash
# Built-in monitoring
./deploy/gcp-vm-manager.sh monitor

# GCP Console
# Navigate to Compute Engine → VM instances → your-instance
```

### Performance Metrics
- VM startup time: ~2 minutes
- Firecracker VM startup: ~125ms
- Application cold start: ~5 seconds
- Memory usage: ~512MB base + 128MB per active VM

## Backup and Recovery

### Create Backup
```bash
./deploy/gcp-vm-manager.sh backup
```

### Restore from Backup
```bash
gcloud compute disks create restored-disk --source-snapshot=backup-name
gcloud compute instances create restored-vm --disk=restored-disk
```

## Troubleshooting

### Common Issues

1. **Instance unavailable in zone**
   ```bash
   # The script now defaults to us-east1-b (known working zone)
   ./deploy/gcp-firecracker-deploy.sh --project-id YOUR_PROJECT_ID
   
   # If you need a different zone
   ./deploy/gcp-firecracker-deploy.sh --zone us-central1-b --project-id YOUR_PROJECT_ID
   
   # Check zones if needed
   ./deploy/check-zones.sh --project-id YOUR_PROJECT_ID
   ```

2. **Permission Denied**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Firecracker Not Starting**
   ```bash
   # Check KVM support
   ./deploy/gcp-vm-manager.sh ssh
   sudo kvm-ok
   ```

4. **Application Not Accessible**
   ```bash
   # Check firewall rules
   gcloud compute firewall-rules list
   
   # Check service status
   ./deploy/gcp-vm-manager.sh ssh
   sudo systemctl status tutorials-dojo
   ```

5. **Out of Memory**
   ```bash
   # Monitor resources
   ./deploy/gcp-vm-manager.sh monitor
   
   # Upgrade machine type
   gcloud compute instances set-machine-type INSTANCE_NAME --machine-type n1-standard-4
   ```

### Debug Mode
Enable verbose logging by setting:
```bash
export DEBUG=true
./deploy/gcp-firecracker-deploy.sh
```

## Scaling

### Horizontal Scaling
1. Use GCP Load Balancer
2. Deploy multiple instances
3. Use Cloud SQL for shared database
4. Implement session storage (Redis)

### Vertical Scaling
```bash
# Stop instance
./deploy/gcp-vm-manager.sh stop

# Change machine type
gcloud compute instances set-machine-type $INSTANCE_NAME --machine-type n1-standard-4

# Start instance
./deploy/gcp-vm-manager.sh start
```

## Production Checklist

- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring and alerting
- [ ] Configure automatic backups
- [ ] Implement log rotation
- [ ] Set up domain name and DNS
- [ ] Configure rate limiting
- [ ] Set up error tracking (e.g., Sentry)
- [ ] Implement health checks
- [ ] Configure auto-scaling (if needed)
- [ ] Set up CI/CD pipeline

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review GCP documentation
3. Check application logs
4. Monitor system resources

## Cleanup

To remove all resources:
```bash
./deploy/gcp-vm-manager.sh delete
gcloud compute firewall-rules delete allow-http-8080 allow-https-8443 allow-ssh
```

## Next Steps

1. **SSL Setup**: Configure HTTPS with Let's Encrypt
2. **Domain**: Point your domain to the VM's external IP
3. **Monitoring**: Set up Cloud Monitoring and alerting
4. **CI/CD**: Automate deployments with Cloud Build
5. **Database**: Migrate to Cloud SQL for production
6. **CDN**: Use Cloud CDN for static assets
