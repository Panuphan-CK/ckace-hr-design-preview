(function () {
  'use strict';

  var leaveMarkup = `
    <div class="leave-rebuild-page">
      <section class="leave-rebuild-hero" aria-labelledby="leave-rebuild-title">
        <div class="leave-rebuild-hero-copy">
          <div class="leave-rebuild-eyebrow"><span class="live-dot"></span><span class="leave-rebuild-date"></span><span class="leave-rebuild-time"></span></div>
          <p class="leave-rebuild-kicker">LEAVE CENTER</p>
          <h1 id="leave-rebuild-title">ขอลางาน <em>อย่างเป็นระบบ</em></h1>
          <p class="leave-rebuild-lead">เลือกสิทธิ์ วางแผนวันลา และติดตามสถานะคำขอได้จากหน้าเดียว</p>
          <div class="leave-rebuild-hero-actions">
            <button type="button" class="leave-rebuild-hero-button" data-leave-scroll="leave-request-section">เริ่มขอลางาน <span>↓</span></button>
            <span class="leave-rebuild-hero-note">อัปเดตข้อมูลล่าสุดแบบเรียลไทม์</span>
          </div>
        </div>
        <div class="leave-rebuild-hero-orbit" aria-hidden="true">
          <span class="leave-rebuild-orbit leave-rebuild-orbit-one"></span>
          <span class="leave-rebuild-orbit leave-rebuild-orbit-two"></span>
          <span class="leave-rebuild-orbit leave-rebuild-orbit-three"></span>
          <span class="leave-rebuild-hero-core"><small>สิทธิ์คงเหลือ</small><strong>18<span>วัน</span></strong><em>จาก 23 วัน</em></span>
          <span class="leave-rebuild-metric leave-rebuild-metric-one"><b>8</b><small>รออนุมัติ</small></span>
          <span class="leave-rebuild-metric leave-rebuild-metric-two"><b>6</b><small>ลาวันนี้</small></span>
          <span class="leave-rebuild-metric leave-rebuild-metric-three"><b>3</b><small>ทีมกำลังลา</small></span>
          <i class="leave-rebuild-star leave-rebuild-star-one"></i><i class="leave-rebuild-star leave-rebuild-star-two"></i><i class="leave-rebuild-star leave-rebuild-star-three"></i>
        </div>
      </section>

      <nav class="leave-rebuild-tabs" aria-label="ส่วนของหน้าการลา">
        <div class="leave-rebuild-tabs-title"><span class="leave-rebuild-tabs-icon">✦</span><span><b>LEAVE WORKSPACE</b><small>จัดการเรื่องลาจากหน้าเดียว</small></span></div>
        <div class="leave-rebuild-tab-list">
          <button class="is-active" type="button" data-leave-scroll="leave-request-section"><span>01</span><b>ขอลางาน</b><small>สร้างคำขอใหม่</small></button>
          <button type="button" data-leave-scroll="leave-statistics-section"><span>02</span><b>สถิติลา</b><small>สิทธิ์และภาพรวม</small></button>
          <button type="button" data-leave-scroll="leave-history-section"><span>03</span><b>ประวัติลา</b><small>ติดตามคำขอเดิม</small></button>
        </div>
      </nav>

      <section id="leave-request-section" class="leave-rebuild-section leave-rebuild-request" aria-labelledby="leave-request-title">
        <div class="leave-rebuild-section-heading">
          <div><p class="leave-rebuild-section-kicker">01 / REQUEST LEAVE</p><h2 id="leave-request-title">ขออนุญาตลางาน</h2><p>กรอกข้อมูลตามลำดับ แล้วส่งให้หัวหน้าตรวจสอบ</p></div>
          <span class="leave-rebuild-heading-status"><i></i> ยังไม่ได้ส่งคำขอ</span>
        </div>
        <div class="leave-rebuild-request-layout">
          <form id="leave-rebuild-form" class="leave-rebuild-form" novalidate>
            <div class="leave-rebuild-step">
              <span class="leave-rebuild-step-number">01</span><div><b>เลือกประเภทลา</b><small>สิทธิ์คงเหลืออัปเดตตามประเภทที่เลือก</small></div>
            </div>
            <div class="leave-rebuild-type-grid" role="radiogroup" aria-label="ประเภทลา">
              <label class="leave-rebuild-type-card is-selected" data-leave-type="vacation"><input type="radio" name="leave-type" value="vacation" checked><span class="leave-rebuild-type-icon">☼</span><span><b>ลาพักร้อน</b><small>Vacation · เหลือ 12 วัน</small></span><strong>03 / 15</strong></label>
              <label class="leave-rebuild-type-card" data-leave-type="business"><input type="radio" name="leave-type" value="business"><span class="leave-rebuild-type-icon">✦</span><span><b>ลากิจ</b><small>Business · เหลือ 2 วัน</small></span><strong>01 / 03</strong></label>
              <label class="leave-rebuild-type-card" data-leave-type="sick"><input type="radio" name="leave-type" value="sick"><span class="leave-rebuild-type-icon">＋</span><span><b>ลาป่วย</b><small>Sick leave · เหลือ 4 วัน</small></span><strong>01 / 05</strong></label>
            </div>

            <div class="leave-rebuild-step leave-rebuild-step-spaced">
              <span class="leave-rebuild-step-number">02</span><div><b>เลือกวันลา</b><small>กำหนดช่วงวันที่ต้องการลา</small></div>
            </div>
            <div class="leave-rebuild-date-grid">
              <label><span>วันเริ่มลา</span><input type="date" name="leave-start" value="2026-10-21"></label>
              <label><span>วันสิ้นสุดลา</span><input type="date" name="leave-end" value="2026-10-22"></label>
            </div>

            <div class="leave-rebuild-step leave-rebuild-step-spaced">
              <span class="leave-rebuild-step-number">03</span><div><b>ช่วงเวลาที่ลา</b><small>เลือกให้ตรงกับคำขอ</small></div>
            </div>
            <div class="leave-rebuild-duration-grid" role="radiogroup" aria-label="ช่วงเวลาที่ลา">
              <label class="is-selected"><input type="radio" name="leave-duration" value="full" checked><span>เต็มวัน</span><small>1 วัน</small></label>
              <label><input type="radio" name="leave-duration" value="morning"><span>ครึ่งวันเช้า</span><small>0.5 วัน</small></label>
              <label><input type="radio" name="leave-duration" value="afternoon"><span>ครึ่งวันบ่าย</span><small>0.5 วัน</small></label>
              <label><input type="radio" name="leave-duration" value="hourly"><span>รายชั่วโมง</span><small>ระบุเวลา</small></label>
            </div>

            <div class="leave-rebuild-details-grid">
              <label class="leave-rebuild-details"><span>รายละเอียด / เหตุผลการลา</span><textarea name="leave-reason" rows="3" placeholder="เช่น ไปเที่ยวกับครอบครัว หรือธุระส่วนตัว"></textarea></label>
              <label class="leave-rebuild-upload"><span>เอกสารประกอบ <small>(ถ้ามี)</small></span><input type="file" name="leave-attachment" accept="image/*,.pdf"><b>วางไฟล์ที่นี่ หรือคลิกเพื่อเลือก</b><small>JPG, PNG หรือ PDF · สูงสุด 3 ไฟล์</small></label>
            </div>
            <div class="leave-rebuild-submit-row"><span class="leave-rebuild-approval"><i>✓</i><span><b>เส้นทางอนุมัติ</b><small>หัวหน้าตรง · HR</small></span></span><button class="leave-rebuild-submit" type="submit">ส่งคำขอลา <span>→</span></button></div>
            <p class="leave-rebuild-feedback" aria-live="polite"></p>
          </form>

          <aside class="leave-rebuild-side-stack" aria-label="สรุปสิทธิ์และกำลังจะลา">
            <article class="leave-rebuild-side-card leave-rebuild-balance-card">
              <div class="leave-rebuild-card-head"><div><p>MY BALANCE</p><h3>สิทธิ์ของฉัน</h3></div><span>ปี 2569</span></div>
              <div class="leave-rebuild-balance-total"><strong>18</strong><span>วัน<br><small>คงเหลือรวม</small></span></div>
              <div class="leave-rebuild-mini-progress"><div><span><b>พักร้อน</b><em>80%</em></span><i><u style="width:80%"></u></i></div><div><span><b>ลากิจ</b><em>67%</em></span><i><u style="width:67%"></u></i></div><div><span><b>ลาป่วย</b><em>80%</em></span><i><u style="width:80%"></u></i></div></div>
              <button type="button" class="leave-rebuild-text-link" data-leave-scroll="leave-statistics-section">ดูรายละเอียดสิทธิ์ <span>→</span></button>
            </article>
            <article class="leave-rebuild-side-card leave-rebuild-upcoming-card">
              <div class="leave-rebuild-card-head"><div><p>UPCOMING LEAVE</p><h3>กำลังจะลา</h3></div><span class="leave-rebuild-count-chip">3 คน</span></div>
              <ul class="leave-rebuild-upcoming-list"><li><b>21</b><span><strong>นภัสสร ใจดี</strong><small>ลาพักร้อน · 2 วัน</small></span><em>ลา</em></li><li><b>22</b><span><strong>อธิป วัฒนกุล</strong><small>ลาพักร้อน · 1 วัน</small></span><em>ลา</em></li><li><b>20</b><span><strong>กาญจนา นุกูลการ</strong><small>ลากิจ · 1 วัน</small></span><em>ลา</em></li></ul>
            </article>
          </aside>
        </div>
      </section>

      <section id="leave-statistics-section" class="leave-rebuild-section leave-rebuild-statistics" aria-labelledby="leave-statistics-title">
        <div class="leave-rebuild-section-heading"><div><p class="leave-rebuild-section-kicker">02 / LEAVE STATISTICS</p><h2 id="leave-statistics-title">สถิติการลา</h2><p>ดูภาพรวมการลา สิทธิ์ของฉัน และจังหวะการลาของทีม</p></div><span class="leave-rebuild-heading-period">ข้อมูลเดือนตุลาคม 2569</span></div>
        <div class="leave-rebuild-stat-grid">
          <article class="leave-rebuild-stat-card leave-rebuild-stat-team"><div class="leave-rebuild-stat-top"><span class="leave-rebuild-stat-icon">◌</span><span><p>TEAM LEAVE</p><small>ทีมลาวันนี้</small></span><strong>06</strong></div><div class="leave-rebuild-stat-main"><b>6 คน</b><small>จากทีมทั้งหมด 103 คน</small></div><div class="leave-rebuild-stat-breakdown"><span><i></i>ลาพักร้อน <b>3</b></span><span><i></i>ลากิจ <b>2</b></span><span><i></i>ลาป่วย <b>1</b></span></div></article>
          <article class="leave-rebuild-stat-card leave-rebuild-stat-personal"><div class="leave-rebuild-stat-top"><span class="leave-rebuild-stat-icon">✦</span><span><p>MY LEAVE</p><small>สิทธิ์ของฉัน</small></span><strong>18</strong></div><div class="leave-rebuild-stat-main"><b>18 วัน</b><small>เหลือจากสิทธิ์รวม 23 วัน</small></div><div class="leave-rebuild-stat-ring"><span>78%<small>คงเหลือ</small></span></div><div class="leave-rebuild-stat-caption"><span>ใช้ไป 5 วัน</span><span>เหลือ 18 วัน</span></div></article>
          <article class="leave-rebuild-stat-card leave-rebuild-stat-trend"><div class="leave-rebuild-stat-top"><span class="leave-rebuild-stat-icon">↗</span><span><p>LEAVE TREND</p><small>แนวโน้ม 7 วัน</small></span><strong>03</strong></div><div class="leave-rebuild-trend-bars"><span style="height:36%"><b>จ.</b></span><span style="height:56%"><b>อ.</b></span><span style="height:78%"><b>พ.</b></span><span style="height:44%"><b>พฤ.</b></span><span style="height:68%"><b>ศ.</b></span><span style="height:25%"><b>ส.</b></span><span style="height:48%"><b>อา.</b></span></div><small class="leave-rebuild-trend-note">วันลาเฉลี่ย 1.4 คน / วัน</small></article>
        </div>
        <div class="leave-rebuild-entitlements"><div class="leave-rebuild-entitlements-heading"><div><p>ENTITLEMENT BREAKDOWN</p><h3>สิทธิ์ลาแยกตามประเภท</h3></div><span>ใช้ไป / ทั้งหมด</span></div><div class="leave-rebuild-entitlement-list"><div><span class="leave-rebuild-entitlement-dot vacation"></span><b>ลาพักร้อน</b><small>Vacation</small><strong>3 / 15 วัน</strong><i><u style="width:20%"></u></i><em>เหลือ 12 วัน</em></div><div><span class="leave-rebuild-entitlement-dot business"></span><b>ลากิจ</b><small>Business</small><strong>1 / 3 วัน</strong><i><u style="width:33%"></u></i><em>เหลือ 2 วัน</em></div><div><span class="leave-rebuild-entitlement-dot sick"></span><b>ลาป่วย</b><small>Sick leave</small><strong>1 / 5 วัน</strong><i><u style="width:20%"></u></i><em>เหลือ 4 วัน</em></div></div></div>
      </section>

      <section id="leave-history-section" class="leave-rebuild-section leave-rebuild-history" aria-labelledby="leave-history-title">
        <div class="leave-rebuild-section-heading"><div><p class="leave-rebuild-section-kicker">03 / LEAVE HISTORY</p><h2 id="leave-history-title">ประวัติการลา</h2><p>ติดตามสถานะคำขอที่ผ่านมาและรายการที่ปิดแล้ว</p></div><span class="leave-rebuild-heading-period">3 รายการ</span></div>
        <div class="leave-rebuild-history-toolbar"><div class="leave-rebuild-filter-list"><button class="is-active" type="button">ทั้งหมด <b>3</b></button><button type="button">รออนุมัติ <b>1</b></button><button type="button">อนุมัติแล้ว <b>2</b></button></div><button type="button" class="leave-rebuild-export">ส่งออกประวัติ <span>↓</span></button></div>
        <div class="leave-rebuild-history-table" role="table" aria-label="ประวัติการลา"><div class="leave-rebuild-history-header" role="row"><span>รายการลา</span><span>ช่วงวันที่</span><span>จำนวน</span><span>สถานะ</span><span></span></div><div class="leave-rebuild-history-row" role="row"><span class="leave-rebuild-history-kind vacation"><i>☼</i><b>ลาพักร้อน</b><small>LV-2026-0108</small></span><span><b>21–22 ตุลาคม 2569</b><small>ส่งเมื่อ 16 ตุลาคม 2569</small></span><strong>2 วัน</strong><em class="pending">รออนุมัติ</em><button type="button" aria-label="ดูรายละเอียดลาพักร้อน">→</button></div><div class="leave-rebuild-history-row" role="row"><span class="leave-rebuild-history-kind business"><i>✦</i><b>ลากิจ</b><small>LV-2026-0104</small></span><span><b>04 ตุลาคม 2569</b><small>ปิดรายการแล้ว</small></span><strong>1 วัน</strong><em class="approved">อนุมัติแล้ว</em><button type="button" aria-label="ดูรายละเอียดลากิจ">→</button></div><div class="leave-rebuild-history-row" role="row"><span class="leave-rebuild-history-kind sick"><i>＋</i><b>ลาป่วย</b><small>LV-2026-0092</small></span><span><b>28 กันยายน 2569</b><small>ครึ่งวัน</small></span><strong>0.5 วัน</strong><em class="approved">อนุมัติแล้ว</em><button type="button" aria-label="ดูรายละเอียดลาป่วย">→</button></div></div>
      </section>
      <p class="leave-rebuild-footer-note">ข้อมูลตัวอย่างสำหรับต้นแบบ UX/UI · การบันทึกจริงต้องใช้ API และสิทธิ์จากเซิร์ฟเวอร์</p>
    </div>`;

  function updateClock(root) {
    var now = new Date();
    var date = now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    var time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    var dateNode = root.querySelector('.leave-rebuild-date');
    var timeNode = root.querySelector('.leave-rebuild-time');
    if (dateNode) dateNode.textContent = date;
    if (timeNode) timeNode.textContent = 'เวลา ' + time;
  }

  function bind(root) {
    updateClock(root);
    root.querySelectorAll('[data-leave-scroll]').forEach(function (button) {
      button.addEventListener('click', function () {
        var section = document.getElementById(button.dataset.leaveScroll);
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        root.querySelectorAll('.leave-rebuild-tab-list button').forEach(function (item) {
          item.classList.toggle('is-active', item.dataset.leaveScroll === button.dataset.leaveScroll);
        });
      });
    });
    root.querySelectorAll('.leave-rebuild-type-card').forEach(function (card) {
      card.addEventListener('click', function () {
        root.querySelectorAll('.leave-rebuild-type-card').forEach(function (item) { item.classList.remove('is-selected'); });
        card.classList.add('is-selected');
        var radio = card.querySelector('input');
        if (radio) radio.checked = true;
      });
    });
    root.querySelectorAll('.leave-rebuild-duration-grid label').forEach(function (card) {
      card.addEventListener('click', function () {
        root.querySelectorAll('.leave-rebuild-duration-grid label').forEach(function (item) { item.classList.remove('is-selected'); });
        card.classList.add('is-selected');
      });
    });
    root.querySelectorAll('.leave-rebuild-filter-list button').forEach(function (button) {
      button.addEventListener('click', function () {
        root.querySelectorAll('.leave-rebuild-filter-list button').forEach(function (item) { item.classList.remove('is-active'); });
        button.classList.add('is-active');
      });
    });
    var form = root.querySelector('#leave-rebuild-form');
    var feedback = root.querySelector('.leave-rebuild-feedback');
    if (form) form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (feedback) feedback.textContent = 'บันทึกคำขอไว้เป็นแบบร่างแล้ว · ตรวจสอบข้อมูลก่อนส่งจริง';
    });
    root.querySelectorAll('.leave-rebuild-upload').forEach(function (box) {
      box.addEventListener('click', function () { var input = box.querySelector('input'); if (input) input.click(); });
    });
    window.setInterval(function () { if (document.body.contains(root)) updateClock(root); }, 1000);
  }

  function mount() {
    if (window.location.hash !== '#leave') return;
    var workspace = document.querySelector('.leave-workspace');
    if (!workspace || workspace.dataset.leaveRebuild === 'true') return;
    workspace.dataset.leaveRebuild = 'true';
    var prototypeNote = document.querySelector('.page-shell.leave-page > .prototype-note');
    if (prototypeNote) prototypeNote.hidden = true;
    workspace.innerHTML = leaveMarkup;
    bind(workspace);
  }

  window.addEventListener('hashchange', function () { window.setTimeout(mount, 50); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { window.setTimeout(mount, 0); });
  else window.setTimeout(mount, 0);
}());
