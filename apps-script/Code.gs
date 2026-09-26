// ==================== CONFIG ====================
const CONFIG = {
  SHEET_NAME: 'Orders',
  EXPENSES_SHEET: 'Expenses',
  PRODUCTS_SHEET: 'Products',
  SUPPLIERS_SHEET: 'Suppliers',
  PURCHASES_SHEET: 'Purchases',
  SUPPLIER_PRODUCTS_SHEET: 'SupplierProducts',
  DELIVERIES_SHEET: 'Deliveries',
  USERS_SHEET: 'Users',
  SESSIONS_SHEET: 'Sessions',
  SESSION_TTL_MS: 12 * 60 * 60 * 1000, // 12h inactivity session lifetime
  SECRET_TOKEN: 'REPLACE_WITH_YOUR_TOKEN',
  WHATSAPP_NUMBER: '923373786628',
  ADMIN_EMAIL: 'help.makera@gmail.com',
  ORDER_PREFIX: 'ME',
  PRODUCT_COSTS: {
    1: 80, 2: 90, 3: 90, 4: 120,
    5: 50,
    6: 70, 7: 70,
    8: 70, 9: 100,
    10: 30, 11: 40,
    12: 80
  }
};

const VALID_STATUSES = {
  orderStatus: ['New', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
  paymentStatus: ['Pending', 'Paid', 'Failed'],
  confirmStatus: ['Pending', 'Confirmed', 'Rejected']
};

// ==================== HELPERS ====================
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    throw new Error('Orders sheet not found. Create a tab named "Orders".');
  }
  return sheet;
}

function getExpensesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(CONFIG.EXPENSES_SHEET);
}

function verifyToken(token) {
  return token === CONFIG.SECRET_TOKEN;
}

// ==================== AUTH: USERS, SESSIONS, PASSWORDS ====================
let AUTH_USER_ = null; // per-request auth context: {email,name,role,mustChangePassword,legacy?}

function getUsersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.USERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.USERS_SHEET);
    sheet.appendRow(['UserID', 'Email', 'Name', 'Role', 'PasswordHash', 'MustChangePassword', 'Active', 'CreatedAt', 'LastLogin']);
    sheet.setFrozenRows(1);
    seedDefaultUsers_(sheet);
  }
  if (sheet.getLastRow() < 2 && sheet.getLastRow() >= 1) {
    // header exists but no users → seed defaults
    const firstCell = String(sheet.getRange(1, 1).getValue() || '');
    if (firstCell === 'UserID') seedDefaultUsers_(sheet);
  }
  return sheet;
}

function seedDefaultUsers_(sheet) {
  const now = new Date();
  const defaults = [
    ['U001', 'muhammadbinjunaid2010@gmail.com', 'Muhammad Bin Junaid', 'CEO', makePasswordRecord_('muhammadbinjunaid2010@gmail.com'), true, true, now, ''],
    ['U002', 'ibrahimjunaid2008@gmail.com', 'Ibrahim Junaid', 'CFO', makePasswordRecord_('ibrahimjunaid2008@gmail.com'), true, true, now, ''],
    ['U003', 'hashmani@gmail.com', 'Hashmani', 'COO', makePasswordRecord_('hashmani@gmail.com'), true, true, now, '']
  ];
  defaults.forEach(function (row) { sheet.appendRow(row); });
}

function getSessionsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SESSIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SESSIONS_SHEET);
    sheet.appendRow(['SessionID', 'Email', 'Role', 'CreatedAt', 'LastSeen']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getPepper_() {
  const props = PropertiesService.getScriptProperties();
  let p = props.getProperty('AUTH_PEPPER');
  if (!p) {
    p = randomHex_(32);
    props.setProperty('AUTH_PEPPER', p);
  }
  return p;
}

function randomHex_(bytes) {
  const seed = Utilities.getUuid() + '|' + Date.now() + '|' + Math.random();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8);
  let hex = digest.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
  while (hex.length < bytes * 2) hex += randomHex_(1);
  return hex.slice(0, bytes * 2);
}

function hashPassword_(password, salt) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + '|' + password + '|' + getPepper_(),
    Utilities.Charset.UTF_8
  );
  return digest.map(function (b) { return ((b + 256) % 256).toString(16).padStart(2, '0'); }).join('');
}

function makePasswordRecord_(password) {
  const salt = randomHex_(16);
  return salt + '$' + hashPassword_(String(password), salt);
}

function verifyPassword_(password, stored) {
  if (!stored) return false;
  const s = String(stored);
  const i = s.indexOf('$');
  if (i < 1) return false;
  const salt = s.slice(0, i);
  const expected = s.slice(i + 1);
  const actual = hashPassword_(String(password), salt);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let k = 0; k < actual.length; k++) diff |= actual.charCodeAt(k) ^ expected.charCodeAt(k);
  return diff === 0;
}

function isTrueCell_(v) {
  return v === true || String(v).toUpperCase() === 'TRUE' || String(v) === '1';
}

function findUserByEmail_(email) {
  const sheet = getUsersSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return null;
  const want = String(email || '').trim().toLowerCase();
  const data = sheet.getRange(2, 1, last - 1, 9).getValues();
  for (let i = 0; i < data.length; i++) {
    const rowEmail = String(data[i][1] || '').trim().toLowerCase();
    if (rowEmail === want) {
      return {
        row: i + 2,
        id: String(data[i][0] || ''),
        email: String(data[i][1] || ''),
        name: String(data[i][2] || ''),
        role: String(data[i][3] || ''),
        passwordHash: String(data[i][4] || ''),
        mustChange: isTrueCell_(data[i][5]),
        active: isTrueCell_(data[i][6]),
        createdAt: data[i][7],
        lastLogin: data[i][8]
      };
    }
  }
  return null;
}

function publicUser_(u) {
  return {
    email: u.email,
    name: u.name,
    role: u.role,
    mustChangePassword: !!u.mustChangePassword
  };
}

function setUsersCell_(row, col, value) {
  getUsersSheet_().getRange(row, col).setValue(value);
}

// ---- sessions ----
function resolveSession_(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id || id.length < 32) return { ok: false, error: 'Not signed in' };
  const sheet = getSessionsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return { ok: false, error: 'Session expired — sign in again' };
  const data = sheet.getRange(2, 1, last - 1, 5).getValues();
  const now = Date.now();
  let idx = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === id) { idx = i; break; }
  }
  if (idx === -1) return { ok: false, error: 'Session expired — sign in again' };
  const lastSeen = data[idx][4] instanceof Date ? data[idx][4].getTime() : new Date(data[idx][4]).getTime();
  if (isNaN(lastSeen) || now - lastSeen > CONFIG.SESSION_TTL_MS) {
    try { sheet.deleteRow(idx + 2); } catch (e) { /* ignore */ }
    return { ok: false, error: 'Session expired — sign in again' };
  }
  const email = String(data[idx][1]);
  const u = findUserByEmail_(email);
  if (!u || !u.active) {
    try { sheet.deleteRow(idx + 2); } catch (e) { /* ignore */ }
    return { ok: false, error: 'This account has been deactivated' };
  }
  if (now - lastSeen > 5 * 60 * 1000) { // throttle LastSeen writes
    try { sheet.getRange(idx + 2, 5).setValue(new Date()); } catch (e) { /* ignore */ }
  }
  return { ok: true, user: { email: u.email, name: u.name, role: u.role, mustChangePassword: u.mustChange } };
}

function deleteSessionById_(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id) return;
  const sheet = getSessionsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const data = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === id) { sheet.deleteRow(i + 2); return; }
  }
}

function invalidateUserSessions_(email, keepSessionId) {
  const want = String(email || '').trim().toLowerCase();
  const sheet = getSessionsSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return;
  const data = sheet.getRange(2, 1, last - 1, 2).getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    const sid = String(data[i][0]);
    if (String(data[i][1]).trim().toLowerCase() === want && sid !== String(keepSessionId || '')) {
      sheet.deleteRow(i + 2);
    }
  }
}

function pruneExpiredSessions_() {
  try {
    const sheet = getSessionsSheet_();
    const last = sheet.getLastRow();
    if (last < 2) return;
    const data = sheet.getRange(2, 1, last - 1, 5).getValues();
    const now = Date.now();
    for (let i = data.length - 1; i >= 0; i--) {
      const lastSeen = data[i][4] instanceof Date ? data[i][4].getTime() : new Date(data[i][4]).getTime();
      if (isNaN(lastSeen) || now - lastSeen > CONFIG.SESSION_TTL_MS) sheet.deleteRow(i + 2);
    }
  } catch (e) { /* never block login on cleanup */ }
}

// ---- login / logout / password ----
function handleLogin_(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  if (!email || !password) {
    return jsonResponse({ success: false, error: 'Email and password are required', code: 'AUTH' }, 400);
  }
  const user = findUserByEmail_(email);
  const ok = !!user && user.active && verifyPassword_(password, user.passwordHash);
  if (!ok) {
    writeActivity_(email, 'Login failed', email, user ? (user.active ? 'Wrong password' : 'Account inactive') : 'Unknown account');
    return jsonResponse({ success: false, error: 'Invalid email or password', code: 'AUTH' }, 401);
  }
  pruneExpiredSessions_();
  const sessionId = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const now = new Date();
  getSessionsSheet_().appendRow([sessionId, user.email, user.role, now, now]);
  setUsersCell_(user.row, 9, now); // LastLogin
  AUTH_USER_ = { email: user.email, name: user.name, role: user.role, mustChangePassword: user.mustChange };
  writeActivity_(null, 'Login', user.email, 'Role ' + user.role);
  return jsonResponse({ success: true, session: sessionId, user: publicUser_(AUTH_USER_) });
}

// ---- permission map (backend enforcement) ----
// 'all'  = any authenticated session
// 'self' = authenticated (own-account actions handled in code)
// array  = roles allowed
// 'update' = field-based rules (paymentStatus: CEO/CFO, everything else: CEO)
const ACTION_ACCESS = {
  login: 'public',
  me: 'self',
  logout: 'self',
  changePassword: 'self',
  stats: 'all',
  orders: 'all',
  products: 'all',
  suppliers: ['CEO', 'COO'],
  purchases: ['CEO', 'COO'],
  deliveries: ['CEO', 'COO'],
  expenses: 'all',
  activity: 'all',
  update: 'update',
  updateCost: ['CEO'],
  addProduct: ['CEO', 'COO'],
  updateProduct: ['CEO', 'COO'],
  updateProductCost: ['CEO', 'COO'],
  addSupplier: ['CEO', 'COO'],
  updateSupplier: ['CEO', 'COO'],
  deleteSupplier: ['CEO', 'COO'],
  setSupplierProducts: ['CEO', 'COO'],
  addPurchase: ['CEO', 'COO'],
  updatePurchase: ['CEO', 'COO'],
  receivePurchase: ['CEO', 'COO'],
  deletePurchase: ['CEO', 'COO'],
  deliver: ['CEO', 'COO'],
  addExpense: ['CEO', 'CFO', 'COO'],
  updateExpense: ['CEO', 'CFO', 'COO'],
  deleteExpense: ['CEO', 'CFO', 'COO'],
  users: ['CEO'],
  setUserActive: ['CEO'],
  forcePasswordReset: ['CEO'],
  resetUserPassword: ['CEO']
};

function authorizeAction_(user, action, params) {
  if (!user) return { ok: false, error: 'Not signed in' };
  const rule = ACTION_ACCESS[action];
  if (rule === undefined) return { ok: false, error: 'Unknown action', unknown: true };
  if (rule === 'all' || rule === 'self' || rule === 'public') return { ok: true };
  let roles = rule;
  if (rule === 'update') {
    const field = String((params && params.field) || '');
    roles = (field === 'paymentStatus') ? ['CEO', 'CFO'] : ['CEO'];
  }
  if (Array.isArray(roles) && roles.indexOf(user.role) !== -1) return { ok: true };
  return { ok: false, error: 'Role ' + user.role + ' is not allowed to perform this action' };
}

function generateOrderId() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  let nextNum = 1;
  if (lastRow > 1) {
    const lastId = sheet.getRange(lastRow, 1).getValue();
    const match = String(lastId).match(/(\d+)$/);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  const year = new Date().getFullYear();
  return `${CONFIG.ORDER_PREFIX}-${year}-${String(nextNum).padStart(3, '0')}`;
}

// ==================== PRODUCTS (master list, backed by the Products sheet) ====================
const DEFAULT_CATALOG = [
  { id: 1,  name: '600v Digital Multimeter',        price: 1750, cost: 80 },
  { id: 2,  name: 'Advanced Multimeter',            price: 2050, cost: 90 },
  { id: 3,  name: 'Digital Multimeter',             price: 600,  cost: 90 },
  { id: 4,  name: 'Digital Multimeter Pro',         price: 950,  cost: 120 },
  { id: 5,  name: 'Arduino Nano',                   price: 550,  cost: 50 },
  { id: 6,  name: 'LM555 Astable & Monostable Kit', price: 85,   cost: 70 },
  { id: 7,  name: 'Transistor Flip Flop Kit',       price: 80,   cost: 70 },
  { id: 8,  name: 'Soldering Iron',                 price: 600,  cost: 70 },
  { id: 9,  name: 'Soldering Iron Pro',             price: 750,  cost: 100 },
  { id: 10, name: 'Soldering Wire (50g)',           price: 160,  cost: 30 },
  { id: 11, name: 'Soldering Wire Premium (50g)',   price: 200,  cost: 40 },
  { id: 12, name: 'Breadboard Small',               price: 200,  cost: 160 },
  { id: 13, name: 'Breadboard Large',               price: 360,  cost: 288 },
  { id: 14, name: 'Lithium Battery 2200mAh',        price: 230,  cost: 180 },
  { id: 15, name: 'Digital Temp Control Soldering Iron', price: 1150, cost: 850 }
];

function getProductsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.PRODUCTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PRODUCTS_SHEET);
    sheet.appendRow(['ProductID', 'Name', 'SellingPrice', 'CostPrice', 'ReorderLevel', 'Unit', 'Description', 'Active', 'Inventory']);
    DEFAULT_CATALOG.forEach(p => sheet.appendRow([p.id, p.name, p.price, p.cost, 0, 'pcs', '', true, 0]));
    invalidateProductsCache_();
  }
  return sheet;
}

function getProducts() {
  try {
    const sheet = getProductsSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    return data.map((row, i) => ({
      rowNum: i + 2,
      id: parseInt(row[0], 10),
      name: String(row[1] || ''),
      price: Number(row[2]) || 0,
      cost: Number(row[3]) || 0,
      reorderLevel: Number(row[4]) || 0,
      unit: String(row[5] || 'pcs'),
      description: String(row[6] || ''),
      active: !(row[7] === false || String(row[7]).toLowerCase() === 'false'),
      inventory: Number(row[8]) || 0
    })).filter(p => Number.isInteger(p.id) && p.id > 0);
  } catch (err) {
    console.warn('getProducts failed: ' + err);
    return [];
  }
}

function getProductsCached_() {
  try {
    const raw = CacheService.getScriptCache().get('PRODUCTS');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const list = getProducts();
  try { CacheService.getScriptCache().put('PRODUCTS', JSON.stringify(list), 30); } catch (e) {}
  return list;
}

function invalidateProductsCache_() {
  try { CacheService.getScriptCache().remove('PRODUCTS'); } catch (e) {}
}

function findProductRow_(sheet, productId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (parseInt(data[i][0], 10) === productId) return i + 2;
  }
  return -1;
}

function addProduct(p) {
  const sheet = getProductsSheet_();
  sheet.appendRow([p.id, p.name, p.price, p.cost, p.reorderLevel, p.unit, p.description, p.active, p.inventory]);
  invalidateProductsCache_();
  writeActivity_('Admin', 'Product added', 'Product #' + p.id + ' ' + p.name + ' · Rs.' + p.price);
  return { success: true };
}

function updateProduct(id, f) {
  const sheet = getProductsSheet_();
  const rowNum = findProductRow_(sheet, id);
  if (rowNum < 0) return { success: false, error: 'Product #' + id + ' not found' };
  const current = getProducts().find(p => p.id === id);
  if (!current) return { success: false, error: 'Product #' + id + ' not found' };

  const next = {
    id: id,
    name: f.name !== undefined ? f.name : current.name,
    price: f.price !== undefined ? f.price : current.price,
    cost: f.cost !== undefined ? f.cost : current.cost,
    reorderLevel: f.reorderLevel !== undefined ? f.reorderLevel : current.reorderLevel,
    unit: f.unit !== undefined ? f.unit : current.unit,
    description: f.description !== undefined ? f.description : current.description,
    active: f.active !== undefined ? f.active : current.active,
    inventory: f.inventory !== undefined ? f.inventory : current.inventory
  };
  sheet.getRange(rowNum, 1, 1, 9).setValues(
    [[next.id, next.name, next.price, next.cost, next.reorderLevel, next.unit, next.description, next.active, next.inventory]]
  );

  if (f.cost !== undefined && f.cost !== current.cost) {
    // Keep legacy Script Properties in sync (fallback for orders). Historical order profits are NOT touched.
    try {
      const props = PropertiesService.getScriptProperties();
      let overrides = {};
      try { const raw = props.getProperty('PRODUCT_COSTS'); if (raw) overrides = JSON.parse(raw); } catch (e) {}
      overrides[id] = f.cost;
      props.setProperty('PRODUCT_COSTS', JSON.stringify(overrides));
    } catch (e) {}
    writeActivity_('Admin', 'Product cost changed', 'Product #' + id + ' → Rs.' + f.cost + ' (historical orders unchanged)');
  }

  const changed = [];
  if (f.name !== undefined && f.name !== current.name) changed.push('name');
  if (f.price !== undefined && f.price !== current.price) changed.push('price');
  if (f.cost !== undefined && f.cost !== current.cost) changed.push('cost');
  if (f.reorderLevel !== undefined && f.reorderLevel !== current.reorderLevel) changed.push('reorder ' + current.reorderLevel + '→' + f.reorderLevel);
  if (f.inventory !== undefined && f.inventory !== current.inventory) {
    changed.push('inventory ' + current.inventory + '→' + f.inventory);
    writeActivity_('Admin', 'Inventory updated', 'Product #' + id + ' ' + next.name + ': ' + current.inventory + ' → ' + f.inventory);
  }
  if (f.active !== undefined && f.active !== current.active) changed.push(f.active ? 'activated' : 'deactivated');
  if (f.unit !== undefined && f.unit !== current.unit) changed.push('unit');
  if (f.description !== undefined && f.description !== current.description) changed.push('description');
  if (changed.length && !(changed.length === 1 && changed[0].indexOf('inventory') === 0)) {
    writeActivity_('Admin', 'Product updated', 'Product #' + id + ' ' + next.name + ' · ' + changed.join(', '));
  }

  invalidateProductsCache_();
  return { success: true, product: next };
}

function setProductCost(productId, cost) {
  const sheet = getProductsSheet_();
  const rowNum = findProductRow_(sheet, productId);
  if (rowNum >= 0) {
    sheet.getRange(rowNum, 4).setValue(cost);
  }
  const props = PropertiesService.getScriptProperties();
  let overrides = {};
  try { const raw = props.getProperty('PRODUCT_COSTS'); if (raw) overrides = JSON.parse(raw); } catch (e) {}
  overrides[productId] = cost;
  props.setProperty('PRODUCT_COSTS', JSON.stringify(overrides));
  invalidateProductsCache_();
  writeActivity_('Admin', 'Product cost changed', 'Product #' + productId + ' → Rs.' + cost + ' (historical orders unchanged)');
}

function getProductCosts() {
  const costs = {};
  getProductsCached_().forEach(p => { costs[p.id] = p.cost; });
  let overrides = {};
  try {
    const raw = PropertiesService.getScriptProperties().getProperty('PRODUCT_COSTS');
    if (raw) overrides = JSON.parse(raw);
  } catch (e) {}
  return Object.assign({}, CONFIG.PRODUCT_COSTS, overrides, costs);
}

function parseProductAdd_(param) {
  const name = String(param.name || '').trim();
  if (!name) return { error: 'Product name is required' };
  const price = parseFloat(param.price);
  const cost = parseFloat(param.cost);
  const reorderLevel = parseFloat(param.reorderLevel);
  const inventory = parseFloat(param.inventory);
  if (!isNaN(param.price) && (isNaN(price) || price < 0)) return { error: 'Invalid selling price' };
  if (!isNaN(param.cost) && (isNaN(cost) || cost < 0)) return { error: 'Invalid cost price' };
  if (isNaN(reorderLevel) || reorderLevel < 0) return { error: 'Reorder level is required (0 or more)' };
  if (isNaN(inventory) || inventory < 0) return { error: 'Inventory must be 0 or more' };

  let id = parseInt(param.productId !== undefined && param.productId !== '' ? param.productId : param.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    const products = getProducts();
    id = products.reduce((mx, p) => Math.max(mx, p.id), 0) + 1;
  } else if (findProductRow_(getProductsSheet_(), id) >= 0) {
    return { error: 'Product ID ' + id + ' already exists' };
  }
  return {
    product: {
      id: id,
      name: name,
      price: isNaN(price) ? 0 : price,
      cost: isNaN(cost) ? 0 : cost,
      reorderLevel: reorderLevel,
      unit: String(param.unit || 'pcs').trim() || 'pcs',
      description: String(param.description || '').trim(),
      active: !(param.active === 'false' || param.active === false),
      inventory: inventory
    }
  };
}

function parseProductUpdate_(param) {
  const id = parseInt(param.productId !== undefined ? param.productId : param.id, 10);
  if (!Number.isInteger(id) || id < 1) return { error: 'Invalid productId' };
  const f = {};
  if (param.name !== undefined) { const v = String(param.name).trim(); if (!v) return { error: 'Name cannot be empty' }; f.name = v; }
  if (param.price !== undefined) { const v = parseFloat(param.price); if (isNaN(v) || v < 0) return { error: 'Invalid price' }; f.price = v; }
  if (param.cost !== undefined) { const v = parseFloat(param.cost); if (isNaN(v) || v < 0) return { error: 'Invalid cost' }; f.cost = v; }
  if (param.reorderLevel !== undefined) { const v = parseFloat(param.reorderLevel); if (isNaN(v) || v < 0) return { error: 'Invalid reorder level' }; f.reorderLevel = v; }
  if (param.inventory !== undefined) { const v = parseFloat(param.inventory); if (isNaN(v) || v < 0) return { error: 'Invalid inventory' }; f.inventory = v; }
  if (param.unit !== undefined) f.unit = String(param.unit).trim() || 'pcs';
  if (param.description !== undefined) f.description = String(param.description).trim();
  if (param.active !== undefined) f.active = !(param.active === 'false' || param.active === false);
  return { id: id, fields: f };
}

// ==================== SUPPLIERS ====================
function getSuppliersSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SUPPLIERS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SUPPLIERS_SHEET);
    sheet.appendRow(['SupplierID', 'Name', 'ContactPerson', 'Phone', 'WhatsApp', 'Email', 'Address', 'City', 'Notes', 'CreatedAt']);
  }
  return sheet;
}

function getSuppliers() {
  const sheet = getSuppliersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
    const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
    const linkMap = getSupplierProductIds_();
    return data.map((row, i) => ({
      rowNum: i + 2,
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      contactPerson: String(row[2] || ''),
      phone: String(row[3] || ''),
      whatsapp: String(row[4] || ''),
      email: String(row[5] || ''),
      address: String(row[6] || ''),
      city: String(row[7] || ''),
      notes: String(row[8] || ''),
      createdAt: row[9] instanceof Date ? row[9].toISOString() : String(row[9] || '')
    })).filter(s => s.id).map(s => {
      s.productIds = linkMap[s.id] || [];
      return s;
    });
  }

function parseSupplierParams_(param) {
  const name = String(param.name || '').trim();
  if (!name) return { error: 'Supplier name is required' };
  return {
    supplier: {
      name: name,
      contactPerson: String(param.contactPerson || '').trim(),
      phone: String(param.phone || '').trim(),
      whatsapp: String(param.whatsapp || '').trim(),
      email: String(param.email || '').trim(),
      address: String(param.address || '').trim(),
      city: String(param.city || '').trim(),
      notes: String(param.notes || '').trim()
    }
  };
}

function nextId_(sheet, prefix, col) {
  const lastRow = sheet.getLastRow();
  let nextNum = 1;
  if (lastRow > 1) {
    const last = String(sheet.getRange(lastRow, col).getValue() || '');
    const m = last.match(/(\d+)$/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  return prefix + String(nextNum).padStart(3, '0');
}

function addSupplier(s) {
  const sheet = getSuppliersSheet_();
  const id = nextId_(sheet, 'SUP-', 1);
  sheet.appendRow([id, s.name, s.contactPerson, s.phone, s.whatsapp, s.email, s.address, s.city, s.notes, new Date()]);
  writeActivity_('Admin', 'Supplier added', id + ' ' + s.name);
  return { success: true, id: id };
}

function updateSupplier(id, s) {
  const sheet = getSuppliersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, error: 'Supplier not found' };
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      const rowNum = i + 2;
      const current = getSuppliers().find(x => x.id === id);
      const next = {
        name: s.name !== undefined ? s.name : current.name,
        contactPerson: s.contactPerson !== undefined ? s.contactPerson : current.contactPerson,
        phone: s.phone !== undefined ? s.phone : current.phone,
        whatsapp: s.whatsapp !== undefined ? s.whatsapp : current.whatsapp,
        email: s.email !== undefined ? s.email : current.email,
        address: s.address !== undefined ? s.address : current.address,
        city: s.city !== undefined ? s.city : current.city,
        notes: s.notes !== undefined ? s.notes : current.notes
      };
      sheet.getRange(rowNum, 2, 1, 8).setValues(
        [[next.name, next.contactPerson, next.phone, next.whatsapp, next.email, next.address, next.city, next.notes]]
      );
      writeActivity_('Admin', 'Supplier updated', id + ' ' + next.name);
      return { success: true };
    }
  }
  return { success: false, error: 'Supplier not found: ' + id };
}

function deleteSupplier(id) {
  const sheet = getSuppliersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, error: 'Supplier not found' };
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      const name = String(sheet.getRange(i + 2, 2).getValue() || '');
      sheet.deleteRow(i + 2);
      removeSupplierLinks_(id);
      writeActivity_('Admin', 'Supplier deleted', id + ' ' + name);
      return { success: true };
    }
  }
  return { success: false, error: 'Supplier not found: ' + id };
}

// ==================== SUPPLIER ↔ PRODUCT LINKS (SupplierProducts sheet) ====================
function getSupplierProductsSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SUPPLIER_PRODUCTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SUPPLIER_PRODUCTS_SHEET);
    sheet.appendRow(['SupplierID', 'ProductID', 'AddedAt']);
  }
  return sheet;
}

function getSupplierProductIds_() {
  try {
    const sheet = getSupplierProductsSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};
    const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    const map = {};
    data.forEach(row => {
      const sid = String(row[0] || '');
      const pid = parseInt(row[1], 10);
      if (!sid || !Number.isInteger(pid) || pid < 1) return;
      if (!map[sid]) map[sid] = [];
      if (map[sid].indexOf(pid) < 0) map[sid].push(pid);
    });
    return map;
  } catch (e) {
    console.warn('getSupplierProductIds_ failed: ' + e);
    return {};
  }
}

function removeSupplierLinks_(supplierId) {
  try {
    const sheet = getSupplierProductsSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === supplierId) sheet.deleteRow(i + 2);
    }
  } catch (e) {
    console.warn('removeSupplierLinks_ failed: ' + e);
  }
}

function setSupplierProducts(supplierId, productIds) {
  const existing = getSuppliers().find(s => s.id === supplierId);
  if (!existing) return { success: false, error: 'Supplier not found: ' + supplierId };
  removeSupplierLinks_(supplierId);
  const sheet = getSupplierProductsSheet_();
  const uniq = [];
  (productIds || []).forEach(pid => {
    const n = parseInt(pid, 10);
    if (Number.isInteger(n) && n > 0 && uniq.indexOf(n) < 0) uniq.push(n);
  });
  uniq.forEach(pid => sheet.appendRow([supplierId, pid, new Date()]));
  writeActivity_('Admin', 'Supplier products updated', supplierId + ' ' + existing.name + ' → ' + (uniq.join(', ') || 'none'));
  return { success: true, productIds: uniq };
}

function linkSupplierProduct_(supplierId, productId) {
  const sid = String(supplierId || '').trim();
  const pid = parseInt(productId, 10);
  if (!sid || !Number.isInteger(pid) || pid < 1) return;
  const map = getSupplierProductIds_();
  if (map[sid] && map[sid].indexOf(pid) >= 0) return;
  getSupplierProductsSheet_().appendRow([sid, pid, new Date()]);
}

// ==================== PURCHASES ====================
function getPurchasesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.PURCHASES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.PURCHASES_SHEET);
    sheet.appendRow(['PurchaseID', 'Date', 'SupplierID', 'Supplier', 'ProductID', 'Product', 'Qty', 'UnitCost', 'Total', 'Status', 'ReceivedDate', 'Notes']);
  }
  return sheet;
}

function getPurchases() {
  const sheet = getPurchasesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 12).getValues();
  return data.map((row, i) => ({
    rowNum: i + 2,
    id: String(row[0] || ''),
    date: row[1] instanceof Date
      ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(row[1] || ''),
    supplierId: String(row[2] || ''),
    supplier: String(row[3] || ''),
    productId: parseInt(row[4], 10),
    product: String(row[5] || ''),
    qty: Number(row[6]) || 0,
    unitCost: Number(row[7]) || 0,
    total: Number(row[8]) || 0,
    status: String(row[9] || 'Ordered'),
    receivedDate: row[10] instanceof Date
      ? Utilities.formatDate(row[10], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(row[10] || ''),
    notes: String(row[11] || '')
  })).filter(p => p.id);
}

function parsePurchaseParams_(param, requireAll) {
  const date = String(param.date || '').trim();
  const productId = parseInt(param.productId, 10);
  const qty = parseFloat(param.qty);
  const unitCost = parseFloat(param.unitCost);
  if (requireAll) {
    if (!date) return { error: 'Purchase date is required' };
    if (!Number.isInteger(productId) || productId < 1) return { error: 'Product is required' };
    if (isNaN(qty) || qty <= 0) return { error: 'Quantity must be more than 0' };
    if (isNaN(unitCost) || unitCost < 0) return { error: 'Invalid unit cost' };
  }
  return { purchase: {
    date: date,
    supplierId: String(param.supplierId || '').trim(),
    supplier: String(param.supplier || '').trim(),
    productId: productId,
    qty: qty,
    unitCost: unitCost,
    notes: String(param.notes || '').trim()
  } };
}

function addPurchase(p) {
  const sheet = getPurchasesSheet_();
  const id = nextId_(sheet, 'PUR-', 1);
  const products = getProducts();
  const product = products.find(x => x.id === p.productId);
  const productName = product ? product.name : ('Product #' + p.productId);
  const total = p.qty * p.unitCost;
  sheet.appendRow([id, p.date, p.supplierId, p.supplier, p.productId, productName, p.qty, p.unitCost, total, 'Ordered', '', p.notes]);
  if (p.supplierId && p.productId) linkSupplierProduct_(p.supplierId, p.productId);
  writeActivity_('Admin', 'Purchase created', id + ' ' + productName + ' x' + p.qty + ' @ Rs.' + p.unitCost +
    (p.supplier ? ' · ' + p.supplier : ''));
  return { success: true, id: id };
}

function updatePurchase(id, p) {
  const sheet = getPurchasesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, error: 'Purchase not found' };
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      const rowNum = i + 2;
      const current = getPurchases().find(x => x.id === id);
      if (current.status === 'Received') return { success: false, error: 'Purchase already received — cannot edit' };
      const products = getProducts();
      const productId = p.productId !== undefined ? parseInt(p.productId, 10) : current.productId;
      const product = products.find(x => x.id === productId);
      const qty = p.qty !== undefined ? parseFloat(p.qty) : current.qty;
      const unitCost = p.unitCost !== undefined ? parseFloat(p.unitCost) : current.unitCost;
      if (isNaN(qty) || qty <= 0) return { success: false, error: 'Invalid quantity' };
      if (isNaN(unitCost) || unitCost < 0) return { success: false, error: 'Invalid unit cost' };
      const date = p.date !== undefined && String(p.date).trim() ? String(p.date).trim() : current.date;
      sheet.getRange(rowNum, 2, 1, 10).setValues([[
        date,
        p.supplierId !== undefined ? String(p.supplierId).trim() : current.supplierId,
        p.supplier !== undefined ? String(p.supplier).trim() : current.supplier,
        productId,
        product ? product.name : ('Product #' + productId),
        qty,
        unitCost,
        qty * unitCost,
        current.status,
        current.receivedDate,
        p.notes !== undefined ? String(p.notes).trim() : current.notes
      ]]);
      writeActivity_('Admin', 'Purchase updated', id + ' · qty ' + current.qty + '→' + qty + ', cost Rs.' + current.unitCost + '→Rs.' + unitCost);
      return { success: true };
    }
  }
  return { success: false, error: 'Purchase not found: ' + id };
}

function receivePurchase(id) {
  const sheet = getPurchasesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, error: 'Purchase not found' };
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      const rowNum = i + 2;
      const purchase = getPurchases().find(x => x.id === id);
      if (!purchase) return { success: false, error: 'Purchase not found' };
      if (purchase.status === 'Received') return { success: false, error: 'Already received' };

      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      sheet.getRange(rowNum, 10, 1, 2).setValues([['Received', today]]);

      // Increase inventory for the purchased product
      let inventoryNote = '';
      if (Number.isInteger(purchase.productId)) {
        const pSheet = getProductsSheet_();
        const pRow = findProductRow_(pSheet, purchase.productId);
        if (pRow >= 0) {
          const before = Number(pSheet.getRange(pRow, 9).getValue()) || 0;
          const after = before + purchase.qty;
          pSheet.getRange(pRow, 9).setValue(after);
          invalidateProductsCache_();
          inventoryNote = ' · inventory ' + before + '→' + after;
          writeActivity_('Admin', 'Inventory updated', 'Product #' + purchase.productId + ' ' + purchase.product + ': ' + before + ' → ' + after + ' (purchase ' + id + ')');
        }
      }
      writeActivity_('Admin', 'Purchase received', id + ' ' + purchase.product + ' x' + purchase.qty + inventoryNote);
      return { success: true };
    }
  }
  return { success: false, error: 'Purchase not found: ' + id };
}

function deletePurchase(id) {
  const sheet = getPurchasesSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { success: false, error: 'Purchase not found' };
  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      const rowNum = i + 2;
      const purchase = getPurchases().find(x => x.id === id);
      if (purchase && purchase.status === 'Received') {
        const pSheet = getProductsSheet_();
        const pRow = findProductRow_(pSheet, purchase.productId);
        if (pRow >= 0) {
          const before = Number(pSheet.getRange(pRow, 9).getValue()) || 0;
          const after = Math.max(0, before - purchase.qty);
          pSheet.getRange(pRow, 9).setValue(after);
          invalidateProductsCache_();
          writeActivity_('Admin', 'Inventory updated', 'Product #' + purchase.productId + ' ' + purchase.product + ': ' + before + ' → ' + after + ' (purchase ' + id + ' deleted)');
        }
      }
      sheet.deleteRow(rowNum);
      writeActivity_('Admin', 'Purchase deleted', id + (purchase ? ' ' + purchase.product : ''));
      return { success: true };
    }
  }
  return { success: false, error: 'Purchase not found: ' + id };
}

// ==================== DELIVERIES (receipts) ====================
function getDeliveriesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.DELIVERIES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.DELIVERIES_SHEET);
    sheet.appendRow(['OrderID', 'DeliveredAt', 'ReceivedBy', 'Signature', 'Date', 'Time', 'Notes', 'RecordedBy']);
  }
  return sheet;
}

function getDeliveries() {
  try {
    const sheet = getDeliveriesSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    return data.map((row, i) => ({
      rowNum: i + 2,
      orderId: String(row[0] || ''),
      deliveredAt: row[1] instanceof Date ? row[1].toISOString() : String(row[1] || ''),
      receivedBy: String(row[2] || ''),
      signature: String(row[3] || ''),
      date: row[4] instanceof Date
        ? Utilities.formatDate(row[4], Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(row[4] || ''),
      time: String(row[5] || ''),
      notes: String(row[6] || ''),
      recordedBy: String(row[7] || '')
    }));
  } catch (err) {
    return [];
  }
}

function deliverOrder(param) {
  const orderId = String(param.orderId || '').trim();
  if (!orderId) return { success: false, error: 'Missing orderId' };

  const orders = getAllOrders();
  const order = orders.find(o => String(o.orderId) === orderId);
  if (!order) return { success: false, error: 'Order not found: ' + orderId };
  if (order.orderStatus === 'Cancelled') return { success: false, error: 'Order is cancelled' };

  // Set status (also decrements stock once, on the transition to Delivered)
  const statusResult = updateOrderStatus(orderId, 'orderStatus', 'Delivered');
  if (!statusResult.success) return statusResult;

  const sheet = getDeliveriesSheet_();
  const record = {
    orderId: orderId,
    receivedBy: String(param.receivedBy || '').trim(),
    signature: String(param.signature || '').trim(),
    date: String(param.date || '').trim() || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    time: String(param.time || '').trim(),
    notes: String(param.notes || '').trim()
  };

  // Upsert receipt (one per order)
  const lastRow = sheet.getLastRow();
  let targetRow = -1;
  if (lastRow >= 2) {
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === orderId) { targetRow = i + 2; break; }
    }
  }
  const row = [orderId, new Date(), record.receivedBy, record.signature, record.date, record.time, record.notes, 'Admin'];
  if (targetRow >= 0) sheet.getRange(targetRow, 1, 1, 8).setValues([row]);
  else sheet.appendRow(row);

  writeActivity_('Admin', 'Order delivered', orderId + ' · received by ' + (record.receivedBy || 'n/a'));
  return { success: true, delivery: record };
}

// Decrement stock for the items in an order when it is delivered
function decrementStockForOrder_(orderId) {
  try {
    const order = getAllOrders().find(o => String(o.orderId) === orderId);
    if (!order) return;
    const rows = String(order.itemsText || '').split(';').map(s => s.trim()).filter(Boolean);
    const products = getProducts();
    const changes = [];
    rows.forEach(row => {
      const m = row.match(/^(.*?)\s*[xX](\d+)$/);
      const name = (m ? m[1] : row).trim().toLowerCase();
      const qty = m ? parseInt(m[2], 10) : 1;
      let product = products.find(p => p.name.trim().toLowerCase() === name);
      if (!product) product = products.find(p => name.indexOf(p.name.trim().toLowerCase()) !== -1 || p.name.trim().toLowerCase().indexOf(name) !== -1);
      if (!product) return; // custom / unknown item — nothing to decrement
      const pSheet = getProductsSheet_();
      const pRow = findProductRow_(pSheet, product.id);
      if (pRow < 0) return;
      const before = Number(pSheet.getRange(pRow, 9).getValue()) || 0;
      const after = Math.max(0, before - qty);
      if (after !== before) {
        pSheet.getRange(pRow, 9).setValue(after);
        changes.push(product.name + ' ' + before + '→' + after);
      }
    });
    if (changes.length) {
      invalidateProductsCache_();
      writeActivity_('Admin', 'Inventory updated', orderId + ' delivered · ' + changes.join(', '));
    }
  } catch (err) {
    console.warn('decrementStockForOrder failed: ' + err);
  }
}

// ==================== ACTIVITY LOG ====================

function calculateCostPrice(items) {
  if (!Array.isArray(items)) return 0;
  const costs = getProductCosts();
  return items.reduce((sum, item) => {
    if (!item || typeof item.id === 'undefined' || typeof item.qty === 'undefined') return sum;
    const cost = costs[item.id] || 0;
    return sum + (cost * Number(item.qty));
  }, 0);
}

function buildWhatsAppUrl(template, data) {
  const msg = template
    .replace('{name}', data.name || '')
    .replace('{orderId}', data.orderId || '')
    .replace('{items}', data.itemsText || '')
    .replace('{total}', String(data.total || ''))
    .replace('{phone}', data.phone || '');
  return `https://wa.me/${CONFIG.WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}

function isValidNumber(value, allowZero = true) {
  const num = Number(value);
  return Number.isFinite(num) && (allowZero ? num >= 0 : num > 0);
}

function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, error: 'Items must be a non-empty array' };
  }
  for (const item of items) {
    if (!item || typeof item.id === 'undefined' || typeof item.qty === 'undefined') {
      return { valid: false, error: 'Each item must have id and qty' };
    }
    if (!Number.isInteger(item.id) || item.id < 1) {
      return { valid: false, error: `Invalid product id: ${item.id}` };
    }
    // Known products 1-12 validated; custom products (ID > 12) allowed
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return { valid: false, error: `Invalid qty for product ${item.id}: ${item.qty}` };
    }
  }
  return { valid: true };
}

// ==================== WHATSAPP TEMPLATES ====================
const TEMPLATES = {
  INITIAL: `Hi {name}, we received your order {orderId}!
Items: {items}
Total: Rs.{total}

Please pay to:
Account: Muhammad Bin Junaid
IBAN: PK77JSBL9999903330034535
Bank: JS Bank / Zindagi

Send payment screenshot after payment. Thank you!`,

  PAID: `Hi {name}, thank you for your payment of Rs.{total} for order {orderId}! We'll process it soon.`,

  CONFIRMED: `Hi {name}, your order {orderId} is confirmed!
Please review: {items}
Let us know if any changes needed.`
};

// ==================== WEB APP ENTRY POINTS ====================
function doPost(e) {
  try {
    if (!e || !e.postData) {
      return jsonResponse({ success: false, error: 'Missing request body' }, 400);
    }

    let payload;

    // Try to parse as JSON first
    if (e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        // Not JSON, try form-encoded
        if (e.parameters && e.parameters.payload) {
          try {
            payload = JSON.parse(e.parameters.payload[0]);
          } catch (formParseErr) {
            return jsonResponse({ success: false, error: 'Invalid payload format' }, 400);
          }
        } else {
          return jsonResponse({ success: false, error: 'Invalid JSON' }, 400);
        }
      }
    } else if (e.parameters && e.parameters.payload) {
      // Form submission with payload field
      try {
        payload = JSON.parse(e.parameters.payload[0]);
      } catch (formParseErr) {
        return jsonResponse({ success: false, error: 'Invalid payload format' }, 400);
      }
    } else {
      return jsonResponse({ success: false, error: 'Missing request body' }, 400);
    }

    // Authenticated / admin JSON API — always via POST so passwords and
    // session ids never appear in URLs. Public order submissions carry no
    // "action" and fall through to the order flow below (unchanged).
    if (payload && typeof payload.action === 'string' && payload.action) {
      return adminApi_(payload);
    }

    // Token is optional for public order submissions
    // Required for admin operations (handled in doGet)
    const providedToken = payload.token;
    const isAdminRequest = providedToken && verifyToken(providedToken);

    const required = ['name', 'email', 'phone', 'campus', 'items', 'subtotal', 'delivery', 'total'];
    for (const field of required) {
      if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
        return jsonResponse({ success: false, error: `Missing required field: ${field}` }, 400);
      }
    }

    const itemValidation = validateItems(payload.items);
    if (!itemValidation.valid) {
      return jsonResponse({ success: false, error: itemValidation.error }, 400);
    }

    const subtotal = Number(payload.subtotal);
    const delivery = Number(payload.delivery);
    const total = Number(payload.total);

    if (!isValidNumber(subtotal) || !isValidNumber(delivery) || !isValidNumber(total)) {
      return jsonResponse({ success: false, error: 'Subtotal, delivery, and total must be valid numbers' }, 400);
    }
    if (subtotal < 0 || delivery < 0 || total < 0) {
      return jsonResponse({ success: false, error: 'Subtotal, delivery, and total cannot be negative' }, 400);
    }

    let expectedSubtotal = 0;
    for (const item of payload.items) {
      expectedSubtotal += Number(item.price) * Number(item.qty);
    }
    if (Math.abs(subtotal - expectedSubtotal) > 0.01) {
      return jsonResponse({ success: false, error: `Subtotal mismatch. Expected ${expectedSubtotal}, got ${subtotal}` }, 400);
    }

    const expectedTotal = subtotal + delivery;
    if (Math.abs(total - expectedTotal) > 0.01) {
      return jsonResponse({ success: false, error: `Total mismatch. Expected ${expectedTotal}, got ${total}` }, 400);
    }

    const orderId = generateOrderId();
    const timestamp = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
    const costPrice = calculateCostPrice(payload.items);
    const profit = total - costPrice;

    const itemsText = payload.items
      .map(i => `${i.name} x${i.qty}`)
      .filter(Boolean)
      .join('; ');

    const whatsappUrls = {
      initial: buildWhatsAppUrl(TEMPLATES.INITIAL, {
        name: payload.name, orderId, itemsText, total, phone: payload.phone
      }),
      paid: buildWhatsAppUrl(TEMPLATES.PAID, {
        name: payload.name, orderId, itemsText, total, phone: payload.phone
      }),
      confirmed: buildWhatsAppUrl(TEMPLATES.CONFIRMED, {
        name: payload.name, orderId, itemsText, total, phone: payload.phone
      })
    };

    const sheet = getSheet();
    sheet.appendRow([
      orderId,
      timestamp,
      payload.name,
      payload.email,
      payload.phone,
      payload.campus,
      payload.dept || '',
      itemsText,
      subtotal,
      delivery,
      total,
      'New',
      'Pending',
      'Pending',
      payload.note || '',
      costPrice,
      profit
    ]);

    if (CONFIG.ADMIN_EMAIL) {
      try {
        MailApp.sendEmail({
          to: CONFIG.ADMIN_EMAIL,
          subject: `New Order: ${orderId}`,
          htmlBody: `
            <h3>New Order Received</h3>
            <p><strong>Order:</strong> ${orderId}</p>
            <p><strong>Customer:</strong> ${payload.name} (${payload.phone})</p>
            <p><strong>Items:</strong> ${itemsText}</p>
            <p><strong>Total:</strong> Rs. ${total.toLocaleString()}</p>
            <p><strong>Profit:</strong> Rs. ${profit.toLocaleString()}</p>
            <p><a href="${whatsappUrls.initial}">Send Initial WhatsApp</a></p>
          `
        });
      } catch (mailErr) {
        console.warn('Email notification failed:', mailErr);
      }
    }

    return jsonResponse({
      success: true,
      orderId,
      orderDetails: formatOrderDetails(payload, orderId, timestamp, costPrice, profit),
      whatsappUrls,
      profit
    });

  } catch (err) {
    console.error('doPost error:', err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// POST-only actions — passwords and session ids must never travel in URLs
const POST_ONLY_ACTIONS = ['login', 'logout', 'me', 'changePassword'];

function doGet(e) {
  try {
    if (!e || !e.parameter) {
      return jsonResponse({ success: false, error: 'Invalid request' }, 400);
    }
    AUTH_USER_ = null;
    const action = e.parameter.action || 'orders';

    if (POST_ONLY_ACTIONS.indexOf(action) !== -1) {
      return jsonResponse({ success: false, error: 'POST required for this action', code: 'AUTH' }, 405);
    }
    if (!verifyToken(e.parameter.token)) {
      return jsonResponse({ success: false, error: 'Invalid token', code: 'AUTH' }, 401);
    }
    AUTH_USER_ = { email: 'legacy-token', name: 'Owner', role: 'CEO', legacy: true };
    const perm = authorizeAction_(AUTH_USER_, action, e.parameter);
    if (!perm.ok) {
      return jsonResponse({ success: false, error: perm.error, code: perm.unknown ? undefined : 'PERM' }, perm.unknown ? 400 : 403);
    }
    return runAction_(e);
  } catch (err) {
    console.error('doGet error:', err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// Executes an already-authorized action. e.parameter may be GET params or a
// parsed JSON body (both are plain string-keyed objects).
function runAction_(e) {
  try {
    const action = (e.parameter && e.parameter.action) || 'orders';

    switch (action) {
      case 'orders':
        return jsonResponse({ success: true, orders: getAllOrders() });
      case 'stats':
        return jsonResponse({ success: true, stats: getStats() });
      case 'update':
        const orderId = e.parameter.orderId;
        const field = e.parameter.field;
        const value = e.parameter.value;
        if (!orderId || !field) {
          return jsonResponse({ success: false, error: 'Missing orderId or field' }, 400);
        }
        const updateResult = updateOrderStatus(orderId, field, value);
        if (!updateResult.success) {
          return jsonResponse({ success: false, error: updateResult.error }, 400);
        }
        return jsonResponse({ success: true });
      case 'expenses':
        return jsonResponse({ success: true, expenses: getExpenses() });
      case 'addExpense': {
        const exp = parseExpenseParams_(e.parameter);
        if (!exp) return jsonResponse({ success: false, error: 'Missing/invalid date, category or amount' }, 400);
        return jsonResponse({ success: true, expense: addExpense(exp) });
      }
      case 'updateExpense': {
        const expRow = parseInt(e.parameter.rowNum, 10);
        if (!Number.isInteger(expRow) || expRow < 2) return jsonResponse({ success: false, error: 'Invalid rowNum' }, 400);
        return jsonResponse(updateExpense(expRow, e.parameter));
      }
      case 'deleteExpense': {
        const delRow = parseInt(e.parameter.rowNum, 10);
        if (!Number.isInteger(delRow) || delRow < 2) return jsonResponse({ success: false, error: 'Invalid rowNum' }, 400);
        return jsonResponse(deleteExpense(delRow));
      }
      case 'activity':
        return jsonResponse({ success: true, entries: getActivity(200) });
      case 'products':
        return jsonResponse({ success: true, products: getProductsCached_(), costs: getProductCosts() });
      case 'addProduct': {
        const addRes = parseProductAdd_(e.parameter);
        if (addRes.error) return jsonResponse({ success: false, error: addRes.error }, 400);
        const addOut = addProduct(addRes.product);
        if (!addOut.success) return jsonResponse(addOut, 400);
        return jsonResponse({ success: true, products: getProductsCached_(), costs: getProductCosts() });
      }
      case 'updateProduct': {
        const updRes = parseProductUpdate_(e.parameter);
        if (updRes.error) return jsonResponse({ success: false, error: updRes.error }, 400);
        if (!Object.keys(updRes.fields).length) return jsonResponse({ success: false, error: 'No fields to update' }, 400);
        const updOut = updateProduct(updRes.id, updRes.fields);
        if (!updOut.success) return jsonResponse(updOut, 400);
        return jsonResponse({ success: true, product: updOut.product, products: getProductsCached_(), costs: getProductCosts() });
      }
      case 'suppliers':
        return jsonResponse({ success: true, suppliers: getSuppliers() });
      case 'addSupplier': {
        const supRes = parseSupplierParams_(e.parameter);
        if (supRes.error) return jsonResponse({ success: false, error: supRes.error }, 400);
        return jsonResponse(addSupplier(supRes.supplier));
      }
      case 'updateSupplier': {
        const supId = String(e.parameter.id || '').trim();
        if (!supId) return jsonResponse({ success: false, error: 'Missing supplier id' }, 400);
        const supUpd = parseSupplierParams_(e.parameter);
        if (supUpd.error) return jsonResponse({ success: false, error: supUpd.error }, 400);
        return jsonResponse(updateSupplier(supId, supUpd.supplier));
      }
      case 'deleteSupplier': {
        const delSupId = String(e.parameter.id || '').trim();
        if (!delSupId) return jsonResponse({ success: false, error: 'Missing supplier id' }, 400);
        return jsonResponse(deleteSupplier(delSupId));
      }
      case 'setSupplierProducts': {
        const spSid = String(e.parameter.supplierId || '').trim();
        if (!spSid) return jsonResponse({ success: false, error: 'Missing supplierId' }, 400);
        const spIds = String(e.parameter.productIds || '').split(',').filter(x => String(x).trim() !== '');
        return jsonResponse(setSupplierProducts(spSid, spIds));
      }
      case 'purchases':
        return jsonResponse({ success: true, purchases: getPurchases() });
      case 'addPurchase': {
        const purRes = parsePurchaseParams_(e.parameter, true);
        if (purRes.error) return jsonResponse({ success: false, error: purRes.error }, 400);
        return jsonResponse(addPurchase(purRes.purchase));
      }
      case 'updatePurchase': {
        const purId = String(e.parameter.id || '').trim();
        if (!purId) return jsonResponse({ success: false, error: 'Missing purchase id' }, 400);
        const purUpd = parsePurchaseParams_(e.parameter, false);
        if (purUpd.error) return jsonResponse({ success: false, error: purUpd.error }, 400);
        return jsonResponse(updatePurchase(purId, purUpd.purchase));
      }
      case 'receivePurchase': {
        const recvId = String(e.parameter.id || '').trim();
        if (!recvId) return jsonResponse({ success: false, error: 'Missing purchase id' }, 400);
        return jsonResponse(receivePurchase(recvId));
      }
      case 'deletePurchase': {
        const delPurId = String(e.parameter.id || '').trim();
        if (!delPurId) return jsonResponse({ success: false, error: 'Missing purchase id' }, 400);
        return jsonResponse(deletePurchase(delPurId));
      }
      case 'deliveries':
        return jsonResponse({ success: true, deliveries: getDeliveries() });
      case 'deliver':
        return jsonResponse(deliverOrder(e.parameter));
      case 'updateProductCost': {
        const pid = parseInt(e.parameter.productId, 10);
        const pcost = parseFloat(e.parameter.cost);
        if (!Number.isInteger(pid) || pid < 1 || isNaN(pcost) || pcost < 0) {
          return jsonResponse({ success: false, error: 'Invalid productId or cost' }, 400);
        }
        setProductCost(pid, pcost);
        return jsonResponse({ success: true, costs: getProductCosts() });
      }
      case 'updateCost':
        const oid = e.parameter.orderId;
        const cost = parseFloat(e.parameter.cost);
        if (!oid || isNaN(cost)) {
          return jsonResponse({ success: false, error: 'Missing orderId or invalid cost' }, 400);
        }
        const costResult = updateCostPrice(oid, cost);
        if (!costResult.success) {
          return jsonResponse({ success: false, error: costResult.error }, 400);
        }
        return jsonResponse({ success: true });
      case 'me':
        return jsonResponse({ success: true, user: publicUser_(AUTH_USER_) });
      case 'logout':
        deleteSessionById_(e.parameter.session);
        writeActivity_(null, 'Logout', AUTH_USER_ ? AUTH_USER_.email : '', 'Session ended');
        return jsonResponse({ success: true });
      case 'changePassword': {
        if (!AUTH_USER_ || AUTH_USER_.legacy || !findUserByEmail_(AUTH_USER_.email)) {
          return jsonResponse({ success: false, error: 'Sign in with a user account to change the password', code: 'AUTH' }, 401);
        }
        const curPw = String(e.parameter.current || '');
        const newPw = String(e.parameter.next || '');
        const confPw = String(e.parameter.confirm || '');
        if (!curPw || !newPw) return jsonResponse({ success: false, error: 'Current and new password are required' }, 400);
        if (newPw.length < 8) return jsonResponse({ success: false, error: 'New password must be at least 8 characters' }, 400);
        if (newPw.length > 200) return jsonResponse({ success: false, error: 'New password is too long' }, 400);
        if (newPw !== confPw) return jsonResponse({ success: false, error: 'New password and confirmation do not match' }, 400);
        if (newPw === curPw) return jsonResponse({ success: false, error: 'New password must be different from the current one' }, 400);
        const cpUser = findUserByEmail_(AUTH_USER_.email);
        if (!cpUser || !cpUser.active) return jsonResponse({ success: false, error: 'Account not found', code: 'AUTH' }, 401);
        if (!verifyPassword_(curPw, cpUser.passwordHash)) {
          writeActivity_(null, 'Password change failed', cpUser.email, 'Wrong current password');
          return jsonResponse({ success: false, error: 'Current password is incorrect' }, 403);
        }
        setUsersCell_(cpUser.row, 5, makePasswordRecord_(newPw));
        setUsersCell_(cpUser.row, 6, false);
        invalidateUserSessions_(cpUser.email, e.parameter.session);
        AUTH_USER_.mustChangePassword = false;
        writeActivity_(null, 'Password changed', cpUser.email, 'Own password updated');
        return jsonResponse({ success: true, user: publicUser_(AUTH_USER_) });
      }
      case 'users':
        return jsonResponse({ success: true, users: getUsersList_() });
      case 'setUserActive': {
        const actEmail = String(e.parameter.email || '').trim().toLowerCase();
        const actVal = isTrueCell_(e.parameter.active);
        const actUser = findUserByEmail_(actEmail);
        if (!actUser) return jsonResponse({ success: false, error: 'User not found' }, 404);
        if (!actVal && AUTH_USER_ && actUser.email === AUTH_USER_.email) {
          return jsonResponse({ success: false, error: 'You cannot deactivate your own account' }, 400);
        }
        setUsersCell_(actUser.row, 7, actVal);
        if (!actVal) invalidateUserSessions_(actUser.email, null);
        writeActivity_(null, actVal ? 'Account activated' : 'Account deactivated', actUser.email, actUser.role);
        return jsonResponse({ success: true, users: getUsersList_() });
      }
      case 'forcePasswordReset': {
        const frEmail = String(e.parameter.email || '').trim().toLowerCase();
        const frUser = findUserByEmail_(frEmail);
        if (!frUser) return jsonResponse({ success: false, error: 'User not found' }, 404);
        setUsersCell_(frUser.row, 6, true);
        invalidateUserSessions_(frUser.email, null);
        writeActivity_(null, 'Password change required', frUser.email, 'Set by ' + (AUTH_USER_ ? AUTH_USER_.email : 'admin'));
        return jsonResponse({ success: true, users: getUsersList_() });
      }
      case 'resetUserPassword': {
        const rpEmail = String(e.parameter.email || '').trim().toLowerCase();
        const rpUser = findUserByEmail_(rpEmail);
        if (!rpUser) return jsonResponse({ success: false, error: 'User not found' }, 404);
        setUsersCell_(rpUser.row, 5, makePasswordRecord_(rpUser.email));
        setUsersCell_(rpUser.row, 6, true);
        invalidateUserSessions_(rpUser.email, null);
        writeActivity_(null, 'Password reset by admin', rpUser.email, 'Temp password = account email');
        return jsonResponse({ success: true, users: getUsersList_() });
      }
      default:
        return jsonResponse({ success: false, error: 'Unknown action' }, 400);
    }
  } catch (err) {
    console.error('runAction_ error:', err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

// ==================== ADMIN API (POST entry point) ====================
function adminApi_(payload) {
  try {
    AUTH_USER_ = null;
    const action = payload.action;

    if (action === 'login') return handleLogin_(payload);

    // Preferred: server-side session. Fallback: legacy secret token in the body
    // (owner scripts only — never used by the dashboard UI anymore).
    const sess = resolveSession_(payload.session);
    if (sess.ok) {
      AUTH_USER_ = sess.user;
    } else if (payload.token && verifyToken(payload.token)) {
      AUTH_USER_ = { email: 'legacy-token', name: 'Owner', role: 'CEO', legacy: true };
    } else {
      return jsonResponse({ success: false, error: sess.error || 'Not signed in', code: 'AUTH' }, 401);
    }

    const perm = authorizeAction_(AUTH_USER_, action, payload);
    if (!perm.ok) {
      if (perm.unknown) return jsonResponse({ success: false, error: perm.error }, 400);
      writeActivity_(null, 'Permission denied', action, 'Role ' + AUTH_USER_.role + ' tried ' + action);
      return jsonResponse({ success: false, error: perm.error, code: 'PERM' }, 403);
    }

    return runAction_({ parameter: payload });
  } catch (err) {
    console.error('adminApi_ error:', err);
    return jsonResponse({ success: false, error: err.toString() }, 500);
  }
}

function getUsersList_() {
  const sheet = getUsersSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const data = sheet.getRange(2, 1, last - 1, 9).getValues();
  return data.map(function (r) {
    return {
      id: String(r[0] || ''),
      email: String(r[1] || ''),
      name: String(r[2] || ''),
      role: String(r[3] || ''),
      mustChange: isTrueCell_(r[5]),
      active: isTrueCell_(r[6]),
      createdAt: r[7] instanceof Date ? r[7].toISOString() : String(r[7] || ''),
      lastLogin: r[8] instanceof Date ? r[8].toISOString() : String(r[8] || '')
    };
  });
}

// ==================== DATA OPERATIONS ====================
function getAllOrders() {
  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const data = sheet.getRange(2, 1, lastRow - 1, 17).getValues();
  return data.map((row, i) => ({
    rowNum: i + 2,
    orderId: row[0],
    timestamp: row[1],
    name: row[2],
    email: row[3],
    phone: row[4],
    campus: row[5],
    deptRoll: row[6],
    itemsText: row[7],
    subtotal: row[8],
    delivery: row[9],
    total: row[10],
    orderStatus: row[11],
    paymentStatus: row[12],
    confirmStatus: row[13],
    notes: row[14],
    costPrice: row[15],
    profit: row[16]
  })).reverse();
}

function orderCost_(o) {
  const raw = o.costPrice;
  if (raw !== '' && raw !== null && raw !== undefined && !isNaN(Number(raw))) return Number(raw);
  const products = getProducts();
  const text = String(o.itemsText || '');
  let sum = 0;
  text.split(';').forEach(seg => {
    const s = String(seg).trim();
    if (!s) return;
    const m = s.match(/^(.*?)\s*[xX]\s*(\d+)$/);
    const name = (m ? m[1] : s).trim().toLowerCase();
    const qty = m ? parseInt(m[2], 10) : 1;
    if (!name || !qty) return;
    const p = products.find(x => String(x.name).trim().toLowerCase() === name);
    if (p) sum += Number(p.cost || 0) * qty;
  });
  return sum;
}

function getStats() {
  const orders = getAllOrders();
  const paidOrders = orders.filter(o => o.paymentStatus === 'Paid');

  return {
    totalOrders: orders.length,
    paidOrders: paidOrders.length,
    pendingOrders: orders.filter(o => o.paymentStatus === 'Pending').length,
    deliveredOrders: orders.filter(o => o.orderStatus === 'Shipped' || o.orderStatus === 'Delivered').length,
    revenue: paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0),
    totalCost: paidOrders.reduce((sum, o) => sum + orderCost_(o), 0)
  };
}

function updateOrderStatus(orderId, field, value) {
  const validFields = ['orderStatus', 'paymentStatus', 'confirmStatus'];
  if (!validFields.includes(field)) {
    return { success: false, error: `Invalid field: ${field}. Must be one of: ${validFields.join(', ')}` };
  }

  const allowedValues = VALID_STATUSES[field];
  if (!allowedValues.includes(value)) {
    return { success: false, error: `Invalid value for ${field}: "${value}". Allowed: ${allowedValues.join(', ')}` };
  }

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: false, error: 'No orders found' };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  const colMap = {
    'orderStatus': 12,
    'paymentStatus': 13,
    'confirmStatus': 14
  };

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === orderId) {
      const rowNum = i + 2;
      const prevValue = sheet.getRange(rowNum, colMap[field]).getValue();
      sheet.getRange(rowNum, colMap[field]).setValue(value);

      if (field === 'paymentStatus' && value === 'Paid') {
        const order = getAllOrders().find(o => o.orderId === orderId);
        if (order) {
          const newProfit = Number(order.total) - Number(order.costPrice);
          sheet.getRange(rowNum, 17).setValue(newProfit);
        }
      }

      let evt = 'Order status changed';
      if (field === 'paymentStatus') evt = value === 'Paid' ? 'Payment verified' : 'Payment status changed';
      else if (field === 'confirmStatus') evt = 'Confirm status changed';
      else if (field === 'orderStatus' && value === 'Delivered') evt = 'Order delivered';
      writeActivity_('Admin', evt, orderId + ' · ' + field + ' → ' + value);

      // One-time stock decrement when an order becomes Delivered
      if (field === 'orderStatus' && value === 'Delivered' && String(prevValue) !== 'Delivered') {
        decrementStockForOrder_(orderId);
      }
      return { success: true };
    }
  }
  return { success: false, error: `Order not found: ${orderId}` };
}

function updateCostPrice(orderId, cost) {
  if (!Number.isFinite(cost) || cost < 0) {
    return { success: false, error: 'Cost must be a finite number >= 0' };
  }

  const sheet = getSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { success: false, error: 'No orders found' };
  }

  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === orderId) {
      const rowNum = i + 2;
      sheet.getRange(rowNum, 16).setValue(cost);

      const order = getAllOrders().find(o => o.orderId === orderId);
      if (order && order.paymentStatus === 'Paid') {
        const newProfit = Number(order.total) - cost;
        sheet.getRange(rowNum, 17).setValue(newProfit);
      }
      writeActivity_('Admin', 'Cost price changed', orderId + ' → Rs.' + cost);
      return { success: true };
    }
  }
  return { success: false, error: `Order not found: ${orderId}` };
}

// ==================== EXPENSES ====================
function getOrCreateExpensesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.EXPENSES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.EXPENSES_SHEET);
    sheet.appendRow(['Date', 'Category', 'Description', 'Amount']);
  }
  return sheet;
}

function getExpenses() {
  const sheet = getOrCreateExpensesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  return data.map((row, i) => ({
    rowNum: i + 2,
    date: row[0] instanceof Date
      ? Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd')
      : String(row[0] || ''),
    category: String(row[1] || ''),
    description: String(row[2] || ''),
    amount: Number(row[3]) || 0
  }));
}

function parseExpenseParams_(p) {
  const date = String(p.date || '').trim();
  const category = String(p.category || '').trim();
  const description = String(p.description || '').trim();
  const amount = parseFloat(p.amount);
  if (!date || !category || isNaN(amount) || amount < 0) return null;
  return { date, category, description, amount };
}

function addExpense(exp) {
  const sheet = getOrCreateExpensesSheet();
  sheet.appendRow([exp.date, exp.category, exp.description, exp.amount]);
  const rowNum = sheet.getLastRow();
  const expense = { rowNum, date: exp.date, category: exp.category, description: exp.description, amount: exp.amount };
  writeActivity_('Admin', 'Expense added', exp.category + ' · Rs.' + exp.amount + ' · ' + exp.date);
  return expense;
}

function updateExpense(rowNum, p) {
  const sheet = getOrCreateExpensesSheet();
  if (rowNum > sheet.getLastRow()) return { success: false, error: 'Expense row not found' };
  const current = getExpenses().find(x => x.rowNum === rowNum);
  if (!current) return { success: false, error: 'Expense row not found' };
  const next = {
    date: (p.date !== undefined && String(p.date).trim()) ? String(p.date).trim() : current.date,
    category: (p.category !== undefined && String(p.category).trim()) ? String(p.category).trim() : current.category,
    description: p.description !== undefined ? String(p.description).trim() : current.description,
    amount: (p.amount !== undefined && !isNaN(parseFloat(p.amount)) && parseFloat(p.amount) >= 0) ? parseFloat(p.amount) : current.amount
  };
  sheet.getRange(rowNum, 1, 1, 4).setValues([[next.date, next.category, next.description, next.amount]]);
  writeActivity_('Admin', 'Expense updated', next.category + ' · Rs.' + next.amount + ' (row ' + rowNum + ')');
  return { success: true, expense: Object.assign({ rowNum: rowNum }, next) };
}

function deleteExpense(rowNum) {
  const sheet = getOrCreateExpensesSheet();
  if (rowNum > sheet.getLastRow()) return { success: false, error: 'Expense row not found' };
  const current = getExpenses().find(x => x.rowNum === rowNum);
  sheet.deleteRow(rowNum);
  writeActivity_('Admin', 'Expense deleted', current ? current.category + ' · Rs.' + current.amount : 'row ' + rowNum);
  return { success: true };
}

// ==================== ACTIVITY LOG ====================
function getActivitySheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Activity');
  if (!sheet) {
    sheet = ss.insertSheet('Activity');
    sheet.appendRow(['Timestamp', 'User', 'Action', 'Target', 'Role', 'Details']);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastColumn() < 6) {
    sheet.getRange(1, 5).setValue('Role');
    sheet.getRange(1, 6).setValue('Details');
  }
  return sheet;
}

function writeActivity_(user, action, target, details) {
  try {
    const sheet = getActivitySheet_();
    const fromAuth = AUTH_USER_ && !AUTH_USER_.legacy
      ? { user: String(AUTH_USER_.name || AUTH_USER_.email) + ' · ' + AUTH_USER_.email, role: AUTH_USER_.role }
      : (AUTH_USER_ && AUTH_USER_.legacy ? { user: 'Owner · legacy token', role: 'CEO' } : { user: user || 'Admin', role: '' });
    sheet.appendRow([new Date(), fromAuth.user, String(action || ''), String(target || ''), fromAuth.role, String(details || '')]);
  } catch (err) {
    console.warn('writeActivity failed: ' + err);
  }
}

function getActivity(limit) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Activity');
    if (!sheet) return [];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    const cols = Math.max(4, Math.min(6, sheet.getLastColumn()));
    const data = sheet.getRange(2, 1, lastRow - 1, cols).getValues();
    return data.map((row, i) => ({
      rowNum: i + 2,
      ts: row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ''),
      user: String(row[1] || ''),
      action: String(row[2] || ''),
      target: String(row[3] || ''),
      role: String(row[4] || ''),
      details: String(row[5] || '')
    })).reverse().slice(0, limit > 0 ? limit : 200);
  } catch (err) {
    return [];
  }
}

// ==================== UTILITIES ====================
function formatOrderDetails(payload, orderId, timestamp, costPrice, profit) {
  const itemsText = payload.items
    .map(i => `• ${i.name} x${i.qty} = Rs. ${(Number(i.price) * Number(i.qty)).toLocaleString()}`)
    .join('\n');

  return `
Hey I have placed an order from Makers Era
━━━━━━━━━━━━━━━━
Order ID: ${orderId}
Date: ${timestamp}
Name: ${payload.name}
Email: ${payload.email}
Phone: ${payload.phone}
Campus: ${payload.campus}
${payload.dept ? 'Dept/Roll: ' + payload.dept : ''}
${payload.note ? 'Note: ' + payload.note : ''}
━━━━━━━━━━━━━━━━
ITEMS:
${itemsText}
━━━━━━━━━━━━━━━━
Subtotal: Rs. ${Number(payload.subtotal).toLocaleString()}
Delivery: ${Number(payload.delivery) === 0 ? 'FREE (Bahria University)' : 'Rs. ' + Number(payload.delivery).toLocaleString()}
TOTAL: Rs. ${Number(payload.total).toLocaleString()}
Cost: Rs. ${costPrice.toLocaleString()}
Profit: Rs. ${profit.toLocaleString()}
  `.trim();
}

function jsonResponse(obj, status = 200) {
  const output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ==================== TOKEN GENERATOR ====================
function generateToken() {
  const bytes = Utilities.computeHmacSha256Signature(
    Utilities.getUuid(),
    Utilities.getUuid()
  );
  const token = bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('').substring(0, 32);
  console.log('GENERATED SECRET TOKEN:', token);
  console.log('Copy this token and replace REPLACE_WITH_YOUR_TOKEN in CONFIG');
  return token;
}

// ==================== EMAIL PERMISSION TEST ====================
function testEmailPermission() {
  MailApp.sendEmail(
    CONFIG.ADMIN_EMAIL,
    'Makers Era API Test',
    'Email permission is working.'
  );
  console.log('Email permission test successful.');
}

// ==================== DEBUG TEST ====================
function testOrder() {
  const testPayload = {
    token: CONFIG.SECRET_TOKEN,
    name: 'Test Customer',
    email: 'test@student.edu.pk',
    phone: '03001234567',
    campus: 'Bahria University',
    dept: 'CS-21-001',
    note: 'Test order',
    items: [
      { id: 5, name: 'Arduino Nano', qty: 1, price: 550 },
      { id: 10, name: 'Soldering Wire (50g)', qty: 2, price: 160 }
    ],
    subtotal: 870,
    delivery: 0,
    total: 870
  };

  console.log('--- TEST PAYLOAD ---');
  console.log(JSON.stringify(testPayload, null, 2));

  const mockEvent = { postData: { contents: JSON.stringify(testPayload) } };
  const result = doPost(mockEvent);
  const content = result.getContent();

  console.log('--- DOPOST RESPONSE ---');
  console.log(content);

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse response:', e);
    return;
  }

  console.log('--- PARSED ---');
  console.log(JSON.stringify(parsed, null, 2));

  if (parsed.success) {
    console.log('✅ SUCCESS - Check Sheet now');
    console.log('OrderID:', parsed.orderId);
    console.log('WhatsApp Initial:', parsed.whatsappUrls?.initial);
  } else {
    console.error('❌ FAILED:', parsed.error);
  }
}