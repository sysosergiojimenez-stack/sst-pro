import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import { appRouter } from './routers/index.js';
import { createContext } from './trpc';
import { serve } from '@hono/node-server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { 
  extraerDatosConGemini, 
  appendEmpleado, 
  subirPDFAGCS, 
  updateEmpleado, 
  deleteEmpleado, 
  getEmpleadoByDocumento,
  getEmpleados,
  getEstadisticas,
  getObras,
  getEmpresas,
  getCargos,
  getProyectos,
  getProyectoById,
  appendProyecto,
  updateProyecto,
  deleteProyecto
} from './lib/googleSheets';
import { sheets, SPREADSHEET_ID } from './lib/googleSheets';
import {
  getAllCapacitaciones, getCapacitacionesByProyecto,
  appendCapacitacion, updateCapacitacion, deleteCapacitacion
} from './lib/googleSheets_capacitaciones';
import { 
  getAllIncidentes, 
  getIncidentesByProyecto, 
  getIncidenteById, 
  getIncidenteByRowIndex, 
  appendIncidente, 
  updateIncidente, 
  deleteIncidente 
} from './lib/googleSheets_incidentes';
import {
  getAllProductos, getProductosByProyecto, getProductoByCodigo, appendProducto, updateProducto,
  getAllRemisiones, getRemisionesByProyecto, getRemisionById, getRemisionByNumeracion, appendRemision, updateRemision, deleteRemision,
  getAllEntradas, getEntradasByProyecto, getEntradasByRemision, getEntradasByRemisionId, appendEntrada, appendMultipleEntradas, deleteEntrada,
  getAllNotasSalida, getNotasSalidaByProyecto, getNotaSalidaById, appendNotaSalida, updateNotaSalida, deleteNotaSalida,
  getAllSalidas, getSalidasByProyecto, getSalidasByNota, getSalidasByTrabajador, appendSalida, appendMultipleSalidas, deleteSalida
} from './lib/googleSheets_epp';
import {
  getAllUsuarios, getUsuarioByCorreo, getUsuarioById, appendUsuario, updateUsuario, deleteUsuario
} from './lib/googleSheets_usuarios';
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';


// ============================================
// AUTH HELPERS
// ============================================
const JWT_SECRET = process.env.JWT_SECRET || 'sst-jwt-secret-change-in-production';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken(usuario: { idRegistro: string; correo: string; rol: string }): string {
  const payload = {
    id: usuario.idRegistro,
    correo: usuario.correo,
    rol: usuario.rol,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token: string): { id: string; correo: string; rol: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (signature !== parts[2]) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.id, correo: payload.correo, rol: payload.rol };
  } catch {
    return null;
  }
}

const app = new Hono();

// CORS
app.use('/*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], credentials: true }));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// API REST - Listar empleados
app.get('/api/empleados', async (c) => {
  try {
    const obra = c.req.query('obra');
    const proyecto = c.req.query('proyecto');
    const filtro = obra || proyecto;
    let empleados = await getEmpleados();
    if (filtro) {
      empleados = empleados.filter(e => e.obra === filtro);
    }
    return c.json({ success: true, data: empleados });
  } catch (error: any) {
    console.error('Error GET /api/empleados:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Obtener un empleado por documento
app.get('/api/empleados/:documento', async (c) => {
  try {
    const nroDocumento = c.req.param('documento');
    const emp = await getEmpleadoByDocumento(nroDocumento);
    if (!emp) {
      return c.json({ error: 'Empleado no encontrado' }, 404);
    }
    return c.json({ success: true, data: emp });
  } catch (error: any) {
    console.error('Error GET /api/empleados/:documento:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Crear empleado
app.post('/api/empleados', async (c) => {
  try {
    const body = await c.req.json();
    console.log('POST /api/empleados - Body:', JSON.stringify(body, null, 2));
    console.log('POST /api/empleados - scanDocumentos:', body.scanDocumentos);
    
    const rowIndex = await appendEmpleado(body);
    console.log('Empleado creado en fila:', rowIndex);
    return c.json({ success: true, id: rowIndex, rowIndex });
  } catch (error: any) {
    console.error('Error POST /api/empleados:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Actualizar empleado
app.put('/api/empleados/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    
    console.log('PUT /api/empleados/:rowIndex - Row:', rowIndex);
    console.log('Datos:', JSON.stringify(body, null, 2));

    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }

    await updateEmpleado(rowIndex, body);
    
    return c.json({ success: true, message: 'Empleado actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/empleados:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Eliminar empleado
app.delete('/api/empleados/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    
    console.log('DELETE /api/empleados/:rowIndex - Row:', rowIndex);

    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }

    await deleteEmpleado(rowIndex);
    
    return c.json({ success: true, message: 'Empleado eliminado' });
  } catch (error: any) {
    console.error('Error DELETE /api/empleados:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Gemini + Guardar PDF en GCS
app.post('/api/gemini', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.pdfBase64 || body.pdfBase64.length < 100) {
      return c.json({ error: 'PDF vacio o corrupto. Length: ' + (body.pdfBase64?.length || 0) }, 400);
    }

    // Validar que GEMINI_API_KEY esté configurada
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return c.json({ error: 'GEMINI_API_KEY no configurada en el servidor' }, 500);
    }

    console.log('[GEMINI] Procesando PDF, length:', body.pdfBase64.length);
    const datos = await extraerDatosConGemini(body.pdfBase64, body.mimeType || 'application/pdf');
    console.log('[GEMINI] Datos extraidos:', JSON.stringify(datos).substring(0, 200));

    const nombreArchivo = `FICHA_${datos.nroDocumento || 'SIN_DOC'}_${datos.nombres || 'SIN_NOMBRE'}_${Date.now()}.pdf`;
    const gcsUrl = await subirPDFAGCS(body.pdfBase64, nombreArchivo, body.mimeType || 'application/pdf');

    const resultado = {
      ...datos,
      scanDocumentos: gcsUrl,
    };

    return c.json({ success: true, data: resultado });
  } catch (error: any) {
    console.error('[GEMINI] Error completo:', error);
    console.error('[GEMINI] Stack:', error.stack);
    return c.json({ 
      error: error.message || 'Error desconocido',
      stack: error.stack || 'No stack trace'
    }, 500);
  }
});

// ============================================
// API GEMINI - EPP (Procesamiento de Facturas/Remisiones)
// ============================================

app.post('/api/gemini/epp', async (c) => {
  try {
    const { pdfBase64, mimeType, proyecto } = await c.req.json();
    if (!pdfBase64) {
      return c.json({ error: 'No se proporciono PDF' }, 400);
    }
    if (!proyecto) {
      return c.json({ error: 'No se proporciono proyecto' }, 400);
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return c.json({ error: 'GEMINI_API_KEY no configurada' }, 500);
    }

    const prompt = `Analiza este documento de factura o remision de Equipos de Proteccion Personal (EPP) y extrae la informacion en formato JSON.

Devuelve EXACTAMENTE este formato JSON (sin markdown, sin backticks, solo el JSON puro):

{
  "proveedor": "nombre del proveedor",
  "numeracion": "numero de factura o remision",
  "fecha": "DD/MM/AAAA",
  "items": [
    {
      "codigo": "codigo del producto segun el proveedor, o genera uno como EPP-XXX si no tiene",
      "nombre": "nombre descriptivo del producto",
      "cantidad": "cantidad como numero",
      "clasificacion": "una de: Casco, Gafas, Guantes, Botas, Arnés, Proteccion Auditiva, Proteccion Respiratoria, Ropa de Trabajo, Otro"
    }
  ]
}

Instrucciones:
1. Si un producto no tiene codigo, genera uno unico usando el formato EPP-XXX donde XXX es un numero secuencial (001, 002, etc.)
2. La clasificacion debe ser una de las categorias listadas arriba
3. Extrae TODOS los items del documento
4. Si no hay items, devuelve un array vacio
5. La fecha debe estar en formato DD/MM/AAAA (dia/mes/año)`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'application/pdf', data: pdfBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error Gemini API: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('Respuesta cruda de Gemini:', text.substring(0, 500));
    
    let jsonStr = text.trim();
    
    // Eliminar markdown code blocks si existen
    jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```\s*$/, '');
    
    // Buscar el objeto JSON
    const jsonMatch = jsonStr.match(/\\{[\\s\\S]*\\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    console.log('JSON extraido:', jsonStr.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(jsonStr);
    } catch (parseError: any) {
      console.error('Error parseando JSON:', parseError.message);
      console.error('JSON problematico:', jsonStr);
      
      // Si la respuesta está truncada, intentar reconstruir el JSON
      if (jsonStr.includes('"items":') && !jsonStr.trim().endsWith(']') && !jsonStr.trim().endsWith('}')) {
        console.log('Respuesta posiblemente truncada, intentando reconstruir...');
        // Intentar cerrar el JSON
        let fixed = jsonStr.trim();
        // Contar llaves y corchetes abiertos (sin regex)
        let openBraces = 0, closeBraces = 0;
        let openBrackets = 0, closeBrackets = 0;
        for (let i = 0; i < fixed.length; i++) {
          const ch = fixed[i];
          if (ch === '{') openBraces++;
          else if (ch === '}') closeBraces++;
          else if (ch === '[') openBrackets++;
          else if (ch === ']') closeBrackets++;
        }
        
        // Cerrar strings no cerrados
        const quoteCount = (fixed.match(/"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          fixed += '"';
        }
        
        // Cerrar objetos y arrays
        for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
        for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
        
        try {
          data = JSON.parse(fixed);
          console.log('JSON reconstruido exitosamente');
        } catch (e2: any) {
          return c.json({ error: 'La IA devolvio una respuesta incompleta. Intenta con un documento mas corto o con menos items.', rawResponse: text.substring(0, 1000) }, 500);
        }
      } else {
        return c.json({ error: 'La IA no devolvio un JSON valido', rawResponse: text.substring(0, 1000) }, 500);
      }
    }

    const nombreArchivo = `EPP_${proyecto}_${Date.now()}.pdf`;
    const publicUrl = await subirPDFAGCS(pdfBase64, nombreArchivo, mimeType || 'application/pdf');

    data.pdfUrl = publicUrl;
    data.proyecto = proyecto;

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error Gemini EPP:', error);
    return c.json({ error: error.message }, 500);
  }
});


// API REST - Estadisticas
app.get('/api/estadisticas', async (c) => {
  try {
    const stats = await getEstadisticas();
    return c.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error /api/estadisticas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Obras
app.get('/api/obras', async (c) => {
  try {
    const obras = await getObras();
    return c.json({ success: true, data: obras });
  } catch (error: any) {
    console.error('Error /api/obras:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Empresas
app.get('/api/empresas', async (c) => {
  try {
    const empresas = await getEmpresas();
    return c.json({ success: true, data: empresas });
  } catch (error: any) {
    console.error('Error /api/empresas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Cargos
app.get('/api/cargos', async (c) => {
  try {
    const cargos = await getCargos();
    return c.json({ success: true, data: cargos });
  } catch (error: any) {
    console.error('Error /api/cargos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});


// API REST - Listar proyectos
app.get('/api/proyectos', async (c) => {
  try {
    const proyectos = await getProyectos();
    return c.json({ success: true, data: proyectos });
  } catch (error: any) {
    console.error('Error GET /api/proyectos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Obtener un proyecto por ID
app.get('/api/proyectos/:id', async (c) => {
  try {
    const idRegistro = c.req.param('id');
    const proyecto = await getProyectoById(idRegistro);
    if (!proyecto) {
      return c.json({ error: 'Proyecto no encontrado' }, 404);
    }
    return c.json({ success: true, data: proyecto });
  } catch (error: any) {
    console.error('Error GET /api/proyectos/:id:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Crear proyecto
app.post('/api/proyectos', async (c) => {
  try {
    const body = await c.req.json();
    const rowIndex = await appendProyecto(body);
    console.log('Proyecto creado en fila:', rowIndex);
    return c.json({ success: true, id: rowIndex, rowIndex });
  } catch (error: any) {
    console.error('Error POST /api/proyectos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Actualizar proyecto
app.put('/api/proyectos/:id', async (c) => {
  try {
    const idRegistro = c.req.param('id');
    const body = await c.req.json();
    console.log('PUT /api/proyectos/:id - ID:', idRegistro);
    console.log('Datos:', JSON.stringify(body, null, 2));

    const proyecto = await getProyectoById(idRegistro);
    if (!proyecto) {
      return c.json({ error: 'Proyecto no encontrado' }, 404);
    }

    await updateProyecto(proyecto.rowIndex, body);
    return c.json({ success: true, message: 'Proyecto actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/proyectos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// API REST - Eliminar proyecto
app.delete('/api/proyectos/:id', async (c) => {
  try {
    const idRegistro = c.req.param('id');
    console.log('DELETE /api/proyectos/:id - ID:', idRegistro);

    const proyecto = await getProyectoById(idRegistro);
    if (!proyecto) {
      return c.json({ error: 'Proyecto no encontrado' }, 404);
    }

    await deleteProyecto(proyecto.rowIndex);
    return c.json({ success: true, message: 'Proyecto eliminado' });
  } catch (error: any) {
    console.error('Error DELETE /api/proyectos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// API REST - INCIDENTES
// ============================================

// GET - Listar todos los incidentes
app.get('/api/incidentes', async (c) => {
  try {
    const proyecto = c.req.query('proyecto');
    let data;
    if (proyecto) {
      data = await getIncidentesByProyecto(proyecto);
    } else {
      data = await getAllIncidentes();
    }
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/incidentes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET - Obtener un incidente por ID
app.get('/api/incidentes/:id', async (c) => {
  try {
    const idRegistro = c.req.param('id');
    const incidente = await getIncidenteById(idRegistro);
    if (!incidente) {
      return c.json({ error: 'Incidente no encontrado' }, 404);
    }
    return c.json({ success: true, data: incidente });
  } catch (error: any) {
    console.error('Error GET /api/incidentes/:id:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear incidente
app.post('/api/incidentes', async (c) => {
  try {
    const body = await c.req.json();
    const idRegistro = body.idRegistro || `INC-${Date.now()}`;
    
    await appendIncidente({
      idRegistro,
      fechaHoraRegistro: new Date().toISOString(),
      userEmail: body.userEmail || 'sistema',
      proyecto: body.proyecto || '',
      fechaIncidente: body.fechaIncidente || '',
      horaIncidente: body.horaIncidente || '',
      lugar: body.lugar || '',
      tipo: body.tipo || '',
      clasificacion: body.clasificacion || '',
      descripcion: body.descripcion || '',
      personasInvolucradas: body.personasInvolucradas || '',
      causasInmediatas: body.causasInmediatas || '',
      causasRaiz: body.causasRaiz || '',
      accionesCorrectivas: body.accionesCorrectivas || '',
      responsableAcciones: body.responsableAcciones || '',
      fechaCompromiso: body.fechaCompromiso || '',
      estado: body.estado || 'Abierto',
      evidencias: body.evidencias || '',
      investigador: body.investigador || '',
      fechaCierre: body.fechaCierre || '',
      diasPerdidos: body.diasPerdidos || '',
      costoEstimado: body.costoEstimado || '',
    });
    
    return c.json({ success: true, message: 'Incidente registrado', idRegistro });
  } catch (error: any) {
    console.error('Error POST /api/incidentes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Actualizar incidente
app.put('/api/incidentes/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }

    await updateIncidente(rowIndex, body);
    return c.json({ success: true, message: 'Incidente actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/incidentes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Eliminar incidente
app.delete('/api/incidentes/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await deleteIncidente(rowIndex);
    return c.json({ success: true, message: 'Incidente eliminado' });
  } catch (error: any) {
    console.error('Error DELETE /api/incidentes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});


  
app.use('/trpc/*', async (c) => {
  return fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext({ req: c.req }),
    batching: { enabled: true },
  });
});

// Servir frontend estatico

// ============================================
// API REST - EPP (Control de Equipos de Proteccion Personal)
// ============================================

// GET - Listar todos los productos
// Helper para convertir fecha DD/MM/AAAA a YYYY-MM-DD
function convertirFecha(fecha: string): string {
  if (!fecha) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  const match = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, dia, mes, anio] = match;
    return anio + '-' + mes.padStart(2, '0') + '-' + dia.padStart(2, '0');
  }
  return fecha;
}

app.get('/api/epp/productos', async (c) => {
  try {
    const proyecto = c.req.query('proyecto');
    const data = proyecto ? await getProductosByProyecto(proyecto) : await getAllProductos();
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/epp/productos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET - Buscar producto por codigo
app.get('/api/epp/productos/:codigo', async (c) => {
  try {
    const codigo = c.req.param('codigo');
    const producto = await getProductoByCodigo(codigo);
    if (!producto) return c.json({ error: 'Producto no encontrado' }, 404);
    return c.json({ success: true, data: producto });
  } catch (error: any) {
    console.error('Error GET /api/epp/productos/:codigo:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear producto
app.post('/api/epp/productos', async (c) => {
  try {
    const body = await c.req.json();
    await appendProducto({
      codigo: body.codigo || '',
      proyecto: body.proyecto || '',
      nombre: body.nombre || '',
      proveedor: body.proveedor || '',
      stockMinimo: body.stockMinimo || 0,
      clasificacion: body.clasificacion || '',
    });
    return c.json({ success: true, message: 'Producto registrado' });
  } catch (error: any) {
    console.error('Error POST /api/epp/productos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET - Listar remisiones
app.get('/api/epp/remisiones', async (c) => {
  try {
    const proyecto = c.req.query('proyecto');
    let data;
    if (proyecto) {
      data = await getRemisionesByProyecto(proyecto);
    } else {
      data = await getAllRemisiones();
    }
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/epp/remisiones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET - Remision por ID
app.get('/api/epp/remisiones/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const remision = await getRemisionById(id);
    if (!remision) return c.json({ error: 'Remision no encontrada' }, 404);
    return c.json({ success: true, data: remision });
  } catch (error: any) {
    console.error('Error GET /api/epp/remisiones/:id:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear remision
app.post('/api/epp/remisiones', async (c) => {
  try {
    const body = await c.req.json();
    const idRegistro = body.idRegistro || `REM-${Date.now()}`;
    await appendRemision({
      idRegistro,
      fechaHora: new Date().toISOString(),
      userEmail: body.userEmail || 'sistema',
      proyecto: body.proyecto || '',
      proveedor: body.proveedor || '',
      numeracion: body.numeracion || '',
      fecha: convertirFecha(body.fecha || ''),
      detalle: body.detalle || '',
      scaneado: body.scaneado || '',
    });
    return c.json({ success: true, message: 'Remision registrada', idRegistro });
  } catch (error: any) {
    console.error('Error POST /api/epp/remisiones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Eliminar remision (y sus entradas relacionadas)
app.delete('/api/epp/remisiones/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    const remisiones = await getAllRemisiones();
    const remision = remisiones.find(r => r.rowIndex === rowIndex);
    if (remision) {
      const entradasRelacionadas = await getEntradasByRemisionId(remision.idRegistro);
      for (const entrada of entradasRelacionadas) {
        await deleteEntrada(entrada.rowIndex);
      }
    }
    await deleteRemision(rowIndex);
    return c.json({ success: true, message: 'Remision y entradas relacionadas eliminadas' });
  } catch (error: any) {
    console.error('Error DELETE /api/epp/remisiones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Actualizar remision
app.put('/api/epp/remisiones/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    
    await updateRemision(rowIndex, body);
    return c.json({ success: true, message: 'Remision actualizada' });
  } catch (error: any) {
    console.error('Error PUT /api/epp/remisiones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET - Listar entradas
app.get('/api/epp/entradas', async (c) => {
  try {
    const proyecto = c.req.query('proyecto');
    const refRemision = c.req.query('refRemision');
    let data;
    if (refRemision) {
      data = await getEntradasByRemision(refRemision);
    } else if (proyecto) {
      data = await getEntradasByProyecto(proyecto);
    } else {
      data = await getAllEntradas();
    }
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/epp/entradas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear entrada
app.post('/api/epp/entradas', async (c) => {
  try {
    const body = await c.req.json();
    await appendEntrada({
      idRegistro: body.idRegistro || `ENT-${Date.now()}`,
      dateTime: new Date().toISOString(),
      userEmail: body.userEmail || 'sistema',
      proyecto: body.proyecto || '',
      refRemision: body.refRemision || '',
      codigo: body.codigo || '',
      item: body.item || '',
      cantidad: body.cantidad || '',
    });
    return c.json({ success: true, message: 'Entrada registrada' });
  } catch (error: any) {
    console.error('Error POST /api/epp/entradas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear multiples entradas (batch)
app.post('/api/epp/entradas/batch', async (c) => {
  try {
    const body = await c.req.json();
    const entradas = body.entradas || [];
    if (entradas.length === 0) {
      return c.json({ error: 'No se proporcionaron entradas' }, 400);
    }
    await appendMultipleEntradas(entradas);
    return c.json({ success: true, message: `${entradas.length} entradas registradas` });
  } catch (error: any) {
    console.error('Error POST /api/epp/entradas/batch:', error.message);
    return c.json({ error: error.message }, 500);
  }
});
// DELETE - Eliminar entrada
app.delete('/api/epp/entradas/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `Entradas!A${rowIndex}:H${rowIndex}`,
    });
    return c.json({ success: true, message: 'Entrada eliminada' });
  } catch (error: any) {
    console.error('Error DELETE /api/epp/entradas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});



app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json();
    const { correo, contrasena } = body;
    
    if (!correo || !contrasena) {
      return c.json({ error: 'Correo y contraseña requeridos' }, 400);
    }
    
    const usuario = await getUsuarioByCorreo(correo);
    if (!usuario) {
      return c.json({ error: 'Usuario no encontrado' }, 401);
    }
    
    const hashedInput = hashPassword(contrasena);
    if (usuario.contrasena !== hashedInput && usuario.contrasena !== contrasena) {
      return c.json({ error: 'Contraseña incorrecta' }, 401);
    }
    
    const token = generateToken(usuario);
    return c.json({
      success: true,
      token,
      user: {
        idRegistro: usuario.idRegistro,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error: any) {
    console.error('Error POST /api/auth/login:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET - Obtener usuario actual
app.get('/api/auth/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'No autorizado' }, 401);
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      return c.json({ error: 'Token invalido o expirado' }, 401);
    }
    
    const usuario = await getUsuarioById(payload.id);
    if (!usuario) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }
    
    return c.json({
      success: true,
      user: {
        idRegistro: usuario.idRegistro,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        rol: usuario.rol,
      },
    });
  } catch (error: any) {
    console.error('Error GET /api/auth/me:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// GET - Listar usuarios
app.get('/api/usuarios', async (c) => {
  try {
    const usuarios = await getAllUsuarios();
    // No devolver contraseñas
    const safe = usuarios.map(u => ({
      rowIndex: u.rowIndex,
      idRegistro: u.idRegistro,
      dateTime: u.dateTime,
      registradoPor: u.registradoPor,
      rol: u.rol,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo,
    }));
    return c.json({ success: true, data: safe });
  } catch (error: any) {
    console.error('Error GET /api/usuarios:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear usuario
app.post('/api/usuarios', async (c) => {
  try {
    const body = await c.req.json();
    const existing = await getUsuarioByCorreo(body.correo);
    if (existing) {
      return c.json({ error: 'Ya existe un usuario con ese correo' }, 400);
    }
    
    await appendUsuario({
      idRegistro: `USR-${Date.now()}`,
      dateTime: new Date().toISOString(),
      registradoPor: body.registradoPor || 'sistema',
      rol: body.rol || 'User',
      nombres: body.nombres || '',
      apellidos: body.apellidos || '',
      correo: body.correo || '',
      contrasena: hashPassword(body.contrasena || '123456'),
    });
    
    return c.json({ success: true, message: 'Usuario creado' });
  } catch (error: any) {
    console.error('Error POST /api/usuarios:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Actualizar usuario
app.put('/api/usuarios/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    
    const updates: any = {};
    if (body.rol) updates.rol = body.rol;
    if (body.nombres) updates.nombres = body.nombres;
    if (body.apellidos) updates.apellidos = body.apellidos;
    if (body.correo) updates.correo = body.correo;
    if (body.contrasena) updates.contrasena = hashPassword(body.contrasena);
    
    await updateUsuario(rowIndex, updates);
    return c.json({ success: true, message: 'Usuario actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/usuarios:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Eliminar usuario
app.delete('/api/usuarios/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await deleteUsuario(rowIndex);
    return c.json({ success: true, message: 'Usuario eliminado' });
  } catch (error: any) {
    console.error('Error DELETE /api/usuarios:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.use('/*', serveStatic({ root: './dist/client' }));

// ============================================
// API REST - NOTAS DE SALIDA
// ============================================

// GET - Listar notas de salida
app.get('/api/epp/notas-salida', async (c) => {
  try {
    const obra = c.req.query('obra');
    const proyecto = c.req.query('proyecto');
    const filtro = obra || proyecto;
    const data = filtro ? await getNotasSalidaByProyecto(filtro) : await getAllNotasSalida();
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/epp/notas-salida:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear nota de salida
app.post('/api/epp/notas-salida', async (c) => {
  try {
    const body = await c.req.json();
    const idRegistro = body.idRegistro || `NS-${Date.now()}`;
    await appendNotaSalida({
      idRegistro,
      fechaHora: new Date().toISOString(),
      userEmail: body.userEmail || 'sistema',
      obra: body.obra || '',
      orden: body.orden || '',
      fecha: body.fecha || '',
      quienRetira: body.quienRetira || '',
      observaciones: body.observaciones || '',
    });
    return c.json({ success: true, message: 'Nota de salida registrada', idRegistro });
  } catch (error: any) {
    console.error('Error POST /api/epp/notas-salida:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Actualizar nota de salida
app.put('/api/epp/notas-salida/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await updateNotaSalida(rowIndex, body);
    return c.json({ success: true, message: 'Nota de salida actualizada' });
  } catch (error: any) {
    console.error('Error PUT /api/epp/notas-salida:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Eliminar nota de salida
app.delete('/api/epp/notas-salida/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await deleteNotaSalida(rowIndex);
    return c.json({ success: true, message: 'Nota de salida eliminada' });
  } catch (error: any) {
    console.error('Error DELETE /api/epp/notas-salida:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// API REST - SALIDAS
// ============================================

// GET - Listar salidas
app.get('/api/epp/salidas', async (c) => {
  try {
    const obra = c.req.query('obra');
    const proyecto = c.req.query('proyecto');
    const filtro = obra || proyecto;
    const refNota = c.req.query('refNota');
    const trabajador = c.req.query('trabajador');
    let data;
    if (trabajador) {
      data = await getSalidasByTrabajador(trabajador);
    } else if (refNota) {
      data = await getSalidasByNota(refNota);
    } else if (filtro) {
      data = await getSalidasByProyecto(filtro);
    } else {
      data = await getAllSalidas();
    }
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/epp/salidas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear salida
app.post('/api/epp/salidas', async (c) => {
  try {
    const body = await c.req.json();
    await appendSalida({
      idRegistro: body.idRegistro || `SAL-${Date.now()}`,
      fechaHora: new Date().toISOString(),
      userEmail: body.userEmail || 'sistema',
      refNotaSalida: body.refNotaSalida || '',
      refItem: body.refItem || '',
      cantidad: body.cantidad || '',
      trabajadorRetira: body.trabajadorRetira || '',
    });
    return c.json({ success: true, message: 'Salida registrada' });
  } catch (error: any) {
    console.error('Error POST /api/epp/salidas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// POST - Crear multiples salidas (batch)
app.post('/api/epp/salidas/batch', async (c) => {
  try {
    const body = await c.req.json();
    const salidas = body.salidas || [];
    if (salidas.length === 0) {
      return c.json({ error: 'No se proporcionaron salidas' }, 400);
    }
    await appendMultipleSalidas(salidas);
    return c.json({ success: true, message: `${salidas.length} salidas registradas` });
  } catch (error: any) {
    console.error('Error POST /api/epp/salidas/batch:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Eliminar salida
app.delete('/api/epp/salidas/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await deleteSalida(rowIndex);
    return c.json({ success: true, message: 'Salida eliminada' });
  } catch (error: any) {
    console.error('Error DELETE /api/epp/salidas:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Actualizar producto (stock minimo)
app.put('/api/epp/productos/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await updateProducto(rowIndex, body);
    return c.json({ success: true, message: 'Producto actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/epp/productos:', error.message);
    return c.json({ error: error.message }, 500);
  }
});



// ============================================
// API REST - CAPACITACIONES Y CHARLAS DE SEGURIDAD
// ============================================

app.get('/api/capacitaciones', async (c) => {
  try {
    const proyecto = c.req.query('proyecto');
    const data = proyecto ? await getCapacitacionesByProyecto(proyecto) : await getAllCapacitaciones();
    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('Error GET /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/capacitaciones', async (c) => {
  try {
    const body = await c.req.json();
    const idRegistro = body.idRegistro || `CAP-${Date.now()}`;
    await appendCapacitacion({
      idRegistro,
      fechaHora: new Date().toISOString(),
      userEmail: body.userEmail || 'sistema',
      proyecto: body.proyecto || '',
      titulo: body.titulo || '',
      fechaProgramada: body.fechaProgramada || '',
      hora: body.hora || '',
      lugar: body.lugar || '',
      responsable: body.responsable || '',
      tipo: body.tipo || '',
      estado: body.estado || 'Pendiente',
      fechaRealizada: body.fechaRealizada || '',
      asistentes: body.asistentes || '',
      observaciones: body.observaciones || '',
      evidenciaPDF: body.evidenciaPDF || '',
      temasTratados: body.temasTratados || '',
    });
    return c.json({ success: true, message: 'Charla programada', idRegistro });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// EXTRACCIÓN DE ASISTENTES CON IA
// ============================================

// ============================================
// EXTRACCIÓN DE ASISTENTES CON IA (usando Gemini Vision)
// ============================================

app.post('/api/capacitaciones/extract-asistentes', async (c) => {
  try {
    const body = await c.req.json();
    
    if (!body.pdfBase64 || body.pdfBase64.length < 100) {
      return c.json({ error: 'PDF vacio o corrupto. Length: ' + (body.pdfBase64?.length || 0) }, 400);
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return c.json({ error: 'GEMINI_API_KEY no configurada en el servidor' }, 500);
    }

    console.log('[GEMINI-CAP] Procesando PDF de asistencia, length:', body.pdfBase64.length);

    const prompt = `Analiza este documento PDF que contiene una planilla de asistencia de una charla o capacitación de seguridad industrial.

El documento tiene páginas con tablas manuscritas que contienen:
- Nombres de trabajadores (columna NOMBRE TRABAJADOR)
- Números de cédula/C.I.C. (columna C.I.C.)
- Oficios o especialidades (columna Oficio/Especialidad)
- Empresas (columna EMPRESA)
- Firmas (columna FIRMA)

EXTRAER TODOS los trabajadores que encuentres en las tablas. Incluso si los nombres están manuscritos o difíciles de leer, intenta transcribirlos lo mejor posible.

Responde ÚNICAMENTE en formato JSON con esta estructura exacta:
{
  "asistentes": [
    {
      "nombre": "Nombre completo del trabajador",
      "documento": "número de cédula o CIC",
      "cargo": "oficio o especialidad",
      "empresa": "nombre de empresa",
      "asistio": true
    }
  ],
  "totalAsistentes": 42,
  "temasTratados": "temas de la charla/capacitación",
  "observaciones": "observaciones adicionales",
  "fechaDocumento": "DD/MM/YYYY"
}

Si no puedes leer el documento, responde con asistentes vacíos:
{"asistentes":[],"totalAsistentes":0,"temasTratados":"","observaciones":"No se pudo extraer información","fechaDocumento":""}

NO incluyas explicaciones, SOLO el JSON.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: body.mimeType || 'application/pdf', data: body.pdfBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GEMINI-CAP] Error Gemini:', response.status, errorText);
      return c.json({ error: `Error Gemini: ${response.status}`, details: errorText }, 500);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('[GEMINI-CAP] Respuesta raw:', text.substring(0, 500));

    // Extraer JSON de la respuesta
    let datosExtraidos: any = { asistentes: [], totalAsistentes: 0, temasTratados: '', observaciones: '', fechaDocumento: '' };
    
    try {
      // Limpiar texto y buscar JSON
      let cleanText = text.trim();
      cleanText = cleanText.replace(/\n\s*/g, ' ').replace(/\s+/g, ' ');
      const jsonMatch = cleanText.match(/\{.*\}/s);
      if (jsonMatch) cleanText = jsonMatch[0];
      datosExtraidos = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('[GEMINI-CAP] Error parseando JSON, intentando corrección:', parseError);
      console.error('[GEMINI-CAP] Texto raw:', text.substring(0, 500));
      
      // Fallback: extraer con regex
      const asistentesMatch = text.match(/"nombre"\s*:\s*"([^"]+)"\s*,\s*"documento"\s*:\s*"([^"]*)"\s*,\s*"cargo"\s*:\s*"([^"]*)"\s*,\s*"empresa"\s*:\s*"([^"]*)"\s*,\s*"asistio"\s*:\s*(true|false)/g);
      if (asistentesMatch) {
        datosExtraidos.asistentes = asistentesMatch.map((match: string) => {
          const nombre = match.match(/"nombre"\s*:\s*"([^"]+)"/);
          const documento = match.match(/"documento"\s*:\s*"([^"]*)"/);
          const cargo = match.match(/"cargo"\s*:\s*"([^"]*)"/);
          const empresa = match.match(/"empresa"\s*:\s*"([^"]*)"/);
          const asistio = match.match(/"asistio"\s*:\s*(true|false)/);
          return {
            nombre: nombre ? nombre[1] : '',
            documento: documento ? documento[1] : '',
            cargo: cargo ? cargo[1] : '',
            empresa: empresa ? empresa[1] : '',
            asistio: asistio ? asistio[1] === 'true' : true,
          };
        });
        datosExtraidos.totalAsistentes = datosExtraidos.asistentes.length;
      }
      
      if (datosExtraidos.asistentes.length === 0) {
        return c.json({
          error: 'No se pudo parsear la respuesta de la IA',
          rawResponse: text.substring(0, 1000)
        }, 500);
      }
    }

    // Subir PDF a GCS como evidencia
    const nombreArchivo = body.nombreArchivo || `EVIDENCIA_ASISTENCIA_${Date.now()}.pdf`;
    const gcsUrl = await subirPDFAGCS(body.pdfBase64, nombreArchivo, body.mimeType || 'application/pdf');

    return c.json({
      success: true,
      data: {
        ...datosExtraidos,
        evidenciaPDF: gcsUrl
      }
    });

  } catch (error: any) {
    console.error('[GEMINI-CAP] Error completo:', error);
    return c.json({
      error: error.message || 'Error desconocido',
      stack: error.stack || 'No stack trace'
    }, 500);
  }
});

app.put('/api/capacitaciones/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    const body = await c.req.json();
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await updateCapacitacion(rowIndex, body);
    return c.json({ success: true, message: 'Charla actualizada' });
  } catch (error: any) {
    console.error('Error PUT /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.delete('/api/capacitaciones/:rowIndex', async (c) => {
  try {
    const rowIndex = parseInt(c.req.param('rowIndex'));
    if (isNaN(rowIndex) || rowIndex <= 0) {
      return c.json({ error: 'rowIndex invalido' }, 400);
    }
    await deleteCapacitacion(rowIndex);
    return c.json({ success: true, message: 'Charla eliminada' });
  } catch (error: any) {
    console.error('Error DELETE /api/capacitaciones:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

app.post('/api/capacitaciones/evidencia', async (c) => {
  try {
    const body = await c.req.json();
    const archivos = body.archivos || [];
    if (archivos.length === 0) {
      return c.json({ error: 'No se proporcionaron archivos' }, 400);
    }
    const urls: string[] = [];
    for (let i = 0; i < archivos.length; i++) {
      const archivo = archivos[i];
      const nombreArchivo = `CAPACITACION_${body.idRegistro || Date.now()}_${i}_${Date.now()}.pdf`;
      const url = await subirPDFAGCS(archivo.base64, nombreArchivo, archivo.mimeType || 'application/pdf');
      urls.push(url);
    }
    return c.json({ success: true, urls });
  } catch (error: any) {
    console.error('Error POST /api/capacitaciones/evidencia:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// Fallback SPA
app.get('*', (c) => {
  const indexPath = path.join(process.cwd(), 'dist/client/index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    return c.html(content);
  }
  return c.text('Frontend not built. Run: npx vite build', 404);
});

serve({
  fetch: app.fetch,
  port: parseInt(process.env.PORT || '3001'),
});

console.log('Server running on http://localhost:' + (process.env.PORT || '3001'));
console.log('GCS Bucket:', process.env.GCS_BUCKET_NAME || 'sst-documentos-empleados');
console.log('Google Sheets ID:', process.env.GOOGLE_SHEETS_ID || 'NO CONFIGURADO');
