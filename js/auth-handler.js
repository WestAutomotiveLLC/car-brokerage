class AuthHandler {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('users')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
        this.init();
    }

    init() {
        // Initialize with a demo user if none exists
        if (this.users.length === 0) {
            const demoUser = {
                id: '1',
                email: 'demo@westautomotive.com',
                password: 'demo123',
                fullName: 'Demo User',
                createdAt: new Date().toISOString()
            };
            this.users.push(demoUser);
            this.saveUsers();
        }
    }

    // Save users to localStorage
    saveUsers() {
        localStorage.setItem('users', JSON.stringify(this.users));
    }

    // Save current user to localStorage
    saveCurrentUser() {
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }

    // Clear current user
    clearCurrentUser() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    }

    // Register new user
    async register(email, password, fullName) {
        try {
            // Check if user already exists
            const existingUser = this.users.find(user => user.email === email);
            if (existingUser) {
                return {
                    success: false,
                    error: 'User already exists with this email'
                };
            }

            // Create new user
            const newUser = {
                id: Date.now().toString(),
                email: email,
                password: password, // In a real app, this would be hashed
                fullName: fullName,
                createdAt: new Date().toISOString()
            };

            this.users.push(newUser);
            this.saveUsers();

            // Auto-login after registration
            this.currentUser = { id: newUser.id, email: newUser.email, fullName: newUser.fullName };
            this.saveCurrentUser();

            return {
                success: true,
                data: this.currentUser
            };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'Registration failed. Please try again.'
            };
        }
    }

    // Login user
    async login(email, password) {
        try {
            const user = this.users.find(u => u.email === email && u.password === password);
            
            if (!user) {
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }

            this.currentUser = { id: user.id, email: user.email, fullName: user.fullName };
            this.saveCurrentUser();

            return {
                success: true,
                data: this.currentUser
            };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    }

    // Logout user
    async logout() {
        this.clearCurrentUser();
        return { success: true };
    }

    // Get current user
    async getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    async isAuthenticated() {
        return this.currentUser !== null;
    }

    // Update user profile
    async updateProfile(updates) {
        try {
            if (!this.currentUser) {
                return { success: false, error: 'Not authenticated' };
            }

            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex === -1) {
                return { success: false, error: 'User not found' };
            }

            // Update user data
            this.users[userIndex] = { ...this.users[userIndex], ...updates };
            this.saveUsers();

            // Update current user session
            this.currentUser = { ...this.currentUser, ...updates };
            this.saveCurrentUser();

            return { success: true, data: this.currentUser };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: 'Profile update failed' };
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                return { success: false, error: 'Not authenticated' };
            }

            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex === -1) {
                return { success: false, error: 'User not found' };
            }

            // Verify current password
            if (this.users[userIndex].password !== currentPassword) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // Update password
            this.users[userIndex].password = newPassword;
            this.saveUsers();

            return { success: true };
        } catch (error) {
            console.error('Change password error:', error);
            return { success: false, error: 'Password change failed' };
        }
    }
}

// Create global instance
const authHandler = new AuthHandler();