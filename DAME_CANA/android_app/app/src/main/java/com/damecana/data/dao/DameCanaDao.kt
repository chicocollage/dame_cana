package com.damecana.data.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.damecana.data.entity.*
import kotlinx.coroutines.flow.Flow

@Dao
interface DameCanaDao {
    
    @Query("SELECT * FROM program_slots WHERE day = :day ORDER BY `order` ASC")
    fun getSlotsForDay(day: String): Flow<List<ProgramSlot>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSession(session: WorkoutSession)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSets(sets: List<WorkoutSet>)

    @Query("SELECT * FROM workout_sessions WHERE syncStatus = 'PENDING'")
    suspend fun getPendingSessions(): List<WorkoutSession>
    
    @Query("SELECT * FROM workout_sets WHERE sessionId = :sessionId ORDER BY exerciseOrder, setId")
    suspend fun getSetsForSession(sessionId: String): List<WorkoutSet>

    @Query("UPDATE workout_sessions SET syncStatus = :status WHERE sessionId = :sessionId")
    suspend fun updateSyncStatus(sessionId: String, status: SyncStatus)
}
