@echo off
title ArchiMind - Multi-Agent Discussion
echo.
echo  ========================================
echo    ArchiMind - Multi-Agent Discussion
echo  ========================================
echo.

echo [1/2] Starting backend...
start "ArchiMind-Backend" cmd /k "cd /d %~dp0backend && python main.py"

echo [2/2] Starting frontend...
cd /d %~dp0frontend
start "ArchiMind-Frontend" cmd /k "npm run dev"

echo.
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo.
echo  Both servers are starting in separate windows.
echo  Press any key to exit this launcher...
pause >nul
