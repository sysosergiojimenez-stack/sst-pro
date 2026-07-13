interface Proyecto {
    rowIndex: number;
    idRegistro: string;
    fechaHora: string;
    userEmail: string;
    denominacion: string;
    ubicacion: string;
    logo: string;
}
interface ProyectosProps {
    onSelectProyecto: (proyecto: Proyecto) => void;
}
export default function Proyectos({ onSelectProyecto }: ProyectosProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=Proyectos.d.ts.map