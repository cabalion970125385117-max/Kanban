# QuestBoard Phase 1 Setup Script
# Run from repo root: .\scripts\setup.ps1

Write-Host "Starting QuestBoard infrastructure..." -ForegroundColor Cyan
docker compose up -d postgres redis
Write-Host "Waiting for postgres to be ready..."
Start-Sleep -Seconds 8

Write-Host "Building and starting API..." -ForegroundColor Cyan
docker compose up -d --build api

Write-Host "Waiting for API to start..."
Start-Sleep -Seconds 15

Write-Host "Running DB migrations..." -ForegroundColor Cyan
docker compose exec api npx ts-node src/db/migrate.ts up

Write-Host "Seeding database (avatars + superadmin)..." -ForegroundColor Cyan
docker compose exec api npx ts-node src/db/seed.ts

Write-Host "Starting web app..." -ForegroundColor Cyan
docker compose up -d --build web

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  QuestBoard Phase 1 is running!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "  API:  http://localhost:4000" -ForegroundColor Yellow
Write-Host "  Web:  http://localhost:5173" -ForegroundColor Yellow
Write-Host "  Login: cabal / cabal (superadmin)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
