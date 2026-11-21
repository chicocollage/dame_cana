package com.damecana.app.domain

import java.io.File
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class HistoricalAndTechnicalTest {

    private val json = Json { ignoreUnknownKeys = true }

    @Test
    fun parsesExternalTrxAndPartialHistoricalWorkoutsWithExactParity() {
        val result = HistoricalParser.parseHistoricalWorkout(
            """
            Fecha: 2026-07-15
            Entrenamiento: Día A

            Ejercicio: Hip thrust
            Modo: carga externa
            Variante: Máquina Technogym
            Ajustes: respaldo 3
            Base de carga: total
            Objetivo: 3 x 8-10
            RIR objetivo: 2
            Descanso: 2 min
            Serie 1: carga=80 kg; reps=10; rir=2
            Serie 2: carga=80,5; reps=9; rir=1.5
            Serie 3: carga=80; reps=8; rir=1
            Notas: buena estabilidad
            """.trimIndent()
        )
        assertEquals("", result.error)
        assertTrue(result.warnings.isEmpty())
        assertNotNull(result.draft)
        assertEquals("2026-07-15T12:00:00", result.draft!!.date)
        assertEquals("Día A", result.draft!!.title)
        assertEquals(1, result.draft!!.exercises.size)
        val ex = result.draft!!.exercises[0]
        assertEquals("external", ex.identity.resistanceMode)
        assertEquals("total_kg", ex.identity.loadBasis)
        assertEquals("80.5", ex.entries[1].load)
    }

    @Test
    fun resolvesTechnicalCardsForAllProgramSlotsAndCatalogExercises() {
        val projectRoot = File("..").canonicalFile
        val tecnicaRaw = File(projectRoot, "app/src/main/assets/tecnica.json").readText(Charsets.UTF_8)
        val catalogoRaw = File(projectRoot, "app/src/main/assets/catalogo.json").readText(Charsets.UTF_8)

        val techRoot = json.decodeFromString<TechnicalDataRoot>(tecnicaRaw)
        val catalogRoot = json.decodeFromString<CatalogRoot>(catalogoRaw)

        assertEquals(60, techRoot.ejercicios.size)
        assertTrue(catalogRoot.exercises.size >= 55)

        val hipThrust = TechnicalTools.find(
            exerciseName = "Hip thrust en máquina",
            catalogId = "E001",
            data = techRoot,
            catalog = catalogRoot.exercises
        )
        assertNotNull(hipThrust)
        assertEquals("G01", hipThrust!!.id)

        val katana = TechnicalTools.find(
            exerciseName = "Extensión de tríceps katana unilateral",
            data = techRoot,
            catalog = catalogRoot.exercises
        )
        assertNotNull(katana)
        assertEquals("A01", katana!!.id)
    }
}
