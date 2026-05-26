@echo off
cd /d "%~dp0"
echo Starting PostgreSQL + Redis via Docker Compose...
docker-compose up -d
echo.
echo PostgreSQL: localhost:5433 (db: webchat, user: webchat, pass: webchat_pass)
echo Redis:      localhost:6379
