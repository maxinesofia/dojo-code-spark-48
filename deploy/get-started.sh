#!/bin/bash

# Tutorials Dojo - Get Started with GCP Deployment
# This script checks your setup and guides you through the deployment process

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Status tracking
CHECKS_PASSED=0
TOTAL_CHECKS=0

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

check_item() {
    local description="$1"
    local command="$2"
    local fix_instruction="$3"
    
    ((TOTAL_CHECKS++))
    echo -n "  🔍 Checking $description... "
    
    if eval "$command" >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC}"
        ((CHECKS_PASSED++))
        return 0
    else
        echo -e "${RED}❌${NC}"
        if [ -n "$fix_instruction" ]; then
            echo -e "     ${YELLOW}Fix:${NC} $fix_instruction"
        fi
        return 1
    fi
}

show_welcome() {
    clear
    echo -e "${CYAN}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║        🚀 Tutorials Dojo - GCP Deployment Setup             ║
║                                                              ║
║   Welcome! This script will guide you through setting up    ║
║   your Tutorials Dojo application on Google Cloud Platform  ║
║   with Firecracker virtualization and GitHub integration.   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"
    
    echo ""
    echo -e "${BLUE}What you'll get after deployment:${NC}"
    echo "  🔐 Secure code execution with Firecracker microVMs"
    echo "  🔄 Automatic deployment from your GitHub repository"
    echo "  🌐 Production-ready web application with Nginx"
    echo "  📊 Monitoring, logging, and management tools"
    echo "  🔒 SSL certificate support"
    echo "  🛡️  Security hardening and firewall configuration"
    echo ""
    
    read -p "Press Enter to start the setup check..."
}

check_prerequisites() {
    log_step "Checking prerequisites..."
    echo ""
    
    # Check if we're in the right directory
    if [[ ! -f "gcp-firecracker-github-deploy.sh" ]]; then
        if [[ -f "../deploy/gcp-firecracker-github-deploy.sh" ]]; then
            log_info "Moving to deploy directory..."
            cd ../deploy
        else
            log_error "Cannot find deployment scripts. Please run from project root or deploy directory."
            exit 1
        fi
    fi
    
    # System checks
    check_item "Bash shell" "[ -n \"$BASH_VERSION\" ]" "Use bash shell to run this script"
    check_item "curl command" "command -v curl" "Install curl: apt-get install curl (Ubuntu) or brew install curl (macOS)"
    check_item "git command" "command -v git" "Install git: https://git-scm.com/downloads"
    check_item "gcloud CLI" "command -v gcloud" "Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    
    echo ""
    
    # GCP checks
    if command -v gcloud >/dev/null 2>&1; then
        check_item "gcloud authentication" "gcloud auth list --filter=status:ACTIVE --format=\"value(account)\" | grep -q ." "Run: gcloud auth login"
        
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
        if [ -n "$PROJECT_ID" ]; then
            check_item "GCP project configured" "[ -n \"$PROJECT_ID\" ]" "Run: gcloud config set project YOUR_PROJECT_ID"
            echo -e "     ${BLUE}Current project:${NC} $PROJECT_ID"
            
            # Check APIs
            check_item "Compute Engine API" "gcloud services list --enabled --filter=\"name:compute.googleapis.com\" --format=\"value(name)\" | grep -q compute" "Run: gcloud services enable compute.googleapis.com"
        else
            log_warn "No GCP project configured"
            echo -e "     ${YELLOW}Fix:${NC} Run: gcloud config set project YOUR_PROJECT_ID"
        fi
    fi
    
    # File checks
    echo ""
    check_item "deployment script" "[ -f \"gcp-firecracker-github-deploy.sh\" ]" "Download from repository"
    check_item "management script" "[ -f \"github-integration-manager.sh\" ]" "Download from repository"
    check_item "configuration file" "[ -f \"deployment.config\" ]" "Download from repository"
    check_item "documentation" "[ -f \"GCP_DEPLOYMENT_README.md\" ]" "Download from repository"
    
    echo ""
    log_info "Prerequisite check complete: $CHECKS_PASSED/$TOTAL_CHECKS checks passed"
    
    if [ $CHECKS_PASSED -eq $TOTAL_CHECKS ]; then
        log_success "All checks passed! ✨"
        return 0
    else
        log_warn "Some checks failed. Please fix the issues above before proceeding."
        return 1
    fi
}

show_configuration_guide() {
    log_step "Configuration guide..."
    echo ""
    
    echo -e "${BLUE}Before deployment, you should configure these settings:${NC}"
    echo ""
    
    if [ -f "deployment.config" ]; then
        echo -e "${GREEN}1. Edit deployment.config:${NC}"
        echo "   📝 Set your GCP PROJECT_ID"
        echo "   📝 Verify GITHUB_REPO_URL"
        echo "   📝 Choose MACHINE_TYPE and ZONE"
        echo "   📝 Set DOMAIN_NAME for SSL (optional)"
        echo ""
        
        # Show current config
        if grep -q "^PROJECT_ID=" deployment.config 2>/dev/null; then
            PROJECT_FROM_CONFIG=$(grep "^PROJECT_ID=" deployment.config | cut -d'"' -f2)
            echo -e "   ${CYAN}Current PROJECT_ID in config:${NC} $PROJECT_FROM_CONFIG"
        fi
        
        if grep -q "^GITHUB_REPO_URL=" deployment.config 2>/dev/null; then
            REPO_FROM_CONFIG=$(grep "^GITHUB_REPO_URL=" deployment.config | cut -d'"' -f2)
            echo -e "   ${CYAN}Current GitHub repo:${NC} $REPO_FROM_CONFIG"
        fi
        
        echo ""
        read -p "Do you want to edit the configuration now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if command -v nano >/dev/null 2>&1; then
                nano deployment.config
            elif command -v vim >/dev/null 2>&1; then
                vim deployment.config
            else
                echo -e "${YELLOW}No editor found. Please edit deployment.config manually.${NC}"
                echo "Common editors: nano, vim, code, gedit"
            fi
        fi
    else
        log_warn "Configuration file not found!"
    fi
    
    echo ""
    echo -e "${GREEN}2. Prepare your GitHub repository:${NC}"
    echo "   🔑 Ensure you have admin access to add deploy keys"
    echo "   🌿 Make sure your main branch is up to date"
    echo "   📋 The deployment will clone the repository automatically"
    echo ""
}

show_cost_estimate() {
    log_step "Cost estimation..."
    echo ""
    
    echo -e "${BLUE}Estimated GCP costs (USD per month):${NC}"
    echo ""
    echo "  💻 n1-standard-2 (2 vCPU, 7.5GB RAM):  ~$50/month"
    echo "  💻 n1-standard-4 (4 vCPU, 15GB RAM):   ~$100/month"  
    echo "  💻 n1-standard-8 (8 vCPU, 30GB RAM):   ~$200/month"
    echo ""
    echo "  💾 100GB SSD boot disk:                ~$17/month"
    echo "  🌐 External IP address:                ~$5/month"
    echo "  📊 Network egress (1GB):               ~$0.12"
    echo ""
    echo -e "${YELLOW}💡 Cost-saving tips:${NC}"
    echo "   • Stop VMs when not in use (saves ~80% of compute costs)"
    echo "   • Use preemptible VMs for development (saves ~80%)"
    echo "   • Monitor usage with GCP billing alerts"
    echo "   • Use sustained use discounts (automatic)"
    echo ""
    
    read -p "Press Enter to continue..."
}

show_deployment_options() {
    log_step "Deployment options..."
    echo ""
    
    echo -e "${PURPLE}Choose your deployment method:${NC}"
    echo ""
    echo "1. 🚀 Full deployment (Recommended)"
    echo "   ✓ Complete setup with all features"
    echo "   ✓ Firecracker + GitHub integration"
    echo "   ✓ Auto-updates and monitoring"
    echo "   ✓ Production-ready configuration"
    echo ""
    
    echo "2. 🧪 Quick test deployment"
    echo "   ✓ Basic setup for testing"
    echo "   ✓ Uses existing deployment script"
    echo "   ✓ Faster deployment, fewer features"
    echo ""
    
    echo "3. 🎯 Custom launcher"
    echo "   ✓ Interactive deployment menu"
    echo "   ✓ Step-by-step guidance"
    echo "   ✓ Management tools included"
    echo ""
    
    echo "4. 📖 Read documentation first"
    echo "   ✓ Comprehensive deployment guide"
    echo "   ✓ Troubleshooting information"
    echo "   ✓ Advanced configuration options"
    echo ""
    
    echo "5. ❌ Exit setup"
    echo ""
    
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            log_info "Starting full deployment..."
            echo ""
            echo -e "${YELLOW}This will:${NC}"
            echo "  1. Create a new GCP VM instance"
            echo "  2. Install all dependencies and services"
            echo "  3. Set up Firecracker virtualization"
            echo "  4. Clone and build your application"
            echo "  5. Configure auto-deployment from GitHub"
            echo "  6. Set up monitoring and logging"
            echo ""
            read -p "Continue with full deployment? (y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                chmod +x gcp-firecracker-github-deploy.sh
                ./gcp-firecracker-github-deploy.sh
            fi
            ;;
            
        2)
            log_info "Starting quick test deployment..."
            chmod +x gcp-firecracker-deploy.sh
            ./gcp-firecracker-deploy.sh
            ;;
            
        3)
            log_info "Opening deployment launcher..."
            chmod +x deploy-launcher.sh
            ./deploy-launcher.sh
            ;;
            
        4)
            log_info "Opening documentation..."
            if command -v less >/dev/null 2>&1; then
                less GCP_DEPLOYMENT_README.md
            else
                cat GCP_DEPLOYMENT_README.md
            fi
            ;;
            
        5)
            log_info "Setup cancelled. Goodbye! 👋"
            exit 0
            ;;
            
        *)
            log_error "Invalid choice. Please select 1-5."
            exit 1
            ;;
    esac
}

show_next_steps() {
    echo ""
    log_success "Deployment setup guidance completed!"
    echo ""
    
    echo -e "${BLUE}📋 Next steps after deployment:${NC}"
    echo ""
    echo "1. 🔑 Add GitHub deploy key:"
    echo "   ./github-integration-manager.sh get-deploy-key"
    echo ""
    echo "2. 🌐 Access your application:"
    echo "   Check the deployment output for your VM's IP address"
    echo ""
    echo "3. 📊 Monitor and manage:"
    echo "   ./github-integration-manager.sh check-status"
    echo "   ./github-integration-manager.sh view-logs app"
    echo ""
    echo "4. 🔄 Deploy updates:"
    echo "   ./github-integration-manager.sh deploy-update"
    echo ""
    echo "5. 🔒 Setup SSL (optional):"
    echo "   ./github-integration-manager.sh setup-ssl"
    echo ""
    
    echo -e "${GREEN}📚 Need help?${NC}"
    echo "• Read: GCP_DEPLOYMENT_README.md"
    echo "• Management: ./github-integration-manager.sh help"
    echo "• Documentation: ./deploy-launcher.sh → option 3"
    echo ""
}

main() {
    # Make scripts executable
    chmod +x *.sh 2>/dev/null || true
    
    show_welcome
    
    if check_prerequisites; then
        show_configuration_guide
        show_cost_estimate
        show_deployment_options
        show_next_steps
    else
        echo ""
        log_error "Please fix the prerequisite issues and run this script again."
        exit 1
    fi
}

main "$@"
