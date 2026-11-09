import hashlib
import json
import zipfile
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser
from openpyxl import load_workbook

root = Path(__file__).resolve().parents[1]
out = root/'outputs/operativo'
read = lambda p: json.loads(p.read_text(encoding='utf-8-sig'))
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
data = read(out/'TABLAS_OPERATIVAS.json')
book = load_workbook(out/'DAME_CANA_OPERATIVO_LOCAL.xlsx', data_only=False)
assert book.sheetnames == [v['name'] for v in data['vistas']]
for view in data['vistas']:
    sheet = book[view['name']]
    assert len(sheet.tables)==1, view['name']
    assert sheet.freeze_panes == 'A6', view['name']
    assert [sheet.cell(5,i+1).value for i in range(len(view['headers']))] == view['headers']
    assert sheet.max_row == len(view['rows'])+5
    for i,row in enumerate(view['rows'],6):
        for j,expected in enumerate(row,1):
            actual = sheet.cell(i,j).value
            if expected in (None,''):
                assert actual is None, (view['name'],i,j,actual)
            elif isinstance(actual,datetime):
                assert actual.strftime('%Y-%m-%d') == str(expected)[:10]
            elif isinstance(expected,str) and expected.startswith(('=','+','@')):
                assert actual == "'"+expected
            else:
                assert actual == expected,(view['name'],i,j,actual,expected)
            assert sheet.cell(i,j).data_type != 'e', (view['name'],i,j)
    assert all(sheet.cell(i,j).alignment.wrap_text for i in range(5,sheet.max_row+1) for j in range(1,len(view['headers'])+1))
baseline = read(root/'work/hashes_antes_operacion_chatgpt.json')
assert all(digest(Path(entry['Path'])).upper() == entry['Hash'] for entry in baseline)
manifest = read(out/'MANIFIESTO_RESPALDO.json')
with zipfile.ZipFile(out/'RESPALDO_OPERATIVO_LOCAL.zip') as z:
    assert z.testzip() is None
    assert json.loads(z.read('MANIFIESTO.json')) == manifest
    for entry in manifest['archivos']:
        assert hashlib.sha256(z.read(entry['ruta'])).hexdigest() == entry['sha256'] == digest(root/entry['ruta'])
class CheckHTML(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=0; self.links=[]; self.scripts=0
    def handle_starttag(self,tag,attrs):
        self.tables += tag=='table'; self.scripts += tag=='script'
        if tag=='a': self.links.append(dict(attrs).get('href'))
html=CheckHTML();html.feed((out/'MI_SISTEMA.html').read_text(encoding='utf-8'))
assert html.tables==9 and html.scripts==0
assert all((out/link).resolve().exists() for link in html.links)
report={'estado':'PASS','vistas':9,'celdas':'Comparación completa con fuentes de cada vista; desconocidos y ceros conservados',
    'fuentes_previas_sin_cambios':len(baseline),'respaldo_archivos_verificados':len(manifest['archivos']),
    'contexto_bytes':(out/'CONTEXTO_ENTRENADOR.json').stat().st_size,
    'limite_visual':'Libro renderizado; HTML sin prueba visual en navegador por restricción de archivos locales'}
(out/'VERIFICACION.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
