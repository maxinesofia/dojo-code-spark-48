#!/bin/bash

# Monitor deployment progress
INSTANCE_NAME="tutorials-dojo-firecracker"
ZONE="us-east1-b"
EXTERNAL_IP="34.138.10.11"

echo "🔍 Monitoring deployment progress..."
echo "Instance: $INSTANCE_NAME"
echo "Zone: $ZONE"
echo "External IP: $EXTERNAL_IP"
echo "-----------------------------------"

# Function to check if deployment is complete
check_deployment_complete() {
    if gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="test -f /tmp/deployment-complete" --quiet 2>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to get startup script logs
get_startup_logs() {
    echo "📋 Latest startup script logs:"
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="sudo tail -20 /var/log/syslog | grep -E '(startup-script|cloud-init)'" 2>/dev/null || echo "Unable to fetch logs"
    echo ""
}

# Function to check services
check_services() {
    echo "🔧 Service status:"
    gcloud compute ssh $INSTANCE_NAME --zone=$ZONE --command="
        echo 'Node.js:' \$(which node 2>/dev/null && node --version 2>/dev/null || echo 'Not installed yet')
        echo 'Firecracker:' \$(which firecracker 2>/dev/null && echo 'Installed' || echo 'Not installed yet')
        echo 'Application service:' \$(systemctl is-active tutorials-dojo 2>/dev/null || echo 'Not ready yet')
        echo 'Nginx status:' \$(systemctl is-active nginx 2>/dev/null || echo 'Not ready yet')
    " 2>/dev/null || echo "Unable to check services"
    echo ""
}

# Function to test web access
test_web_access() {
    echo "🌐 Web access test:"
    if curl -s -I "http://$EXTERNAL_IP" | head -1; then
        echo "✅ Web server responding"
    else
        echo "❌ Web server not responding"
    fi
    echo ""
}

# Main monitoring loop
while true; do
    clear
    echo "🔍 Deployment Monitor - $(date)"
    echo "========================================"
    
    if check_deployment_complete; then
        echo "🎉 DEPLOYMENT COMPLETE!"
        echo "Your application should be ready at: http://$EXTERNAL_IP"
        break
    else
        echo "⏳ Startup script still running..."
        echo ""
        
        get_startup_logs
        check_services
        test_web_access
        
        echo "⏱️  Checking again in 30 seconds... (Ctrl+C to stop monitoring)"
        sleep 30
    fi
done

echo ""
echo "🚀 Final check - Testing your application:"
curl -s "http://$EXTERNAL_IP" | head -20
