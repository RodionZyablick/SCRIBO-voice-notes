/* Скрибо · extras.js — надстройка: волна, тур, подсказки, переводчик+, фичи, PWA */
(()=>{const CFG=SCRIBO.config,root=document.documentElement;Object.assign(WN,CFG.whisperNames);
/* волна звука вместо столбиков */
const cv=document.createElement("canvas");cv.id="wave";cv.width=240;cv.height=56;$("#meter").after(cv);const g=cv.getContext("2d"),Hs=[],mt=$("#meter");
(function f(){Hs.push(+mt.style.getPropertyValue("--l")||0);if(Hs.length>48)Hs.shift();g.clearRect(0,0,240,56);g.fillStyle=getComputedStyle(pill).color;
 Hs.forEach((v,i)=>{const h=4+v*46*(.55+.45*Math.sin(i/3+Date.now()/260));g.beginPath();g.roundRect(i*5,28-h/2,3,h,2);g.fill()});requestAnimationFrame(f)})();
/* авто-язык, счётчик слов за день */
const det=t=>/[\u4e00-\u9fff]/.test(t)?"zh":/[\u3040-\u30ff]/.test(t)?"ja":/[\uac00-\ud7af]/.test(t)?"ko":/[\u0600-\u06ff]/.test(t)?"ar":/[іїєґ]/i.test(t)?"uk":/[а-яё]/i.test(t)?"ru":/[a-z]/i.test(t)?"en":null;
const day=()=>new Date().toISOString().slice(0,10),td=()=>{const o=JSON.parse(LS.today||"{}");return o.d==day()?o:{d:day(),n:0}},showT=()=>$("#today").textContent="Сегодня: "+td().n+" слов";
const oh=handle;window.handle=async raw=>{if($("#from").value=="auto"){const l=det(raw);if(l)lastLang=l}const o=td();o.n+=(raw.match(/\S+/g)||[]).length;LS.today=JSON.stringify(o);showT();return oh(raw)};showT();
/* подсказки в пустом документе */
const chips=document.createElement("div");chips.id="chips";chips.innerHTML="<p>Скажите — или нажмите на пример:</p>";
CFG.examples.forEach(t=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>handle(t);chips.append(b)});$("#cv").append(chips);
const os=stats;window.stats=()=>{os();chips.hidden=!!(ed.textContent.trim()||ed.querySelector("table"))};stats();
/* переводчик+: цепочка движков, таймауты, глоссарий, офлайн через сервер */
const T=()=>({signal:AbortSignal.timeout(9000)}),J_=async u=>(await fetch(u,T())).json();
const ENG={google:async(t,s,d)=>(await J_("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl="+s+"&tl="+d+"&q="+encodeURIComponent(t)))[0].map(x=>x[0]).join(""),
 lingva:async(t,s,d)=>(await J_("https://lingva.ml/api/v1/"+s.slice(0,2)+"/"+d.slice(0,2)+"/"+encodeURIComponent(t))).translation,
 mymemory:async(t,s,d)=>(await J_("https://api.mymemory.translated.net/get?q="+encodeURIComponent(t.slice(0,450))+"&langpair="+s+"|"+d)).responseData.translatedText,
 server:async(t,s,d)=>{if(!useSrv)throw 0;return(await api("/translate",J("POST",{src:s.slice(0,2),dst:d.slice(0,2),text:t}))).text},
 gemini:async(t,s,d)=>{if(!LS.gk)throw 0;return ai("Translate from "+s+" to "+d+". Output only the translation.\n\n"+t)}};
window.g1=async(t,s,d)=>{const k=s+d+t;if(tc.has(k))return tc.get(k);let q=t;
 for(const ln of(LS.gloss||"").split("\n")){const[a,b]=ln.split("=");if(a&&b)q=q.replace(rx(a.trim()),b.trim())}
 const p=LS.te||"auto",ord=[...new Set(p!="auto"?[p,"google","lingva","mymemory"]:navigator.onLine?["google","lingva","mymemory","server","gemini"]:["server"])];
 for(const e of ord){try{const r=await ENG[e](q,s,d);if(r&&r.trim()){tc.set(k,r);if(e!=ord[0])toast("Переведено через "+e);return r}}catch(x){}}
 throw new Error("все переводчики недоступны — проверьте интернет")};
$("#side .sh").insertAdjacentHTML("beforeend",'<button id="cpy" title="Копировать перевод">⧉</button><button id="ins" title="Вставить перевод в текст">⇤</button><select id="te" title="Движок перевода"></select>');
const te=$("#te");[["auto","Авто"],["google","Google"],["lingva","Lingva"],["mymemory","MyMemory"],["server","Офлайн"],["gemini","Gemini"]].forEach(([v,n])=>te.add(new Option(n,v)));
te.value=LS.te||"auto";te.onchange=()=>{LS.te=te.value;tc.clear()};
$("#cpy").onclick=()=>{navigator.clipboard.writeText(tr.innerText);toast("Перевод скопирован")};$("#ins").onclick=()=>{put(ed,"\n"+tr.innerText)};
/* диалоги */
function tour(){LS.seen=1;show('<h3>Добро пожаловать в Скрибо</h3><ol class="tour"><li><b>Нажмите ●</b> внизу (или Ctrl+Пробел) и говорите — заглавные и точки расставятся сами.</li><li><b>Скажите «запятая», «новый абзац», «заголовок …»</b> или нажмите на пример в пустом документе.</li><li><b>Справа — перевод.</b> Выберите языки сверху — он появится после каждой фразы.</li><li><b>☰ слева:</b> документы, шаблоны, таблицы, ИИ и разговор через переводчика.</li></ol><p><button id="mt">🎙 Проверить микрофон</button> <button id="go">Поехали</button></p>');
 $("#mt").onclick=async()=>{try{(await navigator.mediaDevices.getUserMedia({audio:true})).getTracks().forEach(t=>t.stop());toast("Микрофон работает ✓")}catch(e){toast("Нет доступа к микрофону — разрешите его в адресной строке")}};$("#go").onclick=()=>dlg.close()}
const keys=()=>show('<h3>Горячие клавиши</h3><table class="hk">'+[["Ctrl+Пробел","микрофон вкл/выкл"],["Ctrl+K","поиск команд и документов"],["Ctrl+H","найти и заменить"],["F1","эта подсказка"],["Esc","выйти из режима фокуса"]].map(r=>"<tr><td><kbd>"+r[0]+"</kbd></td><td>"+r[1]+"</td></tr>").join("")+"</table>");
function accDlg(){show('<h3>Цвет акцента</h3><div id="sws"></div>');CFG.accents.forEach(c=>{const b=document.createElement("button");b.className="sw";b.style.background=c;b.ariaLabel=c;b.onclick=()=>{LS.acc=c;root.style.setProperty("--acc",c)};$("#sws").append(b)})}
if(LS.acc)root.style.setProperty("--acc",LS.acc);
function glDlg(){show('<h3>Глоссарий переводчика</h3><p>Как переводить термины и имена: <code>слово=перевод</code>, по строке на пару.</p><textarea id="gl"></textarea><button id="ok">Сохранить</button>');$("#gl").value=LS.gloss||"";$("#ok").onclick=()=>{LS.gloss=$("#gl").value;tc.clear();dlg.close();toast("Глоссарий сохранён")}}
const share=()=>navigator.share?navigator.share({title:$("#title").value,text:ed.innerText}).catch(()=>{}):(navigator.clipboard.writeText(ed.innerText),toast("Текст скопирован — вставьте куда нужно"));
let dp;addEventListener("beforeinstallprompt",e=>{e.preventDefault();dp=e});
const inst=()=>dp?dp.prompt():toast("Chrome/Edge: меню ⋮ → «Установить Скрибо». iPhone: Поделиться → «На экран Домой». Нужно открыть через http(s), не из файла.");
if(SERVER&&"serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
ACT.push(["set","🧭","Быстрый тур",tour],["set","⌨","Горячие клавиши",keys],["set","🎨","Цвет акцента",accDlg],["set","📚","Глоссарий переводчика",glDlg],["file","📤","Поделиться…",share],["set","📲","Установить как приложение",inst]);
addEventListener("keydown",e=>{if(e.key=="F1"){e.preventDefault();keys()}});
window.tour=tour;
})();
