/**
 * DAME CAÑA v3.2 — Google Apps Script
 * Motor de Integración, Automatización y Análisis de Entrenamiento
 * Alineado con las Especificaciones Técnicas y la Guía de Integración
 */

const CONFIG = Object.freeze({
  OPERATIVO_SPREADSHEET_ID: '1DG0BlWl_qESjCGPRnlkx-olP6aEK2dRKOzzja8rihYM',
  CATALOGOS_SPREADSHEET_ID: '1yQyIg1tpiu8ktKBcAY8wZ3KLYXoHBF4RQ4oiG1K7Cuk',
  ROOT_FOLDER_ID: '1JY0WpBYP6sVNZuoog484kRfSJN7IHlzs',
  TIMEZONE: 'Europe/Madrid',
  INBOX_FOLDER: '01_INBOX_ENTRENAMIENTOS',
  PROCESSED_FOLDER: '02_JSON_PROCESADOS',
  PHOTOS_FOLDER: '03_FOTOS',
  BACKUPS_FOLDER: '04_BACKUPS',
  ARCHIVE_FOLDER: '99_ARCHIVO',
  FORM_TITLE: 'Dame Caña — Registro rápido',
  PRIVACY: Object.freeze({
    INCLUDE_SOURCE_NOTE: false,    // No volcar la nota del entrenador a Sheets por privacidad
    INCLUDE_MOVEMENT_NOTES: true   // Incluir notas de series/molestias para seguimiento
  }),
  SHEETS: Object.freeze({
    CONTEXT: '00_CONTEXTO_ACTUAL',
    STATE: '01_ESTADO_ACTUAL',
    PROGRAM: '02_PROGRAMA_ACTIVO',
    SESSIONS: '03_SESIONES',
    SETS: '04_SERIES',
    CHECKINS: '05_CHECKINS',
    MEASURES: '06_MEDIDAS',
    MACHINES: '07_MAQUINAS_PERSONALES',
    PHOTOS: '08_FOTOS',
    SKIN: '09_PIEL',
    REVIEWS: '10_REVISIONES',
    DECISIONS: '11_DECISIONES',
    PERFORMANCE: '12_RENDIMIENTO',
    PANEL: '13_PANEL',
    IMPORT_LOG: '99_IMPORT_LOG'
  })
});

const SESSION_HEADERS = [
  'session_id','fecha','dia','titulo','finished','record_quality',
  'exercise_count','planned_set_count','recorded_set_count','source_note',
  'exported_at','source_file','source_file_id','imported_at','program_version'
];

const SET_HEADERS = [
  'set_id','session_id','fecha','dia','exercise_order','exercise_name',
  'exercise_id','slot_id','machine_id','variant','machine_settings',
  'load_basis','resistance_mode','set_index','load_kg','reps','rir',
  'per_side','movement_notes','comparability_group','source_file'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dame Caña v3.2')
    .addItem('⚡ Importar JSON ahora (Inbox)', 'scanTrainingInbox')
    .addItem('🔄 Reconstruir contexto actual', 'rebuildCurrentContext')
    .addItem('📈 Recalcular rendimiento (e1RM)', 'rebuildPerformance')
    .addItem('📊 Actualizar Panel de Volumen (13_PANEL)', 'rebuildWeeklyVolumeDashboard')
    .addItem('📋 Generar Prompt para Gemini (Sesión de hoy)', 'generateGeminiPromptDialog')
    .addItem('🤖 Ejecutar Comando del Gem (JSON)', 'showExecuteGemCommandDialog')
    .addItem('🎨 Aplicar Estilo Cuaderno Técnico (Visual)', 'applyCuadernoTecnicoStyling')
    .addItem('🔍 Validar integridad estructural', 'validateIntegrity')
    .addSeparator()
    .addItem('📱 Crear Formulario Rápido (Google Forms)', 'createDameCanaForm')
    .addItem('🔄 Sincronizar catálogo con Formulario', 'syncFormDropdowns')
    .addItem('💾 Crear Backup de Seguridad ahora', 'createWeeklyBackup')
    .addItem('⚙️ Instalar Triggers Automáticos', 'installTriggers')
    .addToUi();
}

function setupDameCana() {
  validateConfiguration_();
  const ss = getOperativoSs_();
  validateWorkbookStructure_(ss);
  ensureFolderStructure_();
  installTriggers();
  rebuildPerformance(ss);
  rebuildWeeklyVolumeDashboard(ss);
  rebuildCurrentContext(ss);
  syncFormDropdowns(ss);
  validateIntegrity(ss);
}

function installTriggers() {
  const handlers = new Set(['scanTrainingInbox', 'validateIntegrity', 'createWeeklyBackup']);
  ScriptApp.getProjectTriggers().forEach(t => {
    if (handlers.has(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);
  });

  ScriptApp.newTrigger('scanTrainingInbox')
    .timeBased()
    .everyMinutes(15)
    .create();

  ScriptApp.newTrigger('validateIntegrity')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .inTimezone(CONFIG.TIMEZONE)
    .create();

  ScriptApp.newTrigger('createWeeklyBackup')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(23)
    .inTimezone(CONFIG.TIMEZONE)
    .create();
}

/**
 * =========================================================================
 * 1. RECEPTOR WEBHOOK / API (doPost)
 * =========================================================================
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    return jsonResponse_({
      status: 'TEMPORARY',
      code: 503,
      message: 'Servidor ocupado procesando otra transacción. Reintentar con espera.'
    });
  }

  try {
    let rawData = e && e.postData ? e.postData.contents : null;
    if (!rawData) {
      return jsonResponse_({
        status: 'VALIDATION',
        code: 400,
        message: 'Cuerpo de la petición POST vacío.'
      });
    }

    // Sanitizar BOM si existe
    if (rawData.charCodeAt(0) === 0xFEFF) rawData = rawData.slice(1);

    let payload;
    try {
      payload = JSON.parse(rawData);
    } catch (parseErr) {
      return jsonResponse_({
        status: 'VALIDATION',
        code: 400,
        message: 'JSON malformado: ' + parseErr.message
      });
    }

    // Autenticación por Secreto en Script Properties si está configurado
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('GOOGLE_SYNC_SECRET');
    if (expectedSecret) {
      if (!payload.auth_token || payload.auth_token !== expectedSecret) {
        return jsonResponse_({
          status: 'FORBIDDEN',
          code: 403,
          message: 'Token de sincronización inválido o ausente.'
        });
      }
    }
    // Eliminar auth_token del payload antes de procesar o guardar
    delete payload.auth_token;

    const ss = getOperativoSs_();
    const eventId = payload.event_id || payload.eventId || '';

    // Idempotencia por event_id
    if (eventId && isEventIdAlreadyImported_(ss, eventId)) {
      return jsonResponse_({
        status: 'DUPLICATE',
        code: 200,
        message: `event_id '${eventId}' ya había sido procesado previamente.`,
        eventId: eventId
      });
    }

    const schema = payload.schema || '';

    // 1. Manejo de Check-in / Medidas / Dolor (schema: checkin.v1)
    if (schema === 'checkin.v1' || payload.type) {
      const checkinResult = processCheckinPayload_(payload, ss, eventId);
      if (checkinResult.status === 'IMPORTED') {
        rebuildCurrentContext(ss);
      }
      return jsonResponse_({
        status: checkinResult.status,
        code: checkinResult.status === 'IMPORTED' ? 200 : 400,
        message: checkinResult.message,
        eventId: eventId,
        recordId: checkinResult.recordId
      });
    }

    // 2. Manejo de Entrenamientos (training_log.v1 o training_history.v1)
    const normalized = normalizeTrainingPayload_(payload);
    if (!normalized.ok) {
      return jsonResponse_({
        status: 'VALIDATION',
        code: 400,
        message: normalized.message
      });
    }

    // Guardar respaldo físico en Inbox antes de procesar
    try {
      const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
      const inbox = getOrCreateChildFolder_(root, CONFIG.INBOX_FOLDER);
      const timeStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
      inbox.createFile(`DIRECT_SYNC_${timeStr}.json`, JSON.stringify(payload, null, 2), 'application/json');
    } catch (driveErr) {
      Logger.log('Aviso al guardar copia en Inbox: ' + driveErr.message);
    }

    const provenance = {
      sourceFile: 'DIRECT_SYNC',
      sourceFileId: eventId || 'WEB_DIRECT',
      sha256: sha256_(Utilities.newBlob(JSON.stringify(payload)).getBytes()),
      eventId: eventId
    };

    const result = importTrainingPayload_(normalized, provenance, ss);
    logImportRecord_(ss, provenance, result);

    if (result.sessionsInserted > 0) {
      rebuildPerformance(ss);
      rebuildWeeklyVolumeDashboard(ss);
      rebuildCurrentContext(ss);
    }

    const statusCode = result.status === 'IMPORTED' ? 200 : result.status === 'DUPLICATE' ? 200 : 400;
    return jsonResponse_({
      status: result.status,
      code: statusCode,
      message: result.message,
      eventId: eventId,
      sessionsInserted: result.sessionsInserted,
      setsInserted: result.setsInserted
    });

  } catch (err) {
    return jsonResponse_({
      status: 'TEMPORARY',
      code: 500,
      message: 'Error interno en Apps Script: ' + err.message
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * =========================================================================
 * 2. NÚCLEO DE IMPORTACIÓN UNIFICADO (importTrainingPayload_)
 * =========================================================================
 */
function importTrainingPayload_(normalized, provenance, ss) {
  const sessionSheet = ss.getSheetByName(CONFIG.SHEETS.SESSIONS);
  const setSheet = ss.getSheetByName(CONFIG.SHEETS.SETS);
  const existingSessionIds = readIdSet_(sessionSheet, 1);
  const existingSetIds = readIdSet_(setSheet, 1);

  const sessionRows = [];
  const setRows = [];
  const importedAt = new Date();
  const programVersion = getActiveProgramVersion_(ss);

  // Validación atómica preliminar
  for (let i = 0; i < normalized.sessions.length; i++) {
    const s = normalized.sessions[i].session || {};
    if (s.id && existingSessionIds.has(String(s.id))) {
      // Si la sesión ya existe exactamente
      continue;
    }

    const day = deriveDay_(s);
    const date = parseDateOrBlank_(s.date);
    const exercises = normalized.sessions[i].exercises || [];

    const sourceNote = CONFIG.PRIVACY.INCLUDE_SOURCE_NOTE ? sanitizeFormula_(s.source_note || '') : '';

    sessionRows.push([
      String(s.id),
      date,
      day,
      sanitizeFormula_(s.title || ''),
      Boolean(s.finished),
      sanitizeFormula_(s.record_quality || ''),
      numberOrBlank_(s.exercise_count),
      numberOrBlank_(s.planned_set_count),
      numberOrBlank_(s.recorded_set_count),
      sourceNote,
      parseDateOrBlank_(normalized.sessions[i].exported_at || normalized.exportedAt),
      provenance.sourceFile || 'DIRECT_SYNC',
      provenance.sourceFileId || '',
      importedAt,
      programVersion
    ]);

    exercises.forEach((exercise, exIdx) => {
      const identity = exercise.identity || {};
      const prescription = exercise.prescription || {};
      const result = exercise.result || {};
      const sets = result.sets || [];

      sets.forEach((setObj, setIdx) => {
        const setId = `${s.id}__E${exercise.index || (exIdx + 1)}__S${setObj.index || (setIdx + 1)}`;
        if (existingSetIds.has(setId)) return;

        const movNotes = CONFIG.PRIVACY.INCLUDE_MOVEMENT_NOTES ? sanitizeFormula_(result.movement_notes || '') : '';

        // Autocarga / TRX: Si no hay kilos explícitos, dejar vacío, nunca 0 inventado
        let loadKgVal = numberOrBlank_(setObj.load_kg);
        if (identity.load_basis === 'bodyweight' && (loadKgVal === 0 || loadKgVal === '0')) {
          loadKgVal = '';
        }

        setRows.push([
          setId,
          String(s.id),
          date,
          day,
          numberOrBlank_(exercise.index || (exIdx + 1)),
          sanitizeFormula_(exercise.name || ''),
          sanitizeFormula_(exercise.exercise_id || ''),
          sanitizeFormula_(exercise.slot_id || ''),
          sanitizeFormula_(exercise.machine_id || ''),
          sanitizeFormula_(identity.variant || ''),
          sanitizeFormula_(identity.machine_settings || ''),
          sanitizeFormula_(identity.load_basis || ''),
          sanitizeFormula_(identity.resistance_mode || (setObj.resistance && setObj.resistance.mode) || ''),
          numberOrBlank_(setObj.index || (setIdx + 1)),
          loadKgVal,
          numberOrBlank_(setObj.reps),
          normalizeRir_(setObj.rir),
          Boolean(prescription.per_side),
          movNotes,
          sanitizeFormula_(exercise.comparability_group || ''),
          provenance.sourceFile || 'DIRECT_SYNC'
        ]);
      });
    });
  }

  if (sessionRows.length > 0) {
    appendRows_(sessionSheet, sessionRows);
    appendRows_(setSheet, setRows);
    return {
      status: 'IMPORTED',
      sessionsSeen: normalized.sessions.length,
      sessionsInserted: sessionRows.length,
      setsInserted: setRows.length,
      message: `Importación completada: ${sessionRows.length} sesiones y ${setRows.length} series añadidas.`
    };
  }

  return {
    status: 'DUPLICATE',
    sessionsSeen: normalized.sessions.length,
    sessionsInserted: 0,
    setsInserted: 0,
    message: 'Todas las sesiones ya existían en el libro (session_id duplicado).'
  };
}

/**
 * =========================================================================
 * 3. PROCESAMIENTO DE CHECK-IN Y MEDIDAS (checkin.v1)
 * =========================================================================
 */
function processCheckinPayload_(payload, ss, eventId) {
  const now = new Date();
  const date = parseDateOrBlank_(payload.date) || now;
  const timeStr = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
  const recordId = `CHK-${timeStr}`;

  let checkinWritten = false;
  let measuresWritten = false;

  // 1. Escritura en 05_CHECKINS si hay datos de recuperación/sueño/dolor
  const hasCheckinData = payload.sleep_hours !== undefined || payload.sleep_quality !== undefined ||
    payload.fatigue !== undefined || payload.soreness_glute !== undefined || payload.pain_lumbar !== undefined ||
    payload.pain_shoulder !== undefined || payload.appetite_energy !== undefined || payload.notes;

  if (hasCheckinData) {
    const weekStart = monday_(date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CHECKINS);

    sheet.appendRow([
      recordId,
      date,
      weekStart,
      weekEnd,
      '', '', '', '', '', // campos de plan previstos
      numberOrBlank_(payload.sleep_hours),
      numberOrBlank_(payload.sleep_quality),
      '', // horas sueño target
      numberOrBlank_(payload.fatigue),
      numberOrBlank_(payload.soreness_glute),
      numberOrBlank_(payload.pain_lumbar),
      numberOrBlank_(payload.pain_shoulder),
      numberOrBlank_(payload.appetite_energy),
      sanitizeFormula_(payload.nutrition_changes || ''),
      '', // adherencia
      sanitizeFormula_(payload.notes || ''),
      '', // decision
      'App Sites'
    ]);
    checkinWritten = true;
  }

  // 2. Escritura en 06_MEDIDAS solo si existen medidas reales (peso o tomas de perímetro)
  const hasMeasureData = (payload.weight_avg && Number(payload.weight_avg) > 0) ||
    (payload.waist_1 || payload.hip_1);

  if (hasMeasureData) {
    const sheetMeasures = ss.getSheetByName(CONFIG.SHEETS.MEASURES);
    const c1 = numberOrBlank_(payload.waist_1);
    const c2 = numberOrBlank_(payload.waist_2);
    const c3 = numberOrBlank_(payload.waist_3);
    const h1 = numberOrBlank_(payload.hip_1);
    const h2 = numberOrBlank_(payload.hip_2);
    const h3 = numberOrBlank_(payload.hip_3);
    const waist = closestPairMean_([c1, c2, c3]);
    const hip = closestPairMean_([h1, h2, h3]);
    const waistDiff = rangeDiff_([c1, c2, c3]);
    const hipDiff = rangeDiff_([h1, h2, h3]);
    const ratio = (waist !== '' && hip !== '' && waist > 0) ? (hip / waist) : '';

    sheetMeasures.appendRow([
      `MED-${timeStr}`,
      date,
      'App Sites',
      numberOrBlank_(payload.weight_avg),
      numberOrBlank_(payload.weight_count || 1),
      c1, c2, c3, waist, waistDiff,
      h1, h2, h3, hip, hipDiff,
      ratio,
      '', '', '', '', // BIA fields (se dejan vacíos, pertenecen a otra fuente)
      'App Sites',
      sanitizeFormula_(payload.measure_notes || payload.notes || '')
    ]);
    measuresWritten = true;
  }

  // Auditoría en 99_IMPORT_LOG
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG);
  logSheet.appendRow([
    now,
    eventId || recordId,
    'DIRECT_CHECKIN',
    '',
    'checkin.v1',
    date,
    1,
    checkinWritten ? 1 : 0,
    measuresWritten ? 1 : 0,
    (checkinWritten || measuresWritten) ? 'IMPORTED' : 'EMPTY_PAYLOAD',
    `Checkin: ${checkinWritten ? 'SI' : 'NO'} | Medidas: ${measuresWritten ? 'SI' : 'NO'}`
  ]);

  return {
    status: (checkinWritten || measuresWritten) ? 'IMPORTED' : 'VALIDATION',
    recordId: recordId,
    message: `Registro completado. Checkin: ${checkinWritten ? 'Guardado' : 'Omitido'} | Medidas: ${measuresWritten ? 'Guardado' : 'Omitido'}`
  };
}

/**
 * =========================================================================
 * 4. ESCANEO DE INBOX EN DRIVE (scanTrainingInbox)
 * =========================================================================
 */
function scanTrainingInbox() {
  validateConfiguration_();
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
    const inbox = getOrCreateChildFolder_(root, CONFIG.INBOX_FOLDER);
    const processed = getOrCreateChildFolder_(root, CONFIG.PROCESSED_FOLDER);
    const files = inbox.getFiles();

    let anyImported = false;
    const ss = getOperativoSs_();

    while (files.hasNext()) {
      const file = files.next();
      if (!/\.json$/i.test(file.getName())) continue;

      let text = file.getBlob().getDataAsString('UTF-8');
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const sha256 = sha256_(file.getBlob().getBytes());

      if (isHashAlreadyImported_(ss, sha256)) {
        file.moveTo(processed);
        continue;
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch (e) {
        logImportRecord_(ss, { sourceFile: file.getName(), sourceFileId: file.getId(), sha256: sha256 }, { status: 'INVALID_JSON', message: e.message, sessionsSeen: 0, sessionsInserted: 0, setsInserted: 0 });
        continue;
      }

      const normalized = normalizeTrainingPayload_(payload);
      if (!normalized.ok) {
        logImportRecord_(ss, { sourceFile: file.getName(), sourceFileId: file.getId(), sha256: sha256 }, { status: 'UNSUPPORTED_SCHEMA', message: normalized.message, sessionsSeen: 0, sessionsInserted: 0, setsInserted: 0 });
        continue;
      }

      const provenance = {
        sourceFile: file.getName(),
        sourceFileId: file.getId(),
        sha256: sha256
      };

      const result = importTrainingPayload_(normalized, provenance, ss);
      logImportRecord_(ss, provenance, result);

      if (result.status === 'IMPORTED' || result.status === 'DUPLICATE') {
        file.moveTo(processed);
      }
      if (result.sessionsInserted > 0) anyImported = true;
    }

    if (anyImported) {
      rebuildPerformance(ss);
      rebuildWeeklyVolumeDashboard(ss);
      rebuildCurrentContext(ss);
    }
  } finally {
    lock.releaseLock();
  }
}

/**
 * =========================================================================
 * 5. DERIVADOS Y CUADROS DE MANDO
 * =========================================================================
 */
function rebuildCurrentContext(ssOpt) {
  validateConfiguration_();
  const ss = ssOpt || getOperativoSs_();
  const context = ss.getSheetByName(CONFIG.SHEETS.CONTEXT);
  const sessions = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SESSIONS));
  const state = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.STATE));
  const program = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.PROGRAM));
  const measures = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.MEASURES));
  const machines = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.MACHINES));

  const finished = sessions.filter(r => truthy_(r.finished) && r.fecha);
  finished.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const last = finished.length ? finished[finished.length - 1] : null;

  const lastABC = [...finished].reverse().find(r => ['A','B','C'].includes(String(r.dia || '').toUpperCase()));
  const nextDay = lastABC ? nextABC_(String(lastABC.dia).toUpperCase()) : 'A';

  const activeProgramRows = program.filter(r => String(r.estado || '').toUpperCase() === 'ACTIVO');
  const programVersion = activeProgramRows.length ? activeProgramRows[0].program_version : 'v3';

  const activeRestrictions = state
    .filter(r => ['ACTIVA','CONFIRMADO_ACTUAL','VIGENTE'].includes(String(r.estado || '').toUpperCase()))
    .filter(r => /dolor|restric|lumbar|cadera|rodilla|hombro/i.test(`${r.categoria || ''} ${r.clave || ''}`))
    .map(r => `${r.clave}: ${r.valor}`)
    .join(' · ') || 'Ninguna restricción activa.';

  const latestMeasure = measures
    .filter(r => r.fecha)
    .sort((a,b) => new Date(a.fecha) - new Date(b.fecha))
    .slice(-1)[0];

  const unvalidatedDeep = machines.filter(r =>
    /alta flexión bilateral|sentadilla|squat/i.test(`${r.familia_slot || ''} ${r.nombre_visible_estacion || ''}`) &&
    !/VALIDADA/i.test(String(r.estado || ''))
  ).length;

  const rows = [
    ['clave','valor','fuente','actualizado_at'],
    ['sistema','Dame Caña Gemini Workspace v3.2','sistema',new Date()],
    ['program_version',programVersion,CONFIG.SHEETS.PROGRAM,new Date()],
    ['ultima_sesion_fecha',last ? last.fecha : '',CONFIG.SHEETS.SESSIONS,new Date()],
    ['ultima_sesion_id',last ? last.session_id : '',CONFIG.SHEETS.SESSIONS,new Date()],
    ['ultima_sesion_titulo',last ? last.titulo : '',CONFIG.SHEETS.SESSIONS,new Date()],
    ['ultimo_dia_abc',lastABC ? lastABC.dia : '',CONFIG.SHEETS.SESSIONS,new Date()],
    ['siguiente_dia_derivado',nextDay,'secuencia A→B→C',new Date()],
    ['restricciones_salud_activas',activeRestrictions,CONFIG.SHEETS.STATE,new Date()],
    ['ultima_medida_fecha',latestMeasure ? latestMeasure.fecha : '',CONFIG.SHEETS.MEASURES,new Date()],
    ['peso_medio_ultimo',latestMeasure ? (latestMeasure.peso_medio_kg || '') : '',CONFIG.SHEETS.MEASURES,new Date()],
    ['maquinas_profundas_pendientes',unvalidatedDeep,CONFIG.SHEETS.MACHINES,new Date()],
    ['regla_comparabilidad','No transferir cargas sin variante/ajustes/load_basis/comparability_group compatibles.','DOC_2 + 07_MAQUINAS_PERSONALES',new Date()],
    ['regla_salida_sesion','Usar Note v1.','DOC_1',new Date()]
  ];

  context.clearContents();
  context.getRange(1,1,rows.length,rows[0].length).setValues(rows);
  context.setFrozenRows(1);
  context.autoResizeColumns(1, rows[0].length);
}

function rebuildPerformance(ssOpt) {
  validateConfiguration_();
  const ss = ssOpt || getOperativoSs_();
  const setRows = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SETS));
  const target = ss.getSheetByName(CONFIG.SHEETS.PERFORMANCE);

  const groups = new Map();
  setRows.forEach(r => {
    const explicitGroup = String(r.comparability_group || '').trim();
    const fallback = `NO_VALIDADO|${r.exercise_name || ''}|${r.variant || ''}|${r.load_basis || ''}`;
    const key = explicitGroup || fallback;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  const headers = [
    'comparability_group','exercise_name','variant','machine_id','load_basis',
    'comparable','exposures','first_date','last_date','last_best_set',
    'e1rm_last','e1rm_best','trend','next_action','notes'
  ];
  const out = [headers];

  groups.forEach((rows, key) => {
    rows.sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
    const dates = [...new Set(rows.map(r => String(r.fecha)).filter(Boolean))];
    const lastDate = dates.length ? dates[dates.length - 1] : '';
    const lastRows = rows.filter(r => String(r.fecha) === lastDate);
    const comparable = !key.startsWith('NO_VALIDADO|');

    const scored = rows.map(r => ({row:r, e1:e1rm_(r)})).filter(x => x.e1 !== null);
    const lastScored = lastRows.map(r => ({row:r, e1:e1rm_(r)})).filter(x => x.e1 !== null);
    const bestOverall = scored.length ? scored.reduce((a,b) => b.e1 > a.e1 ? b : a) : null;
    const bestLast = lastScored.length ? lastScored.reduce((a,b) => b.e1 > a.e1 ? b : a) : null;

    const representative = lastRows[0] || rows[rows.length - 1];
    const bestSetText = bestLast ? describeSet_(bestLast.row) : describeSet_(representative);

    let trend = 'PENDIENTE';
    if (comparable && dates.length >= 2 && scored.length >= 2) {
      const firstDate = dates[0];
      const firstBest = rows.filter(r => String(r.fecha) === firstDate)
        .map(r => e1rm_(r)).filter(x => x !== null);
      const lastBest = lastScored.map(x => x.e1);
      if (firstBest.length && lastBest.length) {
        const delta = Math.max(...lastBest) - Math.max(...firstBest);
        trend = delta > 1 ? 'AL_ALZA' : delta < -1 ? 'A_LA_BAJA' : 'ESTABLE';
      }
    }

    out.push([
      key,
      representative.exercise_name || '',
      representative.variant || '',
      representative.machine_id || '',
      representative.load_basis || '',
      comparable ? 'SI' : 'NO',
      dates.length,
      dates[0] || '',
      lastDate,
      bestSetText,
      bestLast ? bestLast.e1 : '',
      bestOverall ? bestOverall.e1 : '',
      trend,
      comparable ? 'Aplicar doble progresión si técnica/RIR/ROM son consistentes.' : 'Completar identidad, ajustes y comparability_group.',
      comparable ? '' : 'Grupo provisional: no declarar tendencia entre exposiciones.'
    ]);
  });

  target.clearContents();
  target.getRange(1,1,out.length,out[0].length).setValues(out);
  target.setFrozenRows(1);
  target.autoResizeColumns(1, out[0].length);
}

/**
 * Reconstrucción del Panel de Volumen (Corregido RISK-03: Regenera las 11 cabeceras exactas)
 */
function rebuildWeeklyVolumeDashboard(ssOpt) {
  validateConfiguration_();
  const ss = ssOpt || getOperativoSs_();
  const setRows = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SETS));
  const panelSheet = ss.getSheetByName(CONFIG.SHEETS.PANEL);

  const weeklyVolumeMap = new Map();

  setRows.forEach(r => {
    if (!r.fecha) return;
    const date = new Date(r.fecha);
    if (isNaN(date.getTime())) return;

    const weekKey = getWeekLabel_(date);
    const category = categorizeMuscleGroup_(r.exercise_name || '');

    if (!weeklyVolumeMap.has(weekKey)) {
      weeklyVolumeMap.set(weekKey, {
        'Glúteo (Prioritario)': 0,
        'Cuádriceps': 0,
        'Isquios / Cadena Posterior': 0,
        'Espalda / Fracción': 0,
        'Pecho / Empuje': 0,
        'Hombro / Deltoides': 0,
        'Brazos': 0,
        'Otros': 0,
        'Total Series': 0
      });
    }

    const weekData = weeklyVolumeMap.get(weekKey);
    weekData[category] = (weekData[category] || 0) + 1;
    weekData['Total Series']++;
  });

  const headers = [
    'Semana','Glúteo (Prioridad)','Cuádriceps','Isquios/Posterior',
    'Espalda','Pecho','Hombro','Brazos','Otros','Total Series Efectivas','Adherencia Prioridad Glútea'
  ];
  const rows = [headers];

  const sortedWeeks = [...weeklyVolumeMap.keys()].sort();
  sortedWeeks.forEach(w => {
    const d = weeklyVolumeMap.get(w);
    const gluteRatio = d['Total Series'] > 0 ? (d['Glúteo (Prioritario)'] / d['Total Series']) : 0;
    const status = gluteRatio >= 0.20 ? '✅ EXCELENTE (>20%)' : gluteRatio >= 0.12 ? '⚠️ ADECUADO' : '🔴 BAJO';

    rows.push([
      w,
      d['Glúteo (Prioritario)'],
      d['Cuádriceps'],
      d['Isquios / Cadena Posterior'],
      d['Espalda / Fracción'],
      d['Pecho / Empuje'],
      d['Hombro / Deltoides'],
      d['Brazos'],
      d['Otros'],
      d['Total Series'],
      status
    ]);
  });

  panelSheet.clearContents();
  panelSheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  panelSheet.setFrozenRows(1);
  panelSheet.autoResizeColumns(1, rows[0].length);
}

function createWeeklyBackup() {
  validateConfiguration_();
  const ss = getOperativoSs_();
  const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  const backupFolder = getOrCreateChildFolder_(root, CONFIG.BACKUPS_FOLDER);

  const backupData = {
    system: 'Dame Caña v3.2 Backup',
    timestamp: new Date().toISOString(),
    context: getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.CONTEXT)),
    state: getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.STATE)),
    program: getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.PROGRAM)),
    sessions: getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SESSIONS)),
    sets: getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SETS)),
    measures: getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.MEASURES))
  };

  const fileName = `DAME_CANA_BACKUP_${Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss')}.json`;
  backupFolder.createFile(fileName, JSON.stringify(backupData, null, 2), 'application/json');
  Logger.log(`Backup creado correctamente: ${fileName}`);
}

/**
 * =========================================================================
 * 6. GOOGLE FORMS (Corregidos RISK-01 y RISK-02)
 * =========================================================================
 */
function createDameCanaForm() {
  validateConfiguration_();

  const form = FormApp.create(CONFIG.FORM_TITLE, true)
    .setDescription('DAME CAÑA · Cuaderno Técnico de Fuerza\nRegistro rápido de baja fricción. Elige una sección y completa solo su bloque.')
    .setConfirmationMessage('✓ Registro asentado en el Cuaderno Técnico. Apps Script procesará los datos automáticamente.')
    .setShowLinkToRespondAgain(true)
    .setProgressBar(true);

  const type = form.addMultipleChoiceItem()
    .setTitle('Tipo de registro')
    .setRequired(true);

  const pCheck = form.addPageBreakItem().setTitle('01 / SUEÑO Y RECUPERACIÓN');
  form.addDateItem().setTitle('Fecha check-in').setRequired(true);
  form.addScaleItem().setTitle('Calidad sueño 1–5').setBounds(1,5);
  form.addTextItem().setTitle('Sueño medio h');
  form.addScaleItem().setTitle('Fatiga 1–5').setBounds(1,5);
  form.addScaleItem().setTitle('Apetito/energía 1–5').setBounds(1,5);
  form.addScaleItem().setTitle('Agujetas glúteo 0–10').setBounds(0,10);
  form.addScaleItem().setTitle('Dolor lumbar 0–10').setBounds(0,10);
  form.addScaleItem().setTitle('Dolor hombro derecho 0–10').setBounds(0,10);
  form.addParagraphTextItem().setTitle('Cambios nutrición/actividad');
  form.addParagraphTextItem().setTitle('Notas check-in');

  const pMeasures = form.addPageBreakItem().setTitle('02 / PESO Y MEDIDAS');
  form.addDateItem().setTitle('Fecha medidas').setRequired(true);
  form.addTextItem().setTitle('Peso medio matutino kg');
  form.addTextItem().setTitle('n pesos');
  form.addTextItem().setTitle('Cintura 1 cm');
  form.addTextItem().setTitle('Cintura 2 cm');
  form.addTextItem().setTitle('Cintura 3 cm');
  form.addTextItem().setTitle('Cadera/glúteo 1 cm');
  form.addTextItem().setTitle('Cadera/glúteo 2 cm');
  form.addTextItem().setTitle('Cadera/glúteo 3 cm');
  form.addParagraphTextItem().setTitle('Notas medidas');

  const pMachine = form.addPageBreakItem().setTitle('03 / MÁQUINA NUEVA O AJUSTES');
  form.addDateItem().setTitle('Fecha máquina').setRequired(true);
  form.addTextItem().setTitle('machine_id');
  form.addTextItem().setTitle('Familia/slot').setRequired(true);
  form.addTextItem().setTitle('Nombre visible / estación').setRequired(true);
  form.addTextItem().setTitle('Marca/modelo');
  form.addTextItem().setTitle('Tipo carga');
  form.addTextItem().setTitle('load_basis');
  form.addParagraphTextItem().setTitle('Ajustes reproducibles');
  form.addParagraphTextItem().setTitle('ROM / pies / manos / limitante / sensación');
  form.addParagraphTextItem().setTitle('Próxima acción máquina');

  const pIncident = form.addPageBreakItem().setTitle('04 / DOLOR O INCIDENCIA');
  form.addDateItem().setTitle('Fecha incidencia').setRequired(true);
  form.addTextItem().setTitle('Zona').setRequired(true);
  form.addScaleItem().setTitle('Intensidad 0–10').setBounds(0,10).setRequired(true);
  form.addParagraphTextItem().setTitle('Descripción / qué lo provoca').setRequired(true);
  form.addParagraphTextItem().setTitle('Restricción actual');

  const pReview = form.addPageBreakItem().setTitle('05 / REVISIÓN ~28 DÍAS');
  form.addDateItem().setTitle('Fecha revisión').setRequired(true);
  form.addParagraphTextItem().setTitle('Periodo');
  form.addParagraphTextItem().setTitle('Lectura visual / regiones');
  form.addParagraphTextItem().setTitle('Piel');
  form.addParagraphTextItem().setTitle('Notas revisión');

  type.setChoices([
    type.createChoice('01 / SUEÑO Y RECUPERACIÓN', pCheck),
    type.createChoice('02 / PESO Y MEDIDAS', pMeasures),
    type.createChoice('03 / MÁQUINA NUEVA O AJUSTES', pMachine),
    type.createChoice('04 / DOLOR O INCIDENCIA', pIncident),
    type.createChoice('05 / REVISIÓN ~28 DÍAS', pReview)
  ]);

  // CORREGIDO RISK-02: Todas las páginas terminan en SUBMIT explícito
  pCheck.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pMeasures.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pMachine.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pIncident.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pReview.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pMachine.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pIncident.setGoToPage(FormApp.PageNavigationType.SUBMIT);
  pReview.setGoToPage(FormApp.PageNavigationType.SUBMIT);

  ScriptApp.newTrigger('onDameCanaFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  PropertiesService.getScriptProperties().setProperty('DAME_CANA_FORM_ID', form.getId());
  Logger.log(`Formulario creado: ${form.getEditUrl()}`);
  Logger.log(`URL de respuesta: ${form.getPublishedUrl()}`);
  return form.getPublishedUrl();
}

function onDameCanaFormSubmit(e) {
  const map = {};
  e.response.getItemResponses().forEach(ir => {
    map[ir.getItem().getTitle()] = ir.getResponse();
  });

  const type = String(map['Tipo de registro'] || '');
  const ss = getOperativoSs_();
  const now = new Date();

  if (type === 'Check-in semanal') {
    const date = parseDateOrBlank_(map['Fecha check-in']) || now;
    const weekStart = monday_(date);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.CHECKINS);
    sheet.appendRow([
      `CHK-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`,
      date, weekStart, weekEnd,
      '', '', '', '', '',
      numberOrBlank_(map['Sueño medio h']),
      numberOrBlank_(map['Calidad sueño 1–5']),
      '', numberOrBlank_(map['Fatiga 1–5']),
      numberOrBlank_(map['Agujetas glúteo 0–10']),
      numberOrBlank_(map['Dolor lumbar 0–10']),
      numberOrBlank_(map['Dolor hombro derecho 0–10']),
      numberOrBlank_(map['Apetito/energía 1–5']),
      sanitizeFormula_(map['Cambios nutrición/actividad'] || ''),
      '', sanitizeFormula_(map['Notas check-in'] || ''), '', 'Google Form'
    ]);
  } else if (type === 'Medidas') {
    appendMeasuresFromForm_(ss, map, now);
  } else if (type === 'Máquina nueva / actualización') {
    appendMachineFromForm_(ss, map, now);
  } else if (type === 'Dolor / incidencia') {
    appendIncidentFromForm_(ss, map, now);
  } else if (type === 'Revisión ~28 días') {
    appendReviewFromForm_(ss, map, now);
  }

  rebuildCurrentContext(ss);
}

function appendMeasuresFromForm_(ss, map, now) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MEASURES);
  const c1 = numberOrBlank_(map['Cintura 1 cm']);
  const c2 = numberOrBlank_(map['Cintura 2 cm']);
  const c3 = numberOrBlank_(map['Cintura 3 cm']);
  const h1 = numberOrBlank_(map['Cadera/glúteo 1 cm']);
  const h2 = numberOrBlank_(map['Cadera/glúteo 2 cm']);
  const h3 = numberOrBlank_(map['Cadera/glúteo 3 cm']);
  const waist = closestPairMean_([c1,c2,c3]);
  const hip = closestPairMean_([h1,h2,h3]);

  sheet.appendRow([
    `MED-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`,
    parseDateOrBlank_(map['Fecha medidas']) || now,
    'Google Form',
    numberOrBlank_(map['Peso medio matutino kg']),
    numberOrBlank_(map['n pesos']),
    c1,c2,c3,waist,rangeDiff_([c1,c2,c3]),
    h1,h2,h3,hip,rangeDiff_([h1,h2,h3]),
    (waist !== '' && hip !== '') ? hip/waist : '',
    '', '', '', '',
    'Google Form',
    sanitizeFormula_(map['Notas medidas'] || '')
  ]);
}

/**
 * CORREGIDO RISK-01: Exactamente 22 valores para las 22 columnas de 07_MAQUINAS_PERSONALES
 */
function appendMachineFromForm_(ss, map, now) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.MACHINES);
  const id = String(map['machine_id'] || '').trim() ||
    `MACH-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`;

  sheet.appendRow([
    sanitizeFormula_(id),                                       // 1. machine_id
    '',                                                        // 2. subslot_id
    'Habitual',                                                // 3. categoria_uso
    sanitizeFormula_(map['Familia/slot'] || ''),               // 4. familia_slot
    sanitizeFormula_(map['Nombre visible / estación'] || ''),   // 5. nombre_visible_estacion
    sanitizeFormula_(map['Marca/modelo'] || ''),               // 6. marca_modelo
    sanitizeFormula_(map['Tipo carga'] || ''),                 // 7. tipo_carga
    sanitizeFormula_(map['load_basis'] || ''),                 // 8. load_basis
    sanitizeFormula_(map['Ajustes reproducibles'] || ''),      // 9. ajustes_reproducibles
    sanitizeFormula_(map['ROM / pies / manos / limitante / sensación'] || ''), // 10. rom_sensacion_limitante
    '',                                                        // 11. ratio_estimado
    'PENDIENTE_VALIDACION',                                    // 12. estado
    parseDateOrBlank_(map['Fecha máquina']) || now,            // 13. actualizado_en
    'Formulario',                                              // 14. fuente_actualizacion
    '',                                                        // 15. peso_por_lado
    '',                                                        // 16. peso_por_bloque_selector
    '',                                                        // 17. rango_peso_util_kg
    '',                                                        // 18. distribucion_resistencia
    'NO HASTA VALIDAR',                                        // 19. sustituto_directo_de
    '',                                                        // 20. comparability_group_personal
    '',                                                        // 21. notas_tecnicas_analista
    sanitizeFormula_(map['Próxima acción máquina'] || '')      // 22. proxima_accion_recomendada
  ]);
}

function appendIncidentFromForm_(ss, map, now) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.STATE);
  sheet.appendRow([
    `INC-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`,
    parseDateOrBlank_(map['Fecha incidencia']) || now,
    'SALUD_DINAMICA',
    sanitizeFormula_(`Dolor/incidencia — ${map['Zona'] || ''}`),
    sanitizeFormula_(`${map['Intensidad 0–10'] || ''}/10 · ${map['Descripción / qué lo provoca'] || ''}`),
    'ACTIVA_HASTA_REVISAR',
    'ALTA',
    'Google Form',
    sanitizeFormula_(map['Restricción actual'] || '')
  ]);
}

function appendReviewFromForm_(ss, map, now) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.REVIEWS);
  sheet.appendRow([
    `REV-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`,
    parseDateOrBlank_(map['Fecha revisión']) || now,
    sanitizeFormula_(map['Periodo'] || ''),
    '', '', '', '', '', '', '', '', '',
    '', '', '', '', '',
    sanitizeFormula_(map['Lectura visual / regiones'] || ''),
    '', sanitizeFormula_(map['Piel'] || ''),
    '', '', '', sanitizeFormula_(map['Notas revisión'] || '')
  ]);
}

function syncFormDropdowns(ssOpt) {
  validateConfiguration_();
  const formId = PropertiesService.getScriptProperties().getProperty('DAME_CANA_FORM_ID');
  if (!formId) return;

  try {
    const form = FormApp.openById(formId);
    const ss = ssOpt || getOperativoSs_();
    const machines = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.MACHINES));

    const machineChoices = machines
      .filter(m => m.nombre_visible_estacion || m.machine_id)
      .map(m => `${m.nombre_visible_estacion || m.machine_id} (${m.familia_slot || 'Genérica'})`);

    if (!machineChoices.length) return;

    form.getItems(FormApp.ItemType.TEXT).forEach(item => {
      if (item.getTitle() === 'machine_id' || item.getTitle().includes('Máquina')) {
        item.setHelpText(`Máquinas registradas activas: ${machineChoices.slice(-5).join(', ')}`);
      }
    });
    Logger.log('Formulario sincronizado con el catálogo de máquinas.');
  } catch (err) {
    Logger.log(`Aviso en syncFormDropdowns: ${err.message}`);
  }
}

function generateGeminiPromptDialog() {
  const ss = getOperativoSs_();
  const contextRows = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.CONTEXT));

  let nextDay = 'A';
  let lastSession = 'Ninguna';
  let restrictions = 'Ninguna';

  contextRows.forEach(r => {
    if (r.clave === 'siguiente_dia_derivado') nextDay = r.valor || 'A';
    if (r.clave === 'ultima_sesion_titulo') lastSession = r.valor || 'Sin título';
    if (r.clave === 'restricciones_salud_activas') restrictions = r.valor || 'Ninguna';
  });

  const promptText = `Dame la sesión de hoy (Día ${nextDay}).\nContexto: Última sesión realizada "${lastSession}". Restricciones activas: ${restrictions}. Devuelve exclusivamente la Note v1 para copiar en la app de entrenamiento.`;

  const htmlOutput = HtmlService.createHtmlOutput(
    `<p style="font-family: sans-serif;">Copia este texto para pegarlo en tu Gem <b>Dame Caña v3</b>:</p>` +
    `<textarea style="width:100%; height:120px; font-family: monospace;" id="pText">${promptText}</textarea>` +
    `<button onclick="document.getElementById('pText').select(); document.execCommand('copy'); alert('¡Copiado al portapapeles!');" style="margin-top:10px; padding:8px 16px; background:#4CAF50; color:white; border:none; border-radius:4px; cursor:pointer;">📋 Copiar Prompt</button>`
  ).setWidth(450).setHeight(220);

  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Prompt Sesión de Hoy');
}

function validateIntegrity(ssOpt) {
  validateConfiguration_();
  const ss = ssOpt || getOperativoSs_();
  const issues = [];

  checkDuplicates_(ss.getSheetByName(CONFIG.SHEETS.SESSIONS), 'session_id', issues);
  checkDuplicates_(ss.getSheetByName(CONFIG.SHEETS.SETS), 'set_id', issues);

  const sessionIds = new Set(getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SESSIONS)).map(r => String(r.session_id)));
  getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SETS)).forEach(r => {
    if (r.session_id && !sessionIds.has(String(r.session_id))) {
      issues.push(`Serie huérfana: ${r.set_id} → ${r.session_id}`);
    }
  });

  const activeVersions = new Set(
    getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.PROGRAM))
      .filter(r => String(r.estado || '').toUpperCase() === 'ACTIVO')
      .map(r => String(r.program_version || ''))
      .filter(Boolean)
  );
  if (activeVersions.size > 1) issues.push(`Más de una program_version ACTIVA: ${[...activeVersions].join(', ')}`);

  const logSheet = ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG);
  logSheet.appendRow([
    new Date(),'SYSTEM_VALIDATION','','','','',0,0,0,
    issues.length ? 'INTEGRITY_WARNING' : 'INTEGRITY_OK',
    issues.length ? issues.join(' | ') : 'Sin incidencias estructurales detectadas.'
  ]);

  return issues;
}

/**
 * =========================================================================
 * 7. FUNCIONES AUXILIARES (HELPERS & SANITIZACIÓN)
 * =========================================================================
 */
function getOperativoSs_() {
  return SpreadsheetApp.openById(CONFIG.OPERATIVO_SPREADSHEET_ID);
}

function validateConfiguration_() {
  ['OPERATIVO_SPREADSHEET_ID','CATALOGOS_SPREADSHEET_ID','ROOT_FOLDER_ID'].forEach(k => {
    if (!CONFIG[k] || /^REEMPLAZAR_/.test(CONFIG[k])) {
      throw new Error(`Configura CONFIG.${k} antes de ejecutar.`);
    }
  });
}

function validateWorkbookStructure_(ss) {
  Object.values(CONFIG.SHEETS).forEach(name => {
    if (!ss.getSheetByName(name)) throw new Error(`Falta la pestaña operativa: ${name}`);
  });
}

function ensureFolderStructure_() {
  const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  [CONFIG.INBOX_FOLDER,CONFIG.PROCESSED_FOLDER,CONFIG.PHOTOS_FOLDER,
   CONFIG.BACKUPS_FOLDER,CONFIG.ARCHIVE_FOLDER]
    .forEach(name => getOrCreateChildFolder_(root, name));
}

function getOrCreateChildFolder_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function isHashAlreadyImported_(ss, hash) {
  const sheet = ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG);
  if (sheet.getLastRow() < 2) return false;
  const values = sheet.getRange(2,4,sheet.getLastRow()-1,1).getValues().flat();
  return values.some(v => String(v) === hash);
}

function isEventIdAlreadyImported_(ss, eventId) {
  if (!eventId) return false;
  const sheet = ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG);
  if (sheet.getLastRow() < 2) return false;
  const values = sheet.getRange(2,2,sheet.getLastRow()-1,1).getValues().flat();
  return values.some(v => String(v) === String(eventId));
}

function logImportRecord_(ss, provenance, result) {
  ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG).appendRow([
    new Date(),
    provenance.eventId || provenance.sourceFileId || '',
    provenance.sourceFile || 'DIRECT_SYNC',
    provenance.sha256 || '',
    result.schema || 'training_log.v1',
    result.exportedAt || '',
    result.sessionsSeen || 0,
    result.sessionsInserted || 0,
    result.setsInserted || 0,
    result.status || '',
    result.message || ''
  ]);
}

function normalizeTrainingPayload_(payload) {
  if (payload && payload.schema === 'training_history.v1' && Array.isArray(payload.sessions)) {
    return {
      ok: true,
      schema: payload.schema,
      exportedAt: payload.exported_at || '',
      sessions: payload.sessions
    };
  }

  if (payload && payload.schema === 'training_log.v1' && payload.session) {
    return {
      ok: true,
      schema: payload.schema,
      exportedAt: payload.exported_at || '',
      sessions: [payload]
    };
  }

  // Compatibilidad con payloads planos que tienen session
  if (payload && payload.session) {
    return {
      ok: true,
      schema: 'training_log.v1',
      exportedAt: payload.exported_at || '',
      sessions: [payload]
    };
  }

  return { ok: false, message: 'Se admite schema training_history.v1 o training_log.v1.' };
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sanitización de fórmulas contra inyección de código en Sheets (=, +, -, @)
 */
function sanitizeFormula_(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (/^[=+\-@]/.test(str)) {
    return "'" + str;
  }
  return str;
}

function appendRows_(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow()+1,1,rows.length,rows[0].length).setValues(rows);
}

function readIdSet_(sheet, col) {
  if (sheet.getLastRow() < 2) return new Set();
  return new Set(sheet.getRange(2,col,sheet.getLastRow()-1,1).getValues().flat()
    .map(String).filter(Boolean));
}

function getDataObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== '' && v !== null)).map(row => {
    const o = {};
    headers.forEach((h,i) => o[h] = row[i]);
    return o;
  });
}

function getActiveProgramVersion_(ss) {
  const rows = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.PROGRAM));
  const active = rows.find(r => String(r.estado || '').toUpperCase() === 'ACTIVO');
  return active ? String(active.program_version || '') : 'v3';
}

function deriveDay_(session) {
  const text = `${session.title || ''} ${session.id || ''}`;
  const m = text.match(/D[ií]a\s*([ABC])\b/i);
  if (m) return m[1].toUpperCase();
  const m2 = text.match(/dia[-_ ]?([abc])\b/i);
  return m2 ? m2[1].toUpperCase() : 'A';
}

function nextABC_(day) {
  return day === 'A' ? 'B' : day === 'B' ? 'C' : day === 'C' ? 'A' : 'A';
}

function normalizeRir_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return v;
  const s = String(v).trim().replace('–','-');
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function numberOrBlank_(v) {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(',','.'));
  return Number.isFinite(n) ? n : '';
}

function parseDateOrBlank_(v) {
  if (!v) return '';
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
      // Fijar a las 12:00 del mediodía local para evitar desfases de zona horaria UTC
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
    }
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? '' : d;
}

function truthy_(v) {
  return v === true || String(v).toLowerCase() === 'true' || String(v) === '1';
}

function sha256_(bytes) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bytes)
    .map(b => (b + 256) % 256)
    .map(b => b.toString(16).padStart(2,'0'))
    .join('');
}

function e1rm_(r) {
  let load = Number(r.load_kg);
  const reps = Number(r.reps);
  const rir = Number(r.rir);
  if (!Number.isFinite(load) || !Number.isFinite(reps) || !Number.isFinite(rir)) return null;

  const basis = String(r.load_basis || '').toLowerCase();
  if (basis === 'per_side_kg' || truthy_(r.per_side)) {
    load = load * 2;
  } else if (basis !== 'total_kg' && basis !== 'bodyweight_plus_kg' && basis !== '') {
    return null;
  }
  return Math.round((load * (1 + (reps + rir) / 30)) * 10) / 10;
}

function describeSet_(r) {
  const load = r.load_kg !== '' ? `${r.load_kg} kg × ` : '';
  const rir = r.rir !== '' ? ` @${r.rir}` : '';
  return `${load}${r.reps || ''}${rir}`.trim();
}

function checkDuplicates_(sheet, headerName, issues) {
  const rows = getDataObjects_(sheet);
  const seen = new Set();
  rows.forEach(r => {
    const id = String(r[headerName] || '');
    if (!id) return;
    if (seen.has(id)) issues.push(`Duplicado ${headerName}: ${id}`);
    seen.add(id);
  });
}

function monday_(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0,0,0,0);
  return d;
}

function getWeekLabel_(date) {
  const mon = monday_(date);
  return Utilities.formatDate(mon, CONFIG.TIMEZONE, "'Sem' yyyy-MM-dd");
}

function categorizeMuscleGroup_(exerciseName) {
  const name = String(exerciseName).toLowerCase();
  if (/glúteo|hip thrust|kas glute|cable kickback|patada|abducc/i.test(name)) return 'Glúteo (Prioritario)';
  if (/cuádriceps|sentadilla|squat|prensa|leg extension|extensión rodilla/i.test(name)) return 'Cuádriceps';
  if (/isquio|peso muerto|rdl|curl femoral|leg curl/i.test(name)) return 'Isquios / Cadena Posterior';
  if (/remo|jalón|lat pulldown|dominada|row|pullover|espalda/i.test(name)) return 'Espalda / Fracción';
  if (/pecho|press banca|chest press|apertura|cruce poleas/i.test(name)) return 'Pecho / Empuje';
  if (/hombro|elevación lateral|shoulder|press militar|rear delt/i.test(name)) return 'Hombro / Deltoides';
  if (/biceps|triceps|curl|extension triceps/i.test(name)) return 'Brazos';
  return 'Otros';
}

function closestPairMean_(arr) {
  const x = arr.filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
  if (x.length < 2) return x.length === 1 ? x[0] : '';
  if (x.length === 2) return (x[0]+x[1])/2;
  const pairs = [
    [x[0],x[1]],[x[0],x[2]],[x[1],x[2]]
  ].sort((a,b) => Math.abs(a[0]-a[1]) - Math.abs(b[0]-b[1]));
  return (pairs[0][0]+pairs[0][1])/2;
}

function rangeDiff_(arr) {
  const x = arr.filter(v => typeof v === 'number' && Number.isFinite(v) && v > 0);
  return x.length >= 2 ? Math.round((Math.max(...x)-Math.min(...x))*10)/10 : '';
}

/**
 * =========================================================================
 * 8. EJECUTOR DE COMANDOS DEL GEM (Gem-to-Sheet Command Runner)
 * =========================================================================
 */
function showExecuteGemCommandDialog() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 15px; color: #1e293b; }
          h3 { margin-top: 0; color: #0f172a; font-size: 16px; display: flex; align-items: center; gap: 8px; }
          p { font-size: 13px; color: #64748b; margin-bottom: 12px; line-height: 1.4; }
          textarea { width: 100%; height: 170px; box-sizing: border-box; font-family: monospace; font-size: 12px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f8fafc; resize: vertical; }
          .btn-container { margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px; }
          button { padding: 9px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; border: none; }
          .btn-primary { background: #2563eb; color: white; }
          .btn-primary:hover { background: #1d4ed8; }
          .btn-cancel { background: #e2e8f0; color: #475569; }
          #status { margin-top: 12px; font-size: 13px; font-weight: 500; min-height: 20px; }
          .success { color: #16a34a; }
          .error { color: #dc2626; }
        </style>
      </head>
      <body>
        <h3>🤖 Ejecutar Comando del Gem</h3>
        <p>Pega el bloque de comando generado por tu Gem (por ejemplo para dar de alta una máquina, registrar una molestia, modificar un ejercicio o guardar una decisión):</p>
        <textarea id="cmdInput" placeholder='[DAME_CANA_CMD: ADD_MACHINE]\\n{\\n  "machine_id": "...",\\n  "nombre_visible": "..."\\n}'></textarea>
        <div id="status"></div>
        <div class="btn-container">
          <button class="btn-cancel" onclick="google.script.host.close()">Cerrar</button>
          <button class="btn-primary" id="execBtn" onclick="runCommand()">⚡ Ejecutar Comando</button>
        </div>

        <script>
          function runCommand() {
            var val = document.getElementById('cmdInput').value;
            if (!val || !val.trim()) {
              document.getElementById('status').innerHTML = '<span class="error">Por favor pega un comando válido.</span>';
              return;
            }
            document.getElementById('execBtn').disabled = true;
            document.getElementById('status').innerHTML = '<span style="color:#64748b;">⏳ Procesando comando en Sheets...</span>';
            
            google.script.run
              .withSuccessHandler(function(res) {
                document.getElementById('execBtn').disabled = false;
                if (res && res.success) {
                  document.getElementById('status').innerHTML = '<span class="success">✅ ' + res.message + '</span>';
                  document.getElementById('cmdInput').value = '';
                } else {
                  document.getElementById('status').innerHTML = '<span class="error">❌ Error: ' + (res ? res.message : 'Error desconocido') + '</span>';
                }
              })
              .withFailureHandler(function(err) {
                document.getElementById('execBtn').disabled = false;
                document.getElementById('status').innerHTML = '<span class="error">❌ ' + (err.message || err) + '</span>';
              })
              .processGemCommand(val);
          }
        </script>
      </body>
    </html>
  `;
  const htmlOutput = HtmlService.createHtmlOutput(html).setWidth(540).setHeight(390);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Ejecutar Acción del Gem');
}

function processGemCommand(rawText) {
  if (!rawText || !rawText.trim()) {
    return { success: false, message: 'El texto del comando está vacío.' };
  }

  let text = rawText.trim();
  let cmdType = '';

  // Extraer comando del encabezado [DAME_CANA_CMD: XYZ]
  const headerMatch = text.match(/\[DAME_CANA_CMD(?::\s*([A-Z0-9_]+))?\]/i);
  if (headerMatch && headerMatch[1]) {
    cmdType = headerMatch[1].toUpperCase();
  }

  // Extraer objeto JSON del texto
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    return { success: false, message: 'No se encontró una estructura JSON válida {...} en el comando.' };
  }

  let params;
  try {
    params = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
  } catch (err) {
    return { success: false, message: 'Error de sintaxis en el JSON: ' + err.message };
  }

  if (!cmdType && params.cmd) {
    cmdType = String(params.cmd).toUpperCase();
  }

  const ss = getOperativoSs_();
  const now = new Date();

  switch (cmdType) {
    case 'ADD_MACHINE': {
      const sheet = ss.getSheetByName(CONFIG.SHEETS.MACHINES);
      const id = params.machine_id || `MACH-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`;
      sheet.appendRow([
        sanitizeFormula_(id),
        sanitizeFormula_(params.subslot_id || ''),
        sanitizeFormula_(params.categoria_uso || 'Habitual'),
        sanitizeFormula_(params.familia_slot || ''),
        sanitizeFormula_(params.nombre_visible || params.nombre_visible_estacion || ''),
        sanitizeFormula_(params.marca_modelo || ''),
        sanitizeFormula_(params.tipo_carga || ''),
        sanitizeFormula_(params.load_basis || 'total_kg'),
        sanitizeFormula_(params.ajustes || params.ajustes_reproducibles || ''),
        sanitizeFormula_(params.sensacion_limitante || params.rom_sensacion_limitante || ''),
        params.ratio_estimado || '',
        sanitizeFormula_(params.estado || 'VALIDADA'),
        now,
        'Gem Command',
        params.peso_por_lado || '',
        params.peso_por_bloque || '',
        params.rango_peso_util || '',
        params.distribucion_resistencia || '',
        params.sustituto_directo_de || '',
        sanitizeFormula_(params.comparability_group || ''),
        sanitizeFormula_(params.notas_tecnicas || ''),
        sanitizeFormula_(params.proxima_accion || 'Usar en próxima sesión')
      ]);
      syncFormDropdowns(ss);
      rebuildCurrentContext(ss);
      return { success: true, message: `Máquina '${params.nombre_visible || id}' añadida con éxito a 07_MAQUINAS_PERSONALES.` };
    }

    case 'UPDATE_MACHINE_SETTINGS': {
      const sheet = ss.getSheetByName(CONFIG.SHEETS.MACHINES);
      const data = sheet.getDataRange().getValues();
      let foundRow = -1;
      const targetId = String(params.machine_id || params.nombre_visible || '').toLowerCase();

      for (let i = 1; i < data.length; i++) {
        const rowId = String(data[i][0]).toLowerCase();
        const rowName = String(data[i][4]).toLowerCase();
        if (rowId === targetId || rowName.includes(targetId)) {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow === -1) {
        return { success: false, message: `No se encontró la máquina '${targetId}' en 07_MAQUINAS_PERSONALES.` };
      }

      if (params.ajustes) sheet.getRange(foundRow, 9).setValue(sanitizeFormula_(params.ajustes));
      if (params.sensacion_limitante) sheet.getRange(foundRow, 10).setValue(sanitizeFormula_(params.sensacion_limitante));
      if (params.notas_tecnicas) sheet.getRange(foundRow, 21).setValue(sanitizeFormula_(params.notas_tecnicas));
      sheet.getRange(foundRow, 13).setValue(now);
      sheet.getRange(foundRow, 14).setValue('Gem Command');

      rebuildCurrentContext(ss);
      return { success: true, message: `Ajustes de la máquina actualizados en fila ${foundRow}.` };
    }

    case 'LOG_RESTRICTION': {
      const sheet = ss.getSheetByName(CONFIG.SHEETS.STATE);
      const incId = `INC-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`;
      sheet.appendRow([
        incId,
        now,
        'SALUD_DINAMICA',
        sanitizeFormula_(`Dolor/incidencia — ${params.zona || 'General'}`),
        sanitizeFormula_(`${params.intensidad || 0}/10 · ${params.descripcion || ''}`),
        sanitizeFormula_(params.estado || 'ACTIVA_HASTA_REVISAR'),
        'ALTA',
        'Gem Command',
        sanitizeFormula_(params.restriccion_activa || params.restriccion || '')
      ]);
      rebuildCurrentContext(ss);
      return { success: true, message: `Restricción de salud guardada (${params.zona || 'Incidencia'}).` };
    }

    case 'RESOLVE_RESTRICTION': {
      const sheet = ss.getSheetByName(CONFIG.SHEETS.STATE);
      const data = sheet.getDataRange().getValues();
      let count = 0;
      const target = String(params.clave || params.zona || '').toLowerCase();

      for (let i = 1; i < data.length; i++) {
        const clave = String(data[i][3]).toLowerCase();
        if (clave.includes(target) && String(data[i][5]).includes('ACTIVA')) {
          sheet.getRange(i + 1, 6).setValue('RESUELTA');
          count++;
        }
      }
      rebuildCurrentContext(ss);
      return { success: true, message: `${count} restricción(es) marcada(s) como RESUELTA.` };
    }

    case 'SWAP_EXERCISE': {
      const sheet = ss.getSheetByName(CONFIG.SHEETS.PROGRAM);
      const data = sheet.getDataRange().getValues();
      let foundRow = -1;
      const targetSlot = String(params.slot_id || '').toUpperCase();

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][4]).toUpperCase() === targetSlot && String(data[i][1]).toUpperCase() === 'ACTIVO') {
          foundRow = i + 1;
          break;
        }
      }

      if (foundRow === -1) {
        return { success: false, message: `No se encontró el slot activo '${targetSlot}' en 02_PROGRAMA_ACTIVO.` };
      }

      if (params.ejercicio_entrante) sheet.getRange(foundRow, 6).setValue(sanitizeFormula_(params.ejercicio_entrante));
      if (params.series) sheet.getRange(foundRow, 8).setValue(numberOrBlank_(params.series));
      if (params.reps) sheet.getRange(foundRow, 9).setValue(params.reps);
      if (params.rir) sheet.getRange(foundRow, 10).setValue(params.rir);
      if (params.motivo) sheet.getRange(foundRow, 13).setValue(sanitizeFormula_(params.motivo));

      rebuildCurrentContext(ss);
      return { success: true, message: `Slot ${targetSlot} actualizado con éxito: '${params.ejercicio_entrante}'.` };
    }

    case 'LOG_DECISION': {
      const sheet = ss.getSheetByName(CONFIG.SHEETS.DECISIONS);
      const decId = `DEC-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`;
      sheet.appendRow([
        decId,
        now,
        sanitizeFormula_(params.categoria || 'ENTRENAMIENTO'),
        sanitizeFormula_(params.titulo || 'Decisión consensuada'),
        sanitizeFormula_(params.decision || ''),
        sanitizeFormula_(params.criterio_revision || ''),
        'ACTIVA',
        'Gem Command'
      ]);
      rebuildCurrentContext(ss);
      return { success: true, message: `Decisión maestra guardada en 11_DECISIONES.` };
    }

    case 'LOG_MONTHLY_REVIEW': {
      const sheet = ss.getSheetByName(CONFIG.SHEETS.REVIEWS);
      const revId = `REV-${Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyyMMdd-HHmmss')}`;
      sheet.appendRow([
        revId,
        now,
        sanitizeFormula_(params.periodo || 'Mensual'),
        '', '', '', '', '', '', '', '', '', '', '', '', '', '',
        sanitizeFormula_(params.evaluacion_gluteo || ''),
        '', '', '', '', '',
        sanitizeFormula_(params.notas || '')
      ]);
      rebuildCurrentContext(ss);
      return { success: true, message: `Revisión guardada en 10_REVISIONES.` };
    }

    default:
      return { success: false, message: `Tipo de comando no reconocido: '${cmdType}'. Tipos válidos: ADD_MACHINE, UPDATE_MACHINE_SETTINGS, LOG_RESTRICTION, RESOLVE_RESTRICTION, SWAP_EXERCISE, LOG_DECISION, LOG_MONTHLY_REVIEW.` };
  }
}

/**
 * =========================================================================
 * 9. MOTOR DE DISEÑO: ESTILO "CUADERNO TÉCNICO DE FUERZA"
 * =========================================================================
 */
function applyCuadernoTecnicoStyling(ssOpt) {
  const ss = ssOpt || getOperativoSs_();
  const ui = SpreadsheetApp.getUi();

  const PALETTE = {
    INK: '#181A16',
    PAPER: '#F0EDE4',
    SURFACE_LIGHT: '#FAF8F1',
    SURFACE_WHITE: '#FFFEF9',
    SECONDARY_TEXT: '#5C5F56',
    LINE_SOFT: '#C7C6BA',
    LINE_TECH: '#AAA99E',
    LIME: '#D9FF43',
    ORANGE: '#EF6A3A',
    TURQUOISE: '#37DED6',
    DARK_GREEN: '#36594A',
    DANGER: '#B83A2F',
    CALCULATED_BG: '#E7E4DA'
  };

  const sheets = ss.getSheets();
  let styledCount = 0;

  sheets.forEach(sheet => {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return;

    // 1. Desactivar líneas de cuadrícula nativas
    sheet.setHiddenGridlines(true);

    // 2. Fila 1: Encabezados Tinta Oscura (#181A16)
    const headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange
      .setBackground(PALETTE.INK)
      .setFontColor('#FFFFFF')
      .setFontFamily('Arial')
      .setFontSize(10)
      .setFontWeight('bold')
      .setVerticalAlignment('middle')
      .setWrap(false);
    sheet.setRowHeight(1, 36);
    sheet.setFrozenRows(1);

    // 3. Filas de datos (2 a lastRow): Alternancia Papel Cálido (#F0EDE4) / Superficie Clara (#FAF8F1)
    if (lastRow > 1) {
      const dataRange = sheet.getRange(2, 1, lastRow - 1, lastCol);
      dataRange
        .setFontFamily('Arial')
        .setFontSize(10)
        .setFontColor(PALETTE.INK)
        .setVerticalAlignment('middle')
        .setBorder(true, true, true, true, true, true, PALETTE.LINE_SOFT, SpreadsheetApp.BorderStyle.SOLID);

      for (let r = 2; r <= lastRow; r++) {
        sheet.setRowHeight(r, 28);
        const bg = (r % 2 === 0) ? PALETTE.SURFACE_LIGHT : PALETTE.PAPER;
        sheet.getRange(r, 1, 1, lastCol).setBackground(bg);
      }
    }

    // 4. Tratamiento específico por pestaña y colores de pestañas
    const sheetName = sheet.getName();
    if (sheetName === CONFIG.SHEETS.CONTEXT) {
      sheet.setTabColor(PALETTE.LIME);
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 1).setFontWeight('bold');
      }
    } else if (sheetName === CONFIG.SHEETS.STATE) {
      sheet.setTabColor(PALETTE.ORANGE);
    } else if (sheetName === CONFIG.SHEETS.PANEL) {
      sheet.setTabColor(PALETTE.LIME);
      if (lastRow > 1) {
        sheet.getRange(2, 2, lastRow - 1, 1).setBackground('#EAFCC0').setFontWeight('bold'); // Columna Glúteo
      }
    } else if (sheetName === CONFIG.SHEETS.SESSIONS || sheetName === CONFIG.SHEETS.SETS) {
      sheet.setTabColor(PALETTE.TURQUOISE);
    }

    sheet.autoResizeColumns(1, lastCol);
    styledCount++;
  });

  ui.alert('🎨 Estilo Cuaderno Técnico Aplicado', `Se ha aplicado con éxito el diseño "Cuaderno Técnico de Fuerza" a ${styledCount} pestañas:\n\n• Tinta Principal: #181A16\n• Papel Cálido: #F0EDE4\n• Superficie Clara: #FAF8F1\n• Acentos Lima (#D9FF43) y Naranja (#EF6A3A)\n• Líneas de cuadrícula limpias y bordes editoriales.`, ui.ButtonSet.OK);
}


