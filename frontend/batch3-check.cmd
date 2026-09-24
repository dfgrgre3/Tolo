@echo off
cd /d D:\thanawy\frontend
npx tsc --noEmit > tsc-batch3.txt 2>&1
echo TSC_EXIT=%errorlevel% >> tsc-batch3.txt
npx vitest run > vitest-batch3.txt 2>&1
echo VITEST_EXIT=%errorlevel% >> vitest-batch3.txt
