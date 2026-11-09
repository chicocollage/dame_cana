package com.damecana.app.domain.usecases

import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.data.local.entities.SetEntity
import com.damecana.app.domain.repository.WorkoutRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

data class HistorySessionItem(
    val session: SessionEntity,
    val totalTonnageKg: Double,
    val exerciseCount: Int,
    val sets: List<SetEntity>
)

class GetWorkoutHistoryUseCase(
    private val repository: WorkoutRepository
) {
    operator fun invoke(): Flow<List<HistorySessionItem>> {
        return repository.getAllSessions().map { sessions ->
            sessions.filter { it.finished }
                .map { session ->
                    val sets = repository.getSetsForSession(session.sessionId).first()
                    val totalTonnage = sets.sumOf { it.loadKg * it.reps }
                    val exerciseCount = sets.map { it.exerciseName }.distinct().size

                    HistorySessionItem(
                        session = session,
                        totalTonnageKg = totalTonnage,
                        exerciseCount = exerciseCount,
                        sets = sets
                    )
                }
        }
    }
}
