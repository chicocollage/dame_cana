"""Revisa exportaciones de la app y mantiene la hoja local derivada."""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import registro_local
import generar_hojas

ROOT = Path(__file__).resolve().parents[1]
INBOX = ROOT / "data/inbox_app"
REGISTRO = ROOT / "data/registro.json"
ESTADO = ROOT / "data/estado_revision_diaria.json"
HOJA = ROOT / "outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx"


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def guardar_estado(data: dict) -> None:
    registro_local.guardar_atomico(ESTADO, data)


def ejecutar() -> dict:
    estado = registro_local.leer_json(ESTADO) if ESTADO.exists() else {}
    incidencias_previas = set(estado.get("incidencias_vistas", []))
    nuevas_incidencias = []
    incidencias_actuales = set()
    importadas = []
    detalle_importado = []
    duplicados = 0
    borradores = 0
    archivos = sorted(INBOX.glob("*.json"))

    for archivo in archivos:
        try:
            previo = registro_local.importar(archivo, aplicar=False)
            if any(s["resultado"] == "listo_para_importar" for s in previo["sesiones"]):
                resultado = registro_local.importar(archivo, aplicar=True)
            else:
                resultado = previo
            for sesion in resultado["sesiones"]:
                if sesion["resultado"] == "importado":
                    importadas.append(sesion["session_id"])
                    detalle_importado.append({
                        "session_id": sesion["session_id"],
                        "filas_de_series": sesion["filas_de_series"],
                        "series_con_repeticiones": sesion["series_con_repeticiones"],
                    })
            duplicados += sum(s["resultado"] == "duplicado_igual" for s in resultado["sesiones"])
            borradores += resultado["borradores_omitidos"]
        except (registro_local.ErrorRegistro, OSError, json.JSONDecodeError) as exc:
            huella = hashlib.sha256((archivo.name + ":" + str(exc)).encode("utf-8")).hexdigest()
            if archivo.is_file():
                try:
                    huella = hashlib.sha256((archivo.name + ":" + sha(archivo) + ":" + str(exc)).encode("utf-8")).hexdigest()
                except OSError:
                    pass
            incidencias_actuales.add(huella)
            if huella not in incidencias_previas:
                nuevas_incidencias.append({"archivo": archivo.name, "motivo": str(exc)})

    registro_local.validar_registro(registro_local.leer_json(REGISTRO))
    fuente_sha = sha(REGISTRO)
    hoja_actualizada = False
    hoja_error = None
    hoja_sha_anterior = estado.get("hoja_sha256")
    if HOJA.exists() and hoja_sha_anterior and sha(HOJA) != hoja_sha_anterior:
        hoja_error = "La hoja local cambió fuera del generador; no se sobrescribió. Revisa esa edición."
    elif not HOJA.exists() or estado.get("registro_sha256") != fuente_sha:
        try:
            generar_hojas.generar_hoja_registro(HOJA)
            hoja_actualizada = True
        except Exception as exc:
            hoja_error = "Falló la generación de la hoja: " + str(exc)

    if hoja_error:
        huella = hashlib.sha256(("hoja:" + hoja_error).encode("utf-8")).hexdigest()
        incidencias_actuales.add(huella)
        if huella not in incidencias_previas:
            nuevas_incidencias.append({"archivo": str(HOJA.relative_to(ROOT)), "motivo": hoja_error})

    estado_nuevo = {
        "schema": "dame_cana_revision_diaria.v1",
        "ultima_revision_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "registro_sha256": fuente_sha if not hoja_error and HOJA.exists() else estado.get("registro_sha256"),
        "hoja_sha256": sha(HOJA) if not hoja_error and HOJA.exists() else hoja_sha_anterior,
        "incidencias_vistas": sorted(incidencias_actuales),
    }
    guardar_estado(estado_nuevo)
    if importadas:
        sesiones_por_id = {s["session_id"]: s for s in registro_local.leer_json(REGISTRO)["sesiones"]}
        for detalle in detalle_importado:
            sesion = sesiones_por_id[detalle["session_id"]]
            detalle["fecha"] = sesion["fecha"]
            detalle["dia"] = sesion.get("dia")
    return {
        "archivos_examinados": len(archivos),
        "sesiones_importadas": importadas,
        "detalle_importado": detalle_importado,
        "duplicados_iguales": duplicados,
        "borradores_omitidos": borradores,
        "hoja_actualizada": hoja_actualizada,
        "incidencias_nuevas": nuevas_incidencias,
        "incidencias_ya_notificadas": len(incidencias_actuales) - len(nuevas_incidencias),
    }


if __name__ == "__main__":
    try:
        print(json.dumps(ejecutar(), ensure_ascii=False, indent=2))
    except (registro_local.ErrorRegistro, OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1) from None
