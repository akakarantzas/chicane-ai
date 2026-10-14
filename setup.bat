@echo off
setlocal
rem ChicaneAI one-step setup. Run from the repository root.
rem   setup.bat        install backend and frontend dependencies
rem   setup.bat run    install, then start both servers in new windows

cd /d "%~dp0"

echo [1/4] Checking prerequisites...
set "PY="
py -3.12 --version >nul 2>&1 && set "PY=py -3.12"
if not defined PY (
    python --version >nul 2>&1 && set "PY=python"
)
if not defined PY (
    echo ERROR: Python 3.12 was not found. Install it from https://www.python.org/downloads/
    exit /b 1
)
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found. Install Node.js 22.12 or later from https://nodejs.org/
    exit /b 1
)

echo [2/4] Setting up the backend...
if not exist "backend\venv\Scripts\python.exe" (
    %PY% -m venv backend\venv
    if errorlevel 1 goto :fail
)
"backend\venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto :fail
"backend\venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 goto :fail

echo [3/4] Setting up the frontend...
pushd frontend
cmd /c npm install
if errorlevel 1 (
    popd
    goto :fail
)
popd

echo [4/4] Done.
echo.
echo Backend:  cd backend ^&^& venv\Scripts\python.exe -m uvicorn app.main:app --reload
echo Frontend: cd frontend ^&^& npm run dev
echo App:      http://localhost:5173
echo.
echo Optional: copy backend\.env.example to backend\.env to enable the contact form.

if /i "%~1"=="run" (
    start "ChicaneAI backend" /d "%~dp0backend" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --reload"
    start "ChicaneAI frontend" /d "%~dp0frontend" cmd /k "npm run dev"
)
exit /b 0

:fail
echo.
echo Setup failed. See the error above.
exit /b 1
