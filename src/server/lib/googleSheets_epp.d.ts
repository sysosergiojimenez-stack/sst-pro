export interface Producto {
    rowIndex: number;
    codigo: string;
    proyecto: string;
    nombre: string;
    proveedor: string;
    clasificacion: string;
    stockMinimo: string;
}
export declare function getAllProductos(): Promise<Producto[]>;
export declare function getProductosByProyecto(proyecto: string): Promise<Producto[]>;
export declare function getProductoByCodigo(codigo: string): Promise<Producto | null>;
export declare function appendProducto(producto: Omit<Producto, 'rowIndex'>): Promise<void>;
export interface Remision {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    proveedor: string;
    numeracion: string;
    fecha: string;
    detalle: string;
    scaneado: string;
}
export declare function getAllRemisiones(): Promise<Remision[]>;
export declare function getRemisionesByProyecto(proyecto: string): Promise<Remision[]>;
export declare function getRemisionByNumeracion(numeracion: string): Promise<Remision | null>;
export declare function getRemisionById(idRegistro: string): Promise<Remision | null>;
export declare function appendRemision(remision: Omit<Remision, 'rowIndex'>): Promise<void>;
export declare function updateProducto(rowIndex: number, producto: Partial<Omit<Producto, 'rowIndex'>>): Promise<void>;
export declare function updateRemision(rowIndex: number, remision: Partial<Omit<Remision, 'rowIndex'>>): Promise<void>;
export declare function deleteRemision(rowIndex: number): Promise<void>;
export declare function deleteEntrada(rowIndex: number): Promise<void>;
export interface NotaSalida {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    obra: string;
    orden: string;
    fecha: string;
    quienRetira: string;
    observaciones: string;
}
export declare function getAllNotasSalida(): Promise<NotaSalida[]>;
export declare function getNotasSalidaByProyecto(obra: string): Promise<NotaSalida[]>;
export declare function getNotaSalidaById(idRegistro: string): Promise<NotaSalida | null>;
export declare function appendNotaSalida(nota: Omit<NotaSalida, 'rowIndex'>): Promise<void>;
export declare function updateNotaSalida(rowIndex: number, nota: Partial<Omit<NotaSalida, 'rowIndex'>>): Promise<void>;
export declare function deleteNotaSalida(rowIndex: number): Promise<void>;
export interface Salida {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    refNotaSalida: string;
    refItem: string;
    cantidad: string;
    trabajadorRetira: string;
}
export declare function getAllSalidas(): Promise<Salida[]>;
export declare function getSalidasByProyecto(obra: string): Promise<Salida[]>;
export declare function getSalidasByNota(refNotaSalida: string): Promise<Salida[]>;
export declare function getSalidasByTrabajador(trabajador: string): Promise<Salida[]>;
export declare function appendSalida(salida: Omit<Salida, 'rowIndex'>): Promise<void>;
export declare function appendMultipleSalidas(salidas: Omit<Salida, 'rowIndex'>[]): Promise<void>;
export declare function deleteSalida(rowIndex: number): Promise<void>;
export interface Entrada {
    rowIndex: number;
    idRegistro: string;
    dateTime: string;
    userEmail: string;
    refRemision: string;
    codigo: string;
    item: string;
    cantidad: string;
    proyecto: string;
}
export declare function getAllEntradas(): Promise<Entrada[]>;
export declare function getEntradasByProyecto(proyecto: string): Promise<Entrada[]>;
export declare function getEntradasByRemision(refRemision: string): Promise<Entrada[]>;
export declare function getEntradasByRemisionId(idRegistro: string): Promise<Entrada[]>;
export declare function appendEntrada(entrada: Omit<Entrada, 'rowIndex'>): Promise<void>;
export declare function appendMultipleEntradas(entradas: Omit<Entrada, 'rowIndex'>[]): Promise<void>;
//# sourceMappingURL=googleSheets_epp.d.ts.map