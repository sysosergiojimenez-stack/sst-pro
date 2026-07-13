import { useState } from 'react';
import { Users, ArrowLeft, HardHat, ClipboardCheck, AlertTriangle, TrendingUp } from 'lucide-react';
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

type Modulo = 'overview' | 'empleados' | 'incidentes' | 'epp';

export default function ProyectoDashboard({ proyecto }: ProyectoDashboardProps) {
  const [moduloActivo, setModuloActivo] = useState<Modulo>('overview');

  if (moduloActivo === 'empleados') {
    return (
      <div>
        <button
          onClick={() => setModuloActivo('overview')}
          className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-secondary"
        >
          <ArrowLeft size={18} /> Volver al Dashboard
        </button>
        <EmpleadosPorProyecto proyecto={proyecto} />
      </div>
    );
  }

  if (moduloActivo === 'incidentes') {
    return (
      <div>
        <button
          onClick={() => setModuloActivo('overview')}
          className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-secondary"
        >
          <ArrowLeft size={18} /> Volver al Dashboard
        </button>
        <Incidentes proyecto={proyecto.denominacion} />
      </div>
    );
  }

  if (moduloActivo === 'epp') {
    return (
      <div>
        <button
          onClick={() => setModuloActivo('overview')}
          className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-secondary"
        >
          <ArrowLeft size={18} /> Volver al Dashboard
        </button>
        <EPP proyecto={proyecto.idRegistro} />
      </div>
    );
  }

  const stats = [
    { label: 'Empleados', value: '12', icon: Users, color: 'from-blue-500 to-cyan-500', trend: '+2 este mes' },
    { label: 'Incidentes', value: '0', icon: AlertTriangle, color: 'from-emerald-500 to-teal-500', trend: 'Sin incidentes' },
    { label: 'Inspecciones', value: '5', icon: ClipboardCheck, color: 'from-amber-500 to-orange-500', trend: '2 pendientes' },
    { label: 'Cumplimiento', value: '98%', icon: TrendingUp, color: 'from-violet-500 to-purple-500', trend: '+5% vs mes anterior' },
  ];

  const modulos = [
    {
      id: 'empleados' as Modulo,
      title: 'Empleados',
      description: 'Gestion del personal asignado al proyecto',
      icon: Users,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/15',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      active: true,
    },
    {
      id: 'incidentes' as Modulo,
      title: 'Incidentes',
      description: 'Registro y seguimiento de incidentes',
      icon: AlertTriangle,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/15',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      active: true,
    },
    {
      id: 'inspecciones' as Modulo,
      title: 'Inspecciones',
      description: 'Inspecciones de seguridad y calidad',
      icon: ClipboardCheck,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 opacity-60',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      active: false,
    },
    {
      id: 'epp' as Modulo,
      title: 'EPP',
      description: 'Control de Equipos de Proteccion Personal',
      icon: HardHat,
      color: 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/15',
      iconBg: 'bg-gradient-to-br from-violet-500 to-purple-500',
      active: true,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="glass-card p-5 card-hover">
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={24} className="text-white" />
                </div>
                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">{stat.trend}</span>
              </div>
              <p className="text-3xl font-bold mt-4">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Modulos */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <HardHat size={22} className="text-primary" />
          Modulos del Proyecto
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {modulos.map((modulo) => {
            const Icon = modulo.icon;
            return (
              <button
                key={modulo.id}
                onClick={() => modulo.active && setModuloActivo(modulo.id)}
                disabled={!modulo.active}
                className={`glass-card p-6 text-left transition-all duration-300 border-2 ${modulo.color} ${
                  modulo.active ? 'card-hover cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl ${modulo.iconBg} flex items-center justify-center shadow-lg mb-4`}>
                  <Icon size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-semibold">{modulo.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">{modulo.description}</p>
                {!modulo.active && (
                  <span className="inline-block mt-4 text-xs bg-secondary px-3 py-1 rounded-full text-muted-foreground">
                    Proximamente
                  </span>
                )}
                {modulo.active && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-primary font-medium">
                    <span>Acceder</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
