import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './lib/trpc';
import { Sun, Moon, Building2, Shield, Menu, X, ChevronLeft, LogOut, UserCircle, HardHat, ChevronDown, WifiOff, Calculator } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import AdminUsuarios from './components/AdminUsuarios';
import Proyectos from './components/Proyectos';
import ProyectoDashboard from './components/ProyectoDashboard';

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: '/trpc' })],
});

type View = 'proyectos' | 'admin' | 'calculadora';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light';
    if (saved) setTheme(saved);
  }, []);

  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={login} />;
  }

  const navItems = [
    { id: 'proyectos' as View, icon: Building2, label: 'Proyectos', desc: 'Gestión de obras SST', color: 'text-blue-400', gradient: 'from-blue-500 to-blue-600' },
    ...(canAccess('admin-usuarios') ? [{ id: 'admin' as View, icon: Shield, label: 'Usuarios', desc: 'Admin y permisos', color: 'text-purple-400', gradient: 'from-purple-500 to-purple-600' }] : []),
    { id: 'calculadora' as View, icon: Calculator, label: 'Calculadora ZLP800', desc: 'Contrapesos y estabilidad', color: 'text-cyan-400', gradient: 'from-cyan-500 to-blue-500' },
  ];

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen bg-background text-foreground flex">
          {!online && (
            <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-xs font-medium py-2 px-4 flex items-center justify-center gap-2 shadow-lg">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>Sin conexion a internet - los cambios no se guardaran hasta reconectar</span>
            </div>
          )}
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm animate-fade-in"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside 
            className={`fixed lg:sticky top-0 left-0 z-50 h-screen bg-card/95 backdrop-blur-xl border-r border-border transition-all duration-300 ease-out flex flex-col shadow-xl shadow-black/5
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              ${sidebarExpanded ? 'w-72' : 'lg:w-20 w-0'}
            `}
          >
            {/* Logo */}
            <div className="h-16 border-b border-border flex items-center gap-3 px-4 flex-shrink-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                <HardHat className="text-white" size={20} />
              </div>
              {sidebarExpanded && (
                <div className="overflow-hidden animate-fade-in">
                  <h1 className="font-bold text-sm tracking-tight leading-tight">SST Pro</h1>
                  <p className="text-[10px] text-muted-foreground leading-tight">Seguridad Industrial</p>
                </div>
              )}
              <button 
                onClick={() => { setSidebarOpen(false); setSidebarExpanded(!sidebarExpanded); }}
                className="ml-auto p-1.5 rounded-lg hover:bg-secondary transition-colors hidden lg:block"
              >
                <ChevronLeft size={16} className={`transition-transform duration-300 ${!sidebarExpanded ? 'rotate-180' : ''}`} />
              </button>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="ml-auto p-1.5 rounded-lg hover:bg-secondary transition-colors lg:hidden"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto hide-scrollbar-mobile">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = view === item.id && !selectedProyecto;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setView(item.id); setSelectedProyecto(null); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                      ${isActive 
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/10' 
                        : 'hover:bg-secondary/80 text-muted-foreground hover:text-foreground border border-transparent'
                      }
                      ${sidebarExpanded ? '' : 'lg:justify-center lg:px-2'}
                    `}
                    title={!sidebarExpanded ? item.label : undefined}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${isActive ? `bg-gradient-to-br ${item.gradient} shadow-lg` : 'bg-secondary group-hover:bg-secondary/60'}`}>
                      <Icon size={18} className={isActive ? 'text-white' : item.color} />
                    </div>
                    {sidebarExpanded && (
                      <div className="flex-1 text-left animate-fade-in">
                        <div className="text-sm font-medium leading-tight">{item.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight">{item.desc}</div>
                      </div>
                    )}
                    {isActive && sidebarExpanded && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Bottom actions */}
            <div className="p-3 border-t border-border space-y-1 flex-shrink-0">
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/80 transition-all duration-200 text-muted-foreground hover:text-foreground ${sidebarExpanded ? '' : 'lg:justify-center lg:px-2'}`}
                title={!sidebarExpanded ? 'Cambiar tema' : undefined}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                {sidebarExpanded && <span className="text-sm font-medium animate-fade-in">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>}
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 flex flex-col min-h-screen overflow-hidden w-full">
            {/* Top bar */}
            <header className="sticky top-0 z-30 glass border-b border-border px-4 lg:px-6 h-16 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden flex-shrink-0"
                >
                  <Menu size={20} />
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  {selectedProyecto ? (
                    <>
                      <button 
                        onClick={handleBackToProyectos}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <div className="h-6 w-px bg-border flex-shrink-0" />
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedProyecto.logo ? (
                          <img src={selectedProyecto.logo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                            <Building2 size={16} className="text-white" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="text-sm lg:text-base font-semibold truncate">{selectedProyecto.denominacion}</h2>
                          {selectedProyecto.ubicacion && (
                            <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{selectedProyecto.ubicacion}</p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm lg:text-lg font-semibold">{view === 'proyectos' ? 'Proyectos' : view === 'admin' ? 'Usuarios' : 'Calculadora ZLP800'}</h2>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
                <div className="text-right hidden md:block">
                  <p className="text-sm font-medium leading-tight">{user.nombres} {user.apellidos}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{user.rol}</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
                  <UserCircle className="text-white" size={18} />
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-red-400 flex-shrink-0"
                  title="Cerrar Sesión"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </header>

            {/* Content */}
            <div className="flex-1 p-4 lg:p-6 overflow-auto">
              <div className="animate-fade-in-up max-w-full">
                {selectedProyecto ? (
                  <ProyectoDashboard proyecto={selectedProyecto} />
                ) : (
                  <>
                    {view === 'proyectos' && <Proyectos onSelectProyecto={handleSelectProyecto} />}
                    {view === 'admin' && canAccess('admin-usuarios') && <AdminUsuarios />}
                    {view === 'calculadora' && (
                      <iframe
                        src="/calculadora-contrapesos-zlp800.html"
                        title="Calculadora de Contrapesos y Estabilidad — ZLP800"
                        className="w-full rounded-xl border border-border bg-white"
                        style={{ height: 'calc(100vh - 160px)' }}
                      />
                    )}
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
