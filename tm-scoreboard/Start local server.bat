@echo off
cd /d "%~dp0"
echo.
echo Starting a small web server on this computer only (port 8765).
echo Leave this window OPEN while you use the scoreboard.
echo Close it when you are done.
echo.
echo Then in Chrome open:
echo   Projector: http://localhost:8765/display.html
echo   Control:   http://localhost:8765/control.html
echo   Mental timer (optional): http://localhost:8765/mind-timer.html
echo.

py -m http.server 8765 2>nul
if errorlevel 1 python -m http.server 8765 2>nul
if errorlevel 1 (
    echo.
    echo Could not start the server: Python was not found.
    echo Install Python from https://www.python.org/downloads/
    echo Make sure "Add Python to PATH" is checked during install.
    echo.
    pause
)
