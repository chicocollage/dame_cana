import copy
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import operativo_contexto as op
import modelo_operativo as model
import conocimiento as kb

class ModeloTests(unittest.TestCase):
    def test_exposiciones_conservan_series_y_desconocidos(self):
        d=op.build();r=op.load('registro')
        ids=[i for e in d['modelo']['exposiciones'] for i in e['series_ids']]
        self.assertEqual(set(ids),{s['set_id'] for s in r['series']})
        self.assertEqual(len(ids),len(r['series']))
        by_set={s['set_id']:s for s in r['series']}
        self.assertTrue(any(e['machine_id'] is None for e in d['modelo']['exposiciones']))
        self.assertTrue(all(e['machine_id']==by_set[e['series_ids'][0]].get('machine_id') for e in d['modelo']['exposiciones']))
        self.assertEqual(len(d['vistas_humanas']),6)
        self.assertEqual(len(d['vistas']),9)
    def test_normalizar_no_fusiona_variantes(self):
        self.assertEqual(model.normalized('\u200bRemo  con pecho'), 'Remo con pecho')
        self.assertNotEqual(model.key('Remo con pecho'),model.key('Remo posterior con pecho'))
    def test_cambio_biblioteca_cambia_huella(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'biblioteca').mkdir()
            before=model.knowledge(root)['huella']
            (root/'biblioteca/nuevo.md').write_text('Estudio de prueba',encoding='utf-8')
            self.assertNotEqual(before,model.knowledge(root)['huella'])
    def test_enlace_inexistente_y_aceptacion_no_inventada(self):
        cfg=op.load('modelo_operativo');cfg['enlaces_confirmados']=[{'slot_id':'NO-EXISTE','exercise_id':'G01','fecha':'2026-10-11','evidencia':'prueba'}]
        real=json.loads
        with patch.object(model.json,'loads',side_effect=lambda text:cfg if 'dame_cana_modelo_operativo.v1' in text else real(text)):
            with self.assertRaisesRegex(ValueError,'sin puesto'):op.build()
    def test_estudio_nuevo_no_cambia_programa_y_no_duplica(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'data').mkdir();(root/'biblioteca').mkdir()
            ledger={'schema':'dame_cana_actualizaciones_conocimiento.v1','revision':0,'estudios':[],'historial':[]}
            (root/'data/actualizaciones_conocimiento.json').write_text(json.dumps(ledger))
            (root/'data/programa.json').write_text('{"version":"sin cambios"}')
            src=root/'estudio.txt';src.write_text('Fuente de prueba aislada')
            args=kb.parser().parse_args(['incorporar','--id','EST-TEST','--archivo',str(src),'--titulo','Prueba','--fuente','Fuente','--aplicar'])
            with patch.object(kb,'ROOT',root),patch.object(kb,'LEDGER',root/'data/actualizaciones_conocimiento.json'):
                result=kb.apply(args);self.assertEqual(result['programa'],'sin cambios')
                saved=json.loads((root/'data/actualizaciones_conocimiento.json').read_text())
                self.assertEqual(saved['estudios'][0]['estado'],'pendiente_contraste')
                self.assertEqual((root/'data/programa.json').read_text(),'{"version":"sin cambios"}')
                with self.assertRaisesRegex(ValueError,'ID ya'):kb.apply(args)
                args.id='EST-OTRO'
                with self.assertRaisesRegex(ValueError,'identico'):kb.apply(args)
    def test_seguimiento_fecha_sola_no_es_observacion(self):
        d=op.build();rows=next(v['rows'] for v in d['vistas'] if v['name']=='Seguimiento')
        self.assertTrue(any('Plantilla sin observación' in r[3] for r in rows))

if __name__=='__main__':unittest.main()
