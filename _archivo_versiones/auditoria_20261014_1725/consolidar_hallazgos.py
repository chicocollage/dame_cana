import re
import csv
import json
from pathlib import Path

def parse_datos(file_path):
    text = Path(file_path).read_text(encoding="utf-8")
    chunks = re.split(r"(?:\n|^)###\s+ID:\s*(DAT-\d+)", text)
    findings = []
    for i in range(1, len(chunks), 2):
        fid = chunks[i].strip()
        body = chunks[i+1]
        
        def get_f(name):
            p = rf"\*\*{re.escape(name)}:\*\*\s*(.*?)(?=\n\s*\*\*[A-Za-zÁÉÍÓÚáéíóúñÑ\s\(\)\/]+:\*\*|\Z)"
            m = re.search(p, body, re.DOTALL | re.IGNORECASE)
            return m.group(1).replace("\n", " ").strip() if m else ""

        findings.append({
            "id": fid,
            "rol": get_f("Rol") or "Auditor de Datos e Historial",
            "estado": "demostrado",
            "problema_o_correcto": get_f("Problema o funcionamiento correcto"),
            "evidencia": get_f("Evidencia"),
            "consecuencia_daniel": get_f("Consecuencia práctica para Daniel"),
            "propuesta": get_f("Propuesta concreta"),
            "dependencias_riesgos": get_f("Dependencias y riesgos"),
            "esfuerzo": get_f("Esfuerzo estimado y fundamento"),
            "beneficio": get_f("Beneficio esperado (medido vs estimado)"),
            "criterio_exito": get_f("Criterio verificable de éxito"),
            "reversion": get_f("Forma de revertir"),
            "info_pendiente": get_f("Información pendiente"),
        })
    return findings

def parse_ciencia(file_path):
    text = Path(file_path).read_text(encoding="utf-8")
    chunks = re.split(r"\n(?=###\s+CIE-\d+)", text)
    findings = []
    for chunk in chunks:
        m_id = re.search(r"CIE-\d+", chunk)
        if not m_id:
            continue
        fid = m_id.group(0)
        
        def get_f(name):
            p = rf"(?:^|\n)\s*-\s*\*\*{re.escape(name)}:\*\*\s*(.*?)(?=\n\s*-\s*\*\*[A-Za-zÁÉÍÓÚáéíóúñÑ\s\(\)\/]+:\*\*|\Z)"
            m = re.search(p, chunk, re.DOTALL | re.IGNORECASE)
            return m.group(1).replace("\n", " ").strip() if m else ""

        estado_raw = get_f("Estado")
        estado_clean = "demostrado"
        if "hipótesis" in estado_raw.lower() or "hipotesis" in estado_raw.lower():
            estado_clean = "hipótesis"
        elif "no verificable" in estado_raw.lower():
            estado_clean = "no verificable con el acceso disponible"

        findings.append({
            "id": fid,
            "rol": get_f("Rol") or "Auditor de Conocimiento Científico",
            "estado": estado_clean,
            "problema_o_correcto": get_f("Problema o funcionamiento correcto"),
            "evidencia": get_f("Evidencia"),
            "consecuencia_daniel": get_f("Consecuencia práctica para Daniel"),
            "propuesta": get_f("Propuesta concreta"),
            "dependencias_riesgos": get_f("Dependencias y riesgos"),
            "esfuerzo": get_f("Esfuerzo estimado y fundamento"),
            "beneficio": get_f("Beneficio esperado (medido vs estimado)"),
            "criterio_exito": get_f("Criterio verificable de éxito"),
            "reversion": get_f("Forma de revertir"),
            "info_pendiente": get_f("Información pendiente"),
        })
    return findings

def parse_decisiones(file_path):
    text = Path(file_path).read_text(encoding="utf-8")
    chunks = re.split(r"(?:\n|^)ID:\s*(DEC-\d+)", text)
    findings = []
    for i in range(1, len(chunks), 2):
        fid = chunks[i].strip()
        body = chunks[i+1]
        
        def get_f(name):
            p = rf"(?:^|\n){re.escape(name)}:\s*(.*?)(?=\n[A-Za-zÁÉÍÓÚáéíóúñÑ\s\(\)\/]+:|\Z|```)"
            m = re.search(p, body, re.DOTALL | re.IGNORECASE)
            return m.group(1).replace("\n", " ").strip() if m else ""

        estado_raw = get_f("Estado")
        estado_clean = "demostrado"
        if "hipótesis" in estado_raw.lower() or "hipotesis" in estado_raw.lower():
            estado_clean = "hipótesis"
        elif "no verificable" in estado_raw.lower():
            estado_clean = "no verificable con el acceso disponible"

        findings.append({
            "id": fid,
            "rol": get_f("Rol") or "Auditor de Decisiones del Entrenador",
            "estado": estado_clean,
            "problema_o_correcto": get_f("Problema o funcionamiento correcto"),
            "evidencia": get_f("Evidencia"),
            "consecuencia_daniel": get_f("Consecuencia práctica para Daniel"),
            "propuesta": get_f("Propuesta concreta"),
            "dependencias_riesgos": get_f("Dependencias y riesgos"),
            "esfuerzo": get_f("Esfuerzo estimado y fundamento"),
            "beneficio": get_f("Beneficio esperado (medido vs estimado)"),
            "criterio_exito": get_f("Criterio verificable de éxito"),
            "reversion": get_f("Forma de revertir"),
            "info_pendiente": get_f("Información pendiente"),
        })
    return findings

def parse_claridad(file_path):
    text = Path(file_path).read_text(encoding="utf-8")
    chunks = re.split(r"(?:\n|^)###\s+ID:\s*(CLA-\d+)", text)
    findings = []
    for i in range(1, len(chunks), 2):
        fid = chunks[i].strip()
        body = chunks[i+1]
        
        def get_f(name):
            p = rf"(?:^|\n)\s*-\s*\*\*{re.escape(name)}:\*\*\s*(.*?)(?=\n\s*-\s*\*\*[A-Za-zÁÉÍÓÚáéíóúñÑ\s\(\)\/]+:\*\*|\Z)"
            m = re.search(p, body, re.DOTALL | re.IGNORECASE)
            return m.group(1).replace("\n", " ").strip() if m else ""

        estado_raw = get_f("Estado")
        estado_clean = "demostrado"
        if "hipótesis" in estado_raw.lower() or "hipotesis" in estado_raw.lower():
            estado_clean = "hipótesis"
        elif "no verificable" in estado_raw.lower():
            estado_clean = "no verificable con el acceso disponible"

        findings.append({
            "id": fid,
            "rol": get_f("Rol") or "Auditor de Claridad y Esfuerzo para Daniel",
            "estado": estado_clean,
            "problema_o_correcto": get_f("Problema o funcionamiento correcto observado") or get_f("Problema o funcionamiento correcto"),
            "evidencia": get_f("Evidencia"),
            "consecuencia_daniel": get_f("Consecuencia práctica para Daniel"),
            "propuesta": get_f("Propuesta concreta"),
            "dependencias_riesgos": get_f("Dependencias y riesgos"),
            "esfuerzo": get_f("Esfuerzo estimado y fundamento de la estimación") or get_f("Esfuerzo estimado y fundamento"),
            "beneficio": get_f("Beneficio esperado (diferenciando medido de estimado)") or get_f("Beneficio esperado"),
            "criterio_exito": get_f("Criterio verificable de éxito"),
            "reversion": get_f("Forma de revertir el cambio, si se implementara") or get_f("Forma de revertir"),
            "info_pendiente": get_f("Información pendiente que realmente podría cambiar la decisión") or get_f("Información pendiente"),
        })
    return findings

def parse_tecnico(file_path):
    text = Path(file_path).read_text(encoding="utf-8")
    chunks = re.split(r"(?:\n|^)ID:\s*(TEC-\d+)", text)
    findings = []
    for i in range(1, len(chunks), 2):
        fid = chunks[i].strip()
        body = chunks[i+1]
        
        def get_f(name):
            # Matches "FieldName:\nValue" or "FieldName: Value"
            p = rf"(?:^|\n){re.escape(name)}:\s*\n?(.*?)(?=\n[A-Za-zÁÉÍÓÚáéíóúñÑ\s\(\)\/]+:|\Z|={10,})"
            m = re.search(p, body, re.DOTALL | re.IGNORECASE)
            return m.group(1).replace("\n", " ").strip() if m else ""

        estado_raw = get_f("Estado")
        estado_clean = "demostrado"
        if "hipótesis" in estado_raw.lower() or "hipotesis" in estado_raw.lower():
            estado_clean = "hipótesis"
        elif "no verificable" in estado_raw.lower():
            estado_clean = "no verificable con el acceso disponible"

        findings.append({
            "id": fid,
            "rol": get_f("Rol") or "Auditor Técnico y de Integración",
            "estado": estado_clean,
            "problema_o_correcto": get_f("Problema o funcionamiento correcto observado") or get_f("Problema o funcionamiento correcto"),
            "evidencia": get_f("Evidencia"),
            "consecuencia_daniel": get_f("Consecuencia práctica para Daniel"),
            "propuesta": get_f("Propuesta concreta"),
            "dependencias_riesgos": get_f("Dependencias y riesgos"),
            "esfuerzo": get_f("Esfuerzo estimado y fundamento de la estimación") or get_f("Esfuerzo estimado y fundamento"),
            "beneficio": get_f("Beneficio esperado (diferenciando medido de estimado)") or get_f("Beneficio esperado"),
            "criterio_exito": get_f("Criterio verificable de éxito"),
            "reversion": get_f("Forma de revertir el cambio, si se implementara") or get_f("Forma de revertir"),
            "info_pendiente": get_f("Información pendiente que realmente podría cambiar la decisión") or get_f("Información pendiente"),
        })
    return findings

def main():
    f_datos = parse_datos("auditoria_20261014_1725/INFORME_DATOS.md")
    f_ciencia = parse_ciencia("auditoria_20261014_1725/INFORME_CIENCIA.md")
    f_decisiones = parse_decisiones("auditoria_20261014_1725/INFORME_DECISIONES.md")
    f_claridad = parse_claridad("auditoria_20261014_1725/INFORME_CLARIDAD.md")
    f_tecnico = parse_tecnico("auditoria_20261014_1725/INFORME_TECNICO.md")
    
    print(f"DAT: {len(f_datos)}")
    print(f"CIE: {len(f_ciencia)}")
    print(f"DEC: {len(f_decisiones)}")
    print(f"CLA: {len(f_claridad)}")
    print(f"TEC: {len(f_tecnico)}")
    
    all_findings = []
    seen = set()
    for flist in [f_datos, f_ciencia, f_decisiones, f_claridad, f_tecnico]:
        for item in flist:
            if item["id"] not in seen:
                seen.add(item["id"])
                all_findings.append(item)
            else:
                print(f"Duplicate {item['id']} ignored")
                
    out_csv = Path("auditoria_20261014_1725/HALLAZGOS.csv")
    fieldnames = [
        "id", "rol", "estado", "problema_o_correcto", "evidencia",
        "consecuencia_daniel", "propuesta", "dependencias_riesgos",
        "esfuerzo", "beneficio", "criterio_exito", "reversion", "info_pendiente"
    ]
    with open(out_csv, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for frow in all_findings:
            writer.writerow(frow)
            
    print(f"Total unique findings written to {out_csv}: {len(all_findings)}")

if __name__ == "__main__":
    main()
