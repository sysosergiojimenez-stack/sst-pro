export declare const SPREADSHEET_ID: string;
export declare const sheets: import("googleapis").sheets_v4.Sheets;
export declare function subirPDFAGCS(base64PDF: string, nombreArchivo: string, mimeType?: string): Promise<string>;
export interface DatosExtraidosPDF {
    nroDocumento: string;
    nombres: string;
    apellidos: string;
    fechaNacimiento: string;
    lugarNacimiento: string;
    sexo: string;
    estadoCivil: string;
    direccion: string;
    telefono: string;
    email: string;
    tipoSangre: string;
    cargo: string;
    empresa: string;
    obra: string;
    contactoEmergencia: string;
    telefonoEmergencia: string;
    [key: string]: string;
}
export declare function extraerDatosConGemini(base64PDF: string, mimeType?: string): Promise<DatosExtraidosPDF>;
export interface Empleado {
    rowIndex: number;
    nroDocumento: string;
    nombres: string;
    apellidos: string;
    cargo: string;
    obra: string;
    empresa: string;
    telefonoCelular: string;
    email: string;
    scanDocumentos?: string;
}
export declare function getEmpleados(): Promise<Empleado[]>;
export declare function getEmpleadoByDocumento(nroDocumento: string): Promise<Empleado | null>;
export declare function getEmpleadoByRowIndex(rowIndex: number): Promise<Empleado | null>;
export declare function updateEmpleadoDocumentos(rowIndex: number, scanDocumentos: string): Promise<void>;
export declare function appendEmpleado(empleado: Omit<Empleado, 'rowIndex'>): Promise<number>;
export declare function updateEmpleado(rowIndex: number, empleado: Partial<Omit<Empleado, 'rowIndex'>>): Promise<void>;
export declare function deleteEmpleado(rowIndex: number): Promise<void>;
export interface Obra {
    nombre: string;
    ubicacion?: string;
    estado?: string;
}
export declare function getObras(): Promise<Obra[]>;
export interface Empresa {
    nombre: string;
    nit?: string;
    contacto?: string;
}
export declare function getEmpresas(): Promise<Empresa[]>;
export interface Cargo {
    nombre: string;
    nivel?: string;
    descripcion?: string;
}
export declare function getCargos(): Promise<Cargo[]>;
export interface Estadisticas {
    totalEmpleados: number;
    empleadosPorObra: Record<string, number>;
    empleadosPorEmpresa: Record<string, number>;
    empleadosSinDocumentos: number;
}
export declare function getEstadisticas(): Promise<Estadisticas>;
export interface FiltroEmpleado {
    obra?: string;
    empresa?: string;
    cargo?: string;
    tieneDocumentos?: boolean;
}
export declare function buscarEmpleados(filtro: FiltroEmpleado): Promise<Empleado[]>;
export declare function createEmpleado(empleado: Omit<Empleado, 'rowIndex'>): Promise<number>;
export declare function actualizarEmpleado(nroDocumento: string, empleado: Partial<Omit<Empleado, 'rowIndex'>>): Promise<void>;
export declare function eliminarEmpleado(nroDocumento: string): Promise<void>;
export declare function getEmpleadosByObra(obra: string): Promise<Empleado[]>;
export interface Incidente {
    id: string;
    fecha: string;
    reportadoPor: string;
    tipo: 'casi_accidente' | 'accidente_leve' | 'accidente_grave' | 'fatal';
    gravedad: 'baja' | 'media' | 'alta' | 'critica';
    area: string;
    descripcion: string;
    lesionado: 'si' | 'no';
    nombreLesionado?: string;
    diasPerdidos?: string;
    causaInmediata?: string;
    causaBasica?: string;
    accionCorrectiva?: string;
    estado: 'reportado' | 'investigando' | 'cerrado';
    evidenciaUrl?: string;
}
export declare function getIncidentes(): Promise<Incidente[]>;
export declare function createIncidente(incidente: Omit<Incidente, 'id'>): Promise<string>;
export interface Proyecto {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    denominacion: string;
    ubicacion: string;
    logo: string;
}
export declare function getProyectos(): Promise<Proyecto[]>;
export declare function getProyectoById(idRegistro: string): Promise<Proyecto | null>;
export declare function appendProyecto(proyecto: Omit<Proyecto, 'rowIndex'>): Promise<number>;
export declare function updateProyecto(rowIndex: number, proyecto: Partial<Omit<Proyecto, 'rowIndex'>>): Promise<void>;
export declare function deleteProyecto(rowIndex: number): Promise<void>;
//# sourceMappingURL=googleSheets.d.ts.map