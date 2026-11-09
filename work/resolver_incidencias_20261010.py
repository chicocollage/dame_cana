import json, sys, hashlib, copy
from pathlib import Path
root=Path(r"C:\Users\Daniel\Workspace\DAME_CANA-20260920T085206Z-1-001")
sys.path.insert(0,str(root/"tools"))
import registro_local as api
reg=api.leer_json(root/"data/registro.json")
before=copy.deepcopy(reg)
cf=api.leer_json(root/"data/conflictos_fuentes.json")
confirm=api.leer_json(root/"data/confirmaciones_usuario.json")
values={"msuivxba-0iepej":"2026-08-14","msvek8wz-k1lvmc":"total_kg","mu18ew6n-pil4bv":1}
literal="Daniel: 1. 14/08; 2. Peso total; 3. 1 rir. Deja esas incidencias resueltas."
resolved=[]
for c in cf["conflictos"]:
    if c.get("estado")!="pendiente": continue
    sid=c["session_id"]
    assert sid in values
    field=c["campo"]; value=values[sid]
    targets=([s for s in reg["sesiones"] if s["session_id"]==sid] if field=="fecha"
             else [s for s in reg["series"] if s["set_id"] in c["set_ids"]])
    assert len(targets)==(1 if field=="fecha" else len(c["set_ids"]))
    changes=[]
    for target in targets:
        old=target.get(field); target[field]=value
        changes.append({"id":target.get("set_id",sid),"antes":old,"despues":value})
    c.update(estado="resuelto_por_usuario",valor_confirmado=value,fecha_resolucion="2026-10-10",
             fuente_resolucion=literal,resolucion="Confirmación expresa de Daniel prevalece sobre variantes anteriores. No reabrir por reimportación de esas mismas variantes.",
             cambios_aplicados=changes)
    entry={"fecha":"2026-10-10","dato":"resolucion_"+sid+"_"+field,"session_id":sid,"campo":field,
           "set_ids":c.get("set_ids",[]),"valor":value,"fuente":literal,
           "alcance":"Solo los IDs y el campo indicados; originales conservados"}
    confirm["confirmaciones"].append(entry)
    reg.setdefault("correcciones_usuario",[]).append({"fecha_confirmacion":"2026-10-10",
        "session_id":sid,"campo":field,"set_ids":c.get("set_ids",[]),"valor_confirmado":value,
        "cambios":changes,"fuente":literal})
    resolved.append(c)
assert len(resolved)==3
# Solo cambia el RIR no registrado: fecha y base de carga ya tenían el valor confirmado.
assert before["sesiones"]==reg["sesiones"]
seriesdiff=[(a,b) for a,b in zip(before["series"],reg["series"]) if a!=b]
assert len(seriesdiff)==1
a,b=seriesdiff[0]
assert b["set_id"]=="mu18ew6n-pil4bv__E6__S3" and a["rir"] is None and b["rir"]==1
assert {k:v for k,v in a.items() if k!="rir"}=={k:v for k,v in b.items() if k!="rir"}
api.validar_registro(reg)
cf["fecha_revision"]="2026-10-10"
for filename,payload in (("registro.json",reg),("confirmaciones_usuario.json",confirm),("conflictos_fuentes.json",cf)):
    api.guardar_atomico(root/"data"/filename,payload)
# Reimportaciones históricas conservan las decisiones; discrepancias distintas siguen fallando.
s={"session_id":"msuivxba-0iepej","fecha":"2026-08-15"}
api.aplicar_resoluciones_confirmadas(s,[])
assert s["fecha"]=="2026-08-14"
s={"session_id":"msvek8wz-k1lvmc"}
sets=[{"set_id":sid,"load_basis":"per_side_kg","load_kg":load} for sid,load in
      [("msvek8wz-k1lvmc__E6__S1",18),("msvek8wz-k1lvmc__E6__S2",14)]]
api.aplicar_resoluciones_confirmadas(s,sets)
assert all(x["load_basis"]=="total_kg" for x in sets) and [x["load_kg"] for x in sets]==[18,14]
s={"session_id":"mu18ew6n-pil4bv"}
sets=[{"set_id":"mu18ew6n-pil4bv__E6__S3","rir":None},{"set_id":"otro","rir":None}]
api.aplicar_resoluciones_confirmadas(s,sets)
assert sets[0]["rir"]==1 and sets[1]["rir"] is None
sets[0]["rir"]=3
try:
    api.aplicar_resoluciones_confirmadas(s,sets)
except api.ErrorRegistro: pass
else: raise AssertionError("Se ocultó una discrepancia nueva")
summary=api.resumen(api.leer_json(root/"data/registro.json"))
assert summary["conflictos_fuentes_pendientes"]==0
assert summary["sesiones"]==26 and summary["series"]==371
result={"fecha":"2026-10-10","resoluciones":3,"pendientes":0,
        "sesiones":26,"filas_series":371,"series_modificadas":1,
        "fuentes_originales_verificadas":api.validar_fuentes(),
        "regresion_reimportacion":"OK: valores antiguos reconciliados y nuevos conflictos rechazados",
        "respaldo":"data/backups/resoluciones_usuario_20261010"}
(root/"work/verificacion_resoluciones_20261010.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(result,ensure_ascii=False,indent=2))

