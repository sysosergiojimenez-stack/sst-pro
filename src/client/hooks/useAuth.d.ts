export interface AuthUser {
    idRegistro: string;
    nombres: string;
    apellidos: string;
    correo: string;
    rol: 'Desarrollador' | 'Admin' | 'User';
}
export declare function useAuth(): {
    user: AuthUser | null;
    loading: boolean;
    login: (userData: AuthUser) => void;
    logout: () => void;
    canAccess: (feature: string) => boolean;
};
//# sourceMappingURL=useAuth.d.ts.map