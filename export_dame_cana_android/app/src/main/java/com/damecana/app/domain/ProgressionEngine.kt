package com.damecana.app.domain

import java.util.Locale

object ProgressionEngine {

    val PLATE_STACK_KG = listOf(
        0.0, 4.5, 9.0, 14.0, 18.0, 23.0, 30.0, 36.0, 43.0, 50.0,
        57.0, 64.0, 70.0, 77.0, 84.0, 91.0, 98.0, 104.0
    )

    enum class DecisionType {
        FIRST_SESSION,
        CONSOLIDATE_RIR,
        PROGRESS_REPS_S1,
        PLATE_BRIDGE_16_18,
        INCREASE_LOAD,
        DELOAD_BIO
    }

    data class ProgressionRecommendation(
        val decision: DecisionType,
        val badgeText: String,
        val rationale: String,
        val recommendedLoadKg: Double?,
        val targetRepsPerSet: List<Int>,
        val lastSummaryText: String = ""
    )

    fun isPlateStackExercise(name: String, variant: String = "", resistanceMode: String = ""): Boolean {
        val nLower = TechnicalTools.clean(name)
        val vLower = TechnicalTools.clean(variant)
        val nonPlateKeywords = listOf(
            "disco", "barra", "smith", "mancuerna", "hip thrust", "glute drive",
            "hack", "prensa", "convergente", "pecho apoyado", "low row", "bulgara", "rdl", "rumano"
        )
        if (nonPlateKeywords.any { nLower.contains(it) || vLower.contains(it) }) {
            return false
        }
        val combined = TechnicalTools.clean("$name $variant $resistanceMode")
        val keywords = listOf(
            "polea", "cable", "katana", "jalon", "pullover", "gironda", "peck deck", "cruce",
            "pressdown", "pushdown", "face pull", "extension rodilla", "extension de rodilla",
            "extension pierna", "femoral", "abduccion", "elevacion lateral", "crunch",
            "stack", "placas"
        )
        return keywords.any { combined.contains(it) }
    }

    fun findLastComparableExercise(
        target: ActiveSessionExercise,
        history: List<ActiveSession>
    ): Pair<String, ActiveSessionExercise>? {
        val targetClean = TechnicalTools.clean(target.name)
        val sortedHistory = history.sortedByDescending { it.date }
        for (session in sortedHistory) {
            for (ex in session.exercises) {
                val exClean = TechnicalTools.clean(ex.name + " " + ex.identity.variant)
                val tgtCleanFull = TechnicalTools.clean(target.name + " " + target.identity.variant)
                val modalityConflict = (tgtCleanFull.contains("cable") || tgtCleanFull.contains("polea")) !=
                    (exClean.contains("cable") || exClean.contains("polea")) &&
                    (tgtCleanFull.contains("elevacion lateral") || exClean.contains("elevacion lateral"))
                val matches = if (modalityConflict) false else when {
                    target.catalogId.isNotBlank() && ex.catalogId.isNotBlank() ->
                        target.catalogId == ex.catalogId
                    target.slotId.isNotBlank() && ex.slotId.isNotBlank() ->
                        target.slotId == ex.slotId
                    else ->
                        TechnicalTools.clean(ex.name) == targetClean
                }
                if (matches && ex.entries.any { it.load.toDoubleOrNull() != null && it.reps.toIntOrNull() != null }) {
                    return Pair(session.date.ifEmpty { session.id }, ex)
                }
            }
        }
        return null
    }

    fun parseRir(rirStr: String, fallback: Double = 1.0): Double {
        val clean = rirStr.trim().uppercase()
        return when {
            clean == "F" -> -0.5
            clean.toDoubleOrNull() != null -> clean.toDouble()
            clean == "0" -> 0.0
            clean == "0.5" -> 0.5
            clean == "1" -> 1.0
            clean == "1.5" -> 1.5
            clean == "2" -> 2.0
            clean == "3" -> 3.0
            else -> fallback
        }
    }

    fun parseTargetRirMin(targetRirText: String): Double {
        val clean = targetRirText.replace("–", "-").trim()
        val firstNum = Regex("\\d+(\\.\\d+)?").find(clean)?.value?.toDoubleOrNull()
        return firstNum ?: 1.0
    }

    fun fmt(kg: Double): String {
        return if (kg % 1.0 == 0.0) kg.toInt().toString() else String.format(Locale.US, "%.1f", kg)
    }

    fun evaluate(
        target: ActiveSessionExercise,
        history: List<ActiveSession>,
        sleepQuality: Int? = null,
        tendonComfort: Int? = null,
        plateBridgeJumpPct: Int = 15
    ): ProgressionRecommendation {
        val repsMin = target.repsMin ?: 10
        val repsMax = target.repsMax ?: 15
        val targetRirMin = parseTargetRirMin(target.targetRir)

        val lastPair = findLastComparableExercise(target, history)
        if (lastPair == null) {
            val initialLoad = target.entries.firstOrNull()?.load?.toDoubleOrNull()
            return ProgressionRecommendation(
                decision = DecisionType.FIRST_SESSION,
                badgeText = "● BASE INICIAL · S1 META $repsMin REPS",
                rationale = "Sin registro previo comparable. Establece una carga de referencia sólida a $repsMin reps con RIR $targetRirMin.",
                recommendedLoadKg = initialLoad,
                targetRepsPerSet = List(maxOf(1, target.sets)) { repsMin },
                lastSummaryText = "Primera sesión en registro"
            )
        }

        val (prevSessionId, prevEx) = lastPair
        val s1 = prevEx.entries.firstOrNull { it.load.toDoubleOrNull() != null && it.reps.toIntOrNull() != null }
            ?: prevEx.entries.first()
        val s1Load = s1.load.toDoubleOrNull() ?: 0.0
        val s1Reps = s1.reps.toIntOrNull() ?: repsMin
        val s1Rir = parseRir(s1.rir, targetRirMin)

        val lastSummary = "Última S1: ${fmt(s1Load)} kg × $s1Reps (RIR ${s1.rir.ifBlank { targetRirMin.toString() }})"
        val isPlate = isPlateStackExercise(target.name, target.identity.variant, target.identity.settings)

        // 1. Regla Bio Check-in (Deload preventivo)
        if ((sleepQuality != null && sleepQuality <= 3) || (tendonComfort != null && tendonComfort <= 3)) {
            val targetS1 = maxOf(repsMin, s1Reps - 1)
            val repsList = buildRepsPerSet(target.sets, targetS1, repsMin, prevEx, DecisionType.DELOAD_BIO)
            return ProgressionRecommendation(
                decision = DecisionType.DELOAD_BIO,
                badgeText = "↓ BIO AUTORREGULACIÓN: ${fmt(s1Load)} KG × $targetS1 (RIR +1)",
                rationale = "Fatiga o molestia articular reportada en check-in (sueño $sleepQuality/10, tendón $tendonComfort/10). Conservamos carga con margen de seguridad.",
                recommendedLoadKg = s1Load,
                targetRepsPerSet = repsList,
                lastSummaryText = lastSummary
            )
        }

        // 2. Regla Freno RIR / Suelo (Consolidación técnica)
        if (s1Rir < targetRirMin - 0.25 || s1Reps < repsMin) {
            val targetS1 = maxOf(repsMin, s1Reps)
            val repsList = buildRepsPerSet(target.sets, targetS1, repsMin, prevEx, DecisionType.CONSOLIDATE_RIR)
            return ProgressionRecommendation(
                decision = DecisionType.CONSOLIDATE_RIR,
                badgeText = "= CONSOLIDAR S1: ${fmt(s1Load)} KG × $targetS1 (LIMPIAR RIR)",
                rationale = "La serie anterior demandó esfuerzo excesivo (RIR ${s1.rir} vs objetivo $targetRirMin) o quedó bajo el rango mínimo ($s1Reps < $repsMin). Consolidar ejecución limpia antes de subir.",
                recommendedLoadKg = s1Load,
                targetRepsPerSet = repsList,
                lastSummaryText = lastSummary
            )
        }

        // 3. Regla Poleas / Placas (Salto > 15% vs <= 15%)
        if (isPlate) {
            val nextPlate = PLATE_STACK_KG.firstOrNull { it > s1Load + 0.3 } ?: (s1Load + 5.0)
            val jumpPct = if (s1Load > 0.0) (nextPlate - s1Load) / s1Load else 0.0

            if (jumpPct > 0.15) {
                val bridgeCeiling = maxOf(repsMax + 2, 17)
                if (s1Reps >= bridgeCeiling) {
                    val repsList = buildRepsPerSet(target.sets, repsMin, repsMin, prevEx, DecisionType.INCREASE_LOAD)
                    return ProgressionRecommendation(
                        decision = DecisionType.INCREASE_LOAD,
                        badgeText = "↑ SUBIR PLACA: ${fmt(nextPlate)} KG × $repsMin EN S1",
                        rationale = "Puente completado con éxito ($s1Reps reps en S1 con ${fmt(s1Load)} kg). El sistema neuromuscular tolera el salto del ${(jumpPct * 100).toInt()}% a la placa de ${fmt(nextPlate)} kg.",
                        recommendedLoadKg = nextPlate,
                        targetRepsPerSet = repsList,
                        lastSummaryText = lastSummary
                    )
                } else if (s1Reps >= repsMax) {
                    val targetS1 = s1Reps + 1
                    val repsList = buildRepsPerSet(target.sets, targetS1, repsMin, prevEx, DecisionType.PLATE_BRIDGE_16_18)
                    return ProgressionRecommendation(
                        decision = DecisionType.PLATE_BRIDGE_16_18,
                        badgeText = "↗ PUENTE PLACA (16–18): ${fmt(s1Load)} KG × $targetS1 EN S1",
                        rationale = "El salto a la siguiente placa es del ${(jumpPct * 100).toInt()}% (>15%). Estiramos S1 hasta $bridgeCeiling reps antes de subir placa para evitar colapso de técnica.",
                        recommendedLoadKg = s1Load,
                        targetRepsPerSet = repsList,
                        lastSummaryText = lastSummary
                    )
                } else {
                    val targetS1 = s1Reps + 1
                    val repsList = buildRepsPerSet(target.sets, targetS1, repsMin, prevEx, DecisionType.PROGRESS_REPS_S1)
                    return ProgressionRecommendation(
                        decision = DecisionType.PROGRESS_REPS_S1,
                        badgeText = "↗ +1 REP EN S1: ${fmt(s1Load)} KG × $targetS1",
                        rationale = "Rango de trabajo vigente ($repsMin–$repsMax). Buscar +1 repetición en S1 manteniendo carga y RIR objetivo.",
                        recommendedLoadKg = s1Load,
                        targetRepsPerSet = repsList,
                        lastSummaryText = lastSummary
                    )
                }
            } else {
                // Salto de placa moderado <= 15%
                if (s1Reps >= repsMax) {
                    val repsList = buildRepsPerSet(target.sets, repsMin, repsMin, prevEx, DecisionType.INCREASE_LOAD)
                    return ProgressionRecommendation(
                        decision = DecisionType.INCREASE_LOAD,
                        badgeText = "↑ SUBIR PLACA: ${fmt(nextPlate)} KG × $repsMin EN S1",
                        rationale = "Rango de repeticiones completado ($s1Reps reps). Salto moderado del ${(jumpPct * 100).toInt()}% a la siguiente placa (${fmt(nextPlate)} kg).",
                        recommendedLoadKg = nextPlate,
                        targetRepsPerSet = repsList,
                        lastSummaryText = lastSummary
                    )
                } else {
                    val targetS1 = s1Reps + 1
                    val repsList = buildRepsPerSet(target.sets, targetS1, repsMin, prevEx, DecisionType.PROGRESS_REPS_S1)
                    return ProgressionRecommendation(
                        decision = DecisionType.PROGRESS_REPS_S1,
                        badgeText = "↗ +1 REP EN S1: ${fmt(s1Load)} KG × $targetS1",
                        rationale = "Rango de trabajo vigente. Buscar +1 repetición en S1 antes de subir de placa.",
                        recommendedLoadKg = s1Load,
                        targetRepsPerSet = repsList,
                        lastSummaryText = lastSummary
                    )
                }
            }
        }

        // 4. Regla Discos / Barra (+2.5 kg)
        if (s1Reps >= repsMax) {
            val nextLoad = s1Load + 2.5
            val repsList = buildRepsPerSet(target.sets, repsMin, repsMin, prevEx, DecisionType.INCREASE_LOAD)
            return ProgressionRecommendation(
                decision = DecisionType.INCREASE_LOAD,
                badgeText = "↑ SUBIR CARGA: ${fmt(nextLoad)} KG × $repsMin EN S1",
                rationale = "Rango completado en S1 ($s1Reps reps). Subida progresiva de +2.5 kg regresando a la base de $repsMin reps.",
                recommendedLoadKg = nextLoad,
                targetRepsPerSet = repsList,
                lastSummaryText = lastSummary
            )
        } else {
            val targetS1 = s1Reps + 1
            val repsList = buildRepsPerSet(target.sets, targetS1, repsMin, prevEx, DecisionType.PROGRESS_REPS_S1)
            return ProgressionRecommendation(
                decision = DecisionType.PROGRESS_REPS_S1,
                badgeText = "↗ +1 REP EN S1: ${fmt(s1Load)} KG × $targetS1",
                rationale = "Rango de trabajo vigente ($repsMin–$repsMax). Buscar +1 repetición en S1 antes de añadir carga externa.",
                recommendedLoadKg = s1Load,
                targetRepsPerSet = repsList,
                lastSummaryText = lastSummary
            )
        }
    }

    private fun buildRepsPerSet(
        totalSets: Int,
        targetS1: Int,
        repsMin: Int,
        prevEx: ActiveSessionExercise,
        decision: DecisionType
    ): List<Int> {
        val count = maxOf(1, totalSets)
        val list = mutableListOf<Int>()
        for (i in 0 until count) {
            if (i == 0) {
                list.add(targetS1)
            } else {
                if (decision == DecisionType.INCREASE_LOAD) {
                    list.add(repsMin)
                } else {
                    val prevRep = prevEx.entries.getOrNull(i)?.reps?.toIntOrNull()
                    if (prevRep != null) {
                        val candidate = if (targetS1 > prevRep) minOf(targetS1, prevRep + 1) else prevRep
                        list.add(maxOf(repsMin, candidate))
                    } else {
                        list.add(maxOf(repsMin, targetS1 - 1))
                    }
                }
            }
        }
        return list
    }

    fun applyPrescriptionToExercise(
        exercise: ActiveSessionExercise,
        history: List<ActiveSession>,
        sleepQuality: Int? = null,
        tendonComfort: Int? = null,
        plateBridgeJumpPct: Int = 15
    ): ActiveSessionExercise {
        val rec = evaluate(exercise, history, sleepQuality, tendonComfort, plateBridgeJumpPct)
        val updatedEntries = exercise.entries.mapIndexed { idx, entry ->
            if (entry.reps.isBlank() && rec.recommendedLoadKg != null) {
                entry.copy(load = fmt(rec.recommendedLoadKg))
            } else {
                entry
            }
        }

        // Limpiar etiqueta previa de progresión en cue si existía
        val cleanCue = exercise.cue.lines()
            .filterNot { it.trim().startsWith("[PROGRESIÓN S1]") }
            .joinToString("\n")
            .trim()

        val newCue = if (cleanCue.isNotBlank()) {
            "[PROGRESIÓN S1] ${rec.badgeText}\n$cleanCue"
        } else {
            "[PROGRESIÓN S1] ${rec.badgeText}"
        }

        return exercise.copy(entries = updatedEntries, cue = newCue)
    }
}
