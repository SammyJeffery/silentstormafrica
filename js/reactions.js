/* ---------------------------------------------------------------
   Reactions — one button, many reactions.
   • Tap:        like (or remove your current reaction)
   • Press+hold: opens the reaction tray. Release over an emoji to
                 pick it, or release anywhere and tap one.
   • Keyboard:   Enter/Space = tap, ArrowUp (or Menu key) = tray,
                 arrows move, Esc closes.
   Requires store.js.
   --------------------------------------------------------------- */
const Reactions = (() => {
  const LIST = Store.REACTIONS;
  const HOLD_MS = 420;
  const byKey = k => LIST.find(r => r.key === k);

  // Read-only summary: the top three emoji plus the total.
  function summaryHTML(reactions) {
    const entries = Object.keys(reactions || {})
      .filter(k => byKey(k) && reactions[k] > 0)
      .sort((a, b) => reactions[b] - reactions[a]);
    const total = entries.reduce((t, k) => t + reactions[k], 0);
    if (!total) return '<span class="react-sum-empty">No reactions yet</span>';
    const stack = entries.slice(0, 3).map(k => `<span>${byKey(k).emoji}</span>`).join('');
    return `<span class="react-stack" aria-hidden="true">${stack}</span><span class="react-total">${total}</span>`;
  }

  function mount(root, opts) {
    const { kind, id } = opts;
    root.classList.add('react-wrap');
    root.innerHTML = `
      <button type="button" class="react-btn" aria-haspopup="true" aria-expanded="false"></button>
      <div class="react-tray" role="menu" aria-label="Choose a reaction" hidden>
        ${LIST.map(r => `<button type="button" role="menuitem" class="react-opt" data-key="${r.key}" aria-label="${r.label}"><span class="react-emo">${r.emoji}</span><span class="react-tip">${r.label}</span></button>`).join('')}
      </div>
      <span class="react-sum" aria-live="polite"></span>
      <small class="react-hint">Press and hold for more reactions</small>`;

    const btn = root.querySelector('.react-btn');
    const tray = root.querySelector('.react-tray');
    const sum = root.querySelector('.react-sum');
    const hint = root.querySelector('.react-hint');
    let timer = null, pressed = false, opened = false, hoverKey = null;

    function current() {
      return (kind === 'article' ? Store.getArticle(id) : Store.getPost(id)) || {};
    }
    function paint() {
      const mine = Store.getMyReaction(kind, id);
      const r = mine && byKey(mine);
      btn.classList.toggle('is-active', !!r);
      btn.innerHTML = r
        ? `<span class="react-emo">${r.emoji}</span><span>${r.label}</span>`
        : `<span class="react-emo react-muted">👍</span><span>Like</span>`;
      btn.setAttribute('aria-label', r ? `You reacted: ${r.label}. Tap to remove.` : 'Like. Press and hold for more reactions.');
      sum.innerHTML = summaryHTML(current().reactions);
      tray.querySelectorAll('.react-opt').forEach(o => o.classList.toggle('is-mine', o.dataset.key === mine));
      hint.hidden = !!localStorage.getItem('ss:reactHinted');
    }
    function openTray(focusFirst) {
      tray.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => tray.classList.add('is-open'));
      if (focusFirst) { const m = tray.querySelector('.is-mine') || tray.querySelector('.react-opt'); m && m.focus(); }
    }
    function closeTray() {
      tray.classList.remove('is-open');
      tray.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      tray.querySelectorAll('.is-hover').forEach(o => o.classList.remove('is-hover'));
      hoverKey = null;
    }
    function choose(key) {
      Store.react(kind, id, key);
      closeTray();
      paint();
      btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    }
    function tap() {
      const mine = Store.getMyReaction(kind, id);
      choose(mine || 'like');
    }
    function highlight(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const opt = el && el.closest && el.closest('.react-opt');
      const key = opt && tray.contains(opt) ? opt.dataset.key : null;
      if (key === hoverKey) return;
      hoverKey = key;
      tray.querySelectorAll('.react-opt').forEach(o => o.classList.toggle('is-hover', o.dataset.key === key));
    }

    btn.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      pressed = true; opened = false;
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
      clearTimeout(timer);
      timer = setTimeout(() => {
        opened = true;
        openTray(false);
        localStorage.setItem('ss:reactHinted', '1');
        document.querySelectorAll('.react-hint').forEach(h => h.hidden = true);
        if (navigator.vibrate) navigator.vibrate(12);
      }, HOLD_MS);
    });
    btn.addEventListener('pointermove', e => { if (pressed && opened) highlight(e); });
    btn.addEventListener('pointerup', e => {
      if (!pressed) return;
      pressed = false; clearTimeout(timer);
      if (opened) { if (hoverKey) choose(hoverKey); }   // otherwise the tray stays open for a tap
      else tap();
    });
    btn.addEventListener('pointercancel', () => { pressed = false; clearTimeout(timer); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
    btn.addEventListener('click', e => e.preventDefault());
    btn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); }
      else if (e.key === 'ArrowUp' || e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) { e.preventDefault(); openTray(true); }
    });

    tray.addEventListener('click', e => {
      const opt = e.target.closest('.react-opt');
      if (opt) { choose(opt.dataset.key); btn.focus(); }
    });
    tray.addEventListener('keydown', e => {
      const opts = Array.from(tray.querySelectorAll('.react-opt'));
      const i = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowRight') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
      else if (e.key === 'Escape') { closeTray(); btn.focus(); }
    });
    document.addEventListener('pointerdown', e => { if (!root.contains(e.target) && !tray.hidden) closeTray(); });

    paint();
    return { refresh: paint };
  }

  return { mount, summaryHTML };
})();
