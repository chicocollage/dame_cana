/**
 * DAME CAÑA v3.3-rc1-phase02-copy-test — Google Apps Script
 * Motor de Integración, Automatización y Análisis de Entrenamiento
 * Alineado con las Especificaciones Técnicas y la Guía de Integración
 */

const CONFIG = Object.freeze({
  CONTRACT_REVISION: 2,
  OPERATIVO_SPREADSHEET_ID: '1XIRU5Ffr41q76GmiuviO36HLeBuIYHV_Qf_I4rXfDlQ',
  CATALOGOS_SPREADSHEET_ID: '1PiQjrS4YbedIcb5u2ZlCH8SnkEkuXbI4Lqo4JeKSsUY',
  ROOT_FOLDER_ID: '1x-zqi-fJoMtkVQytkuAtFde3mD60wNYe',
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
  'exported_at','source_file','source_file_id','imported_at','program_version',
  'updated_at','payload_hash','event_id','session_type','template_id',
  'template_revision','contract_revision'
];

const SET_HEADERS = [
  'set_id','session_id','fecha','dia','exercise_order','exercise_name',
  'exercise_id','slot_id','machine_id','variant','machine_settings',
  'load_basis','resistance_mode','set_index','load_kg','reps','rir',
  'per_side','movement_notes','comparability_group','source_file',
  'completed','source_exercise_ref','identity_status','identity_source'
];

const CHECKIN_HEADERS = [
  'checkin_id','fecha','semana_inicio','semana_fin','sesiones_realizadas',
  'sesiones_previstas','adherencia','peso_medio_matutino_kg','n_pesos',
  'sueno_medio_h','calidad_sueno_1_5','pasos_medios','fatiga_1_5',
  'agujetas_gluteo_0_10','dolor_lumbar_0_10','dolor_hombro_der_0_10',
  'apetito_energia_1_5','cambios_nutricion_actividad','estado_recuperacion',
  'notas','decision_semanal','fuente'
];

const MEASURE_HEADERS = [
  'measure_id','fecha','protocolo','peso_medio_kg','n_pesos','cintura_1_cm',
  'cintura_2_cm','cintura_3_cm','cintura_usada_cm','dif_max_cintura',
  'cadera_1_cm','cadera_2_cm','cadera_3_cm','cadera_usada_cm',
  'dif_max_cadera','ratio_cadera_cintura','grasa_bia_pct','masa_libre_kg',
  'masa_muscular_kg','musculo_esq_pct','dispositivo_fuente','notas_comparabilidad'
];

const IMPORT_LOG_HEADERS = [
  'timestamp','file_id','file_name','sha256','schema','exported_at',
  'sessions_seen','sessions_inserted','sets_inserted','status','message',
  'event_id','contract_revision','record_id','record_updated_at','action',
  'previous_payload_hash','retryable'
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dame Caña v3.3-rc1 · Fase 2 copia')
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
function doGet() {
  return jsonResponse_({
    ok: true,
    status: 'PHASE02_AUTH_PROBE',
    code: 200,
    retryable: false,
    message: 'Endpoint de prueba accesible por la cuenta autorizada.'
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) {
    return jsonResponse_({
      ok: false,
      status: 'TEMPORARY',
      code: 503,
      retryable: true,
      message: 'Servidor ocupado procesando otra transacción. Reintentar con espera.'
    });
  }

  try {
    let rawData = e && e.postData ? e.postData.contents : null;
    if (!rawData) {
      return jsonResponse_({
        ok: false,
        status: 'REJECTED',
        code: 400,
        retryable: false,
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
        ok: false,
        status: 'REJECTED',
        code: 400,
        retryable: false,
        message: 'JSON malformado: ' + parseErr.message
      });
    }

    // La API falla cerrada: una configuración sin secreto nunca admite escrituras.
    const expectedSecret = PropertiesService.getScriptProperties().getProperty('GOOGLE_SYNC_SECRET');
    if (!expectedSecret) {
      return jsonResponse_({
        ok: false,
        status: 'CONFIGURATION_ERROR',
        code: 500,
        retryable: false,
        message: 'Falta configurar GOOGLE_SYNC_SECRET en Script Properties.'
      });
    }
    if (!payload.auth_token || payload.auth_token !== expectedSecret) {
      return jsonResponse_({
        ok: false,
        status: 'FORBIDDEN',
        code: 403,
        retryable: false,
        message: 'Token de sincronización inválido o ausente.'
      });
    }
    delete payload.auth_token;

    const ss = getOperativoSs_();
    validateWorkbookStructure_(ss);
    const eventId = nonEmptyString_(payload.event_id || payload.eventId);
    if (!eventId) {
      return jsonResponse_({
        ok: false,
        status: 'REJECTED',
        code: 400,
        retryable: false,
        message: 'event_id es obligatorio y no puede estar vacío.'
      });
    }

    const envelopeValidation = validateTransportEnvelope_(payload, eventId);
    if (!envelopeValidation.ok) {
      return jsonResponse_({
        ok: false,
        status: 'REJECTED',
        code: 400,
        retryable: false,
        event_id: eventId,
        message: envelopeValidation.message
      });
    }

    const previousReceipt = getEventReceipt_(ss, eventId);
    if (previousReceipt) {
      return jsonResponse_(receiptToResponse_(previousReceipt, eventId));
    }

    const schema = nonEmptyString_(payload.schema);

    if (schema === 'checkin.v1') {
      const checkinValidation = validateCheckinPayload_(payload);
      if (!checkinValidation.ok) {
        return jsonResponse_({
          ok: false,
          status: 'REJECTED',
          code: 400,
          retryable: false,
          event_id: eventId,
          message: checkinValidation.message
        });
      }
      const checkinProvenance = {
        sourceFile: 'DIRECT_CHECKIN',
        sourceFileId: eventId,
        eventId: eventId,
        sha256: canonicalPayloadHash_(payload)
      };
      const checkinResult = processCheckinPayload_(payload, ss, eventId, checkinProvenance);
      if (checkinResult.status === 'IMPORTED') {
        rebuildCurrentContext(ss);
      }
      return jsonResponse_(resultToResponse_(checkinResult, eventId));
    }

    const normalized = normalizeTrainingPayload_(payload);
    if (!normalized.ok) {
      return jsonResponse_({
        ok: false,
        status: 'REJECTED',
        code: 400,
        retryable: false,
        event_id: eventId,
        message: normalized.message
      });
    }

    const canonicalPayload = canonicalJson_(payload);
    let evidenceFile;
    try {
      const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
      const inbox = getOrCreateChildFolder_(root, CONFIG.INBOX_FOLDER);
      const timeStr = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd_HHmmss');
      const safeEventId = eventId.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 80);
      evidenceFile = inbox.createFile(`DIRECT_SYNC_${timeStr}_${safeEventId}.json`, canonicalPayload, 'application/json');
    } catch (driveErr) {
      return jsonResponse_({
        ok: false,
        status: 'TEMPORARY',
        code: 500,
        retryable: true,
        event_id: eventId,
        message: 'No se pudo crear la evidencia previa en Inbox: ' + driveErr.message
      });
    }

    const provenance = {
      sourceFile: evidenceFile.getName(),
      sourceFileId: evidenceFile.getId(),
      sha256: sha256_(Utilities.newBlob(canonicalPayload).getBytes()),
      eventId: eventId
    };

    const result = importTrainingPayload_(normalized, provenance, ss);

    if (isTerminalStatus_(result.status)) {
      const root = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
      const processed = getOrCreateChildFolder_(root, CONFIG.PROCESSED_FOLDER);
      evidenceFile.moveTo(processed);
    }

    if (result.sessionsInserted > 0 || result.sessionsUpdated > 0) {
      rebuildPerformance(ss);
      rebuildWeeklyVolumeDashboard(ss);
      rebuildCurrentContext(ss);
    }

    return jsonResponse_(resultToResponse_(result, eventId));

  } catch (err) {
    return jsonResponse_({
      ok: false,
      status: 'TEMPORARY',
      code: 500,
      retryable: true,
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
  const previousReceipt = provenance.eventId ? getEventReceipt_(ss, provenance.eventId) : null;
  if (previousReceipt) {
    return {
      status: 'DUPLICATE',
      action: 'NO_OP_EVENT',
      retryable: false,
      sessionsSeen: normalized.sessions.length,
      sessionsInserted: 0,
      sessionsUpdated: 0,
      setsInserted: 0,
      message: `event_id '${provenance.eventId}' ya fue confirmado.`
    };
  }

  const plan = planTrainingImport_(normalized, provenance, ss);
  if (!plan.ok) {
    const rejected = {
      status: 'REJECTED',
      action: plan.action || 'VALIDATION_REJECTED',
      retryable: false,
      contractRevision: normalized.contractRevision,
      schema: normalized.schema,
      exportedAt: normalized.exportedAt,
      sessionsSeen: normalized.sessions.length,
      sessionsInserted: 0,
      sessionsUpdated: 0,
      setsInserted: 0,
      recordId: plan.recordId || '',
      recordUpdatedAt: plan.recordUpdatedAt || '',
      previousPayloadHash: plan.previousPayloadHash || '',
      message: plan.message
    };
    logImportRecord_(ss, provenance, rejected);
    return rejected;
  }

  if (!plan.hasWrites) {
    const noOpStatus = plan.staleCount > 0 ? 'STALE' : 'DUPLICATE';
    const noOp = {
      status: noOpStatus,
      action: noOpStatus === 'STALE' ? 'IGNORED_OLDER' : 'NO_OP_SAME_CONTENT',
      retryable: false,
      contractRevision: normalized.contractRevision,
      schema: normalized.schema,
      exportedAt: normalized.exportedAt,
      sessionsSeen: normalized.sessions.length,
      sessionsInserted: 0,
      sessionsUpdated: 0,
      setsInserted: 0,
      recordId: plan.actions.length === 1 ? plan.actions[0].sessionId : '',
      recordUpdatedAt: plan.actions.length === 1 ? plan.actions[0].updatedAt : '',
      message: noOpStatus === 'STALE'
        ? 'La revisión recibida es anterior a la consolidada; no se escribió nada.'
        : 'El contenido recibido ya estaba consolidado; no se escribió nada.'
    };
    logImportRecord_(ss, provenance, noOp);
    return noOp;
  }

  const sessionSheet = ss.getSheetByName(CONFIG.SHEETS.SESSIONS);
  const setSheet = ss.getSheetByName(CONFIG.SHEETS.SETS);
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG);
  const snapshots = snapshotSheets_([sessionSheet, setSheet, logSheet]);
  const status = 'IMPORTED';
  const committed = {
    status: status,
    action: plan.updatedCount > 0 ? 'SESSION_REPLACED' : 'SESSION_INSERTED',
    retryable: false,
    contractRevision: normalized.contractRevision,
    schema: normalized.schema,
    exportedAt: normalized.exportedAt,
    sessionsSeen: normalized.sessions.length,
    sessionsInserted: plan.insertedCount,
    sessionsUpdated: plan.updatedCount,
    setsInserted: plan.writtenSetCount,
    recordId: plan.actions.length === 1 ? plan.actions[0].sessionId : '',
    recordUpdatedAt: plan.actions.length === 1 ? plan.actions[0].updatedAt : '',
    previousPayloadHash: plan.actions.length === 1 ? plan.actions[0].previousPayloadHash : '',
    message: `Commit completado: ${plan.insertedCount} sesiones nuevas, ${plan.updatedCount} actualizadas y ${plan.writtenSetCount} series vigentes.`
  };

  try {
    writeDataRows_(sessionSheet, SESSION_HEADERS, plan.sessionRows);
    writeDataRows_(setSheet, SET_HEADERS, plan.setRows);
    logImportRecord_(ss, provenance, committed);
    return committed;
  } catch (err) {
    restoreSheets_(snapshots);
    return {
      status: 'TEMPORARY',
      action: 'ROLLED_BACK',
      retryable: true,
      schema: normalized.schema,
      exportedAt: normalized.exportedAt,
      sessionsSeen: normalized.sessions.length,
      sessionsInserted: 0,
      sessionsUpdated: 0,
      setsInserted: 0,
      message: 'Fallo durante el commit; se restauró el snapshot: ' + err.message
    };
  }
}

/**
 * =========================================================================
 * 3. PROCESAMIENTO DE CHECK-IN Y MEDIDAS (checkin.v1)
 * =========================================================================
 */
function processCheckinPayload_(payload, ss, eventId, provenanceOpt) {
  const validation = validateCheckinPayload_(payload);
  if (!validation.ok) {
    return {
      status: 'REJECTED',
      action: 'VALIDATION_REJECTED',
      retryable: false,
      recordId: '',
      message: validation.message
    };
  }

  const now = new Date();
  const date = parseDateOrBlank_(payload.date);
  const stableId = stableExternalId_(eventId);
  const recordId = `CHK-${stableId}`;
  const measureId = `MED-${stableId}`;
  const provenance = provenanceOpt || {
    sourceFile: 'DIRECT_CHECKIN',
    sourceFileId: eventId,
    eventId: eventId,
    sha256: canonicalPayloadHash_(payload)
  };

  const hasCheckinData = hasValue_(payload.sleep_hours) || hasValue_(payload.sleep_quality) ||
    hasValue_(payload.fatigue) || hasValue_(payload.soreness_glute) || hasValue_(payload.pain_lumbar) ||
    hasValue_(payload.pain_shoulder) || hasValue_(payload.appetite_energy) ||
    nonEmptyString_(payload.nutrition_changes) || nonEmptyString_(payload.notes);
  const hasMeasureData = positiveNumber_(payload.weight_avg) ||
    positiveNumber_(payload.waist_1) || positiveNumber_(payload.waist_2) || positiveNumber_(payload.waist_3) ||
    positiveNumber_(payload.hip_1) || positiveNumber_(payload.hip_2) || positiveNumber_(payload.hip_3);

  const checkinSheet = ss.getSheetByName(CONFIG.SHEETS.CHECKINS);
  const measureSheet = ss.getSheetByName(CONFIG.SHEETS.MEASURES);
  const logSheet = ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG);
  const snapshots = snapshotSheets_([checkinSheet, measureSheet, logSheet]);
  const result = {
    status: 'IMPORTED',
    action: 'CHECKIN_COMMITTED',
    retryable: false,
    contractRevision: Number(payload.contract_revision || 1),
    schema: 'checkin.v1',
    exportedAt: payload.date,
    sessionsSeen: 1,
    sessionsInserted: hasCheckinData ? 1 : 0,
    sessionsUpdated: 0,
    setsInserted: hasMeasureData ? 1 : 0,
    recordId: recordId,
    recordUpdatedAt: payload.updated_at || '',
    message: `Registro completado. Checkin: ${hasCheckinData ? 'Guardado' : 'Omitido'} | Medidas: ${hasMeasureData ? 'Guardado' : 'Omitido'}`
  };

  try {
    if (hasCheckinData) appendObjectRow_(checkinSheet, CHECKIN_HEADERS, buildCheckinRecord_(payload, recordId, date));
    if (hasMeasureData) appendObjectRow_(measureSheet, MEASURE_HEADERS, buildMeasureRecord_(payload, measureId, date));
    logImportRecord_(ss, provenance, result);
    return result;
  } catch (err) {
    restoreSheets_(snapshots);
    return {
      status: 'TEMPORARY',
      action: 'ROLLED_BACK',
      retryable: true,
      recordId: recordId,
      message: 'Fallo durante el commit del check-in; se restauró el snapshot: ' + err.message
    };
  }
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

      const eventId = nonEmptyString_(payload.event_id || payload.eventId);
      if (eventId && getEventReceipt_(ss, eventId)) {
        file.moveTo(processed);
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
        sha256: sha256,
        eventId: eventId
      };

      const result = importTrainingPayload_(normalized, provenance, ss);

      if (isTerminalStatus_(result.status)) {
        file.moveTo(processed);
      }
      if (result.sessionsInserted > 0 || result.sessionsUpdated > 0) anyImported = true;
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

  try {
    validateWorkbookStructure_(ss);
  } catch (err) {
    issues.push(err.message);
  }

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

  appendObjectRow_(ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG), IMPORT_LOG_HEADERS, {
    timestamp: new Date(), file_id: 'SYSTEM_VALIDATION', file_name: '', sha256: '', schema: '', exported_at: '',
    sessions_seen: 0, sessions_inserted: 0, sets_inserted: 0,
    status: issues.length ? 'INTEGRITY_WARNING' : 'INTEGRITY_OK',
    message: issues.length ? issues.join(' | ') : 'Sin incidencias estructurales detectadas.',
    event_id: '', contract_revision: CONFIG.CONTRACT_REVISION, record_id: '', record_updated_at: '',
    action: 'VALIDATE_WORKBOOK', previous_payload_hash: '', retryable: false
  });

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
  const spreadsheetTimeZone = ss.getSpreadsheetTimeZone();
  if (spreadsheetTimeZone !== CONFIG.TIMEZONE) {
    throw new Error(`Zona horaria incompatible. Esperada: ${CONFIG.TIMEZONE}. Real: ${spreadsheetTimeZone}.`);
  }
  Object.values(CONFIG.SHEETS).forEach(name => {
    if (!ss.getSheetByName(name)) throw new Error(`Falta la pestaña operativa: ${name}`);
  });

  [
    [CONFIG.SHEETS.SESSIONS, SESSION_HEADERS],
    [CONFIG.SHEETS.SETS, SET_HEADERS],
    [CONFIG.SHEETS.CHECKINS, CHECKIN_HEADERS],
    [CONFIG.SHEETS.MEASURES, MEASURE_HEADERS],
    [CONFIG.SHEETS.IMPORT_LOG, IMPORT_LOG_HEADERS]
  ].forEach(([sheetName, expectedHeaders]) => {
    assertExactHeaders_(ss.getSheetByName(sheetName), expectedHeaders);
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
  const eventIdColumn = IMPORT_LOG_HEADERS.indexOf('event_id') + 1;
  const values = sheet.getRange(2,eventIdColumn,sheet.getLastRow()-1,1).getValues().flat();
  return values.some(v => String(v) === String(eventId));
}

function logImportRecord_(ss, provenance, result) {
  appendObjectRow_(ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG), IMPORT_LOG_HEADERS, {
    timestamp: new Date(),
    file_id: provenance.sourceFileId || '',
    file_name: provenance.sourceFile || 'DIRECT_SYNC',
    sha256: provenance.sha256 || '',
    schema: result.schema || 'training_log.v1',
    exported_at: result.exportedAt || '',
    sessions_seen: result.sessionsSeen || 0,
    sessions_inserted: result.sessionsInserted || 0,
    sets_inserted: result.setsInserted || 0,
    status: result.status || '',
    message: result.message || '',
    event_id: provenance.eventId || '',
    contract_revision: result.contractRevision || CONFIG.CONTRACT_REVISION,
    record_id: result.recordId || '',
    record_updated_at: result.recordUpdatedAt || '',
    action: result.action || '',
    previous_payload_hash: result.previousPayloadHash || '',
    retryable: result.retryable === true
  });
}
function validateTransportEnvelope_(payload, eventId) {
  const revision = normalizeContractRevision_(payload && payload.contract_revision);
  if (!revision.ok) return revision;
  if (revision.value < CONFIG.CONTRACT_REVISION) return { ok: true };

  const recordId = nonEmptyString_(payload.record_id || payload.recordId);
  if (!recordId || recordId === 'undefined' || recordId === 'null') {
    return { ok: false, message: 'record_id es obligatorio en el transporte rev. 2.' };
  }
  if (!isIsoInstant_(payload.updated_at)) {
    return { ok: false, message: 'updated_at ISO-8601 es obligatorio en el transporte rev. 2.' };
  }
  if (nonEmptyString_(payload.event_id || payload.eventId) !== eventId) {
    return { ok: false, message: 'event_id no es estable dentro del transporte.' };
  }
  if (payload.schema === 'training_log.v1' && payload.session && nonEmptyString_(payload.session.id) !== recordId) {
    return { ok: false, message: 'record_id debe coincidir con session.id en training_log.v1.' };
  }
  return { ok: true };
}

function normalizeTrainingPayload_(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, message: 'El payload debe ser un objeto JSON.' };
  }
  const revision = normalizeContractRevision_(payload.contract_revision);
  if (!revision.ok) return revision;

  let sessions;
  if (payload.schema === 'training_history.v1') {
    if (payload.session_schema && payload.session_schema !== 'training_log.v1') {
      return { ok: false, message: 'training_history.v1 exige session_schema=training_log.v1.' };
    }
    if (!Array.isArray(payload.sessions) || payload.sessions.length === 0) {
      return { ok: false, message: 'training_history.v1 exige sessions[] no vacío.' };
    }
    sessions = payload.sessions;
  } else if (payload.schema === 'training_log.v1') {
    sessions = [payload];
  } else {
    return { ok: false, message: 'Schema no admitido. Solo training_log.v1 o training_history.v1.' };
  }

  const seenSessionIds = new Set();
  for (let i = 0; i < sessions.length; i++) {
    const recordRevision = normalizeContractRevision_(sessions[i] && sessions[i].contract_revision !== undefined
      ? sessions[i].contract_revision
      : payload.contract_revision);
    if (!recordRevision.ok) return { ok: false, message: `sessions[${i}]: ${recordRevision.message}` };
    const validation = validateTrainingRecord_(sessions[i], recordRevision.value);
    if (!validation.ok) return { ok: false, message: `sessions[${i}]: ${validation.message}` };
    const sessionId = String(sessions[i].session.id);
    if (seenSessionIds.has(sessionId)) {
      return { ok: false, message: `session.id duplicado dentro del payload: '${sessionId}'.` };
    }
    seenSessionIds.add(sessionId);
  }

  return {
    ok: true,
    schema: payload.schema,
    contractRevision: revision.value,
    exportedAt: payload.exported_at || '',
    sessions: sessions
  };
}

function normalizeContractRevision_(value) {
  if (value === undefined || value === null || value === '') return { ok: true, value: 1 };
  if (Number(value) === 1) return { ok: true, value: 1 };
  if (Number(value) === CONFIG.CONTRACT_REVISION) return { ok: true, value: CONFIG.CONTRACT_REVISION };
  return { ok: false, message: `contract_revision no admitida: '${value}'.` };
}

function validateTrainingRecord_(record, contractRevision) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { ok: false, message: 'Cada sesión debe ser un objeto training_log.v1.' };
  }
  if (record.schema && record.schema !== 'training_log.v1') {
    return { ok: false, message: `Schema de sesión no admitido: '${record.schema}'.` };
  }
  const session = record.session;
  if (!session || typeof session !== 'object' || Array.isArray(session)) {
    return { ok: false, message: 'Falta session.' };
  }
  const sessionId = nonEmptyString_(session.id);
  if (!sessionId || sessionId === 'undefined' || sessionId === 'null') {
    return { ok: false, message: 'session.id es obligatorio y válido.' };
  }
  const sourceDate = session.local_date || session.date;
  if (!parseDateOrBlank_(sourceDate)) return { ok: false, message: `Fecha inválida en session '${sessionId}'.` };
  if (typeof session.finished !== 'boolean') {
    return { ok: false, message: `session.finished debe ser boolean literal en '${sessionId}'.` };
  }
  if (contractRevision >= 2) {
    if (session.finished !== true) return { ok: false, message: `Una sincronización rev. 2 exige finished=true en '${sessionId}'.` };
    if (!isIsoInstant_(session.updated_at)) return { ok: false, message: `updated_at ISO-8601 es obligatorio en '${sessionId}'.` };
    if (!isLocalDate_(session.local_date)) {
      return { ok: false, message: `local_date YYYY-MM-DD es obligatorio en '${sessionId}'.` };
    }
    if (session.timezone !== CONFIG.TIMEZONE) {
      return { ok: false, message: `timezone debe ser '${CONFIG.TIMEZONE}' en '${sessionId}'.` };
    }
    const sessionType = nonEmptyString_(session.session_type);
    if (!['programmed','free','historical','test'].includes(sessionType)) {
      return { ok: false, message: `session_type inválido en '${sessionId}'.` };
    }
    if (sessionType === 'programmed') {
      if (!/^[ABC]$/.test(nonEmptyString_(session.day_id))) {
        return { ok: false, message: `Una sesión programmed exige day_id A/B/C en '${sessionId}'.` };
      }
      if (!nonEmptyString_(session.program_version)) {
        return { ok: false, message: `Una sesión programmed exige program_version en '${sessionId}'.` };
      }
    } else if (session.day_id !== undefined && session.day_id !== null && session.day_id !== '') {
      return { ok: false, message: `Una sesión ${sessionType} debe usar day_id=null en '${sessionId}'.` };
    }
  } else if (session.updated_at && !isIsoInstant_(session.updated_at)) {
    return { ok: false, message: `updated_at inválido en sesión legacy '${sessionId}'.` };
  }

  if (!Array.isArray(record.exercises)) return { ok: false, message: `exercises[] es obligatorio en '${sessionId}'.` };
  const exerciseIndexes = new Set();
  const setIds = new Set();
  for (let exPos = 0; exPos < record.exercises.length; exPos++) {
    const exercise = record.exercises[exPos];
    if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) {
      return { ok: false, message: `Ejercicio inválido en posición ${exPos + 1}.` };
    }
    const exIndex = positiveInteger_(exercise.index);
    if (!exIndex || exerciseIndexes.has(exIndex)) {
      return { ok: false, message: `exercise.index debe ser entero positivo y único en '${sessionId}'.` };
    }
    exerciseIndexes.add(exIndex);
    if (!nonEmptyString_(exercise.name)) return { ok: false, message: `exercise.name vacío en '${sessionId}'.` };
    if (contractRevision >= 2) {
      if (exercise.exercise_id && !isNamespacedRef_(exercise.exercise_id)) {
        return { ok: false, message: `exercise_id debe estar namespaced en '${sessionId}'.` };
      }
      if (exercise.source_exercise_ref && !isNamespacedRef_(exercise.source_exercise_ref)) {
        return { ok: false, message: `source_exercise_ref debe estar namespaced en '${sessionId}'.` };
      }
    }
    const prescription = exercise.prescription || {};
    if (prescription.per_side !== undefined && typeof prescription.per_side !== 'boolean') {
      return { ok: false, message: `prescription.per_side debe ser boolean literal en '${sessionId}'.` };
    }
    const result = exercise.result || {};
    if (!Array.isArray(result.sets)) return { ok: false, message: `result.sets[] es obligatorio en '${sessionId}'.` };
    const indexes = new Set();
    for (let setPos = 0; setPos < result.sets.length; setPos++) {
      const setObj = result.sets[setPos];
      if (!setObj || typeof setObj !== 'object' || Array.isArray(setObj)) {
        return { ok: false, message: `Serie inválida en '${sessionId}'.` };
      }
      const setIndex = positiveInteger_(setObj.index);
      if (!setIndex || indexes.has(setIndex)) {
        return { ok: false, message: `set.index debe ser entero positivo y único por ejercicio en '${sessionId}'.` };
      }
      indexes.add(setIndex);
      const setId = `${sessionId}__E${exIndex}__S${setIndex}`;
      if (setIds.has(setId)) return { ok: false, message: `set_id duplicado en payload: '${setId}'.` };
      setIds.add(setId);
      if (setObj.completed !== undefined && typeof setObj.completed !== 'boolean') {
        return { ok: false, message: `completed debe ser boolean literal en '${setId}'.` };
      }
      if (!isNullableNumberLike_(setObj.load_kg)) return { ok: false, message: `load_kg inválido en '${setId}'.` };
      if (!isNullableIntegerLike_(setObj.reps)) return { ok: false, message: `reps inválidas en '${setId}'.` };
      if (!isValidRir_(setObj.rir)) return { ok: false, message: `rir inválido en '${setId}'.` };
    }
  }
  return { ok: true };
}

function validateCheckinPayload_(payload) {
  if (!payload || payload.schema !== 'checkin.v1') return { ok: false, message: 'Schema checkin.v1 obligatorio.' };
  const revision = normalizeContractRevision_(payload.contract_revision);
  if (!revision.ok) return revision;
  if (!parseDateOrBlank_(payload.date)) return { ok: false, message: 'date válida es obligatoria.' };
  if (revision.value >= 2 && !isLocalDate_(payload.date)) {
    return { ok: false, message: 'date debe ser una fecha real YYYY-MM-DD.' };
  }
  if (payload.type && !['Check-in semanal','Medidas','Dolor / incidencia'].includes(payload.type)) {
    return { ok: false, message: `type no admitido: '${payload.type}'.` };
  }
  if (payload.record_status && !['partial','complete'].includes(payload.record_status)) {
    return { ok: false, message: 'record_status debe ser partial o complete.' };
  }
  const ranges = {
    sleep_hours: [0,24], sleep_quality: [1,5], fatigue: [1,5], appetite_energy: [1,5],
    soreness_glute: [0,10], pain_lumbar: [0,10], pain_shoulder: [0,10],
    weight_avg: [20,400], weight_count: [1,31],
    waist_1: [20,300], waist_2: [20,300], waist_3: [20,300],
    hip_1: [20,300], hip_2: [20,300], hip_3: [20,300]
  };
  for (const key in ranges) {
    const value = payload[key];
    if (value === undefined || value === null || value === '') continue;
    const n = Number(String(value).replace(',','.'));
    if (!Number.isFinite(n) || n < ranges[key][0] || n > ranges[key][1]) {
      return { ok: false, message: `${key} está fuera de rango.` };
    }
  }
  const meaningful = Object.keys(ranges).some(k => payload[k] !== undefined && payload[k] !== null && payload[k] !== '') ||
    nonEmptyString_(payload.nutrition_changes).length >= 3 ||
    nonEmptyString_(payload.notes).length >= 3 ||
    nonEmptyString_(payload.measure_notes).length >= 3;
  return meaningful ? { ok: true } : { ok: false, message: 'El check-in no contiene ningún dato significativo.' };
}

function planTrainingImport_(normalized, provenance, ss) {
  const existingSessions = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SESSIONS));
  let sessionRows = existingSessions.map(r => Object.assign({}, r));
  let setRows = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.SETS)).map(r => Object.assign({}, r));
  const sessionIndex = new Map();
  for (let i = 0; i < sessionRows.length; i++) {
    const id = nonEmptyString_(sessionRows[i].session_id);
    if (!id) return { ok: false, action: 'INVALID_EXISTING_DATA', message: `Fila existente sin session_id en ${CONFIG.SHEETS.SESSIONS}.` };
    if (sessionIndex.has(id)) return { ok: false, action: 'INVALID_EXISTING_DATA', message: `session_id duplicado ya existente: '${id}'.` };
    sessionIndex.set(id, i);
  }
  const existingSetIds = new Set();
  for (const row of setRows) {
    const id = nonEmptyString_(row.set_id);
    if (!id || existingSetIds.has(id)) return { ok: false, action: 'INVALID_EXISTING_DATA', message: `set_id vacío o duplicado ya existente: '${id}'.` };
    existingSetIds.add(id);
  }

  const actions = [];
  let insertedCount = 0;
  let updatedCount = 0;
  let staleCount = 0;
  let writtenSetCount = 0;

  for (const record of normalized.sessions) {
    const session = record.session;
    const sessionId = String(session.id);
    const contractRevision = Number(record.contract_revision || normalized.contractRevision || 1);
    const incomingUpdatedAt = nonEmptyString_(session.updated_at);
    const recordHash = canonicalRecordHash_(record);
    const existingPos = sessionIndex.has(sessionId) ? sessionIndex.get(sessionId) : -1;
    const existing = existingPos >= 0 ? sessionRows[existingPos] : null;
    let action = 'INSERT';
    let previousPayloadHash = '';

    if (existing) {
      previousPayloadHash = nonEmptyString_(existing.payload_hash);
      const existingUpdatedAt = nonEmptyString_(existing.updated_at);
      if ((!incomingUpdatedAt || !existingUpdatedAt) && previousPayloadHash === recordHash) {
        actions.push({ sessionId, action: 'DUPLICATE', updatedAt: incomingUpdatedAt, previousPayloadHash });
        continue;
      }
      if (!incomingUpdatedAt || !existingUpdatedAt) {
        return {
          ok: false,
          action: 'LEGACY_CONFLICT',
          recordId: sessionId,
          recordUpdatedAt: incomingUpdatedAt,
          previousPayloadHash: previousPayloadHash,
          message: `La sesión '${sessionId}' ya existe sin metadatos suficientes para sobrescribirla con seguridad.`
        };
      }
      const comparison = compareIsoInstants_(incomingUpdatedAt, existingUpdatedAt);
      if (comparison < 0) {
        staleCount++;
        actions.push({ sessionId, action: 'STALE', updatedAt: incomingUpdatedAt, previousPayloadHash });
        continue;
      }
      if (comparison === 0) {
        if (previousPayloadHash === recordHash) {
          actions.push({ sessionId, action: 'DUPLICATE', updatedAt: incomingUpdatedAt, previousPayloadHash });
          continue;
        }
        return {
          ok: false,
          action: 'CONFLICT_SAME_UPDATED_AT',
          recordId: sessionId,
          recordUpdatedAt: incomingUpdatedAt,
          previousPayloadHash: previousPayloadHash,
          message: `La sesión '${sessionId}' tiene el mismo updated_at y distinto hash.`
        };
      }
      action = 'UPDATE';
    }

    const builtSession = buildSessionRecord_(record, normalized, provenance, recordHash, contractRevision);
    const builtSets = buildSetRecords_(record, provenance);
    const remainingSetIds = new Set(setRows.filter(r => String(r.session_id) !== sessionId).map(r => String(r.set_id)));
    for (const setRow of builtSets) {
      if (remainingSetIds.has(setRow.set_id)) {
        return { ok: false, action: 'SET_ID_CONFLICT', recordId: sessionId, message: `set_id colisiona con otra sesión: '${setRow.set_id}'.` };
      }
      remainingSetIds.add(setRow.set_id);
    }
    setRows = setRows.filter(r => String(r.session_id) !== sessionId).concat(builtSets);
    writtenSetCount += builtSets.length;

    if (action === 'UPDATE') {
      sessionRows[existingPos] = builtSession;
      updatedCount++;
    } else {
      sessionIndex.set(sessionId, sessionRows.length);
      sessionRows.push(builtSession);
      insertedCount++;
    }
    actions.push({ sessionId, action, updatedAt: incomingUpdatedAt, previousPayloadHash });
  }

  return {
    ok: true,
    hasWrites: insertedCount > 0 || updatedCount > 0,
    sessionRows,
    setRows,
    actions,
    insertedCount,
    updatedCount,
    staleCount,
    writtenSetCount
  };
}

function buildSessionRecord_(record, normalized, provenance, recordHash, contractRevision) {
  const session = record.session;
  const exercises = record.exercises || [];
  const date = parseDateOrBlank_(session.local_date || session.date);
  const sessionType = nonEmptyString_(session.session_type) || 'legacy';
  const day = ['free','historical','test'].includes(sessionType) ? '' : deriveDay_(session);
  const setCount = exercises.reduce((n, exercise) => n + (((exercise.result || {}).sets || []).length), 0);
  const completedCount = exercises.reduce((n, exercise) => n + (((exercise.result || {}).sets || []).filter(isCompletedSet_).length), 0);
  return {
    session_id: String(session.id), fecha: date, dia: day,
    titulo: sanitizeFormula_(session.title || ''), finished: session.finished,
    record_quality: sanitizeFormula_(session.record_quality || ''),
    exercise_count: exercises.length,
    planned_set_count: numberOrBlank_(session.planned_set_count) || setCount,
    recorded_set_count: completedCount,
    source_note: CONFIG.PRIVACY.INCLUDE_SOURCE_NOTE ? sanitizeFormula_(session.source_note || '') : '',
    exported_at: parseDateOrBlank_(record.exported_at || normalized.exportedAt),
    source_file: provenance.sourceFile || 'DIRECT_SYNC',
    source_file_id: provenance.sourceFileId || '', imported_at: new Date(),
    program_version: sanitizeFormula_(session.program_version || ''),
    updated_at: session.updated_at ? new Date(session.updated_at) : '',
    payload_hash: recordHash, event_id: provenance.eventId || '',
    session_type: sessionType, template_id: sanitizeFormula_(session.template_id || ''),
    template_revision: numberOrBlank_(session.template_revision), contract_revision: contractRevision
  };
}

function buildSetRecords_(record, provenance) {
  const session = record.session;
  const sessionType = nonEmptyString_(session.session_type) || 'legacy';
  const day = ['free','historical','test'].includes(sessionType) ? '' : deriveDay_(session);
  const date = parseDateOrBlank_(session.local_date || session.date);
  const rows = [];
  for (const exercise of record.exercises || []) {
    const identity = exercise.identity || {};
    const prescription = exercise.prescription || {};
    const result = exercise.result || {};
    for (const setObj of result.sets || []) {
      let load = numberOrBlank_(setObj.load_kg);
      if (identity.load_basis === 'bodyweight' && load === 0) load = '';
      const canonicalExerciseId = isNamespacedRef_(exercise.exercise_id) ? exercise.exercise_id : '';
      let sourceRef = nonEmptyString_(exercise.source_exercise_ref);
      if (!sourceRef && exercise.exercise_id && !canonicalExerciseId) sourceRef = `legacy:${exercise.exercise_id}`;
      rows.push({
        set_id: `${session.id}__E${exercise.index}__S${setObj.index}`,
        session_id: String(session.id), fecha: date, dia: day,
        exercise_order: exercise.index, exercise_name: sanitizeFormula_(exercise.name),
        exercise_id: sanitizeFormula_(canonicalExerciseId), slot_id: sanitizeFormula_(exercise.slot_id || ''),
        machine_id: sanitizeFormula_(exercise.machine_id || ''), variant: sanitizeFormula_(identity.variant || ''),
        machine_settings: sanitizeFormula_(identity.machine_settings || ''),
        load_basis: sanitizeFormula_(identity.load_basis || ''),
        resistance_mode: sanitizeFormula_(identity.resistance_mode || ((setObj.resistance || {}).mode) || ''),
        set_index: setObj.index, load_kg: load, reps: numberOrBlank_(setObj.reps),
        rir: normalizeRir_(setObj.rir), per_side: prescription.per_side === true,
        movement_notes: CONFIG.PRIVACY.INCLUDE_MOVEMENT_NOTES ? sanitizeFormula_(result.movement_notes || '') : '',
        comparability_group: canonicalExerciseId ? sanitizeFormula_(exercise.comparability_group || '') : '',
        source_file: provenance.sourceFile || 'DIRECT_SYNC', completed: isCompletedSet_(setObj),
        source_exercise_ref: sanitizeFormula_(sourceRef),
        identity_status: canonicalExerciseId ? 'RESOLVED' : 'UNRESOLVED',
        identity_source: sanitizeFormula_(exercise.identity_source || 'unknown')
      });
    }
  }
  return rows;
}

function buildCheckinRecord_(payload, recordId, date) {
  const weekStart = monday_(date);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  return {
    checkin_id: recordId, fecha: date, semana_inicio: weekStart, semana_fin: weekEnd,
    sesiones_realizadas: '', sesiones_previstas: '', adherencia: '',
    peso_medio_matutino_kg: '', n_pesos: '', sueno_medio_h: numberOrBlank_(payload.sleep_hours),
    calidad_sueno_1_5: numberOrBlank_(payload.sleep_quality), pasos_medios: '',
    fatiga_1_5: numberOrBlank_(payload.fatigue), agujetas_gluteo_0_10: numberOrBlank_(payload.soreness_glute),
    dolor_lumbar_0_10: numberOrBlank_(payload.pain_lumbar), dolor_hombro_der_0_10: numberOrBlank_(payload.pain_shoulder),
    apetito_energia_1_5: numberOrBlank_(payload.appetite_energy),
    cambios_nutricion_actividad: sanitizeFormula_(payload.nutrition_changes || ''),
    estado_recuperacion: '', notas: sanitizeFormula_(payload.notes || ''), decision_semanal: '', fuente: 'App Sites'
  };
}

function buildMeasureRecord_(payload, measureId, date) {
  const c = [numberOrBlank_(payload.waist_1),numberOrBlank_(payload.waist_2),numberOrBlank_(payload.waist_3)];
  const h = [numberOrBlank_(payload.hip_1),numberOrBlank_(payload.hip_2),numberOrBlank_(payload.hip_3)];
  const waist = closestPairMean_(c), hip = closestPairMean_(h);
  return {
    measure_id: measureId, fecha: date, protocolo: 'App Sites', peso_medio_kg: numberOrBlank_(payload.weight_avg),
    n_pesos: numberOrBlank_(payload.weight_count), cintura_1_cm: c[0], cintura_2_cm: c[1], cintura_3_cm: c[2],
    cintura_usada_cm: waist, dif_max_cintura: rangeDiff_(c), cadera_1_cm: h[0], cadera_2_cm: h[1],
    cadera_3_cm: h[2], cadera_usada_cm: hip, dif_max_cadera: rangeDiff_(h),
    ratio_cadera_cintura: waist !== '' && hip !== '' && waist > 0 ? hip / waist : '',
    grasa_bia_pct: '', masa_libre_kg: '', masa_muscular_kg: '', musculo_esq_pct: '',
    dispositivo_fuente: 'App Sites', notas_comparabilidad: sanitizeFormula_(payload.measure_notes || payload.notes || '')
  };
}

function assertExactHeaders_(sheet, expected) {
  const width = Math.max(sheet.getLastColumn(), expected.length);
  const actual = sheet.getRange(1,1,1,width).getValues()[0].map(v => String(v).trim());
  while (actual.length && actual[actual.length - 1] === '') actual.pop();
  if (actual.length !== expected.length || actual.some((v,i) => v !== expected[i])) {
    throw new Error(`Cabeceras incompatibles en ${sheet.getName()}. Esperadas: ${expected.join(', ')}. Reales: ${actual.join(', ')}.`);
  }
}

function appendObjectRow_(sheet, headers, object) {
  assertExactHeaders_(sheet, headers);
  sheet.appendRow(headers.map(h => object[h] === undefined ? '' : object[h]));
}

function writeDataRows_(sheet, headers, objects) {
  assertExactHeaders_(sheet, headers);
  const oldRows = Math.max(0, sheet.getLastRow() - 1);
  const rowsToClear = Math.max(oldRows, objects.length);
  if (rowsToClear > 0) sheet.getRange(2,1,rowsToClear,headers.length).clearContent();
  if (objects.length > 0) {
    sheet.getRange(2,1,objects.length,headers.length).setValues(objects.map(o => headers.map(h => o[h] === undefined ? '' : o[h])));
  }
}

function snapshotSheets_(sheets) {
  return sheets.map(sheet => ({ sheet: sheet, values: sheet.getDataRange().getValues() }));
}

function restoreSheets_(snapshots) {
  snapshots.forEach(snapshot => {
    const sheet = snapshot.sheet;
    const values = snapshot.values;
    const height = Math.max(sheet.getLastRow(), values.length);
    const width = Math.max(sheet.getLastColumn(), values[0] ? values[0].length : 1);
    if (height > 0 && width > 0) sheet.getRange(1,1,height,width).clearContent();
    if (values.length && values[0].length) sheet.getRange(1,1,values.length,values[0].length).setValues(values);
  });
}

function getEventReceipt_(ss, eventId) {
  if (!eventId) return null;
  const rows = getDataObjects_(ss.getSheetByName(CONFIG.SHEETS.IMPORT_LOG));
  for (let i = rows.length - 1; i >= 0; i--) {
    const candidate = nonEmptyString_(rows[i].event_id || rows[i].file_id);
    if (candidate === String(eventId) && isTerminalStatus_(String(rows[i].status))) return rows[i];
  }
  return null;
}

function receiptToResponse_(receipt, eventId) {
  if (String(receipt.status) === 'REJECTED') {
    return {
      ok: false, status: 'REJECTED', code: 400,
      action: receipt.action || 'VALIDATION_REJECTED', retryable: false,
      event_id: eventId, eventId: eventId,
      record_id: receipt.record_id || '', recordId: receipt.record_id || '',
      contract_revision: Number(receipt.contract_revision || CONFIG.CONTRACT_REVISION),
      message: receipt.message || `event_id '${eventId}' ya fue rechazado.`
    };
  }
  return {
    ok: true, status: 'DUPLICATE', code: 200, action: 'NO_OP_EVENT', retryable: false,
    event_id: eventId, eventId: eventId, record_id: receipt.record_id || '', recordId: receipt.record_id || '',
    contract_revision: Number(receipt.contract_revision || CONFIG.CONTRACT_REVISION),
    message: `event_id '${eventId}' ya fue confirmado con estado ${receipt.status}.`
  };
}

function resultToResponse_(result, eventId) {
  const ok = ['IMPORTED','UPDATED','DUPLICATE','STALE'].includes(result.status);
  const code = result.status === 'FORBIDDEN' ? 403 : result.status === 'REJECTED' ? 400 : result.status === 'TEMPORARY' ? 500 : 200;
  return {
    ok: ok, status: result.status, code: code, action: result.action || '', retryable: result.retryable === true,
    event_id: eventId, eventId: eventId, record_id: result.recordId || '', recordId: result.recordId || '',
    contract_revision: CONFIG.CONTRACT_REVISION,
    sessions_inserted: result.sessionsInserted || 0, sessions_updated: result.sessionsUpdated || 0,
    sets_inserted: result.setsInserted || 0, message: result.message || ''
  };
}

function isTerminalStatus_(status) {
  return ['IMPORTED','UPDATED','DUPLICATE','STALE','REJECTED'].includes(String(status));
}

function canonicalJson_(value) {
  function normalize(v) {
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out = {};
      Object.keys(v).sort().forEach(k => {
        if (k !== 'auth_token' && v[k] !== undefined) out[k] = normalize(v[k]);
      });
      return out;
    }
    return v;
  }
  return JSON.stringify(normalize(value));
}

function canonicalPayloadHash_(value) {
  return sha256_(Utilities.newBlob(canonicalJson_(value)).getBytes());
}

function canonicalRecordHash_(record) {
  const domainRecord = Object.assign({}, record);
  delete domainRecord.auth_token;
  delete domainRecord.event_id;
  delete domainRecord.eventId;
  delete domainRecord.exported_at;
  return canonicalPayloadHash_(domainRecord);
}

function compareIsoInstants_(a, b) {
  const ta = new Date(a).getTime(), tb = new Date(b).getTime();
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) throw new Error('updated_at inválido durante comparación.');
  return ta === tb ? 0 : ta > tb ? 1 : -1;
}

function isIsoInstant_(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return Number.isFinite(new Date(value).getTime());
}

function isLocalDate_(value) {
  const text = nonEmptyString_(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isNamespacedRef_(value) {
  return /^[A-Za-z0-9._-]+:[A-Za-z0-9._-]+$/.test(nonEmptyString_(value));
}

function nonEmptyString_(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function positiveInteger_(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function isNullableNumberLike_(value) {
  if (value === null || value === undefined || value === '') return true;
  return Number.isFinite(Number(String(value).replace(',','.')));
}

function isNullableIntegerLike_(value) {
  if (value === null || value === undefined || value === '') return true;
  const n = Number(String(value).replace(',','.'));
  return Number.isInteger(n) && n >= 0;
}

function isValidRir_(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 && value <= 10;
  return /^\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?$/.test(String(value).trim());
}

function positiveNumber_(value) {
  const n = Number(String(value === undefined || value === null ? '' : value).replace(',','.'));
  return Number.isFinite(n) && n > 0;
}

function hasValue_(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isCompletedSet_(setObj) {
  if (typeof setObj.completed === 'boolean') return setObj.completed;
  return [setObj.load_kg,setObj.reps,setObj.rir,(setObj.resistance || {}).difficulty]
    .some(v => v !== undefined && v !== null && String(v).trim() !== '');
}

function stableExternalId_(eventId) {
  const clean = nonEmptyString_(eventId).replace(/[^A-Za-z0-9_.-]/g, '_');
  return clean.slice(0, 80) || Utilities.getUuid();
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
  const explicit = nonEmptyString_(session.day_id || session.day);
  if (/^[ABC]$/i.test(explicit)) return explicit.toUpperCase();
  const text = `${session.title || ''} ${session.id || ''}`;
  const m = text.match(/D[ií]a\s*([ABC])\b/i);
  if (m) return m[1].toUpperCase();
  const m2 = text.match(/dia[-_ ]?([abc])\b/i);
  return m2 ? m2[1].toUpperCase() : '';
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




