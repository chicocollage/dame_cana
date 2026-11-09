package com.damecana.app.domain.usecases

import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.domain.repository.WorkoutRepository

class StartNewSessionUseCase(
    private val repository: WorkoutRepository
) {
    suspend operator fun invoke(customTitle: String? = null): SessionEntity {
        val activeSession = repository.getActiveSession()
        if (activeSession != null) return activeSession

        val lastFinished = repository.getLastFinishedSession()
        val nextDay = deriveNextDay(lastFinished?.dia)

        val title = customTitle ?: "Entrenamiento Día $nextDay"

        val newSession = SessionEntity(
            dia = nextDay,
            titulo = title
        )

        repository.createSession(newSession)
        return newSession
    }

    private fun deriveNextDay(lastDay: String?): String {
        return when (lastDay?.uppercase()) {
            "A" -> "B"
            "B" -> "C"
            "C" -> "A"
            else -> "A"
        }
    }
}
