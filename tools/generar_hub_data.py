"""
Genera hub/data-seed.js compilando el estado actual de data/
para que DC Studio funcione de forma inmediata y 100% autónoma en cualquier navegador.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
HUB_DIR = ROOT / "hub"
HUB_DIR.mkdir(parents=True, exist_ok=True)

def load_json(path):
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def main():
    registro = load_json(DATA_DIR / "registro.json")
    programa = load_json(DATA_DIR / "programa.json")
    maquinas = load_json(DATA_DIR / "maquinas.json")
    seguimiento = load_json(DATA_DIR / "seguimiento.json")
    catalogos = load_json(DATA_DIR / "catalogos.json")
    indicaciones = load_json(DATA_DIR / "indicaciones_tecnicas.json")

    payload = {
        "generado_el": "2026-10-14T10:40:00Z",
        "sesiones": registro.get("sesiones", []),
        "series": registro.get("series", []),
        "programa": programa,
        "maquinas": maquinas.get("estaciones", []),
        "seguimiento": seguimiento,
        "indicaciones": indicaciones.get("ejercicios", {})
    }

    out_file = HUB_DIR / "data-seed.js"
    content = "window.DAME_CANA_INITIAL_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    out_file.write_text(content, encoding="utf-8")
    print(f"data-seed.js generado en {out_file} ({len(payload['sesiones'])} sesiones, {len(payload['series'])} series, {len(payload['maquinas'])} máquinas).")

if __name__ == "__main__":
    main()
