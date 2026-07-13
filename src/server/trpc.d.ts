import { HonoRequest } from 'hono';
export declare const createContext: ({ req }: {
    req: HonoRequest;
}) => Promise<{
    user: null;
}>;
export type Context = Awaited<ReturnType<typeof createContext>>;
export declare const router: import("@trpc/server").TRPCRouterBuilder<{
    ctx: {
        user: null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}>;
export declare const publicProcedure: import("@trpc/server").TRPCProcedureBuilder<{
    user: null;
}, object, object, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, import("@trpc/server").TRPCUnsetMarker, false>;
//# sourceMappingURL=trpc.d.ts.map