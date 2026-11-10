/* ---------------------------------------------------------------
   Author dashboard
   - Overview: traffic, top content, reactions, rhythm, activity
   - Write:    editor with formatting, live insights, goals,
               sprint timer, find & replace, prompts, autosave
   - Content:  edit / delete articles and posts
   - Comments: moderate every comment in one place
   Guarded behind login. Requires store.js and auth.js.
   --------------------------------------------------------------- */
(function () {
  if (!Auth.isLoggedIn()) {
    location.href = 'login.html';
    return;
  }

  const $ = (id) => document.getElementById(id);
  const esc = (s) => escapeHTML(s);
  const fmt = (n) => Number(n || 0).toLocaleString();

  const account = Auth.getAccount();
  $('whoLine').textContent = account ? `Signed in as ${account.name} (${account.email})` : '';

  /* ============================================================
     Tabs
     ============================================================ */
  const TABS = ['overview', 'write', 'content', 'comments'];

  function showTab(name, pushHash) {
    if (!TABS.includes(name)) name = 'overview';
    document.querySelectorAll('.dash-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === name)));
    TABS.forEach(t => { $('panel-' + t).hidden = t !== name; });
    if (pushHash !== false && location.hash !== '#' + name) history.replaceState(null, '', '#' + name);
    if (name === 'overview') renderOverview();
    if (name === 'content') renderLists();
    if (name === 'comments') renderComments();
    if (name !== 'write') leaveFocusMode();
  }
  document.querySelectorAll('.dash-tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1), false));

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ============================================================
     OVERVIEW
     ============================================================ */
  let range = 30;
  let sortBy = 'views';

  function delta(cur, prev, days) {
    if (!prev) return `<span>${days}-day total</span>`;
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return `<span>No change vs previous ${days} days</span>`;
    return `<span class="${pct > 0 ? 'up' : 'down'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)}%</span> <span>vs previous ${days} days</span>`;
  }

  function niceMax(v) {
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
  }
  const shortDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  function chartSVG(series) {
    const W = 720, H = 250, L = 44, R = 10, T = 12, B = 30;
    const iw = W - L - R, ih = H - T - B, n = series.length;
    const max = niceMax(Math.max(1, ...series.map(s => Math.max(s.views, s.visits))));
    const cx = (i) => L + (i + 0.5) * iw / n;
    const y = (v) => T + ih - (v / max) * ih;
    let g = '';
    for (let k = 0; k <= 4; k++) {
      const v = (max / 4) * k, yy = y(v);
      g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}"/><text class="axis" x="${L - 8}" y="${yy + 4}" text-anchor="end">${fmt(Math.round(v))}</text>`;
    }
    let body = '';
    const useBars = n <= 31;
    const bw = (iw / n) * 0.62;
    if (useBars) {
      series.forEach((s, i) => {
        const h = (s.views / max) * ih;
        body += `<g class="col"><rect class="hit" x="${L + (i * iw / n)}" y="${T}" width="${iw / n}" height="${ih}"/><rect class="bar-v" x="${cx(i) - bw / 2}" y="${T + ih - h}" width="${bw}" height="${Math.max(h, 0)}" rx="2"/><title>${shortDate(s.date)}: ${fmt(s.views)} views, ${fmt(s.visits)} visits</title></g>`;
      });
    } else {
      const pts = series.map((s, i) => `${cx(i).toFixed(1)},${y(s.views).toFixed(1)}`);
      body += `<path class="area-v" d="M${cx(0)},${T + ih} L${pts.join(' L')} L${cx(n - 1)},${T + ih} Z"/><polyline class="edge-v" points="${pts.join(' ')}"/>`;
      series.forEach((s, i) => { body += `<g class="col"><rect class="hit" x="${L + (i * iw / n)}" y="${T}" width="${iw / n}" height="${ih}"/><title>${shortDate(s.date)}: ${fmt(s.views)} views, ${fmt(s.visits)} visits</title></g>`; });
    }
    body += `<polyline class="line-v" points="${series.map((s, i) => `${cx(i).toFixed(1)},${y(s.visits).toFixed(1)}`).join(' ')}"/>`;
    const labelIdx = [0, Math.floor((n - 1) / 2), n - 1];
    const labels = labelIdx.map((i, k) => `<text class="axis" x="${cx(i)}" y="${H - 8}" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}">${shortDate(series[i].date)}</text>`).join('');
    const totalViews = series.reduce((t, s) => t + s.views, 0);
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Daily page views and visits for the last ${n} days. ${fmt(totalViews)} page views in total.">${g}${body}${labels}</svg>`;
  }

  function renderKPIs(st) {
    const t = st.totals;
    const avg = (t.articles + t.posts) ? Math.round(t.viewsAll / (t.articles + t.posts)) : 0;
    $('kpis').innerHTML = `
      <div class="kpi"><small>Page views</small><strong>${fmt(st.views)}</strong>${delta(st.views, st.prevViews, st.days)}</div>
      <div class="kpi"><small>Visits</small><strong>${fmt(st.visits)}</strong>${delta(st.visits, st.prevVisits, st.days)}</div>
      <div class="kpi"><small>Reactions</small><strong>${fmt(t.reactions)}</strong><span>All time</span></div>
      <div class="kpi"><small>Comments</small><strong>${fmt(t.comments)}</strong><span>All time</span></div>
      <div class="kpi"><small>Published</small><strong>${fmt(t.articles + t.posts)}</strong><span>${t.articles} articles · ${t.posts} posts</span></div>
      <div class="kpi"><small>Words in articles</small><strong>${fmt(t.words)}</strong><span>${t.articles ? fmt(Math.round(t.words / t.articles)) + ' per article' : '—'}</span></div>
      <div class="kpi"><small>All-time views</small><strong>${fmt(t.viewsAll)}</strong><span>Across every piece</span></div>
      <div class="kpi"><small>Avg. views per piece</small><strong>${fmt(avg)}</strong><span>All time</span></div>`;
  }

  function renderTop(st) {
    const items = st.items.slice().sort((a, b) => (b[sortBy] - a[sortBy]) || (b.views - a.views)).slice(0, 7);
    if (!items.length) { $('topContent').innerHTML = '<p class="empty-note">Nothing published yet.</p>'; return; }
    const maxV = Math.max(1, ...items.map(i => i[sortBy]));
    $('topContent').innerHTML = `<div class="rows">
      <div class="trow head"><span>Title</span><span class="n">Views</span><span class="n">Reacts</span><span class="n">Comments</span></div>
      ${items.map(i => `
        <div class="trow">
          <div class="t"><a href="${i.kind === 'article' ? 'article.html?id=' + i.id : 'posts.html'}"><span class="badge ${i.kind}">${i.kind === 'article' ? 'Article' : 'Post'}</span>${esc(i.title)}</a><small>${Store.niceDate(i.date)}</small></div>
          <span class="n ${sortBy === 'views' ? 'hl' : ''}">${fmt(i.views)}</span>
          <span class="n ${sortBy === 'reactions' ? 'hl' : ''}">${fmt(i.reactions)}</span>
          <span class="n ${sortBy === 'comments' ? 'hl' : ''}">${fmt(i.comments)}</span>
          <div class="meter-bar"><i style="width:${Math.max(2, Math.round(i[sortBy] / maxV * 100))}%"></i></div>
        </div>`).join('')}
    </div>
    <p class="muted-sm">Views are for the last ${st.days} days. Reactions and comments are all-time.</p>`;
  }

  function renderReactionBars(st) {
    const total = Object.values(st.reactionTotals).reduce((a, b) => a + b, 0);
    if (!total) { $('reactionBars').innerHTML = '<p class="empty-note">No reactions yet. They\'ll appear here as readers respond.</p>'; return; }
    const max = Math.max(...Store.REACTIONS.map(r => st.reactionTotals[r.key] || 0), 1);
    $('reactionBars').innerHTML = Store.REACTIONS.map(r => {
      const n = st.reactionTotals[r.key] || 0;
      return `<div class="hbar"><span aria-hidden="true">${r.emoji}</span><span>${r.label}</span><div class="track"><i style="width:${n / max * 100}%"></i></div><span class="num">${fmt(n)}</span></div>`;
    }).join('');
  }

  function renderRhythm(st) {
    const weeks = [];
    for (let w = 11; w >= 0; w--) {
      const endD = Store.daysAgo(w * 7), startD = Store.daysAgo(w * 7 + 6);
      const a = Store.dayKey(startD), b = Store.dayKey(endD);
      let count = 0;
      Object.keys(st.publishDays).forEach(k => { if (k >= a && k <= b) count += st.publishDays[k]; });
      weeks.push({ count, label: shortDate(startD) });
    }
    const max = Math.max(1, ...weeks.map(w => w.count));
    const total = weeks.reduce((t, w) => t + w.count, 0);
    const active = weeks.filter(w => w.count).length;
    let streak = 0;
    for (let i = weeks.length - 1; i >= 0 && weeks[i].count; i--) streak++;
    $('rhythm').innerHTML = `
      <div class="rhythm" role="img" aria-label="Pieces published per week over the last 12 weeks">
        ${weeks.map(w => `<div class="wk ${w.count ? 'has' : ''}" title="Week of ${w.label}: ${w.count} published"><i style="height:${Math.max(3, w.count / max * 100)}%"></i><span>${w.count || ''}</span></div>`).join('')}
      </div>
      <p class="rhythm-sum">${total} piece${total === 1 ? '' : 's'} in 12 weeks · ${active} active week${active === 1 ? '' : 's'}${streak > 1 ? ` · ${streak}-week streak` : ''}</p>`;
  }

  function renderActivity() {
    const list = Store.getActivity(9);
    if (!list.length) { $('activityFeed').innerHTML = '<li class="empty-note">Nothing yet.</li>'; return; }
    const link = (a) => `<a href="${a.kind === 'article' ? 'article.html?id=' + a.itemId : 'posts.html'}">${esc(a.title)}</a>`;
    $('activityFeed').innerHTML = list.map(a => {
      let ic = '📝', text = '';
      if (a.type === 'publish') { ic = a.kind === 'article' ? '📰' : '📝'; text = `You published ${link(a)}`; }
      else if (a.type === 'comment') { ic = '💬'; text = `<b>${esc(a.who || 'Someone')}</b> commented on ${link(a)}<small>“${esc((a.text || '').slice(0, 90))}”</small>`; }
      else if (a.type === 'reaction') { const r = Store.REACTIONS.find(x => x.key === a.key); ic = r ? r.emoji : '👍'; text = `A reader reacted ${r ? r.label.toLowerCase() : ''} to ${link(a)}`; }
      return `<li><span class="ic" aria-hidden="true">${ic}</span><div>${text}<small>${Store.niceDate(a.ts)}</small></div></li>`;
    }).join('');
  }

  function renderOverview() {
    const st = Store.getStats(range);
    $('demoBanner').hidden = !Store.isDemoStats();
    renderKPIs(st);
    $('viewsChart').innerHTML = chartSVG(st.series);
    renderTop(st);
    renderReactionBars(st);
    renderRhythm(st);
    renderActivity();
  }

  $('rangeSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    range = Number(b.dataset.range);
    $('rangeSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    renderOverview();
  });
  $('sortSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sortBy = b.dataset.sort;
    $('sortSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    renderTop(Store.getStats(range));
  });
  $('clearDemo').addEventListener('click', () => {
    if (!confirm('Remove the sample traffic? Only real visits recorded from now on will be shown.')) return;
    Store.clearDemoStats();
    renderOverview();
    toast('Sample data cleared.');
  });

  /* ============================================================
     WRITE — form state
     ============================================================ */
  let kind = 'article';
  let editId = null;
  let pendingImage = '';

  const form = $('contentForm');
  const fTitle = $('fTitle'), fTag = $('fTag'), fExcerpt = $('fExcerpt'), fBody = $('fBody'), fFeatured = $('fFeatured');
  const fImage = $('fImage'), mediaPreview = $('mediaPreview');
  const formTitle = $('formTitle'), submitBtn = $('submitBtn'), cancelEditBtn = $('cancelEditBtn'), publishMsg = $('publishMsg');
  const articleFields = $('articleFields');

  function setKind(next) {
    kind = next;
    document.querySelectorAll('.kind-btn').forEach(b => b.classList.toggle('active', b.dataset.kind === kind));
    articleFields.hidden = kind !== 'article';
    fBody.placeholder = kind === 'article' ? 'Write the full story here…  Use ## for headings, **bold**, *italic*, > for quotes.' : 'Write your post here...';
    runAnalysis();
  }
  document.querySelectorAll('.kind-btn').forEach(btn => btn.addEventListener('click', () => { if (!editId) { setKind(btn.dataset.kind); scheduleDraft(); } }));

  fImage.addEventListener('change', () => {
    const file = fImage.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { pendingImage = reader.result; mediaPreview.innerHTML = `<img src="${pendingImage}" alt="">`; };
    reader.readAsDataURL(file);
  });

  function resetForm() {
    editId = null;
    form.reset();
    pendingImage = '';
    mediaPreview.innerHTML = '';
    formTitle.textContent = 'Create content';
    submitBtn.textContent = 'Publish';
    cancelEditBtn.hidden = true;
    $('discardDraftBtn').hidden = false;
    document.querySelectorAll('.kind-btn').forEach(b => b.disabled = false);
    setPreview(false);
    setKind('article');
    $('saveState').textContent = '';
  }
  cancelEditBtn.addEventListener('click', () => { resetForm(); publishMsg.textContent = ''; });
  $('discardDraftBtn').addEventListener('click', () => {
    if ((fBody.value || fTitle.value) && !confirm('Clear everything in the form?')) return;
    Store.clearDraft(); resetForm(); publishMsg.textContent = '';
  });
  $('newBtn').addEventListener('click', () => { if (editId) resetForm(); showTab('write'); (kind === 'article' ? fTitle : fBody).focus(); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let msg;
    if (kind === 'article') {
      const patch = {
        title: fTitle.value.trim() || 'Untitled story',
        tag: fTag.value.trim() || 'General',
        excerpt: fExcerpt.value.trim(),
        body: fBody.value.trim(),
        featured: fFeatured.checked,
        cover: pendingImage || (editId ? undefined : '')
      };
      if (patch.cover === undefined) delete patch.cover;
      if (editId) { Store.updateArticle(editId, patch); msg = 'Article updated.'; }
      else { Store.addArticle(Object.assign({ thumbClass: 'img1' }, patch)); msg = 'Article published.'; }
    } else {
      if (!fBody.value.trim()) { publishMsg.textContent = 'Write something first.'; return; }
      const patch = {
        text: fBody.value.trim(),
        media: pendingImage || (editId ? undefined : ''),
        mediaType: pendingImage ? 'image' : (editId ? undefined : '')
      };
      if (patch.media === undefined) delete patch.media;
      if (patch.mediaType === undefined) delete patch.mediaType;
      if (editId) { Store.updatePost(editId, patch); msg = 'Post updated.'; }
      else { Store.addPost(patch); msg = 'Post published.'; }
    }
    Store.clearDraft();
    resetForm();
    publishMsg.textContent = msg;
    toast(msg);
    updateCounts();
  });

  function startEditArticle(id) {
    const a = Store.getArticle(id); if (!a) return;
    resetForm();
    editId = id; setKind('article');
    document.querySelectorAll('.kind-btn').forEach(b => b.disabled = true);
    fTitle.value = a.title || ''; fTag.value = a.tag || ''; fExcerpt.value = a.excerpt || ''; fBody.value = a.body || '';
    fFeatured.checked = !!a.featured;
    mediaPreview.innerHTML = a.cover ? `<img src="${a.cover}" alt="">` : '';
    formTitle.textContent = 'Edit article'; submitBtn.textContent = 'Save changes';
    cancelEditBtn.hidden = false; $('discardDraftBtn').hidden = true;
    showTab('write'); runAnalysis(); fTitle.focus();
  }
  function startEditPost(id) {
    const p = Store.getPost(id); if (!p) return;
    resetForm();
    editId = id; setKind('post');
    document.querySelectorAll('.kind-btn').forEach(b => b.disabled = true);
    fBody.value = p.text || '';
    mediaPreview.innerHTML = (p.media && p.mediaType === 'image') ? `<img src="${p.media}" alt="">` : '';
    formTitle.textContent = 'Edit post'; submitBtn.textContent = 'Save changes';
    cancelEditBtn.hidden = false; $('discardDraftBtn').hidden = true;
    showTab('write'); runAnalysis(); fBody.focus();
  }

  /* ============================================================
     WRITE — formatting toolbar
     ============================================================ */
  // Insert text at the caret in a way the browser's undo stack understands.
  function insertText(text) {
    fBody.focus();
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) {}
    if (!ok) {
      const s = fBody.selectionStart, e = fBody.selectionEnd;
      fBody.setRangeText(text, s, e, 'end');
      fBody.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  function wrap(before, after, placeholder) {
    const s = fBody.selectionStart, e = fBody.selectionEnd;
    const sel = fBody.value.slice(s, e) || placeholder;
    insertText(before + sel + after);
    fBody.setSelectionRange(s + before.length, s + before.length + sel.length);
  }
  // Apply a prefix to every line of the selection, as its own block (blank line around it).
  function blockPrefix(makePrefix, strip) {
    const v = fBody.value;
    const s = fBody.selectionStart, e = fBody.selectionEnd;
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    let le = v.indexOf('\n', e); if (le === -1) le = v.length;
    const lines = v.slice(ls, le).split('\n');
    const allHave = lines.every(l => strip.test(l));
    const out = lines.map((l, i) => allHave ? l.replace(strip, '') : makePrefix(i) + l.replace(strip, '')).join('\n');
    const lead = (!allHave && ls > 0 && v[ls - 2] !== '\n') ? '\n' : '';
    const trail = (!allHave && le < v.length && v[le + 1] !== '\n') ? '\n' : '';
    fBody.setSelectionRange(ls, le);
    insertText(lead + out + trail);
  }
  const COMMANDS = {
    bold: () => wrap('**', '**', 'bold text'),
    italic: () => wrap('*', '*', 'italic text'),
    h2: () => blockPrefix(() => '## ', /^##\s+/),
    h3: () => blockPrefix(() => '### ', /^###\s+/),
    quote: () => blockPrefix(() => '> ', /^>\s?/),
    ul: () => blockPrefix(() => '- ', /^[-*•]\s+/),
    ol: () => blockPrefix((i) => (i + 1) + '. ', /^\d+[.)]\s+/),
    hr: () => { insertText('\n\n---\n\n'); },
    link: () => {
      const s = fBody.selectionStart, e = fBody.selectionEnd;
      const sel = fBody.value.slice(s, e) || 'link text';
      const url = prompt('Link address (starting with https://)', 'https://');
      if (!url || !/^(https?:\/\/|mailto:)/i.test(url)) return;
      insertText(`[${sel}](${url})`);
    },
    undo: () => { fBody.focus(); document.execCommand('undo'); },
    redo: () => { fBody.focus(); document.execCommand('redo'); }
  };
  $('toolbar').addEventListener('mousedown', (e) => { if (e.target.closest('button[data-cmd]')) e.preventDefault(); }); // keep the selection
  $('toolbar').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cmd]'); if (!b) return;
    if (!$('preview').hidden) setPreview(false);
    COMMANDS[b.dataset.cmd](); runAnalysis(); scheduleDraft();
  });
  fBody.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); COMMANDS.bold(); }
    else if (k === 'i') { e.preventDefault(); COMMANDS.italic(); }
    else if (k === 'k') { e.preventDefault(); COMMANDS.link(); }
  });

  // Preview
  function setPreview(on) {
    $('preview').hidden = !on;
    fBody.hidden = on;
    $('previewBtn').setAttribute('aria-pressed', String(on));
    $('previewBtn').textContent = on ? 'Edit' : 'Preview';
    if (on) $('preview').innerHTML = fBody.value.trim() ? renderRichText(fBody.value) : '<p class="empty-note">Nothing to preview yet.</p>';
  }
  $('previewBtn').addEventListener('click', () => setPreview($('preview').hidden));

  // Read aloud (uses the browser's built-in speech)
  const speakBtn = $('speakBtn');
  if (!('speechSynthesis' in window)) speakBtn.hidden = true;
  speakBtn.addEventListener('click', () => {
    if (speechSynthesis.speaking) { speechSynthesis.cancel(); speakBtn.setAttribute('aria-pressed', 'false'); return; }
    const text = plain(fBody.value).trim();
    if (!text) { toast('Nothing to read yet.'); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.onend = u.onerror = () => speakBtn.setAttribute('aria-pressed', 'false');
    speakBtn.setAttribute('aria-pressed', 'true');
    speechSynthesis.speak(u);
  });
  window.addEventListener('beforeunload', () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); });

  // Focus mode
  function leaveFocusMode() { document.body.classList.remove('focus-mode'); $('focusBtn').textContent = 'Focus'; }
  $('focusBtn').addEventListener('click', () => {
    const on = !document.body.classList.contains('focus-mode');
    document.body.classList.toggle('focus-mode', on);
    $('focusBtn').textContent = on ? 'Exit focus' : 'Focus';
    fBody.focus();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') leaveFocusMode(); });

  /* ============================================================
     WRITE — live insights
     ============================================================ */
  const STOP = new Set('about above after again against all also and any are because been before being between both but can could did does doing down during each few for from further had has have having her here hers him his how into its itself just more most not now off once only other our ours out over own same she should some such than that the their theirs them then there these they this those through too under until very was were what when where which while who whom why will with would you your yours'.split(' '));

  function plain(t) {
    return (t || '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,3}\s+/gm, '').replace(/^>\s?/gm, '')
      .replace(/^[-*•]\s+/gm, '').replace(/^\d+[.)]\s+/gm, '')
      .replace(/^---+$/gm, '').replace(/\*\*|\*|__/g, '');
  }
  const wordsOf = (t) => t.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || [];
  function syllables(w) {
    w = w.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return 1;
    if (w.length <= 3) return 1;
    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = w.match(/[aeiouy]{1,2}/g);
    return m ? m.length : 1;
  }
  function fleschLabel(f) {
    if (f >= 80) return 'Very easy';
    if (f >= 65) return 'Easy to read';
    if (f >= 50) return 'Fairly easy';
    if (f >= 35) return 'Demanding';
    return 'Very demanding';
  }

  function analyze(raw) {
    const text = plain(raw);
    const words = wordsOf(text);
    const sents = text.replace(/([.!?…]+)(\s+)/g, '$1|').split(/[|\n]+/).map(s => s.trim()).filter(s => wordsOf(s).length);
    const paras = raw.split(/\n{2,}/).map(p => plain(p).trim()).filter(Boolean);
    const n = words.length;
    const syl = words.reduce((t, w) => t + syllables(w), 0);
    const avg = sents.length ? n / sents.length : 0;
    const flesch = n && sents.length ? 206.835 - 1.015 * avg - 84.6 * (syl / n) : 0;
    const freq = {};
    words.forEach(w => { const k = w.toLowerCase(); if (k.length > 3 && !STOP.has(k)) freq[k] = (freq[k] || 0) + 1; });
    const repeated = Object.keys(freq).filter(k => freq[k] >= 4).sort((a, b) => freq[b] - freq[a]).slice(0, 3).map(k => [k, freq[k]]);
    return {
      words: n, chars: text.replace(/\s/g, '').length, sentences: sents.length, paragraphs: paras.length,
      minutes: n ? Math.max(1, Math.round(n / 200)) : 0,
      avg, flesch, repeated,
      longSentences: sents.filter(s => wordsOf(s).length > 30).length,
      adverbs: words.filter(w => /ly$/i.test(w) && w.length > 4).length,
      longestPara: paras.reduce((m, p) => Math.max(m, wordsOf(p).length), 0),
      headings: (raw.match(/^#{1,3}\s+/gm) || []).length
    };
  }

  function meter(el, text, state) { el.textContent = text; el.className = 'meter ' + (state || ''); }

  function runAnalysis() {
    const raw = fBody.value;
    const a = analyze(raw);

    $('editorFoot').innerHTML = `<span>${fmt(a.words)} word${a.words === 1 ? '' : 's'} · ${fmt(a.chars)} characters</span><span>${a.minutes ? a.minutes + ' min read' : ''}</span>`;
    $('insights').innerHTML = `
      <div><dt>Words</dt><dd>${fmt(a.words)}</dd></div>
      <div><dt>Reading time</dt><dd>${a.minutes} <small>min</small></dd></div>
      <div><dt>Sentences</dt><dd>${fmt(a.sentences)}</dd></div>
      <div><dt>Paragraphs</dt><dd>${fmt(a.paragraphs)}</dd></div>
      <div><dt>Avg. sentence</dt><dd>${a.sentences ? Math.round(a.avg) : 0} <small>words</small></dd></div>
      <div><dt>Readability</dt><dd>${a.words > 20 ? Math.max(0, Math.round(a.flesch)) : '—'} <small>${a.words > 20 ? fleschLabel(a.flesch) : ''}</small></dd></div>`;

    const tips = [];
    if (a.words < 20) tips.push(['ok', 'Start writing and suggestions will appear here.']);
    else {
      if (a.avg > 22) tips.push(['warn', `Sentences average ${Math.round(a.avg)} words. Try splitting a few.`]);
      if (a.longSentences) tips.push(['warn', `${a.longSentences} sentence${a.longSentences > 1 ? 's run' : ' runs'} past 30 words.`]);
      if (a.adverbs > Math.max(3, a.words / 40)) tips.push(['warn', `${a.adverbs} words end in “-ly”. A stronger verb can often do the job.`]);
      if (a.longestPara > 150) tips.push(['warn', `Your longest paragraph is ${a.longestPara} words. Consider breaking it up.`]);
      if (kind === 'article' && a.words > 600 && !a.headings) tips.push(['warn', 'This is a long piece with no subheadings. Add some with the H2 button.']);
      a.repeated.forEach(([w, c]) => tips.push(['warn', `“${w}” appears ${c} times.`]));
      if (!tips.length) tips.push(['ok', 'Reads well. No issues spotted.']);
    }
    $('tips').innerHTML = tips.map(([lvl, t]) => `<li class="${lvl}">${esc(t)}</li>`).join('');

    // goal
    const goal = Math.max(1, Store.getGoal());
    const pct = Math.min(100, Math.round(a.words / goal * 100));
    $('goalBar').style.width = pct + '%';
    $('goalText').textContent = a.words >= goal ? `Goal reached: ${fmt(a.words)} words.` : `${fmt(a.words)} of ${fmt(goal)} words (${pct}%)`;

    // title + excerpt meters (article only)
    if (kind === 'article') {
      const tl = fTitle.value.trim().length;
      if (!tl) meter($('titleMeter'), '');
      else if (tl < 25) meter($('titleMeter'), `${tl} characters. A little short; aim for 40–70.`, 'warn');
      else if (tl <= 70) meter($('titleMeter'), `${tl} characters. Good length for search results.`, 'good');
      else meter($('titleMeter'), `${tl} characters. Search engines may cut this off after about 70.`, 'warn');
      const el = fExcerpt.value.trim().length;
      if (!el) meter($('excerptMeter'), '');
      else if (el < 80) meter($('excerptMeter'), `${el} characters. Aim for 90–160.`, 'warn');
      else if (el <= 160) meter($('excerptMeter'), `${el} characters. Good.`, 'good');
      else meter($('excerptMeter'), `${el} characters. Try trimming to 160 or fewer.`, 'warn');
    }
    sprintTick(a.words);
  }

  /* ---- goal ---- */
  $('goalInput').value = Store.getGoal();
  $('goalInput').addEventListener('input', () => {
    const n = parseInt($('goalInput').value, 10);
    if (n > 0) { Store.setGoal(n); runAnalysis(); }
  });

  /* ---- autosave draft ---- */
  let draftTimer = null;
  function scheduleDraft() {
    if (editId) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      const d = { kind, title: fTitle.value, tag: fTag.value, excerpt: fExcerpt.value, body: fBody.value, featured: fFeatured.checked, ts: Date.now() };
      if (!d.title && !d.body && !d.excerpt) { Store.clearDraft(); $('saveState').textContent = ''; return; }
      Store.saveDraft(d);
      $('saveState').textContent = 'Draft saved ' + new Date(d.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }, 500);
  }
  [fTitle, fTag, fExcerpt, fBody, fFeatured].forEach(el => el.addEventListener('input', () => { runAnalysis(); scheduleDraft(); if (!$('preview').hidden) setPreview(true); }));

  /* ---- sprint timer ---- */
  let sprint = null;
  const clockText = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  $('sprintLen').addEventListener('change', () => { if (!sprint) $('sprintClock').textContent = clockText($('sprintLen').value * 60); });
  $('sprintClock').textContent = clockText($('sprintLen').value * 60);
  function sprintTick(words) {
    if (sprint) $('sprintInfo').textContent = `+${fmt(Math.max(0, words - sprint.startWords))} words this sprint`;
  }
  function endSprint(finished) {
    if (!sprint) return;
    clearInterval(sprint.timer);
    const gained = Math.max(0, analyze(fBody.value).words - sprint.startWords);
    $('sprintInfo').textContent = finished ? `Sprint complete: you wrote ${fmt(gained)} words.` : `Stopped. You wrote ${fmt(gained)} words.`;
    if (finished) toast(`Sprint complete: +${fmt(gained)} words`);
    sprint = null;
    $('sprintBtn').textContent = 'Start';
    $('sprintLen').disabled = false;
    $('sprintClock').textContent = clockText($('sprintLen').value * 60);
  }
  $('sprintBtn').addEventListener('click', () => {
    if (sprint) { endSprint(false); return; }
    const total = Number($('sprintLen').value) * 60;
    sprint = { left: total, startWords: analyze(fBody.value).words };
    $('sprintBtn').textContent = 'Stop';
    $('sprintLen').disabled = true;
    $('sprintInfo').textContent = '+0 words this sprint';
    $('sprintClock').textContent = clockText(total);
    sprint.timer = setInterval(() => {
      sprint.left--;
      $('sprintClock').textContent = clockText(Math.max(0, sprint.left));
      if (sprint.left <= 0) endSprint(true);
    }, 1000);
    fBody.focus();
  });

  /* ---- find & replace ---- */
  const reFind = () => {
    const q = $('fFind').value;
    if (!q) return null;
    return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  };
  function countMatches() {
    const re = reFind();
    const n = re ? (fBody.value.match(re) || []).length : 0;
    $('findInfo').textContent = re ? `${n} match${n === 1 ? '' : 'es'}` : '';
    return n;
  }
  function findNext() {
    const re = reFind(); if (!re) return false;
    if (!$('preview').hidden) setPreview(false);
    re.lastIndex = fBody.selectionEnd;
    let m = re.exec(fBody.value);
    if (!m) { re.lastIndex = 0; m = re.exec(fBody.value); }
    if (!m) { countMatches(); return false; }
    fBody.focus();
    fBody.setSelectionRange(m.index, m.index + m[0].length);
    countMatches();
    return true;
  }
  $('fFind').addEventListener('input', countMatches);
  $('fFind').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); findNext(); } });
  $('findNext').addEventListener('click', findNext);
  $('replaceOne').addEventListener('click', () => {
    const q = $('fFind').value; if (!q) return;
    const sel = fBody.value.slice(fBody.selectionStart, fBody.selectionEnd);
    if (sel.toLowerCase() === q.toLowerCase()) { insertText($('fRepl').value); runAnalysis(); scheduleDraft(); }
    findNext();
  });
  $('replaceAll').addEventListener('click', () => {
    const re = reFind(); if (!re) return;
    const n = countMatches();
    if (!n) return;
    const next = fBody.value.replace(re, () => $('fRepl').value);
    fBody.focus(); fBody.select(); insertText(next);
    runAnalysis(); scheduleDraft(); countMatches();
    toast(`Replaced ${n} occurrence${n === 1 ? '' : 's'}.`);
  });

  /* ---- prompts ---- */
  const PROMPTS = [
    'Write about a market you know well, and what it says about the people who run it.',
    'What is a proverb from your community that no longer means what it used to?',
    'Describe the first time you saw your city from above.',
    'Who taught you to cook, and what did they never write down?',
    'Tell the story of an object in your home that has outlived three generations.',
    'What does “home” sound like at 5 a.m.?',
    'Write about a language you grew up hearing but never learned to speak.',
    'Which part of African history do you wish was taught in every school, and why?',
    'Profile someone whose work keeps their street running, and who rarely gets thanked.',
    'What would a visitor misunderstand about your town in a single afternoon?',
    'Write a letter to the version of your city that existed fifty years ago.',
    'Describe a festival from the inside: the preparation, the nerves, the morning after.',
    'What is a story about Africa that you are tired of hearing, and what should replace it?',
    'Follow one journey across the continent, from a farm to a plate or a village to a screen.'
  ];
  let promptIdx = Math.floor(Math.random() * PROMPTS.length);
  const showPrompt = () => { $('promptText').textContent = PROMPTS[promptIdx]; };
  $('promptNext').addEventListener('click', () => { promptIdx = (promptIdx + 1) % PROMPTS.length; showPrompt(); });
  $('promptUse').addEventListener('click', () => {
    const p = PROMPTS[promptIdx];
    if (kind === 'article' && !fTitle.value.trim()) { fTitle.value = p.replace(/\.$/, ''); }
    else { fBody.focus(); insertText((fBody.value && !fBody.value.endsWith('\n\n') ? '\n\n' : '') + '> ' + p + '\n\n'); }
    runAnalysis(); scheduleDraft();
  });
  showPrompt();

  /* ============================================================
     CONTENT lists
     ============================================================ */
  function deleteArticle(id) {
    const a = Store.getArticle(id); if (!a) return;
    if (!confirm(`Delete "${a.title}"? This can't be undone.`)) return;
    Store.deleteArticle(id);
    if (editId === id) resetForm();
    renderLists(); updateCounts();
  }
  function deletePost(id) {
    if (!confirm("Delete this post? This can't be undone.")) return;
    Store.deletePost(id);
    if (editId === id) resetForm();
    renderLists(); updateCounts();
  }

  function renderLists() {
    const views = Store.getViews().items;
    const stats = (x, reactionsTotal, n) => `
      <small><span title="Views">👁 ${fmt((views[x.id] || {}).total || 0)}</span><span title="Reactions">👍 ${fmt(reactionsTotal)}</span><span title="Comments">💬 ${n}</span><span>${Store.niceDate(x.date)}</span></small>`;

    const articles = Store.getArticles();
    $('articleList').innerHTML = articles.length ? articles.map(a => `
      <div class="manage-item">
        <div class="m-info">
          <b>${esc(a.title)}</b>
          <small><span>${esc(a.tag)}${a.featured ? ' · Featured' : ''}</span></small>
          ${stats(a, Store.sumReactions(a.reactions), (a.comments || []).length)}
        </div>
        <div class="manage-actions">
          <a class="btn small ghost" href="article.html?id=${a.id}">View</a>
          <button type="button" class="edit" data-edit-article="${a.id}">Edit</button>
          <button type="button" class="del" data-del-article="${a.id}">Delete</button>
        </div>
      </div>`).join('') : '<p class="empty-note">No articles yet. Start one in the Write tab.</p>';

    const posts = Store.getPosts();
    $('postList').innerHTML = posts.length ? posts.map(p => `
      <div class="manage-item">
        <div class="m-info">
          <b>${esc((p.text || '').slice(0, 60))}${(p.text || '').length > 60 ? '…' : ''}</b>
          ${stats(p, Store.sumReactions(p.reactions), (p.comments || []).length)}
        </div>
        <div class="manage-actions">
          <button type="button" class="edit" data-edit-post="${p.id}">Edit</button>
          <button type="button" class="del" data-del-post="${p.id}">Delete</button>
        </div>
      </div>`).join('') : '<p class="empty-note">No posts yet. Start one in the Write tab.</p>';

    $('articleList').querySelectorAll('[data-edit-article]').forEach(b => b.addEventListener('click', () => startEditArticle(b.dataset.editArticle)));
    $('articleList').querySelectorAll('[data-del-article]').forEach(b => b.addEventListener('click', () => deleteArticle(b.dataset.delArticle)));
    $('postList').querySelectorAll('[data-edit-post]').forEach(b => b.addEventListener('click', () => startEditPost(b.dataset.editPost)));
    $('postList').querySelectorAll('[data-del-post]').forEach(b => b.addEventListener('click', () => deletePost(b.dataset.delPost)));
  }

  /* ============================================================
     COMMENTS
     ============================================================ */
  function renderComments() {
    const list = Store.getAllComments();
    $('commentsList').innerHTML = list.length ? list.map(c => `
      <div class="comment-row">
        <div>
          <small><b>${esc(c.name)}</b> on <a href="${c.kind === 'article' ? 'article.html?id=' + c.itemId : 'posts.html'}">${esc(c.title)}</a> · ${Store.niceDate(c.date)}</small>
          <p>${esc(c.text)}</p>
        </div>
        <div class="manage-actions"><button type="button" class="del" data-kind="${c.kind}" data-id="${c.itemId}" data-i="${c.index}">Delete</button></div>
      </div>`).join('') : '<p class="empty-note">No comments yet.</p>';
    $('commentsList').querySelectorAll('.del').forEach(b => b.addEventListener('click', () => {
      if (!confirm('Delete this comment?')) return;
      Store.deleteComment(b.dataset.kind, b.dataset.id, Number(b.dataset.i));
      renderComments(); updateCounts();
    }));
  }

  function updateCounts() {
    $('contentCount').textContent = Store.getArticles().length + Store.getPosts().length;
    $('commentCount').textContent = Store.getAllComments().length;
  }

  window.handleLogout = function () {
    Auth.logout().then(() => { location.href = 'login.html'; });
  };

  /* ============================================================
     Boot
     ============================================================ */
  setKind('article');
  updateCounts();

  // Bring back an unfinished draft from last time
  const draft = Store.getDraft();
  if (draft && (draft.title || draft.body || draft.excerpt)) {
    setKind(draft.kind === 'post' ? 'post' : 'article');
    fTitle.value = draft.title || ''; fTag.value = draft.tag || '';
    fExcerpt.value = draft.excerpt || ''; fBody.value = draft.body || '';
    fFeatured.checked = !!draft.featured;
    $('saveState').textContent = 'Draft restored';
  }
  runAnalysis();
  showTab(location.hash.slice(1) || 'overview');

  // Confirm the session with the server, then redraw once the latest content has loaded.
  Auth.verify().then(({ author }) => { if (!author) location.href = 'login.html'; }).catch(() => {});
  Store.onReady(() => { updateCounts(); showTab(location.hash.slice(1) || 'overview', false); });
})();
