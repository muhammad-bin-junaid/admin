// dash-ops.js — Operations: Suppliers, Inventory, Purchases, Deliveries
let allSuppliers = [], suppliersErr = null, suppliersLoading = false, suppliersInit = false;
let allPurchases = [], purchasesErr = null, purchasesLoading = false, purchasesInit = false;
let allDeliveries = [], deliveriesErr = null, deliveriesInit = false;
let supplierFormId = null;     // null = adding
let supplierDrawerId = null;
let dlvrCampus = '', dlvrWeek = true, dlvrStatus = 'needs';

function opsNoToken(){ return uiHead('Operations', 'Sign in required', '') + uiEmpty('Sign in to see this page'); }

// ==================== LOADERS ====================
async function loadSuppliers(){
    if (!getToken()) return;
    suppliersLoading = true; suppliersErr = null; if (activePage === 'suppliers') renderSuppliers();
    try {
        const data = await apiGet('suppliers');
        if (data && data.success){ allSuppliers = data.suppliers || []; suppliersInit = true; }
        else suppliersErr = (data && data.error) || 'Failed to load suppliers';
    } catch(e){ suppliersErr = 'Connection error: ' + e.message; }
    suppliersLoading = false;
    if (activePage === 'suppliers') renderSuppliers();
}
async function loadPurchases(){
    if (!getToken()) return;
    purchasesLoading = true; purchasesErr = null; if (activePage === 'purchases') renderPurchases();
    try {
        const data = await apiGet('purchases');
        if (data && data.success){ allPurchases = data.purchases || []; purchasesInit = true; }
        else purchasesErr = (data && data.error) || 'Failed to load purchases';
    } catch(e){ purchasesErr = 'Connection error: ' + e.message; }
    purchasesLoading = false;
    if (activePage === 'purchases') renderPurchases();
}
async function loadDeliveries(){
    if (!getToken()) return;
    try {
        const data = await apiGet('deliveries');
        if (data && data.success){ allDeliveries = data.deliveries || []; deliveriesInit = true; }
        else deliveriesErr = (data && data.error) || 'Failed to load deliveries';
    } catch(e){ deliveriesErr = 'Connection error: ' + e.message; }
    if (activePage === 'deliveries') renderDeliveries();
}
function missingApiBanner(err){
    if (!err) return '';
    const missing = /unknown action/i.test(err);
    const cls = missing
        ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200'
        : 'border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300';
    return '<div class="mb-4 rounded-lg border p-4 text-sm ' + cls + '">' + esc(err)
        + (missing ? ' — redeploy <code>apps-script/Code.gs</code> (Deploy → Manage deployments → New version) and reload.' : '')
        + '</div>';
}

// ==================== SUPPLIERS ====================
function supplierPurchaseList(sup){
    return allPurchases.filter(p =>
        (sup.id && p.supplierId === sup.id) ||
        (sup.name && p.supplier && p.supplier.toLowerCase() === String(sup.name).toLowerCase())
    ).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function supplierLastPurchase(sup){
    const list = supplierPurchaseList(sup);
    return list.length ? list[0] : null;
}
function supplierProductSummary(sup){
    const byProduct = {};
    supplierPurchaseList(sup).forEach(p => {
        const key = p.product || ('Product #' + p.productId);
        if (!byProduct[key]) byProduct[key] = { name: key, count: 0, lastPrice: 0, lastDate: '' };
        byProduct[key].count += num(p.qty);
        if (!byProduct[key].lastDate || String(p.date) >= byProduct[key].lastDate){
            byProduct[key].lastPrice = p.unitCost;
            byProduct[key].lastDate = p.date;
        }
    });
    return Object.values(byProduct);
}
function supplierLinkedProducts(sup){
    return (sup.productIds || []).map(id => productList().find(p => p.id === id)).filter(Boolean);
}
function supplierAllProductNames(sup){
    const names = supplierLinkedProducts(sup).map(p => p.name);
    supplierProductSummary(sup).forEach(x => { if (names.indexOf(x.name) < 0) names.push(x.name); });
    return names;
}
function openSupplierForm(id){
    if (!can('suppliers.write')) return showToast('Your role cannot edit suppliers', 'error');
    supplierFormId = (id == null ? null : id);
    const s = id == null ? null : allSuppliers.find(x => x.id === id);
    const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v; };
    set('supName', s ? s.name : '');
    set('supContact', s ? s.contactPerson : '');
    set('supPhone', s ? s.phone : '');
    set('supWa', s ? s.whatsapp : '');
    set('supEmail', s ? s.email : '');
    set('supAddr', s ? s.address : '');
    set('supCity', s ? s.city : '');
    set('supNotes', s ? s.notes : '');
    const ids = s ? (s.productIds || []) : [];
    document.querySelectorAll('.sup-prod').forEach(cb => { cb.checked = ids.indexOf(parseInt(cb.value, 10)) >= 0; });
    const t = document.getElementById('supFormTitle');
    if (t) t.textContent = s ? ('Edit ' + s.name) : 'Add Supplier';
    const f = document.getElementById('supplierForm');
    if (f){ f.style.display = ''; f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    const n = document.getElementById('supName'); if (n) n.focus();
}
function closeSupplierForm(){
    const f = document.getElementById('supplierForm');
    if (f) f.style.display = 'none';
    supplierFormId = null;
}
async function saveSupplier(){
    if (!can('suppliers.write')) return showToast('Your role cannot edit suppliers', 'error');
    const g = k => (document.getElementById(k).value || '').trim();
    const params = {
        name: g('supName'), contactPerson: g('supContact'), phone: g('supPhone'),
        whatsapp: g('supWa'), email: g('supEmail'), address: g('supAddr'),
        city: g('supCity'), notes: g('supNotes')
    };
    if (!params.name) return showToast('Supplier name is required', 'error');
    let savedId = supplierFormId;
    try {
        if (supplierFormId == null){
            const data = await apiGet('addSupplier', params);
            if (data && data.success){ savedId = data.id; showToast('Supplier added', 'success'); logLocal('Supplier added', params.name); }
            else return showToast((data && data.error) || 'Save failed', 'error');
        } else {
            params.id = supplierFormId;
            const data = await apiGet('updateSupplier', params);
            if (data && data.success){ showToast('Supplier updated', 'success'); logLocal('Supplier updated', params.name); }
            else return showToast((data && data.error) || 'Save failed', 'error');
        }
        // save ticked products to the SupplierProducts sheet
        const ids = [...document.querySelectorAll('.sup-prod:checked')].map(cb => cb.value).join(',');
        if (savedId){
            try { await apiGet('setSupplierProducts', { supplierId: savedId, productIds: ids }); }
            catch(e){ showToast('Saved, but products link failed: ' + e.message, 'error'); }
        }
        closeSupplierForm();
        await loadSuppliers();
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}
async function deleteSupplierRow(id){
    if (!can('suppliers.write')) return showToast('Your role cannot delete suppliers', 'error');
    const s = allSuppliers.find(x => x.id === id); if (!s) return;
    if (!confirm('Delete supplier "' + s.name + '"? Purchase history stays.')) return;
    try {
        const data = await apiGet('deleteSupplier', { id });
        if (data && data.success){
            showToast('Supplier deleted', 'success');
            logLocal('Supplier deleted', s.name);
            if (supplierDrawerId === id) supplierDrawerId = null;
            await loadSuppliers();
        } else showToast((data && data.error) || 'Delete failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}
function viewSupplier(id){ supplierDrawerId = id; renderSuppliers(); }
function closeSupplierDrawer(){ supplierDrawerId = null; renderSuppliers(); }

function renderSuppliers(){
    const el = document.getElementById('view-suppliers');
    if (!el) return;
    if (!getToken()){ el.innerHTML = opsNoToken(); return; }
    if (!suppliersInit && !suppliersLoading) loadSuppliers();
    if (!productsLoaded) loadProducts();

    const rows = allSuppliers.map(s => {
        const hist = supplierPurchaseList(s);
        const last = hist[0];
        const names = supplierAllProductNames(s);
        return '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
            + '<td class="px-4 py-3 font-medium text-zinc-900 dark:text-white">' + esc(s.name)
            + '<div class="text-[11px] text-zinc-400">' + esc(s.id) + (s.contactPerson ? ' · ' + esc(s.contactPerson) : '') + '</div></td>'
            + '<td class="px-4 py-3">' + (s.phone
                ? '<a href="https://wa.me/' + waNumber(s.phone) + '" target="_blank" rel="noopener" class="text-accent-600 hover:underline">' + esc(s.phone) + '</a>'
                : (s.whatsapp ? esc(s.whatsapp) : '—')) + '</td>'
            + '<td class="px-4 py-3">' + esc(s.city || '—') + '</td>'
            + '<td class="px-4 py-3 text-[13px]">' + (names.length ? esc(names.slice(0, 2).join(', ')) + (names.length > 2 ? ' <span class="text-zinc-400">+' + (names.length - 2) + '</span>' : '') : '<span class="text-zinc-400">—</span>') + '</td>'
            + '<td class="px-4 py-3 text-[13px] text-zinc-500">' + (last ? esc(last.product) + '<div class="text-[11px]">' + esc(last.date) + ' · Rs.' + num(last.unitCost) + '</div>' : '—') + '</td>'
            + '<td class="px-4 py-3 whitespace-nowrap text-right">'
            + '<button onclick="viewSupplier(\'' + esc(s.id) + '\')" class="mr-2 text-[12px] font-medium text-accent-600 hover:underline">View</button>'
            + (can('suppliers.write')
                ? '<button onclick="openSupplierForm(\'' + esc(s.id) + '\')" class="mr-2 text-[12px] font-medium text-zinc-500 hover:underline">Edit</button>'
                  + '<button onclick="deleteSupplierRow(\'' + esc(s.id) + '\')" class="text-[12px] font-medium text-red-600 hover:underline">Delete</button>'
                : '<span class="text-[12px] text-zinc-400">—</span>')
            + '</td></tr>';
    }).join('');

    // Drawer
    let drawer = '';
    const ds = supplierDrawerId ? allSuppliers.find(x => x.id === supplierDrawerId) : null;
    if (ds){
        const hist = supplierPurchaseList(ds);
        const prods = supplierProductSummary(ds);
        const histRows = hist.map(p =>
            '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
            + '<td class="px-4 py-2.5">' + esc(p.date) + '</td>'
            + '<td class="px-4 py-2.5 font-medium">' + esc(p.product) + '</td>'
            + '<td class="tnum px-4 py-2.5 text-right">' + num(p.qty) + '</td>'
            + '<td class="tnum px-4 py-2.5 text-right">' + rs(p.unitCost) + '</td>'
            + '<td class="tnum px-4 py-2.5 text-right font-semibold">' + rs(p.total) + '</td>'
            + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[10px] font-medium ' + (p.status === 'Received' ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300') + '">' + esc(p.status) + '</span></td>'
            + '</tr>').join('');
        const prodRows = prods.map(p =>
            '<div class="flex items-center justify-between gap-3 px-4 py-2 text-sm">'
            + '<span class="min-w-0 truncate">' + esc(p.name) + '</span>'
            + '<span class="shrink-0 text-[12px] text-zinc-500">last Rs.' + num(p.lastPrice) + ' · ' + esc(p.lastDate || '—') + ' · total ' + p.count + '</span></div>').join('');

        drawer = '<div class="fixed inset-0 z-40 flex justify-end bg-black/40" onclick="closeSupplierDrawer()">'
            + '<div class="h-full w-full max-w-lg overflow-y-auto border-l border-zinc-200 bg-white p-5 shadow-pop dark:border-white/10 dark:bg-[#1F1B16]" onclick="event.stopPropagation()">'
            + '<div class="mb-4 flex items-start justify-between gap-3">'
            + '<div><p class="eyebrow">Supplier</p><h3 class="font-display text-xl font-semibold">' + esc(ds.name) + '</h3>'
            + '<p class="text-[12px] text-zinc-500">' + esc(ds.id) + '</p></div>'
            + '<button onclick="closeSupplierDrawer()" class="text-xl leading-none text-zinc-400 hover:text-zinc-600">&times;</button></div>'
            + '<p class="eyebrow mb-1">Contact Information</p>'
            + '<div class="mb-4 grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-white/[0.07] dark:bg-white/[0.03]">'
            + '<div><span class="detail-lbl">Contact Person</span>' + esc(ds.contactPerson || '—') + '</div>'
            + '<div><span class="detail-lbl">City</span>' + esc(ds.city || '—') + '</div>'
            + '<div><span class="detail-lbl">Phone</span>' + (ds.phone ? '<a class="text-accent-600 hover:underline" href="tel:' + esc(ds.phone) + '">' + esc(ds.phone) + '</a>' : '—') + '</div>'
            + '<div><span class="detail-lbl">WhatsApp</span>' + (ds.whatsapp || ds.phone ? '<a class="text-accent-600 hover:underline" href="https://wa.me/' + waNumber(ds.whatsapp || ds.phone) + '" target="_blank" rel="noopener">' + esc(ds.whatsapp || ds.phone) + '</a>' : '—') + '</div>'
            + '<div class="col-span-2"><span class="detail-lbl">Email</span>' + (ds.email ? '<a class="text-accent-600 hover:underline" href="mailto:' + esc(ds.email) + '">' + esc(ds.email) + '</a>' : '—') + '</div>'
            + '<div class="col-span-2"><span class="detail-lbl">Address</span>' + esc(ds.address || '—') + '</div>'
            + '<div class="col-span-2"><span class="detail-lbl">Notes</span>' + esc(ds.notes || '—') + '</div>'
            + '</div>'
            + '<p class="eyebrow mb-1">Products Supplied (ticked)</p>'
            + (supplierLinkedProducts(ds).length
                ? '<div class="mb-4 flex flex-wrap gap-1.5">' + supplierLinkedProducts(ds).map(p => '<span class="rounded bg-accent-50 px-2 py-0.5 text-[12px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">' + esc(p.name) + '</span>').join('') + '</div>'
                : '<p class="mb-4 text-sm text-zinc-500">None ticked yet — use Edit to choose products.</p>')
            + '<p class="eyebrow mb-1">Products Purchased</p>'
            + (prodRows ? '<div class="mb-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-white/[0.05] dark:border-white/[0.07]">' + prodRows + '</div>'
                        : '<p class="mb-4 text-sm text-zinc-500">No purchases from this supplier yet.</p>')
            + '<p class="eyebrow mb-1">Purchase History</p>'
            + uiTable(['Date', 'Product', 'Qty', 'Unit Cost', 'Total', 'Status'], histRows, 'No purchase history yet')
            + '</div></div>';
    }

    el.innerHTML = uiHead('Suppliers', 'Suppliers',
        'Supplier database stored in the <strong>Suppliers</strong> sheet. Used by the Purchases page; purchase history comes from the <strong>Purchases</strong> sheet.')
        + missingApiBanner(suppliersErr)
        + (suppliersLoading ? uiEmpty('Loading suppliers…') : '')
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">'
        + uiCard('Suppliers', String(allSuppliers.length))
        + uiCard('With phone', String(allSuppliers.filter(s => s.phone || s.whatsapp).length))
        + uiCard('Purchase records', String(allPurchases.filter(p => allSuppliers.some(s => s.id === p.supplierId)).length))
        + uiCard('Cities', String(new Set(allSuppliers.map(s => s.city).filter(Boolean)).size))
        + '</div>'
        + (can('suppliers.write') ? '<div class="mb-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<div class="flex items-center justify-between"><h3 class="font-display text-base font-semibold" id="supFormTitle">Add Supplier</h3>'
        + '<button onclick="closeSupplierForm()" class="text-[12px] text-zinc-400 hover:text-zinc-600">Close</button></div>'
        + '<div id="supplierForm" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Supplier Name *</label><input type="text" id="supName" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Contact Person</label><input type="text" id="supContact" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Phone</label><input type="tel" id="supPhone" placeholder="03xx-xxxxxxx" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">WhatsApp</label><input type="tel" id="supWa" placeholder="same as phone if empty" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Email</label><input type="email" id="supEmail" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">City</label><input type="text" id="supCity" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div class="sm:col-span-2"><label class="mb-1 block text-[12px] font-medium text-zinc-500">Address</label><input type="text" id="supAddr" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Notes</label><input type="text" id="supNotes" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div class="sm:col-span-2 lg:col-span-3"><label class="mb-1 block text-[12px] font-medium text-zinc-500">Products supplied — tick what you buy from him (from Products sheet)</label>'
        + '<div class="flex flex-wrap gap-2" id="supProducts">'
        + productList().map(p => '<label class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-[12px] font-medium text-zinc-700 hover:border-accent-400 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300">'
            + '<input type="checkbox" class="sup-prod accent-accent-500" value="' + p.id + '"> ' + esc(p.name) + ' <span class="text-zinc-400">#' + p.id + '</span></label>').join('')
        + '</div></div>'
        + '</div>'
        + '<div class="mt-4"><button onclick="saveSupplier()" class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600">' + (supplierFormId ? 'Save changes' : 'Add supplier') + '</button></div>'
        + '</div>' : '')
        + uiTable(['Supplier', 'Phone', 'City', 'Products', 'Last Purchase', ''], rows, 'No suppliers yet — add the first one above')
        + drawer;
}

// ==================== INVENTORY ====================
function inventoryRows(){
    const required = requiredQtyMap();
    return productList().filter(p => p.active !== false).map(p => {
        const req = required.byId[p.id] || 0;
        const avail = (p.inventory == null ? null : num(p.inventory));
        const shortage = avail == null ? null : Math.max(0, req - avail);
        let status;
        if (avail == null) status = { label: 'Stock not set', cls: 'bg-zinc-100 text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400' };
        else if (req > avail) status = { label: 'Shortage', cls: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' };
        else if (p.reorderLevel > 0 && avail <= p.reorderLevel) status = { label: 'Reorder', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' };
        else status = { label: 'Enough stock', cls: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' };
        return { p, req, avail, shortage, status };
    });
}
function renderInventory(){
    const el = document.getElementById('view-inventory');
    if (!el) return;
    if (!getToken()){ el.innerHTML = opsNoToken(); return; }
    if (!productsLoaded) loadProducts();

    const rowsData = inventoryRows();
    const required = requiredQtyMap();
    const shortages = rowsData.filter(r => r.status.label === 'Shortage').length;
    const enough = rowsData.filter(r => r.status.label === 'Enough stock').length;

    const rows = rowsData.map(r =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-3 font-medium text-zinc-900 dark:text-white">' + esc(r.p.name)
        + '<div class="text-[11px] text-zinc-400">#' + r.p.id + ' · reorder at ' + num(r.p.reorderLevel) + '</div></td>'
        + '<td class="tnum px-4 py-3 text-right font-semibold ' + (r.req > 0 ? 'text-amber-600' : 'text-zinc-400') + '">' + r.req + '</td>'
        + '<td class="px-4 py-3"><input type="number" min="0" step="1" class="cost-input" style="width:84px" value="' + (r.avail == null ? '' : r.avail) + '" placeholder="—" '
        + 'onchange="saveProductField(' + r.p.id + ', \'inventory\', parseFloat(this.value)||0)"></td>'
        + '<td class="tnum px-4 py-3 text-right font-semibold ' + (r.shortage > 0 ? 'text-red-600' : 'text-zinc-400') + '">' + (r.shortage == null ? '—' : r.shortage) + '</td>'
        + '<td class="tnum px-4 py-3 text-right font-medium">' + (r.shortage == null ? '—' : (r.shortage > 0 ? r.shortage : '0')) + '</td>'
        + '<td class="px-4 py-3"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + r.status.cls + '">' + r.status.label + '</span></td>'
        + '</tr>').join('');

    const unmatched = Object.keys(required.unmatched).map(name =>
        '<tr><td class="px-4 py-2.5 font-medium">' + esc(name) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right text-amber-600">' + required.unmatched[name] + '</td>'
        + '<td class="px-4 py-2.5 text-[12px] text-zinc-500">Not in Products — add it via Products → Add Product</td></tr>').join('');

    el.innerHTML = uiHead('Inventory', 'Inventory',
        '<strong>Required</strong> = items in New / Processing orders. <strong>Available</strong> is saved in the Products sheet — it rises when a purchase is received and drops when an order is delivered.')
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">'
        + uiCard('Products tracked', String(rowsData.length))
        + uiCard('Shortages', String(shortages), shortages ? 'text-red-600' : 'text-accent-600')
        + uiCard('Enough stock', String(enough), 'text-accent-600')
        + uiCard('Active orders counted', String(allOrders.filter(o => o.orderStatus === 'New' || o.orderStatus === 'Processing').length))
        + '</div>'
        + uiTable(['Product', 'Required', 'Available', 'Shortage', 'Purchase Needed', 'Status'], rows, 'No products yet')
        + (Object.keys(required.unmatched).length
            ? '<div class="mt-6"><p class="eyebrow mb-2">Unmatched items in active orders</p>'
              + uiTable(['Item', 'Required', 'Note'], unmatched, '') + '</div>'
            : '')
        + '<div class="mt-6 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + 'Flow: <strong>Orders → requirements → available stock → shortage → Purchases</strong>. Shortages appear automatically on the Purchases page.'
        + '</div>';
}

// ==================== PURCHASES ====================
function lastPurchaseForProduct(productId){
    const list = allPurchases.filter(p => p.productId === productId).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return list.length ? list[0] : null;
}
function fillPurchaseForm(productId, qty, supplierId, unitCost){
    if (!can('purchases.write')) return showToast('Your role cannot create purchases', 'error');
    const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v; };
    set('purchProduct', String(productId));
    set('purchQty', qty);
    if (supplierId) set('purchSupplier', supplierId);
    if (unitCost != null) set('purchCost', unitCost);
    set('purchDate', todayStr());
    const f = document.getElementById('purchForm');
    if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
async function savePurchase(){
    if (!can('purchases.write')) return showToast('Your role cannot create purchases', 'error');
    const g = k => (document.getElementById(k).value || '').trim();
    const params = {
        date: g('purchDate') || todayStr(),
        supplierId: g('purchSupplier'),
        productId: g('purchProduct'),
        qty: g('purchQty'),
        unitCost: g('purchCost'),
        notes: g('purchNotes')
    };
    const sup = allSuppliers.find(s => s.id === params.supplierId);
    params.supplier = sup ? sup.name : '';
    if (!params.productId) return showToast('Choose a product', 'error');
    if (!params.qty || parseFloat(params.qty) <= 0) return showToast('Enter a quantity', 'error');
    if (params.unitCost === '' || isNaN(parseFloat(params.unitCost))) return showToast('Enter a unit cost', 'error');
    try {
        const data = await apiGet('addPurchase', params);
        if (data && data.success){
            showToast('Purchase created', 'success');
            logLocal('Purchase created', 'product #' + params.productId + ' x' + params.qty);
            ['purchQty', 'purchCost', 'purchNotes'].forEach(k => { const el = document.getElementById(k); if (el) el.value = ''; });
            await loadPurchases();
        } else showToast((data && data.error) || 'Save failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}
async function receivePurchaseRow(id){
    if (!can('purchases.write')) return showToast('Your role cannot receive purchases', 'error');
    const p = allPurchases.find(x => x.id === id); if (!p) return;
    if (!confirm('Mark "' + p.product + ' x' + p.qty + '" as received? Inventory will increase.')) return;
    try {
        const data = await apiGet('receivePurchase', { id });
        if (data && data.success){
            showToast('Purchase received — inventory updated', 'success');
            logLocal('Purchase received', p.product + ' x' + p.qty);
            await loadPurchases();
            await loadProducts(); // stock changed
        } else showToast((data && data.error) || 'Failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}
async function deletePurchaseRow(id){
    if (!can('purchases.write')) return showToast('Your role cannot delete purchases', 'error');
    const p = allPurchases.find(x => x.id === id); if (!p) return;
    const warn = p.status === 'Received' ? ' This purchase was received — deleting it will reduce stock again.' : '';
    if (!confirm('Delete purchase "' + p.product + ' x' + p.qty + '"?' + warn)) return;
    try {
        const data = await apiGet('deletePurchase', { id });
        if (data && data.success){
            showToast('Purchase deleted', 'success');
            logLocal('Purchase deleted', p.product);
            await loadPurchases();
            if (p.status === 'Received') await loadProducts();
        } else showToast((data && data.error) || 'Delete failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}
function renderPurchases(){
    const el = document.getElementById('view-purchases');
    if (!el) return;
    if (!getToken()){ el.innerHTML = opsNoToken(); return; }
    if (!purchasesInit && !purchasesLoading) loadPurchases();
    if (!suppliersInit && !suppliersLoading) loadSuppliers();
    if (!productsLoaded) loadProducts();

    // What we need to buy
    const needed = inventoryRows().filter(r => (r.shortage == null && r.req > 0) || (r.shortage > 0));
    const needRows = needed.map(r => {
        const last = lastPurchaseForProduct(r.p.id);
        return '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
            + '<td class="px-4 py-3 font-medium text-zinc-900 dark:text-white">' + esc(r.p.name) + '<div class="text-[11px] text-zinc-400">#' + r.p.id + '</div></td>'
            + '<td class="tnum px-4 py-3 text-right">' + r.req + '</td>'
            + '<td class="tnum px-4 py-3 text-right">' + (r.avail == null ? '—' : r.avail) + '</td>'
            + '<td class="tnum px-4 py-3 text-right font-semibold ' + (r.shortage > 0 ? 'text-red-600' : 'text-amber-600') + '">' + (r.shortage == null ? 'stock not set' : r.shortage) + '</td>'
            + '<td class="px-4 py-3 text-[13px]">' + (last ? esc(last.supplier || '—') + '<div class="text-[11px] text-zinc-400">' + esc(last.date) + '</div>' : '<span class="text-zinc-400">no history</span>') + '</td>'
            + '<td class="tnum px-4 py-3 text-right">' + (last ? rs(last.unitCost) : '—') + '</td>'
            + '<td class="px-4 py-3 text-right">' + (can('purchases.write')
                ? '<button class="rounded-md bg-accent-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-600" '
                  + 'onclick="fillPurchaseForm(' + r.p.id + ', ' + (r.shortage == null ? r.req : r.shortage) + ', \'' + (last ? esc(last.supplierId) : '') + '\', ' + (last ? last.unitCost : '') + ')">Create purchase</button>'
                : '<span class="text-[12px] text-zinc-400">—</span>') + '</td>'
            + '</tr>';
    }).join('');

    // History
    const historyRows = allPurchases.slice().sort((a, b) => String(b.date).localeCompare(String(a.date))).map(p =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5">' + esc(p.date) + '</td>'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(p.product) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right">' + num(p.qty) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right">' + rs(p.unitCost) + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right font-semibold">' + rs(p.total) + '</td>'
        + '<td class="px-4 py-2.5">' + esc(p.supplier || '—') + '</td>'
        + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[10px] font-medium ' + (p.status === 'Received' ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300') + '">' + esc(p.status) + '</span></td>'
        + '<td class="px-4 py-2.5 whitespace-nowrap text-right">'
        + (can('purchases.write')
            ? (p.status === 'Ordered' ? '<button onclick="receivePurchaseRow(\'' + esc(p.id) + '\')" class="mr-2 text-[12px] font-medium text-accent-600 hover:underline">Mark received</button>' : '')
              + '<button onclick="deletePurchaseRow(\'' + esc(p.id) + '\')" class="text-[12px] font-medium text-red-600 hover:underline">Delete</button>'
            : '<span class="text-[12px] text-zinc-400">—</span>')
        + '</td>'
        + '</tr>').join('');

    const supOptions = allSuppliers.map(s => '<option value="' + esc(s.id) + '">' + esc(s.name) + '</option>').join('');
    const prodOptions = productList().filter(p => p.active !== false)
        .map(p => '<option value="' + p.id + '">' + esc(p.name) + ' (#' + p.id + ')</option>').join('');

    const open = allPurchases.filter(p => p.status === 'Ordered').length;
    const received = allPurchases.filter(p => p.status === 'Received').length;
    const totalSpend = allPurchases.reduce((s, p) => s + num(p.total), 0);

    el.innerHTML = uiHead('Purchases', 'Purchases',
        'Answers <strong>"what do we need to buy?"</strong> using orders, inventory and supplier history. Receiving a purchase increases stock in the Products sheet.')
        + missingApiBanner(purchasesErr)
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">'
        + uiCard('To buy now', String(needed.length), needed.length ? 'text-red-600' : 'text-accent-600')
        + uiCard('Open purchases', String(open), open ? 'text-amber-600' : '')
        + uiCard('Received', String(received), 'text-accent-600')
        + uiCard('Recorded spend', rs(totalSpend))
        + '</div>'
        + '<div class="mb-6"><p class="eyebrow mb-2">What we need to buy</p>'
        + uiTable(['Product', 'Required', 'Inventory', 'Shortage', 'Supplier', 'Last Price', ''], needRows,
            'Nothing to buy — no shortages right now')
        + '</div>'
        + (can('purchases.write') ? '<div class="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<h3 class="font-display text-base font-semibold">New purchase</h3>'
        + (allSuppliers.length ? '' : '<p class="mt-1 text-[12px] text-amber-600">No suppliers yet — add one in <a href="#" onclick="event.preventDefault();showPage(\'suppliers\')" class="underline">Suppliers</a> first (optional).</p>')
        + '<div id="purchForm" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Supplier</label><select id="purchSupplier" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"><option value="">— none —</option>' + supOptions + '</select></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Product *</label><select id="purchProduct" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"><option value="">— choose —</option>' + prodOptions + '</select></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Quantity *</label><input type="number" id="purchQty" min="1" step="1" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Unit Cost (Rs.) *</label><input type="number" id="purchCost" min="0" step="1" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Purchase Date</label><input type="date" id="purchDate" value="' + todayStr() + '" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Notes</label><input type="text" id="purchNotes" placeholder="Optional" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '</div>'
        + '<div class="mt-4"><button onclick="savePurchase()" class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600">Create purchase</button></div>'
        + '</div>' : '')
        + '<div><p class="eyebrow mb-2">Purchase history</p>'
        + (purchasesLoading ? uiEmpty('Loading purchases…') : uiTable(['Date', 'Product', 'Qty', 'Unit Cost', 'Total', 'Supplier', 'Status', ''], historyRows, 'No purchases yet')) + '</div>';
}

// ==================== DELIVERIES (bulk + individual) ====================
function deliveryOrders(){
    return allOrders.filter(o => {
        if (dlvrStatus === 'delivered') return o.orderStatus === 'Delivered';
        if (dlvrStatus === 'all') return true;
        if (dlvrStatus === 'active') return ['New', 'Processing'].includes(o.orderStatus);
        return o.paymentStatus === 'Paid' && ['New', 'Processing'].includes(o.orderStatus); // needs delivery
    }).filter(o => {
        if (dlvrCampus && String(o.campus) !== dlvrCampus) return false;
        if (dlvrWeek){
            const d = parseOrderDate(o.timestamp);
            if (!d) return false;
            const now = new Date();
            const day = (now.getDay() + 6) % 7; // Monday = 0
            const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
            const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
            if (d < weekStart || d >= weekEnd) return false;
        }
        return true;
    });
}
function setDlvrCampus(v){ dlvrCampus = v; renderDeliveries(); }
function setDlvrWeek(v){ dlvrWeek = v; renderDeliveries(); }
function setDlvrStatus(v){ dlvrStatus = v; renderDeliveries(); }

function groupDeliveries(list){
    const byDate = {};
    list.forEach(o => {
        const d = parseOrderDate(o.timestamp);
        const key = d ? (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')) : 'unknown';
        if (!byDate[key]) byDate[key] = { date: d, orders: {} };
        const campus = String(o.campus || 'Unknown campus');
        if (!byDate[key].orders[campus]) byDate[key].orders[campus] = [];
        byDate[key].orders[campus].push(o);
    });
    return Object.keys(byDate).sort((a, b) => b.localeCompare(a)).map(k => byDate[k]);
}
function campusRequirements(orders){
    const byName = {};
    orders.forEach(o => parseItems(o.itemsText).forEach(row => {
        const { name, qty } = itemRowParse_(row);
        if (name) byName[name] = (byName[name] || 0) + qty;
    }));
    return Object.keys(byName).map(n => ({ name: n, qty: byName[n] }));
}

let dlvTargetOrder = null;
function openDeliverModal(orderId){
    if (!can('deliveries.write')) return showToast('Your role cannot record deliveries', 'error');
    const o = allOrders.find(x => x.orderId === orderId); if (!o) return;
    dlvTargetOrder = orderId;
    document.getElementById('dlvOrderId').textContent = orderId + ' · ' + o.name;
    document.getElementById('dlvReceivedBy').value = '';
    document.getElementById('dlvSignature').value = '';
    document.getElementById('dlvDate').value = todayStr();
    const now = new Date();
    document.getElementById('dlvTime').value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    document.getElementById('dlvNotes').value = '';
    document.getElementById('deliverModal').style.display = 'flex';
    document.getElementById('dlvReceivedBy').focus();
}
function closeDeliverModal(){ document.getElementById('deliverModal').style.display = 'none'; dlvTargetOrder = null; }
async function confirmDeliver(){
    if (!can('deliveries.write')) return showToast('Your role cannot record deliveries', 'error');
    if (!dlvTargetOrder) return;
    const params = {
        orderId: dlvTargetOrder,
        receivedBy: (document.getElementById('dlvReceivedBy').value || '').trim(),
        signature: (document.getElementById('dlvSignature').value || '').trim(),
        date: document.getElementById('dlvDate').value,
        time: document.getElementById('dlvTime').value,
        notes: (document.getElementById('dlvNotes').value || '').trim()
    };
    try {
        const data = await apiGet('deliver', params);
        if (data && data.success){
            const o = allOrders.find(x => x.orderId === params.orderId);
            if (o) o.orderStatus = 'Delivered';
            showToast(params.orderId + ' delivered ✓', 'success');
            logLocal('Order delivered', params.orderId + (params.receivedBy ? ' → ' + params.receivedBy : ''));
            closeDeliverModal();
            renderStats();
            await loadDeliveries();
            await loadProducts(); // stock decremented on backend
            renderDeliveries();
        } else showToast((data && data.error) || 'Failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}

function renderDeliveries(){
    const el = document.getElementById('view-deliveries');
    if (!el) return;
    if (!getToken()){ el.innerHTML = opsNoToken(); return; }
    if (!deliveriesInit) loadDeliveries();

    const list = deliveryOrders();
    const groups = groupDeliveries(list);
    const campuses = [...new Set(allOrders.map(o => String(o.campus || '')).filter(Boolean))].sort();
    const receipts = {};
    allDeliveries.forEach(d => { receipts[d.orderId] = d; });

    const now = new Date();
    const day = (now.getDay() + 6) % 7;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const weekLabel = weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' – '
        + new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const body = groups.map(g => {
        const dateLabel = g.date
            ? g.date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
            : 'Unknown date';
        const campusBlocks = Object.keys(g.orders).sort().map(campus => {
            const orders = g.orders[campus];
            const reqs = campusRequirements(orders);
            const reqChips = reqs.map(r => '<span class="rounded bg-zinc-100 px-2 py-0.5 text-[12px] font-medium text-zinc-700 dark:bg-white/[0.06] dark:text-zinc-200">' + esc(r.name) + ' × ' + r.qty + '</span>').join('');
            const rows = orders.map(o => {
                const delivered = o.orderStatus === 'Delivered';
                const rec = receipts[o.orderId];
                return '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
                    + '<td class="px-4 py-2.5">'
                    + (delivered
                        ? '<span class="inline-flex h-4 w-4 items-center justify-center rounded border border-accent-500 bg-accent-500 text-[10px] text-white">✓</span>'
                        : (can('deliveries.write')
                            ? '<input type="checkbox" class="h-4 w-4 accent-green-600" onchange="if(this.checked) openDeliverModal(\'' + esc(o.orderId) + '\')">'
                            : ''))
                    + '</td>'
                    + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(o.orderId) + '</td>'
                    + '<td class="px-4 py-2.5">' + esc(o.name) + '<div class="text-[11px] text-zinc-400">' + esc(o.phone || '') + '</div></td>'
                    + '<td class="px-4 py-2.5 text-[13px] text-zinc-500">' + esc(o.itemsText) + '</td>'
                    + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.orderStatus) + '">' + esc(o.orderStatus) + '</span></td>'
                    + '<td class="px-4 py-2.5"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.paymentStatus) + '">' + esc(o.paymentStatus) + '</span></td>'
                    + '<td class="px-4 py-2.5 text-[12px] text-zinc-500">' + (delivered && rec ? esc(rec.receivedBy || '—') + '<div class="text-[11px] text-zinc-400">' + esc(rec.date) + ' ' + esc(rec.time) + '</div>' : '') + '</td>'
                    + '</tr>';
            }).join('');
            return '<div class="mb-4 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
                + '<div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3 dark:border-white/[0.06]">'
                + '<div class="font-display text-[15px] font-semibold text-zinc-900 dark:text-white">' + esc(campus) + ' <span class="ml-1 text-[12px] font-normal text-zinc-500">— ' + orders.length + ' order' + (orders.length === 1 ? '' : 's') + '</span></div>'
                + '<div class="flex flex-wrap gap-1.5">' + reqChips + '</div></div>'
                + '<div class="overflow-x-auto"><table class="w-full text-sm"><thead>'
                + '<tr class="border-b border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-white/[0.06]">'
                + '<th class="px-4 py-2 text-left font-medium"></th><th class="px-4 py-2 text-left font-medium">Order ID</th>'
                + '<th class="px-4 py-2 text-left font-medium">Customer</th><th class="px-4 py-2 text-left font-medium">Products</th>'
                + '<th class="px-4 py-2 text-left font-medium">Order Status</th><th class="px-4 py-2 text-left font-medium">Payment</th>'
                + '<th class="px-4 py-2 text-left font-medium">Received</th></tr></thead>'
                + '<tbody class="divide-y divide-zinc-100 dark:divide-white/[0.05]">' + rows + '</tbody></table></div></div>';
        }).join('');
        return '<div class="mb-6"><p class="eyebrow mb-2">' + (dlvrWeek ? 'This week · ' : '') + esc(dateLabel) + '</p>' + campusBlocks + '</div>';
    }).join('');

    const needs = allOrders.filter(o => o.paymentStatus === 'Paid' && ['New', 'Processing'].includes(o.orderStatus)).length;

    const campusOpts = ['<option value="">All universities</option>']
        .concat(campuses.map(c => '<option value="' + esc(c) + '"' + (dlvrCampus === c ? ' selected' : '') + '>' + esc(c) + '</option>')).join('');

    el.innerHTML = uiHead('Deliveries', 'Deliveries',
        'Paid orders waiting for delivery, grouped by <strong>week → day → university</strong>. Tick each order individually and record who received it.')
        + missingApiBanner(deliveriesErr)
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">'
        + uiCard('Needs delivery', String(needs), needs ? 'text-amber-600' : 'text-accent-600')
        + uiCard('Shown now', String(list.length))
        + uiCard('Deliveries recorded', String(allDeliveries.length), 'text-accent-600')
        + uiCard('Universities', String(new Set(list.map(o => String(o.campus || '')).filter(Boolean)).size))
        + '</div>'
        + '<div class="mb-5 flex flex-wrap items-center gap-2">'
        + '<select onchange="setDlvrCampus(this.value)" class="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]">' + campusOpts + '</select>'
        + '<select onchange="setDlvrStatus(this.value)" class="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]">'
        + '<option value="needs"' + (dlvrStatus === 'needs' ? ' selected' : '') + '>Paid · needs delivery</option>'
        + '<option value="active"' + (dlvrStatus === 'active' ? ' selected' : '') + '>All active (any payment)</option>'
        + '<option value="delivered"' + (dlvrStatus === 'delivered' ? ' selected' : '') + '>Delivered</option>'
        + '<option value="all"' + (dlvrStatus === 'all' ? ' selected' : '') + '>All orders</option>'
        + '</select>'
        + '<button onclick="setDlvrWeek(true)" class="rounded-lg border px-3 py-2 text-sm font-medium ' + (dlvrWeek ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' : 'border-zinc-200 bg-white text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300') + '">This week (' + weekLabel + ')</button>'
        + '<button onclick="setDlvrWeek(false)" class="rounded-lg border px-3 py-2 text-sm font-medium ' + (!dlvrWeek ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' : 'border-zinc-200 bg-white text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300') + '">All dates</button>'
        + '</div>'
        + (groups.length ? body : uiEmpty('Nothing to deliver with these filters'));
}

PAGE_RENDERERS.suppliers = renderSuppliers;
PAGE_RENDERERS.inventory = renderInventory;
PAGE_RENDERERS.purchases = renderPurchases;
PAGE_RENDERERS.deliveries = renderDeliveries;
