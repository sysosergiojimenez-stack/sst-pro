export interface Incidente {
    rowIndex: number;
    idRegistro: string;
    fechaHoraRegistro: string;
    userEmail: string;
    proyecto: string;
    fechaIncidente: string;
    horaIncidente: string;
    lugar: string;
    tipo: string;
    clasificacion: string;
    descripcion: string;
    personasInvolucradas: string;
    causasInmediatas: string;
    causasRaiz: string;
    accionesCorrectivas: string;
    responsableAcciones: string;
    fechaCompromiso: string;
    estado: string;
    evidencias: string;
    investigador: string;
    fechaCierre: string;
    diasPerdidos: string;
    costoEstimado: string;
}
export declare function getAllIncidentes(): Promise<Incidente[]>;
export declare function getIncidentesByProyecto(proyecto: string): Promise<Incidente[]>;
export declare function getIncidenteById(idRegistro: string): Promise<Incidente | null>;
export declare function getIncidenteByRowIndex(rowIndex: number): Promise<Incidente | null>;
export declare function appendIncidente(incidente: Omit<Incidente, 'rowIndex'>): Promise<void>;
export declare function updateIncidente(rowIndex: number, incidente: Partial<Omit<Incidente, 'rowIndex'>>): Promise<void>;
export declare function deleteIncidente(rowIndex: number): Promise<void>;
//# sourceMappingURL=googleSheets_incidentes.d.ts.map