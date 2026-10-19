const $=s=>document.querySelector(s),LS=localStorage,ed=$("#ed"),tr=$("#tr");
const LANGS=SCRIBO.langs;
$("#from").add(new Option("Авто-определение","auto"));for(const s of[$("#from"),$("#to")])LANGS.forEach(l=>s.add(new Option(l[1],l[0])));
$("#from").value=LS.vf||"ru-RU";$("#to").value=LS.vt||"en-US";
let lastLang="ru";const sl=()=>$("#from").value=="auto"?lastLang:$("#from").value.slice(0,2),tl=()=>$("#to").value.slice(0,2);
function toast(m){const t=$("#toast");t.textContent=m;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",4000)}
const dlg=$("#dlg");
function show(h){dlg.innerHTML=h+'<p><button id="x">Закрыть</button></p>';dlg.querySelector("#x").onclick=()=>dlg.close();dlg.showModal()}
const SERVER=location.protocol.startsWith("http");let useSrv=false;
const api=async(p,o={})=>{if(!SERVER)throw new Error("Failed to fetch");const r=await fetch("/api"+p,o);const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);return j};
const J=(m,b)=>({method:m,headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});
/* ===== МИНИ-ИИ: правила обработки речи (работает офлайн) ===== */
const CORR=/[,\s]+(?:нет[,\s]+(?:лучше|точнее|вернее)|не[,\s]+лучше|ой[,\s]+нет|стоп[,\s]+нет|точнее|вернее|я имел[аи]? в виду|no[,\s]+(?:rather|better|i mean)|i mean|sorry[,\s]+i meant)[,\s]+/i;
function mergeFix(a,b){ // подменяет ошибочный кусок в «a» исправлением «b»
  a=a.replace(/[,\s]+$/,"");const aw=a.split(/\s+/),bw=b.split(/\s+/);
  const i=aw.map(w=>w.toLowerCase()).lastIndexOf(bw[0].toLowerCase());
  if(i>0)return aw.slice(0,i).concat(bw).join(" ");
  return aw.slice(0,Math.max(0,aw.length-bw.length)).concat(bw).join(" ");}
function fixCorr(s){const p=s.split(new RegExp(CORR.source,"ig"));let r=p[0];for(let i=1;i<p.length;i++)if(p[i].trim())r=mergeFix(r,p[i].trim());return r}
const FILL=/(^|\s)(?:э+м*|мм+|эм+|типа|как бы|короче|um+|uh+|er+)(?=[\s,.]|$)/gi;
const CMD={ru:[["точка с запятой",";"],["вопросительный знак","?"],["восклицательный знак","!"],["запятая",","],["точка","."],["двоеточие",":"],["тире"," —"],["новый абзац","\n\n"],["новая строка","\n"],["открыть скобку"," ("],["закрыть скобку",")"]],
 en:[["semicolon",";"],["question mark","?"],["exclamation mark","!"],["exclamation point","!"],["comma",","],["period","."],["colon",":"],["new paragraph","\n\n"],["new line","\n"],["open bracket"," ("],["close bracket",")"]]};
const QRU=/^(кто|что|где|когда|почему|зачем|как|какой|какая|какое|какие|сколько|куда|откуда|чей|разве|неужели|можно ли|есть ли)(\s|$)/i, QEN=/^(who|what|where|when|why|how|which|do|does|did|can|could|is|are|will|would|should)(\s|$)/i;
const CAP=s=>s.charAt(0).toUpperCase()+s.slice(1);
function userDict(s){for(const ln of(LS.dict||"").split("\n")){const[a,b]=ln.split("=");if(a&&b!==undefined)s=s.split(new RegExp(a.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi")).join(b.trim())}return s}
const INF=/^[а-яё-]{4,}(?:ить|ать|ять|еть|ыть|оть|уть|ться|сти|чь)$/i;
function autoList(l,set){ // «надо приготовить еду, съездить в магазин…» → список
  const m=l.replace(/[.!]$/,"").match(set=="en"?/^(i need to|i have to|need to|to do|todo|buy|shopping list|list)[:\s]+(.+)$/i:/^((?:мне\s+)?(?:надо|нужно|необходимо|важно)(?:\s+будет)?|список(?:\s+дел|\s+покупок)?|план(?:\s+на\s+\S+)?|задачи(?:\s+на\s+\S+)?|купить|купи)[:\s,]+(.+)$/i);
  if(!m)return null;
  let it=m[2].split(/\s*(?:,|;|\sпотом\s|\sзатем\s|\sещё\s|\sеще\s|\sа также\s|\sтакже\s|\sand then\s|\sand\s|\sthen\s)\s*/i).filter(x=>x.length>1);
  if(set!="en")it=it.flatMap(p=>{const w=p.split(/\s+/),ix=[];w.forEach((x,i)=>{if(INF.test(x))ix.push(i)});return ix.length<2?[p]:ix.map((s,k)=>w.slice(k?s:0,ix[k+1]).join(" "))});
  const k=m[1],hd=/купи/i.test(k)?"Купить":/покупок/i.test(k)?"Список покупок":/задач/i.test(k)?"Задачи":/план/i.test(k)?"План":/список/i.test(k)?"Список дел":set=="en"?"To do":"Нужно сделать";
  return it.length>=(/^(список|купи|buy)/i.test(k)?2:3)?hd+":\n"+it.map(x=>"- "+CAP(x)).join("\n"):null}
function process(raw,lang){
  const g=lang.slice(0,2),set=g=="ru"||g=="uk"?"ru":g=="en"?"en":null;
  let s=userDict(raw.trim());s=fixCorr(s).replace(FILL,"$1");
  if(set)for(const[w,sym]of CMD[set])s=s.replace(new RegExp("(^|\\s+)"+w+"(?=\\s|$)","gi"),()=>sym);
  s=s.replace(/(?:жирным|bold)\s+(.+?)\s+(?:конец выделения|end bold)/gi,"**$1**");
  s=s.replace(/(?:таблица|table)\s+(.+?)\s+(?:конец таблицы|end table)/gi,(m,b)=>{
    const rows=b.split(/\s+(?:строка|row)\s+/i).map(r=>r.split(/\s+(?:дальше|next|cell)\s+/i).map(c=>c.trim()));
    return "\n\n"+rows.map((r,i)=>"| "+r.join(" | ")+" |"+(i==0?"\n|"+r.map(()=>"---").join("|")+"|":"")).join("\n")+"\n\n"});
  s=s.replace(/\s+([,.!?:;)])/g,"$1").replace(/[ \t]*\n[ \t]*/g,"\n");
  const out=s.split("\n").map(line=>{
    line=line.trim();if(!line||line[0]=="|")return line;let m;const AL=autoList(line,set);if(AL)return AL;
    if(m=line.match(/^(?:заголовок|heading|title)\s+(.+)/i))return "## "+CAP(m[1].replace(/[.,]$/,""));
    if(m=line.match(/^(?:пункт|bullet|item)\s+(.+)/i))return "- "+CAP(m[1].replace(/[.,]$/,""));
    if(set=="ru")line=line.replace(/(\S)\s+(но|однако|чтобы|потому что|который|которая|которые|если)(?=\s)/gi,(x,a,b)=>/[,.!?]$/.test(a)?x:a+", "+b);
    line=CAP(line);
    if(!/[.!?…:;)»"*]$/.test(line))line+=(set=="ru"?QRU.test(line)||/\sли\s/.test(line):set=="en"&&QEN.test(line))?"?":".";
    return line}).join("\n");
  return out}


function md(t){const E=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;"),I=s=>E(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  const ls=t.split("\n");let o="",i=0;
  while(i<ls.length){const l=ls[i];
    if(l.startsWith("|")){let rows=[];while(i<ls.length&&ls[i].startsWith("|"))rows.push(ls[i++]);
      o+="<table>"+rows.filter(r=>!/^\|[-|]+\|$/.test(r)).map((r,k)=>"<tr>"+r.split("|").slice(1,-1).map(c=>(k?"<td>":"<th>")+I(c.trim())).join("")+"</tr>").join("")+"</table>";continue}
    if(l.startsWith("- ")){o+="<ul>";while(i<ls.length&&ls[i].startsWith("- "))o+="<li>"+I(ls[i++].slice(2))+"</li>";o+="</ul>";continue}
    o+=l.startsWith("## ")?"<h2>"+I(l.slice(3))+"</h2>":l.trim()?"<p>"+I(l)+"</p>":"";i++}
  return o}

function analyze(){const t=edText().replace(/^(## |- |\|.*)/gm,"");if(t.trim().length<40)return toast("Слишком мало текста для анализа");
  const ss=t.match(/[^.!?\n]+[.!?]/g)||[t],words=t.toLowerCase().match(/[\p{L}]{5,}/gu)||[],f={};words.forEach(w=>f[w]=(f[w]||0)+1);
  const sc=ss.map((s,i)=>[(s.toLowerCase().match(/[\p{L}]{5,}/gu)||[]).reduce((a,w)=>a+f[w],0)/Math.sqrt(s.length),i]).sort((a,b)=>b[0]-a[0]).slice(0,3).sort((a,b)=>a[1]-b[1]);
  const kw=Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,6).map(x=>x[0]);
  show("<h3>Анализ текста</h3><p><b>Кратко:</b> "+sc.map(x=>ss[x[1]].trim()).join(" ").replace(/</g,"&lt;")+"</p><p><b>Ключевые слова:</b> "+kw.join(", ")+"</p><p>"+ss.length+" предложений, "+(t.match(/\S+/g)||[]).length+" слов.</p>")}
document.execCommand("defaultParagraphSeparator",false,"p");
const setHtml=s=>s.trim().startsWith("<")?s:md(s), edText=()=>ed.innerText;
/* ===== панель инструментов ===== */
const TB=[["undo","↶"],["redo","↷"],0,["H1","H1"],["H2","H2"],["P","¶"],0,["bold","<b>B</b>"],["italic","<i>I</i>"],["underline","<u>U</u>"],["strikeThrough","<s>S</s>"],0,["insertUnorderedList","• Список"],["insertOrderedList","1. Список"],0,["justifyLeft","⯇"],["justifyCenter","≡"],["justifyRight","⯈"],0,["table","Таблица"],["removeFormat","Сбросить"]];
TB.forEach(t=>{if(!t){$("#tb").insertAdjacentHTML("beforeend","<i></i>");return}const b=document.createElement("button");b.innerHTML=t[1];b.dataset.c=t[0];b.onmousedown=e=>e.preventDefault();
  b.onclick=()=>{ed.focus();const c=t[0];if(/^(H1|H2|P)$/.test(c))document.execCommand("formatBlock",false,"<"+c+">");else if(c=="table")document.execCommand("insertHTML",false,"<table>"+"<tr>"+"<th><br></th>".repeat(3)+"</tr>"+("<tr>"+"<td><br></td>".repeat(3)+"</tr>").repeat(2)+"</table><p><br></p>");else document.execCommand(c)};$("#tb").append(b)});
$("#tb").insertAdjacentHTML("beforeend",'<span class="sp"></span><select id="ff"><option value="Georgia,serif">Georgia</option><option value="system-ui,sans-serif">Sans</option><option value="Consolas,monospace">Mono</option></select><select id="fs"><option>15</option><option selected>17</option><option>19</option><option>22</option></select>');
$("#ff").onchange=()=>ed.style.setProperty("--ff",$("#ff").value);$("#fs").onchange=()=>ed.style.setProperty("--fs",$("#fs").value+"px");
/* ===== вставка продиктованного текста в позицию курсора ===== */
let lastR=null;
document.addEventListener("selectionchange",()=>{const s=getSelection();if(s.rangeCount&&ed.contains(s.anchorNode))lastR=s.getRangeAt(0).cloneRange()});
function put(el,c){el.focus();const s=getSelection();let r;
  if(el==ed&&lastR&&ed.contains(lastR.startContainer))r=lastR;else{r=document.createRange();r.selectNodeContents(el);r.collapse(false)}
  s.removeAllRanges();s.addRange(r);
  if(/^(## |- |\|)/m.test(c))document.execCommand("insertHTML",false,md(c));
  else c.split("\n").forEach((p,i)=>{if(i)document.execCommand("insertParagraph");if(p){const q=getSelection().getRangeAt(0),ch=q.startContainer.nodeType==3?q.startContainer.nodeValue[q.startOffset-1]:null;document.execCommand("insertText",false,(ch&&!/\s/.test(ch)?" ":"")+p)}});
  el.scrollTop=el.scrollHeight;save()}
function replaceText(el,re,rep){let n=0;const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);while(w.nextNode()){const t=w.currentNode;if(re.test(t.nodeValue)){re.lastIndex=0;n+=(t.nodeValue.match(re)||[]).length;t.nodeValue=t.nodeValue.replace(re,rep)}re.lastIndex=0}return n}
const rx=s=>new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"gi");
/* ===== перевод ===== */
const tc=new Map(),GC=c=>c=="zh"?"zh-CN":c;
async function g1(t,s,d){const k=s+d+t;if(tc.has(k))return tc.get(k);let r;
  try{const j=await(await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl="+s+"&tl="+d+"&q="+encodeURIComponent(t))).json();r=j[0].map(x=>x[0]).join("")}
  catch(e){const j=await(await fetch("https://api.mymemory.translated.net/get?q="+encodeURIComponent(t.slice(0,450))+"&langpair="+s+"|"+d)).json();r=j.responseData.translatedText}
  tc.set(k,r);return r}
async function trBlock(t){if(sl()==tl())return t;const s=GC(sl()),d=GC(tl());
  return(await Promise.all(t.split("\n").map(async ln=>{const m=ln.match(/^(## |- )/),p=m?m[0]:"",b=ln.slice(p.length);if(!b.trim()||/^\|[-|\s]+\|$/.test(b))return ln;
    if(b[0]=="|")return"|"+(await Promise.all(b.split("|").slice(1,-1).map(c=>c.trim()?g1(c.trim(),s,d):""))).map(c=>" "+c+" ").join("|")+"|";return p+await g1(b,s,d)}))).join("\n")}
async function trMany(v,s,d){const out=[];let i=0;while(i<v.length){let j=i,n=0;while(j<v.length&&(n+=v[j].length+1)<2500)j++;if(j==i)j++;const c=v.slice(i,j);let r=(await g1(c.join("\n"),s,d)).split("\n");if(r.length!=c.length)r=await Promise.all(c.map(x=>g1(x,s,d)));out.push(...r);i=j}return out}
async function trAll(){if(side.hidden)toggleSide();toast("Перевожу…");try{tr.innerHTML=ed.innerHTML;const w=document.createTreeWalker(tr,NodeFilter.SHOW_TEXT),ns=[];while(w.nextNode())if(w.currentNode.nodeValue.trim())ns.push(w.currentNode);
  const r=await trMany(ns.map(n=>n.nodeValue.replace(/\n/g," ")),GC(sl()),GC(tl()));ns.forEach((n,i)=>n.nodeValue=r[i]);toast("Готово");save()}catch(e){toast("Перевод: "+e.message)}}
const side=$("#side");function toggleSide(){side.hidden=!side.hidden;$("#trt").setAttribute("aria-pressed",!side.hidden);LS.side=side.hidden?"0":"1"}
side.hidden=LS.side=="0";$("#trt").setAttribute("aria-pressed",!side.hidden);$("#trt").onclick=toggleSide;$("#trall").onclick=trAll;
let spk=false;function toggleSpk(){spk=!spk;$("#spk").setAttribute("aria-pressed",spk)}$("#spk").onclick=toggleSpk;
function say(t){const u=new SpeechSynthesisUtterance(t.replace(/[#*|-]/g,""));u.lang=$("#to").value;speechSynthesis.speak(u)}
/* ===== обработка фразы ===== */
async function handle(raw){raw=raw.trim();if(!raw)return;let m;
  if(/^(удали последнее|стереть последнее|delete last)/i.test(raw)){ed.focus();document.execCommand("undo");return save()}
  if(m=raw.match(/^замени\s+(.+?)\s+на\s+(.+?)\.?$/i)){toast("Замен: "+replaceText(ed,rx(m[1]),m[2]));return save()}
  if(conv)return convSay(raw);const c=await process(raw,sl());if(!c.trim())return;put(ed,c);
  if(!side.hidden&&sl()!=tl()){try{const t=await trBlock(c);put(tr,t);if(spk)say(t)}catch(e){toast("Перевод: "+e.message)}}}
$("#say").onkeydown=e=>{if(e.key=="Enter"){handle($("#say").value);$("#say").value=""}};
/* ===== микрофон: Whisper-сервер / Whisper в браузере / движок Chrome ===== */
let on=false,stream,ctx,tick,R=null,Q=Promise.resolve(),sr=null,ST={model:"loading"},pill=$("#pill"),eng="chrome",conv=null,wp=null;
const SRC=window.SpeechRecognition||window.webkitSpeechRecognition,srcCode=()=>conv?conv.from:$("#from").value;
const WN={ru:"russian",en:"english",uk:"ukrainian",zh:"chinese",es:"spanish",de:"german",fr:"french",ja:"japanese",ko:"korean",tr:"turkish",ar:"arabic",pt:"portuguese",it:"italian",pl:"polish"};
function pick(){const e=LS.eng||"auto",srv=useSrv&&ST.model=="ready";if(e=="wasm")return"wasm";if(e=="server"&&srv)return"server";if(e=="chrome"&&SRC)return"chrome";return srv?"server":SRC?"chrome":"wasm"}
function live(t){$("#live").textContent=t||(on?"Слушаю…":ST.model=="loading"?"Whisper загружается…":"Нажмите и говорите");pill.classList.toggle("on",on);$("#mic").textContent=on?"■":"●"}
async function probe(){if(!SERVER){useSrv=false;ST={model:"none"};return}try{ST=await api("/status");useSrv=true}catch(e){useSrv=false;ST={model:"down"}}}
async function poll(){await probe();live();if(ST.model=="loading")setTimeout(poll,3000);else if(ST.model=="error")toast("Whisper-сервер не запустился: "+ST.err.slice(0,100))}
function startSR(){if(!SRC)return toast("В этом браузере нет встроенного распознавания (Opera GX). Откройте меню → Ещё → Движок речи → «Whisper в браузере».");
  const r=sr=new SRC(),c=srcCode();r.continuous=true;r.interimResults=true;r.lang=c=="auto"?"ru-RU":c;
  r.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)Q=Q.then(()=>handle(t)).then(()=>live());else live(t)}};
  r.onend=()=>{if(on&&sr==r)try{r.start()}catch(e){}};r.onerror=e=>{if(e.error!="no-speech"&&e.error!="aborted")toast("Браузерное распознавание: "+e.error)};on=true;r.start();live()}
async function wasmStt(b){if(!wp){live("Скачиваю модель речи (один раз, ~80 МБ)…");const T=await import("https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2");T.env.allowLocalModels=false;wp=await T.pipeline("automatic-speech-recognition","Xenova/whisper-base")}
  const ac=new AudioContext({sampleRate:16000}),a=(await ac.decodeAudioData(await b.arrayBuffer())).getChannelData(0),c=srcCode(),L=c=="auto"?null:c.slice(0,2);ac.close();
  const o=await wp(a,{language:L?WN[L]:null,task:"transcribe"});return{text:o.text.trim(),lang:L||lastLang}}
async function startMic(){eng=pick();if(eng=="chrome")return startSR();
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){return toast("Нет доступа к микрофону — разрешите его в адресной строке браузера.")}
  ctx=new AudioContext();const an=ctx.createAnalyser();ctx.createMediaStreamSource(stream).connect(an);const buf=new Uint8Array(an.fftSize);let last=0,t0=0;on=true;live();
  tick=setInterval(()=>{an.getByteTimeDomainData(buf);let m=0;for(const v of buf)m=Math.max(m,Math.abs(v-128));const now=Date.now();$("#meter").style.setProperty("--l",Math.min(1,m/50));
    if(m>+(LS.th||14)){last=now;if(!R){const ch=[],r=R=new MediaRecorder(stream);t0=now;r.ondataavailable=e=>ch.push(e.data);
      r.onstop=()=>{if(Date.now()-t0>700){const b=new Blob(ch,{type:r.mimeType});Q=Q.then(()=>send(b))}};r.start();pill.classList.add("hot")}}
    else if(R&&now-last>(+LS.pause||800)){R.stop();R=null;pill.classList.remove("hot")}},80)}
function stopMic(){on=false;clearInterval(tick);if(R){R.stop();R=null}sr&&(sr.stop(),sr=null);stream&&stream.getTracks().forEach(t=>t.stop());ctx&&ctx.close();pill.classList.remove("hot");$("#meter").style.setProperty("--l",0);live()}
async function send(b){live("Распознаю…");try{const r=eng=="wasm"?await wasmStt(b):await api("/stt?lang="+srcCode(),{method:"POST",body:b});if(r.lang)lastLang=r.lang;if(r.text)await handle(r.text)}
  catch(e){if(eng=="server"&&/fetch/i.test(e.message)){ST={model:"down"};useSrv=false;stopMic();toast("Сервер остановился — включаю автономный режим.");return startMic()}toast("Распознавание: "+e.message)}if(on)live()}
$("#mic").onclick=()=>on?stopMic():startMic();
$("#from").onchange=()=>{LS.vf=$("#from").value;if(on){stopMic();startMic()}};$("#to").onchange=()=>LS.vt=$("#to").value;
$("#swap").onclick=()=>{if($("#from").value=="auto")return;const f=$("#from").value;$("#from").value=$("#to").value;$("#to").value=f;[ed.innerHTML,tr.innerHTML]=[tr.innerHTML,ed.innerHTML];$("#from").onchange();$("#to").onchange();save()};
/* ===== документы: сервер, а без него — память браузера ===== */
const LD=()=>JSON.parse(LS.sdocs||"{}"),LV=()=>JSON.parse(LS.svers||"{}"),tnow=()=>Date.now()/1e3;
const store={async list(){if(useSrv)return api("/docs");return Object.values(LD()).map(({id,title,t})=>({id,title,t})).sort((a,b)=>b.t-a.t)},
 async get(i){if(useSrv)return api("/docs/"+i);return LD()[i]},
 async create(title,src){if(useSrv)return api("/docs",J("POST",{title,src}));const d=LD(),id=Date.now();d[id]={id,title,src,dst:"",t:tnow()};LS.sdocs=JSON.stringify(d);return{id}},
 async put(i,b,v){if(useSrv)return api("/docs/"+i+(v?"?v=1":""),J("PUT",b));const d=LD();d[i]={...d[i],...b,t:tnow()};LS.sdocs=JSON.stringify(d);const V=LV(),a=V[i]||[];
  if(b.src.trim()&&(v||!a.length||(tnow()-a[0].t>60&&a[0].src!=b.src))){a.unshift({t:tnow(),src:b.src,dst:b.dst});V[i]=a.slice(0,30)}LS.svers=JSON.stringify(V)},
 async del(i){if(useSrv)return api("/docs/"+i,{method:"DELETE"});const d=LD();delete d[i];LS.sdocs=JSON.stringify(d)},
 async vers(i){if(useSrv)return api("/docs/"+i+"/versions");return LV()[i]||[]}};
let cur=+LS.cur||0,loaded=false,tm;
function stats(){const w=(edText().match(/\S+/g)||[]).length;$("#stat").textContent=w+" слов · ~"+Math.max(1,Math.round(w/180))+" мин чтения"}
function save(){stats();$("#sv").textContent="Сохранение…";clearTimeout(tm);tm=setTimeout(()=>flush(),700)}
async function flush(v){if(!loaded)return;try{await store.put(cur,{title:$("#title").value,src:ed.innerHTML,dst:tr.innerHTML},v);$("#sv").textContent="Сохранено"}catch(e){$("#sv").textContent="Не сохранено"}}
async function openDoc(i){if(loaded)await flush();const d=await store.get(i);cur=i;LS.cur=i;loaded=true;lastR=null;$("#title").value=d.title;ed.innerHTML=setHtml(d.src);tr.innerHTML=setHtml(d.dst);stats()}
async function newDoc(h,t){await flush();const r=await store.create(t||"Без названия",h||"");loaded=false;await openDoc(r.id)}
[ed,tr,$("#title")].forEach(e=>e.addEventListener("input",save));
(async()=>{await poll();if(!SERVER)toast("Автономный режим: перевод, ИИ и записи работают в браузере. Для Whisper на компьютере запустите start.bat");
  const d=await store.list();await openDoc(d.find(x=>x.id==cur)?cur:d.length?d[0].id:(await store.create("Без названия","")).id)})();
/* ===== импорт / экспорт ===== */
function need(u){return new Promise((ok,no)=>{const s=document.createElement("script");s.src=u;s.onload=ok;s.onerror=()=>no(new Error("не удалось загрузить библиотеку (нужен интернет)"));document.head.append(s)})}
function clean(h){const d=new DOMParser().parseFromString(h,"text/html");d.querySelectorAll("script,style,iframe,object,link,meta").forEach(e=>e.remove());d.body.querySelectorAll("*").forEach(e=>[...e.attributes].forEach(a=>{if(/^on/i.test(a.name)||/^\s*javascript:/i.test(a.value))e.removeAttribute(a.name)}));return d.body.innerHTML}
async function importFile(f){try{const n=f.name.replace(/\.[^.]+$/,""),x=f.name.split(".").pop().toLowerCase();let h;
  if(x=="docx"){await need("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");h=(await mammoth.convertToHtml({arrayBuffer:await f.arrayBuffer()})).value}
  else{const t=await f.text();h=x=="html"||x=="htm"?t:x=="md"?md(t):t.split(/\n+/).map(l=>"<p>"+l.replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</p>").join("")}
  await newDoc(clean(h),n);toast("Импортировано: "+f.name)}catch(e){toast("Импорт: "+e.message)}}
$("#file").onchange=()=>{if($("#file").files[0])importFile($("#file").files[0]);$("#file").value=""};
addEventListener("dragover",e=>e.preventDefault());addEventListener("drop",e=>{e.preventDefault();if(e.dataTransfer.files[0])importFile(e.dataTransfer.files[0])});
function toMd(n){let o="";n.childNodes.forEach(c=>{if(c.nodeType==3){o+=c.nodeValue;return}const t=c.tagName,k=toMd(c);
  o+=t=="H1"?"# "+k+"\n\n":/^H[2-6]$/.test(t)?"## "+k+"\n\n":/^(B|STRONG)$/.test(t)?"**"+k+"**":/^(I|EM)$/.test(t)?"*"+k+"*":t=="LI"?"- "+k+"\n":t=="TR"?"| "+[...c.children].map(x=>x.innerText.trim()).join(" | ")+" |\n"+(c.rowIndex==0?"|"+[...c.children].map(()=>"---").join("|")+"|\n":""):t=="BR"?"\n":/^(P|DIV|UL|OL|TABLE)$/.test(t)?k+"\n\n":k});return o}
function dl(n,d,t){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([d],{type:t}));a.download=n;a.click()}
const nm=()=>($("#title").value||"document").replace(/[\\/:*?"<>|]/g,"_"),wrapH=b=>"<html><head><meta charset=utf-8><title>"+nm()+"</title></head><body>"+b+"</body></html>";
const EXP={"Word (.doc)":()=>dl(nm()+".doc",wrapH(ed.innerHTML+(tr.innerText.trim()?"<hr>"+tr.innerHTML:"")),"application/msword"),"PDF (печать)":()=>print(),"Markdown":()=>dl(nm()+".md",toMd(ed),"text/plain"),"HTML":()=>dl(nm()+".html",wrapH(ed.innerHTML),"text/html"),"Текст":()=>dl(nm()+".txt",edText(),"text/plain"),"Бэкап всех документов (JSON)":()=>useSrv?location="/api/backup":dl("scribo-backup.json",JSON.stringify({docs:LD(),versions:LV()}),"application/json")};
/* ===== сервисные окна ===== */
const TPL=SCRIBO.templates;
async function versDlg(){const v=await store.vers(cur);show("<h3>История версий</h3>"+(v.length?v.map((x,i)=>`<div class=row data-i=${i}><b>${new Date(x.t*1e3).toLocaleString()}</b><span>${(x.src.replace(/<[^>]+>/g," ").slice(0,50)).replace(/</g,"&lt;")}</span><button>Вернуть</button></div>`).join(""):"Версии появятся после первых правок."));
  dlg.querySelectorAll("[data-i]").forEach(b=>b.onclick=async()=>{await flush(true);const x=v[+b.dataset.i];ed.innerHTML=setHtml(x.src);tr.innerHTML=setHtml(x.dst);save();dlg.close();toast("Версия восстановлена")})}
function dictDlg(){show('<h3>Словарь замен</h3><p>Одна строка — одна замена: <code>слово=как писать</code>. Для имён, терминов, сокращений.</p><textarea id="dt"></textarea><button id="ok">Сохранить</button>');$("#dt").value=LS.dict||"";$("#ok").onclick=()=>{LS.dict=$("#dt").value;dlg.close();toast("Сохранено")}}
function findDlg(){show('<h3>Найти и заменить</h3><input id="f1" placeholder="Найти"><input id="f2" placeholder="Заменить на"><button id="fn">Найти далее</button> <button id="fa">Заменить все</button>');
  $("#fn").onclick=()=>{ed.focus();if(!find($("#f1").value))toast("Не найдено")};$("#fa").onclick=()=>{toast("Замен: "+replaceText(ed,rx($("#f1").value),$("#f2").value));save()}}
async function polish(){try{await flush(true);toast("ИИ редактирует…");const r=await api("/polish",J("POST",{text:edText()}));ed.innerHTML=md(r.text);save();toast("Готово. Прежний текст — в истории версий")}catch(e){toast(e.message)}}
const theme=()=>{const n=document.documentElement.dataset.theme=="dark"?"light":"dark";document.documentElement.dataset.theme=n;LS.theme=n};
document.documentElement.dataset.theme=LS.theme||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
const focusMode=()=>document.body.classList.toggle("focus");
function help(){show(`<h3>Справка</h3><p>Нажмите кружок (Ctrl+Пробел) и говорите; фраза обрабатывается после паузы около секунды. Ctrl+K — все команды. Файлы .docx, .md, .txt, .html можно перетащить в окно.</p>
<p><b>Голосом:</b> «в 7, нет лучше в 8» → «в 8»; запятая, точка, вопросительный знак; новый абзац; заголовок …; пункт …; жирным … конец выделения; таблица … дальше … строка … конец таблицы; замени X на Y; удали последнее.</p>
<p>Если фразы не ловятся, в консоли браузера: <code>localStorage.th=8</code>. Документы и версии лежат в golos.db, ежедневные копии — в backups/. ИИ-перевод и «Улучшить текст» включаются через ANTHROPIC_API_KEY.</p>`)}
/* ===== палитра команд (Ctrl+K) ===== */
async function palette(){let d=[];try{d=(await store.list()).map(x=>["Открыть: "+x.title,()=>openDoc(x.id)])}catch(e){}const all=[...ACT.map(a=>[a[2],a[3]]),...d];let sel=0,list=all;
  show('<input id="q" placeholder="Команда или документ…" autocomplete="off"><div id="ls"></div>');
  const draw=()=>{$("#ls").innerHTML="";list.slice(0,12).forEach((c,i)=>{const r=document.createElement("div");r.className="row"+(i==sel?" sel":"");r.innerHTML="<span></span>";r.firstChild.textContent=c[0];r.onclick=()=>{dlg.close();c[1]()};$("#ls").append(r)})};draw();
  $("#q").oninput=()=>{const q=$("#q").value.toLowerCase();list=all.filter(c=>c[0].toLowerCase().includes(q));sel=0;draw()};
  $("#q").onkeydown=e=>{if(e.key=="ArrowDown"){sel=Math.min(sel+1,list.length-1);draw();e.preventDefault()}else if(e.key=="ArrowUp"){sel=Math.max(sel-1,0);draw();e.preventDefault()}else if(e.key=="Enter"&&list[sel]){dlg.close();list[sel][1]()}}}

addEventListener("keydown",e=>{if(e.ctrlKey&&e.code=="Space"){e.preventDefault();$("#mic").click()}else if(e.ctrlKey&&e.key=="k"){e.preventDefault();palette()}else if(e.ctrlKey&&e.key=="h"){e.preventDefault();findDlg()}else if(e.key=="Escape"&&document.body.classList.contains("focus"))focusMode()});

/* ===== логотип ===== */
const LOGO='<svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="9" fill="#4f46e5"/><rect x="12" y="6" width="8" height="13" rx="4" fill="#fff"/><path d="M8 15a8 8 0 0 0 16 0M16 23v4M12 27h8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
document.querySelectorAll(".lg").forEach(e=>e.innerHTML=LOGO);$("#fav").href="data:image/svg+xml,"+encodeURIComponent(LOGO.replace("<svg ",'<svg xmlns="http://www.w3.org/2000/svg" '));
/* ===== ИИ (Gemini, ключ вводит пользователь) ===== */
async function ai(p){const k=LS.gk;if(!k){aiSetup();throw new Error("Нужен ключ Gemini")}
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+(LS.gm||"gemini-2.5-flash")+":generateContent?key="+k,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:p}]}]})});
  const j=await r.json();if(!r.ok)throw new Error(j.error&&j.error.message||r.status);return j.candidates[0].content.parts.map(x=>x.text).join("").trim()}
function aiSetup(){show('<h3>Ключ Gemini (бесплатный)</h3><p>Получите ключ на <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a> и вставьте сюда. Он хранится только в вашем браузере. Если модель устарела, впишите актуальное название.</p><input id="gk" placeholder="API-ключ"><input id="gm" placeholder="Модель"><button id="ok">Сохранить</button>');
  $("#gk").value=LS.gk||"";$("#gm").value=LS.gm||"gemini-2.5-flash";$("#ok").onclick=()=>{LS.gk=$("#gk").value.trim();LS.gm=$("#gm").value.trim();dlg.close();toast("Сохранено")}}
const AIS=[["✨","Улучшить и оформить","Fix grammar and punctuation, improve clarity and structure the text with Markdown (## headings, - lists, tables where fitting). Keep meaning.","doc"],["✅","Сделать список дел","Turn the text into a clear to-do checklist grouped by topic, as Markdown - lists.","doc"],
 ["▦","Таблица из текста","Extract all structured data (items, quantities, prices, dates, amounts) into one Markdown table, add a totals row if numbers allow. Output only the table.","doc"],["≡","Краткое содержание","Summarize in 5 short bullet points.","add"],["✂","Упростить текст","Rewrite in simpler, shorter, plainer language.","doc"],
 ["✉","Оформить как письмо","Rewrite the notes as a polite professional email with a subject line and greeting.","doc"],["🌍","Точный перевод (ИИ)","","tr"],["💡","Написать по теме…","Write a well-structured document in Markdown about the topic given.","ask"]];
async function aiRun([,n,inst,mode]){const s=getSelection(),hs=s.rangeCount&&!s.isCollapsed&&ed.contains(s.anchorNode),rg=hs?s.getRangeAt(0).cloneRange():null;let txt=hs?s.toString():edText();
  try{if(mode=="ask"){txt=prompt("Тема или задание:");if(!txt)return}toast("ИИ работает: "+n+"…");
    if(mode=="tr"){const r=await ai("Translate into "+$("#to").selectedOptions[0].text+". Keep Markdown. Output only the translation.\n\n"+toMd(ed));tr.innerHTML=md(r);if(side.hidden)toggleSide();save();return toast("Готово")}
    const r=await ai(inst+"\nAnswer in the same language as the input unless told otherwise. Output only Markdown, no commentary.\n\n"+txt);await flush(true);
    if(mode=="doc"){if(rg){const q=getSelection();q.removeAllRanges();q.addRange(rg);ed.focus();document.execCommand("insertHTML",false,md(r))}else ed.innerHTML=md(r)}else put(ed,"\n\n"+(mode=="add"?"## Кратко\n":"")+r);
    save();toast("Готово")}catch(e){toast("ИИ: "+e.message)}}
/* ===== разговор (режим «рация») ===== */
function talkUI(){const f=$("#from").value=="auto"?"ru-RU":$("#from").value,t=$("#to").value,N=c=>LANGS.find(l=>l[0]==c)[1],c=$("#dc");
  c.innerHTML='<p class="hint">Переводчик для живого разговора. Нажмите, кто говорит сейчас: фраза переведётся, прозвучит вслух и появится в чате. Для чистого звука используйте наушники.</p>';
  [["🎤 Говорю я: "+N(f),f,t],["🎧 Говорит собеседник: "+N(t),t,f]].forEach(([n,a,b])=>{const x=document.createElement("button");x.className="it big";x.textContent=n;x.onclick=()=>startConv(a,b);c.append(x)});
  const e=document.createElement("button");e.className="it";e.textContent="■ Завершить разговор";e.onclick=endConv;c.append(e)}
function startConv(a,b){stopMic();conv={from:a,to:b};$("#chat").hidden=false;tr.hidden=true;if(side.hidden)toggleSide();document.body.classList.remove("dr");speechSynthesis.cancel();startMic()}
function endConv(){stopMic();conv=null;$("#chat").hidden=true;tr.hidden=false}
async function convSay(raw){const{from:a,to:b}=conv;let t=raw;try{t=await g1(raw,GC(a.slice(0,2)),GC(b.slice(0,2)))}catch(e){toast("Перевод: "+e.message)}
  const d=document.createElement("div");d.className="bub "+(a==$("#from").value?"me":"he");d.innerHTML="<small></small><p></p>";d.firstChild.textContent=raw;d.lastChild.textContent=t;$("#chat").append(d);$("#chat").scrollTop=1e9;
  stopMic();const u=new SpeechSynthesisUtterance(t);u.lang=b;speechSynthesis.speak(u)}
/* ===== таблицы и автоматизация ===== */
const num=s=>parseFloat(String(s).replace(/[\s\u00a0\u202f]/g,"").replace(",",".")),fmt=n=>n.toLocaleString("ru-RU",{minimumFractionDigits:2,maximumFractionDigits:2});
const cell=()=>{const n=getSelection().anchorNode;return n&&ed.contains(n)?(n.nodeType==1?n:n.parentElement).closest("td,th"):null};
function caret(){ed.focus();if(lastR&&ed.contains(lastR.startContainer)){const q=getSelection();q.removeAllRanges();q.addRange(lastR)}}
function calc(t){const rs=[...t.rows].slice(1),tot=rs.find(r=>r.hasAttribute("data-total")),b=rs.filter(r=>r!==tot);let sum=0;
  b.forEach(r=>{const c=r.cells;if(t.dataset.calc=="inv"&&c.length>3){const q=num(c[1].textContent),p=num(c[2].textContent);if(!isNaN(q)&&!isNaN(p))c[3].textContent=fmt(q*p)}sum+=num(c[c.length-1].textContent)||0});
  if(tot)tot.cells[tot.cells.length-1].innerHTML="<b>"+fmt(sum)+"</b>"}
ed.addEventListener("input",()=>{const n=getSelection().anchorNode,t=n&&(n.nodeType==1?n:n.parentElement).closest("table[data-calc]");if(t&&ed.contains(t))calc(t)});
function tbl(k){const P={inv:["Наименование","Кол-во","Цена","Сумма"],exp:["Дата","Категория","Описание","Сумма"],plan:["Задача","Кто","Срок","Статус"]};let h=P[k],n=5,tot=k!="plan"&&k!="blank";
  if(k=="blank"){const r=+prompt("Строк:",4),q=+prompt("Столбцов:",3);if(!r||!q)return;h=Array(q).fill("Колонка");n=r}
  const row=(t,c)=>"<tr>"+c.map(x=>`<${t}>${x||"<br>"}</${t}>`).join("")+"</tr>";
  caret();document.execCommand("insertHTML",false,"<table"+(tot?' data-calc="'+k+'"':"")+">"+row("th",h)+Array(n).fill(row("td",h.map(()=>""))).join("")+(tot?"<tr data-total>"+h.map((_,i)=>i==0?"<td><b>Итого</b></td>":i==h.length-1?"<td><b>0,00</b></td>":"<td><br></td>").join("")+"</tr>":"")+"</table><p><br></p>");save()}
function addRow(){const c=cell();if(!c)return toast("Поставьте курсор в ячейку таблицы");const r=c.parentElement,n=r.cloneNode(true);n.removeAttribute("data-total");[...n.cells].forEach(x=>x.innerHTML="<br>");r.hasAttribute("data-total")?r.before(n):r.after(n);save()}
function addCol(){const c=cell();if(!c)return toast("Поставьте курсор в ячейку таблицы");const i=c.cellIndex;[...c.closest("table").rows].forEach(r=>{const x=document.createElement(r.cells[i].tagName);x.innerHTML="<br>";r.cells[i].after(x)});save()}
function sumRow(){const c=cell(),t=c?c.closest("table"):[...ed.querySelectorAll("table")].pop();if(!t)return toast("В документе нет таблицы");const R=[...t.rows],row=t.insertRow(-1);
  for(let i=0;i<R[0].cells.length;i++){const v=R.slice(1).map(r=>r.cells[i]?num(r.cells[i].textContent):NaN).filter(x=>!isNaN(x)),x=row.insertCell();x.innerHTML=i&&v.length>=R.length/2?"<b>"+fmt(v.reduce((a,b)=>a+b,0))+"</b>":i?"<br>":"<b>Итого</b>"}save()}
ed.addEventListener("paste",e=>{const t=e.clipboardData.getData("text/plain");if(t.includes("\t")&&t.includes("\n")){e.preventDefault();const R=t.trim().split(/\r?\n/).map(r=>r.split("\t")),E=x=>x.replace(/&/g,"&amp;").replace(/</g,"&lt;");
  document.execCommand("insertHTML",false,"<table>"+R.map((r,i)=>"<tr>"+r.map(c=>`<${i?"td":"th"}>${E(c)||"<br>"}</${i?"td":"th"}>`).join("")+"</tr>").join("")+"</table><p><br></p>");save()}});
/* ===== выдвижная панель ===== */
function engDlg(){show('<h3>Движок распознавания</h3><div id="eg"></div><p class="hint">В Opera GX нет встроенного распознавания — там работает Whisper (в браузере или через start.bat).</p>');
  [["auto","Авто (лучший доступный)"],["server","Whisper на компьютере (нужен start.bat)"],["wasm","Whisper в браузере (скачает модель ~80 МБ)"],["chrome","Встроенный (Chrome / Edge)"]].forEach(([v,n])=>{const b=document.createElement("button");b.className="it";b.textContent=((LS.eng||"auto")==v?"✓ ":"")+n;b.onclick=()=>{LS.eng=v;dlg.close();toast("Движок: "+n)};$("#eg").append(b)})}
const ACT=[["docs","＋","Новый документ",()=>newDoc()],["docs","⇪","Импорт файла (.docx .md .txt .html)",()=>$("#file").click()],
 ...Object.entries(TPL).map(([k,[i,t]])=>["new",i,k,()=>newDoc(md(t),k)]),
 ["tab","🧾","Счёт / смета (авторасчёт)",()=>tbl("inv")],["tab","💸","Расходы с итогом",()=>tbl("exp")],["tab","📅","План / табель",()=>tbl("plan")],["tab","▦","Пустая таблица…",()=>tbl("blank")],["tab","➕","Добавить строку",addRow],["tab","⫴","Добавить столбец",addCol],["tab","Σ","Итоги по колонкам",sumRow],["tab","🗑","Удалить таблицу",()=>{const c=cell();if(c){c.closest("table").remove();save()}}],
 ...AIS.map(a=>["ai",a[0],a[1],()=>aiRun(a)]),
 ...Object.entries(EXP).map(([k,f])=>["file","⇩",k,f]),["file","📋","Копировать текст",()=>navigator.clipboard.writeText(edText())],
 ["set","🌓","Тема",theme],["set","🎯","Режим фокуса (Esc — выход)",focusMode],["set","🔊","Озвучивать переводы",toggleSpk],["set","🎙","Движок речи…",engDlg],["set","📖","Словарь замен",dictDlg],["set","🔎","Найти и заменить",findDlg],["set","🕘","История версий",versDlg],["set","📊","Анализ текста",analyze],["set","🔑","Ключ Gemini (ИИ)",aiSetup],["set","❓","Справка",help]];
const TABS=[["docs","📄","Документы"],["new","✦","Создать"],["tab","▦","Таблицы"],["ai","✨","ИИ"],["talk","💬","Разговор"],["file","⇩","Файл"],["set","⚙","Ещё"]],closeDr=()=>document.body.classList.remove("dr");
async function renderDocs(){const d=await store.list(),c=$("#dc");c.innerHTML="";
  ACT.filter(a=>a[0]=="docs").forEach(a=>{const b=document.createElement("button");b.className="it";b.textContent=a[1]+"  "+a[2];b.onclick=()=>{closeDr();a[3]()};c.append(b)});
  d.forEach(x=>{const r=document.createElement("div");r.className="row"+(x.id==cur?" sel":"");r.innerHTML="<span></span><button title='Удалить'>🗑</button>";r.firstChild.textContent=x.title;r.onclick=async()=>{closeDr();await openDoc(x.id)};
    r.lastChild.onclick=async e=>{e.stopPropagation();if(!confirm("Удалить «"+x.title+"»?"))return;await store.del(x.id);if(x.id==cur){loaded=false;const l=await store.list();await openDoc(l.length?l[0].id:(await store.create("Без названия","")).id)}renderDocs()};c.append(r)})}
function drawTab(k){LS.tab=k;[...$("#dt").children].forEach(b=>b.setAttribute("aria-pressed",b.dataset.k==k));const c=$("#dc");if(k=="docs")return renderDocs();if(k=="talk")return talkUI();c.innerHTML="";
  ACT.filter(a=>a[0]==k).forEach(a=>{const b=document.createElement("button");b.className="it";b.innerHTML="<em></em><span></span>";b.children[0].textContent=a[1];b.children[1].textContent=a[2];b.onmousedown=e=>e.preventDefault();b.onclick=()=>{closeDr();a[3]()};c.append(b)})}
TABS.forEach(([k,i,n])=>{const b=document.createElement("button");b.dataset.k=k;b.title=n;b.textContent=i;b.onclick=()=>drawTab(k);$("#dt").append(b)});
$("#burger").onclick=()=>{document.body.classList.toggle("dr");drawTab(LS.tab||"docs")};$("#scrim").onclick=closeDr;
