/* ---------------------------------------------------------------
   Rich text editor for the author studio.

   RichEditor.create({ toolbar, editor, source, stage, toast })
     toolbar  the .toolbar element (buttons are inserted before #tbSpacer)
     editor   the contenteditable element
     source   a <textarea> used by the "HTML" (code) view
     stage    wrapper around editor + source; the image bar lives here
     toast    function(message)

   Content is stored as HTML and always passes through sanitizeHTML()
   (see app.js) before it is saved or displayed.
   --------------------------------------------------------------- */
(function () {
  'use strict';

  /* ---------- icons ---------- */
  const SVG = (inner) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const LN = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const ICON = {
    link: SVG('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
    image: SVG('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>'),
    video: SVG('<rect x="2" y="2" width="20" height="20" rx="2.2"/>' + LN(7, 2, 7, 22) + LN(17, 2, 17, 22) + LN(2, 12, 22, 12) + LN(2, 7, 7, 7) + LN(2, 17, 7, 17) + LN(17, 17, 22, 17) + LN(17, 7, 22, 7)),
    attach: SVG('<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>'),
    emoji: SVG('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>' + LN(9, 9, 9.01, 9) + LN(15, 9, 15.01, 9)),
    code: SVG('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    hilite: SVG('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    alignLeft: SVG(LN(17, 10, 3, 10) + LN(21, 6, 3, 6) + LN(21, 14, 3, 14) + LN(17, 18, 3, 18)),
    alignCenter: SVG(LN(18, 10, 6, 10) + LN(21, 6, 3, 6) + LN(21, 14, 3, 14) + LN(18, 18, 6, 18)),
    alignRight: SVG(LN(21, 10, 7, 10) + LN(21, 6, 3, 6) + LN(21, 14, 3, 14) + LN(21, 18, 7, 18)),
    alignJustify: SVG(LN(21, 10, 3, 10) + LN(21, 6, 3, 6) + LN(21, 14, 3, 14) + LN(21, 18, 3, 18)),
    indent: SVG(LN(3, 6, 21, 6) + LN(11, 12, 21, 12) + LN(3, 18, 21, 18) + '<polyline points="3 9 6 12 3 15"/>'),
    outdent: SVG(LN(3, 6, 21, 6) + LN(11, 12, 21, 12) + LN(3, 18, 21, 18) + '<polyline points="6 9 3 12 6 15"/>'),
    ul: SVG(LN(8, 6, 21, 6) + LN(8, 12, 21, 12) + LN(8, 18, 21, 18) + LN(3, 6, 3.01, 6) + LN(3, 12, 3.01, 12) + LN(3, 18, 3.01, 18)),
    ol: SVG(LN(10, 6, 21, 6) + LN(10, 12, 21, 12) + LN(10, 18, 21, 18) + '<path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
    hr: SVG(LN(3, 12, 21, 12)),
    spacing: SVG(LN(12, 6, 21, 6) + LN(12, 12, 21, 12) + LN(12, 18, 21, 18) + LN(5, 5, 5, 19) + '<polyline points="3 7 5 5 7 7"/><polyline points="3 17 5 19 7 17"/>'),
    undo: SVG('<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>'),
    redo: SVG('<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>'),
    caret: '<svg class="rt-caret" viewBox="0 0 10 6" width="9" height="6" aria-hidden="true"><path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>',
    trash: SVG('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>')
  };

  /* ---------- option lists ---------- */
  const BLOCKS = [
    ['Normal', 'p', 'font:400 1rem/1.4 inherit'],
    ['Heading', 'h2', 'font:700 1.35rem/1.2 Georgia,serif'],
    ['Subheading', 'h3', 'font:700 1.12rem/1.25 Georgia,serif'],
    ['Quote', 'blockquote', 'font:italic 1.05rem Georgia,serif']
  ];
  const FONTS = [
    ['Default', 'inherit'],
    ['Georgia', 'Georgia, serif'],
    ['Times New Roman', "'Times New Roman', Times, serif"],
    ['Palatino', "'Palatino Linotype', Palatino, serif"],
    ['Arial', 'Arial, Helvetica, sans-serif'],
    ['Verdana', 'Verdana, Geneva, sans-serif'],
    ['Trebuchet MS', "'Trebuchet MS', sans-serif"],
    ['Tahoma', 'Tahoma, Geneva, sans-serif'],
    ['Courier New', "'Courier New', Courier, monospace"]
  ];
  const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64];
  const COLORS = ['#000000', '#3c4043', '#5f6368', '#9aa0a6', '#dadce0', '#ffffff',
    '#c5221f', '#e8710a', '#d7a93d', '#188038', '#176b43', '#129eaf',
    '#1a73e8', '#5f3dc4', '#a142f4', '#e52592', '#7d2e12', '#7a5c00',
    '#0d652d', '#174ea6', '#8e24aa', '#b80672', '#6d4c41', '#455a64'];
  const HILITES = ['#fff475', '#fbbc04', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'];
  const LINE_HEIGHTS = [['Single', '1'], ['1.15', '1.15'], ['1.5', '1.5'], ['1.75', '1.75'], ['Double', '2'], ['2.5', '2.5']];
  const PARA_SPACE = [['None', '0'], ['Small', '0.5em'], ['Normal', '1.15em'], ['Large', '2em']];
  const EMOJI = {
    '😀': '😀😃😄😁😆😅😂🤣😊😇🙂😉😍🥰😘😋😎🤩🥳😏😒😞😔😢😭😤😡🤔🤗🤫🙄😴😷🤒😱😳🥺😬🙃🤪😌😜',
    '👍': '👍👎👏🙌🙏🤝✌️🤞👌🤟👋💪✍️👀🧠👂👃👣🫶🫡🤲👊✊🖐️🤙',
    '❤️': '❤️🧡💛💚💙💜🖤🤍🤎💔💕💖💗💘💝💯🔥✨⭐🌟💥🎉🎊🎁🏆🥇',
    '🌍': '🌍🌎🌏🌳🌴🌿🍃🌾🌻🌺🌸🌼🌧️⛈️🌈☀️🌙🦁🐘🦒🦓🐆🦏🦛🐒🦜🐊🐢🦋🐝🐄🐐🐓🐟',
    '🍲': '🍎🍌🍉🍍🥭🍊🍋🥑🌽🥕🍠🍞🧀🍗🍖🍲🍛🍚🥘🍵☕🍺🍷🥂🍰🍫🍿🥜🌶️🍅🥥',
    '🏠': '🏠🏙️🌆🚗🚌✈️🚢🚲⛵🕍⛪🕌📚📖✏️📝📷🎥🎤🎧🎶🎨🕯️💡⏳⌛📌📎🔔🔑📱💻',
    '✅': '✅❌⚠️❗❓➕➖➡️⬅️⬆️⬇️♻️✔️💬💭🔗🇳🇬🇬🇭🇰🇪🇿🇦🇪🇬🇪🇹🇸🇳🇹🇿🇺🇬'
  };
  const splitEmoji = (s) => (window.Intl && Intl.Segmenter) ? Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s), x => x.segment) : Array.from(s);

  /* ---------- tiny helpers ---------- */
  const escHTML = (s) => String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const escAttr = (s) => escHTML(s).replace(/"/g, '&quot;');
  const BLOCK_TAGS = /^(P|DIV|H[1-6]|UL|OL|LI|BLOCKQUOTE|HR|FIGURE|PRE|TABLE)$/;
  const LEAF_SEL = 'p,h1,h2,h3,h4,li,blockquote,div';
  const fmtSize = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read that file.'));
      r.readAsDataURL(file);
    });
  }

  // Photos are resized before being stored so a few pictures don't fill the browser's storage.
  function imageFileToSrc(file, maxSide) {
    maxSide = maxSide || 1400;
    if (!/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type)) return Promise.reject(new Error('Please choose a PNG, JPG, GIF or WebP picture.'));
    if (file.type === 'image/gif') {
      if (file.size > 1500000) return Promise.reject(new Error('That GIF is over 1.5 MB. Try a smaller one.'));
      return readAsDataURL(file);
    }
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const keepPng = file.type === 'image/png' && file.size < 300000;
        if (!keepPng) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(keepPng ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That picture could not be opened.')); };
      img.src = url;
    });
  }

  function lsBytes() {
    let n = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); n += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch (_) {}
    return n;
  }

  function parseVideoURL(raw) {
    const u = (raw || '').trim();
    let m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{6,20})/i);
    if (m) return { kind: 'embed', src: 'https://www.youtube-nocookie.com/embed/' + m[1] };
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (m) return { kind: 'embed', src: 'https://player.vimeo.com/video/' + m[1] };
    if (/^https?:\/\/[^\s]+\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(u)) return { kind: 'file', src: u };
    return null;
  }

  function normUrl(raw) {
    const u = (raw || '').trim();
    if (!u) return '';
    if (/^(https?:\/\/|mailto:|tel:)\S+$/i.test(u)) return u;
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(u)) return 'https://' + u;
    return '';
  }

  // Wrap loose text/inline nodes sitting directly in the container in <p>.
  function blockify(root) {
    let run = null;
    Array.from(root.childNodes).forEach(n => {
      if (n.nodeType === 1 && BLOCK_TAGS.test(n.nodeName)) { run = null; return; }
      if (n.nodeType === 3 && !n.nodeValue.trim() && !run) { root.removeChild(n); return; }
      if (!run) { run = document.createElement('p'); root.insertBefore(run, n); }
      run.appendChild(n);
    });
  }

  const hasMedia = (el) => !!el.querySelector('img,iframe,video,hr,a.attachment');
  const textOnly = (el) => (el.textContent || '').replace(/[\u200b\s]/g, '');
  const isEmptyEl = (el) => !textOnly(el) && !hasMedia(el);

  // Plain text with a newline between blocks (does not depend on layout).
  function domText(root) {
    let out = '';
    (function walk(n) {
      n.childNodes.forEach(c => {
        if (c.nodeType === 3) out += c.nodeValue;
        else if (c.nodeType === 1) {
          if (c.nodeName === 'BR') { out += '\n'; return; }
          if (c.matches && c.matches('.video-wrap,img,iframe,video')) { out += '\n'; return; }
          const blk = BLOCK_TAGS.test(c.nodeName);
          if (blk && out && !out.endsWith('\n')) out += '\n';
          walk(c);
          if (blk && !out.endsWith('\n')) out += '\n';
        }
      });
    })(root);
    return out.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  }

  /* ============================================================
     create()
     ============================================================ */
  function create(opts) {
    const toolbar = opts.toolbar, ed = opts.editor, src = opts.source, stage = opts.stage;
    const toast = opts.toast || function () {};
    const wrap = toolbar.parentNode; // menus are placed inside this (position: relative)
    const spacer = toolbar.querySelector('#tbSpacer');

    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (_) {}

    let saved = null;       // last selection inside the editor
    let menu = null, menuBtn = null;
    let codeMode = false;
    let mediaEl = null;
    let disabled = false;
    const btns = {};
    const labels = {};

    /* ---------- selection ---------- */
    const inEditor = (n) => !!n && ed.contains(n);
    document.addEventListener('selectionchange', () => {
      const s = window.getSelection();
      if (s && s.rangeCount && inEditor(s.anchorNode) && !codeMode) {
        saved = s.getRangeAt(0).cloneRange();
        requestRefresh();
      }
    });
    function restore() {
      ed.focus({ preventScroll: true });
      const s = window.getSelection();
      if (saved && inEditor(saved.startContainer) && inEditor(saved.endContainer)) {
        s.removeAllRanges(); s.addRange(saved);
      } else {
        const r = document.createRange();
        const last = allLeafBlocks().pop();
        r.selectNodeContents(last || ed); r.collapse(false);
        s.removeAllRanges(); s.addRange(r); saved = r.cloneRange();
      }
    }
    const curRange = () => { const s = window.getSelection(); return s && s.rangeCount ? s.getRangeAt(0) : null; };
    function selectBetween(first, last, collapseToEnd) {
      const r = document.createRange();
      r.setStartBefore(first); r.setEndAfter(last);
      if (collapseToEnd) r.collapse(false);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); saved = r.cloneRange();
    }

    /* ---------- housekeeping ---------- */
    function fire() {
      updateEmpty();
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function updateEmpty() { ed.classList.toggle('is-empty', isEmptyEl(ed)); }
    function decorate() {
      ed.querySelectorAll('.video-wrap').forEach(w => w.setAttribute('contenteditable', 'false'));
      const last = ed.lastElementChild;
      if (!last || last.nodeName !== 'P') { const p = document.createElement('p'); p.innerHTML = '<br>'; ed.appendChild(p); }
    }
    function ensureBlocks() {
      if (!ed.firstChild || (ed.childNodes.length === 1 && ed.firstChild.nodeName === 'BR')) {
        ed.innerHTML = '<p><br></p>';
        const r = document.createRange(); r.setStart(ed.firstChild, 0); r.collapse(true);
        const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        return;
      }
      const s = window.getSelection();
      if (s && s.rangeCount && s.anchorNode && s.anchorNode.parentNode === ed && s.anchorNode.nodeType === 3) {
        try { document.execCommand('formatBlock', false, '<p>'); } catch (_) {}
      }
    }
    function afterChange() { ensureBlocks(); decorate(); updateEmpty(); requestRefresh(); }

    function exec(name, val, css) {
      restore();
      try { document.execCommand('styleWithCSS', false, !!css); } catch (_) {}
      let ok = false;
      try { ok = document.execCommand(name, false, val); } catch (_) {}
      afterChange();
      return ok;
    }
    function insertHTML(html) {
      restore();
      let ok = false;
      try { ok = typeof document.execCommand === 'function' && document.execCommand('insertHTML', false, html); } catch (_) {}
      if (!ok) {
        const r = curRange();
        if (r) {
          r.deleteContents();
          const frag = r.createContextualFragment(html);
          const last = frag.lastChild;
          r.insertNode(frag);
          if (last) { r.setStartAfter(last); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); saved = r.cloneRange(); }
        }
        fire();
      }
      afterChange();
    }

    /* ---------- blocks in the selection ---------- */
    function allLeafBlocks() {
      const cand = Array.from(ed.querySelectorAll(LEAF_SEL)).filter(el => !el.closest('.video-wrap'));
      return cand.filter(el => !cand.some(o => o !== el && el.contains(o)));
    }
    function selectedBlocks(readOnly) {
      let r = curRange();
      if (!r || !inEditor(r.commonAncestorContainer)) { restore(); r = curRange(); }
      if (!r) return [];
      const pick = () => allLeafBlocks().filter(el => {
        const rr = document.createRange(); rr.selectNodeContents(el);
        if (r.collapsed) return r.compareBoundaryPoints(Range.START_TO_START, rr) >= 0 && r.compareBoundaryPoints(Range.END_TO_START, rr) <= 0;
        return r.compareBoundaryPoints(Range.START_TO_END, rr) > 0 && r.compareBoundaryPoints(Range.END_TO_START, rr) < 0;
      });
      let list = pick();
      const bare = r.startContainer === ed || (r.startContainer.nodeType === 3 && r.startContainer.parentNode === ed);
      if (!list.length && bare && !readOnly) { try { document.execCommand('formatBlock', false, '<p>'); } catch (_) {} r = curRange() || r; list = pick(); }
      return list;
    }
    function eachBlock(fn) {
      const list = selectedBlocks();
      if (!list.length) { toast('Click inside the text first.'); return; }
      list.forEach(fn);
      afterChange(); fire();
    }

    /* ---------- toolbar definition ---------- */
    const DEFS = {
      block: { title: 'Paragraph style', dd: true, label: 'Normal', cls: 'rt-wide' },
      font: { title: 'Font style', dd: true, label: 'Font', cls: 'rt-wide' },
      size: { title: 'Font size', dd: true, label: '18', cls: 'rt-narrow' },
      bold: { title: 'Bold (Ctrl+B)', html: '<b>B</b>' },
      italic: { title: 'Italic (Ctrl+I)', html: '<i>I</i>' },
      underline: { title: 'Underline (Ctrl+U)', html: '<u>U</u>' },
      strike: { title: 'Strikethrough', html: '<s>S</s>' },
      color: { title: 'Text colour', dd: true, html: '<span class="rt-a">A<i class="rt-swatch" id="rtSwText"></i></span>' },
      hilite: { title: 'Highlight colour', dd: true, html: ICON.hilite.replace('</svg>', '</svg>') + '<i class="rt-swatch rt-sw-h" id="rtSwHi"></i>' },
      link: { title: 'Insert link (Ctrl+K)', html: ICON.link },
      image: { title: 'Insert picture', dd: true, html: ICON.image },
      video: { title: 'Insert video', dd: true, html: ICON.video },
      attach: { title: 'Attach a file', dd: true, html: ICON.attach },
      emoji: { title: 'Emoji', dd: true, html: ICON.emoji },
      code: { title: 'HTML view', html: ICON.code, keep: true },
      align: { title: 'Alignment', dd: true, html: ICON.alignLeft },
      indent: { title: 'Increase indent', html: ICON.indent },
      outdent: { title: 'Decrease indent', html: ICON.outdent },
      ul: { title: 'Bulleted list', html: ICON.ul },
      ol: { title: 'Numbered list', html: ICON.ol },
      quote: { title: 'Quote', html: '<span class="rt-glyph">❝</span>' },
      hr: { title: 'Divider line', html: ICON.hr },
      spacing: { title: 'Line and paragraph spacing', dd: true, html: ICON.spacing },
      clear: { title: 'Clear formatting', html: '<span class="rt-glyph">T<sub>x</sub></span>' },
      undo: { title: 'Undo (Ctrl+Z)', html: ICON.undo },
      redo: { title: 'Redo (Ctrl+Y)', html: ICON.redo }
    };
    const GROUPS = [
      ['block', 'font', 'size'],
      ['bold', 'italic', 'underline', 'strike'],
      ['color', 'hilite'],
      ['link', 'image', 'video', 'attach', 'emoji', 'code'],
      ['align', 'indent', 'outdent'],
      ['ul', 'ol', 'quote', 'hr'],
      ['spacing'],
      ['clear', 'undo', 'redo']
    ];
    GROUPS.forEach((g, gi) => {
      if (gi) { const sep = document.createElement('span'); sep.className = 'sep rt-sep'; toolbar.insertBefore(sep, spacer); }
      g.forEach(id => {
        const d = DEFS[id];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rt-btn' + (d.dd ? ' rt-dd' : '') + (d.cls ? ' ' + d.cls : '');
        b.dataset.rt = id;
        b.title = d.title;
        b.setAttribute('aria-label', d.title);
        if (d.dd) b.setAttribute('aria-haspopup', 'true');
        if (d.dd) b.setAttribute('aria-expanded', 'false');
        if (d.label) { b.innerHTML = '<span class="rt-label"></span>' + ICON.caret; labels[id] = b.querySelector('.rt-label'); labels[id].textContent = d.label; }
        else b.innerHTML = d.html + (d.dd ? ICON.caret : '');
        btns[id] = b;
        toolbar.insertBefore(b, spacer);
      });
    });
    // Remove the extra "Aa" noise if the swatch ids were duplicated by a second editor.
    const swText = toolbar.querySelector('#rtSwText'), swHi = toolbar.querySelector('#rtSwHi');
    let lastText = '#176b43', lastHi = '#fff475';
    const paintSwatches = () => { if (swText) swText.style.background = lastText; if (swHi) swHi.style.background = lastHi; };
    paintSwatches();

    // keep the text selection when pressing toolbar buttons / menu items
    const keepFocus = (e) => { if (!e.target.closest('input,select,textarea,label,[data-allow-focus]')) e.preventDefault(); };
    toolbar.addEventListener('mousedown', keepFocus);

    /* ---------- menus ---------- */
    function closeMenu() {
      if (menu) { menu.remove(); menu = null; }
      if (menuBtn) { menuBtn.setAttribute('aria-expanded', 'false'); menuBtn = null; }
    }
    function showMenu(btn, cls, build) {
      const same = menuBtn === btn;
      closeMenu();
      if (same) return null;
      menu = document.createElement('div');
      menu.className = 'rt-menu ' + (cls || '');
      menu.addEventListener('mousedown', keepFocus);
      menu.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.preventDefault(); });
      build(menu);
      wrap.appendChild(menu);
      const w = wrap.getBoundingClientRect(), b = btn.getBoundingClientRect();
      menu.style.top = (b.bottom - w.top + 4) + 'px';
      let left = b.left - w.left;
      const mw = menu.offsetWidth;
      if (left + mw > w.width - 4) left = Math.max(4, w.width - mw - 4);
      menu.style.left = left + 'px';
      const mb = menu.getBoundingClientRect();
      if (mb.bottom > window.innerHeight - 8 && b.top - mb.height - 8 > 0) menu.style.top = (b.top - w.top - mb.height - 4) + 'px';
      btn.setAttribute('aria-expanded', 'true');
      menuBtn = btn;
      return menu;
    }
    document.addEventListener('mousedown', (e) => {
      if (!menu) return;
      if (menu.contains(e.target) || (menuBtn && menuBtn.contains(e.target))) return;
      closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu) { closeMenu(); e.stopImmediatePropagation(); }
    });

    function listMenu(btn, items, current, onPick, extraCls) {
      showMenu(btn, 'rt-list ' + (extraCls || ''), m => {
        items.forEach(it => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'rt-item' + (it.value === current ? ' on' : '');
          b.innerHTML = '<span class="rt-tick">' + (it.value === current ? '✓' : '') + '</span><span class="rt-itxt"' + (it.style ? ' style="' + escAttr(it.style) + '"' : '') + '>' + escHTML(it.label) + '</span>';
          b.addEventListener('click', () => { closeMenu(); onPick(it.value); });
          m.appendChild(b);
        });
      });
    }
    function paletteMenu(btn, colors, autoLabel, onPick, customInit) {
      showMenu(btn, 'rt-palette', m => {
        const auto = document.createElement('button');
        auto.type = 'button'; auto.className = 'rt-auto'; auto.textContent = autoLabel;
        auto.addEventListener('click', () => { closeMenu(); onPick('inherit', true); });
        m.appendChild(auto);
        const grid = document.createElement('div'); grid.className = 'rt-grid';
        colors.forEach(c => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'rt-chip'; b.style.background = c; b.title = c; b.setAttribute('aria-label', c);
          b.addEventListener('click', () => { closeMenu(); onPick(c); });
          grid.appendChild(b);
        });
        m.appendChild(grid);
        const row = document.createElement('label');
        row.className = 'rt-custom'; row.innerHTML = '<span>Custom</span>';
        const inp = document.createElement('input'); inp.type = 'color'; inp.value = customInit;
        inp.addEventListener('change', () => { closeMenu(); onPick(inp.value); });
        row.appendChild(inp); m.appendChild(row);
      });
    }

    /* ---------- actions ---------- */
    function currentBlockTag() {
      const r = curRange();
      let n = r ? r.startContainer : null;
      n = n && (n.nodeType === 1 ? n : n.parentElement);
      while (n && n !== ed) {
        const t = n.nodeName.toLowerCase();
        if (t === 'h2' || t === 'h3' || t === 'h1' || t === 'h4') return t === 'h1' ? 'h2' : t === 'h4' ? 'h3' : t;
        if (t === 'blockquote') return 'blockquote';
        n = n.parentElement;
      }
      return 'p';
    }
    function unwrapQuote(bq, keepCaret) {
      const kids = Array.from(bq.childNodes);
      const parent = bq.parentNode;
      kids.forEach(k => parent.insertBefore(k, bq));
      parent.removeChild(bq);
      blockify(parent === ed ? ed : parent);
      const first = kids[0], last = kids[kids.length - 1];
      if (first && last && first.parentNode && last.parentNode) selectBetween(first, last, keepCaret);
    }
    function setBlock(tag) {
      restore();
      const cur = currentBlockTag();
      if (tag === 'blockquote') {
        if (cur === 'blockquote') {
          const r = curRange(); let n = r.startContainer; n = n.nodeType === 1 ? n : n.parentElement;
          const bq = n.closest('blockquote'); if (bq) { unwrapQuote(bq, r.collapsed); fire(); afterChange(); }
          return;
        }
        exec('formatBlock', '<blockquote>'); return;
      }
      if (cur === 'blockquote') {
        const r = curRange(); let n = r.startContainer; n = n.nodeType === 1 ? n : n.parentElement;
        const bq = n.closest('blockquote'); if (bq) unwrapQuote(bq, false);
      }
      exec('formatBlock', '<' + tag + '>');
    }
    function setSize(px) {
      restore();
      const s = window.getSelection();
      if (!s.rangeCount || s.isCollapsed) { toast('Select some text first, then choose a size.'); return; }
      try { document.execCommand('styleWithCSS', false, false); document.execCommand('fontSize', false, '7'); } catch (_) {}
      const made = [];
      ed.querySelectorAll('font[size="7"]').forEach(f => {
        const sp = document.createElement('span');
        sp.style.fontSize = px === 'inherit' ? 'inherit' : px + 'px';
        while (f.firstChild) sp.appendChild(f.firstChild);
        f.replaceWith(sp); made.push(sp);
      });
      if (made.length) selectBetween(made[0], made[made.length - 1]);
      afterChange(); fire();
    }
    function setLink(url, text) {
      const u = normUrl(url);
      if (!u) { toast('That doesn’t look like a web address. Try https://example.com'); return false; }
      restore();
      const r = curRange();
      let a = null;
      if (r) { let n = r.startContainer; n = n.nodeType === 1 ? n : n.parentElement; a = n && n.closest('a:not(.attachment)'); }
      if (a && ed.contains(a)) { a.setAttribute('href', u); if (text) a.textContent = text; fire(); return true; }
      if (r && !r.collapsed) exec('createLink', u);
      else insertHTML('<a href="' + escAttr(u) + '">' + escHTML(text || u) + '</a>&nbsp;');
      return true;
    }
    function styleBlocks(prop, val) {
      eachBlock(el => { if (val === '' || val == null) el.style.removeProperty(prop); else el.style.setProperty(prop, val); if (!el.getAttribute('style')) el.removeAttribute('style'); });
    }
    function shiftIndent(dir) {
      eachBlock(el => {
        const cur = parseFloat(el.style.marginLeft) || 0;
        const next = Math.max(0, Math.min(12, cur + dir * 2));
        if (next) el.style.marginLeft = next + 'em'; else el.style.removeProperty('margin-left');
        if (!el.getAttribute('style')) el.removeAttribute('style');
      });
    }
    function clearFormatting() {
      restore();
      try { document.execCommand('removeFormat'); document.execCommand('unlink'); } catch (_) {}
      selectedBlocks().forEach(el => el.removeAttribute('style'));
      ed.querySelectorAll('span[style]').forEach(sp => { const r = curRange(); if (r && r.intersectsNode(sp)) { while (sp.firstChild) sp.parentNode.insertBefore(sp.firstChild, sp); sp.remove(); } });
      afterChange(); fire();
    }

    /* ---------- dialogs ---------- */
    function formMenu(btn, html, wire, cls) {
      const m = showMenu(btn, 'rt-form ' + (cls || ''), mm => { mm.innerHTML = html; });
      if (m) { wire(m); const first = m.querySelector('input[type=url],input[type=text]'); if (first) setTimeout(() => first.focus(), 0); }
      return m;
    }
    function tabs(m) {
      m.querySelectorAll('.rt-tab').forEach(t => t.addEventListener('click', () => {
        m.querySelectorAll('.rt-tab').forEach(x => x.classList.toggle('on', x === t));
        m.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; });
        const f = m.querySelector('[data-pane]:not([hidden]) input[type=url]'); if (f) f.focus();
      }));
    }
    function warnStorage() {
      const used = lsBytes();
      if (used > 4200000) toast('Browser storage is almost full (' + (used / 1048576).toFixed(1) + ' MB). Use fewer or smaller pictures and videos, or link to hosted ones.');
    }

    function insertImageSrc(srcUrl, alt) {
      insertHTML('<p style="text-align:center"><img class="img-l" src="' + escAttr(srcUrl) + '" alt="' + escAttr(alt || '') + '"></p>');
      fire();
    }
    async function insertImageFiles(files, alt) {
      const list = Array.from(files).filter(f => /^image\//.test(f.type));
      if (!list.length) { toast('That isn’t a picture file.'); return; }
      toast(list.length > 1 ? 'Adding pictures…' : 'Adding picture…');
      for (const f of list) {
        try { insertImageSrc(await imageFileToSrc(f), list.length === 1 ? alt : ''); }
        catch (err) { toast(err.message || 'Could not add that picture.'); }
      }
      warnStorage();
    }
    function insertVideo(v) {
      if (v.kind === 'embed') insertHTML('<div class="video-wrap"><iframe src="' + escAttr(v.src) + '" title="Embedded video" allowfullscreen loading="lazy"></iframe></div><p><br></p>');
      else insertHTML('<div class="video-wrap is-file"><video controls preload="metadata" playsinline src="' + escAttr(v.src) + '"></video></div><p><br></p>');
      decorate(); fire();
    }

    function openImage(btn) {
      formMenu(btn, `
        <div class="rt-tabs"><button type="button" class="rt-tab on" data-tab="up">Upload</button><button type="button" class="rt-tab" data-tab="url">From a link</button></div>
        <div data-pane="up"><label class="rt-drop">Choose pictures from your device<input type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple></label>
          <p class="rt-hint">Photos are resized automatically so they fit in browser storage. You can also paste or drag pictures into the page.</p></div>
        <div data-pane="url" hidden><input type="url" placeholder="https://example.com/photo.jpg" aria-label="Picture address"><button type="button" class="rt-go">Insert</button></div>
        <label class="rt-field">Description for screen readers (optional)<input type="text" data-alt placeholder="What is in the picture?"></label>`,
        m => {
          tabs(m);
          const alt = () => m.querySelector('[data-alt]').value.trim();
          m.querySelector('input[type=file]').addEventListener('change', (e) => { const files = e.target.files; closeMenu(); insertImageFiles(files, alt()); });
          const go = () => {
            const u = m.querySelector('[data-pane=url] input').value.trim();
            if (!/^https?:\/\/\S+$/i.test(u)) { toast('Paste a full picture address starting with https://'); return; }
            const a = alt(); closeMenu(); insertImageSrc(u, a);
          };
          m.querySelector('.rt-go').addEventListener('click', go);
          m.querySelector('[data-pane=url] input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
        });
    }
    function openVideo(btn) {
      formMenu(btn, `
        <div class="rt-tabs"><button type="button" class="rt-tab on" data-tab="url">From a link</button><button type="button" class="rt-tab" data-tab="up">Upload</button></div>
        <div data-pane="url"><input type="url" placeholder="YouTube, Vimeo or .mp4 link" aria-label="Video address"><button type="button" class="rt-go">Insert</button>
          <p class="rt-hint">Best for long videos: they play from YouTube or Vimeo and use no storage.</p></div>
        <div data-pane="up" hidden><label class="rt-drop">Choose a video file (up to 2.5 MB)<input type="file" accept="video/mp4,video/webm,video/ogg"></label>
          <p class="rt-hint">Uploaded videos are kept inside this browser’s storage, so only short clips fit.</p></div>`,
        m => {
          tabs(m);
          const go = () => {
            const v = parseVideoURL(m.querySelector('[data-pane=url] input').value);
            if (!v) { toast('Use a YouTube or Vimeo link, or a direct link to an .mp4 / .webm file.'); return; }
            closeMenu(); insertVideo(v);
          };
          m.querySelector('.rt-go').addEventListener('click', go);
          m.querySelector('[data-pane=url] input').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
          m.querySelector('input[type=file]').addEventListener('change', async (e) => {
            const f = e.target.files[0]; if (!f) return;
            if (!/^video\/(mp4|webm|ogg)$/.test(f.type)) { toast('Please choose an MP4, WebM or OGG video.'); return; }
            if (f.size > 2.5 * 1048576) { toast('That video is ' + fmtSize(f.size) + '. Upload it to YouTube or Vimeo and paste the link instead.'); return; }
            try { const data = await readAsDataURL(f); closeMenu(); insertVideo({ kind: 'file', src: data }); warnStorage(); }
            catch (err) { toast(err.message); }
          });
        });
    }
    function openAttach(btn) {
      formMenu(btn, `
        <label class="rt-drop">Choose a file to attach (up to 2 MB)<input type="file"></label>
        <p class="rt-hint">Readers will see a download button in the story. PDFs, Word and Excel files, ZIPs and images all work.</p>`,
        m => {
          m.querySelector('input[type=file]').addEventListener('change', async (e) => {
            const f = e.target.files[0]; if (!f) return;
            if (f.size > 2 * 1048576) { toast('That file is ' + fmtSize(f.size) + '. Attachments are limited to 2 MB because they’re stored in this browser.'); return; }
            try {
              const data = await readAsDataURL(f);
              closeMenu();
              insertHTML('<p><a class="attachment" href="' + escAttr(data) + '" download="' + escAttr(f.name) + '">📎 ' + escHTML(f.name) + ' <small>(' + fmtSize(f.size) + ')</small></a></p>');
              fire(); warnStorage();
            } catch (err) { toast(err.message); }
          });
        });
    }
    function openLink(btn) {
      const r = saved;
      let existing = null, hasSel = r && !r.collapsed;
      if (r) { let n = r.startContainer; n = n.nodeType === 1 ? n : n.parentElement; existing = n && n.closest && n.closest('a:not(.attachment)'); if (existing && !ed.contains(existing)) existing = null; }
      formMenu(btn, `
        <label class="rt-field">Web address<input type="url" placeholder="https://example.com" value="${escAttr(existing ? existing.getAttribute('href') : '')}"></label>
        ${hasSel ? '' : `<label class="rt-field">Text to show<input type="text" placeholder="Link text" value="${escAttr(existing ? existing.textContent : '')}"></label>`}
        <div class="rt-row"><button type="button" class="rt-go">${existing ? 'Update link' : 'Insert link'}</button>${existing ? '<button type="button" class="rt-ghost" data-unlink>Remove link</button>' : ''}</div>`,
        m => {
          const urlIn = m.querySelector('input[type=url]'), txtIn = m.querySelector('input[type=text]');
          const go = () => { const ok = setLink(urlIn.value, txtIn ? txtIn.value.trim() : ''); if (ok) closeMenu(); };
          m.querySelector('.rt-go').addEventListener('click', go);
          m.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
          const un = m.querySelector('[data-unlink]');
          if (un) un.addEventListener('click', () => { closeMenu(); restore(); const rr = curRange(); if (rr && rr.collapsed && existing) { const rng = document.createRange(); rng.selectNodeContents(existing); const s = window.getSelection(); s.removeAllRanges(); s.addRange(rng); saved = rng.cloneRange(); } exec('unlink'); fire(); });
        });
    }
    function openEmoji(btn) {
      showMenu(btn, 'rt-emoji', m => {
        const keys = Object.keys(EMOJI);
        const tabRow = document.createElement('div'); tabRow.className = 'rt-tabs rt-etabs';
        const grid = document.createElement('div'); grid.className = 'rt-egrid';
        const fill = (k) => {
          grid.innerHTML = '';
          splitEmoji(EMOJI[k]).forEach(em => {
            const b = document.createElement('button'); b.type = 'button'; b.className = 'rt-emo'; b.textContent = em;
            b.addEventListener('click', () => { restore(); let ok = false; try { ok = document.execCommand('insertText', false, em); } catch (_) {} if (!ok) insertHTML(escHTML(em)); afterChange(); fire(); });
            grid.appendChild(b);
          });
        };
        keys.forEach((k, i) => {
          const t = document.createElement('button'); t.type = 'button'; t.className = 'rt-tab' + (i ? '' : ' on'); t.textContent = k;
          t.addEventListener('click', () => { tabRow.querySelectorAll('.rt-tab').forEach(x => x.classList.toggle('on', x === t)); fill(k); });
          tabRow.appendChild(t);
        });
        m.appendChild(tabRow); m.appendChild(grid); fill(keys[0]);
      });
    }
    function openAlign(btn) {
      const items = [['Align left', 'justifyLeft', ICON.alignLeft], ['Center', 'justifyCenter', ICON.alignCenter], ['Align right', 'justifyRight', ICON.alignRight], ['Justify', 'justifyFull', ICON.alignJustify]];
      showMenu(btn, 'rt-list', m => items.forEach(([label, c, ic]) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'rt-item';
        b.innerHTML = '<span class="rt-tick">' + ic + '</span><span class="rt-itxt">' + label + '</span>';
        b.addEventListener('click', () => { closeMenu(); exec(c, null, true); btn.querySelector('svg:not(.rt-caret)').outerHTML = ic; });
        m.appendChild(b);
      }));
    }
    function openSpacing(btn) {
      const first = selectedBlocks(true)[0];
      const curLH = first ? first.style.lineHeight : '', curMB = first ? first.style.marginBottom : '', curTI = first ? first.style.textIndent : '';
      showMenu(btn, 'rt-list rt-spacing', m => {
        const head = (t) => { const h = document.createElement('div'); h.className = 'rt-head'; h.textContent = t; m.appendChild(h); };
        const item = (label, on, fn) => {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'rt-item' + (on ? ' on' : '');
          b.innerHTML = '<span class="rt-tick">' + (on ? '✓' : '') + '</span><span class="rt-itxt">' + escHTML(label) + '</span>';
          b.addEventListener('click', () => { closeMenu(); fn(); }); m.appendChild(b);
        };
        head('Line spacing');
        LINE_HEIGHTS.forEach(([l, v]) => item(l, curLH === v, () => styleBlocks('line-height', v)));
        item('Default', !curLH, () => styleBlocks('line-height', ''));
        head('Space after paragraph');
        PARA_SPACE.forEach(([l, v]) => item(l, curMB === v, () => styleBlocks('margin-bottom', v)));
        item('Default', !curMB, () => styleBlocks('margin-bottom', ''));
        head('First line');
        item('Indent first line', curTI === '2em', () => styleBlocks('text-indent', '2em'));
        item('No first-line indent', !curTI, () => styleBlocks('text-indent', ''));
      });
    }

    const ACT = {
      bold: () => exec('bold'),
      italic: () => exec('italic'),
      underline: () => exec('underline'),
      strike: () => exec('strikeThrough'),
      block: (b) => listMenu(b, BLOCKS.map(x => ({ label: x[0], value: x[1], style: x[2] })), currentBlockTag(), setBlock),
      font: (b) => listMenu(b, FONTS.map(x => ({ label: x[0], value: x[1], style: 'font-family:' + x[1] })), '', (v) => exec('fontName', v, true), 'rt-scroll'),
      size: (b) => listMenu(b, [{ label: 'Default', value: 'inherit' }].concat(SIZES.map(n => ({ label: String(n), value: n }))), '', setSize, 'rt-scroll rt-narrowlist'),
      color: (b) => paletteMenu(b, COLORS, 'Automatic', (c, auto) => { if (!auto) { lastText = c; paintSwatches(); } exec('foreColor', c, true); }, lastText),
      hilite: (b) => paletteMenu(b, HILITES, 'No highlight', (c, auto) => { if (!auto) { lastHi = c; paintSwatches(); } exec('hiliteColor', auto ? 'transparent' : c, true); }, lastHi),
      link: openLink, image: openImage, video: openVideo, attach: openAttach, emoji: openEmoji,
      code: () => toggleCode(),
      align: openAlign,
      indent: () => shiftIndent(1),
      outdent: () => shiftIndent(-1),
      ul: () => exec('insertUnorderedList'),
      ol: () => exec('insertOrderedList'),
      quote: () => setBlock('blockquote'),
      hr: () => { exec('insertHorizontalRule'); },
      spacing: openSpacing,
      clear: clearFormatting,
      undo: () => exec('undo'),
      redo: () => exec('redo')
    };
    toolbar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-rt]');
      if (!b || b.disabled) return;
      if (!b.classList.contains('rt-dd')) closeMenu();
      ACT[b.dataset.rt](b);
    });

    /* ---------- HTML (code) view ---------- */
    function prettify(html) { return html.replace(/(<\/(p|h2|h3|li|ul|ol|blockquote|div|figure)>|<hr>)/g, '$1\n').replace(/\n+$/, ''); }
    function toggleCode() {
      closeMenu(); clearMedia();
      if (!codeMode) {
        codeMode = true;
        src.value = prettify(sanitizeHTML(ed.innerHTML));
        ed.hidden = true; src.hidden = false;
        src.focus();
      } else {
        codeMode = false;
        setHTML(src.value);
        src.hidden = true; ed.hidden = false;
        fire();
        ed.focus();
      }
      btns.code.setAttribute('aria-pressed', String(codeMode));
      syncDisabled();
    }
    src.addEventListener('input', () => ed.dispatchEvent(new Event('input', { bubbles: true })));

    /* ---------- enable / disable ---------- */
    function syncDisabled() {
      const off = disabled || codeMode;
      Object.keys(btns).forEach(id => { btns[id].disabled = off && !(codeMode && !disabled && DEFS[id].keep); });
      toolbar.classList.toggle('is-off', off);
    }

    /* ---------- toolbar state ---------- */
    let rafPending = false;
    function requestRefresh() { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; refresh(); }); }
    function refresh() {
      if (codeMode || disabled) return;
      const s = window.getSelection();
      if (!s || !s.rangeCount || !inEditor(s.anchorNode)) return;
      const state = (c) => { try { return document.queryCommandState(c); } catch (_) { return false; } };
      const on = (id, v) => btns[id].setAttribute('aria-pressed', v ? 'true' : 'false');
      on('bold', state('bold')); on('italic', state('italic')); on('underline', state('underline')); on('strike', state('strikeThrough'));
      on('ul', state('insertUnorderedList')); on('ol', state('insertOrderedList'));
      on('quote', currentBlockTag() === 'blockquote');
      const bl = BLOCKS.find(x => x[1] === currentBlockTag());
      labels.block.textContent = bl ? bl[0] : 'Normal';
      const el = s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement;
      if (el && el.nodeType === 1) {
        const cs = getComputedStyle(el);
        const px = Math.round(parseFloat(cs.fontSize));
        if (px) labels.size.textContent = String(px);
        const fam = (cs.fontFamily || '').split(',')[0].replace(/["']/g, '').trim().toLowerCase();
        const f = FONTS.find(x => x[1] !== 'inherit' && x[1].split(',')[0].replace(/["']/g, '').trim().toLowerCase() === fam);
        labels.font.textContent = f ? f[0] : 'Font';
      }
    }

    /* ---------- picture / video selection bar ---------- */
    const bar = document.createElement('div');
    bar.className = 'rt-mediabar'; bar.hidden = true;
    bar.addEventListener('mousedown', e => e.preventDefault());
    stage.appendChild(bar);
    function clearMedia() {
      if (mediaEl) mediaEl.classList.remove('rt-selected');
      mediaEl = null; bar.hidden = true;
    }
    function placeBar() {
      if (!mediaEl) return;
      const s = stage.getBoundingClientRect(), m = mediaEl.getBoundingClientRect();
      bar.hidden = false;
      let top = m.top - s.top - bar.offsetHeight - 6;
      if (top < 0) top = m.top - s.top + 6;
      let left = m.left - s.left;
      left = Math.max(0, Math.min(left, s.width - bar.offsetWidth));
      bar.style.top = top + 'px'; bar.style.left = left + 'px';
    }
    function selectMedia(el) {
      clearMedia();
      mediaEl = el; el.classList.add('rt-selected');
      const isImg = el.nodeName === 'IMG';
      const sz = isImg ? ['img-s', 'img-m', 'img-l', 'img-full'].find(c => el.classList.contains(c)) : '';
      const align = isImg && el.parentElement ? (el.parentElement.style.textAlign || 'left') : '';
      bar.innerHTML = (isImg ? `
        <span class="rt-bgrp">${[['img-s', 'S', 'Small'], ['img-m', 'M', 'Medium'], ['img-l', 'L', 'Large'], ['img-full', 'Full', 'Full width']].map(x => `<button type="button" data-m="size" data-v="${x[0]}" title="${x[2]}" class="${sz === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</span>
        <span class="rt-bgrp">${[['left', ICON.alignLeft], ['center', ICON.alignCenter], ['right', ICON.alignRight]].map(x => `<button type="button" data-m="align" data-v="${x[0]}" title="Align ${x[0]}" class="${align === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</span>
        <button type="button" data-m="alt" title="Edit description (alt text)">Alt</button>` : '') +
        `<button type="button" data-m="remove" title="Remove" class="rt-danger">${ICON.trash}</button>`;
      placeBar();
    }
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-m]'); if (!b || !mediaEl) return;
      const kind = b.dataset.m, el = mediaEl;
      if (kind === 'remove') {
        const host = el.closest('.video-wrap') || el;
        const p = host.parentElement;
        host.remove();
        if (p && p !== ed && isEmptyEl(p) && p.nodeName === 'P') p.remove();
        clearMedia(); afterChange(); fire(); return;
      }
      if (kind === 'size') { ['img-s', 'img-m', 'img-l', 'img-full'].forEach(c => el.classList.remove(c)); el.classList.add(b.dataset.v); }
      if (kind === 'align') {
        let host = el.parentElement;
        if (host === ed) { const p = document.createElement('p'); ed.insertBefore(p, el); p.appendChild(el); host = p; }
        host.style.textAlign = b.dataset.v;
      }
      if (kind === 'alt') {
        const v = prompt('Describe this picture for people who can’t see it:', el.getAttribute('alt') || '');
        if (v !== null) el.setAttribute('alt', v.trim());
      }
      fire(); selectMedia(el);
    });
    ed.addEventListener('click', (e) => {
      const img = e.target.closest && e.target.closest('img');
      const vid = e.target.closest && e.target.closest('.video-wrap');
      if (img && ed.contains(img)) selectMedia(img);
      else if (vid && ed.contains(vid)) selectMedia(vid);
      else clearMedia();
    });
    document.addEventListener('mousedown', (e) => { if (mediaEl && !stage.contains(e.target)) clearMedia(); });
    window.addEventListener('resize', placeBar);
    ed.addEventListener('keydown', (e) => {
      if (mediaEl && (e.key === 'Backspace' || e.key === 'Delete')) { e.preventDefault(); bar.querySelector('[data-m=remove]').click(); return; }
      if (mediaEl && e.key.length === 1 && !e.ctrlKey && !e.metaKey) clearMedia();
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); saved = curRange() ? curRange().cloneRange() : saved; if (menuBtn !== btns.link) openLink(btns.link); }
    });

    /* ---------- paste & drop ---------- */
    ed.addEventListener('paste', (e) => {
      const cd = e.clipboardData; if (!cd) return;
      const files = Array.from(cd.files || []).filter(f => /^image\//.test(f.type));
      if (files.length) { e.preventDefault(); insertImageFiles(files); return; }
      const html = cd.getData('text/html');
      if (html) {
        e.preventDefault();
        const clean = sanitizeHTML(html, { stripStyle: true });
        if (clean.trim()) { insertHTML(clean); fire(); } else {
          const t = cd.getData('text/plain'); if (t) { try { document.execCommand('insertText', false, t); } catch (_) {} }
        }
      }
    });
    ed.addEventListener('dragover', (e) => { if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) e.preventDefault(); });
    ed.addEventListener('drop', (e) => {
      const files = e.dataTransfer ? Array.from(e.dataTransfer.files || []).filter(f => /^image\//.test(f.type)) : [];
      if (!files.length) return;
      e.preventDefault();
      let r = null;
      if (document.caretRangeFromPoint) r = document.caretRangeFromPoint(e.clientX, e.clientY);
      else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(e.clientX, e.clientY); if (p) { r = document.createRange(); r.setStart(p.offsetNode, p.offset); r.collapse(true); } }
      if (r && inEditor(r.startContainer)) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); saved = r.cloneRange(); }
      insertImageFiles(files);
    });

    ed.addEventListener('input', () => { ensureBlocks(); updateEmpty(); });

    /* ---------- public content API ---------- */
    function setHTML(html) {
      closeMenu(); clearMedia();
      const h = isHTMLContent(html) ? html : (html ? renderMarkdownText(html) : '');
      ed.innerHTML = sanitizeHTML(h);
      blockify(ed);
      decorate(); updateEmpty();
      saved = null;
    }
    function getHTML() {
      const tmp = document.createElement('div');
      tmp.innerHTML = sanitizeHTML(codeMode ? src.value : ed.innerHTML);
      blockify(tmp);
      while (tmp.lastElementChild && tmp.lastElementChild.nodeName === 'P' && isEmptyEl(tmp.lastElementChild)) tmp.removeChild(tmp.lastElementChild);
      while (tmp.firstElementChild && tmp.firstElementChild.nodeName === 'P' && isEmptyEl(tmp.firstElementChild)) tmp.removeChild(tmp.firstElementChild);
      return isEmptyEl(tmp) ? '' : tmp.innerHTML;
    }
    const getText = () => domText(ed);
    const isEmpty = () => isEmptyEl(ed);
    function clear() { setHTML(''); if (codeMode) { src.value = ''; } }
    function setPlaceholder(t) { ed.style.setProperty('--ph', JSON.stringify(t)); }
    function setDisabled(on) { disabled = !!on; closeMenu(); clearMedia(); syncDisabled(); }
    function focus() { ed.focus(); }
    function insertQuote(text) { insertHTML('<blockquote>' + escHTML(text) + '</blockquote><p><br></p>'); fire(); }

    /* ---------- find & replace ---------- */
    function textIndex() {
      const walker = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT);
      const nodes = []; let full = '', prevBlock = null, n;
      while ((n = walker.nextNode())) {
        if (n.parentElement.closest('.video-wrap')) continue;
        const blk = n.parentElement.closest(LEAF_SEL) || ed;
        if (prevBlock && blk !== prevBlock) full += '\u0000';
        prevBlock = blk;
        nodes.push({ node: n, start: full.length });
        full += n.nodeValue.replace(/\u00a0/g, ' ');
      }
      return { nodes, full };
    }
    const pointAt = (idx, pos, end) => {
      for (let i = idx.nodes.length - 1; i >= 0; i--) {
        const e = idx.nodes[i];
        if (pos >= e.start && (pos < e.start + e.node.nodeValue.length || (end && pos === e.start + e.node.nodeValue.length))) return [e.node, pos - e.start];
      }
      return null;
    };
    function matchRanges(q) {
      if (!q) return { idx: null, list: [] };
      const idx = textIndex();
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const list = []; let m;
      while ((m = re.exec(idx.full))) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        const a = pointAt(idx, m.index, false), b = pointAt(idx, m.index + m[0].length, true);
        if (a && b) { const r = document.createRange(); r.setStart(a[0], a[1]); r.setEnd(b[0], b[1]); list.push(r); }
      }
      return { idx, list };
    }
    const countMatches = (q) => matchRanges(q).list.length;
    function findNext(q) {
      const { list } = matchRanges(q);
      if (!list.length) return false;
      const s = window.getSelection();
      let from = null;
      if (s.rangeCount && inEditor(s.anchorNode)) { from = s.getRangeAt(0).cloneRange(); from.collapse(false); }
      else if (saved) { from = saved.cloneRange(); from.collapse(false); }
      let pick = list[0];
      if (from) { const nxt = list.find(r => r.compareBoundaryPoints(Range.START_TO_START, from) >= 0); if (nxt) pick = nxt; }
      ed.focus({ preventScroll: true });
      s.removeAllRanges(); s.addRange(pick); saved = pick.cloneRange();
      const host = pick.startContainer.parentElement; if (host && host.scrollIntoView) host.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return true;
    }
    function replaceCurrent(q, text) {
      const s = window.getSelection();
      if (s.rangeCount && inEditor(s.anchorNode) && s.toString().toLowerCase() === q.toLowerCase()) {
        let ok = false;
        try { ok = document.execCommand('insertText', false, text); } catch (_) {}
        if (!ok) { const r = s.getRangeAt(0); r.deleteContents(); r.insertNode(document.createTextNode(text)); r.collapse(false); }
        fire();
      }
      return findNext(q);
    }
    function replaceAll(q, text) {
      const n = countMatches(q);
      let done = 0;
      saved = null;
      const r0 = document.createRange(); r0.selectNodeContents(ed); r0.collapse(true);
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(r0); saved = r0.cloneRange();
      for (let i = 0; i < n; i++) {
        if (!findNext(q)) break;
        let ok = false;
        try { ok = document.execCommand('insertText', false, text); } catch (_) {}
        if (!ok) { const r = s.getRangeAt(0); r.deleteContents(); r.insertNode(document.createTextNode(text)); r.collapse(false); s.removeAllRanges(); s.addRange(r); saved = r.cloneRange(); }
        done++;
      }
      fire();
      return done;
    }

    /* ---------- init ---------- */
    ed.setAttribute('contenteditable', 'true');
    setHTML('');
    syncDisabled();

    return { el: ed, getHTML, setHTML, getText, isEmpty, clear, setPlaceholder, setDisabled, focus, insertQuote, countMatches, findNext, replaceCurrent, replaceAll, closeMenu, _test: { allLeafBlocks, selectedBlocks, domText, blockify } };
  }

  window.RichEditor = { create, _util: { blockify, domText, parseVideoURL, normUrl } };
})();
