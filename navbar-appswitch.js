(function(){'use strict';
const controls=[['app-switch','ck-app-panel'],['notifications','ck-notices'],['profile','ck-profile-panel']].map(([action,id])=>({button:document.querySelector('[data-action="'+action+'"]'),panel:document.getElementById(id)})).filter(x=>x.button&&x.panel);
function closeAll(except){controls.forEach(x=>{if(x!==except){x.panel.hidden=true;x.button.setAttribute('aria-expanded','false');}});}
controls.forEach(x=>x.button.addEventListener('click',e=>{e.stopPropagation();let opening=x.panel.hidden;closeAll(x);x.panel.hidden=!opening;x.button.setAttribute('aria-expanded',String(opening));}));
document.addEventListener('click',e=>{if(!e.target.closest('.ck-app-switch,.ck-menu-anchor'))closeAll();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAll();}});
const app=document.getElementById('ck-app-panel');
app?.querySelectorAll('[data-app]').forEach(btn=>btn.addEventListener('click',()=>{
closeAll();if(btn.dataset.app==='hr'){if(typeof navigate==='function')navigate('dashboard');return;}
if(typeof notify==='function')notify('ยังไม่ได้กำหนดปลายทางของแอปนี้ ไม่สามารถเปิดแอปอื่นโดยเดาที่อยู่ได้');
}));
/* The static design preview has no authenticated Production session.
   Do not substitute fictional employee details or claims for real account data.
   For future backend integration, the host may provide a verified profile
   only via CKACE_AUTHENTICATED_PROFILE in the same secured origin. */
function setProfile(p){if(!p||typeof p!=='object'||!p.verified||!p.uid||!p.fullname)return;
const name=document.getElementById('ck-profile-name'),avatar=document.getElementById('ck-profile-avatar'),details=document.getElementById('ck-profile-details');
if(name)name.textContent=String(p.fullname);
if(avatar)avatar.textContent=String(p.nickname||p.fullname).trim().charAt(0);
if(details){details.replaceChildren();[['ชื่อ–นามสกุล',p.fullname],['ชื่อเล่น',p.nickname],['รหัสพนักงาน',p.employeeCode],['แผนก',p.department],['หน่วยงาน',p.agency],['บทบาท',p.role]].forEach(([label,value])=>{if(value===undefined||value===null||value==='')return;const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);row.append(dt,dd);details.append(row);});}
const note=document.querySelector('.ck-disconnected');if(note)note.hidden=true;
}
if(window.CKACE_AUTHENTICATED_PROFILE)setProfile(window.CKACE_AUTHENTICATED_PROFILE);
const noticeItems=document.getElementById('ck-notice-items'),badge=document.querySelector('.ck-notice-count');
const supplied=window.CKACE_AUTHENTICATED_NOTIFICATIONS;
if(Array.isArray(supplied)&&noticeItems){noticeItems.replaceChildren();const list=document.createElement('div');list.className='ck-notice-list';supplied.forEach(item=>{if(!item||!item.title)return;const row=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');h.textContent=String(item.title);p.textContent=String(item.message||'');row.append(h,p);list.append(row);});if(list.children.length){noticeItems.append(list);if(badge){badge.hidden=false;badge.textContent=String(supplied.length);}}else{noticeItems.textContent='ไม่มีการแจ้งเตือน';}}
})();