(function () {
  'use strict';

  function svg(name) {
    return typeof icon === 'function' ? icon(name) : '';
  }

  const params = new URLSearchParams(location.search || '');
  const role = params.get('role') || 'employee';

  const attendanceByDate = {
    '2026-10-21': { checkIn:'09:01', checkOut:'', source:'สำนักงาน · Web' },
    '2026-10-20': { checkIn:'09:04', checkOut:'17:28', source:'สำนักงาน · Web' },
    '2026-10-14': { checkIn:'09:02', checkOut:'', source:'สำนักงาน · Web' },
    '2026-10-07': { checkIn:'09:18', checkOut:'18:02', source:'สำนักงาน · Web' },
    '2026-10-06': { checkIn:'09:01', checkOut:'17:26', source:'สำนักงาน · Mobile' }
  };

  const requests = [
    { id:'TC-00108', submitted:'14 Oct 26', date:'2026-10-14', type:'checkout', original:'ไม่มีข้อมูล', corrected:'17:25', reason:'ลืมลงเวลาออกหลังปิดงานลูกค้า', status:'Pending', approver:'คุณอธิป ศรีสุข (Top)', comment:'รอพิจารณา' },
    { id:'TC-00094', submitted:'7 Oct 26', date:'2026-10-07', type:'checkin', original:'09:18', corrected:'09:00', reason:'ลงเวลาเข้าช้ากว่าเวลาจริง', status:'Approved', approver:'คุณอธิป ศรีสุข (Top)', comment:'ตรวจสอบแล้ว' },
    { id:'TC-00088', submitted:'6 Oct 26', date:'2026-10-06', type:'checkout', original:'17:26', corrected:'17:30', reason:'เวลาออกคลาดเคลื่อนจากบันทึกจริง', status:'Approved', approver:'คุณอธิป ศรีสุข (Top)', comment:'อนุมัติ' }
  ];

  const approver = { name:'คุณอธิป ศรีสุข (Top)', role:'Approver · Team B', scope:'ผู้อนุมัติคำขอแก้ไขเวลา' };

  function fmtDate(value) {
    if (!value) return '—';
    const d = new Date(value + 'T00:00:00');
    const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return d.getDate() + ' ' + mon[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2);
  }

  function typeLabel(type) {
    return type === 'checkout' ? 'เวลาออกงาน' : 'เวลาเข้างาน';
  }

  function typeShort(type) {
    return type === 'checkout' ? 'CHECK-OUT' : 'CHECK-IN';
  }

  function statusMeta(status) {
    return ({
      Pending:{ th:'รออนุมัติ', cls:'pending', icon:'clock' },
      Approved:{ th:'อนุมัติแล้ว', cls:'approved', icon:'check' },
      Rejected:{ th:'ไม่อนุมัติ', cls:'rejected', icon:'close' }
    })[status] || { th:status, cls:'neutral', icon:'file' };
  }

  function validCorrectionTime(value) {
    if (!/^\d{2}:\d{2}$/.test(String(value || ''))) return false;
    const [h,m] = value.split(':').map(Number);
    if (h < 9 || h > 17 || (h === 17 && m > 30)) return false;
    return m >= 0 && m <= 59;
  }

  function hasDuplicate(date,type) {
    return requests.some(item => item.date === date && item.type === type && ['Pending','Approved','Rejected'].includes(item.status));
  }

  function requestRow(item) {
    const s = statusMeta(item.status);
    return '<article class="correction-prod-request-row" data-status="' + item.status + '" data-month="' + item.date.slice(5,7) + '" data-search="' + (item.id+' '+item.reason+' '+typeLabel(item.type)).toLowerCase() + '">' +
      '<span class="correction-prod-request-icon ' + item.type + '">' + svg(item.type === 'checkout' ? 'arrow' : 'target') + '</span>' +
      '<span class="correction-prod-request-id"><small>REQUEST ID</small><b>' + item.id + '</b><em>ส่ง ' + item.submitted + '</em></span>' +
      '<span class="correction-prod-request-date"><small>วันที่แก้ไข</small><b>' + fmtDate(item.date) + '</b><em>' + typeLabel(item.type) + '</em></span>' +
      '<span class="correction-prod-request-change"><small>เวลาเดิม → เวลาใหม่</small><b>' + item.original + ' → ' + item.corrected + '</b><em>' + item.reason + '</em></span>' +
      '<span class="correction-prod-status ' + s.cls + '">' + svg(s.icon) + '<b>' + s.th + '</b></span>' +
      '<span class="correction-prod-request-actions"><button type="button" data-toggle-correction="' + item.id + '">ดูรายละเอียด</button>' + (item.status === 'Pending' ? '<button type="button" class="danger">ลบคำขอ</button>' : '') + '</span>' +
      '<section class="correction-prod-request-expanded" data-correction-detail="' + item.id + '" hidden>' +
        '<div class="correction-prod-expanded-facts"><span><small>ประเภท</small><b>' + typeLabel(item.type) + '</b></span><span><small>ผู้อนุมัติ</small><b>' + item.approver + '</b></span><span><small>ความคิดเห็น</small><b>' + item.comment + '</b></span></div>' +
        '<div class="correction-prod-decision-line"><span class="dot ' + s.cls + '"></span><div><small>APPROVAL STATUS</small><b>' + s.th + '</b><em>' + item.comment + '</em></div></div>' +
      '</section>' +
    '</article>';
  }

  function managerBoard() {
    if (role === 'employee') return '';
    const data = [
      ['TC-00112','คุณจิรัญญา พลเจริญ (Jo)','21 OCT 26','CHECK-OUT','ไม่มีข้อมูล','17:28','ลืมลงเวลาออกหลังประชุมลูกค้า'],
      ['TC-00113','คุณอธิป ศรีสุข (Top)','20 OCT 26','CHECK-IN','09:12','09:00','ลงเวลาหลังเปิดเครื่องช้า'],
      ['TC-00114','คุณกาญจนา นุกูลการ','20 OCT 26','CHECK-OUT','17:12','17:30','เวลาบันทึกคลาดเคลื่อน']
    ];
    const cards = data.map((r,i) =>
      '<article class="correction-prod-approval-card ' + (i===0?'urgent':'') + '">' +
        '<div class="correction-prod-approval-head"><span>' + svg('file') + '</span><div><small>' + r[0] + '</small><b>' + r[3] + '</b></div><em>' + (i===0?'ใหม่':'รอพิจารณา') + '</em></div>' +
        '<h3>' + r[1] + '</h3><p>Team B · บัญชี</p>' +
        '<div class="correction-prod-approval-change"><span><small>เวลาเดิม</small><b>' + r[4] + '</b></span><i>→</i><span><small>ขอแก้เป็น</small><b>' + r[5] + '</b></span></div>' +
        '<dl><div><dt>วันที่</dt><dd>' + r[2] + '</dd></div><div><dt>เหตุผล</dt><dd>' + r[6] + '</dd></div></dl>' +
        '<div class="correction-prod-approval-actions"><button type="button" class="approve">อนุมัติ</button><button type="button" class="reject">ไม่อนุมัติ</button></div>' +
      '</article>'
    ).join('');
    return '<section class="correction-prod-board correction-prod-approval-board"><div class="correction-prod-board-head"><div><span class="correction-prod-board-icon purple">' + svg('check') + '</span><span><small>APPROVAL QUEUE</small><h2>คำขอแก้ไขเวลาที่รอคุณพิจารณา</h2><p>Production ใช้ Approve / Reject และบังคับเหตุผลเมื่อไม่อนุมัติ</p></span></div><span class="correction-prod-head-pill urgent">3 รายการ</span></div><div class="correction-prod-approval-grid">' + cards + '</div></section>';
  }

  function build() {
    return '<div class="correction-prod-page">' +
      '<section class="correction-prod-hero">' +
        '<div class="correction-prod-date-line"><span></span><b data-correction-date></b><time data-correction-clock></time></div>' +
        '<div class="correction-prod-hero-copy"><small>TIME CORRECTION</small><h1><span>FIX THE</span> <em>TIME</em></h1><p>เลือกวันที่ เทียบเวลาเดิม แล้วส่งเวลาที่ถูกต้อง</p><div class="correction-prod-hero-actions"><button type="button" data-scroll-correction="correction-prod-builder">' + svg('plus') + '<span><b>ขอแก้ไขเวลา</b><small>เริ่มคำขอใหม่</small></span></button><button type="button" class="secondary" data-scroll-correction="correction-prod-history">' + svg('file') + '<span><b>ดูประวัติ</b><small>ติดตามสถานะคำขอ</small></span></button></div></div>' +
        '<div class="correction-prod-shift-visual"><div class="correction-prod-shift-head"><small>TIME ADJUSTMENT</small><b>20 OCT 26</b><em>CHECK-IN</em></div><div class="correction-prod-shift-flow"><span class="old"><small>ORIGINAL</small><b>09:04</b><em>บันทึกเดิม</em></span><i>' + svg('arrow') + '</i><span class="new"><small>CORRECTED</small><b>09:00</b><em>เวลาที่ถูกต้อง</em></span></div><div class="correction-prod-shift-meta"><span><small>ต่างกัน</small><b>−4 นาที</b></span><span><small>ผู้อนุมัติ</small><b>1 คน</b></span><span><small>ตรวจซ้ำ</small><b>พร้อมส่ง</b></span></div></div>' +
      '</section>' +

      '<section class="correction-prod-stat-board"><div class="correction-prod-board-head"><div><span class="correction-prod-board-icon blue">' + svg('target') + '</span><span><small>TIME RECORD STATUS</small><h2>สรุปการลงเวลาของฉัน</h2><p>ภาพรวมรายการที่สมบูรณ์และคำขอแก้ไขเวลา</p></span></div><a class="correction-prod-head-link" href="liff-correction.html" target="_blank" rel="noopener">ดู Web LIFF ›</a></div><div class="correction-prod-stat-grid"><article class="green"><small>COMPLETE</small><b>13 <em>วัน</em></b><span>ลงเวลาครบ</span></article><article class="amber"><small>MISSING</small><b>1 <em>รายการ</em></b><span>เวลาออกหาย</span></article><article class="purple"><small>PENDING</small><b>1 <em>คำขอ</em></b><span>รออนุมัติ</span></article><article class="blue"><small>APPROVED</small><b>2 <em>คำขอ</em></b><span>แก้ไขแล้ว</span></article></div></section>' +

      '<section id="correction-prod-builder" class="correction-prod-board correction-prod-builder">' +
        '<div class="correction-prod-board-head"><div><span class="correction-prod-board-icon purple">' + svg('file') + '</span><span><small>NEW TIME CORRECTION</small><h2>แบบฟอร์มขอแก้ไขเวลา</h2><p>ตาม Production: วันที่ → รายการ → เวลาเดิม/ใหม่ → ตรวจซ้ำ → ผู้อนุมัติ → เหตุผล</p></span></div><span class="correction-prod-head-pill">DRAFT</span></div>' +
        '<form id="correction-prod-form">' +
          '<div class="correction-prod-section"><div class="correction-prod-section-title"><span>01</span><div><b>วันที่ต้องการแก้ไข</b><small>เลือกวันที่ที่มีข้อมูลการลงเวลา ระบบจะโหลดเวลาเดิมมาเทียบ</small></div></div><label class="correction-prod-date-field"><span>วันที่</span><input type="date" name="correction-prod-date" value="2026-10-20" max="2026-10-22"></label><div class="correction-prod-attendance-snapshot" data-correction-snapshot></div></div>' +
          '<div class="correction-prod-section"><div class="correction-prod-section-title"><span>02</span><div><b>เลือกรายการที่ต้องการแก้</b><small>Production เปิด/ปิดตัวเลือกตามข้อมูลลงเวลาของวันนั้น</small></div></div><div class="correction-prod-type-grid"><label class="correction-prod-type-choice checkin is-selected"><input type="radio" name="correction-prod-type" value="checkin" checked><span>' + svg('target') + '</span><div><small>CHECK-IN</small><b>เวลาเข้างาน</b><em data-original-in>09:04</em></div><i></i></label><label class="correction-prod-type-choice checkout"><input type="radio" name="correction-prod-type" value="checkout"><span>' + svg('arrow') + '</span><div><small>CHECK-OUT</small><b>เวลาออกงาน</b><em data-original-out>17:28</em></div><i></i></label></div></div>' +
          '<div class="correction-prod-section"><div class="correction-prod-section-title"><span>03</span><div><b>เวลาเดิม → เวลาที่ถูกต้อง</b><small>Desktop Production ตรวจรูปแบบเวลา และรับช่วง 09:00–17:30</small></div></div><div class="correction-prod-time-compare"><div class="old"><small>เวลาเดิม</small><b data-correction-original>09:04</b><em>จาก Time Log</em></div><span>' + svg('arrow') + '</span><label class="new"><small>เวลาที่ถูกต้อง</small><input type="time" name="correction-prod-time" value="09:00" min="09:00" max="17:30"><em>09:00–17:30</em></label><div class="delta"><small>ผลต่าง</small><b data-correction-delta>−4 นาที</b></div></div></div>' +
          '<div class="correction-prod-section"><div class="correction-prod-section-title"><span>04</span><div><b>ตรวจคำขอซ้ำ</b><small>Production ไม่ให้ส่งวันที่ + ประเภทเดิมซ้ำ หากมีคำขออยู่แล้ว</small></div></div><div class="correction-prod-duplicate-status safe" data-correction-duplicate></div></div>' +
          '<div class="correction-prod-section"><div class="correction-prod-section-title"><span>05</span><div><b>ผู้อนุมัติ</b><small>Desktop Production ใช้ผู้อนุมัติหลัก 1 คนจากสังกัด</small></div></div><article class="correction-prod-approver"><span>' + svg('people') + '</span><div><b>' + approver.name + '</b><small>' + approver.role + '</small></div><em>' + approver.scope + '</em></article></div>' +
          '<div class="correction-prod-section"><div class="correction-prod-section-title"><span>06</span><div><b>เหตุผลในการขอแก้ไข</b><small>อธิบายสาเหตุให้ผู้อนุมัติพิจารณาได้ทันที</small></div></div><label class="correction-prod-reason"><span>เหตุผล / รายละเอียด</span><textarea name="correction-prod-reason" rows="4" placeholder="เช่น ลงเวลาเข้าช้ากว่าเวลาจริงเนื่องจากระบบเปิดช้า"></textarea></label></div>' +
          '<div class="correction-prod-review-strip"><div><small>วันที่</small><b data-review-date>20 OCT 26</b><em data-review-source>สำนักงาน · Web</em></div><div><small>รายการ</small><b data-review-type>CHECK-IN</b><em data-review-original>เดิม 09:04</em></div><div><small>เวลาใหม่</small><b data-review-time>09:00</b><em data-review-delta>−4 นาที</em></div><div><small>ผู้อนุมัติ</small><b>' + approver.name + '</b><em>1 คน</em></div></div>' +
          '<div class="correction-prod-submit-row"><span>' + svg('shield') + '<span><b>ระบบจะตรวจข้อมูลลงเวลา คำขอซ้ำ และผู้อนุมัติอีกครั้ง</b><small>Design Preview ยังไม่ส่งข้อมูลจริง</small></span></span><button type="submit">ตรวจสอบและส่งคำขอ ' + svg('arrow') + '</button></div><p class="correction-prod-feedback" aria-live="polite"></p>' +
        '</form>' +
      '</section>' +

      '<section id="correction-prod-history" class="correction-prod-board correction-prod-history"><div class="correction-prod-board-head"><div><span class="correction-prod-board-icon blue">' + svg('file') + '</span><span><small>CORRECTION HISTORY</small><h2>ประวัติคำขอแก้ไขเวลา</h2><p>ดูเวลาเดิม เวลาใหม่ สถานะ และความคิดเห็นผู้อนุมัติ</p></span></div><span class="correction-prod-head-pill">3 รายการ</span></div><div class="correction-prod-toolbar"><div class="correction-prod-search">' + svg('file') + '<input type="search" placeholder="ค้นหาเลขคำขอ ประเภท หรือเหตุผล..." data-correction-search></div><select data-correction-month><option value="">ทุกเดือน</option><option value="10">ตุลาคม</option></select><div class="correction-prod-tabs"><button class="active" type="button" data-correction-filter="">ทั้งหมด</button><button type="button" data-correction-filter="Pending">รออนุมัติ</button><button type="button" data-correction-filter="Approved">อนุมัติแล้ว</button></div></div><div class="correction-prod-request-list">' + requests.map(requestRow).join('') + '</div></section>' +
      managerBoard() +
      '<p class="correction-prod-footer">Design Preview · UX อ้างอิง app-leave-GAS Production · ไม่ส่งข้อมูลจริง</p>' +
    '</div>';
  }

  function updateClock(root) {
    const now = new Date();
    const d = root.querySelector('[data-correction-date]');
    const t = root.querySelector('[data-correction-clock]');
    if (d) d.textContent = now.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if (t) t.textContent = 'เวลา ' + now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function update(root) {
    const date = root.querySelector('[name="correction-prod-date"]')?.value || '';
    const type = root.querySelector('[name="correction-prod-type"]:checked')?.value || 'checkin';
    const time = root.querySelector('[name="correction-prod-time"]')?.value || '';
    const record = attendanceByDate[date] || null;
    const original = record ? (type === 'checkout' ? record.checkOut : record.checkIn) : '';
    const duplicate = hasDuplicate(date,type);
    const valid = validCorrectionTime(time);

    root.querySelectorAll('.correction-prod-type-choice').forEach(label => {
      const radio = label.querySelector('input');
      label.classList.toggle('is-selected',!!radio?.checked);
      const unavailable = !record || (radio?.value === 'checkin' && !record.checkIn) || (!record.checkIn && !record.checkOut);
      radio.disabled = unavailable;
      label.classList.toggle('is-disabled',unavailable);
    });

    const snap = root.querySelector('[data-correction-snapshot]');
    if (snap) {
      if (!record || (!record.checkIn && !record.checkOut)) {
        snap.className='correction-prod-attendance-snapshot empty';
        snap.innerHTML=svg('alert')+'<span><b>ไม่พบข้อมูลการลงเวลา</b><small>Production จะไม่เปิดขั้นตอนถัดไปสำหรับวันที่นี้</small></span>';
      } else {
        snap.className='correction-prod-attendance-snapshot ready';
        snap.innerHTML='<span><small>CHECK-IN</small><b>'+(record.checkIn||'ไม่มีข้อมูล')+'</b></span><i></i><span><small>CHECK-OUT</small><b>'+(record.checkOut||'ไม่มีข้อมูล')+'</b></span><em>'+record.source+'</em>';
      }
    }

    const inEl=root.querySelector('[data-original-in]'), outEl=root.querySelector('[data-original-out]');
    if(inEl) inEl.textContent=record?.checkIn||'ไม่มีข้อมูล';
    if(outEl) outEl.textContent=record?.checkOut||'ไม่มีข้อมูล';
    const orig=root.querySelector('[data-correction-original]');
    if(orig) orig.textContent=original||'ไม่มีข้อมูล';

    let deltaText='—';
    if (original && valid) {
      const [oh,om]=original.split(':').map(Number), [nh,nm]=time.split(':').map(Number);
      const delta=(nh*60+nm)-(oh*60+om);
      deltaText=(delta>0?'+':delta<0?'−':'')+Math.abs(delta)+' นาที';
    }
    const delta=root.querySelector('[data-correction-delta]');
    if(delta) delta.textContent=deltaText;

    const dup=root.querySelector('[data-correction-duplicate]');
    if(dup) {
      dup.className='correction-prod-duplicate-status '+(duplicate?'danger':'safe');
      dup.innerHTML=duplicate
        ? svg('alert')+'<span><b>ไม่สามารถส่งคำขอซ้ำได้</b><small>มีคำขอ '+typeLabel(type)+' ของ '+fmtDate(date)+' อยู่ในระบบแล้ว</small></span>'
        : svg('check')+'<span><b>ไม่พบคำขอซ้ำสำหรับวันที่และประเภทนี้</b><small>Production จะตรวจข้อมูลล่าสุดอีกครั้งก่อนบันทึก</small></span>';
    }

    const set=(sel,v)=>{const e=root.querySelector(sel);if(e)e.textContent=v;};
    set('[data-review-date]',fmtDate(date));
    set('[data-review-source]',record?.source||'ไม่พบข้อมูล');
    set('[data-review-type]',typeShort(type));
    set('[data-review-original]','เดิม '+(original||'ไม่มีข้อมูล'));
    set('[data-review-time]',time||'—');
    set('[data-review-delta]',deltaText);

    const reason=root.querySelector('[name="correction-prod-reason"]')?.value.trim()||'';
    const submit=root.querySelector('.correction-prod-submit-row button');
    if(submit) submit.disabled=!record || (!record.checkIn && !record.checkOut) || (type === 'checkin' && !record.checkIn) || duplicate || !valid || !reason;
  }

  function bind(root) {
    updateClock(root);
    update(root);
    root.querySelectorAll('[data-scroll-correction]').forEach(btn=>btn.addEventListener('click',()=>document.getElementById(btn.dataset.scrollCorrection)?.scrollIntoView({behavior:'smooth',block:'start'})));
    root.querySelectorAll('[name="correction-prod-date"],[name="correction-prod-type"],[name="correction-prod-time"]').forEach(el=>el.addEventListener('change',()=>update(root)));
    root.querySelector('[name="correction-prod-reason"]')?.addEventListener('input',()=>update(root));
    root.querySelector('#correction-prod-form')?.addEventListener('submit',event=>{
      event.preventDefault();
      const reason=root.querySelector('[name="correction-prod-reason"]')?.value.trim()||'';
      const feedback=root.querySelector('.correction-prod-feedback');
      if(!reason){if(feedback)feedback.textContent='กรุณาระบุเหตุผลในการขอแก้ไข';return;}
      if(feedback)feedback.textContent='ตรวจข้อมูลครบแล้ว · Design Preview ยังไม่ส่งข้อมูลจริง';
    });
    root.querySelectorAll('[data-toggle-correction]').forEach(btn=>btn.addEventListener('click',()=>{
      const panel=root.querySelector('[data-correction-detail="'+btn.dataset.toggleCorrection+'"]');
      if(!panel)return;
      panel.hidden=!panel.hidden;
      btn.textContent=panel.hidden?'ดูรายละเอียด':'ซ่อนรายละเอียด';
    }));

    const search=root.querySelector('[data-correction-search]');
    const month=root.querySelector('[data-correction-month]');
    let status='';
    const filter=()=>{
      const q=String(search?.value||'').trim().toLowerCase(), m=month?.value||'';
      root.querySelectorAll('.correction-prod-request-row').forEach(row=>{
        row.hidden=!((!q||row.dataset.search.includes(q))&&(!m||row.dataset.month===m)&&(!status||row.dataset.status===status));
      });
    };
    search?.addEventListener('input',filter); month?.addEventListener('change',filter);
    root.querySelectorAll('[data-correction-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      status=btn.dataset.correctionFilter||'';
      root.querySelectorAll('[data-correction-filter]').forEach(x=>x.classList.toggle('active',x===btn));
      filter();
    }));
    const timer=setInterval(()=>{if(!document.body.contains(root)){clearInterval(timer);return;}updateClock(root);},1000);
  }

  function mount() {
    if (!location.hash.startsWith('#correction')) return;
    const workspace=document.querySelector('.module-workspace');
    if(!workspace || workspace.dataset.correctionProd==='true') return;
    workspace.dataset.correctionProd='true';
    workspace.innerHTML=build();
    bind(workspace);
  }

  addEventListener('hashchange',()=>setTimeout(mount,40));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0));
  else setTimeout(mount,0);
}());
