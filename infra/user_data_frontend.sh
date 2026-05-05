#!/bin/bash
apt update -y
apt install -y nginx git
cd /home/ubuntu
git clone https://github.com/${github_username}/vinylmania.git app
# Remove default nginx index page
rm -f /var/www/html/index.nginx-debian.html
# Copy all frontend files to nginx web root
cp -r app/frontend/* /var/www/html/
# Replace API_BASE in api.js with the ALB DNS name
# Assuming api.js exists and has a line for window.API_BASE
sed -i 's|window.API_BASE = .*|window.API_BASE = "http://${alb_dns_name}";|' /var/www/html/api.js
systemctl enable nginx
systemctl restart nginx
