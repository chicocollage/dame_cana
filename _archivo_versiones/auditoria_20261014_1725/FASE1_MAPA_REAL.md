# FASE 1 — MAPA REAL DEL SISTEMA DAME CAÑA
**Fecha de auditoría:** 14 de octubre de 2026 · 17:35 CEST  
**Entorno:** Local Antigravity (Windows, PowerShell, Python 3.12, Node.js)  
**Coordinador de Auditoría:** Antigravity / Gemini  

---

## 1. Topología del Sistema: Componentes y Fuentes

El sistema **DAME CAÑA** es una infraestructura híbrida diseñada para planificar, registrar y analizar el entrenamiento de fuerza y desarrollo biomecánico de Daniel. Opera bajo el principio rector de **autoridad local**, donde el almacenamiento local en disco es la única fuente de verdad para el entrenador/asistente, y Google Drive actúa únicamente como canal de recepción remota y copia de respaldo pasiva.

```mermaid
flowchart TD
    subgraph Captura["1. Captura en el Gimnasio"]
        App["PWA 'DCLog' (Mobile / Browser)\n[React / Next / TypeScript]"]
        Export["Exportación manual de sesión\n`training_log.v1` (JSON)"]
        App --> Export
    end

    subgraph Transferencia["2. Transferencia Manual"]
        Export -->|Daniel copia archivo| Inbox["`data/inbox_app/`\nDirectorio de entrada"]
        Export -.->|Drive Sync opcional| DriveIn["Google Drive (Recepción)"]
    end

    subgraph Procesamiento["3. Procesamiento Local"]
        Inbox --> Importador["`tools/registro_local.py`\nValidación, deduplicación y hashing"]
        Importador --> Registro["`data/registro.json`\nFuente Canónica de Registro (29 ses, 421 series)"]
        Importador --> Originales["`data/originales_app/`\nArchivado inmutable con SHA-256"]
        Importador --> Backups["`data/backups/`\nSnapshots automáticos JSON"]
        
        Cron["`tools/revision_diaria.py`\n(Programado 09:00 o vía CLI)"] --> Importador
    end

    subgraph FuentesMaestras["4. Fuentes Canónicas Maestras"]
        Programa["`data/programa.json`\nPrescripción activa M5-5D-v1.0 (24 slots)"]
        Maquinas["`data/maquinas.json`\nEstaciones, geometría y calibración"]
        Indicaciones["`data/indicaciones_tecnicas.json`\n55 ejercicios, variantes y justificaciones"]
        Catalogos["`data/catalogos.json`\nMatriz de 55 ejercicios base"]
        Decisiones["`data/estado_y_decisiones.json`\nDecisiones fechadas y estado dinámico"]
        Perfil["`docs/PERFIL_PERSONAL_UNIFICADO.md`\nObjetivos, historial y restricciones"]
        Confirmaciones["`data/confirmaciones_usuario.json`\nAclaraciones directas de Daniel"]
        Biblioteca["`biblioteca/`\nCorpus de 42 fuentes científicas y complementos"]
    end

    subgraph Generacion["5. Proyección y Vistas"]
        Registro & Programa & Maquinas & Indicaciones --> Orquestador["`tools/operativo.py` / `operativo_chatgpt.py`"]
        Orquestador --> Contexto["`outputs/operativo/CONTEXTO_ENTRENADOR.json`"]
        Orquestador --> MiSistema["`outputs/operativo/MI_SISTEMA.html`\nVista web humana"]
        Orquestador --> ExcelOp["`outputs/operativo/DAME_CANA_OPERATIVO_LOCAL.xlsx`"]
        Orquestador --> ExcelReg["`outputs/01a0ee94.../DAME_CANA_REGISTRO_LOCAL.xlsx`\n(Hoja derivada con UUID)"]
        Orquestador --> Hub["`hub/` (DC Studio Companion)\nBento UI / Gráficos locales"]
    end

    subgraph Respaldo["6. Respaldo y Recuperación"]
        Orquestador --> ZipBackup["`outputs/operativo/RESPALDO_OPERATIVO_LOCAL.zip`\nEmpaquetado nativo SHA-256"]
        ZipBackup -.->|Copia pasiva| DriveBackup["Google Drive (Respaldo)"]
    end
```

---

## 2. Inventario Estructurado de Fuentes y Componentes

### 2.1. Fuentes Maestras (Datos Estructurados Canónicos)
| Archivo | Formato / Esquema | Propósito | Estado Observado (14/10/2026) |
| :--- | :--- | :--- | :--- |
| `data/registro.json` | `dame_cana_registro.v1` | Registro histórico inmutable de sesiones y series ejecutadas. | **29 sesiones, 421 series** (363 con repeticiones positivas). Actualizado hoy 14/10 a las 15:54 con sesión `mv83bq2i-em72t9` (Día B). |
| `data/programa.json` | `dame_cana_programa.v1` | Prescripción activa del microciclo. | **Versión M5-5D-v1.0** (5 días: A, B, C, D, E; 24 slots). Actualizado hoy 14/10 por decisión `D-2026-10-14-ROTLOG-5D`. |
| `data/maquinas.json` | `dame_cana_maquinas.v1` | Inventario de estaciones, ajustes, geometría y fotos. | 22 KB. Define identidades (`GYM-SQUAT-HACK-01`, etc.). Sin embargo, ninguna serie histórica enlaza a estos IDs. |
| `data/indicaciones_tecnicas.json` | `dame_cana_indicaciones_tecnicas.v1` | Fichas técnicas, variantes angulares y justificación biomecánica. | 94 KB. Cubre los 55 ejercicios del catálogo y mapea los 24 slots del programa M5-5D. |
| `data/catalogos.json` | JSON derivado de Excel Drive | Matriz de selección de 55 ejercicios, taxonomía y candidatos. | 144 KB. Fecha 29/09/2026. Claves de ejercicio `G01`, `S02`, etc. Desconectado de los IDs `E001` de `programa.json`. |
| `data/estado_y_decisiones.json` | `dame_cana_contexto.v1` | Registro fechado de decisiones operativas y estado histórico. | Contiene 2 decisiones recientes de octubre (D-2026-10-14-ROTLOG-5D) y estados de salud fechados en agosto de 2026. |
| `data/confirmaciones_usuario.json` | `dame_cana_confirmaciones.v1` | Registro puntual de respuestas directas de Daniel a dudas del sistema. | Resuelve discrepancias de fechas, sumas de discos y RIR. Prevalece sobre valores ambiguos. |
| `data/conflictos_fuentes.json` | `dame_cana_conflictos_fuentes.v1` | Registro formal de discrepancias detectadas entre fuentes. | 4 conflictos registrados; todos marcados como resueltos o archivados. |
| `data/actualizaciones_conocimiento.json`| `dame_cana_actualizaciones_conocimiento.v1` | Libro mayor (*ledger*) de estudios científicos incorporados. | Contiene el esquema y registros de estudios incorporados vía `tools/conocimiento.py`. |

### 2.2. Directorios de Transferencia y Preservación
- `data/inbox_app/`: Bandeja de entrada donde Daniel deposita manualmente los JSON exportados por la app móvil. Actualmente contiene 4 archivos (los 4 ya están incorporados en `registro.json` como duplicados exactos).
- `data/originales_app/`: Almacén inmutable donde cada JSON importado se archiva renombrado con un sufijo de 12 caracteres de su SHA-256 (`stem__hash.json`). Contiene 24 archivos originales.
- `data/fuentes/`: Libros XLSX originales de la migración inicial del 29/09/2026 y manifiesto SHA-256 (`manifest.json`).
- `data/backups/`: Copias de seguridad atómicas generadas antes de cada mutación de `registro.json` o del conocimiento.

### 2.3. Herramientas y Scripts (`tools/`)
- `tools/operativo.py`: Orquestador principal CLI (comandos: `resumen`, `sesion [DIA]`, `ejercicio [ID]`, `actualizar`, `regenerar`, `respaldo`).
- `tools/registro_local.py`: Motor de validación de esquemas, deduplicación de series, normalización e importación atómica.
- `tools/revision_diaria.py`: Script de comprobación diaria (09:00) de `data/inbox_app/` y sincronización con la hoja Excel local.
- `tools/generar_hojas.py`: Generador autónomo en Python (`openpyxl`) de los libros `.xlsx` (sustituyó dependencias huérfanas de Node.js).
- `tools/operativo_chatgpt.py`: Generador de contextos compactos JSON y vistas HTML (`MI_SISTEMA.html`) para sincronización multi-agente.
- `tools/conocimiento.py`: Herramienta CLI para incorporar estudios científicos con verificación SHA-256 e inspección sin alterar el programa.
- `tools/actualizar_programa_5d.py`: Script puntual de migración que actualizó `data/programa.json` al split 5D.

### 2.4. Salidas y Vistas Derivadas (`outputs/`)
- `outputs/operativo/MI_SISTEMA.html`: Vista web autocontenida de consulta con tablas expandibles.
- `outputs/operativo/DAME_CANA_OPERATIVO_LOCAL.xlsx`: Libro Excel operativo con 9 pestañas avanzadas.
- `outputs/operativo/CONTEXTO_ENTRENADOR.json`: Snapshot estructurado de contexto para asistentes LLM.
- `outputs/operativo/RESPALDO_OPERATIVO_LOCAL.zip`: Archivo ZIP generado nativamente con manifiesto SHA-256.
- `outputs/01a0ee94-3218-7bc2-860f-bda74883553e/DAME_CANA_REGISTRO_LOCAL.xlsx`: Hoja Excel derivada del registro histórico, ubicada en una carpeta con UUID residual.

---

## 3. Funcionamiento Documentado frente al Observado

| Proceso / Dimensión | Lo que dice la Documentación (`README`, `AGENTS`, `docs/`) | Lo Observado Empíricamente en el Código y Datos | Discrepancia Crítica |
| :--- | :--- | :--- | :--- |
| **Programa de Entrenamiento** | `README.md` y `PROJECT_CONTEXT.md` indican: *"Programa activo: M4-3D-v2.0, 21 posiciones en días A, B y C"*. | `data/programa.json`, `docs/PROGRAMA_ACTIVO.md` e `INFORME_SINCRONIZACION_CHATGPT.md` reflejan **M5-5D-v1.0** (5 días A-E, 24 slots). | **Contradicción documental severa.** El sistema mutó a 5 días hoy 14/10 pero la documentación principal del repositorio quedó desfasada en 3 días. |
| **Volumen de Datos Históricos** | `README.md` declara: *"27 sesiones y 390 filas de series (335 con reps)"*. | `data/registro.json` contiene **29 sesiones y 421 series** (363 con reps). | El texto del README no se actualizó tras la importación de las sesiones del 13/10 (Día C) y 14/10 (Día B). |
| **Importación de Días D y E** | Se documenta compatibilidad con la cola rodante 5D (`A -> B -> C -> D -> E -> A`). | `tools/registro_local.py` línea 89 usa la expresión regular: `r"^D[ií]a\s+([ABC])"`. | **Defecto bloqueante:** Al importar un JSON cuyo título sea `Día D` o `Día E`, el campo `dia` se evalúa como `None`. |
| **Generación de Programa Markdown** | `tools/generar_programa.py` se describe como el generador de la vista legible `docs/PROGRAMA_ACTIVO.md`. | Línea 31 itera explícitamente sobre `for day in ("A", "B", "C"):`. | Si se ejecuta `generar_programa.py`, sobrescribiría `docs/PROGRAMA_ACTIVO.md` **borrando los días D y E**. |
| **Trazabilidad de Máquinas** | Se enfatiza que *"ninguna serie histórica tiene un grupo de comparabilidad validado; exigir identidad de máquina"*. | **0 de 421 series** (0.0%) en `data/registro.json` tienen `machine_id` o `comparability_group`. | La app PWA jamás ha emitido `machine_id`. Toda la sofisticación de `data/maquinas.json` está desconectada de la captura real. |
| **Limpieza de Inbox** | Se documenta que Daniel guarda el JSON en `inbox_app` y el sistema lo procesa a las 09:00. | `tools/revision_diaria.py` jamás mueve ni borra los archivos procesados de `data/inbox_app/`. | Los 4 archivos siguen acumulados en `inbox_app/`. En cada ejecución diaria se reprueban y emiten `duplicado_igual`. |
| **Bloqueo de Hoja Excel por SHA** | Se documenta que la revisión diaria mantiene actualizada `DAME_CANA_REGISTRO_LOCAL.xlsx`. | Si la hoja Excel cambia su SHA externamente, `revision_diaria.py` se bloquea indefinidamente y **deja de actualizar el Excel**. | `estado_revision_diaria.json` tiene registrada la incidencia bloqueante `979f7e08...` por desajuste de SHA. |
| **Ruta de la Hoja de Registro** | La documentación referencia la hoja local en `outputs/01a0ee94-3218-7bc2-860f-bda74883553e/`. | `generar_hojas.py` y `revision_diaria.py` tienen hardcodeado ese UUID específico en su código fuente. | Fricción cognitiva: Daniel y los agentes tienen que navegar por una carpeta de 36 caracteres en vez de `outputs/registro/`. |
| **Alcance del Respaldo ZIP** | `operativo.py respaldo` promete respaldar el sistema local de forma autónoma. | `MANIFIESTO_RESPALDO.json` y el ZIP excluyen la app PWA (`pwa/`), dependencias y `DAME_CANA_REGISTRO_LOCAL.xlsx`. | Si Daniel pierde el directorio local, **pierde todo el código fuente de la app PWA y su suite de 133 tests**. |

---

## 4. Mapa de Accesos: Disponibles frente a Ausentes

### Accesos Disponibles
1. **Acceso directo al Sistema de Archivos local:** Lectura y ejecución nativa en Windows/PowerShell de todos los directorios del proyecto (`data/`, `docs/`, `tools/`, `outputs/`, `pwa/`, `hub/`, `biblioteca/`).
2. **Entorno de Ejecución:** Python 3.12 con bibliotecas estándar (`hashlib`, `json`, `argparse`, `shutil`, `re`) y `openpyxl`. Node.js y npm en el subdirectorio `pwa/`.
3. **Capacidad de Subagentes:** Delegación concurrente de subagentes con roles especializados en modo de solo lectura.
4. **Artefactos Locales:** Creación de informes y registros en carpetas aisladas de auditoría.

### Accesos Ausentes / Limitaciones de Entorno
1. **Control de Versiones Git Inexistente en Raíz:** El directorio raíz `c:\Users\Daniel\Workspace\_Experiments\DAME_CANA-gemini` **NO es un repositorio git**. No existe historial de commits, branches, ni mecanismo de `git diff` o `git rollback` nativo para los datos maestros.
2. **Acceso a Google Drive:** No hay conexión activa de API a Google Drive ni credenciales de servicio. El acceso a Drive es puramente documental y pasivo.
3. **Acceso a Hosting / Firebase:** El despliegue de la PWA en Firebase Hosting es gestionado externamente por herramientas CLI autenticadas; no hay credenciales directas en esta sesión para verificar el estado de producción en la nube.
4. **Captura Directa desde el Dispositivo Móvil:** No existe un túnel de sincronización de datos automático entre el teléfono de Daniel y el PC. La transferencia depende al 100% de la acción humana de exportar y copiar el JSON.
