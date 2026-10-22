(function () {
  'use strict';

  function svg(name) {
    return typeof icon === 'function' ? icon(name) : '';
  }

  const qs = new URLSearchParams(location.search || '');
  const role = qs.get('role') || 'employee';

  const leavePolicies = {
    vacation: { key:'Vacation', en:'VACATION', th:'ลาพักร้อน', quota:15, used:3, remain:12, icon:'beach', tone:'violet' },
    sick: { key:'Sick', en:'SICK LEAVE', th:'ลาป่วย', quota:5, used:1, remain:4, icon:'medicalCross', tone:'teal' },
    personal: { key:'Personal', en:'PERSONAL', th:'ลากิจ', quota:3, used:1, remain:2, icon:'briefcase', tone:'amber' }
  };

  const approvalChain = [
    { order:1, name:'คุณอธิป ศรีสุข (Top)', role:'Approver · Team B', scope:'พิจารณาคำขอลาตามสายอนุมัติ' },
    { order:2, name:'คุณกาญจนา นุกูลการ', role:'SuperAdmin', scope:'ผู้อนุมัติขั้นสุดท้าย' }
  ];

  const holidays = new Set(['2026-10-23']);

  const requests = [
    { id:'LEV-0048', type:'vacation', start:'2026-10-26', end:'2026-10-28', duration:'F', days:3, reason:'เดินทางกับครอบครัว', status:'Pending', submitted:'22 Oct 26', action:'edit', attachments:['แผนการเดินทาง.pdf'], steps:[['1','คุณอธิป ศรีสุข (Top)','22 Oct 26','—','Pending','รอพิจารณา'],['2','คุณกาญจนา นุกูลการ','22 Oct 26','—','Pending','รอลำดับก่อนหน้า']] },
    { id:'LEV-0043', type:'personal', start:'2026-10-12', end:'2026-10-12', duration:'F', days:1, reason:'ติดต่อหน่วยงานราชการ', status:'Approved', submitted:'11 Oct 26', action:'view', attachments:[], steps:[['1','คุณอธิป ศรีสุข (Top)','11 Oct 26','11 Oct 26','Approved','อนุมัติ'],['2','คุณกาญจนา นุกูลการ','11 Oct 26','11 Oct 26','Approved','อนุมัติ']] },
    { id:'LEV-0041', type:'sick', start:'2026-10-07', end:'2026-10-07', duration:'F', days:1, reason:'ไม่สบาย', status:'Revise', submitted:'7 Oct 26', action:'resubmit', attachments:[], steps:[['1','คุณอธิป ศรีสุข (Top)','7 Oct 26','7 Oct 26','Revise','กรุณาแนบเอกสารประกอบ']] },
    { id:'LEV-0038', type:'vacation', start:'2026-09-30', end:'2026-10-02', duration:'F', days:3, reason:'พักผ่อน', status:'Rejected', submitted:'29 Sep 26', action:'view', attachments:[], steps:[['1','คุณอธิป ศรีสุข (Top)','29 Sep 26','29 Sep 26','Rejected','ช่วงเวลาดังกล่าวมีงานปิดงบ']] }
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

  function approverRows() {
    return approvalChain.map(item =>
      '<article class="leave-prod-approver-row">' +
        '<span class="leave-prod-approver-order">' + item.order + '</span>' +
        '<span class="leave-prod-approver-avatar">' + svg('people') + '</span>' +
        '<span class="leave-prod-approver-copy"><b>' + item.name + '</b><small>' + item.role + '</small></span>' +
        '<em>' + item.scope + '</em>' +
      '</article>'
    ).join('');
  }

  function approvalTimeline(item) {
    return item.steps.map(step => {
      const meta = statusMeta(step[4]);
      return '<div class="leave-prod-timeline-row">' +
        '<span class="leave-prod-timeline-order">' + step[0] + '</span>' +
        '<span><b>' + step[1] + '</b><small>มอบหมาย ' + step[2] + ' · ดำเนินการ ' + step[3] + '</small></span>' +
        '<em class="' + meta.cls + '">' + meta.th + '</em>' +
        '<strong>' + step[5] + '</strong>' +
      '</div>';
    }).join('');
  }

  function requestRow(item) {
    const p = leavePolicies[item.type];
    const s = statusMeta(item.status);
    const actionButtons = item.action === 'edit'
      ? '<button type="button" class="leave-prod-action ghost">แก้ไข</button><button type="button" class="leave-prod-action danger">ถอนคำขอ</button>'
      : item.action === 'resubmit'
        ? '<button type="button" class="leave-prod-action warning">แก้ไขและส่งใหม่</button>'
        : '';
    const attachmentText = item.attachments.length ? item.attachments.join(', ') : 'ไม่มีไฟล์แนบ';
    return '<article class="leave-prod-request-row" data-request-id="' + item.id + '" data-status="' + item.status + '" data-month="' + item.start.slice(5,7) + '" data-search="' + (item.id + ' ' + p.th + ' ' + item.reason).toLowerCase() + '">' +
      '<span class="leave-prod-request-type ' + p.tone + '">' + svg(p.icon) + '</span>' +
      '<span class="leave-prod-request-id"><small>REQUEST ID</small><b>' + item.id + '</b><em>ส่ง ' + item.submitted + '</em></span>' +
      '<span class="leave-prod-request-detail"><small>' + p.en + '</small><b>' + p.th + '</b><em>' + fmtRange(item.start,item.end) + ' · ' + item.days + ' วัน · ' + durationLabel(item.duration) + '</em></span>' +
      '<span class="leave-prod-request-reason"><small>เหตุผล</small><b>' + item.reason + '</b></span>' +
      '<span class="leave-prod-status ' + s.cls + '">' + svg(s.icon) + '<b>' + s.th + '</b></span>' +
      '<span class="leave-prod-request-actions"><button type="button" class="leave-prod-action ghost" data-toggle-request="' + item.id + '">ดูรายละเอียด</button>' + actionButtons + '</span>' +
      '<section class="leave-prod-request-expanded" data-request-detail="' + item.id + '" hidden>' +
        '<div class="leave-prod-request-expanded-grid">' +
          '<div><small>ไฟล์แนบ</small><b>' + attachmentText + '</b></div>' +
          '<div><small>วันที่ลา</small><b>' + fmtRange(item.start,item.end) + ' · ' + item.days + ' วัน</b></div>' +
          '<div><small>รูปแบบเวลา</small><b>' + durationLabel(item.duration) + '</b></div>' +
        '</div>' +
        '<div class="leave-prod-request-timeline"><small>APPROVAL TIMELINE</small><h3>ขั้นตอนการอนุมัติ</h3>' + approvalTimeline(item) + '</div>' +
      '</section>' +
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
          '<small>LEAVE OPERATIONS</small><h1><span>MY LEAVE</span> <em>PLANNER</em></h1>' +
          '<p>วางแผนวันลา ตรวจสิทธิ์ และติดตามคำขอ</p>' +
          '<div class="leave-prod-hero-actions"><button type="button" class="primary" data-scroll-to="leave-prod-builder">' + svg('plus') + '<span><b>ยื่นคำขอลา</b><small>เริ่มคำขอใหม่</small></span></button><button type="button" class="secondary" data-scroll-to="leave-prod-history">' + svg('file') + '<span><b>ดูประวัติ</b><small>ค้นหาและจัดการคำขอ</small></span></button></div>' +
        '</div>' +
        '<div class="leave-prod-hero-visual" aria-label="สรุปแผนการลา">' +
          '<div class="leave-prod-hero-plan"><small>UPCOMING LEAVE</small><strong>26–28 <em>OCT 26</em></strong><span>ลาพักร้อน · 3 วันทำงาน</span></div>' +
          '<div class="leave-prod-hero-metrics">' +
            '<span><small>คงเหลือ</small><b>12 วัน</b></span>' +
            '<span><small>ทีมพร้อม</small><b>พร้อม</b></span>' +
            '<span><small>NEXT HOLIDAY</small><b>23 OCT</b></span>' +
          '</div>' +
          '<div class="leave-prod-hero-week"><span><small>MON</small><b>26</b><i>ลา</i></span><span><small>TUE</small><b>27</b><i>ลา</i></span><span><small>WED</small><b>28</b><i>ลา</i></span><span><small>THU</small><b>29</b></span><span><small>FRI</small><b>30</b></span></div>' +
        '</div>' +
      '</section>' +

      '<section class="leave-prod-wallet">' +
        '<div class="leave-prod-section-heading"><div><span class="leave-prod-board-icon peach">' + svg('calendar') + '</span><span><small>MY LEAVE STATISTICS</small><h2>สถิติการลาของฉัน</h2><p>ใช้รูปแบบเดียวกับหน้า Overview และอ่านสิทธิ์จาก User Policy</p></span></div><a href="liff-leave.html" target="_blank" rel="noopener" class="leave-prod-head-link">ดู Web LIFF ›</a></div>' +
        '<div class="leave-prod-wallet-grid">' + policyCard('vacation') + policyCard('sick') + policyCard('personal') + '</div>' +
      '</section>' +

      '<section id="leave-prod-builder" class="leave-prod-board leave-prod-builder leave-prod-builder-flat">' +
        '<div class="leave-prod-board-head"><div><span class="leave-prod-board-icon teal">' + svg('calendar') + '</span><span><small>NEW REQUEST</small><h2>สร้างคำขอลา</h2><p>ลำดับเดียวกับ Production: วันลา → ประเภท → เวลา → รายละเอียด → ผู้อนุมัติ → ไฟล์แนบ</p></span></div><span class="leave-prod-head-pill">DRAFT</span></div>' +
        '<div class="leave-prod-stepper"><span class="active"><i>1</i><b>ประเภทลา</b></span><span><i>2</i><b>วันที่</b></span><span><i>3</i><b>ช่วงเวลา</b></span><span><i>4</i><b>รายละเอียด</b></span><span><i>5</i><b>ผู้อนุมัติ</b></span><span><i>6</i><b>ไฟล์แนบ</b></span></div>' +
        '<form id="leave-prod-form">' +
          '<div class="leave-prod-form-section"><div class="leave-prod-form-title"><span>01</span><div><b>เลือกประเภทการลา</b><small>Production แสดงเฉพาะประเภทที่มีใน User Policy ของผู้ใช้</small></div></div><div class="leave-prod-type-grid">' + typeChoice('vacation',true) + typeChoice('sick',false) + typeChoice('personal',false) + '</div></div>' +
          '<div class="leave-prod-form-section"><div class="leave-prod-form-title"><span>02</span><div><b>เลือกวันที่ลา</b><small>ระบบไม่นับวันหยุดประจำสัปดาห์และวันหยุดบริษัท</small></div></div><div class="leave-prod-date-grid"><label><span>วันเริ่มลา</span><input type="date" name="leave-prod-start" value="2026-10-26"></label><label><span>วันสิ้นสุดลา</span><input type="date" name="leave-prod-end" value="2026-10-28"></label></div><div class="leave-prod-date-preview" data-count-preview></div></div>' +
          '<div class="leave-prod-form-section"><div class="leave-prod-form-title"><span>03</span><div><b>เลือกรูปแบบเวลา</b><small>เต็มวัน ครึ่งวันเช้า ครึ่งวันบ่าย หรือรายชั่วโมง</small></div></div><div class="leave-prod-duration-grid">' + durationChoice('F','เต็มวัน','คิดตามวันทำงาน','calendar',true) + durationChoice('AM','ครึ่งวันเช้า','0.5 วัน','clock',false) + durationChoice('PM','ครึ่งวันบ่าย','0.5 วัน','clock',false) + durationChoice('H','รายชั่วโมง','ทุก 15 นาที','clock',false) + '</div><div class="leave-prod-hourly-row" hidden><label><span>เวลาเริ่ม</span><select name="leave-prod-start-time"></select></label><label><span>เวลาสิ้นสุด</span><select name="leave-prod-end-time"></select></label><em>Production: 09:00–17:30 · ทุก 15 นาที</em></div></div>' +
          '<div class="leave-prod-form-section leave-prod-detail-section"><div class="leave-prod-form-title"><span>04</span><div><b>รายละเอียดการลา</b><small>กรอกเหตุผลให้ผู้อนุมัติเข้าใจได้ในครั้งเดียว</small></div></div><label class="leave-prod-detail-field"><span>เหตุผล / รายละเอียด</span><textarea name="leave-prod-reason" rows="4" placeholder="เช่น เดินทางกับครอบครัว"></textarea></label></div>' +
          '<div class="leave-prod-form-section leave-prod-approver-section"><div class="leave-prod-form-title"><span>05</span><div><b>สายการอนุมัติ</b><small>Production โหลดอัตโนมัติตาม UID และสังกัด และแสดงชื่อ + Role ตามลำดับ</small></div></div><div class="leave-prod-approver-list">' + approverRows() + '</div><p class="leave-prod-approver-note">' + svg('shield') + '<span>ระบบจะตรวจสายอนุมัติล่าสุดอีกครั้งก่อนบันทึกจริง</span></p></div>' +
          '<div class="leave-prod-form-section leave-prod-attachment-section"><div class="leave-prod-form-title"><span>06</span><div><b>ไฟล์เอกสารแนบ</b><small>แยกจากรายละเอียดตาม Production เพื่อให้เห็นไฟล์ชัดเจน</small></div></div><label class="leave-prod-upload leave-prod-upload-wide"><input type="file" multiple accept="image/jpeg,image/png,application/pdf"><span>' + svg('upload') + '</span><div><b>เลือกไฟล์ หรือวางไฟล์ที่นี่</b><small>JPG / PNG / PDF · สูงสุด 3 ไฟล์</small><em>LIFF Production: ไม่เกิน 2 MB/ไฟล์ · รวมไม่เกิน 4 MB</em></div><strong>เลือกไฟล์</strong></label></div>' +
          '<div class="leave-prod-review-strip">' +
            '<div><small>ประเภทลา</small><b data-summary-type>ลาพักร้อน</b><em data-summary-en>VACATION</em></div>' +
            '<div><small>ช่วงวันที่</small><b data-summary-range>26–28 OCT 26</b><em data-summary-duration>เต็มวัน</em></div>' +
            '<div><small>ใช้ครั้งนี้</small><b><span data-summary-days>3</span> วัน</b><em>ก่อนลา <span data-summary-before>12 วัน</span></em></div>' +
            '<div><small>คงเหลือหลังลา</small><b data-summary-after>9 วัน</b><em>ระบบจะ re-check ก่อนส่ง</em></div>' +
          '</div>' +
          '<div class="leave-prod-submit-row"><span class="leave-prod-safe-note">' + svg('shield') + '<span><b>ตรวจสิทธิ์ วันทำงาน สายอนุมัติ และไฟล์แนบก่อนบันทึก</b><small>Design Preview นี้ยังไม่ส่งข้อมูลจริง</small></span></span><button type="submit">ตรวจสอบและส่งคำขอ ' + svg('arrow') + '</button></div><p class="leave-prod-form-feedback" aria-live="polite"></p>' +
        '</form>' +
      '</section>' +

      '<section id="leave-prod-history" class="leave-prod-board leave-prod-history">' +
        '<div class="leave-prod-board-head"><div><span class="leave-prod-board-icon purple">' + svg('file') + '</span><span><small>REQUEST HISTORY</small><h2>คำขอลาของฉัน</h2><p>ดูสถานะ ไฟล์แนบ และขั้นตอนการอนุมัติแบบเดียวกับ Production</p></span></div><span class="leave-prod-head-pill">4 รายการ</span></div>' +
        '<div class="leave-prod-toolbar"><div class="leave-prod-search"><span>' + svg('file') + '</span><input type="search" placeholder="ค้นหาเลขคำขอ ประเภท หรือเหตุผล..." data-history-search></div><select data-history-month><option value="">ทุกเดือน</option><option value="10">ตุลาคม</option><option value="09">กันยายน</option></select><div class="leave-prod-status-tabs"><button type="button" class="active" data-status-filter="">ทั้งหมด</button><button type="button" data-status-filter="Pending">รออนุมัติ</button><button type="button" data-status-filter="Approved">อนุมัติแล้ว</button><button type="button" data-status-filter="Revise">ต้องแก้ไข</button></div></div>' +
        '<div class="leave-prod-request-list">' + requests.map(requestRow).join('') + '</div>' +
      '</section>' +
      approvalSection() +
      '<p class="leave-prod-footer-note">Design Preview · UX อ้างอิง app-leave-GAS Production · ไม่ส่งข้อมูลจริง</p>' +
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
    set('[data-summary-duration]',durationLabel(calc.duration));
    set('[data-summary-days]',String(calc.days));
    set('[data-summary-before]',p.remain + ' วัน');
    set('[data-summary-after]',after + ' วัน');

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
      const excludedText = calc.excluded.length ? ' · ไม่นับ ' + calc.excluded.length + ' วันหยุด' : ' · ไม่มีวันหยุดในช่วงที่เลือก';
      preview.innerHTML = '<span>' + svg('check') + '</span><b>ระบบนับเป็น ' + calc.days + ' วันลา</b><em>' + fmtRange(calc.start,calc.end) + excludedText + '</em>';
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

    root.querySelector('#leave-prod-form')?.addEventListener('submit', event => {
      event.preventDefault();
      const feedback = root.querySelector('.leave-prod-form-feedback');
      if (feedback) feedback.textContent = 'ตรวจข้อมูลครบแล้ว · Design Preview ยังไม่ส่งข้อมูลจริง';
    });

    root.querySelectorAll('[data-toggle-request]').forEach(btn => btn.addEventListener('click', () => {
      const panel = root.querySelector('[data-request-detail="' + btn.dataset.toggleRequest + '"]');
      if (!panel) return;
      panel.hidden = !panel.hidden;
      btn.textContent = panel.hidden ? 'ดูรายละเอียด' : 'ซ่อนรายละเอียด';
    }));

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
