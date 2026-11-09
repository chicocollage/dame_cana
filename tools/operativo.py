"""Orquestador unificado de DAME CAÑA para Antigravity / Gemini.

Proporciona comandos directos y libres de dependencias de terceros:
  python tools/operativo.py resumen      -> Estado actual, sesiones y siguiente día
  python tools/operativo.py sesion [DIA] -> Genera borrador Note v1 para la PWA
  python tools/operativo.py actualizar   -> Procesa inbox_app, actualiza registro y hojas
  python tools/operativo.py regenerar    -> Regenera contexto, vistas HTML y libros XLSX
  python tools/operativo.py respaldo     -> Genera paquete ZIP con manifiesto SHA-256
"""
from __future__ import annotations
from datetime import datetime

import argparse
import json
import subprocess
import sys
from pathlib import Path

import registro_local
import operativo_contexto
import generar_hojas
import revision_diaria
import compilar_app_data
import generar_programa

ROOT = Path(__file__).resolve().parents[1]


def cmd_resumen():
    reg = registro_local.leer_json(ROOT / "data/registro.json")
    res = registro_local.resumen(reg)
    inbox_files = list((ROOT / "data/inbox_app").glob("*.json"))
    
    print("\n" + "="*50)
    print("DAME CAÑA · Estado Operativo Local")
    print("="*50)
    print(f"Sesiones registradas:        {res['sesiones']}")
    print(f"Filas de series:             {res['series']} ({res['series_con_repeticiones']} con reps)")
    if res.get('ultima_sesion'):
        u = res['ultima_sesion']
        print(f"Última sesión:               {u.get('fecha')} · Día {u.get('dia')} ({u.get('titulo')})")
    print(f"Siguiente día sugerido:      Día {res.get('siguiente_dia')}")
    print(f"Archivos en data/inbox_app/: {len(inbox_files)}")
    print("="*50 + "\n")
    return res


def cmd_ejercicio(query: str):
    ind_path = ROOT / "data/indicaciones_tecnicas.json"
    if not ind_path.exists():
        print("data/indicaciones_tecnicas.json no existe. Ejecute tools/construir_indicaciones.py", file=sys.stderr)
        return
    data = registro_local.leer_json(ind_path)
    ejercicios = data.get("ejercicios", {})
    
    match = None
    q = query.strip().lower()
    if query.upper() in ejercicios:
        match = ejercicios[query.upper()]
    else:
        for ex in ejercicios.values():
            if q in ex["nombre"].lower() or q == ex["id"].lower():
                match = ex
                break
                
    if not match:
        print(f"No se encontró ningún ejercicio que coincida con '{query}'", file=sys.stderr)
        return
        
    print("\n" + "="*70)
    print(f"FICHA TÉCNICA: [{match['id']}] {match['nombre']}")
    print(f"Familia: {match.get('familia')} | Región: {match.get('region_principal')}")
    print("="*70)
    b = match["base"]
    print(f"\n[CONFIGURACIÓN BASE]\n{b['configuracion']}")
    print(f"\n[OBJETIVO BIOMECÁNICO]\n{b['objetivo']}")
    
    if match.get("variantes"):
        print("\n[VARIANTES DE ÁNGULO / SENSACIÓN DISPONIBLES]")
        for v in match["variantes"]:
            print(f"  • {v['id']}: {v['cambio']}")
            print(f"    - Sensación: {v['sensacion_buscada']}")
            print(f"    - Setup:     {v['configuracion']}")
            print(f"    - Objetivo:  {v['objetivo']}\n")
            
    resp = match.get("respaldo_cientifico", {})
    if resp:
        print("[RESPALDO CIENTÍFICO]")
        for f in resp.get("fuentes", []):
            print(f"  - {f}")
        print(f"  Justificación: {resp.get('justificacion_biomecanica')}")
    print("="*70 + "\n")


COMPUESTOS_PESADOS = {"A02", "C01", "C02", "C03", "C04", "D01", "D02"}
ANALITICOS_ELONGACION = {"B01", "B02", "B03", "E01", "D03"}

def _doble_progresion_base(series_previas: list[dict], repeticiones_str: str, rir_objetivo: str, series_base: int, slot_id: str = "") -> str:
    import re
    match = re.search(r'(\d+)\s*[–-]\s*(\d+)', repeticiones_str or '')
    rep_min, rep_max = (int(match.group(1)), int(match.group(2))) if match else (8, 12)
    
    series_con_reps = [r for r in series_previas if isinstance(r.get('reps'), (int, float)) and r['reps'] > 0]
    if not series_con_reps:
        return f"Calibrar carga inicial: {series_base} series de {repeticiones_str} reps, RIR {rir_objetivo}. Iniciar con peso moderado para fijar base sin exceder RIR 2."

    cargas = [r['load_kg'] for r in series_con_reps if r.get('load_kg') is not None]
    base_incierta = any(r.get('load_basis') in (None, '', 'unknown', 'unknown_kg_basis') for r in series_con_reps)
    reps_list = [int(r['reps']) for r in series_con_reps]
    carga_ref = cargas[-1] if cargas else None
    carga_max = max(cargas) if cargas else None
    carga_str = f"{carga_ref:g} kg" if carga_ref is not None else "la misma carga"

    # Caso 1: Todas las series alcanzaron o superaron el límite superior del rango
    if all(rp >= rep_max for rp in reps_list):
        reps_str = ", ".join(str(r) for r in reps_list)
        return (f"Doble progresión completada ({len(reps_list)} series a {reps_str} reps con {(f'{carga_max:g} kg' if carga_max is not None else 'la misma carga')}). "
                f"Sugerencia hoy: subir al menor incremento físico disponible de esa estación (confírmalo; no lo inventes) "
                f"y consolidar {rep_min}–{min(rep_min + 2, rep_max)} reps @{rir_objetivo}.")

    # Caso 2: Cargas escalonadas en la última sesión (ej. serie 1 ligera y series 2-3 más pesadas)
    if len(set(cargas)) > 1 and carga_max is not None:
        return (f"Iniciar con {carga_max:g} kg desde la primera serie. "
                f"Objetivo hoy: sumar repeticiones hacia {rep_max} reps @{rir_objetivo} con esa carga.")

    # Caso 3: Casi completado el rango (ej. 10, 10, 9 en rango 6-10)
    min_rp, max_rp = min(reps_list), max(reps_list)
    if max_rp >= rep_max and min_rp >= rep_max - 1:
        return (f"Mantener {carga_str}. Objetivo hoy: cerrar las {rep_max} reps en todas las series "
                f"({min_rp} -> {rep_max} reps) con RIR {rir_objetivo} para completar doble progresión antes de subir carga.")

    # Caso 4: Repeticiones en rango medio (ej. 15 reps en rango 12-20)
    if min_rp >= rep_min:
        prox_target = min(max_rp + 2, rep_max)
        reps_obj = f"{prox_target} reps" if max_rp + 1 >= prox_target else f"{max_rp + 1}–{prox_target} reps"
        return (f"Mantener {carga_str}. Objetivo hoy: progresar a {reps_obj} por serie "
                f"con RIR {rir_objetivo} hacia el tope de {rep_max}.")

    # Caso 5: Alguna serie por debajo de rep_min
    return (f"Mantener {carga_str}. Asegurar que todas las series entren limpias en el rango "
            f"{rep_min}–{rep_max} reps manteniendo RIR {rir_objetivo}.")


def sufijo_sfr_40plus(slot_id: str) -> str:
    if slot_id == "A01":
        return " [SFR 40+: pausa ~1 s en bloqueo (acortamiento); sin RIR 0 en la serie principal]."
    if slot_id in COMPUESTOS_PESADOS:
        return " [SFR 40+: pausa ~1 s en estiramiento sin rebote; prohibido RIR 0; si hay fatiga axial/articular, aplicar orden inverso tras el analítico del día]."
    if slot_id in ANALITICOS_ELONGACION:
        return " [SFR 40+: pausa ~1 s en máximo estiramiento sin rebote; RIR 0 solo en la última serie y sin molestia tendinosa]."
    return " [SFR 40+: control en la fase de mayor tensión; RIR 0 permitido solo en la última serie si tendones al 100%]."


def aconsejar_doble_progresion(series_previas: list[dict], repeticiones_str: str, rir_objetivo: str, series_base: int, slot_id: str = "") -> str:
    consejo = _doble_progresion_base(series_previas, repeticiones_str, rir_objetivo, series_base, slot_id)
    con_reps = [r for r in series_previas if isinstance(r.get('reps'), (int, float)) and r['reps'] > 0]
    if con_reps and any(r.get('load_basis') in (None, '', 'unknown', 'unknown_kg_basis') for r in con_reps) and "Calibrar" not in consejo:
        consejo += " (Base de carga del registro previo no confirmada: calibra con la 1ª serie antes de aplicar cualquier subida.)"
    return consejo


def _sin_patron_nxm(texto: str) -> str:
    """Evita que notas libres del tipo '3x10' se lean como cabecera de ejercicio en la PWA."""
    import re
    return re.sub(r"(\d)\s*[x×]\s*(\d)", r"\1 por \2", texto or "")


def describir_configuracion_registro(series_previas: list[dict], slot_id: str, ejercicio: str, m_info: dict, ficha: dict | None, variante_obj: dict | None) -> str:
    if variante_obj:
        return f"{variante_obj.get('configuracion')} [Variante hoy {variante_obj['id']}: {variante_obj['cambio']}]"

    estaciones_conocidas = {
        # DÍA A: Nuclear 1 · Glúteo & Cuádriceps
        'A01': 'Máquina de discos / hip thrust (almohadilla pélvica, distancia pies para 90° en bloqueo)',
        'A02': 'Hack Matrix (discos añadidos)',
        'A03': 'Máquina de placas · Asiento y respaldo apoyados',
        'A04': 'Máquina Hack (discos añadidos, piernas estiradas)',
        'A05': 'Máquina con placas (kg junto a lb)',
        # DÍA B: Satélite 1 · Brazos & Deltoides Lateral (Estiramiento)
        'B01': 'Polea / cable con cuerda · Tipo katana unilateral',
        'B02': 'Polea baja con maneral D · Brazo detrás del torso',
        'B03': 'Polea a altura de rodilla · Unilateral con maneral o muñequera',
        'B04': 'Suelo o barra de dominadas',
        # DÍA C: Nuclear 2 · Torso Pesado
        'C01': 'DHZ Chest Press con banco integrado (discos ZIVA · respaldo posición 3 desde abajo)',
        'C02': 'Polea alta con agarre medio o neutro',
        'C03': 'Máquina convergente horizontal',
        'C04': 'Máquina ROW con pecho apoyado (discos · asiento 4)',
        'C05': 'Polea alta con brazos rectos',
        # DÍA D: Nuclear 3 · Glúteo & Cadena Posterior
        'D01': 'Smith (banco trasero altura tibia media · discos añadidos)',
        'D02': 'Smith (discos añadidos de ambos lados, barra no incluida)',
        'D03': 'Máquina de placas con selector en kg',
        'D04': 'Máquina con placas · Respaldo 6',
        'D05': 'Polea baja con tobillera',
        # DÍA E: Satélite 2 · Brazos, Deltoides Posterior & Detalle
        'E01': 'Máquina con placas y selector en kg (banco Scott)',
        'E02': 'Polea alta con cuerda · Separando muñecas abajo',
        'E03': 'Máquina Peck-deck inverso o poleas cruzadas',
        'E04': 'Máquina de elevación lateral con placas · Eje del hombro alineado con pivote',
        'E05': 'Máquina con placas · Asiento y respaldo apoyados'
    }

    base = estaciones_conocidas.get(slot_id)
    if base:
        extras = []
        for r in series_previas:
            sett = r.get('machine_settings')
            if sett and sett.lower() not in base.lower():
                extras.append(sett if sett.lower().startswith('asiento') or sett.lower().startswith('respaldo') else f"Ajuste {sett}")
            note = r.get('movement_notes')
            if note and any(k in note.lower() for k in ['agarre', 'katana', 'mano', 'pausa', 'banco', 'cadencia', 'unilateral', 'inclinad']) and note.lower() not in base.lower():
                extras.append(note)
        if extras:
            return f"{base} · {' · '.join(dict.fromkeys(extras))}"
        return base

    if series_previas:
        detalles = []
        for r in series_previas:
            var = r.get('variant')
            if var and var.strip().lower() not in ('máquina', 'maquina', 'variante/máquina no registrada') and var not in detalles:
                detalles.append(var)
        for r in series_previas:
            sett = r.get('machine_settings')
            if sett and sett not in detalles:
                detalles.append(sett if sett.lower().startswith('asiento') or sett.lower().startswith('respaldo') else f"Ajuste {sett}")
        for r in series_previas:
            note = r.get('movement_notes')
            if note and note not in detalles:
                detalles.append(note)
        if detalles:
            return " · ".join(dict.fromkeys(detalles))

    if m_info.get('nombre_visible_estacion'):
        return f"{m_info['nombre_visible_estacion']} · {m_info.get('tipo_carga', '')}".strip(' ·')
    if ficha:
        return f"{ficha.get('familia', 'Estación habitual')} (ajustes reproducibles por calibrar)"
    return "Estación habitual y ajustes reproducibles."


def cmd_sesion(dia_objetivo: str | None = None, variantes_args: list[str] | None = None, incluir_calentamiento: bool = True, silencioso: bool = False):
    reg = registro_local.leer_json(ROOT / "data/registro.json")
    res = registro_local.resumen(reg)
    prog = registro_local.leer_json(ROOT / "data/programa.json")
    maquinas = registro_local.leer_json(ROOT / "data/maquinas.json")
    
    ind_path = ROOT / "data/indicaciones_tecnicas.json"
    ind_data = registro_local.leer_json(ind_path) if ind_path.exists() else {}
    mapeo_slots = ind_data.get("mapeo_slots_programa", {})
    fichas_ejercicios = ind_data.get("ejercicios", {})

    variantes_map = {}
    if variantes_args:
        for item in variantes_args:
            if ":" in item:
                slot, var_id = item.split(":", 1)
                variantes_map[slot.strip().upper()] = var_id.strip().upper()

    dia = (dia_objetivo or res.get('siguiente_dia') or 'A').upper()
    # ── Alerta 72h puente D→A (recambio tendinoso) ──────────────────────────
    if dia == "A":
        _sesiones_D = [
            s for s in reg.get("sesiones", [])
            if (s.get("dia") or "").upper() == "D"
            and (s.get("exported_at") or s.get("fecha"))
        ]
        if _sesiones_D:
            def _ts(s):
                raw = s.get("exported_at") or s.get("fecha") or ""
                try:
                    return datetime.fromisoformat(str(raw)[:19].replace("Z", ""))
                except Exception:
                    return None
            _ts_lista = [_ts(s) for s in _sesiones_D]
            _ts_lista = [t for t in _ts_lista if t]
            if _ts_lista:
                _ultima_D = max(_ts_lista)
                _horas_trans = (datetime.now() - _ultima_D).total_seconds() / 3600
                if _horas_trans < 72:
                    print(
                        f"\n⚠️  ALERTA RECUPERACIÓN: Solo han pasado {_horas_trans:.0f}h desde el "
                        f"Día D ({_ultima_D.strftime('%d/%m %H:%M')}). "
                        f"La ventana de recambio tendinoso es 72–96h. "
                        f"Valora intercalar un día de descanso antes del Día A (cadera pesada).\n"
                    )
    titulos_dia = {
        'A': 'Nuclear 1 · Glúteo y Cuádriceps (Cadera y rodilla pesadas)',
        'B': 'Satélite 1 · Brazos y Deltoides Lateral (Tensión en estiramiento)',
        'C': 'Nuclear 2 · Torso Pesado (Espalda y pectoral)',
        'D': 'Nuclear 3 · Glúteo y Cadena Posterior (Unilateral y cadera)',
        'E': 'Satélite 2 · Brazos, Deltoides Posterior y Detalle (Acortamiento y bombeo)'
    }
    
    slots_dia = [s for s in prog.get('slots', []) if s.get('dia') == dia]
    if not slots_dia:
        print(f"No se encontraron slots para el Día {dia} en data/programa.json", file=sys.stderr)
        return

    sesiones_validas = {
        s['session_id']: s
        for s in reg['sesiones']
        if s.get('finished') and not str(s.get('session_id', '')).startswith('TEST-')
    }

    estaciones_map = {m.get('machine_id'): m for m in maquinas.get('estaciones', []) if m.get('machine_id')}

    lineas_nota = [f"# Día {dia} — {titulos_dia.get(dia, 'Sesión')}", ""]
    def _emit(linea: str = ""):
        lineas_nota.append(linea)
        if not silencioso:
            print(linea)

    if not silencioso:
        print(f"# Día {dia} — {titulos_dia.get(dia, 'Sesión')}\n")
    
    alias_por_slot = {
        'B01': ['katana', 'tríceps overhead en cable', 'triceps overhead en cable'],
        'B02': ['curl bayesiano'],
        'B03': ['elevación lateral unilateral en cable', 'elevacion lateral unilateral en cable'],
        'B04': ['reverse crunch', 'elevación de piernas'],
        'C01': ['press convergente inclinado moderado'],
        'C02': ['jalón medio', 'jalon medio'],
        'C03': ['press horizontal convergente', 'press convergente horizontal'],
        'C04': ['remo con pecho apoyado'],
        'C05': ['pullover en polea'],
        'D01': ['sentadilla búlgara en smith', 'sentadilla bulgara en smith'],
        'D02': ['peso muerto rumano en smith'],
        'D03': ['curl femoral sentado'],
        'D04': ['extensión de rodilla', 'extension de rodilla'],
        'D05': ['abducción unilateral en cable', 'kickback diagonal de glúteo en polea baja'],
        'E01': ['curl predicador'],
        'E02': ['extensión de tríceps en polea con cuerda', 'dual-cable cross pushdown'],
        'E03': ['peck-deck inverso'],
        'E04': ['elevación lateral en máquina', 'elevacion lateral en maquina', 'elevación lateral', 'elevacion lateral'],
        'E05': ['abducción sentada en máquina']
    }

    for s in slots_dia:
        slot_id = s.get('slot_id')
        ejercicio = s.get('ejercicio_selector')
        series_base = s.get('series_base', 3)
        reps = s.get('repeticiones', '8–12')
        rir = s.get('rir_operativo', '1–2')
        descanso = s.get('descanso', '2–3 min')
        m_id = s.get('machine_id')
        m_info = estaciones_map.get(m_id, {})

        # Buscar ficha técnica
        ex_id = mapeo_slots.get(slot_id)
        ficha = fichas_ejercicios.get(ex_id) if ex_id else None

        regla_programa = (s.get("regla_tecnica_estado") or "").strip()
        var_solicitada = variantes_map.get(slot_id)
        if not var_solicitada and regla_programa:
            import re as _re
            m_var = _re.search(r"\b([A-Z]\d{2}-V\d+)\b", regla_programa.upper())
            if m_var:
                var_solicitada = m_var.group(1)
        variante_obj = None
        if ficha and var_solicitada:
            for v in ficha.get("variantes", []):
                if v["id"].upper() == var_solicitada:
                    variante_obj = v
                    break

        # Buscar series previas para este ejercicio en todo el historial válido
        def match_ejercicio(row):
            if row.get('session_id') not in sesiones_validas:
                return False
            if row.get('slot_id'):
                if row.get('slot_id') == slot_id:
                    return True
                if row.get('slot_id') != slot_id:
                    return False
            row_name = (row.get('exercise_name') or '').replace('\u200b', '').strip().lower()
            slot_name = ejercicio.strip().lower()
            if row_name == slot_name:
                return True
            for alias in alias_por_slot.get(slot_id, []):
                if alias in row_name:
                    return True
            base_slot = slot_name.split(';')[0].split('(')[0].strip()
            if base_slot and (base_slot in row_name or (len(row_name) > 6 and row_name in base_slot)):
                return True
            return False

        candidatas = [
            row for row in reg['series']
            if match_ejercicio(row) and isinstance(row.get('reps'), (int, float)) and row['reps'] > 0
        ]
        series_previas = []
        fecha_ultima_ex = None
        if candidatas:
            ultimo_sid = max(
                set(r['session_id'] for r in candidatas),
                key=lambda sid: (str(sesiones_validas[sid].get('fecha', ''))[:10], str(sesiones_validas[sid].get('exported_at', '')))
            )
            fecha_ultima_ex = str(sesiones_validas[ultimo_sid].get('fecha', ''))[:10]
            series_previas = [r for r in candidatas if r['session_id'] == ultimo_sid]
        
        historial_str = "ninguno comparable."
        if series_previas and fecha_ultima_ex:
            partes = []
            for row in series_previas:
                carga = row.get('load_kg')
                r = row.get('reps')
                r_rir = row.get('rir')
                if r is not None and r > 0:
                    rir_part = f" @{r_rir:g}" if isinstance(r_rir, (int, float)) else (f" @{r_rir}" if r_rir is not None else "")
                    carga_part = f"{carga:g} kg" if isinstance(carga, (int, float)) else (f"{carga} kg" if carga is not None else "sin kg")
                    partes.append(f"{carga_part} × {int(r)}{rir_part}")
            if partes:
                historial_str = f"{fecha_ultima_ex}; " + "; ".join(partes)

                # Identificar si en la sesión anterior se registró una variante técnica explícita
                variantes_previas = []
                for row in series_previas:
                    var = row.get('variant')
                    if var and var.strip().lower() not in (
                        'máquina', 'maquina', 'cable', 'polea', 'smith', 'smith/multipower',
                        'cable / polea', 'variante/máquina no registrada', 'mancuernas', 'autocarga'
                    ):
                        if var not in variantes_previas:
                            variantes_previas.append(var)
                    note = row.get('movement_notes')
                    if note and any(k in note.lower() for k in ['variante', 'ángulo', 'angulo', 'torso', 'apoyo', 'agarre', 'cadencia', 'unilateral', 'tempo']) and note not in variantes_previas:
                        variantes_previas.append(note)

                if variantes_previas:
                    historial_str += f" (Variante anterior: {'; '.join(variantes_previas)})"
                historial_str += "."

        _emit(f"{ejercicio} — {series_base} × {reps}")
        _emit(f"RIR {rir} · Descanso {descanso}")
        _emit(f"Último registro: {historial_str}")

        # Indicaciones de la sesión presente:
        consejo_hoy = aconsejar_doble_progresion(series_previas, reps, rir, series_base, slot_id) + sufijo_sfr_40plus(slot_id)
        config_linea = describir_configuracion_registro(series_previas, slot_id, ejercicio, m_info, ficha, variante_obj)

        if variante_obj:
            _emit(f"Hoy: {consejo_hoy}")
            _emit(f"Configuración: {_sin_patron_nxm(config_linea)}")
            _emit(f"Objetivo: {variante_obj['sensacion_buscada']} — {variante_obj['objetivo']}")
            _emit(f"Registra: Carga, reps, RIR y sensaciones con variante {variante_obj['id']}.")
        else:
            _emit(f"Hoy: {consejo_hoy}")
            _emit(f"Configuración: {_sin_patron_nxm(config_linea)}")
            if regla_programa and ("→" in regla_programa or "pausa" in regla_programa.lower()):
                _emit(f"Objetivo: {regla_programa}")
            _emit(f"Registra: Carga, reps, RIR y ajustes exactos si varían.")
        _emit("")

    nota_completa = "\n".join(lineas_nota).strip()
    protocolo_cal = obtener_protocolo_calentamiento(dia)
    exportar_sesion_activa(dia, f"Día {dia} — {titulos_dia.get(dia, 'Sesión')}", nota_completa, protocolo_cal)

    if incluir_calentamiento and not silencioso:
        print()
        print("```text")
        print(protocolo_cal)
        print("```")
    return {"dia": dia, "note_v1": nota_completa, "warmup": protocolo_cal}


def obtener_protocolo_calentamiento(dia: str) -> str:
    dia_u = dia.upper()
    protocolos = {
        "A": """# Protocolo de Calentamiento — Día A (Iniciando con Hack Squat)

1. Preparación articular y movilidad dirigida (3–4 min):
• Tobillo y cápsula coxofemoral: Círculos de cadera y sentadilla profunda isométrica asistida (20–30 s en flexión profunda abriendo rodillas; opcional 30–45 s de mini pistola percutora en cuádriceps/flexores si hay rigidez).
• Activación glútea suave: 10 puentes de glúteo en suelo con pausa 1 s arriba sin fatiga.

2. Rampas de aproximación neuromuscular (Prioridad Sentadilla Hack Matrix G04-V1):
• Rampa 1 (Carro vacío o ~40% carga): 6 reps marcando pies en tercio medio-alto y pausa estricta de 1 s en el fondo sin rebote (RIR > 4).
• Rampa 2 (~65% carga / ~30 kg): 4 reps sintiendo apoyo total de talón y empuje desde glúteo inferior/cuádriceps (RIR > 4).
• Rampa 3 (~80% carga / ~37.5–40 kg): 2 reps a velocidad concéntrica real sin acumular fatiga (RIR > 4).

3. Transiciones posteriores:
• Hip Thrust: 1 rampa de adaptación (~60 kg × 5 reps) para fijar tibia vertical a 90° en bloqueo antes de pasar a los 90 kg efectivos.
• Gemelo en Hack: 1 serie de aproximación al ~50% × 8 reps con pausa 2 s abajo para evitar espasmo en frío.""",
        "B": """# Protocolo de Calentamiento — Día B (Brazos y Deltoides Lateral)

1. Preparación articular específica (3–4 min):
• Rotación glenohumeral y descompresión escapular: Círculos suaves y rotación externa con banda elástica (10–12 reps).
• Flexo-extensión activa de codo y muñeca: 10–15 reps dinámicas para irrigar inserciones distal de bíceps y tríceps previo a elongación máxima.

2. Series de aproximación neuromuscular (Katana Overhead en cable):
• Rampa 1 (~50% carga = 7 kg): 8–10 reps muy controladas, 2 s en estiramiento máximo.
• Rampa 2 (~75% carga = 10–11 kg): 3–4 reps a velocidad real de empuje (RIR > 4).
• Para Bayesian curl y Elevaciones laterales: 1 rampa de adaptación al 70% × 4 reps basta por temperatura acumulada.""",
        "C": """# Protocolo de Calentamiento — Día C (Torso Pesado: Espalda y Pectoral)

1. Preparación articular y cintura escapular (3–4 min):
• Dislocaciones de hombro con goma y retracción/protracción escapular colgado o en cuadrupedia (8–10 reps).
• Extensión y rotación torácica para asegurar arco estable y retracción apoyada bajo carga.

2. Rampas de aproximación neuromuscular (Press convergente inclinado DHZ):
• Rampa 0 (brazos máquina sin discos): 8–10 reps sintiendo trayectoria convergente y posición del respaldo.
• Rampa 1 (~50% carga efectiva): 5 reps a tempo controlado.
• Rampa 2 (~75% carga efectiva): 3 reps concéntrico vivo (RIR > 4).
• Para Jalón medio: 1 rampa al 60–70% × 4–5 reps antes de la primera serie efectiva.""",
        "D": """# Protocolo de Calentamiento — Día D (Glúteo y Cadena Posterior)

1. Movilidad activa y apertura de cadera (3–4 min):
• 90/90 dinámico: 6–8 transiciones lentas por lado para movilidad femoroacetabular y disociación lumbo-pélvica.
• Bisagra de cadera pasiva/activa (hip hinge sin peso): 8–10 reps buscando estiramiento de isquiotibiales proximales.
• Activación glútea terminal: 1 serie de 10 puentes de glúteo unipodales en suelo.

2. Series de aproximación neuromuscular (Sentadilla búlgara en Smith):
• Rampa 0 (autocarga o barra vacía): 5 reps por lado calibrando distancia al banco trasero (altura tibia media).
• Rampa 1 (~50% carga efectiva = 15 kg): 4 reps por lado con pausa de 1 s en el fondo.
• Rampa 2 (~75% carga efectiva = 22.5 kg): 2 reps por lado a velocidad concéntrica real (RIR > 4).
• Para Peso Muerto Rumano (RDL): 1 rampa con 45–50 kg × 4 reps antes de la carga de trabajo.""",
        "E": """# Protocolo de Calentamiento — Día E (Brazos, Deltoides Post y Detalle)

1. Preparación escapulohumeral y articular (3–4 min):
• Y-T-W con banda suave o sin carga: 10 reps activando deltoides posterior, trapecio inferior y rotadores.
• Círculos de codo y muñeca dinámicos sin carga.

2. Aproximación neuromuscular (Primer ejercicio de brazos / predicador o polea):
• Rampa 1 (~50% carga): 8 reps controlando el pico de contracción en acortamiento.
• Rampa 2 (~75% carga): 3–4 reps concéntrico vivo (RIR > 4)."""
    }
    return protocolos.get(dia_u, "1. Movilidad articular específica (3–4 min).\n2. Dos rampas de aproximación (50% y 75%) en el primer ejercicio.")


def exportar_sesion_activa(dia: str, titulo: str, note_v1: str, warmup: str) -> None:
    payload = {
        "schema": "active_prescription.v1",
        "updated_at": datetime.now().isoformat(timespec="seconds"),
        "dia": dia.upper(),
        "titulo": titulo,
        "note_v1": note_v1,
        "warmup": warmup,
        "all_warmups": {d: obtener_protocolo_calentamiento(d) for d in ("A", "B", "C", "D", "E")}
    }
    raw_json = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    destinos = [
        ROOT / "outputs/operativo/SESION_ACTIVA.json",
        ROOT / "pwa/public/sesion_activa.json",
        ROOT / "pwa/public/app/sesion_activa.json",
        ROOT / "pwa/public/tn/sesion_activa.json",
        ROOT / "pwa/public/tn3d/sesion_activa.json",
        ROOT / "pwa/public/bp/sesion_activa.json",
        ROOT / "DameCañaTN/sesion_activa.json",
    ]
    for dest in destinos:
        if dest.parent.exists():
            dest.write_text(raw_json, encoding="utf-8")


def cmd_actualizar():
    print("Ejecutando revisión e importación diaria...")
    res = revision_diaria.ejecutar()
    print(f"Archivos examinados: {res['archivos_examinados']}")
    print(f"Sesiones importadas: {len(res['sesiones_importadas'])}")
    if res['detalle_importado']:
        for d in res['detalle_importado']:
            print(f"  + {d.get('fecha')} · Día {d.get('dia')} ({d.get('session_id')})")
    print(f"Duplicados omitidos: {res['duplicados_iguales']}")
    print(f"Incidencias:        {len(res['incidencias_nuevas'])}")
    
    print("\nRegenerando contexto, vistas HTML, libros Excel y clientes PWA...")
    generar_programa.generar_vista_programa()
    operativo_contexto.generate()
    generar_hojas.generar_hoja_registro()
    compilar_app_data.compilar_todo()
    print("Sistema actualizado con éxito.")


def cmd_regenerar():
    print("Regenerando vistas operativas, HTML y hojas Excel...")
    generar_programa.generar_vista_programa()
    operativo_contexto.generate()
    generar_hojas.generar_hoja_registro()
    print("Sincronizando clientes PWA (DameCañaTN y app base desde data/)...")
    res_pwa = compilar_app_data.compilar_todo()
    mod = res_pwa.get("total_archivos_modificados", 0)
    if mod > 0:
        print(f"  -> {mod} archivos JS de clientes PWA actualizados.")
    else:
        print("  -> Clientes PWA ya estaban 100% alineados con data/.")
    print("Regeneración completa.")


def cmd_sincronizar_app(desplegar: bool = False):
    print("Sincronizando datos de clientes PWA directamente desde 'data/'...")
    cmd_sesion(silencioso=True)
    res = compilar_app_data.compilar_todo()
    mod = res.get("total_archivos_modificados", 0)
    if mod > 0:
        print(f"OK: {mod} archivos sincronizados en DameCañaTN y pwa/public/app.")
    else:
        print("OK: Los clientes PWA ya estaban 100% al día con data/.")

    if desplegar:
        print("Lanzando despliegue a Firebase Hosting...")
        cmd = "npx -y firebase-tools deploy --only hosting"
        pwa_dir = ROOT / "pwa"
        ret = subprocess.run(cmd, cwd=pwa_dir, shell=True)
        if ret.returncode == 0:
            print("Despliegue a Firebase completado con éxito.")
        else:
            print(f"Error al desplegar en Firebase (código {ret.returncode}).", file=sys.stderr)


def cmd_respaldo():
    print("Regenerando contexto...")
    generar_programa.generar_vista_programa()
    operativo_contexto.generate()
    generar_hojas.generar_hoja_registro()
    data = registro_local.leer_json(ROOT / "outputs/operativo/CONTEXTO_ENTRENADOR.json")
    print("Empaquetando respaldo operativo...")
    operativo_contexto.backup(data)
    print("Respaldo completado en outputs/operativo/RESPALDO_OPERATIVO_LOCAL.zip")




def cmd_autochequeo(ejecutar_tests: bool = True) -> dict:
    """Ejecuta el ciclo autonomo de higiene (inbox + vistas + tests), auditoria 40+ y deteccion de mejoras."""
    import re
    reporte = {
        "timestamp": datetime.now().isoformat(timespec="seconds"),
        "higiene": {},
        "tests": {},
        "fisiologia": {},
        "nutricion": {},
        "mejoras_detectadas": [],
    }

    inbox_files = list((ROOT / "data/inbox_app").glob("*.json"))
    if inbox_files:
        res_rev = revision_diaria.ejecutar()
        if res_rev["sesiones_importadas"]:
            generar_programa.generar_vista_programa()
            operativo_contexto.generate()
            generar_hojas.generar_hoja_registro()
        res_pwa = compilar_app_data.compilar_todo()
        reporte["higiene"] = {
            "inbox_procesados": res_rev["archivos_examinados"],
            "sesiones_importadas": len(res_rev["sesiones_importadas"]),
            "pwa_archivos_actualizados": res_pwa.get("total_archivos_modificados", 0),
        }
    else:
        res_pwa = compilar_app_data.compilar_todo()
        reporte["higiene"] = {
            "inbox_procesados": 0,
            "sesiones_importadas": 0,
            "pwa_archivos_actualizados": res_pwa.get("total_archivos_modificados", 0),
        }

    if ejecutar_tests:
        proc = subprocess.run(
            [sys.executable, "-m", "unittest", "discover", "-s", "tools", "-p", "test_*.py", "-q"],
            cwd=ROOT,
            capture_output=True,
            text=True,
        )
        salida_err = (proc.stderr or "") + (proc.stdout or "")
        m_ran = re.search(r"Ran\s+(\d+)\s+tests?", salida_err)
        total_t = int(m_ran.group(1)) if m_ran else 0
        ok = proc.returncode == 0
        reporte["tests"] = {"ok": ok, "total": total_t}
        if not ok:
            reporte["mejoras_detectadas"].append(
                f"CRITICO: Fallo en suite de tests ({salida_err.strip().splitlines()[-1] if salida_err.strip() else 'error'})."
            )

    reg = registro_local.leer_json(ROOT / "data/registro.json")
    res_reg = registro_local.resumen(reg)
    prog = registro_local.leer_json(ROOT / "data/programa.json")
    sig_dia = (res_reg.get("siguiente_dia") or "A").upper()
    u_ses = res_reg.get("ultima_sesion") or {}

    sesiones_validas = {
        s["session_id"]: s
        for s in reg.get("sesiones", [])
        if s.get("finished") and not str(s.get("session_id", "")).startswith("TEST-")
    }
    alias_por_slot = {
        'B01': ['katana', 'tríceps overhead en cable', 'triceps overhead en cable'],
        'B02': ['curl bayesiano'],
        'B03': ['elevación lateral unilateral en cable', 'elevacion lateral unilateral en cable'],
        'B04': ['reverse crunch', 'elevación de piernas'],
        'C01': ['press convergente inclinado moderado'],
        'C02': ['jalón medio', 'jalon medio'],
        'C03': ['press horizontal convergente', 'press convergente horizontal'],
        'C04': ['remo con pecho apoyado'],
        'C05': ['pullover en polea'],
        'D01': ['sentadilla búlgara en smith', 'sentadilla bulgara en smith'],
        'D02': ['peso muerto rumano en smith'],
        'D03': ['curl femoral sentado'],
        'D04': ['extensión de rodilla', 'extension de rodilla'],
        'D05': ['abducción unilateral en cable', 'kickback diagonal de glúteo en polea baja'],
        'E01': ['curl predicador'],
        'E02': ['extensión de tríceps en polea con cuerda', 'dual-cable cross pushdown'],
        'E03': ['peck-deck inverso'],
        'E04': ['elevación lateral en máquina', 'elevacion lateral en maquina', 'elevación lateral', 'elevacion lateral'],
        'E05': ['abducción sentada en máquina']
    }

    slots_sig = [s for s in prog.get("slots", []) if s.get("dia") == sig_dia]
    listos_subir = []
    bases_inciertas = []

    for s in slots_sig:
        slot_id = s.get("slot_id")
        ej_nombre = s.get("ejercicio_selector", slot_id)
        reps_str = s.get("repeticiones", "8-12")
        m_rep = re.search(r"(\d+)\s*[–-]\s*(\d+)", reps_str)
        _, rep_max = (int(m_rep.group(1)), int(m_rep.group(2))) if m_rep else (8, 12)

        def _match_row(row):
            if row.get("session_id") not in sesiones_validas:
                return False
            if row.get("slot_id"):
                return row.get("slot_id") == slot_id
            row_name = (row.get("exercise_name") or "").replace("\u200b", "").strip().lower()
            slot_name = ej_nombre.strip().lower()
            if row_name == slot_name:
                return True
            for al in alias_por_slot.get(slot_id, []):
                if al in row_name:
                    return True
            base_slot = slot_name.split(";")[0].split("(")[0].strip()
            return bool(base_slot and (base_slot in row_name or (len(row_name) > 6 and row_name in base_slot)))

        candidatas = [
            r for r in reg.get("series", [])
            if _match_row(r) and isinstance(r.get("reps"), (int, float)) and r["reps"] > 0
        ]
        if candidatas:
            ult_sid = max(
                set(r["session_id"] for r in candidatas),
                key=lambda sid: (str(sesiones_validas[sid].get("fecha", ""))[:10], str(sesiones_validas[sid].get("exported_at", "")))
            )
            previas = [r for r in candidatas if r["session_id"] == ult_sid]
            reps_list = [int(r["reps"]) for r in previas]
            nombre_corto = ej_nombre.split("(")[0].split(";")[0].strip()
            if reps_list and all(rp >= rep_max for rp in reps_list):
                carga_max = max((r["load_kg"] for r in previas if r.get("load_kg") is not None), default=None)
                listos_subir.append(f"{slot_id} {nombre_corto} ({carga_max:g} kg)" if carga_max else f"{slot_id} {nombre_corto}")
            if any(r.get("load_basis") in (None, "", "unknown", "unknown_kg_basis") for r in previas):
                bases_inciertas.append(f"{slot_id} ({nombre_corto})")

    reporte["fisiologia"] = {
        "ultima_sesion": f"{u_ses.get('fecha')} · Día {u_ses.get('dia')}" if u_ses else "Ninguna",
        "siguiente_dia": sig_dia,
        "listos_doble_progresion": listos_subir,
    }
    if bases_inciertas:
        reporte["mejoras_detectadas"].append(
            f"Calibrar load_basis en Día {sig_dia}: {', '.join(bases_inciertas)} tienen base de carga previa no confirmada."
        )

    def _val_medio(v):
        if isinstance(v, (list, tuple)) and len(v) == 2:
            return (float(v[0]) + float(v[1])) / 2.0
        if isinstance(v, (int, float)):
            return float(v)
        return 0.0

    nut_path = ROOT / "data/nutricion.json"
    if nut_path.exists():
        nut = registro_local.leer_json(nut_path)
        dias_nut = nut.get("dias", {})
        obj_vig = nut.get("objetivos_vigentes", {"kcal": 2950, "prot": 165})
        if dias_nut:
            ult_fecha_nut = sorted(dias_nut.keys())[-1]
            d_info = dias_nut[ult_fecha_nut]
            tomas = d_info.get("ingestas") or d_info.get("tomas") or []
            kcal_tot = sum(sum(_val_medio(it.get("kcal", 0.0)) for it in t.get("items", [])) for t in tomas)
            prot_tot = sum(sum(_val_medio(it.get("prot", 0.0)) for it in t.get("items", [])) for t in tomas)
            bolos_40 = 0
            picoteos = 0
            for t in tomas:
                p_toma = sum(_val_medio(it.get("prot", 0.0)) for it in t.get("items", []))
                if p_toma >= 35.0:
                    bolos_40 += 1
                elif 5.0 < p_toma < 25.0:
                    picoteos += 1
            reporte["nutricion"] = {
                "ultimo_dia": ult_fecha_nut,
                "kcal": round(kcal_tot),
                "kcal_obj": obj_vig.get("kcal", 2950),
                "prot_g": round(prot_tot, 1),
                "prot_obj": obj_vig.get("prot", 165),
                "bolos_anabolicos_35g_mas": bolos_40,
                "tomas_subumbral_25g": picoteos,
            }
            if picoteos > 0:
                reporte["mejoras_detectadas"].append(
                    f"Nutrición ({ult_fecha_nut}): {picoteos} ingesta(s) quedaron entre 5–25 g de proteína (sub-umbral leucina 40+). Agrupar en bolos de 40–50 g."
                )
        desconocidos = nut.get("desconocidos", [])
        if desconocidos:
            nombres_desc = [d.get("texto", "?") for d in desconocidos[-5:]]
            reporte["mejoras_detectadas"].append(
                f"Catálogo alimentos.json: {len(desconocidos)} ítem(s) en 'desconocidos' pendientes de alias ({', '.join(nombres_desc)})."
            )

    conf_path = ROOT / "data/conflictos_fuentes.json"
    if conf_path.exists():
        conf = registro_local.leer_json(conf_path)
        lista_c = conf.get("conflictos", []) if isinstance(conf, dict) else []
        pendientes = [c for c in lista_c if c.get("estado") not in ("resuelto", "cerrado", "aceptado")]
        if pendientes:
            reporte["mejoras_detectadas"].append(
                f"Integridad de datos: {len(pendientes)} discrepancia(s) histórica(s) sin resolver en data/conflictos_fuentes.json."
            )

    out_path = ROOT / "outputs/operativo/AUTOCHEQUEO.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(reporte, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("=" * 72)
    print(f"DAME CAÑA · AUTOCHEQUEO & MEJORA CONTINUA ({reporte['timestamp'][:16]})")
    print("=" * 72)
    h = reporte["higiene"]
    t = reporte["tests"]
    t_str = f"{'OK' if t.get('ok') else 'FALLO'} ({t.get('total', 0)}/{t.get('total', 0)} tests)" if t else "omitidos"
    print(f"[1. SALUD TÉCNICA]  Inbox: {h['inbox_procesados']} rev ({h['sesiones_importadas']} nuevas) | PWA sync: {h['pwa_archivos_actualizados']} mod | Tests: {t_str}")

    f = reporte["fisiologia"]
    dp_str = ", ".join(f["listos_doble_progresion"]) if f["listos_doble_progresion"] else "progresando en repeticiones dentro del rango"
    print(f"[2. ENTRENAMIENTO]  Última: {f['ultima_sesion']} -> Toca: Día {f['siguiente_dia']} | Doble prog completa: {dp_str}")

    n = reporte["nutricion"]
    if n:
        print(
            f"[3. NUTRICIÓN 40+]  Último ({n['ultimo_dia']}): {n['kcal']}/{n['kcal_obj']} kcal | "
            f"Prot: {n['prot_g']}/{n['prot_obj']} g | Bolos >=35g: {n['bolos_anabolicos_35g_mas']} | Sub-umbral (<25g): {n['tomas_subumbral_25g']}"
        )
    else:
        print("[3. NUTRICIÓN 40+]  Sin registros en data/nutricion.json")

    print("[4. VECTORES DE AUTOMEJORA DETECTADOS]")
    if reporte["mejoras_detectadas"]:
        for idx, m in enumerate(reporte["mejoras_detectadas"], 1):
            print(f"  {idx}. {m}")
    else:
        print("  ✓ Sistema 100% limpio y calibrado. Cero deuda técnica o nutricional detectada.")
    print("=" * 72)
    return reporte


def main():
    parser = argparse.ArgumentParser(description="Orquestador operativo DAME CAÑA")
    subparsers = parser.add_subparsers(dest="subcomando")

    subparsers.add_parser("resumen", help="Muestra resumen del sistema")
    p_ses = subparsers.add_parser("sesion", help="Prepara la siguiente sesión en formato Note v1")
    p_ses.add_argument("dia", nargs="?", default=None, help="Día específico (A, B, C, D o E)")
    p_ses.add_argument("--variante", action="append", dest="variantes", help="Aplica variante a un slot: SLOT:VAR_ID (ej. C01:G08-V1)")
    p_ses.add_argument("--calentamiento", action="store_true", default=True, help="Incluye bloque de calentamiento (activo por defecto)")
    p_ses.add_argument("--sin-calentamiento", action="store_false", dest="calentamiento", help="Omite el segundo bloque de calentamiento")
    
    p_ej = subparsers.add_parser("ejercicio", help="Muestra la ficha técnica completa y variantes de un ejercicio")
    p_ej.add_argument("query", help="ID (ej. G01, S04) o nombre del ejercicio")
    
    subparsers.add_parser("actualizar", help="Importa sesiones de inbox y regenera vistas")
    subparsers.add_parser("regenerar", help="Regenera contexto, vistas, libros y clientes PWA")
    subparsers.add_parser("respaldo", help="Genera paquete ZIP con manifiesto")
    
    p_sync = subparsers.add_parser("sincronizar_app", help="Compila data/ hacia clientes PWA (DameCañaTN y app)")
    p_sync.add_argument("--desplegar", action="store_true", help="Despliega a Firebase Hosting tras sincronizar")
    p_auto = subparsers.add_parser("autochequeo", help="Ejecuta ciclo autonomo de higiene, tests, auditoria 40+ y mejoras")
    p_auto.add_argument("--sin-tests", action="store_false", dest="tests", default=True, help="Omite la suite de tests")

    args = parser.parse_args()
    if args.subcomando == "resumen" or not args.subcomando:
        cmd_resumen()
    elif args.subcomando == "sesion":
        cmd_sesion(args.dia, args.variantes, incluir_calentamiento=args.calentamiento)
    elif args.subcomando == "ejercicio":
        cmd_ejercicio(args.query)
    elif args.subcomando == "actualizar":
        cmd_actualizar()
    elif args.subcomando == "regenerar":
        cmd_regenerar()
    elif args.subcomando == "sincronizar_app":
        cmd_sincronizar_app(desplegar=args.desplegar)
    elif args.subcomando == "respaldo":
        cmd_respaldo()
    elif args.subcomando == "autochequeo":
        cmd_autochequeo(ejecutar_tests=getattr(args, "tests", True))


if __name__ == "__main__":
    main()
