// Cart page functionality
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    if (!requireAuth()) return;
    loadCart();
});

async function loadCart() {
    const container = document.getElementById('cart-content');
    const emptyState = document.getElementById('empty-cart');

    try {
        const result = await api.getMe(authToken);

        if (result.success && result.data.cart && result.data.cart.length > 0) {
            cart = result.data.cart;
            renderCart();
            toggleCartView(container, emptyState, true);
        } else {
            toggleCartView(container, emptyState, false);
        }
    } catch (error) {
        console.error('Error loading cart:', error);
        showAlert('Error loading cart', 'error');
    }
}

function toggleCartView(container, emptyState, hasItems) {
    container.style.display = hasItems ? 'grid' : 'none';
    emptyState.style.display = hasItems ? 'none' : 'block';
}

function renderCart() {
    const container = document.getElementById('cart-content');

    const cartItemsHtml = cart.map(item => renderCartItem(item)).join('');
    const subtotal = calculateSubtotal(cart);
    const shipping = calculateShipping(subtotal);
    const total = subtotal + shipping;

    container.innerHTML = `
        <div class="cart-items">
            <h3>Cart Items (${cart.length})</h3>
            ${cartItemsHtml}
        </div>
        <div class="cart-summary">
            <h3>Order Summary</h3>
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>${formatPrice(subtotal)}</span>
            </div>
            <div class="summary-row">
                <span>Shipping:</span>
                <span>${shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
            </div>
            <div class="summary-row">
                <span>Total:</span>
                <span>${formatPrice(total)}</span>
            </div>
            <div class="form-group">
                <label for="payment-method">Payment Method</label>
                <select id="payment-method" class="filter-select">
                    <option value="credit-card" selected>Credit Card</option>
                    <option value="paypal">PayPal</option>
                    <option value="kaspi-qr">Kaspi QR</option>
                    <option value="cash-on-delivery">Cash on Delivery</option>
                </select>
            </div>
            <button class="btn btn-primary btn-block" onclick="checkout()">
                Proceed to Checkout
            </button>
            <button class="btn btn-danger btn-block" onclick="clearCart()" style="margin-top: 1rem;">
                Clear Cart
            </button>
        </div>
    `;
}

function renderCartItem(item) {
    const product = item.product;
    const effectivePrice = product.price;
    const subtotal = effectivePrice * item.quantity;

    return `
        <div class="cart-item">
            <div class="cart-item-image">
                ${getProductImage(product)}
            </div>
            <div class="cart-item-details">
                <h3 class="cart-item-title">${product.name}</h3>
                <p class="cart-item-price">${formatPrice(effectivePrice)}</p>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity('${product._id}', ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${product._id}', ${item.quantity + 1})">+</button>
                    </div>
                    <button class="btn btn-danger" onclick="removeFromCart('${product._id}')">Remove</button>
                </div>
                <p style="margin-top: 0.5rem;">Subtotal: ${formatPrice(subtotal)}</p>
            </div>
        </div>
    `;
}

function calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
}

function calculateShipping(subtotal) {
    return subtotal > 100 ? 0 : 5; //free shipping over $100
}

async function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        await removeFromCart(productId);
        return;
    }

    //remove item and add with new quantity
    try {
        await api.removeFromCart(productId, authToken);
        await api.addToCart(productId, newQuantity, authToken);
        await loadCart();
        showAlert('Cart updated', 'success');
    } catch (error) {
        console.error('Error updating quantity:', error);
        showAlert('Error updating cart', 'error');
    }
}

async function removeFromCart(productId) {
    try {
        const result = await api.removeFromCart(productId, authToken);

        if (result.success) {
            showAlert('Item removed from cart', 'success');
            await loadCart();
            updateCartCount();
        } else {
            showAlert(result.message || 'Error removing item', 'error');
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showAlert('Error removing item', 'error');
    }
}

async function clearCart() {
    try {
        const result = await api.clearCart(authToken);

        if (result.success) {
            showAlert('Cart cleared', 'success');
            await loadCart();
            updateCartCount();
        } else {
            showAlert(result.message || 'Error clearing cart', 'error');
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        showAlert('Error clearing cart', 'error');
    }
}

async function checkout() {
    if (cart.length === 0) {
        showAlert('Your cart is empty', 'error');
        return;
    }

    //get user info for shipping address
    try {
        const userResult = await api.getMe(authToken);
        const user = userResult.data;

        //use the default address or first address
        const shippingAddress = user.addresses?.find(addr => addr.is_default) || user.addresses?.[0];

        if (!shippingAddress || !shippingAddress.phone) {
            showAlert('Please add a shipping address with phone number', 'error');
            return;
        }

        const subtotal = calculateSubtotal(cart);
        const shipping = calculateShipping(subtotal);
        const total = subtotal + shipping;

        const orderData = buildOrderData(user, shippingAddress, subtotal, shipping, total);
        const result = await api.createOrder(orderData, authToken);

        if (result.success) {
            showAlert('Order placed successfully!', 'success');
            await api.clearCart(authToken);
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1500);
        } else {
            showAlert(result.message || 'Error creating order', 'error');
        }
    } catch (error) {
        console.error('Error during checkout:', error);
        showAlert('Error processing checkout', 'error');
    }
}

function buildOrderData(user, shippingAddress, subtotal, shipping, total) {
    return {
        items: cart.map(item => ({
            product: item.product._id,
            quantity: item.quantity
        })),
        shippingAddress: {
            name: user.name,
            street: shippingAddress.street,
            city: shippingAddress.city,
            country: shippingAddress.country,
            phone: shippingAddress.phone
        },
        paymentMethod: document.getElementById('payment-method')?.value || 'credit-card',
        pricing: {
            subtotal,
            shipping,
            discount: 0,
            total
        }
    };
}

