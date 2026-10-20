(function installHeroLayoutPicker() {
  'use strict';

  const metrics = [
    ['a', 'ลาวันนี้', '6 คน'],
    ['b', 'OT สะสม', '42.5 ชั่วโมง'],
    ['c', 'รออนุมัติ', '8 รายการ'],
    ['d', 'ค่ารักษา', '฿3,840'],
    ['e', 'ลงเวลา', '98.6%'],
    ['f', 'พร้อมทำงาน', '86/103 คน'],
    ['g', 'ลาพักร้อน', '3 / 15 วัน'],
    ['h', 'ลากิจ', '1 / 3 วัน'],
    ['i', 'ลาป่วย', '1 / 5 วัน']
  ];

  const getHero = () => document.querySelector('.dashboard-hero-v2');
  const getNode = (hero, key) => hero?.querySelector(`.orb-float-${key}`) || null;
  const getNodes = (hero) => metrics.map(([key]) => getNode(hero, key)).filter(Boolean);

  const selectNode = (hero, key) => {
    getNodes(hero).forEach((node) => {
      const selected = node.dataset.heroLayoutKey === key;
      node.classList.toggle('is-layout-selected', selected);
      node.setAttribute('aria-current', selected ? 'true' : 'false');
    });
    hero.querySelectorAll('[data-hero-layout-select]').forEach((button) => {
      const selected = button.dataset.heroLayoutSelect === key;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
  };

  const selectedKey = (hero) => hero.querySelector('.orb-float.is-layout-selected')?.dataset.heroLayoutKey || 'a';

  const readOffset = (node, axis) => {
    const value = Number.parseFloat(node.style.getPropertyValue(`--orbit-${axis}`));
    return Number.isFinite(value) ? value : 0;
  };

  const nudge = (hero, key, dx, dy) => {
    const node = getNode(hero, key);
    if (!node) return;
    node.style.setProperty('--orbit-x', `${readOffset(node, 'x') + dx}px`, 'important');
    node.style.setProperty('--orbit-y', `${readOffset(node, 'y') + dy}px`, 'important');
    selectNode(hero, key);
    node.focus({ preventScroll: true });
  };

  const button = (label, className, attrs = {}) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = className;
    el.textContent = label;
    Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
    return el;
  };

  const enhance = (hero) => {
    const tools = hero.querySelector('.hero-layout-tools');
    if (!tools || tools.dataset.layoutPickerReady === 'true') return;
    tools.dataset.layoutPickerReady = 'true';

    const hint = tools.querySelector('.hero-layout-hint');
    if (hint) hint.textContent = 'เลือกวงรี แล้วลาก · ลูกศร = 4px · Shift = 12px';

    getNodes(hero).forEach((node) => {
      const key = metrics.find(([candidate]) => node.classList.contains(`orb-float-${candidate}`))?.[0];
      if (!key) return;
      node.dataset.heroLayoutKey = key;
      node.addEventListener('focus', () => selectNode(hero, key));
      node.addEventListener('click', () => selectNode(hero, key));
    });

    const panel = document.createElement('div');
    panel.className = 'hero-layout-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'จัดตำแหน่งวงรีทั้งหมด');
    panel.innerHTML = '<div class="hero-layout-panel__header"><strong>จัดตำแหน่งวงรี</strong><span>9 / 9 จุด</span></div><p class="hero-layout-panel__help">เลือกชื่อแล้วลากวงรี หรือใช้ลูกศรขยับ 4px</p>';

    const picker = document.createElement('div');
    picker.className = 'hero-layout-picker';
    picker.setAttribute('role', 'list');
    picker.setAttribute('aria-label', 'เลือกวงรี');
    metrics.forEach(([key, label, value], index) => {
      const el = button('', 'hero-layout-picker__button', {
        'data-hero-layout-select': key,
        'aria-pressed': 'false',
        'aria-label': `${label} ${value} · เลือกเพื่อจัดตำแหน่ง`,
        title: `${label} ${value}`
      });
      el.innerHTML = `<span class="hero-layout-picker__key">${String.fromCharCode(65 + index)}</span><span class="hero-layout-picker__copy"><b>${label}</b><small>${value}</small></span>`;
      picker.append(el);
    });
    panel.append(picker);

    const nudgeGroup = document.createElement('div');
    nudgeGroup.className = 'hero-layout-nudge';
    nudgeGroup.setAttribute('role', 'group');
    nudgeGroup.setAttribute('aria-label', 'ขยับวงรีที่เลือก');
    [['↑', 'up', 'ขยับขึ้น'], ['←', 'left', 'ขยับซ้าย'], ['→', 'right', 'ขยับขวา'], ['↓', 'down', 'ขยับลง']].forEach(([label, direction, ariaLabel]) => {
      nudgeGroup.append(button(label, `hero-layout-nudge__button is-${direction}`, {
        'data-hero-layout-nudge': direction,
        'aria-label': ariaLabel,
        title: ariaLabel
      }));
    });
    panel.append(nudgeGroup);
    hero.append(panel);

    picker.addEventListener('click', (event) => {
      const el = event.target.closest('[data-hero-layout-select]');
      if (!el) return;
      selectNode(hero, el.dataset.heroLayoutSelect);
      getNode(hero, el.dataset.heroLayoutSelect)?.focus({ preventScroll: true });
    });
    nudgeGroup.addEventListener('click', (event) => {
      const el = event.target.closest('[data-hero-layout-nudge]');
      if (!el) return;
      const amount = event.shiftKey ? 12 : 4;
      const vectors = { up: [0, -amount], down: [0, amount], left: [-amount, 0], right: [amount, 0] };
      const [dx, dy] = vectors[el.dataset.heroLayoutNudge] || [0, 0];
      nudge(hero, selectedKey(hero), dx, dy);
    });

    const sync = () => {
      const active = hero.classList.contains('hero-layout-editor') || tools.classList.contains('is-active') || tools.querySelector('[aria-pressed="true"]');
      panel.classList.toggle('is-visible', Boolean(active));
      if (active && !hero.querySelector('.orb-float.is-layout-selected')) selectNode(hero, 'a');
      if (!active) {
        getNodes(hero).forEach((node) => node.classList.remove('is-layout-selected'));
        panel.querySelectorAll('[data-hero-layout-select]').forEach((el) => el.setAttribute('aria-pressed', 'false'));
      }
    };
    tools.addEventListener('click', () => window.setTimeout(sync, 0));
    sync();
  };

  const schedule = () => {
    let tries = 0;
    const timer = window.setInterval(() => {
      const hero = getHero();
      if (hero) enhance(hero);
      tries += 1;
      if (hero?.querySelector('.hero-layout-tools[data-layout-picker-ready="true"]') || tries > 20) window.clearInterval(timer);
    }, 150);
  };

  const boot = () => {
    enhance(getHero());
    schedule();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  window.addEventListener('hashchange', schedule);
})();
