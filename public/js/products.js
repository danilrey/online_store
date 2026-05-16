// Products page functionality
let currentPage = 1;
let currentFilters = {
    category: '',
    sort: '-createdAt',
    search: ''
};

document.addEventListener('DOMContentLoaded', () => {
    //get url params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('category')) {
        currentFilters.category = urlParams.get('category');
        document.getElementById('category').value = currentFilters.category;
    }

    //setup event listeners
    document.getElementById('category').addEventListener('change', (e) => {
        applyFilterChange('category', e.target.value);
    });

    document.getElementById('sort').addEventListener('change', (e) => {
        applyFilterChange('sort', e.target.value);
    });

    let searchTimeout;
    document.getElementById('search').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applyFilterChange('search', e.target.value);
        }, 500);
    });

    loadProducts();
});

function applyFilterChange(key, value) {
    currentFilters[key] = value;
    currentPage = 1;
    loadProducts();
}

async function loadProducts() {
    const container = document.getElementById('products-container');
    showLoading(container);

    try {
        const result = await api.getProducts(buildProductParams());

        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(product => createProductCard(product)).join('');
            renderPagination(result.pages, result.currentPage);
        } else {
            setEmptyMessage(container, 'No products found');
            document.getElementById('pagination').innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading products:', error);
        setEmptyMessage(container, 'Error loading products');
    }
}

function buildProductParams() {
    const params = {
        page: currentPage,
        limit: 12,
        ...currentFilters
    };

    //remove empty params
    Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
    });

    return params;
}


function renderPagination(totalPages, current) {
    const container = document.getElementById('pagination');

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    if (current > 1) {
        html += `<button onclick="changePage(${current - 1})">Previous</button>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
            html += `<button class="${i === current ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
        } else if (i === current - 3 || i === current + 3) {
            html += `<span>...</span>`;
        }
    }

    if (current < totalPages) {
        html += `<button onclick="changePage(${current + 1})">Next</button>`;
    }

    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


updateCartCount();
