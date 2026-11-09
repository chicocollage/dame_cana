package com.damecana.app.domain.usecases

import com.damecana.app.domain.repository.WorkoutRepository

class FinishSessionUseCase(
    private val repository: WorkoutRepository
) {
    suspend operator fun invoke(sessionId: String) {
        repository.finishSession(sessionId)
    }
}
