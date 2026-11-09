"""Regenera la vista legible del programa local (docs/PROGRAMA_ACTIVO.md) desde data/programa.json."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TITULOS_DIA = {
    "A": "Nuclear 1 · Glúteo & Cuádriceps (Cadera y Rodilla pesadas) · *~50 min*",
    "B": "Satélite 1 · Brazos & Deltoides Lateral (Tensión en Estiramiento) · *~25 min*",
    "C": "Nuclear 2 · Torso Pesado (Espalda & Pectoral) · *~50 min*",
    "D": "Nuclear 3 · Glúteo & Cadena Posterior (Unilateral & Cadera) · *~50 min*",
    "E": "Satélite 2 · Brazos, Deltoides Posterior & Detalle (Acortamiento & Bombeo) · *~25 min*",
}

NOTAS_DIA = {
    "B": "> *Nota operativa:* B01 y B02 pueden ejecutarse en superserie antagónica para condensar la sesión en 20–25 min sin pérdida de rendimiento.",
    "E": "> *Nota operativa:* E01 y E02 pueden ejecutarse en superserie antagónica. E05 es un vaciado metabólico opcional sin daño excéntrico.",
}


def generar_vista_programa() -> Path:
    programa = json.loads((ROOT / "data/programa.json").read_text(encoding="utf-8"))
    taxonomy = json.loads((ROOT / "data/taxonomia_operativa.json").read_text(encoding="utf-8"))
    names = {
        "extension_cadera": "extensión de cadera",
        "sentadilla_bilateral": "sentadilla bilateral",
        "sentadilla_unilateral": "sentadilla unilateral",
        "flexion_rodilla": "flexión de rodilla",
        "extension_rodilla": "extensión de rodilla",
        "abduccion_cadera": "abducción de cadera",
        "empuje_torso": "empuje de torso",
        "traccion_vertical": "tracción vertical",
        "traccion_horizontal": "tracción horizontal",
        "extension_hombro": "extensión de hombro",
        "deltoides_lateral": "deltoides lateral",
        "deltoides_posterior": "deltoides posterior",
        "flexion_codo": "flexión de codo",
        "extension_codo": "extensión de codo",
        "flexion_tronco": "flexión de tronco",
        "flexion_plantar": "flexión plantar",
    }
    family_by_slot = {
        slot: names.get(name, name)
        for name, slots in taxonomy.get("familias_movimiento", {}).items()
        for slot in slots
    }

    dias = programa.get("rotacion_dias") or sorted({s.get("dia") for s in programa.get("slots", []) if s.get("dia")})
    secuencia = " \\longrightarrow ".join(f"\\text{{Día {d}}}" for d in dias) + f" \\longrightarrow \\text{{Día {dias[0]}}} \\dots"

    lines = [
        "# Programa activo",
        "",
        f"Versión activa: **{programa['version_activa']}** ({programa.get('modelo_operativo', 'Cola Rodante Asíncrona')}).  ",
        "Esta vista se regenera automáticamente desde [`data/programa.json`](../data/programa.json); las decisiones operativas se registran en [`data/estado_y_decisiones.json`](../data/estado_y_decisiones.json).",
        "",
        "---",
        "",
        "## Principios de Gobierno: Cola Rodante, Alto SFR 40+ y Escultura 70/30",
        "La secuencia no está atada rígidamente al calendario semanal; rota en ciclo continuo guiado por recuperación biológica (**Sistema Vivo**):",
        f"$${secuencia}$$",
        "",
        "- **Punto óptimo 40+ (Alto SFR):** Techo de **3–6 series/grupo/sesión** a **RIR 1–2** (`RIR 0` reservado únicamente a la última serie de analíticos o máquinas estables). Pausa estricta de **~1 s en máximo estiramiento** como seguro tendinoso y al menos **72–96 h** entre sesiones pesadas equivalentes (Día A y Día D).",
        "- **Orden inverso táctico:** Si la carga absoluta de un compuesto genera peaje articular/axial, anteceder el ejercicio analítico estable del día para alcanzar `RIR 1` con menor compresión ósea.",
        "- **Evolución por ciclos (Escultura 70/30):** Este bloque mantiene el foco actual intacto; en futuras transiciones de mesociclo (6–8 semanas), el **70%** de regiones consolidadas pasa a retención activa (**4–6 series/sem RIR 1–2**) y el **30%** (1–2 focos de simetría/proporción) sube a aceleración (**12–16 series/sem F2–F3 al inicio**).",
        "",
    ]

    for day in dias:
        lines.extend([
            "---",
            "",
            f"## Día {day} — {TITULOS_DIA.get(day, 'Sesión')}",
            "",
            "| Posición | Ejercicio o selector | Series | Reps | RIR | Descanso | Región principal | Familia funcional |",
            "|---|---|---:|---|---|---|---|---|",
        ])
        for row in sorted((r for r in programa["slots"] if r.get("dia") == day), key=lambda r: r.get("orden") or 0):
            slot = row["slot_id"]
            parts = [
                slot,
                row.get("ejercicio_selector"),
                row.get("series_base"),
                row.get("repeticiones"),
                row.get("rir_operativo"),
                row.get("descanso"),
                row.get("region_principal") or "",
                family_by_slot.get(slot, "sin clasificar"),
            ]
            parts = [str(x).strip().replace("|", "\\|") if x is not None else "" for x in parts]
            lines.append("| " + " | ".join(parts) + " |")
        if day in NOTAS_DIA:
            lines.extend(["", NOTAS_DIA[day]])
        lines.append("")

    target = ROOT / "docs/PROGRAMA_ACTIVO.md"
    target.write_text("\n".join(lines), encoding="utf-8")
    return target


if __name__ == "__main__":
    print(generar_vista_programa())
