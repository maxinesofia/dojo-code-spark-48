#!/bin/bash

# Real-time startup script monitor
INSTANCE_NAME="tutorials-dojo-firecracker"
ZONE="us-east1-b"

echo "🔍 Real-time Startup Script Monitor"
echo "=================================="
echo "Instance: $INSTANCE_NAME"
echo "Zone: $ZONE"
echo "Press Ctrl+C to stop monitoring"
echo ""

# Function to show startup progress
show_progress() {
    echo "📊 $(date '+%Y-%m-%d %H:%M:%S') - Checking startup progress..."
    
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        echo '🚀 STARTUP SCRIPT STATUS'
        echo '========================'
        
        # Check if deployment is complete
        if [ -f /tmp/deployment-complete ]; then
            echo '✅ STATUS: COMPLETED'
            exit 0
        else
            echo '⏳ STATUS: IN PROGRESS'
        fi
        
        echo ''
        echo '📋 RECENT CLOUD-INIT LOGS:'
        echo '-------------------------'
        if [ -f /var/log/cloud-init-output.log ]; then
            sudo tail -20 /var/log/cloud-init-output.log | sed 's/^/  /'
        else
            echo '  No cloud-init logs available yet'
        fi
        
        echo ''
        echo '🔧 ACTIVE PROCESSES:'
        echo '-------------------'
        ps aux | grep -E '(apt-get|curl|wget|node|npm|systemctl)' | grep -v grep | head -8 | sed 's/^/  /' || echo '  No relevant processes running'
        
        echo ''
        echo '📦 INSTALLATION STATUS:'
        echo '----------------------'
        echo \"  Node.js: \$(which node >/dev/null 2>&1 && node --version || echo 'Not installed')\"
        echo \"  Nginx: \$(which nginx >/dev/null 2>&1 && echo 'Installed' || echo 'Not installed')\"
        echo \"  App directory: \$([ -d /opt/tutorials-dojo ] && echo 'Created' || echo 'Not created')\"
        echo \"  UFW: \$(which ufw >/dev/null 2>&1 && echo 'Installed' || echo 'Not installed')\"
        
        echo ''
        echo '🌐 NETWORK STATUS:'
        echo '-----------------'
        echo \"  SSH ready: \$(echo 'SSH is working' 2>/dev/null)\"
        echo \"  Nginx status: \$(systemctl is-active nginx 2>/dev/null || echo 'not running')\"
        
        echo ''
        echo '💾 DISK USAGE:'
        echo '-------------'
        df -h / | tail -1 | awk '{print \"  Root: \" \$3 \"/\" \$2 \" (\" \$5 \" used)\"}' 2>/dev/null || echo '  Could not check disk usage'
        
    " 2>/dev/null || {
        echo "❌ Could not connect to VM (SSH not ready yet)"
        return 1
    }
}

# Function to stream live logs
stream_live_logs() {
    echo "📡 STREAMING LIVE LOGS:"
    echo "======================"
    
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        echo 'Starting live log stream... (Press Ctrl+C to stop)'
        sudo tail -f /var/log/cloud-init-output.log 2>/dev/null || {
            echo 'Cloud-init log not available yet, trying syslog...'
            sudo tail -f /var/log/syslog | grep -E '(startup-script|cloud-init)'
        }
    " 2>/dev/null || {
        echo "❌ Could not connect for live streaming"
        return 1
    }
}

# Main monitoring function
monitor_startup() {
    local check_count=0
    
    while true; do
        check_count=$((check_count + 1))
        clear
        echo "🔍 Startup Monitor - Check #$check_count"
        echo "========================================"
        
        if show_progress; then
            if gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="test -f /tmp/deployment-complete" --quiet 2>/dev/null; then
                echo ""
                echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
                echo ""
                # Get the external IP
                EXTERNAL_IP=$(gcloud compute instances describe $INSTANCE_NAME --zone=$ZONE --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null)
                echo "🌐 Your application should be available at: http://$EXTERNAL_IP"
                break
            fi
        fi
        
        echo ""
        echo "⏱️  Next check in 30 seconds..."
        echo "   💡 Tip: Run './deploy/startup-monitor.sh --live' for live log streaming"
        sleep 30
    done
}

# Parse arguments
case "${1:-}" in
    --live|--stream)
        echo "🚀 Starting live log stream mode..."
        sleep 2
        stream_live_logs
        ;;
    --once)
        show_progress
        ;;
    *)
        monitor_startup
        ;;
esac
