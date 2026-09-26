# MAKERS ERA - PROJECT HANDOVER DOCUMENT

## Project Overview
**Business**: Makers Era - Student electronics delivery service in Karachi
**Current Stack**: Static HTML/CSS/JS frontend + Google Apps Script backend + Google Sheets database
**Hosting**: Vercel (main site) + GitHub Pages (admin dashboard planned)

---

## COMPLETED PHASES

### Phase 1: Google Apps Script Backend ✅ DONE
**Files**: `apps-script/Code.gs`
**Deployed URL**: `https://script.google.com/macros/s/AKfycby9zbFRKyrvpSk53OPRz00MgFpQ3CGCE3T5UyM5MTN5sHSLHSAsRbFBpeuPJg_Mfp8/exec`

**Features**:
- `doPost()` - Accepts orders (token optional for public checkout)
- `doGet()` - Returns orders, stats, handles status/cost updates (requires token)
- 17-column Orders sheet: `OrderID | Timestamp | Name | Email | Phone | Campus | DeptRoll | Items | Subtotal | Delivery | Total | OrderStatus | PaymentStatus | ConfirmStatus | Notes | CostPrice | Profit`
- Product costs configured for 12 products + custom products (ID > 12)
- WhatsApp URL generation (Initial/Paid/Confirmed templates)
- Profit = Total - CostPrice (only summed for Paid orders)
- Email notifications to `help.makera@gmail.com`
- Validation: items, subtotal/total consistency, status enums
- CORS handled via `doOptions()`

**Sheet Structure** (`Makers Era Orders`):
- Tab 1: `Orders` (17 columns as above)
- Tab 2: `Expenses` (Date | Category | Description | Amount)

**Token**: Generated via `generateToken()` - stored in localStorage, NOT in frontend code

---

### Phase 2: Checkout Integration ✅ DONE
**Files Modified**: `index.html`, `js/script.js`

**Flow**:
1. Customer fills checkout → clicks "Place Order"
2. Hidden iframe submits JSON to Apps Script (order saves to Sheet)
2. Web3Forms also submitted (email backup)
3. Success modal opens immediately with:
   - Order details + Payment box (IBAN, account)
   - **"Send Payment Screenshot"** button → opens WhatsApp with pre-filled message for customer to send screenshot
4. Cart clears

**Products Added**:
- Breadboard (ID 12, Rs. 300, cost Rs. 80)
- Custom Product section (name + price inputs)

---

### Phase 3: Admin Dashboard 🔄 IN PROGRESS
**Files**: `dashboard/dash.html` (needs rebuild), `dash-config.js` (password config)

**Current State**: 
- Custom CSS version exists but **NOT using Sable template**
- Has all functional features (stats, table, filters, status dropdowns, WhatsApp buttons, cost edit)
- Uses custom CSS variables, not Sable design system
- No auth gate (removed), token prompted on load

**Sable Template Assets Available** (in `DASH/` folder):
- `dashboard/sable.css` - Full Tailwind-compiled CSS (51KB)
- `dashboard/alpine.min.js` - Alpine.js v3
- `dashboard/sable-script.js` - Sable utilities (toast, download, money formatting)
- Reference HTML: `DASH/Orders _ Sable.html` (complete Orders page with sidebar, filters, table, modals)

**Required**: Rebuild `dashboard/dash.html` using actual Sable template structure:
- Sidebar navigation (Dashboard, Analytics, Orders, Fulfillment, Products, Customers, Payouts, Invoices, Settings)
- Header with search (⌘K palette), theme toggle, notifications, user menu
- Orders page: Filter bar (search, status, channel, advanced filters), bulk actions, mobile card list + desktop table
- Status badges with dots (Paid/Pending/Refunded/Failed)
- Row actions menu (View, Mark Paid, Refund, Delete)
- Export CSV, New Order button

---

## REMAINING PHASES

### Phase 4: Secure Dashboard Hosting
- Deploy `dashboard/dash.html` to GitHub Pages (separate repo: `makers-era-dashboard`)
- Add Cloudflare Access (free, up to 50 users)
- Configure Email OTP / GitHub OAuth
- Remove password from source code
- Access from any device securely

### Phase 5: Profit & Expense Tracking
- Cost configuration in Apps Script
- P&L stats cards (Revenue, Profit, Cost, Margin)
- Expense entry modal (Salary, Rent, Ads, Other)
- Monthly/Yearly P&L view
- Salary calculation per team member

---

## KEY CONFIGURATION VALUES

### Apps Script
```javascript
// In Code.gs CONFIG:
SECRET_TOKEN: 'REPLACE_WITH_YOUR_TOKEN'  // Generate via generateToken()
WHATSAPP_NUMBER: '923373786628'
ADMIN_EMAIL: 'help.makera@gmail.com'
ORDER_PREFIX: 'ME'
PRODUCT_COSTS: { 1:1200, 2:1500, 3:350, 4:500, 5:250, 6:10, 7:10, 8:100, 9:100, 10:30, 11:30, 12:80 }
```

### Frontend (js/script.js)
```javascript
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby9zbFRKyrvpSk53OPRz00MgFpQ3CGCE3T5UyM5MTN5sHSLHSAsRbFBpeuPJg_Mfp8/exec';
```

### Dashboard (dash-config.js)
```javascript
window.DASHBOARD_CONFIG = { password: 'OLD-PASSWORD-REMOVED' }; // CHANGE THIS
```

---

## SECURITY STATUS

| Secret | In Frontend? | Location |
|--------|-------------|----------|
| Apps Script SECRET_TOKEN | ❌ NO | Only in Apps Script + localStorage |
| Dashboard Password | ⚠️ YES | `dash-config.js` (add to .gitignore) |
| Web3Forms Key | ✅ YES | `index.html` (public, low risk) |

**Protection**: 
- Dashboard: Local password + token verification via API
- Checkout: Tokenless public endpoint (Apps Script allows no-token for doPost)
- All API calls over HTTPS

---

## TESTING CHECKLIST FOR NEXT AI

### Phase 3 (Dashboard)
- [ ] Rebuild dashboard/dash.html using Sable template (sidebar, header, Orders page)
- [ ] Copy sable.css, alpine.min.js, sable-script.js to project root
- [ ] Wire dashboard to Apps Script API (orders, stats, update, updateCost)
- [ ] Status dropdowns → call `doGet?action=update`
- [ ] Cost edit → call `doGet?action=updateCost`
- [ ] WhatsApp buttons → build URLs from order data
- [ ] Stats cards → call `doGet?action=stats`
- [ ] Dark mode toggle works
- [ ] Mobile responsive (sidebar drawer, card list < sm)

### Phase 4
- [ ] Create GitHub repo `makers-era-dashboard`
- [ ] Push dashboard/dash.html + assets
- [ ] Enable GitHub Pages
- [ ] Add Cloudflare Access (Email OTP)
- [ ] Test login from phone

---

## FILES TO TRANSFER

```
/nomadgoods.com/
├── index.html              # Main site (Phase 2 done)
├── js/script.js            # Checkout logic (Phase 2 done)
├── css/styles.css          # Main site styles
├── dashboard/dash.html               # NEEDS REBUILD with Sable template
├── dash-config.js          # Dashboard password (gitignore)
├── sable.css               # COPY from DASH/Orders _ Sable_files/
├── alpine.min.js           # COPY from DASH/Orders _ Sable_files/
├── sable-script.js         # COPY from DASH/Orders _ Sable_files/
├── apps-script/Code.gs     # Backend (Phase 1 done)
├── PHASE_3_DASHBOARD_GUIDE.txt
└── PROJECT_HANDOVER.md     # This file
```

---

## APPS SCRIPT DEPLOYMENT (if needed)
1. script.google.com → Project
2. Deploy → Manage deployments → Pencil icon
3. New version → "Description" → Deploy
2. URL stays same: `AKfycby9zbFRKyrvpSk53OPRz00MgFpQ3CGCE3T5UyM5MTN5sHSLHSAsRbFBpeuPJg_Mfp8`

---

## CONTACT / SUPPORT
- Admin Email: `help.makera@gmail.com`
- WhatsApp Business: `923373786628`
- Sheet: "Makers Era Orders" in Google Drive

---

**Last Updated**: Sep 26, 2026
**Current Blocker**: Phase 3 dashboard needs rebuild using actual Sable template files