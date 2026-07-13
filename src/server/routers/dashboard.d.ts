export declare const dashboardRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        user: null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    get: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            inspeccionesMes: any;
            inspeccionesPendientes: any;
            scorePromedio: number;
            hallazgosAbiertos: any;
            incidentesMes: number;
            incidentesGraves: number;
            diasSinAccidente: number;
            permisosPendientes: number;
            eppStockBajo: number;
            capacitacionesProgramadas: number;
            documentosPorVencer: number;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=dashboard.d.ts.map