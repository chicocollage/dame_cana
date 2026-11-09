"""Migración inicial, de una sola ejecución, desde la exportación verificada."""
from __future__ import annotations

from datetime import date, datetime
from hashlib import sha256
from pathlib import Path
from shutil import copy2
import json

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "work/drive_export_20260929"
DATA = ROOT / "data"
OPERATIVO = EXPORT / "DAME_CANA_OPERATIVO_drive_20260929.xlsx"
CATALOGOS = EXPORT / "DAME_CANA_CATALOGOS_drive_20260929.xlsx"


def serial(value):
    if isinstance(value, datetime):
        return value.isoformat(timespec="seconds")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return int(value)
    return value


def table(workbook, sheet_name):
    values = workbook[sheet_name].values
    headers = [str(value) if value is not None else "" for value in next(values)]
    result = []
    for row_number, cells in enumerate(values, 2):
        if not any(value is not None for value in cells):
            continue
        entry = {key: serial(value) for key, value in zip(headers, cells) if key}
        entry["_fila_fuente"] = row_number
        result.append(entry)
    return result


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise FileExistsError(f"Ya existe: {path}")
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def copy_unchanged(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists():
        if digest(source) != digest(target):
            raise FileExistsError(f"Colisión de contenido: {target}")
        return
    copy2(source, target)
    if digest(source) != digest(target):
        raise IOError(f"Copia no íntegra: {target}")


def main():
    if (DATA / "registro.json").exists():
        raise FileExistsError("La migración ya existe; no se sobrescribe.")
    if not OPERATIVO.exists() or not CATALOGOS.exists():
        raise FileNotFoundError("Falta una exportación de origen.")

    workbook = load_workbook(OPERATIVO, read_only=True, data_only=True)
    sesiones = table(workbook, "03_SESIONES")
    series = table(workbook, "04_SERIES")
    programa = table(workbook, "02_PROGRAMA_ACTIVO")
    maquinas = table(workbook, "07_MAQUINAS_PERSONALES")
    estado = table(workbook, "01_ESTADO_ACTUAL")
    decisiones = table(workbook, "11_DECISIONES")
    checkins = table(workbook, "05_CHECKINS")
    medidas = table(workbook, "06_MEDIDAS")
    revisiones = table(workbook, "10_REVISIONES")
    import_log = table(workbook, "99_IMPORT_LOG")
    workbook.close()

    assert len(sesiones) == 24 and len(series) == 316
    assert len({x["session_id"] for x in sesiones}) == len(sesiones)
    assert len({x["set_id"] for x in series}) == len(series)
    session_ids = {x["session_id"] for x in sesiones}
    assert all(x["session_id"] in session_ids for x in series)
    assert len(programa) == 21

    fuente = {"tipo": "exportacion_local_de_hoja_drive", "fecha_exportacion": "2026-09-29",
              "archivo": "data/fuentes/DAME_CANA_OPERATIVO_drive_20260929.xlsx",
              "sha256": digest(OPERATIVO)}
    write_json(DATA / "registro.json", {
        "schema": "dame_cana_registro.v1", "corte_sesiones": "2026-09-26",
        "fuente_migracion": fuente, "sesiones": sesiones, "series": series,
        "importaciones_historicas": import_log,
    })
    write_json(DATA / "programa.json", {
        "schema": "dame_cana_programa.v1", "version_activa": "M4-3D-v2.0",
        "fuente_migracion": fuente, "slots": programa,
    })
    write_json(DATA / "maquinas.json", {
        "schema": "dame_cana_maquinas.v1", "fuente_migracion": fuente,
        "estaciones": maquinas,
    })
    write_json(DATA / "estado_y_decisiones.json", {
        "schema": "dame_cana_contexto.v1", "fuente_migracion": fuente,
        "estado_historico": estado, "decisiones": decisiones,
        "nota": "Las entradas de salud fechadas en agosto requieren confirmación actual antes de prescribir.",
    })
    write_json(DATA / "seguimiento.json", {
        "schema": "dame_cana_seguimiento.v1", "fuente_migracion": fuente,
        "checkins": checkins, "medidas": medidas, "revisiones": revisiones,
    })

    catalogo = load_workbook(CATALOGOS, read_only=True, data_only=True)
    selected = {
        "matriz_seleccion": "01_MATRIZ_SELECCION",
        "sustituciones": "02_SUSTITUCIONES",
        "ejercicios": "05_CATALOGO_EJERCICIOS",
        "taxonomia_maquinas": "06_TAXONOMIA_MAQUINAS",
        "fuentes_matriz": "14_FUENTES_MATRIZ",
    }
    payload = {key: table(catalogo, name) for key, name in selected.items()}
    catalogo.close()
    write_json(DATA / "catalogos.json", {
        "schema": "dame_cana_catalogos.v1",
        "fuente_migracion": {"archivo": "data/fuentes/DAME_CANA_CATALOGOS_drive_20260929.xlsx",
                             "sha256": digest(CATALOGOS)},
        **payload,
    })

    copy_unchanged(OPERATIVO, DATA / "fuentes" / OPERATIVO.name)
    copy_unchanged(CATALOGOS, DATA / "fuentes" / CATALOGOS.name)
    originals = sorted((ROOT / "DAME_CANA/02_JSON_PROCESADOS").glob("*.json"))
    originals.append(EXPORT / "DIRECT_SYNC_20260926_182824.json")
    for source in originals:
        copy_unchanged(source, DATA / "originales_app" / source.name)
    write_json(DATA / "fuentes/manifest.json", {
        "fecha": "2026-09-29", "archivos": [
            {"ruta": str(path.relative_to(ROOT)).replace("\\", "/"), "sha256": digest(path), "bytes": path.stat().st_size}
            for path in sorted((DATA / "fuentes").glob("*.xlsx"))
            if path.name != "manifest.json"
        ] + [
            {"ruta": str(path.relative_to(ROOT)).replace("\\", "/"), "sha256": digest(path), "bytes": path.stat().st_size}
            for path in sorted((DATA / "originales_app").glob("*.json"))
        ],
    })
    (DATA / "inbox_app").mkdir(exist_ok=True)
    print(json.dumps({"sesiones": len(sesiones), "series": len(series),
                      "json_app_originales": len(originals), "programa_slots": len(programa)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
