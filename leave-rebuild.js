(function () {
  'use strict';

  function svg(name) {
    return typeof icon === 'function' ? icon(name) : '';
  }

  const qs = new URLSearchParams(location.search || '');
  const role = qs.get('role') || 'employee';

  const leavePolicies = {
    vacation: { key: 'Vacation', en: 'VACATION', th: 'ลาพักร้อน', quota: 15, used: 3, remain: 12, icon: 'beach', tone: 'violet' },
    sick: { key: 'Sick', en: 'SICK LEAVE', th: 'ลาป่วย', quota: 5, used: 1, remain: 4, icon: 'medicalCross', tone: 'teal' },
    personal: { key: 'Personal', en: 'PERSONAL', th: 'ลากิจ', quota: 3, used: 1, remain: 2, icon: 'briefcase', tone: 'amber' }
  };

  const holidays = new Set(['2026-10-23']);

  const requests = [
    { id:'LEV-0048', type:'vacation', start:'2026-10-26', end:'2026-10-28', duration:'F', days:3, reason:'เดินทางกับครอบครัว', status:'Pending', submitted:'22 Oct 26', action:'edit' },
    { id:'LEV-0043', type:'personal', start:'2026-10-12', end:'2026-10-12', duration:'F', days:1, reason:'ติดต่อหน่วยงานราชการ', status:'Approved', submitted:'11 Oct 26', action:'view' },
    { id:'LEV-0041', type:'sick', start:'2026-10-07', end:'2026-10-07', duration:'F', days:1, reason:'ไม่สบาย', status:'Revise', submitted:'7 Oct 26', action:'resubmit' },
    { id:'LEV-0038', type:'vacation', start:'2026-09-30', end:'2026-10-02', duration:'F', days:3, reason:'พักผ่อน', status:'Rejected', submitted:'29 Sep 26', action:'view' }
  ];

  function fmtDate(value, shortYear = true) {
    if (!value) return '—';
    const d = new Date(value + 'T00:00:00');
    const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    return d.getDate() + ' ' + mon[d.getMonth()] + ' ' + (shortYear ? String(d.getFullYear()).slice(-2) : d.getFullYear());
  }

  function fmtRange(start, end) {
    if (!start || !end) return 'ยังไม่เลือกวันที่';
    if (start === end) return fmtDate(start);
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    if (s.getMonth() === e.getMonth()) return s.getDate() + '–' + e.getDate() + ' ' + mon[e.getMonth()] + ' ' + String(e.getFullYear()).slice(-2);
    return s.getDate() + ' ' + mon[s.getMonth()] + ' – ' + e.getDate() + ' ' + mon[e.getMonth()] + ' ' + String(e.getFullYear()).slice(-2);
  }

  function businessDays(start, end) {
    if (!start || !end) return { total:0, excluded:[] };
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    if (Number.isNaN(+s) || Number.isNaN(+e) || e < s) return { total:0, excluded:[] };
    let total = 0;
    const excluded = [];
    const cursor = new Date(s);
    while (cursor <= e) {
      const iso = cursor.toISOString().slice(0,10);
      const weekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      if (weekend) excluded.push({ date:iso, reason:'วันหยุดประจำสัปดาห์' });
      else if (holidays.has(iso)) excluded.push({ date:iso, reason:'วันหยุดบริษัท' });
      else total += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    return { total, excluded };
  }

  function durationLabel(value) {
    return ({ F:'เต็มวัน', AM:'ครึ่งวันเช้า', PM:'ครึ่งวันบ่าย', H:'รายชั่วโมง' })[value] || 'เต็มวัน';
  }

  function statusMeta(status) {
    return ({
      Pending:{ th:'รออนุมัติ', cls:'pending', icon:'clock' },
      Approved:{ th:'อนุมัติแล้ว', cls:'approved', icon:'check' },
      Revise:{ th:'ต้องแก้ไข', cls:'revise', icon:'alert' },
      Rejected:{ th:'ไม่อนุมัติ', cls:'rejected', icon:'close' }
    })[status] || { th:status, cls:'neutral', icon:'file' };
  }

  function policyCard(type) {
    const p = leavePolicies[type];
    const percent = Math.round((p.used / p.quota) * 100);
    return '<article class="leave-prod-wallet-card ' + p.tone + '" data-wallet-type="' + type + '">' +
      '<div class="leave-prod-wallet-top"><span class="leave-prod-wallet-icon">' + svg(p.icon) + '</span><span><small>' + p.en + '</small><b>' + p.th + '</b></span><em>สิทธิ์ ' + p.quota + ' วัน</em></div>' +
      '<div class="leave-prod-wallet-numbers"><span><small>ใช้ไป</small><b>' + p.used + ' วัน</b></span><span><small>คงเหลือ</small><b>' + p.remain + ' วัน</b></span></div>' +
      '<div class="leave-prod-wallet-progress"><i style="width:' + percent + '%"></i><span>' + percent + '%</span><em>' + (100 - percent) + '%</em></div>' +
    '</article>';
  }

  function typeChoice(type, selected) {
    const p = leavePolicies[type];
    return '<label class="leave-prod-type-choice ' + p.tone + (selected ? ' is-selected' : '') + '">' +
      '<input type="radio" name="leave-prod-type" value="' + type + '"' + (selected ? ' checked' : '') + '>' +
      '<span class="leave-prod-type-icon">' + svg(p.icon) + '</span>' +
      '<span class="leave-prod-type-copy"><small>' + p.en + '</small><b>' + p.th + '</b><em>คงเหลือ ' + p.remain + ' วัน</em></span>' +
      '<span class="leave-prod-radio-dot"></span>' +
    '</label>';
  }

  function durationChoice(value, title, desc, iconName, selected) {
    return '<label class="leave-prod-duration-choice' + (selected ? ' is-selected' : '') + '">' +
      '<input type="radio" name="leave-prod-duration" value="' + value + '"' + (selected ? ' checked' : '') + '>' +
      '<span class="leave-prod-duration-icon">' + svg(iconName) + '</span>' +
      '<b>' + title + '</b><small>' + desc + '</small>' +
    '</label>';
  }

  function requestRow(item) {
    const p = leavePolicies[item.type];
    const s = statusMeta(item.status);
    const actions = item.action === 'edit'
      ? '<button type="button" class="leave-prod-action ghost">แก้ไข</button><button type="button" class="leave-prod-action danger">ถอนคำขอ</button>'
      : item.action === 'resubmit'
        ? '<button type="button" class="leave-prod-action warning">แก้ไขและส่งใหม่</button>'
        : '<button type="button" class="leave-prod-action ghost">ดูรายละเอียด</button>';
    return '<article class="leave-prod-request-row" data-status="' + item.status + '" data-month="' + item.start.slice(5,7) + '" data-search="' + (item.id + ' ' + p.th + ' ' + item.reason).toLowerCase() + '">' +
      '<span class="leave-prod-request-type ' + p.tone + '">' + svg(p.icon) + '</span>' +
      '<span class="leave-prod-request-id"><small>REQUEST ID</small><b>' + item.id + '</b><em>ส่ง ' + item.submitted + '</em></span>' +
      '<span class="leave-prod-request-detail"><small>' + p.en + '</small><b>' + p.th + '</b><em>' + fmtRange(item.start,item.end) + ' · ' + item.days + ' วัน · ' + durationLabel(item.duration) + '</em></span>' +
      '<span class="leave-prod-request-reason"><small>เหตุผล</small><b>' + item.reason + '</b></span>' +
      '<span class="leave-prod-status ' + s.cls + '">' + svg(s.icon) + '<b>' + s.th + '</b></span>' +
      '<span class="leave-prod-request-actions">' + actions + '</span>' +
    '</article>';
  }

  function approvalSection() {
    if (role === 'employee') return '';
    const people = [
      ['LEV-0053','Vacation','คุณจิรัญญา พลเจริญ (Jo)','26–28 OCT 26 · 3 วัน','เดินทางกับครอบครัว','Team B · บัญชี'],
      ['LEV-0054','Sick','คุณอธิป ศรีสุข (Top)','23 OCT 26 · 1 วัน','ไม่สบาย · มีเอกสารแนบ','Team B · บัญชี'],
      ['LEV-0055','Personal','คุณกาญจนา นุกูลการ','27 OCT 26 · 1 วัน','ติดต่อหน่วยงานราชการ','Team A · บัญชี']
    ];
    const cards = people.map((r,idx) => {
      const type = r[1] === 'Vacation' ? 'vacation' : r[1] === 'Sick' ? 'sick' : 'personal';
      const p = leavePolicies[type];
      return '<article class="leave-prod-approval-card ' + (idx === 0 ? 'urgent' : '') + '">' +
        '<div class="leave-prod-approval-head"><span class="' + p.tone + '">' + svg(p.icon) + '</span><div><small>' + r[0] + '</small><b>' + p.th + '</b></div><em>' + (idx === 0 ? 'ครบกำหนดวันนี้' : 'ใหม่') + '</em></div>' +
        '<h3>' + r[2] + '</h3><p>' + r[5] + '</p>' +
        '<dl><div><dt>วันที่ลา</dt><dd>' + r[3] + '</dd></div><div><dt>เหตุผล</dt><dd>' + r[4] + '</dd></div></dl>' +
        '<div class="leave-prod-approval-actions"><button type="button" class="approve">อนุมัติ</button><button type="button" class="revise">ส่งกลับแก้ไข</button><button type="button" class="reject">ไม่อนุมัติ</button></div>' +
      '</article>';
    }).join('');
    return '<section class="leave-prod-board leave-prod-approval-board">' +
      '<div class="leave-prod-board-head"><div><span class="leave-prod-board-icon rose">' + svg('check') + '</span><span><small>APPROVAL QUEUE</small><h2>คำขอที่รอคุณพิจารณา</h2><p>แสดงเฉพาะรายการที่ระบบระบุว่าคุณมีสิทธิ์ตัดสินใจ</p></span></div><span class="leave-prod-head-pill urgent">3 รายการวันนี้</span></div>' +
      '<div class="leave-prod-approval-grid">' + cards + '</div>' +
    '</section>';
  }

  function buildDesktop() {
    return '<div class="leave-prod-page">' +
      '<section class="leave-prod-hero">' +
        '<div class="leave-prod-hero-copy">' +
          '<div class="leave-prod-date-line"><span class="leave-prod-date-dot"></span><span data-leave-prod-date></span><b data-leave-prod-time></b></div>' +
          '<small>LEAVE OPERATIONS</small><h1>วางแผนลาให้ชัด<br><em>ก่อนกดส่งคำขอ</em></h1>' +
          '<p>วางแผนวันลา ตรวจสิทธิ์ และติดตามคำขอในหน้าเดียว</p>' +
          '<div class="leave-prod-hero-actions"><button type="button" class="primary" data-scroll-to="leave-prod-builder">' + svg('plus') + '<span><b>ยื่นคำขอลา</b><small>เริ่มคำขอใหม่</small></span></button><button type="button" class="secondary" data-scroll-to="leave-prod-history">' + svg('file') + '<span><b>ดูประวัติ</b><small>ค้นหาและจัดการคำขอ</small></span></button></div>' +
        '</div>' +
        '<div class="leave-prod-planner">' +
          '<div class="leave-prod-planner-head"><div><small>LEAVE PLANNER</small><b>สัปดาห์ถัดไป</b></div><span class="leave-prod-next-holiday"><small>NEXT HOLIDAY</small><b>23 OCT</b></span></div>' +
          '<div class="leave-prod-week-strip">' +
            '<span><small>MON</small><b>26</b><em class="selected">ลา</em></span><span><small>TUE</small><b>27</b><em class="selected">ลา</em></span><span><small>WED</small><b>28</b><em class="selected">ลา</em></span><span><small>THU</small><b>29</b></span><span><small>FRI</small><b>30</b></span><span class="weekend"><small>SAT</small><b>31</b></span><span class="weekend"><small>SUN</small><b>1</b></span>' +
          '</div>' +
          '<div class="leave-prod-planner-summary"><article><span>' + svg('calendar') + '</span><div><small>แผนที่เลือก</small><b>26–28 OCT 26</b></div><strong>3 วันทำงาน</strong></article><article><span>' + svg('check') + '</span><div><small>ทีมพร้อมทำงาน</small><b>ไม่มีคำเตือนกำลังคน</b></div><strong class="safe">พร้อม</strong></article></div>' +
        '</div>' +
      '</section>' +

      '<section class="leave-prod-wallet">' +
        '<div class="leave-prod-section-heading"><div><span class="leave-prod-board-icon peach">' + svg('calendar') + '</span><span><small>MY LEAVE WALLET</small><h2>สิทธิ์การลาของฉัน</h2><p>ข้อมูลสิทธิ์จาก User Policy และการลาที่อนุมัติแล้ว</p></span></div><a href="liff-leave.html" target="_blank" rel="noopener" class="leave-prod-head-link">ดู Web LIFF ›</a></div>' +
        '<div class="leave-prod-wallet-grid">' + policyCard('vacation') + policyCard('sick') + policyCard('personal') + '</div>' +
      '</section>' +

      '<section id="leave-prod-builder" class="leave-prod-builder-layout">' +
        '<section class="leave-prod-board leave-prod-builder">' +
          '<div class="leave-prod-board-head"><div><span class="leave-prod-board-icon teal">' + svg('calendar') + '</span><span><small>NEW REQUEST</small><h2>สร้างคำขอลา</h2><p>flow เดียวกับ Production แต่จัดข้อมูลใหม่ให้ตรวจสอบง่ายก่อนส่ง</p></span></div><span class="leave-prod-head-pill">DRAFT</span></div>' +
          '<div class="leave-prod-stepper"><span class="active"><i>1</i><b>ประเภทลา</b></span><span><i>2</i><b>วันที่</b></span><span><i>3</i><b>ช่วงเวลา</b></span><span><i>4</i><b>รายละเอียด</b></span><span><i>5</i><b>ตรวจสอบ</b></span></div>' +
          '<form id="leave-prod-form">' +
            '<div class="leave-prod-form-section"><div class="leave-prod-form-title"><span>01</span><div><b>เลือกประเภทการลา</b><small>ระบบแสดงเฉพาะสิทธิ์ที่มีใน User Policy</small></div></div><div class="leave-prod-type-grid">' + typeChoice('vacation',true) + typeChoice('sick',false) + typeChoice('personal',false) + '</div></div>' +
            '<div class="leave-prod-form-section"><div class="leave-prod-form-title"><span>02</span><div><b>เลือกวันที่ลา</b><small>ระบบไม่นับวันหยุดประจำสัปดาห์และวันหยุดบริษัท</small></div></div><div class="leave-prod-date-grid"><label><span>วันเริ่มลา</span><input type="date" name="leave-prod-start" value="2026-10-26"></label><label><span>วันสิ้นสุดลา</span><input type="date" name="leave-prod-end" value="2026-10-28"></label></div><div class="leave-prod-date-preview" data-count-preview></div></div>' +
            '<div class="leave-prod-form-section"><div class="leave-prod-form-title"><span>03</span><div><b>เลือกรูปแบบเวลา</b><small>Production รองรับเต็มวัน ครึ่งวันเช้า ครึ่งวันบ่าย และรายชั่วโมง</small></div></div><div class="leave-prod-duration-grid">' + durationChoice('F','เต็มวัน','คิดตามวันทำงาน','calendar',true) + durationChoice('AM','ครึ่งวันเช้า','0.5 วัน','clock',false) + durationChoice('PM','ครึ่งวันบ่าย','0.5 วัน','clock',false) + durationChoice('H','รายชั่วโมง','เลือกเวลา 15 นาที','clock',false) + '</div><div class="leave-prod-hourly-row" hidden><label><span>เวลาเริ่ม</span><select name="leave-prod-start-time"></select></label><label><span>เวลาสิ้นสุด</span><select name="leave-prod-end-time"></select></label><em>ช่วงเวลา Production: 09:00–17:30 · ทุก 15 นาที</em></div></div>' +
            '<div class="leave-prod-form-section"><div class="leave-prod-form-title"><span>04</span><div><b>รายละเอียดและเอกสาร</b><small>ระบุเหตุผลให้ผู้อนุมัติเข้าใจในครั้งเดียว</small></div></div><div class="leave-prod-detail-grid"><label><span>เหตุผลการลา</span><textarea name="leave-prod-reason" rows="4" placeholder="เช่น เดินทางกับครอบครัว"></textarea></label><label class="leave-prod-upload"><input type="file" multiple accept="image/jpeg,image/png,application/pdf"><span>' + svg('upload') + '</span><b>แนบเอกสาร</b><small>JPG / PNG / PDF · สูงสุด 3 ไฟล์</small><em>Production LIFF จำกัด 2 MB/ไฟล์ · รวม 4 MB</em></label></div></div>' +
            '<div class="leave-prod-submit-row"><span class="leave-prod-safe-note">' + svg('shield') + '<span><b>ระบบจะ re-check สิทธิ์และ approval chain ก่อนบันทึกจริง</b><small>ป้องกันข้อมูล stale และการส่งซ้ำ</small></span></span><button type="submit">ตรวจสอบและส่งคำขอ ' + svg('arrow') + '</button></div><p class="leave-prod-form-feedback" aria-live="polite"></p>' +
          '</form>' +
        '</section>' +

        '<aside class="leave-prod-side-stack">' +
          '<section class="leave-prod-board leave-prod-live-summary"><div class="leave-prod-board-head compact"><div><span class="leave-prod-board-icon violet">' + svg('file') + '</span><span><small>LIVE SUMMARY</small><h2>สรุปก่อนส่ง</h2></span></div><span class="leave-prod-head-pill ready">พร้อมตรวจ</span></div>' +
            '<article class="leave-prod-summary-main"><span class="leave-prod-summary-icon violet" data-summary-icon>' + svg('beach') + '</span><div><small data-summary-en>VACATION</small><b data-summary-type>ลาพักร้อน</b><em data-summary-range>26–28 OCT 26</em></div><strong><b data-summary-days>3</b><small>วัน</small></strong></article>' +
            '<dl class="leave-prod-summary-facts"><div><dt>สิทธิ์ก่อนลา</dt><dd data-summary-before>12 วัน</dd></div><div><dt>ใช้ครั้งนี้</dt><dd data-summary-use>3 วัน</dd></div><div class="after"><dt>คงเหลือหลังลา</dt><dd data-summary-after>9 วัน</dd></div></dl>' +
          '</section>' +
          '<section class="leave-prod-board leave-prod-rules"><div class="leave-prod-board-head compact"><div><span class="leave-prod-board-icon blue">' + svg('calendar') + '</span><span><small>WORKDAY CHECK</small><h2>การนับวันลา</h2></span></div></div><div class="leave-prod-rule-list" data-rule-list></div></section>' +
          '<section class="leave-prod-board leave-prod-route"><div class="leave-prod-board-head compact"><div><span class="leave-prod-board-icon amber">' + svg('check') + '</span><span><small>APPROVAL ROUTE</small><h2>สายอนุมัติอัตโนมัติ</h2></span></div></div><div class="leave-prod-route-line"><span class="done">' + svg('check') + '</span><div><small>ผู้ยื่น</small><b>คุณ</b></div><i></i><span>1</span><div><small>ขั้นที่ 1</small><b>ผู้อนุมัติของทีม</b></div><i></i><span>2</span><div><small>ขั้นสุดท้าย</small><b>HR / SuperAdmin</b></div></div><p>ระบบโหลดสายอนุมัติตาม UID และสังกัด ไม่ให้ผู้ใช้กำหนดสิทธิ์อนุมัติเอง</p></section>' +
        '</aside>' +
      '</section>' +

      '<section id="leave-prod-history" class="leave-prod-board leave-prod-history">' +
        '<div class="leave-prod-board-head"><div><span class="leave-prod-board-icon purple">' + svg('file') + '</span><span><small>REQUEST CONTROL CENTER</small><h2>คำขอลาของฉัน</h2><p>ค้นหา กรองสถานะ แก้ไข ส่งใหม่ หรือถอนคำขอตามสถานะจริง</p></span></div><span class="leave-prod-head-pill">4 รายการ</span></div>' +
        '<div class="leave-prod-toolbar"><div class="leave-prod-search"><span>' + svg('file') + '</span><input type="search" placeholder="ค้นหาเลขคำขอ ประเภท หรือเหตุผล..." data-history-search></div><select data-history-month><option value="">ทุกเดือน</option><option value="10">ตุลาคม</option><option value="09">กันยายน</option></select><div class="leave-prod-status-tabs"><button type="button" class="active" data-status-filter="">ทั้งหมด</button><button type="button" data-status-filter="Pending">รออนุมัติ</button><button type="button" data-status-filter="Approved">อนุมัติแล้ว</button><button type="button" data-status-filter="Revise">ต้องแก้ไข</button></div></div>' +
        '<div class="leave-prod-request-list">' + requests.map(requestRow).join('') + '</div>' +
      '</section>' +
      approvalSection() +
      '<p class="leave-prod-footer-note">Design Preview · โครง UX อ้างอิงพฤติกรรมจาก app-leave-GAS Production · ไม่ส่งข้อมูลจริง</p>' +
    '</div>';
  }

  function fillTimes(root) {
    const start = root.querySelector('[name="leave-prod-start-time"]');
    const end = root.querySelector('[name="leave-prod-end-time"]');
    if (!start || !end || start.options.length) return;
    const options = [];
    for (let minutes = 9 * 60; minutes <= 17 * 60 + 30; minutes += 15) {
      const hh = String(Math.floor(minutes / 60)).padStart(2,'0');
      const mm = String(minutes % 60).padStart(2,'0');
      options.push(hh + ':' + mm);
    }
    start.innerHTML = options.map(v => '<option value="' + v + '">' + v + '</option>').join('');
    end.innerHTML = options.map(v => '<option value="' + v + '">' + v + '</option>').join('');
    start.value = '13:00';
    end.value = '15:00';
  }

  function selectedDays(root) {
    const start = root.querySelector('[name="leave-prod-start"]')?.value || '';
    const end = root.querySelector('[name="leave-prod-end"]')?.value || '';
    const duration = root.querySelector('[name="leave-prod-duration"]:checked')?.value || 'F';
    const base = businessDays(start,end);
    let days = base.total;
    if ((duration === 'AM' || duration === 'PM') && days > 0) days = 0.5;
    if (duration === 'H' && days > 0) {
      const st = root.querySelector('[name="leave-prod-start-time"]')?.value || '13:00';
      const et = root.querySelector('[name="leave-prod-end-time"]')?.value || '15:00';
      const [sh,sm] = st.split(':').map(Number);
      const [eh,em] = et.split(':').map(Number);
      const hours = Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
      days = Math.round(hours * 0.125 * 1000) / 1000;
    }
    return { days, excluded:base.excluded, start, end, duration };
  }

  function updateSummary(root) {
    const type = root.querySelector('[name="leave-prod-type"]:checked')?.value || 'vacation';
    const p = leavePolicies[type];
    const calc = selectedDays(root);
    const after = Math.max(0, p.remain - calc.days);
    const set = (sel,val) => { const el=root.querySelector(sel); if(el) el.textContent=val; };
    set('[data-summary-en]',p.en);
    set('[data-summary-type]',p.th);
    set('[data-summary-range]',fmtRange(calc.start,calc.end));
    set('[data-summary-days]',String(calc.days));
    set('[data-summary-before]',p.remain + ' วัน');
    set('[data-summary-use]',calc.days + ' วัน');
    set('[data-summary-after]',after + ' วัน');

    const icon = root.querySelector('[data-summary-icon]');
    if (icon) { icon.className='leave-prod-summary-icon '+p.tone; icon.innerHTML=svg(p.icon); }

    root.querySelectorAll('.leave-prod-type-choice').forEach(card => {
      const radio = card.querySelector('input');
      card.classList.toggle('is-selected', !!radio?.checked);
    });
    root.querySelectorAll('.leave-prod-duration-choice').forEach(card => {
      const radio = card.querySelector('input');
      card.classList.toggle('is-selected', !!radio?.checked);
    });

    const hourly = root.querySelector('.leave-prod-hourly-row');
    if (hourly) hourly.hidden = calc.duration !== 'H';

    const preview = root.querySelector('[data-count-preview]');
    if (preview) {
      const excludedText = calc.excluded.length ? ' · ไม่นับ ' + calc.excluded.length + ' วันหยุด' : '';
      preview.innerHTML = '<span>' + svg('check') + '</span><b>ระบบนับเป็น ' + calc.days + ' วันลา</b><em>' + fmtRange(calc.start,calc.end) + excludedText + '</em>';
    }

    const ruleList = root.querySelector('[data-rule-list]');
    if (ruleList) {
      const rows = [];
      rows.push('<article class="counted"><span>' + svg('check') + '</span><div><b>วันทำงานที่นับเป็นวันลา</b><small>' + calc.days + ' วัน · ' + durationLabel(calc.duration) + '</small></div></article>');
      calc.excluded.slice(0,3).forEach(item => rows.push('<article class="excluded"><span>' + svg('calendar') + '</span><div><b>' + fmtDate(item.date) + '</b><small>' + item.reason + ' · ไม่นับเป็นวันลา</small></div></article>'));
      if (!calc.excluded.length) rows.push('<article class="safe"><span>' + svg('check') + '</span><div><b>ไม่มีวันหยุดในช่วงที่เลือก</b><small>ระบบจะตรวจจากปฏิทินบริษัทอีกครั้งก่อนบันทึก</small></div></article>');
      ruleList.innerHTML = rows.join('');
    }
  }

  function updateClock(root) {
    const now = new Date();
    const d = root.querySelector('[data-leave-prod-date]');
    const t = root.querySelector('[data-leave-prod-time]');
    if (d) d.textContent = now.toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if (t) t.textContent = 'เวลา ' + now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function bindDesktop(root) {
    fillTimes(root);
    updateClock(root);
    updateSummary(root);

    root.querySelectorAll('[data-scroll-to]').forEach(btn => btn.addEventListener('click', () => document.getElementById(btn.dataset.scrollTo)?.scrollIntoView({behavior:'smooth',block:'start'})));

    root.querySelectorAll('[name="leave-prod-type"],[name="leave-prod-duration"],[name="leave-prod-start"],[name="leave-prod-end"],[name="leave-prod-start-time"],[name="leave-prod-end-time"]').forEach(el => el.addEventListener('change', () => updateSummary(root)));

    const form = root.querySelector('#leave-prod-form');
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const feedback = root.querySelector('.leave-prod-form-feedback');
      if (feedback) feedback.textContent = 'ตรวจข้อมูลครบแล้ว · Design Preview ยังไม่ส่งข้อมูลจริง';
    });

    const search = root.querySelector('[data-history-search]');
    const month = root.querySelector('[data-history-month]');
    let status = '';
    const filter = () => {
      const q = String(search?.value || '').trim().toLowerCase();
      const m = month?.value || '';
      root.querySelectorAll('.leave-prod-request-row').forEach(row => {
        const ok = (!q || row.dataset.search.includes(q)) && (!m || row.dataset.month === m) && (!status || row.dataset.status === status);
        row.hidden = !ok;
      });
    };
    search?.addEventListener('input',filter);
    month?.addEventListener('change',filter);
    root.querySelectorAll('[data-status-filter]').forEach(btn => btn.addEventListener('click', () => {
      status = btn.dataset.statusFilter || '';
      root.querySelectorAll('[data-status-filter]').forEach(x => x.classList.toggle('active',x===btn));
      filter();
    }));

    const timer=setInterval(()=>{ if(!document.body.contains(root)){clearInterval(timer);return;} updateClock(root); },1000);
  }

  function mount() {
    if (!location.hash.startsWith('#leave')) return;
    const workspace=document.querySelector('.leave-workspace');
    if (!workspace || workspace.dataset.leaveProd === 'true') return;
    workspace.dataset.leaveProd='true';
    const note=document.querySelector('.page-shell.leave-page > .prototype-note');
    if (note) note.hidden=true;
    workspace.innerHTML=buildDesktop();
    bindDesktop(workspace);
  }

  addEventListener('hashchange',()=>setTimeout(mount,30));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,0));
  else setTimeout(mount,0);
}());
