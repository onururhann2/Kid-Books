import { User, UserTier } from '../types';

const USER_STORAGE_KEY = 'kid_books_ai_user';
const DAILY_FREE_LIMIT = 1;

export const authService = {
  // Get current user or null
  getCurrentUser(): User | null {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    if (!stored) return null;

    const user: User = JSON.parse(stored);
    
    // Check if day has rolled over to reset limits
    const today = new Date().toISOString().split('T')[0];
    const lastDate = user.lastGenerationDate.split('T')[0];

    if (today !== lastDate && user.tier === 'FREE') {
      user.dailyGenerationsLeft = DAILY_FREE_LIMIT;
      user.lastGenerationDate = new Date().toISOString();
      this.saveUser(user);
    }

    return user;
  },

  // Mock Login/Register
  login(userData: { username: string, email?: string, provider?: 'google' | 'apple' | 'microsoft' | 'guest' }): User {
    // In a real app, this would verify tokens. 
    // Here we just update/create the user record in local storage.
    
    // Check if we already have this user (simple mock check)
    const existing = localStorage.getItem(USER_STORAGE_KEY);
    let userToSave: User;

    if (existing) {
        const parsed = JSON.parse(existing);
        // Update info if logging in again
        userToSave = {
            ...parsed,
            username: userData.username,
            email: userData.email || parsed.email,
            provider: userData.provider || parsed.provider
        };
    } else {
        userToSave = {
            id: Date.now().toString(),
            username: userData.username,
            email: userData.email,
            provider: userData.provider || 'guest',
            tier: 'FREE',
            dailyGenerationsLeft: DAILY_FREE_LIMIT,
            lastGenerationDate: new Date().toISOString()
        };
    }
    
    this.saveUser(userToSave);
    return userToSave;
  },

  logout() {
    localStorage.removeItem(USER_STORAGE_KEY);
  },

  upgradeToPremium(): User | null {
    const user = this.getCurrentUser();
    if (!user) return null;

    user.tier = 'PREMIUM';
    user.dailyGenerationsLeft = 9999; // Unlimited
    this.saveUser(user);
    return user;
  },

  decrementCredits(): User | null {
    const user = this.getCurrentUser();
    if (!user) return null;

    // Premium users don't consume credits effectively
    if (user.tier === 'FREE') {
      user.dailyGenerationsLeft = Math.max(0, user.dailyGenerationsLeft - 1);
    }
    
    // Update activity date
    user.lastGenerationDate = new Date().toISOString();
    
    this.saveUser(user);
    return user;
  },

  saveUser(user: User) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }
};