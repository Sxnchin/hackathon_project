#!/bin/bash
set -e  # exit on any error

echo "💧 Setting up Ls-backend..."

# 1️⃣ Install Node dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# 2️⃣ Start Docker Postgres
echo "🐳 Starting Postgres Docker container..."
docker-compose up -d

# Wait a few seconds for Postgres to be ready
echo "⏳ Waiting 5 seconds for Postgres..."
sleep 5

# 3️⃣ Generate Prisma client
echo "⚡ Generating Prisma client..."
npx prisma generate

# 4️⃣ Run Prisma migrations
echo "🗄️ Running Prisma migrations..."
npx prisma migrate dev --name init --skip-seed

# 5️⃣ Seed initial data
echo "🌱 Seeding database..."
npm run seed

# 6️⃣ Start dev server
echo "🚀 Starting backend dev server..."
npm run dev
