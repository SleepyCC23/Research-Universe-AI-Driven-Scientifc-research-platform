@echo off
rem ============================================================
rem  Research Universe - import DB snapshot (Windows launcher)
rem
rem  This .bat is a thin, ASCII-only launcher: it finds Git Bash
rem  and runs import.sh, then restores the original code page.
rem  Keeping ALL logic in import.sh avoids cmd.exe code-page and
rem  batch-parsing pitfalls (Chinese output, nested for /f, etc).
rem
rem  Usage:
rem    import.bat            run with defaults
rem    import.bat --ask      prompt for connection info
rem ============================================================

setlocal
set "SCRIPT_DIR=%~dp0"
set "NOPAUSE=0"
if not "%~1"=="" set "NOPAUSE=1"

rem ---------- locate bash ----------
set "BASH="
for /f "delims=" %%I in ('where bash 2^>nul') do (
  if not defined BASH set "BASH=%%I"
)
if not defined BASH (
  for %%P in (
    "C:\Program Files\Git\bin\bash.exe"
    "C:\Program Files (x86)\Git\bin\bash.exe"
    "C:\Program Files\Git\usr\bin\bash.exe"
    "%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
    "D:\Program Files\Git\bin\bash.exe"
    "E:\Program Files\Git\bin\bash.exe"
  ) do (
    if not defined BASH if exist %%P set "BASH=%%~P"
  )
)

if not defined BASH (
  echo [ERROR] Git Bash not found, cannot run import.sh.
  echo         Install "Git for Windows", or run this manually:
  echo.
  echo         mysql -uroot -p --default-character-set=utf8mb4 ^
  echo           ^< research_universe_dev.sql
  echo.
  if "%NOPAUSE%"=="0" pause
  exit /b 1
)

rem UTF-8 console so import.sh's Chinese output renders correctly.
rem Safe here because this launcher is pure ASCII.
chcp 65001 >nul

"%BASH%" "%SCRIPT_DIR%import.sh" %*
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo [ERROR] import.sh exited with code %RC%.
  echo.
)

if "%NOPAUSE%"=="0" pause
exit /b %RC%
