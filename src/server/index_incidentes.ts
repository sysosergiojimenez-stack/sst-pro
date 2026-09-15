// ============================================
// API REST - INCIDENTES
// ============================================

import { Hono } from 'hono';

import { getAllIncidentes, getIncidentesByProyecto, getIncidenteById, appendIncidente, updateIncidente, deleteIncidente } from './lib/firestore_incidentes';

const app = new Hono();


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
      causaOtraDetalle: body.causaOtraDetalle || '',
      nombreTrabajador: body.nombreTrabajador || '',
      cedulaTrabajador: body.cedulaTrabajador || '',
      empresaTrabajador: body.empresaTrabajador || '',
      cargoTrabajador: body.cargoTrabajador || '',
      lesionDano: body.lesionDano || '',
      notificadoIPS: body.notificadoIPS || '',
      fechaNotificacionIPS: body.fechaNotificacionIPS || '',
      notificadoMTESS: body.notificadoMTESS || '',
      fechaNotificacionMTESS: body.fechaNotificacionMTESS || '',
    });

    return c.json({ success: true, message: 'Incidente registrado', idRegistro });
  } catch (error: any) {
    console.error('Error POST /api/incidentes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// PUT - Actualizar incidente
app.put('/api/incidentes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    if (!id) {
      return c.json({ error: 'id invalido' }, 400);
    }

    await updateIncidente(id, body);

    return c.json({ success: true, message: 'Incidente actualizado' });
  } catch (error: any) {
    console.error('Error PUT /api/incidentes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE - Eliminar incidente
app.delete('/api/incidentes/:id', async (c) => {
  try {
    const id = c.req.param('id');

    if (!id) {
      return c.json({ error: 'id invalido' }, 400);
    }

    await deleteIncidente(id);

    return c.json({ success: true, message: 'Incidente eliminado' });
  } catch (error: any) {
    console.error('Error DELETE /api/incidentes:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
