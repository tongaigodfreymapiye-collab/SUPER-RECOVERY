@echo off
powershell -NoProfile -Command "Start-Process python -ArgumentList 'server.py' -WorkingDirectory '%~dp0' -Verb RunAs"
timeout /t 3 >nul
start "" http://127.0.0.1:8765
