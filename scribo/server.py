"""Голос → Текст: локальный сервер. Запуск: python server.py  →  http://localhost:8000"""
import os, json, time, shutil, sqlite3, tempfile, threading, traceback, faulthandler, urllib.parse, urllib.request
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")  # лечит падение из-за конфликта OpenMP на Windows
faulthandler.enable()
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from starlette.concurrency import run_in_threadpool
import uvicorn

HERE = os.path.dirname(os.path.abspath(__file__))
DBP = os.path.join(HERE, "golos.db")
os.makedirs(os.path.join(HERE, "backups"), exist_ok=True)
if os.path.exists(DBP):  # ежедневная копия базы
    shutil.copy(DBP, os.path.join(HERE, "backups", "golos-%s.db" % time.strftime("%Y%m%d")))
DB = sqlite3.connect(DBP, check_same_thread=False)
DB.row_factory = sqlite3.Row
DB.executescript("""create table if not exists docs(id integer primary key autoincrement,title text,src text,dst text,t real);
create table if not exists vers(id integer primary key autoincrement,doc integer,t real,src text,dst text);""")
app = FastAPI()
KEY = bool(os.getenv("ANTHROPIC_API_KEY"))
_w = None

_lock = threading.Lock()
ST = {"model": "loading", "err": ""}

def whisper():
    global _w
    with _lock:
        if _w is None:
            from faster_whisper import WhisperModel
            _w = WhisperModel(os.getenv("WHISPER_MODEL", "small"), device=os.getenv("WHISPER_DEVICE", "cpu"), compute_type="int8")
    return _w

def preload():
    print("Загружаю модель речи (первый раз — несколько минут)…")
    try:
        whisper(); ST["model"] = "ready"; print("Модель готова.")
    except Exception as e:
        ST.update(model="error", err=str(e)); traceback.print_exc()

def claude(prompt):
    import anthropic
    r = anthropic.Anthropic().messages.create(model=os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5"),
        max_tokens=4000, messages=[{"role": "user", "content": prompt}])
    return r.content[0].text.strip()

def mm(t, s, d):
    z = {"zh": "zh-CN"}
    q = urllib.parse.urlencode({"q": t[:450], "langpair": "%s|%s" % (z.get(s, s), z.get(d, d))})
    return json.load(urllib.request.urlopen("https://api.mymemory.translated.net/get?" + q, timeout=15))["responseData"]["translatedText"]

def one(t, s, d):
    try:
        import argostranslate.translate as T
        r = T.translate(t, s, d)
        if r: return r
    except Exception:
        pass
    return mm(t, s, d)

def per_line(text, s, d):  # сохраняет Markdown: ##, -, таблицы
    out = []
    for ln in text.split("\n"):
        pre = ""
        for p in ("## ", "- "):
            if ln.startswith(p): pre, ln = p, ln[len(p):]
        if not ln.strip() or set(ln) <= set("|-"): out.append(pre + ln)
        elif ln.startswith("|"):
            out.append("|" + "|".join(" %s " % one(c.strip(), s, d) if c.strip() else " " for c in ln.split("|")[1:-1]) + "|")
        else: out.append(pre + one(ln, s, d))
    return "\n".join(out)

def err(e, c=500): return JSONResponse({"error": str(e)}, c)

@app.get("/")
def index(): return HTMLResponse(open(os.path.join(HERE, "index.html"), encoding="utf-8").read())

OKX = {".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".ico": "image/x-icon", ".svg": "image/svg+xml"}

@app.get("/{name}")
def asset(name: str):
    p = os.path.join(HERE, name); x = os.path.splitext(name)[1]
    if x not in OKX or not os.path.isfile(p): return JSONResponse({"error": "not found"}, 404)
    return FileResponse(p, media_type=OKX[x])

@app.get("/api/status")
def status():
    return {"stt": os.getenv("WHISPER_MODEL", "small"), "ai": KEY, "tr": "Claude" if KEY else "Argos / MyMemory", **ST}

@app.post("/api/stt")
async def stt(req: Request, lang: str = "ru"):
    data = await req.body()
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as f:
        f.write(data); p = f.name
    def work():
        segs, info = whisper().transcribe(p, language=None if lang == "auto" else lang[:2], vad_filter=True, beam_size=int(os.getenv("BEAM", "2")))
        return {"text": " ".join(x.text.strip() for x in segs).strip(), "lang": info.language}
    try: return await run_in_threadpool(work)
    except Exception as e: return err(e)
    finally: os.remove(p)

@app.post("/api/translate")
async def translate(req: Request):
    b = await req.json()
    try:
        if KEY:
            return {"text": await run_in_threadpool(claude, "Translate from %s to %s. Keep Markdown (##, -, tables) intact. Output only the translation.\n\n%s" % (b["src"], b["dst"], b["text"]))}
        return {"text": await run_in_threadpool(per_line, b["text"], b["src"], b["dst"])}
    except Exception as e: return err(e)

@app.post("/api/translate_many")
async def translate_many(req: Request):
    b = await req.json(); s, d, T = b["src"], b["dst"], b["texts"]
    try:
        if KEY:
            r = await run_in_threadpool(claude, "Translate each string of this JSON array from %s to %s. Return only a JSON array of the same length.\n\n%s" % (s, d, json.dumps(T, ensure_ascii=False)))
            r = json.loads(r[r.index("["):r.rindex("]") + 1])
            if len(r) == len(T): return {"texts": r}
        return {"texts": await run_in_threadpool(lambda: [one(t, s, d) if t.strip() else t for t in T])}
    except Exception as e: return err(e)

@app.post("/api/polish")
async def polish(req: Request):
    if not KEY: return err("Нужен ключ: задайте переменную ANTHROPIC_API_KEY и перезапустите сервер", 503)
    b = await req.json()
    try:
        return {"text": await run_in_threadpool(claude, "Fix grammar, punctuation and clarity of this dictated text and structure it with Markdown (## headings, - lists, tables where they fit). Keep the language and meaning. Output only the text.\n\n" + b["text"])}
    except Exception as e: return err(e)

@app.post("/api/smart")
async def smart(req: Request):
    if not KEY: return err("Нужен ключ: задайте ANTHROPIC_API_KEY и перезапустите сервер", 503)
    b = await req.json()
    try: return {"text": await run_in_threadpool(claude, b["prompt"])}
    except Exception as e: return err(e)

@app.get("/api/docs")
def docs(): return [dict(r) for r in DB.execute("select id,title,t from docs order by t desc")]

@app.post("/api/docs")
async def new_doc(req: Request):
    b = await req.json()
    c = DB.execute("insert into docs(title,src,dst,t) values(?,?,?,?)", (b.get("title", "Без названия"), b.get("src", ""), "", time.time()))
    DB.commit(); return {"id": c.lastrowid}

@app.get("/api/docs/{i}")
def get_doc(i: int): return dict(DB.execute("select * from docs where id=?", (i,)).fetchone())

@app.put("/api/docs/{i}")
async def put_doc(i: int, req: Request, v: int = 0):
    b = await req.json(); now = time.time()
    last = DB.execute("select t,src from vers where doc=? order by t desc limit 1", (i,)).fetchone()
    if b["src"].strip() and (v or not last or (now - last[0] > 60 and last[1] != b["src"])):
        DB.execute("insert into vers(doc,t,src,dst) values(?,?,?,?)", (i, now, b["src"], b["dst"]))
        DB.execute("delete from vers where doc=? and id not in (select id from vers where doc=? order by t desc limit 50)", (i, i))
    DB.execute("update docs set title=?,src=?,dst=?,t=? where id=?", (b["title"], b["src"], b["dst"], now, i))
    DB.commit(); return {"ok": 1}

@app.delete("/api/docs/{i}")
def del_doc(i: int):
    DB.execute("delete from docs where id=?", (i,)); DB.execute("delete from vers where doc=?", (i,)); DB.commit(); return {"ok": 1}

@app.get("/api/docs/{i}/versions")
def versions(i: int): return [dict(r) for r in DB.execute("select * from vers where doc=? order by t desc", (i,))]

@app.get("/api/backup")
def backup():
    d = {"docs": [dict(r) for r in DB.execute("select * from docs")], "versions": [dict(r) for r in DB.execute("select * from vers")]}
    return JSONResponse(d, headers={"Content-Disposition": "attachment; filename=golos-backup.json"})

if __name__ == "__main__":
    h, p = os.getenv("HOST", "127.0.0.1"), int(os.getenv("PORT", "8000"))
    print("Открой в Chrome/Edge: http://localhost:%d  (первый запуск скачает модель речи)" % p)
    threading.Thread(target=preload, daemon=True).start()
    uvicorn.run(app, host=h, port=p, log_level="info")
