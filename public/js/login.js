//login page functionality
document.addEventListener('DOMContentLoaded', () => {
    //check if already logged in
    if (isAuthenticated()) {
        const cached = localStorage.getItem('currentUser');
        if (cached) {
            try {
                const user = JSON.parse(cached);
                window.location.href = user.role === 'admin' ? '/admin.html' : '/dashboard.html';
                return;
            } catch (error) {
                window.location.href = '/dashboard.html';
                return;
            }
        }
        window.location.href = '/dashboard.html';
        return;
    }

    //setup login form
    document.getElementById('login-form-element').addEventListener('submit', handleLogin);

    //setup register form
    document.getElementById('register-form-element').addEventListener('submit', handleRegister);
});

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    //client-side validation
    if (!email) {
        showAlert('Email is required', 'error');
        return;
    }

    if (!password) {
        showAlert('Password is required', 'error');
        return;
    }

    //disable submit button to prevent double submission
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = setSubmitState(submitBtn, true, 'Logging in...');

    try {
        const result = await api.login({ email, password });
        setAuthAndRedirect(result);
    } catch (error) {
        console.error('Login error:', error);
        showAlert(error.message || 'Login failed. Please check your credentials.', 'error');

        //re-enable submit button
        setSubmitState(submitBtn, false, originalText);
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const phone = document.getElementById('register-phone').value.trim();

    //client-side validation
    if (!name || name.length < 2) {
        showAlert('Name must be at least 2 characters long', 'error');
        return;
    }

    if (!email) {
        showAlert('Email is required', 'error');
        return;
    }

    if (!password || password.length < 4) {
        showAlert('Password must be at least 4 characters long', 'error');
        return;
    }

    //disable submit button to prevent double submission
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = setSubmitState(submitBtn, true, 'Registering...');

    try {
        const result = await api.register({ name, email, password, phone });
        setAuthAndRedirect(result);
    } catch (error) {
        console.error('Registration error:', error);
        showAlert(error.message || 'Registration failed. Please try again.', 'error');

        //re-enable submit button
        setSubmitState(submitBtn, false, originalText);
    }
}

function setAuthAndRedirect(result) {
    localStorage.setItem('authToken', result.data.token);
    localStorage.setItem('currentUser', JSON.stringify(result.data.user));
    authToken = result.data.token;
    currentUser = result.data.user;

    showAlert('Login successful! Redirecting...', 'success');

    setTimeout(() => {
        window.location.href = result.data.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
    }, 1000);
}

function setSubmitState(button, disabled, label) {
    if (!button) return '';
    const previous = button.textContent;
    button.disabled = disabled;
    if (label) {
        button.textContent = label;
    }
    return previous;
}

function showLogin() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
}

function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}
