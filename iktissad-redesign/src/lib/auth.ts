// Simple authentication utility
// NOTE: In production, use a proper auth solution like NextAuth.js or Stack Auth
// with hashed passwords stored in a database

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'author';
  avatar?: string;
}

// Admin users - In production, store in database with hashed passwords
const ADMIN_USERS = [
  {
    id: '1',
    email: 'm.madani@iktissad.com',
    // Password hash for: 12103008@Mm#!
    // Using simple base64 for demo - use bcrypt in production!
    passwordHash: 'MTIxMDMwMDhATW0jIQ==',
    name: 'محمد مدني',
    role: 'admin' as const,
    avatar: null,
  },
];

// Simple hash function (for demo only - use bcrypt in production)
const simpleHash = (str: string): string => {
  return btoa(str);
};

export const validateCredentials = (email: string, password: string): User | null => {
  const user = ADMIN_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return null;
  }

  const passwordHash = simpleHash(password);

  if (passwordHash !== user.passwordHash) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || undefined,
  };
};

export const AUTH_COOKIE_NAME = 'iktissad_admin_session';

export const setAuthSession = (user: User): void => {
  if (typeof window !== 'undefined') {
    const session = {
      user,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    };
    localStorage.setItem(AUTH_COOKIE_NAME, JSON.stringify(session));
  }
};

export const getAuthSession = (): User | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const sessionStr = localStorage.getItem(AUTH_COOKIE_NAME);
    if (!sessionStr) {
      return null;
    }

    const session = JSON.parse(sessionStr);

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(AUTH_COOKIE_NAME);
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
};

export const clearAuthSession = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(AUTH_COOKIE_NAME);
  }
};

export const isAuthenticated = (): boolean => {
  return getAuthSession() !== null;
};
