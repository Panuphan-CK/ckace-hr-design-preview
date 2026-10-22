(function () {
  'use strict';

  function svg(name) {
    return typeof icon === 'function' ? icon(name) : '';
  }

  const params = new URLSearchParams(location.search || '');
  const role = params.get('role') || 'employee';

  const approvalChain = [
    { order:1, name:'คุณอธิป ศรีสุข (Top)', role:'Approver · Team B', scope:'พิจารณาคำขอ OT' },
    { order:2, name:'คุณกาญจนา นุกูลการ', role:'SuperAdmin', scope:'ผู้อนุมัติขั้นสุดท้าย' }
  ];

  const requests = [
    { id:'OT-00108', submitted:'16 Oct 26', date:'2026-10-23', start:'18:00', end:'20:30', hours:2.5, kind:'วันหยุดบริษัท', reason:'ปิดงบไตรมาส 4', status:'Pending', steps:[['1','คุณอธิป ศรีสุข (Top)','16 Oct 26','—','Pending','รอพิจารณา'],['2','คุณกาญจนา นุกูลการ','16 Oct 26','—','Pending','รอลำดับก่อนหน้า']] },
    { id:'OT-00102', submitted:'14 Oct 26', date:'2026-10-17', start:'09:00', end:'13:00', hours:3, kind:'วันหยุดประจำสัปดาห์', reason:'ตรวจเอกสารลูกค้า', status:'Approved', steps:[['1','คุณอธิป ศรีสุข (Top)','14 Oct 26','14 Oct 26','Approved','อนุมัติ'],['2','คุณกาญจนา นุกูลการ','14 Oct 26','15 Oct 26','Approved','อนุมัติ']] },
    { id:'OT-00098', submitted:'9 Oct 26', date:'2026-10-11', start:'13:00', end:'17:00', hours:4, kind:'วันหยุดประจำสัปดาห์', reason:'สรุปยอด Payroll', status:'Approved', steps:[['1','คุณอธิป ศรีสุข (Top)','9 Oct 26','9 Oct 26','Approved','อนุมัติ'],['2','คุณกาญจนา นุกูลการ','9 Oct 26','10 Oct 26','Approved','อนุมัติ']] },
    { id:'OT-00091', submitted:'2 Oct 26', date:'2026-10-03', start:'09:00', end:'12:00', hours:3, kind:'วันหยุดประจำสัปดาห์', reason:'เตรียมเอกสาร Audit', status:'Rejected', steps:[['1','คุณอธิป ศรีสุข (Top)','2 Oct 26','2 Oct 26','Rejected','มีผู้รับผิดชอบงานแล้ว']] }
  ];

  const knownHolidays = new Set(['2026-10-23']);

  function statusMeta(status) {
    return ({
      Pending:{ th:'รออนุมัติ', cls:'pending', icon:'clock' },
      Approved:{ th:'อนุมัติแล้ว', cls:'approved', icon:'check' },
      Rejected:{ th:'ไม่อนุมัติ', cls:'rejected', icon:'close' }
    })[status] || { th:status, cls:'neutral', icon:'file' };
  }

  function fmtDate(value) {
    const d = new Date(value + 'T00:00:00');
    const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return d.getDate() + ' ' + mon[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2);
  }

  function fmtRange(start,end) {
    if (!start || !end) return '—';
    if (start === end) return fmtDate(start);
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    if (s.getMonth() === e.getMonth()) return s.getDate() + '–' + e.getDate() + ' ' + mon[e.getMonth()] + ' ' + String(e.getFullYear()).slice(-2);
    return fmtDate(start) + ' – ' + fmtDate(end);
  }

  function minutes(value) {
    const parts = String(value || '').split(':').map(Number);
    return parts.length === 2 ? parts[0] * 60 + parts[1] : NaN;
  }

  function overlapMinutes(a1,a2,b1,b2) {
    return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1));
  }

  function isWorkday(date) {
    const d = new Date(date + 'T00:00:00');
    return d.getDay() !== 0 && d.getDay() !== 6 && !knownHolidays.has(date);
  }

  function dayKind(date) {
    if (knownHolidays.has(date)) return 'วันหยุดบริษัท';
    const d = new Date(date + 'T00:00:00');
    if (d.getDay() === 0 || d.getDay() === 6) return 'วันหยุดประจำสัปดาห์';
    return 'วันทำงาน';
  }

  function calculateHours(startTime,endTime,workday) {
    const s = minutes(startTime), e0 = minutes(endTime);
    if (!Number.isFinite(s) || !Number.isFinite(e0)) return 0;
    let e = e0;
    if (e < s) e += 24 * 60;
    let total = (e - s) / 60;
    if (!workday && e <= 24 * 60) {
      total -= overlapMinutes(s,e,12*60,13*60) / 60;
      total -= overlapMinutes(s,e,17*60+30,18*60+30) / 60;
    }
    return Math.max(0,Math.round(total * 100) / 100);
  }

  function dateList(start,end) {
    if (!start || !end) return [];
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (e < s) return [];
    const out=[];
    const d=new Date(s);
    const localIso = value => {
      const y=value.getFullYear();
      const m=String(value.getMonth()+1).padStart(2,'0');
      const day=String(value.getDate()).padStart(2,'0');
      return y+'-'+m+'-'+day;
    };
    while(d<=e){
      out.push(localIso(d));
      d.setDate(d.getDate()+1);
    }
    return out;
  }

  function hasKnownOverlap(date,start,end) {
    return requests.some(r => r.date === date && r.status !== 'Rejected' && minutes(start) < minutes(r.end) && minutes(end) > minutes(r.start));
  }

  function approverRows() {
    return approvalChain.map(item =>
      '<article class="ot-prod-approver-row">' +
        '<span class="ot-prod-approver-order">' + item.order + '</span>' +
        '<span class="ot-prod-approver-icon">' + svg('people') + '</span>' +
        '<span class="ot-prod-approver-copy"><b>' + item.name + '</b><small>' + item.role + '</small></span>' +
        '<em>' + item.scope + '</em>' +
      '</article>'
    ).join('');
  }

  function timeline(item) {
    return item.steps.map(step => {
      const meta=statusMeta(step[4]);
      return '<div class="ot-prod-timeline-row"><span class="ot-prod-timeline-order">' + step[0] + '</span><span><b>' + step[1] + '</b><small>มอบหมาย ' + step[2] + ' · ดำเนินการ ' + step[3] + '</small></span><em class="' + meta.cls + '">' + meta.th + '</em><strong>' + step[5] + '</strong></div>';
    }).join('');
  }

  function requestRow(item) {
    const s=statusMeta(item.status);
    return '<article class="ot-prod-request-row" data-status="' + item.status + '" data-month="' + item.date.slice(5,7) + '" data-search="' + (item.id+' '+item.reason+' '+item.kind).toLowerCase() + '">' +
      '<span class="ot-prod-request-icon">' + svg('clock') + '</span>' +
      '<span class="ot-prod-request-id"><small>REQUEST ID</small><b>' + item.id + '</b><em>ส่ง ' + item.submitted + '</em></span>' +
      '<span class="ot-prod-request-time"><small>วันที่ทำ OT</small><b>' + fmtDate(item.date) + '</b><em>' + item.start + '–' + item.end + ' · ' + item.kind + '</em></span>' +
      '<span class="ot-prod-request-hours"><small>ชั่วโมง OT</small><b>' + item.hours + ' ชม.</b><em>' + item.reason + '</em></span>' +
      '<span class="ot-prod-status ' + s.cls + '">' + svg(s.icon) + '<b>' + s.th + '</b></span>' +
      '<span class="ot-prod-request-actions"><button type="button" data-toggle-ot="' + item.id + '">ดูรายละเอียด</button>' + (item.status==='Pending'?'<button type="button" class="danger">ถอนคำขอ</button>':'') + '</span>' +
      '<section class="ot-prod-request-expanded" data-ot-detail="' + item.id + '" hidden>' +
        '<div class="ot-prod-expanded-facts"><span><small>ประเภทวัน</small><b>' + item.kind + '</b></span><span><small>ช่วงเวลา</small><b>' + item.start + '–' + item.end + '</b></span><span><small>รายละเอียดงาน</small><b>' + item.reason + '</b></span></div>' +
        '<div class="ot-prod-request-timeline"><small>APPROVAL TIMELINE</small><h3>ขั้นตอนการอนุมัติ</h3>' + timeline(item) + '</div>' +
      '</section>' +
    '</article>';
  }

  function approvalBoard() {
    if (role === 'employee') return '';
    const cards=[
      ['OT-00112','คุณจิรัญญา พลเจริญ (Jo)','23 OCT 26','18:30–21:30','3 ชม.','ปิดงบลูกค้า A','วันหยุดบริษัท'],
      ['OT-00113','คุณอธิป ศรีสุข (Top)','24 OCT 26','09:00–13:00','3 ชม.','ตรวจเอกสาร Audit','วันหยุดประจำสัปดาห์'],
      ['OT-00114','คุณกาญจนา นุกูลการ','26 OCT 26','18:00–20:00','2 ชม.','สรุป Payroll','วันทำงาน']
    ].map((x,i)=>
      '<article class="ot-prod-approval-card ' + (i===0?'urgent':'') + '">' +
        '<div class="ot-prod-approval-head"><span>' + svg('clock') + '</span><div><small>' + x[0] + '</small><b>OVERTIME</b></div><em>' + (i===0?'วันนี้':'ใหม่') + '</em></div>' +
        '<h3>' + x[1] + '</h3><p>Team B · บัญชี</p>' +
        '<dl><div><dt>วันที่</dt><dd>' + x[2] + '</dd></div><div><dt>เวลา</dt><dd>' + x[3] + '</dd></div><div><dt>ชั่วโมง</dt><dd>' + x[4] + ' · ' + x[6] + '</dd></div><div><dt>งาน</dt><dd>' + x[5] + '</dd></div></dl>' +
        '<div class="ot-prod-approval-actions"><button type="button" class="approve">อนุมัติ</button><button type="button" class="reject">ไม่อนุมัติ</button></div>' +
      '</article>'
    ).join('');
    return '<section class="ot-prod-board ot-prod-approval-board"><div class="ot-prod-board-head"><div><span class="ot-prod-board-icon purple">' + svg('check') + '</span><span><small>APPROVAL QUEUE</small><h2>คำขอ OT ที่รอคุณพิจารณา</h2><p>Production รองรับค้นหา Reload และอนุมัติหลายรายการตามสิทธิ์</p></span></div><span class="ot-prod-head-pill urgent">3 รายการ</span></div><div class="ot-prod-approval-grid">' + cards + '</div></section>';
  }

  function build() {
    return '<div class="ot-prod-page">' +
      '<section class="ot-prod-hero">' +
        '<div class="ot-prod-date-line"><span></span><b data-ot-date></b><time data-ot-clock></time></div>' +
        '<div class="ot-prod-hero-copy"><small>OVERTIME OPERATIONS</small><h1><span>OT</span> <em>WORKSPACE</em></h1><p>วางแผนเวลา ตรวจชั่วโมง และติดตามคำขอ OT</p><div class="ot-prod-hero-actions"><button type="button" data-scroll-ot="ot-prod-builder">' + svg('plus') + '<span><b>ขอทำ OT</b><small>สร้างคำขอใหม่</small></span></button><button type="button" class="secondary" data-scroll-ot="ot-prod-history">' + svg('file') + '<span><b>ดูประวัติ</b><small>สถานะและชั่วโมง OT</small></span></button></div></div>' +
        '<div class="ot-prod-time-rail" aria-label="ตัวอย่างช่วงเวลา OT"><div class="ot-prod-rail-head"><small>TODAY PLAN</small><b>22 OCT 26</b><em>วันทำงาน</em></div><div class="ot-prod-rail-track"><span class="start"><small>START</small><b>18:00</b></span><i><u style="width:62%"></u></i><span class="end"><small>END</small><b>20:30</b></span></div><div class="ot-prod-rail-total"><span><small>รวม</small><b>2.5 ชม.</b></span><span><small>ตรวจซ้ำ</small><b>ไม่พบช่วงเวลาซ้อน</b></span><span><small>ผู้อนุมัติ</small><b>2 ขั้น</b></span></div></div>' +
      '</section>' +

      '<section class="ot-prod-stat-board"><div class="ot-prod-board-head"><div><span class="ot-prod-board-icon amber">' + svg('clock') + '</span><span><small>MY OT STATISTICS</small><h2>สรุป OT ของฉัน</h2><p>ชั่วโมงจากคำขอ OT และสถานะการอนุมัติ</p></span></div><a class="ot-prod-head-link" href="liff-ot.html" target="_blank" rel="noopener">ดู Web LIFF ›</a></div><div class="ot-prod-stat-grid"><article class="amber"><small>THIS MONTH</small><b>18.5 <em>ชม.</em></b><span>ชั่วโมง OT เดือนนี้</span></article><article class="green"><small>APPROVED</small><b>12 <em>ชม.</em></b><span>อนุมัติแล้ว</span></article><article class="purple"><small>PENDING</small><b>2.5 <em>ชม.</em></b><span>รออนุมัติ</span></article><article class="blue"><small>REQUESTS</small><b>4 <em>รายการ</em></b><span>คำขอเดือนนี้</span></article></div></section>' +

      '<section id="ot-prod-builder" class="ot-prod-board ot-prod-builder">' +
        '<div class="ot-prod-board-head"><div><span class="ot-prod-board-icon amber">' + svg('clock') + '</span><span><small>NEW OT REQUEST</small><h2>แบบฟอร์มขอทำงานล่วงเวลา</h2><p>ยึดโครง Production: วันที่ → เวลา → รายละเอียด → ตรวจซ้ำ → ผู้อนุมัติ</p></span></div><span class="ot-prod-head-pill">DRAFT</span></div>' +
        '<form id="ot-prod-form">' +
          '<div class="ot-prod-section"><div class="ot-prod-section-title"><span>01</span><div><b>วันที่ทำ OT</b><small>Production รองรับช่วงหลายวัน และสร้างคำขอแยก 1 รายการต่อวัน</small></div></div><div class="ot-prod-date-grid"><label><span>วันที่เริ่มต้น</span><input type="date" name="ot-prod-start-date" value="2026-10-22"></label><label><span>วันที่สิ้นสุด</span><input type="date" name="ot-prod-end-date" value="2026-10-22"></label></div></div>' +
          '<div class="ot-prod-section"><div class="ot-prod-section-title"><span>02</span><div><b>ช่วงเวลา</b><small>รองรับข้ามเที่ยงคืน และคำนวณชั่วโมงตามประเภทวันจากระบบ</small></div></div><div class="ot-prod-time-grid"><label><span>เวลาเริ่มต้น</span><input type="time" name="ot-prod-start-time" value="18:00"></label><label><span>เวลาสิ้นสุด</span><input type="time" name="ot-prod-end-time" value="20:30"></label><div class="ot-prod-live-hours"><small>ชั่วโมงตัวอย่าง</small><b data-ot-live-hours>2.5 ชม.</b><em data-ot-kind>วันทำงาน</em></div></div></div>' +
          '<div class="ot-prod-section"><div class="ot-prod-section-title"><span>03</span><div><b>เหตุผล / รายละเอียดงาน</b><small>ระบุงานที่ต้องทำล่วงเวลาให้ผู้อนุมัติเข้าใจ</small></div></div><label class="ot-prod-detail-field"><span>รายละเอียดงาน</span><textarea name="ot-prod-reason" rows="4" placeholder="เช่น ปิดงบไตรมาส 4 / ตรวจเอกสารลูกค้า"></textarea></label></div>' +
          '<div class="ot-prod-section"><div class="ot-prod-section-title"><span>04</span><div><b>ตรวจสอบวันและชั่วโมง</b><small>Production ตรวจ DayOfWeek, Holidays และคำขอที่เวลาซ้อนกัน</small></div></div><div class="ot-prod-day-breakdown" data-ot-breakdown></div><div class="ot-prod-duplicate-status" data-ot-duplicate></div></div>' +
          '<div class="ot-prod-section"><div class="ot-prod-section-title"><span>05</span><div><b>สายการอนุมัติ</b><small>โหลดจาก UID / สังกัด และ server re-check ก่อนบันทึกจริง</small></div></div><div class="ot-prod-approver-list">' + approverRows() + '</div></div>' +
          '<div class="ot-prod-review-strip"><div><small>ช่วงวันที่</small><b data-ot-range>22 OCT 26</b><em data-ot-request-count>1 คำขอ</em></div><div><small>ช่วงเวลา</small><b data-ot-time-range>18:00–20:30</b><em>ใช้เวลาเดียวกันทุกวันที่เลือก</em></div><div><small>รวมชั่วโมง</small><b data-ot-total-hours>2.5 ชม.</b><em>ระบบคิดรายวัน</em></div><div><small>สายอนุมัติ</small><b>2 ขั้น</b><em>ตรวจล่าสุดก่อนส่ง</em></div></div>' +
          '<div class="ot-prod-submit-row"><span>' + svg('shield') + '<span><b>ระบบจะตรวจเวลาซ้อนและสายอนุมัติอีกครั้งก่อนบันทึก</b><small>Design Preview ยังไม่ส่งข้อมูลจริง</small></span></span><button type="submit">ตรวจสอบและส่งคำขอ ' + svg('arrow') + '</button></div><p class="ot-prod-feedback" aria-live="polite"></p>' +
        '</form>' +
      '</section>' +

      '<section id="ot-prod-history" class="ot-prod-board ot-prod-history"><div class="ot-prod-board-head"><div><span class="ot-prod-board-icon blue">' + svg('file') + '</span><span><small>OT HISTORY</small><h2>ประวัติการขอทำงานล่วงเวลา</h2><p>ดูวัน เวลา ชั่วโมง สถานะ และขั้นตอนการอนุมัติ</p></span></div><span class="ot-prod-head-pill">4 รายการ</span></div><div class="ot-prod-toolbar"><div class="ot-prod-search">' + svg('file') + '<input type="search" placeholder="ค้นหาเลขคำขอ งาน หรือประเภทวัน..." data-ot-search></div><select data-ot-month><option value="">ทุกเดือน</option><option value="10">ตุลาคม</option></select><div class="ot-prod-tabs"><button class="active" type="button" data-ot-filter="">ทั้งหมด</button><button type="button" data-ot-filter="Pending">รออนุมัติ</button><button type="button" data-ot-filter="Approved">อนุมัติแล้ว</button></div></div><div class="ot-prod-request-list">' + requests.map(requestRow).join('') + '</div></section>' +
      approvalBoard() +
      '<p class="ot-prod-footer">Design Preview · UX อ้างอิง app-leave-GAS Production · ไม่ส่งข้อมูลจริง</p>' +
    '</div>';
  }

  function updateClock(root) {
    const now=new Date();
    const date=root.querySelector('[data-ot-date]');
    const clock=root.querySelector('[data-ot-clock]');
    if(date) date.textContent=now.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if(clock) clock.textContent='เวลา '+now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function updateCalculation(root) {
    const startDate=root.querySelector('[name="ot-prod-start-date"]')?.value||'';
    const endDate=root.querySelector('[name="ot-prod-end-date"]')?.value||'';
    const startTime=root.querySelector('[name="ot-prod-start-time"]')?.value||'';
    const endTime=root.querySelector('[name="ot-prod-end-time"]')?.value||'';
    const dates=dateList(startDate,endDate);
    let total=0;
    let overlaps=[];
    const rows=dates.map(date=>{
      const kind=dayKind(date);
      const hours=calculateHours(startTime,endTime,isWorkday(date));
      total+=hours;
      const duplicate=hasKnownOverlap(date,startTime,endTime);
      if(duplicate) overlaps.push(date);
      return '<article class="' + (duplicate?'is-duplicate':'') + '"><span>' + svg(duplicate?'alert':'check') + '</span><div><b>' + fmtDate(date) + '</b><small>' + kind + ' · ' + startTime + '–' + endTime + '</small></div><strong>' + hours + ' ชม.</strong><em>' + (duplicate?'เวลาซ้อน':'พร้อมส่ง') + '</em></article>';
    }).join('');

    const breakdown=root.querySelector('[data-ot-breakdown]');
    if(breakdown) breakdown.innerHTML=rows || '<p>กรุณาเลือกช่วงวันที่ให้ถูกต้อง</p>';

    const duplicate=root.querySelector('[data-ot-duplicate]');
    if(duplicate) {
      duplicate.className='ot-prod-duplicate-status ' + (overlaps.length?'danger':'safe');
      duplicate.innerHTML=overlaps.length
        ? svg('alert') + '<span><b>พบคำขอ OT ที่ช่วงเวลาซ้อนกัน</b><small>' + overlaps.map(fmtDate).join(', ') + ' · Production จะไม่อนุญาตให้ส่งซ้ำ</small></span>'
        : svg('check') + '<span><b>ไม่พบช่วงเวลา OT ซ้อนกับคำขอเดิม</b><small>Production จะตรวจซ้ำกับข้อมูลล่าสุดก่อนบันทึก</small></span>';
    }

    const first=dates[0]||'';
    const hoursFirst=first?calculateHours(startTime,endTime,isWorkday(first)):0;
    const live=root.querySelector('[data-ot-live-hours]');
    const kind=root.querySelector('[data-ot-kind]');
    if(live) live.textContent=hoursFirst+' ชม.';
    if(kind) kind.textContent=first?dayKind(first):'—';

    const set=(sel,v)=>{const e=root.querySelector(sel);if(e)e.textContent=v;};
    set('[data-ot-range]',fmtRange(startDate,endDate));
    set('[data-ot-request-count]',dates.length+' คำขอ');
    set('[data-ot-time-range]',startTime+'–'+endTime);
    set('[data-ot-total-hours]',Math.round(total*100)/100+' ชม.');
  }

  function bind(root) {
    updateClock(root);
    updateCalculation(root);

    root.querySelectorAll('[data-scroll-ot]').forEach(btn=>btn.addEventListener('click',()=>document.getElementById(btn.dataset.scrollOt)?.scrollIntoView({behavior:'smooth',block:'start'})));
    root.querySelectorAll('[name="ot-prod-start-date"],[name="ot-prod-end-date"],[name="ot-prod-start-time"],[name="ot-prod-end-time"]').forEach(el=>el.addEventListener('change',()=>updateCalculation(root)));
    root.querySelector('#ot-prod-form')?.addEventListener('submit',event=>{
      event.preventDefault();
      const fb=root.querySelector('.ot-prod-feedback');
      if(fb) fb.textContent='ตรวจข้อมูลครบแล้ว · Design Preview ยังไม่ส่งข้อมูลจริง';
    });
    root.querySelectorAll('[data-toggle-ot]').forEach(btn=>btn.addEventListener('click',()=>{
      const panel=root.querySelector('[data-ot-detail="'+btn.dataset.toggleOt+'"]');
      if(!panel)return;
      panel.hidden=!panel.hidden;
      btn.textContent=panel.hidden?'ดูรายละเอียด':'ซ่อนรายละเอียด';
    }));

    const search=root.querySelector('[data-ot-search]');
    const month=root.querySelector('[data-ot-month]');
    let status='';
    const filter=()=>{
      const q=String(search?.value||'').trim().toLowerCase();
      const m=month?.value||'';
      root.querySelectorAll('.ot-prod-request-row').forEach(row=>{
        row.hidden=!((!q||row.dataset.search.includes(q))&&(!m||row.dataset.month===m)&&(!status||row.dataset.status===status));
      });
    };
    search?.addEventListener('input',filter);
    month?.addEventListener('change',filter);
    root.querySelectorAll('[data-ot-filter]').forEach(btn=>btn.addEventListener('click',()=>{
      status=btn.dataset.otFilter||'';
      root.querySelectorAll('[data-ot-filter]').forEach(x=>x.classList.toggle('active',x===btn));
      filter();
    }));

    const timer=setInterval(()=>{if(!document.body.contains(root)){clearInterval(timer);return;}updateClock(root);},1000);
  }

  function mount() {
    if (!location.hash.startsWith('#overtime')) return;
    const workspace=document.querySelector('.module-overtime .module-workspace');
    if(!workspace || workspace.dataset.otProd==='true') return;
    workspace.dataset.otProd='true';
    workspace.innerHTML=build();
    bind(workspace);
  }

  addEventListener('hashchange',()=>setTimeout(mount,40));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0));
  else setTimeout(mount,0);
}());
