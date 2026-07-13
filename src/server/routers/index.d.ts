export declare const appRouter: import("@trpc/server").TRPCBuiltRouter<{
    ctx: {
        user: null;
    };
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    empleados: import("@trpc/server").TRPCBuiltRouter<{
        ctx: {
            user: null;
        };
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        list: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("../lib/googleSheets").Empleado[];
            meta: object;
        }>;
        byObra: import("@trpc/server").TRPCQueryProcedure<{
            input: void;
            output: import("../lib/googleSheets").Empleado[];
            meta: object;
        }>;
        create: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: {
                nroDocumento: any;
                nombres: any;
                apellidos: any;
                cargo: any;
                obra: any;
                empresa: any;
                telefonoCelular: any;
                email: any;
                id: number;
                rowIndex: number;
            };
            meta: object;
        }>;
        extraerConGemini: import("@trpc/server").TRPCMutationProcedure<{
            input: void;
            output: import("../lib/googleSheets").DatosExtraidosPDF;
            meta: object;
        }>;
    }>>;
    incidentes: import("@trpc/server").TRPCBuiltRouter<{
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
    test: import("@trpc/server").TRPCBuiltRouter<{
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
}>>;
export type AppRouter = typeof appRouter;
//# sourceMappingURL=index.d.ts.map