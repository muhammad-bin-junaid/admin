let cart = [];
let selectedCampus = 'Bahria University';

const products = {
    1: { id: 1, name: '1599 Multimeter', price: 1600, img: 'all product images/1599 multimeter.jpeg' },
    2: { id: 2, name: 'Advanced Multimeter', price: 2050, img: 'all product images/multimeter 2050rs.jpeg' },
    3: { id: 3, name: 'Digital Multimeter', price: 600, img: 'all product images/digital multimetar 599rs.jpeg' },
    4: { id: 4, name: 'Digital Multimeter Pro', price: 950, img: 'all product images/digital multimetar 950rs.jpeg' },
    5: { id: 5, name: 'Arduino Nano', price: 450, img: 'all product images/arduino nano 450rs.jpeg' },
    6: { id: 6, name: 'LM555 Astable & Monostable Kit', price: 85, img: '' },
    7: { id: 7, name: 'Transistor Flip Flop Kit', price: 150, img: '' },
    8: { id: 8, name: 'Soldering Iron', price: 450, img: 'all product images/soldering iron 449rs.png' },
    9: { id: 9, name: 'Soldering Iron Pro', price: 700, img: 'all product images/soldering iron 699rs.jpeg' },
    10: { id: 10, name: 'Soldering Wire (50g)', price: 160, img: 'all product images/soldering wire 160rs 50g.jpeg' },
    11: { id: 11, name: 'Soldering Wire Premium (50g)', price: 200, img: 'all product images/soldering wire 200rs 50g.jpeg' }
};

// Campus selection from checkout dropdown
document.getElementById('studentCampus')?.addEventListener('change', function() {
    selectedCampus = this.value || 'Bahria University';
    document.getElementById('deliveryCampus').textContent = selectedCampus;
    updateDeliveryFee();
    updateCartUI();
});

function updateDeliveryFee() {
    const feeEl = document.getElementById('deliveryFee');
    if (selectedCampus === 'Bahria University') {
        feeEl.textContent = 'FREE';
        feeEl.classList.add('free-delivery');
    } else {
        feeEl.textContent = 'Rs. 50';
        feeEl.classList.remove('free-delivery');
    }
}

function addToCart(productId) {
    const product = products[productId];
    const existing = cart.find(item => item.id === productId);
    if (existing) {
        existing.qty += 1;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    showAddedToast(product.name);
    openCart();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
}

function changeQty(productId, delta) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
        removeFromCart(productId);
        return;
    }
    updateCartUI();
}

function getDeliveryFee() {
    return selectedCampus === 'Bahria University' ? 0 : 50;
}

function getCartTotal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    return subtotal + getDeliveryFee();
}

function updateCartUI() {
    const countEl = document.getElementById('cartCount');
    const itemsEl = document.getElementById('cartItems');
    const footerEl = document.getElementById('cartFooter');
    const totalEl = document.getElementById('cartTotal');

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    countEl.textContent = totalItems;

    if (cart.length === 0) {
        itemsEl.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
        footerEl.style.display = 'none';
        return;
    }

    footerEl.style.display = 'block';
    itemsEl.innerHTML = cart.map(item => {
        const imgHtml = item.img
            ? `<div class="cart-item-img"><img src="${item.img}" alt="${item.name}"></div>`
            : `<div class="cart-item-img" style="display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🔧</div>`;
        return `
        <div class="cart-item">
            ${imgHtml}
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <span class="cart-item-price">Rs. ${(item.price * item.qty).toLocaleString()}</span>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="changeQty(${item.id}, -1)">−</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="changeQty(${item.id}, 1)">+</button>
                    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
                </div>
            </div>
        </div>`;
    }).join('');

    totalEl.textContent = 'Rs. ' + getCartTotal().toLocaleString();
}

function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.getElementById('cartOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.getElementById('cartOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

function openCheckout() {
    if (cart.length === 0) return;
    closeCart();
    updateCheckoutSummary();
    document.getElementById('checkoutModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCheckout() {
    document.getElementById('checkoutModal').classList.remove('open');
    document.body.style.overflow = '';
}

function updateCheckoutSummary() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const delivery = getDeliveryFee();
    const total = subtotal + delivery;
    const summary = cart.map(item => `${item.name} x${item.qty} — Rs. ${(item.price * item.qty).toLocaleString()}`).join('\n');
    document.getElementById('checkoutSummary').innerHTML = `
        <div style="white-space:pre-line;margin-bottom:8px">${summary}</div>
        <div style="border-top:1px solid rgba(255,255,255,.1);padding-top:8px;margin-top:8px">
            <div>Subtotal: Rs. ${subtotal.toLocaleString()}</div>
            <div>Delivery: ${delivery === 0 ? 'FREE (Bahria University)' : 'Rs. ' + delivery}</div>
            <div style="font-weight:700;color:var(--accent);font-size:1.05rem;margin-top:4px">Total: Rs. ${total.toLocaleString()}</div>
        </div>
    `;
}

function submitOrder(e) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('submitBtn');
    const name = form.name.value;
    const email = form.email.value;
    const phone = form.phone.value;
    const campus = form.campus.value;
    const dept = form.dept.value;
    const note = form.note.value;

    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const delivery = getDeliveryFee();
    const total = subtotal + delivery;

    const orderLines = cart.map(item => `• ${item.name} x${item.qty} = Rs. ${(item.price * item.qty).toLocaleString()}`).join('\n');
    const orderDetails = `
ORDER FROM MAKERA PK
━━━━━━━━━━━━━━━━
Name: ${name}
Email: ${email}
Phone: ${phone}
Campus: ${campus}
${dept ? 'Dept/Roll: ' + dept : ''}
${note ? 'Note: ' + note : ''}
━━━━━━━━━━━━━━━━
ITEMS:
${orderLines}
━━━━━━━━━━━━━━━━
Delivery: ${delivery === 0 ? 'FREE (Bahria University)' : 'Rs. ' + delivery}
TOTAL: Rs. ${total.toLocaleString()}
    `.trim();

    document.getElementById('orderDetails').value = orderDetails;

    submitBtn.textContent = 'Placing Order...';
    submitBtn.disabled = true;

    const formData = new FormData(form);
    formData.append('message', orderDetails);

    fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
    }).then(res => res.json()).then(data => {
        if (data.success) {
            sendWhatsApp(orderDetails);
            showSuccess();
        } else {
            console.error('Web3Forms error:', data);
            alert('Error: ' + (data.message || 'Something went wrong.'));
            submitBtn.textContent = 'Place Order';
            submitBtn.disabled = false;
        }
    }).catch(err => {
        console.error('Fetch error:', err);
        alert('Network error. Please try again.');
        submitBtn.textContent = 'Place Order';
        submitBtn.disabled = false;
    });
}

function sendWhatsApp(orderText) {
    const msg = encodeURIComponent('New order from Makera PK:\n\n' + orderText);
    window.open('https://wa.me/923330034535?text=' + msg, '_blank');
}

function showSuccess() {
    closeCheckout();
    document.getElementById('successModal').classList.add('open');
    cart = [];
    updateCartUI();
}

function closeSuccess() {
    document.getElementById('successModal').classList.remove('open');
    document.body.style.overflow = '';
}

function toggleMenu() {
    document.getElementById('navLinks').classList.toggle('active');
}
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        document.getElementById('navLinks').classList.remove('active');
    });
});

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.1 });
document.querySelectorAll('.product-card, .about, .contact-content').forEach(el => observer.observe(el));

// Toast notification
function showAddedToast(name) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = 'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:#22c55e;color:#fff;padding:12px 24px;border-radius:10px;font-weight:600;font-size:.9rem;z-index:9999;transition:opacity .3s,transform .3s;opacity:0;pointer-events:none;font-family:inherit;';
        document.body.appendChild(toast);
    }
    toast.textContent = name + ' added to cart ✓';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(10px)';
    }, 1500);
}
