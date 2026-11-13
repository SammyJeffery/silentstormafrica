const body = document.body;
const savedTheme = localStorage.getItem("silentStormTheme");
if (savedTheme === "dark") body.classList.add("dark");

const themeBtn = document.getElementById("themeBtn");
if (themeBtn) themeBtn.onclick = () => {
  body.classList.toggle("dark");
  localStorage.setItem("silentStormTheme", body.classList.contains("dark") ? "dark" : "light");
};

const menuBtn = document.getElementById("menuBtn");
const nav = document.getElementById("nav");
if (menuBtn) menuBtn.onclick = () => nav.style.display = nav.style.display === "flex" ? "none" : "flex";

let slide = 0;
function moveSlide(dir, total) {
  const slides = document.getElementById("slides");
  if (!slides) return;
  const count = total || slides.children.length || 3;
  slide = (slide + dir + count) % count;
  slides.style.transform = `translateX(-${slide * 100}%)`;
}

function playDemo(el) {
  el.innerHTML = "⏸<span>Demo video player — replace with your video</span>";
}

function sendContact(e) {
  e.preventDefault();
  document.getElementById("formMsg").textContent = "Thanks! Your message has been prepared for the author.";
  e.target.reset();
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}


/* ---------------------------------------------------------------
   Sanitiser for formatted (WYSIWYG) article bodies. Bodies written in
   the author editor are stored as HTML starting with RTE_MARK. Before
   they are shown anywhere (editor preview, article page) they are
   rebuilt through an allow-list: only known tags, attributes, inline
   styles and URL types survive, so nothing can inject script.
   --------------------------------------------------------------- */
const RTE_MARK = '<!--rte-->';
const SAN_TAGS = new Set(['p','br','div','span','strong','b','em','i','u','s','strike','del','sub','sup','mark','small','code','pre','h2','h3','h4','blockquote','ul','ol','li','a','img','figure','figcaption','hr','table','thead','tbody','tr','th','td','iframe','video']);
const SAN_DROP = new Set(['script','style','noscript','template','object','embed','link','meta','form','input','button','textarea','select','svg','math','audio','source','base','title','head']);
const SAN_RENAME = { h1: 'h2', h5: 'h4', h6: 'h4' };
const SAN_CLASSES = new Set(['media','video','fig-left','fig-right','fig-center','w25','w50','w75','w100','video-embed','attachment','attachment-wrap']);
const SAN_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i;
const SAN_STYLE = {
  'text-align': /^(left|right|center|justify)$/i,
  'color': SAN_COLOR,
  'background-color': SAN_COLOR,
  'font-family': /^[\w\s,'"-]+$/,
  'font-size': /^\d+(\.\d+)?(px|pt|em|rem|%)$/i,
  'font-weight': /^(normal|bold|[1-9]00)$/i,
  'font-style': /^(normal|italic)$/i,
  'text-decoration': /^[a-z\s-]+$/i,
  'text-decoration-line': /^[a-z\s-]+$/i,
  'line-height': /^\d+(\.\d+)?(px|em|rem|%)?$/i,
  'margin-left': /^\d+(\.\d+)?(px|em|rem)$/i,
  'padding-left': /^\d+(\.\d+)?(px|em|rem)$/i
};
function sanitizeStyle(str) {
  return String(str || '').split(';').map(function (d) {
    const i = d.indexOf(':');
    if (i < 0) return '';
    const prop = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).trim();
    const re = SAN_STYLE[prop];
    return re && re.test(val) ? prop + ':' + val : '';
  }).filter(Boolean).join(';');
}
function sanitizeHTML(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html'); // inert: scripts never run here
  const okImg = /^(https?:\/\/|data:image\/(png|jpe?g|gif|webp|avif);base64,)/i;
  const okVideo = /^(https?:\/\/|data:video\/(mp4|webm|ogg);base64,)/i;
  const okFrame = /^https:\/\/((www\.)?youtube(-nocookie)?\.com\/embed\/[\w-]{6,}|player\.vimeo\.com\/video\/\d+)/i;
  const okData = /^data:(?!text\/html|image\/svg|application\/xhtml)[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i;

  // returns false when the element can't be kept safely
  function cleanAttrs(el, tag) {
    const get = (n) => el.getAttribute(n);
    const keep = {};
    const st = sanitizeStyle(get('style')); if (st) keep.style = st;
    const cls = (get('class') || '').split(/\s+/).filter((c) => SAN_CLASSES.has(c)); if (cls.length) keep.class = cls.join(' ');
    if (tag === 'a') {
      const h = (get('href') || '').trim();
      const isDl = el.hasAttribute('download');
      if (/^(https?:|mailto:|#)/i.test(h)) { keep.href = h; if (!/^(mailto:|#)/i.test(h)) { keep.target = '_blank'; keep.rel = 'noopener noreferrer'; } }
      else if (isDl && okData.test(h)) keep.href = h;
      if (!keep.href) return false;
      if (isDl) keep.download = (get('download') || 'file').slice(0, 120);
    } else if (tag === 'img') {
      const src = (get('src') || '').trim();
      if (!okImg.test(src)) return false;
      keep.src = src; keep.alt = (get('alt') || '').slice(0, 300);
    } else if (tag === 'iframe') {
      const src = (get('src') || '').trim();
      if (!okFrame.test(src)) return false;
      keep.src = src; keep.title = 'Embedded video'; keep.loading = 'lazy'; keep.frameborder = '0'; keep.allowfullscreen = '';
    } else if (tag === 'video') {
      const src = (get('src') || '').trim();
      if (!okVideo.test(src)) return false;
      keep.src = src; keep.controls = ''; keep.preload = 'metadata';
    } else if (tag === 'td' || tag === 'th') {
      ['colspan', 'rowspan'].forEach((n) => { const v = parseInt(get(n), 10); if (v > 1 && v <= 20) keep[n] = String(v); });
    }
    Array.from(el.attributes).forEach((a) => el.removeAttribute(a.name));
    Object.keys(keep).forEach((k) => el.setAttribute(k, keep[k]));
    return true;
  }

  function walk(parent) {
    Array.from(parent.childNodes).forEach(function (node) {
      if (node.nodeType === 3) return;
      if (node.nodeType !== 1) { node.remove(); return; }
      let tag = node.tagName.toLowerCase();
      if (SAN_DROP.has(tag)) { node.remove(); return; }
      if (SAN_RENAME[tag]) {
        const r = doc.createElement(SAN_RENAME[tag]);
        while (node.firstChild) r.appendChild(node.firstChild);
        node.replaceWith(r); node = r; tag = r.tagName.toLowerCase();
      }
      if (!SAN_TAGS.has(tag)) { walk(node); node.replaceWith(...Array.from(node.childNodes)); return; }
      if (!cleanAttrs(node, tag)) {
        if (tag === 'a') { walk(node); node.replaceWith(...Array.from(node.childNodes)); } else node.remove();
        return;
      }
      walk(node);
    });
  }
  walk(doc.body);
  doc.body.querySelectorAll('figcaption').forEach((f) => { if (!f.textContent.trim()) f.remove(); });
  return doc.body.innerHTML;
}

/* ---------------------------------------------------------------
   Rich text for article bodies. Editor-written articles are HTML
   (see sanitizeHTML above). Older articles use a small, safe Markdown subset:
   ## heading, ### subheading, > quote, - list, 1. list, ---,
   **bold**, *italic*, [text](https://link). Everything is escaped
   first, so authors can't inject HTML.
   --------------------------------------------------------------- */
function renderRichText(text) {
  if (typeof text === 'string' && text.indexOf(RTE_MARK) === 0) return sanitizeHTML(text);
  const inline = (raw) => {
    let s = escapeHTML(raw);
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)"']+|mailto:[^\s)"']+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
    return s.replace(/\n/g, '<br>');
  };
  return (text || '').replace(/\r/g, '').split(/\n{2,}/).map(block => {
    const b = block.trim();
    if (!b) return '';
    if (/^---+$/.test(b)) return '<hr>';
    if (/^### /.test(b)) return `<h3>${inline(b.slice(4))}</h3>`;
    if (/^## /.test(b)) return `<h2>${inline(b.slice(3))}</h2>`;
    if (/^# /.test(b)) return `<h2>${inline(b.slice(2))}</h2>`;
    const lines = b.split('\n');
    if (lines.every(l => /^>\s?/.test(l))) return `<blockquote>${inline(lines.map(l => l.replace(/^>\s?/, '')).join('\n'))}</blockquote>`;
    if (lines.every(l => /^[-*•]\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
    if (lines.every(l => /^\d+[.)]\s+/.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\d+[.)]\s+/, ''))}</li>`).join('')}</ol>`;
    return `<p>${inline(b)}</p>`;
  }).join('');
}
