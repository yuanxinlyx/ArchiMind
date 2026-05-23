@echo off
setlocal
title ArchiMind - Multi-Agent Discussion
set "ROOT=%~dp0"
set "BACKEND_DIR=%ROOT%backend"
set "FRONTEND_DIR=%ROOT%frontend"

echo.
echo  ========================================
echo    ArchiMind - Multi-Agent Discussion
echo  ========================================
echo.

echo [1/4] Checking Python...
set "PYTHON_CMD="
where python >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=python"
if not defined PYTHON_CMD (
  where py >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=py -3"
)
if not defined PYTHON_CMD (
  echo [ERROR] Python 3.10+ was not found. Please install Python first:
  echo         https://www.python.org/downloads/
  pause
  exit /b 1
)

echo [2/4] Checking Node.js and npm...
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 18+ was not found. Please install Node.js first:
  echo         https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Please reinstall Node.js with npm enabled.
  pause
  exit /b 1
)

echo [3/4] Preparing backend dependencies...
if not exist "%BACKEND_DIR%\.venv\Scripts\python.exe" (
  echo Creating backend virtual environment...
  cd /d "%BACKEND_DIR%"
  %PYTHON_CMD% -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Failed to create Python virtual environment.
    pause
    exit /b 1
  )
)
cd /d "%BACKEND_DIR%"
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [ERROR] Failed to install backend dependencies.
  pause
  exit /b 1
)

echo [4/4] Preparing frontend dependencies...
cd /d "%FRONTEND_DIR%"
if not exist "node_modules\.bin\vite.cmd" (
  echo Installing frontend dependencies...
  if exist package-lock.json (
    call npm ci
  ) else (
    call npm install
  )
  if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies.
    pause
    exit /b 1
  )
)

echo.
echo Starting backend...
start "ArchiMind-Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && .venv\Scripts\python.exe main.py"

echo Starting frontend...
start "ArchiMind-Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo.
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo.
echo  Both servers are starting in separate windows.
echo  Press any key to exit this launcher...
pause >nul
