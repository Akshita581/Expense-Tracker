// client/js/auth.js
import api from './api.js';

class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.init();
    }

    init() {
        // Check for existing session
        this.token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (userData) {
            this.user = JSON.parse(userData);
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Register new user
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData, false);
            
            if (response.token) {
                this.setSession(response.token, response.user);
                this.showNotification('Account created successfully!', 'success');
                return { success: true, user: response.user };
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Login user
    async login(credentials) {
        try {
            const response = await api.post('/auth/login', credentials, false);
            
            if (response.token) {
                this.setSession(response.token, response.user);
                this.showNotification('Welcome back!', 'success');
                return { success: true, user: response.user };
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Logout user
    logout() {
        this.clearSession();
        this.showNotification('Logged out successfully', 'info');
        window.location.href = '/login.html';
    }

    // Set session data
    setSession(token, user) {
        this.token = token;
        this.user = user;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
    }

    // Clear session data
    clearSession() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    // Update user profile
    async updateProfile(updates) {
        try {
            const response = await api.put('/auth/profile', updates);
            this.user = { ...this.user, ...response.user };
            localStorage.setItem('user', JSON.stringify(this.user));
            this.showNotification('Profile updated!', 'success');
            return { success: true, user: this.user };
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Change password
    async changePassword(passwords) {
        try {
            await api.put('/auth/password', passwords);
            this.showNotification('Password changed successfully!', 'success');
            return { success: true };
        } catch (error) {
            this.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Protect route - redirect if not authenticated
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }

    // Redirect if already authenticated
    redirectIfAuth() {
        if (this.isAuthenticated()) {
            window.location.href = '/index.html';
            return true;
        }
        return false;
    }

    // Show notification toast
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 350px;
        `;

        // Type-based colors
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Add to DOM
        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Auto remove
        setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }
}

// Export singleton instance
const auth = new AuthManager();
export default auth;