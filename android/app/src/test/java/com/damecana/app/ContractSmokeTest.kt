package com.damecana.app

import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ContractSmokeTest {
    @Test
    fun technicalDataAndOracleExistAndMatchContract() {
        val projectRoot = File("..").canonicalFile
        val tecnicaFile = File(projectRoot, "app/src/main/assets/tecnica.json")
        val oracleFile = File(projectRoot, "contrato/salidas/workout-note-v1.oracle.json")

        assertTrue("tecnica.json debe existir", tecnicaFile.exists())
        assertTrue("workout-note-v1.oracle.json debe existir", oracleFile.exists())

        val tecnicaJson = Json.parseToJsonElement(tecnicaFile.readText(Charsets.UTF_8)).jsonObject
        assertEquals("dame_cana_indicaciones_tecnicas.v1", tecnicaJson["schema"]?.jsonPrimitive?.content)
        val ejercicios = tecnicaJson["ejercicios"]?.jsonObject
        assertEquals(60, ejercicios?.size)
    }
}
