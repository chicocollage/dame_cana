package com.damecana.app.domain

import java.text.Normalizer
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class CatalogExercise(
    val id: String,
    val name: String,
    val group: String,
    val sourceLoadBasis: String = "total_kg",
    val resistanceMode: String = "external",
    val variant: String = "",
    val settings: String = "",
    val loadBasis: String = "total_kg",
    val swapGroup: String = "",
    val aliases: List<String> = emptyList(),
    val active: Boolean = true
)

@Serializable
data class CatalogRoot(
    val groups: List<String> = emptyList(),
    val exercises: List<CatalogExercise> = emptyList()
)

@Serializable
data class DaySlot(
    val slotId: String,
    val catalogId: String,
    val sets: Int,
    val repsMin: Int,
    val repsMax: Int,
    val targetRir: String = "1–2",
    val rest: String = "90–150 s",
    val cue: String = "",
    val perSide: Boolean = false,
    val recommendedAlternativeIds: List<String> = emptyList()
)

@Serializable
data class DayTemplate(
    val id: String,
    val title: String,
    val revision: Int = 3,
    val exercises: List<DaySlot> = emptyList()
)

@Serializable
data class TechnicalBase(
    val estado: String = "",
    val configuracion: String = "",
    val objetivo: String = ""
)

@Serializable
data class TechnicalVariant(
    val id: String = "",
    val cambio: String = "",
    @SerialName("sensacion_buscada") val sensacionBuscada: String = "",
    val configuracion: String = "",
    val objetivo: String = ""
)

@Serializable
data class TechnicalScience(
    @SerialName("justificacion_biomecanica") val justificacionBiomecanica: String = "",
    val fuentes: List<String> = emptyList()
)

@Serializable
data class TechnicalRecord(
    val id: String = "",
    val nombre: String = "",
    @SerialName("region_principal") val regionPrincipal: String = "",
    val base: TechnicalBase = TechnicalBase(),
    val variantes: List<TechnicalVariant> = emptyList(),
    @SerialName("respaldo_cientifico") val respaldoCientifico: TechnicalScience? = null
)

@Serializable
data class TechnicalDataRoot(
    val schema: String = "",
    val version: String = "",
    @SerialName("fecha_actualizacion") val fechaActualizacion: String = "",
    @SerialName("total_ejercicios") val totalEjercicios: Int = 0,
    @SerialName("mapeo_slots_programa") val mapeoSlotsPrograma: Map<String, String> = emptyMap(),
    val ejercicios: Map<String, TechnicalRecord> = emptyMap()
)

object TechnicalTools {
    private val technicalIds = listOf(
        "G01","G02","G03","G04","G05","G06","G07","G08","G09","G10","G11","G12","G13","G14","G15","G16","G17","G18",
        "S01","S02","S03","S04","S05","S06","S07",
        "B01","B02","B03","B04","B05","B06","B07","B08","B09",
        "C01","C02","C03","C04","C05","C06","C07",
        "A01","A02","A03","A04","A05",
        "L01","L02","L03","L04","L05","L06",
        "T01","T02","T03","B10"
    )

    val catalogMap: Map<String, String> = buildMap {
        technicalIds.forEachIndexed { index, id ->
            put("E%03d".format(index + 1), id)
        }
        putAll(
            mapOf(
                "E057" to "A06", "E058" to "G19", "E059" to "G20", "E060" to "S08",
                "E061" to "C05", "E062" to "C02", "E063" to "C05", "E064" to "C05", "E065" to "C05", "E066" to "C05", "E067" to "C07", "E068" to "C07",
                "E069" to "B02", "E070" to "B02", "E071" to "B01", "E072" to "B01", "E073" to "B06", "E074" to "B09", "E075" to "B07", "E076" to "S01", "E077" to "S05",
                "E078" to "S07", "E079" to "S07", "E080" to "S07", "E081" to "S03", "E082" to "S02", "E083" to "S04", "E084" to "S07",
                "E085" to "A01", "E086" to "A01", "E087" to "A02", "E088" to "A02", "E089" to "A03", "E090" to "A03", "E091" to "A04", "E092" to "A03",
                "E093" to "G06", "E094" to "G06", "E095" to "G06", "E096" to "L01", "E097" to "G10", "E098" to "G08", "E099" to "G07", "E100" to "G04",
                "E101" to "G11", "E102" to "G11", "E103" to "G12", "E104" to "G12", "E105" to "G03", "E106" to "G01", "E107" to "L03", "E108" to "G11", "E109" to "G15",
                "E110" to "T02", "E111" to "T02", "E112" to "T03", "E113" to "B10", "E114" to "L04", "E115" to "L04"
            )
        )
    }

    private val aliases = mapOf(
        "hip thrust en maquina discos" to "G01", "hip thrust en maquina" to "G01", "hip thrust maquina" to "G01",
        "hip thrust en smith" to "G02", "hip thrust smith" to "G02", "hip thrust con barra" to "G03",
        "sentadilla hack matrix profunda" to "G04", "sentadilla hack matrix" to "G04", "hack squat profunda" to "G04", "hack squat" to "G04",
        "sentadilla pendular profunda" to "G05", "sentadilla profunda en smith" to "G06", "prensa profunda" to "G07",
        "sentadilla bulgara en smith" to "G08", "sentadilla bulgara" to "G08", "bulgarian split squat en smith" to "G08", "bulgarian split squat" to "G08", "bulgarian con mancuernas" to "G09",
        "zancada inversa en smith" to "G10",
        "peso muerto rumano en smith rdl" to "G11", "peso muerto rumano en smith" to "G11", "peso muerto rumano rdl" to "G11", "rdl smith" to "G11",
        "peso muerto rumano con mancuernas" to "G12", "hiperextension a 45 sesgada a gluteo" to "G13", "hiperextension 45 unilateral" to "G13",
        "extension de cadera en cable" to "G14", "rear kick" to "G14",
        "abduccion sentada en maquina vaciado metabolico" to "G15", "abduccion sentada en maquina" to "G15", "abduccion sentada" to "G15", "abduccion de cadera en maquina" to "G15",
        "abduccion unilateral en cable" to "G16", "abduccion cable" to "G16",
        "power squat leverage power squat" to "G17", "v squat lever v squat" to "G18",
        "jalon medio o neutro" to "B01", "jalon medio neutro" to "B01", "jalon neutro" to "B01",
        "dominada neutra asistida" to "B02", "jalon unilateral en cable" to "B03", "pullover en maquina" to "B04",
        "pullover en polea alta con brazos rectos" to "B05", "pullover en polea con brazos rectos" to "B05", "pullover en polea" to "B05",
        "remo con pecho apoyado banco o maquina" to "B06", "remo con pecho apoyado" to "B06", "low row" to "B06",
        "remo t bar con pecho apoyado" to "B07", "remo sentado en cable" to "B08", "remo unilateral en cable con apoyo" to "B09",
        "press convergente inclinado moderado" to "C01", "press inclinado en maquina" to "C01",
        "press inclinado en smith" to "C02", "press inclinado con mancuernas" to "C03",
        "press horizontal convergente maquina" to "C04", "press horizontal en maquina sentado" to "C04",
        "press plano en smith o con mancuernas" to "C05", "peck deck" to "C06", "apertura en cable" to "C07",
        "elevacion lateral en maquina" to "S01", "elevacion lateral unilateral en cable" to "S02", "elevacion lateral con mancuernas" to "S03",
        "peck deck inverso" to "S04", "apertura inversa en cable" to "S05", "remo posterior con pecho apoyado" to "S06", "press de hombro en maquina" to "S07",
        "extension de triceps overhead en cable katana" to "A01", "extension de triceps overhead en cable" to "A01", "triceps katana" to "A01",
        "extension de triceps en polea con cuerda" to "A02", "pressdown en cable" to "A02",
        "curl predicador en cable o maquina" to "A03", "curl predicador" to "A03",
        "curl bayesiano en cable" to "A04", "curl bayesiano" to "A04", "curl martillo" to "A05",
        "extension de rodilla en maquina" to "L01", "curl femoral sentado" to "L02", "curl femoral tumbado" to "L03",
        "elevacion de talones de pie en maquina" to "L04", "gemelo en prensa con rodilla extendida" to "L05", "elevacion de talones sentada" to "L06",
        "crunch en cable o maquina" to "T01", "reverse crunch controlado" to "T02", "reverse crunch" to "T02", "pallof press" to "T03",
        "forward lean shrug en smith" to "B10", "dual cable cross pushdown" to "A06",
        "kickback diagonal de gluteo en polea baja" to "G19", "cossack squat" to "G20"
    )

    fun clean(value: String?): String {
        val raw = (value ?: "")
            .replace(Regex("[\\u200B-\\u200D\\uFEFF]"), "")
            .replace(Regex("^[a-zA-Z0-9]{1,3}\\.\\s*"), "")
        return Normalizer.normalize(raw, Normalizer.Form.NFD)
            .replace(Regex("[\\u0300-\\u036f]"), "")
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), " ")
            .trim()
    }

    private fun heuristicMatch(name: String): String? {
        if (name.isEmpty()) return null
        if (name.contains("katana")) return "A01"
        if (name.contains("bayesiano")) return "A04"
        if (name.contains("predicador") || name.contains("scott") || name.contains("kinesiologico")) return "A03"
        if (name.contains("low row")) return "B06"
        if (name.contains("pullover")) return "B05"
        if (name.contains("rdl")) return "G11"
        if (name.contains("shrug") || name.contains("encogimiento") || name.contains("kelso")) return "B10"
        if (name.contains("bulgar")) return if (name.contains("mancuerna")) "G09" else "G08"
        if (name.contains("peck deck") && (name.contains("inverso") || name.contains("posterior"))) return "S04"
        if (name.contains("pallof")) return "T03"
        if (name.contains("reverse crunch")) return "T02"
        return null
    }

    fun find(
        exerciseName: String,
        catalogId: String? = null,
        slotId: String? = null,
        data: TechnicalDataRoot?,
        catalog: List<CatalogExercise> = emptyList()
    ): TechnicalRecord? {
        if (data == null || data.schema != "dame_cana_indicaciones_tecnicas.v1") return null
        val records = data.ejercicios
        val cleaned = clean(exerciseName)
        val identified = catalog.firstOrNull { it.id == catalogId && clean(it.name) == cleaned }
        val fromCatalog = catalog.firstOrNull { clean(it.name) == cleaned }
        val id = (identified?.let { catalogMap[it.id] })
            ?: aliases[cleaned]
            ?: heuristicMatch(cleaned)
            ?: (fromCatalog?.let { catalogMap[it.id] })

        if (id != null && records.containsKey(id)) return records[id]
        if (!slotId.isNullOrEmpty() && catalogId.isNullOrEmpty()) {
            val mappedId = data.mapeoSlotsPrograma[slotId]
            if (mappedId != null && records.containsKey(mappedId)) return records[mappedId]
        }
        val matches = records.values.filter { clean(it.nombre) == cleaned }
        return if (matches.size == 1) matches.first() else null
    }

    data class MuscleHologram(
        val key: String,
        val label: String,
        val code: String,
        val fileName: String,
        val originLabel: String = "ORIGEN ÓSEO",
        val insertionLabel: String = "INSERCIÓN",
        val actionSummary: String = "Tracción mecánica dirigida",
        val torqueProfile: String = "PICO EN ELONGACIÓN",
        val originAnchorX: Float = 0.62f,
        val originAnchorY: Float = 0.30f,
        val bellyAnchorX: Float = 0.52f,
        val bellyAnchorY: Float = 0.48f,
        val insertionAnchorX: Float = 0.40f,
        val insertionAnchorY: Float = 0.68f
    )

    private val HOLOGRAMS = mapOf(
        "pec_clavicular" to MuscleHologram(
            key = "pec_clavicular",
            label = "PEC // CLAVICULAR",
            code = "30°-45°",
            fileName = "01_pectoral_clavicular.webp",
            originLabel = "Clavícula (mitad medial anterior)",
            insertionLabel = "Labio lateral corredera bicipital humeral",
            actionSummary = "Flexión anterior y aducción horizontal del húmero",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.64f, originAnchorY = 0.22f,
            bellyAnchorX = 0.45f, bellyAnchorY = 0.32f,
            insertionAnchorX = 0.28f, insertionAnchorY = 0.46f
        ),
        "pec_esternal" to MuscleHologram(
            key = "pec_esternal",
            label = "PEC // ESTERNAL",
            code = "PLANO 0°",
            fileName = "02_pectoral_esternocostal.webp",
            originLabel = "Manubrio y cuerpo esternal (cartílagos 1-6)",
            insertionLabel = "Cresta del tubérculo mayor (húmero)",
            actionSummary = "Aducción horizontal pura en plano transversal",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.66f, originAnchorY = 0.35f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.26f, insertionAnchorY = 0.52f
        ),
        "pec_abdominal" to MuscleHologram(
            key = "pec_abdominal",
            label = "PEC // COSTAL INF",
            code = "DECL -30°",
            fileName = "03_pectoral_abdominal.webp",
            originLabel = "Vaina de los rectos y 6ª-7ª costillas",
            insertionLabel = "Labio lateral corredera bicipital humeral",
            actionSummary = "Aducción diagonal inferior y depresión humeral",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.62f, originAnchorY = 0.62f,
            bellyAnchorX = 0.46f, bellyAnchorY = 0.52f,
            insertionAnchorX = 0.30f, insertionAnchorY = 0.38f
        ),
        "dorsal_sup" to MuscleHologram(
            key = "dorsal_sup",
            label = "LAT // TORÁCICO",
            code = "TRACCIÓN",
            fileName = "04_dorsal_superiores_toracicas.webp",
            originLabel = "Espinosas T7-T12 y fascia toracolumbar",
            insertionLabel = "Fondo corredera bicipital (húmero)",
            actionSummary = "Extensión del hombro en plano escapular con aducción",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.50f, originAnchorY = 0.38f,
            bellyAnchorX = 0.40f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.26f, insertionAnchorY = 0.28f
        ),
        "dorsal_inf" to MuscleHologram(
            key = "dorsal_inf",
            label = "LAT // ILÍACO",
            code = "SAGITAL",
            fileName = "05_dorsal_inferiores_iliacas.webp",
            originLabel = "Cresta ilíaca posterosuperior (labio externo)",
            insertionLabel = "Fondo corredera bicipital humeral",
            actionSummary = "Extensión humeral sagital pura con tracción estricta",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.48f, originAnchorY = 0.68f,
            bellyAnchorX = 0.38f, bellyAnchorY = 0.52f,
            insertionAnchorX = 0.24f, insertionAnchorY = 0.30f
        ),
        "trapecio_sup" to MuscleHologram(
            key = "trapecio_sup",
            label = "TRAP // SUPERIOR",
            code = "ELEVACIÓN",
            fileName = "06_trapecio_superior.webp",
            originLabel = "Línea nucal superior occipital y C1-C7",
            insertionLabel = "Tercio lateral de clavícula posterior",
            actionSummary = "Elevación y rotación superior de la escápula",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.50f, originAnchorY = 0.20f,
            bellyAnchorX = 0.44f, bellyAnchorY = 0.32f,
            insertionAnchorX = 0.32f, insertionAnchorY = 0.44f
        ),
        "trapecio_medio" to MuscleHologram(
            key = "trapecio_medio",
            label = "ROMB // TRAP MED",
            code = "RETRACCIÓN",
            fileName = "07_trapecio_medio_romboides.webp",
            originLabel = "Espinosas C7-T3 (romboides C7-T5)",
            insertionLabel = "Borde medial espina de la escápula",
            actionSummary = "Retracción y aproximación escapular hacia línea media",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.50f, originAnchorY = 0.36f,
            bellyAnchorX = 0.42f, bellyAnchorY = 0.44f,
            insertionAnchorX = 0.30f, insertionAnchorY = 0.48f
        ),
        "trapecio_inf" to MuscleHologram(
            key = "trapecio_inf",
            label = "TRAP // INFERIOR",
            code = "DEPRESIÓN",
            fileName = "08_trapecio_inferior.webp",
            originLabel = "Espinosas T4-T12 torácicas",
            insertionLabel = "Tubérculo deltoideo espina escapular",
            actionSummary = "Depresión y báscula medial/superior escapular (Y-raise)",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.50f, originAnchorY = 0.65f,
            bellyAnchorX = 0.42f, bellyAnchorY = 0.50f,
            insertionAnchorX = 0.32f, insertionAnchorY = 0.38f
        ),
        "redondo_mayor" to MuscleHologram(
            key = "redondo_mayor",
            label = "TERES // MAYOR",
            code = "PULLOVER",
            fileName = "09_redondo_mayor.webp",
            originLabel = "Ángulo inferior escápula (cara posterior)",
            insertionLabel = "Cresta tubérculo menor humeral",
            actionSummary = "Aducción y rotación medial del brazo (sinergista dorsal)",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.38f, originAnchorY = 0.62f,
            bellyAnchorX = 0.46f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.60f, insertionAnchorY = 0.32f
        ),
        "deltoides_ant" to MuscleHologram(
            key = "deltoides_ant",
            label = "DELT // ANTERIOR",
            code = "FLEXIÓN",
            fileName = "10_deltoides_anterior.webp",
            originLabel = "Tercio lateral clavícula (borde anterior)",
            insertionLabel = "Tuberosidad deltoidea humeral (cara lateral)",
            actionSummary = "Flexión sagital y aducción horizontal humeral",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.48f, originAnchorY = 0.24f,
            bellyAnchorX = 0.42f, bellyAnchorY = 0.42f,
            insertionAnchorX = 0.38f, insertionAnchorY = 0.65f
        ),
        "deltoides_lat" to MuscleHologram(
            key = "deltoides_lat",
            label = "DELT // LATERAL",
            code = "ABD 90°",
            fileName = "11_deltoides_lateral.webp",
            originLabel = "Acromion escapular (borde lateral)",
            insertionLabel = "Tuberosidad deltoidea (cara lateral húmero)",
            actionSummary = "Abducción del hombro en plano escapular (30°-90°)",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.52f, originAnchorY = 0.25f,
            bellyAnchorX = 0.42f, bellyAnchorY = 0.44f,
            insertionAnchorX = 0.34f, insertionAnchorY = 0.68f
        ),
        "deltoides_post" to MuscleHologram(
            key = "deltoides_post",
            label = "DELT // POSTERIOR",
            code = "EXT HORIZ",
            fileName = "12_deltoides_posterior.webp",
            originLabel = "Espina de la escápula (labio inferior)",
            insertionLabel = "Tuberosidad deltoidea humeral",
            actionSummary = "Abducción horizontal pura y rotación externa del húmero",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.62f, originAnchorY = 0.32f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.32f, insertionAnchorY = 0.64f
        ),
        "biceps_larga" to MuscleHologram(
            key = "biceps_larga",
            label = "BÍCEPS // LARGA",
            code = "ELONGACIÓN",
            fileName = "13_biceps_cabeza_larga.webp",
            originLabel = "Tubérculo supraglenoideo (escápula)",
            insertionLabel = "Tuberosidad del radio y aponeurosis bicipital",
            actionSummary = "Flexión de codo y supinación con hombro en hiperextensión",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.34f, originAnchorY = 0.22f,
            bellyAnchorX = 0.46f, bellyAnchorY = 0.46f,
            insertionAnchorX = 0.58f, insertionAnchorY = 0.72f
        ),
        "biceps_corta" to MuscleHologram(
            key = "biceps_corta",
            label = "BÍCEPS // CORTA",
            code = "ACORTAM.",
            fileName = "14_biceps_cabeza_corta.webp",
            originLabel = "Vértice apófisis coracoides escapular",
            insertionLabel = "Tuberosidad bicipital del radio",
            actionSummary = "Flexión y supinación de codo en flexión anterior del hombro",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.38f, originAnchorY = 0.25f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.56f, insertionAnchorY = 0.70f
        ),
        "braquial" to MuscleHologram(
            key = "braquial",
            label = "BRAQUIAL // RADIAL",
            code = "NEUTRO",
            fileName = "15_braquial_braquiorradial.webp",
            originLabel = "Mitad distal cara anterior del húmero",
            insertionLabel = "Tuberosidad y apófisis coronoides cúbito",
            actionSummary = "Flexor de codo puro y monoarticular (agarre neutro/prono)",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.42f, originAnchorY = 0.34f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.52f,
            insertionAnchorX = 0.55f, insertionAnchorY = 0.72f
        ),
        "triceps_larga" to MuscleHologram(
            key = "triceps_larga",
            label = "TRÍCEPS // LARGA",
            code = "OVERHEAD",
            fileName = "16_triceps_cabeza_larga.webp",
            originLabel = "Tubérculo infraglenoideo escápula",
            insertionLabel = "Olécranon del cúbito (cara superior)",
            actionSummary = "Extensión del codo biarticular con hombro en elongación overhead",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.64f, originAnchorY = 0.24f,
            bellyAnchorX = 0.54f, bellyAnchorY = 0.42f,
            insertionAnchorX = 0.44f, insertionAnchorY = 0.68f
        ),
        "triceps_lat" to MuscleHologram(
            key = "triceps_lat",
            label = "TRÍCEPS // LAT-MED",
            code = "EXTENSIÓN",
            fileName = "17_triceps_lateral_medial.webp",
            originLabel = "Cara posterior húmero (surco radial)",
            insertionLabel = "Olécranon del cúbito (tendón común)",
            actionSummary = "Extensión monoarticular de codo contra máxima resistencia",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.44f, originAnchorY = 0.35f,
            bellyAnchorX = 0.46f, bellyAnchorY = 0.54f,
            insertionAnchorX = 0.50f, insertionAnchorY = 0.75f
        ),
        "gluteo_inf" to MuscleHologram(
            key = "gluteo_inf",
            label = "GLÚTEO // INFERIOR",
            code = "ELONGACIÓN",
            fileName = "18_gluteo_mayor_inferior.webp",
            originLabel = "Cara lateral sacro y cóccix (fascículo inferoposterior)",
            insertionLabel = "Tuberosidad glútea del fémur",
            actionSummary = "Extensión potente de cadera en flexión profunda (>90°)",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.24f, originAnchorY = 0.44f,
            bellyAnchorX = 0.32f, bellyAnchorY = 0.56f,
            insertionAnchorX = 0.46f, insertionAnchorY = 0.68f
        ),
        "gluteo_sup" to MuscleHologram(
            key = "gluteo_sup",
            label = "GLÚTEO // SUPERIOR",
            code = "ACORTAM.",
            fileName = "19_gluteo_mayor_superior.webp",
            originLabel = "Línea glútea posterior cresta ilíaca",
            insertionLabel = "Tracto iliotibial de fascia lata",
            actionSummary = "Extensión terminal de cadera y rotación externa en acortamiento",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.34f, originAnchorY = 0.24f,
            bellyAnchorX = 0.44f, bellyAnchorY = 0.38f,
            insertionAnchorX = 0.58f, insertionAnchorY = 0.55f
        ),
        "gluteo_medio" to MuscleHologram(
            key = "gluteo_medio",
            label = "GLÚTEO // MEDIO",
            code = "ABDUCCIÓN",
            fileName = "20_gluteo_medio_menor.webp",
            originLabel = "Cara glútea ilion (entre líneas ant/post)",
            insertionLabel = "Trocánter mayor (cara lateral)",
            actionSummary = "Abducción pura y estabilización pélvica en plano frontal",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.42f, originAnchorY = 0.28f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.40f,
            insertionAnchorX = 0.56f, insertionAnchorY = 0.58f
        ),
        "cuadriceps_vastos" to MuscleHologram(
            key = "cuadriceps_vastos",
            label = "CUÁDR // VASTOS",
            code = "FLEX ROD",
            fileName = "21_cuadriceps_vastos.webp",
            originLabel = "Línea áspera y labio lateral/medial fémur",
            insertionLabel = "Tuberosidad tibial vía tendón rotuliano",
            actionSummary = "Extensión de rodilla monoarticular con dorsiflexión/squat",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.42f, originAnchorY = 0.32f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.56f, insertionAnchorY = 0.72f
        ),
        "recto_femoral" to MuscleHologram(
            key = "recto_femoral",
            label = "RECTO // FEMORAL",
            code = "BIARTIC.",
            fileName = "22_recto_femoral.webp",
            originLabel = "Espina ilíaca anteroinferior (EIAI)",
            insertionLabel = "Base de rótula y tuberosidad tibial",
            actionSummary = "Extensión rodilla combinada con flexión anterior cadera",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.48f, originAnchorY = 0.22f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.46f,
            insertionAnchorX = 0.52f, insertionAnchorY = 0.76f
        ),
        "isquios_cadera" to MuscleHologram(
            key = "isquios_cadera",
            label = "ISQ // TENSIÓN MÁX",
            code = "30° ELONG",
            fileName = "23_isquios_cadera_semis_biceps_larga.webp",
            originLabel = "Tuberosidad isquiática coxal",
            insertionLabel = "Cóndilo medial tibia y cabeza del peroné",
            actionSummary = "Extensión potente de cadera con rodilla semiflexionada (RDL)",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.42f, originAnchorY = 0.26f,
            bellyAnchorX = 0.46f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.54f, insertionAnchorY = 0.75f
        ),
        "biceps_fem_corto" to MuscleHologram(
            key = "biceps_fem_corto",
            label = "BF // CABEZA CORTA",
            code = "FLEX ROD",
            fileName = "24_biceps_femoral_cabeza_corta.webp",
            originLabel = "Labio lateral línea áspera fémur",
            insertionLabel = "Cara lateral cabeza del peroné",
            actionSummary = "Flexor monoarticular de rodilla (curl femoral)",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.44f, originAnchorY = 0.42f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.54f,
            insertionAnchorX = 0.56f, insertionAnchorY = 0.74f
        ),
        "gastrocnemio" to MuscleHologram(
            key = "gastrocnemio",
            label = "GASTRO // GEMELOS",
            code = "RODILLA 0°",
            fileName = "25_gastrocnemio_gemelos.webp",
            originLabel = "Cóndilos femorales medial y lateral",
            insertionLabel = "Tuberosidad calcánea (tendón de Aquiles)",
            actionSummary = "Flexión plantar con rodilla en extensión completa (biarticular)",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.50f, originAnchorY = 0.26f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.44f,
            insertionAnchorX = 0.50f, insertionAnchorY = 0.78f
        ),
        "soleo" to MuscleHologram(
            key = "soleo",
            label = "SÓLEO // PROFUNDO",
            code = "RODILLA 90°",
            fileName = "26_soleo_profundo.webp",
            originLabel = "Línea del sóleo en tibia y peroné posterior",
            insertionLabel = "Tuberosidad calcánea (tendón de Aquiles)",
            actionSummary = "Flexión plantar monoarticular potente (aislado a rodilla 90°)",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.48f, originAnchorY = 0.38f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.52f,
            insertionAnchorX = 0.50f, insertionAnchorY = 0.78f
        ),
        "abs_sup" to MuscleHologram(
            key = "abs_sup",
            label = "RECTO // SUPERIOR",
            code = "CRUNCH",
            fileName = "27_recto_abdominal_superior.webp",
            originLabel = "5º-7º cartílagos costales y xifoides",
            insertionLabel = "Cresta del pubis y sínfisis púbica",
            actionSummary = "Flexión espinal torácica acortando distancia tórax-pelvis",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.50f, originAnchorY = 0.26f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.40f,
            insertionAnchorX = 0.50f, insertionAnchorY = 0.62f
        ),
        "abs_inf" to MuscleHologram(
            key = "abs_inf",
            label = "RECTO // INFERIOR",
            code = "RETROVERS.",
            fileName = "28_recto_abdominal_inferior.webp",
            originLabel = "Sínfisis púbica y cresta púbica",
            insertionLabel = "Cartílagos costales inferiores 5-7",
            actionSummary = "Retroversión pélvica activa en elevación de piernas colgado",
            torqueProfile = "PICO EN ELONGACIÓN",
            originAnchorX = 0.50f, originAnchorY = 0.68f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.54f,
            insertionAnchorX = 0.50f, insertionAnchorY = 0.32f
        ),
        "oblicuos" to MuscleHologram(
            key = "oblicuos",
            label = "OBLICUOS // CORE",
            code = "ANTI-ROT",
            fileName = "29_oblicuos_interno_externo.webp",
            originLabel = "Costillas 5ª-12ª y cresta ilíaca",
            insertionLabel = "Línea alba, pubis y sínfisis",
            actionSummary = "Flexión lateral, rotación torácica y antirotación del core",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.34f, originAnchorY = 0.34f,
            bellyAnchorX = 0.40f, bellyAnchorY = 0.48f,
            insertionAnchorX = 0.48f, insertionAnchorY = 0.64f
        ),
        "transverso" to MuscleHologram(
            key = "transverso",
            label = "TRANSVERSO // PROF",
            code = "VACUUM",
            fileName = "30_transverso_abdominal.webp",
            originLabel = "Fascia toracolumbar, cresta ilíaca y 7ª-12ª costillas",
            insertionLabel = "Línea alba y cresta del pubis",
            actionSummary = "Compresión visceral y aumento presión intraabdominal (bracing)",
            torqueProfile = "PICO EN ACORTAMIENTO",
            originAnchorX = 0.28f, originAnchorY = 0.48f,
            bellyAnchorX = 0.48f, bellyAnchorY = 0.50f,
            insertionAnchorX = 0.68f, insertionAnchorY = 0.48f
        )
    )

    fun resolveHologram(exerciseName: String): MuscleHologram {
        val c = clean(exerciseName)
        val key = when {
            c.contains("talones sentad") || c.contains("soleo") || c.contains("gemelo sentad") -> "soleo"
            c.contains("gemelo") || c.contains("talones") || c.contains("calf") || c.contains("burro") -> "gastrocnemio"
            c.contains("katana") || c.contains("triceps overhead") || c.contains("extension overhead") || c.contains("press frances") -> "triceps_larga"
            c.contains("pressdown") || c.contains("pushdown") || c.contains("triceps") || c.contains("fondos entre bancos") -> "triceps_lat"
            c.contains("martillo") || c.contains("hammer") || c.contains("braquial") -> "braquial"
            c.contains("bayesiano") || c.contains("bayesian") || c.contains("curl inclinado") -> "biceps_larga"
            c.contains("predicador") || c.contains("scott") || c.contains("concentracion") || c.contains("curl") -> "biceps_corta"
            c.contains("deltoide posterior") || c.contains("peck deck inverso") || c.contains("apertura inversa") || c.contains("remo posterior") || c.contains("pajaros") || c.contains("face pull") -> "deltoides_post"
            c.contains("elevacion lateral") || c.contains("elevaciones laterales") || c.contains("lateral polea") || c.contains("lateral cable") || c.contains("remo al menton") -> "deltoides_lat"
            c.contains("press militar") || c.contains("press de hombro") || c.contains("press arnold") || c.contains("elevacion frontal") || c.contains("ohp") -> "deltoides_ant"
            c.contains("rdl") || c.contains("rumano") || c.contains("buenos dias") || c.contains("peso muerto") -> "isquios_cadera"
            c.contains("femoral") || c.contains("nordic") || c.contains("nordico") || c.contains("isquio") -> "biceps_fem_corto"
            c.contains("abduccion") || c.contains("abductor") || c.contains("aduccion") || c.contains("cosaca") || c.contains("cossack") -> "gluteo_medio"
            c.contains("hip thrust") || c.contains("puente") || c.contains("glute bridge") || c.contains("frog") || c.contains("kickback") || c.contains("rear kick") || c.contains("hiperextension") || c.contains("extension de cadera") -> "gluteo_sup"
            c.contains("bulgar") || c.contains("zancada") || c.contains("lunge") || c.contains("step up") -> "gluteo_inf"
            c.contains("extension de rodilla") || c.contains("extension de pierna") || c.contains("sissy") -> "recto_femoral"
            c.contains("sentadilla") || c.contains("squat") || c.contains("hack") || c.contains("prensa") || c.contains("pendular") -> "cuadriceps_vastos"
            c.contains("pullover") || c.contains("brazos rectos") -> "redondo_mayor"
            c.contains("kelso") -> "trapecio_medio"
            c.contains("shrug") || c.contains("encogimiento") || c.contains("granjero") || c.contains("farmer") -> "trapecio_sup"
            c.contains("pecho apoyado") || c.contains("t bar") || c.contains("en punta") || c.contains("pendlay") || c.contains("remo con barra") -> "trapecio_medio"
            c.contains("gironda") || c.contains("remo sentado") || c.contains("remo unilateral") || c.contains("remo con mancuerna") || c.contains("jalon unilateral") -> "dorsal_inf"
            c.contains("jalon") || c.contains("dominada") || c.contains("pull up") || c.contains("chin up") || c.contains("remo") || c.contains("dorsal") -> "dorsal_sup"
            c.contains("inclinad") || c.contains("clavicul") || c.contains("abajo hacia arriba") -> "pec_clavicular"
            c.contains("declinad") || c.contains("fondos en paralelas") || c.contains("dips") || c.contains("arriba hacia abajo") -> "pec_abdominal"
            c.contains("press") || c.contains("pecho") || c.contains("banca") || c.contains("peck deck") || c.contains("apertura") || c.contains("flexiones") -> "pec_esternal"
            c.contains("pallof") || c.contains("oblicuo") -> "oblicuos"
            c.contains("plancha") || c.contains("plank") || c.contains("transverso") || c.contains("vacuum") -> "transverso"
            c.contains("reverse crunch") || c.contains("elevacion de piernas") || c.contains("rueda abdominal") -> "abs_inf"
            c.contains("crunch") || c.contains("abdom") -> "abs_sup"
            else -> "gluteo_inf"
        }
        return HOLOGRAMS[key] ?: HOLOGRAMS.getValue("gluteo_inf")
    }
}
