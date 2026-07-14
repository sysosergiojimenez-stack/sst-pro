import { useState } from 'react';
import { Users, ArrowLeft, HardHat, ClipboardCheck, AlertTriangle, TrendingUp, ShieldCheck, Package, ChevronRight, Activity, CheckCircle2, XCircle, Clock, Building2 } from 'lucide-react';
import EmpleadosPorProyecto from './EmpleadosPorProyecto';
import Incidentes from './Incidentes';
import EPP from './EPP';

interface Proyecto {
  rowIndex: number;
  idRegistro: string;
  fechaHora: string;
  userEmail: string;
  denominacion: string;
  ubicacion: string;
  logo: string;
}

interface ProyectoDashboardProps {
  proyecto: Proyecto;
}

type Modulo = 'overview' | 'empleados' | 'incidentes' | 'epp' | 'inspecciones';

export default function ProyectoDashboard({ proyecto }: ProyectoDashboardProps) {
  const [moduloActivo, setModuloActivo] = useState<Modulo>('overview');
  const [activeTab, setActiveTab] = useState<Modulo>('overview');

  // Datos demo - en producción vendrían de la API
  const stats = [
    { id: 'empleados' as Modulo, label: 'Empleados', value: 12, icon: Users, color: 'text-blue-400', gradient: 'from-blue-500 to-blue-600', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
    { id: 'incidentes' as Modulo, label: 'Incidentes', value: 0, icon: AlertTriangle, color: 'text-amber-400', gradient: 'from-amber-500 to-amber-600', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
    { id: 'inspecciones' as Modulo, label: 'Inspecciones', value: 5, icon: ClipboardCheck, color: 'text-emerald-400', gradient: 'from-emerald-500 to-emerald-600', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    { id: 'epp' as Modulo, label: 'EPP Items', value: 48, icon: HardHat, color: 'text-violet-400', gradient: 'from-violet-500 to-violet-600', border: 'border-violet-500/20', bg: 'bg-violet-500/10' },
  ];

  const tabs = [
    { id: 'overview' as Modulo, label: 'Resumen', icon: Activity },
    { id: 'empleados' as Modulo, label: 'Empleados', icon: Users },
    { id: 'incidentes' as Modulo, label: 'Incidentes', icon: AlertTriangle },
    { id: 'inspecciones' as Modulo, label: 'Inspecciones', icon: ClipboardCheck },
    { id: 'epp' as Modulo, label: 'EPP', icon: HardHat },
  ];

  // Si hay un módulo activo (no overview), renderizar ese componente
  if (moduloActivo === 'empleados') {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => { setModuloActivo('overview'); setActiveTab('overview'); }}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-secondary text-sm"
        >
          <ArrowLeft size={16} /> Volver al Proyecto
        </button>
        <EmpleadosPorProyecto proyecto={proyecto} />
      </div>
    );
  }

  if (moduloActivo === 'incidentes') {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => { setModuloActivo('overview'); setActiveTab('overview'); }}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-secondary text-sm"
        >
          <ArrowLeft size={16} /> Volver al Proyecto
        </button>
        <Incidentes proyecto={proyecto.denominacion} />
      </div>
    );
  }

  if (moduloActivo === 'epp') {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => { setModuloActivo('overview'); setActiveTab('overview'); }}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-secondary text-sm"
        >
          <ArrowLeft size={16} /> Volver al Proyecto
        </button>
        <EPP proyecto={proyecto.denominacion} />
      </div>
    );
  }

  if (moduloActivo === 'inspecciones') {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => { setModuloActivo('overview'); setActiveTab('overview'); }}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-secondary text-sm"
        >
          <ArrowLeft size={16} /> Volver al Proyecto
        </button>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <ClipboardCheck size={48} className="mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Inspecciones</h3>
          <p className="text-sm">Módulo en desarrollo para este proyecto</p>
        </div>
      </div>
    );
  }

  // OVERVIEW
  return (
    <div className="space-y-6 animate-fade-in-up max-w-7xl mx-auto">
      {/* Header del proyecto */}
      <div className="bg-card border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
          <Building2 size={32} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{proyecto.denominacion}</h1>
          <p className="text-sm text-muted-foreground">{proyecto.ubicacion || 'Sin ubicación registrada'}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="badge badge-success"><CheckCircle2 size={10} />Activo</span>
            <span className="badge badge-info"><ShieldCheck size={10} />SG-SST</span>
            <span className="badge badge-muted">ID: {proyecto.idRegistro}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards - Estilo Empleados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <button 
              key={i} 
              onClick={() => { setActiveTab(stat.id); setModuloActivo(stat.id); }}
              className={`stat-card ${activeTab === stat.id ? 'stat-card-active' : 'stat-card-inactive'} text-left`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-md`}>
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            </button>
          );
        })}
      </div>

      {/* Tabs de navegación */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id !== 'overview') setModuloActivo(tab.id); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary border border-b-0 border-primary/20' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.id === 'incidentes' && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Contenido del overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Módulos rápidos */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity size={20} className="text-primary" />
            Módulos del Proyecto
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Empleados */}
            <button 
              onClick={() => setModuloActivo('empleados')}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <Users size={24} className="text-white" />
                </div>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-base">Empleados</h4>
              <p className="text-sm text-muted-foreground mt-1">Gestión del personal asignado al proyecto</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="badge badge-success"><CheckCircle2 size={10} />12 activos</span>
                <span className="badge badge-muted">2 inactivos</span>
              </div>
            </button>

            {/* Incidentes */}
            <button 
              onClick={() => setModuloActivo('incidentes')}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <AlertTriangle size={24} className="text-white" />
                </div>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-base">Incidentes</h4>
              <p className="text-sm text-muted-foreground mt-1">Registro y seguimiento de incidentes</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="badge badge-success"><CheckCircle2 size={10} />0 abiertos</span>
                <span className="badge badge-muted">5 cerrados</span>
              </div>
            </button>

            {/* Inspecciones */}
            <button 
              onClick={() => setModuloActivo('inspecciones')}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 group opacity-70"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <ClipboardCheck size={24} className="text-white" />
                </div>
                <span className="text-[10px] bg-muted px-2 py-1 rounded-full text-muted-foreground">Próximamente</span>
              </div>
              <h4 className="font-semibold text-base">Inspecciones</h4>
              <p className="text-sm text-muted-foreground mt-1">Inspecciones de seguridad y calidad</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="badge badge-warning"><Clock size={10} />En desarrollo</span>
              </div>
            </button>

            {/* EPP */}
            <button 
              onClick={() => setModuloActivo('epp')}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <HardHat size={24} className="text-white" />
                </div>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-base">EPP</h4>
              <p className="text-sm text-muted-foreground mt-1">Control de Equipos de Protección Personal</p>
              <div className="flex items-center gap-3 mt-3">
                <span className="badge badge-info"><Package size={10} />48 items</span>
                <span className="badge badge-success">98% OK</span>
              </div>
            </button>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Información</h3>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Estado del Proyecto</p>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium">Activo</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cumplimiento SST</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: '98%' }} />
                </div>
                <span className="text-sm font-bold text-emerald-400">98%</span>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Última Inspección</p>
              <p className="text-sm">Hace 3 días</p>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Próxima Capacitación</p>
              <p className="text-sm">Inducción SST - 15 de agosto</p>
            </div>

            <div className="h-px bg-border" />

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Alertas</p>
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle size={12} />
                  <span>2 EPP con stock bajo</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <TrendingUp size={12} />
                  <span>0 incidentes este mes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
