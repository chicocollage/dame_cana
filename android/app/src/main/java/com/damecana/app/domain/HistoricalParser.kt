package com.damecana.app.domain

import java.text.Normalizer
import java.time.LocalDate
import kotlin.math.max
import kotlinx.serialization.Serializable

@Serializable
data class ExerciseIdentity(
    var resistanceMode: String = "",
    var variant: String = "",
    var settings: String = "",
    var loadBasis: String = "unknown",
    var detected: Boolean = false
)

@Serializable
data class SetEntry(
    var load: String = "",
    var difficulty: String = "",
    var reps: String = "",
    var rir: String = ""
)

@Serializable
data class HistoricalExercise(
    val name: String,
    var sets: Int = 0,
    var repsMin: Int? = null,
    var repsMax: Int? = null,
    var perSide: Boolean = false,
    var targetRir: String = "",
    var rest: String = "",
    var cue: String = "",
    val identity: ExerciseIdentity = ExerciseIdentity(),
    var note: String = "",
    var entries: List<SetEntry> = emptyList()
)

@Serializable
data class HistoricalDraft(
    var title: String = "",
    var date: String = "",
    var finished: Boolean = true,
    val exercises: MutableList<HistoricalExercise> = mutableListOf()
)

@Serializable
data class HistoricalParseResult(
    val draft: HistoricalDraft?,
    val warnings: List<String>,
    val error: String
)

object HistoricalParser {

    private fun text(value: String?): String = (value ?: "").trim()

    private fun normalized(value: String?): String {
        val raw = text(value)
        return Normalizer.normalize(raw, Normalizer.Form.NFD)
            .replace(Regex("[\\u0300-\\u036f]"), "")
            .lowercase()
            .replace(Regex("\\s+"), " ")
    }

    private fun lineMessage(line: Int, message: String): String = "Línea $line: $message"

    private fun calendarDate(value: String?): String {
        val match = Regex("^(\\d{4})-(\\d{2})-(\\d{2})$").find(text(value)) ?: return ""
        val year = match.groupValues[1].toIntOrNull() ?: return ""
        val month = match.groupValues[2].toIntOrNull() ?: return ""
        val day = match.groupValues[3].toIntOrNull() ?: return ""
        return try {
            LocalDate.of(year, month, day)
            "${match.groupValues[1]}-${match.groupValues[2]}-${match.groupValues[3]}T12:00:00"
        } catch (_: Exception) {
            ""
        }
    }

    private fun parseMode(value: String?): String {
        return when (normalized(value)) {
            "external", "carga", "carga externa", "externa" -> "external"
            "trx" -> "trx"
            "bodyweight", "autocarga", "peso corporal" -> "bodyweight"
            else -> ""
        }
    }

    private fun parseLoadBasis(value: String?): String {
        return when (normalized(value).replace("_", " ")) {
            "", "unknown", "desconocida", "desconocido" -> "unknown"
            "total", "carga total", "total kg" -> "total_kg"
            "por lado", "carga por lado", "per side kg" -> "per_side_kg"
            "marcador", "marcador de maquina", "pila", "stack", "machine stack kg" -> "machine_stack_kg"
            "lastre", "lastre anadido", "carga anadida", "added kg" -> "added_kg"
            else -> ""
        }
    }

    private data class ObjectiveSpec(val sets: Int, val repsMin: Int, val repsMax: Int, val perSide: Boolean)

    private fun parseObjective(value: String?): ObjectiveSpec? {
        val match = Regex(
            "^(\\d+)\\s*(?:x|×)\\s*(\\d+)(?:\\s*[-–—a]\\s*(\\d+))?\\s*(?:reps?|repeticiones?)?\\s*(por\\s+lado)?$",
            RegexOption.IGNORE_CASE
        ).find(text(value)) ?: return null
        val sets = match.groupValues[1].toIntOrNull() ?: return null
        val repsMin = match.groupValues[2].toIntOrNull() ?: return null
        val repsMax = match.groupValues[3].takeIf { it.isNotEmpty() }?.toIntOrNull() ?: repsMin
        if (sets < 1 || sets > 20 || repsMin < 1 || repsMax < repsMin) return null
        return ObjectiveSpec(sets, repsMin, repsMax, match.groupValues[4].isNotEmpty())
    }

    private fun parseRir(value: String?): String {
        val match = Regex("^(\\d+(?:[.,]\\d+)?)(?:\\s*[-–—a]\\s*(\\d+(?:[.,]\\d+)?))?$", RegexOption.IGNORE_CASE)
            .find(text(value)) ?: return ""
        val first = match.groupValues[1].replace(",", ".")
        val second = match.groupValues[2].replace(",", ".")
        return if (second.isNotEmpty()) "$first–$second" else first
    }

    private fun parseNumber(value: String?, integerOnly: Boolean): String {
        val source = text(value).replace(Regex("\\s*kg$", RegexOption.IGNORE_CASE), "")
        val expr = if (integerOnly) Regex("^\\d+$") else Regex("^\\d+(?:[.,]\\d+)?$")
        if (!expr.matches(source)) return ""
        return source.replace(",", ".")
    }

    private class WorkingExercise(val ex: HistoricalExercise, val line: Int) {
        var basisLine: Int = 0
        var objectiveSets: Int = 0
        val series = linkedMapOf<Int, Pair<SetEntry, Int>>()
        val seen = mutableSetOf<String>()
    }

    fun parseHistoricalWorkout(source: String?): HistoricalParseResult {
        val input = (source ?: "").replace("\r", "")
        val warnings = mutableListOf<String>()
        val errors = mutableListOf<String>()
        val draft = HistoricalDraft()
        var current: WorkingExercise? = null
        var seenDate = false
        var seenTitle = false
        var seenFinished = false

        fun finalizeExercise() {
            val work = current ?: return
            val ex = work.ex
            if (work.series.isEmpty()) {
                errors.add(lineMessage(work.line, "el ejercicio «${ex.name}» no contiene ninguna serie."))
            }
            val seriesNumbers = work.series.keys.toList()
            val highestSeries = seriesNumbers.maxOrNull() ?: 0
            val totalSets = max(work.objectiveSets, highestSeries)
            ex.sets = totalSets
            ex.entries = (1..totalSets).map { idx ->
                work.series[idx]?.first ?: SetEntry()
            }

            if (work.objectiveSets > 0 && seriesNumbers.size < work.objectiveSets) {
                warnings.add(lineMessage(work.line, "registro parcial: hay ${seriesNumbers.size} de ${work.objectiveSets} series indicadas."))
            }
            if (work.objectiveSets > 0 && highestSeries > work.objectiveSets) {
                warnings.add(lineMessage(work.line, "hay series por encima de las ${work.objectiveSets} previstas; se conservan todas."))
            }
            for (idx in 1..highestSeries) {
                if (!work.series.containsKey(idx)) {
                    warnings.add(lineMessage(work.line, "falta la Serie $idx; se conserva vacía."))
                }
            }

            val hasLoad = work.series.values.any { it.first.load.isNotEmpty() }
            val hasDifficulty = work.series.values.any { it.first.difficulty.isNotEmpty() }
            if (ex.identity.resistanceMode.isEmpty()) {
                when {
                    hasDifficulty -> errors.add(lineMessage(work.line, "el ejercicio «${ex.name}» usa dificultad pero no indica si el modo es TRX o autocarga."))
                    hasLoad -> {
                        ex.identity.resistanceMode = "external"
                        warnings.add(lineMessage(work.line, "Modo ausente en «${ex.name}»; la carga explícita permite proponer carga externa para revisión."))
                    }
                    else -> errors.add(lineMessage(work.line, "Modo ausente en «${ex.name}»; indica carga externa, TRX o autocarga."))
                }
            }
            if (ex.identity.resistanceMode == "external" && hasDifficulty) {
                val rec = work.series.values.first { it.first.difficulty.isNotEmpty() }
                errors.add(lineMessage(rec.second, "dificultad no es compatible con el modo carga externa."))
            }
            if (ex.identity.resistanceMode in listOf("trx", "bodyweight") && hasLoad) {
                val rec = work.series.values.first { it.first.load.isNotEmpty() }
                val modeName = if (ex.identity.resistanceMode == "trx") "TRX" else "autocarga"
                errors.add(lineMessage(rec.second, "carga no es compatible con el modo $modeName; usa dificultad."))
            }
            if (ex.identity.resistanceMode != "external" && ex.identity.loadBasis != "unknown") {
                errors.add(lineMessage(if (work.basisLine > 0) work.basisLine else work.line, "Base de carga solo es compatible con carga externa."))
            }

            draft.exercises.add(ex)
            current = null
        }

        fun setExerciseField(work: WorkingExercise, field: String, value: String, line: Int) {
            if (work.seen.contains(field)) {
                errors.add(lineMessage(line, "el campo $field está repetido en este ejercicio."))
                return
            }
            work.seen.add(field)
            if (text(value).isEmpty()) {
                errors.add(lineMessage(line, "el campo $field está vacío."))
                return
            }
            val ex = work.ex
            when (field) {
                "Modo" -> {
                    val mode = parseMode(value)
                    if (mode.isEmpty()) errors.add(lineMessage(line, "Modo no reconocido: «${text(value)}». Usa carga externa, TRX o autocarga."))
                    ex.identity.resistanceMode = mode
                }
                "Variante" -> ex.identity.variant = text(value)
                "Ajustes" -> ex.identity.settings = text(value)
                "Base de carga" -> {
                    val basis = parseLoadBasis(value)
                    if (basis.isEmpty()) errors.add(lineMessage(line, "Base de carga no reconocida: «${text(value)}»."))
                    else ex.identity.loadBasis = basis
                    work.basisLine = line
                }
                "Objetivo" -> {
                    val obj = parseObjective(value)
                    if (obj == null) errors.add(lineMessage(line, "Objetivo no válido. Usa, por ejemplo, 3 x 8-10."))
                    else {
                        work.objectiveSets = obj.sets
                        ex.repsMin = obj.repsMin
                        ex.repsMax = obj.repsMax
                        ex.perSide = obj.perSide
                    }
                }
                "RIR objetivo" -> {
                    val rir = parseRir(value)
                    if (rir.isEmpty()) errors.add(lineMessage(line, "RIR objetivo no válido."))
                    else ex.targetRir = rir
                }
                "Descanso" -> ex.rest = text(value)
                "Notas" -> ex.note = text(value)
            }
        }

        fun parseSeries(work: WorkingExercise, number: Int, body: String, line: Int) {
            if (number < 1 || number > 100) {
                errors.add(lineMessage(line, "el número de serie debe estar entre 1 y 100."))
                return
            }
            if (work.series.containsKey(number)) {
                errors.add(lineMessage(line, "la Serie $number está repetida."))
                return
            }
            val entry = SetEntry()
            val seen = mutableSetOf<String>()
            val parts = text(body).split(";").map { text(it) }.filter { it.isNotEmpty() }
            if (parts.isEmpty()) {
                errors.add(lineMessage(line, "la Serie $number está vacía."))
                return
            }
            for (part in parts) {
                val eqIdx = part.indexOf('=')
                if (eqIdx <= 0) {
                    errors.add(lineMessage(line, "dato de serie no válido: «$part»; usa campo=valor."))
                    continue
                }
                val rawKey = part.substring(0, eqIdx)
                val key = normalized(rawKey)
                val value = text(part.substring(eqIdx + 1))
                if (value.isEmpty()) {
                    errors.add(lineMessage(line, "el valor de ${text(rawKey)} está vacío."))
                    continue
                }
                if (key !in listOf("carga", "dificultad", "reps", "rir")) {
                    errors.add(lineMessage(line, "campo de serie no reconocido: «${text(rawKey)}»."))
                    continue
                }
                if (!seen.add(key)) {
                    errors.add(lineMessage(line, "el campo $key está repetido en la Serie $number."))
                    continue
                }
                when (key) {
                    "carga" -> {
                        val load = parseNumber(value, false)
                        if (load.isEmpty()) errors.add(lineMessage(line, "carga no válida en la Serie $number."))
                        else entry.load = load
                    }
                    "dificultad" -> entry.difficulty = value
                    "reps" -> {
                        val reps = parseNumber(value, true)
                        if (reps.isEmpty()) errors.add(lineMessage(line, "reps no válidas en la Serie $number."))
                        else entry.reps = reps
                    }
                    "rir" -> {
                        val rir = parseNumber(value, false)
                        if (rir.isEmpty()) errors.add(lineMessage(line, "RIR no válido en la Serie $number."))
                        else entry.rir = rir
                    }
                }
            }
            work.series[number] = entry to line
        }

        val lines = input.split("\n")
        lines.forEachIndexed { index, rawLine ->
            val line = index + 1
            val content = text(rawLine)
            if (content.isEmpty()) return@forEachIndexed

            val exerciseMatch = Regex("^Ejercicio\\s*:\\s*(.*)$", RegexOption.IGNORE_CASE).find(content)
            if (exerciseMatch != null) {
                finalizeExercise()
                val name = text(exerciseMatch.groupValues[1])
                if (name.isEmpty()) errors.add(lineMessage(line, "Ejercicio está vacío."))
                current = WorkingExercise(HistoricalExercise(name = name.ifEmpty { "Ejercicio sin nombre" }), line)
                return@forEachIndexed
            }

            val seriesMatch = Regex("^Serie\\s+(\\d+)\\s*:\\s*(.*)$", RegexOption.IGNORE_CASE).find(content)
            if (seriesMatch != null) {
                val work = current
                if (work == null) errors.add(lineMessage(line, "Serie aparece antes del primer Ejercicio."))
                else parseSeries(work, seriesMatch.groupValues[1].toInt(), seriesMatch.groupValues[2], line)
                return@forEachIndexed
            }

            val colonIdx = content.indexOf(':')
            if (colonIdx <= 0) {
                errors.add(lineMessage(line, "formato no reconocido; usa una etiqueta seguida de dos puntos."))
                return@forEachIndexed
            }
            val rawLabel = content.substring(0, colonIdx)
            val label = normalized(rawLabel)
            val value = content.substring(colonIdx + 1)

            if (label in listOf("fecha", "entrenamiento", "finalizado")) {
                if (current != null) {
                    errors.add(lineMessage(line, "${text(rawLabel)} debe aparecer antes del primer Ejercicio."))
                    return@forEachIndexed
                }
                when (label) {
                    "fecha" -> {
                        if (seenDate) errors.add(lineMessage(line, "Fecha está repetida."))
                        seenDate = true
                        val date = calendarDate(value)
                        if (date.isEmpty()) errors.add(lineMessage(line, "Fecha no válida; usa AAAA-MM-DD."))
                        else draft.date = date
                    }
                    "entrenamiento" -> {
                        if (seenTitle) errors.add(lineMessage(line, "Entrenamiento está repetido."))
                        seenTitle = true
                        if (text(value).isEmpty()) errors.add(lineMessage(line, "Entrenamiento está vacío."))
                        else draft.title = text(value)
                    }
                    "finalizado" -> {
                        if (seenFinished) errors.add(lineMessage(line, "Finalizado está repetido."))
                        seenFinished = true
                        val answer = normalized(value)
                        when (answer) {
                            "si", "sí", "true", "1" -> draft.finished = true
                            "no", "false", "0" -> draft.finished = false
                            else -> errors.add(lineMessage(line, "Finalizado no válido; usa sí o no."))
                        }
                    }
                }
                return@forEachIndexed
            }

            val work = current
            if (work == null) {
                errors.add(lineMessage(line, "campo «${text(rawLabel)}» fuera de un bloque Ejercicio."))
                return@forEachIndexed
            }

            val mappedField = when (label) {
                "modo" -> "Modo"
                "variante" -> "Variante"
                "ajustes" -> "Ajustes"
                "base", "base de carga" -> "Base de carga"
                "objetivo" -> "Objetivo"
                "rir objetivo" -> "RIR objetivo"
                "descanso" -> "Descanso"
                "notas", "notas de movimiento" -> "Notas"
                else -> null
            }
            if (mappedField == null) {
                errors.add(lineMessage(line, "campo no reconocido: «${text(rawLabel)}»."))
            } else {
                setExerciseField(work, mappedField, value, line)
            }
        }

        finalizeExercise()
        if (input.trim().isEmpty()) errors.add("El texto histórico está vacío.")
        if (!seenDate) errors.add("Falta el campo Fecha en la cabecera.")
        if (!seenTitle) errors.add("Falta el campo Entrenamiento en la cabecera.")
        if (draft.exercises.isEmpty()) errors.add("Falta al menos un bloque Ejercicio.")

        val hasDraft = draft.exercises.isNotEmpty() || draft.title.isNotEmpty() || draft.date.isNotEmpty()
        return HistoricalParseResult(
            draft = if (hasDraft) draft else null,
            warnings = warnings,
            error = errors.joinToString("\n")
        )
    }
}
