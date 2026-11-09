"""Generador nativo en Python con openpyxl de libros operativos y de registro local.

Sustituye la dependencia huérfana de Node.js (@oai/artifact-tool) permitiendo
generar las hojas XLSX directamente en el entorno local de forma autónoma.
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime
from pathlib import Path

import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parents[1]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fecha_valor(val):
    if not val:
        return None
    short = str(val)[:10]
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", short):
        try:
            return datetime.strptime(short, "%Y-%m-%d").date()
        except ValueError:
            return short
    return str(val)


def sanitizar_valor(val):
    if val is None or val == "":
        return None
    if isinstance(val, (int, float, bool)):
        return val
    if isinstance(val, (list, dict)):
        return json.dumps(val, ensure_ascii=False)
    s = str(val)
    if s.startswith(("=", "+", "-", "@")):
        return "'" + s
    return s


def generar_hoja_operativa(destino: Path | None = None) -> Path:
    out_dir = ROOT / "outputs/operativo"
    contexto_path = out_dir / "CONTEXTO_ENTRENADOR.json"
    vistas_path = out_dir / "VISTAS_HUMANAS.json"
    target = destino or (out_dir / "DAME_CANA_OPERATIVO_LOCAL.xlsx")

    if not contexto_path.exists() or not vistas_path.exists():
        raise FileNotFoundError("CONTEXTO_ENTRENADOR.json o VISTAS_HUMANAS.json no existen; ejecute tools/operativo_contexto.py primero.")

    contexto = json.loads(contexto_path.read_text(encoding="utf-8"))
    vistas_data = json.loads(vistas_path.read_text(encoding="utf-8"))
    vistas = vistas_data.get("vistas", [])
    generado_utc = contexto.get("generado_utc", "")

    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # Quitar hoja por defecto

    header_fill = PatternFill(start_color="214434", end_color="214434", fill_type="solid")
    header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    data_font = Font(name="Arial", size=11, color="202925")
    title_font = Font(name="Arial", size=15, bold=True, color="214434")
    sub_font = Font(name="Arial", size=10, italic=False, color="58645C")

    for i, v in enumerate(vistas):
        sheet_name = v["name"][:31]  # Excel limita nombres a 31 caracteres
        ws = wb.create_sheet(title=sheet_name)
        ws.views.sheetView[0].showGridLines = True

        ws["A2"] = v["name"]
        ws["A2"].font = title_font

        ws["A3"] = f"Consulta derivada · {generado_utc} · modificar las fuentes locales, no esta vista"
        ws["A3"].font = sub_font

        headers = v["headers"]
        rows = v["rows"]
        num_cols = len(headers)
        num_rows = len(rows)

        # Fila de cabecera en fila 5
        for col_idx, h in enumerate(headers, start=1):
            cell = ws.cell(row=5, column=col_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(wrap_text=True, vertical="center")

        ws.row_dimensions[5].height = 28

        # Filas de datos a partir de fila 6
        for row_idx, r in enumerate(rows, start=6):
            ws.row_dimensions[row_idx].height = 20
            for col_idx, (h, cell_val) in enumerate(zip(headers, r), start=1):
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.font = data_font
                cell.alignment = Alignment(vertical="top", wrap_text=True)

                if h in ("Fecha", "Última evidencia") and cell_val and re.match(r"^\d{4}-\d{2}-\d{2}", str(cell_val)):
                    cell.value = fecha_valor(cell_val)
                    cell.number_format = "yyyy-mm-dd"
                else:
                    cell.value = sanitizar_valor(cell_val)

        # Ancho de columnas
        for col_idx, h in enumerate(headers, start=1):
            col_letter = get_column_letter(col_idx)
            is_long = bool(re.search(r"Ejercicio|Nombre|Decisión|Condición|Motivo|Notas|técnica|Encaje|Fuente|Valor|acción|Alternativas|Qué no", h))
            ws.column_dimensions[col_letter].width = 48 if is_long else 22

        # Inmovilizar paneles en fila 5
        ws.freeze_panes = "A6"

        # Tabla de Excel
        if num_rows > 0:
            end_col = get_column_letter(num_cols)
            tab_ref = f"A5:{end_col}{num_rows + 5}"
            tab_name = f"VistaTab_{i}"
            tab = Table(displayName=tab_name, ref=tab_ref)
            style = TableStyleInfo(name="TableStyleLight1", showFirstColumn=False,
                                   showLastColumn=False, showRowStripes=True, showColumnStripes=False)
            tab.tableStyleInfo = style
            ws.add_table(tab)

    tmp_target = target.with_suffix(".tmp.xlsx")
    wb.save(tmp_target)
    tmp_target.replace(target)

    # Actualizar HUELLAS_LIBRO.json
    hashes = {}
    for name in [
        "CONTEXTO_ENTRENADOR.json",
        "TABLAS_OPERATIVAS.json",
        "VISTAS_HUMANAS.json",
        "MODELO_OPERATIVO.json",
        "INDICE_CONOCIMIENTO.json",
        "DAME_CANA_OPERATIVO_LOCAL.xlsx",
    ]:
        p = out_dir / name
        if p.exists():
            hashes[name] = sha256(p)
    (out_dir / "HUELLAS_LIBRO.json").write_text(json.dumps(hashes, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return target


def generar_hoja_registro(destino: Path | None = None) -> Path:
    reg_path = ROOT / "data/registro.json"
    out_dir = ROOT / "outputs/01a0ee94-3218-7bc2-860f-bda74883553e"
    out_dir.mkdir(parents=True, exist_ok=True)
    target = destino or (out_dir / "DAME_CANA_REGISTRO_LOCAL.xlsx")

    registro = json.loads(reg_path.read_text(encoding="utf-8"))
    sesiones = registro.get("sesiones", [])
    series = registro.get("series", [])
    reales = [s for s in series if isinstance(s.get("reps"), (int, float)) and s["reps"] > 0]
    test_sesiones = [s for s in sesiones if str(s.get("session_id", "")).startswith("TEST-")]
    reales_sesiones = [s for s in sesiones if s.get("finished") and s.get("dia") and not str(s.get("session_id", "")).startswith("TEST-")]
    latest = max(reales_sesiones, key=lambda s: str(s.get("fecha", "")), default=None)

    wb = openpyxl.Workbook()
    wb.remove(wb.active)

    header_fill = PatternFill(start_color="173D50", end_color="173D50", fill_type="solid")
    header_font = Font(name="Arial", size=10, bold=True, color="FFFFFF")
    data_font = Font(name="Arial", size=10, color="17232C")

    # 1. Resumen
    ws_res = wb.create_sheet(title="Resumen")
    ws_res.views.sheetView[0].showGridLines = True
    ws_res["A1"] = "DAME CAÑA · registro local"
    ws_res["A1"].font = Font(name="Arial", size=16, bold=True, color="173D50")
    ws_res["A2"] = "Vista de consulta regenerada desde el registro JSON local"
    ws_res["A2"].font = Font(name="Arial", size=10, italic=True, color="526474")

    stats = [
        ("Sesiones importadas", len(sesiones)),
        ("Filas de series", len(series)),
        ("Series con repeticiones", len(reales)),
        ("Sesiones de prueba", len(test_sesiones)),
        ("Última sesión real", f"{latest['fecha'][:10]} · {latest.get('dia')}" if latest else "Sin dato"),
    ]
    for idx, (label, val) in enumerate(stats, start=4):
        ws_res.cell(row=idx, column=1, value=label).font = Font(name="Arial", size=10, bold=True, color="173D50")
        ws_res.cell(row=idx, column=2, value=val).font = data_font

    ws_res["A10"] = "Una fila sin repeticiones no prueba una serie realizada."
    ws_res["A11"] = "Las cargas solo son comparables tras confirmar máquina, variante, ajustes y base de carga."
    ws_res["A12"] = "Las fuentes originales y los conflictos se conservan en el proyecto local."
    for r in range(10, 13):
        ws_res.cell(row=r, column=1).font = Font(name="Arial", size=10, color="526474")

    ws_res.column_dimensions["A"].width = 86
    ws_res.column_dimensions["B"].width = 24

    # 2. Sesiones
    ws_ses = wb.create_sheet(title="Sesiones")
    ws_ses.views.sheetView[0].showGridLines = True
    ws_ses["A1"] = "Sesiones"
    ws_ses["A1"].font = Font(name="Arial", size=15, bold=True, color="173D50")
    ws_ses["A2"] = "Una línea por sesión; las series están en la pestaña Series"
    ws_ses["A2"].font = Font(name="Arial", size=10, italic=True, color="526474")

    ses_headers = ["Fecha", "Día", "Sesión", "ID de sesión", "Finalizada", "Ejercicios", "Series previstas", "Series con repeticiones", "Calidad", "Fuente"]
    for col_idx, h in enumerate(ses_headers, start=1):
        c = ws_ses.cell(row=4, column=col_idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(vertical="center")
    ws_ses.row_dimensions[4].height = 26

    calidad_labels = {
        "partial_but_real": "Real parcial",
        "real_but_no_exercise_breakdown": "Real sin desglose",
        "real_exercises_known_sets_unrecorded": "Series sin detalle",
        "detailed_real": "Real detallada",
        "detailed_with_pending_details": "Detalles pendientes",
    }

    for row_idx, s in enumerate(sesiones, start=5):
        row_vals = [
            fecha_valor(s.get("fecha")),
            s.get("dia"),
            s.get("titulo"),
            s.get("session_id"),
            bool(s.get("finished")),
            s.get("exercise_count"),
            s.get("planned_set_count"),
            s.get("recorded_set_count"),
            calidad_labels.get(s.get("record_quality"), s.get("record_quality") or "Sin clasificar"),
            s.get("source_file"),
        ]
        for col_idx, val in enumerate(row_vals, start=1):
            c = ws_ses.cell(row=row_idx, column=col_idx, value=sanitizar_valor(val) if not isinstance(val, (datetime, bool, int, float)) else val)
            c.font = data_font
            if col_idx == 1 and isinstance(c.value, (datetime,)):
                c.number_format = "yyyy-mm-dd"

    widths_ses = [16, 9, 43, 36, 14, 13, 17, 24, 23, 38]
    for col_idx, w in enumerate(widths_ses, start=1):
        ws_ses.column_dimensions[get_column_letter(col_idx)].width = w
    ws_ses.freeze_panes = "A5"

    if sesiones:
        tab = Table(displayName="SesionesLocal", ref=f"A4:J{len(sesiones) + 4}")
        tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
        ws_ses.add_table(tab)

    # 3. Series
    ws_ser = wb.create_sheet(title="Series")
    ws_ser.views.sheetView[0].showGridLines = True
    ws_ser["A1"] = "Series"
    ws_ser["A1"].font = Font(name="Arial", size=15, bold=True, color="173D50")
    ws_ser["A2"] = "Incluye filas previstas o vacías; filtra Repeticiones para analizar trabajo registrado"
    ws_ser["A2"].font = Font(name="Arial", size=10, italic=True, color="526474")

    ser_headers = ["Fecha", "Día", "ID de sesión", "Orden", "Ejercicio", "Nº serie", "Carga kg", "Repeticiones", "RIR", "Base de carga", "Variante", "Ajustes", "ID máquina", "Grupo comparable", "Fuente"]
    for col_idx, h in enumerate(ser_headers, start=1):
        c = ws_ser.cell(row=4, column=col_idx, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = Alignment(vertical="center")
    ws_ser.row_dimensions[4].height = 26

    for row_idx, s in enumerate(series, start=5):
        row_vals = [
            fecha_valor(s.get("fecha")),
            s.get("dia"),
            s.get("session_id"),
            s.get("exercise_order"),
            s.get("exercise_name"),
            s.get("set_index"),
            s.get("load_kg"),
            s.get("reps"),
            s.get("rir"),
            s.get("load_basis"),
            s.get("variant"),
            s.get("machine_settings"),
            s.get("machine_id"),
            s.get("comparability_group"),
            s.get("source_file"),
        ]
        for col_idx, val in enumerate(row_vals, start=1):
            c = ws_ser.cell(row=row_idx, column=col_idx, value=sanitizar_valor(val) if not isinstance(val, (datetime, bool, int, float)) else val)
            c.font = data_font
            if col_idx == 1 and isinstance(c.value, (datetime,)):
                c.number_format = "yyyy-mm-dd"
            elif col_idx == 7 and isinstance(c.value, (int, float)):
                c.number_format = "0.0"

    widths_ser = [16, 9, 36, 9, 42, 10, 12, 16, 10, 20, 27, 34, 24, 27, 38]
    for col_idx, w in enumerate(widths_ser, start=1):
        ws_ser.column_dimensions[get_column_letter(col_idx)].width = w
    ws_ser.freeze_panes = "A5"

    if series:
        tab = Table(displayName="SeriesLocal", ref=f"A4:O{len(series) + 4}")
        tab.tableStyleInfo = TableStyleInfo(name="TableStyleLight1", showRowStripes=True)
        ws_ser.add_table(tab)

    tmp_target = target.with_suffix(".tmp.xlsx")
    wb.save(tmp_target)
    tmp_target.replace(target)
    return target


if __name__ == "__main__":
    op_path = generar_hoja_operativa()
    reg_path = generar_hoja_registro()
    print(f"OK: Generadas {op_path.name} y {reg_path.name}")
