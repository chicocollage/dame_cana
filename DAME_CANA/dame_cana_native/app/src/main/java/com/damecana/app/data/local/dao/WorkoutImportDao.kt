package com.damecana.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Transaction
import com.damecana.app.data.local.entities.SessionEntity
import com.damecana.app.data.local.entities.SetEntity

@Dao
interface WorkoutImportDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSessions(sessions: List<SessionEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSets(sets: List<SetEntity>)

    @Transaction
    suspend fun importFullHistory(sessions: List<SessionEntity>, sets: List<SetEntity>) {
        insertSessions(sessions)
        insertSets(sets)
    }
}
