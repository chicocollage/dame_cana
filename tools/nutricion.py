#!/usr/bin/env python3
"""
tools/nutricion.py — Módulo determinista de nutrición dentro de DAME CAÑA.
Opera 100% en local. Estima ingestas por raciones/alias sin exigir gramos exactos.
Lee peso y contexto de seguimiento sin duplicar fuentes.
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
DEFAULT_ALIMENTOS_PATH = DATA_DIR / "alimentos.json"
DEFAULT_NUTRICION_PATH = DATA_DIR / "nutricion.json"
DEFAULT_SEGUIMIENTO_PATH = DATA_DIR / "seguimiento.json"
DEFAULT_BACKUP_DIR = DATA_DIR / "backups"


def normalizar_texto(texto: str) -> str:
    """Normaliza texto: minúsculas, sin acentos gráficos ni puntuación superflua."""
    if not texto:
        return ""
    texto = texto.lower()
    # Descomponer caracteres con tildes (mantener caracteres base)
    nfkd = unicodedata.normalize("NFKD", texto)
    sin_tildes = "".join(c for c in nfkd if not unicodedata.combining(c))
    # Reemplazar puntuación excepto números/letras
    limpio = re.sub(r"[^\w\s\./\+\-]", " ", sin_tildes)
    return " ".join(limpio.split())


def guardar_atomico(path: Path, data: Any, backup_dir: Optional[Path] = None, prefijo_backup: Optional[str] = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if backup_dir and prefijo_backup and path.exists():
        backup_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"{prefijo_backup}_{ts}.json"
        try:
            backup_file.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

    temp = path.with_name(path.name + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    temp.replace(path)


def cargar_alimentos(path: Path = DEFAULT_ALIMENTOS_PATH) -> Dict[str, Any]:
    if not path.exists():
        return {"version": 1, "precios_fecha": "2026-10", "alimentos": []}
    return json.loads(path.read_text(encoding="utf-8"))


def cargar_nutricion(path: Path = DEFAULT_NUTRICION_PATH) -> Dict[str, Any]:
    if not path.exists():
        return {
            "version": 1,
            "objetivo": {
                "fase": "volumen",
                "prot_g_kg": 2.0,
                "kcal_inicial": 2950,
                "kcal_rango": [2800, 3000],
                "ritmo_kg_semana": 0.20,
                "origen": "estimacion_inicial",
            },
            "objetivos_vigentes": {
                "desde": datetime.date.today().isoformat(),
                "kcal": 2950,
                "kcal_rango": [2800, 3000],
                "prot": 165,
                "origen": "estimacion_inicial",
            },
            "modo_presupuesto": {
                "activo": False,
                "eur_semana": 20.0,
                "desde": None,
            },
            "dias": {},
            "desconocidos": [],
        }
    return json.loads(path.read_text(encoding="utf-8"))


def cargar_seguimiento(path: Path = DEFAULT_SEGUIMIENTO_PATH) -> Dict[str, Any]:
    if not path.exists():
        return {"medidas": []}
    return json.loads(path.read_text(encoding="utf-8"))


NUMEROS_PALABRAS = {
    "un": 1.0,
    "una": 1.0,
    "uno": 1.0,
    "medio": 0.5,
    "media": 0.5,
    "dos": 2.0,
    "tres": 3.0,
    "cuatro": 4.0,
    "cinco": 5.0,
    "seis": 6.0,
}


def parsear_ingesta_texto(texto: str, catalogo: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], List[str]]:
    """
    Parsea lenguaje natural tolerando estimaciones caseras ("2 huevos", "plato de lentejas").
    Devuelve (items_encontrados, lista_desconocidos).
    """
    alimentos = catalogo.get("alimentos", [])
    # Indexar alias ordenados por longitud descendente para matchear los más específicos primero
    alias_map: List[Tuple[str, Dict[str, Any]]] = []
    for al in alimentos:
        for al_name in [al.get("id", ""), al.get("nombre", "")] + al.get("alias", []):
            norm = normalizar_texto(al_name)
            if norm:
                alias_map.append((norm, al))

    # Ordenar por longitud de alias decreciente
    alias_map.sort(key=lambda x: len(x[0]), reverse=True)

    # Dividir texto por separadores comunes
    fragmentos = re.split(r"(?:,| y | con |\+|\n| mas | más )", texto, flags=re.IGNORECASE)

    items_res: List[Dict[str, Any]] = []
    desconocidos: List[str] = []

    palabras_relleno = {
        "de", "del", "la", "el", "los", "las", "un", "una", "unos", "unas", "algo", "poco", "para", "comer", "cena", "desayuno"
    }

    for frag in fragmentos:
        frag_clean = frag.strip()
        if not frag_clean:
            continue
        norm_frag = normalizar_texto(frag_clean)
        if not norm_frag or norm_frag in palabras_relleno:
            continue

        match_encontrado = None
        match_alias = ""
        for alias_norm, al_obj in alias_map:
            # Buscar coincidencia de palabra completa o subfrase
            pattern = r"(?:^|\b)" + re.escape(alias_norm) + r"(?:\b|$)"
            if re.search(pattern, norm_frag):
                match_encontrado = al_obj
                match_alias = alias_norm
                break

        if not match_encontrado:
            # Desconocido
            desconocidos.append(frag_clean)
            continue

        # Intentar extraer cantidad numérica o palabra
        resto = re.sub(r"(?:^|\b)" + re.escape(match_alias) + r"(?:\b|$)", " ", norm_frag).strip()

        cantidad = 1.0
        # Comprobar números explícitos (ej. "2", "0.5", "1/2")
        num_match = re.search(r"\b(\d+(?:[\.,]\d+)?)\b", resto)
        if num_match:
            try:
                cantidad = float(num_match.group(1).replace(",", "."))
            except ValueError:
                cantidad = 1.0
        elif "1/2" in resto:
            cantidad = 0.5
        else:
            for palabra, val in NUMEROS_PALABRAS.items():
                if re.search(r"\b" + re.escape(palabra) + r"\b", resto):
                    cantidad = val
                    break

        # Buscar ración específica en raciones del alimento
        raciones = match_encontrado.get("raciones", {})
        racion_seleccionada = None
        for r_name in raciones.keys():
            r_norm = normalizar_texto(r_name)
            if re.search(r"\b" + re.escape(r_norm) + r"\b", norm_frag) or re.search(r"\b" + re.escape(r_norm) + r"\b", match_alias):
                racion_seleccionada = r_name
                break

        if not racion_seleccionada:
            # Ración por defecto (la primera del dict o 100g)
            if raciones:
                racion_seleccionada = list(raciones.keys())[0]
            else:
                racion_seleccionada = "racion"

        items_res.append({
            "id": match_encontrado["id"],
            "nombre": match_encontrado.get("nombre", match_encontrado["id"]),
            "racion": racion_seleccionada,
            "n": cantidad,
        })

    return items_res, desconocidos


def calcular_valores_item(item: Dict[str, Any], catalogo: Dict[str, Any]) -> Dict[str, Any]:
    alimentos = {al["id"]: al for al in catalogo.get("alimentos", [])}
    al_id = item.get("id")
    al_data = alimentos.get(al_id)
    if not al_data:
        return {
            "id": al_id,
            "nombre": item.get("nombre", al_id),
            "gramos_est": 0.0,
            "kcal": [0.0, 0.0],
            "prot": [0.0, 0.0],
            "carb": [0.0, 0.0],
            "grasa": [0.0, 0.0],
            "eur_est": 0.0,
            "confianza": "baja",
        }

    n = float(item.get("n", 1.0))
    raciones = al_data.get("raciones", {})
    racion_nombre = item.get("racion")
    if not racion_nombre and raciones:
        racion_nombre = list(raciones.keys())[0]

    gramos_base = 100.0
    if racion_nombre and racion_nombre in raciones:
        gramos_base = float(raciones[racion_nombre])

    gramos_totales = gramos_base * n

    p100 = al_data.get("por_100g", {})
    kcal_100 = float(p100.get("kcal", 0.0))
    prot_100 = float(p100.get("prot", 0.0))
    carb_100 = float(p100.get("carb", 0.0))
    grasa_100 = float(p100.get("grasa", 0.0))

    kcal_medio = (kcal_100 * gramos_totales) / 100.0
    prot_medio = (prot_100 * gramos_totales) / 100.0
    carb_medio = (carb_100 * gramos_totales) / 100.0
    grasa_medio = (grasa_100 * gramos_totales) / 100.0

    # Determinar confianza e incertidumbre
    # "alta": raciones empaquetadas o unidades fijas (ej. botella, lata, huevo)
    # "media": raciones caseras estándar (plato, tostada, vaso, cucharon)
    # "baja": raciones muy subjetivas (puñado, chorro)
    if racion_nombre in ["botella", "unidad", "lata", "lata_grande", "brick", "scoop", "cacito", "huevo"]:
        confianza = "alta"
        margen = 0.08
    elif racion_nombre in ["plato", "tostada", "rebanada", "vaso", "tazon", "cuenco", "bote", "filete", "hamburguesa"]:
        confianza = "media"
        margen = 0.15
    else:
        confianza = "baja"
        margen = 0.25

    kcal_min = round(kcal_medio * (1.0 - margen), 1)
    kcal_max = round(kcal_medio * (1.0 + margen), 1)
    prot_min = round(prot_medio * (1.0 - margen), 1)
    prot_max = round(prot_medio * (1.0 + margen), 1)
    carb_min = round(carb_medio * (1.0 - margen), 1)
    carb_max = round(carb_medio * (1.0 + margen), 1)
    grasa_min = round(grasa_medio * (1.0 - margen), 1)
    grasa_max = round(grasa_medio * (1.0 + margen), 1)

    # Coste estimado
    eur_kg = float(al_data.get("eur_kg", 0.0))
    eur_unidad = al_data.get("eur_unidad")
    if eur_unidad and racion_nombre in ["unidad", "botella", "lata", "brick"]:
        eur_est = round(float(eur_unidad) * n, 2)
    else:
        eur_est = round((eur_kg * gramos_totales) / 1000.0, 2)

    return {
        "id": al_id,
        "nombre": al_data.get("nombre", al_id),
        "racion": racion_nombre,
        "n": n,
        "gramos_est": round(gramos_totales, 1),
        "kcal": [kcal_min, kcal_max],
        "prot": [prot_min, prot_max],
        "carb": [carb_min, carb_max],
        "grasa": [grasa_min, grasa_max],
        "eur_est": eur_est,
        "confianza": confianza,
    }


def registrar_comer(
    texto: Optional[str] = None,
    items_json: Optional[Any] = None,
    hora: Optional[str] = None,
    fecha: Optional[str] = None,
    path_nutricion: Path = DEFAULT_NUTRICION_PATH,
    path_alimentos: Path = DEFAULT_ALIMENTOS_PATH,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
) -> Dict[str, Any]:
    """Registra una ingesta por texto natural o items estructurados en JSON."""
    nutricion_data = cargar_nutricion(path_nutricion)
    catalogo = cargar_alimentos(path_alimentos)

    fecha_registro = fecha or datetime.date.today().isoformat()
    hora_registro = hora or datetime.datetime.now().strftime("%H:%M")

    items_crudos: List[Dict[str, Any]] = []
    desconocidos: List[str] = []

    if items_json:
        if isinstance(items_json, str):
            items_crudos = json.loads(items_json)
        elif isinstance(items_json, list):
            items_crudos = items_json
    elif texto:
        items_crudos, desconocidos = parsear_ingesta_texto(texto, catalogo)

    if not items_crudos and not desconocidos:
        return {"ok": False, "error": "No se detectaron alimentos ni texto interpretable."}

    # Calcular valores de cada item
    items_calculados = [calcular_valores_item(it, catalogo) for it in items_crudos]

    # Totales de la ingesta
    kcal_tot = [sum(it["kcal"][0] for it in items_calculados), sum(it["kcal"][1] for it in items_calculados)]
    prot_tot = [sum(it["prot"][0] for it in items_calculados), sum(it["prot"][1] for it in items_calculados)]
    carb_tot = [sum(it["carb"][0] for it in items_calculados), sum(it["carb"][1] for it in items_calculados)]
    grasa_tot = [sum(it["grasa"][0] for it in items_calculados), sum(it["grasa"][1] for it in items_calculados)]
    eur_tot = round(sum(it["eur_est"] for it in items_calculados), 2)

    # Confianza general
    confianzas = [it["confianza"] for it in items_calculados]
    if "baja" in confianzas or desconocidos:
        conf_general = "baja"
    elif "media" in confianzas:
        conf_general = "media"
    else:
        conf_general = "alta"

    ingesta_record = {
        "hora": hora_registro,
        "texto": texto or "Registro estructurado",
        "items": items_calculados,
        "desconocidos": desconocidos,
        "kcal_est": [round(kcal_tot[0], 1), round(kcal_tot[1], 1)],
        "prot_est": [round(prot_tot[0], 1), round(prot_tot[1], 1)],
        "carb_est": [round(carb_tot[0], 1), round(carb_tot[1], 1)],
        "grasa_est": [round(grasa_tot[0], 1), round(grasa_tot[1], 1)],
        "eur_est": eur_tot,
        "confianza": conf_general,
    }

    if fecha_registro not in nutricion_data["dias"]:
        nutricion_data["dias"][fecha_registro] = {
            "estado": "abierto",
            "ingestas": [],
        }

    nutricion_data["dias"][fecha_registro]["ingestas"].append(ingesta_record)

    # Añadir desconocidos a la lista global si no existen
    for desc in desconocidos:
        if desc not in nutricion_data.get("desconocidos", []):
            nutricion_data.setdefault("desconocidos", []).append(desc)

    guardar_atomico(path_nutricion, nutricion_data, backup_dir=backup_dir, prefijo_backup="nutricion_backup")

    # Calcular totales del día actual
    totales_dia = resumen_dia(nutricion_data["dias"][fecha_registro])

    return {
        "ok": True,
        "fecha": fecha_registro,
        "ingesta": ingesta_record,
        "totales_dia": totales_dia,
        "objetivo_vigente": nutricion_data.get("objetivos_vigentes", {}),
    }


def resumen_dia(dia_dict: Dict[str, Any]) -> Dict[str, Any]:
    ingestas = dia_dict.get("ingestas", [])
    kcal_tot = [sum(ing["kcal_est"][0] for ing in ingestas), sum(ing["kcal_est"][1] for ing in ingestas)]
    prot_tot = [sum(ing["prot_est"][0] for ing in ingestas), sum(ing["prot_est"][1] for ing in ingestas)]
    carb_tot = [sum(ing["carb_est"][0] for ing in ingestas), sum(ing["carb_est"][1] for ing in ingestas)]
    grasa_tot = [sum(ing["grasa_est"][0] for ing in ingestas), sum(ing["grasa_est"][1] for ing in ingestas)]
    eur_tot = round(sum(ing.get("eur_est", 0.0) for ing in ingestas), 2)

    bolos_35g = sum(1 for ing in ingestas if ((ing["prot_est"][0] + ing["prot_est"][1]) / 2.0) >= 35.0)
    return {
        "estado": dia_dict.get("estado", "abierto"),
        "n_ingestas": len(ingestas),
        "bolos_anabolicos_35g": bolos_35g,
        "kcal_est": [round(kcal_tot[0], 1), round(kcal_tot[1], 1)],
        "prot_est": [round(prot_tot[0], 1), round(prot_tot[1], 1)],
        "carb_est": [round(carb_tot[0], 1), round(carb_tot[1], 1)],
        "grasa_est": [round(grasa_tot[0], 1), round(grasa_tot[1], 1)],
        "eur_est": eur_tot,
    }


def generar_sugerencias(
    prot_faltante: float,
    kcal_faltante_min: float,
    kcal_faltante_max: float,
    catalogo: Dict[str, Any],
    modo_presupuesto: bool = False,
) -> List[Dict[str, Any]]:
    """Genera 2 o 3 opciones prácticas según objetivo y presupuesto."""
    alimentos = catalogo.get("alimentos", [])

    candidatos = []
    for al in alimentos:
        if "excluido" in al.get("etiquetas", []):
            continue  # preferencias/disponibilidad confirmadas por Daniel
        p100 = al.get("por_100g", {})
        prot_100 = float(p100.get("prot", 0.0))
        kcal_100 = float(p100.get("kcal", 0.0))
        eur_kg = float(al.get("eur_kg", 0.0))

        if prot_100 <= 3.0:
            continue

        # Ración habitual
        raciones = al.get("raciones", {})
        r_nombre = list(raciones.keys())[0] if raciones else "racion"
        g_racion = float(raciones.get(r_nombre, 100.0))

        prot_racion = (prot_100 * g_racion) / 100.0
        kcal_racion = (kcal_100 * g_racion) / 100.0
        eur_racion = round((eur_kg * g_racion) / 1000.0, 2)
        if al.get("eur_unidad") and r_nombre in ["unidad", "botella", "lata", "brick"]:
            eur_racion = float(al["eur_unidad"])

        # Eficiencia de coste por 20g proteína: eur por 20g prot
        eur_20g_prot = round((eur_racion / prot_racion) * 20.0, 2) if (prot_racion > 0 and eur_racion > 0) else 999.0

        candidatos.append({
            "id": al["id"],
            "nombre": al.get("nombre", al["id"]),
            "racion_propuesta": f"1 {r_nombre}",
            "prot_g": round(prot_racion, 1),
            "kcal": round(kcal_racion, 1),
            "eur": eur_racion,
            "eur_20g_prot": eur_20g_prot,
            "etiquetas": al.get("etiquetas", []),
            "tienda": al.get("tienda", "generico"),
        })

    if modo_presupuesto:
        # Priorizar € por 20g de proteína y etiqueta 'barato'
        candidatos.sort(key=lambda x: (0 if "barato" in x["etiquetas"] else 1, x["eur_20g_prot"]))
    else:
        # Priorizar densidad proteica ajustada a calorías disponibles
        candidatos.sort(key=lambda x: (x["eur_20g_prot"], -x["prot_g"]))

    # Tomar 2-3 sugerencias variadas
    seleccionados = []
    vistos_tipo = set()
    for cand in candidatos:
        tipo = cand["id"].split("_")[0]
        if tipo not in vistos_tipo and cand["kcal"] <= max(kcal_faltante_max + 100, 300):
            seleccionados.append(cand)
            vistos_tipo.add(tipo)
        if len(seleccionados) >= 3:
            break

    return seleccionados


COMPENSACION_MAX_KCAL_DIA = 300.0
COMPENSACION_DIAS = 3
COMPENSACION_MIN_DEFICIT = 150.0
COMPENSACION_TOPE_DEFICIT = 900.0


def calcular_compensacion(nutricion_data: Dict[str, Any], fecha: datetime.date) -> Dict[str, Any]:
    """
    Saldo energetico de los 7 dias previos a `fecha`, solo dias con estado 'completo'.
    Si hay deficit neto, propone repartirlo en los proximos dias (max +300 kcal/dia).
    Nunca compensa proteina. Dias sin registrar o 'incompleto' no cuentan como dias bajos.
    """
    obj = nutricion_data.get("objetivos_vigentes", {})
    kcal_obj = float(obj.get("kcal", 2950))
    saldo = 0.0
    dias_usados: List[str] = []
    for i in range(1, 8):
        f = fecha - datetime.timedelta(days=i)
        d = nutricion_data.get("dias", {}).get(f.isoformat())
        if not d or d.get("estado") != "completo":
            continue
        tot = resumen_dia(d)
        consumido = (tot["kcal_est"][0] + tot["kcal_est"][1]) / 2.0
        saldo += kcal_obj - consumido
        dias_usados.append(f.isoformat())

    deficit = max(0.0, saldo)
    if deficit < COMPENSACION_MIN_DEFICIT:
        extra, descartado = 0.0, 0.0
    else:
        compensable = min(deficit, COMPENSACION_TOPE_DEFICIT)
        descartado = deficit - compensable
        extra = min(COMPENSACION_MAX_KCAL_DIA, compensable / COMPENSACION_DIAS)
    return {
        "dias_considerados": dias_usados,
        "saldo_7d_kcal": round(saldo, 0),
        "deficit_kcal": round(deficit, 0),
        "extra_hoy_kcal": round(extra, 0),
        "descartado_kcal": round(descartado, 0),
        "proteina_compensable": False,
        "nota": "La proteina no se compensa: el objetivo diario se mantiene.",
    }


def avisos_reparto_proteina(dia_dict: Dict[str, Any]) -> List[str]:
    """Audita reparto proteico 40+: concentracion excesiva y tomas principales sub-umbral (12-34.9 g)."""
    ingestas = dia_dict.get("ingestas", [])
    prots = [(ing["prot_est"][0] + ing["prot_est"][1]) / 2.0 for ing in ingestas]
    total = sum(prots)
    avisos: List[str] = []
    if total >= 60 and prots and max(prots) > 0.6 * total:
        avisos.append("Reparto de proteina: mas del 60 % en una sola toma. Prioriza 3-4 bolos anabolicos de 40-50 g (>3-4 g leucina).")
    sub_umbral = [p for p in prots if 12.0 <= p < 35.0]
    if len(sub_umbral) >= 2 and len(ingestas) >= 3:
        falta = round(40.0 - max(sub_umbral), 0)
        avisos.append(
            f"Umbral leucina 40+: {len(sub_umbral)} tomas de 12-35 g (sub-umbral). Fusiona tomas cercanas o completa hasta ~40 g (a la mayor le faltan ~{falta:.0f} g)."
        )
    return avisos


def resumen_hoy(
    fecha: Optional[str] = None,
    path_nutricion: Path = DEFAULT_NUTRICION_PATH,
    path_alimentos: Path = DEFAULT_ALIMENTOS_PATH,
) -> Dict[str, Any]:
    nutricion_data = cargar_nutricion(path_nutricion)
    catalogo = cargar_alimentos(path_alimentos)

    fecha_hoy = fecha or datetime.date.today().isoformat()
    dia_dict = nutricion_data.get("dias", {}).get(fecha_hoy, {"estado": "abierto", "ingestas": []})

    totales = resumen_dia(dia_dict)
    obj = nutricion_data.get("objetivos_vigentes", {})
    kcal_obj = obj.get("kcal", 2950)
    prot_obj = obj.get("prot", 165)

    compensacion = calcular_compensacion(nutricion_data, datetime.date.fromisoformat(fecha_hoy))
    extra = compensacion["extra_hoy_kcal"]

    # Medias de rangos registrados
    prot_actual_med = (totales["prot_est"][0] + totales["prot_est"][1]) / 2.0

    rango = obj.get("kcal_rango", [kcal_obj - 100, kcal_obj + 100])
    kcal_faltante_min = max(0.0, rango[0] + extra - totales["kcal_est"][1])
    kcal_faltante_max = max(0.0, rango[1] + extra - totales["kcal_est"][0])
    prot_faltante = max(0.0, prot_obj - prot_actual_med)

    modo_presupuesto = nutricion_data.get("modo_presupuesto", {}).get("activo", False)

    sugerencias = generar_sugerencias(
        prot_faltante=prot_faltante,
        kcal_faltante_min=kcal_faltante_min,
        kcal_faltante_max=kcal_faltante_max,
        catalogo=catalogo,
        modo_presupuesto=modo_presupuesto,
    )

    return {
        "ok": True,
        "fecha": fecha_hoy,
        "totales": totales,
        "objetivo": obj,
        "compensacion": compensacion,
        "avisos": avisos_reparto_proteina(dia_dict),
        "pendientes": {
            "prot_g": round(prot_faltante, 1),
            "kcal_rango": [round(kcal_faltante_min, 1), round(kcal_faltante_max, 1)],
        },
        "modo_presupuesto": nutricion_data.get("modo_presupuesto", {}),
        "sugerencias": sugerencias,
    }


def cerrar_dia(
    fecha: Optional[str] = None,
    incompleto: bool = False,
    path_nutricion: Path = DEFAULT_NUTRICION_PATH,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
) -> Dict[str, Any]:
    nutricion_data = cargar_nutricion(path_nutricion)
    fecha_dia = fecha or datetime.date.today().isoformat()

    if fecha_dia not in nutricion_data["dias"]:
        nutricion_data["dias"][fecha_dia] = {"estado": "abierto", "ingestas": []}

    nuevo_estado = "incompleto" if incompleto else "completo"
    nutricion_data["dias"][fecha_dia]["estado"] = nuevo_estado

    guardar_atomico(path_nutricion, nutricion_data, backup_dir=backup_dir, prefijo_backup="nutricion_backup")

    return {
        "ok": True,
        "fecha": fecha_dia,
        "estado": nuevo_estado,
        "totales": resumen_dia(nutricion_data["dias"][fecha_dia]),
    }


def analisis_semana(
    fecha_corte: Optional[str] = None,
    aplicar: bool = False,
    path_nutricion: Path = DEFAULT_NUTRICION_PATH,
    path_seguimiento: Path = DEFAULT_SEGUIMIENTO_PATH,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
) -> Dict[str, Any]:
    """
    Analiza tendencia de 14 días.
    Requiere >= 10 días completos y >= 5 pesajes matutinos.
    Ajuste máximo: ±150 kcal.
    """
    nutricion_data = cargar_nutricion(path_nutricion)
    seguimiento_data = cargar_seguimiento(path_seguimiento)

    corte = datetime.date.fromisoformat(fecha_corte) if fecha_corte else datetime.date.today()
    inicio_ventana = corte - datetime.timedelta(days=14)

    # 1. Filtrar días completos en ventana de 14 días
    dias_completos = []
    kcal_completas = []
    prot_completas = []

    for f_str, d_val in nutricion_data.get("dias", {}).items():
        try:
            f_date = datetime.date.fromisoformat(f_str)
        except ValueError:
            continue
        if inicio_ventana <= f_date <= corte and d_val.get("estado") == "completo":
            dias_completos.append(f_str)
            tot = resumen_dia(d_val)
            kcal_med = (tot["kcal_est"][0] + tot["kcal_est"][1]) / 2.0
            prot_med = (tot["prot_est"][0] + tot["prot_est"][1]) / 2.0
            kcal_completas.append(kcal_med)
            prot_completas.append(prot_med)

    # 2. Filtrar pesajes matutinos en ventana de 14 días
    medidas = seguimiento_data.get("medidas", [])
    pesajes_validos = []
    cinturas = []
    for m in medidas:
        f_raw = m.get("fecha")
        if not f_raw:
            continue
        f_iso = f_raw[:10]
        try:
            f_date = datetime.date.fromisoformat(f_iso)
        except ValueError:
            continue

        if inicio_ventana <= f_date <= corte:
            proto = (m.get("protocolo") or "").lower()
            disp = (m.get("dispositivo_fuente") or "").lower()
            peso = m.get("peso_medio_kg")
            if peso and ("matutino" in proto or "renpho" in disp or "basal" in proto):
                pesajes_validos.append({"fecha": f_iso, "peso_kg": float(peso)})
            cint = m.get("cintura_usada_cm")
            if cint:
                cinturas.append({"fecha": f_iso, "cm": float(cint)})

    pesajes_validos.sort(key=lambda x: x["fecha"])

    n_dias_comp = len(dias_completos)
    n_pesos = len(pesajes_validos)

    resultado: Dict[str, Any] = {
        "fecha_corte": corte.isoformat(),
        "ventana_14d": [inicio_ventana.isoformat(), corte.isoformat()],
        "dias_completos_registrados": n_dias_comp,
        "pesajes_matutinos_registrados": n_pesos,
        "umbral_minimo_cumplido": False,
        "ajuste_propuesto": False,
        "motivo": "",
    }

    if n_dias_comp < 10 or n_pesos < 5:
        faltantes = []
        if n_dias_comp < 10:
            faltantes.append(f"{10 - n_dias_comp} días completos")
        if n_pesos < 5:
            faltantes.append(f"{5 - n_pesos} pesajes matutinos")
        resultado["estado"] = "datos_insuficientes"
        resultado["motivo"] = f"Faltan datos en los últimos 14 días: {', '.join(faltantes)}. Se mantiene el objetivo activo sin cambios."
        resultado["objetivo_actual"] = nutricion_data.get("objetivos_vigentes", {})
        return resultado

    resultado["umbral_minimo_cumplido"] = True
    media_kcal = sum(kcal_completas) / len(kcal_completas)
    media_prot = sum(prot_completas) / len(prot_completas)

    # Calcular variación de peso (ritmo semanal)
    peso_inicial = pesajes_validos[0]["peso_kg"]
    peso_final = pesajes_validos[-1]["peso_kg"]
    delta_dias = (datetime.date.fromisoformat(pesajes_validos[-1]["fecha"]) - datetime.date.fromisoformat(pesajes_validos[0]["fecha"])).days
    if delta_dias > 0:
        ritmo_semanal = (peso_final - peso_inicial) * (7.0 / delta_dias)
    else:
        ritmo_semanal = 0.0

    # Lógica de ajuste volumen limpio: objetivo +0.15 a +0.25 kg/sem
    # Si > +0.30 kg/sem -> -150 kcal
    # Si < +0.10 kg/sem -> +150 kcal
    # Si está en rango -> mantener
    obj_vig = nutricion_data.get("objetivos_vigentes", {})
    kcal_vig = obj_vig.get("kcal", 2950)
    prot_vig = obj_vig.get("prot", 165)

    delta_kcal = 0
    if ritmo_semanal > 0.30:
        delta_kcal = -150
        motivo_ajuste = f"Ganancia de peso acelerada (+{round(ritmo_semanal, 2)} kg/sem > 0.30). Se propone recortar 150 kcal para evitar exceso graso."
    elif ritmo_semanal < 0.10:
        delta_kcal = 150
        motivo_ajuste = f"Ganancia de peso lenta (+{round(ritmo_semanal, 2)} kg/sem < 0.10). Se propone sumar 150 kcal para asegurar superávit."
    else:
        motivo_ajuste = f"Ritmo de ganancia óptimo (+{round(ritmo_semanal, 2)} kg/sem dentro de +0.15 a +0.25). Se mantiene objetivo."

    nueva_kcal = kcal_vig + delta_kcal
    resultado["estado"] = "analisis_completado"
    resultado["media_kcal_diaria"] = round(media_kcal, 1)
    resultado["media_prot_diaria"] = round(media_prot, 1)
    resultado["ritmo_kg_semana"] = round(ritmo_semanal, 2)
    resultado["ajuste_propuesto"] = delta_kcal != 0
    resultado["delta_kcal"] = delta_kcal
    resultado["propuesta_nuevo_objetivo"] = {
        "kcal": nueva_kcal,
        "kcal_rango": [nueva_kcal - 100, nueva_kcal + 100],
        "prot": prot_vig,
        "origen": "tendencia_14d",
    }
    resultado["motivo"] = motivo_ajuste

    # Cintura: senal mas fiable que la grasa BIA para volumen limpio
    cinturas.sort(key=lambda x: x["fecha"])
    if len(cinturas) >= 2:
        delta_cint = round(cinturas[-1]["cm"] - cinturas[0]["cm"], 1)
        resultado["cintura_delta_cm"] = delta_cint
        if delta_cint >= 1.0 and ritmo_semanal > 0.25:
            resultado["aviso_cintura"] = (
                f"Cintura +{delta_cint} cm en la ventana con ritmo de peso > 0.25 kg/sem: "
                "posible exceso graso; valorar recortar 100-150 kcal aunque el ritmo parezca correcto."
            )
    else:
        resultado["cintura_delta_cm"] = None
        resultado["aviso_cintura"] = "Sin 2 medidas de cintura en la ventana: la grasa BIA no basta para juzgar la calidad del volumen."

    if aplicar and delta_kcal != 0:
        nutricion_data["objetivos_vigentes"] = {
            "desde": corte.isoformat(),
            "kcal": nueva_kcal,
            "kcal_rango": [nueva_kcal - 100, nueva_kcal + 100],
            "prot": prot_vig,
            "origen": "tendencia_14d",
        }
        guardar_atomico(path_nutricion, nutricion_data, backup_dir=backup_dir, prefijo_backup="nutricion_backup")
        resultado["aplicado"] = True

    return resultado


def gestionar_presupuesto(
    eur: Optional[float] = None,
    off: bool = False,
    path_nutricion: Path = DEFAULT_NUTRICION_PATH,
    path_alimentos: Path = DEFAULT_ALIMENTOS_PATH,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
) -> Dict[str, Any]:
    nutricion_data = cargar_nutricion(path_nutricion)
    catalogo = cargar_alimentos(path_alimentos)

    if off:
        nutricion_data["modo_presupuesto"]["activo"] = False
        guardar_atomico(path_nutricion, nutricion_data, backup_dir=backup_dir, prefijo_backup="nutricion_backup")
        return {"ok": True, "modo_presupuesto": nutricion_data["modo_presupuesto"], "mensaje": "Modo presupuesto desactivado."}

    eur_semana = eur if eur is not None else nutricion_data["modo_presupuesto"].get("eur_semana", 20.0)
    nutricion_data["modo_presupuesto"]["activo"] = True
    nutricion_data["modo_presupuesto"]["eur_semana"] = eur_semana
    nutricion_data["modo_presupuesto"]["desde"] = datetime.date.today().isoformat()

    # Lista de compra semanal en dos fases (<= eur_semana):
    #  1) proteina: voraz sobre EUR/20 g prot hasta cubrir prot*7 (una familia por alimento)
    #  2) energia: el resto del presupuesto en la fuente mas barata de kcal (carb/grasa)
    obj_vig = nutricion_data.get("objetivos_vigentes", {})
    prot_semana_obj = float(obj_vig.get("prot", 165)) * 7
    kcal_semana_obj = float(obj_vig.get("kcal", 2950)) * 7

    candidatos = []
    for al in catalogo.get("alimentos", []):
        if "excluido" in al.get("etiquetas", []):
            continue
        p100 = al.get("por_100g", {})
        raciones = al.get("raciones", {})
        r_nombre = list(raciones.keys())[0] if raciones else "unidad"
        g_racion = float(raciones.get(r_nombre, 100.0))
        prot_racion = float(p100.get("prot", 0.0)) * g_racion / 100.0
        kcal_racion = float(p100.get("kcal", 0.0)) * g_racion / 100.0
        coste_racion = float(al.get("eur_kg", 0.0)) * g_racion / 1000.0
        if al.get("eur_unidad") and r_nombre in ["unidad", "botella", "lata", "brick"]:
            coste_racion = float(al["eur_unidad"])
        if coste_racion <= 0:
            continue
        candidatos.append({
            "id": al["id"],
            "familia": al["id"].split("_")[0],
            "nombre": al.get("nombre", al["id"]),
            "tienda": al.get("tienda", "generico"),
            "racion_nombre": r_nombre,
            "prot_racion": prot_racion,
            "kcal_racion": kcal_racion,
            "coste_racion": coste_racion,
            "eur_20g": (coste_racion / prot_racion) * 20.0 if prot_racion > 0 else 999.0,
            "eur_1000kcal": (coste_racion / kcal_racion) * 1000.0 if kcal_racion > 0 else 999.0,
            "etiquetas": al.get("etiquetas", []),
        })

    presupuesto_restante = float(eur_semana)
    cesta: Dict[str, Dict[str, Any]] = {}
    familias_usadas = set()
    totales = {"prot": 0.0, "kcal": 0.0}

    def _anadir(cand: Dict[str, Any], max_rac: int) -> None:
        nonlocal presupuesto_restante
        n = min(max_rac, int(round(presupuesto_restante, 2) // cand["coste_racion"]))
        if n <= 0:
            return
        coste = round(n * cand["coste_racion"], 2)
        cesta[cand["id"]] = {
            "nombre": cand["nombre"],
            "tienda": cand["tienda"],
            "raciones": n,
            "descripcion": f"{n}x {cand['racion_nombre']}",
            "coste_eur": coste,
            "prot_g": round(n * cand["prot_racion"], 1),
            "kcal": round(n * cand["kcal_racion"], 0),
        }
        familias_usadas.add(cand["familia"])
        presupuesto_restante = round(presupuesto_restante - coste, 2)
        totales["prot"] += n * cand["prot_racion"]
        totales["kcal"] += n * cand["kcal_racion"]

    # Fase 1: proteina (mas eficiente primero). Reserva ~40 % del presupuesto para energia.
    reserva_energia = round(eur_semana * 0.4, 2)
    proteicos = [c for c in candidatos if c["prot_racion"] >= 5.0]
    proteicos.sort(key=lambda x: (x["eur_20g"], 0 if "barato" in x["etiquetas"] else 1))
    for cand in proteicos:
        if totales["prot"] >= prot_semana_obj or presupuesto_restante <= reserva_energia:
            break
        if cand["familia"] in familias_usadas:
            continue
        _anadir(cand, 7)

    # Fase 2: energia barata (carb / grasa), una familia por alimento
    energeticos = [c for c in candidatos if ("carb" in c["etiquetas"] or "grasa" in c["etiquetas"])]
    energeticos.sort(key=lambda x: x["eur_1000kcal"])
    for cand in energeticos:
        if presupuesto_restante < cand["coste_racion"]:
            continue
        if cand["familia"] in familias_usadas:
            continue
        _anadir(cand, 14)

    cobertura_kcal = round(100.0 * totales["kcal"] / kcal_semana_obj, 0) if kcal_semana_obj else 0.0
    cobertura_prot = round(100.0 * totales["prot"] / prot_semana_obj, 0) if prot_semana_obj else 0.0
    avisos_lista = []
    if cobertura_kcal < 80:
        avisos_lista.append(
            f"La cesta cubre solo ~{int(cobertura_kcal)} % de las kcal semanales objetivo: "
            "con este presupuesto hace falta apoyarse en despensa/otras compras o aceptar un superavit menor."
        )
    if cobertura_prot < 80:
        avisos_lista.append(f"La cesta cubre solo ~{int(cobertura_prot)} % de la proteina semanal objetivo.")

    lista_compra = {
        "presupuesto_eur": eur_semana,
        "total_eur": round(eur_semana - presupuesto_restante, 2),
        "remanente_eur": presupuesto_restante,
        "prot_total_g": round(totales["prot"], 1),
        "kcal_total": round(totales["kcal"], 0),
        "cobertura_prot_pct": cobertura_prot,
        "cobertura_kcal_pct": cobertura_kcal,
        "avisos": avisos_lista,
        "items": list(cesta.values()),
    }

    guardar_atomico(path_nutricion, nutricion_data, backup_dir=backup_dir, prefijo_backup="nutricion_backup")

    return {
        "ok": True,
        "modo_presupuesto": nutricion_data["modo_presupuesto"],
        "lista_compra": lista_compra,
    }


def aprender_alimento(
    nombre: str,
    alias: Optional[List[str]] = None,
    kcal: float = 0.0,
    prot: float = 0.0,
    carb: float = 0.0,
    grasa: float = 0.0,
    eur_kg: float = 0.0,
    tienda: str = "generico",
    path_alimentos: Path = DEFAULT_ALIMENTOS_PATH,
    backup_dir: Path = DEFAULT_BACKUP_DIR,
) -> Dict[str, Any]:
    catalogo = cargar_alimentos(path_alimentos)
    norm_id = normalizar_texto(nombre).replace(" ", "_")

    # Si ya existe, actualizar
    alimentos = catalogo.get("alimentos", [])
    nuevo_item = {
        "id": norm_id,
        "nombre": nombre,
        "alias": alias or [nombre.lower()],
        "tienda": tienda,
        "raciones": {"racion": 100.0, "unidad": 100.0},
        "por_100g": {
            "kcal": float(kcal),
            "prot": float(prot),
            "carb": float(carb),
            "grasa": float(grasa),
            "fibra": 0.0,
        },
        "eur_kg": float(eur_kg),
        "etiquetas": ["personalizado"],
    }

    # Eliminar si ya existe id
    alimentos = [al for al in alimentos if al["id"] != norm_id]
    alimentos.append(nuevo_item)
    catalogo["alimentos"] = alimentos

    guardar_atomico(path_alimentos, catalogo, backup_dir=backup_dir, prefijo_backup="alimentos_backup")

    return {"ok": True, "item": nuevo_item}


def formatear_salida_humana(comando: str, data: Dict[str, Any]) -> str:
    lineas = []
    if comando == "comer":
        ing = data["ingesta"]
        tot = data["totales_dia"]
        obj = data.get("objetivo_vigente", {})
        lineas.append(f"Ingesta ({ing['hora']}): {ing['texto']}")
        for it in ing["items"]:
            lineas.append(f"  - {it['n']}x {it['nombre']} ({it['racion']}) ~ {it['kcal'][0]}-{it['kcal'][1]} kcal, {it['prot'][0]}-{it['prot'][1]}g prot")
        if ing.get("desconocidos"):
            lineas.append(f"  [!] Pendientes/desconocidos: {', '.join(ing['desconocidos'])}")
        lineas.append(f"Total dia: {tot['kcal_est'][0]}-{tot['kcal_est'][1]} kcal / {obj.get('kcal', 2950)} kcal | Prot: {tot['prot_est'][0]}-{tot['prot_est'][1]}g / {obj.get('prot', 150)}g")

    elif comando == "hoy":
        tot = data["totales"]
        obj = data["objetivo"]
        pend = data["pendientes"]
        lineas.append(f"Resumen {data['fecha']}: {tot['n_ingestas']} ingestas registradas (estado: {tot['estado']})")
        lineas.append(f"- Consumido: {tot['kcal_est'][0]}-{tot['kcal_est'][1]} kcal | Prot: {tot['prot_est'][0]}-{tot['prot_est'][1]}g | Bolos anabolicos (>=35g): {tot.get('bolos_anabolicos_35g', 0)}/3-4")
        lineas.append(f"- Objetivo: {obj.get('kcal', 2950)} kcal ({obj.get('fase', 'volumen')}) | Prot: {obj.get('prot', 150)}g")
        lineas.append(f"- Pendiente: {pend['prot_g']}g de proteina | {pend['kcal_rango'][0]}-{pend['kcal_rango'][1]} kcal")

        comp = data.get("compensacion") or {}
        if comp.get("extra_hoy_kcal"):
            lineas.append(f"- Compensacion: deficit 7d {comp['deficit_kcal']:.0f} kcal -> +{comp['extra_hoy_kcal']:.0f} kcal hoy (proteina no se compensa)")
            if comp.get("descartado_kcal"):
                lineas.append(f"  ({comp['descartado_kcal']:.0f} kcal de deficit se descartan: no se persigue el deficit)")
        for av in data.get("avisos", []):
            lineas.append(f"- Aviso: {av}")
        sug = data.get("sugerencias", [])
        if sug:
            lineas.append("Sugerencias para completar:")
            for s in sug:
                lineas.append(f"  -> {s['racion_propuesta']} de {s['nombre']} (+{s['prot_g']}g prot, {s['kcal']} kcal, ~{s['eur']} EUR)")

    elif comando == "cerrar":
        lineas.append(f"Dia {data['fecha']} cerrado como '{data['estado']}'.")

    elif comando == "semana":
        lineas.append(f"Analisis 14d al {data['fecha_corte']}:")
        lineas.append(f"- Dias completos: {data['dias_completos_registrados']}/10 min | Pesajes matutinos: {data['pesajes_matutinos_registrados']}/5 min")
        lineas.append(f"- Dictamen: {data['motivo']}")
        if data.get("aviso_cintura"):
            lineas.append(f"- Cintura: {data['aviso_cintura']}")
        if data.get("propuesta_nuevo_objetivo"):
            prop = data["propuesta_nuevo_objetivo"]
            lineas.append(f"- Objetivo sugerido: {prop['kcal']} kcal ({prop['kcal_rango'][0]}-{prop['kcal_rango'][1]}) | Prot: {prop['prot']}g")

    elif comando == "presupuesto":
        mp = data["modo_presupuesto"]
        if not mp.get("activo"):
            lineas.append("Modo presupuesto desactivado.")
        else:
            lc = data.get("lista_compra", {})
            lineas.append(f"Modo presupuesto activo: {lc.get('presupuesto_eur', 20)} EUR/semana")
            lineas.append(f"- Proteina semanal estimada: {lc.get('prot_total_g', 0)}g en cesta | Gasto: {lc.get('total_eur', 0)} EUR (remanente: {lc.get('remanente_eur', 0)} EUR)")
            lineas.append(f"- Cobertura semanal: {lc.get('cobertura_prot_pct', 0):.0f} % proteina | {lc.get('cobertura_kcal_pct', 0):.0f} % kcal ({lc.get('kcal_total', 0):.0f} kcal)")
            for av in lc.get("avisos", []):
                lineas.append(f"  [!] {av}")
            lineas.append("- Lista de compra sugerida:")
            for it in lc.get("items", []):
                lineas.append(f"  - {it['descripcion']} ({it['nombre']}) [{it['tienda']}]: ~{it['coste_eur']} EUR (+{it['prot_g']}g prot)")

    elif comando == "aprender":
        it = data["item"]
        lineas.append(f"Alimento aprendido: '{it['nombre']}' ({it['id']})")
        lineas.append(f"- Macros/100g: {it['por_100g']['kcal']} kcal | {it['por_100g']['prot']}g prot | {it['por_100g']['carb']}g carb | {it['por_100g']['grasa']}g grasa")

    return "\n".join(lineas)


def main() -> None:
    parser = argparse.ArgumentParser(description="CLI determinista de nutrición DAME CAÑA")
    subparsers = parser.add_subparsers(dest="comando")

    # comer
    p_comer = subparsers.add_parser("comer", help="Registrar ingesta")
    p_comer.add_argument("texto", nargs="?", help="Texto de la comida (ej. '2 huevos y tostada')")
    p_comer.add_argument("--texto", "-t", dest="texto_opt", help="Texto alternativo de la comida")
    p_comer.add_argument("--items-json", help="JSON estructurado de items directos")
    p_comer.add_argument("--fecha", help="Fecha YYYY-MM-DD")
    p_comer.add_argument("--hora", help="Hora HH:MM")
    p_comer.add_argument("--json", action="store_true", help="Salida en JSON")

    # hoy
    p_hoy = subparsers.add_parser("hoy", help="Resumen del día actual y sugerencias")
    p_hoy.add_argument("--fecha", help="Fecha YYYY-MM-DD")
    p_hoy.add_argument("--json", action="store_true", help="Salida en JSON")

    # cerrar
    p_cerrar = subparsers.add_parser("cerrar", help="Cerrar el día actual")
    p_cerrar.add_argument("--fecha", help="Fecha YYYY-MM-DD")
    p_cerrar.add_argument("--incompleto", action="store_true", help="Marcar como incompleto")
    p_cerrar.add_argument("--json", action="store_true", help="Salida en JSON")

    # semana
    p_semana = subparsers.add_parser("semana", help="Análisis de tendencia de 14 días y ajuste calórico")
    p_semana.add_argument("--fecha", help="Fecha de corte YYYY-MM-DD")
    p_semana.add_argument("--aplicar", action="store_true", help="Aplicar el ajuste sugerido")
    p_semana.add_argument("--json", action="store_true", help="Salida en JSON")

    # presupuesto
    p_presupuesto = subparsers.add_parser("presupuesto", help="Gestionar modo presupuesto y lista de compra")
    p_presupuesto.add_argument("eur", nargs="?", help="Presupuesto semanal en € (o 'off')")
    p_presupuesto.add_argument("--json", action="store_true", help="Salida en JSON")

    # aprender
    p_aprender = subparsers.add_parser("aprender", help="Añadir alimento personalizado al catálogo")
    p_aprender.add_argument("nombre", help="Nombre del alimento")
    p_aprender.add_argument("--alias", nargs="*", help="Alias alternativos")
    p_aprender.add_argument("--kcal", type=float, required=True, help="kcal por 100g")
    p_aprender.add_argument("--prot", type=float, required=True, help="g proteína por 100g")
    p_aprender.add_argument("--carb", type=float, default=0.0, help="g carbohidratos por 100g")
    p_aprender.add_argument("--grasa", type=float, default=0.0, help="g grasa por 100g")
    p_aprender.add_argument("--eur", type=float, default=0.0, help="€ por kg")
    p_aprender.add_argument("--tienda", default="generico", help="Tienda (lidl, mercadona, generico)")
    p_aprender.add_argument("--json", action="store_true", help="Salida en JSON")

    args = parser.parse_args()

    if not args.comando:
        parser.print_help()
        return

    if args.comando == "comer":
        txt = args.texto or args.texto_opt
        res = registrar_comer(texto=txt, items_json=args.items_json, fecha=args.fecha, hora=args.hora)
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print(formatear_salida_humana("comer", res))

    elif args.comando == "hoy":
        res = resumen_hoy(fecha=args.fecha)
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print(formatear_salida_humana("hoy", res))

    elif args.comando == "cerrar":
        res = cerrar_dia(fecha=args.fecha, incompleto=args.incompleto)
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print(formatear_salida_humana("cerrar", res))

    elif args.comando == "semana":
        res = analisis_semana(fecha_corte=args.fecha, aplicar=args.aplicar)
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print(formatear_salida_humana("semana", res))

    elif args.comando == "presupuesto":
        if args.eur == "off":
            res = gestionar_presupuesto(off=True)
        else:
            eur_val = float(args.eur) if args.eur else 20.0
            res = gestionar_presupuesto(eur=eur_val)
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print(formatear_salida_humana("presupuesto", res))

    elif args.comando == "aprender":
        res = aprender_alimento(
            nombre=args.nombre,
            alias=args.alias,
            kcal=args.kcal,
            prot=args.prot,
            carb=args.carb,
            grasa=args.grasa,
            eur_kg=args.eur,
            tienda=args.tienda,
        )
        if args.json:
            print(json.dumps(res, ensure_ascii=False, indent=2))
        else:
            print(formatear_salida_humana("aprender", res))


if __name__ == "__main__":
    main()
