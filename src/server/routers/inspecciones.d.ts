export declare const inspeccionesRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        user: null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            plantaId?: string | undefined;
            limit?: number | undefined;
        } | undefined;
        output: any;
        meta: object;
    }>;
    byId: import("@trpc/server").TRPCQueryProcedure<{
        input: {
            id: string;
        };
        output: any;
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            tipo: "general" | "extintores" | "epp" | "maquinaria" | "electricidad" | "quimicos";
            areaNombre: string;
            hallazgos: {
                descripcion: string;
                categoria: string;
                riesgo: "bajo" | "medio" | "alto" | "critico";
            }[];
            plantaId: string;
            areaId: string;
            observaciones?: string | undefined;
        };
        output: {
            id: any;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=inspecciones.d.ts.map