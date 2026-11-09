"""Genera proyecciones y vistas del sistema local (Antigravity / Gemini), sin modificar datos principales."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import registro_local
import modelo_operativo

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/operativo'
SOURCES = [
    'AGENTS.md',
    'README.md',
    'data/registro.json',
    'data/programa.json',
    'data/indicaciones_tecnicas.json',
    'data/nutricion.json',
    'data/maquinas.json',
    'data/catalogos.json',
    'data/taxonomia_operativa.json',
    'data/seguimiento.json',
    'data/estado_y_decisiones.json',
    'data/confirmaciones_usuario.json',
    'data/conflictos_fuentes.json',
    'data/pendientes_externos.json',
    'data/modelo_operativo.json',
    'data/actualizaciones_conocimiento.json',
    'docs/PERFIL_PERSONAL_UNIFICADO.md',
    'docs/REGLAS_DEL_ENTRENADOR.md',
    'docs/ESTUDIOS_Y_ADAPTACION_PERSONAL.md',
    'docs/GOBIERNO_ENTRENAMIENTO_Y_CONOCIMIENTO.md',
    'docs/FORMATO_SESION_ENTRENADOR_APP.md',
]

DIRECTRICES_PRESCRIPCION_40PLUS = {
    'marco': 'Fisiología 40+ de Alto SFR & Escultura por Ciclos (D-2026-10-31-MARCO-40PLUS-ESCULTURA)',
    'techo_sesion': '3 a 6 series efectivas por grupo muscular y sesión a RIR 1-2 (cero series templadas RIR >= 4)',
    'uso_fallo_rir0': 'Prohibido en compuestos pesados/axiales; permitido únicamente en la última serie de analíticos o máquinas estables sin molestia tendinosa',
    'ventana_colageno': '72 a 96 horas entre estímulos pesados o de alta elongación sobre las mismas estructuras tendinosas',
    'biomecanica_defensiva': [
        'Pausa estricta de ~1 s en máximo estiramiento para eliminar reflejo miotático y reducir cizalla tendinosa un 10-15%',
        'Estabilidad externalizada y agarres con libertad rotacional (manerales libres, neutro/semi-supino) frente a barras rectas fijas',
        'Orden inverso táctico (pre-agotamiento con el analítico estable primero) si la carga absoluta en un compuesto genera peaje articular, lumbar o de SNC',
    ],
    'escultura_ciclos_70_30': 'Estabilidad intra-ciclo en M5-5D-v1.0; en futuras rotaciones (6-8 sem), 70% de grupos consolidados a retención activa (4-6 series/sem RIR 1-2) y 30% (1-2 focos estéticos) a aceleración (12-16 series/sem F2-F3 al inicio de sesión)',
    'nutricion_sfr': '3 a 4 bolos anabólicos de 40-50 g de proteína (>3-4 g leucina) evitando tomas fragmentadas (<25 g)',
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load(name):
    return registro_local.leer_json(ROOT / ('data/' + name + '.json'))


def text(value):
    if value is None or value == '':
        return 'Sin dato'
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return str(value)


def table(name, headers, rows):
    return {'name': name, 'headers': headers, 'rows': rows}


def build():
    registro = load('registro')
    summary = registro_local.resumen(registro)
    operation = load('pendientes_externos')
    pending = [s for s in operation['pendientes_externos'] if s['session_id'] not in {r['session_id'] for r in registro['sesiones']}]
    programa, maquinas, seguimiento = load('programa'), load('maquinas'), load('seguimiento')
    catalogos, decisiones = load('catalogos'), load('estado_y_decisiones')
    slots = programa['slots']
    ids = [s['slot_id'] for s in slots]
    if len(ids) != len(set(ids)):
        raise ValueError('Puestos del programa duplicados')
    latest = summary.get('ultima_sesion')
    if latest is None:
        latest = max((s for s in registro['sesiones'] if s.get('finished') and s.get('dia')
                      and not s['session_id'].startswith('TEST-')), key=lambda s: s['fecha'], default={})
    views = []
    intro = [
        ['Programa', programa['version_activa']],
        ['Modelo operativo', programa.get('modelo_operativo', 'Cola Rodante Asíncrona')],
        ['Última sesión local', (latest.get('fecha', 'Sin dato') + ' · ' + str(latest.get('dia', '')))],
        ['Siguiente día según registro local', 'No usar hasta incorporar entrenamiento pendiente' if pending else summary['siguiente_dia']],
        ['Entradas conocidas pendientes', '; '.join(s['fecha']+' · '+s['dia']+' · '+s['session_id'] for s in pending) or 'Ninguna conocida; confirmar que el historial esté al día'],
        ['Sesiones', len(registro['sesiones'])],
        ['Filas de series', len(registro['series'])],
        ['Filas con repeticiones positivas', sum(isinstance(s.get('reps'), (int, float)) and s['reps'] > 0 for s in registro['series'])],
        ['Máquinas sin ID', sum(not m.get('machine_id') for m in maquinas['estaciones'])],
        ['Series sin grupo comparable', sum(not s.get('comparability_group') for s in registro['series'])],
        ['Entrenador y autoridad', 'Local (Antigravity / Gemini); Drive es recepción y respaldo pasivo'],
        ['Antes de prescribir', 'Confirmar última sesión, recuperación/molestias actuales e identidad; aplicar Alto SFR 40+ y entregar Note v1 + Calentamiento.'],
    ]
    views.append(table('Resumen', ['Dato', 'Valor'], intro))
    views.append(table('Programa', ['Día', 'Puesto', 'Ejercicio', 'Series', 'Repeticiones', 'RIR', 'Descanso', 'Regla técnica', 'ID ejercicio', 'ID estación'],
                       [[s.get(k) for k in ['dia','slot_id','ejercicio_selector','series_base','repeticiones','rir_operativo','descanso','regla_tecnica_estado','exercise_id','machine_id']] for s in slots]))
    views.append(table('Máquinas', ['Referencia de ficha', 'ID estación', 'Nombre', 'Marca/modelo', 'Tipo de carga', 'Base registrada', 'Ajustes', 'Pies/manos', 'Recorrido', 'Estado registrado', 'Última evidencia', 'Próxima acción'],
                       [[f"fila-{m.get('_fila_fuente', i+2)}"] + [m.get(k) for k in ['machine_id','nombre_visible_estacion','marca_modelo','tipo_carga','load_basis','ajustes_reproducibles','pies_manos','rom','estado','ultima_evidencia','proxima_accion']] for i,m in enumerate(maquinas['estaciones'])]))
    follow = []
    for kind, rows in [('Check-in',seguimiento['checkins']),('Medida',seguimiento['medidas']),('Revisión',seguimiento['revisiones'])]:
        for row in rows:
            rid = row.get('checkin_id') or row.get('measure_id') or row.get('review_id')
            substantive = ['peso_medio_kg','peso_medio_matutino_kg','sueno_medio_h','fatiga_1_5','dolor_lumbar_0_10',
                           'dolor_hombro_der_0_10','cintura_usada_cm','cadera_usada_cm','estado_recuperacion',
                           'notas','notas_comparabilidad','decision_semanal']
            populated = any(row.get(k) not in (None,'') for k in substantive)
            raw = json.dumps(row, ensure_ascii=False).lower()
            coverage = 'Prueba; excluir de inferencias' if 'prueba' in raw or 'test-' in raw else ('Observación histórica; verificar procedencia y fecha' if populated else 'Plantilla sin observación en los campos consultados')
            weight = row.get('peso_medio_kg') if row.get('peso_medio_kg') is not None else row.get('peso_medio_matutino_kg')
            follow.append([kind, rid, row.get('fecha') or row.get('Fecha revisión'), coverage, weight, row.get('sueno_medio_h'), row.get('fatiga_1_5'), row.get('notas') or row.get('notas_comparabilidad')])
    views.append(table('Seguimiento', ['Tipo','ID','Fecha','Cobertura','Peso kg','Sueño h','Fatiga 1–5','Notas'], follow))
    views.append(table('Decisiones', ['ID','Fecha','Dominio','Decisión','Estado','Motivo','Variable','Revisar cuando','Sustituida por'],
                       [[r.get(k) for k in ['ID','Fecha','Dominio','Decisión','Estado','Motivo / datos usados','Variable modificada','Criterio de revisión','Sustituida/cerrada por']] for r in decisiones['decisiones']]))
    views.append(table('Sesiones', ['Fecha','Día','Título','ID','Finalizada','Calidad','Fuente'], [[s.get(k) for k in ['fecha','dia','titulo','session_id','finished','record_quality','source_file']] for s in registro['sesiones']]))
    views.append(table('Series', ['Fecha','Día','Ejercicio','Serie','Carga kg','Repeticiones','RIR','Base de carga','Variante','Ajustes','ID estación','Grupo comparable','ID sesión','ID serie','Notas'],
                       [[s.get(k) for k in ['fecha','dia','exercise_name','set_index','load_kg','reps','rir','load_basis','variant','machine_settings','machine_id','comparability_group','session_id','set_id','movement_notes']] for s in registro['series']]))
    labels = {'A':'Glúteo prioritario','A/B1':'Glúteo y pierna','B1':'Pierna','B2':'Hombros y espalda','C/B2':'Desarrollo general y marco superior','C':'Desarrollo general','D':'Soporte'}
    views.append(table('Opciones', ['ID candidato','Prioridad corporal','Ejercicio','Función','Papel original','Encaje individual','Confianza original','Fuentes'],
                       [[r.get('ID'),labels.get(r.get('Prioridad regional'), r.get('Prioridad regional'))] + [r.get(k) for k in ['Ejercicio','Familia','Papel','Prueba de encaje','Confianza','Fuente(s)']] for r in catalogos['matriz_seleccion']]))
    views.append(table('Sustituciones', ['Función/puesto','Prioridad original','Función','Primera opción','Alternativas','Qué no conserva','Condición'],
                       [[r.get(k) for k in ['Slot funcional','Prioridad','Función','Primera opción a probar','Alternativas','No conserva completamente','Regla de decisión']] for r in catalogos['sustituciones']]))
    model = modelo_operativo.build(ROOT, registro, programa, maquinas, catalogos, decisiones)
    index = modelo_operativo.knowledge(ROOT)
    return {
        'schema': 'dame_cana_contexto_entrenador.v1',
        'generado_utc': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'autoridad': 'local',
        'entrenador': 'Antigravity / Gemini',
        'fuentes': [{'ruta': s, 'sha256': sha(ROOT/s)} for s in SOURCES],
        'resumen': intro,
        'directrices_prescripcion_40plus': DIRECTRICES_PRESCRIPCION_40PLUS,
        'vistas': views,
        'calidad': summary,
        'pendientes_externos_no_incorporados': pending,
        'version_operativa': '2.1',
        'modelo': model,
        'indice_conocimiento': index,
        'vistas_humanas': modelo_operativo.human_views(views, model, registro),
        'fundamento': model['fuentes_rectores'],
        'regla_prescripcion': model['regla_prescripcion'],
        'objetivos_vigentes': model['objetivos'],
        'limites': [
            'Derivado: verificar huellas o regenerar antes de decidir.',
            'No presupone que Drive esté al día con local ni que local haya recibido todas las sesiones.',
            'Seguimiento incluye datos históricos, pruebas y filas vacías; no inferir estado personal actual.',
            'No hay progresión ni cambios de programa automáticos.',
        ],
    }


def generate():
    data = build()
    OUT.mkdir(parents=True, exist_ok=True)
    context = {k:v for k,v in data.items() if k not in ['vistas','vistas_humanas','modelo','indice_conocimiento']}
    context['conocimiento'] = {'huella':data['indice_conocimiento']['huella'],'archivos':len(data['indice_conocimiento']['archivos']),
                             'revision':data['modelo']['conocimiento']['revision_incorporaciones'],
                             'nota':'Archivos de biblioteca; no equivale a estudios verificados.'}
    context['vistas_disponibles'] = [{'nombre':v['name'], 'filas':len(v['rows'])} for v in data['vistas']]
    registro_local.guardar_atomico(OUT/'CONTEXTO_ENTRENADOR.json', context)
    registro_local.guardar_atomico(OUT/'TABLAS_OPERATIVAS.json', {'generado_utc':data['generado_utc'], 'vistas':data['vistas']})
    registro_local.guardar_atomico(OUT/'VISTAS_HUMANAS.json', {'generado_utc':data['generado_utc'], 'vistas':data['vistas_humanas']})
    registro_local.guardar_atomico(OUT/'MODELO_OPERATIVO.json', data['modelo'])
    registro_local.guardar_atomico(OUT/'INDICE_CONOCIMIENTO.json', data['indice_conocimiento'])
    context['vistas_humanas_disponibles'] = [{'nombre':v['name'],'filas':len(v['rows'])} for v in data['vistas_humanas']]
    registro_local.guardar_atomico(OUT/'CONTEXTO_ENTRENADOR.json', context)
    esc = lambda v: html.escape(text(v), quote=True)
    chunks = ['<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mi sistema de entrenamiento</title>',
              '<style>body{font:17px/1.5 system-ui;margin:0;background:#f5f3ef;color:#202925}main{max-width:1100px;margin:auto;padding:24px}h1{font-size:30px}h2{font-size:22px}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#17634b}details{background:white;margin:16px 0;padding:18px;border-radius:12px}summary{cursor:pointer;font-weight:650}table{border-collapse:collapse;width:100%;font-size:15px}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd;vertical-align:top}th{background:#e9efe9;white-space:nowrap}.scroll{overflow:auto}p{max-width:760px}.warn{border-left:4px solid #a57226;padding-left:14px}@media(max-width:650px){main{padding:15px}th,td{min-width:105px}.summary td{min-width:0}h1{font-size:25px}}</style><main><h1>Mi sistema de entrenamiento</h1>',
              f"<p>Vista de consulta generada: {esc(data['generado_utc'])}. Autoridad local (Antigravity / Gemini).</p>",
              '<p class="warn">Antes de usar el siguiente día, comprueba que el último entrenamiento esté incorporado. Un dato histórico o de prueba no describe tu estado actual. Esta vista se regenera: no es un formulario.</p>',
              '<nav><a href="../../README.md">Cómo funciona</a><a href="../../docs/PERFIL_PERSONAL_UNIFICADO.md">Mi perfil</a><a href="../../docs/PROGRAMA_ACTIVO.md">Programa activo</a><a href="../../biblioteca/EMPEZAR_AQUI.md">Biblioteca</a><a href="../../docs/GOBIERNO_ENTRENAMIENTO_Y_CONOCIMIENTO.md">Gobierno y ciclos</a><a href="DAME_CANA_OPERATIVO_LOCAL.xlsx">Libro operativo</a><a href="TABLAS_OPERATIVAS.json">Datos avanzados</a></nav>']
    for i,v in enumerate(data['vistas_humanas']):
        chunks.append(f"<details {'open' if i<2 else ''}><summary>{esc(v['name'])} · {len(v['rows'])} filas</summary><div class=\"scroll\"><table class=\"{'summary' if i==0 else ''}\"><thead><tr>" + ''.join('<th>'+esc(h)+'</th>' for h in v['headers']) + '</tr></thead><tbody>')
        chunks.extend('<tr>'+''.join('<td>'+esc(c)+'</td>' for c in row)+'</tr>' for row in v['rows'])
        chunks.append('</tbody></table></div></details>')
    chunks.append('</main></html>')
    (OUT/'MI_SISTEMA.html').write_text('\n'.join(chunks), encoding='utf-8')
    try:
        import generar_hojas
        generar_hojas.generar_hoja_operativa(OUT/'DAME_CANA_OPERATIVO_LOCAL.xlsx')
    except Exception:
        pass
    return data


def backup(data):
    extra_candidates = [
        'docs/GUIA_APP.md',
        'docs/PROGRAMA_ACTIVO.md',
        'docs/CALIDAD_Y_PENDIENTES.md',
        'docs/GUIA_GRAFICA_EJERCICIOS.md',
        'outputs/operativo/LEEME_DRIVE.md',
        'outputs/operativo/CONTEXTO_ENTRENADOR.json',
        'outputs/operativo/TABLAS_OPERATIVAS.json',
        'outputs/operativo/VISTAS_HUMANAS.json',
        'outputs/operativo/MODELO_OPERATIVO.json',
        'outputs/operativo/INDICE_CONOCIMIENTO.json',
        'outputs/operativo/MI_SISTEMA.html',
        'outputs/operativo/DAME_CANA_OPERATIVO_LOCAL.xlsx',
        'outputs/operativo/HUELLAS_LIBRO.json',
    ]
    files = list(SOURCES) + [c for c in extra_candidates if (ROOT / c).exists()]
    if not (OUT/'DAME_CANA_OPERATIVO_LOCAL.xlsx').exists():
        raise ValueError('Generar el libro antes de empaquetar')
    book = registro_local.leer_json(OUT/'HUELLAS_LIBRO.json')
    if any(sha(OUT/name) != digest for name,digest in book.items()):
        raise ValueError('Libro o contexto desactualizados: regenerar el libro antes del respaldo')
    if modelo_operativo.knowledge(ROOT)['huella'] != data['conocimiento']['huella']:
        raise ValueError('Biblioteca modificada: regenerar contexto y libro antes del respaldo')
    for directory in ['data','biblioteca','docs','tools']:
        for p in (ROOT/directory).rglob('*'):
            rel=p.relative_to(ROOT).as_posix()
            if not p.is_file() or 'backups' in p.relative_to(ROOT).parts or '__pycache__' in p.parts:continue
            if p.suffix.lower() in ['.json','.md','.csv','.txt','.pdf','.xlsx','.py','.jpg','.jpeg','.png']:
                files.append(rel)
    files=sorted(set(files))
    manifest = {'schema':'dame_cana_respaldo_operativo.v1','generado_utc':data['generado_utc'],
                'version_operativa':'2.1','alcance':'Datos, fuentes de datos, biblioteca, instrucciones, herramientas y vistas. Excluye backups previos, caches, dependencias, credenciales y app externa. No configura tareas del PC.',
                'archivos':[{ 'ruta':f, 'sha256':sha(ROOT/f)} for f in files]}
    target = OUT/'RESPALDO_OPERATIVO_LOCAL.zip'
    with zipfile.ZipFile(target.with_suffix('.tmp'), 'w', compression=zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(ROOT/f, f)
        z.writestr('MANIFIESTO.json', json.dumps(manifest,ensure_ascii=False,indent=2))
    target.with_suffix('.tmp').replace(target)
    registro_local.guardar_atomico(OUT/'MANIFIESTO_RESPALDO.json', manifest)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--respaldo', action='store_true')
    args = parser.parse_args()
    data = registro_local.leer_json(OUT/'CONTEXTO_ENTRENADOR.json') if args.respaldo else generate()
    if args.respaldo and any(sha(ROOT/f['ruta']) != f['sha256'] for f in data['fuentes']):
        raise ValueError('Fuentes modificadas: regenerar contexto y libro antes del respaldo')
    if args.respaldo:
        backup(data)
    print(json.dumps({'generado':str(OUT),'sesiones':dict(data['resumen'])['Sesiones'],'vistas':len(data.get('vistas',data.get('vistas_disponibles',[])))},ensure_ascii=False))
