import { offlineStorage } from './offlineStorage';
import CryptoJS from 'crypto-js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'teacher' | 'admin' | 'parent' | 'principal';
  permissions: Permission[];
  schoolId: string;
  classIds: string[];
  profilePicture?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface Permission {
  resource: 'observations' | 'students' | 'reports' | 'settings' | 'analytics' | 'communications';
  actions: ('create' | 'read' | 'update' | 'delete')[];
  scope: 'own' | 'class' | 'school' | 'system';
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: number;
  issuedAt: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthConfig {
  apiBaseUrl: string;
  tokenStorageKey: string;
  sessionDuration: number; // in milliseconds
  refreshThreshold: number; // refresh token when this many ms left
  maxLoginAttempts: number;
  lockoutDuration: number; // in milliseconds
}

class AuthManager {
  private config: AuthConfig;
  private currentSession: AuthSession | null = null;
  private refreshTimer: number | null = null;
  private eventListeners: Map<string, Function[]> = new Map();
  private isInitialized = false;

  constructor(config?: Partial<AuthConfig>) {
    this.config = {
      apiBaseUrl: '/api/auth',
      tokenStorageKey: 'teacher_app_session',
      sessionDuration: 8 * 60 * 60 * 1000, // 8 hours
      refreshThreshold: 15 * 60 * 1000, // 15 minutes
      maxLoginAttempts: 5,
      lockoutDuration: 30 * 60 * 1000, // 30 minutes
      ...config,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await offlineStorage.initialize();
    
    // Try to restore session
    await this.restoreSession();
    
    // Set up automatic token refresh
    this.setupTokenRefresh();
    
    this.isInitialized = true;
    console.log('Auth manager initialized');
  }

  // Event Management
  addEventListener(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  removeEventListener(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Authentication Methods
  async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
    try {
      // Check for lockout
      const lockoutStatus = await this.checkLockout(credentials.email);
      if (lockoutStatus.locked) {
        return { 
          success: false, 
          error: `Account locked. Try again in ${Math.ceil(lockoutStatus.timeLeft / 60000)} minutes.` 
        };
      }

      // Mock API call - replace with actual authentication
      const response = await this.mockLogin(credentials);
      
      if (response.success && response.session) {
        this.currentSession = response.session;
        
        // Store session
        await this.storeSession(response.session, credentials.rememberMe);
        
        // Clear login attempts
        await this.clearLoginAttempts(credentials.email);
        
        // Set up token refresh
        this.setupTokenRefresh();
        
        this.emitEvent('login', this.currentSession.user);
        
        return { success: true };
      } else {
        // Track failed login attempt
        await this.trackLoginAttempt(credentials.email);
        
        return { 
          success: false, 
          error: response.error || 'Invalid credentials' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }

  async logout(): Promise<void> {
    try {
      // Notify server about logout (optional)
      if (this.currentSession) {
        try {
          await fetch(`${this.config.apiBaseUrl}/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.currentSession.token}`,
            },
          });
        } catch (error) {
          console.warn('Server logout failed:', error);
        }
      }

      // Clear local session
      await this.clearSession();
      
      this.emitEvent('logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  async refreshToken(): Promise<boolean> {
    if (!this.currentSession?.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.currentSession.refreshToken,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        this.currentSession.token = data.token;
        this.currentSession.expiresAt = Date.now() + this.config.sessionDuration;
        
        await this.storeSession(this.currentSession);
        
        this.emitEvent('token_refreshed', this.currentSession.user);
        
        return true;
      } else {
        // Refresh failed, logout user
        await this.logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  // Session Management
  private async storeSession(session: AuthSession, rememberMe = false): Promise<void> {
    const encryptedSession = this.encryptSession(session);
    
    if (rememberMe) {
      localStorage.setItem(this.config.tokenStorageKey, encryptedSession);
    } else {
      sessionStorage.setItem(this.config.tokenStorageKey, encryptedSession);
    }

    // Also store in IndexedDB for offline access
    await offlineStorage.setSetting('currentSession', session);
  }

  private async restoreSession(): Promise<void> {
    try {
      // Try sessionStorage first, then localStorage
      let encryptedSession = sessionStorage.getItem(this.config.tokenStorageKey) ||
                           localStorage.getItem(this.config.tokenStorageKey);

      if (!encryptedSession) {
        // Try IndexedDB for offline scenarios
        const storedSession = await offlineStorage.getSetting('currentSession');
        if (storedSession) {
          encryptedSession = this.encryptSession(storedSession);
        }
      }

      if (encryptedSession) {
        const session = this.decryptSession(encryptedSession);
        
        // Check if session is still valid
        if (session && session.expiresAt > Date.now()) {
          this.currentSession = session;
          this.setupTokenRefresh();
          this.emitEvent('session_restored', session.user);
        } else {
          // Session expired, clear it
          await this.clearSession();
        }
      }
    } catch (error) {
      console.error('Session restoration error:', error);
      await this.clearSession();
    }
  }

  private async clearSession(): Promise<void> {
    this.currentSession = null;
    
    // Clear timers
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Clear storage
    sessionStorage.removeItem(this.config.tokenStorageKey);
    localStorage.removeItem(this.config.tokenStorageKey);
    await offlineStorage.setSetting('currentSession', null);
  }

  private encryptSession(session: AuthSession): string {
    return CryptoJS.AES.encrypt(JSON.stringify(session), 'session_key').toString();
  }

  private decryptSession(encryptedSession: string): AuthSession | null {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedSession, 'session_key');
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Session decryption error:', error);
      return null;
    }
  }

  // Token Management
  private setupTokenRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    if (this.currentSession) {
      const timeUntilRefresh = this.currentSession.expiresAt - Date.now() - this.config.refreshThreshold;
      
      if (timeUntilRefresh > 0) {
        this.refreshTimer = window.setTimeout(() => {
          this.refreshToken();
        }, timeUntilRefresh);
      } else {
        // Token needs immediate refresh
        this.refreshToken();
      }
    }
  }

  // Login Attempts & Lockout
  private async checkLockout(email: string): Promise<{ locked: boolean; timeLeft: number }> {
    const lockoutKey = `lockout_${email}`;
    const lockoutData = await offlineStorage.getSetting(lockoutKey);
    
    if (lockoutData && lockoutData.lockedUntil > Date.now()) {
      return {
        locked: true,
        timeLeft: lockoutData.lockedUntil - Date.now(),
      };
    }
    
    return { locked: false, timeLeft: 0 };
  }

  private async trackLoginAttempt(email: string): Promise<void> {
    const attemptsKey = `login_attempts_${email}`;
    const attempts = await offlineStorage.getSetting(attemptsKey) || { count: 0, firstAttempt: Date.now() };
    
    attempts.count++;
    attempts.lastAttempt = Date.now();
    
    if (attempts.count >= this.config.maxLoginAttempts) {
      // Lock account
      const lockoutKey = `lockout_${email}`;
      await offlineStorage.setSetting(lockoutKey, {
        lockedUntil: Date.now() + this.config.lockoutDuration,
      });
      
      // Clear attempts after lockout
      await offlineStorage.setSetting(attemptsKey, null);
    } else {
      await offlineStorage.setSetting(attemptsKey, attempts);
    }
  }

  private async clearLoginAttempts(email: string): Promise<void> {
    const attemptsKey = `login_attempts_${email}`;
    await offlineStorage.setSetting(attemptsKey, null);
    
    const lockoutKey = `lockout_${email}`;
    await offlineStorage.setSetting(lockoutKey, null);
  }

  // Permission System
  hasPermission(
    resource: Permission['resource'], 
    action: Permission['actions'][0], 
    scope?: Permission['scope']
  ): boolean {
    if (!this.currentSession?.user) return false;
    
    const user = this.currentSession.user;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check specific permissions
    return user.permissions.some(permission => {
      const hasResource = permission.resource === resource;
      const hasAction = permission.actions.includes(action);
      const hasScope = !scope || permission.scope === scope || permission.scope === 'system';
      
      return hasResource && hasAction && hasScope;
    });
  }

  canAccessStudent(studentId: string): boolean {
    if (!this.currentSession?.user) return false;
    
    const user = this.currentSession.user;
    
    // Admin can access all students
    if (user.role === 'admin') return true;
    
    // Teachers can access students in their classes
    if (user.role === 'teacher') {
      // This would typically check if the student belongs to the teacher's classes
      // For now, we'll assume teachers can access students in their assigned classes
      return this.hasPermission('students', 'read', 'class');
    }
    
    // Parents can only access their own children
    if (user.role === 'parent') {
      // This would check parent-child relationships
      return this.hasPermission('students', 'read', 'own');
    }
    
    return false;
  }

  // Mock Authentication (replace with real implementation)
  private async mockLogin(credentials: LoginCredentials): Promise<{
    success: boolean;
    session?: AuthSession;
    error?: string;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation
    const mockUsers: Record<string, User> = {
      'teacher@school.edu': {
        id: 'teacher_001',
        email: 'teacher@school.edu',
        name: 'Ms. Johnson',
        role: 'teacher',
        permissions: [
          {
            resource: 'observations',
            actions: ['create', 'read', 'update', 'delete'],
            scope: 'class',
          },
          {
            resource: 'students',
            actions: ['read', 'update'],
            scope: 'class',
          },
          {
            resource: 'reports',
            actions: ['create', 'read'],
            scope: 'class',
          },
          {
            resource: 'communications',
            actions: ['create', 'read'],
            scope: 'class',
          },
        ],
        schoolId: 'school_001',
        classIds: ['class_001', 'class_002'],
        createdAt: new Date('2024-01-01').toISOString(),
        isActive: true,
      },
      'admin@school.edu': {
        id: 'admin_001',
        email: 'admin@school.edu',
        name: 'Dr. Smith',
        role: 'admin',
        permissions: [
          {
            resource: 'observations',
            actions: ['create', 'read', 'update', 'delete'],
            scope: 'system',
          },
          {
            resource: 'students',
            actions: ['create', 'read', 'update', 'delete'],
            scope: 'system',
          },
          {
            resource: 'reports',
            actions: ['create', 'read', 'update', 'delete'],
            scope: 'system',
          },
          {
            resource: 'settings',
            actions: ['create', 'read', 'update', 'delete'],
            scope: 'system',
          },
          {
            resource: 'analytics',
            actions: ['read'],
            scope: 'system',
          },
          {
            resource: 'communications',
            actions: ['create', 'read', 'update', 'delete'],
            scope: 'system',
          },
        ],
        schoolId: 'school_001',
        classIds: [],
        createdAt: new Date('2024-01-01').toISOString(),
        isActive: true,
      },
    };

    const user = mockUsers[credentials.email];
    
    if (!user || credentials.password !== 'password123') {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.isActive) {
      return { success: false, error: 'Account is deactivated' };
    }

    const now = Date.now();
    const session: AuthSession = {
      user: {
        ...user,
        lastLogin: new Date().toISOString(),
      },
      token: this.generateMockToken(),
      refreshToken: this.generateMockToken(),
      expiresAt: now + this.config.sessionDuration,
      issuedAt: now,
    };

    return { success: true, session };
  }

  private generateMockToken(): string {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  // Getters
  getCurrentUser(): User | null {
    return this.currentSession?.user || null;
  }

  getSession(): AuthSession | null {
    return this.currentSession;
  }

  isAuthenticated(): boolean {
    return !!(this.currentSession && this.currentSession.expiresAt > Date.now());
  }

  isTokenExpired(): boolean {
    return !this.currentSession || this.currentSession.expiresAt <= Date.now();
  }

  // Password Management
  async changePassword(currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.currentSession) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.currentSession.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Password change failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Password reset request failed' };
      }
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  }

  // Cleanup
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.eventListeners.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const authManager = new AuthManager();

// Utility functions
export async function initializeAuth(config?: Partial<AuthConfig>): Promise<void> {
  if (config) {
    Object.assign(authManager['config'], config);
  }
  await authManager.initialize();
}

// React hooks (if using React)
export function useAuth() {
  const [user, setUser] = React.useState(authManager.getCurrentUser());
  const [isAuthenticated, setIsAuthenticated] = React.useState(authManager.isAuthenticated());

  React.useEffect(() => {
    const handleLogin = (userData: User) => {
      setUser(userData);
      setIsAuthenticated(true);
    };

    const handleLogout = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    const handleSessionRestored = (userData: User) => {
      setUser(userData);
      setIsAuthenticated(true);
    };

    authManager.addEventListener('login', handleLogin);
    authManager.addEventListener('logout', handleLogout);
    authManager.addEventListener('session_restored', handleSessionRestored);

    return () => {
      authManager.removeEventListener('login', handleLogin);
      authManager.removeEventListener('logout', handleLogout);
      authManager.removeEventListener('session_restored', handleSessionRestored);
    };
  }, []);

  return {
    user,
    isAuthenticated,
    login: authManager.login.bind(authManager),
    logout: authManager.logout.bind(authManager),
    hasPermission: authManager.hasPermission.bind(authManager),
    canAccessStudent: authManager.canAccessStudent.bind(authManager),
  };
}

// Type guard for React import
declare const React: any;