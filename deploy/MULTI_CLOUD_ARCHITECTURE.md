# 🌐 Multi-Cloud Architecture: AWS Frontend + GCP Firecracker Backend

This guide describes deploying the Tutorials Dojo application using a hybrid cloud architecture:
- **Frontend**: AWS (codesandbox.tutorialsdojo.com)
- **Backend**: GCP with Firecracker VMs for secure code execution

## 📋 Architecture Overview

```
┌─────────────────┐    HTTPS/API calls    ┌─────────────────┐
│   AWS Frontend  │ ────────────────────► │  GCP Backend    │
│                 │                       │                 │
│ • React App     │                       │ • Node.js API   │
│ • S3 + CloudFront│                       │ • Firecracker   │
│ • Custom Domain │                       │ • Code Execution │
└─────────────────┘                       └─────────────────┘
        │                                         │
        │                                         │
    Users Access                              Secure VMs
 codesandbox.tutorialsdojo.com              for code execution
```

## 🎯 Benefits of This Architecture

### Frontend on AWS
- **Global CDN**: CloudFront for fast worldwide access
- **Scalability**: Auto-scaling with AWS services
- **Cost-Effective**: Pay-per-use pricing for static hosting
- **Custom Domain**: Easy DNS management with Route 53

### Backend on GCP with Firecracker
- **Secure Isolation**: Firecracker microVMs for untrusted code
- **Performance**: Fast VM startup (~125ms) for code execution
- **Flexibility**: Full control over execution environment
- **Cost Control**: Precise resource allocation per execution

## 🚀 Deployment Guide

### Part 1: Deploy Backend to GCP (Firecracker)

Use the simple deployment script we created:

```bash
cd deploy
chmod +x simple-gcp-firecracker-deploy.sh
./simple-gcp-firecracker-deploy.sh
```

This will:
✅ Create GCP VM with Firecracker support  
✅ Install official Firecracker setup  
✅ Deploy your API backend  
✅ Configure secure code execution  

### Part 2: Deploy Frontend to AWS

#### Step 1: Build the Frontend for Production

```bash
# In your project root
npm run build

# The dist/ folder contains your built frontend
ls dist/
```

#### Step 2: Update API Endpoint Configuration

Update your frontend to point to the GCP backend:

```javascript
// src/config/api.js or similar
const API_CONFIG = {
  // Replace with your GCP VM's external IP
  BASE_URL: 'http://YOUR_GCP_VM_IP:8080/api',
  // Or if you set up a domain:
  // BASE_URL: 'https://api.tutorialsdojo.com/api'
};

export default API_CONFIG;
```

#### Step 3: Deploy to AWS S3 + CloudFront

```bash
# Install AWS CLI if not already installed
# Configure AWS credentials: aws configure

# Create S3 bucket for your frontend
AWS_BUCKET="codesandbox-tutorialsdojo-com"
aws s3 mb s3://$AWS_BUCKET

# Enable static website hosting
aws s3 website s3://$AWS_BUCKET \
  --index-document index.html \
  --error-document index.html

# Upload your built frontend
aws s3 sync dist/ s3://$AWS_BUCKET --delete

# Make bucket public (for website hosting)
aws s3api put-bucket-policy --bucket $AWS_BUCKET --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::codesandbox-tutorialsdojo-com/*"
    }
  ]
}'

# Get website URL
echo "Website URL: http://$AWS_BUCKET.s3-website-us-east-1.amazonaws.com"
```

#### Step 4: Set Up CloudFront Distribution

```bash
# Create CloudFront distribution for CDN
aws cloudfront create-distribution --distribution-config '{
  "CallerReference": "tutorials-dojo-'$(date +%s)'",
  "Comment": "Tutorials Dojo CodeSandbox",
  "DefaultRootObject": "index.html",
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-codesandbox-tutorialsdojo-com",
        "DomainName": "codesandbox-tutorialsdojo-com.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-codesandbox-tutorialsdojo-com",
    "ViewerProtocolPolicy": "redirect-to-https",
    "TrustedSigners": {
      "Enabled": false,
      "Quantity": 0
    },
    "ForwardedValues": {
      "QueryString": false,
      "Cookies": {
        "Forward": "none"
      }
    },
    "MinTTL": 0
  },
  "Enabled": true
}'
```

#### Step 5: Configure Custom Domain (Optional)

If you want `codesandbox.tutorialsdojo.com`:

1. **Register domain** (if not already owned)
2. **Create Route 53 hosted zone**
3. **Point domain to CloudFront distribution**
4. **Add SSL certificate** via AWS Certificate Manager

```bash
# Example Route 53 setup
aws route53 create-hosted-zone --name tutorialsdojo.com --caller-reference $(date +%s)

# Add CNAME record for codesandbox subdomain
aws route53 change-resource-record-sets --hosted-zone-id YOUR_ZONE_ID --change-batch '{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "codesandbox.tutorialsdojo.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "YOUR_CLOUDFRONT_DOMAIN.cloudfront.net"
          }
        ]
      }
    }
  ]
}'
```

## 🔧 Configuration Files

### Frontend Environment Variables

Create `.env.production`:

```env
REACT_APP_API_BASE_URL=http://YOUR_GCP_VM_IP:8080/api
REACT_APP_ENVIRONMENT=production
REACT_APP_FIRECRACKER_ENABLED=true
```

### Backend CORS Configuration

Update your GCP backend to allow AWS frontend:

```javascript
// backend/app.js or similar
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000', // Development
    'https://codesandbox.tutorialsdojo.com', // Production AWS
    'https://YOUR_CLOUDFRONT_DOMAIN.cloudfront.net' // CloudFront
  ],
  credentials: true
}));
```

## 🚦 Deployment Automation

### Automated AWS Deployment Script

Create `deploy/aws-frontend-deploy.sh`:

```bash
#!/bin/bash

set -e

# Configuration
AWS_BUCKET="codesandbox-tutorialsdojo-com"
CLOUDFRONT_DISTRIBUTION_ID="YOUR_DISTRIBUTION_ID"

echo "🚀 Deploying frontend to AWS..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# Upload to S3
echo "☁️ Uploading to S3..."
aws s3 sync dist/ s3://$AWS_BUCKET --delete

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  --paths "/*"

echo "✅ Frontend deployed successfully!"
echo "🌐 Visit: https://codesandbox.tutorialsdojo.com"
```

### Full Deployment Workflow

```bash
# 1. Deploy backend to GCP
cd deploy
./simple-gcp-firecracker-deploy.sh

# 2. Get GCP VM IP and update frontend config
GCP_IP=$(gcloud compute instances describe td-firecracker-starter01 \
  --zone=us-east1-b --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

# 3. Update frontend API endpoint
echo "REACT_APP_API_BASE_URL=http://$GCP_IP:8080/api" > .env.production

# 4. Deploy frontend to AWS
./aws-frontend-deploy.sh
```

## 🔍 Monitoring & Management

### Health Checks

Create health check endpoints for monitoring:

```bash
# Check GCP backend
curl http://YOUR_GCP_VM_IP:8080/api/health

# Check AWS frontend
curl https://codesandbox.tutorialsdojo.com

# Check Firecracker functionality
curl -X POST http://YOUR_GCP_VM_IP:8080/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "console.log(\"Hello Firecracker!\")", "language": "javascript"}'
```

### Cost Optimization

#### AWS Costs
- **S3**: ~$0.023/GB/month for storage
- **CloudFront**: ~$0.085/GB for first 10TB/month
- **Route 53**: ~$0.50/month per hosted zone

#### GCP Costs
- **n2-standard-2**: ~$70/month (24/7)
- **100GB SSD**: ~$17/month
- **Optimization**: Stop VM when not in use

```bash
# Stop GCP VM to save costs
gcloud compute instances stop td-firecracker-starter01 --zone=us-east1-b

# Start when needed
gcloud compute instances start td-firecracker-starter01 --zone=us-east1-b
```

## 🔒 Security Considerations

### Network Security
- **HTTPS Only**: Use SSL certificates for both frontend and backend
- **CORS Policy**: Restrict API access to your frontend domain
- **Firewall Rules**: Limit GCP VM access to necessary ports

### Code Execution Security
- **Firecracker Isolation**: Each execution runs in isolated microVM
- **Resource Limits**: CPU and memory constraints per execution
- **Network Isolation**: VMs have restricted network access
- **Time Limits**: Execution timeouts to prevent abuse

## 📊 Performance Benefits

### Frontend (AWS)
- **Global CDN**: <100ms response times worldwide
- **Edge Caching**: Static assets cached globally
- **Auto-Scaling**: Handles traffic spikes automatically

### Backend (GCP)
- **Fast VM Startup**: ~125ms for Firecracker VMs
- **Secure Isolation**: VM-level security for code execution
- **Resource Efficiency**: Minimal overhead per execution

## 🎯 Next Steps

1. **Deploy Backend**: Use the GCP Firecracker deployment
2. **Set Up AWS**: Configure S3 + CloudFront for frontend
3. **Configure Domain**: Set up `codesandbox.tutorialsdojo.com`
4. **Add Monitoring**: Set up health checks and alerts
5. **Optimize Costs**: Implement auto-scaling and cost controls

This architecture gives you the best of both clouds: AWS's global CDN for your frontend and GCP's Firecracker for secure, fast code execution! 🚀
