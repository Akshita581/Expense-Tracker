// client/js/main.js
import auth from './auth.js';
import expenses from './expenses.js';

class App {
    constructor() {
        this.currentPage = this.detectPage();
        this.init();
    }

    detectPage() {
        const path = window.location.pathname;
        if (path.includes('login')) return 'login';
        if (path.includes('register')) return 'register';
        if (path.includes('index') || path === '/' || path === '') return 'dashboard';
        return 'unknown';
    }

    init() {
        // Initialize based on current page
        switch (this.currentPage) {
            case 'login':
                this.initLoginPage();
                break;
            case 'register':
                this.initRegisterPage();
                break;
            case 'dashboard':
                this.initDashboard();
                break;
        }

        // Global event listeners
        this.setupGlobalEvents();
    }

    // Login Page Initialization
    initLoginPage() {
        if (auth.redirectIfAuth()) return;

        const form = document.getElementById('loginForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            this.setLoading(submitBtn, true);

            const credentials = {
                email: form.email.value,
                password: form.password.value
            };

            const result = await auth.login(credentials);
            this.setLoading(submitBtn, false);

            if (result.success) {
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 500);
            }
        });
    }

    // Register Page Initialization
    initRegisterPage() {
        if (auth.redirectIfAuth()) return;

        const form = document.getElementById('registerForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            this.setLoading(submitBtn, true);

            if (form.password.value !== form.confirmPassword.value) {
                auth.showNotification('Passwords do not match!', 'error');
                this.setLoading(submitBtn, false);
                return;
            }

            const userData = {
                name: form.name.value,
                email: form.email.value,
                password: form.password.value
            };

            const result = await auth.register(userData);
            this.setLoading(submitBtn, false);

            if (result.success) {
                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 500);
            }
        });
    }

    // Dashboard Initialization
    async initDashboard() {
        if (!auth.requireAuth()) return;

        // Setup UI components
        this.setupNavigation();
        this.setupExpenseForm();
        this.setupFilters();
        this.setupCharts();

        // Load initial data
        await this.loadDashboardData();
    }

    setupNavigation() {
        // User info
        const user = auth.getCurrentUser();
        const userNameEl = document.getElementById('userName');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) userNameEl.textContent = user?.name || 'User';
        if (userAvatarEl) userAvatarEl.textContent = (user?.name?.[0] || 'U').toUpperCase();

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => auth.logout());
        }

        // Mobile menu toggle
        const menuToggle = document.getElementById('menuToggle');
        const sidebar = document.getElementById('sidebar');
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('active');
            });
        }
    }

    setupExpenseForm() {
        const form = document.getElementById('expenseForm');
        const modal = document.getElementById('expenseModal');
        const addBtn = document.getElementById('addExpenseBtn');
        const closeBtn = document.getElementById('closeModal');

        // Category select population
        const categorySelect = document.getElementById('category');
        if (categorySelect) {
            expenses.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icon} ${cat.name}`;
                categorySelect.appendChild(option);
            });
        }

        // Open modal
        if (addBtn && modal) {
            addBtn.addEventListener('click', () => {
                modal.classList.add('active');
                form.reset();
                form.dataset.mode = 'create';
                delete form.dataset.expenseId;
            });
        }

        // Close modal
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        // Form submission
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = form.querySelector('button[type="submit"]');
                this.setLoading(submitBtn, true);

                const expenseData = {
                    amount: parseFloat(form.amount.value),
                    category: form.category.value,
                    description: form.description.value,
                    date: form.date.value || new Date().toISOString().split('T')[0]
                };

                const isEdit = form.dataset.mode === 'edit';
                const result = isEdit 
                    ? await expenses.updateExpense(form.dataset.expenseId, expenseData)
                    : await expenses.createExpense(expenseData);

                this.setLoading(submitBtn, false);

                if (result.success) {
                    modal.classList.remove('active');
                    await this.loadDashboardData();
                }
            });
        }
    }

    setupFilters() {
        const searchInput = document.getElementById('searchExpenses');
        const categoryFilter = document.getElementById('filterCategory');
        const dateFilter = document.getElementById('filterDate');
        const sortSelect = document.getElementById('sortExpenses');

        const applyFilters = () => {
            const criteria = {
                search: searchInput?.value,
                category: categoryFilter?.value,
                date: dateFilter?.value
            };
            
            let filtered = expenses.filterExpenses(criteria);
            
            if (sortSelect?.value) {
                const [sortBy, order] = sortSelect.value.split('-');
                filtered = expenses.sortExpenses(filtered, sortBy, order);
            }
            
            this.renderExpensesList(filtered);
        };

        [searchInput, categoryFilter, dateFilter, sortSelect].forEach(el => {
            if (el) el.addEventListener('input', applyFilters);
        });
    }

    setupCharts() {
        // Chart initialization placeholder - integrate with Chart.js or similar
        this.chartInstances = {};
    }

    async loadDashboardData() {
        // Show loading state
        this.showLoading(true);

        // Load expenses
        const result = await expenses.getExpenses();
        
        if (result.success) {
            this.updateDashboardStats();
            this.renderExpensesList(expenses.expenses);
            this.renderCharts();
        }

        this.showLoading(false);
    }

    updateDashboardStats() {
        const stats = expenses.calculateTotals();
        
        // Animate numbers
        this.animateValue('totalAmount', stats.total);
        this.animateValue('totalTransactions', expenses.expenses.length);
        
        // Update category breakdown
        const breakdownEl = document.getElementById('categoryBreakdown');
        if (breakdownEl) {
            breakdownEl.innerHTML = '';
            Object.entries(stats.byCategory).forEach(([catId, amount]) => {
                const cat = expenses.getCategory(catId);
                const percentage = (amount / stats.total * 100).toFixed(1);
                
                const item = document.createElement('div');
                item.className = 'category-item';
                item.innerHTML = `
                    <div class="category-info">
                        <span class="category-icon" style="background: ${cat.color}20; color: ${cat.color}">
                            ${cat.icon}
                        </span>
                        <div>
                            <div class="category-name">${cat.name}</div>
                            <div class="category-bar">
                                <div class="category-progress" style="width: ${percentage}%; background: ${cat.color}"></div>
                            </div>
                        </div>
                    </div>
                    <div class="category-amount">${expenses.formatCurrency(amount)}</div>
                `;
                breakdownEl.appendChild(item);
            });
        }
    }

    renderExpensesList(expensesList) {
        const container = document.getElementById('expensesList');
        if (!container) return;

        if (expensesList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>No expenses found</h3>
                    <p>Add your first expense to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = expensesList.map(expense => {
            const cat = expenses.getCategory(expense.category);
            return `
                <div class="expense-card" data-id="${expense._id}">
                    <div class="expense-icon" style="background: ${cat.color}20; color: ${cat.color}">
                        ${cat.icon}
                    </div>
                    <div class="expense-details">
                        <div class="expense-header">
                            <h4>${expense.description || cat.name}</h4>
                            <span class="expense-amount">-${expenses.formatCurrency(expense.amount)}</span>
                        </div>
                        <div class="expense-meta">
                            <span class="expense-category">${cat.name}</span>
                            <span class="expense-date">${expenses.formatDate(expense.date)}</span>
                        </div>
                    </div>
                    <div class="expense-actions">
                        <button class="btn-icon edit-btn" data-id="${expense._id}" title="Edit">
                            ✏️
                        </button>
                        <button class="btn-icon delete-btn" data-id="${expense._id}" title="Delete">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.editExpense(e.target.dataset.id));
        });

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.deleteExpense(e.target.dataset.id));
        });
    }

    async editExpense(id) {
        const expense = expenses.expenses.find(e => e._id === id);
        if (!expense) return;

        const form = document.getElementById('expenseForm');
        const modal = document.getElementById('expenseModal');
        
        form.amount.value = expense.amount;
        form.category.value = expense.category;
        form.description.value = expense.description || '';
        form.date.value = expense.date.split('T')[0];
        
        form.dataset.mode = 'edit';
        form.dataset.expenseId = id;
        
        modal.classList.add('active');
    }

    async deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        
        const result = await expenses.deleteExpense(id);
        if (result.success) {
            await this.loadDashboardData();
        }
    }

    renderCharts() {
        // Implement chart rendering using Chart.js or similar library
        const stats = expenses.calculateTotals();
        
        // Simple SVG pie chart implementation
        const chartContainer = document.getElementById('expenseChart');
        if (!chartContainer || Object.keys(stats.byCategory).length === 0) return;

        let currentAngle = 0;
        const total = stats.total;
        const radius = 80;
        const center = 100;

        let svgContent = '';
        Object.entries(stats.byCategory).forEach(([catId, amount]) => {
            const cat = expenses.getCategory(catId);
            const percentage = amount / total;
            const angle = percentage * 360;
            
            const x1 = center + radius * Math.cos(Math.PI * currentAngle / 180);
            const y1 = center + radius * Math.sin(Math.PI * currentAngle / 180);
            const x2 = center + radius * Math.cos(Math.PI * (currentAngle + angle) / 180);
            const y2 = center + radius * Math.sin(Math.PI * (currentAngle + angle) / 180);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            svgContent += `
                <path d="M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" 
                      fill="${cat.color}" stroke="white" stroke-width="2"/>
            `;
            
            currentAngle += angle;
        });

        chartContainer.innerHTML = `
            <svg viewBox="0 0 200 200" style="transform: rotate(-90deg);">
                ${svgContent}
                <circle cx="${center}" cy="${center}" r="50" fill="white"/>
            </svg>
        `;
    }

    // Utility methods
    setLoading(element, isLoading) {
        if (!element) return;
        element.disabled = isLoading;
        element.dataset.originalText = element.dataset.originalText || element.textContent;
        element.textContent = isLoading ? 'Loading...' : element.dataset.originalText;
    }

    showLoading(show) {
        const loader = document.getElementById('pageLoader');
        if (loader) {
            loader.style.display = show ? 'flex' : 'none';
        }
    }

    animateValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const start = parseFloat(element.textContent.replace(/[^0-9.-]+/g, '')) || 0;
        const duration = 1000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            
            const current = start + (value - start) * easeProgress;
            element.textContent = elementId.includes('Amount') 
                ? expenses.formatCurrency(current)
                : Math.floor(current).toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    setupGlobalEvents() {
        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new App();
});