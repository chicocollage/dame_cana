"""Pruebas unitarias de integridad de indicaciones técnicas y variantes."""
from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IND_PATH = ROOT / "data/indicaciones_tecnicas.json"
CAT_PATH = ROOT / "data/catalogos.json"
PROG_PATH = ROOT / "data/programa.json"


class TestIndicacionesTecnicas(unittest.TestCase):
    def setUp(self):
        self.assertTrue(IND_PATH.exists(), "data/indicaciones_tecnicas.json debe existir")
        self.data = json.loads(IND_PATH.read_text(encoding="utf-8"))
        self.cat = json.loads(CAT_PATH.read_text(encoding="utf-8"))
        self.prog = json.loads(PROG_PATH.read_text(encoding="utf-8"))

    def test_cobertura_completa_55_ejercicios(self):
        ids_catalogo = {r["ID"] for r in self.cat["matriz_seleccion"]}
        ids_indicaciones = set(self.data["ejercicios"].keys())
        self.assertTrue(ids_catalogo.issubset(ids_indicaciones))
        self.assertGreaterEqual(len(ids_indicaciones), 55)

    def test_estructura_y_campos_requeridos(self):
        for eid, item in self.data["ejercicios"].items():
            self.assertEqual(item["id"], eid)
            self.assertTrue(item.get("nombre"))
            self.assertTrue(item.get("familia"))
            self.assertTrue(item.get("region_principal"))
            
            # Base
            base = item.get("base", {})
            self.assertTrue(base.get("configuracion"), f"{eid} sin configuracion base")
            self.assertTrue(base.get("objetivo"), f"{eid} sin objetivo base")
            self.assertIn(base.get("estado"), ["borrador", "validada", "activo", "confirmado"])
            
            # Variantes
            for v in item.get("variantes", []):
                self.assertTrue(v.get("id"), f"{eid} variante sin ID")
                self.assertTrue(v.get("cambio"), f"{eid} variante sin cambio")
                self.assertTrue(v.get("sensacion_buscada"), f"{eid} variante sin sensacion")
                self.assertTrue(v.get("configuracion"), f"{eid} variante sin configuracion")
                self.assertTrue(v.get("objetivo"), f"{eid} variante sin objetivo")
                
            # Respaldo científico
            resp = item.get("respaldo_cientifico", {})
            self.assertTrue(len(resp.get("fuentes", [])) > 0, f"{eid} sin fuentes científicas")
            self.assertTrue(resp.get("justificacion_biomecanica"), f"{eid} sin justificación biomecánica")

    def test_mapeo_slots_programa_valido(self):
        mapeo = self.data["mapeo_slots_programa"]
        slots_programa = {s["slot_id"] for s in self.prog["slots"]}
        for s_id in slots_programa:
            self.assertIn(s_id, mapeo, f"Slot {s_id} no está en el mapeo")
            ex_id = mapeo[s_id]
            self.assertIn(ex_id, self.data["ejercicios"], f"Ejercicio {ex_id} mapeado no existe")


if __name__ == "__main__":
    unittest.main()
