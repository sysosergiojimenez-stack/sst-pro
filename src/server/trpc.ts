import { initTRPC } from '@trpc/server';
import { HonoRequest } from 'hono';

export const createContext = async ({ req }: { req: HonoRequest }) => {
  return { user: null };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
