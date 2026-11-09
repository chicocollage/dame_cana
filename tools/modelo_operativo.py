"""Proyeccion compatible: clasificaciones separadas, exposiciones y conocimiento."""
from __future__ import annotations
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

def normalized(value):
    text=unicodedata.normalize('NFKC', str(value or ''))
    text=''.join(c for c in text if unicodedata.category(c)!='Cf')
    return re.sub(r'\s+', ' ', text).strip()

def key(value):
    return normalized(value).casefold()

def knowledge(root):
    files=[]
    for p in sorted((root/'biblioteca').rglob('*')):
        if p.is_file():
            files.append({'ruta':p.relative_to(root).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
    digest=hashlib.sha256(json.dumps(files,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
    return {'schema':'dame_cana_indice_conocimiento.v1','archivos':files,'huella':digest,
            'nota':'Inventario de archivos, no numero de estudios ni verificacion global de conclusiones.'}

def build(root, registro, programa, maquinas, catalogos, decisiones):
    cfg=json.loads((root/'data/modelo_operativo.json').read_text(encoding='utf-8'))
    tax=json.loads((root/'data/taxonomia_operativa.json').read_text(encoding='utf-8'))
    changes=json.loads((root/'data/actualizaciones_conocimiento.json').read_text(encoding='utf-8'))
    profile=(root/cfg['fuentes_rectores']['perfil_y_objetivos']).read_text(encoding='utf-8')
    goals={}
    for line in profile.splitlines():
        cells=[v.strip() for v in line.strip().strip('|').split('|')]
        if len(cells)>=3 and cells[0] in ['Objetivo rector','Prioridad glútea','Piernas','Torso']:
            goals[cells[0]]={'valor':cells[1],'procedencia':cells[2]}
    if cfg['schema']!='dame_cana_modelo_operativo.v1':raise ValueError('Modelo incompatible')
    family={slot:code for code,slots in tax['familias_movimiento'].items() for slot in slots}
    slots={s['slot_id']:s for s in programa['slots']}
    stations={s['machine_id'] for s in maquinas['estaciones'] if s.get('machine_id')}
    exercises={r['ID'] for r in catalogos['matriz_seleccion']}
    aliases={}
    for a in cfg['aliases_confirmados']:
        if a['exercise_id'] not in exercises:raise ValueError('Alias sin ejercicio de catalogo')
        k=key(a['nombre'])
        if k in aliases and aliases[k]!=a['exercise_id']:raise ValueError('Alias ambiguo')
        aliases[k]=a['exercise_id']
    links={}
    for l in cfg['enlaces_confirmados']:
        if l['slot_id'] not in slots:raise ValueError('Enlace sin puesto')
        if l['exercise_id'] not in exercises:raise ValueError('Enlace sin ejercicio')
        if l.get('machine_id') and l['machine_id'] not in stations:raise ValueError('Enlace sin estacion')
        if not l.get('evidencia') or not l.get('fecha'):raise ValueError('Enlace sin evidencia fechada')
        if l['slot_id'] in links:raise ValueError('Enlaces activos duplicados')
        links[l['slot_id']]=l
    candidates=[]
    for r in catalogos['matriz_seleccion']:
        candidates.append({'id':r['ID'],'nombre':normalized(r['Ejercicio']),
          'prioridad':cfg['prioridades_corporales'].get(r.get('Prioridad regional'),r.get('Prioridad regional')),
          'funcion_original':r.get('Familia'),'seleccion':'incluido' if any(l['exercise_id']==r['ID'] for l in links.values()) else 'sin_asignar',
          'papel_original':r.get('Papel'),'condicion':r.get('Regla personal / condición') or r.get('Prueba de encaje'),
          'fuentes':r.get('Fuente(s)'),'procedencia':{'tabla':'catalogos.matriz_seleccion','fila':r.get('_fila_fuente')}})
    program=[]
    for s in programa['slots']:
        l=links.get(s['slot_id'],{})
        role=cfg['papeles_por_puesto'].get(s['slot_id'],'sin_asignar')
        if role not in cfg['papeles_programa']:raise ValueError('Papel de puesto desconocido')
        program.append({'puesto':s['slot_id'],'familia':family.get(s['slot_id']),
          'funcion':cfg['familias'].get(family.get(s['slot_id'])),'papel':role,
          'exercise_id':s.get('exercise_id') or l.get('exercise_id'),'machine_id':s.get('machine_id') or l.get('machine_id'),
          'configuracion_id':l.get('configuracion_id'),'seleccion':'incluido',
          'nombre':normalized(s['ejercicio_selector']),'version':s['program_version'],'evidencia':l.get('evidencia')})
    grouped=defaultdict(list)
    for s in registro['series']:grouped[(s['session_id'],s['exercise_order'])].append(s)
    sessions={s['session_id']:s for s in registro['sesiones']}
    exposures=[]
    for (sid,order),rows in grouped.items():
        if sid not in sessions:raise ValueError('Exposicion sin sesion')
        rows=sorted(rows,key=lambda r:r['set_index']);first=rows[0]
        dims=['exercise_name','machine_id','variant','machine_settings','load_basis','resistance_mode']
        if any(any(r.get(d)!=first.get(d) for d in dims) for r in rows):raise ValueError('Identidad incoherente dentro de exposicion')
        exposures.append({'id':f'{sid}__E{order}','session_id':sid,'orden':order,'fecha':sessions[sid]['fecha'],'dia':sessions[sid].get('dia'),
          'nombre_original':first['exercise_name'],'nombre':normalized(first['exercise_name']),
          'exercise_id':first.get('exercise_id') or aliases.get(key(first['exercise_name'])),
          'machine_id':first.get('machine_id'),'variante':first.get('variant'),
          'ajustes':first.get('machine_settings'),'base_carga':first.get('load_basis'),
          'comparabilidad':'pendiente' if not first.get('comparability_group') else 'grupo_registrado_requiere_validacion',
          'prescripcion':'No inferir desde el programa actual; consultar JSON original cuando contiene prescripcion.',
          'series_ids':[r['set_id'] for r in rows],'series_con_reps':sum(isinstance(r.get('reps'),(int,float)) and r['reps']>0 for r in rows),
          'observaciones':list(dict.fromkeys(r['movement_notes'] for r in rows if r.get('movement_notes'))),
          'procedencia':first.get('source_file')})
    decision_rows=[]
    for r in decisiones['decisiones']:
        original=r.get('Estado');state={'ACTIVA':'aplicada','PROPUESTA':'propuesta','CERRADA':'cerrada','SUSTITUIDA':'sustituida'}.get(original,'desconocido')
        decision_rows.append({'id':r['ID'],'fecha':r.get('Fecha'),'dominio':r.get('Dominio'),'cambio':r.get('Decisión'),
          'estado':state,'estado_original':original,'motivo':r.get('Motivo / datos usados'),
          'revision':r.get('Criterio de revisión'),'fuentes':None,'aceptacion':None,
          'nota':'Estado derivado del registro historico; no supone una aceptacion nueva.'})
    for r in cfg['decisiones_nuevas']:
        if r.get('estado') not in cfg['estados_decision']:raise ValueError('Estado de decision desconocido')
        if not all(r.get(k) for k in ['id','fecha','cambio','motivo','objetivos','datos_personales','fuentes','revision']):raise ValueError('Decision sin fundamento o revision')
        if r['estado'] in ['aprobada','aplicada'] and not r.get('aceptacion'):raise ValueError('Decision sin aceptacion')
        decision_rows.append(r)
    if len({r['id'] for r in decision_rows})!=len(decision_rows):raise ValueError('Decisiones duplicadas')
    station_rows=[]
    for i,m in enumerate(maquinas['estaciones']):
        station_rows.append({'referencia_ficha':f"fila-{m.get('_fila_fuente',i+2)}",'machine_id':m.get('machine_id'),
          'nombre':m.get('nombre_visible_estacion'),'marca_modelo':m.get('marca_modelo'),
          'tipo_carga':m.get('tipo_carga'),'base_carga':m.get('load_basis'),
          'identidad':'provisional' if m.get('machine_id') else 'sin_identificar',
          'configuracion_registrada':{'ajustes':m.get('ajustes_reproducibles'),'pies_manos':m.get('pies_manos'),'recorrido':m.get('rom')},
          'encaje_historico':{'fecha':m.get('ultima_evidencia'),'estado_original':m.get('estado'),
             'limitante':m.get('limitante'),'estabilidad':m.get('estabilidad_1_5'),'molestia':m.get('molestia_0_10'),'respuesta_24h':m.get('respuesta_24h')},
          'proxima_accion':m.get('proxima_accion')})
    return {'schema':'dame_cana_proyeccion_operativa.v1','version':'2.0','programa':program,'estaciones':station_rows,
            'opciones':candidates,'exposiciones':exposures,'decisiones':decision_rows,
            'conocimiento':{'revision_incorporaciones':changes['revision'],'nuevos':changes['estudios']},
            'regla_prescripcion':cfg['regla_prescripcion'],'fuentes_rectores':cfg['fuentes_rectores'],'objetivos':goals}

def human_views(legacy, model, registro):
    old={v['name']:v for v in legacy}
    def table(name,headers,rows):return {'name':name,'headers':headers,'rows':rows}
    inicio=list(old['Resumen']['rows'])+[['Fundamento de la rutina','Evidencia pertinente + perfil + objetivos + recuperacion + respuesta registrada']]
    inicio += [[k,v['valor']+' (origen: '+v['procedencia']+')'] for k,v in model['objetivos'].items()]
    inicio += [['Conocimiento nuevo pendiente',sum(s['estado']=='pendiente_contraste' for s in model['conocimiento']['nuevos'])]]
    mp={s['puesto']:s for s in model['programa']}
    programa=[]
    for row in old['Programa']['rows']:
        s=mp[row[1]];programa.append(row[:8]+[s['funcion'],s['papel'],s['exercise_id'],s['machine_id']])
    catalog=[]
    for r in model['opciones']:catalog.append(['Ejercicio',r['id'],r['nombre'],r['funcion_original'],r['seleccion'],r['prioridad'],r['condicion']])
    for r in old['Máquinas']['rows']:catalog.append(['Estación',r[1] or r[0],r[2],r[4],r[9],r[6],r[11]])
    for r in old['Sustituciones']['rows']:catalog.append(['Alternativa',r[0],r[3],r[2],'Condicionada',r[4],str(r[5] or '')+'; '+str(r[6] or '')])
    series={r['set_id']:r for r in registro['series']}
    history=[]
    for e in sorted(model['exposiciones'],key=lambda e:(e['fecha'],e['session_id'],e['orden'])):
        detail=[]
        for rid in e['series_ids']:
            r=series[rid]
            if r.get('resistance_mode') in ['bodyweight','trx']:
                load='autocarga; dificultad '+str(r.get('resistance_difficulty') or 'sin dato')
            else:load=str(r['load_kg'])+' kg' if r.get('load_kg') is not None else 'carga sin dato'
            detail.append(f"S{r['set_index']}: {load}; reps {r.get('reps') if r.get('reps') is not None else 'sin dato'}; RIR {r.get('rir') if r.get('rir') is not None else 'sin dato'}")
        history.append([e['fecha'],e['dia'],e['nombre'],e['series_con_reps'],' | '.join(detail),e['ajustes'],e['base_carga'],e['comparabilidad'],e['id']])
    for s in registro['sesiones']:
        if not any(e['session_id']==s['session_id'] for e in model['exposiciones']):history.append([s['fecha'],s.get('dia'),s['titulo'],0,'Sesión sin desglose',None,None,'Sin referencia',s['session_id']])
    decisions=[[r['id'],r['fecha'],r['dominio'],r['cambio'],r['estado'],r['motivo'],r['revision'],r.get('fuentes'),r.get('aceptacion')] for r in model['decisiones']]
    return [table('Inicio',['Dato','Valor'],inicio),table('Mi programa',old['Programa']['headers'][:8]+['Función','Papel','ID ejercicio','ID estación'],programa),
      table('Ejercicios y máquinas',['Tipo','Referencia','Nombre','Función o carga','Estado','Prioridad o ajustes','Condición o próxima acción'],catalog),
      table('Mi historial',['Fecha','Día','Ejercicio','Series con reps','Resultados registrados','Ajustes','Base de carga','Comparabilidad','Exposición'],history),
      table('Seguimiento',old['Seguimiento']['headers'],old['Seguimiento']['rows']),
      table('Cambios y decisiones',['ID','Fecha','Dominio','Cambio','Estado','Motivo','Revisar cuando','Fuentes nuevas','Aceptación nueva'],decisions)]
