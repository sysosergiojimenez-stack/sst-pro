import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './lib/trpc';
import { Sun, Moon, Building2, Users, Shield, AlertTriangle, Menu, X, ChevronLeft, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import AdminUsuarios from './components/AdminUsuarios';
import Empleados from './components/Empleados';
import Incidentes from './components/Incidentes';
import Proyectos from './components/Proyectos';
import ProyectoDashboard from './components/ProyectoDashboard';

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: '/trpc' })],
});

type View = 'proyectos' | 'empleados' | 'admin';

interface Proyecto {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
}

export default function App() {
  const { user, loading: authLoading, login, logout, canAccess } = useAuth();
  const [view, setView] = useState<View>('proyectos');
  const [selectedProyecto, setSelectedProyecto] = useState<Proyecto | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light';
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const handleSelectProyecto = (proyecto: Proyecto) => {
    setSelectedProyecto(proyecto);
  };

  const handleBackToProyectos = () => {
    setSelectedProyecto(null);
  };

  // Si no esta logueado, mostrar login
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  const navItems = [
    { id: 'proyectos' as View, icon: Building2, label: 'Proyectos', color: 'text-blue-400' },
    { id: 'empleados' as View, icon: Users, label: 'Empleados', color: 'text-emerald-400' },
    ...(canAccess('admin-usuarios') ? [{ id: 'admin' as View, icon: Shield, label: 'Usuarios', color: 'text-purple-400' }] : []),
  ];

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground flex">
          {/* Sidebar */}
          <aside 
            className={`fixed lg:relative z-40 h-screen bg-card/95 backdrop-blur-xl border-r border-border transition-all duration-500 ease-in-out flex flex-col ${
              sidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0 overflow-hidden'
            }`}
          >
            {/* Logo */}
            <div className="p-6 border-b border-border flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                <Building2 className="text-white" size={22} />
              </div>
              {sidebarOpen && (
                <div className="overflow-hidden fade-in">
                  <h1 className="font-bold text-sm tracking-tight">SST Pro</h1>
                  <p className="text-xs text-muted-foreground">Seguridad Industrial</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = view === item.id && !selectedProyecto;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id); setSelectedProyecto(null); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${
                      isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10' 
                        : 'hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon size={20} className={`flex-shrink-0 transition-colors ${isActive ? 'text-primary' : item.color}`} />
                    {sidebarOpen && (
                      <span className="text-sm font-medium fade-in">{item.label}</span>
                    )}
                    {isActive && sidebarOpen && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="p-4 border-t border-border space-y-2">
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                {sidebarOpen && <span className="text-sm font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
              </button>
            </div>
          </aside>

          {/* Mobile overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main content */}
          <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
            {/* Top bar */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden"
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden lg:block p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
                </button>
                
                <div className="flex items-center gap-3">
                  {selectedProyecto ? (
                    <>
                      <button 
                        onClick={handleBackToProyectos}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="h-6 w-px bg-border" />
                      <div className="flex items-center gap-2">
                        {selectedProyecto.logo ? (
                          <img src={selectedProyecto.logo} alt="" className="w-8 h-8 rounded-lg object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <Building2 size={16} className="text-white" />
                          </div>
                        )}
                        <div>
                          <h2 className="text-lg font-semibold">{selectedProyecto.denominacion}</h2>
                          {selectedProyecto.ubicacion && (
                            <p className="text-xs text-muted-foreground">{selectedProyecto.ubicacion}</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <h2 className="text-lg font-semibold">
                      {view === 'proyectos' && 'Proyectos'}
                      {view === 'empleados' && 'Todos los Empleados'}
                    </h2>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user.nombres} {user.apellidos}</p>
                  <p className="text-xs text-muted-foreground">{user.rol}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <UserCircle className="text-white" size={20} />
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400"
                  title="Cerrar Sesion"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 p-6 overflow-auto">
              <div className="slide-up">
                {selectedProyecto ? (
                  <ProyectoDashboard proyecto={selectedProyecto} user={user} />
                ) : (
                  <>
                    {view === 'proyectos' && <Proyectos onSelectProyecto={handleSelectProyecto} />}
                    {view === 'empleados' && <Empleados />}
                    {view === 'admin' && canAccess('admin-usuarios') && <AdminUsuarios />}
                  </>
                )}
              </div>
            </div>
          </main>
        </div>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
