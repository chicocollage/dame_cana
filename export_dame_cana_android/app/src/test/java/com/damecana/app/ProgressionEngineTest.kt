package com.damecana.app

import com.damecana.app.domain.ActiveSession
import com.damecana.app.domain.ActiveSessionExercise
import com.damecana.app.domain.ExerciseIdentity
import com.damecana.app.domain.ProgressionEngine
import com.damecana.app.domain.ProgressionEngine.DecisionType
import com.damecana.app.domain.SetEntry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ProgressionEngineTest {

    private fun makeExercise(
        name: String,
        repsMin: Int = 10,
        repsMax: Int = 15,
        targetRir: String = "1",
        load: String = "50",
        reps: String = "10",
        rir: String = "1",
        sets: Int = 3
    ): ActiveSessionExercise {
        return ActiveSessionExercise(
            name = name,
            sets = sets,
            repsMin = repsMin,
            repsMax = repsMax,
            targetRir = targetRir,
            rest = "90s",
            identity = ExerciseIdentity(),
            entries = List(sets) { SetEntry(load = load, reps = reps, rir = rir) }
        )
    }

    private fun makeHistorySession(exercise: ActiveSessionExercise, sessionId: String = "sess-1"): List<ActiveSession> {
        return listOf(
            ActiveSession(
                id = sessionId,
                title = "Sesión Previa",
                date = "2026-11-01",
                finished = true,
                exercises = listOf(exercise)
            )
        )
    }

    @Test
    fun test01_barbellIncreasesLoadBy2Point5KgWhenReachingMaxReps() {
        val prevEx = makeExercise(name = "Press Banca Plano Barra", repsMin = 8, repsMax = 12, load = "80", reps = "12", rir = "1")
        val currentEx = makeExercise(name = "Press Banca Plano Barra", repsMin = 8, repsMax = 12, load = "80", reps = "", rir = "")
        val history = makeHistorySession(prevEx)

        val rec = ProgressionEngine.evaluate(currentEx, history)

        assertEquals(DecisionType.INCREASE_LOAD, rec.decision)
        assertEquals(82.5, rec.recommendedLoadKg!!, 0.001)
        assertEquals(8, rec.targetRepsPerSet[0])
        assertTrue(rec.badgeText.contains("SUBIR CARGA: 82.5 KG × 8 EN S1"))
    }

    @Test
    fun test02_katanaTriggersPlateBridge16To18WhenReachingMaxRepsOnLargeJump() {
        // Katana 14kg -> sig placa 18kg es +28.5% (>15%). Si hace 15 reps, no salta todavía a 18kg: activa PUENTE 16-18
        val prevEx = makeExercise(name = "Extension Triceps Katana Cable", repsMin = 10, repsMax = 15, load = "14", reps = "15", rir = "1")
        val currentEx = makeExercise(name = "Extension Triceps Katana Cable", repsMin = 10, repsMax = 15, load = "14", reps = "", rir = "")
        val history = makeHistorySession(prevEx)

        val rec = ProgressionEngine.evaluate(currentEx, history)

        assertEquals(DecisionType.PLATE_BRIDGE_16_18, rec.decision)
        assertEquals(14.0, rec.recommendedLoadKg!!, 0.001)
        assertEquals(16, rec.targetRepsPerSet[0])
        assertTrue(rec.badgeText.contains("PUENTE PLACA (16–18): 14 KG × 16 EN S1"))
    }

    @Test
    fun test03_katanaJumpsToNextPlateWhenCompletingBridgeCeiling() {
        // Katana 14kg con 17 reps (techo puente >= 17) -> salta a 18 kg x 10 en S1
        val prevEx = makeExercise(name = "Extension Triceps Katana Cable", repsMin = 10, repsMax = 15, load = "14", reps = "17", rir = "1")
        val currentEx = makeExercise(name = "Extension Triceps Katana Cable", repsMin = 10, repsMax = 15, load = "14", reps = "", rir = "")
        val history = makeHistorySession(prevEx)

        val rec = ProgressionEngine.evaluate(currentEx, history)

        assertEquals(DecisionType.INCREASE_LOAD, rec.decision)
        assertEquals(18.0, rec.recommendedLoadKg!!, 0.001)
        assertEquals(10, rec.targetRepsPerSet[0])
        assertTrue(rec.badgeText.contains("SUBIR PLACA: 18 KG × 10 EN S1"))
    }

    @Test
    fun test04_progressesPlusOneRepWhenWithinWorkingRange() {
        val prevEx = makeExercise(name = "Jalón al Pecho Polea", repsMin = 10, repsMax = 15, load = "50", reps = "12", rir = "1")
        val currentEx = makeExercise(name = "Jalón al Pecho Polea", repsMin = 10, repsMax = 15, load = "50", reps = "", rir = "")
        val history = makeHistorySession(prevEx)

        val rec = ProgressionEngine.evaluate(currentEx, history)

        assertEquals(DecisionType.PROGRESS_REPS_S1, rec.decision)
        assertEquals(50.0, rec.recommendedLoadKg!!, 0.001)
        assertEquals(13, rec.targetRepsPerSet[0])
        assertTrue(rec.badgeText.contains("+1 REP EN S1: 50 KG × 13"))
    }

    @Test
    fun test05_consolidatesRirWhenFailingTargetRir() {
        // Hizo fallo ("F" -> -0.5) cuando el targetRir era 1
        val prevEx = makeExercise(name = "Sentadilla Hack", repsMin = 8, repsMax = 12, targetRir = "1", load = "120", reps = "10", rir = "F")
        val currentEx = makeExercise(name = "Sentadilla Hack", repsMin = 8, repsMax = 12, targetRir = "1", load = "120", reps = "", rir = "")
        val history = makeHistorySession(prevEx)

        val rec = ProgressionEngine.evaluate(currentEx, history)

        assertEquals(DecisionType.CONSOLIDATE_RIR, rec.decision)
        assertEquals(120.0, rec.recommendedLoadKg!!, 0.001)
        assertEquals(10, rec.targetRepsPerSet[0])
        assertTrue(rec.badgeText.contains("CONSOLIDAR S1: 120 KG × 10 (LIMPIAR RIR)"))
    }

    @Test
    fun test06_triggersDeloadBioWhenSleepQualityIsLow() {
        val prevEx = makeExercise(name = "Remo Gironda Polea", repsMin = 10, repsMax = 15, load = "60", reps = "13", rir = "1")
        val currentEx = makeExercise(name = "Remo Gironda Polea", repsMin = 10, repsMax = 15, load = "60", reps = "", rir = "")
        val history = makeHistorySession(prevEx)

        val rec = ProgressionEngine.evaluate(currentEx, history, sleepQuality = 2, tendonComfort = 8)

        assertEquals(DecisionType.DELOAD_BIO, rec.decision)
        assertEquals(60.0, rec.recommendedLoadKg!!, 0.001)
        assertEquals(12, rec.targetRepsPerSet[0])
        assertTrue(rec.badgeText.contains("BIO AUTORREGULACIÓN: 60 KG × 12 (RIR +1)"))
    }

    @Test
    fun test07_historialSemillaAssetLoadsAndEvaluatesRealDays() {
        val file = java.io.File("src/main/assets/historial_semilla.json")
        assertTrue(file.exists())
        val jsonStr = file.readText()
        val json = kotlinx.serialization.json.Json { ignoreUnknownKeys = true }
        val sessions = json.decodeFromString<List<ActiveSession>>(jsonStr)
        assertEquals(37, sessions.size)

        // Comprobar que la sesión más reciente es del 2026-11-05
        assertEquals("2026-11-05", sessions.first().date)
        assertTrue(sessions.first().exercises.isNotEmpty())

        // Comprobar que ProgressionEngine encuentra historial para ejercicios del Día C (ej. Press convergente inclinado E035)
        val pressInclinado = ActiveSessionExercise(
            name = "Press convergente inclinado moderado",
            catalogId = "E035",
            slotId = "C01",
            repsMin = 8,
            repsMax = 12
        )
        val lastComp = ProgressionEngine.findLastComparableExercise(pressInclinado, sessions)
        assertNotNull(lastComp)
        assertEquals("2026-11-05", lastComp!!.first)
        val s1Load = lastComp.second.entries.first().load.toDoubleOrNull()
        assertNotNull(s1Load)
        assertTrue(s1Load!! > 0.0)
    }
}