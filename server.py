"""
DAME CAÑA // OS v2.0 - Micro-servidor local con API de persistencia
Sirve el Hub central (index.html, data/) y recibe POST /api/save para guardar en data/registro.json
"""
import http.server
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
REGISTRO_PATH = DATA_DIR / "registro.json"
PORT = 8080

class HubHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/save":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}
            sets = body.get("sets", body if isinstance(body, list) else [])

            if not sets:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b'{"status":"error","message":"Buffer sin series"}')
                return

            with open(REGISTRO_PATH, "r", encoding="utf-8") as f:
                reg = json.load(f)

            sid = f"hub-{uuid.uuid4().hex[:6]}"
            fecha = sets[0].get("date", datetime.now().strftime("%Y-%m-%d"))
            dia = sets[0].get("day", "C")

            sesion = {
                "session_id": sid,
                "fecha": fecha,
                "dia": dia,
                "titulo": f"Día {dia} · Hub Web",
                "finished": True,
                "record_quality": "hub_web_note_v1",
                "exercise_count": len(set(s.get("exerciseName") for s in sets)),
                "planned_set_count": len(sets),
                "recorded_set_count": len(sets),
                "source_note": "Consola Note v1 Hub Central",
                "exported_at": datetime.now().isoformat() + "Z",
                "source_file": "hub_web_input"
            }
            reg.setdefault("sesiones", []).append(sesion)

            for i, s in enumerate(sets):
                reg.setdefault("series", []).append({
                    "set_id": f"{sid}__S{i+1}",
                    "session_id": sid,
                    "fecha": s.get("date", fecha),
                    "dia": s.get("day", dia),
                    "exercise_order": i + 1,
                    "exercise_name": s.get("exerciseName"),
                    "exercise_id": None,
                    "slot_id": None,
                    "machine_id": s.get("stationId") if s.get("stationId") != "SIN_ID" else None,
                    "variant": None,
                    "machine_settings": s.get("setup"),
                    "load_basis": "total_kg",
                    "resistance_mode": "external",
                    "resistance_difficulty": None,
                    "set_index": i + 1,
                    "load_kg": s.get("kg"),
                    "reps": s.get("reps"),
                    "rir": s.get("rir"),
                    "per_side": False,
                    "tempo": s.get("tempo"),
                    "movement_notes": s.get("notes"),
                    "comparability_group": s.get("stationId") if s.get("comparable") else None,
                    "source_file": "hub_web_input"
                })

            if fecha > reg.get("corte_sesiones", ""):
                reg["corte_sesiones"] = fecha

            with open(REGISTRO_PATH, "w", encoding="utf-8") as f:
                json.dump(reg, f, ensure_ascii=False, indent=2)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = json.dumps({
                "status": "ok",
                "session_id": sid,
                "series_count": len(sets),
                "total_sessions": len(reg["sesiones"]),
                "total_series": len(reg["series"])
            })
            self.wfile.write(resp.encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    server = http.server.ThreadingHTTPServer(("", port), HubHandler)
    print(f"Hub Central DAME CAÑA v2.0 activo en: http://localhost:{port}")
    server.serve_forever()
