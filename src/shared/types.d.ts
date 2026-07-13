export type RolNivel = 2 | 3 | 4 | 5;
export interface Usuario {
    uid: string;
    email: string;
    nombre: string;
    cargo: string;
    rolNivel: RolNivel;
    plantaId: string;
    areaId: string;
    activo: boolean;
}
export interface Planta {
    id: string;
    nombre: string;
    ubicacion: string;
    areas: {
        id: string;
        nombre: string;
        responsableId: string;
    }[];
}
export type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico';
export type EstadoHallazgo = 'abierto' | 'en_progreso' | 'cerrado';
export type TipoInspeccion = 'general' | 'extintores' | 'epp' | 'maquinaria' | 'electricidad' | 'quimicos';
export interface Hallazgo {
    id: string;
    descripcion: string;
    categoria: string;
    riesgo: NivelRiesgo;
    estado: EstadoHallazgo;
    responsableId: string;
    responsableNombre: string;
    fechaCierre: string | null;
    evidenciaUrls: string[];
}
export interface Inspeccion {
    id: string;
    tipo: TipoInspeccion;
    areaId: string;
    areaNombre: string;
    plantaId: string;
    inspectorId: string;
    inspectorNombre: string;
    fecha: string;
    estado: string;
    hallazgos: Hallazgo[];
    resumen: {
        hallazgosCount: number;
        hallazgosAbiertos: number;
        riesgoMaximo: NivelRiesgo;
        score: number;
    };
}
export type TipoIncidente = 'casi_accidente' | 'accidente_leve' | 'accidente_grave' | 'fatal';
export type EstadoIncidente = 'reportado' | 'investigando' | 'acciones' | 'cerrado';
export interface Incidente {
    id: string;
    tipo: TipoIncidente;
    gravedad: number;
    areaNombre: string;
    descripcion: string;
    estado: EstadoIncidente;
    fecha: string;
}
export type TipoPermiso = 'caliente' | 'espacio_confinado' | 'altura' | 'excavacion' | 'electricidad' | 'general';
export interface PermisoTrabajo {
    id: string;
    tipo: TipoPermiso;
    areaNombre: string;
    solicitanteNombre: string;
    estado: string;
    fechaSolicitud: string;
}
export type TipoEPP = 'casco' | 'guantes' | 'lentes' | 'arnes' | 'botas' | 'respirador' | 'chaleco' | 'protector_auditivo' | 'overol' | 'otro';
export interface EPP {
    id: string;
    codigo: string;
    tipo: TipoEPP;
    descripcion: string;
    stock: number;
    stockMinimo: number;
    resumen: {
        asignacionesActivas: number;
        stockBajo: boolean;
    };
}
export interface Capacitacion {
    id: string;
    titulo: string;
    instructor: string;
    fecha: string;
    estado: string;
    resumen: {
        inscritos: number;
        asistentes: number;
        aprobados: number;
    };
}
export type CategoriaDocumento = 'sds' | 'pos' | 'reglamento' | 'procedimiento' | 'legal' | 'certificado' | 'manual';
export interface Documento {
    id: string;
    titulo: string;
    categoria: CategoriaDocumento;
    estado: string;
    fechaVencimiento: string | null;
}
export interface DashboardData {
    inspeccionesMes: number;
    inspeccionesPendientes: number;
    scorePromedio: number;
    hallazgosAbiertos: number;
    incidentesMes: number;
    incidentesGraves: number;
    diasSinAccidente: number;
    permisosPendientes: number;
    eppStockBajo: number;
    capacitacionesProgramadas: number;
    documentosPorVencer: number;
}
//# sourceMappingURL=types.d.ts.map