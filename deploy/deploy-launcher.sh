#!/bin/bash

# Tutorials Dojo - Quick Deployment Launcher
# This script provides a simple interface to deploy your application to GCP with Firecracker

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    🚀 Tutorials Dojo - GCP Firecracker Deployment           ║
║                                                              ║
║    Welcome to the deployment launcher!                      ║
║    This will help you deploy your app to GCP with           ║
║    Firecracker virtualization and GitHub integration.       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"

# Check if we're in the right directory
if [[ ! -f "gcp-firecracker-github-deploy.sh" ]]; then
    echo -e "${YELLOW}[INFO]${NC} Navigating to deploy directory..."
    cd deploy 2>/dev/null || {
        echo -e "${YELLOW}[ERROR]${NC} Please run this script from the project root or deploy directory"
        exit 1
    }
fi

# Make scripts executable
echo -e "${GREEN}[STEP]${NC} Making deployment scripts executable..."
chmod +x gcp-firecracker-github-deploy.sh 2>/dev/null || true
chmod +x github-integration-manager.sh 2>/dev/null || true
chmod +x gcp-firecracker-deploy.sh 2>/dev/null || true
chmod +x quick-setup.sh 2>/dev/null || true

# Check prerequisites
echo -e "${GREEN}[STEP]${NC} Checking prerequisites..."

# Check gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${YELLOW}[ERROR]${NC} gcloud CLI not found!"
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}[ERROR]${NC} git not found!"
    echo "Please install git first."
    exit 1
fi

# Check authentication
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}[WARN]${NC} You are not authenticated with gcloud."
    echo -e "${BLUE}[INFO]${NC} Please run: gcloud auth login"
    read -p "Would you like to authenticate now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud auth login
    else
        echo "Please authenticate and run this script again."
        exit 1
    fi
fi

# Show menu
echo -e "${PURPLE}[MENU]${NC} What would you like to do?"
echo ""
echo "1. 🚀 Deploy new instance (Full deployment with Firecracker + GitHub)"
echo "2. 🔄 Manage existing deployment (Update, logs, monitoring, etc.)"
echo "3. 📖 View deployment documentation"
echo "4. 🧪 Quick test deployment (Existing script)"
echo "5. ❌ Exit"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${GREEN}[ACTION]${NC} Starting full deployment..."
        echo ""
        echo -e "${BLUE}[INFO]${NC} This will create a new GCP VM with:"
        echo "  ✓ Ubuntu 22.04 LTS"
        echo "  ✓ Node.js 18 + NPM"  
        echo "  ✓ Firecracker virtualization"
        echo "  ✓ Nginx reverse proxy"
        echo "  ✓ GitHub integration"
        echo "  ✓ Auto-update system"
        echo "  ✓ SSL-ready configuration"
        echo ""
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./gcp-firecracker-github-deploy.sh
        else
            echo "Deployment cancelled."
        fi
        ;;
        
    2)
        echo -e "${GREEN}[ACTION]${NC} Opening deployment management..."
        echo ""
        ./github-integration-manager.sh
        ;;
        
    3)
        echo -e "${GREEN}[ACTION]${NC} Opening documentation..."
        if command -v less &> /dev/null; then
            less GCP_DEPLOYMENT_README.md
        elif command -v more &> /dev/null; then
            more GCP_DEPLOYMENT_README.md
        else
            cat GCP_DEPLOYMENT_README.md
        fi
        ;;
        
    4)
        echo -e "${GREEN}[ACTION]${NC} Running quick test deployment..."
        echo ""
        echo -e "${YELLOW}[INFO]${NC} This uses the existing deployment script (simpler, less features)"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./gcp-firecracker-deploy.sh
        else
            echo "Test deployment cancelled."
        fi
        ;;
        
    5)
        echo -e "${CYAN}[EXIT]${NC} Goodbye! 👋"
        exit 0
        ;;
        
    *)
        echo -e "${YELLOW}[ERROR]${NC} Invalid choice. Please select 1-5."
        exit 1
        ;;
esac

echo ""
echo -e "${CYAN}[COMPLETE]${NC} Operation completed!"
echo ""
echo -e "${BLUE}[NEXT STEPS]${NC} After deployment:"
echo "1. Add the GitHub deploy key to your repository"
echo "2. Test your application URL"
echo "3. Set up SSL certificate if needed"
echo "4. Configure monitoring as required"
echo ""
echo -e "${GREEN}[HELP]${NC} For management commands, run:"
echo "./github-integration-manager.sh help"
