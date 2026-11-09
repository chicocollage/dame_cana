from pathlib import Path
from collections import Counter
from openpyxl import load_workbook
import json

ROOT = Path(__file__).resolve().parents[1]

def rows(path, name):
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[name]
    data = list(ws.values)
    wb.close()
    header = [str(x) if x is not None else '' for x in data[0]]
    return [dict(zip(header, row)) for row in data[1:] if any(x is not None for x in row)]

paths = {
    'local': ROOT / 'DAME_CANA/DAME_CANA_OPERATIVO_v3.xlsx',
    'drive': ROOT / 'work/drive_export_20260929/DAME_CANA_OPERATIVO_drive_20260929.xlsx',
}
for label, path in paths.items():
    sessions = rows(path, '03_SESIONES')
    sets = rows(path, '04_SERIES')
    machines = rows(path, '07_MAQUINAS_PERSONALES')
    program = rows(path, '02_PROGRAMA_ACTIVO')
    log = rows(path, '99_IMPORT_LOG')
    print(json.dumps({
        'source': label, 'counts': {'sessions':len(sessions),'sets':len(sets),'machines':len(machines),'program_slots':len(program),'imports':len(log)},
        'session_ids': [str(x.get('session_id')) for x in sessions],
        'last_sessions': [{k:str(s.get(k)) for k in ('session_id','fecha','dia','titulo','recorded_set_count','source_file')} for s in sessions[-4:]],
        'set_headers': list(sets[0]) if sets else [],
        'sets_missing': {k:sum(not s.get(k) for s in sets) for k in ('exercise_id','slot_id','machine_id','comparability_group','machine_settings')},
        'load_basis':dict(Counter(str(s.get('load_basis')) for s in sets)),
        'completed':dict(Counter(str(s.get('completed')) for s in sets)),
        'last_imports': [{k:str(x.get(k)) for k in ('timestamp','file_name','sessions_inserted','sets_inserted','status')} for x in log[-4:]],
        'machine_headers':list(machines[0]) if machines else [],
        'program_headers':list(program[0]) if program else [],
    }, ensure_ascii=False))

cat = ROOT / 'work/drive_export_20260929/DAME_CANA_CATALOGOS_drive_20260929.xlsx'
for sheet in ('01_MATRIZ_SELECCION','02_SUSTITUCIONES','05_CATALOGO_EJERCICIOS','06_TAXONOMIA_MAQUINAS'):
    data=rows(cat,sheet)
    print(json.dumps({'sheet':sheet,'count':len(data),'headers':list(data[0]) if data else [],'first':data[:1]},default=str,ensure_ascii=False))

current=paths['drive']
for sheet,fields in [
    ('00_CONTEXTO_ACTUAL',('clave','valor','actualizado_at')),
    ('01_ESTADO_ACTUAL',('clave','valor','estado','fecha_corte')),
    ('02_PROGRAMA_ACTIVO',('dia','slot_id','ejercicio_selector','series_base','repeticiones','rir_operativo','exercise_id','machine_id')),
    ('07_MAQUINAS_PERSONALES',('machine_id','nombre_visible_estacion','load_basis','estado','comparabilidad')),
    ('11_DECISIONES',('ID','Decisión','Estado')),
]:
    data=rows(current,sheet)
    print(json.dumps({'sheet':sheet,'rows':[{k:str(x.get(k))[:180] for k in fields} for x in data]},ensure_ascii=False))
