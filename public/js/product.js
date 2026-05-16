//product details page
let currentProduct = null;

document.addEventListener('DOMContentLoaded', () => {
    const productId = new URLSearchParams(window.location.search).get('id');
    if (!productId) {
        renderProductError('Missing product id');
        return;
    }

    loadProduct(productId);
    loadReviews(productId);
    setupReviewForm(productId);
});

async function loadProduct(productId) {
    const container = document.getElementById('product-details');
    container.innerHTML = '<div class="loading">Loading product...</div>';

    try {
        const result = await api.getProduct(productId);
        if (!result.success) {
            renderProductError(result.message || 'Product not found');
            return;
        }

        currentProduct = result.data;
        container.innerHTML = `
            <div class="product-details">
                <div class="product-image">${getProductImage(currentProduct)}</div>
                <div class="product-info">
                    <div class="product-category">${currentProduct.category.replace('-', ' ')}</div>
                    <h2>${currentProduct.name}</h2>
                    <div class="product-rating">
                        <span class="stars">${getStars(currentProduct.rating?.average || 0)}</span>
                        <span class="rating-count">(${currentProduct.rating?.count || 0})</span>
                    </div>
                    <p>${currentProduct.description}</p>
                    <div class="product-price">
                        <span class="current-price">${formatPrice(currentProduct.price)}</span>
                    </div>
                    <button class="btn btn-primary" onclick="addToCart('${currentProduct._id}')">Add to Cart</button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading product:', error);
        renderProductError('Error loading product');
    }
}

function renderProductError(message) {
    const container = document.getElementById('product-details');
    if (container) {
        container.innerHTML = `<p class="alert alert-error">${message}</p>`;
    }
}

function getReviewFormValues() {
    return {
        rating: Number(document.getElementById('review-rating')?.value),
        title: document.getElementById('review-title')?.value.trim(),
        comment: document.getElementById('review-comment')?.value.trim()
    };
}

async function loadReviews(productId) {
    const list = document.getElementById('reviews-list');
    const summary = document.getElementById('review-summary');

    try {
        const result = await api.getProductReviews(productId);
        const reviews = result.data || [];

        if (!reviews.length) {
            list.innerHTML = '<p class="empty-state">No reviews yet</p>';
            summary.innerHTML = '';
            return;
        }

        const avg = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        summary.innerHTML = `
            <div class="product-rating">
                <span class="stars">${getStars(avg)}</span>
                <span class="rating-count">${avg.toFixed(1)} / 5</span>
            </div>
        `;

        list.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <strong>${review.user?.name || 'User'}</strong>
                    <span>${formatDate(review.createdAt)}</span>
                </div>
                <div class="review-rating">${getStars(review.rating)}</div>
                <h4>${review.title}</h4>
                <p>${review.comment}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading reviews:', error);
        list.innerHTML = '<p class="alert alert-error">Error loading reviews</p>';
    }
}

function setupReviewForm(productId) {
    const form = document.getElementById('review-form');
    const formWrapper = document.getElementById('review-form-wrapper');
    const message = document.getElementById('review-form-message');

    if (!form || !formWrapper || !message) return;

    if (!isAuthenticated()) {
        formWrapper.style.display = 'none';
        message.textContent = 'Login to leave a review.';
        return;
    }

    checkReviewEligibility(productId).then(canReview => {
        if (!canReview.allowed) {
            formWrapper.style.display = 'none';
            message.textContent = canReview.reason;
            return;
        }

        formWrapper.style.display = '';
        message.textContent = '';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { rating, title, comment } = getReviewFormValues();

        if (!rating || !title || !comment) {
            showAlert('Please fill all review fields', 'error');
            return;
        }

        try {
            await api.createReview({
                product: productId,
                rating,
                title,
                comment
            }, authToken);

            showAlert('Review submitted successfully', 'success');
            form.reset();
            await loadReviews(productId);
            setupReviewForm(productId);
        } catch (error) {
            console.error('Error creating review:', error);
            showAlert(error.message || 'Error submitting review', 'error');
        }
    });
}

async function checkReviewEligibility(productId) {
    try {
        const me = await api.getMe(authToken);
        const ordersResult = await api.getMyOrders({}, authToken);
        const orders = ordersResult.data || [];

        const delivered = orders.some(order => order.order_status === 'delivered');

        const purchasedAndDelivered = orders.some(order => {
            if (order.order_status !== 'delivered') return false;

            return (order.items || []).some(item => {
                const productIdValue = item.product?._id || item.product;
                return productIdValue?.toString() === productId;
            });
        });

        if (!delivered || !purchasedAndDelivered) {
            return { allowed: false, reason: 'Only delivered orders can leave a review.' };
        }

        const reviewsResult = await api.getProductReviews(productId);
        const alreadyReviewed = (reviewsResult.data || []).some(review =>
            review.user?._id === me.data?._id
        );

        if (alreadyReviewed) {
            return { allowed: false, reason: 'You already reviewed this product.' };
        }

        return { allowed: true, reason: '' };
    } catch (error) {
        console.error('Error checking review eligibility:', error);
        return { allowed: false, reason: 'Unable to verify review eligibility.' };
    }
}

