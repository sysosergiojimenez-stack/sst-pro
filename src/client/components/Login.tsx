import { useState } from 'react';
import { Building2, LogIn, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (user: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesion');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
            <Building2 size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SST Pro</h1>
          <p className="text-muted-foreground mt-1">Seguridad Industrial</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <h2 className="text-lg font-semibold mb-6 text-center">Iniciar Sesion</h2>

          {error && (
            <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Correo electronico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm input-glow focus:outline-none focus:border-primary/50"
                placeholder="tu@correo.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contrasena</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-xl px-4 py-3 text-sm input-glow focus:outline-none focus:border-primary/50 pr-10"
                  placeholder="********"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient text-white px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              <LogIn size={18} />
              {loading ? 'Verificando...' : 'Iniciar Sesion'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          SST Pro - Sistema de Seguridad Industrial
        </p>
      </div>
    </div>
  );
}
