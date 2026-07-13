import { router, publicProcedure } from '../trpc';
import { db } from '../lib/firebaseAdmin';
import { z } from 'zod';

export const inspeccionesRouter = router({
  list: publicProcedure
    .input(z.object({
      plantaId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }).optional().default({}))
    .query(async ({ input }) => {
      console.log('Consultando inspecciones...');
      try {
        let query = db.collection('inspecciones').orderBy('fecha', 'desc');
        if (input?.plantaId) {
          query = query.where('plantaId', '==', input.plantaId);
        }
        
        const snapshot = await query.limit(input?.limit || 20).get();
        console.log('Documentos encontrados:', snapshot.size);
        
        const result = snapshot.docs.map((d: { id: string; data(): any; }) => {
          const data = d.data();
          let fecha = new Date().toISOString();
          if (data.fecha && data.fecha.toDate) {
            fecha = data.fecha.toDate().toISOString();
          } else if (data.fecha instanceof Date) {
            fecha = data.fecha.toISOString();
          } else if (typeof data.fecha === 'string') {
            fecha = data.fecha;
          }
          
          return {
            id: d.id,
            tipo: data.tipo || '',
            areaNombre: data.areaNombre || '',
            inspectorNombre: data.inspectorNombre || '',
            fecha: fecha,
            estado: data.estado || '',
            resumen: data.resumen || { hallazgosCount: 0, hallazgosAbiertos: 0, riesgoMaximo: 'bajo', score: 100 },
          };
        });
        
        console.log('Resultado:', JSON.stringify(result, null, 2));
        return result;
      } catch (error) {
        console.error('Error en list:', error);
        throw error;
      }
    }),

  byId: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const doc = await db.collection('inspecciones').doc(input.id).get();
      if (!doc.exists) throw new Error('No encontrado');
      const data = doc.data();
      let fecha = new Date().toISOString();
      if (data?.fecha && data.fecha.toDate) {
        fecha = data.fecha.toDate().toISOString();
      } else if (data?.fecha instanceof Date) {
        fecha = data.fecha.toISOString();
      } else if (typeof data?.fecha === 'string') {
        fecha = data.fecha;
      }
      
      return {
        id: doc.id,
        ...data,
        fecha: fecha,
      };
    }),

  create: publicProcedure
    .input(z.object({
      tipo: z.enum(['general', 'extintores', 'epp', 'maquinaria', 'electricidad', 'quimicos']),
      areaId: z.string(),
      areaNombre: z.string(),
      plantaId: z.string(),
      hallazgos: z.array(z.object({
        descripcion: z.string(),
        categoria: z.string(),
        riesgo: z.enum(['bajo', 'medio', 'alto', 'critico']),
      })).max(50),
      observaciones: z.string().default(''),
    }))
    .mutation(async ({ input }) => {
      const ref = db.collection('inspecciones').doc();
      
      const riesgoMap = { bajo: 1, medio: 2, alto: 3, critico: 4 };
      const riesgoMax = Math.max(...input.hallazgos.map(h => riesgoMap[h.riesgo] || 0));
      const riesgoInverso = { 0: 'bajo', 1: 'bajo', 2: 'medio', 3: 'alto', 4: 'critico' };
      const score = Math.max(0, 100 - (input.hallazgos.length * 5) - (riesgoMax * 15));
      
      await ref.set({
        ...input,
        inspectorId: 'demo-user',
        inspectorNombre: 'Usuario Demo',
        fecha: new Date(),
        estado: 'pendiente',
        resumen: {
          hallazgosCount: input.hallazgos.length,
          hallazgosAbiertos: input.hallazgos.length,
          riesgoMaximo: riesgoInverso[riesgoMax as keyof typeof riesgoInverso] || 'bajo',
          score: score,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return { id: ref.id };
    }),
});
