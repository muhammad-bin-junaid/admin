// dash-board.js — Dashboard overview (all figures computed from real orders)

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

    const total = allOrders.length;
    const newOrders = allOrders.filter(o => o.orderStatus === 'New');
    const paid = allOrders.filter(o => o.paymentStatus === 'Paid');
    const pendingPay = allOrders.filter(o => o.paymentStatus === 'Pending');
    const revenue = paid.reduce((s, o) => s + num(o.total), 0);
    const margin = paid.reduce((s, o) => s + profitOf(o), 0);
    const cost = Math.max(0, revenue - margin);
    const expenses = (typeof expensesTotal === 'function') ? expensesTotal() : 0;
    const profit = margin - expenses;
    const delivered = allOrders.filter(o => o.orderStatus === 'Delivered');
    const pendingDelivery = allOrders.filter(o => o.orderStatus !== 'Delivered' && o.orderStatus !== 'Cancelled');

    const cards = '<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">'
        + uiCard('Total Orders', String(total))
        + uiCard('New Orders', String(newOrders.length), 'text-amber-600')
        + uiCard('Paid Orders', String(paid.length), 'text-accent-600')
        + uiCard('Pending Payment', String(pendingPay.length), pendingPay.length ? 'text-amber-600' : '')
        + uiCard('Revenue', rs(revenue), 'text-accent-600')
        + uiCard('Cost (paid orders)', rs(cost))
        + uiCard('Expenses', rs(expenses), expenses ? 'text-amber-600' : '')
        + uiCard('Profit', rs(profit), profit >= 0 ? 'text-accent-600' : 'text-red-600')
        + uiCard('Delivered', String(delivered.length), 'text-accent-600')
        + uiCard('Pending Delivery', String(pendingDelivery.length), pendingDelivery.length ? 'text-amber-600' : '')
        + '</div>';

    // New orders table
    const recent = allOrders.slice(0, 8);
    const recentRows = recent.map(o =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(o.orderId) + '</td>'
        + '<td class="px-4 py-2.5">' + esc(o.name) + '</td>'
        + '<td class="max-w-[220px] truncate px-4 py-2.5 text-zinc-500" title="' + esc(o.itemsText) + '">' + esc(o.itemsText) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right font-semibold">' + rs(o.total) + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.paymentStatus) + '">' + esc(o.paymentStatus) + '</span></td>'
        + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.orderStatus) + '">' + esc(o.orderStatus) + '</span></td>'
        + '</tr>').join('');
    const recentTable = '<div><p class="eyebrow mb-2">Latest Orders</p>'
        + uiTable(['Order #', 'Customer', 'Items', 'Amount', 'Payment', 'Status'], recentRows, 'No orders yet') + '</div>';

    // Most ordered products
    const ordered = orderedQtyMap();
    const ranked = productList()
        .map(p => ({ p: p, qty: ordered.byId[p.id] || 0 }))
        .filter(x => x.qty > 0)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8);
    const maxQty = ranked.length ? ranked[0].qty : 1;
    const rankedRows = ranked.map((x, i) =>
        '<div class="flex items-center gap-3 px-4 py-2">'
        + '<span class="w-5 text-[12px] font-semibold text-zinc-400 tnum">' + (i + 1) + '</span>'
        + '<span class="min-w-0 flex-1 truncate text-sm text-zinc-700 dark:text-zinc-200" title="' + esc(x.p.name) + '">' + esc(x.p.name) + '</span>'
        + '<span class="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06] sm:w-40"><span class="block h-full rounded-full bg-accent-500" style="width:' + Math.max(4, Math.round((x.qty / maxQty) * 100)) + '%"></span></span>'
        + '<span class="w-10 text-right text-[13px] font-semibold tnum text-zinc-900 dark:text-white">' + x.qty + '</span>'
        + '</div>').join('');
    const rankedBox = '<div><p class="eyebrow mb-2">Most Ordered Products</p>'
        + (ranked.length
            ? '<div class="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white shadow-card dark:divide-white/[0.05] dark:border-white/[0.07] dark:bg-[#1F1B16]">' + rankedRows + '</div>'
            : uiEmpty('No product quantities yet — needs orders with known products'))
        + '</div>';

    // Charts
    const s = monthlySeries();
    const charts = '<div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">'
        + chartCard('Monthly Orders', 'Orders placed per month', s.ordersCount.this, s.ordersCount.prev, false, s.thisYear, s.prevYear)
        + chartCard('Monthly Revenue', 'Paid revenue per month', s.revenue.this, s.revenue.prev, true, s.thisYear, s.prevYear)
        + '</div>';

    el.innerHTML = uiHead('Dashboard', 'Dashboard', 'Every number below is computed from your live Orders sheet — nothing is hard-coded.')
        + cards
        + '<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">' + recentTable + rankedBox + '</div>'
        + charts;
}

// ---- CFO dashboard: payments & cash view ----
function renderDashboardFinance(){
    const el = document.getElementById('view-dashboard');
    if (allExpenses === null && typeof loadExpenses === 'function') loadExpenses();

    const total = allOrders.length;
    const paid = allOrders.filter(o => o.paymentStatus === 'Paid');
    const pending = allOrders.filter(o => o.paymentStatus !== 'Paid');
    const paidAmount = paid.reduce((s, o) => s + num(o.total), 0);
    const pendingAmount = pending.reduce((s, o) => s + num(o.total), 0);
    const margin = paid.reduce((s, o) => s + profitOf(o), 0);
    const expenses = (typeof expensesTotal === 'function') ? expensesTotal() : 0;
    const profit = margin - expenses;

    const cards = '<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">'
        + uiCard('Paid Amount', rs(paidAmount), 'text-accent-600')
        + uiCard('Pending Amount', rs(pendingAmount), pendingAmount ? 'text-amber-600' : 'text-accent-600')
        + uiCard('Paid Orders', String(paid.length), 'text-accent-600')
        + uiCard('Payment Pending', String(pending.length), pending.length ? 'text-amber-600' : '')
        + uiCard('Total Orders', String(total))
        + uiCard('Expenses', rs(expenses), expenses ? 'text-amber-600' : '')
        + uiCard('Profit (paid − cost − expenses)', rs(profit), profit >= 0 ? 'text-accent-600' : 'text-red-600')
        + '</div>';

    const pendRows = pending.slice(0, 8).map(o =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(o.orderId) + '</td>'
        + '<td class="px-4 py-2.5">' + esc(o.name) + '</td>'
        + '<td class="px-4 py-2.5 text-[13px] text-zinc-500">' + esc(o.campus || '—') + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right font-semibold">' + rs(o.total) + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.paymentStatus) + '">' + esc(o.paymentStatus) + '</span></td>'
        + '<td class="px-4 py-2.5 whitespace-nowrap text-[13px] text-zinc-500">' + esc(o.timestamp) + '</td>'
        + '</tr>').join('');
    const pendTable = '<div><p class="eyebrow mb-2">Waiting for payment</p>'
        + uiTable(['Order #', 'Customer', 'Campus', 'Amount', 'Payment', 'Date'], pendRows, 'All payments verified — nothing pending') + '</div>';

    const s = monthlySeries();
    const charts = '<div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">'
        + chartCard('Monthly Revenue', 'Paid revenue per month', s.revenue.this, s.revenue.prev, true, s.thisYear, s.prevYear)
        + chartCard('Monthly Orders', 'Orders placed per month', s.ordersCount.this, s.ordersCount.prev, false, s.thisYear, s.prevYear)
        + '</div>';

    el.innerHTML = uiHead('Dashboard', 'Finance Overview', 'Payment collection, expenses and profit. Payment verification lives on the <strong>Finance</strong> page.')
        + cards + pendTable + charts;
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

    const cards = '<div class="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">'
        + uiCard('Undelivered', String(undelivered.length), undelivered.length ? 'text-amber-600' : 'text-accent-600')
        + uiCard('Delivered', String(delivered.length), 'text-accent-600')
        + uiCard('Products Short', String(shortages.length), shortages.length ? 'text-red-600' : 'text-accent-600')
        + uiCard('Open Purchases', String(openPurchases.length), openPurchases.length ? 'text-amber-600' : '')
        + uiCard('Suppliers', String(supplierCount))
        + uiCard('Delivery Records', String(deliveryRows))
        + uiCard('Expenses (month)', rs(monthExp), monthExp ? 'text-amber-600' : '')
        + '</div>';

    const needRows = undelivered.slice(0, 8).map(o =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(o.orderId) + '</td>'
        + '<td class="px-4 py-2.5">' + esc(o.name) + '</td>'
        + '<td class="max-w-[240px] truncate px-4 py-2.5 text-zinc-500" title="' + esc(o.itemsText) + '">' + esc(o.itemsText) + '</td>'
        + '<td class="px-4 py-2.5 text-[13px]">' + esc(o.campus || '—') + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.orderStatus) + '">' + esc(o.orderStatus) + '</span></td>'
        + '</tr>').join('');
    const needTable = '<div><p class="eyebrow mb-2">Needs delivery</p>'
        + uiTable(['Order #', 'Customer', 'Items', 'Campus', 'Status'], needRows, 'Nothing pending delivery') + '</div>';

    const shortRows = shortages.slice(0, 8).map(x =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(x.p.name) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right">' + num(x.p.inventory == null ? 0 : x.p.inventory) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right">' + x.req + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/15 dark:text-red-300">Short by ' + (x.req - num(x.p.inventory == null ? 0 : x.p.inventory)) + '</span></td>'
        + '</tr>').join('');
    const shortTable = '<div><p class="eyebrow mb-2">Stock shortages</p>'
        + uiTable(['Product', 'In stock', 'Required', 'Gap'], shortRows, 'No shortages — stock covers current orders') + '</div>';

    const s = monthlySeries();
    const charts = '<div class="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">'
        + chartCard('Monthly Orders', 'Orders placed per month', s.ordersCount.this, s.ordersCount.prev, false, s.thisYear, s.prevYear)
        + chartCard('Monthly Revenue', 'Paid revenue per month', s.revenue.this, s.revenue.prev, true, s.thisYear, s.prevYear)
        + '</div>';

    el.innerHTML = uiHead('Dashboard', 'Operations Overview', 'Deliveries, stock shortages and purchasing. The Finance page is not part of your role.')
        + cards
        + '<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">' + needTable + shortTable + '</div>'
        + charts;
}

PAGE_RENDERERS.dashboard = renderDashboard;
