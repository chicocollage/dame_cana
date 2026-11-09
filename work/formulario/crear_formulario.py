"""Construye un formulario autónomo a partir del cuestionario local, sin servicios externos."""
from pathlib import Path
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'PREGUNTAS_PARA_DANIEL.md'
raw = SOURCE.read_text(encoding='utf-8')
questions = []
for n, content in re.findall(r'^(\d+)\. (.+)$', raw, re.M):
    title = re.search(r'\*\*(.*?)\*\*', content)
    if not title:
        title_text = re.sub(r'Respuesta:.*$', '', content).strip()
    else:
        title_text = title.group(1)
    clean = re.sub(r'Respuesta:.*$', '', content).replace('**', '').strip()
    questions.append({'id': f'q{int(n):02}', 'number': int(n), 'title': title_text,
                      'prompt': clean, 'source': content})
machines = []
for slot, name, content in re.findall(r'^- \*\*([ABC]\d{2}) · (.*?)\.\*\* (.+)$', raw, re.M):
    lead = content.split('____')[0].strip().rstrip(':')
    machines.append({'id': slot, 'name': name, 'context': lead, 'source': content})
assert len(questions) == 25 and len(machines) == 21, 'Revisar la estructura del cuestionario fuente'
data = {'schema': 'dame_cana_cuestionario.v1', 'source': SOURCE.name,
        'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'source_date': '2026-09-29', 'questions': questions, 'machines': machines,
        'hack': 'Hack, Power Squat y V-Squat: ¿cuál has probado realmente, cuál te resultó estable y tolerable, y cuál quieres usar como base del A02? No hace falta elegir si aún no las has probado.'}
template = Path(__file__).with_name('plantilla.html').read_text(encoding='utf-8')
out = ROOT / 'outputs/formulario/index.html'
out.write_text(template.replace('__FORM_DATA__', json.dumps(data, ensure_ascii=False).replace('</', '<\\/')), encoding='utf-8')
print(json.dumps({'html': str(out), 'questions': len(questions), 'machines': len(machines), 'sha256': data['source_sha256']}, ensure_ascii=False))
