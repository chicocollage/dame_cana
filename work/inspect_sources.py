from pathlib import Path
from openpyxl import load_workbook
from docx import Document
import json

ROOT = Path(__file__).resolve().parents[1]
files = [
    ROOT / 'DAME_CANA/DAME_CANA_OPERATIVO_v3.xlsx',
    ROOT / 'work/drive_export_20260929/DAME_CANA_OPERATIVO_drive_20260929.xlsx',
    ROOT / 'DAME_CANA/DAME_CANA_CATALOGOS_v3.xlsx',
    ROOT / 'work/drive_export_20260929/DAME_CANA_CATALOGOS_drive_20260929.xlsx',
]
for path in files:
    wb = load_workbook(path, read_only=True, data_only=False)
    print(json.dumps({'file': str(path.relative_to(ROOT)), 'sheets': [
        {'name': ws.title, 'rows': ws.max_row, 'cols': ws.max_column,
         'top': [[str(c)[:110] if c is not None else None for c in row]
                 for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row or 3, 3),
                                         max_col=min(ws.max_column or 12, 12), values_only=True)]}
        for ws in wb.worksheets]}, ensure_ascii=False))
    wb.close()

for path in [ROOT/'DAME_CANA/DAME_CANA_SNAPSHOT_ACTUAL.docx',
             *sorted((ROOT/'DAME_CANA/00_CONOCIMIENTO_GEM').glob('*.docx'))]:
    doc = Document(path)
    text = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    print(json.dumps({'file': str(path.relative_to(ROOT)), 'paragraphs': len(text),
                      'head': text[:12]}, ensure_ascii=False))
