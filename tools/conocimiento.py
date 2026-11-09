"""Incorpora estudios locales y registra revisiones sin cambiar la rutina."""
from __future__ import annotations
import argparse
import hashlib
import shutil
import re
from datetime import datetime, timezone
from pathlib import Path
import registro_local

ROOT=Path(__file__).resolve().parents[1]
LEDGER=ROOT/'data/actualizaciones_conocimiento.json'

def apply(args):
    ledger=registro_local.leer_json(LEDGER)
    rows=ledger['estudios']; now=datetime.now(timezone.utc).isoformat(timespec='seconds')
    if args.accion=='listar':return ledger
    if not args.id or not re.fullmatch(r'[A-Za-z0-9_-]{3,80}',args.id):raise ValueError('ID requerido: letras, numeros, guion o guion bajo')
    existing=next((r for r in rows if r['id']==args.id),None)
    if args.accion=='incorporar':
        if existing:raise ValueError('ID ya incorporado; no se sobrescribe')
        if not args.archivo or not args.titulo or not args.fuente:raise ValueError('Archivo, titulo y fuente requeridos')
        source=args.archivo.resolve(strict=True)
        if source.suffix.lower() not in ['.pdf','.md','.txt','.json','.csv']:raise ValueError('Formato de estudio no admitido')
        digest=hashlib.sha256(source.read_bytes()).hexdigest()
        for p in (ROOT/'biblioteca').rglob('*'):
            if p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==digest:raise ValueError('Contenido identico ya en biblioteca; no se duplica')
        target=ROOT/'biblioteca/ampliaciones/entradas'/f'{args.id}{source.suffix.lower()}'
        if target.exists():raise ValueError('Destino ya existe')
        record={'id':args.id,'titulo':args.titulo,'fuente':args.fuente,'archivo':target.relative_to(ROOT).as_posix(),
          'sha256':digest,'fecha_ingreso':now,'estado':'pendiente_contraste','tipo':args.tipo,
          'poblacion':args.poblacion,'resultado':None,'limitaciones':None,'aplicabilidad':None,
          'decisiones_a_revisar':[],'contraste':None,'revisado_por':None}
        action='incorporacion_pendiente'
    else:
        if not existing:raise ValueError('Estudio no encontrado')
        if not all([args.resultado,args.limitaciones,args.aplicabilidad,args.contraste,args.revisado_por]):raise ValueError('Revision requiere resultado, limites, aplicabilidad, contraste y revisor')
        record={**existing,'estado':args.estado,'resultado':args.resultado,'limitaciones':args.limitaciones,
          'aplicabilidad':args.aplicabilidad,'contraste':args.contraste,'revisado_por':args.revisado_por,
          'fecha_revision':now,'decisiones_a_revisar':args.decision or []}
        action='revision_documentada'
    if not args.aplicar:return {'validacion':'lista','accion':action,'registro':record,'programa':'sin cambios'}
    backup=ROOT/'data/backups/conocimiento'/f'revision_{ledger["revision"]}_{datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")}.json'
    backup.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(LEDGER,backup)
    if args.accion=='incorporar':
        target.parent.mkdir(parents=True,exist_ok=True)
        try:
            shutil.copy2(source,target)
            if hashlib.sha256(target.read_bytes()).hexdigest()!=digest:raise ValueError('Copia no verificada')
        except Exception:
            if target.exists():target.unlink()
            raise
        rows.append(record)
    else:rows[rows.index(existing)]=record
    ledger['revision']+=1
    ledger['historial'].append({'revision':ledger['revision'],'fecha':now,'id':args.id,'accion':action,
      'antes':existing,'despues':record,'programa_modificado':False})
    try:registro_local.guardar_atomico(LEDGER,ledger)
    except Exception:
        if args.accion=='incorporar':target.unlink(missing_ok=True)
        raise
    return {'accion':action,'id':args.id,'revision':ledger['revision'],'respaldo':str(backup),'programa':'sin cambios',
            'siguiente':'Regenerar contexto y vistas, evaluar decisiones y actualizar respaldo Drive.'}

def parser():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('accion',choices=['listar','incorporar','revisar']);p.add_argument('--id');p.add_argument('--archivo',type=Path)
    for arg in ['titulo','fuente','tipo','poblacion','resultado','limitaciones','aplicabilidad','contraste','revisado-por']:p.add_argument('--'+arg)
    p.add_argument('--decision',action='append');p.add_argument('--estado',choices=['verificado','descartado'],default='verificado')
    p.add_argument('--aplicar',action='store_true');return p

if __name__=='__main__':
    import json
    try:print(json.dumps(apply(parser().parse_args()),ensure_ascii=False,indent=2))
    except (ValueError,OSError) as e:raise SystemExit(str(e))
