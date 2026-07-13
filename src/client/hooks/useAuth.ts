import { useState, useEffect } from 'react';

export interface AuthUser {
  idRegistro: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: 'Desarrollador' | 'Admin' | 'User';
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        logout();
      }
    } catch {
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } finally {
      setLoading(false);
    }
  };

  const login = (userData: AuthUser) => {
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.reload();
  };

  const canAccess = (feature: string): boolean => {
    if (!user) return false;
    if (user.rol === 'Desarrollador') return true;
    if (user.rol === 'Admin') return feature !== 'admin-usuarios';
    return feature === 'read';
  };

  return { user, loading, login, logout, canAccess };
}
