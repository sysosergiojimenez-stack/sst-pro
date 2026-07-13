export declare const testRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        user: null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    hello: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            message: string;
            timestamp: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=test.d.ts.map