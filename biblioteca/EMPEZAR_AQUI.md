# Biblioteca unificada DAME CAÑA

**Versión 1.3 — 31/10/2026.** Base documental de evidencia científica y antecedentes del sistema. Esta biblioteca informa decisiones, pero **nunca sustituye ni modifica por sí sola** el programa vigente (`data/programa.json`) ni el historial (`data/registro.json`).

## Qué abrir

| Lo que necesitas | Abrir |
|---|---|
| Consultar qué gobierna tu entrenamiento hoy | [Sistema operativo local (`README.md`)](../README.md) y [`AGENTS.md`](../AGENTS.md) |
| Marco fisiológico 40+ y evidencia aplicada | [`docs/ESTUDIOS_Y_ADAPTACION_PERSONAL.md`](../docs/ESTUDIOS_Y_ADAPTACION_PERSONAL.md) |
| Entender o buscar investigación histórica | [Corpus básico](CORPUS_BASICO.md) |
| Consultar las ocho referencias contrastadas | [Contraste bibliográfico](CONTRASTE_BIBLIOGRAFICO_2026-10-10.md) |
| Ver propuestas y complementos documentados | [Complementos](COMPLEMENTOS.md) y [Lógica de decisiones](LOGICA_DECISIONES.md) |
| Incorporar o revisar estudios nuevos por CLI | `python tools/conocimiento.py` ([Gobierno](../docs/GOBIERNO_ENTRENAMIENTO_Y_CONOCIMIENTO.md)) |
| Comprobar procedencia de archivos del corpus | [Procedencia del corpus](control/PROCEDENCIA_CORPUS.csv) y [Revisión Drive 10/10](REVISION_DRIVE_2026-10-10.md) |
| Copia espejo histórica en Google Drive | [Carpeta espejo](https://drive.google.com/drive/folders/15U4eC8QLB_1Xo5vzCVoSAMANvxvvB-3l) |

## Regla de autoridad

**Corpus = antecedente documental inmutable. Complemento propuesto = candidato. Decisión activa (`data/estado_y_decisiones.json`) + `data/programa.json` = prescripción vigente.**

Las propuestas antiguas del corpus (incluyendo diseños previos de 3 o 4 días) no se suman a la rutina activa `M5-5D-v1.0`. Toda incorporación científica nueva requiere contraste explícito y decisión fechada antes de alterar variables de entrenamiento.

## Estado de preservación del corpus

- Corpus original: 42 documentos conservados íntegros sin reescritura (`corpus/`) y 72 copias únicas por hash de las 81 rutas de procedencia históricas (`fuentes/`).
- Índice bibliográfico: 109 claves enlazando 142 fichas, con contraste específico documentado en `CONTRASTE_BIBLIOGRAFICO_2026-10-10.md`.
