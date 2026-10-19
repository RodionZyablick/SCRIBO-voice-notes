/* Интерфейс на uk/en: переводит видимые строки (ключи — русские) на лету. Русский — без изменений. */
(()=>{const U=LS.ui||"ru";if(U=="ru")return;const i=U=="uk"?1:2,D={};SCRIBO.i18n.rows.forEach(r=>D[r[0]]=r[i]);
const PF=Object.keys(D).filter(k=>/[: ]$/.test(k)),SK="#ed,#tr,#chat,#chips button,script,style",W=U=="uk"?["слів","хв читання"]:["words","min read"],A=["title","placeholder","data-ph","aria-label"];
const t=s=>{const k=s.trim();if(!k)return s;let r=s;if(D[k])r=s.replace(k,D[k]);else for(const p of PF)if(k.startsWith(p)){r=s.replace(p,D[p]);break}
 return r.replace(/(\d) слов/,"$1 "+W[0]).replace("мин чтения",W[1])};
function walk(n){if(n.nodeType==3){if(!n.parentElement||n.parentElement.closest(SK))return;const v=t(n.nodeValue);if(v!=n.nodeValue)n.nodeValue=v;return}
 if(n.nodeType!=1)return;A.forEach(a=>{const o=n.getAttribute(a);if(o){const v=t(o);if(v!=o)n.setAttribute(a,v)}});n.childNodes.forEach(walk)}
walk(document.body);new MutationObserver(ms=>ms.forEach(m=>m.type=="childList"?m.addedNodes.forEach(walk):walk(m.target))).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:A});
})();
