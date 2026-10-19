#!/bin/sh
cd "$(dirname "$0")"
PY=$(command -v python3 || command -v python)
if [ -z "$PY" ]; then echo "Python не найден - открываю лёгкую версию"; (xdg-open index.html || open index.html) 2>/dev/null; exit; fi
exec "$PY" launch.py
