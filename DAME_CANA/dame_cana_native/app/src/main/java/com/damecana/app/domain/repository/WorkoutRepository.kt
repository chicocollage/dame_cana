package com.damecana.app.domain.repository

import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.data.local.entities.SetEntity
import kotlinx.coroutines.flow.Flow

interface WorkoutRepository {
    suspend fun createSession(session: SessionEntity)
    suspend fun getActiveSession(): SessionEntity?
    suspend fun getLastFinishedSession(): SessionEntity?
    suspend fun finishSession(sessionId: String)
    suspend fun insertSet(set: SetEntity)
    fun getSetsForSession(sessionId: String): Flow<List<SetEntity>>
    suspend fun getRecentSetsForExercise(exerciseName: String): List<SetEntity>
    fun getAllSessions(): Flow<List<SessionEntity>>
}
