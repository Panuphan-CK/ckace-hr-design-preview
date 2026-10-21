(function installHeroLayoutV2(){
'use strict';
var STORE='ckace.dashboard.hero.layout.v2';
var HAND='<span class="hero-drag-handle" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 11V7.8a1.5 1.5 0 0 1 3 0V11 5.8a1.5 1.5 0 0 1 3 0V11 6.8a1.5 1.5 0 0 1 3 0V11 8.3a1.5 1.5 0 0 1 3 0v5.9c0 4.2-2.7 6.8-6.8 6.8h-1.1c-2.3 0-4.1-.9-5.4-2.7L3.7 15a1.7 1.7 0 0 1 2.6-2.1l1.2 1.3V11Z"/><path d="M7.5 14.2V11"/></svg></span>';
function hero(){return document.querySelector('.dashboard-v2 .dashboard-hero-v2');}
function core(h){return h&&h.querySelector('.dashboard-orb .orb-core');}
function floats(h){return h?Array.prototype.slice.call(h.querySelectorAll('.dashboard-orb .orb-float')):[];}
function nodes(h){var c=core(h);return (c?[c]:[]).concat(floats(h));}
function key(n){
 if(!n)return '';
 if(n.classList.contains('orb-core'))return 'core';
 var m=(n.className||'').match(/orb-float-([a-i])(?:\s|$)/);
 return m?m[1]:'';
}
function read(n,a){
 var v=parseFloat(n.style.getPropertyValue('--orbit-'+a));
 if(isFinite(v))return v;
 v=parseFloat(getComputedStyle(n).getPropertyValue('--orbit-'+a));
 return isFinite(v)?v:0;
}
function pos(n,x,y){
 if(!n||!isFinite(x)||!isFinite(y))return;
 n.style.setProperty('--orbit-x',Math.round(x)+'px','important');
 n.style.setProperty('--orbit-y',Math.round(y)+'px','important');
}
function select(h,k){
 nodes(h).forEach(function(n){var on=key(n)===k;n.classList.toggle('is-layout-selected',on);n.setAttribute('aria-current',on?'true':'false');});
 h.querySelectorAll('[data-hero-layout-select]').forEach(function(b){var on=b.dataset.heroLayoutSelect===k;b.classList.toggle('is-selected',on);b.setAttribute('aria-pressed',on?'true':'false');});
}
function placeHand(h){
 var c=core(h);if(!c)return;
 var hr=h.getBoundingClientRect(),r=c.getBoundingClientRect();
 c.classList.toggle('hero-handle-inset-top',r.top-hr.top<22);
 c.classList.toggle('hero-handle-inset-right',hr.right-r.right<22);
}
function installCore(h){
 var o=h.querySelector('.dashboard-orb'),c=core(h);if(!o||!c)return;
 c.dataset.heroLayoutKey='core';
 if(!c.querySelector('.hero-drag-handle'))c.insertAdjacentHTML('afterbegin',HAND);
 if(c.dataset.heroCoreDragReady==='true')return;
 c.dataset.heroCoreDragReady='true';
 c.addEventListener('pointerdown',function(e){
   if(!h.classList.contains('hero-layout-editor')||e.button!==0)return;
   e.preventDefault();e.stopPropagation();select(h,'core');c.__pid=e.pointerId;c.classList.add('is-dragging');
   try{c.setPointerCapture(e.pointerId);}catch(_){}
 });
 c.addEventListener('pointermove',function(e){
   if(!h.classList.contains('hero-layout-editor')||c.__pid!==e.pointerId)return;
   var or=o.getBoundingClientRect(),hr=h.getBoundingClientRect(),r=c.getBoundingClientRect(),hw=r.width/2,hh=r.height/2;
   var x=Math.max(hr.left+hw+12,Math.min(hr.right-hw-12,e.clientX));
   var y=Math.max(hr.top+hh+12,Math.min(hr.bottom-hh-12,e.clientY));
   pos(c,x-(or.left+or.width/2),y-(or.top+or.height/2));placeHand(h);
 });
 function finish(e){if(c.__pid!==e.pointerId)return;c.__pid=null;c.classList.remove('is-dragging');try{c.releasePointerCapture(e.pointerId);}catch(_){}}
 c.addEventListener('pointerup',finish);c.addEventListener('pointercancel',finish);c.addEventListener('lostpointercapture',finish);
 c.addEventListener('focus',function(){if(h.classList.contains('hero-layout-editor'))select(h,'core');});
 c.addEventListener('click',function(){if(h.classList.contains('hero-layout-editor'))select(h,'core');});
 c.addEventListener('keydown',function(e){
   if(!h.classList.contains('hero-layout-editor'))return;
   var s=e.shiftKey?12:4,dx=0,dy=0;
   if(e.key==='ArrowLeft')dx=-s;if(e.key==='ArrowRight')dx=s;if(e.key==='ArrowUp')dy=-s;if(e.key==='ArrowDown')dy=s;
   if(!dx&&!dy)return;e.preventDefault();pos(c,read(c,'x')+dx,read(c,'y')+dy);placeHand(h);
 });
}
function sync(h){
 var c=core(h);if(!c)return;var on=h.classList.contains('hero-layout-editor');
 if(on){c.tabIndex=0;c.setAttribute('role','button');c.setAttribute('aria-label','ความพร้อมทีม 92% · ลากเพื่อจัดตำแหน่ง');}
 else{c.removeAttribute('tabindex');c.removeAttribute('role');c.removeAttribute('aria-label');c.classList.remove('is-dragging','is-layout-selected');}
 placeHand(h);
}
function enhancePanel(h){
 var p=h.querySelector('.hero-layout-panel');if(!p)return;
 var hd=p.querySelector('.hero-layout-panel__header');if(hd){var s=hd.querySelector('strong'),n=hd.querySelector('span');if(s)s.textContent='จัดตำแหน่ง Hero';if(n)n.textContent='10 / 10 จุด';}
 var help=p.querySelector('.hero-layout-panel__help');if(help)help.textContent='ลากได้ครบ 10 จุด · ลูกศร = 4px · Shift = 12px';
 var pick=p.querySelector('.hero-layout-picker');
 if(pick&&!pick.querySelector('[data-hero-layout-select="core"]')){
   var b=document.createElement('button');b.type='button';b.className='hero-layout-picker__button';b.dataset.heroLayoutSelect='core';b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','ความพร้อมทีม 92% · เลือกเพื่อจัดตำแหน่ง');
   b.innerHTML='<span class="hero-layout-picker__key">CORE</span><span class="hero-layout-picker__copy"><b>ความพร้อมทีม</b><small>92%</small></span>';
   b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();select(h,'core');core(h).focus({preventScroll:true});});
   pick.prepend(b);
 }
}
function applySaved(h){
 var raw=null;try{raw=localStorage.getItem(STORE);}catch(_){}
 if(!raw){
   try{localStorage.removeItem('ckace.dashboard.hero.layout.v1');}catch(_){}
   nodes(h).forEach(function(n){n.style.removeProperty('--orbit-x');n.style.removeProperty('--orbit-y');});
   return;
 }
 try{var data=JSON.parse(raw);nodes(h).forEach(function(n){var p=data.positions&&data.positions[key(n)];if(p)pos(n,Number(p.x),Number(p.y));});}catch(_){}
}
function save(h){
 var p={};nodes(h).forEach(function(n){p[key(n)]={x:read(n,'x'),y:read(n,'y')};});
 try{localStorage.setItem(STORE,JSON.stringify({version:2,positions:p}));}catch(_){}
}
function reset(h){
 try{localStorage.removeItem(STORE);localStorage.removeItem('ckace.dashboard.hero.layout.v1');}catch(_){}
 nodes(h).forEach(function(n){n.style.removeProperty('--orbit-x');n.style.removeProperty('--orbit-y');});
}
function install(h){
 if(!h)return;installCore(h);sync(h);enhancePanel(h);applySaved(h);
 var tools=h.querySelector('[data-hero-layout-tools]');
 if(tools&&tools.dataset.heroV2!=='true'){
   tools.dataset.heroV2='true';
   tools.addEventListener('click',function(e){
     var b=e.target.closest('[data-hero-layout]');if(!b)return;
     if(b.dataset.heroLayout==='save')save(h);
     if(b.dataset.heroLayout==='reset')reset(h);
     setTimeout(function(){sync(h);enhancePanel(h);},0);
   },true);
 }
 if(h.dataset.heroV2Select!=='true'){
   h.dataset.heroV2Select='true';
   h.addEventListener('click',function(e){if(!h.classList.contains('hero-layout-editor'))return;var n=e.target.closest('.orb-core,.orb-float');if(n)select(h,key(n));});
   h.addEventListener('focusin',function(e){if(!h.classList.contains('hero-layout-editor'))return;var n=e.target.closest('.orb-core,.orb-float');if(n)select(h,key(n));});
 }
 if(!h.__v2obs&&window.MutationObserver){
   var ob=new MutationObserver(function(){sync(h);enhancePanel(h);});ob.observe(h,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});h.__v2obs=ob;
 }
}
function boot(){install(hero());var m=document.getElementById('main');if(m&&!m.__v2obs&&window.MutationObserver){var ob=new MutationObserver(function(){install(hero());});ob.observe(m,{childList:true,subtree:true});m.__v2obs=ob;}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('hashchange',function(){setTimeout(boot,0);});
})();