interface Proyecto {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    denominacion: string;
    ubicacion: string;
    logo: string;
}
interface ProyectoDashboardProps {
    proyecto: Proyecto;
}
export default function ProyectoDashboard({ proyecto }: ProyectoDashboardProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ProyectoDashboard.d.ts.map