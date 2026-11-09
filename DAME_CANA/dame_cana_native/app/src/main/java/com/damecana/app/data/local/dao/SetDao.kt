package com.damecana.app.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.damecana.app.data.local.entities.SetEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface SetDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSet(set: SetEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSets(sets: List<SetEntity>)

    @Delete
    suspend fun deleteSet(set: SetEntity)

    @Query("SELECT * FROM sets WHERE session_id = :sessionId ORDER BY exercise_order ASC, set_index ASC")
    fun getSetsForSession(sessionId: String): Flow<List<SetEntity>>

    @Query("SELECT * FROM sets WHERE exercise_name = :exerciseName ORDER BY set_id DESC LIMIT 10")
    suspend fun getRecentSetsForExercise(exerciseName: String): List<SetEntity>
}
