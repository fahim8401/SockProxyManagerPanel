#!/bin/bash

# Simple deployment - just copy essential files
VPS_HOST="103.7.4.183"
VPS_USER="root"
VPS_PASS="1hZuXd3c2#Ql"

echo "🚀 Simple VPS deployment..."

# Copy essential files individually
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no package.json $VPS_USER@$VPS_HOST:/root/
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r server/ $VPS_USER@$VPS_HOST:/root/
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r shared/ $VPS_USER@$VPS_HOST:/root/
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no -r client/ $VPS_USER@$VPS_HOST:/root/
sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no vite.config.ts tsconfig.json tailwind.config.ts postcss.config.js components.json $VPS_USER@$VPS_HOST:/root/

# Setup on VPS
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "
cd /root
ls -la package.json server/ shared/ || echo 'Files check'

# Install dependencies
npm install

# Build project
npm run build

# Check build
ls -la dist/ || echo 'Build output check'

# Start service
pkill -f 'node dist/index.js' || true
nohup node dist/index.js > /dev/null 2>&1 &
sleep 3

# Check status
ps aux | grep 'node dist/index.js' | grep -v grep
curl -s http://localhost:5000/api/stats || echo 'Service starting...'
"

echo "✅ Deployment completed!"