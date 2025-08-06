#!/bin/bash

# GCP VM Management Script
# Manage your Firecracker VM instance with common operations

set -e

# Configuration
PROJECT_ID=""
ZONE="us-central1-a"
INSTANCE_NAME="tutorials-dojo-firecracker"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_blue() {
    echo -e "${BLUE}[CMD]${NC} $1"
}

check_instance_exists() {
    if ! gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --quiet 2>/dev/null; then
        log_error "Instance $INSTANCE_NAME does not exist in zone $ZONE"
        exit 1
    fi
}

get_instance_status() {
    gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(status)"
}

get_external_ip() {
    gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)"
}

start_instance() {
    log_info "Starting instance $INSTANCE_NAME..."
    gcloud compute instances start $INSTANCE_NAME --zone=$ZONE
    log_info "Instance started successfully!"
}

stop_instance() {
    log_info "Stopping instance $INSTANCE_NAME..."
    gcloud compute instances stop $INSTANCE_NAME --zone=$ZONE
    log_info "Instance stopped successfully!"
}

restart_instance() {
    log_info "Restarting instance $INSTANCE_NAME..."
    gcloud compute instances reset $INSTANCE_NAME --zone=$ZONE
    log_info "Instance restarted successfully!"
}

delete_instance() {
    log_warn "This will permanently delete the instance $INSTANCE_NAME"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deleting instance $INSTANCE_NAME..."
        gcloud compute instances delete $INSTANCE_NAME --zone=$ZONE --quiet
        log_info "Instance deleted successfully!"
    else
        log_info "Operation cancelled."
    fi
}

ssh_to_instance() {
    log_info "Connecting to instance via SSH..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE
}

show_status() {
    check_instance_exists
    STATUS=$(get_instance_status)
    EXTERNAL_IP=$(get_external_ip)
    
    echo ""
    echo "📊 Instance Status Report"
    echo "========================="
    echo "Instance Name: $INSTANCE_NAME"
    echo "Zone: $ZONE"
    echo "Status: $STATUS"
    echo "External IP: ${EXTERNAL_IP:-'Not assigned'}"
    echo ""
    
    if [ "$STATUS" = "RUNNING" ] && [ -n "$EXTERNAL_IP" ]; then
        echo "🌐 Application URLs:"
        echo "  Frontend: http://$EXTERNAL_IP"
        echo "  API: http://$EXTERNAL_IP/api"
        echo "  Health Check: http://$EXTERNAL_IP/api/health"
        echo ""
    fi
}

show_logs() {
    check_instance_exists
    log_info "Showing application logs (press Ctrl+C to exit)..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="sudo journalctl -u tutorials-dojo -f"
}

restart_application() {
    check_instance_exists
    log_info "Restarting application service..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="sudo systemctl restart tutorials-dojo"
    log_info "Application restarted successfully!"
}

restart_nginx() {
    check_instance_exists
    log_info "Restarting Nginx..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="sudo systemctl restart nginx"
    log_info "Nginx restarted successfully!"
}

deploy_updates() {
    check_instance_exists
    
    log_info "Deploying application updates..."
    
    # Create deployment package
    log_info "Creating deployment package..."
    tar -czf deployment.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=dist \
        --exclude=deploy \
        --exclude=*.log \
        .
    
    # Copy files to the VM
    log_info "Copying files to VM..."
    gcloud compute scp deployment.tar.gz $INSTANCE_NAME:/tmp/ --zone=$ZONE
    
    # Extract and setup on VM
    log_info "Installing updates on VM..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        cd /opt/tutorials-dojo
        sudo systemctl stop tutorials-dojo
        sudo tar -xzf /tmp/deployment.tar.gz
        sudo chown -R appuser:appuser .
        sudo -u appuser npm install --production
        sudo -u appuser npm run build
        sudo systemctl start tutorials-dojo
        sudo systemctl restart nginx
        rm -f /tmp/deployment.tar.gz
    "
    
    # Clean up
    rm -f deployment.tar.gz
    
    log_info "Updates deployed successfully!"
}

monitor_resources() {
    check_instance_exists
    log_info "Showing system resources (press Ctrl+C to exit)..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        while true; do
            clear
            echo '=== System Resources ==='
            echo 'CPU and Memory:'
            top -bn1 | head -5
            echo ''
            echo 'Disk Usage:'
            df -h
            echo ''
            echo 'Active VMs:'
            ps aux | grep firecracker | grep -v grep || echo 'No active Firecracker VMs'
            echo ''
            echo 'Application Status:'
            systemctl status tutorials-dojo --no-pager -l
            sleep 5
        done
    "
}

backup_data() {
    check_instance_exists
    BACKUP_NAME="tutorials-dojo-backup-$(date +%Y%m%d-%H%M%S)"
    
    log_info "Creating backup: $BACKUP_NAME..."
    gcloud compute disks snapshot $INSTANCE_NAME --zone=$ZONE --snapshot-names=$BACKUP_NAME
    log_info "Backup created successfully: $BACKUP_NAME"
}

show_firecracker_status() {
    check_instance_exists
    log_info "Checking Firecracker status..."
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        echo '=== Firecracker Binary ==='
        which firecracker && firecracker --version || echo 'Firecracker not found'
        echo ''
        echo '=== Network Interface ==='
        ip addr show tap-firecracker || echo 'TAP interface not found'
        echo ''
        echo '=== Active VMs ==='
        ps aux | grep firecracker | grep -v grep || echo 'No active Firecracker VMs'
        echo ''
        echo '=== VM Configuration Files ==='
        ls -la /opt/firecracker/ || echo 'Firecracker directory not found'
    "
}

show_help() {
    echo "GCP Firecracker VM Management Script"
    echo ""
    echo "Usage: $0 COMMAND [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  status          Show instance status and connection info"
    echo "  start           Start the instance"
    echo "  stop            Stop the instance"
    echo "  restart         Restart the instance"
    echo "  delete          Delete the instance (with confirmation)"
    echo "  ssh             SSH into the instance"
    echo "  logs            Show application logs"
    echo "  restart-app     Restart the application service"
    echo "  restart-nginx   Restart Nginx"
    echo "  deploy          Deploy application updates"
    echo "  monitor         Monitor system resources"
    echo "  backup          Create a disk snapshot backup"
    echo "  firecracker     Show Firecracker status"
    echo "  help            Show this help message"
    echo ""
    echo "Options:"
    echo "  --project-id PROJECT_ID    GCP Project ID"
    echo "  --zone ZONE                GCP Zone (default: us-central1-a)"
    echo "  --instance-name NAME       VM instance name (default: tutorials-dojo-firecracker)"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 deploy --project-id my-project"
    echo "  $0 ssh --zone us-west1-a"
}

# Parse command line arguments
COMMAND=""
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
        status|start|stop|restart|delete|ssh|logs|restart-app|restart-nginx|deploy|monitor|backup|firecracker|help)
            COMMAND="$1"
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set project if specified
if [ -n "$PROJECT_ID" ]; then
    gcloud config set project $PROJECT_ID
fi

# Execute command
case $COMMAND in
    status)
        show_status
        ;;
    start)
        check_instance_exists
        start_instance
        ;;
    stop)
        check_instance_exists
        stop_instance
        ;;
    restart)
        check_instance_exists
        restart_instance
        ;;
    delete)
        check_instance_exists
        delete_instance
        ;;
    ssh)
        check_instance_exists
        ssh_to_instance
        ;;
    logs)
        show_logs
        ;;
    restart-app)
        restart_application
        ;;
    restart-nginx)
        restart_nginx
        ;;
    deploy)
        deploy_updates
        ;;
    monitor)
        monitor_resources
        ;;
    backup)
        backup_data
        ;;
    firecracker)
        show_firecracker_status
        ;;
    help|"")
        show_help
        ;;
    *)
        log_error "Unknown command: $COMMAND"
        show_help
        exit 1
        ;;
esac
