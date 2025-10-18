@echo off
echo Setting up Ls-backend...

:: 1️⃣ Install Node dependencies
echo Installing Node.js dependencies...
npm install

:: 2️⃣ Start Docker Postgres
echo Starting Postgres Docker container...
docker-compose up -d

:: 3️⃣ Wait for Postgres to initialize
echo Waiting 5 seconds for Postgres...
timeout /t 5 /nobreak

:: 4️⃣ Generate Prisma client
echo Generating Prisma client...
npx prisma generate

:: 5️⃣ Run Prisma migrations
echo Running Prisma migrations...
npx prisma migrate dev --name init --skip-seed

:: 6️⃣ Seed initial data
echo Seeding database...
npm run seed

:: 7️⃣ Start dev server
echo Starting backend dev server...
npm run dev