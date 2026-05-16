// Dashboard page functionality
document.addEventListener('DOMContentLoaded', async () => {
    if (!requireAuth()) return;

    const user = await loadUserInfo();
    loadOrders();

    if (user) {
        loadAnalytics(user);
    }

    document.getElementById('address-form')?.addEventListener('submit', handleAddressSubmit);
    document.getElementById('address-cancel')?.addEventListener('click', resetAddressForm);
    document.getElementById('address-list')?.addEventListener('click', handleAddressListClick);

    // Setup order filter
    document.getElementById('order-status-filter')?.addEventListener('change', (e) => {
        loadOrders(e.target.value);
    });

    // Setup logout
    document.getElementById('logout-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
});

async function loadUserInfo() {
    const container = document.getElementById('user-details');

    try {
        const result = await api.getMe(authToken);

        if (result.success) {
            const user = result.data;
            container.innerHTML = `
                <p><strong>Name:</strong> ${user.name}</p>
                <p><strong>Email:</strong> ${user.email}</p>
                <p><strong>Phone:</strong> ${user.phone || 'Not provided'}</p>
                <p><strong>Role:</strong> ${user.role}</p>
                <p><strong>Member since:</strong> ${formatDate(user.createdAt)}</p>
            `;
            renderAddresses(user.addresses || []);
            return user;
        }
    } catch (error) {
        console.error('Error loading user info:', error);
        container.innerHTML = '<p class="alert alert-error">Error loading user information</p>';
    }

    return null;
}

function renderAddresses(addresses) {
    const list = document.getElementById('address-list');
    if (!list) return;

    if (!addresses.length) {
        list.innerHTML = '<p class="empty-state">No addresses yet</p>';
        return;
    }

    list.innerHTML = addresses.map(address => `
        <div class="address-card" data-address-id="${address._id}">
            <div><strong>${address.street}</strong></div>
            <div>${address.city}, ${address.country}</div>
            ${address.phone ? `<div>${address.phone}</div>` : ''}
            ${address.is_default ? '<span class="badge">Default</span>' : ''}
            <div class="address-actions">
                <button type="button" class="btn btn-primary" data-action="edit">Edit</button>
                <button type="button" class="btn btn-danger" data-action="delete">Delete</button>
            </div>
        </div>
    `).join('');
}

function handleAddressListClick(event) {
    const action = event.target?.dataset?.action;
    if (!action) return;

    if (action === 'edit') {
        const card = event.target.closest('.address-card');
        const addressId = card?.dataset?.addressId;
        if (!addressId) return;

        const street = card.querySelector('strong')?.textContent || '';
        const cityCountry = card.querySelectorAll('div')[1]?.textContent || '';
        const phone = card.querySelectorAll('div')[2]?.textContent || '';
        const [city, country] = cityCountry.split(',').map(item => item.trim());
        const isDefault = !!card.querySelector('.badge');

        setAddressFormValues({
            id: addressId,
            street,
            city: city || '',
            country: country || '',
            phone: phone || '',
            isDefault,
            isEditing: true
        });
        return;
    }

    if (action === 'delete') {
        handleDeleteAddress(event.target.closest('.address-card'));
    }
}

async function handleDeleteAddress(card) {
    const addressId = card?.dataset?.addressId;
    if (!addressId) return;

    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            showAlert('User not found', 'error');
            return;
        }

        await api.removeAddress(userId, addressId, authToken);
        showAlert('Address deleted successfully', 'success');
        resetAddressForm();
        await loadUserInfo();
    } catch (error) {
        console.error('Error deleting address:', error);
        showAlert(error.message || 'Error deleting address', 'error');
    }
}

function resetAddressForm() {
    const form = document.getElementById('address-form');
    if (!form) return;

    form.reset();
    setAddressFormValues({ isEditing: false });
}

async function handleAddressSubmit(e) {
    e.preventDefault();

    const addressId = document.getElementById('address-id')?.value;
    const street = document.getElementById('address-street')?.value.trim();
    const city = document.getElementById('address-city')?.value.trim();
    const country = document.getElementById('address-country')?.value.trim();
    const phone = document.getElementById('address-phone')?.value.trim();
    const isDefault = document.getElementById('address-default')?.checked || false;

    if (!street || !city || !country || !phone) {
        showAlert('Please fill address fields', 'error');
        return;
    }

    try {
        const userId = await getCurrentUserId();
        if (!userId) {
            showAlert('User not found', 'error');
            return;
        }

        const payload = {
            street,
            city,
            country,
            phone,
            is_default: isDefault
        };

        if (addressId) {
            await api.updateAddress(userId, addressId, payload, authToken);
            showAlert('Address updated successfully', 'success');
        } else {
            await api.addAddress(userId, payload, authToken);
            showAlert('Address added successfully', 'success');
        }

        resetAddressForm();
        await loadUserInfo();
    } catch (error) {
        console.error('Error saving address:', error);
        showAlert(error.message || 'Error saving address', 'error');
    }
}

async function loadOrders(status = '') {
    const container = document.getElementById('orders-container');
    container.innerHTML = '<div class="loading">Loading orders...</div>';

    try {
        const params = status ? { status } : {};
        const result = await api.getMyOrders(params, authToken);

        if (result.success && result.data.length > 0) {
            const normalizedOrders = result.data.map(normalizeOrder);
            container.innerHTML = normalizedOrders.map(order => createOrderCard(order)).join('');
        } else {
            setOrdersMessage(container, 'No orders found');
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        setOrdersMessage(container, 'Error loading orders', true);
    }
}

function normalizeOrder(order) {
    const items = (order.items || []).map(item => ({
        ...item,
        product_snapshot: item.product_snapshot
    }));

    return {
        ...order,
        orderStatus: order.order_status,
        orderNumber: order.order_number,
        trackingNumber: order.tracking_number,
        items
    };
}

function createOrderCard(order) {
    const status = order.orderStatus || 'pending';
    const statusClass = `status-${status}`;

    return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <div class="order-number">${order.orderNumber}</div>
                    <small>${formatDate(order.createdAt)}</small>
                </div>
                <span class="order-status ${statusClass}">${status.toUpperCase()}</span>
            </div>
            
            <div class="order-items">
                ${order.items.map(item => `
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee;">
                        <span>${item.product_snapshot?.name || 'Product'} x${item.quantity}</span>
                        <span>${formatPrice(item.subtotal)}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #eee;">
                <div>
                    <strong>Total: ${formatPrice(order.pricing.total)}</strong>
                </div>
                ${status === 'pending' || status === 'processing' ? 
                    `<button class="btn btn-danger" onclick="cancelOrder('${order._id}')">Cancel Order</button>` 
                    : ''}
            </div>
            
            ${order.trackingNumber ? `
                <div style="margin-top: 1rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                    <strong>Tracking Number:</strong> ${order.trackingNumber}
                </div>
            ` : ''}
        </div>
    `;
}

async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
        const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();

        if (result.success) {
            showAlert('Order cancelled successfully', 'success');
            loadOrders();
        } else {
            showAlert(result.message || 'Error cancelling order', 'error');
        }
    } catch (error) {
        console.error('Error cancelling order:', error);
        showAlert('Error cancelling order', 'error');
    }
}

function buildBarChart(title, rows) {
    const safeRows = rows.filter(row => row && row.label);
    const maxValue = Math.max(...safeRows.map(row => row.value), 1);

    return `
        <div class="chart">
            <div class="chart-title">${title}</div>
            ${safeRows.map(row => {
                const width = Math.round((row.value / maxValue) * 100);
                return `
                    <div class="chart-row">
                        <span class="chart-label">${row.label}</span>
                        <div class="chart-bar">
                            <div class="chart-bar-fill" style="width: ${width}%;"></div>
                        </div>
                        <span class="chart-value">${row.displayValue ?? row.value}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

async function loadAnalytics(user) {
    const container = document.getElementById('analytics-content');
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading analytics...</div>';

    await loadUserAnalytics(user, container);
}

async function loadUserAnalytics(user, container) {
    try {
        const result = await api.getUserOrderHistory(user._id, authToken);
        const stats = result.data.statistics || {};
        const orders = result.data.orders || [];

        const statusCounts = orders.reduce((acc, order) => {
            const status = order.order_status || 'pending';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        const statusRows = Object.entries(statusCounts).map(([label, value]) => ({
            label,
            value
        }));

        container.innerHTML = `
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Orders</div>
                    <div class="stat-value">${stats.totalOrders ?? 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Spent</div>
                    <div class="stat-value">${stats.totalSpent ? formatPrice(stats.totalSpent) : '$0.00'}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Avg Order</div>
                    <div class="stat-value">${stats.averageOrderValue ? formatPrice(stats.averageOrderValue) : '$0.00'}</div>
                </div>
            </div>
            ${statusRows.length > 0 ? buildBarChart('Orders by Status', statusRows) : '<p class="empty-state">No analytics available yet</p>'}
        `;
    } catch (error) {
        console.error('Error loading analytics:', error);
        container.innerHTML = '<p class="alert alert-error">Error loading analytics</p>';
    }
}

function setAddressFormValues(values) {
    document.getElementById('address-id').value = values.id || '';
    document.getElementById('address-street').value = values.street || '';
    document.getElementById('address-city').value = values.city || '';
    document.getElementById('address-country').value = values.country || '';
    document.getElementById('address-phone').value = values.phone || '';
    document.getElementById('address-default').checked = values.isDefault || false;
    document.getElementById('address-submit').textContent = values.isEditing ? 'Update Address' : 'Add Address';
    document.getElementById('address-cancel').style.display = values.isEditing ? '' : 'none';
}

function setOrdersMessage(container, message, isError = false) {
    container.innerHTML = isError
        ? `<p class="alert alert-error">${message}</p>`
        : `<p class="empty-state">${message}</p>`;
}

async function getCurrentUserId() {
    const me = await api.getMe(authToken);
    return me.data?._id || null;
}
