// dash-sys.js — System pages: Activity Log, System Health
let activityBackend = [], activityErr = null, activityLoading = false;
let activityFilter = '';

function sysNoToken(msg){ return uiHead('System', 'Sign in required', '') + uiEmpty(msg || 'Sign in to see this page'); }

// ==================== ACTIVITY LOG ====================
let activityLoaded = false;
async function loadActivity(){
    if (!getToken()) { renderActivity(); return; }
    activityLoaded = true;
    activityLoading = true; activityErr = null;
    renderActivity();
    try {
        const data = await apiGet('activity');
        if (data && data.success) activityBackend = data.entries || [];
        else activityErr = (data && data.error) || 'Failed to load activity';
    } catch(e){ activityErr = 'Connection error: ' + e.message; }
    activityLoading = false;
    renderActivity();
}
function setActivityFilter(v){ activityFilter = v; renderActivity(); }
function clearLocalActivity(){
    if (!confirm('Clear locally logged activity entries?')) return;
    ME_STORE.del('activity');
    showToast('Local activity cleared', 'success');
    renderActivity();
}
function renderActivity(){
    const el = document.getElementById('view-activity');
    if (!getToken()){ el.innerHTML = sysNoToken(); return; }
    if (!activityLoaded && !activityLoading) { loadActivity(); return; }
    const local = ME_STORE.get('activity', []);
    const merged = activityBackend.concat(local).filter(e => e && e.ts)
        .sort((a,b) => String(b.ts).localeCompare(String(a.ts)))
        .slice(0, 200);
    const q = activityFilter.toLowerCase();
    const list = q
        ? merged.filter(e => (String(e.user) + ' ' + String(e.action) + ' ' + String(e.target) + ' ' + String(e.ts) + ' ' + String(e.role || '') + ' ' + String(e.details || '')).toLowerCase().includes(q))
        : merged;

    const fmtTs = ts => {
        const d = new Date(ts);
        return isNaN(d) ? esc(String(ts).slice(0,19)) : d.toLocaleString();
    };
    const rows = list.map(e =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="tnum px-4 py-2.5 whitespace-nowrap text-zinc-500">' + fmtTs(e.ts) + '</td>'
        + '<td class="px-4 py-2.5">' + esc(e.user || '—') + '</td>'
        + '<td class="px-4 py-2.5">' + (e.role ? '<span class="rounded bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">' + esc(e.role) + '</span>' : '<span class="text-zinc-400">—</span>') + '</td>'
        + '<td class="px-4 py-2.5 font-medium text-zinc-900 dark:text-white">' + esc(e.action || '—') + '</td>'
        + '<td class="px-4 py-2.5 text-zinc-500">' + esc(e.target || '') + '</td>'
        + '<td class="px-4 py-2.5 text-[12px] text-zinc-500">' + esc(e.details || '') + '</td>'
        + '</tr>').join('');

    let banner = '';
    if (activityErr && /unknown action/i.test(activityErr)){
        banner = '<div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">'
            + '<strong>Backend activity API not deployed yet.</strong> Showing local entries only. Redeploy <code>apps-script/Code.gs</code> (Deploy → Manage deployments → New version) to enable the Activity sheet log.</div>';
    } else if (activityErr){
        banner = '<div class="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-400/10 dark:text-red-300">' + esc(activityErr)
            + ' <button onclick="loadActivity()" class="ml-2 rounded border border-current px-2 py-0.5 text-[12px] font-medium">Retry</button></div>';
    }

    el.innerHTML = uiHead('System', 'Activity Log',
        'Backend entries come from the <strong>Activity</strong> sheet (status/cost/expense changes). Local entries are browser-only actions such as inventory, purchases and deliveries saved without a backend API.')
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">'
        + uiCard('Entries', String(merged.length))
        + uiCard('From backend', String(activityBackend.length), 'text-accent-600')
        + uiCard('Local', String(local.length))
        + uiCard('Status', activityLoading ? 'Loading…' : (activityErr ? 'Local only' : 'Synced'), activityErr ? 'text-amber-600' : 'text-accent-600')
        + '</div>'
        + '<div class="mb-4 flex flex-wrap items-center gap-2">'
        + '<input type="text" value="' + esc(activityFilter) + '" oninput="setActivityFilter(this.value)" placeholder="Filter by action, target, user…" '
        + 'class="w-72 max-w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/[0.04]">'
        + '<button onclick="loadActivity()" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300">Reload backend</button>'
        + '<button onclick="clearLocalActivity()" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300">Clear local</button>'
        + '</div>'
        + banner
        + uiTable(['Time', 'User', 'Role', 'Action', 'Target', 'Details'], rows, activityLoading ? 'Loading…' : 'No activity yet');
}

// ==================== SYSTEM HEALTH ====================
const HEALTH_ENDPOINTS = ['stats', 'orders', 'products', 'suppliers', 'purchases', 'deliveries', 'expenses', 'activity'];
let healthRunning = false;

async function runHealthChecks(){
    if (!getToken()) return showToast('Not signed in', 'error');
    if (healthRunning) return;
    healthRunning = true;
    renderHealth();
    for (const action of HEALTH_ENDPOINTS){
        try { await apiGet(action); } catch(e){ /* recorded by apiGet */ }
    }
    healthRunning = false;
    renderHealth();
    showToast('Health checks complete', 'success');
}
function clearHealthLog(){
    if (!confirm('Clear recorded health results and error history?')) return;
    ME_STORE.del('health');
    showToast('Health log cleared', 'success');
    renderHealth();
}
function storageBytes(){
    let bytes = 0;
    try {
        for (let i = 0; i < localStorage.length; i++){
            const k = localStorage.key(i);
            bytes += (k.length + String(localStorage.getItem(k)).length) * 2;
        }
    } catch(e){}
    return bytes;
}
function renderHealth(){
    const el = document.getElementById('view-health');
    if (!getToken()){ el.innerHTML = sysNoToken(); return; }
    const h = ME_STORE.get('health', { api:{}, lastOk:null, errors:[] });
    const user = currentUserObj();

    const rows = HEALTH_ENDPOINTS.map(action => {
        const r = h.api[action];
        const status = !r ? '<span class="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400">Not checked</span>'
            : r.ok ? '<span class="rounded bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">OK</span>'
            : '<span class="rounded bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-500/15 dark:text-red-300">Error</span>';
        return '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
            + '<td class="px-4 py-2.5 font-mono text-[13px] font-medium text-zinc-900 dark:text-white">action=' + esc(action) + '</td>'
            + '<td class="px-4 py-2.5">' + status + '</td>'
            + '<td class="tnum px-4 py-2.5 text-right">' + (r && r.ok && r.ms != null ? r.ms + ' ms' : '—') + '</td>'
            + '<td class="tnum px-4 py-2.5 text-zinc-500">' + (r && r.at ? new Date(r.at).toLocaleString() : '—') + '</td>'
            + '<td class="px-4 py-2.5 text-[12px] text-red-600">' + (r && !r.ok ? esc(r.error || '') : '') + '</td>'
            + '</tr>';
    }).join('');

    const errRows = (h.errors || []).slice(0, 10).map(e =>
        '<tr class="hover:bg-zinc-50 dark:hover:bg-white/[0.03]">'
        + '<td class="tnum px-4 py-2 text-zinc-500">' + new Date(e.at).toLocaleString() + '</td>'
        + '<td class="px-4 py-2 font-mono text-[12px]">' + esc(e.action) + '</td>'
        + '<td class="px-4 py-2 text-[12px] text-red-600">' + esc(e.error) + '</td>'
        + '</tr>').join('');

    const okCount = HEALTH_ENDPOINTS.filter(a => h.api[a] && h.api[a].ok).length;

    el.innerHTML = uiHead('System', 'System Health',
        'Live read-only probes against the deployed Apps Script. Results and errors are stored in this browser (localStorage key <code>me_health</code>).')
        + '<div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">'
        + uiCard('Endpoints OK', okCount + ' / ' + HEALTH_ENDPOINTS.length, okCount === HEALTH_ENDPOINTS.length ? 'text-accent-600' : 'text-amber-600')
        + uiCard('Last success', h.lastOk ? new Date(h.lastOk).toLocaleTimeString() : '—', 'text-accent-600')
        + uiCard('Errors logged', String((h.errors || []).length), (h.errors || []).length ? 'text-red-600' : '')
        + uiCard('Storage used', (storageBytes()/1024).toFixed(1) + ' KB')
        + '</div>'
        + '<div class="mb-4 flex flex-wrap gap-2">'
        + '<button onclick="runHealthChecks()" ' + (healthRunning ? 'disabled' : '') + ' class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600 disabled:opacity-50">'
        + (healthRunning ? 'Checking…' : 'Run health checks') + '</button>'
        + '<button onclick="clearHealthLog()" class="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300">Clear log</button>'
        + '</div>'
        + uiTable(['Endpoint', 'Status', 'Latency', 'Checked at', 'Error'], rows, '')
        + '<div class="mt-6"><p class="eyebrow mb-2">Recent errors</p>'
        + uiTable(['Time', 'Action', 'Error'], errRows, 'No errors recorded') + '</div>'
        + '<div class="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-card dark:border-white/[0.07] dark:bg-[#1F1B16]">'
        + '<h3 class="font-display text-base font-semibold">Connection</h3>'
        + '<div class="mt-3 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">'
        + '<p><span class="detail-lbl">Signed in</span>' + (user ? '<span class="text-accent-600">' + esc(user.name || user.email) + ' · ' + esc(user.role) + '</span>' : '<span class="text-red-600">not signed in</span>') + '</p>'
        + '<p><span class="detail-lbl">Backend</span><span class="font-mono text-[12px] break-all">' + esc(endpoint()) + '</span></p>'
        + '<p><span class="detail-lbl">Storage keys</span><code class="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px] dark:bg-white/[0.06]">me_auth</code> <code class="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px] dark:bg-white/[0.06]">me_endpoint</code> <code class="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px] dark:bg-white/[0.06]">me_health</code> <code class="rounded bg-zinc-100 px-1.5 py-0.5 text-[12px] dark:bg-white/[0.06]">me_activity</code></p>'
        + '</div></div>';
}

PAGE_RENDERERS.activity = renderActivity;
PAGE_RENDERERS.health = renderHealth;
