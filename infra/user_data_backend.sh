#!/bin/bash
apt update -y
apt install -y git nodejs npm
cd /home/ubuntu
git clone https://github.com/${github_username}/vinylmania.git app
cd app/backend
npm install
cat > .env << EOF
DB_HOST=${db_host}
DB_USER=${db_user}
DB_PASS=${db_pass}
DB_NAME=${db_name}
PORT=3000
DISCOGS_TOKEN=${discogs_token}
JWT_SECRET=${jwt_secret}
EOF
npm start &
