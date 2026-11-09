"""Pruebas de integridad del puente de exportación de la app."""
import json
import tempfile
import unittest
from pathlib import Path

import registro_local as registro


class RegistroLocalTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "data").mkdir()
        (self.root / "data/registro.json").write_bytes(registro.REGISTRO.read_bytes())
        initial=registro.leer_json(self.root / 'data/registro.json')
        self.initial_sessions=len(initial['sesiones'])
        self.initial_sets=len(initial['series'])
        self.initial_next_day=registro.validar_registro(initial)['siguiente_dia']
        (self.root / 'data/conflictos_fuentes.json').write_text('{"conflictos": []}',encoding='utf-8')
        self.original = (registro.ROOT, registro.REGISTRO, registro.ORIGINALES)
        registro.ROOT = self.root
        registro.REGISTRO = self.root / "data/registro.json"
        registro.ORIGINALES = self.root / "data/originales_app"
        self.addCleanup(self.restore)

    def restore(self):
        registro.ROOT, registro.REGISTRO, registro.ORIGINALES = self.original

    def sample(self, reps=9):
        path = self.root / "sample.json"
        value = {
            "schema": "training_log.v1", "exported_at": "2026-09-29T18:00:00Z",
            "event_id": "TEST-EVENT-1",
            "session": {"id": "sample-session-1", "date": "2026-09-28T22:30:00Z", "title": "Día B",
                        "finished": True, "exercise_count": 1, "planned_set_count": 2,
                        "recorded_set_count": 1},
            "exercises": [{"index": 1, "name": "Curl femoral sentado",
                           "identity": {"variant": "Máquina", "load_basis": "total_kg",
                                        "resistance_mode": "external", "machine_settings": ""},
                           "prescription": {"per_side": False},
                           "result": {"movement_notes": "", "sets": [
                               {"index": 1, "load_kg": "25", "reps": str(reps), "rir": "2",
                                "resistance": {"mode": "external", "difficulty": ""}},
                               {"index": 2, "load_kg": "", "reps": "", "rir": "",
                                "resistance": {"mode": "external", "difficulty": ""}}
                           ]}}],
        }
        path.write_text(json.dumps(value), encoding="utf-8")
        return path

    def test_import_reintento_y_conflicto(self):
        source = self.sample()
        self.assertEqual(registro.importar(source, aplicar=False)["sesiones"][0]["resultado"], "listo_para_importar")
        self.assertEqual(registro.importar(source, aplicar=True)["sesiones"][0]["resultado"], "importado")
        self.assertEqual(registro.importar(source, aplicar=True)["sesiones"][0]["resultado"], "duplicado_igual")
        updated = registro.leer_json(registro.REGISTRO)
        self.assertEqual(len(updated["sesiones"]), self.initial_sessions+1)
        self.assertEqual(len(updated["series"]), self.initial_sets+2)
        self.assertEqual(updated["sesiones"][-1]["fecha"], "2026-09-29")
        self.assertEqual(updated["sesiones"][-1]["recorded_set_count"], 1)
        self.assertEqual(registro.validar_registro(updated)["siguiente_dia"], self.initial_next_day)
        self.assertEqual(len(list((self.root / "data/backups").glob("*.json"))), 1)
        self.sample(reps=10)
        with self.assertRaisesRegex(registro.ErrorRegistro, "Conflicto"):
            registro.importar(source, aplicar=True)
        self.assertEqual(len(registro.leer_json(registro.REGISTRO)["series"]), self.initial_sets+2)

    def test_recuento_incorrecto_no_se_importa(self):
        source = self.sample()
        value = json.loads(source.read_text(encoding="utf-8"))
        value["session"]["recorded_set_count"] = 2
        source.write_text(json.dumps(value), encoding="utf-8")
        with self.assertRaisesRegex(registro.ErrorRegistro, "recuento declarado"):
            registro.importar(source, aplicar=True)
        self.assertEqual(len(registro.leer_json(registro.REGISTRO)["sesiones"]), self.initial_sessions)

    def test_historial_omite_borradores_y_no_duplica(self):
        source = self.sample()
        record = json.loads(source.read_text(encoding="utf-8"))
        draft = json.loads(source.read_text(encoding="utf-8"))
        draft["session"]["id"] = "draft-session-1"
        draft["session"]["finished"] = False
        history = {"schema": "training_history.v1", "session_schema": "training_log.v1",
                   "exported_at": "2026-09-29T18:00:00Z", "sessions": [record, draft]}
        source.write_text(json.dumps(history), encoding="utf-8")
        result = registro.importar(source, aplicar=True)
        self.assertEqual(result["borradores_omitidos"], 1)
        self.assertEqual(len(registro.leer_json(registro.REGISTRO)["sesiones"]), self.initial_sessions+1)
        self.assertEqual(registro.importar(source, aplicar=True)["sesiones"][0]["resultado"], "duplicado_igual")

    def test_titulo_de_nota_con_subtitulo_conserva_dia(self):
        source = self.sample()
        value = json.loads(source.read_text(encoding="utf-8"))
        value["session"]["title"] = "Día B · Glúteo y torso"
        source.write_text(json.dumps(value), encoding="utf-8")
        self.assertEqual(registro.convertir_app(source)[0][0][0]["dia"], "B")

    def test_sesion_anidada_malformada_da_error_claro(self):
        source = self.sample()
        history = {"schema": "training_history.v1", "session_schema": "training_log.v1",
                   "sessions": [{"schema": "training_log.v1", "session": []}]}
        source.write_text(json.dumps(history), encoding="utf-8")
        with self.assertRaisesRegex(registro.ErrorRegistro, "session anidada inválida"):
            registro.convertir_app(source)

    def test_json_sin_objeto_principal_da_error_claro(self):
        source = self.sample()
        source.write_text("[]", encoding="utf-8")
        with self.assertRaisesRegex(registro.ErrorRegistro, "debe contener un objeto"):
            registro.convertir_app(source)


if __name__ == "__main__":
    unittest.main()
