import React from 'react';
import { trpc } from '../lib/trpc';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const RiesgoBadge = ({ nivel }: { nivel: string }) => {
  const colors: Record<string, string> = {
    bajo: 'bg-green-500/20 text-green-400',
    medio: 'bg-yellow-500/20 text-yellow-400',
    alto: 'bg-orange-500/20 text-orange-400',
    critico: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[nivel] || colors.bajo}`}>
      {nivel.toUpperCase()}
    </span>
  );
};

const EstadoBadge = ({ estado }: { estado: string }) => {
  const colors: Record<string, string> = {
    pendiente: 'bg-yellow-500/20 text-yellow-400',
    completada: 'bg-blue-500/20 text-blue-400',
    cerrada: 'bg-green-500/20 text-green-400',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[estado] || colors.pendiente}`}>
      {estado}
    </span>
  );
};

export default function Inspecciones() {
  const { data, isLoading } = trpc.inspecciones.list.useQuery({ limit: 50 });

  if (isLoading) return <div className="text-center py-20">Cargando inspecciones...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inspecciones</h2>
      
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Tipo</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Área</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Inspector</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Fecha</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Riesgo Máx</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Score</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data?.map((inspeccion) => (
              <tr key={inspeccion.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 text-sm capitalize">{inspeccion.tipo}</td>
                <td className="px-4 py-3 text-sm">{inspeccion.areaNombre}</td>
                <td className="px-4 py-3 text-sm">{inspeccion.inspectorNombre}</td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(inspeccion.fecha).toLocaleDateString('es-ES')}
                </td>
                <td className="px-4 py-3">
                  <RiesgoBadge nivel={inspeccion.resumen?.riesgoMaximo || 'bajo'} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${(inspeccion.resumen?.score || 0) >= 80 ? 'bg-green-500' : (inspeccion.resumen?.score || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${inspeccion.resumen?.score || 0}%` }}
                      />
                    </div>
                    <span className="text-sm">{inspeccion.resumen?.score || 0}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <EstadoBadge estado={inspeccion.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data || data.length === 0) && (
          <div className="text-center py-12 text-muted-foreground">
            No hay inspecciones registradas. Crea una nueva.
          </div>
        )}
      </div>
    </div>
  );
}
