#!/bin/bash
# VM Setup Script - Apply configurations for Firecracker environment

set -e

echo "🚀 Setting up Tutorials Dojo on Firecracker VM..."

# Go to project directory
cd /opt/tutorials-dojo

# Apply configurations
echo "📁 Applying nginx configuration..."
sudo cp nginx-config.txt /etc/nginx/sites-available/tutorials-dojo
sudo ln -sf /etc/nginx/sites-available/tutorials-dojo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

echo "🗄️ Applying database configuration..."
cp sqlite-config.js backend/config/config.js

echo "⚙️ Creating environment file..."
cp .env.example .env

echo "📦 Installing backend dependencies..."
cd backend
npm install sequelize sqlite3 express-validator helmet express-rate-limit compression dotenv bcryptjs jsonwebtoken multer uuid

echo "🔧 Testing nginx configuration..."
sudo nginx -t

echo "🔄 Restarting services..."
sudo systemctl restart nginx
sudo systemctl restart tutorials-dojo || echo "Backend service may need manual attention"

echo "✅ Setup complete!"
echo ""
echo "🌐 Frontend: http://$(curl -s ifconfig.me)"
echo "🔍 Check backend: sudo systemctl status tutorials-dojo"
echo "📊 View logs: sudo journalctl -u tutorials-dojo -f"
echo ""
echo "🔥 Test Firecracker: sudo firecracker --version"
