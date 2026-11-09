package com.damecana.app.domain.usecases

import com.damecana.app.data.local.entities.SetEntity

data class ProgressionRecommendation(
    val recommendedLoadKg: Double,
    val recommendedReps: Int,
    val targetRir: Double = 2.0,
    val reason: String
)

class ProgressionEngineUseCase {

    fun calculateRecommendation(
        previousSets: List<SetEntity>,
        minRepTarget: Int = 8,
        maxRepTarget: Int = 10,
        loadIncrementKg: Double = 2.5
    ): ProgressionRecommendation {
        if (previousSets.isEmpty()) {
            return ProgressionRecommendation(
                recommendedLoadKg = 50.0,
                recommendedReps = maxRepTarget,
                targetRir = 2.0,
                reason = "Sin historial previo. Carga base predeterminada."
            )
        }

        val lastWeight = previousSets.first().loadKg
        val allHitMaxReps = previousSets.all { it.reps >= maxRepTarget }
        val allSafeRir = previousSets.all { (it.rir ?: 0.0) >= 2.0 }

        return if (allHitMaxReps && allSafeRir) {
            ProgressionRecommendation(
                recommendedLoadKg = lastWeight + loadIncrementKg,
                recommendedReps = minRepTarget,
                targetRir = 2.0,
                reason = "Techo de reps superado ($maxRepTarget reps). Subida de peso: +${loadIncrementKg}kg."
            )
        } else {
            val maxRepsAchieved = previousSets.maxOfOrNull { it.reps } ?: minRepTarget
            val nextRepTarget = (maxRepsAchieved + 1).coerceAtMost(maxRepTarget)

            ProgressionRecommendation(
                recommendedLoadKg = lastWeight,
                recommendedReps = nextRepTarget,
                targetRir = 2.0,
                reason = "Mantener carga (${lastWeight}kg) e intentar buscar $nextRepTarget repeticiones."
            )
        }
    }
}
