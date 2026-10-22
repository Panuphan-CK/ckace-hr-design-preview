const glyphs = {
  spark: '<path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6zM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
  people: '<path d="M16 20v-1.5a4.5 4.5 0 0 0-9 0V20M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 11a3 3 0 0 0-1.5-5.2M20 20v-1.2a4 4 0 0 0-2.5-3.7"/>',
  settings: '<path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/><circle cx="12" cy="12" r="4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
  alert: '<path d="m12 3 9 17H3z"/><path d="M12 9v4M12 17h.01"/>',
  beach: '<path d="M4 6.8c.5-1.5 1.7-2.3 3.3-2.2a3.1 3.1 0 0 1 5.6.7c1.6-.3 3 .5 3.5 2"/><path d="M7 9.5 10.2 14H16M10.2 14l-2.1 4M15 14l2 4M8.5 11.6h5.2"/><path d="M3 19.5c1.7-.9 3.3-.9 5 0s3.3.9 5 0 3.3-.9 5 0 3.3.9 5 0"/>',
  medicalCross: '<path d="M9 4h6v5h5v6h-5v5H9v-5H4V9h5z"/>',
  briefcase: '<rect x="4" y="7" width="16" height="12" rx="2"/><path d="M9 7V5h6v2M4 12h16M10 12v2h4v-2"/>',
  bank: '<path d="m3 10 9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  heart: '<path d="M20.8 8.8c0 5.4-8.8 10.2-8.8 10.2S3.2 14.2 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M21 12h-3"/>',
  trend: '<path d="M4 17 10 11l4 4 6-8"/><path d="M15 7h5v5"/>',
  shield: '<path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
};

function icon(name, className) {
  return '<svg class="' + (className || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (glyphs[name] || glyphs.file) + '</svg>';
}

const navItems = [
  ['dashboard', 'ภาพรวม', 'spark'], ['leave', 'ลา', 'calendar'], ['overtime', 'OT', 'clock'],
  ['attendance', 'ลงเวลา', 'target'], ['medical', 'ค่ารักษา', 'bank'], ['approvals', 'งานอนุมัติ', 'check'],
  ['reports', 'รายงาน', 'trend'], ['settings', 'ตั้งค่าระบบ', 'settings'],
];
const routes = new Set([
  'dashboard', 'leave', 'leave/request', 'leave/requests', 'leave/calendar',
  'overtime', 'overtime/request', 'overtime/requests', 'attendance', 'attendance/history',
  'correction', 'correction/request', 'correction/requests', 'medical', 'medical/request',
  'medical/requests', 'approvals', 'approvals/history', 'reports', 'settings',
]);
const modules = {
  leave: {
    title: 'ลา', eyebrow: 'LEAVE / TODAY', desc: 'เช็กสิทธิ์และส่งคำขอในหน้าเดียว',
    tone: 'teal', icon: 'calendar', value: '12 วัน', note: 'เหลือ · 2 คำขอรอติดตาม',
    metrics: [['สิทธิ์คงเหลือ', '12 วัน', 'จาก 15 วัน', 'calendar', 'teal'], ['รออนุมัติ', '2 รายการ', 'ของคุณ', 'clock', 'amber'], ['ทีมกำลังลา', '3 คน', 'สัปดาห์นี้', 'people', 'purple'], ['วันหยุดถัดไป', '23 ตุลาคม', 'วันปิยมหาราช', 'spark', 'green']],
    actions: [['leave/request', 'ยื่นคำขอลา', 'เลือกประเภทลา วันที่ และผู้อนุมัติ', 'plus', 'teal'], ['leave/requests', 'สถานะคำขอ', 'ดูคำขอที่ส่งแล้วและรายการที่ต้องแก้', 'file', 'blue'], ['leave/calendar', 'วันลาและกิจกรรมของทีม', 'เช็กคนลาและวันหยุดก่อนวางแผน', 'calendar', 'purple'], ['approvals', 'งานอนุมัติ', 'รายการที่อยู่ในคิวของคุณ', 'check', 'amber']],
  },
  overtime: {
    title: 'OT', eyebrow: 'OT / TODAY', desc: 'ขอ OT และดูชั่วโมงที่ใช้',
    tone: 'amber', icon: 'clock', value: '18.5 ชม.', note: 'เดือนนี้ · 1 คำขอรอ',
    metrics: [['ชั่วโมง OT เดือนนี้', '18.5 ชม.', 'เพิ่มขึ้น 4.5 ชม.', 'clock', 'amber'], ['รออนุมัติ', '1 รายการ', 'ต้องติดตามวันนี้', 'file', 'purple'], ['อนุมัติแล้ว', '12 ชม.', 'พร้อมส่ง Payroll', 'check', 'green'], ['ประมาณการ', '฿3,840', 'ก่อนหักภาษี', 'bank', 'teal']],
    actions: [['overtime/request', 'ขอทำ OT', 'เลือกวัน เวลา งาน และผู้อนุมัติ', 'plus', 'amber'], ['overtime/requests', 'ประวัติคำขอ OT', 'ดูสถานะและชั่วโมงที่ส่งแล้ว', 'file', 'blue'], ['reports', 'สรุปชั่วโมงทีม', 'ดูภาระงานและงบประมาณ OT', 'trend', 'purple'], ['settings', 'นโยบาย OT', 'เรท รอบตัด และสิทธิ์อนุมัติ', 'settings', 'slate']],
  },
  correction: {
    title: 'แก้ไขเวลา', eyebrow: 'TIME / TODAY', desc: 'เวลาไม่ตรงก็ส่งแก้ไขได้จากหน้าเดียว',
    tone: 'purple', icon: 'file', value: '1 รายการ', note: 'รอตรวจสอบ · deadline 3 วัน',
    metrics: [['รายการรอพิจารณา', '1', 'ส่งเมื่อ 14 ตุลาคม', 'clock', 'amber'], ['อนุมัติเดือนนี้', '4', 'จาก 5 รายการ', 'check', 'green'], ['ชั่วโมงที่แก้ไข', '8.0 ชม.', 'เดือนตุลาคม', 'file', 'purple'], ['กำหนดส่งคำขอ', '3 วัน', 'หลังวันที่เกิดเหตุ', 'alert', 'red']],
    actions: [['correction/request', 'ขอแก้ไขเวลา', 'เลือกวัน เวลาเข้าออก และเหตุผล', 'plus', 'purple'], ['correction/requests', 'ประวัติคำขอ', 'ดูสถานะและความคิดเห็นจากผู้อนุมัติ', 'file', 'blue'], ['settings', 'นโยบายการแก้ไข', 'กำหนด deadline และหลักฐานจากศูนย์กลาง', 'settings', 'slate']],
  },
  medical: {
    title: 'ค่ารักษา', eyebrow: 'MEDICAL / TODAY', desc: 'เบิกง่าย ติดตามเอกสารได้ในหน้าเดียว',
    tone: 'green', icon: 'bank', value: '฿6,160', note: 'เหลือวงเงิน · 2 รายการรอตรวจ',
    metrics: [['วงเงินคงเหลือ', '฿6,160', 'จาก 10,000 บาท / ปี', 'bank', 'teal'], ['รอตรวจสอบ', '2 รายการ', 'รวม ฿1,450', 'file', 'amber'], ['อนุมัติเดือนนี้', '฿2,640', 'เบิกต่อครั้งไม่เกิน ฿1,000', 'check', 'green'], ['เอกสารต้องแก้', '1 รายการ', 'รอแนบใบเสร็จใหม่', 'alert', 'red']],
    actions: [['medical/request', 'ยื่นค่ารักษา', 'กรอกข้อมูลผู้ป่วยและแนบใบเสร็จ', 'plus', 'teal'], ['medical/requests', 'ประวัติการเบิก', 'ดูคำขอและกำหนดการจ่ายเงิน', 'file', 'blue'], ['reports', 'สรุปสวัสดิการ', 'ดูยอดใช้ตามหมวดและปีสิทธิ์', 'trend', 'purple'], ['settings', 'นโยบายค่ารักษา', 'วงเงิน ฿10,000 / ปี · สูงสุด ฿1,000 / ครั้ง', 'settings', 'slate']],
  },
};
let page = 'dashboard';
let subpage = '';
let toastTimer;
const main = document.querySelector('#main');
const mainNav = document.querySelector('#main-nav');
const dialog = document.querySelector('#detail-dialog');
const toast = document.querySelector('#toast');

function decorateIcons() {
  document.querySelectorAll('[data-icon]').forEach(function (node) { node.innerHTML = icon(node.dataset.icon); });
}
function routeName() { return subpage ? page + '/' + subpage : page; }
function pill(label, tone) { return '<span class="pill ' + (tone || 'muted') + '">' + label + '</span>'; }
function heading(eyebrow, title, desc, actions) {
  var iconMap = { dashboard: 'spark', leave: 'calendar', overtime: 'clock', attendance: 'target', correction: 'file', medical: 'bank', approvals: 'check', reports: 'trend', settings: 'settings' };
  var toneMap = { dashboard: 'indigo', leave: 'teal', overtime: 'amber', attendance: 'blue', correction: 'purple', medical: 'green', approvals: 'rose', reports: 'indigo', settings: 'slate' };
  var iconName = iconMap[page] || 'spark';
  var tone = toneMap[page] || 'indigo';
  return '<section class="page-heading"><div class="heading-main"><div class="heading-copy"><h1>' + title + '</h1><span class="eyebrow">' + eyebrow + '</span><p>' + desc + '</p></div><div class="heading-visual ' + tone + '" aria-hidden="true"><span class="heading-orbit orbit-a"></span><span class="heading-orbit orbit-b"></span><span class="heading-icon">' + icon(iconName) + '</span><i></i></div></div><div class="page-actions">' + (actions || '') + '</div></section>';
}

function metric(label, value, note, iconName, tone) {
  return '<article class="metric-card ' + tone + '"><span class="metric-icon">' + icon(iconName) + '</span><span class="metric-copy"><small>' + label + '</small><strong>' + value + '</strong><span>' + note + '</span></span><span class="metric-spark">↗</span></article>';
}
function action(route, title, desc, iconName, tone) {
  return '<button class="action-card ' + tone + '" type="button" data-route="' + route + '"><span class="action-icon">' + icon(iconName) + '</span><span><strong>' + title + '</strong><small>' + desc + '</small></span><span class="action-arrow">เปิด ' + icon('right') + '</span></button>';
}
function sectionTitle(title, desc, extra) {
  return '<div class="section-title"><div><h2>' + title + '</h2><p>' + desc + '</p></div>' + (extra || '') + '</div>';
}
function listItem(iconName, title, note, status, tone) {
  return '<button class="activity-item" type="button" data-detail="' + title + '"><span class="activity-icon ' + (tone || 'blue') + '">' + icon(iconName) + '</span><span><strong>' + title + '</strong><small>' + note + '</small></span>' + pill(status, tone || 'blue') + icon('right') + '</button>';
}
function settingsRow(title, desc, iconName, status, tone) {
  return '<button class="settings-row" type="button" data-action="setting-edit"><span class="settings-row-icon ' + (tone || 'blue') + '">' + icon(iconName) + '</span><span><strong>' + title + '</strong><small>' + desc + '</small></span>' + pill(status, 'green') + icon('right') + '</button>';
}
function moduleCard(id, d, badge) {
  return '<button class="module-card ' + d.tone + '" type="button" data-route="' + id + '"><span class="module-top"><span class="module-icon">' + icon(d.icon) + '</span>' + pill(badge, d.tone) + '</span><span class="module-copy"><small>' + d.eyebrow.split(' / ')[0] + '</small><strong>' + d.title + '</strong><span class="module-value">' + d.value + '</span><em>' + d.note + '</em></span><span class="module-footer">เปิดพื้นที่ ' + icon('arrow') + '</span></button>';
}
function tableRow(values, detail) {
  return '<tr>' + values.map(function (value, index) { return '<td>' + (index === 0 ? '<strong>' + value[0] + '</strong><small>' + (value[1] || '') + '</small>' : value) + '</td>'; }).join('') + '<td><button class="table-more" type="button" data-detail="' + detail + '">' + icon('right') + '</button></td></tr>';
}
function shell(content, variant) {
  var classes = variant || '';
  if (classes.indexOf('dashboard-page') === -1 && classes.indexOf('leave-page') === -1) classes += ' galaxy-page';
  return '<div class="page-shell ' + classes.trim() + '">' + content + '<p class="prototype-note">ต้นแบบ UX/UI · ข้อมูลตัวอย่าง · การบันทึกจริงต้องใช้ API และสิทธิ์จากเซิร์ฟเวอร์</p></div>';
}

function renderNav() {
  mainNav.innerHTML = navItems.map(function (item) {
    var active = page === item[0];
    return '<button class="nav-item ' + (active ? 'active' : '') + '" type="button" data-route="' + item[0] + '"><span class="nav-item-icon">' + icon(item[2]) + '</span>' + item[1] + '</button>';
  }).join('');
}
function currentDateLabel() {
  var now = new Date();
  var weekdays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  var months = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  return 'วัน' + weekdays[now.getDay()] + 'ที่ ' + now.getDate() + ' ' + months[now.getMonth()] + ' ' + (now.getFullYear() + 543);
}
function currentThaiDayColor() {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()];
}
function applyThaiDayColor(node) {
  if (!node) return;
  ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].forEach(function (day) {
    node.classList.remove('day-' + day);
  });
  node.classList.add('day-' + currentThaiDayColor());
}
function currentClock() {
  var now = new Date();
  return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ':' + String(now.getSeconds()).padStart(2, '0');
}
var liveClockTimer;
function refreshLiveClock() {
  var value = currentClock();
  document.querySelectorAll('[data-live-clock]').forEach(function (node) { node.textContent = value; });
  document.querySelectorAll('[data-live-date]').forEach(function (node) { node.textContent = currentDateLabel(); });
  applyThaiDayColor(document.querySelector('.dashboard-v2 .dashboard-hero-copy > .dashboard-kicker'));
}
function startLiveClock() {
  if (liveClockTimer && typeof clearInterval === 'function') clearInterval(liveClockTimer);
  refreshLiveClock();
  if (typeof setInterval === 'function') liveClockTimer = setInterval(refreshLiveClock, 1000);
}
function dashboardCloudPuffs() {
  return '<i class="cloud-puff cloud-puff-a"></i><i class="cloud-puff cloud-puff-b"></i><i class="cloud-puff cloud-puff-c"></i>';
}
function dashboardCloudVisual() {
  return '<div class="dashboard-cloud-field" aria-hidden="true">' +
    '<span class="dashboard-cloud cloud-main" data-cloud-role="main">' + dashboardCloudPuffs() + '<span class="cloud-content"><small>ความพร้อมทีม</small><strong>92<span>%</span></strong><em>พร้อมทำงาน</em></span></span>' +
    '<span class="dashboard-cloud cloud-metric cloud-blue" data-cloud-role="metric">' + dashboardCloudPuffs() + '<span class="cloud-content"><b>103</b><small>พนักงานทั้งหมด</small></span></span>' +
    '<span class="dashboard-cloud cloud-metric cloud-teal" data-cloud-role="metric">' + dashboardCloudPuffs() + '<span class="cloud-content"><b>98.6%</b><small>ลงเวลาครบ</small></span></span>' +
    '<span class="dashboard-cloud cloud-metric cloud-rose" data-cloud-role="metric">' + dashboardCloudPuffs() + '<span class="cloud-content"><b>6</b><small>ลาวันนี้</small></span></span>' +
    '<span class="dashboard-cloud cloud-metric cloud-amber" data-cloud-role="metric">' + dashboardCloudPuffs() + '<span class="cloud-content"><b>18.5</b><small>ชม. OT</small></span></span>' +
    '<span class="dashboard-cloud cloud-metric cloud-lilac" data-cloud-role="metric">' + dashboardCloudPuffs() + '<span class="cloud-content"><b>8</b><small>รออนุมัติ</small></span></span>' +
    '<span class="dashboard-cloud cloud-metric cloud-mint" data-cloud-role="metric">' + dashboardCloudPuffs() + '<span class="cloud-content"><b>86</b><small>พร้อมทำงาน</small></span></span>' +
  '</div>';
}
function randomizeDashboardClouds() {
  var field = document.querySelector('.dashboard-cloud-field');
  if (!field) return;
  var compact = field.clientWidth < 420;
  var randomBetween = function (min, max) { return min + Math.random() * (max - min); };
  var slots = compact
    ? [[10, 77], [35, 88], [74, 77], [88, 53], [89, 89], [18, 89]]
    : [[31, 82], [48, 82], [73, 30], [88, 26], [93, 60], [78, 82]];
  field.querySelectorAll('.dashboard-cloud').forEach(function (cloud, index) {
    var isMain = cloud.dataset.cloudRole === 'main';
    var slot = isMain ? (compact ? [54, 63] : [62, 50]) : slots[index - 1];
    var x = slot[0] + randomBetween(isMain ? -2.8 : -3.8, isMain ? 2.8 : 3.8);
    var y = slot[1] + randomBetween(isMain ? -2.5 : -4.2, isMain ? 2.5 : 4.2);
    var width = isMain
      ? randomBetween(compact ? 148 : 196, compact ? 176 : 230)
      : randomBetween(compact ? 78 : 108, compact ? 104 : 156);
    var height = isMain
      ? randomBetween(compact ? 90 : 116, compact ? 108 : 144)
      : randomBetween(compact ? 54 : 70, compact ? 70 : 98);
    cloud.style.setProperty('--cloud-x', x.toFixed(2) + '%');
    cloud.style.setProperty('--cloud-y', y.toFixed(2) + '%');
    cloud.style.setProperty('--cloud-width', width.toFixed(1) + 'px');
    cloud.style.setProperty('--cloud-height', height.toFixed(1) + 'px');
    cloud.style.setProperty('--cloud-scale', randomBetween(isMain ? .94 : .78, isMain ? 1.06 : (compact ? 1.1 : 1.24)).toFixed(3));
    cloud.style.setProperty('--cloud-rotate', randomBetween(-3.5, 3.5).toFixed(2) + 'deg');
    cloud.style.setProperty('--cloud-delay', randomBetween(-6, 0).toFixed(2) + 's');
    cloud.style.setProperty('--cloud-duration', randomBetween(7.5, 12.5).toFixed(2) + 's');
    cloud.style.setProperty('--cloud-drift-x', randomBetween(-7, 7).toFixed(1) + 'px');
    cloud.style.setProperty('--cloud-drift-y', randomBetween(-6, 6).toFixed(1) + 'px');
    cloud.style.zIndex = isMain ? '5' : String(2 + index);
  });
}
function mountDashboardClouds() {
  var legacyVisual = main.querySelector('.dashboard-orb');
  if (!legacyVisual) return;
  legacyVisual.outerHTML = dashboardCloudVisual();
  randomizeDashboardClouds();
}
function dashboardAuroraVisual() {
  return '<div class="dashboard-aurora-field" aria-hidden="true">' +
    '<span class="aurora-beam aurora-beam-a"></span><span class="aurora-beam aurora-beam-b"></span><span class="aurora-beam aurora-beam-c"></span>' +
    '<span class="aurora-spark aurora-spark-a"></span><span class="aurora-spark aurora-spark-b"></span><span class="aurora-spark aurora-spark-c"></span><span class="aurora-spark aurora-spark-d"></span><span class="aurora-spark aurora-spark-e"></span><span class="aurora-spark aurora-spark-f"></span>' +
    '<span class="aurora-data aurora-core aurora-teal" data-aurora-role="core"><i class="aurora-edge"></i><span class="aurora-content"><small>ความพร้อมทีม</small><strong>92<span>%</span></strong><em>พร้อมทำงาน</em></span></span>' +
    '<span class="aurora-data aurora-stat aurora-blue" data-aurora-role="stat"><i class="aurora-edge"></i><span class="aurora-content"><b>103</b><small>พนักงานทั้งหมด</small></span></span>' +
    '<span class="aurora-data aurora-stat aurora-mint" data-aurora-role="stat"><i class="aurora-edge"></i><span class="aurora-content"><b>98.6%</b><small>ลงเวลาครบ</small></span></span>' +
    '<span class="aurora-data aurora-stat aurora-rose" data-aurora-role="stat"><i class="aurora-edge"></i><span class="aurora-content"><b>6</b><small>ลาวันนี้</small></span></span>' +
    '<span class="aurora-data aurora-stat aurora-amber" data-aurora-role="stat"><i class="aurora-edge"></i><span class="aurora-content"><b>18.5</b><small>ชม. OT</small></span></span>' +
    '<span class="aurora-data aurora-stat aurora-lilac" data-aurora-role="stat"><i class="aurora-edge"></i><span class="aurora-content"><b>8</b><small>รออนุมัติ</small></span></span>' +
    '<span class="aurora-data aurora-stat aurora-green" data-aurora-role="stat"><i class="aurora-edge"></i><span class="aurora-content"><b>86</b><small>พร้อมทำงาน</small></span></span>' +
  '</div>';
}
function randomizeDashboardAurora() {
  var field = document.querySelector('.dashboard-aurora-field');
  if (!field) return;
  var compact = field.clientWidth < 560;
  var randomBetween = function (min, max) { return min + Math.random() * (max - min); };
  var slots = compact
    ? [[15, 78], [50, 78], [85, 78], [15, 92], [50, 92], [85, 92]]
    : [[40, 82], [54, 19], [74, 24], [89, 54], [60, 82], [81, 81]];
  field.querySelectorAll('.aurora-data').forEach(function (tile, index) {
    var isCore = tile.dataset.auroraRole === 'core';
    var slot = isCore ? (compact ? [50, 55] : [69, 50]) : slots[index - 1];
    var x = slot[0] + randomBetween(isCore ? -1.8 : (compact ? -1.5 : -2.6), isCore ? 1.8 : (compact ? 1.5 : 2.6));
    var y = slot[1] + randomBetween(isCore ? -1.8 : (compact ? -1.8 : -2.8), isCore ? 1.8 : (compact ? 1.8 : 2.8));
    var width = isCore
      ? randomBetween(compact ? 154 : 232, compact ? 176 : 270)
      : randomBetween(compact ? 78 : 132, compact ? 98 : 166);
    var height = isCore
      ? randomBetween(compact ? 94 : 126, compact ? 110 : 148)
      : randomBetween(compact ? 50 : 66, compact ? 66 : 90);
    tile.style.setProperty('--aurora-x', x.toFixed(2) + '%');
    tile.style.setProperty('--aurora-y', y.toFixed(2) + '%');
    tile.style.setProperty('--aurora-width', width.toFixed(1) + 'px');
    tile.style.setProperty('--aurora-height', height.toFixed(1) + 'px');
    tile.style.setProperty('--aurora-scale', randomBetween(isCore ? .97 : .88, isCore ? 1.03 : (compact ? 1.08 : 1.14)).toFixed(3));
    tile.style.setProperty('--aurora-rotate', randomBetween(-1.4, 1.4).toFixed(2) + 'deg');
    tile.style.setProperty('--aurora-delay', randomBetween(-8, 0).toFixed(2) + 's');
    tile.style.setProperty('--aurora-duration', randomBetween(9, 16).toFixed(2) + 's');
    tile.style.setProperty('--aurora-drift-x', randomBetween(-5, 5).toFixed(1) + 'px');
    tile.style.setProperty('--aurora-drift-y', randomBetween(-3, 3).toFixed(1) + 'px');
    tile.style.zIndex = isCore ? '6' : String(2 + index);
  });
}
function mountDashboardAuroraField() {
  var legacyVisual = main.querySelector('.dashboard-orb');
  if (!legacyVisual) return;
  legacyVisual.outerHTML = dashboardAuroraVisual();
  randomizeDashboardAurora();
}
function dashboardPreviewRole() {
  var params = new URLSearchParams(window.location.search || '');
  return params.get('role') || 'manager';
}
function dashboardPreviewCanApprove() {
  return dashboardPreviewRole() !== 'employee';
}
function dashboardActivityCard(item) {
  var statusIcon = item.status === 'ยกเลิก' ? 'alert' : 'check';
  var statusClass = item.status === 'ยกเลิก' ? 'is-cancelled' : 'is-approved';
  return '<article class="today-overview-card activity ' + item.tone + ' is-static"><span class="today-card-head"><span class="today-overview-icon">' + icon(item.icon) + '</span><span class="today-card-title"><small>' + item.english + '</small><b>' + item.title + '</b></span><span class="today-card-status-stack"><span class="today-card-badge activity-status ' + statusClass + '">' + icon(statusIcon) + '<strong>' + item.status + '</strong></span><small class="today-card-request-id">' + item.requestId + '</small></span></span><span class="today-detail-full activity-detail-pro"><span>วันคำขอ : ' + item.requestDate + '</span><span class="activity-person-line">' + item.name + ' | ' + item.team + ' | ' + item.department + '</span><span>' + item.periodLabel + ' : ' + item.period + '</span><span>เหตุผล : ' + item.reason + '</span></span></article>';
}
function dashboardRequestCard(item) {
  return '<button type="button" class="today-overview-card request-card ' + item.tone + '" data-route="' + item.route + '"><span class="today-card-head"><span class="today-overview-icon">' + icon(item.icon) + '</span><span class="today-card-title"><small>' + item.english + '</small><b>' + item.title + '</b></span><span class="today-card-badge request-pending">' + icon('clock') + '<strong>' + item.pendingCount + '</strong><em>' + item.pendingLabel + '</em></span></span><span class="today-detail-full"><span>' + item.name + '</span><span>' + item.dateTime + '</span><span>' + item.reason + '</span></span></button>';
}
function dashboardApprovalCard() {
  return '<button type="button" class="today-overview-card approvals" data-route="approvals"><span class="today-card-head"><span class="today-overview-icon">' + icon('check') + '</span><span class="today-card-title"><small>APPROVE</small><b>งานอนุมัติ</b></span><span class="today-card-badge approval-count">' + icon('clock') + '<strong>8</strong><em>รายการ</em></span></span><span class="today-mini-stats approval-stats" aria-label="งานอนุมัติ ลางาน 5 โอที 2 แก้ไขเวลา 0 ค่ารักษา 1"><span class="mini-stat leave"><small>ลางาน</small><b>5</b></span><span class="mini-stat ot"><small>OT</small><b>2</b></span><span class="mini-stat correction"><small>แก้ไขเวลา</small><b>0</b></span><span class="mini-stat medical"><small>ค่ารักษา</small><b>1</b></span></span></button>';
}
function dashboardMyRequestsCard() {
  return '<article class="today-overview-card requests today-requests-summary is-static"><span class="today-card-head"><span class="today-overview-icon">' + icon('file') + '</span><span class="today-card-title"><small>REQUESTS</small><b>คำขอของฉัน</b></span><span class="today-card-badge request-count">' + icon('clock') + '<strong>4</strong><em>รายการ</em></span></span><span class="today-mini-stats request-stats" aria-label="คำขอของฉัน ลางาน 1 โอที 1 แก้ไขเวลา 1 ค่ารักษา 1"><span class="mini-stat leave"><small>ลางาน</small><b>1</b></span><span class="mini-stat ot"><small>OT</small><b>1</b></span><span class="mini-stat correction"><small>แก้ไขเวลา</small><b>1</b></span><span class="mini-stat medical"><small>ค่ารักษา</small><b>1</b></span></span></article>';
}
function dashboardTodayWorkBlock() {
  var canApprove = dashboardPreviewCanApprove();
  var managerActivities = [
    {tone:'leave', icon:'calendar', english:'LEAVE', title:'ลาพักร้อน', status:'อนุมัติแล้ว', requestId:'LEV-0001', requestDate:'7 Oct 26', name:'คุณจิรัญญา พลเจริญ (Jo)', team:'Team B', department:'บัญชี', periodLabel:'วันที่ลา', period:'7–10 Oct 26 | 3 วัน', reason:'เดินทางกับครอบครัว'},
    {tone:'ot', icon:'clock', english:'OVERTIME', title:'โอที', status:'ยกเลิก', requestId:'OT-0018', requestDate:'6 Oct 26', name:'คุณอธิป ศรีสุข (Top)', team:'Team B', department:'บัญชี', periodLabel:'วันที่ OT', period:'8 Oct 26 | 2.5 ชม.', reason:'ปิดงานลูกค้าเร่งด่วน'}
  ];
  var employeeActivities = [
    {tone:'leave', icon:'calendar', english:'LEAVE', title:'ลาพักร้อน', status:'อนุมัติแล้ว', requestId:'LEV-0001', requestDate:'7 Oct 26', name:'คุณจิรัญญา พลเจริญ (Jo)', team:'Team B', department:'บัญชี', periodLabel:'วันที่ลา', period:'7–10 Oct 26 | 3 วัน', reason:'เดินทางกับครอบครัว'},
    {tone:'ot', icon:'clock', english:'OVERTIME', title:'โอที', status:'ยกเลิก', requestId:'OT-0018', requestDate:'6 Oct 26', name:'คุณจิรัญญา พลเจริญ (Jo)', team:'Team B', department:'บัญชี', periodLabel:'วันที่ OT', period:'8 Oct 26 | 2.5 ชม.', reason:'ปิดงานลูกค้าเร่งด่วน'}
  ];
  var cards = canApprove
    ? dashboardApprovalCard() + dashboardMyRequestsCard() + managerActivities.map(dashboardActivityCard).join('')
    : dashboardMyRequestsCard() + employeeActivities.map(dashboardActivityCard).join('');
  var viewClass = canApprove ? 'is-approver-view' : 'is-employee-view';
  var cardCount = canApprove ? 4 : 3;
  return '<section class="dashboard-board activity-board today-overview-board ' + viewClass + '"><div class="board-head"><div class="board-title"><span class="board-icon purple">' + icon('spark') + '</span><span><b>งานและกิจกรรมวันนี้</b><small>TODAY WORK &amp; ACTIVITY</small></span></div><span class="board-live">' + icon('check') + cardCount + ' การ์ดสำคัญ</span></div><div class="today-overview-grid">' + cards + '</div></section>';
}
function dashboardPage() {
  return shell('<div class="dashboard-layout dashboard-v2"><section class="dashboard-hero-v2"><div class="hero-v2-grid"></div><div class="dashboard-hero-copy"><span class="dashboard-kicker"><span class="live-dot"></span> ' + currentDateLabel() + ' เวลา <time class="dashboard-live-clock" data-live-clock>' + currentClock() + '</time></span><div class="hero-attendance-status" aria-label="สถานะการลงเวลาของฉัน"><span class="hero-time-status is-in"><span class="hero-time-status-icon">' + icon('check') + '</span><span><small>CHECK-IN</small><b>08:47:59 น.</b></span></span><span class="hero-time-status is-out"><span class="hero-time-status-icon">' + icon('clock') + '</span><span><small>CHECK-OUT</small><b>ยังไม่ได้ลงเวลา</b></span></span></div><h1><span>TEAM</span> <em>OVERVIEW</em></h1><p>สถานะทีมและจัดการงานสำคัญ</p></div><div class="dashboard-orb" aria-hidden="true"><span class="orb-ring ring-a"></span><span class="orb-ring ring-b"></span><span class="orb-ring ring-c"></span><span class="orb-core"><small>ความพร้อมทีม</small><strong>92<span>%</span></strong></span><span class="orb-float orb-float-a"><b>6</b><small>ลาวันนี้</small></span><span class="orb-float orb-float-b"><b>18.5</b><small>ชม. OT</small></span><span class="orb-float orb-float-c"><b>8</b><small>รออนุมัติ</small></span><span class="orb-float orb-float-d"><b>103</b><small>พนักงานทั้งหมด</small></span><span class="orb-float orb-float-e"><b>98.6%</b><small>ลงเวลาครบ</small></span><span class="orb-float orb-float-f"><b>86</b><small>พร้อมทำงาน</small></span><i class="dashboard-star dashboard-star-a"></i><i class="dashboard-star dashboard-star-b"></i><i class="dashboard-star dashboard-star-c"></i></div><div class="hero-v2-shine"></div></section><section class="dashboard-stat-rail dashboard-kpi-rail"><div class="dashboard-stat dashboard-kpi-card purple"><span class="stat-icon">' + icon('people') + '</span><span><small class="stat-en">EMPLOYEES</small><small class="stat-th">พนักงานทั้งหมด</small><b>103 คน</b></span><i>' + icon('people') + '103 คน</i></div><div class="dashboard-stat dashboard-kpi-card teal"><span class="stat-icon">' + icon('check') + '</span><span><small class="stat-en">READY TODAY</small><small class="stat-th">พร้อมทำงาน</small><b>86 คน</b></span><i>' + icon('check') + '86 คน</i></div><div class="dashboard-stat dashboard-kpi-card teal leave"><span class="stat-icon">' + icon('calendar') + '</span><span><small class="stat-en">ON LEAVE</small><small class="stat-th">ลาวันนี้</small><b>6 คน</b></span><i>' + icon('calendar') + '6 คน</i></div><div class="dashboard-stat dashboard-kpi-card amber"><span class="stat-icon">' + icon('clock') + '</span><span><small class="stat-en">PENDING</small><small class="stat-th">รออนุมัติ</small><b>8 รายการ</b></span><i>' + icon('clock') + '8 รายการ</i></div><div class="dashboard-stat dashboard-kpi-card green"><span class="stat-icon">' + icon('target') + '</span><span><small class="stat-en">ATTENDANCE</small><small class="stat-th">ลงเวลา</small><b>98.6%</b></span><i>' + icon('target') + '98.6%</i></div></section><section class="dashboard-deck dashboard-deck-cards"><section class="dashboard-board status-board"><div class="board-head"><div class="board-title"><span class="board-icon teal">' + icon('trend') + '</span><span><b>สถานะทีม</b><small>TEAM STATUS</small></span></div><span class="rhythm-score">' + icon('people') + '103 คน</span></div><div class="status-score-rich"><strong>ความพร้อมวันนี้ <span>92%</span></strong></div><div class="status-list-rich"><div class="status-row-rich"><span class="status-dot-rich teal"></span><span><b>พร้อมทำงาน 86 คน</b></span><span class="status-bar-rich"><i style="width:84%"></i></span><strong>84%</strong></div><div class="status-row-rich"><span class="status-dot-rich purple"></span><span><b>ออก Job 8 คน</b></span><span class="status-bar-rich"><i style="width:42%"></i></span><strong>8%</strong></div><div class="status-row-rich"><span class="status-dot-rich amber"></span><span><b>ลาวันนี้ 6 คน</b></span><span class="status-bar-rich"><i style="width:26%"></i></span><strong>6%</strong></div></div></section>' + dashboardTodayWorkBlock() + '<section class="dashboard-board leave-board"><div class="board-head"><div class="board-title"><span class="board-icon purple">' + icon('calendar') + '</span><span><b>สถิติการลา</b><small>LEAVE STATISTICS</small></span></div><span class="rhythm-score leave-score">' + icon('clock') + '8 รออนุมัติ</span></div><div class="status-score-rich leave-score-rich"><strong>ลาวันนี้ <span>6 คน</span></strong></div><div class="status-list-rich leave-list-rich"><div class="status-row-rich"><span class="status-dot-rich purple"></span><span><b>ลาพักร้อน 3 คน</b></span><span class="status-bar-rich leave-bar-purple"><i style="width:50%"></i></span><strong>50%</strong></div><div class="status-row-rich"><span class="status-dot-rich amber"></span><span><b>ลากิจ 2 คน</b></span><span class="status-bar-rich leave-bar-amber"><i style="width:33%"></i></span><strong>33%</strong></div><div class="status-row-rich"><span class="status-dot-rich teal"></span><span><b>ลาป่วย 1 คน</b></span><span class="status-bar-rich leave-bar-teal"><i style="width:17%"></i></span><strong>17%</strong></div></div></section>' + personalLeaveStatsBlock() + '</section>' + dashboardInsightBlock() + calendarBlock() + companyAnnouncementsBlock() + '</div>', 'dashboard-page');
}

function dashboardInsightBlock() {
  return '<section class="dashboard-insight-strip">' + '<section class="dashboard-board rhythm-board workload-board"><div class="board-head"><div class="board-title"><span class="board-icon amber">' + icon('clock') + '</span><span><b>สรุปชั่วโมง OT</b><small>OT SUMMARY / OCTOBER</small></span></div><span class="rhythm-score">' + icon('trend') + '+12%</span></div><div class="workload-total-rich"><span class="workload-metric workload-today"><small>วันนี้</small><strong>10.5 ชั่วโมง</strong></span><span class="workload-metric workload-accumulated"><small>ชั่วโมง OT สะสม</small><strong>42.5 ชั่วโมง</strong></span></div><div class="rhythm-chart workload-chart"><div><span style="height:44%"></span><small>ส. 12</small></div><div><span style="height:60%"></span><small>อา. 13</small></div><div><span style="height:38%"></span><small>จ. 14</small></div><div><span style="height:78%"></span><small>อ. 15</small></div><div><span style="height:56%"></span><small>พ. 16</small></div><div><span style="height:91%"></span><small>พฤ. 17</small></div><div><span style="height:68%"></span><small>วันนี้</small></div></div> </section>' + '<article class="dashboard-insight-card attendance-insight"><div class="insight-head"><div><h2><span class="insight-heading-icon attendance-heading-icon">' + icon('target') + '</span>ลงเวลาวันนี้</h2><span class="dashboard-kicker">ATTENDANCE / TODAY</span></div><span class="insight-badge attendance-date-badge">' + icon('calendar') + '19 OCT 26</span></div><div class="insight-score-rich attendance-score-rich"><strong>ลงเวลาครบ <span>98.6%</span></strong></div><div class="attendance-progress attendance-progress-inline" aria-label="ลงเวลา 86 จาก 103 คน คิดเป็น 83.5%"><span style="width:83.5%"><b>86 / 103 คน</b></span><em>83.5%</em></div><div class="attendance-stat-grid attendance-stat-grid-rich"><span><small>ปกติ</small><b>86</b></span><span><small>มาสาย</small><b>9</b></span><span><small>ลงเวลาออกก่อน</small><b>4</b></span><span><small>ไม่ลงเวลา</small><b>4</b></span></div></article>' + '<article class="dashboard-insight-card medical-insight"><div class="insight-head"><div><h2><span class="insight-heading-icon medical-heading-icon">' + icon('bank') + '</span>ค่ารักษาพยาบาล</h2><span class="dashboard-kicker">MEDICAL / BENEFIT</span></div><span class="insight-badge medical">' + icon('bank') + 'วงเงิน ฿10,000 / ปี</span></div><div class="insight-score-rich medical-score-rich"><strong>ใช้สิทธิ์ <span>38.4%</span></strong></div><div class="medical-progress medical-progress-inline" aria-label="38.4% / 61.6%"><span style="width:38.4%"><b>38.4%</b></span><em>61.6%</em></div><div class="medical-limit-grid"><div><small>ใช้ไป</small><strong>฿3,840</strong></div><div><small>คงเหลือ</small><strong>฿6,160</strong></div></div></article>' + '</section>';
}

function personalLeaveStatsBlock() {
  return '<section class="dashboard-board leave-board personal-leave-board personal-leave-pro owner-leave-mini"><div class="board-head"><div class="board-title"><span class="board-icon purple">' + icon('calendar') + '</span><span><b>สถิติการลาของฉัน</b><small>MY LEAVE STATISTICS</small></span></div><span class="rhythm-score leave-score personal-leave-score">' + icon('calendar') + 'ปี 2569</span></div><div class="personal-leave-pro-grid"><article class="personal-leave-pro-card vacation"><div class="personal-leave-pro-head"><span class="personal-leave-pro-icon">' + icon('beach') + '</span><span><small>VACATION</small><b>ลาพักร้อน</b></span><span class="personal-leave-pro-quota">' + icon('calendar') + 'สิทธิ์ 15 วัน</span></div><div class="personal-leave-pro-values"><em>ใช้ไป 3 วัน</em><em>คงเหลือ 12 วัน</em></div><span class="personal-leave-pro-track" aria-label="ลาพักร้อน ใช้ไป 20% คงเหลือ 80%"><i style="width:20%"><b>20%</b></i><em>80%</em></span></article><article class="personal-leave-pro-card sick"><div class="personal-leave-pro-head"><span class="personal-leave-pro-icon">' + icon('medicalCross') + '</span><span><small>SICK LEAVE</small><b>ลาป่วย</b></span><span class="personal-leave-pro-quota">' + icon('calendar') + 'สิทธิ์ 5 วัน</span></div><div class="personal-leave-pro-values"><em>ใช้ไป 1 วัน</em><em>คงเหลือ 4 วัน</em></div><span class="personal-leave-pro-track" aria-label="ลาป่วย ใช้ไป 20% คงเหลือ 80%"><i style="width:20%"><b>20%</b></i><em>80%</em></span></article><article class="personal-leave-pro-card business"><div class="personal-leave-pro-head"><span class="personal-leave-pro-icon">' + icon('briefcase') + '</span><span><small>BUSINESS</small><b>ลากิจ</b></span><span class="personal-leave-pro-quota">' + icon('calendar') + 'สิทธิ์ 3 วัน</span></div><div class="personal-leave-pro-values"><em>ใช้ไป 1 วัน</em><em>คงเหลือ 2 วัน</em></div><span class="personal-leave-pro-track" aria-label="ลากิจ ใช้ไป 33% คงเหลือ 67%"><i style="width:33%"><b>33%</b></i><em>67%</em></span></article></div></section>';
}

function calendarBlock() {
  var profile = '<img src="assets/profile-clean.webp?v=20261022-avatar1" alt="" aria-hidden="true">';
  return '<section class="dashboard-calendar-v2 calendar-pro"><div class="calendar-v2-head calendar-pro-head"><div><span class="card-title-en calendar-title-en">TEAM CALENDAR</span><h2><span class="section-heading-icon calendar-heading-icon">' + icon('calendar') + '</span>วันลาและกิจกรรมของทีม</h2></div><div class="calendar-v2-month"><button type="button" data-action="calendar-prev" aria-label="เดือนก่อน">‹</button><strong>ตุลาคม 2569</strong><button type="button" data-action="calendar-next" aria-label="เดือนถัดไป">›</button></div></div><div class="calendar-pro-body"><div class="calendar-pro-month"><div class="calendar-grid-v2 calendar-pro-grid"><div class="calendar-v2-weekday">จ.</div><div class="calendar-v2-weekday">อ.</div><div class="calendar-v2-weekday">พ.</div><div class="calendar-v2-weekday">พฤ.</div><div class="calendar-v2-weekday">ศ.</div><div class="calendar-v2-weekday">ส.</div><div class="calendar-v2-weekday">อา.</div><div class="calendar-v2-day muted"><small>28</small></div><div class="calendar-v2-day muted"><small>29</small></div><div class="calendar-v2-day muted"><small>30</small></div><div class="calendar-v2-day"><small>1</small></div><div class="calendar-v2-day"><small>2</small></div><div class="calendar-v2-day"><small>3</small></div><div class="calendar-v2-day"><small>4</small></div><div class="calendar-v2-day"><small>5</small></div><div class="calendar-v2-day"><small>6</small></div><div class="calendar-v2-day"><small>7</small></div><div class="calendar-v2-day"><small>8</small></div><div class="calendar-v2-day"><small>9</small></div><div class="calendar-v2-day"><small>10</small></div><div class="calendar-v2-day"><small>11</small></div><div class="calendar-v2-day"><small>12</small></div><div class="calendar-v2-day"><small>13</small></div><div class="calendar-v2-day"><small>14</small></div><div class="calendar-v2-day"><small>15</small></div><div class="calendar-v2-day"><small>16</small></div><div class="calendar-v2-day"><small>17</small></div><div class="calendar-v2-day"><small>18</small></div><div class="calendar-v2-day today"><span class="calendar-day-head"><small>19</small><span class="calendar-profile-stack">' + profile + profile + '</span></span></div><div class="calendar-v2-day has-event"><span class="calendar-day-head"><small>20</small><span class="calendar-profile-stack">' + profile + '</span></span></div><div class="calendar-v2-day has-event"><span class="calendar-day-head"><small>21</small><span class="calendar-profile-stack">' + profile + profile + '</span></span></div><div class="calendar-v2-day has-event"><span class="calendar-day-head"><small>22</small><span class="calendar-profile-stack">' + profile + '</span></span></div><div class="calendar-v2-day holiday company-holiday"><span class="calendar-day-head"><small>23</small></span><span class="calendar-holiday-label">วันหยุดบริษัท</span></div><div class="calendar-v2-day"><small>24</small></div><div class="calendar-v2-day"><small>25</small></div><div class="calendar-v2-day"><small>26</small></div><div class="calendar-v2-day"><small>27</small></div><div class="calendar-v2-day"><small>28</small></div><div class="calendar-v2-day"><small>29</small></div><div class="calendar-v2-day"><small>30</small></div><div class="calendar-v2-day"><small>31</small></div><div class="calendar-v2-day muted"><small>1</small></div></div></div><aside class="calendar-pro-agenda"><section class="calendar-agenda-section is-today"><div class="calendar-pro-date"><strong>TODAY 19 OCT 2026</strong></div><article class="calendar-agenda-card">' + profile + '<span class="calendar-agenda-copy"><b>คุณจิรัญญา พลเจริญ (Jo) | Team B | บัญชี</b><small>ลาพักร้อน 3 วัน</small></span><em class="calendar-status approved">อนุมัติ</em></article></section><section class="calendar-agenda-section is-next"><div class="calendar-pro-date next"><strong>NEXT 20 OCT 2026</strong></div><article class="calendar-agenda-card">' + profile + '<span class="calendar-agenda-copy"><b>คุณกาญจนา นุกูลการ | Team B | บัญชี</b><small>ลากิจ 1 วัน</small></span><em class="calendar-status pending">รออนุมัติ</em></article></section><section class="calendar-agenda-section is-next is-holiday"><div class="calendar-pro-date next holiday-date"><strong>NEXT 23 OCT 2026</strong></div><article class="calendar-agenda-card calendar-holiday-card"><span class="calendar-agenda-holiday-icon">' + icon('calendar') + '</span><span class="calendar-agenda-copy"><b>วันปิยมหาราช : วันหยุดบริษัท</b></span><em class="calendar-status holiday">วันหยุด</em></article></section></aside></div></section>';
}

function companyAnnouncementsBlock() {
  return '<section class="dashboard-announcements announcements-pro"><div class="announcements-head"><div><span class="card-title-en announcement-title-en">COMPANY UPDATE</span><h2><span class="section-heading-icon announcement-heading-icon">' + icon('spark') + '</span>ข่าวสำคัญที่ทีมควรรู้</h2></div><span class="announcement-count">4 UPDATE</span></div><div class="announcement-grid announcement-pro-grid"><article class="announcement-card announcement-pro-card holiday"><div class="announcement-pro-top"><span class="announcement-icon teal">' + icon('calendar') + '</span><span class="announcement-meta"><span class="announcement-date">23 OCT 26</span><small class="announcement-source">ประกาศบริษัท</small></span><span class="announcement-pro-tag is-new">NEW</span></div><div class="announcement-pro-copy"><strong>วันหยุดพิเศษ</strong><small>23 ตุลาคม บริษัทปิดทำการทั้งวัน กรุณาวางแผนงานลูกค้าล่วงหน้า</small></div></article><article class="announcement-card announcement-pro-card medical"><div class="announcement-pro-top"><span class="announcement-icon purple">' + icon('bank') + '</span><span class="announcement-meta"><span class="announcement-date">20 OCT 26</span><small class="announcement-source">สวัสดิการ</small></span><span class="announcement-pro-tag is-benefit">BENEFIT</span></div><div class="announcement-pro-copy"><strong>อัปเดตสิทธิ์ค่ารักษา</strong><small>วงเงินปีละ ฿10,000 และเบิกได้สูงสุด ฿1,000 ต่อครั้ง</small></div></article><article class="announcement-card announcement-pro-card townhall"><div class="announcement-pro-top"><span class="announcement-icon amber">' + icon('spark') + '</span><span class="announcement-meta"><span class="announcement-date">18 OCT 26</span><small class="announcement-source">กิจกรรมบริษัท</small></span><span class="announcement-pro-tag is-event">EVENT</span></div><div class="announcement-pro-copy"><strong>Town Hall ทีม</strong><small>พบกันวันที่ 30 ตุลาคม เวลา 15:00 น. ห้องประชุมใหญ่ ชั้น 2</small></div></article><article class="announcement-card announcement-pro-card people"><div class="announcement-pro-top"><span class="announcement-icon blue">' + icon('people') + '</span><span class="announcement-meta"><span class="announcement-date">15 OCT 26</span><small class="announcement-source">ข่าวภายใน</small></span><span class="announcement-pro-tag is-new">NEW</span></div><div class="announcement-pro-copy"><strong>อัปเดตทีมประจำเดือน</strong><small>แจ้งกำหนดกิจกรรมและงานสำคัญของทีมสำหรับช่วงปลายเดือน</small></div></article></div></section>';
}

function moduleVisual(id, d) {
  return '<div class="module-visual ' + d.tone + '" aria-hidden="true"><span class="module-visual-halo"></span><span class="module-visual-orbit orbit-a"></span><span class="module-visual-orbit orbit-b"></span><span class="module-visual-core">' + icon(d.icon) + '</span><span class="module-visual-spark spark-a"></span><span class="module-visual-spark spark-b"></span><span class="module-visual-label">' + (id === 'medical' ? 'BENEFIT' : id === 'overtime' ? 'WORKLOAD' : id === 'leave' ? 'BALANCE' : 'LIVE') + '</span></div>';
}
function overviewPage(id) {
  var d = modules[id];
  var title = id === 'overtime' ? 'OT' : d.title;
  return shell(heading(d.eyebrow, title, d.desc, '') + '<section class="module-hero ' + d.tone + '">' + moduleVisual(id, d) + '<div class="module-hero-copy"><span class="eyebrow">' + (id === 'medical' ? 'WELFARE CONTROL' : id === 'overtime' ? 'WORKLOAD CONTROL' : 'PERSONAL WORKSPACE') + '</span><h2>ทำเรื่อง' + title + 'ให้จบ</h2><p>' + d.note + ' · ดูสถานะล่าสุดได้ตรงนี้</p><div class="module-badges"><span>' + icon(d.icon) + ' อัปเดตวันนี้</span><span>' + icon('shield') + ' ตรวจสอบโดยระบบ</span></div></div></section><div class="metric-grid">' + d.metrics.map(function (m) { return metric(m[0], m[1], m[2], m[3], m[4]); }).join('') + '</div><section class="single-page-layout"><div>' + inlineForm(id) + '</div>' + moduleHistory(id) + '</section>');
}

function leavePage() {
  return shell('<div class="leave-workspace"><section class="leave-galaxy-hero"><div class="leave-hero-stars"></div><div class="leave-hero-copy"><span class="leave-kicker"><span class="live-dot"></span> <span class="leave-live-date" data-live-date>' + currentDateLabel() + '</span> เวลา <time class="dashboard-live-clock leave-live-clock" data-live-clock>' + currentClock() + '</time></span><h1>ลาง่าย<br><em>วางแผนได้</em></h1><span class="leave-hero-en">LEAVE WORKSPACE</span><p>ส่งคำขอและเช็กสิทธิ์การลาได้ในหน้าเดียว</p><div class="leave-hero-meta"><span><b>12</b><small>วันคงเหลือ</small></span><span><b>02</b><small>รออนุมัติ</small></span><span><b>03</b><small>ทีมกำลังลา</small></span></div></div><div class="leave-orbit-visual" aria-hidden="true"><span class="leave-orbit leave-orbit-a"></span><span class="leave-orbit leave-orbit-b"></span><span class="leave-orbit leave-orbit-c"></span><span class="leave-orbit-core"><small>สิทธิ์คงเหลือ</small><strong>12<span>วัน</span></strong><em>จาก 15 วัน</em></span><span class="leave-satellite leave-satellite-a"><b>3 / 15</b><small>ลาพักร้อน</small></span><span class="leave-satellite leave-satellite-b"><b>1 / 3</b><small>ลากิจ</small></span><span class="leave-satellite leave-satellite-c"><b>1 / 5</b><small>ลาป่วย</small></span><i class="leave-star leave-star-a"></i><i class="leave-star leave-star-b"></i><i class="leave-star leave-star-c"></i></div></section><section class="leave-kpi-grid"><article class="leave-kpi-card teal"><span class="leave-kpi-icon">' + icon('calendar') + '</span><span><small>สิทธิ์คงเหลือ</small><strong>12 วัน</strong><em>จาก 15 วันต่อปี</em></span><span class="leave-kpi-bar"><i style="width:80%"></i></span></article><article class="leave-kpi-card purple"><span class="leave-kpi-icon">' + icon('trend') + '</span><span><small>ใช้ไปแล้ว</small><strong>03 วัน</strong><em>20% ของสิทธิ์ปีนี้</em></span><span class="leave-kpi-bar"><i style="width:20%"></i></span></article><article class="leave-kpi-card amber"><span class="leave-kpi-icon">' + icon('clock') + '</span><span><small>รออนุมัติ</small><strong>02 รายการ</strong><em>ส่งล่าสุด 16 ตุลาคม</em></span><span class="leave-kpi-status">กำลังตรวจ</span></article><article class="leave-kpi-card blue"><span class="leave-kpi-icon">' + icon('people') + '</span><span><small>ทีมกำลังลา</small><strong>03 คน</strong><em>สัปดาห์นี้</em></span><span class="leave-kpi-status">ดูวันลาและกิจกรรมของทีม</span></article></section><section class="leave-content-grid"><form id="leave-inline-form" class="leave-form-card" data-inline="true"><div class="leave-card-heading"><span class="leave-card-icon teal">' + icon('calendar') + '</span><span><small>NEW REQUEST</small><h2>ขออนุญาตลางาน</h2><p>เลือกประเภทลา วันลา และรายละเอียดให้ครบ</p></span><span class="leave-balance-chip">เหลือ 12 วัน</span></div><div class="form-grid leave-form-grid">' + requestFields('leave') + '</div><div class="leave-form-foot"><span>' + icon('shield') + ' ผู้อนุมัติ: หัวหน้าตรง · HR</span><button class="btn primary teal-btn" type="submit">ส่งคำขอลา ' + icon('arrow') + '</button></div></form><div class="leave-side-stack"><section class="leave-balance-panel"><div class="leave-panel-head"><span><small>LEAVE BALANCE</small><h2>สิทธิ์การลา</h2></span><span class="leave-panel-icon purple">' + icon('spark') + '</span></div><div class="leave-balance-body"><div class="leave-balance-ring"><strong>80<span>%</span></strong><small>คงเหลือ</small></div><div class="leave-balance-list"><span><small>ใช้ไปแล้ว</small><b>03 วัน</b></span><span><small>คงเหลือ</small><b>12 วัน</b></span><span><small>รีเซ็ตสิทธิ์</small><b>01 ม.ค. 2570</b></span></div></div><div class="leave-balance-track"><i style="width:20%"></i></div></section><section class="leave-upcoming-panel"><div class="leave-panel-head"><span><small>UPCOMING LEAVE</small><h2>กำลังจะลา</h2></span><span class="leave-panel-count">3 คน</span></div><div class="leave-upcoming-list"><div class="leave-upcoming-row"><span class="leave-date-bubble"><b>21</b><small>ต.ค.</small></span><span><strong>นภัสสร ใจดี</strong><small>ลาพักร้อน · 2 วัน</small></span><span class="pill teal">ลา</span></div><div class="leave-upcoming-row"><span class="leave-date-bubble purple"><b>22</b><small>ต.ค.</small></span><span><strong>อธิป วัฒนกุล</strong><small>ลาพักร้อน · 1 วัน</small></span><span class="pill purple">ลา</span></div><div class="leave-upcoming-row"><span class="leave-date-bubble amber"><b>20</b><small>ต.ค.</small></span><span><strong>กาญจนา นุกูลการ</strong><small>ลากิจ · 1 วัน</small></span><span class="pill amber">ลากิจ</span></div></div></section></div></section><section class="leave-history-panel"><div class="leave-panel-head"><span><small>LEAVE HISTORY</small><h2>ประวัติการลา</h2></span><span class="leave-panel-count">3 รายการ</span></div><div class="leave-request-list"><div class="leave-request-row"><span class="leave-request-icon amber">' + icon('calendar') + '</span><span><strong>ลาพักร้อน · 21–22 ตุลาคม 2569</strong><small>LV-2026-0108 · ส่งเมื่อ 16 ตุลาคม</small></span>' + pill('รออนุมัติ', 'amber') + '<span class="leave-request-amount">2 วัน</span></div><div class="leave-request-row"><span class="leave-request-icon green">' + icon('check') + '</span><span><strong>ลากิจ · 04 ตุลาคม 2569</strong><small>LV-2026-0104 · ปิดรายการแล้ว</small></span>' + pill('อนุมัติแล้ว', 'green') + '<span class="leave-request-amount">1 วัน</span></div><div class="leave-request-row"><span class="leave-request-icon green">' + icon('check') + '</span><span><strong>ลาป่วย · 28 กันยายน 2569</strong><small>LV-2026-0092 · ครึ่งวัน</small></span>' + pill('อนุมัติแล้ว', 'green') + '<span class="leave-request-amount">0.5 วัน</span></div></div></section></div>', 'leave-page');
}

function galaxyKpiCard(item) {
  return '<article class="leave-kpi-card ' + item.tone + '"><span class="leave-kpi-icon">' + icon(item.icon) + '</span><span><small>' + item.label + '</small><strong>' + item.value + '</strong><em>' + item.note + '</em></span>' + (item.bar ? '<span class="leave-kpi-bar"><i style="width:' + item.bar + '"></i></span>' : '<span class="leave-kpi-status">' + item.status + '</span>') + '</article>';
}

function galaxyUpcomingRow(item) {
  return '<div class="leave-upcoming-row"><span class="leave-date-bubble ' + (item.tone || '') + '"><b>' + item.date + '</b><small>' + item.month + '</small></span><span><strong>' + item.name + '</strong><small>' + item.detail + '</small></span><span class="pill ' + item.tone + '">' + item.status + '</span></div>';
}

function galaxyHistoryRow(item) {
  return '<div class="leave-request-row"><span class="leave-request-icon ' + item.tone + '">' + icon(item.icon) + '</span><span><strong>' + item.title + '</strong><small>' + item.note + '</small></span>' + pill(item.status, item.tone) + '<span class="leave-request-amount">' + item.amount + '</span></div>';
}

function moduleGalaxyPage(id) {
  var configs = {
    overtime: {
      title: 'OT', kicker: 'OVERTIME / TODAY', headlineA: 'ทำ OT แบบมีแผน', headlineB: 'งานเสร็จ ทีมไม่ล้า', desc: 'ส่งคำขอและเช็กชั่วโมง OT ได้ในหน้าเดียว', icon: 'clock', coreLabel: 'ชั่วโมงเดือนนี้', coreValue: '18.5', coreUnit: 'ชม.', coreNote: 'จากเป้า 50 ชม.', meta: [['18.5', 'ชม. OT'], ['01', 'รออนุมัติ'], ['12', 'ชม. อนุมัติแล้ว']], satellites: [['01', 'รออนุมัติ'], ['42.5', 'ทั้งทีม'], ['85%', 'ใช้เป้า']], formId: 'overtime-inline-form', formTitle: 'ขอทำ OT', formNote: 'เลือกวัน เวลา และเหตุผลให้ครบ', formPolicy: 'ผู้อนุมัติ: หัวหน้าตรง · HR', balanceEyebrow: 'OT SUMMARY', balanceTitle: 'สรุปชั่วโมง', ring: '37', ringUnit: '%', ringLabel: 'ใช้ไป', rows: [['ใช้ไปแล้ว', '18.5 ชม.'], ['คงเป้า', '31.5 ชม.'], ['รอบตัด', '25 ต.ค.']], progress: '37', upcomingEyebrow: 'UPCOMING OT', upcomingTitle: 'OT ที่กำลังจะถึง', upcomingCount: '2 รายการ', upcoming: [{date: '23', month: 'ต.ค.', name: 'อธิป วัฒนกุล', detail: 'ปิดงบไตรมาส 4 · 2.5 ชม.', status: 'รออนุมัติ', tone: 'amber'}, {date: '24', month: 'ต.ค.', name: 'นภัสสร ใจดี', detail: 'ตรวจเอกสารลูกค้า · 3 ชม.', status: 'ร่าง', tone: 'purple'}], history: [{icon: 'clock', tone: 'amber', title: 'OT ปิดงบไตรมาส 4', note: 'OT-2026-0108 · 23 ตุลาคม · ส่งเมื่อ 16 ตุลาคม', status: 'รออนุมัติ', amount: '2.5 ชม.'}, {icon: 'check', tone: 'green', title: 'ตรวจเอกสารลูกค้า', note: 'OT-2026-0102 · 17 ตุลาคม · ปิดรายการแล้ว', status: 'อนุมัติแล้ว', amount: '4 ชม.'}, {icon: 'check', tone: 'green', title: 'สรุปยอด Payroll', note: 'OT-2026-0098 · 11 ตุลาคม · จ่ายแล้ว', status: 'จ่ายแล้ว', amount: '3 ชม.'}]
    },
    medical: {
      title: 'ค่ารักษา', kicker: 'MEDICAL / BENEFIT', headlineA: 'ดูแลตัวเองง่าย', headlineB: 'เบิกได้สบายใจ', desc: 'ส่งเอกสารและเช็กวงเงินค่ารักษาได้ในหน้าเดียว', icon: 'bank', coreLabel: 'คงเหลือปีนี้', coreValue: '6,160', coreUnit: '฿', coreNote: 'จากสิทธิ์ ฿10,000', meta: [['฿6,160', 'คงเหลือ'], ['02', 'รอตรวจ'], ['฿3,840', 'ใช้ไปแล้ว']], satellites: [['฿800', 'รายการล่าสุด'], ['02', 'รอตรวจ'], ['฿1,000', 'สูงสุด/ครั้ง']], formId: 'medical-inline-form', formTitle: 'ยื่นเบิกค่ารักษา', formNote: 'แนบใบเสร็จแล้วส่งได้เลย', formPolicy: 'สิทธิ์ปีละ ฿10,000 · ครั้งละไม่เกิน ฿1,000', balanceEyebrow: 'MEDICAL BALANCE', balanceTitle: 'วงเงินของคุณ', ring: '38', ringUnit: '%', ringLabel: 'ใช้ไป', rows: [['ใช้ไปแล้ว', '฿3,840'], ['คงเหลือ', '฿6,160'], ['สูงสุด/ครั้ง', '฿1,000']], progress: '38.4', upcomingEyebrow: 'RECENT CLAIMS', upcomingTitle: 'รายการที่กำลังตรวจ', upcomingCount: '2 รายการ', upcoming: [{date: '16', month: 'ต.ค.', name: 'คลินิกสุขภาพดี', detail: 'ผู้ป่วยนอก · ฿800', status: 'รอตรวจ', tone: 'amber'}, {date: '03', month: 'ต.ค.', name: 'โรงพยาบาลกรุงเทพ', detail: 'ผู้ป่วยนอก · ฿950', status: 'อนุมัติแล้ว', tone: 'green'}], history: [{icon: 'bank', tone: 'amber', title: 'คลินิกสุขภาพดี', note: 'MC-2026-0108 · 16 ตุลาคม · ผู้ป่วยนอก', status: 'รอตรวจสอบ', amount: '฿800'}, {icon: 'check', tone: 'green', title: 'โรงพยาบาลกรุงเทพ', note: 'MC-2026-0091 · 03 ตุลาคม · ผู้ป่วยนอก', status: 'อนุมัติแล้ว', amount: '฿950'}, {icon: 'check', tone: 'green', title: 'วัคซีนและตรวจสุขภาพ', note: 'MC-2026-0084 · 21 กันยายน', status: 'จ่ายแล้ว', amount: '฿850'}]
    },
    correction: {
      title: 'แก้ไขเวลา', kicker: 'TIME / TODAY', headlineA: 'เวลาไม่ตรง', headlineB: 'แก้ให้จบในหน้าเดียว', desc: 'ส่งคำขอแก้ไขเวลา พร้อมติดตามสถานะได้ทันที', icon: 'file', coreLabel: 'รอพิจารณา', coreValue: '01', coreUnit: 'รายการ', coreNote: 'ส่งเมื่อ 14 ตุลาคม', meta: [['01', 'รอพิจารณา'], ['04', 'อนุมัติแล้ว'], ['08.0', 'ชั่วโมงแก้ไข']], satellites: [['03', 'วัน deadline'], ['04', 'อนุมัติแล้ว'], ['08.0', 'ชม. แก้ไข']], formId: 'correction-inline-form', formTitle: 'ขอแก้ไขเวลา', formNote: 'เลือกวัน เวลา และเหตุผลให้ครบ', formPolicy: 'ส่งคำขอภายใน 3 วันหลังเกิดเหตุ', balanceEyebrow: 'TIME CORRECTION', balanceTitle: 'สถานะคำขอ', ring: '80', ringUnit: '%', ringLabel: 'ผ่านแล้ว', rows: [['รอพิจารณา', '01 รายการ'], ['อนุมัติแล้ว', '04 รายการ'], ['deadline', '3 วัน']], progress: '80', upcomingEyebrow: 'PENDING REVIEW', upcomingTitle: 'รายการที่ต้องติดตาม', upcomingCount: '1 รายการ', upcoming: [{date: '14', month: 'ต.ค.', name: 'ลืมลงเวลาออก', detail: '09:02–18:05 · ส่งคำขอแล้ว', status: 'รออนุมัติ', tone: 'amber'}, {date: '07', month: 'ต.ค.', name: 'เข้าไม่ถูกต้อง', detail: '09:18–18:02 · ปิดรายการแล้ว', status: 'อนุมัติแล้ว', tone: 'green'}], history: [{icon: 'file', tone: 'amber', title: 'ลืมลงเวลาออก', note: 'TC-2026-0108 · 14 ตุลาคม · ส่งเมื่อ 14 ตุลาคม', status: 'รออนุมัติ', amount: '1 รายการ'}, {icon: 'check', tone: 'green', title: 'เข้าไม่ถูกต้อง', note: 'TC-2026-0094 · 07 ตุลาคม · ปิดรายการแล้ว', status: 'อนุมัติแล้ว', amount: '1 รายการ'}]
    }
  };
  var d = configs[id] || configs.overtime;
  var satellites = d.satellites.map(function (item, index) { return '<span class="leave-satellite leave-satellite-' + String.fromCharCode(97 + index) + '"><b>' + item[0] + '</b><small>' + item[1] + '</small></span>'; }).join('');
  var meta = d.meta.map(function (item) { return '<span><b>' + item[0] + '</b><small>' + item[1] + '</small></span>'; }).join('');
  return shell('<div class="leave-workspace module-workspace"><section class="leave-galaxy-hero"><div class="leave-hero-stars"></div><div class="leave-hero-copy"><span class="leave-kicker"><span class="live-dot"></span> <span class="leave-live-date" data-live-date>' + currentDateLabel() + '</span> เวลา <time class="dashboard-live-clock leave-live-clock" data-live-clock>' + currentClock() + '</time></span><h1>' + d.headlineA + '<br><em>' + d.headlineB + '</em></h1><span class="leave-hero-en">' + d.kicker + '</span><p>' + d.desc + '</p><div class="leave-hero-meta">' + meta + '</div></div><div class="leave-orbit-visual" aria-hidden="true"><span class="leave-orbit leave-orbit-a"></span><span class="leave-orbit leave-orbit-b"></span><span class="leave-orbit leave-orbit-c"></span><span class="leave-orbit-core"><small>' + d.coreLabel + '</small><strong>' + d.coreValue + '<span>' + d.coreUnit + '</span></strong><em>' + d.coreNote + '</em></span>' + satellites + '<i class="leave-star leave-star-a"></i><i class="leave-star leave-star-b"></i><i class="leave-star leave-star-c"></i></div></section><section class="leave-kpi-grid">' + (id === 'overtime' ? [galaxyKpiCard({tone: 'amber', icon: 'clock', label: 'ชั่วโมง OT เดือนนี้', value: '18.5 ชม.', note: 'เพิ่มขึ้น 4.5 ชม.', bar: '37%'}), galaxyKpiCard({tone: 'purple', icon: 'file', label: 'รออนุมัติ', value: '01 รายการ', note: 'ต้องติดตามวันนี้', status: 'กำลังตรวจ'}), galaxyKpiCard({tone: 'green', icon: 'check', label: 'อนุมัติแล้ว', value: '12 ชม.', note: 'พร้อมส่ง Payroll', bar: '68%'}), galaxyKpiCard({tone: 'teal', icon: 'bank', label: 'ประมาณการ', value: '฿3,840', note: 'ก่อนหักภาษี', status: 'เดือนนี้'})].join('') : id === 'medical' ? [galaxyKpiCard({tone: 'teal', icon: 'bank', label: 'วงเงินคงเหลือ', value: '฿6,160', note: 'จาก ฿10,000 / ปี', bar: '61.6%'}), galaxyKpiCard({tone: 'amber', icon: 'file', label: 'รอตรวจสอบ', value: '02 รายการ', note: 'รวม ฿1,450', status: 'กำลังตรวจ'}), galaxyKpiCard({tone: 'green', icon: 'check', label: 'อนุมัติเดือนนี้', value: '฿2,640', note: 'ครั้งละไม่เกิน ฿1,000', bar: '38%'}), galaxyKpiCard({tone: 'purple', icon: 'alert', label: 'เอกสารต้องแก้', value: '01 รายการ', note: 'รอแนบใบเสร็จใหม่', status: 'ต้องแก้ไข'})].join('') : [galaxyKpiCard({tone: 'purple', icon: 'clock', label: 'รายการรอพิจารณา', value: '01 รายการ', note: 'ส่งเมื่อ 14 ตุลาคม', status: 'รออนุมัติ'}), galaxyKpiCard({tone: 'green', icon: 'check', label: 'อนุมัติเดือนนี้', value: '04 รายการ', note: 'จาก 05 รายการ', bar: '80%'}), galaxyKpiCard({tone: 'teal', icon: 'file', label: 'ชั่วโมงที่แก้ไข', value: '08.0 ชม.', note: 'เดือนตุลาคม', bar: '54%'}), galaxyKpiCard({tone: 'amber', icon: 'alert', label: 'กำหนดส่งคำขอ', value: '03 วัน', note: 'หลังวันที่เกิดเหตุ', status: 'deadline'})].join('')) + '</section><section class="leave-content-grid"><form id="' + d.formId + '" class="leave-form-card" data-inline="true"><div class="leave-card-heading"><span class="leave-card-icon ' + (id === 'overtime' ? 'amber' : id === 'medical' ? 'green' : 'purple') + '">' + icon(d.icon) + '</span><span><small>NEW REQUEST</small><h2>' + d.formTitle + '</h2><p>' + d.formNote + '</p></span><span class="leave-balance-chip">' + (id === 'medical' ? 'เหลือ ฿6,160' : id === 'overtime' ? 'เหลือ 31.5 ชม.' : 'deadline 3 วัน') + '</span></div><div class="form-grid leave-form-grid">' + requestFields(id) + '</div><div class="leave-form-foot"><span>' + icon('shield') + ' ' + d.formPolicy + '</span><button class="btn primary ' + (id === 'overtime' ? 'amber-btn' : id === 'medical' ? 'teal-btn' : 'purple-btn') + '" type="submit">ส่งรายการ ' + icon('arrow') + '</button></div></form><div class="leave-side-stack"><section class="leave-balance-panel"><div class="leave-panel-head"><span><small>' + d.balanceEyebrow + '</small><h2>' + d.balanceTitle + '</h2></span><span class="leave-panel-icon purple">' + icon(d.icon) + '</span></div><div class="leave-balance-body"><div class="leave-balance-ring"><strong>' + d.ring + '<span>' + d.ringUnit + '</span></strong><small>' + d.ringLabel + '</small></div><div class="leave-balance-list">' + d.rows.map(function (row) { return '<span><small>' + row[0] + '</small><b>' + row[1] + '</b></span>'; }).join('') + '</div></div><div class="leave-balance-track"><i style="width:' + d.progress + '%"></i></div></section><section class="leave-upcoming-panel"><div class="leave-panel-head"><span><small>' + d.upcomingEyebrow + '</small><h2>' + d.upcomingTitle + '</h2></span><span class="leave-panel-count">' + d.upcomingCount + '</span></div><div class="leave-upcoming-list">' + d.upcoming.map(galaxyUpcomingRow).join('') + '</div></section></div></section><section class="leave-history-panel"><div class="leave-panel-head"><span><small>RECENT ACTIVITY</small><h2>รายการล่าสุด</h2></span><span class="leave-panel-count">' + d.history.length + ' รายการ</span></div><div class="leave-request-list">' + d.history.map(galaxyHistoryRow).join('') + '</div></section></div>', 'leave-page module-page module-' + id);
}

function attendanceGalaxyPage() {
  var kpis = [
    { tone: 'teal', icon: 'check', label: 'ลงเวลาปกติ', value: '86 คน', note: 'วันนี้ · 83.5% ของทีม', bar: '84%' },
    { tone: 'amber', icon: 'clock', label: 'มาสาย', value: '09 คน', note: 'ต้องติดตามวันนี้', status: 'ดูรายการ' },
    { tone: 'purple', icon: 'arrow', label: 'ลงเวลาออกก่อน', value: '04 คน', note: 'วันนี้ · 3.9% ของทีม', status: 'ดูรายการ' },
    { tone: 'red', icon: 'alert', label: 'ไม่ลงเวลา', value: '04 คน', note: 'ต้องตรวจสอบ', status: 'เปิดคิว' }
  ];
  var history = [
    { icon: 'check', tone: 'green', title: 'ลงเวลาเข้า · วันนี้', note: 'AT-2026-1019 · 09:02 น. · สำนักงาน', status: 'ปกติ', amount: '09:02' },
    { icon: 'clock', tone: 'amber', title: 'ลงเวลาเข้า · 15 ตุลาคม', note: 'AT-2026-1015 · 09:18 น. · สาย 18 นาที', status: 'มาสาย', amount: '+18 น.' },
    { icon: 'file', tone: 'purple', title: 'ขอแก้ไขเวลา · 14 ตุลาคม', note: 'TC-2026-0108 · ลืมลงเวลาออก', status: 'รออนุมัติ', amount: '1 รายการ' }
  ];
  var satellites = [['86', 'ปกติวันนี้'], ['09', 'มาสาย'], ['04', 'ไม่ลงเวลา']].map(function (item, index) { return '<span class="leave-satellite leave-satellite-' + String.fromCharCode(97 + index) + '"><b>' + item[0] + '</b><small>' + item[1] + '</small></span>'; }).join('');
  return shell('<div class="leave-workspace module-workspace"><section class="leave-galaxy-hero"><div class="leave-hero-stars"></div><div class="leave-hero-copy"><span class="leave-kicker"><span class="live-dot"></span> <span class="leave-live-date" data-live-date>' + currentDateLabel() + '</span> เวลา <time class="dashboard-live-clock leave-live-clock" data-live-clock>' + currentClock() + '</time></span><h1>ลงเวลาได้ชัด<br><em>แก้ไขได้ทันที</em></h1><span class="leave-hero-en">ATTENDANCE WORKSPACE</span><p>เช็กเวลาเข้าออกและส่งแก้ไขได้ในหน้าเดียว</p><div class="leave-hero-meta"><span><b>09:02</b><small>เข้างานวันนี้</small></span><span><b>98%</b><small>ลงเวลาครบ</small></span><span><b>01</b><small>รอแก้ไข</small></span></div></div><div class="leave-orbit-visual" aria-hidden="true"><span class="leave-orbit leave-orbit-a"></span><span class="leave-orbit leave-orbit-b"></span><span class="leave-orbit leave-orbit-c"></span><span class="leave-orbit-core"><small>ลงเวลาครบ</small><strong>98<span>%</span></strong><em>จากทีมทั้งหมด</em></span>' + satellites + '<i class="leave-star leave-star-a"></i><i class="leave-star leave-star-b"></i><i class="leave-star leave-star-c"></i></div></section><section class="leave-kpi-grid">' + kpis.map(galaxyKpiCard).join('') + '</section><section class="leave-content-grid"><form id="correction-inline-form" class="leave-form-card" data-inline="true"><div class="leave-card-heading"><span class="leave-card-icon purple">' + icon('file') + '</span><span><h2>แก้ไขเวลา</h2><small>TIME CORRECTION</small><p>เวลาไม่ตรง? เลือกวันแล้วส่งคำขอได้เลย</p></span><span class="leave-balance-chip">ส่งภายใน 3 วัน</span></div><div class="form-grid leave-form-grid">' + requestFields('correction') + '</div><div class="leave-form-foot"><span>' + icon('shield') + ' ระบบตรวจสอบโดยหัวหน้าตรง · HR</span><button class="btn primary purple-btn" type="submit">ส่งคำขอแก้ไขเวลา ' + icon('arrow') + '</button></div></form><div class="leave-side-stack"><section class="leave-balance-panel"><div class="leave-panel-head"><span><h2>สรุปการลงเวลา</h2><small>ATTENDANCE SUMMARY</small></span><span class="leave-panel-icon teal">' + icon('target') + '</span></div><div class="leave-balance-body"><div class="leave-balance-ring"><strong>98<span>%</span></strong><small>ครบถ้วน</small></div><div class="leave-balance-list"><span><small>ทำงานแล้ว</small><b>13 / 22 วัน</b></span><span><small>มาสาย</small><b>01 ครั้ง</b></span><span><small>เฉลี่ยต่อวัน</small><b>8 ชม. 12 น.</b></span></div></div><div class="leave-balance-track"><i style="width:98%"></i></div></section><section class="leave-upcoming-panel"><div class="leave-panel-head"><span><h2>วันนี้</h2><small>TODAY TIMELINE</small></span><span class="leave-panel-count">3 ขั้นตอน</span></div><div class="leave-upcoming-list"><div class="leave-upcoming-row"><span class="leave-date-bubble teal"><b>09:02</b><small>เข้า</small></span><span><strong>ลงเวลาเข้า</strong><small>สำนักงาน · Chrome</small></span><span class="pill green">สำเร็จ</span></div><div class="leave-upcoming-row"><span class="leave-date-bubble purple"><b>12:00</b><small>พัก</small></span><span><strong>พักกลางวัน</strong><small>ยังไม่บันทึก</small></span><span class="pill muted">รอ</span></div><div class="leave-upcoming-row"><span class="leave-date-bubble amber"><b>18:00</b><small>ออก</small></span><span><strong>ลงเวลาออก</strong><small>กดบันทึกเมื่อเลิกงาน</small></span><span class="pill muted">รอ</span></div></div></section></div></section><section class="leave-history-panel"><div class="leave-panel-head"><span><h2>รายการล่าสุด</h2><small>RECENT ATTENDANCE</small></span><span class="leave-panel-count">3 รายการ</span></div><div class="leave-request-list">' + history.map(galaxyHistoryRow).join('') + '</div></section></div>', 'leave-page module-page module-attendance');
}

function approvalsGalaxyPage() {
  var kpis = [
    { tone: 'purple', icon: 'check', label: 'รอพิจารณา', value: '08 รายการ', note: 'รายการใหม่ 3 รายการ', status: 'เปิดคิว' },
    { tone: 'amber', icon: 'alert', label: 'ครบกำหนดวันนี้', value: '02 รายการ', note: 'ต้องจัดการภายในวันนี้', status: 'ด่วน' },
    { tone: 'green', icon: 'trend', label: 'อนุมัติเดือนนี้', value: '24 รายการ', note: 'จากทั้งหมด 27 รายการ', bar: '89%' },
    { tone: 'teal', icon: 'clock', label: 'เวลาเฉลี่ย', value: '04 ชม.', note: 'เร็วกว่าเป้า 2 ชั่วโมง', status: 'ดีขึ้น' }
  ];
  var queue = [
    { tone: 'purple', icon: 'calendar', title: 'นภัสสร ใจดี · ลาพักร้อน', note: '21–22 ตุลาคม 2569 · 2 วัน · ส่งเมื่อ 09:12', status: 'ใหม่', amount: '2 วัน' },
    { tone: 'amber', icon: 'clock', title: 'อธิป วัฒนกุล · ขอทำ OT', note: '23 ตุลาคม · 18:00–20:30 · ส่งเมื่อ 08:42', status: 'รอพิจารณา', amount: '2.5 ชม.' },
    { tone: 'teal', icon: 'bank', title: 'กาญจนา นุกูลการ · เบิกค่ารักษา', note: 'คลินิกสุขภาพดี · ใบเสร็จ ฿800 · ส่งเมื่อวาน', status: 'ตรวจเอกสาร', amount: '฿800' }
  ];
  var history = [
    { icon: 'check', tone: 'green', title: 'ลาพักร้อน · นภัสสร ใจดี', note: 'LV-2026-0088 · อนุมัติเมื่อ 15 ต.ค.', status: 'อนุมัติแล้ว', amount: '2 วัน' },
    { icon: 'check', tone: 'green', title: 'ขอทำ OT · อธิป วัฒนกุล', note: 'OT-2026-0094 · อนุมัติเมื่อ 12 ต.ค.', status: 'อนุมัติแล้ว', amount: '4 ชม.' },
    { icon: 'close', tone: 'red', title: 'เบิกค่ารักษา · ปาริชาติ', note: 'MC-2026-0089 · ส่งกลับเมื่อ 10 ต.ค.', status: 'ส่งกลับ', amount: '฿650' }
  ];
  var queueRows = queue.map(function (item) { return '<div class="leave-request-row approval-queue-row"><span class="leave-request-icon ' + item.tone + '">' + icon(item.icon) + '</span><span><strong>' + item.title + '</strong><small>' + item.note + '</small></span>' + pill(item.status, item.tone) + '<span class="leave-request-amount">' + item.amount + '</span><span class="approval-inline-actions"><button class="btn outline" type="button" data-action="reject">ส่งกลับ</button><button class="btn primary ' + item.tone + '-btn" type="button" data-action="approve">อนุมัติ</button></span></div>'; }).join('');
  return shell('<div class="leave-workspace module-workspace"><section class="leave-galaxy-hero"><div class="leave-hero-stars"></div><div class="leave-hero-copy"><span class="leave-kicker"><span class="live-dot"></span> <span class="leave-live-date" data-live-date>' + currentDateLabel() + '</span> เวลา <time class="dashboard-live-clock leave-live-clock" data-live-clock>' + currentClock() + '</time></span><h1>ตัดสินใจไว<br><em>งานไหลลื่น</em></h1><span class="leave-hero-en">APPROVAL CENTER</span><p>รวมคิวอนุมัติทุกเรื่องไว้ให้จัดการในหน้าเดียว</p><div class="leave-hero-meta"><span><b>8</b><small>รอพิจารณา</small></span><span><b>03</b><small>รายการใหม่</small></span><span><b>24</b><small>อนุมัติเดือนนี้</small></span></div></div><div class="leave-orbit-visual" aria-hidden="true"><span class="leave-orbit leave-orbit-a"></span><span class="leave-orbit leave-orbit-b"></span><span class="leave-orbit leave-orbit-c"></span><span class="leave-orbit-core"><small>รอพิจารณา</small><strong>08<span>รายการ</span></strong><em>ตัดสินใจวันนี้</em></span><span class="leave-satellite leave-satellite-a"><b>03</b><small>รายการใหม่</small></span><span class="leave-satellite leave-satellite-b"><b>02</b><small>ครบกำหนด</small></span><span class="leave-satellite leave-satellite-c"><b>24</b><small>อนุมัติแล้ว</small></span><i class="leave-star leave-star-a"></i><i class="leave-star leave-star-b"></i><i class="leave-star leave-star-c"></i></div></section><section class="leave-kpi-grid">' + kpis.map(galaxyKpiCard).join('') + '</section><section class="leave-content-grid"><section class="leave-form-card approval-queue-card"><div class="leave-card-heading"><span class="leave-card-icon purple">' + icon('check') + '</span><span><h2>คิวรอพิจารณา</h2><small>PENDING DECISIONS</small><p>เปิดดูรายละเอียด แล้วอนุมัติหรือส่งกลับได้ทันที</p></span><span class="leave-balance-chip">08 รายการ</span></div><div class="leave-request-list approval-queue-list">' + queueRows + '</div></section><div class="leave-side-stack"><section class="leave-balance-panel"><div class="leave-panel-head"><span><h2>ภาพรวมการอนุมัติ</h2><small>APPROVAL HEALTH</small></span><span class="leave-panel-icon purple">' + icon('trend') + '</span></div><div class="leave-balance-body"><div class="leave-balance-ring purple-ring"><strong>89<span>%</span></strong><small>สำเร็จ</small></div><div class="leave-balance-list"><span><small>อนุมัติแล้ว</small><b>24 รายการ</b></span><span><small>ส่งกลับ</small><b>03 รายการ</b></span><span><small>เวลาเฉลี่ย</small><b>04 ชั่วโมง</b></span></div></div><div class="leave-balance-track"><i style="width:89%"></i></div></section><section class="leave-upcoming-panel"><div class="leave-panel-head"><span><h2>ต้องจัดการวันนี้</h2><small>TODAY PRIORITY</small></span><span class="leave-panel-count">02 ด่วน</span></div><div class="leave-upcoming-list"><div class="leave-upcoming-row"><span class="leave-date-bubble amber"><b>02</b><small>วันนี้</small></span><span><strong>ครบกำหนด SLA</strong><small>คำขอลา · ค่ารักษา</small></span><span class="pill amber">ด่วน</span></div><div class="leave-upcoming-row"><span class="leave-date-bubble purple"><b>03</b><small>ใหม่</small></span><span><strong>รายการใหม่</strong><small>เข้าคิววันนี้ 3 รายการ</small></span><span class="pill purple">ใหม่</span></div></div></section></div></section><section class="leave-history-panel"><div class="leave-panel-head"><span><h2>ประวัติการตัดสินใจ</h2><small>RECENT DECISIONS</small></span><span class="leave-panel-count">24 รายการ</span></div><div class="leave-request-list">' + history.map(galaxyHistoryRow).join('') + '</div></section></div>', 'leave-page module-page module-approvals');
}

function reportsGalaxyPage() {
  var kpis = [
    { tone: 'teal', icon: 'target', label: 'ลงเวลาครบ', value: '98.6%', note: 'ดีขึ้นจากเดือนก่อน', bar: '98.6%' },
    { tone: 'purple', icon: 'calendar', label: 'วันที่ลาเฉลี่ย', value: '1.8 วัน', note: 'ต่อคน · เดือนนี้', status: 'ต่ำกว่าเป้า' },
    { tone: 'amber', icon: 'clock', label: 'ชั่วโมง OT', value: '42.5 ชม.', note: 'รวมทั้งทีม', status: 'ดูแนวโน้ม' },
    { tone: 'green', icon: 'bank', label: 'ใช้สิทธิ์ค่ารักษา', value: '38%', note: 'ของงบทั้งปี', bar: '38%' }
  ];
  var rows = [
    { icon: 'calendar', tone: 'teal', title: 'สรุปการลารายเดือน', note: 'จำนวนวันลา · ทีม · แนวโน้ม', status: 'เปิดรายงาน', amount: 'OCT 2026' },
    { icon: 'clock', tone: 'amber', title: 'OT และต้นทุนค่าตอบแทน', note: 'ชั่วโมง · เรท · รอบ Payroll', status: 'เปิดรายงาน', amount: '42.5 ชม.' },
    { icon: 'target', tone: 'purple', title: 'การลงเวลาและการแก้ไข', note: 'มาสาย · ขาดงาน · คำขอแก้ไข', status: 'เปิดรายงาน', amount: '98.6%' }
  ];
  return shell('<div class="leave-workspace module-workspace"><section class="leave-galaxy-hero"><div class="leave-hero-stars"></div><div class="leave-hero-copy"><span class="leave-kicker"><span class="live-dot"></span> <span class="leave-live-date" data-live-date>' + currentDateLabel() + '</span> เวลา <time class="dashboard-live-clock leave-live-clock" data-live-clock>' + currentClock() + '</time></span><h1>ข้อมูลชัด<br><em>ตัดสินใจมั่นใจ</em></h1><span class="leave-hero-en">TEAM INSIGHTS</span><p>สรุปสุขภาพทีมและแนวโน้มสำคัญในภาพเดียว</p><div class="leave-hero-meta"><span><b>86/100</b><small>สุขภาพทีม</small></span><span><b>+14%</b><small>จากเดือนก่อน</small></span><span><b>4</b><small>รายงานพร้อมดู</small></span></div></div><div class="leave-orbit-visual" aria-hidden="true"><span class="leave-orbit leave-orbit-a"></span><span class="leave-orbit leave-orbit-b"></span><span class="leave-orbit leave-orbit-c"></span><span class="leave-orbit-core"><small>TEAM HEALTH</small><strong>86<span>/100</span></strong><em>พร้อมวางแผน</em></span><span class="leave-satellite leave-satellite-a"><b>+14%</b><small>ทีมพร้อมขึ้น</small></span><span class="leave-satellite leave-satellite-b"><b>98.6%</b><small>ลงเวลาครบ</small></span><span class="leave-satellite leave-satellite-c"><b>38%</b><small>ใช้สิทธิ์</small></span><i class="leave-star leave-star-a"></i><i class="leave-star leave-star-b"></i><i class="leave-star leave-star-c"></i></div></section><section class="leave-kpi-grid">' + kpis.map(galaxyKpiCard).join('') + '</section><section class="leave-content-grid"><section class="leave-form-card report-overview-card"><div class="leave-card-heading"><span class="leave-card-icon teal">' + icon('trend') + '</span><span><h2>ภาพรวมประสิทธิภาพทีม</h2><small>TEAM PERFORMANCE</small><p>แนวโน้มการลงเวลาใน 7 วันที่ผ่านมา</p></span><span class="leave-balance-chip">+8.4%</span></div><div class="report-chart-galaxy"><div class="line-chart"><span style="height:42%"></span><span style="height:55%"></span><span style="height:47%"></span><span style="height:70%"></span><span style="height:62%"></span><span style="height:88%"></span><span style="height:81%"></span></div><div class="chart-labels"><span>จ. 13</span><span>อ. 14</span><span>พ. 15</span><span>พฤ. 16</span><span>ศ. 17</span><span>ส. 18</span><span>อา. 19</span></div></div><div class="report-insight-strip"><span class="leave-request-icon green">' + icon('trend') + '</span><span><strong>ทีมพร้อมขึ้น 14%</strong><small>เทียบจากเดือนก่อน · สัญญาณเป็นบวก</small></span><span class="pill green">ดีขึ้น</span></div></section><div class="leave-side-stack"><section class="leave-balance-panel"><div class="leave-panel-head"><span><h2>คะแนนสุขภาพทีม</h2><small>TEAM HEALTH SCORE</small></span><span class="leave-panel-icon teal">' + icon('target') + '</span></div><div class="leave-balance-body"><div class="leave-balance-ring"><strong>86<span>/100</span></strong><small>คะแนน</small></div><div class="leave-balance-list"><span><small>การลงเวลา</small><b>98.6%</b></span><span><small>การลา</small><b>1.8 วัน/คน</b></span><span><small>OT</small><b>42.5 ชม.</b></span></div></div><div class="leave-balance-track"><i style="width:86%"></i></div></section><section class="leave-upcoming-panel"><div class="leave-panel-head"><span><h2>สัญญาณสำคัญ</h2><small>KEY SIGNALS</small></span><span class="leave-panel-count">3 จุด</span></div><div class="leave-upcoming-list"><div class="leave-upcoming-row"><span class="leave-date-bubble teal"><b>+8%</b><small>ลงเวลา</small></span><span><strong>ความสม่ำเสมอดีขึ้น</strong><small>เทียบ 7 วันก่อน</small></span><span class="pill green">บวก</span></div><div class="leave-upcoming-row"><span class="leave-date-bubble amber"><b>42.5</b><small>OT</small></span><span><strong>ภาระงานเพิ่มขึ้น</strong><small>ทีมบัญชีใช้สูงสุด</small></span><span class="pill amber">ดูต่อ</span></div></div></section></div></section><section class="leave-history-panel"><div class="leave-panel-head"><span><h2>รายงานพร้อมดู</h2><small>REPORT LIBRARY</small></span><span class="leave-panel-count">4 รายงาน</span></div><div class="leave-request-list">' + rows.map(galaxyHistoryRow).join('') + '</div></section></div>', 'leave-page module-page module-reports');
}

function settingsGalaxyPage() {
  var policies = [
    { icon: 'calendar', tone: 'teal', title: 'ระบบลา', note: 'ประเภทลา สิทธิ์ และเอกสาร', value: '3 ประเภท' },
    { icon: 'clock', tone: 'amber', title: 'OT', note: 'เรท รอบตัด และสิทธิ์อนุมัติ', value: '3 เรท' },
    { icon: 'target', tone: 'purple', title: 'ลงเวลา', note: 'เวลาทำงาน พิกัด และอุปกรณ์', value: '09:00–18:00' },
    { icon: 'file', tone: 'blue', title: 'แก้ไขเวลา', note: 'เส้นตายและหลักฐานคำขอ', value: '3 วัน' },
    { icon: 'bank', tone: 'green', title: 'ค่ารักษา', note: '฿10,000/ปี · ฿1,000/ครั้ง', value: 'เปิดใช้แล้ว' }
  ];
  var policyRows = policies.map(function (item) { return '<div class="leave-request-row settings-policy-row"><span class="leave-request-icon ' + item.tone + '">' + icon(item.icon) + '</span><span><strong>' + item.title + '</strong><small>' + item.note + '</small></span><span class="pill ' + item.tone + '">' + item.value + '</span><button class="btn outline" type="button" data-action="setting-edit">แก้ไข</button></div>'; }).join('');
  return shell('<div class="leave-workspace module-workspace"><section class="leave-galaxy-hero"><div class="leave-hero-stars"></div><div class="leave-hero-copy"><span class="leave-kicker"><span class="live-dot"></span> <span class="leave-live-date" data-live-date>' + currentDateLabel() + '</span> เวลา <time class="dashboard-live-clock leave-live-clock" data-live-clock>' + currentClock() + '</time></span><h1>ตั้งครั้งเดียว<br><em>ใช้ได้ทั้งทีม</em></h1><span class="leave-hero-en">SYSTEM CONTROL CENTER</span><p>รวมตั้งค่าลา OT เวลา ค่ารักษา และการอนุมัติไว้ที่เดียว</p><div class="leave-hero-meta"><span><b>05</b><small>นโยบายระบบ</small></span><span><b>02</b><small>ระดับอนุมัติ</small></span><span><b>100%</b><small>พร้อมใช้งาน</small></span></div></div><div class="leave-orbit-visual" aria-hidden="true"><span class="leave-orbit leave-orbit-a"></span><span class="leave-orbit leave-orbit-b"></span><span class="leave-orbit leave-orbit-c"></span><span class="leave-orbit-core"><small>นโยบายที่ตั้งไว้</small><strong>05<span>ชุด</span></strong><em>ศูนย์กลางเดียว</em></span><span class="leave-satellite leave-satellite-a"><b>03</b><small>ประเภทลา</small></span><span class="leave-satellite leave-satellite-b"><b>02</b><small>ผู้อนุมัติ</small></span><span class="leave-satellite leave-satellite-c"><b>25</b><small>รอบ Payroll</small></span><i class="leave-star leave-star-a"></i><i class="leave-star leave-star-b"></i><i class="leave-star leave-star-c"></i></div></section><section class="leave-kpi-grid">' + [galaxyKpiCard({tone: 'teal', icon: 'calendar', label: 'ประเภทการลา', value: '03 แบบ', note: 'เปิดใช้งานแล้ว', status: 'ตั้งค่าแล้ว'}), galaxyKpiCard({tone: 'amber', icon: 'clock', label: 'เรท OT', value: '03 เรท', note: 'วันทำงาน · วันหยุด', status: 'ตั้งค่าแล้ว'}), galaxyKpiCard({tone: 'purple', icon: 'bank', label: 'รอบ Payroll', value: 'วันที่ 25', note: 'ทุกเดือน', status: 'อัตโนมัติ'}), galaxyKpiCard({tone: 'green', icon: 'people', label: 'ผู้อนุมัติ', value: '02 ระดับ', note: 'หัวหน้า · HR', bar: '100%'})].join('') + '</section><section class="leave-content-grid"><section class="leave-form-card settings-policy-card"><div class="leave-card-heading"><span class="leave-card-icon teal">' + icon('settings') + '</span><span><h2>นโยบายของระบบ</h2><small>SYSTEM POLICIES</small><p>เลือกหัวข้อเพื่อแก้ไขจากจุดเดียว</p></span><span class="leave-balance-chip">บันทึกอัตโนมัติ</span></div><div class="leave-request-list settings-policy-list">' + policyRows + '</div></section><div class="leave-side-stack"><section class="leave-balance-panel"><div class="leave-panel-head"><span><h2>ศูนย์กลางการตั้งค่า</h2><small>CONTROL CENTER</small></span><span class="leave-panel-icon teal">' + icon('settings') + '</span></div><div class="leave-balance-body"><div class="leave-balance-ring"><strong>100<span>%</span></strong><small>พร้อมใช้</small></div><div class="leave-balance-list"><span><small>นโยบายที่ตั้งแล้ว</small><b>05 ชุด</b></span><span><small>ผู้อนุมัติ</small><b>02 ระดับ</b></span><span><small>อัปเดตล่าสุด</small><b>วันนี้</b></span></div></div><div class="leave-balance-track"><i style="width:100%"></i></div></section><section class="leave-upcoming-panel"><div class="leave-panel-head"><span><h2>การแจ้งเตือน</h2><small>NOTIFICATION RULES</small></span><span class="leave-panel-count">เปิด 3 รายการ</span></div><div class="leave-upcoming-list"><div class="leave-upcoming-row"><span class="leave-date-bubble teal"><b>✓</b><small>คำขอ</small></span><span><strong>แจ้งเตือนคำขอใหม่</strong><small>ระบบและอีเมล</small></span><span class="pill green">เปิด</span></div><div class="leave-upcoming-row"><span class="leave-date-bubble amber"><b>1</b><small>วัน</small></span><span><strong>เตือนใกล้ครบกำหนด</strong><small>ก่อน deadline 1 วัน</small></span><span class="pill green">เปิด</span></div></div></section></div></section><section class="leave-history-panel"><div class="leave-panel-head"><span><h2>กิจกรรมการตั้งค่า</h2><small>RECENT CONFIGURATION</small></span><span class="leave-panel-count">วันนี้ 09:20</span></div><div class="leave-request-list">' + galaxyHistoryRow({icon: 'settings', tone: 'teal', title: 'อัปเดตนโยบายค่ารักษา', note: 'กำหนดวงเงิน ฿10,000/ปี · โดย HR Admin', status: 'บันทึกแล้ว', amount: 'วันนี้'}) + galaxyHistoryRow({icon: 'people', tone: 'purple', title: 'ตั้งผู้อนุมัติระดับ 2', note: 'หัวหน้าทีม → HR · ใช้กับทุกโมดูล', status: 'บันทึกแล้ว', amount: 'เมื่อวาน'}) + '</div></section></div>', 'leave-page module-page module-settings');
}

function attendancePage() {
  var d = { title: 'ลงเวลา & แก้ไขเวลา', tone: 'blue', icon: 'target' };
  return shell(heading('ATTENDANCE / TODAY', d.title, 'เช็กเวลาและแก้ไขรายการได้ในหน้าเดียว', '') + '<section class="attendance-layout"><section class="panel clock-card"><div class="clock-card-head"><div><span class="eyebrow">จันทร์ · 19 ตุลาคม 2569</span><h2>สวัสดี นภัสสร <span>👋</span></h2><p>สำนักงาน CKACE</p></div><span class="online-badge"><i></i> กำลังทำงาน</span></div><div class="clock-readout"><span>เข้างานแล้ว</span><strong>09:02<span>น.</span></strong><small>ตอนนี้ <b>18:16:42</b></small></div><div class="clock-actions"><button class="btn primary" type="button" data-action="attendance-checkout">ลงเวลาออก ' + icon('arrow') + '</button><button class="btn outline" type="button" data-action="attendance-location">ตรวจพิกัด ' + icon('target') + '</button></div><div class="clock-orbit"><span></span><span></span><span></span></div></section><aside class="panel attendance-summary"><span class="eyebrow">THIS MONTH</span><h2>เวลาของคุณ</h2><div class="summary-list"><span><small>ทำงานแล้ว</small><strong>13 / 22 วัน</strong></span><span><small>มาสาย</small><strong class="text-amber">1 ครั้ง</strong></span><span><small>เฉลี่ยต่อวัน</small><strong>8 ชม. 12 น.</strong></span><span><small>พิกัดล่าสุด</small>' + pill('ผ่าน', 'green') + '</span></div><div class="attendance-score"><span class="score-ring"><b>98</b><small>%</small></span><span><strong>ครบถ้วน</strong><small>จากเดือนก่อน +4%</small></span></div></aside></section><section class="attendance-work-grid"><form id="correction-inline-form" class="panel inline-request-form correction-inline" data-inline="true"><div class="form-title"><span class="step-badge purple">↺</span><div><h2>แก้ไขเวลา</h2><p>เวลาไม่ตรง? เลือกวันแล้วส่งคำขอได้เลย</p></div></div><div class="form-grid">' + requestFields('correction') + '</div><div class="form-actions"><button class="btn primary" type="submit">ส่งคำขอแก้ไขเวลา ' + icon('arrow') + '</button></div></form><section class="panel timeline-panel"><div class="section-title"><div><h2>วันนี้</h2><p>บันทึกเวลาเข้าออก</p></div><span class="section-kicker">TODAY</span></div><div class="timeline"><div class="timeline-item"><span class="timeline-dot green"></span><span><strong>ลงเวลาเข้า</strong><small>09:02 น. · พิกัดสำนักงาน · Chrome</small></span>' + pill('สำเร็จ', 'green') + '</div><div class="timeline-item"><span class="timeline-dot muted"></span><span><strong>พักกลางวัน</strong><small>ยังไม่บันทึก</small></span>' + pill('รอ', 'muted') + '</div><div class="timeline-item"><span class="timeline-dot muted"></span><span><strong>ลงเวลาออก</strong><small>ระบบจะบันทึกเมื่อกดลงเวลาออก</small></span>' + pill('รอ', 'muted') + '</div></div><div class="history-strip"><span class="history-strip-icon">' + icon('file') + '</span><span><strong>ประวัติเดือนนี้</strong><small>ครบ 13 วัน · มี 1 รายการรอตรวจ</small></span><span class="pill amber">ตรวจสอบแล้ว</span></div></section></section>');
}

function attendanceHistoryPage() {
  return shell(heading('ATTENDANCE / HISTORY', 'ประวัติการลงเวลา', 'ตรวจสอบเวลาเข้าออกและรายการที่ต้องแก้ไข', '<button class="btn primary" type="button" data-route="correction/request">ขอแก้ไขเวลา ' + icon('plus') + '</button>') + '<section class="panel table-panel"><div class="filter-bar"><div class="filter-tabs"><button class="filter-tab active" type="button">ตุลาคม 2569</button><button class="filter-tab" type="button">กันยายน 2569</button></div><button class="btn outline" type="button" data-action="export">ส่งออก ' + icon('arrow') + '</button></div><div class="table-scroll"><table><thead><tr><th>วันที่</th><th>เวลาเข้า</th><th>เวลาออก</th><th>ชั่วโมง</th><th>สถานะ</th><th></th></tr></thead><tbody>' + tableRow([['จ. 19 ตุลาคม', 'วันนี้'], '09:02 น.', 'กำลังทำงาน', '8.1 ชม.', pill('ปกติ', 'green')], 'จ. 19 ตุลาคม 2569') + tableRow([['ศ. 16 ตุลาคม', 'สำนักงาน'], '09:00 น.', '18:04 น.', '8.1 ชม.', pill('ปกติ', 'green')], 'ศ. 16 ตุลาคม 2569') + tableRow([['พฤ. 15 ตุลาคม', 'สำนักงาน'], '09:18 น.', '18:02 น.', '7.7 ชม.', pill('มาสาย', 'amber')], 'พฤ. 15 ตุลาคม 2569') + '</tbody></table></div></section>');
}
function listPage(id) {
  var d = modules[id];
  var rows = id === 'leave' ? [[['ลาพักร้อน', 'LV-2026-0108'], '21–22 ตุลาคม 2569', '2 วัน', 'นภัสสร', pill('รออนุมัติ', 'amber')], [['ลากิจ', 'LV-2026-0104'], '04 ตุลาคม 2569', '1 วัน', 'นภัสสร', pill('อนุมัติแล้ว', 'green')]] :
    id === 'overtime' ? [[['OT ปิดงบไตรมาส 4', 'OT-2026-0108'], '23 ตุลาคม · 18:00–20:30', '2.5 ชม.', 'นภัสสร', pill('รออนุมัติ', 'amber')], [['ตรวจเอกสารลูกค้า', 'OT-2026-0102'], '17 ตุลาคม · 09:00–13:00', '4 ชม.', 'นภัสสร', pill('อนุมัติแล้ว', 'green')]] :
    id === 'correction' ? [[['14 ตุลาคม 2569', 'TC-2026-0108'], 'ลืมลงเวลาออก', '09:02–—', '09:00–18:05', pill('รออนุมัติ', 'amber')], [['07 ตุลาคม 2569', 'TC-2026-0094'], 'เข้าไม่ถูกต้อง', '09:18–18:02', '09:00–18:02', pill('อนุมัติแล้ว', 'green')]] :
    [[['คลินิกสุขภาพดี', 'MC-2026-0108'], '16 ตุลาคม 2569', 'ผู้ป่วยนอก', '฿800', pill('รอตรวจสอบ', 'amber')], [['โรงพยาบาลกรุงเทพ', 'MC-2026-0091'], '03 ตุลาคม 2569', 'ผู้ป่วยนอก', '฿950', pill('อนุมัติแล้ว', 'green')]];
  return shell(heading(d.eyebrow.replace('WORKSPACE', 'REQUESTS'), 'ประวัติ' + d.title, 'ติดตามรายการทั้งหมดจากตารางเดียว', '<button class="btn primary" type="button" data-route="' + id + '/request">สร้างรายการ ' + icon('plus') + '</button>') + '<section class="panel table-panel"><div class="filter-bar"><div class="filter-tabs"><button class="filter-tab active" type="button">ทั้งหมด <span>6</span></button><button class="filter-tab" type="button">รอดำเนินการ <span>2</span></button><button class="filter-tab" type="button">เสร็จแล้ว <span>3</span></button></div><button class="btn outline" type="button" data-action="filter">' + icon('filter') + ' ตัวกรอง</button></div><div class="table-scroll"><table><thead><tr><th>รายการ</th><th>รายละเอียด</th><th>ข้อมูล</th><th>ผู้รับผิดชอบ</th><th>สถานะ</th><th></th></tr></thead><tbody>' + rows.map(function (row, index) { return tableRow(row, id.toUpperCase() + '-2026-010' + (8 - index)); }).join('') + '</tbody></table></div></section>');
}
function leaveRequestFields() {
  return '<div class="leave-request-fieldset leave-type-fieldset"><div class="leave-fieldset-title"><b>ประเภทลา</b><small>เลือกสิทธิ์ที่ต้องการใช้</small></div><div class="leave-choice-grid" role="radiogroup" aria-label="ประเภทลา">' +
    '<label class="leave-choice is-selected"><input type="radio" name="leaveType" value="vacation" checked><span class="leave-choice-icon purple">' + icon('calendar') + '</span><span><b>ลาพักร้อน</b><small>เหลือ 12 วัน</small></span></label>' +
    '<label class="leave-choice"><input type="radio" name="leaveType" value="business"><span class="leave-choice-icon teal">' + icon('file') + '</span><span><b>ลากิจ</b><small>เหลือ 2 วัน</small></span></label>' +
    '<label class="leave-choice"><input type="radio" name="leaveType" value="sick"><span class="leave-choice-icon rose">' + icon('alert') + '</span><span><b>ลาป่วย</b><small>เหลือ 4 วัน</small></span></label>' +
    '</div></div>' +
    '<div class="leave-request-fieldset leave-date-fieldset"><div class="leave-fieldset-title"><b>เลือกวันลา</b><small>กำหนดช่วงวันที่ต้องการลา</small></div><div class="leave-date-grid"><label><span>วันเริ่มลา</span><input type="date" value="2026-10-21" required></label><label><span>วันสิ้นสุดลา</span><input type="date" value="2026-10-22" required></label></div></div>' +
    '<div class="leave-request-fieldset leave-duration-fieldset"><div class="leave-fieldset-title"><b>ช่วงเวลาที่ลา</b><small>เลือกช่วงเวลาให้ตรงกับคำขอ</small></div><div class="leave-duration-grid">' +
    '<label class="leave-duration-option is-selected"><input type="radio" name="leaveDuration" value="full" checked><span class="leave-duration-icon">' + icon('calendar') + '</span><b>เต็มวัน</b></label>' +
    '<label class="leave-duration-option"><input type="radio" name="leaveDuration" value="morning"><span class="leave-duration-icon">' + icon('spark') + '</span><b>ครึ่งวันเช้า</b></label>' +
    '<label class="leave-duration-option"><input type="radio" name="leaveDuration" value="afternoon"><span class="leave-duration-icon">' + icon('spark') + '</span><b>ครึ่งวันบ่าย</b></label>' +
    '<label class="leave-duration-option"><input type="radio" name="leaveDuration" value="hourly"><span class="leave-duration-icon">' + icon('clock') + '</span><b>รายชั่วโมง</b></label>' +
    '</div></div>' +
    '<label class="wide leave-details-field"><span>รายละเอียด</span><textarea required placeholder="กรอกรายละเอียดให้ผู้อนุมัติเห็นภาพ"></textarea></label>' +
    '<label class="wide upload-field leave-attachment-field"><span>ไฟล์ประกอบ (ถ้ามี)</span><span class="upload-box">' + icon('upload') + '<strong>ลากไฟล์มาวาง หรือเลือกไฟล์</strong><small>JPG, PNG หรือ PDF · สูงสุด 3 ไฟล์</small><input type="file" accept=".jpg,.jpeg,.png,.pdf" multiple></span></label>';
}
function requestFields(id) {
  return id === 'medical' ? '<label><span>วันที่เข้ารับบริการ</span><input type="date" value="2026-10-16" required></label><label><span>หมวดค่าใช้จ่าย</span><select required><option>ผู้ป่วยนอก</option><option>ทันตกรรม</option><option>วัคซีนและตรวจสุขภาพ</option></select></label><label><span>สถานพยาบาล</span><input value="คลินิกสุขภาพดี" required></label><label><span>จำนวนเงิน (บาท)</span><input type="number" value="800" max="1000" required></label><label class="wide"><span>รายละเอียดและเอกสาร</span><textarea required placeholder="กรอกรายละเอียดการรักษา"></textarea></label><label class="wide upload-field"><span>ใบเสร็จ / ใบรับรองแพทย์</span><span class="upload-box">' + icon('upload') + '<strong>ลากไฟล์มาวาง หรือเลือกไฟล์</strong><small>PDF, JPG, PNG ไม่เกิน 10 MB</small><input type="file"></span></label>' :
    id === 'overtime' ? '<label><span>วันที่ทำ OT</span><input type="date" value="2026-10-23" required></label><label><span>ประเภทวัน</span><select required><option>วันทำงานปกติ · 1.5 เท่า</option><option>วันหยุด · 2 เท่า</option></select></label><label><span>เวลาเริ่ม</span><input type="time" value="18:00" required></label><label><span>เวลาสิ้นสุด</span><input type="time" value="20:30" required></label><label class="wide"><span>โครงการ / เหตุผล</span><textarea required placeholder="อธิบายงานที่ต้องทำ"></textarea></label>' :
    id === 'correction' ? '<label><span>วันที่เกิดเหตุ</span><input type="date" value="2026-10-14" required></label><label><span>ประเภทการแก้ไข</span><select required><option>ลืมลงเวลาออก</option><option>ลงเวลาเข้าไม่ถูกต้อง</option></select></label><label><span>เวลาเข้าใหม่</span><input type="time" value="09:00" required></label><label><span>เวลาออกใหม่</span><input type="time" value="18:05" required></label><label class="wide"><span>เหตุผล</span><textarea required placeholder="อธิบายเหตุการณ์สั้น ๆ"></textarea></label>' :
    leaveRequestFields();
}
function inlineForm(id) {
  var d = modules[id];
  var title = id === 'medical' ? 'ยื่นเบิกค่ารักษา' : id === 'overtime' ? 'ขอทำ OT' : 'ยื่นคำขอลา';
  return '<form id="' + id + '-inline-form" class="panel inline-request-form" data-inline="true"><div class="form-title"><span class="step-badge ' + d.tone + '">' + icon(d.icon) + '</span><div><h2>' + title + '</h2><p>กรอกสั้น ๆ แล้วส่งได้เลย</p></div></div><div class="form-grid">' + requestFields(id) + '</div><div class="form-actions"><button class="btn primary" type="submit">ส่งรายการ ' + icon('arrow') + '</button></div></form>';
}
function historyItem(iconName, title, note, status, tone) {
  return '<div class="history-row"><span class="history-icon ' + tone + '">' + icon(iconName) + '</span><span><strong>' + title + '</strong><small>' + note + '</small></span>' + pill(status, tone) + '</div>';
}
function moduleHistory(id) {
  var content = id === 'leave' ? historyItem('calendar', 'ลาพักร้อน · 21–22 ตุลาคม', 'LV-2026-0108 · 2 วัน · ส่งเมื่อ 16 ตุลาคม', 'รออนุมัติ', 'amber') + historyItem('calendar', 'ลากิจ · 04 ตุลาคม', 'LV-2026-0104 · 1 วัน · ปิดรายการแล้ว', 'อนุมัติแล้ว', 'green') + historyItem('calendar', 'ลาป่วย · 28 ก.ย.', 'LV-2026-0092 · ครึ่งวัน · ปิดรายการแล้ว', 'อนุมัติแล้ว', 'green') :
    id === 'overtime' ? historyItem('clock', 'OT ปิดงบไตรมาส 4', 'OT-2026-0108 · 23 ตุลาคม · 2.5 ชั่วโมง', 'รออนุมัติ', 'amber') + historyItem('clock', 'ตรวจเอกสารลูกค้า', 'OT-2026-0102 · 17 ตุลาคม · 4 ชั่วโมง', 'อนุมัติแล้ว', 'green') + historyItem('clock', 'สรุปยอด Payroll', 'OT-2026-0098 · 11 ตุลาคม · 3 ชั่วโมง', 'จ่ายแล้ว', 'teal') :
    historyItem('bank', 'คลินิกสุขภาพดี', 'MC-2026-0108 · 16 ตุลาคม · ผู้ป่วยนอก · ฿800', 'รอตรวจสอบ', 'amber') + historyItem('bank', 'โรงพยาบาลกรุงเทพ', 'MC-2026-0091 · 03 ตุลาคม · ผู้ป่วยนอก · ฿950', 'อนุมัติแล้ว', 'green') + historyItem('bank', 'วัคซีนและตรวจสุขภาพ', 'MC-2026-0084 · 21 ก.ย. · ฿850', 'จ่ายแล้ว', 'teal');
  return '<section class="panel inline-history"><div class="section-title"><div><span class="eyebrow">RECENT</span><h2>รายการล่าสุด</h2><p>ดูสถานะล่าสุด</p></div><span class="section-kicker">LAST 30 DAYS</span></div><div class="history-list">' + content + '</div><div class="history-summary"><span><b>6</b><small>รายการทั้งหมด</small></span><span><b>2</b><small>รอดำเนินการ</small></span><span><b>฿6.16K</b><small>ยอดคงเหลือ</small></span></div></section>';
}
function formPage(id) {
  var d = modules[id];
  var title = id === 'medical' ? 'ยื่นเบิกค่ารักษา' : id === 'overtime' ? 'ขอทำ OT' : id === 'correction' ? 'ขอแก้ไขเวลา' : 'ยื่นคำขอลา';
  return shell(heading(d.eyebrow.replace('WORKSPACE', 'NEW REQUEST'), title, 'กรอกข้อมูล แล้วส่งได้เลย', '') + '<div class="form-layout"><form id="' + id + '-request-form" class="panel form-panel"><div class="form-title"><span class="step-badge ' + d.tone + '">01</span><div><h2>รายละเอียด' + d.title + '</h2><p>ระบบตรวจสิทธิ์ก่อนบันทึกจริง</p></div></div><div class="form-grid">' + requestFields(id) + '</div><div class="form-actions"><button class="btn primary" type="submit">ส่งรายการ ' + icon('arrow') + '</button></div></form><aside class="panel request-summary"><span class="eyebrow">BEFORE SEND</span><h2>ก่อนส่ง</h2><div class="summary-hero ' + d.tone + '"><span class="summary-icon">' + icon(d.icon) + '</span><strong>' + d.value + '</strong><small>' + d.note + '</small></div><div class="summary-list"><span><small>สถานะ</small>' + pill('ยังไม่ส่ง', 'muted') + '</span><span><small>ผู้ตรวจสอบ</small><strong>หัวหน้าตรง · HR</strong></span></div></aside></div>');
}

function approvalsPage() {
  return shell(heading('APPROVALS / ACTION CENTER', 'งานอนุมัติ', 'เลือกเรื่อง แล้วตัดสินใจได้เลย', '<button class=\"btn outline\" type=\"button\" data-route=\"approvals/history\">ประวัติการอนุมัติ</button>') + '<div class=\"metric-grid\">' + metric('รอพิจารณา', '8', 'รายการใหม่ 3 รายการ', 'check', 'purple') + metric('ครบกำหนดวันนี้', '2', 'ต้องจัดการภายในวันนี้', 'alert', 'amber') + metric('อนุมัติเดือนนี้', '24', 'จาก 27 รายการ', 'trend', 'green') + metric('เวลาเฉลี่ย', '4 ชม.', 'เร็วกว่าเป้า 2 ชม.', 'clock', 'teal') + '</div><section class=\"section-block\">' + sectionTitle('รอการตัดสินใจ', 'เปิดดู แล้วอนุมัติหรือส่งกลับ') + '<div class=\"approval-grid\">' + approvalCard('นภัสสร ใจดี · ลาพักร้อน', '21–22 ตุลาคม 2569 · 2 วัน', 'ใหม่', 'purple') + approvalCard('อธิป วัฒนกุล · ขอทำ OT', '23 ตุลาคม 2569 · 18:00–20:30 · 2.5 ชม.', 'รอพิจารณา', 'amber') + approvalCard('กาญจนา นุกูลการ · เบิกค่ารักษา', 'คลินิกสุขภาพดี · ฿800', 'ตรวจเอกสาร', 'teal') + '</div></section>');
}
function approvalCard(title, detail, status, tone) {
  return '<article class=\"approval-card ' + tone + '\"><div class=\"approval-card-top\"><span class=\"approval-avatar\">' + title.charAt(0) + '</span><span>' + pill(status, tone) + '<small>ส่งเมื่อ 16 ตุลาคม · 09:12</small></span></div><h3>' + title + '</h3><p>' + detail + '</p><div class=\"approval-meta\"><span>ขั้นตอน <b>1 / 2</b></span><span>SLA <b>วันนี้</b></span></div><div class=\"approval-actions\"><button class=\"btn outline\" type=\"button\" data-action=\"reject\">ส่งกลับ</button><button class=\"btn primary ' + tone + '-btn\" type=\"button\" data-action=\"approve\">อนุมัติ ' + icon('check') + '</button></div></article>';
}
function reportsPage() {
  return shell(heading('INSIGHTS / REPORTS', 'รายงาน', 'เห็นสุขภาพทีมในภาพเดียว', '<button class=\"btn primary\" type=\"button\" data-action=\"export\">ส่งออกรายงาน ' + icon('arrow') + '</button>') + '<section class=\"report-hero\"><div><span class=\"eyebrow\">OCTOBER 2026 · LIVE DATA PREVIEW</span><h2>ทีมพร้อมขึ้น 14%</h2><p>เทียบจากเดือนก่อน</p></div><div class=\"report-score\"><strong>86<span>/100</span></strong><small>TEAM HEALTH SCORE</small></div></section><div class=\"report-grid\"><article class=\"report-card large\"><div class=\"report-card-head\"><span><small>ATTENDANCE</small><h3>ความสม่ำเสมอในการลงเวลา</h3></span><span class=\"report-trend\">+8.4%</span></div><div class=\"line-chart\"><span style=\"height:42%\"></span><span style=\"height:55%\"></span><span style=\"height:47%\"></span><span style=\"height:70%\"></span><span style=\"height:62%\"></span><span style=\"height:88%\"></span><span style=\"height:81%\"></span></div><div class=\"chart-labels\"><span>จ. 13</span><span>อ. 14</span><span>พ. 15</span><span>พฤ. 16</span><span>ศ. 17</span><span>ส. 18</span><span>อา. 19</span></div></article><article class=\"report-card\"><div class=\"report-card-head\"><span><small>LEAVE</small><h3>วันที่ลาเฉลี่ย</h3></span><span class=\"report-icon teal\">' + icon('calendar') + '</span></div><strong class=\"report-number\">1.8 <small>วัน / คน</small></strong><p>ต่ำกว่าค่าเฉลี่ยบริษัท 0.4 วัน</p><div class=\"progress\"><span style=\"width:64%\"></span></div></article><article class=\"report-card\"><div class=\"report-card-head\"><span><small>OVERTIME</small><h3>ชั่วโมง OT ตามทีม</h3></span><span class=\"report-icon amber\">' + icon('clock') + '</span></div><strong class=\"report-number\">42.5 <small>ชั่วโมง</small></strong><p>บัญชีใช้สูงสุด 34% ของทั้งหมด</p><div class=\"progress amber-progress\"><span style=\"width:72%\"></span></div></article><article class=\"report-card\"><div class=\"report-card-head\"><span><small>BENEFITS</small><h3>ใช้สิทธิ์ค่ารักษา</h3></span><span class=\"report-icon purple\">' + icon('bank') + '</span></div><strong class=\"report-number\">38<span>%</span></strong><p>ใช้ไปจากงบสวัสดิการทั้งปี</p><div class=\"progress purple\"><span style=\"width:38%\"></span></div></article></div><section class=\"panel report-list\">' + sectionTitle('ดูรายงาน', 'เลือกหัวข้อที่อยากดู') + '<div class=\"report-list-grid\"><button type=\"button\" data-detail=\"รายงานสรุปการลา\"><span class=\"report-list-icon teal\">' + icon('calendar') + '</span><span><strong>สรุปการลารายเดือน</strong><small>จำนวนวันลา · ทีม · แนวโน้ม</small></span>' + icon('right') + '</button><button type=\"button\" data-detail=\"รายงาน OT และต้นทุน\"><span class=\"report-list-icon amber\">' + icon('clock') + '</span><span><strong>OT และต้นทุนค่าตอบแทน</strong><small>ชั่วโมง · เรท · รอบ Payroll</small></span>' + icon('right') + '</button><button type=\"button\" data-detail=\"รายงานการลงเวลา\"><span class=\"report-list-icon blue\">' + icon('target') + '</span><span><strong>การลงเวลาและการแก้ไข</strong><small>มาสาย · ขาดงาน · คำขอแก้ไข</small></span>' + icon('right') + '</button></div></section>');
}
function settingsPage() {
  var cards = [['ระบบลา', 'ประเภทลา สิทธิ์คงเหลือ และเงื่อนไขเอกสาร', 'calendar', 'teal', '3 ประเภท'], ['OT', 'เรท OT รอบตัด และสิทธิ์อนุมัติ', 'clock', 'amber', '3 เรท'], ['ลงเวลา', 'เวลาทำงาน พิกัด และอุปกรณ์ที่อนุญาต', 'target', 'blue', '09:00–18:00'], ['แก้ไขเวลา', 'กำหนดเส้นตายและหลักฐานประกอบคำขอ', 'file', 'purple', '3 วัน'], ['เบิกค่ารักษา', 'วงเงิน ฿10,000 / ปี · สูงสุด ฿1,000 / ครั้ง', 'bank', 'green', '฿10,000 / ปี']];
  return shell(heading('SYSTEM / SETTINGS', 'ตั้งค่าระบบ', 'ตั้งค่าทุกเรื่องของระบบจากจุดเดียว', '<button class="btn primary" type="button" data-action="save">บันทึกการตั้งค่า</button>') + '<section class="settings-hero"><div><span class="settings-hero-icon">' + icon('settings') + '</span><div><span class="eyebrow">ONE CONTROL CENTER</span><h2>ตั้งครั้งเดียว ใช้ได้ทั้งทีม</h2><p>ลา · OT · เวลา · ค่ารักษา · อนุมัติ อยู่ที่เดียว</p></div></div><span class="pill green">5 MODULE POLICIES</span></section><div class="metric-grid">' + metric('ประเภทการลา', '3', 'เปิดใช้งาน', 'calendar', 'teal') + metric('เรท OT', '3 แบบ', 'วันทำงาน · วันหยุด', 'clock', 'amber') + metric('รอบ Payroll', 'วันที่ 25', 'ทุกเดือน', 'bank', 'purple') + metric('ผู้อนุมัติ', '2 ระดับ', 'หัวหน้า · HR', 'people', 'green') + '</div><section class="section-block">' + sectionTitle('ตั้งค่าของระบบ', 'เลือกหัวข้อแล้วแก้ไขได้ทันที') + '<div class="settings-hub-grid">' + cards.map(function (c) { return '<article class="settings-hub-card ' + c[3] + '"><div class="settings-hub-card-head"><span class="settings-hub-icon">' + icon(c[2]) + '</span><span><small>POLICY</small><h3>' + c[0] + '</h3></span><strong>' + c[4] + '</strong></div><p>' + c[1] + '</p><button class="text-link" type="button" data-action="setting-edit">แก้ไขนโยบาย ' + icon('arrow') + '</button></article>'; }).join('') + '</div></section><section class="two-col"><section class="panel">' + sectionTitle('ผู้อนุมัติ', 'ใช้ร่วมกันทั้งระบบ') + '<div class="settings-list">' + settingsRow('พนักงานทั่วไป', 'หัวหน้าตรง · ภายใน 1 วัน', 'people', 'ตั้งค่าแล้ว', 'blue') + settingsRow('หัวหน้าทีม', 'ผู้จัดการฝ่าย · ภายใน 2 วัน', 'people', 'ตั้งค่าแล้ว', 'purple') + settingsRow('ผู้ดูแลระบบ', 'HR Admin · ตรวจข้อยกเว้น', 'settings', 'ตั้งค่าแล้ว', 'slate') + '</div></section><section class="panel">' + sectionTitle('การแจ้งเตือน', 'แจ้งคนที่เกี่ยวข้องทันที') + '<div class="settings-list">' + settingsRow('แจ้งเตือนคำขอใหม่', 'แจ้งผ่านระบบและอีเมล', 'bell', 'เปิดใช้งาน', 'teal') + settingsRow('เตือนใกล้ครบกำหนด', 'ก่อนครบกำหนด 1 วัน', 'alert', 'เปิดใช้งาน', 'amber') + settingsRow('รอบข้อมูล Payroll', 'ตัดยอดวันที่ 25 ของทุกเดือน', 'calendar', 'ตั้งค่าแล้ว', 'purple') + '</div></section></section>');
}
function calendarPage() {
  return shell(heading('LEAVE / TEAM CALENDAR', 'วันลาและกิจกรรมของทีม', 'เห็นวันลา วันหยุด และช่วงที่ทีมต้องวางแผนร่วมกัน', '<button class="btn outline" type="button" data-route=\"leave\">กลับระบบลา</button>') + '<section class=\"panel calendar-panel\"><div class=\"calendar-toolbar\"><button class=\"btn outline\" type=\"button\" data-action=\"calendar-prev\">‹</button><strong>ตุลาคม 2569</strong><button class=\"btn outline\" type=\"button\" data-action=\"calendar-next\">›</button><span></span><button class=\"btn primary\" type=\"button\" data-route=\"leave/request\">ยื่นคำขอลา ' + icon('plus') + '</button></div><div class=\"calendar-grid\"><div class=\"calendar-weekday\">จ.</div><div class=\"calendar-weekday\">อ.</div><div class=\"calendar-weekday\">พ.</div><div class=\"calendar-weekday\">พฤ.</div><div class=\"calendar-weekday\">ศ.</div><div class=\"calendar-weekday\">ส.</div><div class=\"calendar-weekday\">อา.</div><div class=\"calendar-day muted\"><small>28</small></div><div class=\"calendar-day muted\"><small>29</small></div><div class=\"calendar-day muted\"><small>30</small></div><div class=\"calendar-day\"><small>1</small></div><div class=\"calendar-day\"><small>2</small></div><div class=\"calendar-day\"><small>3</small></div><div class=\"calendar-day\"><small>4</small></div><div class=\"calendar-day today\"><small>19</small><span class=\"calendar-event teal\">นภัสสร · ลา</span></div><div class=\"calendar-day\"><small>20</small><span class=\"calendar-event amber\">กาญจนา · ลากิจ</span></div><div class=\"calendar-day\"><small>21</small><span class=\"calendar-event teal\">นภัสสร · ลา</span><span class=\"calendar-event teal\">อธิป · ลา</span></div><div class=\"calendar-day\"><small>22</small><span class=\"calendar-event teal\">นภัสสร · ลา</span></div><div class=\"calendar-day\"><small>23</small><span class=\"calendar-event purple\">ปิยมหาราช</span></div><div class=\"calendar-day\"><small>24</small></div><div class=\"calendar-day\"><small>25</small></div></div></section>');
}
function approvalHistoryPage() {
  return shell(heading('APPROVALS / HISTORY', 'ประวัติการอนุมัติ', 'รายการที่คุณดำเนินการแล้วในเดือนนี้', '<button class=\"btn primary\" type=\"button\" data-route=\"approvals\">กลับคิวอนุมัติ</button>') + '<section class=\"panel table-panel\"><div class=\"table-scroll\"><table><thead><tr><th>รายการ</th><th>ผู้ขอ</th><th>วันที่</th><th>ความเห็น</th><th>ผลลัพธ์</th><th></th></tr></thead><tbody>' + tableRow([['ลาพักร้อน · 2 วัน', 'LV-2026-0088'], 'นภัสสร ใจดี', '15 ตุลาคม 2569', 'อนุมัติตามสิทธิ์', pill('อนุมัติแล้ว', 'green')], 'LV-2026-0088') + tableRow([['ขอทำ OT · 4 ชม.', 'OT-2026-0094'], 'อธิป วัฒนกุล', '12 ตุลาคม 2569', 'งานปิดงบ', pill('อนุมัติแล้ว', 'green')], 'OT-2026-0094') + '</tbody></table></div></section>');
}
function renderPage() {
  var route = routeName();
  if (route === 'dashboard') return dashboardPage();
  if (route === 'leave') return leavePage();
  if (route === 'attendance' || route === 'correction') return attendanceGalaxyPage();
  if (route === 'correction/request' || route === 'correction/requests') return attendancePage();
  if (route === 'overtime' || route === 'medical') return moduleGalaxyPage(page);
  if (route === 'leave/calendar') return calendarPage();
  if (route === 'approvals') return approvalsGalaxyPage();
  if (route === 'approvals/history') return approvalHistoryPage();
  if (route === 'reports') return reportsGalaxyPage();
  if (route === 'settings') return settingsGalaxyPage();
  if (route.endsWith('/request')) return formPage(page);
  if (route === 'leave/requests') return leavePage();
  if (route === 'attendance/history') return attendanceHistoryPage();
  if (route.endsWith('/requests')) return listPage(page);
  return overviewPage(page);
}

function approvalsPage() {
  return shell(heading('APPROVALS / ACTION CENTER', 'งานอนุมัติ', 'เลือกเรื่อง แล้วตัดสินใจได้เลย', '<button class=\"btn outline\" type=\"button\" data-route=\"approvals/history\">ประวัติการอนุมัติ</button>') + '<div class=\"metric-grid\">' + metric('รอพิจารณา', '8', 'รายการใหม่ 3 รายการ', 'check', 'purple') + metric('ครบกำหนดวันนี้', '2', 'ต้องจัดการภายในวันนี้', 'alert', 'amber') + metric('อนุมัติเดือนนี้', '24', 'จาก 27 รายการ', 'trend', 'green') + metric('เวลาเฉลี่ย', '4 ชม.', 'เร็วกว่าเป้า 2 ชม.', 'clock', 'teal') + '</div><section class=\"section-block\">' + sectionTitle('รอการตัดสินใจ', 'เปิดดู แล้วอนุมัติหรือส่งกลับ') + '<div class=\"approval-grid\">' + approvalCard('นภัสสร ใจดี · ลาพักร้อน', '21–22 ตุลาคม 2569 · 2 วัน', 'ใหม่', 'purple') + approvalCard('อธิป วัฒนกุล · ขอทำ OT', '23 ตุลาคม 2569 · 18:00–20:30 · 2.5 ชม.', 'รอพิจารณา', 'amber') + approvalCard('กาญจนา นุกูลการ · เบิกค่ารักษา', 'คลินิกสุขภาพดี · ฿800', 'ตรวจเอกสาร', 'teal') + '</div></section>');
}
function approvalCard(title, detail, status, tone) {
  return '<article class=\"approval-card ' + tone + '\"><div class=\"approval-card-top\"><span class=\"approval-avatar\">' + title.charAt(0) + '</span><span>' + pill(status, tone) + '<small>ส่งเมื่อ 16 ตุลาคม · 09:12</small></span></div><h3>' + title + '</h3><p>' + detail + '</p><div class=\"approval-meta\"><span>ขั้นตอน <b>1 / 2</b></span><span>SLA <b>วันนี้</b></span></div><div class=\"approval-actions\"><button class=\"btn outline\" type=\"button\" data-action=\"reject\">ส่งกลับ</button><button class=\"btn primary ' + tone + '-btn\" type=\"button\" data-action=\"approve\">อนุมัติ ' + icon('check') + '</button></div></article>';
}
function openDetail(title) {
  dialog.innerHTML = '<div class=\"dialog-head\"><div><span class=\"eyebrow\">PEOPLE OPERATIONS / DETAIL</span><h2 id=\"dialog-title\">' + title + '</h2><p>รายละเอียดเปิดในบริบทของระบบเดียว</p></div><button class=\"dialog-close\" type=\"button\" data-close aria-label=\"ปิด\">' + icon('close') + '</button></div><div class=\"dialog-body\"><div class=\"dialog-info\">' + icon('check') + '<span><strong>ข้อมูลพร้อมสำหรับการตรวจสอบ</strong><small>ต้นแบบนี้แสดงเส้นทางและสิทธิ์เบื้องต้น ข้อมูลจริงต้องตรวจจากเซิร์ฟเวอร์ก่อนบันทึก</small></span></div><div class=\"dialog-detail-grid\"><span><small>รหัสรายการ</small><strong>CK-2026-0108</strong></span><span><small>อัปเดตล่าสุด</small><strong>วันนี้ 09:20</strong></span></div></div><div class=\"dialog-foot\"><button class=\"btn outline\" type=\"button\" data-close>ปิด</button><button class=\"btn primary\" type=\"button\" data-action=\"open-detail\">เปิดรายการ ' + icon('arrow') + '</button></div>';
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
}
var dashboardLayoutStorageKey = 'ckace.dashboard.hero.layout.v3';
var dashboardLayoutKeys = ['core', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

function dashboardLayoutIsDesktop() {
  return !window.matchMedia || window.matchMedia('(min-width: 841px)').matches;
}

function dashboardLayoutKey(node) {
  if (node.classList.contains('orb-core')) return 'core';
  for (var i = 0; i < dashboardLayoutKeys.length; i += 1) {
    if (dashboardLayoutKeys[i] !== 'core' && node.classList.contains('orb-float-' + dashboardLayoutKeys[i])) return dashboardLayoutKeys[i];
  }
  return '';
}

function dashboardLayoutNodes(hero) {
  return Array.prototype.slice.call(hero.querySelectorAll('.dashboard-orb .orb-core, .dashboard-orb .orb-float'));
}

function readDashboardLayout() {
  try {
    var raw = window.localStorage.getItem(dashboardLayoutStorageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function setDashboardOrbPosition(node, x, y) {
  if (!node || !isFinite(x) || !isFinite(y)) return;
  node.style.setProperty('--orbit-x', Math.round(x) + 'px', 'important');
  node.style.setProperty('--orbit-y', Math.round(y) + 'px', 'important');
}

function getDashboardOrbPosition(node) {
  var styles = window.getComputedStyle(node);
  return {
    x: parseFloat(styles.getPropertyValue('--orbit-x')) || 0,
    y: parseFloat(styles.getPropertyValue('--orbit-y')) || 0
  };
}

function applyDashboardLayout(hero) {
  if (!dashboardLayoutIsDesktop()) return;
  var saved = readDashboardLayout();
  if (!saved || !saved.positions) return;
  dashboardLayoutNodes(hero).forEach(function (node) {
    var key = dashboardLayoutKey(node);
    var position = saved.positions[key];
    if (!position) return;
    setDashboardOrbPosition(node, Number(position.x), Number(position.y));
  });
}

function clearDashboardLayout(hero) {
  dashboardLayoutNodes(hero).forEach(function (node) {
    node.style.removeProperty('--orbit-x');
    node.style.removeProperty('--orbit-y');
  });
}

function updateDashboardLayoutTools(hero) {
  var tools = hero.querySelector('[data-hero-layout-tools]');
  if (!tools) return;
  var active = hero.classList.contains('hero-layout-editor');
  var toggle = tools.querySelector('[data-hero-layout="toggle"]');
  var save = tools.querySelector('[data-hero-layout="save"]');
  var reset = tools.querySelector('[data-hero-layout="reset"]');
  var hint = tools.querySelector('.hero-layout-hint');
  if (toggle) {
    toggle.textContent = active ? 'ปิดโหมด' : 'จัด Layout';
    toggle.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  if (save) save.hidden = !active;
  if (reset) reset.hidden = !active;
  if (hint) hint.hidden = !active;
  tools.classList.toggle('is-active', active);
}

function setDashboardLayoutEditor(hero, active) {
  var orb = hero.querySelector('.dashboard-orb');
  if (!orb) return;
  var enabled = Boolean(active) && dashboardLayoutIsDesktop();
  hero.classList.toggle('hero-layout-editor', enabled);
  orb.setAttribute('aria-hidden', enabled ? 'false' : 'true');
  dashboardLayoutNodes(hero).forEach(function (node) {
    if (enabled) {
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', node.innerText.replace(/\s+/g, ' ').trim() + ' · ลากเพื่อจัดตำแหน่ง');
    } else {
      node.removeAttribute('tabindex');
      node.removeAttribute('role');
      node.removeAttribute('aria-label');
      node.classList.remove('is-dragging');
    }
  });
  updateDashboardLayoutTools(hero);
}

function installDashboardLayoutEditor(hero) {
  var orb = hero.querySelector('.dashboard-orb');
  if (!orb || orb.dataset.layoutEditorReady) return;
  orb.dataset.layoutEditorReady = 'true';
  dashboardLayoutNodes(hero).forEach(function (node) {
    var finishDrag = function (event) {
      if (node.__dashboardDragPointerId !== event.pointerId) return;
      node.__dashboardDragPointerId = null;
      node.classList.remove('is-dragging');
      try { node.releasePointerCapture(event.pointerId); } catch (error) { /* pointer already released */ }
    };
    var moveDrag = function (event) {
      if (!hero.classList.contains('hero-layout-editor') || node.__dashboardDragPointerId !== event.pointerId) return;
      var orbRect = orb.getBoundingClientRect();
      var heroRect = hero.getBoundingClientRect();
      var nodeRect = node.getBoundingClientRect();
      var halfWidth = nodeRect.width / 2;
      var halfHeight = nodeRect.height / 2;
      var minX = heroRect.left + halfWidth + 12;
      var maxX = heroRect.right - halfWidth - 12;
      var minY = heroRect.top + halfHeight + 12;
      var maxY = heroRect.bottom - halfHeight - 12;
      var centerX = Math.max(minX, Math.min(maxX, event.clientX));
      var centerY = Math.max(minY, Math.min(maxY, event.clientY));
      setDashboardOrbPosition(node, centerX - (orbRect.left + orbRect.width / 2), centerY - (orbRect.top + orbRect.height / 2));
    };
    node.addEventListener('pointerdown', function (event) {
      if (!hero.classList.contains('hero-layout-editor') || event.button !== 0) return;
      event.preventDefault();
      node.__dashboardDragPointerId = event.pointerId;
      node.classList.add('is-dragging');
      try { node.setPointerCapture(event.pointerId); } catch (error) { /* pointer capture unavailable */ }
    });
    node.addEventListener('pointermove', moveDrag);
    node.addEventListener('pointerup', finishDrag);
    node.addEventListener('pointercancel', finishDrag);
    node.addEventListener('lostpointercapture', finishDrag);
    node.addEventListener('keydown', function (event) {
      if (!hero.classList.contains('hero-layout-editor')) return;
      var step = event.shiftKey ? 12 : 4;
      var current = getDashboardOrbPosition(node);
      var delta = { x: 0, y: 0 };
      if (event.key === 'ArrowLeft') delta.x = -step;
      if (event.key === 'ArrowRight') delta.x = step;
      if (event.key === 'ArrowUp') delta.y = -step;
      if (event.key === 'ArrowDown') delta.y = step;
      if (!delta.x && !delta.y) return;
      event.preventDefault();
      setDashboardOrbPosition(node, current.x + delta.x, current.y + delta.y);
    });
  });
}

function ensureDashboardLayoutTools(hero) {
  if (hero.querySelector('[data-hero-layout-tools]')) return;
  var tools = document.createElement('div');
  tools.className = 'hero-layout-tools';
  tools.setAttribute('data-hero-layout-tools', '');
  tools.innerHTML = '<button class="hero-layout-button" type="button" data-hero-layout="toggle" aria-pressed="false">จัด Layout</button>' +
    '<button class="hero-layout-button save" type="button" data-hero-layout="save" hidden>บันทึก</button>' +
    '<button class="hero-layout-button reset" type="button" data-hero-layout="reset" hidden>รีเซ็ต</button>' +
    '<span class="hero-layout-hint" hidden>ลากจุด · Shift + ลูกศร = ขยับเร็ว</span>';
  hero.appendChild(tools);
  updateDashboardLayoutTools(hero);
}

function toggleDashboardLayoutEditor() {
  var hero = main.querySelector('.dashboard-v2 .dashboard-hero-v2');
  if (!hero || !dashboardLayoutIsDesktop()) return;
  setDashboardLayoutEditor(hero, !hero.classList.contains('hero-layout-editor'));
  notify(hero.classList.contains('hero-layout-editor') ? 'เปิดโหมดจัด Layout แล้ว · ลากวงรีเพื่อวางตำแหน่ง' : 'ปิดโหมดจัด Layout แล้ว');
}

function saveDashboardLayout() {
  var hero = main.querySelector('.dashboard-v2 .dashboard-hero-v2');
  if (!hero) return;
  var positions = {};
  dashboardLayoutNodes(hero).forEach(function (node) {
    var key = dashboardLayoutKey(node);
    if (key) positions[key] = getDashboardOrbPosition(node);
  });
  try {
    window.localStorage.setItem(dashboardLayoutStorageKey, JSON.stringify({ version: 1, positions: positions }));
    setDashboardLayoutEditor(hero, false);
    notify('บันทึกตำแหน่งวงรีแล้ว · จะจำไว้ในเครื่องนี้');
  } catch (error) {
    notify('บันทึกไม่ได้ในโหมดนี้ · ตำแหน่งยังคงอยู่ชั่วคราว');
  }
}

function resetDashboardLayout() {
  var hero = main.querySelector('.dashboard-v2 .dashboard-hero-v2');
  if (!hero) return;
  try { window.localStorage.removeItem(dashboardLayoutStorageKey); } catch (error) { /* storage unavailable */ }
  clearDashboardLayout(hero);
  setDashboardLayoutEditor(hero, true);
  notify('รีเซ็ตตำแหน่งกลับค่าออกแบบเดิมแล้ว');
}

function tuneDashboardHero() {
  var hero = main.querySelector('.dashboard-v2 .dashboard-hero-v2');
  if (!hero) return;
  var kicker = hero.querySelector('.dashboard-kicker');
  if (kicker) {
    applyThaiDayColor(kicker);
    var time = kicker.querySelector('[data-live-clock]');
    kicker.innerHTML = '<span class="live-dot"></span> <span class="dashboard-live-date" data-live-date>' + currentDateLabel() + '</span> เวลา ';
    if (time) {
      kicker.appendChild(time);
    } else {
      var liveTime = document.createElement('time');
      liveTime.className = 'dashboard-live-clock';
      liveTime.setAttribute('data-live-clock', '');
      liveTime.textContent = currentClock();
      kicker.appendChild(liveTime);
    }
  }
  var orb = hero.querySelector('.dashboard-orb');
  if (orb && !orb.querySelector('.orb-float-leave-vacation')) {
    [
      ['g', 'orb-float-leave-vacation'],
      ['h', 'orb-float-leave-business'],
      ['i', 'orb-float-leave-sick']
    ].forEach(function (item) {
      var node = document.createElement('span');
      node.className = 'orb-float orb-float-' + item[0] + ' ' + item[1];
      orb.appendChild(node);
    });
  }
  var metrics = [
    ['ลาวันนี้', '6 คน'],
    ['OT สะสม', '42.5 ชั่วโมง'],
    ['รออนุมัติ', '8 รายการ'],
    ['ค่ารักษา', '฿3,840'],
    ['ลงเวลา', '98.6%'],
    ['พร้อมทำงาน', '86/103 คน'],
    ['ลาพักร้อน', '3 / 15 วัน'],
    ['ลากิจ', '1 / 3 วัน'],
    ['ลาป่วย', '1 / 5 วัน']
  ];
  metrics.forEach(function (metric, index) {
    var node = hero.querySelector('.orb-float-' + String.fromCharCode(97 + index));
    if (!node) return;
    node.innerHTML = '<small>' + metric[0] + '</small><b>' + metric[1] + '</b>';
  });
  ensureDashboardLayoutTools(hero);
  installDashboardLayoutEditor(hero);
  applyDashboardLayout(hero);
}
function tuneDashboardCalendar() {
  var calendar = main.querySelector('.dashboard-v2 .dashboard-calendar-v2');
  if (!calendar || calendar.dataset.galaxyReady) return;
  var head = calendar.querySelector('.calendar-v2-head');
  if (!head) return;
  var pulse = document.createElement('div');
  pulse.className = 'calendar-v2-pulse';
  pulse.setAttribute('aria-label', 'สรุปวันลาและกิจกรรมของทีม');
  pulse.innerHTML = '<span class="calendar-pulse-item today"><i class="calendar-pulse-icon teal">' + icon('spark') + '</i><span><b>วันนี้</b><strong>19 ตุลาคม</strong></span></span>' +
    '<span class="calendar-pulse-item leave"><i class="calendar-pulse-icon purple">' + icon('calendar') + '</i><span><b>วันลา</b><strong>3 รายการ</strong></span></span>';
  head.insertAdjacentElement('afterend', pulse);
  calendar.dataset.galaxyReady = 'true';
}
function leaveDetailMarkup() {
  return '<section class="leave-detail-grid" aria-label="รายละเอียดสิทธิ์และแผนวันลา">' +
    '<article class="leave-detail-card leave-type-board"><div class="leave-detail-head"><span><small>LEAVE BALANCE</small><h2>สิทธิ์ลาแต่ละประเภท</h2><p>วางแผนวันลาในปี 2569 ให้เห็นภาพเดียว</p></span><span class="leave-detail-badge">ปี 2569</span></div>' +
    '<div class="leave-type-list">' +
      '<div class="leave-type-row vacation"><span class="leave-type-marker">' + icon('calendar') + '</span><span class="leave-type-copy"><strong>ลาพักร้อน</strong><small>VACATION · ใช้ไป 3 / 15 วัน</small></span><span class="leave-type-values"><b>12</b><small>เหลือวัน</small></span><span class="leave-type-progress"><i style="width:20%"></i></span></div>' +
      '<div class="leave-type-row business"><span class="leave-type-marker">' + icon('file') + '</span><span class="leave-type-copy"><strong>ลากิจ</strong><small>BUSINESS · ใช้ไป 1 / 3 วัน</small></span><span class="leave-type-values"><b>2</b><small>เหลือวัน</small></span><span class="leave-type-progress"><i style="width:33.3%"></i></span></div>' +
      '<div class="leave-type-row sick"><span class="leave-type-marker">' + icon('alert') + '</span><span class="leave-type-copy"><strong>ลาป่วย</strong><small>SICK · ใช้ไป 1 / 5 วัน</small></span><span class="leave-type-values"><b>4</b><small>เหลือวัน</small></span><span class="leave-type-progress"><i style="width:20%"></i></span></div>' +
    '</div></article>' +
    '<article class="leave-detail-card leave-week-board"><div class="leave-detail-head"><span><small>TEAM LEAVE MAP</small><h2>ทีมกำลังลา</h2><p>สัปดาห์นี้ · 19–25 ตุลาคม 2569</p></span><span class="leave-detail-badge teal">03 คน</span></div>' +
      '<div class="leave-week-days" aria-label="สรุปวันลาในสัปดาห์"><span><b>จ.</b><small>19</small></span><span class="is-today"><b>อ.</b><small>20</small></span><span class="has-leave"><b>พ.</b><small>21</small></span><span class="has-leave"><b>พฤ.</b><small>22</small></span><span><b>ศ.</b><small>23</small></span><span><b>ส.</b><small>24</small></span><span><b>อา.</b><small>25</small></span></div>' +
      '<div class="leave-week-timeline">' +
        '<div class="leave-week-event"><span class="leave-week-event-dot teal"></span><span><strong>วันนี้ · 20 ต.ค.</strong><small>กาญจนา · ลากิจ 1 วัน</small></span><b>1 คน</b></div>' +
        '<div class="leave-week-event"><span class="leave-week-event-dot purple"></span><span><strong>21–22 ต.ค.</strong><small>นภัสสร · ลาพักร้อน 2 วัน</small></span><b>1 คน</b></div>' +
        '<div class="leave-week-event"><span class="leave-week-event-dot amber"></span><span><strong>23 ต.ค.</strong><small>อธิป · ลาพักร้อน 1 วัน</small></span><b>1 คน</b></div>' +
      '</div><div class="leave-detail-footer"><span>' + icon('spark') + ' วางแผนงานล่วงหน้าได้ทันที</span><button class="leave-detail-link" type="button" data-route="dashboard">ดูปฏิทินทีม <span>→</span></button></div>' +
    '</article></section>';
}
function leaveOverviewMarkup() {
  return '<section class="leave-overview-grid" aria-label="ภาพรวมงานลา">' +
    '<article class="dashboard-board leave-board leave-overview-board leave-summary-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon summary">' + icon('calendar') + '</span><span><b>LEAVE STATISTICS</b><small>สถิติการลา</small></span></div><span class="leave-overview-badge summary">' + icon('clock') + '8 รออนุมัติ</span></div><div class="leave-overview-score"><strong>ลาวันนี้ <span>6 คน</span></strong></div><div class="leave-overview-rows"><div class="leave-overview-row"><span class="leave-overview-dot purple"></span><span><b>ลาพักร้อน 3 คน</b></span><span class="leave-overview-track leave-bar-purple"><i style="width:50%"></i></span><strong>50%</strong></div><div class="leave-overview-row"><span class="leave-overview-dot amber"></span><span><b>ลากิจ 2 คน</b></span><span class="leave-overview-track leave-bar-amber"><i style="width:33%"></i></span><strong>33%</strong></div><div class="leave-overview-row"><span class="leave-overview-dot teal"></span><span><b>ลาป่วย 1 คน</b></span><span class="leave-overview-track leave-bar-teal"><i style="width:17%"></i></span><strong>17%</strong></div></div></article>' +
    '<article class="dashboard-board feed-board activity-board leave-overview-board leave-activity-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon purple">' + icon('spark') + '</span><span><b>RECENT ACTIVITY</b><small>กิจกรรมล่าสุด</small></span></div><button class="leave-overview-badge action" type="button" data-action="scroll-leave-history">' + icon('arrow') + ' ดูทั้งหมด</button></div><div class="feed-list"><div class="feed-row"><span class="feed-copy"><strong class="feed-type"><span class="feed-mark purple">' + icon('calendar') + '</span>ลาพักร้อน</strong><b class="feed-person">นภัสสร</b><small class="feed-date">วันที่ 21–22 ตุลาคม</small><small class="feed-duration">จำนวน 2 วัน</small><small class="feed-reason">เหตุผล: ไปเที่ยว</small></span><span class="feed-status-icon purple" aria-label="รออนุมัติ">' + icon('spark') + '</span></div><div class="feed-row"><span class="feed-copy"><strong class="feed-type"><span class="feed-mark amber">' + icon('file') + '</span>ลากิจ</strong><b class="feed-person">กาญจนา</b><small class="feed-date">วันที่ 20 ตุลาคม</small><small class="feed-duration">จำนวน 1 วัน</small><small class="feed-reason">เหตุผล: ธุระส่วนตัว</small></span><span class="feed-status-icon amber" aria-label="อนุมัติแล้ว">' + icon('check') + '</span></div><div class="feed-row"><span class="feed-copy"><strong class="feed-type"><span class="feed-mark teal">' + icon('alert') + '</span>ลาป่วย</strong><b class="feed-person">อธิป</b><small class="feed-date">วันที่ 18 ตุลาคม</small><small class="feed-duration">จำนวน 1 วัน</small><small class="feed-reason">เหตุผล: ไม่สบาย</small></span><span class="feed-status-icon teal" aria-label="อนุมัติแล้ว">' + icon('check') + '</span></div></div></article>' +
    '<article class="dashboard-board leave-board personal-leave-board leave-overview-board leave-balance-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon amber">' + icon('calendar') + '</span><span><b>MY LEAVE STATISTICS</b><small>สถิติการลาของฉัน</small></span></div><span class="leave-overview-badge amber">ปี 2569</span></div><div class="leave-personal-list"><div class="leave-personal-row vacation"><span class="leave-personal-icon">' + icon('calendar') + '</span><span class="leave-personal-copy"><b>ลาพักร้อน</b><small>ใช้ไป 3 / 15 วัน</small></span><span class="leave-personal-remain"><b>12</b><small>เหลือวัน</small></span><span class="leave-personal-track"><i style="width:20%"></i></span></div><div class="leave-personal-row business"><span class="leave-personal-icon">' + icon('file') + '</span><span class="leave-personal-copy"><b>ลากิจ</b><small>ใช้ไป 1 / 3 วัน</small></span><span class="leave-personal-remain"><b>2</b><small>เหลือวัน</small></span><span class="leave-personal-track"><i style="width:33%"></i></span></div><div class="leave-personal-row sick"><span class="leave-personal-icon">' + icon('alert') + '</span><span class="leave-personal-copy"><b>ลาป่วย</b><small>ใช้ไป 1 / 5 วัน</small></span><span class="leave-personal-remain"><b>4</b><small>เหลือวัน</small></span><span class="leave-personal-track"><i style="width:20%"></i></span></div></div></article>' +
    '<article class="dashboard-board status-board leave-overview-board leave-team-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon teal">' + icon('people') + '</span><span><b>TEAM LEAVE MAP</b><small>ทีมกำลังลา</small></span></div><span class="leave-overview-badge teal">03 คน</span></div><div class="leave-week-days" aria-label="สรุปวันลาในสัปดาห์"><span><b>จ.</b><small>19</small></span><span class="is-today"><b>อ.</b><small>20</small></span><span class="has-leave"><b>พ.</b><small>21</small></span><span class="has-leave"><b>พฤ.</b><small>22</small></span><span><b>ศ.</b><small>23</small></span><span><b>ส.</b><small>24</small></span><span><b>อา.</b><small>25</small></span></div><div class="leave-week-timeline"><div class="leave-week-event"><span class="leave-week-event-dot teal"></span><span><strong>วันนี้ · 20 ต.ค.</strong><small>กาญจนา · ลากิจ 1 วัน</small></span><b>1 คน</b></div><div class="leave-week-event"><span class="leave-week-event-dot purple"></span><span><strong>21–22 ต.ค.</strong><small>นภัสสร · ลาพักร้อน 2 วัน</small></span><b>1 คน</b></div><div class="leave-week-event"><span class="leave-week-event-dot amber"></span><span><strong>23 ต.ค.</strong><small>อธิป · ลาพักร้อน 1 วัน</small></span><b>1 คน</b></div></div><div class="leave-detail-footer"><span>' + icon('spark') + ' วางแผนงานล่วงหน้าได้ทันที</span><button class="leave-detail-link" type="button" data-route="dashboard">ดูปฏิทินทีม <span>→</span></button></div></article>' +
    '</section>';
}
function tuneLeaveWorkspace() {
  if (page !== 'leave') return;
  var workspace = main.querySelector('.leave-workspace');
  var hero = workspace && workspace.querySelector('.leave-galaxy-hero');
  var kpis = workspace && workspace.querySelector('.leave-kpi-grid');
  var detail = workspace && workspace.querySelector('.leave-detail-grid');
  var requestGrid = workspace && workspace.querySelector('.leave-content-grid');
  var history = workspace && workspace.querySelector('.leave-history-panel');
  if (!workspace || !hero || !kpis || workspace.querySelector('.leave-overview-grid')) return;
  var heroTitle = hero.querySelector('.leave-hero-copy h1');
  var heroEnglish = hero.querySelector('.leave-hero-en');
  var heroDescription = hero.querySelector('.leave-hero-copy p');
  var heroMeta = hero.querySelector('.leave-hero-meta');
  if (heroTitle) heroTitle.innerHTML = '<span>LEAVE</span> <em>WORKSPACE</em>';
  if (heroEnglish) heroEnglish.hidden = true;
    if (heroDescription) heroDescription.textContent = 'ขอลางาน ดูสถิติ และเช็กประวัติได้ในหน้าเดียว';
  if (heroMeta) heroMeta.hidden = true;
  hero.insertAdjacentHTML('afterend', leaveSectionNavMarkup() + leaveOverviewMarkupV2());
  var overview = workspace.querySelector('.leave-overview-grid');
  var sectionNav = workspace.querySelector('.leave-section-nav');
  var summaryBoard = overview && overview.querySelector('.leave-summary-overview');
  var personalBoard = overview && overview.querySelector('.leave-balance-overview');
  var teamBoard = overview && overview.querySelector('.leave-team-overview');
  var activityBoard = overview && overview.querySelector('.leave-activity-overview');
  if (overview) {
    overview.id = 'leave-statistics-section';
    [summaryBoard, personalBoard, teamBoard, activityBoard].forEach(function (board) {
      if (board) overview.appendChild(board);
    });
  }
  if (requestGrid && overview) {
    requestGrid.classList.add('leave-primary-request');
    requestGrid.id = 'leave-request-section';
    workspace.insertBefore(requestGrid, overview);
  }
  kpis.hidden = true;
  if (detail) detail.hidden = true;
  if (history) {
    history.hidden = false;
    history.id = 'leave-history-section';
  }
  if (sectionNav) sectionNav.querySelector('.leave-section-nav-link')?.classList.add('is-active');
}
function leaveSectionNavMarkup() {
  return '<nav class="leave-section-nav" aria-label="ส่วนของหน้าการลา"><div class="leave-section-nav-title"><span class="leave-section-nav-icon">' + icon('calendar') + '</span><span><b>LEAVE CENTER</b><small>จัดการเรื่องลาจากหน้าเดียว</small></span></div><div class="leave-section-nav-links"><button class="leave-section-nav-link is-active" type="button" data-action="scroll-leave-section" data-leave-section="leave-request-section"><span>01</span><b>ขอลางาน</b><small>สร้างคำขอ</small></button><button class="leave-section-nav-link" type="button" data-action="scroll-leave-section" data-leave-section="leave-statistics-section"><span>02</span><b>สถิติลา</b><small>สิทธิ์และทีม</small></button><button class="leave-section-nav-link" type="button" data-action="scroll-leave-section" data-leave-section="leave-history-section"><span>03</span><b>ประวัติลา</b><small>คำขอที่ผ่านมา</small></button></div></nav>';
}
function leaveOverviewMarkupV2() {
  return '<section class="leave-overview-grid" aria-label="ภาพรวมงานลา">' +
    '<article class="dashboard-board leave-board leave-overview-board leave-summary-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon summary">' + icon('calendar') + '</span><span><b>LEAVE STATISTICS</b><small>สถิติการลา</small></span></div><span class="leave-overview-badge summary">' + icon('clock') + '8 รออนุมัติ</span></div><div class="leave-overview-score"><strong>ลาวันนี้ <span>6 คน</span></strong></div><div class="leave-overview-rows"><div class="leave-overview-row"><span class="leave-overview-dot purple"></span><span><b>ลาพักร้อน 3 คน</b></span><span class="leave-overview-track leave-bar-purple"><i style="width:50%"></i></span><strong>50%</strong></div><div class="leave-overview-row"><span class="leave-overview-dot amber"></span><span><b>ลากิจ 2 คน</b></span><span class="leave-overview-track leave-bar-amber"><i style="width:33%"></i></span><strong>33%</strong></div><div class="leave-overview-row"><span class="leave-overview-dot teal"></span><span><b>ลาป่วย 1 คน</b></span><span class="leave-overview-track leave-bar-teal"><i style="width:17%"></i></span><strong>17%</strong></div></div></article>' +
    '<article class="dashboard-board feed-board activity-board leave-overview-board leave-activity-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon purple">' + icon('spark') + '</span><span><b>RECENT ACTIVITY</b><small>กิจกรรมล่าสุด</small></span></div><button class="leave-overview-badge action" type="button" data-action="scroll-leave-history">' + icon('arrow') + ' ดูทั้งหมด</button></div><div class="feed-list"><div class="feed-row"><span class="feed-copy"><strong class="feed-type"><span class="feed-mark purple">' + icon('calendar') + '</span>ลาพักร้อน</strong><b class="feed-person">นภัสสร</b><small class="feed-date">วันที่ 21–22 ตุลาคม</small><small class="feed-duration">จำนวน 2 วัน</small><small class="feed-reason">เหตุผล: ไปเที่ยว</small></span><span class="feed-status-icon purple" aria-label="รออนุมัติ">' + icon('spark') + '</span></div><div class="feed-row"><span class="feed-copy"><strong class="feed-type"><span class="feed-mark amber">' + icon('file') + '</span>ลากิจ</strong><b class="feed-person">กาญจนา</b><small class="feed-date">วันที่ 20 ตุลาคม</small><small class="feed-duration">จำนวน 1 วัน</small><small class="feed-reason">เหตุผล: ธุระส่วนตัว</small></span><span class="feed-status-icon amber" aria-label="อนุมัติแล้ว">' + icon('check') + '</span></div><div class="feed-row"><span class="feed-copy"><strong class="feed-type"><span class="feed-mark teal">' + icon('alert') + '</span>ลาป่วย</strong><b class="feed-person">อธิป</b><small class="feed-date">วันที่ 18 ตุลาคม</small><small class="feed-duration">จำนวน 1 วัน</small><small class="feed-reason">เหตุผล: ไม่สบาย</small></span><span class="feed-status-icon teal" aria-label="อนุมัติแล้ว">' + icon('check') + '</span></div></div></article>' +
    '<article class="dashboard-board status-board leave-overview-board leave-team-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon teal">' + icon('people') + '</span><span><b>TEAM LEAVE MAP</b><small>ทีมกำลังลา</small></span></div><span class="leave-overview-badge teal">03 คน</span></div><div class="leave-week-days" aria-label="สรุปวันลาในสัปดาห์"><span><b>จ.</b><small>19</small></span><span class="is-today"><b>อ.</b><small>20</small></span><span class="has-leave"><b>พ.</b><small>21</small></span><span class="has-leave"><b>พฤ.</b><small>22</small></span><span><b>ศ.</b><small>23</small></span><span><b>ส.</b><small>24</small></span><span><b>อา.</b><small>25</small></span></div><div class="leave-week-timeline"><div class="leave-week-event"><span class="leave-week-event-dot teal"></span><span><strong>วันนี้ · 20 ต.ค.</strong><small>กาญจนา · ลากิจ 1 วัน</small></span><b>1 คน</b></div><div class="leave-week-event"><span class="leave-week-event-dot purple"></span><span><strong>21–22 ต.ค.</strong><small>นภัสสร · ลาพักร้อน 2 วัน</small></span><b>1 คน</b></div><div class="leave-week-event"><span class="leave-week-event-dot amber"></span><span><strong>23 ต.ค.</strong><small>อธิป · ลาพักร้อน 1 วัน</small></span><b>1 คน</b></div></div><div class="leave-detail-footer"><span>' + icon('spark') + ' วางแผนงานล่วงหน้าได้ทันที</span><button class="leave-detail-link" type="button" data-route="dashboard">ดูปฏิทินทีม <span>→</span></button></div></article>' +
    '<article class="dashboard-board leave-board personal-leave-board leave-overview-board leave-balance-overview"><div class="leave-overview-head"><div class="leave-overview-title"><span class="leave-overview-icon amber">' + icon('calendar') + '</span><span><b>MY LEAVE STATISTICS</b><small>สถิติการลาของฉัน</small></span></div><span class="leave-overview-badge amber">ปี 2569</span></div><div class="leave-personal-grid"><article class="leave-personal-card vacation"><div class="leave-personal-card-head"><span class="leave-personal-icon">' + icon('calendar') + '</span><span><b>VACATION</b><strong>ลาพักร้อน</strong></span><span class="leave-entitlement-badge">' + icon('calendar') + ' สิทธิ์ 15 วัน</span></div><div class="leave-personal-values"><b>ใช้ไป 3 วัน</b><b>เหลือ 12 วัน</b></div><span class="leave-personal-track"><i style="width:20%"><b>20%</b></i><em>80%</em></span></article><article class="leave-personal-card sick"><div class="leave-personal-card-head"><span class="leave-personal-icon">' + icon('alert') + '</span><span><b>SICK LEAVE</b><strong>ลาป่วย</strong></span><span class="leave-entitlement-badge">' + icon('calendar') + ' สิทธิ์ 5 วัน</span></div><div class="leave-personal-values"><b>ใช้ไป 1 วัน</b><b>เหลือ 4 วัน</b></div><span class="leave-personal-track"><i style="width:20%"><b>20%</b></i><em>80%</em></span></article><article class="leave-personal-card business"><div class="leave-personal-card-head"><span class="leave-personal-icon">' + icon('file') + '</span><span><b>BUSINESS</b><strong>ลากิจ</strong></span><span class="leave-entitlement-badge">' + icon('calendar') + ' สิทธิ์ 3 วัน</span></div><div class="leave-personal-values"><b>ใช้ไป 1 วัน</b><b>เหลือ 2 วัน</b></div><span class="leave-personal-track"><i style="width:33%"><b>33%</b></i><em>67%</em></span></article></div></article>' +
    '</section>';
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2800);
}
function render() {
  renderNav();
  main.innerHTML = renderPage();
  decorateIcons();
  tuneDashboardHero();
  tuneLeaveWorkspace();
  if (routeName() === 'leave/requests') {
    var routedLeaveHistory = main.querySelector('.leave-history-panel');
    if (routedLeaveHistory) window.requestAnimationFrame(function () { routedLeaveHistory.scrollIntoView({ behavior: 'auto', block: 'start' }); });
  }

  main.focus({ preventScroll: true });
  startLiveClock();
}
function navigate(route) {
  var clean = String(route || 'dashboard').replace(/^#/, '');
  if (!routes.has(clean)) clean = 'dashboard';
  var parts = clean.split('/');
  page = parts[0]; subpage = parts.slice(1).join('/');
  location.hash = clean;
  render();
}
document.addEventListener('click', function (event) {
  var target = event.target.closest('button, a');
  if (!target) return;
  var layoutAction = target.dataset.heroLayout;
  if (layoutAction === 'toggle') { toggleDashboardLayoutEditor(); return; }
  if (layoutAction === 'save') { saveDashboardLayout(); return; }
  if (layoutAction === 'reset') { resetDashboardLayout(); return; }
  if (target.dataset.route) { event.preventDefault(); navigate(target.dataset.route); return; }
  if (target.dataset.detail) { openDetail(target.dataset.detail); return; }
    var action = target.dataset.action;
    if (action === 'scroll-leave-section') {
      var sectionId = target.dataset.leaveSection;
      var leaveSection = sectionId && document.getElementById(sectionId);
      if (leaveSection) {
        leaveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.querySelectorAll('.leave-section-nav-link').forEach(function (link) {
          link.classList.toggle('is-active', link === target);
        });
      }
      return;
    }
  if (action === 'scroll-leave-history') {
    var leaveHistory = document.querySelector('.page-shell.leave-page .leave-history-panel');
    if (leaveHistory) {
      leaveHistory.hidden = false;
      leaveHistory.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }
  if (action === 'search') notify('ค้นหาทั้ง People Operations จำลองแล้ว');
  if (action === 'notifications') notify('มี 3 รายการใหม่ · งานอนุมัติ 2 · ประกาศ 1');
  if (action === 'profile') notify('เมนูบัญชีผู้ใช้จำลองแล้ว');
  if (action === 'save') notify('บันทึกการตั้งค่าจำลองแล้ว · ยังไม่ส่งไปยังระบบจริง');
  if (action === 'setting-edit') notify('เปิดช่องแก้ไขนโยบายในศูนย์กลางจำลองแล้ว');
  if (action === 'attendance-checkout') notify('ลงเวลาออกจำลองแล้ว · 18:04 น.');
  if (action === 'attendance-location') notify('ตรวจพิกัดจำลองแล้ว · อยู่ในรัศมีสำนักงาน');
  if (action === 'approve') notify('อนุมัติรายการจำลองแล้ว · คิวงานอัปเดตแล้ว');
  if (action === 'reject') notify('ส่งรายการกลับแก้ไขจำลองแล้ว');
  if (action === 'filter') notify('เปิดตัวกรองจำลองแล้ว');
  if (action === 'export') notify('ส่งออกรายงานจำลองแล้ว');
  if (action === 'calendar-prev' || action === 'calendar-next') notify('เปลี่ยนเดือนในต้นแบบแล้ว');
  if (action === 'open-detail') { if (dialog.open) dialog.close(); notify('เปิดรายการจำลองแล้ว'); }
  if (target.dataset.close) { if (dialog.open) dialog.close(); else dialog.removeAttribute('open'); }
});
document.addEventListener('change', function (event) {
  var control = event.target;
  if (!control.matches('.leave-choice input, .leave-duration-option input')) return;
  var group = control.closest('.leave-choice-grid, .leave-duration-grid');
  if (!group) return;
  group.querySelectorAll('.is-selected').forEach(function (node) { node.classList.remove('is-selected'); });
  var selected = control.closest('label');
  if (selected) selected.classList.add('is-selected');
});
document.addEventListener('submit', function (event) {
  event.preventDefault();
  var id = event.target.id;
  var messages = {
    'leave-inline-form': 'ส่งคำขอลาจำลองแล้ว · รายการยังอยู่ในหน้าระบบลา',
    'overtime-inline-form': 'ส่งคำขอ OT จำลองแล้ว · รายการยังอยู่ในหน้า OT',
    'medical-inline-form': 'ส่งรายการเบิกค่ารักษาจำลองแล้ว · รอตรวจเอกสาร',
    'correction-inline-form': 'ส่งคำขอแก้ไขเวลาจำลองแล้ว · รอตรวจสอบ',
    'leave-request-form': 'ส่งคำขอลาจำลองแล้ว',
    'overtime-request-form': 'ส่งคำขอ OT จำลองแล้ว',
    'correction-request-form': 'ส่งคำขอแก้ไขเวลาจำลองแล้ว',
    'medical-request-form': 'ส่งรายการเบิกค่ารักษาจำลองแล้ว'
  };
  if (!messages[id]) return;
  notify(messages[id]);
  if (!event.target.dataset.inline) navigate(id.split('-')[0] + '/requests');
});

window.addEventListener('hashchange', function () {
  var clean = location.hash.slice(1) || 'dashboard';
  if (!routes.has(clean)) clean = 'dashboard';
  var parts = clean.split('/');
  page = parts[0]; subpage = parts.slice(1).join('/');
  render();
});
var initial = location.hash.slice(1) || 'dashboard';
if (!routes.has(initial)) initial = 'dashboard';
var initialParts = initial.split('/');
page = initialParts[0]; subpage = initialParts.slice(1).join('/');
render();
