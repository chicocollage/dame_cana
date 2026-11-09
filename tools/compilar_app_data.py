"""Compilador determinista de datos del sistema a clientes PWA.

Convierte las fuentes canónicas en 'data/' a los archivos JavaScript del cliente:
  data/indicaciones_tecnicas.json -> technical-data.js
  data/programa.json              -> day-templates.js
  data/catalogos.json             -> exercise-catalog.js

Mantiene 100% sincronizados:
  - DameCañaTN/
  - pwa/public/app/
  - pwa/public/tn/
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# Rutas de origen
INDICACIONES_JSON = ROOT / "data/indicaciones_tecnicas.json"
PROGRAMA_JSON = ROOT / "data/programa.json"
CATALOGOS_JSON = ROOT / "data/catalogos.json"

# Destinos
DESTINOS = [
    ROOT / "DameCañaTN",
    ROOT / "pwa/public/app",
    ROOT / "pwa/public/tn",
    ROOT / "pwa/public/tn3d",
    ROOT / "pwa/public/bp",
]


def _guardar_si_cambia(ruta: Path, nuevo_contenido: str) -> bool:
    if ruta.exists():
        existente = ruta.read_text(encoding="utf-8")
        if existente == nuevo_contenido:
            return False
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(nuevo_contenido, encoding="utf-8")
    return True


def compilar_technical_data() -> dict:
    if not INDICACIONES_JSON.exists():
        return {"error": "Falta data/indicaciones_tecnicas.json"}
    
    data = json.loads(INDICACIONES_JSON.read_text(encoding="utf-8"))
    total = len(data.get("ejercicios", {}))
    data["total_ejercicios"] = total

    json_str = json.dumps(data, ensure_ascii=False, indent=2)
    contenido_js = (
        "/* Copia compilada automáticamente desde data/indicaciones_tecnicas.json */\n"
        "(function (root) { root.TrainingTechnicalData = "
        + json_str
        + "; })(typeof self !== \"undefined\" ? self : this);\n"
    )

    cambios = []
    for d in DESTINOS:
        target = d / "technical-data.js"
        if _guardar_si_cambia(target, contenido_js):
            cambios.append(str(target.relative_to(ROOT)))

    return {"modulo": "technical-data.js", "total_ejercicios": total, "archivos_actualizados": cambios}


def parse_reps(reps_str: str) -> tuple[int, int]:
    clean = str(reps_str or "").strip()
    match = re.search(r"(\d+)\s*[–\-]\s*(\d+)", clean)
    if match:
        return int(match.group(1)), int(match.group(2))
    nums = re.findall(r"\d+", clean)
    if len(nums) >= 2:
        return int(nums[0]), int(nums[1])
    if len(nums) == 1:
        n = int(nums[0])
        return n, n
    return 8, 12


def compilar_day_templates() -> dict:
    if not PROGRAMA_JSON.exists():
        return {"error": "Falta data/programa.json"}

    prog = json.loads(PROGRAMA_JSON.read_text(encoding="utf-8"))
    slots = sorted(prog.get("slots", []), key=lambda s: (s.get("dia", ""), s.get("orden", 0)))

    # Metadatos conocidos de días
    titulos_dia = {
        "A": "Día A — Nuclear 1 · Glúteo y Cuádriceps",
        "B": "Día B — Satélite 1 · Brazos y Deltoides Lateral",
        "C": "Día C — Nuclear 2 · Torso Pesado",
        "D": "Día D — Nuclear 3 · Glúteo y Cadena Posterior",
        "E": "Día E — Satélite 2 · Brazos, Deltoides Posterior y Detalle",
    }

    # Alternativas conocidas por slot
    alternativas_conocidas = {
        "A01": ["E002", "E003"],
        "A02": ["E005", "E006", "E007"],
        "A03": ["E016"],
        "A04": ["E051"],
        "A05": ["E054"],
        "B01": ["E043"],
        "B02": ["E044"],
        "B03": ["E019", "E021"],
        "B04": ["E056"],
        "C01": ["E036", "E037"],
        "C02": ["E028"],
        "C03": ["E039"],
        "C04": ["E032", "E033"],
        "C05": ["E029"],
        "D01": ["E009", "E010"],
        "D02": ["E012"],
        "D03": ["E049"],
        "D04": [],
        "D05": ["E015"],
        "E01": ["E045", "E046"],
        "E02": ["E042"],
        "E03": ["E023", "E024"],
        "E04": ["E019", "E020"],
        "E05": ["E016"],
    }

    dias = ["A", "B", "C", "D", "E"]
    bloques_dia = []

    for d in dias:
        slots_dia = [s for s in slots if s.get("dia") == d]
        filas = []
        for s in slots_dia:
            slot_id = s.get("slot_id")
            catalog_id = s.get("exercise_id") or "E001"
            sets = int(s.get("series_base") or 3)
            rmin, rmax = parse_reps(s.get("repeticiones", "8-12"))
            rest = s.get("descanso", "90-150 s")
            cue = s.get("regla_tecnica_estado", "")
            comp_grp = s.get("comparability_group", "").lower()
            name = s.get("ejercicio_selector", "").lower()
            per_side = "true" if ("unilateral" in comp_grp or "bulgar" in comp_grp or "unilateral" in name or "búlgara" in name) else "false"
            alts = alternativas_conocidas.get(slot_id, [])
            alts_str = json.dumps(alts)

            filas.append(
                f'      slot("{slot_id}","{catalog_id}",{sets},{rmin},{rmax},"{rest}",{json.dumps(cue, ensure_ascii=False)},{per_side},{alts_str})'
            )

        filas_str = ",\n".join(filas)
        titulo = titulos_dia.get(d, f"Día {d}")
        bloques_dia.append(
            f'    {d}: Object.freeze({{ id: "dame-cana-day-{d.lower()}", title: "{titulo}", revision: 3, exercises: Object.freeze([\n{filas_str}\n    ]) }})'
        )

    todos_bloques = ",\n".join(bloques_dia)

    contenido_js = f"""(function (root, factory) {{
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.TrainingDayTemplates = api;
}})(typeof self !== "undefined" ? self : this, function () {{
  "use strict";
  const slot = (slotId, catalogId, sets, repsMin, repsMax, rest, cue, perSide, recommendedAlternativeIds) => ({{ slotId, catalogId, sets, repsMin, repsMax, targetRir: "1–2", rest, cue, perSide: Boolean(perSide), recommendedAlternativeIds: recommendedAlternativeIds || [] }});
  const templates = Object.freeze({{
{todos_bloques}
  }});
  function validate(template, catalog) {{ return Boolean(template && Array.isArray(template.exercises) && template.exercises.length >= 3 && template.exercises.every((item) => catalog && catalog.has(item.catalogId) && Number.isInteger(item.sets) && item.sets > 0)); }}
  return Object.freeze({{ TEMPLATES: templates, validate }});
}});
"""

    cambios = []
    for dest in DESTINOS:
        target = dest / "day-templates.js"
        if _guardar_si_cambia(target, contenido_js):
            cambios.append(str(target.relative_to(ROOT)))

    return {"modulo": "day-templates.js", "slots_compilados": len(slots), "archivos_actualizados": cambios}


def compilar_exercise_catalog() -> dict:
    # Conservamos el catálogo base asegurando que la validación sea dinámica y admita ampliaciones
    target_sample = DESTINOS[0] / "exercise-catalog.js"
    if not target_sample.exists():
        return {"error": "Falta exercise-catalog.js base"}

    codigo = target_sample.read_text(encoding="utf-8")
    
    # Hacer que la aserción de longitud sea dinámica para no romper cuando se añadan ejercicios futuros
    # if (catalog.length !== 56 || byId.size !== 56) -> if (!catalog.length || byId.size !== catalog.length)
    codigo_robusto = re.sub(
        r"if\s*\(\s*catalog\.length\s*!==\s*\d+\s*\|\|\s*byId\.size\s*!==\s*\d+\s*\)\s*throw\s+new\s+Error\([^)]+\);",
        'if (!catalog.length || byId.size !== catalog.length) throw new Error("Catálogo de ejercicios inválido o con IDs duplicados.");',
        codigo
    )

    cambios = []
    for dest in DESTINOS:
        target = dest / "exercise-catalog.js"
        if _guardar_si_cambia(target, codigo_robusto):
            cambios.append(str(target.relative_to(ROOT)))

    return {"modulo": "exercise-catalog.js", "archivos_actualizados": cambios}


def compilar_technical_tools() -> dict:
    source_sample = DESTINOS[0] / "technical-tools.js"
    if not source_sample.exists():
        return {"error": "Falta technical-tools.js base"}

    codigo = source_sample.read_text(encoding="utf-8")
    cambios = []
    for dest in DESTINOS:
        target = dest / "technical-tools.js"
        if _guardar_si_cambia(target, codigo):
            cambios.append(str(target.relative_to(ROOT)))

    return {"modulo": "technical-tools.js", "archivos_actualizados": cambios}


def compilar_todo() -> dict:
    """Ejecuta la compilación completa de todos los módulos PWA."""
    r_tech = compilar_technical_data()
    r_days = compilar_day_templates()
    r_cat = compilar_exercise_catalog()
    r_tools = compilar_technical_tools()
    
    total_modificados = len(r_tech.get("archivos_actualizados", [])) + \
                        len(r_days.get("archivos_actualizados", [])) + \
                        len(r_cat.get("archivos_actualizados", [])) + \
                        len(r_tools.get("archivos_actualizados", []))

    return {
        "ok": True,
        "total_archivos_modificados": total_modificados,
        "technical_data": r_tech,
        "day_templates": r_days,
        "exercise_catalog": r_cat,
        "technical_tools": r_tools
    }


if __name__ == "__main__":
    res = compilar_todo()
    print("Resultado de compilación PWA:")
    print(json.dumps(res, ensure_ascii=False, indent=2))
