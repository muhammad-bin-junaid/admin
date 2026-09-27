// dash-products.js — master product list + shared order-quantity helpers
let masterProducts = [];
let productsLoaded = false;
let productsErr = null;
let editingProductId = null;

function fallbackProducts(){
    return PRODUCTS.map(p => ({
        id: p.id, name: p.name, price: p.price, cost: num(productCosts[p.id]),
        reorderLevel: 0, unit: 'pcs', description: '', active: true, inventory: null
    }));
}
function productList(){ return productsLoaded && masterProducts.length ? masterProducts : fallbackProducts(); }

async function loadProducts(){
    const token = getToken(); if (!token) return;
    try {
        const data = await apiGet('products');
        if (data && data.success && Array.isArray(data.products)){
            masterProducts = data.products;
            productsLoaded = true;
            productsErr = null;
            if (data.costs){ Object.assign(productCosts, data.costs); }
        } else {
            productsErr = (data && data.error) || 'Failed to load products';
        }
    } catch(e){ productsErr = 'Connection error: ' + e.message; }
    refreshActivePage();
}

// ---- shared quantity helpers (used by Inventory / Purchases / Deliveries) ----
function itemRowParse_(row){
    const m = String(row || '').trim().match(/^(.*?)\s*[xX](\d+)$/);
    return { name: (m ? m[1] : row).trim(), qty: m ? parseInt(m[2], 10) : 1 };
}
function matchProductByName_(name){
    const lower = String(name || '').trim().toLowerCase();
    if (!lower) return null;
    const list = productList();
    let p = list.find(x => String(x.name).trim().toLowerCase() === lower);
    if (!p) p = list.find(x => lower.indexOf(String(x.name).trim().toLowerCase()) !== -1 || String(x.name).trim().toLowerCase().indexOf(lower) !== -1);
    return p || null;
}
// qty per product (and unmatched rows) for orders passing the filter
function qtyByProduct_(orderFilter){
    const byId = {}, unmatched = {};
    allOrders.filter(orderFilter).forEach(o => {
        parseItems(o.itemsText).forEach(row => {
            const { name, qty } = itemRowParse_(row);
            if (!name) return;
            const p = matchProductByName_(name);
            if (p) byId[p.id] = (byId[p.id] || 0) + qty;
            else unmatched[name] = (unmatched[name] || 0) + qty;
        });
    });
    return { byId, unmatched };
}
function orderedQtyMap(){ return qtyByProduct_(o => o.orderStatus !== 'Cancelled'); }
function requiredQtyMap(){ return qtyByProduct_(o => o.orderStatus === 'New' || o.orderStatus === 'Processing'); }
function todayStr(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

// ---- page ----
function stockStatus_(p, required){
    if (p.inventory == null) return { label: 'Not set', cls: 'bg-zinc-100 text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400' };
    if (required > p.inventory) return { label: 'Shortage', cls: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' };
    if (p.inventory === 0) return { label: 'Out of stock', cls: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' };
    if (p.reorderLevel > 0 && p.inventory <= p.reorderLevel) return { label: 'Reorder', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' };
    return { label: 'OK', cls: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300' };
}

async function saveProductField(id, field, value){
    if (!can('products.write')) return showToast('Your role cannot edit products', 'error');
    const list = masterProducts.slice();
    const p = list.find(x => x.id === id);
    if (!p) return;
    const prev = p[field];
    p[field] = value;
    masterProducts = list;
    try {
        const params = { productId: id };
        params[field] = value;
        const data = await apiGet('updateProduct', params);
        if (data && data.success){
            if (data.products) masterProducts = data.products;
            if (data.costs) Object.assign(productCosts, data.costs);
            showToast('Product #' + id + ' ' + field + ' saved', 'success');
            logLocal('Product updated', '#' + id + ' ' + field + ' → ' + value);
        } else {
            p[field] = prev;
            showToast((data && data.error) || 'Save failed', 'error');
        }
    } catch(e){
        p[field] = prev;
        showToast('Connection error: ' + e.message, 'error');
    }
    renderProducts();
}
function saveProductCost(id, value){
    const v = parseFloat(value);
    if (isNaN(v) || v < 0) return showToast('Invalid cost', 'error');
    saveProductField(id, 'cost', v);
}

function openProductModal(id){
    if (!can('products.write')) return showToast('Your role cannot edit products', 'error');
    editingProductId = (id == null ? null : id);
    const p = id == null ? null : productList().find(x => x.id === id);
    document.getElementById('prodModalTitle').textContent = p ? ('Edit Product #' + p.id) : 'Add Product';
    document.getElementById('prodId').value = p ? p.id : '';
    document.getElementById('prodId').disabled = !!p;
    document.getElementById('prodName').value = p ? p.name : '';
    document.getElementById('prodPrice').value = p ? p.price : '';
    document.getElementById('prodCost').value = p ? p.cost : '';
    document.getElementById('prodReorder').value = p ? p.reorderLevel : '';
    document.getElementById('prodInventory').value = p && p.inventory != null ? p.inventory : 0;
    document.getElementById('prodUnit').value = p ? p.unit : 'pcs';
    document.getElementById('prodDesc').value = p ? p.description : '';
    document.getElementById('prodActive').value = p ? String(!!p.active) : 'true';
    document.getElementById('productModal').style.display = 'flex';
    document.getElementById('prodName').focus();
}
function closeProductModal(){ document.getElementById('productModal').style.display = 'none'; editingProductId = null; }

async function saveProductForm(){
    if (!can('products.write')) return showToast('Your role cannot edit products', 'error');
    const name = (document.getElementById('prodName').value || '').trim();
    if (!name) return showToast('Product name is required', 'error');
    const params = {
        name: name,
        price: document.getElementById('prodPrice').value,
        cost: document.getElementById('prodCost').value,
        reorderLevel: document.getElementById('prodReorder').value,
        inventory: document.getElementById('prodInventory').value,
        unit: (document.getElementById('prodUnit').value || '').trim(),
        description: (document.getElementById('prodDesc').value || '').trim(),
        active: document.getElementById('prodActive').value
    };
    if (editingProductId == null){
        const idRaw = (document.getElementById('prodId').value || '').trim();
        if (idRaw) params.productId = idRaw;
    } else {
        params.productId = editingProductId;
    }
    if (params.price === '' || isNaN(parseFloat(params.price))) return showToast('Selling price is required', 'error');
    if (params.cost === '' || isNaN(parseFloat(params.cost))) return showToast('Cost price is required', 'error');
    if (params.reorderLevel === '' || isNaN(parseFloat(params.reorderLevel))) return showToast('Reorder level is required', 'error');

    try {
        const action = editingProductId == null ? 'addProduct' : 'updateProduct';
        const data = await apiGet(action, params);
        if (data && data.success){
            if (data.products) masterProducts = data.products;
            if (data.costs) Object.assign(productCosts, data.costs);
            logLocal(editingProductId == null ? 'Product added' : 'Product updated', '#' + (params.productId || '?') + ' ' + name);
            showToast(editingProductId == null ? 'Product added' : 'Product updated', 'success');
            closeProductModal();
            renderProducts();
        } else showToast((data && data.error) || 'Save failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}

function renderProducts(){
    const el = document.getElementById('view-products');
    if (!el) return;
    if (!getToken()){ el.innerHTML = uiHead('Products', 'Sign in required', '') + uiEmpty('Sign in to see Products'); return; }
    const writable = can('products.write');

    const ordered = orderedQtyMap();
    const required = requiredQtyMap();
    const list = productList();

    const err = productsErr
        ? '<div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">'
          + esc(productsErr) + (productsErr.indexOf('Unknown action') !== -1 ? ' — redeploy Code.gs (new version) and reload.' : '')
          + ' <button onclick="loadProducts()" class="ml-2 rounded border border-current px-2 py-0.5 text-[12px] font-medium">Retry</button></div>'
        : '';

    const rows = list.map(p => {
        const req = (required.byId[p.id]) || 0;
        const st = stockStatus_(p, req);
        const inv = p.inventory == null ? '' : p.inventory;
        return '<tr class="border-b border-zinc-100 dark:border-white/[0.04]">'
            + '<td class="px-4 py-3"><div class="font-medium text-zinc-800 dark:text-zinc-100">' + esc(p.name) + '</div>'
            + '<div class="text-[11px] text-zinc-400">#' + p.id + ' · ' + esc(p.unit || 'pcs') + (p.active ? '' : ' · <span class="text-amber-600">Inactive</span>') + '</div></td>'
            + '<td class="px-4 py-3 tnum">' + rs(p.price) + '</td>'
            + '<td class="px-4 py-3">' + (writable
                ? '<input type="number" min="0" step="1" class="cost-input" id="pc-' + p.id + '" value="' + num(p.cost) + '" onchange="saveProductCost(' + p.id + ', this.value)">'
                : '<span class="tnum">' + rs(p.cost) + '</span>') + '</td>'
            + '<td class="px-4 py-3">' + (writable
                ? '<input type="number" min="0" step="1" class="cost-input" style="width:84px" value="' + (inv === '' ? '' : inv) + '" placeholder="—" onchange="saveProductField(' + p.id + ', \'inventory\', parseFloat(this.value)||0)">'
                : (inv === '' ? '—' : '<span class="tnum">' + num(inv) + '</span>')) + '</td>'
            + '<td class="px-4 py-3 tnum font-medium">' + (ordered.byId[p.id] || 0) + '</td>'
            + '<td class="px-4 py-3">' + (writable
                ? '<input type="number" min="0" step="1" class="cost-input" style="width:84px" value="' + num(p.reorderLevel) + '" onchange="saveProductField(' + p.id + ', \'reorderLevel\', parseFloat(this.value)||0)">'
                : '<span class="tnum">' + num(p.reorderLevel) + '</span>') + '</td>'
            + '<td class="px-4 py-3"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + st.cls + '">' + st.label + '</span></td>'
            + '<td class="px-4 py-3">' + (writable
                ? '<button class="rounded-md bg-accent-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-600" onclick="openProductModal(' + p.id + ')">Edit</button>'
                : '<span class="text-[12px] text-zinc-400">View only</span>') + '</td>'
            + '</tr>';
    }).join('');

    const shortCount = list.filter(p => stockStatus_(p, (required.byId[p.id]) || 0).label === 'Shortage').length;

    el.innerHTML = uiHead('Products', 'Products',
        'Master list used by Orders, Inventory and Purchases. Cost edits apply to <strong>new orders only</strong> — historical profits stay untouched.')
        + err
        + '<div class="mb-4 flex flex-wrap items-center gap-3">'
        + (writable ? '<button onclick="openProductModal(null)" class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600">+ Add Product</button>' : '')
        + '<button onclick="loadProducts()" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300">Reload</button>'
        + '<span class="text-[13px] text-zinc-500">' + list.length + ' products · ' + shortCount + ' in shortage</span>'
        + '</div>'
        + uiTable(['Product', 'Selling Price', 'Cost Price', 'Current Inventory', 'Ordered Qty', 'Reorder Level', 'Status', ''], rows,
            'No products yet — backend returned none')
        + '<div class="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-white/[0.07] dark:bg-[#1F1B16] dark:text-zinc-400">'
        + '<strong class="text-zinc-700 dark:text-zinc-200">Custom orders</strong> (unknown items / IDs not in this list) get their cost set per order from the Orders page (Cost button).'
        + '</div>';
}

PAGE_RENDERERS.products = renderProducts;
