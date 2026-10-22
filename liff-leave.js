(function(){
  const policies={
    vacation:{en:'VACATION',th:'ลาพักร้อน',remain:12,icon:'🏖️'},
    sick:{en:'SICK LEAVE',th:'ลาป่วย',remain:4,icon:'✚'},
    personal:{en:'PERSONAL',th:'ลากิจ',remain:2,icon:'💼'}
  };
  let type='vacation';
  let duration='F';

  function fillTimes(){
    const a=document.getElementById('liffStartTime');
    const b=document.getElementById('liffEndTime');
    if(!a||!b)return;
    const values=[];
    for(let m=9*60;m<=17*60+30;m+=15){
      const h=String(Math.floor(m/60)).padStart(2,'0');
      const mm=String(m%60).padStart(2,'0');
      values.push(h+':'+mm);
    }
    a.innerHTML=values.map(v=>'<option value="'+v+'">'+v+'</option>').join('');
    b.innerHTML=a.innerHTML;
    a.value='13:00';b.value='15:00';
  }

  function updateReview(){
    const p=policies[type];
    let use=3;
    if(duration==='AM'||duration==='PM')use=.5;
    if(duration==='H'){
      const a=document.getElementById('liffStartTime')?.value||'13:00';
      const b=document.getElementById('liffEndTime')?.value||'15:00';
      const [ah,am]=a.split(':').map(Number),[bh,bm]=b.split(':').map(Number);
      use=Math.max(0,Math.round(((bh*60+bm)-(ah*60+am))/60*.125*1000)/1000);
    }
    document.querySelector('.review-icon').textContent=p.icon;
    document.getElementById('reviewEn').textContent=p.en;
    document.getElementById('reviewType').textContent=p.th;
    document.getElementById('reviewDays').textContent=String(use);
    document.getElementById('reviewBefore').textContent=p.remain+' วัน';
    document.getElementById('reviewUse').textContent=use+' วัน';
    document.getElementById('reviewAfter').textContent=Math.max(0,p.remain-use)+' วัน';
  }

  function clock(){
    const el=document.getElementById('liffClock');
    if(el)el.textContent=new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  }

  document.querySelectorAll('.liff-type').forEach(btn=>btn.addEventListener('click',()=>{
    type=btn.dataset.type;
    document.querySelectorAll('.liff-type').forEach(x=>x.classList.toggle('is-active',x===btn));
    updateReview();
  }));

  document.querySelectorAll('.liff-duration-grid button').forEach(btn=>btn.addEventListener('click',()=>{
    duration=btn.dataset.duration;
    document.querySelectorAll('.liff-duration-grid button').forEach(x=>x.classList.toggle('is-active',x===btn));
    const hourly=document.querySelector('.liff-hourly');
    if(hourly)hourly.hidden=duration!=='H';
    updateReview();
  }));

  document.getElementById('liffStartTime')?.addEventListener('change',updateReview);
  document.getElementById('liffEndTime')?.addEventListener('change',updateReview);
  document.getElementById('historyShortcut')?.addEventListener('click',()=>document.getElementById('liffRecent')?.scrollIntoView({behavior:'smooth',block:'start'}));
  document.querySelector('.liff-submit')?.addEventListener('click',e=>{
    e.currentTarget.textContent='ตรวจสอบแล้ว · Design Preview';
    e.currentTarget.disabled=true;
    setTimeout(()=>{e.currentTarget.textContent='ส่งคำขอลา';e.currentTarget.disabled=false;},1600);
  });
  fillTimes();updateReview();clock();setInterval(clock,1000);
}());