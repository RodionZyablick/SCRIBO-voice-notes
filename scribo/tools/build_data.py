# После правки langs.json / templates.json / config.json запустите: python tools/build_data.py
import json,os
H=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
r=lambda n:json.load(open(os.path.join(H,n),encoding="utf-8"))
open(os.path.join(H,"data.js"),"w",encoding="utf-8").write("window.SCRIBO="+json.dumps({"langs":r("langs.json"),"templates":r("templates.json"),"config":r("config.json"),"i18n":r("i18n.json")},ensure_ascii=False)+";\n")
