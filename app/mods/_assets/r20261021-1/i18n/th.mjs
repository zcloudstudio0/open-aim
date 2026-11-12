// Thai interface. The game first turns its Chinese/Vietnamese text into English
// (translate-en.mjs + en.dict.mjs); toThai() then turns that English into Thai using
// th.dict.mjs. The app's own panels (top bar, coach, backups, updates, Studio) are
// English in their source and go through the same lookup.
//
// Lookup order: exact sentence, then the same sentence with its numbers replaced by
// "#" (so "104 tasks" uses the entry "# tasks"). Case and extra spaces are ignored.
// Anything without an entry stays English and is listed in window.__thMissing, so new
// text is easy to find: copy(Object.keys(window.__thMissing)) in DevTools.
//
// Language: localStorage "aim-lang" ("th" or "en"); Thai unless set to "en".
import dictionary from './th.dict.mjs';

export const LANG_KEY = 'aim-lang';
export function thaiEnabled() {
  try { return localStorage.getItem(LANG_KEY) !== 'en'; } catch { return true; }
}
export function setLanguage(lang) {
  try { localStorage.setItem(LANG_KEY, lang === 'en' ? 'en' : 'th'); } catch {}
}

const enabled = thaiEnabled();
const squash = (s) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const NUMBER = /\d+(?:[.,]\d+)*/g;
const exact = new Map();
const templated = new Map();
for (const [english, thai] of Object.entries(dictionary)) {
  const key = squash(english);
  if (key.includes('#')) templated.set(key, thai);
  else exact.set(key, thai);
}
const missing = (globalThis.__thMissing ??= Object.create(null));
const cache = new Map();
const LATIN = /[A-Za-z]{2,}/;
const THAI = /[฀-๿]/;
// Links, file names and drill numbers (NO.E3C17C) are left as they are.
const SKIP = /^(?:https?:|www\.|[\w.-]+\.(?:js|mjs|css|png|glb|json)$|NO\.[0-9A-F]{6}$)/i;

function lookup(text) {
  const key = squash(text);
  let thai = exact.get(key);
  if (thai !== undefined) return thai;
  // Trailing punctuation the dictionary does not carry ("Score:" -> "Score").
  const bare = key.replace(/[\s:：.。!！?？…]+$/u, '');
  if (bare !== key && (thai = exact.get(bare)) !== undefined) return thai + text.trim().slice(bare.length).replace(/^\s+/, '');
  if (!/\d/.test(key)) return undefined;
  const numbers = key.match(NUMBER) || [];
  thai = templated.get(key.replace(NUMBER, '#'));
  if (thai === undefined) return undefined;
  let i = 0;
  return thai.replace(/#/g, () => numbers[i++] ?? '');
}

// Sentences built from a fixed part and a name ("Start: Micro flicks"); each $n is translated on its own.
const DIFF = { easy: 'ง่าย', medium: 'ปานกลาง', normal: 'ปกติ', hard: 'ยาก', 'very hard': 'ยากมาก' };
const PATTERNS = [
  [/^Start: (.+)$/i, 'เริ่ม: $1'],
  [/^Quick start: (.+)$/i, 'เริ่มด่วน: $1'],
  [/^Favorite: (.+)$/i, 'รายการโปรด: $1'],
  [/^Unfavorite: (.+)$/i, 'เอาออกจากรายการโปรด: $1'],
  [/^View leaderboard: (.+)$/i, 'ดูตารางอันดับ: $1'],
  [/^(.+?)\s*[–-]\s*next page$/i, '$1 – หน้าถัดไป'],
  [/^(.+?)\s*[–-]\s*previous page$/i, '$1 – หน้าก่อน'],
  [/^(.+?): next page$/i, '$1: หน้าถัดไป'],
  [/^(.+?): previous page$/i, '$1: หน้าก่อน'],
  [/^(.+?): not available yet$/i, '$1: ยังไม่เปิดให้เล่น'],
  [/^Clear (.+?)\s+primary key$/i, 'ล้างปุ่มหลักของ $1'],
  [/^Clear (.+?)\s+secondary key$/i, 'ล้างปุ่มรองของ $1'],
  [/^(.+?)\s+primary key$/i, 'ปุ่มหลักของ $1'],
  [/^(.+?)\s+secondary key$/i, 'ปุ่มรองของ $1'],
  [/^#\s*(\d+)\s+recommended: (.+)$/i, (m) => `แนะนำอันดับ ${m[1]}: ${toThai(m[2])}`],
  [/^(Easy|Medium|Normal|Hard|Very hard) - (.+)$/i, (m) => `${DIFF[m[1].toLowerCase()]} - ${toThai(m[2])}`],
  // Community cards: "Title，Difficulty，Author" (the author's name stays as written).
  [/^(.+?)，(Easy|Medium|Normal|Hard|Very hard)，(.*)$/i, (m) => `${toThai(m[1])}，${DIFF[m[2].toLowerCase()]}，${m[3]}`],
  // "Category · description": translate each side.
  [/^([^·]{2,40}) · (.+)$/, (m) => `${toThai(m[1])} · ${toThai(m[2])}`],
];
function pattern(text) {
  for (const [re, out] of PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    if (typeof out === 'function') return out(m);
    return out.replace(/\$(\d)/g, (_, i) => toThai(m[i]));
  }
  return undefined;
}

export function toThai(value) {
  // Already Thai (the page's text watcher sees our own output again): leave it.
  if (!enabled || typeof value !== 'string' || !LATIN.test(value) || THAI.test(value)) return value;
  if (cache.has(value)) return cache.get(value);
  let result = value;
  const trimmed = value.trim();
  if (trimmed && !SKIP.test(trimmed)) {
    const thai = lookup(trimmed) ?? pattern(trimmed);
    if (thai !== undefined) result = value.match(/^\s*/)[0] + thai + value.match(/\s*$/)[0];
    else if (trimmed.length < 400) missing[trimmed] = (missing[trimmed] || 0) + 1;
  }
  if (cache.size > 4000) cache.clear();
  cache.set(value, result);
  return result;
}

// For pages without the game's runtime (the Studio): translate the DOM as it changes.
export function translateDocument(root = document.documentElement) {
  if (!enabled) return;
  document.documentElement.lang = 'th';
  const attributes = ['placeholder', 'title', 'aria-label', 'alt', 'label'];
  const skip = 'script,style,code,pre,textarea,[contenteditable="true"],[data-no-thai]';
  const text = (node) => {
    if (!node.parentElement || node.parentElement.closest(skip)) return;
    const next = toThai(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  };
  const element = (node) => {
    if (node.closest(skip)) return;
    for (const name of attributes) {
      const v = node.getAttribute(name);
      if (v) { const next = toThai(v); if (next !== v) node.setAttribute(name, next); }
    }
    if (node.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(node.type)) node.value = toThai(node.value);
  };
  const scan = (node) => {
    if (node.nodeType === Node.TEXT_NODE) { text(node); return; }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    element(node);
    for (const child of node.childNodes) scan(child);
  };
  scan(root);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') text(r.target);
      else if (r.type === 'attributes') element(r.target);
      else for (const n of r.addedNodes) scan(n);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributes });
}
