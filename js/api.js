// client/js/api.js
const API_BASE_URL = 'http://localhost:5000/api';

class ApiClient {
    constructor() {
        this.baseURL = API_BASE_URL;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
        };
    }

    // Get auth token from storage
    getToken() {
        return localStorage.getItem('token');
    }

    // Build headers with optional auth
    buildHeaders(requireAuth = false) {
        const headers = { ...this.defaultHeaders };
        if (requireAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return headers;
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const { requireAuth = false, body, ...restOptions } = options;
        
        const config = {
            ...restOptions,
            headers: this.buildHeaders(requireAuth),
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login.html';
                throw new Error('Session expired. Please login again.');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }

    // HTTP methods
    get(endpoint, requireAuth = true) {
        return this.request(endpoint, { method: 'GET', requireAuth });
    }

    post(endpoint, body, requireAuth = true) {
        return this.request(endpoint, { method: 'POST', body, requireAuth });
    }

    put(endpoint, body, requireAuth = true) {
        return this.request(endpoint, { method: 'PUT', body, requireAuth });
    }

    delete(endpoint, requireAuth = true) {
        return this.request(endpoint, { method: 'DELETE', requireAuth });
    }
}

// Export singleton instance
const api = new ApiClient();
export default api;