import json
from pathlib import Path

def extract_message(cid, out_path):
    log_file = Path(f"C:/Users/Daniel/.gemini/antigravity/brain/{cid}/.system_generated/logs/transcript_full.jsonl")
    if not log_file.exists():
        log_file = Path(f"C:/Users/Daniel/.gemini/antigravity/brain/{cid}/.system_generated/logs/transcript.jsonl")
    
    last_msg = None
    for line in open(log_file, "r", encoding="utf-8", errors="ignore"):
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
            tool_calls = obj.get("tool_calls") or []
            for tc in tool_calls:
                if tc.get("name") == "send_message":
                    last_msg = tc.get("args", {}).get("Message")
        except Exception:
            continue
    
    if last_msg:
        Path(out_path).write_text(last_msg, encoding="utf-8")
        print(f"Wrote {len(last_msg)} chars to {out_path}")
    else:
        print(f"No send_message found for {cid}")

if __name__ == "__main__":
    # auditor_datos
    extract_message("7487954d-8dfe-4186-9a89-46e3f625bb5f", "auditoria_20261014_1725/INFORME_DATOS.md")
    # auditor_ciencia
    extract_message("05870c88-26ef-4012-a9c4-2e84c2301f87", "auditoria_20261014_1725/INFORME_CIENCIA.md")
    # auditor_decisiones
    extract_message("7cd5835e-42dd-402e-975b-2d18124729c8", "auditoria_20261014_1725/INFORME_DECISIONES.md")
    # auditor_claridad
    extract_message("df6f9bc0-a807-46ca-aac5-3950e005d661", "auditoria_20261014_1725/INFORME_CLARIDAD.md")
    # auditor_tecnico
    extract_message("a8bb6dcb-5acf-4cce-8ce5-fecd11f41b0f", "auditoria_20261014_1725/INFORME_TECNICO.md")
