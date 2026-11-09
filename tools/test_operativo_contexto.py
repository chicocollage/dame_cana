"""Comprueba desconocidos, integridad y conservación de fuentes en las vistas."""
import copy
import hashlib
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch

import operativo_contexto as op


class OperativoTests(unittest.TestCase):
    def test_no_modifica_fuentes_y_cuadra_cobertura(self):
        before = {f: op.sha(op.ROOT/f) for f in op.SOURCES}
        context = op.build()
        self.assertEqual(before, {f: op.sha(op.ROOT/f) for f in op.SOURCES})
        views = {v['name']: v for v in context['vistas']}
        original = op.load('registro')
        self.assertEqual(len(views['Series']['rows']),len(original['series']))
        self.assertEqual(len(views['Sesiones']['rows']),len(original['sesiones']))
        self.assertEqual(sum(row[5] is not None and row[5]>0 for row in views['Series']['rows']),context['calidad']['series_con_repeticiones'])
        self.assertEqual(op.text(0),'0')
        self.assertEqual(op.text(None),'Sin dato')
        for source,row in zip(original['series'],views['Series']['rows']):
            self.assertEqual(source.get('rir'),row[6])

    def test_bloquea_integridad_rota(self):
        real = op.load
        def fake(name):
            data=copy.deepcopy(real(name))
            if name=='registro':data['series'][0]['session_id']='sesion-inexistente'
            return data
        with patch.object(op,'load',fake),self.assertRaisesRegex(op.registro_local.ErrorRegistro,'sin sesión'):
            op.build()

    def test_pendiente_se_resuelve_solo_si_id_incorporado(self):
        real=op.load
        def fake(name):
            data=copy.deepcopy(real(name))
            if name=='pendientes_externos':
                data['pendientes_externos']=[{'session_id':real('registro')['sesiones'][0]['session_id'],'fecha':'2026-07-29','dia':'A'}]
            return data
        with patch.object(op,'load',fake):
            self.assertEqual(op.build()['pendientes_externos_no_incorporados'],[])

    def test_respaldo_bloquea_libro_desactualizado(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            (out/'DAME_CANA_OPERATIVO_LOCAL.xlsx').write_bytes(b'libro nuevo')
            op.registro_local.guardar_atomico(out/'HUELLAS_LIBRO.json', {'DAME_CANA_OPERATIVO_LOCAL.xlsx':'huella antigua'})
            with patch.object(op,'OUT',out),self.assertRaisesRegex(ValueError,'desactualizados'):
                op.backup(op.build())


    def test_sesion_no_crea_ejercicios_fantasma(self):
        import io, re, contextlib
        import operativo
        head = re.compile(r'^.+ — \d+ × \d+')
        nxm = re.compile(r'(?:^|\s)\d+\s*[x×]\s*\d+')
        for dia in 'ABCDE':
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                operativo.cmd_sesion(dia)
            texto = buf.getvalue().split('```text')[0]
            for linea in texto.splitlines():
                if nxm.search(linea) and not head.match(linea) and not linea.startswith('Último registro:'):
                    self.fail(f'Día {dia}: patrón N x M accidental -> {linea}')
            self.assertIn('```text', buf.getvalue())


if __name__=='__main__':unittest.main()
