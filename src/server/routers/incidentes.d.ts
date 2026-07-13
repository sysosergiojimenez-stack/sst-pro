export declare const incidentesRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        user: null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    list: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: import("../lib/googleSheets").Incidente[];
        meta: object;
    }>;
    create: import("@trpc/server").TRPCMutationProcedure<{
        input: {
            tipo: "casi_accidente" | "accidente_leve" | "accidente_grave" | "fatal";
            gravedad: "baja" | "media" | "alta" | "critica";
            fecha: string;
            reportadoPor: string;
            area: string;
            descripcion: string;
            lesionado: "si" | "no";
            estado?: "reportado" | "investigando" | "cerrado" | undefined;
            nombreLesionado?: string | undefined;
            diasPerdidos?: string | undefined;
            causaInmediata?: string | undefined;
            causaBasica?: string | undefined;
            accionCorrectiva?: string | undefined;
            evidenciaUrl?: string | undefined;
        };
        output: {
            id: string;
        };
        meta: object;
    }>;
}>>;
//# sourceMappingURL=incidentes.d.ts.map