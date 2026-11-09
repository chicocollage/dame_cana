import unittest
import json
import tempfile
import shutil
from pathlib import Path

from tools import nutricion

class TestNutricion(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.alimentos_path = Path(self.test_dir) / "alimentos.json"
        self.nutricion_path = Path(self.test_dir) / "nutricion.json"
        self.seguimiento_path = Path(self.test_dir) / "seguimiento.json"
        self.backup_dir = Path(self.test_dir) / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Copy real alimentos.json to temp
        real_alimentos = Path("data/alimentos.json").read_text(encoding="utf-8")
        self.alimentos_path.write_text(real_alimentos, encoding="utf-8")

        # Initial nutricion.json
        init_nutricion = {
            "version": 1,
            "objetivo": {
                "fase": "volumen",
                "prot_g_kg": 2.0,
                "kcal_inicial": 2950,
                "kcal_rango": [2800, 3000],
                "ritmo_kg_semana": 0.20,
                "origen": "estimacion_inicial"
            },
            "objetivos_vigentes": {
                "desde": "2026-10-20",
                "kcal": 2950,
                "kcal_rango": [2800, 3000],
                "prot": 150,
                "origen": "estimacion_inicial"
            },
            "modo_presupuesto": {
                "activo": False,
                "eur_semana": 20.0,
                "desde": None
            },
            "dias": {},
            "desconocidos": []
        }
        self.nutricion_path.write_text(json.dumps(init_nutricion, ensure_ascii=False, indent=2), encoding="utf-8")

        # Initial seguimiento.json
        init_seguimiento = {
            "schema": 1,
            "medidas": [
                {
                    "measure_id": "MED-20261019_RENPHO",
                    "fecha": "2026-10-19T08:00:00",
                    "protocolo": "Báscula BIA Renpho matutino",
                    "peso_medio_kg": 76.65
                }
            ]
        }
        self.seguimiento_path.write_text(json.dumps(init_seguimiento, ensure_ascii=False, indent=2), encoding="utf-8")

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_alias_y_cantidades(self):
        catalogo = nutricion.cargar_alimentos(self.alimentos_path)
        items, desconocidos = nutricion.parsear_ingesta_texto("2 huevos y tostada", catalogo)
        self.assertEqual(len(desconocidos), 0)
        self.assertEqual(len(items), 2)
        huevo_item = next(it for it in items if it["id"] == "huevo_l")
        self.assertEqual(huevo_item["n"], 2.0)
        pan_item = next(it for it in items if it["id"] == "pan")
        self.assertEqual(pan_item["n"], 1.0)

    def test_tolerancia_acentos_y_mayusculas(self):
        catalogo = nutricion.cargar_alimentos(self.alimentos_path)
        items, desconocidos = nutricion.parsear_ingesta_texto("PLATO DE LENTEJAS con Atún", catalogo)
        self.assertEqual(len(desconocidos), 0)
        ids = [it["id"] for it in items]
        self.assertIn("lentejas_cocidas", ids)
        self.assertIn("atun_lata", ids)

    def test_bebida_lidl_y_leche_mercadona(self):
        catalogo = nutricion.cargar_alimentos(self.alimentos_path)
        items, desc = nutricion.parsear_ingesta_texto("bebida de proteina del lidl y vaso de leche proteica mercadona", catalogo)
        self.assertEqual(len(desc), 0)
        ids = [it["id"] for it in items]
        self.assertIn("bebida_proteica_lidl", ids)
        self.assertIn("leche_proteina_mercadona", ids)

    def test_desconocido_no_rompe(self):
        catalogo = nutricion.cargar_alimentos(self.alimentos_path)
        items, desconocidos = nutricion.parsear_ingesta_texto("2 huevos y pócima mágica de la abuela", catalogo)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["id"], "huevo_l")
        self.assertTrue(any("pócima mágica" in d or "pocima" in d for d in desconocidos))

    def test_comer_cli_y_totales(self):
        res = nutricion.registrar_comer(
            texto="2 huevos y tostada con chorro de aceite",
            fecha="2026-10-20",
            path_nutricion=self.nutricion_path,
            path_alimentos=self.alimentos_path,
            backup_dir=self.backup_dir
        )
        self.assertTrue(res["ok"])
        self.assertGreater(res["ingesta"]["kcal_est"][0], 300)
        self.assertGreater(res["totales_dia"]["prot_est"][0], 12)  # 2 huevos L (55g) + tostada ~ 15g
        self.assertEqual(res["totales_dia"]["n_ingestas"], 1)

    def test_items_json_directo(self):
        items_payload = [
            {"id": "bebida_proteica_lidl", "n": 1},
            {"id": "platano", "n": 1}
        ]
        res = nutricion.registrar_comer(
            items_json=items_payload,
            fecha="2026-10-20",
            path_nutricion=self.nutricion_path,
            path_alimentos=self.alimentos_path,
            backup_dir=self.backup_dir
        )
        self.assertTrue(res["ok"])
        self.assertIn("bebida_proteica_lidl", [it["id"] for it in res["ingesta"]["items"]])
        self.assertGreater(res["totales_dia"]["prot_est"][0], 30)

    def test_hoy_totales_y_sugerencias(self):
        # Registramos desayuno ligero
        nutricion.registrar_comer(
            texto="2 huevos y tostada",
            fecha="2026-10-20",
            path_nutricion=self.nutricion_path,
            path_alimentos=self.alimentos_path,
            backup_dir=self.backup_dir
        )
        res_hoy = nutricion.resumen_hoy(
            fecha="2026-10-20",
            path_nutricion=self.nutricion_path,
            path_alimentos=self.alimentos_path
        )
        self.assertTrue(res_hoy["ok"])
        self.assertGreater(res_hoy["pendientes"]["prot_g"], 100)
        self.assertGreater(len(res_hoy["sugerencias"]), 0)

    def test_cerrar_dia_completo_e_incompleto(self):
        nutricion.registrar_comer(
            texto="2 huevos",
            fecha="2026-10-20",
            path_nutricion=self.nutricion_path,
            path_alimentos=self.alimentos_path,
            backup_dir=self.backup_dir
        )
        res_cerrar = nutricion.cerrar_dia(
            fecha="2026-10-20",
            incompleto=True,
            path_nutricion=self.nutricion_path,
            backup_dir=self.backup_dir
        )
        self.assertEqual(res_cerrar["estado"], "incompleto")

    def test_semana_ajuste_insuficiente(self):
        # Only 1 day registered -> must report insufficient data
        res = nutricion.analisis_semana(
            fecha_corte="2026-10-20",
            path_nutricion=self.nutricion_path,
            path_seguimiento=self.seguimiento_path
        )
        self.assertEqual(res["estado"], "datos_insuficientes")
        self.assertFalse(res["ajuste_propuesto"])

    def test_semana_ajuste_suficiente_y_aplicar(self):
        # Poblar 12 días completos
        nut_data = json.loads(self.nutricion_path.read_text(encoding="utf-8"))
        for i in range(12):
            f = f"2026-10-{10+i:02d}"
            nut_data["dias"][f] = {
                "estado": "completo",
                "ingestas": [{
                    "hora": "14:00",
                    "texto": "comida",
                    "items": [],
                    "kcal_est": [2900, 3100],
                    "prot_est": [140, 160],
                    "carb_est": [300, 350],
                    "grasa_est": [70, 90],
                    "eur_est": 5.0,
                    "confianza": "alta"
                }]
            }
        self.nutricion_path.write_text(json.dumps(nut_data), encoding="utf-8")

        # Poblar 6 pesajes matutinos con subida rápida (+0.5 kg/semana)
        # 14 días: subida de 1.0 kg -> (1.0 / 14) * 7 = 0.5 kg/semana (> 0.35)
        seg_data = json.loads(self.seguimiento_path.read_text(encoding="utf-8"))
        seg_data["medidas"] = [
            {"measure_id": "M1", "fecha": "2026-10-08T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.0},
            {"measure_id": "M2", "fecha": "2026-10-10T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.2},
            {"measure_id": "M3", "fecha": "2026-10-13T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.4},
            {"measure_id": "M4", "fecha": "2026-10-16T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.7},
            {"measure_id": "M5", "fecha": "2026-10-19T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.9},
            {"measure_id": "M6", "fecha": "2026-10-21T08:00:00", "protocolo": "matutino", "peso_medio_kg": 77.0},
        ]
        self.seguimiento_path.write_text(json.dumps(seg_data), encoding="utf-8")

        res = nutricion.analisis_semana(
            fecha_corte="2026-10-21",
            aplicar=True,
            path_nutricion=self.nutricion_path,
            path_seguimiento=self.seguimiento_path,
            backup_dir=self.backup_dir
        )
        self.assertEqual(res["estado"], "analisis_completado")
        self.assertTrue(res["ajuste_propuesto"])
        self.assertEqual(res["delta_kcal"], -150)
        self.assertTrue(res.get("aplicado"))

        # Verificar que se actualizó nutricion.json
        nut_updated = json.loads(self.nutricion_path.read_text(encoding="utf-8"))
        self.assertEqual(nut_updated["objetivos_vigentes"]["kcal"], 2800)

    def test_modo_presupuesto_y_lista_compra(self):
        res = nutricion.gestionar_presupuesto(
            eur=20.0,
            path_nutricion=self.nutricion_path,
            path_alimentos=self.alimentos_path,
            backup_dir=self.backup_dir
        )
        self.assertTrue(res["ok"])
        self.assertLessEqual(res["lista_compra"]["total_eur"], 20.0)
        self.assertGreater(res["lista_compra"]["prot_total_g"], 500)

    def test_aprender_nuevo_alimento(self):
        res = nutricion.aprender_alimento(
            nombre="Batido casero de avena y platano",
            alias=["batido casero", "mi batido"],
            kcal=450,
            prot=25,
            carb=60,
            grasa=10,
            eur_kg=3.0,
            path_alimentos=self.alimentos_path
        )
        self.assertTrue(res["ok"])
        catalogo = nutricion.cargar_alimentos(self.alimentos_path)
        items, desc = nutricion.parsear_ingesta_texto("mi batido", catalogo)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["id"], "batido_casero_de_avena_y_platano")

    def _dia(self, kcal, prot=150, estado="completo"):
        return {
            "estado": estado,
            "ingestas": [{
                "hora": "14:00", "texto": "x", "items": [],
                "kcal_est": [kcal, kcal], "prot_est": [prot, prot],
                "carb_est": [0, 0], "grasa_est": [0, 0],
                "eur_est": 0.0, "confianza": "alta"
            }]
        }

    def _set_dias(self, dias):
        d = json.loads(self.nutricion_path.read_text(encoding="utf-8"))
        d["dias"] = dias
        self.nutricion_path.write_text(json.dumps(d), encoding="utf-8")

    def test_compensacion_reparte_deficit_con_tope(self):
        # Ayer: 1950 kcal frente a 2950 -> deficit 1000 (se compensa max 900 -> 300/dia)
        self._set_dias({"2026-10-19": self._dia(1950)})
        res = nutricion.resumen_hoy("2026-10-20", self.nutricion_path, self.alimentos_path)
        comp = res["compensacion"]
        self.assertEqual(comp["deficit_kcal"], 1000)
        self.assertEqual(comp["extra_hoy_kcal"], 300)
        self.assertEqual(comp["descartado_kcal"], 100)
        self.assertFalse(comp["proteina_compensable"])
        self.assertEqual(res["objetivo"]["prot"], 150)

    def test_compensacion_pequena_y_superavit_no_actuan(self):
        self._set_dias({"2026-10-19": self._dia(2850)})  # deficit 100 < 150
        comp = nutricion.resumen_hoy("2026-10-20", self.nutricion_path, self.alimentos_path)["compensacion"]
        self.assertEqual(comp["extra_hoy_kcal"], 0)
        self._set_dias({"2026-10-18": self._dia(1950), "2026-10-19": self._dia(3950)})  # neto superavit
        comp = nutricion.resumen_hoy("2026-10-20", self.nutricion_path, self.alimentos_path)["compensacion"]
        self.assertEqual(comp["deficit_kcal"], 0)

    def test_dias_incompletos_o_ausentes_no_cuentan_como_bajos(self):
        self._set_dias({"2026-10-19": self._dia(500, estado="incompleto")})
        comp = nutricion.resumen_hoy("2026-10-20", self.nutricion_path, self.alimentos_path)["compensacion"]
        self.assertEqual(comp["dias_considerados"], [])
        self.assertEqual(comp["extra_hoy_kcal"], 0)

    def test_aviso_reparto_proteina(self):
        self._set_dias({"2026-10-20": self._dia(2000, prot=100, estado="abierto")})
        res = nutricion.resumen_hoy("2026-10-20", self.nutricion_path, self.alimentos_path)
        self.assertTrue(any("Reparto" in a for a in res["avisos"]))
        self.assertEqual(res["totales"]["bolos_anabolicos_35g"], 1)

    def test_aviso_umbral_leucina_tomas_fragmentadas_40plus(self):
        dia_frag = {
            "estado": "abierto",
            "ingestas": [
                {"hora": "09:00", "texto": "t1", "items": [], "kcal_est": [300, 300], "prot_est": [18, 18], "carb_est": [20, 20], "grasa_est": [10, 10], "eur_est": 1.0},
                {"hora": "13:00", "texto": "t2", "items": [], "kcal_est": [350, 350], "prot_est": [20, 20], "carb_est": [30, 30], "grasa_est": [10, 10], "eur_est": 1.0},
                {"hora": "18:00", "texto": "t3", "items": [], "kcal_est": [300, 300], "prot_est": [19, 19], "carb_est": [25, 25], "grasa_est": [8, 8], "eur_est": 1.0},
            ],
        }
        self._set_dias({"2026-10-21": dia_frag})
        res = nutricion.resumen_hoy("2026-10-21", self.nutricion_path, self.alimentos_path)
        self.assertEqual(res["totales"]["bolos_anabolicos_35g"], 0)
        self.assertTrue(any("Umbral leucina 40+" in a for a in res["avisos"]))

    def test_aviso_umbral_no_se_silencia_por_una_toma_grande(self):
        def ing(p):
            return {"hora": "12:00", "texto": "t", "items": [], "kcal_est": [300, 300], "prot_est": [p, p],
                    "carb_est": [20, 20], "grasa_est": [10, 10], "eur_est": 1.0}
        self._set_dias({"2026-10-22": {"estado": "abierto", "ingestas": [ing(24), ing(29), ing(8), ing(30)]}})
        res = nutricion.resumen_hoy("2026-10-22", self.nutricion_path, self.alimentos_path)
        self.assertTrue(any("Umbral leucina 40+" in a for a in res["avisos"]))

    def test_sugerencias_excluyen_legumbres_tradicionales_y_whey(self):
        cat = nutricion.cargar_alimentos(self.alimentos_path)
        ids = {s["id"] for s in nutricion.generar_sugerencias(40, 0, 900, cat, modo_presupuesto=True)}
        self.assertFalse(ids & {"lentejas_cocidas", "lentejas_secas", "garbanzos_cocidos", "proteina_whey"})

    def test_presupuesto_informa_cobertura_y_sin_familias_duplicadas(self):
        res = nutricion.gestionar_presupuesto(
            eur=20.0, path_nutricion=self.nutricion_path,
            path_alimentos=self.alimentos_path, backup_dir=self.backup_dir)
        lc = res["lista_compra"]
        self.assertIn("cobertura_kcal_pct", lc)
        self.assertGreater(lc["kcal_total"], 0)
        self.assertLessEqual(lc["total_eur"], 20.0)
        familias = [it["nombre"].split()[0].lower() for it in lc["items"]]
        self.assertEqual(len(familias), len(set(familias)))
        if lc["cobertura_kcal_pct"] < 80:
            self.assertTrue(lc["avisos"])

    def test_aviso_cintura_sube_con_ritmo_alto(self):
        nut = json.loads(self.nutricion_path.read_text(encoding="utf-8"))
        for i in range(12):
            nut["dias"][f"2026-10-{10+i:02d}"] = self._dia(3000)
        self.nutricion_path.write_text(json.dumps(nut), encoding="utf-8")
        seg = json.loads(self.seguimiento_path.read_text(encoding="utf-8"))
        seg["medidas"] = [
            {"fecha": "2026-10-08T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.0, "cintura_usada_cm": 80.0},
            {"fecha": "2026-10-10T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.2},
            {"fecha": "2026-10-13T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.4},
            {"fecha": "2026-10-16T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.6},
            {"fecha": "2026-10-19T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.8},
            {"fecha": "2026-10-21T08:00:00", "protocolo": "matutino", "peso_medio_kg": 76.9, "cintura_usada_cm": 81.5},
        ]
        self.seguimiento_path.write_text(json.dumps(seg), encoding="utf-8")
        res = nutricion.analisis_semana("2026-10-21", path_nutricion=self.nutricion_path,
                                        path_seguimiento=self.seguimiento_path)
        self.assertEqual(res["cintura_delta_cm"], 1.5)
        self.assertIn("exceso graso", res["aviso_cintura"])


if __name__ == "__main__":
    unittest.main()
