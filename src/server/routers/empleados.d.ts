export declare const empleadosRouter: import("@trpc/server").TRPCBuiltRouter<{
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
//# sourceMappingURL=empleados.d.ts.map