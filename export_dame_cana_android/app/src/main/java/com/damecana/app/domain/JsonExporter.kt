package com.damecana.app.domain

import java.text.Normalizer
import java.time.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable
data class ActiveSessionExercise(
    val name: String,
    val catalogId: String = "",
    val slotId: String = "",
    val sets: Int = 3,
    val repsMin: Int? = 8,
    val repsMax: Int? = 12,
    val perSide: Boolean = false,
    val targetRir: String = "1–2",
    val rest: String = "90–150 s",
    val cue: String = "",
    val identity: ExerciseIdentity = ExerciseIdentity(resistanceMode = "external", loadBasis = "total_kg"),
    var note: String = "",
    var entries: List<SetEntry> = emptyList()
)

@Serializable
data class ActiveSession(
    val id: String,
    val title: String,
    val date: String,
    val updatedAt: String = "",
    val finished: Boolean = false,
    val sourceNote: String = "",
    val exercises: List<ActiveSessionExercise> = emptyList()
)

@Serializable
data class TrainingLogSessionMetaV1(
    val id: String,
    val title: String,
    val date: String,
    @SerialName("updated_at") val updatedAt: String,
    val finished: Boolean,
    @SerialName("source_note") val sourceNote: String,
    @SerialName("exercise_count") val exerciseCount: Int,
    @SerialName("planned_set_count") val plannedSetCount: Int,
    @SerialName("recorded_set_count") val recordedSetCount: Int
)

@Serializable
data class TrainingLogIdentityV1(
    @SerialName("resistance_mode") val resistanceMode: String = "external",
    val variant: String = "",
    @SerialName("machine_settings") val machineSettings: String = "",
    @SerialName("load_basis") val loadBasis: String = "unknown"
)

@Serializable
data class TrainingLogPrescriptionV1(
    val sets: Int,
    @SerialName("reps_min") val repsMin: Int? = null,
    @SerialName("reps_max") val repsMax: Int? = null,
    @SerialName("per_side") val perSide: Boolean = false,
    @SerialName("target_rir") val targetRir: String = "",
    val rest: String = "",
    @SerialName("coach_cue") val coachCue: String = ""
)

@Serializable
data class TrainingLogResistanceV1(
    val mode: String = "external",
    val difficulty: String = ""
)

@Serializable
data class TrainingLogSetV1(
    val index: Int,
    @SerialName("load_kg") val loadKg: String = "",
    val resistance: TrainingLogResistanceV1 = TrainingLogResistanceV1(),
    val reps: String = "",
    val rir: String = ""
)

@Serializable
data class TrainingLogResultV1(
    @SerialName("movement_notes") val movementNotes: String = "",
    val sets: List<TrainingLogSetV1> = emptyList()
)

@Serializable
data class TrainingLogExerciseV1(
    val index: Int,
    val name: String,
    val identity: TrainingLogIdentityV1,
    val prescription: TrainingLogPrescriptionV1,
    val result: TrainingLogResultV1
)

@Serializable
data class TrainingLogRecordV1(
    val schema: String = "training_log.v1",
    @SerialName("exported_at") val exportedAt: String,
    val session: TrainingLogSessionMetaV1,
    val exercises: List<TrainingLogExerciseV1>
)

@Serializable
data class TrainingHistorySummaryV1(
    @SerialName("session_count") val sessionCount: Int,
    @SerialName("finished_session_count") val finishedSessionCount: Int,
    @SerialName("recorded_set_count") val recordedSetCount: Int,
    @SerialName("date_from") val dateFrom: String,
    @SerialName("date_to") val dateTo: String
)

@Serializable
data class TrainingHistoryRecordV1(
    val schema: String = "training_history.v1",
    @SerialName("exported_at") val exportedAt: String,
    @SerialName("session_schema") val sessionSchema: String = "training_log.v1",
    val summary: TrainingHistorySummaryV1,
    val sessions: List<TrainingLogRecordV1>
)

object JsonExporter {

    @OptIn(kotlinx.serialization.ExperimentalSerializationApi::class)
    val prettyJson = Json {
        prettyPrint = true
        prettyPrintIndent = "  "
        encodeDefaults = true
        explicitNulls = true
        ignoreUnknownKeys = true
    }

    private fun text(value: String?): String = (value ?: "").trim()

    fun slug(value: String?): String {
        val raw = text(value)
        val nfd = Normalizer.normalize(raw, Normalizer.Form.NFD)
            .replace(Regex("[\\u0300-\\u036f]"), "")
            .lowercase()
            .replace(Regex("[^a-z0-9]+"), "-")
            .replace(Regex("^-+|-+$"), "")
            .take(44)
        return nfd.ifEmpty { "entrenamiento" }
    }

    fun buildTrainingRecord(session: ActiveSession, exportedAt: String = Instant.now().toString()): TrainingLogRecordV1 {
        val allSets = session.exercises.flatMap { it.entries }
        return TrainingLogRecordV1(
            schema = "training_log.v1",
            exportedAt = exportedAt,
            session = TrainingLogSessionMetaV1(
                id = text(session.id),
                title = text(session.title),
                date = text(session.date),
                updatedAt = text(session.updatedAt.ifEmpty { session.date }),
                finished = session.finished,
                sourceNote = text(session.sourceNote),
                exerciseCount = session.exercises.size,
                plannedSetCount = allSets.size,
                recordedSetCount = allSets.count { text(it.reps).isNotEmpty() }
            ),
            exercises = session.exercises.mapIndexed { exIndex, ex ->
                val mode = text(ex.identity.resistanceMode).ifEmpty { "external" }
                TrainingLogExerciseV1(
                    index = exIndex + 1,
                    name = text(ex.name),
                    identity = TrainingLogIdentityV1(
                        resistanceMode = mode,
                        variant = text(ex.identity.variant),
                        machineSettings = text(ex.identity.settings),
                        loadBasis = text(ex.identity.loadBasis).ifEmpty { "unknown" }
                    ),
                    prescription = TrainingLogPrescriptionV1(
                        sets = if (ex.sets > 0) ex.sets else ex.entries.size,
                        repsMin = ex.repsMin,
                        repsMax = ex.repsMax,
                        perSide = ex.perSide,
                        targetRir = text(ex.targetRir),
                        rest = text(ex.rest),
                        coachCue = text(ex.cue)
                    ),
                    result = TrainingLogResultV1(
                        movementNotes = text(ex.note),
                        sets = ex.entries.mapIndexed { setIdx, entry ->
                            TrainingLogSetV1(
                                index = setIdx + 1,
                                loadKg = text(entry.load),
                                resistance = TrainingLogResistanceV1(
                                    mode = mode,
                                    difficulty = text(entry.difficulty)
                                ),
                                reps = text(entry.reps),
                                rir = text(entry.rir)
                            )
                        }
                    )
                )
            }
        )
    }

    fun toActiveSession(record: TrainingLogRecordV1): ActiveSession {
        return ActiveSession(
            id = record.session.id,
            title = record.session.title,
            date = record.session.date,
            updatedAt = record.session.updatedAt,
            finished = record.session.finished,
            sourceNote = record.session.sourceNote,
            exercises = record.exercises.map { ex ->
                ActiveSessionExercise(
                    name = ex.name,
                    sets = ex.prescription.sets,
                    repsMin = ex.prescription.repsMin,
                    repsMax = ex.prescription.repsMax,
                    perSide = ex.prescription.perSide,
                    targetRir = ex.prescription.targetRir,
                    rest = ex.prescription.rest,
                    cue = ex.prescription.coachCue,
                    identity = ExerciseIdentity(
                        resistanceMode = ex.identity.resistanceMode,
                        variant = ex.identity.variant,
                        settings = ex.identity.machineSettings,
                        loadBasis = ex.identity.loadBasis
                    ),
                    note = ex.result.movementNotes,
                    entries = ex.result.sets.map { s ->
                        SetEntry(
                            load = s.loadKg,
                            difficulty = s.resistance.difficulty,
                            reps = s.reps,
                            rir = s.rir
                        )
                    }
                )
            }
        )
    }

    fun buildTrainingHistory(
        sessions: List<ActiveSession>,
        exportedAt: String = Instant.now().toString()
    ): TrainingHistoryRecordV1 {
        val sorted = sessions.sortedBy { it.date }
        val records = sorted.map { buildTrainingRecord(it, exportedAt) }
        val dates = records.map { it.session.date }.filter { it.isNotEmpty() }
        return TrainingHistoryRecordV1(
            schema = "training_history.v1",
            exportedAt = exportedAt,
            sessionSchema = "training_log.v1",
            summary = TrainingHistorySummaryV1(
                sessionCount = records.size,
                finishedSessionCount = records.count { it.session.finished },
                recordedSetCount = records.sumOf { it.session.recordedSetCount },
                dateFrom = dates.firstOrNull() ?: "",
                dateTo = dates.lastOrNull() ?: ""
            ),
            sessions = records
        )
    }

    fun makeJson(session: ActiveSession, exportedAt: String = Instant.now().toString()): String {
        return prettyJson.encodeToString(buildTrainingRecord(session, exportedAt)) + "\n"
    }

    fun makeHistoryJson(sessions: List<ActiveSession>, exportedAt: String = Instant.now().toString()): String {
        return prettyJson.encodeToString(buildTrainingHistory(sessions, exportedAt)) + "\n"
    }
}
