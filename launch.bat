@echo off
cd /d "C:\Users\travi\.gemini\antigravity\scratch\behavior-ops-trainer"

:: Check if port 5173 is already listening
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if %errorlevel% neq 0 (
  start /min "" cmd /c "node_modules\.bin\vite.cmd preview --host 127.0.0.1 --port 5173"
  timeout /t 2 /nobreak >nul
)

start "" "http://127.0.0.1:5173/"
