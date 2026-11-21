package com.damecana.app.domain

import java.text.Normalizer
import java.time.LocalDate
import kotlinx.serialization.Serializable

@Serializable
data class NumberRange(val min: Int, val max: Int)

@Serializable
data class ParsedSpec(
    val sets: Int,
    val repsMin: Int,
    val repsMax: Int,
    val targetRir: String,
    val rest: String,
    val perSide: Boolean,
    val specStart: Int,
    val specEnd: Int
)

@Serializable
data class WorkoutExercise(
    val name: String,
    val sets: Int,
    val repsMin: Int,
    val repsMax: Int,
    val targetRir: String,
    val rest: String,
    val perSide: Boolean,
    val cue: String,
    val identityText: String
)

@Serializable
data class ParsedWorkout(
    val title: String,
    val exercises: List<WorkoutExercise>,
    val error: String
)

@Serializable
data class NoteSessionHeader(
    val label: String?,
    val focusText: String?,
    val rawHeader: String?
)

@Serializable
data class NotePrescription(
    val sets: Int?,
    val repsMin: Int?,
    val repsMax: Int?,
    val targetRirMin: Int?,
    val targetRirMax: Int?,
    val restSecondsMin: Double?,
    val restSecondsMax: Double?,
    val perSide: Boolean
)

@Serializable
data class HistoricalSetEntry(
    val load: Double,
    val loadUnit: String,
    val reps: Int,
    val rir: Double,
    val rawText: String,
    val status: String
)

@Serializable
data class ComparableRecord(
    val rawText: String,
    val rawDate: String?,
    val dateIso: String?,
    val sets: List<HistoricalSetEntry>,
    val status: String
)

@Serializable
data class ExplicitLoad(
    val value: Double,
    val unit: String
)

@Serializable
data class HistoricalMention(
    val rawText: String,
    val comparable: Boolean,
    val rawDate: String?,
    val dateIso: String?,
    val explicitLoad: ExplicitLoad?
)

@Serializable
data class ExerciseInstruction(
    val type: String,
    val text: String,
    val rawText: String
)

@Serializable
data class NoteFragment(
    val lineStart: Int,
    val lineEnd: Int,
    val rawText: String,
    val status: String,
    val category: String,
    val reason: String?
)

@Serializable
data class NoteDraftExercise(
    val name: String,
    val normalizedName: String?,
    var prescription: NotePrescription,
    var comparableRecord: ComparableRecord?,
    val historicalMentions: MutableList<HistoricalMention>,
    val instructions: MutableList<ExerciseInstruction>,
    val fragments: MutableList<NoteFragment>,
    val rawText: String
)

@Serializable
data class WorkoutNoteDraftV1(
    val schema: String = "workout_note_draft.v1",
    val session: NoteSessionHeader,
    val exercises: MutableList<NoteDraftExercise>,
    val fragments: MutableList<NoteFragment>,
    val rawText: String
)

object TrainingParser {

    private val REGEX_SPACES = Regex("[ \\t]+")
    private val REGEX_LEAD_HASH = Regex("^#{1,6}\\s*")
    private val REGEX_LEAD_BULLET = Regex("^[-*•]\\s+")
    private val REGEX_LEAD_NUM = Regex("^\\d+[.)]\\s+")
    private val REGEX_NUMBER_RANGE = Regex("(\\d+)(?:\\s*[-–—a]\\s*(\\d+))?", RegexOption.IGNORE_CASE)
    private val REGEX_POR_LADO = Regex("\\bpor\\s+lado\\b", RegexOption.IGNORE_CASE)
    private val REGEX_COMPACT_SPEC = Regex("(?:^|\\s)(\\d+)\\s*(?:x|×)\\s*(\\d+)(?:\\s*[-–—a]\\s*(\\d+))?", RegexOption.IGNORE_CASE)
    private val REGEX_RIR_SPEC = Regex("\\bRIR\\s*[:=@]?\\s*(\\d+(?:\\s*[-–—a]\\s*\\d+)?)", RegexOption.IGNORE_CASE)
    private val REGEX_REST_SPEC = Regex("\\b(?:descanso|descansa|rest)\\s*[:=]?\\s*([\\d.,]+(?:\\s*[-–—a]\\s*[\\d.,]+)?\\s*(?:s|seg(?:undos?)?|min(?:utos?)?))", RegexOption.IGNORE_CASE)
    private val REGEX_SIDE_SPEC = Regex("\\b(?:por\\s+lado|cada\\s+lado|por\\s+pierna|cada\\s+pierna|por\\s+brazo)\\b", RegexOption.IGNORE_CASE)

    fun clean(value: String?): String {
        return (value ?: "")
            .replace("**", "")
            .replace("`", "")
            .replace(REGEX_SPACES, " ")
            .trim()
    }

    fun stripLead(value: String?): String {
        return clean(value)
            .replace(REGEX_LEAD_HASH, "")
            .replace(REGEX_LEAD_BULLET, "")
            .replace(REGEX_LEAD_NUM, "")
            .trim()
    }

    fun numberRange(value: String?): NumberRange? {
        val match = REGEX_NUMBER_RANGE.find(value ?: "") ?: return null
        val minVal = match.groupValues[1].toIntOrNull() ?: return null
        val maxVal = match.groupValues[2].takeIf { it.isNotEmpty() }?.toIntOrNull() ?: minVal
        return NumberRange(min = minVal, max = maxVal)
    }

    fun parseSpec(text: String?): ParsedSpec? {
        val normalized = clean(text).replace(REGEX_POR_LADO, "por lado")
        val compact = REGEX_COMPACT_SPEC.find(normalized) ?: return null

        val sets = compact.groupValues[1].toIntOrNull() ?: return null
        if (sets < 1 || sets > 20) return null
        val repsMin = compact.groupValues[2].toIntOrNull() ?: return null
        val repsMax = compact.groupValues[3].takeIf { it.isNotEmpty() }?.toIntOrNull() ?: repsMin

        val rirMatch = REGEX_RIR_SPEC.find(normalized)
        val restMatch = REGEX_REST_SPEC.find(normalized)
        val side = REGEX_SIDE_SPEC.containsMatchIn(normalized)

        val fullMatch = compact.value
        val specStart = compact.range.first + (if (fullMatch.startsWith(" ")) 1 else 0)
        val specEnd = compact.range.first + fullMatch.length

        return ParsedSpec(
            sets = sets,
            repsMin = repsMin,
            repsMax = repsMax,
            targetRir = rirMatch?.groupValues?.get(1)?.replace(Regex("a", RegexOption.IGNORE_CASE), "–") ?: "",
            rest = restMatch?.groupValues?.get(1)?.replace(Regex("a", RegexOption.IGNORE_CASE), "–") ?: "",
            perSide = side,
            specStart = specStart,
            specEnd = specEnd
        )
    }

    private fun titleFromNote(lines: List<String>): String {
        val heading = lines.firstOrNull { Regex("^#{1,3}\\s+\\S").containsMatchIn(it.trim()) }
        if (heading != null) return stripLead(heading)
        val labelRegex = Regex("^(?:sesión|sesion|entrenamiento|día|dia)\\s*:\\s*", RegexOption.IGNORE_CASE)
        val labelled = lines.firstOrNull { labelRegex.containsMatchIn(it.trim()) }
        if (labelled != null) return clean(labelled).replace(labelRegex, "")
        return "Entrenamiento de hoy"
    }

    private fun exerciseNameFromLine(line: String, spec: ParsedSpec): String {
        val safeEnd = spec.specStart.coerceIn(0, line.length)
        var prefix = stripLead(line.substring(0, safeEnd))
        if (prefix.contains("|")) {
            val cells = prefix.split("|").map { clean(it) }.filter { it.isNotEmpty() }
            prefix = cells.firstOrNull { !Regex("^\\d+$").matches(it) } ?: cells.firstOrNull() ?: ""
        }
        return prefix
            .replace(Regex("\\b(?:series?|sets?)\\s*[:=]?\\s*$", RegexOption.IGNORE_CASE), "")
            .replace(Regex("[·:—–\\-|]+\\s*$"), "")
            .trim()
    }

    private fun cueFromLine(line: String, spec: ParsedSpec): String {
        val safeStart = spec.specEnd.coerceIn(0, line.length)
        val after = clean(line.substring(safeStart))
            .replace(Regex("^[\\s·:—–\\-|,]+"), "")
            .replace(Regex("\\bRIR\\s*[:=@]?\\s*\\d+(?:\\s*[-–—a]\\s*\\d+)?", RegexOption.IGNORE_CASE), "")
            .replace(Regex("\\b(?:descanso|descansa|rest)\\s*[:=]?\\s*[\\d.,]+(?:\\s*[-–—a]\\s*[\\d.,]+)?\\s*(?:s|seg(?:undos?)?|min(?:utos?)?)", RegexOption.IGNORE_CASE), "")
            .replace(REGEX_SIDE_SPEC, "")
            .replace(Regex("^[\\s·:—–\\-|,]+|[\\s·:—–\\-|,]+$"), "")
        return clean(after)
    }

    private fun parseInlineExercises(lines: List<String>): List<WorkoutExercise> {
        val exercises = mutableListOf<WorkoutExercise>()
        for (lineIndex in lines.indices) {
            val rawLine = lines[lineIndex]
            if (Regex("^\\s*\\|?\\s*:?-{3,}").containsMatchIn(rawLine)) continue
            val spec = parseSpec(rawLine) ?: continue
            val name = exerciseNameFromLine(rawLine, spec)
            if (name.isEmpty() || Regex("^(?:series?|reps?|repeticiones?|objetivo)$", RegexOption.IGNORE_CASE).matches(name)) continue
            val nextLine = lines.getOrNull(lineIndex + 1) ?: ""
            val identityMatch = Regex("^identidad\\s*:\\s*(.+)$", RegexOption.IGNORE_CASE).find(stripLead(nextLine))
            exercises.add(
                WorkoutExercise(
                    name = name,
                    sets = spec.sets,
                    repsMin = spec.repsMin,
                    repsMax = spec.repsMax,
                    targetRir = spec.targetRir,
                    rest = spec.rest,
                    perSide = spec.perSide,
                    cue = cueFromLine(rawLine, spec),
                    identityText = identityMatch?.let { clean(it.groupValues[1]) } ?: ""
                )
            )
        }
        return exercises
    }

    private fun parseBlockExercises(lines: List<String>): List<WorkoutExercise> {
        val exercises = mutableListOf<WorkoutExercise>()
        var currentName = ""
        var currentSets = 0
        var currentRepsMin: Int? = null
        var currentRepsMax: Int? = null
        var currentTargetRir = ""
        var currentRest = ""
        var currentPerSide = false
        var currentCue = ""
        var currentIdentity = ""
        var hasCurrent = false

        fun flush() {
            if (hasCurrent && currentName.isNotEmpty() && currentSets > 0 && currentRepsMin != null) {
                exercises.add(
                    WorkoutExercise(
                        name = currentName,
                        sets = currentSets,
                        repsMin = currentRepsMin!!,
                        repsMax = currentRepsMax ?: currentRepsMin!!,
                        targetRir = currentTargetRir,
                        rest = currentRest,
                        perSide = currentPerSide,
                        cue = currentCue,
                        identityText = currentIdentity
                    )
                )
            }
            hasCurrent = false
        }

        for (rawLine in lines) {
            val line = stripLead(rawLine)
            val exerciseMatch = Regex("^(?:ejercicio|movimiento)\\s*:\\s*(.+)$", RegexOption.IGNORE_CASE).find(line)
            if (exerciseMatch != null) {
                flush()
                currentName = clean(exerciseMatch.groupValues[1])
                currentSets = 0
                currentRepsMin = null
                currentRepsMax = null
                currentTargetRir = ""
                currentRest = ""
                currentPerSide = false
                currentCue = ""
                currentIdentity = ""
                hasCurrent = true
                continue
            }
            if (!hasCurrent) continue

            val setsMatch = Regex("^series?\\s*:\\s*(\\d+)", RegexOption.IGNORE_CASE).find(line)
            val repsMatch = Regex("^(?:reps?|repeticiones?)\\s*:\\s*(.+)$", RegexOption.IGNORE_CASE).find(line)
            val rirMatch = Regex("^RIR\\s*:\\s*(.+)$", RegexOption.IGNORE_CASE).find(line)
            val restMatch = Regex("^(?:descanso|rest)\\s*:\\s*(.+)$", RegexOption.IGNORE_CASE).find(line)
            val cueMatch = Regex("^(?:indicación|indicacion|técnica|tecnica|nota)\\s*:\\s*(.+)$", RegexOption.IGNORE_CASE).find(line)
            val identityMatch = Regex("^identidad\\s*:\\s*(.+)$", RegexOption.IGNORE_CASE).find(line)

            when {
                setsMatch != null -> currentSets = setsMatch.groupValues[1].toIntOrNull() ?: 0
                repsMatch != null -> {
                    val range = numberRange(repsMatch.groupValues[1])
                    if (range != null) {
                        currentRepsMin = range.min
                        currentRepsMax = range.max
                    }
                    currentPerSide = Regex("lado|pierna|brazo", RegexOption.IGNORE_CASE).containsMatchIn(repsMatch.groupValues[1])
                }
                rirMatch != null -> currentTargetRir = clean(rirMatch.groupValues[1])
                restMatch != null -> currentRest = clean(restMatch.groupValues[1])
                identityMatch != null -> currentIdentity = clean(identityMatch.groupValues[1])
                cueMatch != null -> currentCue = clean(cueMatch.groupValues[1])
            }
        }
        flush()
        return exercises
    }

    private fun keyOf(exercise: WorkoutExercise): String {
        return exercise.name.lowercase().replace(Regex("[^a-záéíóúüñ0-9]", RegexOption.IGNORE_CASE), "")
    }

    fun parseWorkout(note: String?): ParsedWorkout {
        val source = (note ?: "").replace("\r", "").trim()
        if (source.isEmpty()) {
            return ParsedWorkout(title = "", exercises = emptyList(), error = "Pega primero la nota del entrenador.")
        }
        val lines = source.split("\n").map { it.trim() }.filter { it.isNotEmpty() }
        val combined = parseInlineExercises(lines) + parseBlockExercises(lines)
        val seen = mutableSetOf<String>()
        val exercises = combined.filter { ex ->
            val key = keyOf(ex)
            if (key.isEmpty() || seen.contains(key)) false else {
                seen.add(key)
                true
            }
        }
        return ParsedWorkout(
            title = titleFromNote(lines),
            exercises = exercises,
            error = if (exercises.isNotEmpty()) "" else "No pude reconocer ejercicios. Usa, por ejemplo: Hip thrust — 3 × 8–10 · RIR 2."
        )
    }

    private fun normalizeForParsing(value: String?): String {
        return (value ?: "")
            .replace("\r", "")
            .replace(Regex("[×xX]"), "x")
            .replace(Regex("[–—]"), "-")
            .replace(Regex("(\\d)\\s*kg\\b", RegexOption.IGNORE_CASE), "$1 kg")
            .replace(REGEX_SPACES, " ")
            .trim()
    }

    private fun normalizedName(value: String?): String? {
        val cleaned = clean(value)
        val nfd = Normalizer.normalize(cleaned, Normalizer.Form.NFD)
            .replace(Regex("[\\u0300-\\u036f]"), "")
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), " ")
            .trim()
        return nfd.ifEmpty { null }
    }

    private fun validIsoDate(value: String?): String? {
        val match = Regex("\\b(\\d{4})-(\\d{2})-(\\d{2})\\b").find(normalizeForParsing(value)) ?: return null
        val year = match.groupValues[1].toIntOrNull() ?: return null
        val month = match.groupValues[2].toIntOrNull() ?: return null
        val day = match.groupValues[3].toIntOrNull() ?: return null
        return try {
            LocalDate.of(year, month, day)
            "${match.groupValues[1]}-${match.groupValues[2]}-${match.groupValues[3]}"
        } catch (_: Exception) {
            null
        }
    }

    private data class DateRef(val rawDate: String?, val dateIso: String?)

    private fun dateReference(value: String?): DateRef {
        val source = value ?: ""
        val full = validIsoDate(source)
        if (full != null) return DateRef(rawDate = full, dateIso = full)

        val fullEuropean = Regex("\\b(\\d{1,2}/\\d{1,2}/\\d{4})\\b").find(source)
        if (fullEuropean != null) {
            val raw = fullEuropean.groupValues[1]
            val parts = raw.split("/").mapNotNull { it.toIntOrNull() }
            if (parts.size == 3) {
                val (day, month, year) = parts
                val iso = try {
                    LocalDate.of(year, month, day)
                    "%04d-%02d-%02d".format(year, month, day)
                } catch (_: Exception) {
                    null
                }
                return DateRef(rawDate = raw, dateIso = iso)
            }
        }
        val short = Regex("\\b(\\d{1,2}/\\d{1,2})(?!\\d|/)\\b").find(source)
        return DateRef(rawDate = short?.groupValues?.get(1), dateIso = null)
    }

    private fun parseRirRange(value: String?): NumberRange? {
        val match = Regex("\\brir\\s*[:=@]?\\s*(\\d+)(?:\\s*-\\s*(\\d+))?\\b", RegexOption.IGNORE_CASE)
            .find(normalizeForParsing(value)) ?: return null
        val minVal = match.groupValues[1].toIntOrNull() ?: return null
        val maxVal = match.groupValues[2].takeIf { it.isNotEmpty() }?.toIntOrNull() ?: minVal
        return NumberRange(minVal, maxVal)
    }

    private data class RestRangeSeconds(val min: Double, val max: Double)

    private fun parseRestSeconds(value: String?): RestRangeSeconds? {
        val match = Regex(
            "\\b(?:descanso|descansa|rest)\\s*[:=]?\\s*(\\d+(?:[.,]\\d+)?)(?:\\s*-\\s*(\\d+(?:[.,]\\d+)?))?\\s*(s|seg(?:undos?)?|min(?:utos?)?)\\b",
            RegexOption.IGNORE_CASE
        ).find(normalizeForParsing(value)) ?: return null
        val mult = if (match.groupValues[3].lowercase().startsWith("min")) 60.0 else 1.0
        val minVal = (match.groupValues[1].replace(",", ".").toDoubleOrNull() ?: return null) * mult
        val maxRaw = match.groupValues[2].takeIf { it.isNotEmpty() } ?: match.groupValues[1]
        val maxVal = (maxRaw.replace(",", ".").toDoubleOrNull() ?: return null) * mult
        return RestRangeSeconds(minVal, maxVal)
    }

    private fun parseHistoricalSets(value: String?): List<HistoricalSetEntry> {
        val regex = Regex("(\\d+(?:[.,]\\d+)?)\\s*kg\\s*[x×]\\s*(\\d+)\\s*(?:@\\s*|rir\\s*)(\\d+(?:[.,]\\d+)?)", RegexOption.IGNORE_CASE)
        return regex.findAll(value ?: "").map { match ->
            HistoricalSetEntry(
                load = match.groupValues[1].replace(",", ".").toDouble(),
                loadUnit = "kg",
                reps = match.groupValues[2].toInt(),
                rir = match.groupValues[3].replace(",", ".").toDouble(),
                rawText = match.value.trim(),
                status = "parsed"
            )
        }.toList()
    }

    private fun parseComparableRecord(rawText: String?): ComparableRecord? {
        val source = rawText ?: ""
        val normalized = normalizeForParsing(source).lowercase()
        if (Regex("\\b(?:ninguno comparable|ningun registro comparable|ninguno|no tengo)\\b").containsMatchIn(normalized)) {
            return null
        }
        val date = dateReference(source)
        val sets = parseHistoricalSets(source)
        return ComparableRecord(
            rawText = source,
            rawDate = date.rawDate,
            dateIso = date.dateIso,
            sets = sets,
            status = if (sets.isNotEmpty()) "parsed" else "partial"
        )
    }

    private fun instructionType(value: String?): Pair<String, String>? {
        val match = Regex(
            "^\\s*(hoy|objetivo|profundidad|registra|configuración|configuracion|variante|variante hoy|ajuste|ajuste variante)\\s*:\\s*(.*)$",
            RegexOption.IGNORE_CASE
        ).find(value ?: "") ?: return null
        val rawKey = Normalizer.normalize(match.groupValues[1].lowercase(), Normalizer.Form.NFD)
            .replace(Regex("[\\u0300-\\u036f]"), "")
        val mapped = when (rawKey) {
            "hoy" -> "today"
            "objetivo" -> "target"
            "profundidad" -> "depth"
            "registra" -> "record"
            "configuracion" -> "setup"
            "variante", "variante hoy" -> "variant"
            "ajuste", "ajuste variante" -> "setup"
            else -> "other"
        }
        return mapped to match.groupValues[2].trim()
    }

    private fun historicalMention(rawText: String): HistoricalMention {
        val match = Regex("(\\d+(?:[.,]\\d+)?)\\s*kg\\b", RegexOption.IGNORE_CASE).find(rawText)
        val date = dateReference(rawText)
        return HistoricalMention(
            rawText = rawText,
            comparable = false,
            rawDate = date.rawDate,
            dateIso = date.dateIso,
            explicitLoad = match?.let {
                ExplicitLoad(value = it.groupValues[1].replace(",", ".").toDouble(), unit = "kg")
            }
        )
    }

    fun parseWorkoutNoteV1(rawText: String?): WorkoutNoteDraftV1 {
        val source = (rawText ?: "").replace("\r", "")
        data class IndexedLine(val rawText: String, val line: Int)
        val lines = source.split("\n").mapIndexed { index, s -> IndexedLine(s, index + 1) }
        val headerIndexes = mutableListOf<Int>()

        lines.forEachIndexed { index, item ->
            val spec = parseSpec(normalizeForParsing(item.rawText))
            val name = if (spec != null) exerciseNameFromLine(item.rawText, spec) else ""
            if (spec != null && name.isNotEmpty()) {
                headerIndexes.add(index)
            }
        }

        val firstExerciseIndex = headerIndexes.firstOrNull() ?: lines.size
        val sessionLine = lines.subList(0, firstExerciseIndex).firstOrNull { it.rawText.trim().isNotEmpty() }
        val sessionParts = if (sessionLine != null) {
            stripLead(sessionLine.rawText).split(Regex("\\s+[—–-]\\s+"), limit = 2)
        } else {
            emptyList()
        }

        val draft = WorkoutNoteDraftV1(
            session = NoteSessionHeader(
                label = sessionParts.getOrNull(0)?.trim()?.takeIf { it.isNotEmpty() },
                focusText = sessionParts.getOrNull(1)?.trim()?.takeIf { it.isNotEmpty() },
                rawHeader = sessionLine?.rawText
            ),
            exercises = mutableListOf(),
            fragments = mutableListOf(),
            rawText = source
        )

        val ownerByLine = mutableMapOf<Int, NoteDraftExercise>()
        headerIndexes.forEachIndexed { position, start ->
            val end = if (position + 1 < headerIndexes.size) headerIndexes[position + 1] else lines.size
            val header = lines[start]
            val spec = parseSpec(normalizeForParsing(header.rawText))!!
            val name = exerciseNameFromLine(header.rawText, spec)
            val exercise = NoteDraftExercise(
                name = name,
                normalizedName = normalizedName(name),
                prescription = NotePrescription(
                    sets = spec.sets,
                    repsMin = spec.repsMin,
                    repsMax = spec.repsMax,
                    targetRirMin = null,
                    targetRirMax = null,
                    restSecondsMin = null,
                    restSecondsMax = null,
                    perSide = spec.perSide
                ),
                comparableRecord = null,
                historicalMentions = mutableListOf(),
                instructions = mutableListOf(),
                fragments = mutableListOf(),
                rawText = lines.subList(start, end).joinToString("\n") { it.rawText }
            )
            for (idx in start until end) ownerByLine[idx] = exercise
            draft.exercises.add(exercise)
        }

        val comparableRegex = Regex("^\\s*(?:ultimo registro|último registro|registro previo|registro comparable)\\s*:\\s*(.*)$", RegexOption.IGNORE_CASE)
        val nonComparableKgRegex = Regex("\\b\\d+(?:[.,]\\d+)?\\s*kg\\b", RegexOption.IGNORE_CASE)
        val nonComparableTextRegex = Regex("\\b(?:no\\s+traslad[a-záéíóúüñ]*|otra geometr[ií]a\\s+.*no\\s+comparable|otra\\s+m[aá]quina\\s+.*no\\s+comparable|no\\s+(?:es\\s+)?comparable)\\b", RegexOption.IGNORE_CASE)

        lines.forEachIndexed { index, item ->
            val exercise = ownerByLine[index]
            val raw = item.rawText
            val normalized = normalizeForParsing(raw)
            val comparableMatch = comparableRegex.find(raw)
            val instr = instructionType(raw)

            val current: NoteFragment = when {
                raw.trim().isEmpty() -> NoteFragment(item.line, item.line, raw, "parsed", "unknown", null)
                headerIndexes.contains(index) -> NoteFragment(item.line, item.line, raw, "parsed", "exercise-header", null)
                exercise == null && item == sessionLine -> NoteFragment(item.line, item.line, raw, "parsed", "session-header", null)
                exercise == null -> NoteFragment(item.line, item.line, raw, "unresolved", "unknown", "unknown-format")
                comparableMatch != null -> {
                    val record = parseComparableRecord(comparableMatch.groupValues[1])
                    exercise.comparableRecord = record
                    val isPartial = record != null && record.status == "partial"
                    NoteFragment(
                        item.line,
                        item.line,
                        raw,
                        if (isPartial) "partial" else "parsed",
                        "comparable-record",
                        if (isPartial) "incomplete-record" else null
                    )
                }
                instr != null -> {
                    exercise.instructions.add(ExerciseInstruction(type = instr.first, text = instr.second, rawText = raw))
                    NoteFragment(item.line, item.line, raw, "parsed", "instruction", null)
                }
                else -> {
                    val rir = parseRirRange(normalized)
                    val rest = parseRestSeconds(normalized)
                    if (rir != null || rest != null) {
                        exercise.prescription = exercise.prescription.copy(
                            targetRirMin = rir?.min ?: exercise.prescription.targetRirMin,
                            targetRirMax = rir?.max ?: exercise.prescription.targetRirMax,
                            restSecondsMin = rest?.min ?: exercise.prescription.restSecondsMin,
                            restSecondsMax = rest?.max ?: exercise.prescription.restSecondsMax
                        )
                        NoteFragment(item.line, item.line, raw, "parsed", "prescription", null)
                    } else if (nonComparableKgRegex.containsMatchIn(raw) && nonComparableTextRegex.containsMatchIn(normalized)) {
                        exercise.historicalMentions.add(historicalMention(raw))
                        NoteFragment(item.line, item.line, raw, "parsed", "historical-mention", null)
                    } else {
                        exercise.instructions.add(ExerciseInstruction(type = "other", text = raw.trim(), rawText = raw))
                        NoteFragment(item.line, item.line, raw, "parsed", "instruction", null)
                    }
                }
            }

            draft.fragments.add(current)
            exercise?.fragments?.add(current)
        }

        return draft
    }
}
