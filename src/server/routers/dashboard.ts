import { router, publicProcedure } from '../trpc';
import { db } from '../lib/firebaseAdmin';

export const dashboardRouter = router({
  get: publicProcedure.query(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Obtener todas las colecciones
    const inspeccionesSnap = await db.collection('inspecciones').get();
    const inspecciones = inspeccionesSnap.docs.map((d: any) => d.data());
    
    const scores = inspecciones.map((i: any) => i.resumen?.score || 0);
    const scorePromedio = scores.length ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 100;
    
    return {
      inspeccionesMes: inspecciones.filter((i: any) => i.fecha >= startOfMonth).length,
      inspeccionesPendientes: inspecciones.filter((i: any) => i.estado === 'pendiente').length,
      scorePromedio,
      hallazgosAbiertos: inspecciones.reduce((acc: number, i: any) => acc + (i.resumen?.hallazgosAbiertos || 0), 0),
      incidentesMes: 0,
      incidentesGraves: 0,
      diasSinAccidente: 0,
      permisosPendientes: 0,
      eppStockBajo: 0,
      capacitacionesProgramadas: 0,
      documentosPorVencer: 0,
    };
  }),
});
