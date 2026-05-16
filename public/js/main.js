// Main page functionality
document.addEventListener('DOMContentLoaded', async () => {
    await loadFeaturedProducts();
    await loadTopRatedProducts();
});

async function loadFeaturedProducts() {
    return loadProductsInto(
        'featured-products',
        () => api.getProducts({ limit: 4, sort: '-soldCount' }),
        'No products available',
        'Error loading products'
    );
}

async function loadTopRatedProducts() {
    return loadProductsInto(
        'top-rated-products',
        () => api.getTopRated(),
        'No top rated products yet',
        'Error loading products'
    );
}

async function loadProductsInto(containerId, fetcher, emptyMessage, errorMessage) {
    const container = document.getElementById(containerId);

    try {
        const result = await fetcher();

        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(product => createProductCard(product)).join('');
        } else {
            setEmptyMessage(container, emptyMessage);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        setEmptyMessage(container, errorMessage);
    }
}

//update cart count on page load
updateCartCount();
