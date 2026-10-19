/* Скрибо · settings.js — первая настройка, виды интерфейса, умная пунктуация */
(()=>{const root=document.documentElement,UI=LS.ui||"ru";root.lang=UI;root.dataset.big=LS.big||"0";
function mode(m,swap){root.dataset.mode=m;if(m=="min"&&!side.hidden)toggleSide();else if(swap&&m!="min"&&side.hidden)toggleSide()}mode(LS.mode||"std");
$("#top .sp").before(Object.assign(document.createElement("button"),{id:"aa",title:"Форматирование",textContent:"Aa ▾",onclick:()=>document.body.classList.toggle("tbo")}));
$("#trt").after(Object.assign(document.createElement("button"),{id:"gear",title:"Настройки",textContent:"⚙",onclick:()=>settings()}));
function settings(first){const L=[["ru","Русский"],["uk","Українська"],["en","English"]],lg=LANGS.map(l=>[l[0],l[1]]),
 sel=(id,o,v)=>'<select id="'+id+'">'+o.map(x=>'<option value="'+x[0]+'"'+(x[0]==v?" selected":"")+">"+x[1]+"</option>").join("")+"</select>",lb=t=>"<label>"+t+"</label>";
 LS.wiz=1;show("<h3>"+(first?"Первая настройка":"Настройки")+'</h3><div class="sg">'+lb("Язык интерфейса")+sel("sUi",L,UI)+lb("Вид интерфейса")+sel("sMd",[["min","Минимальный: только текст"],["std","Стандартный"],["wide","Широкий"]],LS.mode||"std")
 +lb("Тема")+sel("sTh",[["auto","Авто"],["light","Светлая"],["dark","Тёмная"]],LS.theme||"auto")+lb("Говорю на")+sel("sFr",[["auto","Авто-определение"],...lg],$("#from").value)+lb("Переводить на")+sel("sTo",lg,$("#to").value)
 +lb("Пауза до обработки фразы")+sel("sPs",[["600","Быстро (0,6 с)"],["800","Обычно (0,8 с)"],["1200","Спокойно (1,2 с)"]],LS.pause||"800")+lb("Новый абзац после паузы")+sel("sIl",[["1500","1,5 с"],["2200","2,2 с"],["4000","4 с"]],LS.idle||"2200")+lb("Распознавание речи")+sel("sEn",[["auto","Авто"],["wasm","Whisper в браузере (ставит знаки сам)"],["server","Whisper на компьютере (start.bat)"],["chrome","Встроенное Chrome/Edge (без знаков)"]],LS.eng||"auto")+lb("Ключ ИИ (Gemini или Claude)")+'<input id="sKey" type="password" placeholder="AIza… / sk-ant-…" value="'+(LS.gk||"")+'">'+'<label class="ck"><input type="checkbox" id="sBig"'+(LS.big=="1"?" checked":"")+'> Крупный интерфейс</label>'+'<label class="ck"><input type="checkbox" id="sSm"'+(LS.smart=="0"?"":" checked")+"> Умная пунктуация и структура (ИИ)</label></div><p><button id=\"sOk\">"+(first?"Поехали":"Сохранить")+"</button></p>");
 $("#sOk").onclick=()=>{const v=i=>$("#"+i).value;LS.mode=v("sMd");if(v("sTh")=="auto")delete LS.theme;else LS.theme=v("sTh");root.dataset.theme=LS.theme||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
  LS.vf=$("#from").value=v("sFr");LS.vt=$("#to").value=v("sTo");LS.pause=v("sPs");LS.idle=v("sIl");LS.eng=v("sEn");if(v("sKey").trim())LS.gk=v("sKey").trim();else delete LS.gk;LS.big=$("#sBig").checked?"1":"0";root.dataset.big=LS.big;LS.smart=$("#sSm").checked?"1":"0";mode(LS.mode,1);dlg.close();if(v("sUi")!=UI){LS.ui=v("sUi");if(UI!="ru")LS.seen=1;location.reload()}else{LS.ui=UI;if(first&&UI=="ru")window.tour()}}}
ACT.push(["set","⚙","Настройки…",()=>settings()]);
/* умная пунктуация: правила офлайн + ИИ по контексту, если есть ключ */
const base=process,INTRO=/(^|[.!?]\s)(Конечно|Например|Кстати|Однако|Наверное|Возможно|Вообще|Короче|К сожалению|К счастью|Во-первых|Во-вторых|В общем|Итак|Значит|Привет|Здравствуйте|Спасибо|Hello|Hi|Well|Actually|However|Thanks)(\s)(?=\S)/g;
const rules=c=>c.replace(INTRO,"$1$2,$3").replace(/(\S)(\s)(а|зато|хотя|поэтому|однако|but|although)(\s)/gi,(m,a,s,w,e)=>/[,.!?;:]$/.test(a)?m:a+","+s+w+e).replace(/(^|\n)(Ура|Круто|Отлично|Класс|Браво|Wow)([.]?)$/gm,"$1$2!");
const QR=/^(?:(?:а|и|ну|так|слушай|скажи|подскажи),?\s+)?(?:кто|что|где|когда|почему|зачем|как|какой|какая|какое|какие|сколько|куда|откуда|чей|разве|неужели|можно ли|есть ли|будешь|будете|хочешь|хотите|можешь|можете|умеешь|знаешь|знаете|поможешь|поможете|придёшь|придёте|успеешь|успеем|получится)(?:\s|$)/i,QT=/\s(правда|не так ли|так ли)\.$/i;
const q=c=>c.split("\n").map(l=>/\.$/.test(l)&&(QR.test(l.replace(/^[-#\s]+/,""))||QT.test(l))?l.slice(0,-1)+"?":l).join("\n");
window.process=async(raw,lang)=>q(rules(base(raw,lang)));
if(!LS.wiz)setTimeout(()=>settings(1),500);else if(!LS.seen)setTimeout(()=>window.tour(),800);
})();
