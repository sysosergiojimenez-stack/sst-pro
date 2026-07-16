import sys

with open('src/client/components/ProyectoDashboard.tsx', 'r', encoding='utf-8') as f:
    contenido = f.read()

cambios = []

# 1. Imports
cambios.append((
"""import { useState, useEffect } from 'react';
import { Users, ArrowLeft, HardHat, ClipboardCheck, AlertTriangle, Building2, ChevronRight, CheckCircle2, ShieldCheck, Clock, Package } from 'lucide-react';
import EmpleadosPorProyecto from './EmpleadosPorProyecto';
import Incidentes from './Incidentes';
import EPP from './EPP';""",
"""import { useState, useEffect } from 'react';
import { Users, ArrowLeft, HardHat, ClipboardCheck, AlertTriangle, Building2, ChevronRight, CheckCircle2, ShieldCheck, Clock, Package, GraduationCap } from 'lucide-react';
import EmpleadosPorProyecto from './EmpleadosPorProyecto';
import Incidentes from './Incidentes';
import EPP from './EPP';
import CapacitacionesCharlas from './CapacitacionesCharlas';"""
))

# 2. Tipo Modulo
cambios.append((
    "type Modulo = 'overview' | 'empleados' | 'incidentes' | 'epp' | 'inspecciones';",
    "type Modulo = 'overview' | 'empleados' | 'incidentes' | 'epp' | 'inspecciones' | 'capacitaciones';"
))

# 3. Interface de stats
cambios.append((
"""interface StatsProyecto {
  empleados: number;
  empleadosActivos: number;
  empleadosInactivos: number;
  incidentesAbiertos: number;
  incidentesCerrados: number;
  eppItems: number;
  eppBajoStock: number;
}""",
"""interface StatsProyecto {
  empleados: number;
  empleadosActivos: number;
  empleadosInactivos: number;
  incidentesAbiertos: number;
  incidentesCerrados: number;
  eppItems: number;
  eppBajoStock: number;
  capacitacionesPendientes: number;
  capacitacionesRealizadas: number;
}"""
))

# 4. Estado inicial de stats
cambios.append((
"""  const [stats, setStats] = useState<StatsProyecto>({
    empleados: 0, empleadosActivos: 0, empleadosInactivos: 0,
    incidentesAbiertos: 0, incidentesCerrados: 0,
    eppItems: 0, eppBajoStock: 0
  });""",
"""  const [stats, setStats] = useState<StatsProyecto>({
    empleados: 0, empleadosActivos: 0, empleadosInactivos: 0,
    incidentesAbiertos: 0, incidentesCerrados: 0,
    eppItems: 0, eppBajoStock: 0,
    capacitacionesPendientes: 0, capacitacionesRealizadas: 0
  });"""
))

# 5. Fetch de stats: agregar capacitaciones
cambios.append((
"""        // Calcular stock por producto
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
        });""",
"""        // Calcular stock por producto
        let bajoStock = 0;
        for (const prod of productos) {
          const entradasProd = entradas.filter((e: any) => e.codigo === prod.codigo).reduce((sum: number, e: any) => sum + (parseInt(e.cantidad) || 0), 0);
          const salidasProd = salidas.filter((s: any) => s.refItem === prod.codigo).reduce((sum: number, s: any) => sum + (parseInt(s.cantidad) || 0), 0);
          const stock = entradasProd - salidasProd;
          if (stock < 5) bajoStock++;
        }

        // Fetch capacitaciones
        const capRes = await fetch(`/api/capacitaciones?proyecto=${encodeURIComponent(proyecto.denominacion)}`);
        const capData = capRes.ok ? await capRes.json() : { data: [] };
        const capacitaciones = capData.data || [];
        const capPendientes = capacitaciones.filter((c: any) => (c.estado || '').toLowerCase() !== 'realizada').length;
        const capRealizadas = capacitaciones.length - capPendientes;

        setStats({
          empleados: empleados.length,
          empleadosActivos: activos,
          empleadosInactivos: inactivos,
          incidentesAbiertos: abiertos,
          incidentesCerrados: cerrados,
          eppItems: productos.length,
          eppBajoStock: bajoStock,
          capacitacionesPendientes: capPendientes,
          capacitacionesRealizadas: capRealizadas
        });"""
))

# 6. Bloque de renderizado del modulo (antes de 'inspecciones')
cambios.append((
    "  if (moduloActivo === 'inspecciones') {",
    """  if (moduloActivo === 'capacitaciones') {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setModuloActivo('overview')}
          className="mb-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-xl hover:bg-secondary text-sm"
        >
          <ArrowLeft size={16} /> Volver al Proyecto
        </button>
        <CapacitacionesCharlas proyecto={proyecto.denominacion} />
      </div>
    );
  }

  if (moduloActivo === 'inspecciones') {"""
))

# 7. Tarjeta nueva en el overview
cambios.append((
"""          </div>
        </div>

        {/* Sidebar info */}""",
"""            {/* Capacitacion y Charlas de Seguridad */}
            <button 
              onClick={() => setModuloActivo('capacitaciones')}
              className="bg-card border border-border rounded-xl p-5 text-left hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <GraduationCap size={24} className="text-white" />
                </div>
                <ChevronRight size={18} className="text-muted-foreground group-hover:text-teal-400 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-base">Capacitacion y Charlas</h4>
              <p className="text-sm text-muted-foreground mt-1">Cronograma de charlas de seguridad y evidencias</p>
              <div className="flex items-center gap-3 mt-3">
                {loading ? (
                  <span className="badge badge-muted">Cargando...</span>
                ) : (
                  <>
                    <span className="badge badge-info"><Clock size={10} />{stats.capacitacionesPendientes} pendientes</span>
                    {stats.capacitacionesRealizadas > 0 && <span className="badge badge-success"><CheckCircle2 size={10} />{stats.capacitacionesRealizadas} realizadas</span>}
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Sidebar info */}"""
))

ok = True
for i, (viejo, nuevo) in enumerate(cambios, 1):
    if viejo not in contenido:
        print(f"ERROR en cambio #{i}: no encontre el bloque exacto. No se guardo nada.")
        ok = False
        break
    contenido = contenido.replace(viejo, nuevo, 1)

if ok:
    with open('src/client/components/ProyectoDashboard.tsx', 'w', encoding='utf-8') as f:
        f.write(contenido)
    print("Listo! Los 7 cambios se aplicaron correctamente.")
else:
    sys.exit(1)
