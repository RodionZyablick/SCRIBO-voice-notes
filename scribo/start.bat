@echo off
chcp 65001 >nul
cd /d "%~dp0"
where py >nul 2>nul && (py -3 launch.py & goto done)
where python >nul 2>nul && (python launch.py & goto done)
echo Python не найден - открываю лёгкую версию (без Whisper на компьютере).
echo Для точного офлайн-распознавания установите Python с python.org (галочка Add to PATH).
start "" index.html
:done
pause
