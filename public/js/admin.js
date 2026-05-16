// Admin analytics page
let salesChart = null;
let statusChart = null;
let topProductsChart = null;
let categoryChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    const user = await api.getMe(authToken).catch(() => null);
    if (!user || !user.success || user.data.role !== 'admin') {
        window.location.href = '/dashboard.html';
        return;
    }

    initFilters();
    await loadAdminAnalytics();
    await loadAdminOrders();
    await loadAdminProducts();

    document.getElementById('admin-orders')?.addEventListener('click', handleOrderAction);
    document.getElementById('admin-products')?.addEventListener('click', handleProductAction);
    document.getElementById('admin-product-form')?.addEventListener('submit', handleCreateProduct);

    document.getElementById('logout-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
});

function initFilters() {
    document.getElementById('admin-interval')?.addEventListener('change', () => loadAdminAnalytics());
    document.getElementById('admin-metric')?.addEventListener('change', () => loadAdminAnalytics());
}

function getFilterParams() {
    const interval = document.getElementById('admin-interval')?.value || 'day';
    return { interval };
}

async function loadAdminAnalytics() {
    const params = getFilterParams();
    const metric = document.getElementById('admin-metric')?.value || 'revenue';

    try {
        const [summaryResult, seriesResult, statusResult, productStatsResult] = await Promise.all([
            api.getSalesAnalytics(authToken, params),
            api.getSalesTimeSeries(authToken, params),
            api.getOrderStatusStats(authToken),
            api.getProductStats(authToken)
        ]);

        updateSummary(summaryResult.data.summary || {});
        renderSalesChart(seriesResult.data || [], metric);
        renderStatusChart(statusResult.data || []);
        renderTopProductsChart((summaryResult.data.topProducts || []).slice(0, 10));
        renderCategoryChart(productStatsResult.data || []);
    } catch (error) {
        console.error('Error loading admin analytics:', error);
    }
}

function updateSummary(summary) {
    const totalOrders = summary.totalOrders ?? 0;
    const totalRevenue = summary.totalRevenue ?? 0;
    const avgOrder = summary.averageOrderValue ?? 0;

    const totalOrdersEl = document.getElementById('summary-total-orders');
    const totalRevenueEl = document.getElementById('summary-total-revenue');
    const avgOrderEl = document.getElementById('summary-avg-order');

    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (totalRevenueEl) totalRevenueEl.textContent = formatPrice(totalRevenue);
    if (avgOrderEl) avgOrderEl.textContent = formatPrice(avgOrder);
}

function renderSalesChart(series, metric) {
    const labels = series.map(point => point.period);
    const values = series.map(point => {
        if (metric === 'orders') {
            return point.totalOrders;
        }
        const revenue = typeof point.totalRevenue === 'number' ? point.totalRevenue : Number(point.totalRevenue || 0);
        return Number(revenue.toFixed(2));
    });
    const label = metric === 'orders' ? 'Orders' : 'Revenue';
    const isOrders = metric === 'orders';

    const ctx = document.getElementById('chart-sales-timeseries');
    if (!ctx) return;

    if (salesChart) salesChart.destroy();
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label,
                data: values,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    ticks: {
                        precision: isOrders ? 0 : 2,
                        callback: value => {
                            const numeric = typeof value === 'number' ? value : Number(value);
                            return isOrders ? Math.round(numeric) : `$${numeric.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

function renderStatusChart(stats) {
    const labels = stats.map(item => item._id || 'unknown');
    const values = stats.map(item => item.count);

    const ctx = document.getElementById('chart-order-status');
    if (!ctx) return;

    if (statusChart) statusChart.destroy();
    statusChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Orders',
                data: values,
                backgroundColor: '#2ecc71'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderTopProductsChart(products) {
    const labels = products.map(item => item.productName || 'Product');
    const values = products.map(item => {
        const revenue = typeof item.totalRevenue === 'number' ? item.totalRevenue : Number(item.totalRevenue || 0);
        return Number(revenue.toFixed(2));
    });

    const ctx = document.getElementById('chart-top-products');
    if (!ctx) return;

    if (topProductsChart) topProductsChart.destroy();
    topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue',
                data: values,
                backgroundColor: '#9b59b6'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => `$${value}`
                    }
                }
            }
        }
    });
}

function renderCategoryChart(stats) {
    const labels = stats.map(item => item._id || 'Other');
    const values = stats.map(item => item.totalSold || 0);

    const ctx = document.getElementById('chart-category-sold');
    if (!ctx) return;

    if (categoryChart) categoryChart.destroy();
    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Units Sold',
                data: values,
                backgroundColor: '#f39c12'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function loadAdminOrders() {
    const container = document.getElementById('admin-orders');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading orders...</div>';

    try {
        const result = await api.getAllOrders({ limit: 50 }, authToken);
        const orders = result.data || [];

        if (!orders.length) {
            setListMessage(container, 'No orders yet');
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="admin-row" data-order-id="${order._id}">
                <div>
                    <div class="admin-row-title">${order.order_number || order.orderNumber}</div>
                    <div class="admin-row-sub">${order.user?.name || 'User'} • ${formatPrice(order.pricing?.total || 0)}</div>
                </div>
                <div class="admin-row-actions">
                    <select class="filter-select" data-role="status">
                        ${renderStatusOptions(order.order_status)}
                    </select>
                    <button class="btn btn-primary" data-action="update-order">Update</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading orders:', error);
        setListMessage(container, 'Error loading orders', true);
    }
}

function renderStatusOptions(current) {
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    return statuses.map(status => `
        <option value="${status}" ${status === current ? 'selected' : ''}>${status}</option>
    `).join('');
}

async function handleOrderAction(event) {
    const action = event.target?.dataset?.action;
    if (action !== 'update-order') return;

    const row = event.target.closest('.admin-row');
    const orderId = row?.dataset?.orderId;
    const status = row?.querySelector('[data-role="status"]')?.value;

    if (!orderId || !status) return;

    try {
        await api.updateOrderStatus(orderId, { orderStatus: status }, authToken);
        showAlert('Order status updated', 'success');
        await loadAdminOrders();
    } catch (error) {
        console.error('Error updating order:', error);
        showAlert(error.message || 'Error updating order', 'error');
    }
}

async function loadAdminProducts() {
    const container = document.getElementById('admin-products');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading products...</div>';

    try {
        const result = await api.getProducts({ limit: 50, includeInactive: 'true' }, authToken);
        const products = result.data || [];

        if (!products.length) {
            setListMessage(container, 'No products found');
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="admin-product-card" data-product-id="${product._id}">
                <div class="admin-product-media">
                    ${product.images?.[0] ? `<img src="${product.images[0]}" alt="${escapeHtml(product.name)}">` : '<div class="admin-product-placeholder">No image</div>'}
                </div>
                <div class="admin-product-info">
                    <div class="admin-row-title">${escapeHtml(product.name)}</div>
                    <div class="admin-row-sub">${product.category?.replace('-', ' ') || ''}</div>
                </div>
                <div class="admin-product-fields">
                    <label class="admin-field">
                        <span>Name</span>
                        <input class="filter-input" data-role="name" value="${escapeHtml(product.name)}" />
                    </label>
                    <label class="admin-field">
                        <span>Price</span>
                        <input class="filter-input" data-role="price" type="number" step="0.01" value="${product.price}" />
                    </label>
                    <label class="admin-field">
                        <span>Category</span>
                        <select class="filter-select" data-role="category">
                            <option value="phone-case" ${product.category === 'phone-case' ? 'selected' : ''}>Phone case</option>
                            <option value="laptop-case" ${product.category === 'laptop-case' ? 'selected' : ''}>Laptop case</option>
                            <option value="tablet-case" ${product.category === 'tablet-case' ? 'selected' : ''}>Tablet case</option>
                            <option value="watch-case" ${product.category === 'watch-case' ? 'selected' : ''}>Watch case</option>
                            <option value="accessory" ${product.category === 'accessory' ? 'selected' : ''}>Accessory</option>
                        </select>
                    </label>
                    <label class="admin-field">
                        <span>Stock</span>
                        <input class="filter-input" data-role="stock" type="number" min="0" value="${product.stock ?? 0}" />
                    </label>
                    <label class="admin-field">
                        <span>Brand</span>
                        <input class="filter-input" data-role="brand" value="${escapeHtml(product.brand || '')}" />
                    </label>
                    <label class="admin-field">
                        <span>Material</span>
                        <input class="filter-input" data-role="material" value="${escapeHtml(product.material || '')}" />
                    </label>
                    <label class="admin-field">
                        <span>Color</span>
                        <input class="filter-input" data-role="color" value="${escapeHtml(product.color || '')}" />
                    </label>
                    <label class="admin-field admin-field-wide">
                        <span>Description</span>
                        <textarea class="filter-input" data-role="description" rows="3">${escapeHtml(product.description || '')}</textarea>
                    </label>
                    <label class="admin-field admin-field-wide">
                        <span>Tags (comma separated)</span>
                        <input class="filter-input" data-role="tags" value="${escapeHtml((product.tags || []).join(', '))}" />
                    </label>
                    <label class="admin-field admin-field-wide">
                        <span>Image URLs (comma separated)</span>
                        <input class="filter-input" data-role="images" value="${escapeHtml((product.images || []).join(', '))}" />
                    </label>
                    <label class="admin-field admin-field-wide">
                        <span>Compatible models (JSON array)</span>
                        <textarea class="filter-input" data-role="models" rows="3">${escapeHtml(JSON.stringify(product.compatible_models || []))}</textarea>
                    </label>
                    <label class="admin-field admin-field-checkbox">
                        <span>Active</span>
                        <input type="checkbox" data-role="active" ${product.is_active !== false ? 'checked' : ''}>
                    </label>
                </div>
                <div class="admin-row-actions">
                    <button class="btn btn-primary" data-action="update-product">Save</button>
                    <button class="btn btn-danger" data-action="delete-product">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
        setListMessage(container, 'Error loading products', true);
    }
}

async function handleProductAction(event) {
    const action = event.target?.dataset?.action;
    if (!action) return;

    const row = event.target.closest('.admin-product-card');
    const productId = row?.dataset?.productId;

    if (!productId) return;

    if (action === 'delete-product') {
        try {
            await api.deleteProduct(productId, authToken);
            showAlert('Product deleted', 'success');
            await loadAdminProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            showAlert(error.message || 'Error deleting product', 'error');
        }
        return;
    }

    if (action !== 'update-product') return;

    const name = row.querySelector('[data-role="name"]')?.value.trim();
    const price = Number(row.querySelector('[data-role="price"]')?.value);
    const category = row.querySelector('[data-role="category"]')?.value;
    const stock = Number(row.querySelector('[data-role="stock"]')?.value);
    const brand = row.querySelector('[data-role="brand"]')?.value.trim();
    const material = row.querySelector('[data-role="material"]')?.value.trim();
    const color = row.querySelector('[data-role="color"]')?.value.trim();
    const description = row.querySelector('[data-role="description"]')?.value.trim();
    const tagsRaw = row.querySelector('[data-role="tags"]')?.value;
    const imagesRaw = row.querySelector('[data-role="images"]')?.value;
    const modelsRaw = row.querySelector('[data-role="models"]')?.value;
    const isActive = row.querySelector('[data-role="active"]')?.checked ?? true;

    if (!name || Number.isNaN(price) || price < 0 || !category || Number.isNaN(stock) || stock < 0 || !description) {
        showAlert('Fill name, description, category, and valid price/stock', 'error');
        return;
    }

    const payloadResult = buildProductPayload({
        name, price, category,
        stock, brand, material,
        color, description, tagsRaw,
        imagesRaw, modelsRaw, isActive
    });

    if (!payloadResult.ok) {
        showAlert(payloadResult.error, 'error');
        return;
    }

    try {
        await api.updateProduct(productId, payloadResult.payload, authToken);
        showAlert('Product updated', 'success');
        await loadAdminProducts();
    } catch (error) {
        console.error('Error updating product:', error);
        showAlert(error.message || 'Error updating product', 'error');
    }
}

async function handleCreateProduct(event) {
    event.preventDefault();

    const name = document.getElementById('admin-product-name')?.value.trim();
    const price = Number(document.getElementById('admin-product-price')?.value);
    const category = document.getElementById('admin-product-category')?.value;
    const stock = Number(document.getElementById('admin-product-stock')?.value);
    const brand = document.getElementById('admin-product-brand')?.value.trim();
    const material = document.getElementById('admin-product-material')?.value.trim();
    const color = document.getElementById('admin-product-color')?.value.trim();
    const description = document.getElementById('admin-product-description')?.value.trim();
    const tagsRaw = document.getElementById('admin-product-tags')?.value;
    const imagesRaw = document.getElementById('admin-product-images')?.value;
    const modelsRaw = document.getElementById('admin-product-models')?.value;
    const isActive = document.getElementById('admin-product-active')?.checked ?? true;

    if (!name || Number.isNaN(price) || price < 0 || !category || Number.isNaN(stock) || stock < 0 || !description) {
        showAlert('Fill all required product fields', 'error');
        return;
    }

    const payloadResult = buildProductPayload({
        name, price, category,
        stock, brand, material,
        color, description, tagsRaw,
        imagesRaw, modelsRaw, isActive
    });

    if (!payloadResult.ok) {
        showAlert(payloadResult.error, 'error');
        return;
    }

    try {
        await api.createProduct(payloadResult.payload, authToken);
        showAlert('Product created', 'success');
        event.target.reset();
        await loadAdminProducts();
    } catch (error) {
        console.error('Error creating product:', error);
        showAlert(error.message || 'Error creating product', 'error');
    }
}

function buildProductPayload(values) {
    const modelsResult = parseCompatibleModels(values.modelsRaw);
    if (!modelsResult.ok) {
        return { ok: false, error: modelsResult.error };
    }

    return {
        ok: true,
        payload: {
            name: values.name,
            price: values.price,
            category: values.category,
            stock: values.stock,
            brand: values.brand || undefined,
            material: values.material || undefined,
            color: values.color || undefined,
            description: values.description,
            tags: parseCsv(values.tagsRaw),
            images: parseCsv(values.imagesRaw),
            compatible_models: modelsResult.value,
            is_active: values.isActive
        }
    };
}

function parseCsv(value) {
    return value ? value.split(',').map(item => item.trim()).filter(Boolean) : [];
}

function parseCompatibleModels(value) {
    if (!value?.trim()) {
        return { ok: true, value: [] };
    }

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) {
            return { ok: false, error: 'Compatible models must be valid JSON array' };
        }
        return { ok: true, value: parsed };
    } catch (error) {
        return { ok: false, error: 'Compatible models must be valid JSON array' };
    }
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setListMessage(container, message, isError = false) {
    container.innerHTML = isError
        ? `<p class="alert alert-error">${message}</p>`
        : `<p class="empty-state">${message}</p>`;
}

