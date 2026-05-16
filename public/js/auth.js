//auth state management
let currentUser = null;
let authToken = localStorage.getItem('authToken');

function loadCachedUser() {
    const cached = localStorage.getItem('currentUser');
    if (!cached) return null;

    try {
        return JSON.parse(cached);
    } catch (error) {
        localStorage.removeItem('currentUser');
        return null;
    }
}

function cacheUser(user) {
    if (!user) {
        localStorage.removeItem('currentUser');
        return;
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
}

function updateCartCountFromUser(user) {
    const badge = document.getElementById('cart-count');
    if (!badge) return;

    if (!user || !user.cart) {
        badge.textContent = '0';
        return;
    }

    const count = user.cart.reduce((sum, item) => sum + item.quantity, 0);
    badge.textContent = String(count);
}

//initialize auth state
async function initAuth() {
    const cachedUser = loadCachedUser();
    if (cachedUser && !currentUser) {
        currentUser = cachedUser;
        updateAuthUI();
    }

    if (authToken) {
        try {
            const result = await api.getMe(authToken);
            if (result.success) {
                currentUser = result.data;
                cacheUser(currentUser);
                updateAuthUI();
                updateCartCountFromUser(result.data);
            } else {
                logout();
            }
        } catch (error) {
            logout();
        }
    }

    if (currentUser && currentUser.role === 'admin') {
        const path = window.location.pathname;
        if (!path.endsWith('/admin.html') && !path.endsWith('/login.html')) {
            window.location.href = '/admin.html';
        }
    }
}

//update ui based on auth state
function updateAuthUI() {
    const authLink = document.getElementById('auth-link');
    const dashboardLink = document.getElementById('dashboard-link');
    const userNameDisplay = document.getElementById('user-name-display');
    const logoutLink = document.getElementById('logout-link');
    const adminLink = document.getElementById('admin-link');

    if (currentUser) {
        //show user name
        if (userNameDisplay) {
            userNameDisplay.textContent = `${currentUser.name}`;
            showElement(userNameDisplay);
        }

        //change auth link to logout (if present)
        if (authLink) {
            authLink.textContent = 'Logout';
            authLink.href = '#';
            authLink.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }

        //handle dashboard logout link (if present)
        if (logoutLink) {
            logoutLink.onclick = (e) => {
                e.preventDefault();
                logout();
            };
        }

        //show dashboard link (if present and not on dashboard page)
        if (dashboardLink && !dashboardLink.classList.contains('active')) {
            showElement(dashboardLink);
        }

        if (adminLink) {
            if (currentUser.role === 'admin') {
                showElement(adminLink);
            } else {
                hideElement(adminLink);
            }
        }
    } else {
        //hide user name
        hideElement(userNameDisplay);

        //change auth link to login
        if (authLink) {
            authLink.textContent = 'Login';
            authLink.href = '/login.html';
            authLink.onclick = null;
        }

        //hide dashboard link
        hideElement(dashboardLink);

        hideElement(adminLink);
    }
}

//logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    updateAuthUI();
    window.location.href = '/';
}

//check if user is authenticated
function isAuthenticated() {
    return !!authToken;
}

//require authentication
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

//initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
