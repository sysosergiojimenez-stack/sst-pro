import { router } from '../trpc';
import { empleadosRouter } from './empleados';
import { incidentesRouter } from './incidentes';
import { testRouter } from './test';

export const appRouter = router({
  empleados: empleadosRouter,
  incidentes: incidentesRouter,
  test: testRouter,
});

export type AppRouter = typeof appRouter;
