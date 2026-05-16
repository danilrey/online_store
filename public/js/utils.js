//cart management
async function updateCartCount() {
    if (!isAuthenticated()) return;

    try {
        const result = await api.getMe(authToken);
        if (result.success && result.data.cart) {
            const count = result.data.cart.reduce((sum, item) => sum + item.quantity, 0);
            const badge = document.getElementById('cart-count');
            if (badge) {
                badge.textContent = count;
            }
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

//add product to cart with authentication check
async function addToCart(productId, quantity = 1) {
    if (!isAuthenticated()) {
        showAlert('Please login to add items to cart', 'error');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return;
    }

    try {
        const result = await api.addToCart(productId, quantity, authToken);

        if (result.success) {
            showAlert('Product added to cart!', 'success');
            updateCartCount();
        } else {
            showAlert(result.message || 'Error adding to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showAlert(error.message || 'Error adding to cart', 'error');
    }
}

//product card creation
function createProductCard(product) {
    const effectivePrice = product.discountPrice || product.price;
    const hasDiscount = product.discountPrice && product.discountPrice < product.price;
    const discount = hasDiscount ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;

    return `
        <div class="product-card" onclick="viewProduct('${product._id}')">
            ${hasDiscount ? `<div class="product-badge">-${discount}%</div>` : ''}
            <div class="product-image">
                ${getProductImage(product)}
            </div>
            <div class="product-content">
                <div class="product-category">${product.category.replace('-', ' ')}</div>
                <h3 class="product-title">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-rating">
                    <span class="stars">${getStars(product.rating?.average || 0)}</span>
                    <span class="rating-count">(${product.rating?.count || 0})</span>
                </div>
                <div class="product-footer">
                    <div class="product-price">
                        <span class="current-price">${formatPrice(effectivePrice)}</span>
                        ${hasDiscount ? `<span class="original-price">${formatPrice(product.price)}</span>` : ''}
                    </div>
                    <button class="btn-add-cart" onclick="event.stopPropagation(); addToCart('${product._id}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;
}

//navigate to product detail page
function viewProduct(productId) {
    window.location.href = `/product.html?id=${productId}`;
}

//dom helpers
function showElement(element) {
    if (!element) return;
    element.style.display = '';
    element.style.removeProperty('display');
}

function hideElement(element) {
    if (!element) return;
    element.style.display = 'none';
}

//loading state helpers
function showLoading(container) {
    if (container) {
        container.innerHTML = '<div class="loading">Loading...</div>';
    }
}

function setEmptyMessage(container, message) {
    if (container) {
        container.innerHTML = `<p class="empty-state">${message}</p>`;
    }
}
