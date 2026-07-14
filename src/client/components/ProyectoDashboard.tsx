import { useState, useEffect } from 'react';
import { Users, ArrowLeft, HardHat, ClipboardCheck, AlertTriangle, Building2, ChevronRight, CheckCircle2, ShieldCheck, Clock, Package } from 'lucide-react';
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

interface StatsProyecto {
  empleados: number;
  empleadosActivos: number;
  empleadosInactivos: number;
  incidentesAbiertos: number;
  incidentesCerrados: number;
  eppItems: number;
  eppBajoStock: number;
}

export default function ProyectoDashboard({ proyecto }: ProyectoDashboardProps) {
  const [moduloActivo, setModuloActivo] = useState<Modulo>('overview');
  const [stats, setStats] = useState<StatsProyecto>({
    empleados: 0, empleadosActivos: 0, empleadosInactivos: 0,
    incidentesAbiertos: 0, incidentesCerrados: 0,
    eppItems: 0, eppBajoStock: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch empleados
        const empRes = await fetch(`/api/empleados?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
        const empData = empRes.ok ? await empRes.json() : { data: [] };
        const empleados = empData.data || [];
        const activos = empleados.filter((e: any) => (e.estado || '').toLowerCase() === 'activo').length;
        const inactivos = empleados.length - activos;

        // Fetch incidentes
        const incRes = await fetch(`/api/incidentes?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
        const incData = incRes.ok ? await incRes.json() : { data: [] };
        const incidentes = incData.data || [];
        const abiertos = incidentes.filter((i: any) => (i.estado || '').toLowerCase() === 'abierto').length;
        const cerrados = incidentes.length - abiertos;

        // Fetch EPP productos
        const eppRes = await fetch(`/api/epp/productos?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
        const eppData = eppRes.ok ? await eppRes.json() : { data: [] };
        const productos = eppData.data || [];

        // Fetch EPP entradas para calcular stock
        const entRes = await fetch(`/api/epp/entradas?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
        const entData = entRes.ok ? await entRes.json() : { data: [] };
        const entradas = entData.data || [];

        // Fetch EPP salidas para calcular stock
        const salRes = await fetch(`/api/epp/salidas?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
        const salData = salRes.ok ? await salRes.json() : { data: [] };
        const salidas = salData.data || [];

        // Calcular stock por producto
        let bajoStock = 0;
        for (const prod of productos) {
          const entradasProd = entradas.filter((e: any) => e.codigo === prod.codigo).reduce((sum: number, e: any) => sum + (parseInt(e.cantidad) || 0), 0);
          const salidasProd = salidas.filter((s: any) => s.refItem === prod.codigo).reduce((sum: number, s: any) => sum + (parseInt(s.cantidad) || 0), 0);
          const stock = entradasProd - salidasProd;
          if (stock < 5) bajoStock++;
        }

        setStats({
          empleados: empleados.length,
          empleadosActivos: activos,
          empleadosInactivos: inactivos,
          incidentesAbiertos: abiertos,
          incidentesCerrados: cerrados,
          eppItems: productos.length,
          eppBajoStock: bajoStock
        });
      } catch (e) {
        console.error('Error fetching stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [proyecto.denominacion]);

  // Si hay un módulo activo (no overview), renderizar ese componente
  if (moduloActivo === 'empleados') {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setModuloActivo('overview')}
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
          onClick={() => setModuloActivo('overview')}
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
          onClick={() => setModuloActivo('overview')}
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
          onClick={() => setModuloActivo('overview')}
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

      {/* Módulos del Proyecto con datos reales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
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
                {loading ? (
                  <span className="badge badge-muted">Cargando...</span>
                ) : (
                  <>
                    <span className="badge badge-success"><CheckCircle2 size={10} />{stats.empleadosActivos} activos</span>
                    {stats.empleadosInactivos > 0 && <span className="badge badge-muted">{stats.empleadosInactivos} inactivos</span>}
                    {stats.empleados === 0 && <span className="badge badge-muted">Sin empleados</span>}
                  </>
                )}
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
                {loading ? (
                  <span className="badge badge-muted">Cargando...</span>
                ) : (
                  <>
                    <span className="badge badge-success"><CheckCircle2 size={10} />{stats.incidentesAbiertos} abiertos</span>
                    {stats.incidentesCerrados > 0 && <span className="badge badge-muted">{stats.incidentesCerrados} cerrados</span>}
                    {(stats.incidentesAbiertos + stats.incidentesCerrados) === 0 && <span className="badge badge-muted">Sin incidentes</span>}
                  </>
                )}
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
                {loading ? (
                  <span className="badge badge-muted">Cargando...</span>
                ) : (
                  <>
                    <span className="badge badge-info"><Package size={10} />{stats.eppItems} items</span>
                    {stats.eppBajoStock > 0 ? (
                      <span className="badge badge-warning"><AlertTriangle size={10} />{stats.eppBajoStock} bajo stock</span>
                    ) : (
                      <span className="badge badge-success">Stock OK</span>
                    )}
                  </>
                )}
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
                {loading ? (
                  <p className="text-xs text-muted-foreground">Cargando...</p>
                ) : (
                  <>
                    {stats.eppBajoStock > 0 ? (
                      <div className="flex items-center gap-2 text-xs text-amber-400">
                        <AlertTriangle size={12} />
                        <span>{stats.eppBajoStock} EPP con stock bajo</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-400">
                        <CheckCircle2 size={12} />
                        <span>Stock EPP OK</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-blue-400">
                      <CheckCircle2 size={12} />
                      <span>{stats.incidentesAbiertos} incidentes abiertos</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
