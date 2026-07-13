import { router, publicProcedure } from '../trpc';
import { getIncidentes, createIncidente } from '../lib/googleSheets';
import { z } from 'zod';

export const incidentesRouter = router({
  list: publicProcedure
    .query(async () => {
      console.log('📋 Fetching incidentes from Google Sheets...');
      const incidentes = await getIncidentes();
      console.log(`✅ Found ${incidentes.length} incidentes`);
      return incidentes;
    }),

  create: publicProcedure
    .input(z.object({
      fecha: z.string(),
      reportadoPor: z.string(),
      tipo: z.enum(['casi_accidente', 'accidente_leve', 'accidente_grave', 'fatal']),
      gravedad: z.enum(['baja', 'media', 'alta', 'critica']),
      area: z.string(),
      descripcion: z.string().min(1),
      lesionado: z.enum(['si', 'no']),
      nombreLesionado: z.string().optional(),
      diasPerdidos: z.string().optional(),
      causaInmediata: z.string().optional(),
      causaBasica: z.string().optional(),
      accionCorrectiva: z.string().optional(),
      estado: z.enum(['reportado', 'investigando', 'cerrado']).default('reportado'),
      evidenciaUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('📝 Creating new incidente...');
      const id = await createIncidente(input);
      console.log(`✅ Incidente created: ${id}`);
      return { id };
    }),
});
