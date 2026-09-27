// dash-board.js — Dashboard overview (Sable layout, figures computed from real orders)

let dashRange = 30;

function parseOrderDate(ts){
    const s = String(ts == null ? '' : ts);
    const m = s.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
    if (m){
        let a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = parseInt(m[3], 10);
        if (y < 100) y += 2000;
        let day, month;
        if (a > 12){ day = a; month = b; }
        else if (b > 12){ month = a; day = b; }
        else { day = a; month = b; } // en-PK timestamps are day-first
        const d = new Date(y, month - 1, day);
        if (!isNaN(d.getTime()) && d.getMonth() === month - 1) return d;
    }
    const d2 = new Date(s);
    return isNaN(d2.getTime()) ? null : d2;
}

function parseDateCell(v){
    const m = String(v == null ? '' : v).match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)) : null;
}

function dayKey(d){
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function periodBounds(days, back){
    const end = new Date(); end.setHours(23, 59, 59, 999);
    if (back) end.setDate(end.getDate() - days);
    const start = new Date(end); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (days - 1));
    return { start: start, end: end };
}

function orderInPeriod(o, b){
    const d = parseOrderDate(o.timestamp);
    return !!d && d >= b.start && d <= b.end;
}

function periodExpenses(b){
    const ex = (typeof allExpenses !== 'undefined') ? allExpenses : null;
    if (!ex) return 0;
    return ex.reduce((s, e) => {
        const d = parseDateCell(e.date);
        return (d && d >= b.start && d <= b.end) ? s + num(e.amount) : s;
    }, 0);
}

function periodStats(days, back){
    const b = periodBounds(days, back);
    const list = allOrders.filter(o => orderInPeriod(o, b));
    const paid = list.filter(o => o.paymentStatus === 'Paid');
    const revenue = paid.reduce((s, o) => s + num(o.total), 0);
    const margin = paid.reduce((s, o) => s + profitOf(o), 0);
    const exp = periodExpenses(b);
    return {
        list: list,
        orders: list.length,
        revenue: revenue,
        profit: margin - exp,
        expenses: exp,
        delivered: list.filter(o => o.orderStatus === 'Delivered' || o.orderStatus === 'Shipped').length
    };
}

function dailySeries(days, metric){
    const b = periodBounds(days, false);
    const labels = [];
    const map = {};
    const cur = new Date(b.start);
    while (cur <= b.end){
        labels.push(new Date(cur));
        map[dayKey(cur)] = 0;
        cur.setDate(cur.getDate() + 1);
    }
    allOrders.forEach(o => {
        if (!orderInPeriod(o, b)) return;
        const d = parseOrderDate(o.timestamp);
        const k = dayKey(d);
        if (!(k in map)) return;
        if (metric === 'revenue'){ if (o.paymentStatus === 'Paid') map[k] += num(o.total); }
        else if (metric === 'orders') map[k] += 1;
        else if (metric === 'profit'){ if (o.paymentStatus === 'Paid') map[k] += profitOf(o); }
        else if (metric === 'delivered'){ if (o.orderStatus === 'Delivered' || o.orderStatus === 'Shipped') map[k] += 1; }
    });
    return { labels: labels, values: labels.map(d => map[dayKey(d)]) };
}

function pctDelta(cur, prev){
    if (typeof prev !== 'number' || !isFinite(prev) || prev <= 0) return null;
    return Math.round(((cur - prev) / prev) * 1000) / 10;
}

function greetTitle(){
    let first = '';
    const u = (typeof currentUserObj === 'function') ? currentUserObj() : null;
    if (u) first = String(u.name || u.email || '').split(/[@\s]/)[0];
    const h = new Date().getHours();
    const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    return first ? part + ', ' + first : part;
}

function sableHead(eyebrow, title, sub, right){
    return '<header class="mb-5">'
        + '<p class="eyebrow text-accent-600 dark:text-accent-400">' + esc(eyebrow) + '</p>'
        + '<div class="mt-1.5 flex flex-wrap items-end justify-between gap-3">'
        + '<div><h1 class="font-display text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">' + esc(title) + '</h1>'
        + '<p class="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">' + sub + '</p></div>'
        + (right || '') + '</div></header>';
}

function rangeToggleHtml(withOrdersBtn){
    const opts = [[7, '7d'], [30, '30d'], [90, '90d']];
    let seg = '<div class="inline-flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-zinc-50 p-0.5 text-[12px] font-semibold dark:border-white/[0.08] dark:bg-white/[0.04]">';
    opts.forEach(o => {
        const on = dashRange === o[0];
        seg += '<button type="button" onclick="setDashRange(' + o[0] + ')" class="rounded-md px-2.5 py-1.5 transition-colors '
            + (on ? 'bg-white text-zinc-900 shadow-sm dark:bg-white/[0.1] dark:text-white' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200')
            + '">' + o[1] + '</button>';
    });
    seg += '</div>';
    if (withOrdersBtn){
        seg += '<button type="button" onclick="showPage(\'orders\')" class="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-700">View orders</button>';
    }
    return '<div class="flex flex-wrap items-center gap-2">' + seg + '</div>';
}

function iconSvg(kind){
    const open = '<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
    const paths = {
        revenue: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.2"/><path d="M6 12h.01M18 12h.01"/>',
        orders: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
        profit: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
        delivered: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
        pending: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        expenses: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>',
        alerts: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
        cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>'
    };
    return open + (paths[kind] || paths.orders) + '</svg>';
}

function sparkSvg(vals){
    if (!vals || vals.length < 2) return '';
    const W = 120, H = 34;
    const max = Math.max.apply(null, vals);
    const min = Math.min.apply(null, vals);
    const span = (max - min) || 1;
    const n = vals.length;
    let line = '';
    vals.forEach((v, i) => {
        const x = (i / (n - 1)) * W;
        const y = H - 4 - ((v - min) / span) * (H - 9);
        line += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    });
    const area = line + ' L' + W + ',' + H + ' L0,' + H + ' Z';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="h-10 w-full" aria-hidden="true">'
        + '<path d="' + area + '" fill="var(--accent)" fill-opacity="0.12"></path>'
        + '<path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></path></svg>';
}

function kpiCard(o){
    let foot = '';
    if (o.delta != null && isFinite(o.delta)){
        const up = o.delta >= 0;
        foot = '<span class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold '
            + (up ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-400' : 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300') + '">'
            + '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="' + (up ? 'm18 15-6-6-6 6' : 'm6 9 6 6 6-6') + '"/></svg>'
            + Math.abs(o.delta) + '%</span>'
            + '<span class="text-[11px] text-zinc-500 dark:text-zinc-400">vs previous ' + dashRange + 'd</span>';
    } else {
        foot = '<span class="text-[11px] text-zinc-500 dark:text-zinc-400">' + esc(o.note || '') + '</span>';
    }
    return '<article class="rounded-xl border border-zinc-200 bg-white p-4 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<div class="flex items-start justify-between gap-2">'
        + '<p class="eyebrow text-zinc-500 dark:text-zinc-400">' + esc(o.title) + '</p>'
        + '<span class="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-400">' + o.icon + '</span></div>'
        + '<p class="tnum mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">' + o.value + '</p>'
        + '<div class="mt-2 flex flex-wrap items-center gap-1.5">' + foot + '</div>'
        + (o.spark && o.spark.length > 1 ? '<div class="mt-3 text-zinc-400 dark:text-zinc-500">' + sparkSvg(o.spark) + '</div>' : '')
        + '</article>';
}

function areaChartSvg(series){
    const vals = series.values, labels = series.labels;
    if (!vals.length) return '';
    const W = 720, H = 250, padL = 52, padR = 14, padT = 14, padB = 30;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const max = Math.max(1, Math.max.apply(null, vals));
    let grid = '';
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
        const y = padT + plotH - plotH * t;
        const v = Math.round(max * t);
        const lbl = v >= 1000 ? (Math.round(v / 100) / 10) + 'k' : String(v);
        grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + y.toFixed(1) + '" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>'
            + '<text x="' + (padL - 8) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="10" fill="currentColor" fill-opacity="0.6">' + lbl + '</text>';
    });
    const n = vals.length;
    const xAt = i => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const yAt = v => padT + plotH - (v / max) * plotH;
    let line = '';
    vals.forEach((v, i) => { line += (i ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(v).toFixed(1); });
    const area = line + ' L' + xAt(n - 1).toFixed(1) + ',' + (padT + plotH) + ' L' + xAt(0).toFixed(1) + ',' + (padT + plotH) + ' Z';
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let xlab = '';
    const step = Math.max(1, Math.ceil(n / 6));
    for (let i = 0; i < n; i += step){
        xlab += '<text x="' + xAt(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="currentColor" fill-opacity="0.6">'
            + labels[i].getDate() + ' ' + MONTHS[labels[i].getMonth()] + '</text>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full" style="height:250px" role="img" aria-label="Daily paid revenue">'
        + grid
        + '<path d="' + area + '" fill="var(--accent)" fill-opacity="0.14"></path>'
        + '<path d="' + line + '" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>'
        + xlab + '</svg>';
}

function pairCounts(list, keyFn){
    const m = {};
    list.forEach(o => {
        const k = String(keyFn(o) || '').trim() || 'Unknown';
        m[k] = (m[k] || 0) + 1;
    });
    return Object.keys(m).map(k => ({ label: k, value: m[k] })).sort((a, b) => b.value - a.value).slice(0, 8);
}

function distCard(title, sub, pairs){
    const total = pairs.reduce((s, p) => s + p.value, 0);
    const max = Math.max(1, Math.max.apply(null, pairs.map(p => p.value)));
    const rows = pairs.length
        ? pairs.map(p =>
            '<div class="py-2">'
            + '<div class="flex items-baseline justify-between gap-2 text-[13px]"><span class="truncate font-medium text-zinc-700 dark:text-zinc-200">' + esc(p.label) + '</span>'
            + '<span class="tnum shrink-0 text-[12px] font-semibold text-zinc-900 dark:text-white">' + p.value + '</span></div>'
            + '<div class="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.04]"><span class="block h-full rounded-full bg-accent-500" style="width:' + Math.max(3, Math.round((p.value / max) * 100)) + '%"></span></div>'
            + '</div>').join('')
        : '<p class="py-6 text-center text-sm text-zinc-500">No data yet</p>';
    return '<div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<div class="flex items-center justify-between gap-2">'
        + '<span class="eyebrow text-zinc-500 dark:text-zinc-400">' + esc(title) + '</span>'
        + '<span class="tnum text-[12px] font-semibold text-accent-600">' + total + '</span></div>'
        + '<p class="mt-0.5 text-[12px] text-zinc-500">' + esc(sub) + '</p>'
        + '<div class="mt-3">' + rows + '</div></div>';
}

function sectionCard(title, sub, right, body){
    return '<section class="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<div class="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-white/[0.06]">'
        + '<div><p class="font-display text-[15px] font-semibold text-zinc-900 dark:text-white">' + esc(title) + '</p>'
        + (sub ? '<p class="text-[12px] text-zinc-500">' + esc(sub) + '</p>' : '') + '</div>'
        + (right || '') + '</div>' + body + '</section>';
}

function sableTable(headCells, rows, emptyMsg){
    const th = headCells.map(h => '<th class="px-5 py-3 font-semibold' + (h.right ? ' text-right' : '') + '">' + esc(h.label) + '</th>').join('');
    return '<div class="overflow-x-auto"><table class="w-full text-left text-sm">'
        + '<thead><tr class="border-b border-zinc-100 text-[11px] uppercase tracking-wider text-zinc-500 dark:border-white/[0.06] dark:text-zinc-400">' + th + '</tr></thead>'
        + '<tbody class="divide-y divide-zinc-100 dark:divide-white/[0.05]">'
        + (rows || '<tr><td colspan="' + headCells.length + '" class="px-5 py-8 text-center text-sm text-zinc-500">' + esc(emptyMsg) + '</td></tr>')
        + '</tbody></table></div>';
}

function avatarChip(name){
    const n = String(name == null ? '' : name).trim() || '?';
    const parts = n.split(/\s+/);
    const ini = (parts.length > 1 && parts[1] ? parts[0].charAt(0) + parts[1].charAt(0) : parts[0].slice(0, 2)).toUpperCase();
    const st = (typeof sableAvatarStyle === 'function') ? sableAvatarStyle(n) : '';
    return '<span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold" style="' + st + '">' + esc(ini) + '</span>';
}

function sableFooter(){
    return '<footer class="mt-8 flex flex-col items-center justify-between gap-2 border-t border-zinc-200 py-5 text-[12px] text-zinc-500 dark:border-white/[0.06] dark:text-zinc-400 sm:flex-row">'
        + '<span>&#169; 2026 Makers Era &#8226; Admin console</span>'
        + '<span>Everything is computed from your live Google Sheet.</span></footer>';
}

function monthlySeries(){
    const now = new Date();
    const thisYear = now.getFullYear(), prevYear = thisYear - 1;
    const ordersCount = { this: new Array(12).fill(0), prev: new Array(12).fill(0) };
    const revenue = { this: new Array(12).fill(0), prev: new Array(12).fill(0) };
    allOrders.forEach(o => {
        const d = parseOrderDate(o.timestamp);
        if (!d) return;
        const year = d.getFullYear(), month = d.getMonth();
        if (year === thisYear){
            ordersCount.this[month]++;
            if (o.paymentStatus === 'Paid') revenue.this[month] += num(o.total);
        } else if (year === prevYear){
            ordersCount.prev[month]++;
            if (o.paymentStatus === 'Paid') revenue.prev[month] += num(o.total);
        }
    });
    return { ordersCount, revenue, thisYear, prevYear };
}

function monthlyChart(valsThis, valsPrev, money){
    const W = 720, H = 210, padL = 46, padB = 24, padT = 10;
    const max = Math.max(1, ...valsThis, ...valsPrev);
    const plotW = W - padL - 10, plotH = H - padB - padT;
    const groupW = plotW / 12;
    const barW = Math.min(16, groupW / 2.6);
    const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
    const fmt = v => money && v >= 1000 ? (Math.round(v / 1000) + 'k') : String(v);

    let bars = '', labels = '', grid = '';
    [0, 0.5, 1].forEach(t => {
        const y = padT + plotH - plotH * t;
        grid += '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (W - 10) + '" y2="' + y.toFixed(1) + '" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>'
              + '<text x="' + (padL - 6) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end" font-size="9" fill="currentColor" fill-opacity="0.55">' + fmt(Math.round(max * t)) + '</text>';
    });
    for (let i = 0; i < 12; i++){
        const gx = padL + i * groupW + groupW / 2;
        const hThis = (valsThis[i] / max) * plotH;
        const hPrev = (valsPrev[i] / max) * plotH;
        bars += '<rect class="bar-prev" x="' + (gx - barW - 1.5).toFixed(1) + '" y="' + (padT + plotH - hPrev).toFixed(1) + '" width="' + barW + '" height="' + Math.max(0, hPrev).toFixed(1) + '" rx="2"><title>Prev year ' + months[i] + ': ' + valsPrev[i] + '</title></rect>';
        bars += '<rect class="bar-this" x="' + (gx + 1.5).toFixed(1) + '" y="' + (padT + plotH - hThis).toFixed(1) + '" width="' + barW + '" height="' + Math.max(0, hThis).toFixed(1) + '" rx="2"><title>This year ' + months[i] + ': ' + (money ? rs(valsThis[i]) : valsThis[i]) + '</title></rect>';
        labels += '<text x="' + gx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="currentColor" fill-opacity="0.6">' + months[i] + '</text>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full" style="height:210px" role="img">'
        + grid + bars + labels + '</svg>';
}

function chartCard(title, subtitle, valsThis, valsPrev, money, thisYear, prevYear){
    const totalThis = valsThis.reduce((s, v) => s + v, 0);
    const totalPrev = valsPrev.reduce((s, v) => s + v, 0);
    const fmtT = v => money ? rs(v.toLocaleString()) : v.toLocaleString();
    return '<div class="rounded-xl border border-zinc-200 bg-white p-4 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<div class="flex flex-wrap items-baseline justify-between gap-2">'
        + '<div><p class="font-display text-[15px] font-semibold text-zinc-900 dark:text-white">' + title + '</p>'
        + '<p class="text-[12px] text-zinc-500">' + subtitle + '</p></div>'
        + '<div class="text-right text-[12px]"><div class="text-accent-600 font-semibold">' + thisYear + ': ' + fmtT(totalThis) + '</div>'
        + '<div class="text-zinc-500">' + prevYear + ': ' + fmtT(totalPrev) + '</div></div></div>'
        + '<div class="mt-2">' + monthlyChart(valsThis, valsPrev, money) + '</div>'
        + '<div class="mt-1 flex items-center gap-4 text-[11px] text-zinc-500">'
        + '<span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm" style="background:#22C55E"></span>' + thisYear + '</span>'
        + '<span class="flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm bar-prev" style="background:#A8A29E"></span>' + prevYear + '</span>'
        + '</div></div>';
}

function renderDashboard(){
    const el = document.getElementById('view-dashboard');
    if (!el) return;
    if (!isAuthed()){ el.innerHTML = uiHead('Dashboard', 'Sign in required', '') + uiEmpty('Sign in to see the dashboard'); return; }
    const role = currentRole();
    if (role === 'CFO') return renderDashboardFinance();
    if (role === 'COO') return renderDashboardOps();
    // expenses come from the Expenses sheet (loaded by dash-fin.js)
    if (allExpenses === null && typeof loadExpenses === 'function') loadExpenses();

    const cur = periodStats(dashRange, false);
    const prev = periodStats(dashRange, true);
    const revSeries = dailySeries(dashRange, 'revenue');
    const ordSeries = dailySeries(dashRange, 'orders');
    const proSeries = dailySeries(dashRange, 'profit');
    const delSeries = dailySeries(dashRange, 'delivered');

    const kpis = '<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">'
        + kpiCard({ title: 'Net revenue', value: rs(cur.revenue), delta: pctDelta(cur.revenue, prev.revenue), note: 'paid orders · last ' + dashRange + 'd', icon: iconSvg('revenue'), spark: revSeries.values })
        + kpiCard({ title: 'Orders', value: String(cur.orders), delta: pctDelta(cur.orders, prev.orders), note: 'placed · last ' + dashRange + 'd', icon: iconSvg('orders'), spark: ordSeries.values })
        + kpiCard({ title: 'Profit', value: rs(cur.profit), delta: pctDelta(cur.profit, prev.profit), note: 'revenue − cost − expenses', icon: iconSvg('profit'), spark: proSeries.values })
        + kpiCard({ title: 'Delivered', value: String(cur.delivered), delta: pctDelta(cur.delivered, prev.delivered), note: 'shipped or delivered', icon: iconSvg('delivered'), spark: delSeries.values })
        + '</section>';

    const chartRow = '<section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">'
        + '<div class="rounded-xl border border-zinc-200 bg-white p-5 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16] lg:col-span-2">'
        + '<div class="flex flex-wrap items-end justify-between gap-2"><div>'
        + '<p class="eyebrow text-zinc-500 dark:text-zinc-400">Net revenue</p>'
        + '<p class="mt-0.5 text-[12px] text-zinc-500">Paid revenue &#8226; last ' + dashRange + ' days</p></div>'
        + '<p class="tnum font-display text-xl font-semibold text-zinc-900 dark:text-white">' + rs(cur.revenue) + '</p></div>'
        + '<div class="mt-3 text-zinc-500 dark:text-zinc-400">' + areaChartSvg(revSeries) + '</div></div>'
        + distCard('Orders by campus', 'last ' + dashRange + ' days', pairCounts(cur.list, o => o.campus))
        + '</section>';

    const recent = cur.list.slice(0, 6);
    const recentRows = recent.map(o =>
        '<tr class="cursor-pointer transition-colors hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]" onclick="jumpToOrder(\'' + esc(String(o.orderId)) + '\')">'
        + '<td class="tnum px-5 py-3.5 font-medium text-accent-600">#' + esc(String(o.orderId)) + '</td>'
        + '<td class="px-5 py-3.5"><div class="flex items-center gap-2.5">' + avatarChip(o.name)
        + '<span class="text-[13px] text-zinc-700 dark:text-zinc-200">' + esc(o.name) + '</span></div></td>'
        + '<td class="tnum px-5 py-3.5 text-right text-[13px] font-semibold text-zinc-900 dark:text-white">' + rs(o.total) + '</td>'
        + '<td class="px-5 py-3.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.paymentStatus) + '">' + esc(o.paymentStatus) + '</span></td>'
        + '<td class="px-5 py-3.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.orderStatus) + '">' + esc(o.orderStatus) + '</span></td>'
        + '</tr>').join('');
    const recentCard = sectionCard('Recent orders', 'Newest first',
        '<button type="button" onclick="showPage(\'orders\')" class="text-[12px] font-semibold text-accent-600 hover:text-accent-700">View all</button>',
        sableTable([{ label: 'Order' }, { label: 'Customer' }, { label: 'Amount', right: true }, { label: 'Payment' }, { label: 'Status' }],
            recentRows, 'No orders yet'));

    const ordered = orderedQtyMap();
    const ranked = productList()
        .map(p => ({ p: p, qty: ordered.byId[p.id] || 0 }))
        .filter(x => x.qty > 0)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8);
    const maxQty = ranked.length ? ranked[0].qty : 1;
    const rankedRows = ranked.map((x, i) =>
        '<div class="flex items-center gap-3 px-5 py-2.5">'
        + '<span class="tnum w-5 text-[12px] font-semibold text-zinc-400">' + (i + 1) + '</span>'
        + '<span class="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-200" title="' + esc(x.p.name) + '">' + esc(x.p.name) + '</span>'
        + '<span class="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.04] sm:w-40"><span class="block h-full rounded-full bg-accent-500" style="width:' + Math.max(4, Math.round((x.qty / maxQty) * 100)) + '%"></span></span>'
        + '<span class="tnum w-10 text-right text-[13px] font-semibold text-zinc-900 dark:text-white">' + x.qty + '</span>'
        + '</div>').join('');
    const rankedBody = ranked.length
        ? '<div class="divide-y divide-zinc-100 py-1 dark:divide-white/[0.05]">' + rankedRows + '</div>'
        : '<p class="px-5 py-8 text-center text-sm text-zinc-500">No product quantities yet — needs orders with known products</p>';
    const rankedCard = sectionCard('Most ordered', 'All-time units by product', '', rankedBody);

    el.innerHTML = sableHead('Store overview', greetTitle(), 'Here is how Makers Era is performing.', rangeToggleHtml(true))
        + kpis + chartRow + recentCard + rankedCard + sableFooter();
}

function setDashRange(d){
    dashRange = d;
    renderDashboard();
}

// ---- CFO dashboard: payments & cash view ----
function renderDashboardFinance(){
    const el = document.getElementById('view-dashboard');
    if (allExpenses === null && typeof loadExpenses === 'function') loadExpenses();

    const cur = periodStats(dashRange, false);
    const prev = periodStats(dashRange, true);
    const pending = allOrders.filter(o => o.paymentStatus !== 'Paid');
    const pendingAmount = pending.reduce((s, o) => s + num(o.total), 0);

    const kpis = '<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">'
        + kpiCard({ title: 'Paid amount', value: rs(cur.revenue), delta: pctDelta(cur.revenue, prev.revenue), note: 'last ' + dashRange + 'd', icon: iconSvg('revenue'), spark: dailySeries(dashRange, 'revenue').values })
        + kpiCard({ title: 'Pending amount', value: rs(pendingAmount), note: 'awaiting verification', icon: iconSvg('pending') })
        + kpiCard({ title: 'Expenses', value: rs(cur.expenses), delta: pctDelta(cur.expenses, prev.expenses), note: 'last ' + dashRange + 'd', icon: iconSvg('expenses') })
        + kpiCard({ title: 'Profit', value: rs(cur.profit), delta: pctDelta(cur.profit, prev.profit), note: 'revenue − cost − expenses', icon: iconSvg('profit') })
        + '</section>';

    const pendRows = pending.slice(0, 8).map(o =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(o.orderId) + '</td>'
        + '<td class="px-4 py-2.5">' + esc(o.name) + '</td>'
        + '<td class="px-4 py-2.5 text-[13px] text-zinc-500">' + esc(o.campus || '—') + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right font-semibold">' + rs(o.total) + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.paymentStatus) + '">' + esc(o.paymentStatus) + '</span></td>'
        + '<td class="px-4 py-2.5 whitespace-nowrap text-[13px] text-zinc-500">' + esc(o.timestamp) + '</td>'
        + '</tr>').join('');
    const pendTable = '<div class="mt-4"><p class="eyebrow mb-2">Waiting for payment</p>'
        + uiTable(['Order #', 'Customer', 'Campus', 'Amount', 'Payment', 'Date'], pendRows, 'All payments verified — nothing pending') + '</div>';

    const s = monthlySeries();
    const charts = '<div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">'
        + chartCard('Monthly Revenue', 'Paid revenue per month', s.revenue.this, s.revenue.prev, true, s.thisYear, s.prevYear)
        + chartCard('Monthly Orders', 'Orders placed per month', s.ordersCount.this, s.ordersCount.prev, false, s.thisYear, s.prevYear)
        + '</div>';

    el.innerHTML = sableHead('Finance overview', greetTitle(),
            'Payment collection, expenses and profit for the selected range. Verification lives on the <strong>Finance</strong> page.',
            rangeToggleHtml(false))
        + kpis + pendTable + charts + sableFooter();
}

// ---- COO dashboard: operations view ----
let dashTried = {};
function dashKick(key, flag, loader){
    if (flag || dashTried[key]) return;
    dashTried[key] = true;
    Promise.resolve(loader()).then(() => { if (activePage === 'dashboard') renderDashboard(); }).catch(() => {});
}
function renderDashboardOps(){
    const el = document.getElementById('view-dashboard');
    if (allExpenses === null && typeof loadExpenses === 'function') loadExpenses();
    if (typeof loadSuppliers === 'function') dashKick('sup', suppliersInit, loadSuppliers);
    if (typeof loadPurchases === 'function') dashKick('pur', purchasesInit, loadPurchases);
    if (typeof loadDeliveries === 'function') dashKick('dlv', deliveriesInit, loadDeliveries);

    const delivered = allOrders.filter(o => o.orderStatus === 'Delivered');
    const undelivered = allOrders.filter(o => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled');
    const required = requiredQtyMap();
    const shortages = productList()
        .map(p => ({ p: p, req: required.byId[p.id] || 0, st: stockStatus_(p, required.byId[p.id] || 0) }))
        .filter(x => x.st.label === 'Shortage');
    const openPurchases = (typeof allPurchases !== 'undefined' ? allPurchases : []).filter(p => p.status !== 'Received');
    const supplierCount = (typeof allSuppliers !== 'undefined' ? allSuppliers : []).length;
    const deliveryRows = (typeof allDeliveries !== 'undefined' ? allDeliveries : []).length;
    const monthExp = (typeof expensesThisMonth === 'function') ? expensesThisMonth() : 0;

    const kpis = '<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">'
        + kpiCard({ title: 'Undelivered', value: String(undelivered.length), note: 'New + Processing + Shipped', icon: iconSvg('pending') })
        + kpiCard({ title: 'Delivered', value: String(delivered.length), note: 'all time', icon: iconSvg('delivered') })
        + kpiCard({ title: 'Products short', value: String(shortages.length), note: 'across catalog', icon: iconSvg('alerts') })
        + kpiCard({ title: 'Open purchases', value: String(openPurchases.length), note: 'not yet received', icon: iconSvg('cart') })
        + '</section>';

    const statsRow = '<section class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">'
        + kpiCard({ title: 'Suppliers', value: String(supplierCount), note: 'on file', icon: iconSvg('orders') })
        + kpiCard({ title: 'Delivery records', value: String(deliveryRows), note: 'logged', icon: iconSvg('delivered') })
        + kpiCard({ title: 'Expenses (month)', value: rs(monthExp), note: 'this month', icon: iconSvg('expenses') })
        + kpiCard({ title: 'Short products', value: String(shortages.length), note: 'needs restock', icon: iconSvg('alerts') })
        + '</section>';

    const needRows = undelivered.slice(0, 8).map(o =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(o.orderId) + '</td>'
        + '<td class="px-4 py-2.5">' + esc(o.name) + '</td>'
        + '<td class="max-w-[240px] truncate px-4 py-2.5 text-zinc-500" title="' + esc(o.itemsText) + '">' + esc(o.itemsText) + '</td>'
        + '<td class="px-4 py-2.5 text-[13px]">' + esc(o.campus || '—') + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.orderStatus) + '">' + esc(o.orderStatus) + '</span></td>'
        + '</tr>').join('');
    const needTable = '<div class="mt-4"><p class="eyebrow mb-2">Needs delivery</p>'
        + uiTable(['Order #', 'Customer', 'Items', 'Campus', 'Status'], needRows, 'Nothing pending delivery') + '</div>';

    const shortRows = shortages.slice(0, 8).map(x =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(x.p.name) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right">' + num(x.p.inventory == null ? 0 : x.p.inventory) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right">' + x.req + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/15 dark:text-red-300">Short by ' + (x.req - num(x.p.inventory == null ? 0 : x.p.inventory)) + '</span></td>'
        + '</tr>').join('');
    const shortTable = '<div class="mt-4"><p class="eyebrow mb-2">Stock shortages</p>'
        + uiTable(['Product', 'In stock', 'Required', 'Gap'], shortRows, 'No shortages — stock covers current orders') + '</div>';

    const s = monthlySeries();
    const charts = '<div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">'
        + chartCard('Monthly Orders', 'Orders placed per month', s.ordersCount.this, s.ordersCount.prev, false, s.thisYear, s.prevYear)
        + chartCard('Monthly Revenue', 'Paid revenue per month', s.revenue.this, s.revenue.prev, true, s.thisYear, s.prevYear)
        + '</div>';

    el.innerHTML = sableHead('Operations overview', greetTitle(),
            'Deliveries, stock shortages and purchasing. The Finance page is not part of your role.')
        + kpis + statsRow + needTable + shortTable + charts + sableFooter();
}

PAGE_RENDERERS.dashboard = renderDashboard;
