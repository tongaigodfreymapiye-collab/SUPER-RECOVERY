@echo off
cd /d "%~dp0"
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
where python >nul 2>&1
if errorlevel 1 (
  echo Python 3 is required. Install it from https://www.python.org/downloads/windows/
  pause
  exit /b 1
)
start "SUPER RECOVERY" cmd /c "timeout /t 2 /nobreak ^>nul ^& start http://127.0.0.1:8765"
echo SUPER RECOVERY local forensic agent starting...
echo Keep this window open while using the application.
python server.py
pause
