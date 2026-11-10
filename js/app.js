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
   Rich text for article bodies. A small, safe Markdown subset:
   ## heading, ### subheading, > quote, - list, 1. list, ---,
   **bold**, *italic*, [text](https://link). Everything is escaped
   first, so authors can't inject HTML.
   --------------------------------------------------------------- */
function renderRichText(text) {
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
