#!/bin/bash

# GitHub Integration Management Script for Tutorials Dojo
# This script helps manage GitHub integration, deployments, and updates

set -e

# Configuration
INSTANCE_NAME="tutorials-dojo-firecracker-github"
ZONE="us-east1-b"
GITHUB_REPO="maxinesofia/dojo-code-spark-48"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

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

# Function to show usage
show_usage() {
    echo "
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║         📚 Tutorials Dojo - GitHub Management               ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝

    Usage: $0 [COMMAND]

    Commands:
      setup-github       Setup GitHub SSH key and repository access
      get-deploy-key      Get the SSH public key for GitHub deploy key
      deploy-update       Deploy latest changes from GitHub
      check-status        Check deployment and service status
      view-logs          View application and deployment logs
      restart-services    Restart all services
      setup-ssl          Setup SSL certificate with Let's Encrypt
      backup             Create backup of current deployment
      rollback           Rollback to previous version
      monitor            Start monitoring dashboard
      help               Show this help message

    Examples:
      $0 setup-github            # Initial GitHub setup
      $0 get-deploy-key          # Get public key for GitHub
      $0 deploy-update           # Deploy latest changes
      $0 check-status            # Check all services
      $0 view-logs app           # View application logs
      $0 view-logs nginx         # View nginx logs
      $0 view-logs deployment    # View deployment logs
    "
}

# Function to check if VM exists and is running
check_vm_status() {
    if ! gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --quiet >/dev/null 2>&1; then
        log_error "VM instance '$INSTANCE_NAME' not found in zone '$ZONE'"
        log_info "Run the deployment script first: ./gcp-firecracker-github-deploy.sh"
        exit 1
    fi
    
    STATUS=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="get(status)")
    if [ "$STATUS" != "RUNNING" ]; then
        log_warn "VM instance is not running (status: $STATUS)"
        log_info "Starting VM..."
        gcloud compute instances start "$INSTANCE_NAME" --zone="$ZONE"
        log_info "Waiting for VM to start..."
        sleep 30
    fi
}

# Function to execute remote command
remote_exec() {
    local cmd="$1"
    local show_output="${2:-true}"
    
    if [ "$show_output" = "true" ]; then
        gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="$cmd"
    else
        gcloud compute ssh "$INSTANCE_NAME" --zone="$ZONE" --command="$cmd" >/dev/null 2>&1
    fi
}

# Setup GitHub integration
setup_github() {
    log_step "Setting up GitHub integration..."
    check_vm_status
    
    log_info "Configuring GitHub access..."
    remote_exec "
        # Configure git if not already done
        git config --global user.name 'Tutorials Dojo Server' 2>/dev/null || true
        git config --global user.email 'server@tutorials-dojo.com' 2>/dev/null || true
        
        # Add GitHub to known hosts if not already added
        ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null || true
        
        # Test GitHub connection
        echo 'Testing GitHub SSH connection...'
        ssh -T git@github.com || true
    "
    
    log_info "GitHub integration setup completed"
    log_info "Next step: Add the deploy key to your GitHub repository"
    
    # Show the deploy key
    get_deploy_key
}

# Get deploy key for GitHub
get_deploy_key() {
    log_step "Getting GitHub deploy key..."
    check_vm_status
    
    echo ""
    echo "============== GITHUB DEPLOY KEY =============="
    echo "Add this key to your GitHub repository:"
    echo "Repository → Settings → Deploy keys → Add deploy key"
    echo ""
    echo "Key name: tutorials-dojo-$(date +%Y%m%d)"
    echo "✓ Allow write access"
    echo ""
    remote_exec "cat ~/.ssh/id_rsa.pub" "true"
    echo ""
    echo "==============================================="
    echo ""
    echo "GitHub Repository URL: https://github.com/$GITHUB_REPO/settings/keys"
}

# Deploy updates from GitHub
deploy_update() {
    log_step "Deploying latest updates from GitHub..."
    check_vm_status
    
    log_info "Pulling latest changes and rebuilding..."
    remote_exec "
        set -e
        cd /opt/tutorials-dojo
        
        echo '📦 Fetching latest changes...'
        git fetch origin main
        
        # Check if there are any changes
        CURRENT_COMMIT=\$(git rev-parse HEAD)
        REMOTE_COMMIT=\$(git rev-parse origin/main)
        
        if [ \"\$CURRENT_COMMIT\" = \"\$REMOTE_COMMIT\" ]; then
            echo '✅ Already up to date!'
            exit 0
        fi
        
        echo '🔄 Updates found, deploying...'
        echo \"Current: \$CURRENT_COMMIT\"
        echo \"Remote:  \$REMOTE_COMMIT\"
        
        # Pull changes
        git pull origin main
        
        # Check if dependencies need updating
        if git diff --name-only \$CURRENT_COMMIT \$REMOTE_COMMIT | grep -q 'package.json'; then
            echo '📦 Package.json changed, updating dependencies...'
            npm install
            cd backend && npm install && cd ..
        fi
        
        # Build frontend
        echo '🏗️  Building frontend...'
        npm run build
        
        # Restart services
        echo '🔄 Restarting services...'
        sudo systemctl restart tutorials-dojo
        sudo systemctl reload nginx
        
        echo '✅ Deployment completed successfully!'
        echo \"Deployed commit: \$(git rev-parse --short HEAD)\"
    "
    
    log_success "Deployment completed!"
    check_status
}

# Check deployment and service status
check_status() {
    log_step "Checking deployment status..."
    check_vm_status
    
    # Get VM external IP
    EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
    
    log_info "VM Status: $(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="get(status)")"
    log_info "External IP: $EXTERNAL_IP"
    
    echo ""
    log_info "Service Status:"
    remote_exec "
        echo \"📋 System Services:\"
        echo \"   - Nginx: \$(sudo systemctl is-active nginx)\"
        echo \"   - Application: \$(sudo systemctl is-active tutorials-dojo)\"
        echo \"   - Auto-update: \$(sudo systemctl is-active tutorials-dojo-update.timer)\"
        echo \"   - UFW Firewall: \$(sudo systemctl is-active ufw)\"
        echo \"\"
        echo \"🔍 Application Details:\"
        echo \"   - Node.js: \$(node --version)\"
        echo \"   - NPM: \$(npm --version)\"
        echo \"   - Git Branch: \$(cd /opt/tutorials-dojo && git branch --show-current)\"
        echo \"   - Last Commit: \$(cd /opt/tutorials-dojo && git log -1 --pretty=format:'%h - %s (%cr)')\"
        echo \"\"
        echo \"💾 Disk Usage:\"
        df -h / | tail -n 1
        echo \"\"
        echo \"🖥️  Memory Usage:\"
        free -h
        echo \"\"
        echo \"🌐 Network Test:\"
        curl -s -o /dev/null -w 'Local API Response: %{http_code} (Time: %{time_total}s)' http://localhost:8080/api/health || echo 'API not responding'
        echo \"\"
    "
    
    echo ""
    log_info "Testing external access..."
    if curl -s -o /dev/null -w "%{http_code}" "http://$EXTERNAL_IP/health" | grep -q "200"; then
        log_success "✅ Application is accessible externally"
    else
        log_warn "⚠️  Application might not be accessible externally"
    fi
    
    echo ""
    log_info "URLs:"
    echo "🔗 Application: http://$EXTERNAL_IP"
    echo "🔗 API: http://$EXTERNAL_IP/api"
    echo "🔗 Health Check: http://$EXTERNAL_IP/health"
}

# View logs
view_logs() {
    local log_type="${1:-app}"
    check_vm_status
    
    case $log_type in
        "app"|"application")
            log_info "Viewing application logs (Ctrl+C to exit)..."
            remote_exec "sudo tail -f /var/log/tutorials-dojo/app.log"
            ;;
        "error")
            log_info "Viewing error logs (Ctrl+C to exit)..."
            remote_exec "sudo tail -f /var/log/tutorials-dojo/error.log"
            ;;
        "nginx")
            log_info "Viewing Nginx access logs (Ctrl+C to exit)..."
            remote_exec "sudo tail -f /var/log/nginx/access.log"
            ;;
        "nginx-error")
            log_info "Viewing Nginx error logs (Ctrl+C to exit)..."
            remote_exec "sudo tail -f /var/log/nginx/error.log"
            ;;
        "deployment")
            log_info "Viewing deployment logs (Ctrl+C to exit)..."
            remote_exec "sudo tail -f /var/log/tutorials-dojo-startup.log"
            ;;
        "system")
            log_info "Viewing system logs for tutorials-dojo service (Ctrl+C to exit)..."
            remote_exec "sudo journalctl -u tutorials-dojo -f"
            ;;
        *)
            log_error "Unknown log type: $log_type"
            log_info "Available log types: app, error, nginx, nginx-error, deployment, system"
            ;;
    esac
}

# Restart services
restart_services() {
    log_step "Restarting services..."
    check_vm_status
    
    remote_exec "
        echo '🔄 Restarting services...'
        sudo systemctl restart tutorials-dojo
        sudo systemctl reload nginx
        
        # Wait a moment and check status
        sleep 3
        
        echo '📋 Service status after restart:'
        echo \"   - Nginx: \$(sudo systemctl is-active nginx)\"
        echo \"   - Application: \$(sudo systemctl is-active tutorials-dojo)\"
        
        echo '✅ Services restarted successfully!'
    "
    
    log_success "All services restarted!"
}

# Setup SSL with Let's Encrypt
setup_ssl() {
    log_step "Setting up SSL certificate with Let's Encrypt..."
    check_vm_status
    
    # Get external IP and domain info
    EXTERNAL_IP=$(gcloud compute instances describe "$INSTANCE_NAME" --zone="$ZONE" --format="get(networkInterfaces[0].accessConfigs[0].natIP)")
    
    log_info "External IP: $EXTERNAL_IP"
    echo ""
    log_warn "SSL Setup Requirements:"
    echo "1. You need a domain name pointing to $EXTERNAL_IP"
    echo "2. DNS changes may take time to propagate"
    echo ""
    
    read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN_NAME
    if [ -z "$DOMAIN_NAME" ]; then
        log_error "Domain name is required for SSL setup"
        exit 1
    fi
    
    log_info "Setting up SSL for domain: $DOMAIN_NAME"
    
    remote_exec "
        set -e
        
        # Install certbot
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
        
        # Get certificate
        sudo certbot --nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME
        
        # Test auto-renewal
        sudo certbot renew --dry-run
        
        echo '✅ SSL certificate installed successfully!'
        echo 'Your site is now available at: https://$DOMAIN_NAME'
    "
    
    log_success "SSL setup completed!"
    log_info "Your site is now available at: https://$DOMAIN_NAME"
}

# Create backup
create_backup() {
    log_step "Creating backup of current deployment..."
    check_vm_status
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    remote_exec "
        set -e
        cd /opt/tutorials-dojo
        
        # Create backup directory
        sudo mkdir -p /opt/backups
        
        # Create backup
        echo '📦 Creating backup: $backup_name'
        sudo tar -czf /opt/backups/$backup_name.tar.gz \
            --exclude=node_modules \
            --exclude=dist \
            --exclude=.git \
            --exclude=*.log \
            .
        
        # Store current git commit
        git rev-parse HEAD > /opt/backups/$backup_name.commit
        
        echo '✅ Backup created: /opt/backups/$backup_name.tar.gz'
        echo \"Git commit: \$(cat /opt/backups/$backup_name.commit)\"
        
        # List all backups
        echo ''
        echo '📋 Available backups:'
        ls -la /opt/backups/
    "
    
    log_success "Backup created: $backup_name"
}

# Rollback to previous version
rollback() {
    log_step "Rolling back to previous version..."
    check_vm_status
    
    # List available backups
    log_info "Available backups:"
    remote_exec "ls -la /opt/backups/ 2>/dev/null || echo 'No backups found'"
    
    echo ""
    read -p "Enter backup name to rollback to (without .tar.gz): " BACKUP_NAME
    if [ -z "$BACKUP_NAME" ]; then
        log_error "Backup name is required"
        exit 1
    fi
    
    remote_exec "
        set -e
        
        if [ ! -f /opt/backups/$BACKUP_NAME.tar.gz ]; then
            echo 'Error: Backup file not found: /opt/backups/$BACKUP_NAME.tar.gz'
            exit 1
        fi
        
        echo '🔄 Rolling back to: $BACKUP_NAME'
        
        # Stop services
        sudo systemctl stop tutorials-dojo
        
        # Create current backup before rollback
        echo '📦 Creating safety backup...'
        cd /opt/tutorials-dojo
        sudo tar -czf /opt/backups/pre-rollback-\$(date +%Y%m%d-%H%M%S).tar.gz \
            --exclude=node_modules \
            --exclude=dist \
            --exclude=.git \
            .
        
        # Remove current files (keep git)
        sudo find . -maxdepth 1 ! -name '.git' ! -name '.' -exec rm -rf {} +
        
        # Restore backup
        echo '📂 Restoring backup...'
        sudo tar -xzf /opt/backups/$BACKUP_NAME.tar.gz
        
        # Restore git if commit file exists
        if [ -f /opt/backups/$BACKUP_NAME.commit ]; then
            COMMIT=\$(cat /opt/backups/$BACKUP_NAME.commit)
            echo \"🔄 Restoring git to commit: \$COMMIT\"
            git checkout \$COMMIT
        fi
        
        # Reinstall dependencies
        echo '📦 Installing dependencies...'
        sudo -u appuser npm install
        cd backend && sudo -u appuser npm install && cd ..
        
        # Rebuild
        echo '🏗️  Building application...'
        sudo -u appuser npm run build
        
        # Start services
        sudo systemctl start tutorials-dojo
        
        echo '✅ Rollback completed successfully!'
    "
    
    log_success "Rollback completed!"
    check_status
}

# Monitor services
monitor() {
    log_step "Starting monitoring dashboard..."
    check_vm_status
    
    log_info "Starting real-time monitoring (Ctrl+C to exit)..."
    remote_exec "
        # Function to show stats
        show_stats() {
            clear
            echo '╔══════════════════════════════════════════════════════════════╗'
            echo '║                   Tutorials Dojo Monitor                    ║'
            echo '╚══════════════════════════════════════════════════════════════╝'
            echo \"📅 \$(date)\"
            echo ''
            
            echo '🔧 Services:'
            printf '   %-15s %s\n' 'Nginx:' \"\$(sudo systemctl is-active nginx)\"
            printf '   %-15s %s\n' 'Application:' \"\$(sudo systemctl is-active tutorials-dojo)\"
            printf '   %-15s %s\n' 'Auto-update:' \"\$(sudo systemctl is-active tutorials-dojo-update.timer)\"
            echo ''
            
            echo '💾 Resources:'
            free -h | awk 'NR==2{printf \"   Memory:     %s / %s (%.2f%%)\n\", \$3, \$2, \$3/\$2*100}'
            df -h / | awk 'NR==2{printf \"   Disk:       %s / %s (%s)\n\", \$3, \$2, \$5}'
            uptime | awk '{printf \"   Load Avg:   %s\n\", \$(NF-2) \" \" \$(NF-1) \" \" \$NF}'
            echo ''
            
            echo '🌐 Network:'
            if curl -s -o /dev/null -m 5 http://localhost:8080/api/health; then
                echo '   API Status: ✅ Healthy'
            else
                echo '   API Status: ❌ Not responding'
            fi
            
            echo ''
            echo '📊 Recent Activity:'
            sudo tail -n 3 /var/log/tutorials-dojo/app.log 2>/dev/null | sed 's/^/   /' || echo '   No recent activity'
            echo ''
            echo 'Press Ctrl+C to exit monitoring...'
        }
        
        # Monitor loop
        while true; do
            show_stats
            sleep 10
        done
    "
}

# Main execution
main() {
    case "${1:-help}" in
        "setup-github")
            setup_github
            ;;
        "get-deploy-key")
            get_deploy_key
            ;;
        "deploy-update"|"deploy"|"update")
            deploy_update
            ;;
        "check-status"|"status")
            check_status
            ;;
        "view-logs"|"logs")
            view_logs "$2"
            ;;
        "restart-services"|"restart")
            restart_services
            ;;
        "setup-ssl"|"ssl")
            setup_ssl
            ;;
        "backup")
            create_backup
            ;;
        "rollback")
            rollback
            ;;
        "monitor")
            monitor
            ;;
        "help"|*)
            show_usage
            ;;
    esac
}

main "$@"
