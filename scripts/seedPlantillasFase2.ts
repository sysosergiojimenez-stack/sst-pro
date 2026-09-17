// Siembra unica de 3 plantillas de checklist nuevas en el motor generico de
// Inspecciones, correspondientes a SST-FOR-06 (excavacion diaria),
// SST-FOR-11 (tableros electricos) y SST-FOR-17 (plataformas suspendidas
// manuales). No requiere codigo nuevo -- el motor de checklist de
// Inspecciones ya soporta Cumple/No Cumple/N/A, que equivale a
// Conforme/No conforme/N/A de estos 3 formularios oficiales.
//
// USO:
//   GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json npx tsx scripts/seedPlantillasFase2.ts
import 'dotenv/config';
import { getDb } from '../src/server/lib/firebaseAdmin';

interface PlantillaSeed {
  id: string;
  nombre: string;
  items: string[];
}

const PLANTILLAS: PlantillaSeed[] = [
  {
    id: 'TPL-SST-FOR-06',
    nombre: 'Inspección Diaria de Excavación (SST-FOR-06)',
    items: [
      'Entibado / talud OK',
      'Sin agua acumulada',
      'Señalización OK',
      'Acceso seguro OK',
    ],
  },
  {
    id: 'TPL-SST-FOR-11',
    nombre: 'Inspección de Tableros e Instalación Eléctrica Provisoria (SST-FOR-11)',
    items: [
      'Protección diferencial y térmica operativas',
      'Puesta a tierra verificada',
      'Tablero señalizado, cerrado y con acceso restringido',
      'Cableado protegido mecánicamente',
      'Conexiones con conectores certificados',
      'Prolongadores y herramientas sin daños visibles',
      'Protección contra la humedad',
    ],
  },
  {
    id: 'TPL-SST-FOR-17',
    nombre: 'Condiciones de Seguridad — Plataformas Suspendidas Manuales (SST-FOR-17)',
    items: [
      // 1. Sistema de suspension y anclaje
      'Punto de anclaje del mecanismo de suspensión certificado y verificado por el área técnica',
      'Estructura de soporte (vigas, pescantes o anclaje directo) fijada, sin posibilidad de desplazamiento',
      'Contrapesos o fijación mecánica calculados y verificados (coeficiente de seguridad n ≥ 2), si aplica',
      'Ganchos de retención lateral a la fachada instalados, si el diseño de la plataforma los requiere',
      'Plataforma fijada al mecanismo de suspensión con al menos 2 pernos de 1/2" o 3 pernos de 3/8", por mecanismo',
      // 2. Cables y aparejo de izaje manual
      'Cuerda/cable de trabajo (portante) sin cortes, deshilachados ni corrosión',
      'Cuerda de seguridad independiente del cable de trabajo, con dispositivo anticaídas (rope grab) operativo',
      'Aparejo / polipasto manual con freno de seguridad autoblocante funcional',
      'Ganchos, grilletes y mosquetones con pestillo de seguridad, sin deformaciones',
      // 3. Plataforma
      'Piso de trabajo en buen estado, antideslizante, sin daños',
      'Ancho de la plataforma no menor a 80 cm (Art. 24°, num. 2, Decreto N° 14.390/92)',
      'Barandas perimetrales o puntos de amarre según diseño, en buen estado',
      'Capacidad de carga definida y no excedida (personas + herramientas + materiales)',
      'Plataforma nivelada, sin inclinación excesiva entre sus extremos',
      // 4. EPP y linea de vida
      'Cada ocupante con arnés de cuerpo entero',
      'Línea de vida independiente del sistema de suspensión de la plataforma, anclada a punto propio',
      'Casco de seguridad con barbijo',
      // 5. Requisitos administrativos y condiciones ambientales
      'Permiso de Trabajo de Alto Riesgo (SST-FOR-02) vigente',
      'Capacitación específica de los ocupantes en el uso de esta plataforma, con constancia registrada',
      'Plan de rescate confirmado antes de iniciar la tarea',
      'Sin líneas eléctricas de alto voltaje dentro de los 10 metros del área de trabajo',
      'Sin viento fuerte, tormenta eléctrica, niebla o lluvia intensa',
    ],
  },
];

async function main() {
  const db = getDb();
  for (const plantilla of PLANTILLAS) {
    await db.collection('checklist_template_groups').doc(plantilla.id).set({
      id: plantilla.id, nombre: plantilla.nombre, activo: 'TRUE',
    });
    const batch = db.batch();
    plantilla.items.forEach((texto, index) => {
      const itemId = `${plantilla.id}-${index + 1}`;
      batch.set(db.collection('checklist_template_items').doc(itemId), {
        id: itemId, idTemplate: plantilla.id, texto, orden: index + 1, activo: 'TRUE',
      });
    });
    await batch.commit();
    console.log(`Sembrada: ${plantilla.nombre} (${plantilla.items.length} items)`);
  }
  console.log('Listo.');
}

main().catch(err => {
  console.error('Error en la siembra:', err);
  process.exit(1);
});
