package com.damecana.app.domain.usecases

import com.damecana.app.data.local.entities.SetEntity
import com.damecana.app.domain.repository.WorkoutRepository
import kotlinx.coroutines.flow.first

class AddSetToSessionUseCase(
    private val repository: WorkoutRepository
) {
    suspend operator fun invoke(
        sessionId: String,
        exerciseOrder: Int,
        exerciseName: String,
        loadKg: Double,
        reps: Int,
        rir: Double?,
        machineId: String? = null,
        movementNotes: String? = null
    ): SetEntity {
        val currentSets = repository.getSetsForSession(sessionId).first()
        val setsForThisExercise = currentSets.filter { it.exerciseOrder == exerciseOrder }
        val nextSetIndex = setsForThisExercise.size + 1

        val setId = "${sessionId}__E${exerciseOrder}__S${nextSetIndex}"

        val newSet = SetEntity(
            setId = setId,
            sessionId = sessionId,
            exerciseOrder = exerciseOrder,
            exerciseName = exerciseName,
            machineId = machineId,
            setIndex = nextSetIndex,
            loadKg = loadKg,
            reps = reps,
            rir = rir,
            movementNotes = movementNotes,
            comparabilityGroup = generateComparabilityGroup(exerciseName, machineId)
        )

        repository.insertSet(newSet)
        return newSet
    }

    private fun generateComparabilityGroup(exerciseName: String, machineId: String?): String {
        return if (!machineId.isNullOrBlank()) {
            "${exerciseName.uppercase()}_${machineId.uppercase()}"
        } else {
            "NO_VALIDADO|${exerciseName.uppercase()}"
        }
    }
}
