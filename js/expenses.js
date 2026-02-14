// client/js/expenses.js
import api from './api.js';
import auth from './auth.js';

class ExpenseManager {
    constructor() {
        this.expenses = [];
        this.categories = [
            { id: 'food', name: 'Food & Dining', icon: '🍔', color: '#f59e0b' },
            { id: 'transport', name: 'Transportation', icon: '🚗', color: '#3b82f6' },
            { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899' },
            { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
            { id: 'bills', name: 'Bills & Utilities', icon: '💡', color: '#ef4444' },
            { id: 'health', name: 'Health & Medical', icon: '⚕️', color: '#10b981' },
            { id: 'education', name: 'Education', icon: '📚', color: '#6366f1' },
            { id: 'other', name: 'Other', icon: '📦', color: '#6b7280' }
        ];
    }

    // Get all expenses
    async getExpenses(filters = {}) {
        try {
            const queryParams = new URLSearchParams();
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);
            if (filters.category) queryParams.append('category', filters.category);
            
            const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
            const response = await api.get(`/expenses${query}`);
            this.expenses = response.expenses || [];
            return { success: true, expenses: this.expenses };
        } catch (error) {
            auth.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Create new expense
    async createExpense(expenseData) {
        try {
            const response = await api.post('/expenses', expenseData);
            this.expenses.unshift(response.expense);
            auth.showNotification('Expense added successfully!', 'success');
            return { success: true, expense: response.expense };
        } catch (error) {
            auth.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Update expense
    async updateExpense(id, updates) {
        try {
            const response = await api.put(`/expenses/${id}`, updates);
            const index = this.expenses.findIndex(e => e._id === id);
            if (index !== -1) {
                this.expenses[index] = response.expense;
            }
            auth.showNotification('Expense updated!', 'success');
            return { success: true, expense: response.expense };
        } catch (error) {
            auth.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Delete expense
    async deleteExpense(id) {
        try {
            await api.delete(`/expenses/${id}`);
            this.expenses = this.expenses.filter(e => e._id !== id);
            auth.showNotification('Expense deleted!', 'success');
            return { success: true };
        } catch (error) {
            auth.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Get expense statistics
    async getStatistics(period = 'month') {
        try {
            const response = await api.get(`/expenses/statistics?period=${period}`);
            return { success: true, statistics: response.statistics };
        } catch (error) {
            auth.showNotification(error.message, 'error');
            return { success: false, error: error.message };
        }
    }

    // Calculate totals
    calculateTotals() {
        const total = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        const byCategory = {};
        
        this.expenses.forEach(expense => {
            const cat = expense.category;
            byCategory[cat] = (byCategory[cat] || 0) + expense.amount;
        });

        return { total, byCategory };
    }

    // Get category details
    getCategory(categoryId) {
        return this.categories.find(c => c.id === categoryId) || this.categories[7]; // default to 'other'
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }).format(date);
    }

    // Filter expenses
    filterExpenses(criteria) {
        return this.expenses.filter(expense => {
            let match = true;
            if (criteria.category && expense.category !== criteria.category) match = false;
            if (criteria.startDate && new Date(expense.date) < new Date(criteria.startDate)) match = false;
            if (criteria.endDate && new Date(expense.date) > new Date(criteria.endDate)) match = false;
            if (criteria.search) {
                const searchLower = criteria.search.toLowerCase();
                const matchesSearch = expense.description?.toLowerCase().includes(searchLower) ||
                                    expense.category.toLowerCase().includes(searchLower);
                if (!matchesSearch) match = false;
            }
            return match;
        });
    }

    // Sort expenses
    sortExpenses(expenses, sortBy = 'date', order = 'desc') {
        return [...expenses].sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.date) - new Date(b.date);
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
                case 'category':
                    comparison = a.category.localeCompare(b.category);
                    break;
                default:
                    comparison = 0;
            }
            return order === 'desc' ? -comparison : comparison;
        });
    }
}

// Export singleton instance
const expenses = new ExpenseManager();
export default expenses;