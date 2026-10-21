(function installHeroLayoutPicker() {
  'use strict';

  const metrics = [
    ['core', 'ความพร้อมทีม', '92%', 'CORE'],
    ['a', 'ลาวันนี้', '6 คน', 'A'],
    ['b', 'OT สะสม', '42.5 ชั่วโมง', 'B'],
    ['c', 'รออนุมัติ', '8 รายการ', 'C'],
    ['d', 'ค่ารักษา', '฿3,840', 'D'],
    ['e', 'ลงเวลา', '98.6%', 'E'],
    ['f', 'พร้อมทำงาน', '86/103 คน', 'F'],
    ['g', 'ลาพักร้อน', '3 / 15 วัน', 'G'],
    ['h', 'ลากิจ', '1 / 3 วัน', 'H'],
    ['i', 'ลาป่วย', '1 / 5 วัน', 'I']
  ];

  const getHero = () => document.querySelector('.dashboard-hero-v2');
  const getNode = (hero, key) => key === 'core' ? hero?.querySelector('.orb-core') || null : hero?.querySelector(`.orb-float-${key}`) || null;
  const getNodes = (hero) => metrics.map(([key]) => getNode(hero, key)).filter(Boolean);
  const dragHandSvg = '<span class="hero-drag-handle" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M7.5 11V7.8a1.5 1.5 0 0 1 3 0V11 5.8a1.5 1.5 0 0 1 3 0V11 6.8a1.5 1.5 0 0 1 3 0V11 8.3a1.5 1.5 0 0 1 3 0v5.9c0 4.2-2.7 6.8-6.8 6.8h-1.1c-2.3 0-4.1-.9-5.4-2.7L3.7 15a1.7 1.7 0 0 1 2.6-2.1l1.2 1.3V11Z"/><path d="M7.5 14.2V11"/></svg></span>';

  const ensureDragHandle = (node) => {
    if (!node || node.querySelector('.hero-drag-handle')) return;
    node.insertAdjacentHTML('afterbegin', dragHandSvg);
  };

  const placeDragHandles = (hero) => {
    if (!hero) return;
    const heroRect = hero.getBoundingClientRect();
    getNodes(hero).forEach((node) => {
      const rect = node.getBoundingClientRect();
      node.classList.toggle('hero-handle-inset-top', rect.top - heroRect.top < 22);
      node.classList.toggle('hero-handle-inset-right', heroRect.right - rect.right < 22);
    });
  };

  const watchDragHandlePlacement = (hero) => {
    if (!hero || hero.__heroHandlePlacementObserver || typeof MutationObserver !== 'function') return;
    const observer = new MutationObserver(() => placeDragHandles(hero));
    getNodes(hero).forEach((node) => observer.observe(node, { attributes: true, attributeFilter: ['style'] }));
    hero.__heroHandlePlacementObserver = observer;
  };

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

  const selectedKey = (hero) => hero.querySelector('[data-hero-layout-key].is-layout-selected')?.dataset.heroLayoutKey || 'core';

  const readOffset = (node, axis) => {
    const inline = Number.parseFloat(node.style.getPropertyValue(`--orbit-${axis}`));
    if (Number.isFinite(inline)) return inline;
    const computed = Number.parseFloat(window.getComputedStyle(node).getPropertyValue(`--orbit-${axis}`));
    return Number.isFinite(computed) ? computed : 0;
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
    if (hint) hint.textContent = 'เลือกจุด แล้วลาก · ลูกศร = 4px · Shift = 12px';

    getNodes(hero).forEach((node) => {
      const key = metrics.find(([candidate]) => getNode(hero, candidate) === node)?.[0];
      if (!key) return;
      node.dataset.heroLayoutKey = key;
      ensureDragHandle(node);
      node.addEventListener('focus', () => selectNode(hero, key));
      node.addEventListener('click', () => selectNode(hero, key));
    });
    watchDragHandlePlacement(hero);
    placeDragHandles(hero);

    const panel = document.createElement('div');
    panel.className = 'hero-layout-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'จัดตำแหน่ง Hero ทั้งหมด');
    panel.innerHTML = '<div class="hero-layout-panel__header"><strong>จัดตำแหน่ง Hero</strong><span>10 / 10 จุด</span></div><p class="hero-layout-panel__help">เลือกจุดแล้วลาก หรือใช้ลูกศรขยับ 4px</p>';

    const picker = document.createElement('div');
    picker.className = 'hero-layout-picker';
    picker.setAttribute('role', 'list');
    picker.setAttribute('aria-label', 'เลือกวงรี');
    metrics.forEach(([key, label, value, displayKey]) => {
      const el = button('', 'hero-layout-picker__button', {
        'data-hero-layout-select': key,
        'aria-pressed': 'false',
        'aria-label': `${label} ${value} · เลือกเพื่อจัดตำแหน่ง`,
        title: `${label} ${value}`
      });
      el.innerHTML = `<span class="hero-layout-picker__key">${displayKey}</span><span class="hero-layout-picker__copy"><b>${label}</b><small>${value}</small></span>`;
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
      if (active) placeDragHandles(hero);
      if (active && !hero.querySelector('[data-hero-layout-key].is-layout-selected')) selectNode(hero, 'core');
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
