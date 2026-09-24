@echo off
cd /d D:\thanawy\frontend
npx vitest run > %TEMP%\vitest_loop3.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> %TEMP%\vitest_loop3.log
