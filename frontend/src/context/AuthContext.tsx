'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, Store } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  currentStore: Store | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  pinLogin: (pin: string, storeId?: string) => Promise<void>;
  logout: () => void;
  setCurrentStore: (store: Store) => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [currentStore, setCurrentStoreState] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check localStorage on mount
    try {
      const savedToken = localStorage.getItem('ricoz_pos_token');
      const savedUser = localStorage.getItem('ricoz_pos_user');
      const savedStore = localStorage.getItem('ricoz_pos_store');

      if (savedToken && savedUser) {
        setToken(savedToken);
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);

        if (savedStore) {
          setCurrentStoreState(JSON.parse(savedStore));
        } else if (parsedUser.store) {
          setCurrentStoreState({
            _id: parsedUser.store.id,
            name: parsedUser.store.name,
            code: parsedUser.store.code,
            address: '',
            phone: '',
            taxRate: parsedUser.store.taxRate || 5.0,
            currency: parsedUser.store.currency || 'USD',
            active: true,
          });
        }
      }
    } catch (e) {
      console.error('Failed to restore session from localStorage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res: any = await api.post('/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('ricoz_pos_token', receivedToken);
    localStorage.setItem('ricoz_pos_user', JSON.stringify(receivedUser));

    if (receivedUser.store) {
      const storeObj: Store = {
        _id: receivedUser.store.id,
        name: receivedUser.store.name,
        code: receivedUser.store.code,
        address: '',
        phone: '',
        taxRate: receivedUser.store.taxRate || 5.0,
        currency: receivedUser.store.currency || 'USD',
        active: true,
      };
      setCurrentStoreState(storeObj);
      localStorage.setItem('ricoz_pos_store', JSON.stringify(storeObj));
    }
  };

  const pinLogin = async (pin: string, storeId?: string) => {
    const res: any = await api.post('/auth/pin-login', { pin, storeId });
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('ricoz_pos_token', receivedToken);
    localStorage.setItem('ricoz_pos_user', JSON.stringify(receivedUser));

    if (receivedUser.store) {
      const storeObj: Store = {
        _id: receivedUser.store.id,
        name: receivedUser.store.name,
        code: receivedUser.store.code,
        address: '',
        phone: '',
        taxRate: receivedUser.store.taxRate || 5.0,
        currency: receivedUser.store.currency || 'USD',
        active: true,
      };
      setCurrentStoreState(storeObj);
      localStorage.setItem('ricoz_pos_store', JSON.stringify(storeObj));
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setCurrentStoreState(null);
    localStorage.removeItem('ricoz_pos_token');
    localStorage.removeItem('ricoz_pos_user');
    localStorage.removeItem('ricoz_pos_store');
    window.location.href = '/login';
  };

  const setCurrentStore = (store: Store) => {
    setCurrentStoreState(store);
    localStorage.setItem('ricoz_pos_store', JSON.stringify(store));
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        currentStore,
        isLoading,
        login,
        pinLogin,
        logout,
        setCurrentStore,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
