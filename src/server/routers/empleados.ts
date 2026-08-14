import { router, publicProcedure } from '../trpc';
import { getEmpleados, getEmpleadoByDocumento, buscarEmpleados, appendEmpleado, extraerDatosConGemini } from '../lib/googleSheets';

export const empleadosRouter = router({
  list: publicProcedure
    .query(async () => {
      const empleados = await getEmpleados();
      return empleados;
    }),

  byObra: publicProcedure
    .query(async ({ input }: any) => {
      const obra = input?.json?.obra || input?.obra || '';
      const empleados = await buscarEmpleados({ obra });
      return empleados;
    }),

  create: publicProcedure
    .mutation(async ({ input }: any) => {
      console.log('CREATE - Input completo:', JSON.stringify(input, null, 2));
      const data = input?.json || input || {};
      console.log('CREATE - Datos:', JSON.stringify(data, null, 2));
      
      const empleadoData = {
        nroDocumento: data.nroDocumento || '',
        userEmail: data.userEmail || '',
        obra: data.obra || '',
        tipoDocumento: data.tipoDocumento || '',
        nombres: data.nombres || '',
        apellidos: data.apellidos || '',
        ciudadNacimiento: data.ciudadNacimiento || '',
        fechaNacimiento: data.fechaNacimiento || '',
        sexo: data.sexo || '',
        estadoCivil: data.estadoCivil || '',
        nombrePadre: data.nombrePadre || '',
        ocupacionPadre: data.ocupacionPadre || '',
        nombreMadre: data.nombreMadre || '',
        ocupacionMadre: data.ocupacionMadre || '',
        nombreConyuge: data.nombreConyuge || '',
        ocupacionConyuge: data.ocupacionConyuge || '',
        fechaNacConyuge: data.fechaNacConyuge || '',
        direccion: data.direccion || '',
        nro: data.nro || '',
        dpto: data.dpto || '',
        piso: data.piso || '',
        barrio: data.barrio || '',
        ciudad: data.ciudad || '',
        departamentoTerritorial: data.departamentoTerritorial || '',
        puntoReferencia: data.puntoReferencia || '',
        telefonoCelular: data.telefonoCelular || '',
        telefonoEmergencia: data.telefonoEmergencia || '',
        email: data.email || '',
        gradoInstruccion: data.gradoInstruccion || '',
        instruccionConcluida: data.instruccionConcluida || '',
        carreraUniversitaria: data.carreraUniversitaria || '',
        tipoSangre: data.tipoSangre || '',
        hijo1: data.hijo1 || '',
        fechaNacHijo1: data.fechaNacHijo1 || '',
        hijo2: data.hijo2 || '',
        fechaNacHijo2: data.fechaNacHijo2 || '',
        hijo3: data.hijo3 || '',
        fechaNacHijo3: data.fechaNacHijo3 || '',
        hijo4: data.hijo4 || '',
        fechaNacHijo4: data.fechaNacHijo4 || '',
        hijo5: data.hijo5 || '',
        fechaNacHijo5: data.fechaNacHijo5 || '',
        empresa: data.empresa || '',
        cargo: data.cargo || '',
        unidad: data.unidad || '',
        honorarios: data.honorarios || '',
        moneda: data.moneda || '',
        regimen: data.regimen || '',
        actividades: data.actividades || '',
        fechaInicioContrato: data.fechaInicioContrato || '',
        fechaTerminoContrato: data.fechaTerminoContrato || '',
        calce: data.calce || '',
        scanDocumentos: data.scanDocumentos || '',
        estado: data.estado || 'Activo',
      };
      
      const rowIndex = await appendEmpleado(empleadoData);
      return { id: rowIndex, rowIndex, ...empleadoData };
    }),

  extraerConGemini: publicProcedure
    .mutation(async ({ input }: any) => {
      console.log('GEMINI - Input completo:', JSON.stringify(input, null, 2));
      console.log('GEMINI - Input keys:', Object.keys(input || {}));
      console.log('GEMINI - Input type:', typeof input);
      
      let data = input;
      
      if (input && typeof input === 'object') {
        if (input.json) {
          data = input.json;
        } else if (input[0]) {
          data = input[0];
        }
      }
      
      console.log('GEMINI - Data extraida:', JSON.stringify(data, null, 2));
      console.log('GEMINI - Data keys:', Object.keys(data || {}));
      console.log('GEMINI - pdfBase64 presente:', !!data?.pdfBase64);
      console.log('GEMINI - pdfBase64 length:', data?.pdfBase64?.length || 0);
      
      if (!data.pdfBase64 || data.pdfBase64.length < 100) {
        throw new Error('PDF vacio o corrupto. Length: ' + (data.pdfBase64?.length || 0));
      }
      
      if (data.pdfBase64.length > 10000000) {
        throw new Error('PDF demasiado grande. Length: ' + data.pdfBase64.length);
      }
      
      try {
        const datos = await extraerDatosConGemini(data.pdfBase64, data.mimeType || 'application/pdf');
        console.log('GEMINI - Exito');
        return datos;
      } catch (error: any) {
        console.error('GEMINI - Error:', error.message);
        throw new Error('Error Gemini: ' + error.message);
      }
    }),
});
