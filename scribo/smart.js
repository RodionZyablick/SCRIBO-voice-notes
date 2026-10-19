/* Умный диктант: пауза → новый абзац; ключ ИИ → знаки, абзацы и ослышки правятся по смыслу */
(()=>{const ai0=window.ai;
window.ai=async p=>{const k=LS.gk||"";if(!k.startsWith("sk-ant"))return ai0(p);
 const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","x-api-key":k,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},body:JSON.stringify({model:/^claude/.test(LS.gm||"")?LS.gm:"claude-haiku-5-5",max_tokens:2000,messages:[{role:"user",content:p}]})});
 const j=await r.json();if(!r.ok)throw new Error(j.error&&j.error.message||r.status);return j.content.map(x=>x.text||"").join("").trim()};
const hasAI=()=>!!LS.gk||(useSrv&&ST.ai);
const smart=async(raw,ctx)=>{const p="You clean up speech-to-text dictation. Fix punctuation by meaning and intonation (commas, periods, ? ! — :), capitalization, and obvious mishearings using context (e.g. Russian «в 8 лет» → «в 8 или» when that makes sense). Split into short paragraphs by topic; use '- ' lists for enumerations of tasks or items; '## ' only for an obvious title. Keep the speaker's wording, language and meaning; add nothing; drop stutters and fillers. Text before (context, do not repeat): «"+ctx+"». Dictated text: «"+raw+"». Output only the result.";
 return LS.gk?ai(p):(await api("/smart",J("POST",{prompt:p}))).text};
const frag=h=>document.createRange().createContextualFragment(h);
let blk=0,tm,dict=0,warned=0,gen=0,bP=null,n0=0,bCell=0;const op=put,h0=window.handle;
window.handle=async r=>{dict=1;try{return await h0(r)}finally{dict=0}};
window.put=(el,c)=>{const on=el===ed&&dict&&LS.smart!="0";if(on&&!blk)begin();const r=op(el,c);if(on){if(!bP)bP=blockOf();gen++;clearTimeout(tm);tm=setTimeout(done,+LS.idle||2200)}return r};
function begin(){caret();const n=getSelection().anchorNode,cell=n&&(n.nodeType==1?n:n.parentElement).closest("li,td,th");bCell=!!cell;
 if(ed.textContent.trim()&&!cell){document.execCommand("insertParagraph");const s=getSelection();if(s.rangeCount)lastR=s.getRangeAt(0).cloneRange()}
 blk=1;bP=null;n0=tr.childNodes.length}
function blockOf(){let n=getSelection().anchorNode;n=n&&(n.nodeType==1?n:n.parentElement);while(n&&n!==ed&&n.parentElement!==ed)n=n.parentElement;return n&&n!==ed?n:null}
async function done(){const g=gen;await Q;if(g!==gen)return;blk=0;const P=bP&&bP.isConnected?bP:null,nodes=[...tr.childNodes].slice(n0),el=P||(!ed.children.length&&ed.textContent.trim()?ed:null);bP=null;
 if(!el||bCell||LS.smart=="0")return;const raw=el.innerText.trim();if(raw.split(/\s+/).length<4)return;
 if(!hasAI()){if(!warned){warned=1;toast("Совет: ключ ИИ в ⚙ Настройки — и знаки с абзацами расставятся по смыслу")}return}
 live("✨ Расставляю знаки и абзацы…");
 try{const ctx=(P&&P.previousElementSibling?P.previousElementSibling.innerText:"").slice(-300),r=await smart(raw,ctx);
  if(r&&r.trim()&&el.isConnected&&el.innerText.trim()==raw){await flush(true);const h=md(r);if(el===ed)ed.innerHTML=h;else el.replaceWith(frag(h));
   if(nodes.length&&nodes[0].isConnected&&!side.hidden&&sl()!=tl()){const t=await trBlock(r);nodes[0].before(frag(md(t)));nodes.forEach(x=>x.remove())}save()}}
 catch(e){toast("ИИ: "+e.message)}finally{live()}}
})();
