interface Proyecto {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    denominacion: string;
    ubicacion: string;
    logo: string;
}
interface EmpleadosPorProyectoProps {
    proyecto: Proyecto;
}
export default function EmpleadosPorProyecto({ proyecto }: EmpleadosPorProyectoProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=EmpleadosPorProyecto.d.ts.map