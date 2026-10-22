(function () {
  'use strict';

  function svg(name) {
    return typeof icon === 'function' ? icon(name) : '';
  }

  function role() {
    return new URLSearchParams(window.location.search || '').get('role') || 'employee';
  }

  function overviewLeaveStats() {
    if (typeof personalLeaveStatsBlock === 'function') return personalLeaveStatsBlock();
    return '';
  }

  function overviewCalendar() {
    if (typeof calendarBlock === 'function') return calendarBlock();
    return '';
  }

  function leaveHero() {
    return '<section class="dashboard-hero-v2 leave-v3-hero">' +
      '<div class="hero-v2-grid"></div>' +
      '<div class="dashboard-hero-copy">' +
        '<span class="dashboard-kicker"><span class="live-dot"></span> <span data-leave-v3-date></span> เวลา <time class="dashboard-live-clock" data-leave-v3-clock></time></span>' +
        '<h1><span>LEAVE</span> <em>WORKSPACE</em></h1>' +
        '<p>จัดการสิทธิ์ ยื่นคำขอ และติดตามสถานะการลา</p>' +
      '</div>' +
      '<div class="dashboard-orb" aria-hidden="true">' +
        '<span class="orb-ring ring-a"></span>' +
        '<span class="orb-ring ring-b"></span>' +
        '<span class="orb-ring ring-c"></span>' +
        '<span class="orb-core"><small>สิทธิ์คงเหลือ</small><strong>18<span>วัน</span></strong></span>' +
        '<span class="orb-float orb-float-a"><b>12</b><small>พักร้อนคงเหลือ</small></span>' +
        '<span class="orb-float orb-float-b"><b>4</b><small>ลาป่วยคงเหลือ</small></span>' +
        '<span class="orb-float orb-float-c"><b>2</b><small>ลากิจคงเหลือ</small></span>' +
        '<span class="orb-float orb-float-d"><b>2</b><small>รออนุมัติ</small></span>' +
        '<span class="orb-float orb-float-e"><b>1</b><small>ต้องแก้ไข</small></span>' +
        '<span class="orb-float orb-float-f"><b>3</b><small>ทีมกำลังลา</small></span>' +
        '<i class="dashboard-star dashboard-star-a"></i>' +
        '<i class="dashboard-star dashboard-star-b"></i>' +
        '<i class="dashboard-star dashboard-star-c"></i>' +
      '</div>' +
      '<div class="hero-v2-shine"></div>' +
    '</section>';
  }

  function requestTypeCard(type, english, title, remain, iconName, tone, selected) {
    return '<label class="today-overview-card request-card leave-v3-type-card ' + tone + (selected ? ' is-selected' : '') + '">' +
      '<input type="radio" name="leave-v3-type" value="' + type + '"' + (selected ? ' checked' : '') + '>' +
      '<span class="today-card-head">' +
        '<span class="today-overview-icon">' + svg(iconName) + '</span>' +
        '<span class="today-card-title"><small>' + english + '</small><b>' + title + '</b></span>' +
        '<span class="today-card-badge request-pending">' + svg('calendar') + '<strong>' + remain + '</strong><em>วันคงเหลือ</em></span>' +
      '</span>' +
      '<span class="today-detail-full"><span>เลือกประเภทการลา</span><span>ระบบจะตรวจสิทธิ์อีกครั้งก่อนส่งคำขอ</span></span>' +
    '</label>';
  }

  function requestFormBoard() {
    return '<section class="dashboard-board activity-board today-overview-board leave-v3-request-board">' +
      '<div class="board-head">' +
        '<div class="board-title"><span class="board-icon teal">' + svg('calendar') + '</span><span><b>ยื่นคำขอลา</b><small>NEW LEAVE REQUEST</small></span></div>' +
        '<span class="board-live">' + svg('check') + 'กรอก 3 ขั้นตอน</span>' +
      '</div>' +
      '<form id="leave-v3-form" class="leave-v3-form">' +
        '<div class="leave-v3-step-head"><span>01</span><div><b>เลือกประเภทการลา</b><small>เลือกสิทธิ์ที่ต้องการใช้</small></div></div>' +
        '<div class="today-overview-grid leave-v3-type-grid">' +
          requestTypeCard('vacation','VACATION','ลาพักร้อน','12','beach','leave',true) +
          requestTypeCard('sick','SICK LEAVE','ลาป่วย','4','medicalCross','medical',false) +
          requestTypeCard('business','BUSINESS','ลากิจ','2','briefcase','ot',false) +
        '</div>' +

        '<div class="leave-v3-step-head"><span>02</span><div><b>วันที่และระยะเวลา</b><small>กำหนดวันลาและรูปแบบการลา</small></div></div>' +
        '<div class="leave-v3-form-row">' +
          '<label class="leave-v3-field"><span>วันเริ่มลา</span><input type="date" name="leave-v3-start" value="2026-10-26"></label>' +
          '<label class="leave-v3-field"><span>วันสิ้นสุดลา</span><input type="date" name="leave-v3-end" value="2026-10-28"></label>' +
          '<label class="leave-v3-field"><span>รูปแบบ</span><select name="leave-v3-duration"><option value="full">เต็มวัน</option><option value="morning">ครึ่งวันเช้า</option><option value="afternoon">ครึ่งวันบ่าย</option><option value="hourly">รายชั่วโมง</option></select></label>' +
        '</div>' +

        '<div class="leave-v3-step-head"><span>03</span><div><b>เหตุผลและเอกสาร</b><small>ใส่ข้อมูลที่จำเป็นต่อการพิจารณา</small></div></div>' +
        '<div class="leave-v3-detail-grid">' +
          '<label class="leave-v3-field"><span>เหตุผลการลา</span><textarea name="leave-v3-reason" rows="4" placeholder="เช่น เดินทางกับครอบครัว"></textarea></label>' +
          '<label class="leave-v3-upload"><input type="file" accept="image/*,.pdf"><span class="today-overview-icon">' + svg('upload') + '</span><b>เอกสารประกอบ</b><small>JPG / PNG / PDF · ถ้ามี</small></label>' +
        '</div>' +

        '<div class="leave-v3-form-actions"><span class="rhythm-score">' + svg('shield') + 'ตรวจสิทธิ์ก่อนบันทึกจริง</span><button type="submit" class="btn primary teal-btn">ตรวจสอบและส่ง ' + svg('arrow') + '</button></div>' +
        '<p class="leave-v3-feedback" aria-live="polite"></p>' +
      '</form>' +
    '</section>';
  }

  function summaryBoard() {
    return '<section class="dashboard-board status-board leave-v3-summary-board">' +
      '<div class="board-head">' +
        '<div class="board-title"><span class="board-icon purple">' + svg('file') + '</span><span><b>สรุปคำขอ</b><small>REQUEST SUMMARY</small></span></div>' +
        '<span class="rhythm-score leave-v3-summary-ready">' + svg('check') + 'พร้อมตรวจสอบ</span>' +
      '</div>' +
      '<article class="today-overview-card requests today-requests-summary is-static leave-v3-summary-card">' +
        '<span class="today-card-head">' +
          '<span class="today-overview-icon">' + svg('beach') + '</span>' +
          '<span class="today-card-title"><small data-summary-en>VACATION</small><b data-summary-type>ลาพักร้อน</b></span>' +
          '<span class="today-card-badge request-count">' + svg('calendar') + '<strong data-summary-days>3</strong><em>วัน</em></span>' +
        '</span>' +
        '<span class="today-mini-stats request-stats leave-v3-summary-stats">' +
          '<span class="mini-stat leave"><small>ก่อนลา</small><b data-summary-before>12</b></span>' +
          '<span class="mini-stat ot"><small>ใช้ครั้งนี้</small><b data-summary-use>3</b></span>' +
          '<span class="mini-stat correction"><small>หลังลา</small><b data-summary-after>9</b></span>' +
          '<span class="mini-stat medical"><small>ผู้อนุมัติ</small><b>2</b></span>' +
        '</span>' +
      '</article>' +
      '<div class="status-list-rich leave-v3-summary-list">' +
        '<div class="status-row-rich"><span class="status-dot-rich teal"></span><span><b>ช่วงวันที่</b></span><span class="status-bar-rich"><i style="width:100%"></i></span><strong data-summary-period>26–28 OCT 26</strong></div>' +
        '<div class="status-row-rich"><span class="status-dot-rich purple"></span><span><b>หัวหน้าตรง</b></span><span class="status-bar-rich leave-bar-purple"><i style="width:50%"></i></span><strong>ขั้นที่ 1</strong></div>' +
        '<div class="status-row-rich"><span class="status-dot-rich amber"></span><span><b>HR</b></span><span class="status-bar-rich leave-bar-amber"><i style="width:100%"></i></span><strong>ขั้นที่ 2</strong></div>' +
      '</div>' +
    '</section>';
  }

  function leaveStatusBoard() {
    return '<section class="dashboard-board leave-board leave-v3-status-board">' +
      '<div class="board-head"><div class="board-title"><span class="board-icon purple">' + svg('calendar') + '</span><span><b>สถานะคำขอ</b><small>LEAVE STATUS</small></span></div><span class="rhythm-score leave-score">' + svg('clock') + '2 รอดำเนินการ</span></div>' +
      '<div class="status-score-rich leave-score-rich"><strong>คำขอปีนี้ <span>4 รายการ</span></strong></div>' +
      '<div class="status-list-rich leave-list-rich">' +
        '<div class="status-row-rich"><span class="status-dot-rich teal"></span><span><b>อนุมัติแล้ว 1</b></span><span class="status-bar-rich"><i style="width:25%"></i></span><strong>25%</strong></div>' +
        '<div class="status-row-rich"><span class="status-dot-rich purple"></span><span><b>รออนุมัติ 1</b></span><span class="status-bar-rich leave-bar-purple"><i style="width:25%"></i></span><strong>25%</strong></div>' +
        '<div class="status-row-rich"><span class="status-dot-rich amber"></span><span><b>ต้องแก้ไข / ยกเลิก 2</b></span><span class="status-bar-rich leave-bar-amber"><i style="width:50%"></i></span><strong>50%</strong></div>' +
      '</div>' +
    '</section>';
  }

  function myRequestsBoard() {
    var cards = [
      {status:'รออนุมัติ',cls:'is-pending',id:'LEV-0048',date:'22 Oct 26',period:'26–28 Oct 26 | 3 วัน',reason:'เดินทางกับครอบครัว'},
      {status:'อนุมัติแล้ว',cls:'is-approved',id:'LEV-0043',date:'11 Oct 26',period:'12 Oct 26 | 1 วัน',reason:'ติดต่อหน่วยงานราชการ'},
      {status:'ต้องแก้ไข',cls:'is-revision',id:'LEV-0041',date:'7 Oct 26',period:'7 Oct 26 | 1 วัน',reason:'HR ขอเอกสารประกอบเพิ่มเติม'},
      {status:'ยกเลิก',cls:'is-cancelled',id:'LEV-0038',date:'29 Sep 26',period:'30 Sep–2 Oct 26 | 3 วัน',reason:'ยกเลิกโดยผู้ยื่น'}
    ].map(function (item, idx) {
      var iconName = idx === 2 ? 'medicalCross' : idx === 1 ? 'briefcase' : 'calendar';
      var english = idx === 2 ? 'SICK LEAVE' : idx === 1 ? 'BUSINESS' : 'VACATION';
      var title = idx === 2 ? 'ลาป่วย' : idx === 1 ? 'ลากิจ' : 'ลาพักร้อน';
      return '<article class="today-overview-card activity leave is-static leave-v3-history-card">' +
        '<span class="today-card-head"><span class="today-overview-icon">' + svg(iconName) + '</span><span class="today-card-title"><small>' + english + '</small><b>' + title + '</b></span>' +
        '<span class="today-card-status-stack"><span class="today-card-badge activity-status ' + item.cls + '">' + svg(item.status === 'ยกเลิก' || item.status === 'ต้องแก้ไข' ? 'alert' : item.status === 'รออนุมัติ' ? 'clock' : 'check') + '<strong>' + item.status + '</strong></span><small class="today-card-request-id">' + item.id + '</small></span></span>' +
        '<span class="today-detail-full activity-detail-pro"><span>วันคำขอ : ' + item.date + '</span><span class="activity-person-line">นักวิเคราะห์ | Team B | บัญชี</span><span>วันที่ลา : ' + item.period + '</span><span>เหตุผล : ' + item.reason + '</span></span>' +
      '</article>';
    }).join('');

    return '<section class="dashboard-board activity-board today-overview-board is-approver-view leave-v3-history-board">' +
      '<div class="board-head"><div class="board-title"><span class="board-icon amber">' + svg('file') + '</span><span><b>คำขอของฉัน</b><small>MY REQUESTS</small></span></div><span class="board-live">' + svg('check') + '4 รายการ</span></div>' +
      '<div class="today-overview-grid">' + cards + '</div>' +
    '</section>';
  }

  function approvalBoard() {
    if (role() === 'employee') return '';
    var items = [
      {route:'approvals',tone:'leave',icon:'calendar',english:'VACATION',title:'ลาพักร้อน',pendingCount:'3',pendingLabel:'วัน',name:'คุณจิรัญญา พลเจริญ (Jo)',dateTime:'26–28 Oct 26 · Team B',reason:'เดินทางกับครอบครัว'},
      {route:'approvals',tone:'medical',icon:'medicalCross',english:'SICK LEAVE',title:'ลาป่วย',pendingCount:'1',pendingLabel:'วัน',name:'คุณอธิป ศรีสุข (Top)',dateTime:'23 Oct 26 · Team B',reason:'ไม่สบาย · มีเอกสารแนบ'},
      {route:'approvals',tone:'ot',icon:'briefcase',english:'BUSINESS',title:'ลากิจ',pendingCount:'1',pendingLabel:'วัน',name:'คุณกาญจนา นุกูลการ',dateTime:'27 Oct 26 · Team A',reason:'ติดต่อหน่วยงานราชการ'}
    ];
    var cards = items.map(function (item) {
      return typeof dashboardRequestCard === 'function' ? dashboardRequestCard(item) : '';
    }).join('');
    return '<section class="dashboard-board activity-board today-overview-board is-employee-view leave-v3-approval-board">' +
      '<div class="board-head"><div class="board-title"><span class="board-icon purple">' + svg('check') + '</span><span><b>คำขอที่รอคุณพิจารณา</b><small>APPROVAL QUEUE</small></span></div><span class="board-live">' + svg('clock') + '5 รออนุมัติ</span></div>' +
      '<div class="today-overview-grid">' + cards + '</div>' +
    '</section>';
  }

  function buildMarkup() {
    return '<div class="leave-v3-page dashboard-v2">' +
      leaveHero() +
      '<section class="dashboard-deck dashboard-deck-cards leave-v3-deck">' +
        requestFormBoard() +
        summaryBoard() +
        leaveStatusBoard() +
        overviewLeaveStats() +
      '</section>' +
      myRequestsBoard() +
      approvalBoard() +
      overviewCalendar() +
      '<p class="leave-v3-footer-note">ต้นแบบ UX/UI · ข้อมูลตัวอย่าง · การบันทึกจริงต้องใช้ API และสิทธิ์จากเซิร์ฟเวอร์</p>' +
    '</div>';
  }

  function typeInfo(type) {
    if (type === 'sick') return {title:'ลาป่วย',en:'SICK LEAVE',remain:4};
    if (type === 'business') return {title:'ลากิจ',en:'BUSINESS',remain:2};
    return {title:'ลาพักร้อน',en:'VACATION',remain:12};
  }

  function daysBetween(start, end, duration) {
    if (!start || !end) return 0;
    var s = new Date(start + 'T00:00:00');
    var e = new Date(end + 'T00:00:00');
    var n = Math.max(0, Math.round((e - s) / 86400000) + 1);
    if (duration === 'morning' || duration === 'afternoon') return n ? 0.5 : 0;
    if (duration === 'hourly') return n ? 0.25 : 0;
    return n;
  }

  function periodText(start, end) {
    if (!start || !end) return 'ยังไม่เลือกวันที่';
    var mon = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    var s = new Date(start + 'T00:00:00');
    var e = new Date(end + 'T00:00:00');
    if (s.getMonth() === e.getMonth()) return s.getDate() + '–' + e.getDate() + ' ' + mon[e.getMonth()] + ' ' + String(e.getFullYear()).slice(-2);
    return s.getDate() + ' ' + mon[s.getMonth()] + '–' + e.getDate() + ' ' + mon[e.getMonth()] + ' ' + String(e.getFullYear()).slice(-2);
  }

  function updateSummary(root) {
    var checked = root.querySelector('[name="leave-v3-type"]:checked');
    var type = checked ? checked.value : 'vacation';
    var info = typeInfo(type);
    var start = root.querySelector('[name="leave-v3-start"]')?.value || '';
    var end = root.querySelector('[name="leave-v3-end"]')?.value || '';
    var duration = root.querySelector('[name="leave-v3-duration"]')?.value || 'full';
    var days = daysBetween(start,end,duration);

    var set = function (sel, value) { var el = root.querySelector(sel); if (el) el.textContent = value; };
    set('[data-summary-en]', info.en);
    set('[data-summary-type]', info.title);
    set('[data-summary-days]', String(days));
    set('[data-summary-before]', String(info.remain));
    set('[data-summary-use]', String(days));
    set('[data-summary-after]', String(Math.max(0, info.remain - days)));
    set('[data-summary-period]', periodText(start,end));

    root.querySelectorAll('.leave-v3-type-card').forEach(function (card) {
      var radio = card.querySelector('input');
      card.classList.toggle('is-selected', !!radio && radio.checked);
    });
  }

  function updateClock(root) {
    var now = new Date();
    var d = root.querySelector('[data-leave-v3-date]');
    var t = root.querySelector('[data-leave-v3-clock]');
    if (d) d.textContent = now.toLocaleDateString('th-TH', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if (t) t.textContent = now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }

  function bind(root) {
    updateClock(root);
    updateSummary(root);

    root.querySelectorAll('[name="leave-v3-type"],[name="leave-v3-start"],[name="leave-v3-end"],[name="leave-v3-duration"]').forEach(function (el) {
      el.addEventListener('change', function () { updateSummary(root); });
    });

    var form = root.querySelector('#leave-v3-form');
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      var feedback = root.querySelector('.leave-v3-feedback');
      if (feedback) feedback.textContent = 'ตรวจสอบข้อมูลครบแล้ว · Design Preview ยังไม่ส่งข้อมูลจริง';
    });

    var timer = window.setInterval(function () {
      if (!document.body.contains(root)) {
        window.clearInterval(timer);
        return;
      }
      updateClock(root);
    },1000);
  }

  function mount() {
    if (!window.location.hash.startsWith('#leave')) return;
    var workspace = document.querySelector('.leave-workspace');
    if (!workspace || workspace.dataset.leaveV3 === 'true') return;

    workspace.dataset.leaveV3 = 'true';
    var prototypeNote = document.querySelector('.page-shell.leave-page > .prototype-note');
    if (prototypeNote) prototypeNote.hidden = true;

    workspace.innerHTML = buildMarkup();
    bind(workspace);
  }

  window.addEventListener('hashchange', function () { window.setTimeout(mount,30); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.setTimeout(mount,0); });
  } else {
    window.setTimeout(mount,0);
  }
}());
