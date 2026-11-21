package com.damecana.app.domain

import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TrainingParserGoldenTest {

    @Test
    fun matchesAll27WorkoutNoteV1OracleFixturesFromPwa() {
        val projectRoot = File("..").canonicalFile
        val oracleFile = File(projectRoot, "contrato/salidas/workout-note-v1.oracle.json")
        assertTrue("El oráculo debe existir", oracleFile.exists())

        val oracleRoot = Json.parseToJsonElement(oracleFile.readText(Charsets.UTF_8)).jsonObject
        assertTrue("Debe haber al menos 25 fixtures en el oráculo", oracleRoot.size >= 25)

        for ((fixtureName, entryElement) in oracleRoot) {
            val entry = entryElement.jsonObject
            val rawInput = entry["input"]!!.jsonPrimitive.content
            val expectedV1 = entry["workoutNoteV1"]!!.jsonObject
            val actualV1 = TrainingParser.parseWorkoutNoteV1(rawInput)

            assertEquals(
                "Session label mismatch in $fixtureName",
                expectedV1["session"]!!.jsonObject["label"]?.jsonPrimitive?.takeIf { !it.isString || it.content != "null" }?.content,
                actualV1.session.label
            )
            assertEquals(
                "Session focusText mismatch in $fixtureName",
                expectedV1["session"]!!.jsonObject["focusText"]?.jsonPrimitive?.takeIf { !it.isString || it.content != "null" }?.content,
                actualV1.session.focusText
            )

            val expectedExercises = expectedV1["exercises"]!!.jsonArray
            assertEquals("Exercise count mismatch in $fixtureName", expectedExercises.size, actualV1.exercises.size)

            for (i in expectedExercises.indices) {
                val expEx = expectedExercises[i].jsonObject
                val actEx = actualV1.exercises[i]
                assertEquals("Exercise name mismatch in $fixtureName[$i]", expEx["name"]!!.jsonPrimitive.content, actEx.name)
                assertEquals(
                    "Normalized name mismatch in $fixtureName[$i]",
                    expEx["normalizedName"]!!.jsonPrimitive.content,
                    actEx.normalizedName
                )

                val expPres = expEx["prescription"]!!.jsonObject
                assertEquals("sets in $fixtureName[$i]", expPres["sets"]?.jsonPrimitive?.content?.toIntOrNull(), actEx.prescription.sets)
                assertEquals("repsMin in $fixtureName[$i]", expPres["repsMin"]?.jsonPrimitive?.content?.toIntOrNull(), actEx.prescription.repsMin)
                assertEquals("repsMax in $fixtureName[$i]", expPres["repsMax"]?.jsonPrimitive?.content?.toIntOrNull(), actEx.prescription.repsMax)
                assertEquals("targetRirMin in $fixtureName[$i]", expPres["targetRirMin"]?.jsonPrimitive?.content?.toIntOrNull(), actEx.prescription.targetRirMin)
                assertEquals("targetRirMax in $fixtureName[$i]", expPres["targetRirMax"]?.jsonPrimitive?.content?.toIntOrNull(), actEx.prescription.targetRirMax)
                assertEquals("perSide in $fixtureName[$i]", expPres["perSide"]!!.jsonPrimitive.content.toBoolean(), actEx.prescription.perSide)

                val expInstr = expEx["instructions"]!!.jsonArray
                assertEquals("Instruction count mismatch in $fixtureName[$i]", expInstr.size, actEx.instructions.size)

                val expMentions = expEx["historicalMentions"]!!.jsonArray
                assertEquals("Historical mentions count mismatch in $fixtureName[$i]", expMentions.size, actEx.historicalMentions.size)
            }

            val expectedFragments = expectedV1["fragments"]!!.jsonArray
            assertEquals("Fragment count mismatch in $fixtureName", expectedFragments.size, actualV1.fragments.size)
            for (j in expectedFragments.indices) {
                val expFrag = expectedFragments[j].jsonObject
                val actFrag = actualV1.fragments[j]
                assertEquals("Fragment category in $fixtureName line ${actFrag.lineStart}", expFrag["category"]!!.jsonPrimitive.content, actFrag.category)
                assertEquals("Fragment status in $fixtureName line ${actFrag.lineStart}", expFrag["status"]!!.jsonPrimitive.content, actFrag.status)
            }
        }
    }
}
