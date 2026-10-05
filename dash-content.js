// dash-content.js — Content section: blog posts + community projects (CMS)
// Mirrors dash-products.js: one loader, one renderer, one modal per record type.
let contentPosts = [];
let contentProjects = [];
let contentErr = null;
let contentLoading = false;
let contentInit = false;
let contentTab = 'projects';
let editingPostSlug = null;
let editingProjectId = null;
let postSlugTouched = false;
let edRange = null;

const POST_BODY_MAX = 50000;

function contentPending(){ return !contentInit && !contentErr; }

async function loadContent(){
    const token = getToken();
    if (!token || contentLoading) return;
    contentLoading = true;
    contentInit = true;
    try {
        const data = await apiGet('posts');
        if (data && data.success && Array.isArray(data.posts)){
            contentPosts = data.posts;
            contentErr = null;
        } else {
            contentErr = (data && data.error) || 'Failed to load posts';
        }
    } catch(e){ contentErr = 'Connection error: ' + e.message; }
    try {
        const data = await apiGet('projects');
        if (data && data.success && Array.isArray(data.projects)){
            contentProjects = data.projects;
            if (contentPosts.length) contentErr = null;
        } else if (!contentErr){
            contentErr = (data && data.error) || 'Failed to load projects';
        }
    } catch(e){ if (!contentErr) contentErr = 'Connection error: ' + e.message; }
    contentLoading = false;
    refreshActivePage();
}

function contentTabBtn(id, label){
    const on = contentTab === id;
    return '<button type="button" onclick="setContentTab(\'' + id + '\')" class="rounded-lg px-3.5 py-2 text-sm font-medium transition '
        + (on ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300')
        + '">' + label + '</button>';
}

function setContentTab(t){
    contentTab = (t === 'projects') ? 'projects' : 'blog';
    renderContent();
    if (typeof refreshNavHighlight === 'function' && typeof activePage !== 'undefined'){
        refreshNavHighlight(activePage);
    }
}

// Called by the two sidebar entries (Content > Projects / Content > Blogs).
function openContentTab(t){
    setContentTab(t);
    showPage('content');
}

// ==================== PAGE ====================
function renderContent(){
    const el = document.getElementById('view-content');
    if (!el) return;
    if (!getToken()){
        el.innerHTML = uiHead('Content', 'Sign in required', '') + uiEmpty('Sign in to manage content');
        return;
    }
    if (contentPending()){
        loadContent();
        el.innerHTML = uiHead('Content', 'Content', 'Publish blog posts and project cards straight to the website.')
            + uiEmpty('Loading content…');
        return;
    }
    const writable = can('content.write');
    const err = contentErr
        ? '<div class="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200">'
          + esc(contentErr)
          + (String(contentErr).indexOf('Unknown action') !== -1 ? ' — redeploy Code.gs (New version) and reload.' : '')
          + ' <button onclick="loadContent()" class="ml-2 rounded border border-current px-2 py-0.5 text-[12px] font-medium">Retry</button></div>'
        : '';

    const tabs = '<div class="mb-4 flex flex-wrap items-center gap-2">'
        + contentTabBtn('projects', 'Projects (' + contentProjects.length + ')')
        + contentTabBtn('blog', 'Blogs (' + contentPosts.length + ')')
        + '<button onclick="loadContent()" class="ml-auto rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300">Reload</button>'
        + '</div>';

    const panel = contentTab === 'projects' ? projectPanel(writable) : blogPanel(writable);
    el.innerHTML = uiHead('Content', 'Content',
        'Blog posts and project cards served live to <strong>community.html</strong> and <strong>blog/post.html</strong>. Drafts and hidden projects never leave the sheet.')
        + err + tabs + panel;
}

// ---- blog tab ----
function blogPanel(writable){
    const published = contentPosts.filter(p => p.published).length;
    const rows = contentPosts.map(p => {
        const actions = writable
            ? '<div class="flex flex-wrap items-center gap-1.5">'
              + '<button class="rounded-md bg-accent-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-600" onclick="openPostModal(\'' + esc(p.slug) + '\')">Edit</button>'
              + '<button class="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300" onclick="togglePostPublished(\'' + esc(p.slug) + '\')">'
                + (p.published ? 'Unpublish' : 'Publish') + '</button>'
              + (p.published ? '<a class="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300" href="' + esc(SHOP_ORIGIN) + '/blog/post.html?slug=' + encodeURIComponent(p.slug) + '" target="_blank" rel="noopener">View</a>' : '')
              + '<button class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400" onclick="deletePostRow(\'' + esc(p.slug) + '\')">Delete</button>'
              + '</div>'
            : '<span class="text-[12px] text-zinc-400">View only</span>';

        const badge = p.published
            ? '<span class="rounded bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">Published</span>'
            : '<span class="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Draft</span>';

        return '<tr class="border-b border-zinc-100 dark:border-white/[0.04]">'
            + '<td class="px-4 py-3"><div class="font-medium text-zinc-800 dark:text-zinc-100">' + esc(p.title) + '</div>'
            + '<div class="font-mono text-[11px] text-zinc-400">/blog/' + esc(p.slug) + '</div></td>'
            + '<td class="px-4 py-3">' + (p.category ? esc(p.category) : '<span class="text-zinc-400">—</span>') + '</td>'
            + '<td class="px-4 py-3 tnum">' + esc(p.date || '—') + '</td>'
            + '<td class="px-4 py-3"><div class="max-w-md truncate text-[13px] text-zinc-500 dark:text-zinc-400">' + esc(p.excerpt || '—') + '</div>'
            + '<div class="mt-0.5 text-[11px] text-zinc-400">' + (p.body ? String(p.body).length.toLocaleString() + ' chars' : 'empty body') + '</div></td>'
            + '<td class="px-4 py-3">' + badge + '</td>'
            + '<td class="px-4 py-3 text-[12px] text-zinc-400">' + esc(fmtStamp(p.updatedAt)) + '</td>'
            + '<td class="px-4 py-3">' + actions + '</td>'
            + '</tr>';
    }).join('');

    const head = '<div class="mb-3 flex flex-wrap items-center gap-3">'
        + (writable ? '<button onclick="openPostModal(null)" class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600">+ New post</button>' : '')
        + '<span class="text-[13px] text-zinc-500">' + contentPosts.length + ' posts · ' + published + ' live on the site</span>'
        + '</div>';

    return head + uiTable(['Post', 'Category', 'Date', 'Excerpt', 'Status', 'Updated', ''], rows,
        contentErr ? 'Backend unavailable' : 'No posts yet — the Posts sheet is empty');
}

// ---- projects tab ----
function projectPanel(writable){
    const active = contentProjects.filter(p => p.active).length;
    const rows = contentProjects.slice().sort((a, b) => num(a.sortOrder) - num(b.sortOrder)).map(p => {
        const view = '<a href="../project.html?id=' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener" '
            + 'class="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300">View</a>';
        const actions = writable
            ? '<div class="flex flex-wrap items-center gap-1.5">'
              + view
              + '<button class="rounded-md bg-accent-500 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-accent-600" onclick="openProjectModal(\'' + esc(p.id) + '\')">Edit</button>'
              + '<button class="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-zinc-300" onclick="toggleProjectActive(\'' + esc(p.id) + '\')">'
                + (p.active ? 'Hide' : 'Show') + '</button>'
              + '<button class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400" onclick="deleteProjectRow(\'' + esc(p.id) + '\')">Delete</button>'
              + '</div>'
            : '<div class="flex flex-wrap items-center gap-1.5">' + view + '<span class="text-[12px] text-zinc-400">View only</span></div>';
        const badge = p.active
            ? '<span class="rounded bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">Active</span>'
            : '<span class="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400">Hidden</span>';
        const parts = String(p.parts || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);

        return '<tr class="border-b border-zinc-100 dark:border-white/[0.04]">'
            + '<td class="px-4 py-3"><div class="flex items-center gap-2.5">'
            + (p.image ? '<img src="' + esc(shopImg(p.image)) + '" alt="" class="h-10 w-10 shrink-0 rounded-md border border-zinc-100 object-cover dark:border-white/[0.06]" onerror="this.remove()">' : '')
            + '<div><div class="font-medium text-zinc-800 dark:text-zinc-100">' + esc(p.title) + '</div>'
            + '<div class="font-mono text-[11px] text-zinc-400">' + esc(p.id) + ' · order ' + num(p.sortOrder) + '</div></div></div></td>'
            + '<td class="px-4 py-3 text-[13px] text-zinc-500 dark:text-zinc-400">' + (p.difficulty ? esc(p.difficulty) : '—') + '</td>'
            + '<td class="px-4 py-3 tnum text-[13px]">' + esc(p.time || '—') + '</td>'
            + '<td class="px-4 py-3 tnum text-[13px]">' + esc(p.cost || '—') + '</td>'
            + '<td class="px-4 py-3 text-[13px] text-zinc-500 dark:text-zinc-400">' + (parts.length ? parts.length + ' parts' : '—') + '</td>'
            + '<td class="px-4 py-3">' + badge + '</td>'
            + '<td class="px-4 py-3">' + actions + '</td>'
            + '</tr>';
    }).join('');

    const head = '<div class="mb-3 flex flex-wrap items-center gap-3">'
        + (writable ? '<button onclick="openProjectModal(null)" class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white hover:bg-accent-600">+ New project</button>' : '')
        + '<span class="text-[13px] text-zinc-500">' + contentProjects.length + ' projects · ' + active + ' shown on the site</span>'
        + '</div>';

    return head + uiTable(['Project', 'Difficulty', 'Time', 'Cost', 'Parts', 'Status', ''], rows,
        contentErr ? 'Backend unavailable' : 'No projects yet — the Projects sheet is empty');
}

function fmtStamp(v){
    if (!v) return '—';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ==================== POST MUTATIONS ====================
async function togglePostPublished(slug){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    const p = contentPosts.find(x => x.slug === slug);
    if (!p) return;
    const next = !p.published;
    p.published = next;
    renderContent();
    try {
        const data = await apiGet('updatePost', { slug: slug, published: String(next) });
        if (data && data.success){
            if (Array.isArray(data.posts)) contentPosts = data.posts;
            showToast(next ? 'Published — live on the site' : 'Unpublished — removed from the site', 'success');
            logLocal('Post ' + (next ? 'published' : 'unpublished'), slug);
        } else {
            p.published = !next;
            showToast((data && data.error) || 'Save failed', 'error');
        }
    } catch(e){
        p.published = !next;
        showToast('Connection error: ' + e.message, 'error');
    }
    renderContent();
}

async function deletePostRow(slug){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    const p = contentPosts.find(x => x.slug === slug);
    if (!p) return;
    if (!confirm('Delete the post "' + p.title + '"?\n\nThis removes the row from the Posts sheet. The old static blog file (if any) stays online.')) return;
    try {
        const data = await apiGet('deletePost', { slug: slug });
        if (data && data.success){
            if (Array.isArray(data.posts)) contentPosts = data.posts;
            showToast('Post deleted', 'success');
            logLocal('Post deleted', slug);
        } else showToast((data && data.error) || 'Delete failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
    renderContent();
}

// ==================== POST MODAL ====================
function postVal(id){ const el = document.getElementById(id); return el ? el.value : ''; }
function setPostVal(id, v){ const el = document.getElementById(id); if (el) el.value = v; }

function slugPreview(s){
    return String(s || '').toLowerCase().normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function postTitleTyped(){
    if (postSlugTouched) return;
    setPostVal('postSlug', slugPreview(postVal('postTitle')));
    updateSlugHint();
}

function updateSlugHint(){
    const hint = document.getElementById('postSlugHint');
    const link = document.getElementById('postPreviewLink');
    const s = slugPreview(postVal('postSlug'));
    if (hint){
        hint.classList.toggle('hidden', !s);
        hint.textContent = s ? '/blog/post.html?slug=' + s : '';
    }
    if (link){
        link.href = SHOP_ORIGIN + '/blog/post.html?slug=' + encodeURIComponent(s || '');
        link.textContent = s ? 'blog/post.html?slug=' + s : 'the Community page';
    }
    const cnt = document.getElementById('edCount');
    if (cnt) edUpdateCount();
}

function openPostModal(slug){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    edWhich = 'post';
    const p = slug ? contentPosts.find(x => x.slug === slug) : null;
    editingPostSlug = p ? p.slug : null;
    postSlugTouched = !!p;
    document.getElementById('postModalTitle').textContent = p ? 'Edit Post' : 'New Post';
    setPostVal('postTitle', p ? p.title : '');
    setPostVal('postSlug', p ? p.slug : '');
    setPostVal('postCategory', p ? p.category : '');
    setPostVal('postDate', p ? p.date : todayStr());
    setPostVal('postExcerpt', p ? p.excerpt : '');
    setPostVal('postPublished', p ? String(!!p.published) : 'false');
    const body = document.getElementById('postBody');
    if (body) body.innerHTML = p ? (p.body || '') : '';
    setPostStatus('', '');
    updateSlugHint();
    edUpdateCount();
    document.getElementById('postModal').style.display = 'flex';
    setTimeout(() => { const t = document.getElementById('postTitle'); if (t) t.focus(); }, 30);
}

function closePostModal(){
    document.getElementById('postModal').style.display = 'none';
    editingPostSlug = null;
    edRange = null;
}

function setPostStatus(msg, cls){
    const st = document.getElementById('postImageStatus');
    if (!st) return;
    if (!msg){ st.textContent = ''; st.className = 'mt-1 hidden text-[12px] text-zinc-500'; }
    else { st.textContent = msg; st.className = 'mt-1 text-[12px] ' + (cls || 'text-zinc-500'); }
}

async function savePostForm(){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    const title = postVal('postTitle').trim();
    if (!title) return showToast('Title is required', 'error');
    const slug = slugPreview(postVal('postSlug') || title);
    if (!slug) return showToast('Slug is required', 'error');
    const body = document.getElementById('postBody') ? document.getElementById('postBody').innerHTML.trim() : '';
    if (body.length > POST_BODY_MAX) return showToast('Body is too long — max ' + POST_BODY_MAX.toLocaleString() + ' characters', 'error');

    const params = {
        title: title,
        slug: slug,
        category: postVal('postCategory').trim(),
        date: postVal('postDate').trim(),
        excerpt: postVal('postExcerpt').trim(),
        body: body,
        published: postVal('postPublished')
    };
    const isNew = editingPostSlug === null;
    const action = isNew ? 'addPost' : 'updatePost';
    // updatePost locates the row with `slug`, so a rename has to travel as `newSlug`.
    const payload = isNew ? params : Object.assign({}, params, { newSlug: params.slug, slug: editingPostSlug });

    try {
        const data = await apiGet(action, payload);
        if (data && data.success){
            if (Array.isArray(data.posts)) contentPosts = data.posts;
            showToast(isNew ? 'Post added' : 'Post updated', 'success');
            logLocal(isNew ? 'Post added' : 'Post updated', slug);
            closePostModal();
            renderContent();
        } else showToast((data && data.error) || 'Save failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}

// ==================== RICH-TEXT EDITOR ====================
// Both modals share these helpers; edWhich picks the body/count/status targets.
let edWhich = 'post';
function edIsProj(){ return edWhich === 'proj'; }
function edBody(){ return document.getElementById(edIsProj() ? 'projBody' : 'postBody'); }
function edCountEl(){ return document.getElementById(edIsProj() ? 'edCountProj' : 'edCount'); }
function edStatus(msg, cls){
    const st = document.getElementById(edIsProj() ? 'projBodyStatus' : 'postImageStatus');
    if (!st) return;
    if (!msg){ st.textContent = ''; st.className = 'mt-1 hidden text-[12px] text-zinc-500'; }
    else { st.textContent = msg; st.className = 'mt-1 text-[12px] ' + (cls || 'text-zinc-500'); }
}

function edSaveRange(){
    const sel = window.getSelection();
    const body = edBody();
    if (body && sel && sel.rangeCount && body.contains(sel.anchorNode)) edRange = sel.getRangeAt(0).cloneRange();
}
function edRestoreRange(){
    const body = edBody();
    if (!body) return;
    body.focus();
    if (!edRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(edRange);
}
function edCmd(cmd, val){
    edRestoreRange();
    try { document.execCommand(cmd, false, val === undefined ? null : val); } catch(e){}
    edSaveRange();
    edUpdateCount();
}
function edBlock(tag){
    if (!tag) return;
    edRestoreRange();
    try { document.execCommand('formatBlock', false, '<' + tag + '>'); } catch(e){}
    edSaveRange();
    edUpdateCount();
}
function edSize(size){
    if (!size) return;
    edRestoreRange();
    try { document.execCommand('fontSize', false, size); } catch(e){}
    edSaveRange();
    edUpdateCount();
}
function edQuote(){
    edRestoreRange();
    try {
        const sel = window.getSelection();
        const inQuote = sel && sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest('blockquote');
        document.execCommand('formatBlock', false, inQuote ? '<p>' : '<blockquote>');
    } catch(e){}
    edSaveRange();
    edUpdateCount();
}
function edLink(){
    const url = prompt('Link URL', 'https://');
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && url.indexOf('/') !== 0 && url.indexOf('#') !== 0){
        return showToast('Links must start with http://, https:// or /', 'error');
    }
    edRestoreRange();
    const sel = window.getSelection();
    if (sel && sel.isCollapsed){
        try { document.execCommand('insertHTML', false, '<a href="' + esc(url) + '">' + esc(url) + '</a>'); }
        catch(e){ showToast('Could not insert the link', 'error'); }
    } else {
        try { document.execCommand('createLink', false, url); } catch(e){}
    }
    edSaveRange();
    edUpdateCount();
}
// Plain-text paste keeps line breaks; rich paste is passed through but stripped
// of scripts/styles so nothing hostile lands in the sheet.
function edPaste(e){
    const cd = e.clipboardData;
    if (!cd) return;
    e.preventDefault();
    const html = cd.getData('text/html');
    const text = cd.getData('text/plain');
    let out;
    if (html){
        out = html
            .replace(/<\/?(script|style|meta|link|iframe|object|embed)[^>]*>/gi, '')
            .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/\son\w+\s*=\s*'[^']*'/gi, '');
    } else {
        out = esc(text).split(/\r?\n/).join('<br>');
    }
    try { document.execCommand('insertHTML', false, out); } catch(err){}
    edSaveRange();
    edUpdateCount();
}
function edUpdateCount(){
    const cnt = edCountEl();
    const body = edBody();
    if (!cnt || !body) return;
    const n = body.innerText.replace(/\s+/g, ' ').trim().length;
    cnt.textContent = n.toLocaleString() + ' / ' + POST_BODY_MAX.toLocaleString() + ' chars';
    cnt.className = n > POST_BODY_MAX ? 'ml-auto text-[11px] font-semibold text-red-500' : 'ml-auto text-[11px] text-zinc-400';
}

function edInsertTable(){
    edRestoreRange();
    const html = '<table class="bom-table"><thead><tr><th>Part</th><th>Qty</th><th>Notes</th></tr></thead>'
        + '<tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>'
        + '<tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>';
    try { document.execCommand('insertHTML', false, html); } catch(e){ showToast('Could not insert the table', 'error'); }
    edSaveRange();
    edUpdateCount();
}
function edInsertCode(){
    edRestoreRange();
    const html = '<div class="code-block"><div class="code-header"><span>code</span></div>'
        + '<pre><code>// paste your code here</code></pre></div><p><br></p>';
    try { document.execCommand('insertHTML', false, html); } catch(e){ showToast('Could not insert the code block', 'error'); }
    edSaveRange();
    edUpdateCount();
}

async function insertPostImage(inp){
    if (!can('content.write')) return showToast('Your role cannot upload images', 'error');
    const file = inp.files && inp.files[0];
    inp.value = '';
    if (!file) return;
    if (file.type && !/^image\//.test(file.type)) return showToast('Please choose an image file', 'error');
    if (file.size > 12 * 1024 * 1024) return showToast('Image too large — max 12 MB before resize', 'error');
    try {
        edStatus('Preparing ' + (file.name || 'image') + '…');
        const prep = await resizeImage_(file);
        edStatus('Uploading…');
        const out = await apiGet('uploadImage', { filename: prep.name, mime: prep.mime, data: prep.data });
        if (out && out.success && out.url){
            edRestoreRange();
            try { document.execCommand('insertHTML', false, '<img src="' + esc(out.url) + '" alt="">'); }
            catch(e){ edStatus('Uploaded but could not be inserted — copy the URL from Settings', 'text-red-600 dark:text-red-400'); return; }
            edStatus('Image inserted', 'text-emerald-600 dark:text-emerald-400');
            showToast('Image inserted', 'success');
            logLocal('Image uploaded', prep.name);
            edUpdateCount();
        } else {
            edStatus((out && out.error) || 'Upload failed', 'text-red-600 dark:text-red-400');
        }
    } catch(e){
        edStatus('Upload error: ' + e.message, 'text-red-600 dark:text-red-400');
    }
}

// ==================== PROJECT MUTATIONS ====================
async function toggleProjectActive(id){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    const p = contentProjects.find(x => x.id === id);
    if (!p) return;
    const next = !p.active;
    p.active = next;
    renderContent();
    try {
        const data = await apiGet('updateProject', { id: id, active: String(next) });
        if (data && data.success){
            if (Array.isArray(data.projects)) contentProjects = data.projects;
            showToast(next ? 'Project shown on the site' : 'Project hidden from the site', 'success');
            logLocal('Project ' + (next ? 'activated' : 'deactivated'), id);
        } else {
            p.active = !next;
            showToast((data && data.error) || 'Save failed', 'error');
        }
    } catch(e){
        p.active = !next;
        showToast('Connection error: ' + e.message, 'error');
    }
    renderContent();
}

async function deleteProjectRow(id){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    const p = contentProjects.find(x => x.id === id);
    if (!p) return;
    if (!confirm('Delete the project "' + p.title + '"?\n\nIt disappears from the Community page immediately.')) return;
    try {
        const data = await apiGet('deleteProject', { id: id });
        if (data && data.success){
            if (Array.isArray(data.projects)) contentProjects = data.projects;
            showToast('Project deleted', 'success');
            logLocal('Project deleted', id);
        } else showToast((data && data.error) || 'Delete failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
    renderContent();
}

// ==================== PROJECT MODAL ====================
function projVal(id){ const el = document.getElementById(id); return el ? el.value : ''; }

function openProjectModal(id){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    edWhich = 'proj';
    const p = id ? contentProjects.find(x => x.id === id) : null;
    editingProjectId = p ? p.id : null;
    document.getElementById('projectModalTitle').textContent = p ? 'Edit Project' : 'New Project';
    const set = (k, v) => { const el = document.getElementById(k); if (el) el.value = v; };
    set('projTitle', p ? p.title : '');
    set('projDesc', p ? p.description : '');
    set('projCategory', p ? p.category : '');
    set('projDifficulty', p && p.difficulty ? p.difficulty : 'Beginner');
    set('projTime', p ? p.time : '');
    set('projCost', p ? p.cost : '');
    set('projSort', p ? num(p.sortOrder) : contentProjects.length + 1);
    set('projLink', p ? p.link : '');
    set('projImage', p ? p.image : '');
    set('projParts', p ? p.parts : '');
    set('projActive', p ? String(!!p.active) : 'true');
    const pb = document.getElementById('projBody');
    if (pb) pb.innerHTML = p ? (p.body || '') : '';
    edRange = null;
    edStatus('', '');
    setProjectStatus('', '');
    edUpdateCount();
    updateProjectPreview();
    document.getElementById('projectModal').style.display = 'flex';
    setTimeout(() => { const t = document.getElementById('projTitle'); if (t) t.focus(); }, 30);
}

function closeProjectModal(){
    document.getElementById('projectModal').style.display = 'none';
    editingProjectId = null;
    edRange = null;
}

function setProjectStatus(msg, cls){
    const st = document.getElementById('projImageStatus');
    if (!st) return;
    if (!msg){ st.textContent = ''; st.className = 'mt-1 hidden text-[12px] text-zinc-500'; }
    else { st.textContent = msg; st.className = 'mt-1 text-[12px] ' + (cls || 'text-zinc-500'); }
}

function updateProjectPreview(){
    const input = document.getElementById('projImage');
    const img = document.getElementById('projImagePreview');
    if (!input || !img) return;
    const v = (input.value || '').trim();
    if (!v){ img.classList.add('hidden'); img.removeAttribute('src'); return; }
    img.src = shopImg(v);
    img.classList.remove('hidden');
}

function projDragOver(e){
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    const z = document.getElementById('projImageDrop');
    if (z) z.classList.add('border-accent-500', 'bg-accent-500/10');
}
function projDrop(el, e){
    e.preventDefault();
    imageDragLeave(el);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) uploadProjectImage(f);
}
function projFilePicked(inp){
    const f = inp.files && inp.files[0];
    inp.value = '';
    if (f) uploadProjectImage(f);
}

async function uploadProjectImage(file){
    if (!can('content.write')) return showToast('Your role cannot upload images', 'error');
    if (!file) return;
    if (file.type && !/^image\//.test(file.type)) return showToast('Please choose an image file', 'error');
    if (file.size > 12 * 1024 * 1024) return showToast('Image too large — max 12 MB before resize', 'error');
    try {
        setProjectStatus('Preparing ' + (file.name || 'image') + '…');
        const prep = await resizeImage_(file);
        setProjectStatus('Uploading…');
        const out = await apiGet('uploadImage', { filename: prep.name, mime: prep.mime, data: prep.data });
        if (out && out.success && out.url){
            document.getElementById('projImage').value = out.url;
            updateProjectPreview();
            setProjectStatus('Uploaded — press Save to apply it', 'text-emerald-600 dark:text-emerald-400');
            showToast('Image uploaded — press Save', 'success');
            logLocal('Image uploaded', prep.name);
        } else {
            setProjectStatus((out && out.error) || 'Upload failed', 'text-red-600 dark:text-red-400');
        }
    } catch(e){
        setProjectStatus('Upload error: ' + e.message, 'text-red-600 dark:text-red-400');
    }
}

async function saveProjectForm(){
    if (!can('content.write')) return showToast('Your role cannot edit content', 'error');
    const title = projVal('projTitle').trim();
    if (!title) return showToast('Title is required', 'error');
    const pbEl = document.getElementById('projBody');
    const body = pbEl ? pbEl.innerHTML.replace(/(<br>|<div><\/div>|&nbsp;|\s)*$/i, '').trim() : '';
    if (body.length > POST_BODY_MAX) return showToast('Body is too long — max ' + POST_BODY_MAX.toLocaleString() + ' characters', 'error');

    const params = {
        title: title,
        description: projVal('projDesc').trim(),
        category: projVal('projCategory').trim(),
        body: body,
        image: projVal('projImage').trim(),
        link: projVal('projLink').trim(),
        difficulty: projVal('projDifficulty').trim(),
        time: projVal('projTime').trim(),
        cost: projVal('projCost').trim(),
        parts: projVal('projParts').replace(/\r/g, '').trim(),
        active: projVal('projActive'),
        sortOrder: projVal('projSort')
    };
    const isNew = editingProjectId === null;
    const action = isNew ? 'addProject' : 'updateProject';
    if (!isNew) params.id = editingProjectId;
    try {
        const data = await apiGet(action, params);
        if (data && data.success){
            if (Array.isArray(data.projects)) contentProjects = data.projects;
            showToast(isNew ? 'Project added' : 'Project updated', 'success');
            logLocal(isNew ? 'Project added' : 'Project updated', title);
            closeProjectModal();
            renderContent();
        } else showToast((data && data.error) || 'Save failed', 'error');
    } catch(e){ showToast('Connection error: ' + e.message, 'error'); }
}

PAGE_RENDERERS.content = renderContent;
