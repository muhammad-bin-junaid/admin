/* Sable Revenue OS: shared app behaviour. Loaded non-deferred in <head> so these
   globals exist before Alpine (deferred) initialises the components that use them. */

/* Locale and currency for every money / number value the kit renders.
   Change these two lines to re-format the whole template. See README › Localization. */
window.SABLE_LOCALE = 'en-US'; // BCP-47 locale, e.g. 'de-DE', 'fr-FR', 'en-US'
window.SABLE_CURRENCY = 'USD'; // ISO 4217, e.g. 'USD', 'GBP'
window.SABLE_VAT_RATE = 22; // invoice VAT/tax percentage for your region (0 hides the VAT line math)
/* A choice saved from Settings › Localization overrides the defaults above. Each value is
   validated first, so a garbage locale or currency can never reach Intl.NumberFormat. */
(function () {
  try {
    var sl = localStorage.getItem('sable-locale');
    if (sl) { try { new Intl.NumberFormat(sl); window.SABLE_LOCALE = sl; } catch (e) {} }
    var sc = localStorage.getItem('sable-currency');
    if (sc) { try { new Intl.NumberFormat('en', { style: 'currency', currency: sc }); window.SABLE_CURRENCY = sc; } catch (e) {} }
    var sv = localStorage.getItem('sable-vat');
    if (sv !== null && sv !== '' && !isNaN(+sv)) window.SABLE_VAT_RATE = +sv;
  } catch (e) {}
})();
/* Demo "buy" ribbon: shown ONLY on the public demo host (e.g. *.vercel.app), never in the
   product on your own domain. Point this at your store page ('' = neutral "Live demo" badge);
   force the ribbon on or off with SABLE_DEMO=true/false. */
window.SABLE_BUY_URL = 'https://domenico145.gumroad.com/l/sable-tailwind-admin-dashboard';

/* Currency. The second arg forwards Intl options: sableMoney(57180, { maximumFractionDigits: 0 })
   → "€57,180" for compact KPI headlines; the default keeps 2 decimals.
   useGrouping:'always' is required in locales with CLDR minimumGroupingDigits=2 (it, es, …),
   which would otherwise print "3847" next to "248.592" instead of "3.847". */
window.sableMoney = (n, opts) =>
  new Intl.NumberFormat(window.SABLE_LOCALE, { style: 'currency', currency: window.SABLE_CURRENCY, useGrouping: 'always', ...(opts || {}) }).format(Number(n) || 0);
/* Plain grouped number (counts, units): 12904 → "12,904". */
window.sableNum = (n, opts) =>
  new Intl.NumberFormat(window.SABLE_LOCALE, { useGrouping: 'always', ...(opts || {}) }).format(Number(n) || 0);

/* Avatar monogram tint: hash(name) → one of six on-brand editorial tints. Each pair is a
   soft background + dark ink carried on the chip itself, so the measured AA contrast
   (≥4.5:1, see README) holds in both themes with no repaint on toggle. Offline, no images. */
window.SABLE_AVATAR_TINTS = [
  { bg: '#BFE0D8', fg: '#0B443D' }, // pine / teal   ratio 7.79:1
  { bg: '#F0C9B6', fg: '#822C16' }, // clay          ratio 5.92:1
  { bg: '#C3E0CD', fg: '#12543B' }, // forest        ratio 6.31:1
  { bg: '#C9DAEC', fg: '#2A517D' }, // slate         ratio 5.73:1
  { bg: '#EDD59B', fg: '#6B4A08' }, // ochre         ratio 5.59:1
  { bg: '#E1CBD9', fg: '#6E2C50' }, // plum          ratio 6.43:1
];
/* Stable hash (rolling *31) → tint index. Same name ⇒ same tint everywhere. */
window.sableAvatarColor = (name) => {
  const s = String(name == null ? '' : name);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return window.SABLE_AVATAR_TINTS[h % window.SABLE_AVATAR_TINTS.length];
};
/* Convenience: ready-to-use inline style string for a monogram chip. */
window.sableAvatarStyle = (name) => {
  const t = window.sableAvatarColor(name);
  return `background:${t.bg};color:${t.fg}`;
};

/* Product thumbnails: inline-SVG line art per product type, drawn in the same AA-checked
   tint as the monograms (sableAvatarStyle sets bg + ink, the glyph strokes currentColor).
   Offline, no photos or licensing. The name only selects from a FIXED glyph set and is
   never rendered, so the output stays safe with x-html. */
window.SABLE_PRODUCT_GLYPHS = [
  { kw: ['scarf'],                              d: 'M9 3h6v9a3 3 0 0 1-6 0Z M11 12v8 M13 12v8' },
  { kw: ['beanie', 'hat'],                       d: 'M4 14a8 8 0 0 1 16 0Z M3 14h18v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z' },
  { kw: ['sweater', 'crew', 'base layer', 'knit'], d: 'M8 3 4 6l2 3 2-1.5V21h8V7.5l2 1.5 2-3-4-3-2 2a2.8 2.8 0 0 1-4 0Z' },
  { kw: ['overcoat', 'coat', 'gilet', 'jacket', 'outer'], d: 'M8 3 4 6l2 3 2-1.5V21h8V7.5l2 1.5 2-3-4-3-2 2a2.8 2.8 0 0 1-4 0Z M12 8v13' },
  { kw: ['blanket', 'throw'],                     d: 'M4 6h16v12H4Z M4 10h16 M8 6v12' },
  { kw: ['socks', 'sock'],                        d: 'M9 3v8l-3.5 3.5a3 3 0 0 0 4.5 4L15 13V3Z M9 3h6' },
  { kw: ['slipper', 'shoe', 'footwear'],          d: 'M4 14h8l3 2h4a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z M4 14v-3' },
  { kw: ['tote', 'bag'],                          d: 'M6 8h12l-1 11H7Z M9 8a3 3 0 0 1 6 0' },
  { kw: ['card holder', 'wallet'],                d: 'M3 7h18v10H3Z M3 11h18 M15 14h3' },
  { kw: ['glove'],                                d: 'M7 12V7a1 1 0 0 1 2 0v4 M9 11V5a1 1 0 0 1 2 0v6 M11 11V6a1 1 0 0 1 2 0v5 M13 12V8a1 1 0 0 1 2 0v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-1' },
  { kw: ['gift', 'wrap', 'handling', 'adjustment', 'service', 'consulting'], d: 'M4 9h16v3H4Z M12 9v12 M5 12v9h14v-9 M12 9a3 3 0 1 0-3-3 M12 9a3 3 0 1 1 3-3' },
];
window.sableProductSvg = (name, size) => {
  const s = String(name == null ? '' : name).toLowerCase();
  const g = window.SABLE_PRODUCT_GLYPHS.find(x => x.kw.some(k => s.indexOf(k) >= 0));
  const d = g ? g.d : 'M12 3 21 7.5v9L12 21 3 16.5v-9Z M3 7.5 12 12l9-4.5 M12 12v9'; // default: box/parcel
  const sz = (parseInt(size, 10) > 0) ? parseInt(size, 10) : 20; // int-coerced (safe if a buyer wires size to input); % collapses in a grid cell
  return '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
};

/* Elements carrying data-sable-money / data-sable-num are reformatted on load, so hard-coded
   hero KPIs follow the locale too. Add data-money-compact for whole-number currency.
   The inline value stays readable as a no-JS fallback. */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-sable-money]').forEach(el => {
    const opts = el.hasAttribute('data-money-compact') ? { maximumFractionDigits: 0 } : {};
    el.textContent = window.sableMoney(el.getAttribute('data-sable-money'), opts);
  });
  document.querySelectorAll('[data-sable-num]').forEach(el => {
    el.textContent = window.sableNum(el.getAttribute('data-sable-num'));
  });
  document.querySelectorAll('[data-sable-cursym]').forEach(el => {
    el.textContent = window.sableCurrencySymbol();
  });
});

/* Just the currency glyph, for input prefixes where a formatted amount would not fit. */
window.sableCurrencySymbol = () => {
  try {
    const part = new Intl.NumberFormat(window.SABLE_LOCALE, { style: 'currency', currency: window.SABLE_CURRENCY })
      .formatToParts(0).find(p => p.type === 'currency');
    return part ? part.value : window.SABLE_CURRENCY;
  } catch (e) { return window.SABLE_CURRENCY; }
};

/* Percentage localizer: money goes through Intl, but percentages ("1.7%", "0.2pp") are plain
   strings and read wrong next to "180,00 €" in comma-decimal locales (it, de, fr, es, …).
   One pass rewrites their decimal separator, a debounced observer re-applies it after dynamic
   re-renders. No-op when the locale already uses ".". */
(function () {
  function decSep() { try { return new Intl.NumberFormat(window.SABLE_LOCALE).format(1.1).charAt(1); } catch (e) { return '.'; } }
  const RE = /(\d)\.(\d+)(\s?(?:%|pp))/g;
  window.sableLocalizePercents = function () {
    const dec = decSep();
    if (dec === '.') return;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        const p = node.parentNode && node.parentNode.nodeName;
        return (p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    const edits = [];
    let n;
    while ((n = w.nextNode())) {
      const v = n.nodeValue;
      if (v.indexOf('%') < 0 && v.indexOf('pp') < 0) continue;
      const v2 = v.replace(RE, '$1' + dec + '$2$3');
      if (v2 !== v) edits.push([n, v2]);
    }
    edits.forEach(e => { e[0].nodeValue = e[1]; });
  };
  function boot() {
    if (decSep() === '.') return;
    window.sableLocalizePercents();
    let t;
    try {
      new MutationObserver(() => { clearTimeout(t); t = setTimeout(window.sableLocalizePercents, 60); })
        .observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 60));
  else setTimeout(boot, 60);
})();

/* ---- Theme toggle (persisted, no-FOUC boot lives inline in <head>) ---- */
function toggleTheme() {
  const root = document.documentElement;
  root.classList.toggle('dark');
  try {
    localStorage.setItem('sable-theme', root.classList.contains('dark') ? 'dark' : 'light');
  } catch (e) {}
  // Repaint charts with the new palette if the page has any.
  if (window.__sableRenderCharts) window.__sableRenderCharts();
}

/* ---- Toast: lightweight demo-action feedback (self-contained styles) ---- */
let __sableToastTimer;
function sableToast(msg) {
  let host = document.getElementById('sable-toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'sable-toast';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.style.cssText =
      'position:fixed;z-index:60;left:50%;bottom:24px;transform:translateX(-50%) translateY(8px);' +
      'max-width:calc(100vw - 32px);opacity:0;transition:opacity .2s ease, transform .2s ease;' +
      'pointer-events:none;font:500 14px/1.4 Inter,system-ui,sans-serif;';
    document.body.appendChild(host);
  }
  const dark = document.documentElement.classList.contains('dark');
  host.style.color = dark ? '#F4F0EA' : '#FAF8F5';
  host.style.background = dark ? '#262019' : '#241F1A';
  host.style.border = '1px solid ' + (dark ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.08)');
  host.style.borderRadius = '10px';
  host.style.padding = '10px 16px';
  host.style.boxShadow = '0 18px 40px -12px rgba(52,40,28,.35)';
  host.textContent = msg;
  requestAnimationFrame(() => {
    host.style.opacity = '1';
    host.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(__sableToastTimer);
  __sableToastTimer = setTimeout(() => {
    host.style.opacity = '0';
    host.style.transform = 'translateX(-50%) translateY(8px)';
  }, 2600);
}

/* ---- Real client-side CSV export (Blob + object URL download) ---- */
function sableCsvEscape(cell) {
  let s = cell == null ? '' : String(cell);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function sableCsv(rows) {
  return rows.map(r => r.map(sableCsvEscape).join(',')).join('\r\n');
}
/* rows: array of arrays; first row is the header. Triggers a real file download. */
function sableDownloadCsv(filename, rows) {
  try {
    const body = '﻿' + sableCsv(rows); // BOM so Excel reads UTF-8
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    const n = Math.max(0, rows.length - 1);
    sableToast('Exported ' + n + ' row' + (n === 1 ? '' : 's') + ' → ' + filename);
  } catch (e) {
    sableToast('Export failed (demo)');
  }
}

/* ---- Shared validators (used by settings, forms, login) ---- */
window.sableValid = {
  required: v => String(v == null ? '' : v).trim().length > 0,
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()),
  url: v => /^https?:\/\/[^\s.]+\.[^\s]+$/.test(String(v).trim()),
  num: v => v !== '' && v != null && !isNaN(+v),
  min: (v, n) => String(v == null ? '' : v).length >= n,
};
window.sableDownloadCsv = sableDownloadCsv;

/* Print only the invoice document: a body class makes the print stylesheet swap the app UI
   for #invoice-print. A class rather than CSS :has() for universal browser support. */
window.sablePrintInvoice = function () {
  document.body.classList.add('sable-print-invoice');
  var done = function () { document.body.classList.remove('sable-print-invoice'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  try { window.print(); } finally { setTimeout(done, 1000); }
};

/* ---- Command palette (topbar search + ⌘K), identical on every page ---- */
function commandPalette() {
  return {
    show: false,
    q: '',
    sel: 0,
    items: [
      { t: 'Dashboard', s: 'Overview & KPIs', href: 'index.html', tag: 'Page' },
      { t: 'Orders', s: 'Search, filter & reconcile', href: 'tables.html', tag: 'Page' },
      { t: 'Products', s: 'Catalog, stock & pricing', href: 'products.html', tag: 'Page' },
      { t: 'New product', s: 'Catalog editor', href: 'forms.html', tag: 'Page' },
      { t: 'New order', s: 'Create an order', href: 'order-new.html', tag: 'Page' },
      { t: 'Customers', s: 'Directory & lifetime value', href: 'customers.html', tag: 'Page' },
      { t: 'New customer', s: 'Add a customer', href: 'customer-new.html', tag: 'Page' },
      { t: 'Payouts', s: 'Settlements & schedule', href: 'payouts.html', tag: 'Page' },
      { t: 'Analytics', s: 'Trends & channel reports', href: 'analytics.html', tag: 'Page' },
      { t: 'Activity', s: 'Global activity feed', href: 'activity.html', tag: 'Page' },
      { t: 'Messages', s: 'Customer email & inbox', href: 'messages.html', tag: 'Page' },
      { t: 'Invoices', s: 'Billing & payments', href: 'invoices.html', tag: 'Page' },
      { t: 'New invoice', s: 'Bill a customer', href: 'invoice-new.html', tag: 'Page' },
      { t: 'Fulfillment', s: 'Order packing board', href: 'board.html', tag: 'Page' },
      { t: 'Settings', s: 'Account & preferences', href: 'settings.html', tag: 'Page' },
      /* ---- Orders (search by #id or customer): the deep-link carries the id ---- */
      { t: 'Order #SB-10492, Alessandra Ferri', s: 'a.ferri@example.com · €182.40 · Paid', href: 'order-detail.html?id=SB-10492', tag: 'Order' },
      { t: 'Order #SB-10491, Marcus Lindqvist', s: 'marcus.l@example.com · €59.00 · Pending', href: 'order-detail.html?id=SB-10491', tag: 'Order' },
      { t: 'Order #SB-10490, Yuki Tanaka', s: 'yuki.t@example.com · €248.00 · Paid', href: 'order-detail.html?id=SB-10490', tag: 'Order' },
      { t: 'Order #SB-10488, Tom Okafor', s: 't.okafor@example.com · €512.00 · Paid', href: 'order-detail.html?id=SB-10488', tag: 'Order' },
      { t: 'Order #SB-10487, Léa Dubois', s: 'lea@atelier-dubois.fr · €1,240.00 · Paid', href: 'order-detail.html?id=SB-10487', tag: 'Order' },
      { t: 'Order #SB-10486, Diego Moretti', s: 'diego.m@example.com · €76.50 · Failed', href: 'order-detail.html?id=SB-10486', tag: 'Order' },
      { t: 'Order #SB-10479, James Whitfield', s: 'j.whitfield@example.com · €2,380.00 · Paid', href: 'order-detail.html?id=SB-10479', tag: 'Order' },
      /* ---- Customers (search by name or email): id = email ---- */
      { t: 'Alessandra Ferri', s: 'a.ferri@example.com · Milan, IT · VIP', href: 'customer-detail.html?id=a.ferri%40example.com', tag: 'Customer' },
      { t: 'James Whitfield', s: 'j.whitfield@example.com · Wholesale · VIP', href: 'customer-detail.html?id=j.whitfield%40example.com', tag: 'Customer' },
      { t: 'Léa Dubois', s: 'lea@atelier-dubois.fr · Lyon, FR · VIP', href: 'customer-detail.html?id=lea%40atelier-dubois.fr', tag: 'Customer' },
      { t: 'Yuki Tanaka', s: 'yuki.t@example.com · Osaka, JP · Repeat', href: 'customer-detail.html?id=yuki.t%40example.com', tag: 'Customer' },
      { t: 'Marcus Lindqvist', s: 'marcus.l@example.com · Stockholm, SE · New', href: 'customer-detail.html?id=marcus.l%40example.com', tag: 'Customer' },
      { t: 'Diego Moretti', s: 'diego.m@example.com · Rome, IT · New', href: 'customer-detail.html?id=diego.m%40example.com', tag: 'Customer' },
      /* ---- Products (search by name or SKU): id = SKU ---- */
      { t: 'Merino wool scarf', s: 'SB-SCF-MER-01 · Knitwear · €89.00', href: 'product-detail.html?id=SB-SCF-MER-01', tag: 'Product' },
      { t: 'Cashmere beanie', s: 'SB-BEA-CAS-02 · Knitwear · €65.00', href: 'product-detail.html?id=SB-BEA-CAS-02', tag: 'Product' },
      { t: 'Lambswool crew sweater', s: 'SB-SWT-LAM-03 · Knitwear · €145.00', href: 'product-detail.html?id=SB-SWT-LAM-03', tag: 'Product' },
      { t: 'Alpaca throw blanket', s: 'SB-HOM-ALP-04 · Home · €180.00', href: 'product-detail.html?id=SB-HOM-ALP-04', tag: 'Product' },
      { t: 'Leather card holder', s: 'SB-ACC-LEA-05 · Accessories · €45.00', href: 'product-detail.html?id=SB-ACC-LEA-05', tag: 'Product' },
      { t: 'Recycled wool overcoat', s: 'SB-OUT-OVC-10 · Outerwear · €340.00', href: 'product-detail.html?id=SB-OUT-OVC-10', tag: 'Product' },
      /* ---- Invoices (search by # or customer): the deep-link carries the id ---- */
      { t: 'Invoice #INV-2048, James Whitfield', s: 'j.whitfield@example.com · €2,380.00 · Pending', href: 'invoice-detail.html?id=INV-2048', tag: 'Invoice' },
      { t: 'Invoice #INV-2043, Tom Okafor', s: 't.okafor@example.com · €512.00 · Overdue', href: 'invoice-detail.html?id=INV-2043', tag: 'Invoice' },
      { t: 'Invoice #INV-2045, Alessandra Ferri', s: 'a.ferri@example.com · €820.00 · Paid', href: 'invoice-detail.html?id=INV-2045', tag: 'Invoice' },
    ],
    get results() {
      const q = this.q.trim().toLowerCase();
      if (!q) return this.items;
      return this.items.filter(i => (i.t + ' ' + i.s + ' ' + i.tag).toLowerCase().includes(q));
    },
    open() {
      this.show = true;
      this.q = '';
      this.sel = 0;
      this.$nextTick(() => { if (this.$refs.palInput) this.$refs.palInput.focus(); });
    },
    close() { this.show = false; },
    move(d) {
      const n = this.results.length;
      if (!n) return;
      this.sel = (this.sel + d + n) % n;
    },
    go() {
      const r = this.results[this.sel];
      if (r) window.location.href = r.href;
    },
  };
}

/* Email module: shared compose modal, template library and a localStorage-backed "outbox",
   so a message composed from an order or a customer shows up in Messages › Sent, the
   recipient's Communications timeline and the Activity feed. Front-end only: there is no
   backend, the demo records the message locally and gives optimistic feedback. */

/* Persisted outbox (capped, degrades silently if storage is off). */
window.sableOutbox = {
  KEY: 'sable-outbox',
  get() {
    try { const v = JSON.parse(localStorage.getItem(this.KEY) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  },
  add(msg) {
    try {
      const list = this.get();
      list.unshift(msg);
      localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, 50)));
    } catch (e) {}
    return msg;
  },
};

/* Relative time from a millisecond timestamp (e.g. 1721650000000 → "3m ago"). */
window.sableAgo = (ts) => {
  const s = Math.max(0, Math.floor((Date.now() - Number(ts)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24); return d + 'd ago';
};

/* First name for greetings, with a friendly fallback. */
window.sableFirstName = (name) => (String(name == null ? '' : name).trim().split(/\s+/)[0] || 'there');

/* ---- Template library ----------------------------------------------------
   Each template exposes subject(ctx) + body(ctx) and a `needs` list of context keys, so the
   compose modal offers it only when every needed key is present (order templates stay hidden
   when there is no order). Context keys: name, firstName, to, store, sender, orderId, amount,
   itemsSummary, tracking. Bodies are plain text, rendered in a <textarea>. */
window.sableEmailTemplates = [
  { id: 'blank', label: 'Blank message', needs: [],
    subject: () => '',
    body: () => '' },

  { id: 'order-confirm', label: 'Order confirmation', needs: ['orderId'],
    subject: c => `Your ${c.store} order ${c.orderId} is confirmed`,
    body: c => `Hi ${c.firstName},\n\nThank you for your order. ${c.orderId}${c.amount ? `, ${c.amount}` : ''} is confirmed and we're getting it ready.${c.itemsSummary ? `\n\nWhat's in your order:\n${c.itemsSummary}` : ''}\n\nWe'll email you a tracking link the moment it ships. If anything looks off, just reply to this message.\n\nWarm regards,\n${c.sender}\n${c.store}` },

  { id: 'order-shipped', label: 'Shipping update', needs: ['orderId', 'tracking'],
    subject: c => `Your ${c.store} order ${c.orderId} is on its way`,
    body: c => `Hi ${c.firstName},\n\nGood news, order ${c.orderId} has shipped and is on its way to you.\n\nTracking number: ${c.tracking}\n\nYou can follow the parcel with the carrier using the number above. Reach out any time if you have questions.\n\nWarm regards,\n${c.sender}\n${c.store}` },

  { id: 'order-refund', label: 'Refund confirmation', needs: ['orderId', 'amount'],
    subject: c => `Refund processed for order ${c.orderId}`,
    body: c => `Hi ${c.firstName},\n\nWe've processed a refund of ${c.amount} for order ${c.orderId}. Depending on your bank it can take a few business days to appear on your statement.\n\nWe're sorry it didn't work out this time, and we hope to see you again soon.\n\nWarm regards,\n${c.sender}\n${c.store}` },

  { id: 'order-payment', label: 'Payment reminder', needs: ['orderId', 'amount'],
    subject: c => `A quick reminder about order ${c.orderId}`,
    body: c => `Hi ${c.firstName},\n\nWe're still holding order ${c.orderId} for you, but we haven't been able to confirm payment of ${c.amount} yet.\n\nWhenever you're ready, you can complete the payment and we'll ship it straight away. Let us know if you ran into any trouble at checkout.\n\nWarm regards,\n${c.sender}\n${c.store}` },

  { id: 'order-review', label: 'Review request', needs: ['orderId'],
    subject: c => `How did we do, ${c.firstName}?`,
    body: c => `Hi ${c.firstName},\n\nWe hope everything from order ${c.orderId} arrived just as you'd hoped. If you have a moment, we'd love to hear what you thought. A short review helps other customers and helps us keep improving.\n\nThank you for supporting ${c.store}.\n\nWarm regards,\n${c.sender}\n${c.store}` },

  { id: 'invoice-send', label: 'Invoice', needs: ['invoiceId'],
    subject: c => `Invoice ${c.invoiceId} from ${c.store}`,
    body: c => `Hi ${c.firstName},\n\nPlease find invoice ${c.invoiceId}${c.amount ? ` for ${c.amount}` : ''} attached.${c.dueDate ? `\n\nPayment is due by ${c.dueDate}.` : ''} You can settle it by bank transfer using the details on the invoice, or reply to this email if you'd prefer another method.\n\nThank you for your business,\n${c.sender}\n${c.store}` },

  { id: 'cust-welcome', label: 'Welcome', needs: [],
    subject: c => `Welcome to ${c.store}, ${c.firstName}`,
    body: c => `Hi ${c.firstName},\n\nWelcome to ${c.store}. We're glad you're here. You'll be the first to know about new arrivals, restocks and the occasional members-only offer.\n\nIf there's ever anything we can help with, just reply to this email; a real person reads every one.\n\nWarm regards,\n${c.sender}\n${c.store}` },

  { id: 'cust-thanks', label: 'Thank-you (VIP)', needs: [],
    subject: c => `A thank-you from ${c.store}`,
    body: c => `Hi ${c.firstName},\n\nJust a note to say thank you. You're one of our most valued customers, and we don't take that for granted.\n\nAs a small token, keep an eye on your inbox this week: we'll be sharing early access to our next drop with you before anyone else.\n\nWarm regards,\n${c.sender}\n${c.store}` },

  { id: 'cust-winback', label: 'We miss you', needs: [],
    subject: c => `We've missed you, ${c.firstName}`,
    body: c => `Hi ${c.firstName},\n\nIt's been a little while, and we wanted to reach out, we've added a few new pieces we think you'll love.\n\nHere's a little welcome-back: use MISSYOU10 for 10% off your next order this month.\n\nHope to see you soon,\n${c.sender}\n${c.store}` },

  { id: 'cust-account', label: 'Account update', needs: [],
    subject: c => `An update to your ${c.store} account`,
    body: c => `Hi ${c.firstName},\n\nWe're writing to let you know about an update to your ${c.store} account. There's nothing you need to do right now, this note is just to keep you in the loop.\n\nIf you have any questions, simply reply and we'll be happy to help.\n\nWarm regards,\n${c.sender}\n${c.store}` },
];

/* ---- Shared compose modal (injected once per page, opened by an event) ----
   Any control dispatches $dispatch('open-compose', { to, name, orderId, amount, itemsSummary,
   tracking, reply }) and this single modal handles it. Recipient-controlled values bind with
   x-text / x-model, never x-html, so no untrusted markup reaches the DOM. */
function emailCompose() {
  return {
    show: false,
    isReply: false,
    to: '', toName: '', subject: '', body: '', tid: 'blank',
    ctx: {},
    touched: {},
    trigger: null,
    get templates() {
      return window.sableEmailTemplates.filter(t => (t.needs || []).every(k => this.ctx[k]));
    },
    validEmail() { return window.sableValid.email(this.to); },
    validSubject() { return window.sableValid.required(this.subject); },
    validBody() { return window.sableValid.required(this.body); },
    get valid() { return this.validEmail() && this.validSubject() && this.validBody(); },
    open(detail) {
      const d = detail || {};
      this.isReply = !!d.reply;
      this.trigger = (typeof document !== 'undefined') ? document.activeElement : null;
      this.ctx = Object.assign({ store: 'Sable', sender: 'Elena Rossi' }, d);
      this.ctx.firstName = window.sableFirstName(this.ctx.name);
      this.to = d.to || '';
      this.toName = d.name || '';
      const ids = this.templates.map(t => t.id);
      const preferred = d.invoiceId ? 'invoice-send' : (d.orderId ? 'order-confirm' : (d.reply ? 'blank' : (d.to ? 'cust-welcome' : 'blank')));
      this.tid = ids.includes(preferred) ? preferred : (ids[0] || 'blank');
      this.applyTemplate();
      if (d.subject) { this.subject = d.subject; }
      if (d.reply && d.quote) {
        var q = d.quote;
        var quoted = String(q.body == null ? '' : q.body).split('\n').map(function (l) { return '> ' + l; }).join('\n');
        this.body = '\n\nOn ' + (q.when || '') + ', ' + (q.from || 'the customer') + ' wrote:\n' + quoted;
      }
      this.touched = {};
      this.show = true;
      this.$nextTick(() => { if (this.$refs.composeFirst) this.$refs.composeFirst.focus(); });
    },
    applyTemplate() {
      const t = window.sableEmailTemplates.find(x => x.id === this.tid) || window.sableEmailTemplates[0];
      this.subject = t.subject(this.ctx);
      this.body = t.body(this.ctx);
    },
    /* Contain Tab within the dialog and restore focus to the trigger on close. */
    trapTab(e) {
      const root = this.$refs.dialog;
      if (!root) return;
      const f = root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    },
    close() {
      this.show = false;
      const t = this.trigger;
      if (t && typeof t.focus === 'function') { this.$nextTick(() => t.focus()); }
    },
    send() {
      if (!this.valid) { this.touched = { to: true, subject: true, body: true }; return; }
      const ts = Date.now();
      const msg = {
        id: 'sent-' + ts + '-' + Math.random().toString(36).slice(2, 7),
        to: this.to,
        name: this.toName || this.to,
        subject: this.subject,
        body: this.body,
        template: this.tid,
        ts,
        preview: this.body.replace(/\s+/g, ' ').trim().slice(0, 100),
      };
      window.sableOutbox.add(msg);
      try { window.dispatchEvent(new CustomEvent('sable-mail-sent', { detail: msg })); } catch (e) {}
      sableToast('Email sent to ' + this.to + ' (demo)');
      this.show = false;
    },
  };
}

/* Demo "buy" ribbon: appears ONLY on the public demo host (e.g. a *.vercel.app preview),
   never in the product running on your own domain. Override with window.SABLE_DEMO
   (true/false) and point window.SABLE_BUY_URL at your item page. */
(function () {
  function isDemo() {
    try {
      if (window.SABLE_DEMO === true) return true;
      if (window.SABLE_DEMO === false) return false;
      return /(^|\.)vercel\.app$/i.test(location.hostname);
    } catch (e) { return false; }
  }
  function loadAnalytics() {
    // Vercel Web Analytics: loads ONLY on the public demo host (isDemo), never in the
    // shipped product on a buyer's own domain, so the "no trackers" promise holds.
    if (!isDemo() || document.getElementById('sable-va')) return;
    var s = document.createElement('script');
    s.id = 'sable-va'; s.defer = true; s.src = '/_vercel/insights/script.js';
    (document.head || document.documentElement).appendChild(s);
  }
  loadAnalytics();
  /* Below 640px this is a full-width bar pinned to the bottom (the demo's traffic is ~80%
     mobile, and a corner pill there reads as an ad and covers content). The matching
     body padding keeps it from hiding the last rows. From 640px up it collapses back to a
     compact corner pill. */
  function styles() {
    if (document.getElementById('sable-ribbon-style')) return;
    var st = document.createElement('style');
    st.id = 'sable-ribbon-style';
    st.textContent =
      '#sable-demo-ribbon{position:fixed;z-index:25;left:0;right:0;bottom:0;display:flex;' +
      'align-items:center;justify-content:space-between;gap:12px;text-decoration:none;' +
      'padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px)) 16px;' +
      'font:600 13px/1 Inter,system-ui,sans-serif;background:#12655B;color:#FAF8F5;' +
      'border-top:1px solid rgba(255,255,255,.14);box-shadow:0 -6px 24px -10px rgba(0,0,0,.45);' +
      'transition:transform .15s ease,box-shadow .15s ease}' +
      'body.sable-has-ribbon{padding-bottom:76px}' +
      '@media (min-width:640px){#sable-demo-ribbon{left:auto;right:20px;bottom:20px;' +
      'justify-content:flex-start;border-radius:999px;border:1px solid rgba(255,255,255,.14);' +
      'padding:9px 11px 9px 17px;box-shadow:0 10px 30px -8px rgba(18,101,91,.5)}' +
      'body.sable-has-ribbon{padding-bottom:0}}' +
      '@keyframes sableRibbonGlow{0%,100%{box-shadow:0 10px 30px -8px rgba(18,101,91,.5)}' +
      '50%{box-shadow:0 12px 34px -6px rgba(18,101,91,.75),0 0 0 4px rgba(95,187,172,.28)}}' +
      '@media (prefers-reduced-motion:reduce){#sable-demo-ribbon{animation:none!important}}';
    document.head.appendChild(st);
  }
  function mount() {
    // SABLE_HIDE_RIBBON lets a page opt out (the demo landing has its own CTA) without
    // switching off isDemo(), which analytics is also gated on.
    if (!isDemo() || window.SABLE_HIDE_RIBBON === true) return;
    if (document.getElementById('sable-demo-ribbon')) return;
    // With SABLE_BUY_URL set the ribbon is a buy CTA with price, otherwise a neutral badge.
    var buy = (window.SABLE_BUY_URL || '').trim();
    var a;
    styles();
    if (buy) {
      a = document.createElement('a');
      a.href = buy;
      a.target = '_blank';
      a.rel = 'noopener';
      a.setAttribute('aria-label', 'Get Sable, 22 pages, for $29');
      a.innerHTML =
        '<span style="display:flex;flex-direction:column;gap:3px;line-height:1.15;text-align:left;min-width:0">' +
          '<span style="font-size:10px;letter-spacing:.14em;font-weight:700;color:#9FD4C9">LIVE DEMO</span>' +
          '<span style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
            'Get Sable, 22 pages' +
          '</span>' +
        '</span>' +
        '<span style="display:flex;align-items:center;gap:9px;flex:none">' +
          '<span style="background:#FAF8F5;color:#0E5249;font-weight:700;font-size:13px;padding:5px 10px;border-radius:999px">$29</span>' +
          '<span aria-hidden="true" style="font-size:15px">→</span>' +
        '</span>';
      a.style.animation = 'sableRibbonGlow 2.4s ease-in-out 3';
    } else {
      a = document.createElement('div');
      a.setAttribute('aria-label', 'Live demo');
      a.innerHTML =
        '<span style="display:flex;align-items:center;gap:8px">' +
          '<span aria-hidden="true">✦</span><span style="font-size:14px">Live demo</span>' +
        '</span>';
    }
    a.id = 'sable-demo-ribbon';
    a.onmouseenter = function () { a.style.transform = 'translateY(-1px)'; };
    a.onmouseleave = function () { a.style.transform = 'none'; };
    document.body.appendChild(a);
    document.body.classList.add('sable-has-ribbon');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
