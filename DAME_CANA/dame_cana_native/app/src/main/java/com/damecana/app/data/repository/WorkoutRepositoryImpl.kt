package com.damecana.app.data.repository

import com.damecana.app.data.local.dao.SessionDao
import com.damecana.app.data.local.dao.SetDao
import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.data.local.entities.SetEntity
import com.damecana.app.domain.repository.WorkoutRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.firstOrNull

class WorkoutRepositoryImpl(
    private val sessionDao: SessionDao,
    private val setDao: SetDao
) : WorkoutRepository {

    override suspend fun createSession(session: SessionEntity) {
        sessionDao.insertSession(session)
    }

    override suspend fun getActiveSession(): SessionEntity? {
        return sessionDao.getActiveSession()
    }

    override suspend fun getLastFinishedSession(): SessionEntity? {
        return sessionDao.getAllSessions().firstOrNull()?.firstOrNull { it.finished }
    }

    override suspend fun finishSession(sessionId: String) {
        sessionDao.finishSession(sessionId)
    }

    override suspend fun insertSet(set: SetEntity) {
        setDao.insertSet(set)
    }

    override fun getSetsForSession(sessionId: String): Flow<List<SetEntity>> {
        return setDao.getSetsForSession(sessionId)
    }

    override suspend fun getRecentSetsForExercise(exerciseName: String): List<SetEntity> {
        return setDao.getRecentSetsForExercise(exerciseName)
    }

    override fun getAllSessions(): Flow<List<SessionEntity>> {
        return sessionDao.getAllSessions()
    }
}
