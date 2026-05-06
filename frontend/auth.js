const AUTH_TOKEN_KEY = 'vm_token';
const USER_DATA_KEY = 'vm_user';

window.saveAuth = (token, user) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
};

window.getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);

window.getUser = () => {
    const data = localStorage.getItem(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
};

window.isLoggedIn = () => !!window.getAuthToken();

window.logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    window.location.reload();
};

window.apiFetch = async (url, options = {}) => {
    const API_BASE = window.API_BASE || '';
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const token = window.getAuthToken();
    if (token) {
        options.headers = {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        };
    }
    return fetch(fullUrl, options);
};

// Update Navbar based on auth state
window.updateAuthUI = () => {
    const navRight = document.querySelector('.nav-container');
    const user = window.getUser();
    
    // Check if auth elements already exist
    let authBox = document.getElementById('auth-box');
    if (!authBox) {
        authBox = document.createElement('div');
        authBox.id = 'auth-box';
        authBox.style.display = 'flex';
        authBox.style.gap = '15px';
        authBox.style.alignItems = 'center';
        navRight.appendChild(authBox);
    }

    if (user) {
        authBox.innerHTML = `
            <span style="color: var(--text-muted)">Hi, ${user.username}</span>
            <button onclick="logout()" class="genre-pill" style="padding: 4px 12px; font-size: 0.8rem">Logout</button>
        `;
    } else {
        authBox.innerHTML = `
            <a href="login.html" class="genre-pill" style="padding: 4px 12px; font-size: 0.8rem">Login</a>
            <a href="register.html" class="genre-pill" style="padding: 4px 12px; font-size: 0.8rem; background: var(--accent); color: var(--bg)">Sign Up</a>
        `;
    }
};

document.addEventListener('DOMContentLoaded', window.updateAuthUI);
