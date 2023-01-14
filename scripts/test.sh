#!/bin/bash

sudo docker compose -f docker/docker-compose.local.yml -p test up -d db
until mysqladmin ping -h 127.0.0.1 -u root --password=password; do
  echo "waiting db..."
  sleep 2
done
npx prisma db push
npm run build
npx start-server-and-test "npm run start" 3000 "npx playwright test"
sudo docker rm -f test-db-1