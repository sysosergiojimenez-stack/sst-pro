interface Proyecto {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    denominacion: string;
    ubicacion: string;
    logo: string;
}
interface ProyectoDetalleProps {
    proyecto: Proyecto;
    onBack: () => void;
}
export default function ProyectoDetalle({ proyecto, onBack }: ProyectoDetalleProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=ProyectoDetalle.d.ts.map