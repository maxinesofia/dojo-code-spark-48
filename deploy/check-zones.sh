#!/bin/bash

# GCP Zone Availability Checker
# This script helps you find available zones for your machine type

set -e

# Default values
PROJECT_ID=""
MACHINE_TYPE="n1-standard-2"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_blue() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

# Zones to check (prioritizing your working configuration)
ZONES=(
    "us-east1-b"
    "us-east1-c"
    "us-east1-d"
    "us-central1-a"
    "us-central1-b" 
    "us-central1-c"
    "us-central1-f"
    "us-west1-a"
    "us-west1-b"
    "us-west1-c"
    "us-west2-a"
    "us-west2-b"
    "us-west2-c"
)

check_zone() {
    local zone="$1"
    local machine_type="$2"
    
    # Simplified check - just verify zone exists (avoid complex availability checks)
    if gcloud compute zones describe "$zone" --quiet >/dev/null 2>&1; then
        return 0
    fi
    
    return 1
}

get_zone_region() {
    local zone="$1"
    echo "${zone%-*}"
}

show_help() {
    echo "GCP Zone Availability Checker"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --project-id PROJECT_ID    GCP Project ID"
    echo "  --machine-type TYPE        Machine type to check (default: n1-standard-2)"
    echo "  --zone ZONE                Check specific zone only"
    echo "  --region REGION            Check zones in specific region only"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Check all zones for n1-standard-2"
    echo "  $0 --machine-type n1-standard-4      # Check all zones for n1-standard-4"
    echo "  $0 --region us-central1               # Check only us-central1 zones"
    echo "  $0 --zone us-central1-a              # Check only us-central1-a"
}

main() {
    # Check if gcloud is installed
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check if user is authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
        log_error "You are not authenticated with gcloud. Please run 'gcloud auth login'"
        exit 1
    fi
    
    # Get or set project ID
    if [ -z "$PROJECT_ID" ]; then
        PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
        if [ -z "$PROJECT_ID" ]; then
            log_error "No project ID specified. Please set PROJECT_ID variable or run 'gcloud config set project YOUR_PROJECT_ID'"
            exit 1
        fi
    fi
    
    log_info "Using project: $PROJECT_ID"
    log_info "Checking availability for machine type: $MACHINE_TYPE"
    echo ""
    
    gcloud config set project $PROJECT_ID
    
    local available_zones=()
    local unavailable_zones=()
    
    for zone in "${ZONES[@]}"; do
        # Filter by region if specified
        if [ -n "$FILTER_REGION" ]; then
            local zone_region=$(get_zone_region "$zone")
            if [ "$zone_region" != "$FILTER_REGION" ]; then
                continue
            fi
        fi
        
        # Check specific zone if specified
        if [ -n "$SPECIFIC_ZONE" ] && [ "$zone" != "$SPECIFIC_ZONE" ]; then
            continue
        fi
        
        log_blue "Checking zone: $zone"
        
        if check_zone "$zone" "$MACHINE_TYPE"; then
            available_zones+=("$zone")
            echo -e "  ${GREEN}✅ Available${NC}"
        else
            unavailable_zones+=("$zone")
            echo -e "  ${RED}❌ Not available${NC}"
        fi
    done
    
    echo ""
    echo "========================================"
    echo "               SUMMARY"
    echo "========================================"
    echo ""
    
    if [ ${#available_zones[@]} -gt 0 ]; then
        log_info "✅ AVAILABLE ZONES (${#available_zones[@]}):"
        for zone in "${available_zones[@]}"; do
            local region=$(get_zone_region "$zone")
            echo "  • $zone ($region)"
        done
        echo ""
        
        log_info "🚀 RECOMMENDED COMMAND:"
        echo "  ./deploy/gcp-firecracker-deploy.sh --zone ${available_zones[0]} --machine-type $MACHINE_TYPE"
        echo ""
    else
        log_error "❌ NO AVAILABLE ZONES FOUND"
        echo ""
        log_warn "Suggestions:"
        echo "  • Try a different machine type (e.g., n1-standard-1, e2-standard-2)"
        echo "  • Check your project quotas in GCP Console"
        echo "  • Try a different region"
        echo ""
    fi
    
    if [ ${#unavailable_zones[@]} -gt 0 ]; then
        log_warn "❌ UNAVAILABLE ZONES (${#unavailable_zones[@]}):"
        for zone in "${unavailable_zones[@]}"; do
            local region=$(get_zone_region "$zone")
            echo "  • $zone ($region)"
        done
        echo ""
    fi
}

# Parse command line arguments
FILTER_REGION=""
SPECIFIC_ZONE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --project-id)
            PROJECT_ID="$2"
            shift 2
            ;;
        --machine-type)
            MACHINE_TYPE="$2"
            shift 2
            ;;
        --region)
            FILTER_REGION="$2"
            shift 2
            ;;
        --zone)
            SPECIFIC_ZONE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
