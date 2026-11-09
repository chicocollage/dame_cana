package com.damecana.app.domain

import org.junit.Assert.assertEquals
import org.junit.Test

class JsonExportRoundTripTest {

    @Test
    fun roundTripsTrainingLogAndHistoryWithoutAnyDataLoss() {
        val session = ActiveSession(
            id = "sess-2026-11-07-a",
            title = "Día A — Nuclear 1 · Glúteo y Cuádriceps",
            date = "2026-11-07T10:00:00.000Z",
            updatedAt = "2026-11-07T11:05:00.000Z",
            finished = true,
            sourceNote = "# Día A\n1. Hip thrust en máquina — 3 x 8-10 · RIR 2",
            exercises = listOf(
                ActiveSessionExercise(
                    name = "Hip thrust en máquina",
                    sets = 3,
                    repsMin = 8,
                    repsMax = 10,
                    perSide = false,
                    targetRir = "2",
                    rest = "2–3 min",
                    cue = "Pausa arriba 1s",
                    identity = ExerciseIdentity(
                        resistanceMode = "external",
                        variant = "Máquina discos",
                        settings = "Respaldo 3",
                        loadBasis = "total_kg"
                    ),
                    note = "Sólido sin molestia lumbar",
                    entries = listOf(
                        SetEntry(load = "140", reps = "10", rir = "2"),
                        SetEntry(load = "145", reps = "9", rir = "1.5"),
                        SetEntry(load = "145", reps = "8", rir = "1")
                    )
                )
            )
        )

        val fixedExportedAt = "2026-11-07T12:00:00.000Z"
        val jsonText = JsonExporter.makeJson(session, fixedExportedAt)
        val parsedRecord = JsonExporter.prettyJson.decodeFromString<TrainingLogRecordV1>(jsonText)

        assertEquals("training_log.v1", parsedRecord.schema)
        assertEquals(1, parsedRecord.session.exerciseCount)
        assertEquals(3, parsedRecord.session.plannedSetCount)
        assertEquals(3, parsedRecord.session.recordedSetCount)

        val restored = JsonExporter.toActiveSession(parsedRecord)
        assertEquals(session, restored)

        val historyJson = JsonExporter.makeHistoryJson(listOf(session), fixedExportedAt)
        val parsedHistory = JsonExporter.prettyJson.decodeFromString<TrainingHistoryRecordV1>(historyJson)
        assertEquals("training_history.v1", parsedHistory.schema)
        assertEquals(1, parsedHistory.summary.sessionCount)
        assertEquals(3, parsedHistory.summary.recordedSetCount)
        assertEquals(session, JsonExporter.toActiveSession(parsedHistory.sessions.first()))
    }
}
