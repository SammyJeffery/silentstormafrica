/* ---------------------------------------------------------------
   Store — the site's data layer. Everything (articles, posts,
   reactions, comments) lives in the browser's localStorage under
   keys prefixed "ss:". No server: this is a frontend prototype.

   To move to a real backend later, swap the guts of these
   functions for calls to your API — the pages that use Store
   don't need to change.
   --------------------------------------------------------------- */
const Store = (() => {
  const KEYS = {
    articles: 'ss:articles',
    posts: 'ss:posts',
    seeded: 'ss:seeded',
    views: 'ss:views',
    activity: 'ss:activity',
    mine: 'ss:myreactions',
    demo: 'ss:demoStats',
    draft: 'ss:draft',
    goal: 'ss:goal'
  };

  // The reaction palette. "like" is the default for a plain tap.
  const REACTIONS = [
    { key: 'like',      emoji: '👍', label: 'Like' },
    { key: 'love',      emoji: '❤️', label: 'Love' },
    { key: 'celebrate', emoji: '👏', label: 'Applaud' },
    { key: 'insight',   emoji: '💡', label: 'Insightful' },
    { key: 'wow',       emoji: '😮', label: 'Wow' },
    { key: 'sad',       emoji: '😢', label: 'Sad' }
  ];

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function wordCount(str) {
    let s = str || '';
    // Formatted (HTML) bodies start with a marker: count the words, not the tags.
    if (s.indexOf('<!--rte-->') === 0) {
      s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
    }
    return s.trim().split(/\s+/).filter(Boolean).length;
  }
  function readTime(str) {
    return Math.max(1, Math.round(wordCount(str) / 200)) + ' min read';
  }

  function dayKey(d) {
    d = d ? new Date(d) : new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }
  function daysAgo(n) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; }
  function sumReactions(r) { return Object.keys(r || {}).reduce((t, k) => t + (r[k] || 0), 0); }
  function emptyViews() { return { items: {}, site: { views: {}, visits: {} } }; }

  // Small deterministic PRNG so the sample traffic is stable between reloads.
  function seededRandom(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6D2B79F5; let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedIfEmpty() {
    if (read(KEYS.seeded, false)) return;

    const articles = [
      {
        id: uid(),
        title: 'Beyond the Headlines: Reimagining the African Story',
        tag: 'Culture',
        excerpt: 'What changes when Africans become the primary narrators of their own complex, beautiful story?',
        body: `For generations, the African story has often arrived through a narrow frame. Headlines can reduce enormous places and diverse people to crisis, conflict or scarcity. But a continent cannot be contained by a headline.\n\nThe Silent Storm exists to make room for the quieter truths: the entrepreneur opening a shop before sunrise, the student learning something new, the artist preserving memory through sound, and the communities building futures with what they have.\n\nA story is more than an event. Stories shape how we see ourselves and how others see us. Reclaiming the narrative does not mean pretending that difficult realities do not exist. It means refusing to let difficulty become the only lens.\n\nA fuller African story can hold contradiction: struggle and joy, innovation and inequality, tradition and reinvention. It can ask hard questions while still celebrating the people who live the answers every day.\n\nThat is the invitation behind this blog. Read, question, disagree, contribute and keep the conversation moving.`,
        cover: '',
        thumbClass: 'img1',
        featured: true,
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        reactions: { love: 31, like: 24 },
        comments: [
          { name: 'Ada', text: 'This is beautifully said.', date: new Date(Date.now() - 86000000).toISOString() }
        ]
      },
      {
        id: uid(),
        title: 'The Quiet Power of Ordinary African People',
        tag: 'Society',
        excerpt: 'Progress is often built by people whose names never make the headlines.',
        body: `Progress rarely announces itself. It shows up as a mother saving small amounts every week so her children can stay in school, a mechanic training three apprentices for free, a market association settling disputes without ever calling it "governance."\n\nWe built this piece around a simple idea: that the ordinary decisions of ordinary people are not a footnote to the African story — they are most of it.\n\nThe people in this piece will never appear in a headline. That was always the point.`,
        cover: '',
        thumbClass: 'img2',
        featured: true,
        date: new Date(Date.now() - 86400000 * 5).toISOString(),
        reactions: { love: 18, like: 40 },
        comments: []
      },
      {
        id: uid(),
        title: 'What Does a New African Future Look Like?',
        tag: 'Ideas',
        excerpt: 'Young minds are challenging old assumptions and building something different.',
        body: `Every conversation we had for this piece started the same way: someone insisting the future had to be designed, not inherited.\n\nAcross the cities we visited, a generation raised on both hardship and possibility is building things their parents didn't have language for — cooperative housing models, hyperlocal logistics networks, community-owned solar grids.\n\nNone of it is utopian. All of it is a bet that the next chapter doesn't have to look like the last one.`,
        cover: '',
        thumbClass: 'img3',
        featured: true,
        date: new Date(Date.now() - 86400000 * 9).toISOString(),
        reactions: { love: 22, like: 61 },
        comments: []
      }
    ];

    const posts = [
      {
        id: uid(),
        text: 'Sometimes the most powerful African stories are not dramatic. They are the everyday choices people make to keep moving forward.',
        media: '',
        mediaType: '',
        date: new Date(Date.now() - 3600000 * 2).toISOString(),
        reactions: { love: 12, like: 9 },
        comments: [
          { name: 'Ada', text: 'This is beautifully said.', date: new Date(Date.now() - 3000000).toISOString() }
        ]
      },
      {
        id: uid(),
        text: 'There is beauty in the details. In our markets, streets, music, food and conversations.',
        media: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=80',
        mediaType: 'image',
        date: new Date(Date.now() - 86400000).toISOString(),
        reactions: { love: 20, like: 15 },
        comments: []
      },
      {
        id: uid(),
        text: 'A short visual note from the road: listening before speaking.',
        media: '',
        mediaType: 'video',
        date: new Date(Date.now() - 86400000 * 3).toISOString(),
        reactions: { love: 25, like: 18 },
        comments: []
      }
    ];

    write(KEYS.articles, articles);
    write(KEYS.posts, posts);
    write(KEYS.seeded, true);
  }

  // Sample traffic so the dashboard has something to show on a brand-new install.
  // It is flagged as sample data and can be wiped from the dashboard.
  function ensureDemoStats() {
    if (read(KEYS.demo, null) !== null) return;
    const existing = read(KEYS.views, null);
    if (existing && Object.keys(existing.items || {}).length) { write(KEYS.demo, false); return; }
    const views = emptyViews();
    const items = [].concat(
      read(KEYS.articles, []).map(a => ({ kind: 'article', id: a.id, date: a.date, weight: 1 })),
      read(KEYS.posts, []).map(p => ({ kind: 'post', id: p.id, date: p.date, weight: 0.45 }))
    );
    for (let n = 59; n >= 0; n--) {
      const day = dayKey(daysAgo(n));
      let dayTotal = 0;
      items.forEach(it => {
        if (new Date(it.date) > daysAgo(n - 1)) return; // not published yet
        const rnd = seededRandom(it.id + day);
        const age = Math.max(0, (daysAgo(n) - new Date(it.date)) / 86400000);
        const decay = 1 / (1 + age / 18);
        const v = Math.round((2 + rnd() * 9) * it.weight * (0.35 + decay));
        if (!v) return;
        const rec = views.items[it.id] || (views.items[it.id] = { kind: it.kind, total: 0, days: {} });
        rec.days[day] = v; rec.total += v; dayTotal += v;
      });
      views.site.views[day] = dayTotal;
      views.site.visits[day] = Math.round(dayTotal * (0.5 + seededRandom('v' + day)() * 0.2));
    }
    write(KEYS.views, views);
    write(KEYS.demo, true);
  }

  function logActivity(entry) {
    const list = read(KEYS.activity, []);
    list.unshift(Object.assign({ id: uid(), ts: new Date().toISOString() }, entry));
    write(KEYS.activity, list.slice(0, 200));
  }

  return {
    init() { seedIfEmpty(); ensureDemoStats(); this.trackVisit(); },
    uid, readTime, wordCount, dayKey, daysAgo, sumReactions, REACTIONS,

    niceDate(iso) {
      const d = new Date(iso);
      const diffH = Math.round((Date.now() - d.getTime()) / 3600000);
      if (diffH < 1) return 'just now';
      if (diffH < 24) return diffH + 'h ago';
      const diffD = Math.round(diffH / 24);
      if (diffD === 1) return 'Yesterday';
      if (diffD < 7) return diffD + ' days ago';
      return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    },

    // ---- Articles ----
    getArticles() { return read(KEYS.articles, []); },
    saveArticles(list) { write(KEYS.articles, list); },
    getArticle(id) { return this.getArticles().find(a => a.id === id); },
    addArticle(article) {
      const list = this.getArticles();
      const record = Object.assign({
        id: uid(),
        date: new Date().toISOString(),
        reactions: { love: 0, like: 0 },
        comments: []
      }, article);
      list.unshift(record);
      this.saveArticles(list);
      return record;
    },
    updateArticle(id, patch) {
      const list = this.getArticles();
      const idx = list.findIndex(a => a.id === id);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], patch);
      this.saveArticles(list);
      return list[idx];
    },
    deleteArticle(id) {
      this.saveArticles(this.getArticles().filter(a => a.id !== id));
    },
    addArticleComment(id, comment) {
      const a = this.getArticle(id);
      if (!a) return;
      a.comments = a.comments || [];
      a.comments.push(comment);
      this.updateArticle(id, { comments: a.comments });
    },
    reactArticle(id, key) { return this.react('article', id, key).reactions; },

    // ---- Posts ----
    getPosts() { return read(KEYS.posts, []); },
    savePosts(list) { write(KEYS.posts, list); },
    getPost(id) { return this.getPosts().find(p => p.id === id); },
    addPost(post) {
      const list = this.getPosts();
      const record = Object.assign({
        id: uid(),
        date: new Date().toISOString(),
        reactions: { love: 0, like: 0 },
        comments: []
      }, post);
      list.unshift(record);
      this.savePosts(list);
      return record;
    },
    updatePost(id, patch) {
      const list = this.getPosts();
      const idx = list.findIndex(p => p.id === id);
      if (idx === -1) return null;
      list[idx] = Object.assign({}, list[idx], patch);
      this.savePosts(list);
      return list[idx];
    },
    deletePost(id) {
      this.savePosts(this.getPosts().filter(p => p.id !== id));
    },
    addPostComment(id, comment) {
      const p = this.getPost(id);
      if (!p) return;
      p.comments = p.comments || [];
      p.comments.push(comment);
      this.updatePost(id, { comments: p.comments });
    },
    reactPost(id, key) { return this.react('post', id, key).reactions; },

    // ---- Reactions (one reaction per visitor per item) ----
    getMyReaction(kind, id) { return (read(KEYS.mine, {})[kind + ':' + id]) || null; },
    // Choosing the reaction you already have removes it. Choosing a different one swaps it.
    react(kind, id, key) {
      const item = kind === 'article' ? this.getArticle(id) : this.getPost(id);
      if (!item) return { reactions: {}, mine: null };
      const mineMap = read(KEYS.mine, {});
      const mk = kind + ':' + id;
      const prev = mineMap[mk] || null;
      const r = Object.assign({}, item.reactions || {});
      if (prev) r[prev] = Math.max(0, (r[prev] || 0) - 1);
      let mine = key;
      if (prev === key) { mine = null; delete mineMap[mk]; }
      else { r[key] = (r[key] || 0) + 1; mineMap[mk] = key; }
      write(KEYS.mine, mineMap);
      if (kind === 'article') this.updateArticle(id, { reactions: r }); else this.updatePost(id, { reactions: r });
      if (mine) logActivity({ type: 'reaction', kind, itemId: id, key, title: kind === 'article' ? item.title : (item.text || '').slice(0, 60) });
      return { reactions: r, mine };
    },

    // ---- Traffic tracking ----
    getViews() { return read(KEYS.views, emptyViews()); },
    isDemoStats() { return read(KEYS.demo, false) === true; },
    clearDemoStats() { write(KEYS.views, emptyViews()); write(KEYS.demo, false); },
    // Counts one view per item per browser session. Author views are ignored.
    trackView(kind, id) {
      try {
        if (sessionStorage.getItem('ss:session') === '1') return;
        const guard = 'ss:seen:' + id;
        if (sessionStorage.getItem(guard)) return;
        sessionStorage.setItem(guard, '1');
      } catch (e) { return; }
      const v = this.getViews();
      const day = dayKey();
      const rec = v.items[id] || (v.items[id] = { kind, total: 0, days: {} });
      rec.total += 1; rec.days[day] = (rec.days[day] || 0) + 1;
      v.site.views[day] = (v.site.views[day] || 0) + 1;
      write(KEYS.views, v);
    },
    trackVisit() {
      try {
        if (sessionStorage.getItem('ss:session') === '1' || sessionStorage.getItem('ss:visited')) return;
        sessionStorage.setItem('ss:visited', '1');
      } catch (e) { return; }
      const v = this.getViews();
      const day = dayKey();
      v.site.visits[day] = (v.site.visits[day] || 0) + 1;
      write(KEYS.views, v);
    },

    // Everything the dashboard overview needs, for the last `days` days.
    getStats(days) {
      const v = this.getViews();
      const articles = this.getArticles();
      const posts = this.getPosts();
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const k = dayKey(daysAgo(i));
        series.push({ day: k, date: daysAgo(i), views: v.site.views[k] || 0, visits: v.site.visits[k] || 0 });
      }
      let prevViews = 0, prevVisits = 0;
      for (let i = days * 2 - 1; i >= days; i--) {
        const k = dayKey(daysAgo(i));
        prevViews += v.site.views[k] || 0; prevVisits += v.site.visits[k] || 0;
      }
      const keys = series.map(s => s.day);
      const periodViews = rec => rec ? keys.reduce((t, k) => t + (rec.days[k] || 0), 0) : 0;
      const items = [].concat(
        articles.map(a => ({ kind: 'article', id: a.id, title: a.title, date: a.date, words: wordCount(a.body), reactions: sumReactions(a.reactions), comments: (a.comments || []).length })),
        posts.map(p => ({ kind: 'post', id: p.id, title: (p.text || '').slice(0, 70) || 'Untitled post', date: p.date, words: wordCount(p.text), reactions: sumReactions(p.reactions), comments: (p.comments || []).length }))
      ).map(it => Object.assign(it, { views: periodViews(v.items[it.id]), viewsAll: (v.items[it.id] || {}).total || 0 }));
      const reactionTotals = {};
      articles.concat(posts).forEach(x => Object.keys(x.reactions || {}).forEach(k => { reactionTotals[k] = (reactionTotals[k] || 0) + (x.reactions[k] || 0); }));
      const publishDays = {};
      items.forEach(it => { const k = dayKey(it.date); publishDays[k] = (publishDays[k] || 0) + 1; });
      return {
        days, series, items, reactionTotals, publishDays,
        views: series.reduce((t, s) => t + s.views, 0), prevViews,
        visits: series.reduce((t, s) => t + s.visits, 0), prevVisits,
        totals: {
          articles: articles.length, posts: posts.length,
          comments: items.reduce((t, i) => t + i.comments, 0),
          reactions: items.reduce((t, i) => t + i.reactions, 0),
          words: articles.reduce((t, a) => t + wordCount(a.body), 0),
          viewsAll: items.reduce((t, i) => t + i.viewsAll, 0)
        }
      };
    },

    // Recent happenings: publishes and comments come from the content itself, reactions from the log.
    getActivity(limit) {
      const out = [];
      this.getArticles().forEach(a => {
        out.push({ type: 'publish', kind: 'article', itemId: a.id, title: a.title, ts: a.date });
        (a.comments || []).forEach(c => out.push({ type: 'comment', kind: 'article', itemId: a.id, title: a.title, who: c.name, text: c.text, ts: c.date || a.date }));
      });
      this.getPosts().forEach(p => {
        const t = (p.text || '').slice(0, 60);
        out.push({ type: 'publish', kind: 'post', itemId: p.id, title: t, ts: p.date });
        (p.comments || []).forEach(c => out.push({ type: 'comment', kind: 'post', itemId: p.id, title: t, who: c.name, text: c.text, ts: c.date || p.date }));
      });
      read(KEYS.activity, []).forEach(a => out.push(a));
      out.sort((a, b) => new Date(b.ts) - new Date(a.ts));
      return out.slice(0, limit || 12);
    },

    getAllComments() {
      const out = [];
      this.getArticles().forEach(a => (a.comments || []).forEach((c, i) => out.push({ kind: 'article', itemId: a.id, index: i, title: a.title, name: c.name, text: c.text, date: c.date || a.date })));
      this.getPosts().forEach(p => (p.comments || []).forEach((c, i) => out.push({ kind: 'post', itemId: p.id, index: i, title: (p.text || '').slice(0, 60), name: c.name, text: c.text, date: c.date || p.date })));
      return out.sort((a, b) => new Date(b.date) - new Date(a.date));
    },
    deleteComment(kind, id, index) {
      const item = kind === 'article' ? this.getArticle(id) : this.getPost(id);
      if (!item || !item.comments) return;
      const comments = item.comments.filter((_, i) => i !== index);
      if (kind === 'article') this.updateArticle(id, { comments }); else this.updatePost(id, { comments });
    },

    // ---- Writing studio helpers ----
    getDraft() { return read(KEYS.draft, null); },
    saveDraft(d) { write(KEYS.draft, d); },
    clearDraft() { localStorage.removeItem(KEYS.draft); },
    getGoal() { return read(KEYS.goal, 800); },
    setGoal(n) { write(KEYS.goal, n); }
  };
})();
Store.init();
