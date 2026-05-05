const CART_KEY = 'vinylmania_cart';

window.getCart = () => {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
};

window.addToCart = (vinyl) => {
    const cart = window.getCart();
    const existing = cart.find(item => item.id === vinyl.id);
    
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: vinyl.id,
            title: vinyl.title,
            artist: vinyl.artist,
            image_url: vinyl.image_url,
            price: vinyl.price,
            quantity: 1
        });
    }
    
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.renderCart();
    window.showToast();
};

window.removeFromCart = (id) => {
    let cart = window.getCart();
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.renderCart();
};

window.updateQuantity = (id, delta) => {
    const cart = window.getCart();
    const item = cart.find(item => item.id === id);
    
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            window.removeFromCart(id);
            return;
        }
    }
    
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.renderCart();
};

window.clearCart = () => {
    localStorage.removeItem(CART_KEY);
    window.renderCart();
};

window.getCartTotal = () => {
    const cart = window.getCart();
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
};

window.showToast = () => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
};

window.renderCart = () => {
    const cart = window.getCart();
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total-value');
    
    // Update badge
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update list
    if (cartItems) {
        if (cart.length === 0) {
            cartItems.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">Your cart is empty.</p>';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image_url}" alt="${item.title}">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">$${item.price}</div>
                        <div class="cart-item-controls">
                            <button onclick="updateQuantity(${item.id}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateQuantity(${item.id}, 1)">+</button>
                        </div>
                    </div>
                    <div style="cursor: pointer; color: var(--text-muted);" onclick="removeFromCart(${item.id})">✕</div>
                </div>
            `).join('');
        }
    }
    
    if (cartTotal) {
        cartTotal.textContent = `$${window.getCartTotal()}`;
    }
};

// Toggle Sidebar
window.toggleCart = (show) => {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (show) {
        sidebar.classList.add('open');
        overlay.style.display = 'block';
    } else {
        sidebar.classList.remove('open');
        overlay.style.display = 'none';
    }
};

// Place Order Logic
window.handleOrderSubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('customer-name').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const cart = window.getCart();

    if (!name || !email) {
        alert('Please enter your name and email.');
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty.');
        return;
    }

    const orderData = {
        customerName: name,
        customerEmail: email,
        items: cart.map(item => ({
            vinylId: item.id,
            quantity: item.quantity
        }))
    };

    try {
        const order = await window.placeOrder(orderData);
        const cartItems = document.getElementById('cart-items');
        cartItems.innerHTML = `
            <div style="text-align: center; margin-top: 2rem;">
                <h3 style="color: var(--accent); margin-bottom: 1rem;">Order Confirmed!</h3>
                <p>Thank you, ${order.customerName}.</p>
                <p style="margin-bottom: 2rem;">Order ID: #${order.id}</p>
                <button class="add-to-cart-btn" onclick="toggleCart(false)">Close</button>
            </div>
        `;
        document.querySelector('.cart-footer').style.display = 'none';
        window.clearCart();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.renderCart();
    
    const orderForm = document.getElementById('order-form');
    if (orderForm) {
        orderForm.addEventListener('submit', window.handleOrderSubmit);
    }
});
