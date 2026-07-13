export interface Usuario {
    rowIndex: number;
    idRegistro: string;
    dateTime: string;
    registradoPor: string;
    rol: 'Desarrollador' | 'Admin' | 'User';
    nombres: string;
    apellidos: string;
    correo: string;
    contrasena: string;
}
export declare function getAllUsuarios(): Promise<Usuario[]>;
export declare function getUsuarioByCorreo(correo: string): Promise<Usuario | null>;
export declare function getUsuarioById(idRegistro: string): Promise<Usuario | null>;
export declare function appendUsuario(usuario: Omit<Usuario, 'rowIndex'>): Promise<void>;
export declare function updateUsuario(rowIndex: number, usuario: Partial<Omit<Usuario, 'rowIndex'>>): Promise<void>;
export declare function deleteUsuario(rowIndex: number): Promise<void>;
//# sourceMappingURL=googleSheets_usuarios.d.ts.map