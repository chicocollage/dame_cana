# DAME CAÑA — Sistema Operativo Local (Antigravity / Gemini)

Base canónica local para prescribir, registrar y auditar el entrenamiento, la biomecánica y la nutrición de Daniel. Opera 100% en local con **Antigravity / Gemini** y scripts deterministas en Python.

- **Arquitectura vigente:** Programa **`M5-5D-v1.0`** en **Cola Rodante Asíncrona (`A → B → C → D → E`)**: 3 días Nucleares (~50 min) + 2 días Satélites (~25 min), gobernado por el principio de **Sistema Vivo**, **Fisiología 40+ de Alto SFR** y **Periodización Estética por Ciclos (Regla 70/30)**.
- **Estado vivo (sin datos congelados):** Consulta siempre `python tools/operativo.py resumen`, [`outputs/operativo/MI_SISTEMA.html`](outputs/operativo/MI_SISTEMA.html) o `outputs/operativo/CONTEXTO_ENTRENADOR.json`.

## Comandos operativos rápidos

```powershell
python tools/operativo.py resumen                      # Corte actual, última sesión e inbox pendiente
python tools/operativo.py sesion [A|B|C|D|E]           # Borrador Note v1 + Protocolo de calentamiento
python tools/operativo.py ejercicio <ID|nombre>        # Ficha biomecánica y variantes (ej. G04, RDL)
python tools/operativo.py actualizar                   # Importa data/inbox_app/ y regenera todo
python tools/operativo.py regenerar                    # Regenera vistas HTML/XLSX y datos de clientes PWA
python tools/operativo.py sincronizar_app --desplegar  # Compila data/ hacia la PWA y despliega a Firebase
python tools/operativo.py respaldo                     # Crea ZIP verificado con manifiesto SHA-256
python tools/nutricion.py hoy                          # Estado nutricional diario y bolos anabólicos (40-50g)
```

## Mapa de autoridad (qué gobierna cada dominio)

| Dominio | Fuente canónica editable | Vista derivada / Documentación |
|---|---|---|
| Reglas IA y Lazy Loading | [`AGENTS.md`](AGENTS.md) | [`docs/REGLAS_DEL_ENTRENADOR.md`](docs/REGLAS_DEL_ENTRENADOR.md) |
| Gobierno, ciclos 70/30 y estudios | [`data/estado_y_decisiones.json`](data/estado_y_decisiones.json) | [`docs/GOBIERNO_ENTRENAMIENTO_Y_CONOCIMIENTO.md`](docs/GOBIERNO_ENTRENAMIENTO_Y_CONOCIMIENTO.md), [`biblioteca/EMPEZAR_AQUI.md`](biblioteca/EMPEZAR_AQUI.md) |
| Evidencia aplicada y marco 40+ | [`data/actualizaciones_conocimiento.json`](data/actualizaciones_conocimiento.json) | [`docs/ESTUDIOS_Y_ADAPTACION_PERSONAL.md`](docs/ESTUDIOS_Y_ADAPTACION_PERSONAL.md) |
| Perfil, biometría y convenciones | [`docs/PERFIL_PERSONAL_UNIFICADO.md`](docs/PERFIL_PERSONAL_UNIFICADO.md), [`data/confirmaciones_usuario.json`](data/confirmaciones_usuario.json) | [`data/seguimiento.json`](data/seguimiento.json) |
| Programa activo (`M5-5D-v1.0`) | [`data/programa.json`](data/programa.json) | [`docs/PROGRAMA_ACTIVO.md`](docs/PROGRAMA_ACTIVO.md) |
| Fichas biomecánicas y variantes | [`data/indicaciones_tecnicas.json`](data/indicaciones_tecnicas.json) | [`docs/FORMATO_SESION_ENTRENADOR_APP.md`](docs/FORMATO_SESION_ENTRENADOR_APP.md), [`docs/GUIA_GRAFICA_EJERCICIOS.md`](docs/GUIA_GRAFICA_EJERCICIOS.md) |
| Historial ejecutado y calidad | [`data/registro.json`](data/registro.json), [`data/conflictos_fuentes.json`](data/conflictos_fuentes.json) | [`docs/CALIDAD_Y_PENDIENTES.md`](docs/CALIDAD_Y_PENDIENTES.md), [`docs/GUIA_APP.md`](docs/GUIA_APP.md) |
| Estaciones y taxonomía | [`data/maquinas.json`](data/maquinas.json), [`data/catalogos.json`](data/catalogos.json) | [`data/modelo_operativo.json`](data/modelo_operativo.json) |
| Nutrición y bolos proteicos | [`data/nutricion.json`](data/nutricion.json), [`data/alimentos_base.json`](data/alimentos_base.json) | `python tools/nutricion.py hoy` / `semana` |

## Qué NO tocar a mano
- **Evidencia inmutable:** `data/originales_app/`, `data/fuentes/` y `biblioteca/corpus/`.
- **Vistas regenerables:** No edites `.xlsx`, `MI_SISTEMA.html`, `CONTEXTO_ENTRENADOR.json` ni `docs/PROGRAMA_ACTIVO.md` como formularios maestros; se sobrescriben al ejecutar `regenerar`.
- **Historial puente retirado:** Los antiguos manuales de ChatGPT/Codex y M4-3D están archivados con manifiesto SHA-256 en `data/backups/historico_chatgpt_20261031/`.
