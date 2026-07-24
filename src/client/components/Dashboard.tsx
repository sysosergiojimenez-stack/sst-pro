import React from 'react';
import { trpc } from '../lib/trpc';
import { AlertTriangle, CheckCircle, ClipboardCheck, Shield, Users, FileWarning, HardHat, BookOpen } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, subtitle }: any) => (
  <div className="bg-card border border-border rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-muted-foreground text-sm">{title}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className={`p-3 sm:p-2 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const { data, isLoading } = trpc.dashboard.get.useQuery();

  if (isLoading) return <div className="text-center py-20">Cargando...</div>;

  const stats = data || {
    inspeccionesMes: 0,
    inspeccionesPendientes: 0,
    scorePromedio: 0,
    hallazgosAbiertos: 0,
    incidentesMes: 0,
    incidentesGraves: 0,
    diasSinAccidente: 0,
    permisosPendientes: 0,
    eppStockBajo: 0,
    capacitacionesProgramadas: 0,
    documentosPorVencer: 0,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Dashboard de Seguridad</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Inspecciones del Mes" 
          value={stats.inspeccionesMes} 
          icon={ClipboardCheck} 
          color="bg-blue-500/20 text-blue-400"
          subtitle={`${stats.inspeccionesPendientes} pendientes`}
        />
        <StatCard 
          title="Score Promedio" 
          value={`${stats.scorePromedio}%`} 
          icon={CheckCircle} 
          color="bg-green-500/20 text-green-400"
          subtitle="Calidad de inspecciones"
        />
        <StatCard 
          title="Hallazgos Abiertos" 
          value={stats.hallazgosAbiertos} 
          icon={AlertTriangle} 
          color="bg-yellow-500/20 text-yellow-400"
          subtitle="Requieren acción"
        />
        <StatCard 
          title="Incidentes del Mes" 
          value={stats.incidentesMes} 
          icon={FileWarning} 
          color={stats.incidentesGraves > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}
          subtitle={stats.incidentesGraves > 0 ? `${stats.incidentesGraves} graves` : 'Sin incidentes graves'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Permisos Pendientes" 
          value={stats.permisosPendientes} 
          icon={Shield} 
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard 
          title="EPP Stock Bajo" 
          value={stats.eppStockBajo} 
          icon={HardHat} 
          color={stats.eppStockBajo > 0 ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"}
        />
        <StatCard 
          title="Documentos por Vencer" 
          value={stats.documentosPorVencer} 
          icon={BookOpen} 
          color={stats.documentosPorVencer > 0 ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}
        />
      </div>
    </div>
  );
}
