import { router, publicProcedure } from '../trpc';

export const testRouter = router({
  hello: publicProcedure.query(() => {
    return { message: 'Backend funcionando', timestamp: new Date().toISOString() };
  }),
});
