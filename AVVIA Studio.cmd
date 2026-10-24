@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Prima esegui npm install in questa cartella.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:5173/studio.html"
call npm run dev
