"""Запуск Скрибо одним кликом: сам готовит окружение, ищет свободный порт и открывает браузер."""
import os, sys, subprocess, socket, webbrowser, time, threading, urllib.request, venv
H = os.path.dirname(os.path.abspath(__file__)); V = os.path.join(H, ".venv"); W = os.name == "nt"
PY = os.path.join(V, "Scripts" if W else "bin", "python.exe" if W else "python")
def alive(p):
    try: urllib.request.urlopen("http://127.0.0.1:%d/api/status" % p, timeout=1); return True
    except Exception: return False
def busy(p):
    s = socket.socket(); r = s.connect_ex(("127.0.0.1", p)); s.close(); return r == 0
if alive(8000): webbrowser.open("http://localhost:8000"); sys.exit()
try:
    if not os.path.exists(PY): print("Первый запуск: готовлю окружение (1–3 минуты)…"); venv.create(V, with_pip=True)
    mark = os.path.join(V, ".ok")
    if not os.path.exists(mark):
        subprocess.check_call([PY, "-m", "pip", "install", "-q", "-r", os.path.join(H, "requirements.txt")]); open(mark, "w").close()
except Exception as e:
    print("Не удалось установить компоненты (%s). Открываю лёгкую версию без Whisper на компьютере." % e)
    webbrowser.open("file://" + os.path.join(H, "index.html").replace("\\", "/")); sys.exit()
port = 8000
while busy(port): port += 1
def opener():
    for _ in range(120):
        if alive(port): webbrowser.open("http://localhost:%d" % port); return
        time.sleep(.5)
threading.Thread(target=opener, daemon=True).start()
subprocess.call([PY, os.path.join(H, "server.py")], env=dict(os.environ, PORT=str(port)))
