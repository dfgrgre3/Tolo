@echo off
cd /d D:\thanawy\frontend
npx tsc --noEmit > %TEMP%\tsc_loop3.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> %TEMP%\tsc_loop3.log
