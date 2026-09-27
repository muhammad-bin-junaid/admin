// dash-fin.js — Finance: payment verification + totals only (no P&L, no expenses)
let finFilter = 'pending';           // pending | paid | all
let finActivity = null;              // Activity entries for verified-by info

function finNoToken(){ return uiHead('Finance', 'Sign in required', '') + uiEmpty('Sign in to see Finance'); }

async function loadFinActivity(){
    if (finActivity) return;
    try {
        const data = await apiGet('activity');
        if (data && data.success) finActivity = data.entries || [];
        else finActivity = [];
    } catch(e){ finActivity = []; }
    if (activePage === 'finance') renderFinance();
}
function setFinFilter(v){ finFilter = v; renderFinance(); }

function verifyInfo(orderId){
    if (!finActivity) return null;
    const hit = finActivity.filter(e => e && e.action === 'Payment verified'
        && String(e.target || '').indexOf(orderId) !== -1)
        .sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    return hit.length ? hit[0] : null;
}
function waChatLink(phone){
    const n = waNumber(phone);
    return n ? 'https://wa.me/' + n : '';
}

async function verifyPayment(orderId){
    if (!can('finance.verify')) return showToast('Your role cannot verify payments', 'error');
    if (!confirm('Verify payment for ' + orderId + '? It will be marked Paid.')) return;
    await updateStatus(orderId, 'paymentStatus', 'Paid');
    finActivity = null;              // refresh verified-by info
    loadFinActivity();
}

function renderFinance(){
    const el = document.getElementById('view-finance');
    if (!el) return;
    if (!getToken()){ el.innerHTML = finNoToken(); return; }
    if (!finActivity) loadFinActivity();

    const totalOrders = allOrders.length;
    const paidOrders = allOrders.filter(o => o.paymentStatus === 'Paid');
    const pending = allOrders.filter(o => o.paymentStatus !== 'Paid');
    const paidAmount = paidOrders.reduce((s, o) => s + num(o.total), 0);
    const pendingAmount = pending.reduce((s, o) => s + num(o.total), 0);

    const list = finFilter === 'paid' ? paidOrders : finFilter === 'all' ? allOrders : pending;

    const chip = (val, label) =>
        '<button onclick="setFinFilter(\'' + val + '\')" class="rounded-lg border px-3 py-1.5 text-[13px] font-medium '
        + (finFilter === val
            ? 'border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300'
            : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300')
        + '">' + label + '</button>';

    const rows = list.slice().sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))).map(o => {
        const verified = verifyInfo(o.orderId);
        const wa = waChatLink(o.phone);
        const isPaid = o.paymentStatus === 'Paid';
        return '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
            + '<td class="px-4 py-3 font-medium text-zinc-900 dark:text-white">' + esc(o.orderId) + '</td>'
            + '<td class="px-4 py-3">' + esc(o.name) + '<div class="text-[11px] text-zinc-400">' + esc(o.campus || '') + '</div></td>'
            + '<td class="tnum px-4 py-3 text-right font-semibold">' + rs(o.total) + '</td>'
            + '<td class="px-4 py-3"><span class="rounded px-2 py-0.5 text-[11px] font-medium ' + statusCls(o.paymentStatus) + '">' + esc(o.paymentStatus) + '</span></td>'
            + '<td class="px-4 py-3 whitespace-nowrap text-[13px] text-zinc-500">' + esc(o.timestamp) + '</td>'
            + '<td class="px-4 py-3 text-[12px] text-zinc-500">'
            + '<span title="No payment-proof field exists — customers send screenshots on WhatsApp">Proof: WhatsApp</span>'
            + (wa ? ' <a href="' + wa + '" target="_blank" rel="noopener" class="text-accent-600 hover:underline">chat ↗</a>' : '')
            + '</td>'
            + '<td class="px-4 py-3 text-[12px] text-zinc-500">' + (verified ? esc(verified.user || '—') + '<div class="text-[11px] text-zinc-400">' + fmtTsShort(verified.ts) + '</div>' : '—') + '</td>'
            + '<td class="px-4 py-3 text-right whitespace-nowrap">'
            + (can('finance.verify')
                ? (isPaid
                    ? '<button onclick="updateStatus(\'' + esc(o.orderId) + '\',\'paymentStatus\',\'Pending\')" class="text-[12px] font-medium text-zinc-400 hover:underline" title="Revert verification">Revert</button>'
                    : '<button onclick="verifyPayment(\'' + esc(o.orderId) + '\')" class="rounded-md bg-accent-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-600">Verify payment</button>')
                : '<span class="text-[12px] text-zinc-400">—</span>')
            + '</td></tr>';
    }).join('');

    el.innerHTML = uiHead('Finance', 'Finance',
        'Payment verification and totals. Verify only after you have seen the customer\'s payment screenshot in the WhatsApp chat. Who verified and when is recorded in the Activity log.')
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">'
        + uiCard('Total Orders', String(totalOrders))
        + uiCard('Paid Orders', String(paidOrders.length), 'text-accent-600')
        + uiCard('Payment Pending', String(pending.length), pending.length ? 'text-amber-600' : 'text-accent-600')
        + uiCard('Paid Amount', rs(paidAmount), 'text-accent-600')
        + uiCard('Pending Amount', rs(pendingAmount), pending.length ? 'text-amber-600' : 'text-accent-600')
        + '</div>'
        + '<div class="mb-4 flex flex-wrap items-center gap-2">'
        + chip('pending', 'Payment pending (' + pending.length + ')')
        + chip('paid', 'Paid (' + paidOrders.length + ')')
        + chip('all', 'All (' + totalOrders + ')')
        + '</div>'
        + uiTable(['Order ID', 'Customer', 'Amount', 'Payment', 'Date', 'Proof', 'Verified by', ''], rows,
            finFilter === 'pending' ? 'No pending payments — all clear' : 'No orders');
}

function fmtTsShort(ts){
    const d = new Date(ts);
    return isNaN(d) ? esc(String(ts).slice(0, 19)) : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ==================== EXPENSES (Expenses sheet) ====================
let allExpenses = null, expensesErr = null, expensesLoading = false, expensesInit = false;
let expenseFormRow = null;
const EXPENSE_PRESETS = ['Salary', 'Transport', 'Rent', 'Utilities', 'Supplies', 'Marketing', 'Other'];

async function loadExpenses(){
    if (!getToken()) return;
    expensesLoading = true; expensesErr = null;
    if (activePage === 'expenses') renderExpenses();
    try {
        const data = await apiGet('expenses');
        if (data && data.success){ allExpenses = data.expenses || []; expensesInit = true; }
        else expensesErr = (data && data.error) || 'Failed to load expenses';
    } catch(e){ expensesErr = 'Connection error: ' + e.message; }
    expensesLoading = false;
    if (activePage === 'expenses') renderExpenses();
    if (activePage === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
}
function expensesTotal(){ return allExpenses ? allExpenses.reduce((s, e) => s + num(e.amount), 0) : 0; }
function expensesThisMonth(){
    if (!allExpenses) return 0;
    const m = todayStr().slice(0, 7);
    return allExpenses.filter(e => String(e.date).slice(0, 7) === m).reduce((s, e) => s + num(e.amount), 0);
}

function openExpenseForm(rowNum){
    if (!can('expenses.write')) return showToast('Your role cannot edit expenses', 'error');
    expenseFormRow = (rowNum == null ? null : rowNum);
    const e = rowNum == null ? null : (allExpenses || []).find(x => x.rowNum === rowNum);
    const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v; };
    set('expDate', e ? e.date : todayStr());
    set('expCategory', e ? e.category : '');
    set('expDesc', e ? e.description : '');
    set('expAmount', e ? e.amount : '');
    const t = document.getElementById('expFormTitle');
    if (t) t.textContent = e ? 'Edit Expense' : 'Add Expense';
    const f = document.getElementById('expenseForm');
    if (f){ f.style.display = ''; f.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    const c = document.getElementById('expCategory'); if (c) c.focus();
}
function closeExpenseForm(){
    const f = document.getElementById('expenseForm');
    if (f) f.style.display = 'none';
    expenseFormRow = null;
}
async function saveExpense(){
    if (!can('expenses.write')) return showToast('Your role cannot edit expenses', 'error');
    const g = k => (document.getElementById(k).value || '').trim();
    const params = { date: g('expDate'), category: g('expCategory'), description: g('expDesc'), amount: g('expAmount') };
    if (!params.date) return showToast('Date is required', 'error');
    if (!params.category) return showToast('Category is required', 'error');
    if (params.amount === '' || isNaN(parseFloat(params.amount)) || parseFloat(params.amount) < 0) return showToast('Enter a valid amount', 'error');
    try {
        let data;
        if (expenseFormRow == null){
            data = await apiGet('addExpense', params);
        } else {
            params.rowNum = expenseFormRow;
            data = await apiGet('updateExpense', params);
        }
        if (data && data.success){
            showToast(expenseFormRow == null ? 'Expense added' : 'Expense updated', 'success');
            logLocal(expenseFormRow == null ? 'Expense added' : 'Expense updated', params.category + ' · Rs.' + params.amount);
            closeExpenseForm();
            await loadExpenses();
        } else showToast((data && data.error) || 'Save failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}
async function deleteExpenseRow(rowNum){
    if (!can('expenses.write')) return showToast('Your role cannot edit expenses', 'error');
    const e = (allExpenses || []).find(x => x.rowNum === rowNum);
    if (!confirm('Delete expense "' + (e ? e.category + ' Rs.' + e.amount : 'row ' + rowNum) + '"?')) return;
    try {
        const data = await apiGet('deleteExpense', { rowNum: rowNum });
        if (data && data.success){
            showToast('Expense deleted', 'success');
            logLocal('Expense deleted', e ? e.category + ' Rs.' + e.amount : 'row ' + rowNum);
            await loadExpenses();
        } else showToast((data && data.error) || 'Delete failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}

function renderExpenses(){
    const el = document.getElementById('view-expenses');
    if (!el) return;
    if (!getToken()){ el.innerHTML = uiHead('Finance', 'Sign in required', '') + uiEmpty('Sign in to see Expenses'); return; }
    if (!expensesInit && !expensesLoading) loadExpenses();

    const list = (allExpenses || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const total = expensesTotal();
    const month = expensesThisMonth();

    // category breakdown
    const byCat = {};
    list.forEach(e => { const c = String(e.category || 'Other'); byCat[c] = (byCat[c] || 0) + num(e.amount); });
    const cats = Object.keys(byCat).map(c => ({ cat: c, amt: byCat[c] })).sort((a, b) => b.amt - a.amt);
    const maxCat = cats.length ? cats[0].amt : 1;
    const catBars = cats.map(c =>
        '<div class="flex items-center gap-3 px-4 py-2">'
        + '<span class="w-28 shrink-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">' + esc(c.cat) + '</span>'
        + '<span class="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.06]"><span class="block h-full rounded-full bg-accent-500" style="width:' + Math.max(4, Math.round((c.amt / maxCat) * 100)) + '%"></span></span>'
        + '<span class="w-24 text-right text-[13px] font-semibold tnum">' + rs(c.amt) + '</span>'
        + '</div>').join('');

    const rows = list.map(e =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="px-4 py-2.5 whitespace-nowrap">' + esc(e.date) + '</td>'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(e.category) + '</td>'
        + '<td class="px-4 py-2.5 text-zinc-500">' + esc(e.description || '—') + '</td>'
        + '<td class="tnum px-4 py-2.5 text-right font-semibold">' + rs(e.amount) + '</td>'
        + '<td class="px-4 py-2.5 whitespace-nowrap text-right">'
        + (can('expenses.write')
            ? '<button onclick="openExpenseForm(' + e.rowNum + ')" class="mr-2 text-[12px] font-medium text-accent-600 hover:underline">Edit</button>'
              + '<button onclick="deleteExpenseRow(' + e.rowNum + ')" class="text-[12px] font-medium text-red-600 hover:underline">Delete</button>'
            : '<span class="text-[12px] text-zinc-400">—</span>')
        + '</td></tr>').join('');

    const allCats = EXPENSE_PRESETS.concat(cats.map(c => c.cat).filter(c => EXPENSE_PRESETS.indexOf(c) < 0));
    const catOptions = allCats.map(c => '<option value="' + esc(c) + '"></option>').join('');

    let banner = '';
    if (expensesErr){
        const missing = /unknown action/i.test(expensesErr);
        banner = '<div class="mb-4 rounded-lg border p-4 text-sm ' + (missing
            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200'
            : 'border-red-300 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300') + '">'
            + esc(expensesErr) + (missing ? ' — redeploy <code>apps-script/Code.gs</code> (Deploy → Manage deployments → New version) and reload.' : '') + '</div>';
    }

    el.innerHTML = uiHead('Finance', 'Expenses',
        'Business costs — salaries, transport, rent and more — stored in the <strong>Expenses</strong> sheet. These are subtracted from revenue on the Dashboard profit card.')
        + banner
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">'
        + uiCard('This Month', rs(month), 'text-amber-600')
        + uiCard('Total Expenses', rs(total))
        + uiCard('Entries', String(list.length))
        + uiCard('Top Category', cats.length ? cats[0].cat : '—')
        + '</div>'
        + (can('expenses.write')
            ? '<div class="mb-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<div class="flex items-center justify-between"><h3 class="font-display text-base font-semibold" id="expFormTitle">Add Expense</h3>'
        + '<button onclick="closeExpenseForm()" class="text-[12px] text-zinc-400 hover:text-zinc-600">Close</button></div>'
        + '<div id="expenseForm" class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Date *</label><input type="date" id="expDate" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Category *</label><input type="text" id="expCategory" list="expCatList" placeholder="Salary, Transport…" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]">'
        + '<datalist id="expCatList">' + catOptions + '</datalist></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Amount (Rs.) *</label><input type="number" id="expAmount" min="0" step="1" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '<div><label class="mb-1 block text-[12px] font-medium text-zinc-500">Description</label><input type="text" id="expDesc" placeholder="Optional" class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]"></div>'
        + '</div>'
        + '<div class="mt-4"><button onclick="saveExpense()" class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600">' + (expenseFormRow ? 'Save changes' : 'Add expense') + '</button></div>'
        + '</div>'
            : '')
        + (cats.length
            ? '<div class="mb-6"><p class="eyebrow mb-2">By category</p><div class="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white shadow-card dark:divide-white/[0.05] dark:border-white/[0.07] dark:bg-[#1F1B16]">' + catBars + '</div></div>'
            : '')
        + (expensesLoading ? uiEmpty('Loading expenses…')
            : uiTable(['Date', 'Category', 'Description', 'Amount', ''], rows, 'No expenses yet — add the first one above'));
}

PAGE_RENDERERS.finance = renderFinance;
PAGE_RENDERERS.expenses = renderExpenses;
