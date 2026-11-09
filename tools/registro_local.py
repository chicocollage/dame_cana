"""Validación e importación local de exportaciones training_log.v1 de la app."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from collections import Counter
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
REGISTRO = ROOT / "data/registro.json"
INBOX = ROOT / "data/inbox_app"
ORIGINALES = ROOT / "data/originales_app"


class ErrorRegistro(ValueError):
    pass


def leer_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def guardar_atomico(path: Path, data):
    temp = path.with_name(path.name + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temp.replace(path)


def limpio(value):
    return None if value in (None, "") else value


def numero(value, field, *, entero=False):
    if value is None or value == "":
        return None
    if isinstance(value, str):
        raw = value.strip().replace(",", ".")
        if not re.fullmatch(r"\d+(?:\.\d+)?", raw):
            raise ErrorRegistro(f"{field}: número no interpretable: {value!r}")
        value = float(raw)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ErrorRegistro(f"{field}: se esperaba un número o vacío")
    if value < 0 or (entero and int(value) != value):
        raise ErrorRegistro(f"{field}: valor negativo o no entero")
    return int(value) if entero else value


def rir_valor(value):
    if value is None or value == "":
        return None
    if isinstance(value, str) and re.fullmatch(r"\d+(?:[.,]\d+)?\s*[-–]\s*\d+(?:[.,]\d+)?", value.strip()):
        return value.strip().replace(",", ".")
    result = numero(value, "set.rir")
    if result is not None and result > 10:
        raise ErrorRegistro("set.rir: RIR > 10 requiere revisión")
    return result


def convertir_record(data: dict, path: Path):
    if data.get("schema") != "training_log.v1":
        raise ErrorRegistro(f"{path.name}: esquema distinto de training_log.v1")
    session = data.get("session")
    if not isinstance(session, dict) or not isinstance(data.get("exercises"), list):
        raise ErrorRegistro(f"{path.name}: faltan session o exercises")
    sid = session.get("id")
    if not isinstance(sid, str) or not re.fullmatch(r"[A-Za-z0-9._-]{5,100}", sid):
        raise ErrorRegistro(f"{path.name}: session.id inválido")
    fecha_raw = session.get("date")
    try:
        if len(str(fecha_raw)) == 10:
            fecha = date.fromisoformat(fecha_raw).isoformat()
        else:
            timestamp = datetime.fromisoformat(str(fecha_raw).replace("Z", "+00:00"))
            fecha = (timestamp.astimezone(ZoneInfo("Europe/Madrid")).date().isoformat()
                     if timestamp.tzinfo else timestamp.date().isoformat())
    except (TypeError, ValueError):
        raise ErrorRegistro(f"{path.name}: session.date inválida") from None
    if session.get("finished") is not True:
        raise ErrorRegistro(f"{path.name}: la sesión no consta como finalizada")
    title = session.get("title") or "Sesión sin título"
    if not isinstance(title, str):
        raise ErrorRegistro(f"{path.name}: session.title inválido")
    day_match = re.match(r"^D[ií]a\s+([ABCDE])(?=$|[\s·:—–-])", title.strip(), flags=re.IGNORECASE)
    day = day_match.group(1).upper() if day_match else None
    exported_at = data.get("exported_at")
    if exported_at:
        try:
            datetime.fromisoformat(exported_at.replace("Z", "+00:00"))
        except (TypeError, ValueError):
            raise ErrorRegistro(f"{path.name}: exported_at inválido") from None

    sets = []
    exercise_indices = set()
    for position, exercise in enumerate(data["exercises"], 1):
        if not isinstance(exercise, dict):
            raise ErrorRegistro("Ejercicio no estructurado")
        eidx = numero(exercise.get("index", position), "exercise.index", entero=True)
        if not eidx or eidx in exercise_indices:
            raise ErrorRegistro("Índice de ejercicio ausente o duplicado")
        exercise_indices.add(eidx)
        name = exercise.get("name")
        if not isinstance(name, str) or not name.strip():
            raise ErrorRegistro("Ejercicio sin nombre")
        identity = exercise.get("identity") or {}
        prescription = exercise.get("prescription") or {}
        result = exercise.get("result") or {}
        if not isinstance(identity, dict) or not isinstance(prescription, dict) or not isinstance(result, dict):
            raise ErrorRegistro(f"{name}: identity/prescription/result inválido")
        result_sets = result.get("sets") or []
        if not isinstance(result_sets, list):
            raise ErrorRegistro(f"{name}: result.sets inválido")
        seen = set()
        for set_position, raw_set in enumerate(result_sets, 1):
            if not isinstance(raw_set, dict):
                raise ErrorRegistro(f"{name}: serie no estructurada")
            sidx = numero(raw_set.get("index", set_position), "set.index", entero=True)
            if not sidx or sidx in seen:
                raise ErrorRegistro(f"{name}: índice de serie ausente o duplicado")
            seen.add(sidx)
            resistance = raw_set.get("resistance") or {}
            if not isinstance(resistance, dict):
                raise ErrorRegistro(f"{name}: resistencia inválida")
            rir = rir_valor(raw_set.get("rir"))
            sets.append({
                "set_id": f"{sid}__E{eidx}__S{sidx}", "session_id": sid,
                "fecha": fecha, "dia": day, "exercise_order": eidx,
                "exercise_name": name.strip(),
                "exercise_id": limpio(identity.get("exercise_id")),
                "slot_id": limpio(identity.get("slot_id")),
                "machine_id": limpio(identity.get("machine_id")),
                "variant": limpio(identity.get("variant")),
                "machine_settings": limpio(identity.get("machine_settings")),
                "load_basis": limpio(identity.get("load_basis")) or "unknown",
                "resistance_mode": limpio(identity.get("resistance_mode")) or limpio(resistance.get("mode")),
                "resistance_difficulty": limpio(resistance.get("difficulty")),
                "set_index": sidx,
                "load_kg": numero(raw_set.get("load_kg"), "set.load_kg"),
                "reps": numero(raw_set.get("reps"), "set.reps", entero=True),
                "rir": rir, "per_side": bool(prescription.get("per_side", False)),
                "movement_notes": limpio(result.get("movement_notes")),
                "comparability_group": limpio(identity.get("comparability_group")),
                "source_file": path.name,
            })
    recorded = sum(s["reps"] is not None for s in sets)
    declared_recorded = numero(session.get("recorded_set_count"), "recorded_set_count", entero=True)
    if declared_recorded is not None and declared_recorded != recorded:
        raise ErrorRegistro(f"{path.name}: el recuento declarado de series con repeticiones difiere")
    declared_planned = numero(session.get("planned_set_count"), "planned_set_count", entero=True)
    if declared_planned is not None and declared_planned != len(sets):
        raise ErrorRegistro(f"{path.name}: el recuento declarado de series previstas difiere")
    declared_exercises = numero(session.get("exercise_count"), "exercise_count", entero=True)
    if declared_exercises is not None and declared_exercises != len(data["exercises"]):
        raise ErrorRegistro(f"{path.name}: el recuento declarado de ejercicios difiere")
    if len({s["set_id"] for s in sets}) != len(sets):
        raise ErrorRegistro(f"{path.name}: set_id repetido")
    session_row = {
        "session_id": sid, "fecha": fecha, "dia": day, "titulo": title,
        "finished": True, "record_quality": "app_export",
        "exercise_count": len(data["exercises"]),
        "planned_set_count": len(sets),
        "recorded_set_count": recorded, "source_note": limpio(session.get("source_note")),
        "exported_at": exported_at, "source_file": path.name,
    }
    return session_row, sets


def convertir_app(path: Path):
    payload = leer_json(path)
    if not isinstance(payload, dict):
        raise ErrorRegistro(f"{path.name}: el JSON debe contener un objeto")
    if payload.get("schema") == "training_log.v1":
        records = [payload]
    elif payload.get("schema") == "training_history.v1":
        if payload.get("session_schema") != "training_log.v1" or not isinstance(payload.get("sessions"), list):
            raise ErrorRegistro(f"{path.name}: contenedor de historial inválido")
        records = payload["sessions"]
    else:
        raise ErrorRegistro(f"{path.name}: esquema no admitido")
    converted = []
    skipped = 0
    ids = set()
    for record in records:
        if not isinstance(record, dict) or record.get("schema") != "training_log.v1":
            raise ErrorRegistro(f"{path.name}: sesión anidada inválida")
        if not isinstance(record.get("session"), dict):
            raise ErrorRegistro(f"{path.name}: session anidada inválida")
        if record["session"].get("finished") is not True:
            skipped += 1
            continue
        if not record.get("exported_at") and payload.get("exported_at"):
            record = {**record, "exported_at": payload["exported_at"]}
        item = convertir_record(record, path)
        sid = item[0]["session_id"]
        if sid in ids:
            raise ErrorRegistro(f"{path.name}: session.id repetido dentro del archivo")
        ids.add(sid)
        converted.append(item)
    return converted, skipped


COMPARE_FIELDS = (
    "set_id", "exercise_order", "exercise_name", "exercise_id", "slot_id", "machine_id",
    "comparability_group", "variant", "machine_settings",
    "load_basis", "resistance_mode", "resistance_difficulty", "set_index", "load_kg", "reps", "rir",
    "per_side", "movement_notes",
)


def signature(row):
    return tuple(limpio(row.get(field)) for field in COMPARE_FIELDS)


def aplicar_resoluciones_confirmadas(session, sets):
    """Reconcilia solo valores históricos expresamente aclarados por Daniel."""
    conflictos = leer_json(ROOT / "data/conflictos_fuentes.json").get("conflictos", [])
    for conflicto in conflictos:
        if (conflicto.get("estado") != "resuelto_por_usuario"
                or conflicto.get("session_id") != session["session_id"]):
            continue
        campo = conflicto["campo"]
        confirmado = conflicto["valor_confirmado"]
        if campo not in ("fecha", "load_basis", "rir"):
            raise ErrorRegistro(f"Resolución no admitida: {campo}")
        targets = ([session] if campo == "fecha" else
                   [s for s in sets if s["set_id"] in conflicto.get("set_ids", [])])
        permitidos = [confirmado] + [conflicto[k] for k in (
            "valor_registro_hoja", "valor_json_app", "valor_json_original",
            "valor_historial_biblioteca") if k in conflicto]
        if campo == "fecha":
            permitidos = [str(v)[:10] for v in permitidos]
        for target in targets:
            valor = target.get(campo)
            comparable = str(valor)[:10] if campo == "fecha" else valor
            if comparable not in permitidos:
                raise ErrorRegistro(f"Conflicto nuevo fuera de resolución: {session['session_id']} / {campo}")
            target[campo] = confirmado


def validar_registro(data):
    sessions = data.get("sesiones")
    sets = data.get("series")
    if data.get("schema") != "dame_cana_registro.v1" or not isinstance(sessions, list) or not isinstance(sets, list):
        raise ErrorRegistro("data/registro.json: esquema inválido")
    ids = [s.get("session_id") for s in sessions]
    set_ids = [s.get("set_id") for s in sets]
    if len(ids) != len(set(ids)) or len(set_ids) != len(set(set_ids)):
        raise ErrorRegistro("IDs duplicados en el registro")
    id_set = set(ids)
    if any(s.get("session_id") not in id_set for s in sets):
        raise ErrorRegistro("Series sin sesión")
    mismatches = []
    for session in sessions:
        count = sum(s.get("session_id") == session["session_id"] for s in sets)
        if count != session.get("recorded_set_count"):
            mismatches.append({"session_id": session["session_id"],
                               "recuento_declarado": session.get("recorded_set_count"),
                               "filas_de_series": count})
    return {"sesiones": len(sessions), "series": len(sets),
            "ultimo_dia": proximo_dia(sessions)[0], "siguiente_dia": proximo_dia(sessions)[1],
            "recuentos_historicos_distintos": mismatches}


def proximo_dia(sessions):
    reales = [s for s in sessions if s.get("finished") is True and s.get("dia") in ("A", "B", "C", "D", "E")
              and not str(s.get("session_id", "")).startswith("TEST-")]
    if not reales:
        return None, None
    reales.sort(key=lambda s: (str(s.get("fecha", ""))[:10], str(s.get("exported_at", ""))))
    last = reales[-1]
    last_dia = last["dia"]

    # Clasificación biomecánica de estímulos:
    # A: Lower (Glúteo & Cuádriceps)
    # B: Upper (Brazos & Deltoides lateral estiramiento)
    # C: Upper (Torso Pesado: Pectoral & Espalda)
    # D: Lower (Glúteo & Cadena posterior)
    # E: Upper (Brazos, Deltoides post & bombeo)
    tipo_grupo = {
        "A": "LOWER",
        "B": "UPPER",
        "C": "UPPER",
        "D": "LOWER",
        "E": "UPPER",
    }
    rotacion_estandar = {"A": "B", "B": "C", "C": "D", "D": "E", "E": "A"}

    # Auditoría de fatiga reciente (últimas 1-3 sesiones)
    ultimas = reales[-3:]
    tipos_recientes = [tipo_grupo.get(s.get("dia")) for s in ultimas if s.get("dia")]

    # Última fecha en que se realizó cada día
    fechas_por_dia = {}
    for s in reversed(reales):
        d = s.get("dia")
        if d in tipo_grupo and d not in fechas_por_dia:
            fechas_por_dia[d] = str(s.get("fecha", ""))[:10]

    teorico = rotacion_estandar.get(last_dia, "A")

    # Regla 1: Interferencia de fatiga acumulada (anti-interferencia Upper/Lower)
    # Si las últimas 2 o más sesiones fueron UPPER (ej. C, B, B) y el teórico pide UPPER (C, B o E):
    if len(tipos_recientes) >= 2 and all(t == "UPPER" for t in tipos_recientes[-2:]):
        if tipo_grupo.get(teorico) == "UPPER":
            # El tren superior está fatigado/estimulado. Forzar día LOWER (A o D)
            fecha_a = fechas_por_dia.get("A", "1970-01-01")
            fecha_d = fechas_por_dia.get("D", "1970-01-01")
            if fecha_d < fecha_a:
                return last_dia, "D"
            return last_dia, "A"

    # Regla 2: Interferencia de Lower consecutivo
    if len(tipos_recientes) >= 1 and tipos_recientes[-1] == "LOWER":
        if tipo_grupo.get(teorico) == "LOWER":
            # Si se acaba de hacer Lower, alternar a Upper según rotación
            return last_dia, "B" if last_dia == "A" else "E"

    # Regla 3: Satélites repetidos o intercalados sin corromper la cola nuclear
    if last_dia in ("B", "E"):
        nucleares = [s for s in reales if s.get("dia") in ("A", "C", "D")]
        if nucleares:
            ultimo_nuclear = nucleares[-1]["dia"]
            if ultimo_nuclear == "C":
                # Ya se hizo C (Torso Pesado). Tras satélites toca Pierna (A o D)
                fecha_a = fechas_por_dia.get("A", "1970-01-01")
                fecha_d = fechas_por_dia.get("D", "1970-01-01")
                siguiente = "D" if fecha_d < fecha_a else "A"
                return last_dia, siguiente
            elif ultimo_nuclear == "A":
                # Si el último nuclear fue A y ya se hicieron satélites, toca C (Torso)
                return last_dia, "C"
            elif ultimo_nuclear == "D":
                # Si el último nuclear fue D y ya se hicieron satélites, toca A
                return last_dia, "A"

    # Regla 4: Permutación táctica C <-> B cuando Torso Pesado (C) acumula >= 6 días tras Día A
    if last_dia == "A" and "C" in fechas_por_dia and "A" in fechas_por_dia:
        try:
            dias_sin_c = (date.fromisoformat(fechas_por_dia["A"]) - date.fromisoformat(fechas_por_dia["C"])).days
            if dias_sin_c >= 6:
                return last_dia, "C"
        except ValueError:
            pass
    if last_dia == "C" and len(reales) >= 2 and reales[-2].get("dia") == "A":
        return last_dia, "B"

    return last_dia, teorico



def resumen(data):
    checks = validar_registro(data)
    sets = data["series"]
    reales = [s for s in data["sesiones"] if s.get("finished") is True
              and not str(s.get("session_id", "")).startswith("TEST-")]
    latest = max(reales, key=lambda s: (str(s.get("fecha", ""))[:10], str(s.get("exported_at", ""))))
    valid = [s for s in sets if isinstance(s.get("reps"), int) and s["reps"] > 0]
    missing = Counter()
    for row in sets:
        for key in ("exercise_id", "machine_id", "comparability_group", "machine_settings"):
            if not limpio(row.get(key)):
                missing[key] += 1
    checks.update({"series_con_repeticiones": len(valid), "series_sin_repeticiones": len(sets)-len(valid),
                   "ultima_sesion": {"session_id": latest["session_id"],
                                      "fecha": str(latest.get("fecha", ""))[:10],
                                      "dia": latest.get("dia"), "titulo": latest.get("titulo")},
                   "campos_ausentes_en_series": dict(missing),
                   "bases_de_carga": dict(Counter(str(s.get("load_basis")) for s in sets))})
    conflictos = leer_json(ROOT / "data/conflictos_fuentes.json").get("conflictos", [])
    checks["conflictos_fuentes_pendientes"] = sum(c.get("estado") == "pendiente" for c in conflictos)
    return checks


def validar_fuentes():
    manifest = leer_json(ROOT / "data/fuentes/manifest.json")
    entries = manifest.get("archivos")
    if not isinstance(entries, list):
        raise ErrorRegistro("Manifiesto de fuentes inválido")
    for entry in entries:
        path = (ROOT / entry["ruta"]).resolve()
        if not path.is_relative_to(ROOT.resolve()) or not path.is_file():
            raise ErrorRegistro(f"Fuente ausente o fuera del proyecto: {entry['ruta']}")
        if path.stat().st_size != entry["bytes"] or hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            raise ErrorRegistro(f"Fuente alterada: {entry['ruta']}")
    return len(entries)


def importar(path: Path, aplicar: bool):
    registry = leer_json(REGISTRO)
    validar_registro(registry)
    records, skipped = convertir_app(path)
    existing_by_id = {s["session_id"]: s for s in registry["sesiones"]}
    existing_sets = {s["set_id"] for s in registry["series"]}
    outcomes = []
    new_records = []
    for session, sets in records:
        aplicar_resoluciones_confirmadas(session, sets)
        sid = session["session_id"]
        existing = existing_by_id.get(sid)
        if existing:
            if (str(existing.get("fecha", ""))[:10] != session["fecha"]
                    or existing.get("titulo") != session["titulo"]
                    or any(existing.get(k) != session.get(k) for k in
                           ("exercise_count", "planned_set_count", "recorded_set_count"))):
                raise ErrorRegistro(f"Conflicto: {sid} ya existe con fecha, título o recuentos diferentes")
            old = sorted((signature(s) for s in registry["series"] if s["session_id"] == sid), key=str)
            new = sorted((signature(s) for s in sets), key=str)
            if old != new:
                raise ErrorRegistro(f"Conflicto: {sid} ya existe con series diferentes; no se modifica")
            outcomes.append({"session_id": sid, "resultado": "duplicado_igual"})
            continue
        if any(s["set_id"] in existing_sets for s in sets):
            raise ErrorRegistro(f"{sid}: set_id ya existe")
        existing_sets.update(s["set_id"] for s in sets)
        new_records.append((session, sets))
        outcomes.append({"session_id": sid,
                         "resultado": "importado" if aplicar else "listo_para_importar",
                         "filas_de_series": len(sets),
                         "series_con_repeticiones": session["recorded_set_count"]})
    if not aplicar or not new_records:
        return {"archivo": path.name, "sesiones": outcomes, "borradores_omitidos": skipped}
    raw_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    target = ORIGINALES / f"{path.stem}__{raw_hash[:12]}{path.suffix}"
    ORIGINALES.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        shutil.copy2(path, target)
    if hashlib.sha256(target.read_bytes()).hexdigest() != raw_hash:
        raise ErrorRegistro("Falló la comprobación de la copia original")
    backup = ROOT / "data/backups" / f"registro_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}_{hashlib.sha256(REGISTRO.read_bytes()).hexdigest()[:8]}.json"
    backup.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(REGISTRO, backup)
    for session, sets in new_records:
        registry["sesiones"].append(session)
        registry["series"].extend(sets)
        registry.setdefault("importaciones_locales", []).append({
            "session_id": session["session_id"], "archivo": path.name,
            "original_archivado": str(target.relative_to(ROOT)).replace("\\", "/"),
            "sha256": raw_hash,
            "importado_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "filas_de_series": len(sets),
            "series_con_repeticiones": session["recorded_set_count"],
        })
    validar_registro(registry)
    guardar_atomico(REGISTRO, registry)
    return {"archivo": path.name, "sesiones": outcomes, "borradores_omitidos": skipped,
            "respaldo": str(backup.relative_to(ROOT))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("accion", choices=("validar", "resumen", "importar"))
    parser.add_argument("--archivo", type=Path, help="JSON exportado desde la app")
    parser.add_argument("--aplicar", action="store_true", help="Confirma la importación local")
    args = parser.parse_args()
    try:
        if args.accion == "importar":
            files = [args.archivo] if args.archivo else sorted(INBOX.glob("*.json"))
            if not files:
                raise ErrorRegistro("No hay JSON en data/inbox_app")
            result = [importar(path, args.aplicar) for path in files]
        else:
            result = resumen(leer_json(REGISTRO)) if args.accion == "resumen" else validar_registro(leer_json(REGISTRO))
            result["fuentes_originales_verificadas"] = validar_fuentes()
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except (ErrorRegistro, OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from None


if __name__ == "__main__":
    main()
