/**
 * SOLO PARA LA COPIA DE PRUEBAS.
 * Añadir temporalmente al final de Code.gs después de pegar
 * DAME_CANA_Apps_Script_v3.3-rc1_COPY_TEST.gs.
 * Eliminar antes de cualquier uso fuera de la copia.
 */

function runCopyTestForbiddenPost() {
  const response = doPost({
    postData: {
      contents: JSON.stringify({
        schema: 'training_log.v1',
        event_id: 'phase01-copy-forbidden',
        auth_token: 'incorrecto-deliberadamente'
      })
    }
  });
  const body = JSON.parse(response.getContent());
  if (body.ok !== false || body.status !== 'FORBIDDEN' || body.retryable !== false) {
    throw new Error('La prueba de token inválido no produjo FORBIDDEN. Resultado: ' + JSON.stringify(body));
  }
  Logger.log(JSON.stringify(body));
  return body;
}

function runCopyTestAuthenticatedPost() {
  const secret = PropertiesService.getScriptProperties().getProperty('GOOGLE_SYNC_SECRET');
  if (!secret) throw new Error('Falta GOOGLE_SYNC_SECRET en Script Properties de la copia.');

  const now = new Date();
  const eventId = 'phase01-copy-auth-' + Utilities.getUuid();
  const response = doPost({
    postData: { contents: JSON.stringify(buildCopyTestAuthenticatedPayload_(eventId, secret, now)) }
  });
  const body = JSON.parse(response.getContent());
  if (body.ok !== true || body.status !== 'IMPORTED' || body.event_id !== eventId) {
    throw new Error('La prueba autenticada no se importó. Resultado: ' + JSON.stringify(body));
  }
  Logger.log(JSON.stringify(body));
  return body;
}

function buildCopyTestAuthenticatedPayload_(eventId, secret, now) {
  const localDate = Utilities.formatDate(now, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  return {
    schema: 'training_log.v1',
    contract_revision: 2,
    event_id: eventId,
    auth_token: secret,
    exported_at: now.toISOString(),
    session: {
      id: 'TEST-AUTH-' + eventId,
      local_date: localDate,
      date: localDate,
      timezone: CONFIG.TIMEZONE,
      updated_at: now.toISOString(),
      finished: true,
      session_type: 'test',
      day_id: null,
      program_version: '',
      title: 'TEST FASE 1 — doPost autenticado',
      record_quality: 'test'
    },
    exercises: [{
      index: 1,
      name: 'TEST — doPost autenticado',
      source_exercise_ref: 'test:auth-post',
      identity: { load_basis: 'total_kg', resistance_mode: 'plates' },
      prescription: { per_side: false },
      result: { sets: [{ index: 1, load_kg: 1, reps: 1, rir: 10, completed: true }] }
    }]
  };
}
