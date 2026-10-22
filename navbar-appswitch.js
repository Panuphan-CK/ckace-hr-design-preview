(function(){'use strict';
const toggle=document.querySelector('[data-action="app-switch"]'),panel=document.getElementById('ck-app-panel');
if(!toggle||!panel)return;
function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');}
toggle.addEventListener('click',e=>{e.stopPropagation();const show=panel.hidden;panel.hidden=!show;toggle.setAttribute('aria-expanded',String(show));});
document.addEventListener('click',e=>{if(!e.target.closest('.ck-app-switch'))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
panel.querySelectorAll('[data-app]').forEach(btn=>btn.addEventListener('click',()=>{
const app=btn.dataset.app;
if(app==='hr'){close();if(typeof navigate==='function')navigate('dashboard');return;}
close();
if(typeof notify==='function')notify('แอป '+(app==='accounting'?'สำนักงานบัญชี':'สำนักงานตรวจสอบ')+' ยังไม่ได้กำหนด URL ปลายทาง · ไม่เปิดเว็บไซต์ที่ไม่ยืนยัน');
}));
})();